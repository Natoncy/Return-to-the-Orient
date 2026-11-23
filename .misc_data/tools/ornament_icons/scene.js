// Loads an Anno cfg tree (MODEL / FILE / PROPCONTAINER-PROP / DECAL, optionally PARTICLE) into world-space triangles.
// Files are looked up in the mod root first, then in the extracted vanilla tree.
// Meshes: rdm4-bin -> glTF (cached); textures: <base>_0.dds -> PNG via texconv (cached), <base>.png as fallback.
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execFileSync } = require('child_process');
const { decode } = require('./png.js');
const { snapshot } = require('./rdp.js');
const VANILLA = 'D:/anno_data/1800';
const CACHE = path.join(__dirname, 'cache');
fs.mkdirSync(CACHE, { recursive: true });
const win = p => p.split('/').join('\\');
const H = s => crypto.createHash('md5').update(s.toLowerCase()).digest('hex').slice(0, 16);

// ---- tiny XML-ish parser (handles </Tag> and </>) ----
function parseXml(text) {
  const root = { tag: '#root', children: [], text: '' }, stack = [root];
  const re = /<(\/?)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[3] !== undefined) { stack[stack.length - 1].text += m[3]; continue; }
    if (m[2].startsWith('?') || m[2].startsWith('!')) continue;
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    if (m[2].endsWith('/')) { stack[stack.length - 1].children.push({ tag: m[2].slice(0, -1), children: [], text: '' }); continue; }
    const n = { tag: m[2], children: [], text: '' };
    stack[stack.length - 1].children.push(n);
    stack.push(n);
  }
  return root;
}
const kid = (n, tag) => n.children.find(c => c.tag === tag);
const kids = (n, tag) => n.children.filter(c => c.tag === tag);
const val = (n, tag, d) => { const c = n && kid(n, tag); return c && c.text.trim() !== '' ? c.text.trim() : d; };
const num = (n, tag, d) => { const v = val(n, tag); return v === undefined ? d : +v; };
const ctype = n => val(n, 'ConfigType', '');
// all Config children of a list node (Models, Files, Props, Decals, ...)
const configs = (n, list) => { const l = n && kid(n, list); return l ? kids(l, 'Config') : []; };

// ---- math ----
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qrot = (q, v) => {
  const [qx, qy, qz, qw] = q, [vx, vy, vz] = v;
  const tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
  return [vx + qw * tx + (qy * tz - qz * ty), vy + qw * ty + (qz * tx - qx * tz), vz + qw * tz + (qx * ty - qy * tx)];
};
// transform = {p, q, s:[sx,sy,sz]}; world = P.p + P.q * (P.s * local)
const apply = (T, v) => { const r = qrot(T.q, [v[0] * T.s[0], v[1] * T.s[1], v[2] * T.s[2]]); return [r[0] + T.p[0], r[1] + T.p[1], r[2] + T.p[2]]; };
const applyN = (T, n) => { const r = qrot(T.q, [n[0] / T.s[0], n[1] / T.s[1], n[2] / T.s[2]]); const l = Math.hypot(...r) || 1; return r.map(x => x / l); };
const compose = (P, C) => ({ p: apply(P, C.p), q: qmul(P.q, C.q), s: [P.s[0] * C.s[0], P.s[1] * C.s[1], P.s[2] * C.s[2]] });
const IDENT = { p: [0, 0, 0], q: [0, 0, 0, 1], s: [1, 1, 1] };
function xfOf(n) {
  // Transformer > Config(ORIENTATION_TRANSFORM) or inline Position/Rotation/Scale (PROP)
  const tr = kid(n, 'Transformer');
  const src = tr ? (kid(tr, 'Config') || tr) : n;
  const s = num(src, 'Scale', undefined);
  const sx = num(src, 'Scale.x', s === undefined ? 1 : s), sy = num(src, 'Scale.y', s === undefined ? 1 : s), sz = num(src, 'Scale.z', s === undefined ? 1 : s);
  return { p: [num(src, 'Position.x', 0), num(src, 'Position.y', 0), num(src, 'Position.z', 0)], q: [num(src, 'Rotation.x', 0), num(src, 'Rotation.y', 0), num(src, 'Rotation.z', 0), num(src, 'Rotation.w', 1)], s: [sx, sy, sz] };
}

// ---- file resolution ----
function makeResolver(modRoot) {
  const norm = r => r.replace(/\\/g, '/').replace(/^\/+/, '');
  const find = rel => { rel = norm(rel); for (const b of [modRoot, VANILLA]) { const p = path.join(b, rel); if (fs.existsSync(p)) return p; } return null; };
  const texCache = new Map();
  function texture(rel) {
    if (!rel) return null;
    rel = norm(rel);
    if (/default_model_(diffuse|mask|normal)|default_height/.test(rel)) return null;
    if (texCache.has(rel)) return texCache.get(rel);
    const base = rel.replace(/\.(psd|png|dds|tga)$/i, '');
    let img = null;
    for (const b of [modRoot, VANILLA]) {
      const dds = path.join(b, base + '_0.dds');
      if (fs.existsSync(dds)) {
        const out = path.join(CACHE, 'tex_' + H(dds) + '.png');
        if (!fs.existsSync(out)) {
          const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tx-'));
          execFileSync('C:/tools/texconv.exe', ['-nologo', '-y', '-ft', 'PNG', '-f', 'R8G8B8A8_UNORM', '-o', win(tmp), win(dds)], { stdio: 'ignore' });
          fs.renameSync(path.join(tmp, fs.readdirSync(tmp)[0]), out);
          fs.rmSync(tmp, { recursive: true, force: true });
        }
        img = decode(out); img.src = dds; break;
      }
      const png = path.join(b, base + '.png');
      if (fs.existsSync(png)) { img = decode(png); img.src = png; break; }
    }
    if (!img) console.log(`  no texture ${rel}`);
    texCache.set(rel, img);
    return img;
  }
  const meshCache = new Map();
  function mesh(rel) {
    rel = norm(rel);
    if (meshCache.has(rel)) return meshCache.get(rel);
    const src = find(rel);
    let res = null;
    if (!src) console.log(`  no mesh ${rel}`);
    else {
      const dir = path.join(CACHE, 'rdm_' + H(src) + '_' + fs.statSync(src).mtimeMs.toFixed(0));
      if (!fs.existsSync(path.join(dir, 'out.gltf'))) {
        fs.mkdirSync(dir, { recursive: true });
        try { execFileSync('C:/tools/rdm4-bin.exe', ['-i', win(src), '-o', win(dir), '-e', 'gltf'], { stdio: 'ignore' }); } catch { console.log(`  rdm4 failed ${rel}`); }
      }
      if (fs.existsSync(path.join(dir, 'out.gltf'))) res = readGltf(dir);
    }
    meshCache.set(rel, res);
    return res;
  }
  return { find, texture, mesh, norm };
}
function readGltf(dir) {
  const g = JSON.parse(fs.readFileSync(path.join(dir, 'out.gltf'), 'utf8'));
  const bins = g.buffers.map(b => fs.readFileSync(path.join(dir, b.uri)));
  const read = (ai, comps) => {
    const a = g.accessors[ai], bv = g.bufferViews[a.bufferView], bin = bins[bv.buffer || 0];
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1, 5122: 2, 5120: 1 }[a.componentType];
    const stride = bv.byteStride || size * comps, out = [];
    for (let i = 0; i < a.count; i++) {
      const v = [];
      for (let c = 0; c < comps; c++) {
        const o = base + i * stride + c * size;
        let x = a.componentType === 5126 ? bin.readFloatLE(o) : a.componentType === 5125 ? bin.readUInt32LE(o) : a.componentType === 5123 ? bin.readUInt16LE(o) : a.componentType === 5122 ? bin.readInt16LE(o) : a.componentType === 5120 ? bin.readInt8(o) : bin[o];
        if (a.normalized) x = a.componentType === 5121 ? x / 255 : a.componentType === 5123 ? x / 65535 : a.componentType === 5120 ? Math.max(-1, x / 127) : a.componentType === 5122 ? Math.max(-1, x / 32767) : x;
        v.push(x);
      }
      out.push(v);
    }
    return out;
  };
  const prims = [];
  for (const mesh of g.meshes) for (const p of mesh.primitives) {
    const pos = read(p.attributes.POSITION, 3);
    prims.push({
      material: p.material || 0,
      pos,
      nrm: p.attributes.NORMAL !== undefined ? read(p.attributes.NORMAL, 3) : null,
      uv: p.attributes.TEXCOORD_0 !== undefined ? read(p.attributes.TEXCOORD_0, 2) : null,
      idx: read(p.indices, 1).map(v => v[0]),
    });
  }
  return prims;
}

// ---- material ----
function material(m, R) {
  const diffOn = val(m, 'DIFFUSE_ENABLED', '1') !== '0';
  const color = [num(m, 'cDiffuseColor.r', 1), num(m, 'cDiffuseColor.g', 1), num(m, 'cDiffuseColor.b', 1)];
  const shader = val(m, 'ShaderID', '');
  const dt = val(m, 'cModelDiffTex') || val(m, 'cClothDiffuseTex') || val(m, 'cPropDiffuseTex') || '';
  if (/default_model_transparent/i.test(dt)) return { invisible: true };
  return { tex: diffOn ? R.texture(dt) : null, color, water: shader === '7', name: val(m, 'Name', '') };
}

// ---- scene collection ----
// opts.skipModel(name, fileName) -> true to drop a model
function loadScene(modRoot, cfgRel, rootXf = IDENT, opts = {}) {
  const R = makeResolver(modRoot);
  const tris = [], decals = [], sprites = [];
  const seen = [];
  function addMesh(prims, mats, T, lodMap, src) {
    for (const p of prims) {
      const slot = lodMap ? (lodMap[p.material] ?? p.material) : p.material;
      const mat = mats[slot] || mats[0] || { tex: null, color: [0.75, 0.75, 0.75] };
      if (mat.invisible) continue;
      const W = p.pos.map(v => apply(T, v));
      const N = p.nrm ? p.nrm.map(n => applyN(T, n)) : null;
      for (let i = 0; i + 2 < p.idx.length; i += 3) {
        const k = [p.idx[i], p.idx[i + 1], p.idx[i + 2]];
        tris.push({ v: k.map(j => W[j]), n: N ? k.map(j => N[j]) : null, uv: p.uv ? k.map(j => p.uv[j]) : null, mat, src });
      }
    }
  }
  function visitCfg(rel, T, depth) {
    const file = R.find(rel);
    if (!file) { console.log(`  no cfg ${rel}`); return; }
    if (depth > 12) return;
    seen.push(rel);
    const root = parseXml(fs.readFileSync(file, 'utf8'));
    const main = root.children.find(c => c.tag === 'Config') || root;
    visitConfig(main, T, depth);
  }
  function visitConfig(main, T, depth) {
    for (const m of configs(main, 'Models')) {
      const fn = val(m, 'FileName');
      if (!fn) continue;
      if (opts.skipModel && opts.skipModel(val(m, 'Name', ''), fn)) continue;
      const W = compose(T, xfOf(m));
      const mats = configs(m, 'Materials').map(x => material(x, R));
      // MaterialLODInfos: LOD 0 slot -> material index
      let lodMap = null;
      const li = kid(m, 'MaterialLODInfos');
      if (li) {
        const first = li.children.find(c => c.tag === 'Config' || c.tag === 'Item' || c.tag === 'None') || null;
        const ind = first && kid(first, 'Indices');
        if (ind) lodMap = ind.children.map(c => +c.text.trim()).filter(x => !isNaN(x));
      }
      const prims = R.mesh(fn);
      if (prims) addMesh(prims, mats, W, lodMap && lodMap.length ? lodMap : null, fn);
    }
    for (const m of configs(main, 'Clothes')) {
      const fn = val(m, 'FileName');
      if (!fn) continue;
      const mats = configs(m, 'Materials').map(x => material(x, R));
      const prims = R.mesh(fn);
      if (prims) addMesh(prims, mats, compose(T, xfOf(m)), null, fn);
    }
    for (const f of configs(main, 'Files')) {
      const fn = val(f, 'FileName');
      if (fn && /\.cfg$/i.test(fn)) visitCfg(fn, compose(T, xfOf(f)), depth + 1);
    }
    // opts.noProps: ships keep their sinking debris (floating boards) in PropContainers
    if (!opts.noProps) for (const pc of configs(main, 'PropContainers')) {
      const PT = compose(T, xfOf(pc));
      for (const pr of configs(pc, 'Props')) {
        const fn = val(pr, 'FileName');
        if (!fn) continue;
        const pf = R.find(fn);
        if (!pf) { console.log(`  no prop ${fn}`); continue; }
        const prop = parseXml(fs.readFileSync(pf, 'utf8')).children[0];
        const meshFn = val(prop, 'MeshFileName');
        const mats = [];
        const ml = kid(prop, 'Materials');
        if (ml) for (const mm of kids(ml, 'Material')) mats.push(material(mm, R));
        const prims = meshFn && R.mesh(meshFn);
        if (prims) addMesh(prims, mats, compose(PT, xfOf(pr)), null, meshFn);
      }
    }
    for (const d of configs(main, 'Decals')) {
      const ml = configs(d, 'Materials');
      const tex = ml.length ? R.texture(val(ml[0], 'cModelDiffTex')) : null;
      const hx = num(d, 'Extents.x', 0), hz = num(d, 'Extents.z', 0);
      if (!tex || !hx || !hz) continue;
      if (!/.dds$/i.test(tex.src) && !opts.pngDecals) { console.log(`  decal without _0.dds skipped: ${val(ml[0], 'cModelDiffTex')}`); continue; }
      decals.push({ T: compose(T, xfOf(d)), hx, hz, tex, src: val(ml[0], 'cModelDiffTex') });
    }
    // opts.particles: one frame of each PARTICLE system as sprites (the renderer has no other way to show a spray)
    if (opts.particles) for (const pc of configs(main, 'Particles')) {
      const fn = val(pc, 'FileName'), src = fn && R.find(fn);
      if (!src) { if (fn) console.log(`  no particles ${fn}`); continue; }
      const PT = compose(T, xfOf(pc));
      for (const s of snapshot(src, opts.particleFrame)) sprites.push({ p: apply(PT, s.p), r: s.r * PT.s[0], c: s.c, a: s.a });
    }
  }
  visitCfg(cfgRel, rootXf, 0);
  return { tris, decals, sprites, cfgs: seen };
}
module.exports = { loadScene, parseXml, kid, kids, val, num, configs, apply, compose, IDENT, makeResolver, qrot };

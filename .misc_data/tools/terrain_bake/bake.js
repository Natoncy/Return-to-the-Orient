// Bake MODEL transform Y offsets (and tilts) into the .rdm vertices so the model can use
// ADJUST_TO_TERRAIN_HEIGHT 1 (the engine drops a model's transform Y with terrain adaption).
//   yaw-only model: v.y += Ty / Scale; transform Position.y -> 0. Normals untouched.
//   tilted model:   v = R(s v) + (0,Ty,0) incl. N/G/B rotation; transform -> (Tx,0,Tz), identity, Scale 1.
// Then every MODEL material in the cfg gets ADJUST_TO_TERRAIN_HEIGHT 1.
// Meshes: a mod mesh whose every use needs the same bake is baked in place; otherwise each bake variant
// gets a copy "<name>_bN[_lodK].rdm" next to it (vanilla meshes: copy into "<cfg dir>/rdm/"). All LOD siblings follow.
// Usage: node bake.js [--apply] [--only <substring>]
const fs = require('fs');
const path = require('path');
const C = require('./common');
const { readStruct } = require(path.join(C.MOD, '.misc_data/tools/rdm_compact/rdmio.js'));

const apply = process.argv.includes('--apply');
const oi = process.argv.indexOf('--only');
const only = oi > 0 ? process.argv[oi + 1].toLowerCase() : null;

// ---------- half floats ----------
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
function h2f(h) {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, m = h & 1023;
  if (e === 0) return s * m * 2 ** -24;
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * 2 ** (e - 15);
}
function f2h(v) {
  f32[0] = v; const x = u32[0];
  const sign = (x >>> 16) & 0x8000; let e = ((x >>> 23) & 255) - 127 + 15; let m = x & 0x7fffff;
  if (e <= 0) { if (e < -10) return sign; m = (m | 0x800000) >> (1 - e); return sign | ((m + 0x1000) >> 13); }
  if (e >= 31) return sign | 0x7c00;
  let h = sign | (e << 10) | (m >> 13);
  if (m & 0x1000) h++; // round half up (carries into the exponent correctly)
  return h;
}

// ---------- quaternion ----------
function rot(q, v) { // q·v·q*
  const { x, y, z, w } = q;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

// ---------- mesh bake ----------
function attrLayout(m) {
  let off = 0; const out = {};
  for (const [id, type, , count] of m.attrs) {
    const size = type === 6 ? 2 * count : type === 5 ? 4 : null;
    if (size === null) throw new Error(`attr type ${type}`);
    out[id] = { off, type, count }; off += size;
  }
  if (off !== m.stride) throw new Error(`stride ${m.stride} != ${off}`);
  return out;
}
function bakeMesh(srcFile, p) {
  const s = readStruct(srcFile);
  if (s.b.readUInt32LE(40)) throw new Error('skinned');
  const b = Buffer.from(s.b);
  const q = { x: p.q.x, y: p.q.y, z: p.q.z, w: p.q.w };
  let maxErr = 0;
  for (const m of s.metas) {
    const L = attrLayout(m);
    if (!L[0] || L[0].type !== 6) throw new Error('position not half');
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < m.vcount; i++) {
      const o = m.vb + i * m.stride + L[0].off;
      const v = [0, 1, 2].map((k) => h2f(b.readUInt16LE(o + 2 * k)));
      let nv, want;
      if (!p.tilt) {
        nv = [v[0], v[1] + p.y / p.s, v[2]];
        want = (w) => rot(q, [w[0] * p.s, w[1] * p.s, w[2] * p.s]).map((c, k) => c + (k === 1 ? 0 : 0)); // compare in model space below
      } else {
        const r = rot(q, [v[0] * p.s, v[1] * p.s, v[2] * p.s]);
        nv = [r[0], r[1] + p.y, r[2]];
      }
      nv.forEach((c, k) => b.writeUInt16LE(f2h(c), o + 2 * k));
      // verify: world position before vs after (translation x/z cancels, so compare without it)
      const back = [0, 1, 2].map((k) => h2f(b.readUInt16LE(o + 2 * k)));
      const before = rot(q, v.map((c) => c * p.s)); before[1] += p.y;
      const after = p.tilt ? back : (() => { const a = rot(q, back.map((c) => c * p.s)); return a; })();
      maxErr = Math.max(maxErr, ...before.map((c, k) => Math.abs(c - after[k])));
      back.forEach((c, k) => { lo[k] = Math.min(lo[k], c); hi[k] = Math.max(hi[k], c); });
      if (p.tilt) for (const id of [1, 2, 3]) {
        if (!L[id]) continue;
        const no = m.vb + i * m.stride + L[id].off;
        const n = [0, 1, 2].map((k) => b[no + k] / 255 * 2 - 1);
        const r = rot(q, n); const len = Math.hypot(...r) || 1;
        const bytes = r.map((c) => Math.max(0, Math.min(255, Math.round((c / len + 1) / 2 * 255))));
        bytes.forEach((c, k) => (b[no + k] = c));
        b[no + 3] = bytes[2] < 128 ? 1 : 0;
      }
    }
    if (m.vcount) [lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]].forEach((c, k) => b.writeFloatLE(c, m.entry + 28 + 4 * k));
  }
  return { buf: b, maxErr };
}

// ---------- plan ----------
const cfgFiles = C.walk(C.MOD, [], (n) => n.toLowerCase().endsWith('.cfg'));
const subCfgs = new Set(), trees = new Map(), srcs = new Map(), uses = new Map();
const keyOf = (p) => (p ? `y${p.y}|s${p.s}|${p.tilt ? [p.q.x, p.q.y, p.q.z, p.q.w].join(',') : 'yaw'}` : 'none');
for (const f of cfgFiles) {
  const src = fs.readFileSync(f, 'latin1');
  srcs.set(f, src);
  for (const m of src.matchAll(/<FileName>([^<]+\.cfg)<\/FileName>/gi)) subCfgs.add(C.norm(m[1]));
}
const targets = [];
for (const f of cfgFiles) {
  const r = C.rel(f);
  const tree = C.parse(srcs.get(f));
  trees.set(f, tree);
  const target = C.inScope(r) && !subCfgs.has(r.toLowerCase());
  if (target) targets.push(f);
  C.each(tree, (n) => {
    if (n.v.ConfigType !== 'MODEL' || !n.v.FileName) return;
    const k = C.norm(n.v.FileName);
    if (!uses.has(k)) uses.set(k, []);
    uses.get(k).push({ cfg: r, key: target ? keyOf(C.bakeParams(n)) : 'other' });
  });
}

// mesh -> variant key -> destination game path (lod0-as-referenced)
const variantDest = new Map();
const meshJobs = new Map(); // dest game path (norm) -> {srcGame, dstGame, params}
function destFor(srcGame, key, cfgRel, p) {
  const k = C.norm(srcGame);
  if (!variantDest.has(k)) variantDest.set(k, new Map());
  const vm = variantDest.get(k);
  if (vm.has(key)) return vm.get(key);
  const res = C.resolve(srcGame);
  const list = uses.get(k);
  const keys = [...new Set(list.map((u) => u.key))];
  const fwd = srcGame.trim().replace(/\\/g, '/');
  let dst;
  if (res.where === 'mod' && keys.length === 1 && keys[0] === key) dst = fwd; // in place
  else {
    const idx = vm.size + 1;
    const base = path.posix.basename(fwd).replace(/(_lod\d)?\.rdm$/i, (mm, lod) => `_b${idx}${lod || ''}.rdm`);
    const dir = res.where === 'mod' ? path.posix.dirname(fwd) : path.posix.join(path.posix.dirname(cfgRel), 'rdm');
    dst = path.posix.join(dir, base);
  }
  vm.set(key, dst);
  return dst;
}

const cfgEdits = [], skipped = [], problems = [];
for (const f of targets) {
  const r = C.rel(f);
  if (only && !r.toLowerCase().includes(only)) continue;
  const tree = trees.get(f), src = srcs.get(f);
  const models = []; C.each(tree, (n) => { if (n.v.ConfigType === 'MODEL') models.push(n); });
  const bakes = models.filter((n) => n.v.FileName && C.bakeParams(n));
  // can every offset model be baked?
  let ok = true;
  for (const n of bakes) {
    const res = C.resolve(n.v.FileName);
    if (!res) { ok = false; problems.push(`${r}: missing ${n.v.FileName}`); continue; }
    if (readStruct(res.file).b.readUInt32LE(40)) { ok = false; skipped.push(`${r}: skinned ${n.v.FileName}`); }
  }
  if (!ok) continue;
  const edits = []; // {index, len, val}
  for (const n of bakes) {
    const p = C.bakeParams(n), key = keyOf(p);
    const dst = destFor(n.v.FileName, key, r, p);
    for (const [srcLod, i] of C.lodSiblings(n.v.FileName).map((s, i) => [s, i])) {
      const lodDst = dst.replace(/_lod\d\.rdm$/i, (srcLod.match(/_lod\d\.rdm$/i) || ['.rdm'])[0]);
      const j = C.norm(lodDst);
      if (!meshJobs.has(j)) meshJobs.set(j, { srcGame: srcLod, dstGame: lodDst, p, key, inPlace: C.norm(srcLod) === j });
    }
    const fnAt = n.at.FileName;
    const sep = n.v.FileName.includes('\\') ? '\\' : '/';
    if (C.norm(dst) !== C.norm(n.v.FileName)) edits.push({ ...fnAt, val: dst.split('/').join(sep) });
    const t = p.t;
    edits.push({ ...t.at['Position.y'], val: '0' });
    if (p.tilt) {
      for (const [tag, val] of [['Rotation.x', '0'], ['Rotation.y', '0'], ['Rotation.z', '0'], ['Rotation.w', '1'], ['Scale', '1']])
        if (t.at[tag]) edits.push({ ...t.at[tag], val });
    }
  }
  let flips = 0;
  for (const mdl of models) C.each(mdl, (c) => {
    if (c.v.ConfigType !== 'MATERIAL') return;
    for (const a of c.all || []) if (a.tag === 'ADJUST_TO_TERRAIN_HEIGHT' && a.val !== '1') { edits.push({ index: a.index, len: a.len, val: '1' }); flips++; }
  });
  if (edits.length) cfgEdits.push({ f, r, edits, bakes: bakes.length, flips });
}

// ---------- report / apply ----------
let worst = 0;
const out = [];
for (const job of meshJobs.values()) {
  const res = C.resolve(job.srcGame);
  if (job.inPlace && res.where !== 'mod') throw new Error('in-place on vanilla ' + job.srcGame);
  const { buf, maxErr } = bakeMesh(res.file, job.p);
  worst = Math.max(worst, maxErr);
  out.push(`${job.inPlace ? 'BAKE ' : 'COPY '} ${job.dstGame}${job.inPlace ? '' : '  <- ' + (res.where === 'vanilla' ? 'vanilla ' : '') + job.srcGame.replace(/\\/g, '/')}  [${job.key}] err ${maxErr.toExponential(1)}`);
  if (job.dstGame.length > 130) problems.push('long path ' + job.dstGame.length + ' ' + job.dstGame);
  if (!job.inPlace && fs.existsSync(path.join(C.MOD, job.dstGame))) problems.push('exists ' + job.dstGame);
  if (apply) { fs.mkdirSync(path.dirname(path.join(C.MOD, job.dstGame)), { recursive: true }); fs.writeFileSync(path.join(C.MOD, job.dstGame), buf); }
}
for (const e of cfgEdits) {
  let t = srcs.get(e.f);
  for (const x of e.edits.sort((a, b) => b.index - a.index)) t = t.slice(0, x.index) + x.val + t.slice(x.index + x.len);
  if (apply) fs.writeFileSync(e.f, t, 'latin1');
}
console.log(out.sort().join('\n'));
console.log('\ncfgs:'); cfgEdits.forEach((e) => console.log(`  ${e.r}: ${e.bakes} baked models, ${e.flips} materials -> 1`));
console.log('\nskipped:', skipped); console.log('problems:', problems);
console.log(`\n${meshJobs.size} mesh files (${[...meshJobs.values()].filter((j) => j.inPlace).length} in place), ${cfgEdits.length} cfgs, max world error ${worst.toExponential(2)}`, apply ? 'APPLIED' : 'DRY RUN');

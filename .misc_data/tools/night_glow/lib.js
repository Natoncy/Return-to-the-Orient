// Shared helpers: tiny cfg XML tree, cfg -> (rdm, material slot) lookup, rdm triangle reader, dds <-> png via texconv.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { decode, encode } = require('../rdm_compact/pngtool.js');
const TEXCONV = 'C:\\tools\\texconv.exe';

function parseXml(t) { // elements + text only; cfg files have no comments/attributes worth keeping
  const root = { tag: '#root', kids: [], text: '' }, st = [root];
  const re = /<(\/?)([A-Za-z_][\w.:-]*)[^>]*?(\/?)>|([^<]+)/g; let m;
  while ((m = re.exec(t))) {
    if (m[4] !== undefined) { st[st.length - 1].text += m[4]; continue; }
    if (m[1]) { st.pop(); continue; }
    const n = { tag: m[2], kids: [], text: '' }; st[st.length - 1].kids.push(n);
    if (!m[3]) st.push(n);
  }
  return root;
}
const kid = (n, tag) => n.kids.find(k => k.tag === tag);
const val = (n, tag) => { const k = kid(n, tag); return k ? k.text.trim() : undefined; };
function* configs(n) { for (const k of n.kids) { if (k.tag === 'Config') yield k; yield* configs(k); } }

// every MODEL in a cfg: { rdm, slots: [materialIndex per rdm slot], mats: [{diff, ...}] }
function cfgModels(file) {
  const tree = parseXml(fs.readFileSync(file, 'utf8')), out = [];
  for (const c of configs(tree)) {
    if (val(c, 'ConfigType') !== 'MODEL') continue;
    const mats = []; const ml = kid(c, 'Materials');
    if (ml) for (const m of ml.kids) if (m.tag === 'Config') mats.push({ diff: val(m, 'cModelDiffTex'), ng: val(m, 'NIGHT_GLOW_ENABLED'), map: val(m, 'cNightGlowMap') });
    let slots = null; const li = kid(c, 'MaterialLODInfos');
    if (li && li.kids[0]) { const ix = kid(li.kids[0], 'Indices'); if (ix) slots = ix.kids.map(k => +k.text.trim()); }
    out.push({ rdm: val(c, 'FileName'), slots, mats });
  }
  return out;
}

// triangles of an rdm, all Meta blocks: yields {mat, p:[3][3], n:[3], uv:[3][2]}
const half = h => { const s = h >> 15, e = (h >> 10) & 31, m = h & 1023; const v = e === 0 ? m / 1024 * 2 ** -14 : e === 31 ? NaN : (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; };
function rdmTris(file) {
  const b = fs.readFileSync(file), tris = [];
  if (b.readUInt32LE(0) !== 0x014d4452) throw new Error('not rdm ' + file);
  const mt = b.readUInt32LE(32), mcount = b.readUInt32LE(mt - 8);
  for (let i = 0; i < mcount; i++) {
    const e = mt + i * 92, vf = b.readUInt32LE(e + 4), vb = b.readUInt32LE(e + 12), ib = b.readUInt32LE(e + 16), mi = b.readUInt32LE(e + 20);
    const stride = b.readUInt32LE(vb - 4), isize = b.readUInt32LE(ib - 4), micount = b.readUInt32LE(mi - 8), misize = b.readUInt32LE(mi - 4);
    const ap = b.readUInt32LE(vf), an = b.readUInt32LE(ap - 8);
    let off = 0; const at = {};
    for (let k = 0; k < an; k++) {
      const [sem, fmt, , cnt] = [0, 4, 8, 12].map(q => b.readUInt32LE(ap + k * 16 + q));
      const size = fmt === 6 ? 2 * cnt : fmt === 5 || fmt === 4 || fmt === 7 ? 4 * cnt : fmt === 1 || fmt === 0 ? 4 * cnt : 4 * cnt;
      if (!(sem in at)) at[sem] = { off, fmt, cnt };
      off += size;
    }
    if (!at[0] || !at[4] || at[0].fmt !== 6 || at[4].fmt !== 6) continue; // need half positions and half uvs
    const V = j => vb + j * stride;
    const pos = j => [0, 1, 2].map(k => half(b.readUInt16LE(V(j) + at[0].off + 2 * k)));
    const uv = j => [half(b.readUInt16LE(V(j) + at[4].off)), half(b.readUInt16LE(V(j) + at[4].off + 2))];
    const idx = k => isize === 4 ? b.readUInt32LE(ib + k * 4) : b.readUInt16LE(ib + k * 2);
    for (let s = 0; s < micount; s++) {
      const start = b.readUInt32LE(mi + s * misize), count = b.readUInt32LE(mi + s * misize + 4), mat = b.readUInt32LE(mi + s * misize + 8);
      for (let t = start; t + 2 < start + count; t += 3) {
        const ix = [idx(t), idx(t + 1), idx(t + 2)];
        const p = ix.map(pos), u = ix.map(uv);
        const a = p[1].map((v, k) => v - p[0][k]), c = p[2].map((v, k) => v - p[0][k]);
        const n = [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
        const l = Math.hypot(...n); if (!(l > 1e-9)) continue;
        tris.push({ mat, p, n: n.map(v => v / l), area: l / 2, uv: u });
      }
    }
  }
  return tris;
}

// rasterise a UV triangle into a w*h grid (wrapping), calling f(index)
function rasterUV(uv, w, h, f) {
  const T = uv.map(([u, v]) => [u * w, v * h]);
  const x0 = Math.floor(Math.min(...T.map(p => p[0]))), x1 = Math.ceil(Math.max(...T.map(p => p[0])));
  const y0 = Math.floor(Math.min(...T.map(p => p[1]))), y1 = Math.ceil(Math.max(...T.map(p => p[1])));
  if (x1 - x0 > 4 * w || y1 - y0 > 4 * h) return;
  const d = (T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (T[1][1] - T[0][1]);
  const put = (x, y) => f((((y % h) + h) % h) * w + (((x % w) + w) % w));
  for (const p of T) put(Math.floor(p[0]), Math.floor(p[1]));
  if (Math.abs(d) < 1e-9) return;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const l1 = ((T[1][0] - px) * (T[2][1] - py) - (T[2][0] - px) * (T[1][1] - py)) / d;
    const l2 = ((T[2][0] - px) * (T[0][1] - py) - (T[0][0] - px) * (T[2][1] - py)) / d;
    if (l1 >= -1e-4 && l2 >= -1e-4 && 1 - l1 - l2 >= -1e-4) put(x, y);
  }
}

// cfg texture path (.png/.psd) -> on-disk _N.dds list
function ddsLevels(modRoot, tex) {
  const base = path.join(modRoot, tex.replace(/\.(png|psd|tga)$/i, '')), out = [];
  for (let i = 0; i < 8; i++) { const f = `${base}_${i}.dds`; if (fs.existsSync(f)) out.push(f); else break; }
  return out;
}
function ddsToPng(dds, cacheDir) {
  fs.mkdirSync(cacheDir, { recursive: true });
  // one cache folder per source folder: copies of an atlas share file names but not always pixels
  const sub = path.join(cacheDir, require('crypto').createHash('md5').update(path.resolve(path.dirname(dds)).toLowerCase()).digest('hex').slice(0, 10));
  fs.mkdirSync(sub, { recursive: true });
  const out = path.join(sub, path.basename(dds).replace(/\.dds$/i, '.png'));
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(dds).mtimeMs)
    cp.execFileSync(TEXCONV, ['-nologo', '-y', '-ft', 'PNG', '-o', sub, dds], { stdio: 'pipe' });
  return decode(out);
}
function ddsInfo(dds) {
  const r = cp.execFileSync(TEXCONV, ['-nologo', '-ft', 'PNG', '-o', process.env.TEMP, '-y', dds], { encoding: 'utf8' });
  const m = r.match(/\((\d+)x(\d+),(\d+) (\w+)/); return { w: +m[1], h: +m[2], mips: +m[3], fmt: m[4] };
}
// diffuse cfg path -> mask cfg path next to it (X_diff.png -> X_mask.png, X_diff_512.png -> X_mask_512.png, else X_mask)
function maskName(tex) { const e = path.extname(tex), b = tex.slice(0, -e.length); const m = b.replace(/_diff(use)?(?=(_\d+)?$)/i, '_mask'); return (m === b ? b + '_mask' : m) + '.png'; }

// writes <mask>_<lod>.dds (BC1, full mips) next to the diffuse, one per diffuse LOD file, box-downsampled from rgb (w*h*3)
function writeMaskDds(modRoot, tex, w0, h0, rgb, tmpDir) {
  const mtex = maskName(tex), base = path.basename(mtex, '.png'), dir = path.dirname(path.join(modRoot, mtex));
  const n = ddsLevels(modRoot, tex).length || 1, files = [];
  fs.mkdirSync(tmpDir, { recursive: true });
  for (let i = 0; i < n; i++) {
    const f = 1 << i, w = Math.max(1, w0 >> i), h = Math.max(1, h0 >> i), o = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let ch = 0; ch < 3; ch++) {
      let a = 0; for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) a += rgb[((y * f + yy) * w0 + x * f + xx) * 3 + ch];
      o[(y * w + x) * 3 + ch] = Math.round(a / f / f);
    }
    const png = path.join(tmpDir, `${base}_${i}.png`); encode(png, w, h, 3, o); files.push(png);
  }
  cp.execFileSync(TEXCONV, ['-nologo', '-y', '-f', 'BC1_UNORM', '-m', '0', '-o', dir, ...files], { stdio: 'pipe' });
  return { mtex, files: files.map((_, i) => path.join(dir, `${base}_${i}.dds`)) };
}

// rewrites the MATERIAL blocks of one cfg text. wire: normalised diffuse path -> mask path ('' = switch the glow off).
// Materials that already have a mask are kept unless relit is set. Keeps line endings. Returns { out, n }.
const normTex = s => (s || '').replace(/\\/g, '/').toLowerCase();
function wireCfgText(t, wire, relit) {
  let n = 0;
  const out = t.replace(/<Config>\s*<ConfigType>MATERIAL<\/ConfigType>[\s\S]*?<\/Config>/g, b => {
    const diff = (b.match(/<cModelDiffTex>([^<]*)<\/cModelDiffTex>/) || [])[1], mt = wire[normTex(diff)];
    if (mt === undefined) return b;
    const lit = /<NIGHT_GLOW_ENABLED>1<\/NIGHT_GLOW_ENABLED>/.test(b) && /<cNightGlowMap>[^<]+<\/cNightGlowMap>/.test(b);
    if (mt === '') { // off
      if (!lit) return b; n++;
      return b.replace(/<NIGHT_GLOW_ENABLED>1<\/NIGHT_GLOW_ENABLED>/, '<NIGHT_GLOW_ENABLED>0</NIGHT_GLOW_ENABLED>').replace(/<cNightGlowMap>[^<]*<\/cNightGlowMap>/, '<cNightGlowMap></cNightGlowMap>');
    }
    if (lit && (!relit || b.includes(`<cNightGlowMap>${mt}</cNightGlowMap>`))) return b;
    n++;
    b = b.replace(/<GLOW_ENABLED>0<\/GLOW_ENABLED>/, '<GLOW_ENABLED>1</GLOW_ENABLED>');
    if (/<cNightGlowMap>[^<]*<\/cNightGlowMap>/.test(b)) b = b.replace(/<cNightGlowMap>[^<]*<\/cNightGlowMap>/, `<cNightGlowMap>${mt}</cNightGlowMap>`);
    else b = b.replace(/([ \t]*)<NIGHT_GLOW_ENABLED>[01]<\/NIGHT_GLOW_ENABLED>(\r?\n)/, (m, ind, nl) => `${m}${ind}<cNightGlowMap>${mt}</cNightGlowMap>${nl}`);
    if (!/<NIGHT_GLOW_ENABLED>/.test(b)) b = b.replace(/([ \t]*)<cModelDiffTex>/, (m, ind) => `${ind}<NIGHT_GLOW_ENABLED>1</NIGHT_GLOW_ENABLED>\r\n${ind}<cNightGlowMap>${mt}</cNightGlowMap>\r\n${m}`);
    return b.replace(/<NIGHT_GLOW_ENABLED>0<\/NIGHT_GLOW_ENABLED>/, '<NIGHT_GLOW_ENABLED>1</NIGHT_GLOW_ENABLED>');
  });
  return { out, n };
}
module.exports = { parseXml, cfgModels, rdmTris, rasterUV, ddsLevels, ddsToPng, ddsInfo, decode, encode, TEXCONV, maskName, writeMaskDds, wireCfgText, normTex };

// Auto night-glow mask: dark openings (windows, door gaps, dark doorways) on wall faces of the meshes that use a texture.
// usage: node detect.js <modRoot> <workDir> <diffTex> [<diffTex>...]
//   needs <workDir>/../survey.json (survey.js output); writes <workDir>/<key>.mask.png and <key>.preview.png
//   env: GROUPS=1 spreads blobs over the R/G/B light groups (vanilla residences do that), else white like the 1404 masks
//   as a module: prepare(modRoot, workDir, tex) once per texture, then detect(prep, params) as often as needed
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const DEF = { dark: 0.25, rel: 0.6, up: 0.5, minA: 12, maxA: 9000, maxSide: 170, ring: 1.8, fill: 0.2, erode: 2, aspect: 1.6 };
const norm = s => (s || '').replace(/\\/g, '/').toLowerCase();
let usedCfgs = null; const cfgCache = {}, rdmCache = {};
const keyOf = tex => tex.replace(/^data\/graphics\//, '').replace(/[\/\\]/g, '~').replace(/\.(png|psd)$/i, '');

function prepare(modRoot, workDir, tex, cfgList) { // cfgList: cfgs to search for meshes (default: survey.json's used cfgs)
  if (cfgList) usedCfgs = cfgList;
  if (!usedCfgs) usedCfgs = JSON.parse(fs.readFileSync(path.join(workDir, '..', 'survey.json'), 'utf8')).filter(s => s.used).map(s => s.cfg);
  const lv = L.ddsLevels(modRoot, tex); if (!lv.length) return null;
  const im = L.ddsToPng(lv[0], path.join(workDir, 'cache')), W = im.w, H = im.h, N = W * H;
  const wall = new Float32Array(N), used = new Uint8Array(N); let tris = 0; const cfgs = new Set();
  for (const cfg of usedCfgs) {
    const models = cfgCache[cfg] ??= L.cfgModels(path.join(modRoot, cfg));
    for (const m of models) {
      const slots = (m.slots && m.slots.length ? m.slots : m.mats.map((_, i) => i));
      const want = new Set(slots.map((mi, k) => norm(m.mats[mi]?.diff) === norm(tex) ? k : -1).filter(k => k >= 0));
      if (!want.size || !m.rdm) continue;
      const f = path.join(modRoot, m.rdm); if (!fs.existsSync(f)) continue;
      let T; try { T = rdmCache[f] ??= L.rdmTris(f); } catch (e) { continue; }
      for (const t of T) if (want.has(t.mat)) {
        tris++; cfgs.add(cfg);
        const vertical = Math.abs(t.n[1]) < DEF.up;
        L.rasterUV(t.uv, W, H, i => { used[i] = 1; wall[i] += vertical ? t.area : -t.area; });
      }
    }
  }
  const lum = new Float32Array(N), alpha = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const o = i * im.ch; lum[i] = (0.2126 * im.px[o] + 0.7152 * im.px[o + 1] + 0.0722 * im.px[o + 2]) / 255; alpha[i] = im.ch === 4 ? im.px[o + 3] : 255; }
  // wall texels, eroded so island borders (dark bleed, seams) never count
  const w0 = new Uint8Array(N); for (let i = 0; i < N; i++) w0[i] = wall[i] > 0 && alpha[i] > 128 ? 1 : 0;
  const s = Math.sqrt(N) / 1024, E = Math.max(1, Math.round(DEF.erode * s));
  const wv = erode(w0, W, H, E);
  // local wall brightness
  const R = Math.max(4, Math.round(22 * s)), [bs, bw] = boxBlur(lum, wv, W, H, R), ref = new Float32Array(N);
  for (let i = 0; i < N; i++) ref[i] = bw[i] > 0 ? bs[i] / bw[i] : 0.5;
  return { tex, key: keyOf(tex), im, W, H, N, s, used, wv, lum, ref, tris, cfgs: [...cfgs] };
}
function erode(m, W, H, E) {
  const a = new Uint8Array(m.length), b = new Uint8Array(m.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let ok = 1; for (let d = -E; d <= E && ok; d++) { const xx = x + d; if (xx < 0 || xx >= W || !m[y * W + xx]) ok = 0; } a[y * W + x] = ok; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let ok = 1; for (let d = -E; d <= E && ok; d++) { const yy = y + d; if (yy < 0 || yy >= H || !a[yy * W + x]) ok = 0; } b[y * W + x] = ok; }
  return b;
}
function boxBlur(src, wgt, W, H, R) {
  const N = W * H, a = new Float32Array(N), b = new Float32Array(N), sa = new Float32Array(N), sb = new Float32Array(N);
  for (let y = 0; y < H; y++) { let acc = 0, accw = 0; for (let x = -R; x < W; x++) {
    if (x + R < W) { const i = y * W + x + R; acc += src[i] * wgt[i]; accw += wgt[i]; }
    if (x - R - 1 >= 0) { const i = y * W + x - R - 1; acc -= src[i] * wgt[i]; accw -= wgt[i]; }
    if (x >= 0) { a[y * W + x] = acc; b[y * W + x] = accw; } } }
  for (let x = 0; x < W; x++) { let acc = 0, accw = 0; for (let y = -R; y < H; y++) {
    if (y + R < H) { acc += a[(y + R) * W + x]; accw += b[(y + R) * W + x]; }
    if (y - R - 1 >= 0) { acc -= a[(y - R - 1) * W + x]; accw -= b[(y - R - 1) * W + x]; }
    if (y >= 0) { sa[y * W + x] = acc; sb[y * W + x] = accw; } } }
  return [sa, sb];
}

function detect(pr, P = DEF) {
  const { W, H, N, s, wv, lum, ref, used } = pr;
  const cand = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (wv[i] && lum[i] < P.dark && lum[i] < P.rel * ref[i]) cand[i] = 1;
  const lab = new Int32Array(N).fill(-1), comps = [], q = new Int32Array(N);
  for (let i = 0; i < N; i++) if (cand[i] && lab[i] < 0) {
    let qh = 0, qt = 0; q[qt++] = i; lab[i] = comps.length;
    let x0 = W, x1 = 0, y0 = H, y1 = 0, sum = 0;
    while (qh < qt) { const j = q[qh++], x = j % W, y = (j / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; sum += lum[j];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (cand[k] && lab[k] < 0) { lab[k] = comps.length; q[qt++] = k; } } }
    comps.push({ px: q.slice(0, qt), x0, x1, y0, y1, mean: sum / qt });
  }
  const keep = [];
  for (const c of comps) {
    const a = c.px.length, bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
    let why = '';
    if (a < P.minA * s * s) why = 'small';
    else if (a > P.maxA * s * s) why = 'big';
    else if (Math.max(bw, bh) > P.maxSide * s) why = 'long';
    else if (a / (bw * bh) < P.fill) why = 'ragged';
    else if (bw > P.aspect * bh || bh < 4 * s) why = 'flat'; // seams, crack lines and eave shadows run sideways; openings stand upright
    else {
      const pad = Math.max(2, Math.round(3 * s)); let rs = 0, rn = 0;
      for (let y = c.y0 - pad; y <= c.y1 + pad; y++) for (let x = c.x0 - pad; x <= c.x1 + pad; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue; if (x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) continue;
        const k = y * W + x; if (!used[k]) continue; rs += lum[k]; rn++;
      }
      if (rn < 4 || rs / rn < P.ring * c.mean) why = 'ring';
    }
    c.why = why; if (!why) keep.push(c);
  }
  return { comps, keep };
}

function render(pr, res, workDir, groups) {
  const { W, H, N, im, used, wv } = pr, mask = Buffer.alloc(N * 3);
  res.keep.forEach((c, n) => {
    const col = groups ? [[255, 0, 0], [0, 255, 0], [0, 0, 255]][n % 3] : [255, 255, 255];
    for (const j of c.px) { const x = j % W, y = (j / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k = (yy * W + xx) * 3; for (let ch = 0; ch < 3; ch++) mask[k + ch] = Math.max(mask[k + ch], col[ch]); } }
  });
  const pv = Buffer.alloc(N * 3);
  for (let i = 0; i < N; i++) { const o = i * im.ch, f = !used[i] ? 0.25 : wv[i] ? 0.85 : 0.5;
    pv[i * 3] = im.px[o] * f; pv[i * 3 + 1] = im.px[o + 1] * f; pv[i * 3 + 2] = im.px[o + 2] * f + (used[i] ? 0 : 40); }
  for (const c of res.comps) if (c.why && c.why !== 'small') for (const j of c.px) { pv[j * 3] = 200; pv[j * 3 + 1] = 30; pv[j * 3 + 2] = 30; }
  for (let i = 0; i < N; i++) if (mask[i * 3] | mask[i * 3 + 1] | mask[i * 3 + 2]) { pv[i * 3] = 255; pv[i * 3 + 1] = 230; pv[i * 3 + 2] = 0; }
  // grid every 1/16 (every 1/4 brighter) so blobs can be picked by normalised coordinates
  for (let k = 1; k < 16; k++) { const c = k % 4 ? 110 : 255, gx = Math.round(k * W / 16), gy = Math.round(k * H / 16);
    for (let y = 0; y < H; y++) { const o = (y * W + gx) * 3; pv[o] = 0; pv[o + 1] = c; pv[o + 2] = c; }
    for (let x = 0; x < W; x++) { const o = (gy * W + x) * 3; pv[o] = 0; pv[o + 1] = c; pv[o + 2] = c; } }
  if (workDir) { L.encode(path.join(workDir, pr.key + '.mask.png'), W, H, 3, mask); L.encode(path.join(workDir, pr.key + '.preview.png'), W, H, 3, pv); }
  return mask;
}
module.exports = { prepare, detect, render, DEF, keyOf };

if (require.main === module) {
  const [modRoot, workDir, ...texs] = process.argv.slice(2);
  fs.mkdirSync(workDir, { recursive: true });
  const P = { ...DEF }; for (const k in P) if (process.env[k.toUpperCase()]) P[k] = +process.env[k.toUpperCase()];
  for (const tex of texs) {
    const pr = prepare(modRoot, workDir, tex); if (!pr) { console.log('NO DDS', tex); continue; }
    const res = detect(pr, P); render(pr, res, workDir, process.env.GROUPS === '1');
    const glow = res.keep.reduce((a, c) => a + c.px.length, 0);
    console.log(`${pr.key} ${pr.W}x${pr.H} tris ${pr.tris} blobs ${res.keep.length}/${res.comps.length} glow ${(100 * glow / pr.N).toFixed(2)}%`);
  }
}

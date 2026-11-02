// Rammed earth farm: recolour the silk plantation dome gores. Teal field -> clay brown, gold trim -> sandstone.
// node dome.js <out maps dir>
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const T = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/canal_orient/';
const { loadGltf } = require(T + 'render.js');
const PNG = require(T + 'png.js');
const { rgb2lab, lab2rgb } = require(T + 'lab.js');
const D = __dirname + '/';
const OUT = process.argv[2];
const m = loadGltf(D + 'gltf.gltf');
const img = PNG.decode(D + 's_silk_plantation_diff_0.png');
const W = img.w, H = img.h;

// dome texels: faces above y 1.0 inside the two gore triangles' box
const mask = new Uint8Array(W * H);
for (let k = 0; k < m.idx.length; k += 3) {
  const id = [m.idx[k], m.idx[k + 1], m.idx[k + 2]];
  if (Math.min(...id.map(i => m.pos[i][1])) < 0.95) continue;
  const P = id.map(i => [m.uv[i][0] * W, m.uv[i][1] * H]);
  const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]);
  if (Math.abs(area) < 1e-9) continue;
  const x0 = Math.max(0, Math.floor(Math.min(...P.map(t => t[0])))), x1 = Math.min(W - 1, Math.ceil(Math.max(...P.map(t => t[0]))));
  const y0 = Math.max(0, Math.floor(Math.min(...P.map(t => t[1])))), y1 = Math.min(H - 1, Math.ceil(Math.max(...P.map(t => t[1]))));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[1][1] - py) * (P[2][0] - px)) / area;
    const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[2][1] - py) * (P[0][0] - px)) / area;
    if (w0 < -0.02 || w1 < -0.02 || 1 - w0 - w1 < -0.02) continue;
    if (x < 480 && y > 160 && y < 365) mask[y * W + x] = 1;
  }
}
// dilate 4 px so the padding around the gores follows
let cur = mask;
for (let it = 0; it < 4; it++) {
  const nx = cur.slice();
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!cur[y * W + x] && (cur[y * W + x - 1] || cur[y * W + x + 1] || cur[(y - 1) * W + x] || cur[(y + 1) * W + x]) && x < 480 && y > 160 && y < 365) nx[y * W + x] = 1;
  cur = nx;
}

// classify: gold-ness from b (teal b < 0, gold b ~ 40+)
const lab = new Float32Array(W * H * 3);
const tealL = [], goldL = [];
for (let i = 0; i < W * H; i++) {
  if (!cur[i]) continue;
  const L = rgb2lab(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]);
  lab.set(L, i * 3);
  if (L[2] < 8 && L[1] < -3) tealL.push(L[0]); else if (L[2] > 30) goldL.push(L[0]);
}
const med = a => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
const mT = med(tealL), mG = med(goldL);
console.log('teal px', tealL.length, 'median L', mT.toFixed(1), '| gold px', goldL.length, 'median L', mG.toFixed(1));

const CLAY = { L: 44, a: 17, b: 27, k: 0.85 };   // clay brown field
const SAND = { L: 26, a: 12, b: 18, k: 0.6 };    // dark brown trim (was sandstone L 70, a 6, b 26)
const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
let n = 0;
for (let i = 0; i < W * H; i++) {
  if (!cur[i]) continue;
  const [L, a, b] = lab.subarray(i * 3, i * 3 + 3);
  const g = sm(8, 28, b);                       // 0 teal .. 1 gold
  const Lc = CLAY.L + (L - mT) * CLAY.k, Ls = SAND.L + (L - mG) * SAND.k;
  const chroma = Math.hypot(a, b);
  const keep = 1 - sm(6, 14, chroma) * sm(12, 22, L);   // near-grey dark lines stay (just warmed)
  let nL = (Lc * (1 - g) + Ls * g), na = CLAY.a * (1 - g) + SAND.a * g, nb = CLAY.b * (1 - g) + SAND.b * g;
  nL = nL * (1 - keep) + L * keep; na = na * (1 - keep) + 8 * keep; nb = nb * (1 - keep) + 14 * keep;
  const rgb = lab2rgb(nL, na, nb);
  img.data.set(rgb, i * 4); n++;
}
console.log('recoloured', n);
fs.mkdirSync(OUT, { recursive: true });
PNG.encode(D + 'rammed_earth_farm_diff_0.png', img);

function halve(src) {
  const w = src.w >> 1, h = src.h >> 1, o = PNG.create(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) s += src.data[((2 * y + dy) * src.w + 2 * x + dx) * 4 + c];
    o.data[(y * w + x) * 4 + c] = (s + 2) >> 2;
  }
  return o;
}
if (OUT !== '-') {
  PNG.encode(path.join(OUT, 'rammed_earth_farm_diff_0.png'), img);
  let lv = img;
  for (let k = 0; k < 3; k++) {
    if (k) lv = halve(lv);
    const p = path.join(D, `tmp_rammed_earth_farm_diff_${k}.png`);
    PNG.encode(p, lv);
    execFileSync('C:/tools/texconv.exe', ['-nologo', '-y', '-sepalpha', '-f', 'BC7_UNORM', '-m', '0', '-o', D + 'dds', p], { stdio: 'pipe' });
    fs.copyFileSync(path.join(D, 'dds', `tmp_rammed_earth_farm_diff_${k}.dds`), path.join(OUT, `rammed_earth_farm_diff_${k}.dds`));
  }
}

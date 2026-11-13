// Rammed earth works: recolour the white/grey silk (trough fill, basket bundles, drying sheets) to shades of brown.
// node silk.js <maps dir>   (reads and rewrites rammed_earth_farm_diff_0.png, writes _0.._2.dds)
const path = require('path'), { execFileSync } = require('child_process');
const T = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/canal_orient/';
const PNG = require(T + 'png.js');
const { rgb2lab, lab2rgb } = require(T + 'lab.js');
const OUT = process.argv[2];
const SRC = path.join(OUT, 'rammed_earth_farm_diff_0.png');
const img = PNG.decode(SRC), W = img.w;

// atlas boxes [x0, y0, x1, y1] and the brown (Lab) each one gets
const regions = [
  { name: 'trough fill', box: [295, 375, 382, 418], lab: [45, 12, 24] },
  { name: 'basket bundles', box: [0, 210, 62, 300], lab: [38, 13, 22] },
  { name: 'big drying sheet', box: [478, 168, 728, 405], lab: [55, 9, 25] },
  { name: 'grey cloth', box: [368, 310, 480, 412], lab: [33, 10, 16] },
  { name: 'striped cloths', box: [866, 203, 950, 385], lab: [47, 16, 26] },
];

for (const r of regions) {
  const [x0, y0, x1, y1] = r.box;
  const px = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    const [L, a, b] = rgb2lab(img.data[i], img.data[i + 1], img.data[i + 2]);
    const w = Math.max(0, Math.min(1, (19 - Math.hypot(a, b)) / 7)); // grey/white only, soft edge; the dark dome trim (chroma ~21) stays
    if (w > 0 && L > 8) px.push([i, L, a, b, w]);
  }
  const Lm = px.reduce((s, p) => s + p[1] * p[4], 0) / px.reduce((s, p) => s + p[4], 0);
  for (const [i, L, a, b, w] of px) {
    const nL = Math.max(4, Math.min(92, r.lab[0] + (L - Lm) * 0.8));
    const [R, G, B] = lab2rgb(nL, r.lab[1], r.lab[2]);
    const o = [img.data[i], img.data[i + 1], img.data[i + 2]];
    [R, G, B].forEach((v, q) => { img.data[i + q] = Math.max(0, Math.min(255, Math.round(o[q] * (1 - w) + v * w))); });
  }
  console.log(r.name, px.length, 'px, mean L', Lm.toFixed(1));
}
PNG.encode(SRC, img, true);

// _1/_2 by box halving, then BC7 like the other levels
const half = (src, dst) => {
  const t = PNG.decode(src), w = t.w >> 1, h = t.h >> 1, o = PNG.create(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let q = 0; q < 4; q++) {
    let s = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) s += t.data[((2 * y + dy) * t.w + 2 * x + dx) * 4 + q];
    o.data[(y * w + x) * 4 + q] = Math.round(s / 4);
  }
  PNG.encode(dst, o, true);
};
const tmp = require('os').tmpdir();
const l1 = path.join(tmp, 'rammed_earth_farm_diff_1.png'), l2 = path.join(tmp, 'rammed_earth_farm_diff_2.png');
half(SRC, l1); half(l1, l2);
for (const f of [SRC, l1, l2]) execFileSync('C:/tools/texconv.exe', ['-f', 'BC7_UNORM', '-m', '0', '-y', '-o', OUT, f]);

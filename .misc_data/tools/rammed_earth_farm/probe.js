// Preview the silk plantation and map which atlas texels are used by high (dome) faces.
const T = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/canal_orient/';
const { loadGltf, render } = require(T + 'render.js');
const PNG = require(T + 'png.js');
const D = __dirname + '/';
const m = loadGltf(D + 'gltf.gltf');
const diff = PNG.decode(process.argv[2] || D + 's_silk_plantation_diff_0.png');
const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (const p of m.pos) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], p[q]); mx[q] = Math.max(mx[q], p[q]); }
console.log('bbox', mn.map(v => v.toFixed(2)), mx.map(v => v.toFixed(2)), 'verts', m.pos.length, 'tris', m.idx.length / 3);

// uv height map: max world y of faces covering each texel
const W = diff.w, H = diff.h, hy = new Float32Array(W * H).fill(-99);
for (let k = 0; k < m.idx.length; k += 3) {
  const id = [m.idx[k], m.idx[k + 1], m.idx[k + 2]];
  const T2 = id.map(i => [m.uv[i][0] * W, m.uv[i][1] * H]), Y = id.map(i => m.pos[i][1]);
  const area = (T2[1][0] - T2[0][0]) * (T2[2][1] - T2[0][1]) - (T2[1][1] - T2[0][1]) * (T2[2][0] - T2[0][0]);
  if (Math.abs(area) < 1e-9) continue;
  const x0 = Math.max(0, Math.floor(Math.min(...T2.map(t => t[0])))), x1 = Math.min(W - 1, Math.ceil(Math.max(...T2.map(t => t[0]))));
  const y0 = Math.max(0, Math.floor(Math.min(...T2.map(t => t[1])))), y1 = Math.min(H - 1, Math.ceil(Math.max(...T2.map(t => t[1]))));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w0 = ((T2[1][0] - px) * (T2[2][1] - py) - (T2[1][1] - py) * (T2[2][0] - px)) / area;
    const w1 = ((T2[2][0] - px) * (T2[0][1] - py) - (T2[2][1] - py) * (T2[0][0] - px)) / area;
    const w2 = 1 - w0 - w1;
    if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
    hy[y * W + x] = Math.max(hy[y * W + x], w0 * Y[0] + w1 * Y[1] + w2 * Y[2]);
  }
}
const img = PNG.create(W, H);
for (let i = 0; i < W * H; i++) {
  const h = hy[i];
  for (let q = 0; q < 3; q++) img.data[i * 4 + q] = diff.data[i * 4 + q] * 0.35;
  if (h > -99) { const t = Math.max(0, Math.min(1, (h - mn[1]) / (mx[1] - mn[1]))); img.data[i * 4] = 255 * t; img.data[i * 4 + 2] = 255 * (1 - t); }
  img.data[i * 4 + 3] = 255;
}
PNG.encode(D + 'uv_height.png', img, false);

const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
render([{ mesh: m, tex: diff, alphaTest: true }], { w: +(process.argv[4]||700), h: +(process.argv[5]||600), scale: +(process.argv[6]||110), center: c, yaw: 45, pitch: 35, bg: [205, 185, 150] }, process.argv[3] || D + 'preview.png');

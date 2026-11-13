// Pool textures for the Rammed Earth Works: warm sand fill and a de-greened ground decal.
const PNG = require('../canal_orient/png.js');
const out = process.argv[2] || '.';
const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255]; };
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const mean = (t, f = () => true) => { const s = [0, 0, 0]; let n = 0;
  for (let i = 0; i < t.w * t.h; i++) { const d = t.data.subarray(i * 4, i * 4 + 4); if (d[3] < 200 || !f(d)) continue; s[0] += d[0]; s[1] += d[1]; s[2] += d[2]; n++; }
  return s.map(v => v / n); };

// sand: keep the grain (luminance relative to the mean), recolour to Orient desert sand
const sand = PNG.decode('sand_01_diff_0.png');
const SAND = [178, 146, 100], sm = mean(sand), sl = lum(...sm);
for (let i = 0; i < sand.w * sand.h; i++) {
  const d = sand.data, k = lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) / sl;
  for (let q = 0; q < 3; q++) d[i * 4 + q] = Math.max(0, Math.min(255, Math.round(SAND[q] * (0.55 + 0.45 * k))));
  d[i * 4 + 3] = 255;
}
PNG.encode(out + '/rammed_earth_pool_sand_diff_0.png', sand, true);

// ground decal: green/olive pixels → dirt of the same brightness, then shift the whole map to the silk ground mean
const g = PNG.decode('aqua_farm_module_ground_colony01_01_diff_0.png');
const isGreen = d => { const [h, s] = hsv(d[0], d[1], d[2]); return h > 40 && h < 170 && s > 0.12; };
const dirt = mean(g, d => !isGreen(d)), dl = lum(...dirt);
const silk = mean(PNG.decode('silkground.png'));
let n = 0;
for (let i = 0; i < g.w * g.h; i++) {
  const d = g.data.subarray(i * 4, i * 4 + 4);
  const [h, s] = hsv(d[0], d[1], d[2]);
  // soft weight so clump edges blend
  const w = Math.max(0, Math.min(1, (s - 0.08) / 0.1)) * Math.max(0, Math.min(1, Math.min(h - 36, 180 - h) / 8));
  if (w > 0) { n++; const k = 1 + (lum(d[0], d[1], d[2]) / dl - 1) * 0.5; for (let q = 0; q < 3; q++) d[q] = d[q] * (1 - w) + dirt[q] * k * w; }
  for (let q = 0; q < 3; q++) d[q] = Math.max(0, Math.min(255, Math.round(d[q] * silk[q] / dirt[q])));
}
console.log('sand mean', mean(sand).map(Math.round), 'ground recoloured px', n, 'ground mean', mean(g).map(Math.round), 'silk', silk.map(Math.round));
PNG.encode(out + '/rammed_earth_pool_ground_diff_0.png', g, true);

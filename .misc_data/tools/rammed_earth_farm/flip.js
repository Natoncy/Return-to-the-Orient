// node flip.js in.png out.png [invertR]  — horizontal flip; invertR also negates a normal map's x (R)
const PNG = require('../canal_orient/png.js'); const [i, o, inv] = process.argv.slice(2);
const t = PNG.decode(i), r = PNG.create(t.w, t.h);
for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
  const s = (y * t.w + (t.w - 1 - x)) * 4, d = (y * t.w + x) * 4;
  for (let q = 0; q < 4; q++) r.data[d + q] = t.data[s + q];
  if (inv) r.data[d] = 255 - r.data[d];
}
PNG.encode(o, r, true);

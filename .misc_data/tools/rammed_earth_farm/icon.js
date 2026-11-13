// Placeholder rammed earth icon: key out the baked checkerboard, crop, pad square, area-downscale to 128.
// node icon.js <out png>
const PNG = require('C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/canal_orient/png.js');
const src = PNG.decode(__dirname + '/src.png');
const W = src.w, H = src.h, d = src.data;
// background = bright, near-neutral pixels connected to the border
const bgLike = i => { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; return Math.min(r, g, b) > 200 && Math.max(r, g, b) - Math.min(r, g, b) < 14; };
const bg = new Uint8Array(W * H), st = [];
for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
while (st.length) {
  const i = st.pop();
  if (bg[i] || !bgLike(i)) continue;
  bg[i] = 1;
  const x = i % W, y = (i / W) | 0;
  if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W);
}
// alpha with a 1 px soft edge: foreground pixels touching background get partial alpha from their brightness
const A = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) A[i] = bg[i] ? 0 : 1;
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = y * W + x;
  if (bg[i]) continue;
  if (bg[i - 1] || bg[i + 1] || bg[i - W] || bg[i + W]) { const l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; A[i] = Math.max(0.35, Math.min(1, (235 - l) / 120)); }
}
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (A[y * W + x] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const side = Math.round(Math.max(x1 - x0 + 1, y1 - y0 + 1) * 1.06);
const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
const N = 128, out = PNG.create(N, N), f = side / N;
for (let oy = 0; oy < N; oy++) for (let ox = 0; ox < N; ox++) {
  const sx0 = cx - side / 2 + ox * f, sy0 = cy - side / 2 + oy * f;
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  for (let sy = Math.floor(sy0); sy < Math.ceil(sy0 + f); sy++) for (let sx = Math.floor(sx0); sx < Math.ceil(sx0 + f); sx++) {
    n++;
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const i = sy * W + sx, al = A[i];
    r += d[i * 4] * al; g += d[i * 4 + 1] * al; b += d[i * 4 + 2] * al; a += al;
  }
  const o = (oy * N + ox) * 4;
  if (a > 0) { out.data[o] = Math.round(r / a); out.data[o + 1] = Math.round(g / a); out.data[o + 2] = Math.round(b / a); }
  out.data[o + 3] = Math.round(255 * a / n);
}
PNG.encode(process.argv[2], out);
console.log('bbox', x0, y0, x1, y1, 'side', side);

// Widen the dome ground decal from 3 m to 4 m (384 -> 512 px), 88 px new ground on each side (64 px added plus the old
// 24 px edge band). The new strips get no tiled blocks (those left horizontal lines): colour = smooth base + cobble detail.
//   detail: high-pass (colour minus a ~5 px gaussian blur) of the plain cobbles x 25..140, y 210..288 (below the foundation posts), sampled at random offsets on a
//           28 px grid and blended with smooth weights, renormalised so the contrast does not fade between grid points;
//   base:   the cobble mean far out, turning into the blurred colour of the old interior next to the seam;
//   last 16 px: blended into the old edge columns, which really continue the interior. Alpha: the old ragged edge, mirrored.
// node ground_extend.js <in 384x384 png> <out 512x384 png>
const PNG = require('../canal_orient/png.js');
const [src, dst] = process.argv.slice(2);
const t = PNG.decode(src), W = 512, H = t.h, E = 24, F = 64, B = E + F, o = PNG.create(W, H);
const px = (x, y) => t.data.subarray((y * t.w + x) * 4, (y * t.w + x) * 4 + 4);

// separable box blur, 3 passes ~ gaussian
const blur = (img, w, h, r) => {
  let a = Float32Array.from(img), b = new Float32Array(a.length);
  for (let pass = 0; pass < 3; pass++) for (const horiz of [true, false]) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let q = 0; q < 3; q++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { const xx = horiz ? x + d : x, yy = horiz ? y : y + d; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; s += a[(yy * w + xx) * 3 + q]; n++; }
      b[(y * w + x) * 3 + q] = s / n;
    }
    [a, b] = [b, a];
  }
  return a;
};
const rgb = new Float32Array(t.w * t.h * 3);
for (let i = 0; i < t.w * t.h; i++) for (let q = 0; q < 3; q++) rgb[i * 3 + q] = t.data[i * 4 + q];
const low = blur(rgb, t.w, t.h, 4);
const detail = (x, y, q) => rgb[(y * t.w + x) * 3 + q] - low[(y * t.w + x) * 3 + q];

const SX = [25, 140], SY = [210, 288], G = [0, 0, 0];
{ let n = 0; for (let y = SY[0]; y < SY[1]; y++) for (let x = SX[0]; x < SX[1]; x++) { for (let q = 0; q < 3; q++) G[q] += rgb[(y * t.w + x) * 3 + q]; n++; } G.forEach((v, q) => G[q] = v / n); }

// per-row colour of the old interior next to each seam, smoothed down the column
const seamCol = (x0, x1) => {
  const col = new Float32Array(H * 3);
  for (let y = 0; y < H; y++) { const s = [0, 0, 0]; let n = 0;
    for (let x = x0; x < x1; x++) if (px(x, y)[3] > 250) { for (let q = 0; q < 3; q++) s[q] += rgb[(y * t.w + x) * 3 + q]; n++; }
    for (let q = 0; q < 3; q++) col[y * 3 + q] = n ? s[q] / n : G[q]; }
  return blur(col, 1, H, 8);
};
const seamL = seamCol(E, E + 32), seamR = seamCol(t.w - E - 32, t.w - E);

// random source offset per grid node
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const S = 28, gw = Math.ceil(B / S) + 2, gh = Math.ceil(H / S) + 2;
const nodes = [0, 1].map(() => Array.from({ length: gw * gh }, () => [Math.floor(rnd() * (SX[1] - SX[0] - S * 2)), Math.floor(rnd() * (SY[1] - SY[0] - S * 2))]));
const filler = (bx, y, side) => {
  const gx = bx / S, gy = y / S, ix = Math.floor(gx), iy = Math.floor(gy), d = [0, 0, 0]; let w2 = 0;
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const nx = ix + dx, ny = iy + dy, w = (1 - Math.abs(gx - nx)) * (1 - Math.abs(gy - ny)), wq = w * w * (3 - 2 * w);
    if (wq <= 0) continue;
    const [ox, oy] = nodes[side][ny * gw + nx];
    const sx = SX[0] + ox + (bx - nx * S) + S, sy = SY[0] + oy + (y - ny * S) + S;
    for (let q = 0; q < 3; q++) d[q] += wq * detail(sx, sy, q);
    w2 += wq * wq;
  }
  const k = 1 / Math.sqrt(w2 || 1);
  const seam = side ? seamR : seamL, s = Math.max(0, Math.min(1, (bx - 30) / 50)), sm = s * s * (3 - 2 * s);
  return [0, 1, 2].map(q => G[q] * (1 - sm) + seam[y * 3 + q] * sm + d[q] * k);
};

const mirL = x => x < E ? x : 2 * E + F - 1 - x;
const mirR = x => t.w - 1 - mirL(W - 1 - x);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let c;
  if (x < B || x >= W - B) {
    const left = x < B, bx = left ? x : W - 1 - x, m = px(left ? mirL(x) : mirR(x), y), n = px(Math.max(0, Math.min(t.w - 1, x - F)), y);
    const f = filler(bx, y, left ? 0 : 1), k = Math.max(0, Math.min(1, (bx - (B - 16)) / 16)) * (n[3] > 200 ? 1 : 0);
    c = [0, 1, 2].map(q => Math.max(0, Math.min(255, f[q] * (1 - k) + n[q] * k))); c.push(m[3]);
  } else c = px(x - F, y);
  o.data.set(c.map(Math.round), (y * W + x) * 4);
}
PNG.encode(dst, o, true);

// Oriental Embassy public service icon (icon_oriental_embassy.png).
// Frame + green field from the mosque icon (crescent removed, field refilled), with the temple silhouette
// temple_silhouette.png (user-supplied, black on white) drawn in the glossy pale blue of the consulate turban.
// The colour ramp is sampled from the turban pixels of icon_consulate.png, so it matches exactly.
//   node embassy.js            -> writes data/graphics/icons/public_services/icon_oriental_embassy.png (PNG only, user rule)
const path = require('path');
const { decode, encode } = require(path.join(__dirname, '..', 'ornament_icons', 'png.js'));

const MOD = path.join(__dirname, '..', '..', '..');
const ICONS = path.join(MOD, 'data/graphics/icons/public_services');
const OUT = process.argv[2] || path.join(ICONS, 'icon_oriental_embassy.png');
const W = 128, SS = 4, HW = W * SS;

// placement of the temple in icon pixels (field interior is about x 15..112, y 20..110)
const BOX = { cx: 64, cy: 64, w: 84, h: 80 };
const LIGHT = norm([-0.45, -0.7, 0.75]);
const BLUR = 2.0;      // px (1x) of the height-field blur: columns ~6 px wide come out round
const BUMP = 5.0;      // normal strength
const OUTLINE = [30, 40, 62], OUTLINE_A = 0.7;
const WHITE = [250, 253, 255]; // vanilla public service highlights go to near white

const clamp01 = t => Math.max(0, Math.min(1, t));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function norm(v) { const l = Math.hypot(...v); return v.map(x => x / l); }

// ---------- turban colour ramp (by brightness) ----------
function turbanRamp() {
  const c = decode(path.join(ICONS, 'icon_consulate.png'));
  const t = [];
  for (let i = 0; i < W * W; i++) {
    const r = c.px[i * 4], g = c.px[i * 4 + 1], b = c.px[i * 4 + 2];
    if (b > r + 25 && c.px[i * 4 + 3] > 250) t.push([r, g, b, r + g + b]);
  }
  t.sort((a, b) => a[3] - b[3]);
  const N = 32, ramp = [];
  for (let k = 0; k < N; k++) { // average of each brightness bucket
    const a = Math.floor(k / N * t.length), b = Math.max(a + 1, Math.floor((k + 1) / N * t.length));
    const s = [0, 0, 0]; for (let j = a; j < b; j++) for (let q = 0; q < 3; q++) s[q] += t[j][q];
    ramp.push(s.map(v => v / (b - a)));
  }
  // top of the ramp blends from the turban's brightest towards white (vanilla icons' highlights)
  const turban = u => { const x = clamp01(u) * (N - 1), i = Math.min(N - 2, Math.floor(x)), f = x - i; return ramp[i].map((v, q) => v + (ramp[i + 1][q] - v) * f); };
  return u => { const top = turban(1); if (u <= 0.85) return turban(u / 0.85); const f = clamp01((u - 0.85) / 0.15); return top.map((v, q) => v + (WHITE[q] - v) * f); };
}

// ---------- frame: mosque icon with the crescent replaced by the fitted green field ----------
function frame() {
  const m = decode(path.join(ICONS, 'icon_mosque.png'));
  const img = Float32Array.from(m.px);
  const at = (x, y) => (y * W + x) * 4;
  const isCopper = i => img[i] > img[i + 1] + 15 && img[i + 3] > 128;
  const isGreen = i => img[i + 1] > img[i] + 30 && img[i + 1] > img[i + 2] + 30;
  // field = region reachable from the centre without crossing the copper frame
  const field = new Uint8Array(W * W), st = [[64, 64]];
  while (st.length) {
    const [x, y] = st.pop();
    if (x < 0 || y < 0 || x >= W || y >= W || field[y * W + x] || isCopper(at(x, y))) continue;
    field[y * W + x] = 1; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // quadratic fit of the green over clean field pixels
  const rows = [], vals = [[], [], []];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = at(x, y); if (!field[y * W + x] || !isGreen(i)) continue;
    const u = (x - 64) / 64, v = (y - 64) / 64;
    rows.push([1, u, v, u * u, u * v, v * v]); for (let q = 0; q < 3; q++) vals[q].push(img[i + q]);
  }
  const coef = vals.map(b => lstsq(rows, b));
  const fit = (x, y) => { const u = (x - 64) / 64, v = (y - 64) / 64, r = [1, u, v, u * u, u * v, v * v]; return coef.map(c => r.reduce((s, a, k) => s + a * c[k], 0)); };
  // replace everything in the field that is not clean green, plus a 1 px ring around it (antialiasing)
  const bad = new Uint8Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (field[y * W + x] && !isGreen(at(x, y))) bad[y * W + x] = 1;
  for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!field[y * W + x] || bad[y * W + x] === 1) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (bad[(y + dy) * W + x + dx] === 1) { bad[y * W + x] = 2; break; }
  }
  // 1) the frame is left-right symmetric: take the mirrored pixel where it is clean green (axis picked by best match)
  let axis = 127, best = 1e9;
  for (const a of [125, 126, 127, 128, 129]) {
    let e = 0, n = 0;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const mx = a - x; if (mx < 0 || mx >= W || bad[y * W + x] || !field[y * W + x] || bad[y * W + mx] || !field[y * W + mx]) continue;
      e += Math.abs(img[at(x, y) + 1] - img[at(mx, y) + 1]); n++;
    }
    if (n > 500 && e / n < best) { best = e / n; axis = a; }
  }
  const known = new Uint8Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (!field[y * W + x]) continue;
    if (!bad[y * W + x]) { known[y * W + x] = 1; continue; }
    const mx = axis - x;
    if (mx >= 0 && mx < W && field[y * W + mx] && !bad[y * W + mx]) {
      for (let q = 0; q < 4; q++) img[at(x, y) + q] = img[at(mx, y) + q];
      known[y * W + x] = 1;
    }
  }
  // 2) the rest: harmonic fill from the known neighbours (start from the quadratic fit)
  const todo = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (field[y * W + x] && !known[y * W + x]) {
    const c = fit(x + 0.5, y + 0.5); for (let q = 0; q < 3; q++) img[at(x, y) + q] = c[q]; img[at(x, y) + 3] = 255; todo.push([x, y]);
  }
  for (let it = 0; it < 400; it++) for (const [x, y] of todo) {
    const s = [0, 0, 0]; let n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= W || !field[yy * W + xx]) continue;
      for (let q = 0; q < 3; q++) s[q] += img[at(xx, yy) + q]; n++;
    }
    if (n) for (let q = 0; q < 3; q++) img[at(x, y) + q] = s[q] / n;
  }
  console.log('mirror axis', axis / 2, 'mean diff', best.toFixed(2), 'diffusion-filled px', todo.length);
  // 3) flatten: the mosque field has a round glow whose rim showed as a dark half circle beside the temple.
  //    Repaint the field as a function of the distance to the frame only (flat centre, darker towards the
  //    frame, like the vanilla pub's green). The outermost pixel ring keeps its antialiasing with the frame.
  const dist = new Float32Array(W * W).fill(1e9);
  const edgePx = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (!field[y * W + x]) edgePx.push([x, y]);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (!field[y * W + x]) { dist[y * W + x] = 0; continue; }
    let d = 1e9; for (const [ex, ey] of edgePx) { const dd = (ex - x) * (ex - x) + (ey - y) * (ey - y); if (dd < d) d = dd; }
    dist[y * W + x] = Math.sqrt(d);
  }
  const bins = Array.from({ length: 40 }, () => [[], [], []]);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!known[i] || bad[i]) continue; // original clean green only
    const b = Math.min(39, Math.round(dist[i])); for (let q = 0; q < 3; q++) bins[b][q].push(img[i * 4 + q]);
  }
  const med = a => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length * 0.75)]; }; // upper quartile: ignore shadowed pixels
  const prof = []; let last = null;
  for (let b = 0; b < 40; b++) { const v = bins[b][1].length > 20 ? bins[b].map(med) : last; prof.push(v); if (v) last = v; }
  const first = prof.find(v => v); for (let b = 0; b < 40 && !prof[b]; b++) prof[b] = first;
  for (let b = 1; b < 40; b++) prof[b] = prof[b].map((v, q) => Math.max(v, prof[b - 1][q])); // monotone: brighter inward
  const plateau = 14; // px from the frame where the field is flat
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!field[i] || dist[i] < 1.5) continue;
    const d = Math.min(plateau, dist[i]), b0 = Math.floor(d), f = d - b0, b1 = Math.min(39, b0 + 1);
    for (let q = 0; q < 3; q++) img[i * 4 + q] = prof[b0][q] + (prof[b1][q] - prof[b0][q]) * f;
  }
  return img;
}
function lstsq(A, b) { // normal equations, Gaussian elimination
  const n = A[0].length, M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  A.forEach((r, k) => { for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i][j] += r[i] * r[j]; M[i][n] += r[i] * b[k]; } });
  for (let i = 0; i < n; i++) {
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = 0; k < n; k++) if (k !== i) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}

// ---------- temple mask at supersampled resolution ----------
function templeMask() {
  const s = decode(path.join(__dirname, 'temple_silhouette.png'));
  const dark = new Float32Array(s.w * s.h);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const i = (y * s.w + x) * s.ch, l = (s.px[i] + s.px[i + 1] + s.px[i + 2]) / 3, a = s.ch === 4 ? s.px[i + 3] / 255 : 1;
    const d = (1 - smooth(70, 150, l)) * a; // the light-grey watermark stays out
    dark[y * s.w + x] = d;
    if (d > 0.5) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const bw = x1 + 1 - x0, bh = y1 + 1 - y0, sc = Math.min(BOX.w / bw, BOX.h / bh);
  const ox = BOX.cx - bw * sc / 2, oy = BOX.cy - bh * sc / 2;
  const samp = (x, y) => {
    const fx = x - 0.5, fy = y - 0.5, xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
    const g = (xx, yy) => (xx < 0 || yy < 0 || xx >= s.w || yy >= s.h) ? 0 : dark[yy * s.w + xx];
    return g(xi, yi) * (1 - tx) * (1 - ty) + g(xi + 1, yi) * tx * (1 - ty) + g(xi, yi + 1) * (1 - tx) * ty + g(xi + 1, yi + 1) * tx * ty;
  };
  // the pediment's round hole: white pixels not reachable from the image border
  const reach = new Uint8Array(s.w * s.h), st = [];
  for (let x = 0; x < s.w; x++) st.push([x, 0], [x, s.h - 1]);
  for (let y = 0; y < s.h; y++) st.push([0, y], [s.w - 1, y]);
  while (st.length) {
    const [x, y] = st.pop();
    if (x < 0 || y < 0 || x >= s.w || y >= s.h || reach[y * s.w + x] || dark[y * s.w + x] > 0.5) continue;
    reach[y * s.w + x] = 1; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  let hx = 0, hy = 0, hn = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!reach[y * s.w + x] && dark[y * s.w + x] <= 0.5) { hx += x + 0.5; hy += y + 0.5; hn++; }
  const hole = hn ? { x: ox + (hx / hn - x0) * sc, y: oy + (hy / hn - y0) * sc, r: Math.sqrt(hn / Math.PI) * sc } : null;
  // crescent cut-out instead of the hole: outer disk minus a disk shifted to the top right (opening faces top right)
  const CR = hole ? hole.r * 1.65 : 0, CUT = 0.78, SH = [0.4, -0.4];
  const M = new Float32Array(HW * HW);
  for (let y = 0; y < HW; y++) for (let x = 0; x < HW; x++) {
    const ix = (x + 0.5) / SS, iy = (y + 0.5) / SS;
    let v = smooth(0.35, 0.65, samp(x0 + (ix - ox) / sc, y0 + (iy - oy) / sc));
    if (hole) {
      const dx = ix - hole.x, dy = iy - hole.y, r = Math.hypot(dx, dy);
      if (r < hole.r * 1.6) v = 1; // fill the round hole
      const inOuter = r < CR, inCut = Math.hypot(dx - SH[0] * CR, dy - SH[1] * CR) < CR * CUT;
      if (inOuter && !inCut) v = 0;
    }
    M[y * HW + x] = v;
  }
  if (hole) console.log('crescent at', hole.x.toFixed(1), hole.y.toFixed(1), 'radius', CR.toFixed(1), 'px');
  return M;
}
function blur(src, sigma) { // separable gaussian on HW x HW
  const r = Math.ceil(sigma * 3), k = []; let ks = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); ks += v; }
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < HW; y++) for (let x = 0; x < HW; x++) { let s = 0; for (let i = -r; i <= r; i++) { const xx = Math.min(HW - 1, Math.max(0, x + i)); s += src[y * HW + xx] * k[i + r]; } tmp[y * HW + x] = s / ks; }
  for (let y = 0; y < HW; y++) for (let x = 0; x < HW; x++) { let s = 0; for (let i = -r; i <= r; i++) { const yy = Math.min(HW - 1, Math.max(0, y + i)); s += tmp[yy * HW + x] * k[i + r]; } out[y * HW + x] = s / ks; }
  return out;
}

// ---------- compose ----------
const ramp = turbanRamp();
const base = frame();
const M = templeMask();
const H = blur(M, BLUR * SS);
const Hf = blur(M, 0.55 * SS);              // fine bevel: crisp edge highlights
const ring = blur(M, 0.9 * SS);             // outline = slightly grown silhouette
const shadow = blur(M, 1.6 * SS);
const yTop = (BOX.cy - BOX.h / 2) * SS, yBot = (BOX.cy + BOX.h / 2) * SS;

const acc = new Float32Array(W * W * 4); // supersampled colour, averaged down
for (let y = 0; y < HW; y++) for (let x = 0; x < HW; x++) {
  const bi = ((y / SS | 0) * W + (x / SS | 0)) * 4;
  let c = [base[bi], base[bi + 1], base[bi + 2]];
  // drop shadow down-right
  const sx = Math.max(0, x - 2 * SS), sy = Math.max(0, y - 2 * SS), sa = shadow[sy * HW + sx] * 0.45;
  c = c.map(v => v * (1 - sa));
  // outline
  const oa = smooth(0.02, 0.35, ring[y * HW + x]) * OUTLINE_A;
  c = c.map((v, q) => v + (OUTLINE[q] - v) * oa);
  // body
  const m = M[y * HW + x];
  if (m > 0) {
    const i = y * HW + x;
    const gx = (H[y * HW + Math.min(HW - 1, x + 1)] - H[y * HW + Math.max(0, x - 1)]) * SS / 2;
    const gy = (H[Math.min(HW - 1, y + 1) * HW + x] - H[Math.max(0, y - 1) * HW + x]) * SS / 2;
    const n = norm([-gx * BUMP, -gy * BUMP, 1]);
    const diff = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
    const fx = (Hf[y * HW + Math.min(HW - 1, x + 1)] - Hf[y * HW + Math.max(0, x - 1)]) * SS / 2;
    const fy = (Hf[Math.min(HW - 1, y + 1) * HW + x] - Hf[Math.max(0, y - 1) * HW + x]) * SS / 2;
    const bev = -(fx * LIGHT[0] + fy * LIGHT[1]) / Math.hypot(LIGHT[0], LIGHT[1]); // + on lit edges, - on shadow edges
    const refl = 2 * diff * n[2] - LIGHT[2]; // reflection towards the viewer (0,0,1)
    const spec = Math.pow(clamp01(refl), 24);
    const vert = 1 - (y - yTop) / (yBot - yTop); // brighter at the top, like the turban
    const edge = smooth(0.5, 0.95, H[i]);       // inner parts slightly darker than the bevel highlights
    let t = 0.5 + 0.42 * clamp01((diff - 0.25) / 0.75) + 0.12 * vert + 0.45 * spec - 0.05 * (1 - edge) + Math.max(-0.3, Math.min(0.45, bev * 1.4));
    const col = ramp(t);
    c = c.map((v, q) => v + (col[q] - v) * m);
  }
  const o = bi;
  for (let q = 0; q < 3; q++) acc[o + q] += c[q] / (SS * SS);
  acc[o + 3] += base[bi + 3] / (SS * SS);
}
const px = Buffer.alloc(W * W * 4);
for (let i = 0; i < px.length; i++) px[i] = Math.max(0, Math.min(255, Math.round(acc[i])));
encode(OUT, W, W, 4, px);
console.log('wrote', OUT);

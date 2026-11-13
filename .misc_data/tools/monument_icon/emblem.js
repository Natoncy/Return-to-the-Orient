// Shared parts of the monument-style emblems (gold object on a coloured disc inside a laurel wreath on a scroll
// pedestal, like the vanilla monument and hacienda icons). The frame is taken from the Grand Mosque emblem
// icon_monument.png: its green disc is repainted by the caller and the crescent and star are drawn over.
// The crescent also overlapped the pedestal, so its middle is patched from the vanilla stadium emblem's intact pedestal.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { decode, encode } = require(path.join(__dirname, '..', 'ornament_icons', 'png.js'));

const MOD = path.join(__dirname, '..', '..', '..');
const FRAME = path.join(MOD, 'data/graphics/icons/public_services/icon_monument.png');

const W = 128, SS = 8, HW = W * SS;
const CX = 65.5, CY = 64, R_DISC = 44.6, R_RIM = 40.5, CUT_Y = 88; // disc of the mosque frame

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = t => Math.max(0, Math.min(1, t));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---- frame: mosque emblem with the disc repainted by discColor(x, y) ----
// edge: disc rim colour that stray green pixels outside the repainted area are tinted to
function makeFrame(discColor, edge) {
  const frame = decode(FRAME);
  const img = new Float32Array(W * W * 4);
  for (let i = 0; i < W * W * 4; i++) img[i] = frame.px[i];
  const isGreen = (r, g, b) => g > r + 10 && g > b + 4;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, px = x + 0.5, py = y + 0.5;
    const r = Math.hypot(px - CX, py - CY);
    if (r < R_DISC && py < CUT_Y) {
      const c = discColor(px, py);
      const a = clamp01(R_DISC - r); // antialiased edge against the wreath ring
      for (let k = 0; k < 3; k++) img[i + k] = img[i + k] * (1 - a) + c[k] * a;
    } else if (isGreen(img[i], img[i + 1], img[i + 2])) {
      // stray green edge pixels: same brightness, new hue
      const v = img[i + 1] / 57;
      for (let k = 0; k < 3; k++) img[i + k] = Math.min(255, edge[k] * v);
    }
  }
  patchPedestal(img);
  return img;
}

// ---- pedestal repair: same artwork as the stadium's, which is drawn larger and lower ----
// mosque pixel (x, y) = stadium ((x - 64 - PED_DX) / PED_S + 64, ...), fitted on the intact scrolls (RMS 12)
const STADIUM = 'D:/anno_data/1800/data/ui/2kimages/main/3dicons/icon_stadium_0.dds';
const PED_S = 0.885, PED_DX = 1.25, PED_DY = -2.25, PED_TOP = 92.5; // stadium pedestal starts at its row 93
const PED_X0 = 30, PED_X1 = 98, PED_RAMP = 5;                       // columns the crescent damaged
function sample(im, x, y) { // bilinear, premultiplied alpha
  const x0 = Math.floor(x - 0.5), y0 = Math.floor(y - 0.5), fx = x - 0.5 - x0, fy = y - 0.5 - y0, o = [0, 0, 0, 0];
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const xx = x0 + dx, yy = y0 + dy;
    if (xx < 0 || yy < 0 || xx >= im.w || yy >= im.h) continue;
    const i = (yy * im.w + xx) * 4, a = im.px[i + 3] / 255;
    for (let k = 0; k < 3; k++) o[k] += im.px[i + k] * a * w;
    o[3] += a * w;
  }
  return o;
}
function patchPedestal(img) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emblem_'));
  execFileSync('C:/tools/texconv.exe', ['-ft', 'PNG', '-y', '-o', tmp, STADIUM], { stdio: 'ignore' });
  const stadium = decode(path.join(tmp, 'icon_stadium_0.png'));
  fs.rmSync(tmp, { recursive: true });
  for (let y = 0; y < W; y++) for (let x = PED_X0 - PED_RAMP; x <= PED_X1 + PED_RAMP; x++) {
    const sx = (x + 0.5 - 64 - PED_DX) / PED_S + 64, sy = (y + 0.5 - 64 - PED_DY) / PED_S + 64;
    const t = clamp01(sy - PED_TOP) * Math.min(clamp01((x - PED_X0 + PED_RAMP) / PED_RAMP), clamp01((PED_X1 + PED_RAMP - x) / PED_RAMP));
    if (t <= 0) continue;
    const q = sample(stadium, sx, sy), i = (y * W + x) * 4, a0 = img[i + 3] / 255;
    const a = a0 * (1 - t) + q[3] * t;
    for (let k = 0; k < 3; k++) img[i + k] = a > 0 ? (img[i + k] * a0 * (1 - t) + q[k] * t) / a : 0;
    img[i + 3] = a * 255;
  }
}

// ---- supersampled layers ----
function layer() { return { c: new Float32Array(HW * HW * 3), a: new Float32Array(HW * HW), id: new Int16Array(HW * HW).fill(-1) }; }
function fillPoly(L, pts, shade, id) {
  const P = pts.map(([x, y]) => [x * SS, y * SS]);
  let y0 = Math.max(0, Math.floor(Math.min(...P.map(p => p[1])))), y1 = Math.min(HW - 1, Math.ceil(Math.max(...P.map(p => p[1]))));
  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < P.length; i++) {
      const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
      if ((ay <= sy) !== (by <= sy)) xs.push(ax + (sy - ay) / (by - ay) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(HW - 1, Math.floor(xs[k + 1] - 0.5)); x++) {
        const j = y * HW + x, c = shade((x + 0.5) / SS, sy / SS);
        L.c[j * 3] = c[0]; L.c[j * 3 + 1] = c[1]; L.c[j * 3 + 2] = c[2]; L.a[j] = c[3] ?? 1; L.id[j] = id;
      }
  }
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const trap = (xb0, xb1, yb, xt0, xt1, yt) => [[xt0, yt], [xt1, yt], [xb1, yb], [xb0, yb]];
function arch(x0, x1, yBot, ySpring) { // arched opening, round top
  const cx = (x0 + x1) / 2, rr = (x1 - x0) / 2, pts = [[x0, yBot], [x0, ySpring]];
  for (let k = 1; k < 12; k++) { const t = Math.PI * (1 - k / 12); pts.push([cx + rr * Math.cos(t), ySpring - rr * Math.sin(t)]); }
  pts.push([x1, ySpring], [x1, yBot]);
  return pts;
}

// gold palette fitted by eye to the vanilla Eiffel / World's Fair emblems
const G_HI = [255, 238, 150], G_LT = [255, 212, 92], G_MID = [242, 164, 36], G_DK = [196, 110, 18], G_DEEP = [120, 62, 10];
// faces lit from the left: t = 0 at the left edge, 1 at the right edge of the part
const face = (x0, x1, lo = G_LT, hi = G_DK) => (x) => {
  const t = clamp01((x - x0) / (x1 - x0));
  return t < 0.5 ? mix(lo, G_MID, t * 2) : mix(G_MID, hi, (t - 0.5) * 2);
};
// three facets of an octagonal shaft
const facets = (x0, x1) => (x) => {
  const t = (x - x0) / (x1 - x0);
  return t < 0.28 ? mix(G_HI, G_LT, t / 0.28) : t < 0.72 ? mix(G_LT, G_MID, (t - 0.28) / 0.44) : mix(G_MID, G_DK, (t - 0.72) / 0.28);
};
const flat = c => () => c;

// bevel: lighten along top/left part borders, darken along bottom/right ones
function bevel(L) {
  const B = 6;
  const g2 = new Float32Array(L.c);
  for (let y = 0; y < HW; y++) for (let x = 0; x < HW; x++) {
    const j = y * HW + x, id = L.id[j];
    if (id < 0) continue;
    let lit = 0, dark = 0;
    for (let d = 1; d <= B; d++) {
      if (!lit && (y - d < 0 || L.id[(y - d) * HW + x] !== id || x - d < 0 || L.id[j - d] !== id)) lit = 1 - (d - 1) / B;
      if (!dark && (y + d >= HW || L.id[(y + d) * HW + x] !== id || x + d >= HW || L.id[j + d] !== id)) dark = 1 - (d - 1) / B;
    }
    for (let k = 0; k < 3; k++) {
      let v = g2[j * 3 + k];
      v += (G_HI[k] + 25 - v) * 0.55 * lit;
      v += (G_DEEP[k] - v) * 0.6 * dark;
      L.c[j * 3 + k] = v;
    }
  }
}

// ---- downsample and composite: glow layer (clipped to the disc), drop shadow, outline, gold ----
function down(L) {
  const c = new Float32Array(W * W * 3), a = new Float32Array(W * W);
  for (let y = 0; y < HW; y++) for (let x = 0; x < HW; x++) {
    const j = y * HW + x, o = ((y / SS | 0) * W + (x / SS | 0));
    a[o] += L.a[j]; for (let k = 0; k < 3; k++) c[o * 3 + k] += L.c[j * 3 + k] * L.a[j];
  }
  for (let o = 0; o < W * W; o++) { if (a[o] > 0) for (let k = 0; k < 3; k++) c[o * 3 + k] /= a[o]; a[o] /= SS * SS; }
  return { c, a };
}
const dil = (src, rad) => { // max filter
  const d = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    let m = 0;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad + 0.5) continue;
      const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < W) m = Math.max(m, src[yy * W + xx]);
    }
    d[y * W + x] = m;
  }
  return d;
};
// gold: bevelled object layer; glow: optional layer drawn on the disc only; shadow: drop shadow colour
function finish(img, gold, { glow, shadow }, out) {
  const over = (o, c, a) => { for (let k = 0; k < 3; k++) img[o * 4 + k] = img[o * 4 + k] * (1 - a) + c[k] * a; img[o * 4 + 3] = Math.max(img[o * 4 + 3], a * 255); };
  const inDisc = (x, y) => Math.hypot(x + 0.5 - CX, y + 0.5 - CY) < R_DISC - 0.5 && y + 0.5 < CUT_Y;
  if (glow) {
    const bm = down(glow);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const o = y * W + x; if (bm.a[o] > 0 && inDisc(x, y)) over(o, [bm.c[o * 3], bm.c[o * 3 + 1], bm.c[o * 3 + 2]], bm.a[o]);
    }
  }
  const gd = down(gold);
  // shadow down-right onto the disc and pedestal
  const sh = dil(gd.a, 1);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const s = sh[Math.max(0, y - 2) * W + Math.max(0, x - 2)];
    if (s > 0 && img[(y * W + x) * 4 + 3] > 0) over(y * W + x, shadow, s * 0.45);
  }
  const ol = dil(gd.a, 1);
  for (let o = 0; o < W * W; o++) if (ol[o] > 0) over(o, [44, 26, 8], ol[o] * 0.95);
  for (let o = 0; o < W * W; o++) if (gd.a[o] > 0) over(o, [gd.c[o * 3], gd.c[o * 3 + 1], gd.c[o * 3 + 2]], gd.a[o]);

  const px = Buffer.alloc(W * W * 4);
  for (let i = 0; i < W * W * 4; i++) px[i] = Math.max(0, Math.min(255, Math.round(img[i])));
  encode(out, W, W, 4, px);
  console.log('wrote', out);
}

module.exports = {
  W, CX, CY, R_DISC, R_RIM, mix, clamp01, smooth, makeFrame, layer, fillPoly, rect, trap, arch,
  G_HI, G_LT, G_MID, G_DK, G_DEEP, face, facets, flat, bevel, finish,
};

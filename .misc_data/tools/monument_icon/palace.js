// Sultan's Palace emblem: the mosque frame's disc in royal purple, a gold palace front with a big onion dome,
// two domed wings and two minarets.
// Usage: node palace.js <out.png>
const path = require('path');
const {
  CX, CY, R_DISC, R_RIM, mix, clamp01, smooth, makeFrame, layer, fillPoly, rect, arch,
  G_HI, G_LT, G_MID, G_DK, G_DEEP, face, facets, flat, bevel, finish,
} = require('./emblem.js');

const out = process.argv[2] || path.join(__dirname, 'icon_orient_sultanspalace_emblem.png');
const M = 2 * 65.5; // mirror axis x = 65.5
const mirror = pts => pts.map(([x, y]) => [M - x, y]).reverse();

// ---- disc: royal purple, a soft glow behind the dome, darker garden band at the bottom ----
const SKY_C = [118, 44, 134], SKY_E = [58, 16, 76], RIM = [22, 4, 30];
function discColor(x, y) {
  const r = Math.hypot(x - CX, y - CY);
  let c = mix(SKY_C, SKY_E, smooth(0, R_RIM, r) ** 1.4);
  c = mix(c, [196, 120, 206], Math.exp(-((x - 65.5) ** 2 + (y - 40) ** 2) / (2 * 15 ** 2)) * 0.4);
  if (y > 82) c = mix(c, [44, 12, 58], clamp01((y - 82) / 4) * 0.6);
  return mix(c, RIM, smooth(R_RIM, R_DISC - 0.3, r));
}
const img = makeFrame(discColor, SKY_E);

const gold = layer();
let nid = 0;
const part = (pts, f) => fillPoly(gold, pts, (x, y) => [...f(x, y), 1], nid++);
const hole = (pts, c = G_DEEP) => fillPoly(gold, pts, () => [...c, 1], nid++);
// onion dome on base y0 between x0..x1 with its tip at yTip: right half profile in units of the half width
const PROFILE = [[1, 0], [1.22, -0.22], [1.2, -0.42], [0.95, -0.62], [0.55, -0.8], [0.25, -0.92], [0, -1]];
function onion(x0, x1, y0, yTip) {
  const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2, h = y0 - yTip;
  const left = PROFILE.map(([u, v]) => [cx - u * hw, y0 + v * h]);                         // base → tip
  const right = PROFILE.slice(0, -1).reverse().map(([u, v]) => [cx + u * hw, y0 + v * h]); // tip → base
  return [...left, ...right];
}
// dome shading: bright highlight high on the left, dark on the right
const domeShade = (x0, x1) => (x, y) => {
  const t = clamp01((x - x0) / (x1 - x0));
  const c = t < 0.35 ? mix(G_HI, G_LT, t / 0.35) : t < 0.7 ? mix(G_LT, G_MID, (t - 0.35) / 0.35) : mix(G_MID, G_DK, (t - 0.7) / 0.3);
  return c;
};
const GROUND = 91;

// ---- wings: low blocks with battlements, two arched windows and a small dome each ----
function wing(x0, x1, sign) {
  part(rect(x0, 66, x1, GROUND), face(x0, x1, G_LT, G_DK));
  for (let x = x0 + 0.6; x + 2 <= x1; x += 3.3) part(rect(x, 63.4, x + 2, 66.2), face(x, x + 2, G_HI, G_DK)); // merlons
  part(rect(x0, 79.5, x1, 81), face(x0, x1, G_HI, G_MID)); // string course
  const w = (x1 - x0 - 3 * 2.6) / 2;
  for (let k = 0; k < 2; k++) {
    const a = x0 + 2.6 + k * (w + 2.6);
    hole(arch(a, a + w, 79, 73.5));
    hole(arch(a + 0.4, a + w - 0.4, GROUND - 1.2, 86));
  }
  const dc = (x0 + x1) / 2;
  part(rect(dc - 4.6, 59, dc + 4.6, 63.6), face(dc - 4.6, dc + 4.6)); // drum
  part(onion(dc - 4.6, dc + 4.6, 59.2, 49), domeShade(dc - 5.6, dc + 5.6));
  part(rect(dc - 0.45, 45.5, dc + 0.45, 49.5), face(dc - 0.45, dc + 0.45));
}
wing(32.5, 54, -1);
wing(M - 54, M - 32.5, 1);

// ---- minarets: slim shafts, a balcony, a pointed cap ----
function minaret(x0, x1) {
  const cx = (x0 + x1) / 2;
  part(rect(x0, 52, x1, GROUND), facets(x0, x1));
  part(rect(x0 - 1.6, 57.5, x1 + 1.6, 60), face(x0 - 1.6, x1 + 1.6, G_HI, G_DK)); // balcony
  part(rect(x0 - 0.8, 72, x1 + 0.8, 73.6), face(x0 - 0.8, x1 + 0.8, G_HI, G_DK)); // lower ring
  part([[x0 - 0.7, 52.4], [cx, 39], [x1 + 0.7, 52.4]], face(x0 - 0.7, x1 + 0.7, G_HI, G_DK));
  part(rect(cx - 0.35, 35.5, cx + 0.35, 39.5), face(cx - 0.35, cx + 0.35));
}
minaret(27.6, 31.8);
minaret(M - 31.8, M - 27.6);

// ---- central block: tall portal (iwan) with a deep arch, crowned by the big onion dome ----
const PX0 = 51.5, PX1 = M - PX0;
part(rect(PX0, 56.5, PX1, GROUND), face(PX0, PX1, G_LT, G_DK));
for (let x = PX0 + 0.5; x + 2 <= PX1; x += 3.15) part(rect(x, 54, x + 2, 56.8), face(x, x + 2, G_HI, G_DK)); // merlons
part(arch(56.2, M - 56.2, GROUND, 70), face(56, M - 56, G_MID, G_DEEP)); // pishtaq frame
hole(arch(58.6, M - 58.6, GROUND, 71.5));
part(arch(61.2, M - 61.2, GROUND, 76), face(61, M - 61, G_HI, G_DK)); // door
hole(rect(65.1, 77, 65.9, GROUND), G_DK);
part(rect(55, 49.5, M - 55, 54.3), face(55, M - 55)); // drum
for (let x = 56.8; x < M - 57.5; x += 3.6) hole(arch(x, x + 1.6, 53.4, 51.4)); // drum windows
part(onion(54.5, M - 54.5, 49.7, 26), domeShade(52, M - 52));
part([[65, 26.5], [65.5, 17.5], [66, 26.5]], face(65, 66)); // finial spike
const ball = Array.from({ length: 16 }, (_, k) => [65.5 + 1.7 * Math.cos(k * Math.PI / 8), 23.6 + 1.7 * Math.sin(k * Math.PI / 8)]);
part(ball, face(63.8, 67.2, G_HI, G_DK));

bevel(gold);
finish(img, gold, { shadow: [26, 6, 34] }, out);

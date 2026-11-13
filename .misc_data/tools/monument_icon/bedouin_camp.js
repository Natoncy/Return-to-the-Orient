// Bedouin Camp emblem: the mosque frame's disc in crimson with dunes, a gold three-pole Bedouin tent.
// Usage: node bedouin_camp.js <out.png>
const path = require('path');
const {
  CX, CY, R_DISC, R_RIM, mix, clamp01, smooth, makeFrame, layer, fillPoly, rect,
  G_HI, G_LT, G_MID, G_DK, G_DEEP, face, flat, bevel, finish,
} = require('./emblem.js');

const out = process.argv[2] || path.join(__dirname, 'icon_orient_bedouin_camp.png');

// ---- disc: crimson sky, darker dunes on the horizon ----
const SKY_C = [168, 34, 30], SKY_E = [92, 14, 16], RIM = [34, 4, 6];
const duneLine = x => 74 + 3.2 * Math.sin(x * 0.11 + 0.6) + 1.4 * Math.sin(x * 0.31 + 2.0);
function discColor(x, y) {
  const r = Math.hypot(x - CX, y - CY);
  let c = mix(SKY_C, SKY_E, smooth(0, R_RIM, r) ** 1.4);
  c = mix(c, [205, 70, 44], Math.exp(-((y - 70) ** 2) / (2 * 9 ** 2)) * 0.35); // warm haze over the horizon
  const s = duneLine(x);
  if (y > s) {
    c = mix([128, 26, 22], [84, 14, 14], clamp01((y - s) / 12));
    c = mix(c, [232, 118, 66], Math.exp(-((y - s - 0.7) ** 2) / (2 * 0.7 ** 2)) * 0.85); // lit dune crest
  }
  return mix(c, RIM, smooth(R_RIM, R_DISC - 0.3, r));
}
const img = makeFrame(discColor, SKY_E);

const gold = layer();
let nid = 0;
const part = (pts, f) => fillPoly(gold, pts, (x, y) => [...f(x, y), 1], nid++);
const hole = (pts, c) => fillPoly(gold, pts, () => [...c, 1], nid++);
const quad = (a, c, b, n = 10) => { // quadratic bezier a → b, control c, without the start point
  const pts = [];
  for (let k = 1; k <= n; k++) {
    const t = k / n, u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return pts;
};

// ---- tent: three poles, the middle one tallest, fabric sagging between them ----
const EAVE = 71, GROUND = 91;
const L = [31, EAVE + 1], P1 = [45, 55], P2 = [65.5, 42], P3 = [86, 55], R = [100, EAVE + 1];
const roof = [L, ...quad(L, [39, 60], P1, 6), ...quad(P1, [56, 64], P2, 10), ...quad(P2, [75, 64], P3, 10), ...quad(P3, [92, 60], R, 6)];
roof.push([101.5, EAVE + 4], [29.5, EAVE + 4]);
// lit on the left of each peak, shaded on the right, like folds of cloth
const peaks = [P1[0], P2[0], P3[0]];
const roofShade = (x, y) => {
  let best = peaks[0];
  for (const p of peaks) if (Math.abs(x - p) < Math.abs(x - best)) best = p;
  const t = clamp01((x - best) / 11 * 0.5 + 0.5);
  const c = t < 0.5 ? mix(G_HI, G_LT, t * 2) : mix(G_LT, G_DK, (t - 0.5) * 2);
  return mix(c, G_MID, clamp01((y - 58) / 20) * 0.5);
};
// side curtains: vertical folds
const folds = x => mix(G_LT, G_DK, 0.5 + 0.5 * Math.sin((x - 31) * 0.75));
part([[30, EAVE + 2], [58, EAVE + 2], [57, GROUND], [28, GROUND]], folds);
part([[73, EAVE + 2], [101, EAVE + 2], [103, GROUND], [74, GROUND]], folds);
// doorway: dark inside, both flaps tied back
part([[58, EAVE + 2], [73, EAVE + 2], [74, GROUND], [57, GROUND]], flat(G_DEEP));
part([[57.6, EAVE + 2], [64, EAVE + 2], [58.4, 84]], face(57, 64, G_HI, G_MID));
part([[67, EAVE + 2], [73.4, EAVE + 2], [72.6, 84]], face(67, 74, G_MID, G_DK));
part(rect(64.8, 28, 66.2, 46), face(64.8, 66.2)); // middle pole, its foot hidden under the roof peak
part(roof, roofShade);
// trim band along the eave with a row of dark triangles
part(rect(29.5, EAVE + 1.5, 101.5, EAVE + 5), face(29.5, 101.5, G_HI, G_DK));
for (let x = 31.5; x < 100; x += 4.4) hole([[x, EAVE + 2.4], [x + 3, EAVE + 2.4], [x + 1.5, EAVE + 4.4]], G_DEEP);
// pole tops with finials, pennant on the middle pole
for (const [x, y] of [P1, P3]) { part(rect(x - 0.7, y - 5, x + 0.7, y + 0.5), face(x - 0.7, x + 0.7)); part(rect(x - 1.6, y - 7.4, x + 1.6, y - 4.6), face(x - 1.6, x + 1.6, G_HI, G_DK)); }
part(rect(63.9, 25.4, 67.1, 28.4), face(63.9, 67.1, G_HI, G_DK));
part([[66.2, 29.5], [78, 32.5], [66.2, 36]], (x, y) => mix(G_LT, G_DK, clamp01((x - 66) / 12)));

bevel(gold);
finish(img, gold, { shadow: [24, 4, 4] }, out);

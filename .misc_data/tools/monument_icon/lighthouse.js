// Oriental Lighthouse monument emblem: the mosque frame's disc as a night sea, a gold Pharos tower with beams.
// Usage: node lighthouse.js <out.png>
const path = require('path');
const {
  CX, CY, R_DISC, R_RIM, mix, clamp01, smooth, makeFrame, layer, fillPoly, rect, trap, arch,
  G_HI, G_MID, G_DK, G_DEEP, face, facets, flat, bevel, finish,
} = require('./emblem.js');

const out = process.argv[2] || path.join(__dirname, 'icon_monument_lighthouse.png');

// the tower is drawn in a 0..92 design space and squeezed towards the plinth so the beams have sky to cross
const K_Y = 0.9, TY = y => 92 - (92 - y) * K_Y;
const LAMP = [65.5, TY(25)];

// ---- disc: night sky over the sea, dark rim like the vanilla discs ----
const SKY_C = [36, 70, 132], SKY_E = [16, 32, 74], RIM = [6, 12, 30];
const SEA_TOP = 76;
function seaLine(x) { return SEA_TOP + 1.2 * Math.sin(x * 0.42) + 0.8 * Math.sin(x * 0.17 + 1.3); }
function discColor(x, y) {
  const r = Math.hypot(x - CX, y - CY);
  let c = mix(SKY_C, SKY_E, smooth(0, R_RIM, r) ** 1.4);
  // soft glow around the lantern
  const g = Math.exp(-((x - LAMP[0]) ** 2 + (y - LAMP[1]) ** 2) / (2 * 11 ** 2));
  c = mix(c, [120, 150, 190], g * 0.45);
  const s = seaLine(x);
  if (y > s) {
    const d = y - s;
    c = mix([30, 74, 128], [14, 36, 80], clamp01(d / 12));
    // wave crests: bright strokes along shifted copies of the sea line
    for (const [dy, ph, k] of [[0, 0, 0.55], [4.5, 2.1, 0.35], [9, 4.0, 0.22]]) {
      const yy = s + dy + 0.9 * Math.sin(x * 0.55 + ph);
      const t = Math.exp(-((y - yy) ** 2) / (2 * 0.45 ** 2));
      c = mix(c, [150, 190, 220], t * k);
    }
  }
  return mix(c, RIM, smooth(R_RIM, R_DISC - 0.3, r));
}
const img = makeFrame(discColor, SKY_E);

const gold = layer(), beams = layer();
let nid = 0;
const squeeze = pts => pts.map(([x, y]) => [x, TY(y)]);
const part = (pts, f) => fillPoly(gold, squeeze(pts), (x, y) => [...f(x, y), 1], nid++);
const hole = (pts, c) => fillPoly(gold, squeeze(pts), () => [...c, 1], nid++);

// beams from the lantern to both sides, fading out
for (const dir of [-1, 1]) {
  const [lx, ly] = LAMP, len = 48, half = 8.5, ang = dir < 0 ? Math.PI - 0.1 : 0.1;
  const p = (a, d) => [lx + d * Math.cos(a), ly + d * Math.sin(a)];
  const a0 = ang - half * Math.PI / 180, a1 = ang + half * Math.PI / 180;
  fillPoly(beams, [p(a0, 3), p(a0, len), p(a1, len), p(a1, 3)], (x, y) => {
    const d = Math.hypot(x - lx, y - ly);
    const off = Math.abs(((Math.atan2(y - ly, x - lx) - ang + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const edge = 1 - smooth(half * 0.55, half, off * 180 / Math.PI);
    return [255, 236, 150, 0.95 * edge * (1 - smooth(10, len + 6, d)) ** 0.6];
  }, 0);
}

// plinth: two steps of masonry on the sea
part(rect(36, 85, 95, 92), face(36, 95));
part(rect(36, 84, 95, 85), flat(G_HI));
part(rect(43, 79, 88, 84), face(43, 88));
part(rect(43, 78, 88, 79), flat(G_HI));
// lower tower, tapering (square Pharos body)
part(trap(48, 83, 78, 52, 79, 50), facets(48, 83));
hole(arch(61.5, 69.5, 78, 72), G_DEEP);
hole(arch(63, 68, 64, 61), G_DEEP);
hole(arch(63, 68, 57, 54), G_DEEP);
// cornice with merlons
part(rect(46, 46, 85, 50), face(46, 85, G_HI, G_DK));
for (let k = 0; k < 6; k++) part(rect(46 + k * 7, 43, 49.5 + k * 7, 46), face(46, 85, G_HI, G_DK));
// octagonal middle tier
part(trap(54, 77, 46, 56, 75, 31), facets(54, 77));
hole(arch(63.5, 67.5, 42, 39), G_DEEP);
// upper gallery
part(rect(52, 29, 79, 31.5), face(52, 79, G_HI, G_DK));
// lantern: pillars with glowing openings
part(rect(57.5, 20, 73.5, 29), facets(57.5, 73.5));
hole(arch(59.5, 64.5, 28, 23.5), [255, 250, 215]);
hole(arch(66.5, 71.5, 28, 23.5), [255, 244, 190]);
part(rect(56, 18.5, 75, 20), face(56, 75, G_HI, G_DK));
// onion dome, spire and crescent finial
const dome = [];
for (let k = 0; k <= 24; k++) {
  const t = k / 24, yy = 18.5 - t * 10.5;
  const w = 9.2 * Math.sin(Math.PI * Math.min(1, t * 1.25) ** 0.8) * (1 - t) ** 0.35 + 0.3;
  dome.push([65.5 - w, yy]);
}
for (let k = 24; k >= 0; k--) { const [x, y] = dome[k]; dome.push([131 - x, y]); }
part(dome, (x, y) => facets(56, 75)(x + 0.6 * (y - 13)));
part(rect(65, 4.5, 66, 8.5), face(65, 66));
const cres = [];
for (let k = 0; k <= 16; k++) { const t = Math.PI * (0.15 + 1.7 * k / 16); cres.push([65.5 + 3.2 * Math.sin(t), 3.6 - 3.2 * Math.cos(t)]); }
for (let k = 16; k >= 0; k--) { const t = Math.PI * (0.25 + 1.5 * k / 16); cres.push([66.6 + 2.5 * Math.sin(t), 3.6 - 2.5 * Math.cos(t)]); }
part(cres, face(62, 69, G_HI, G_MID));

bevel(gold);
finish(img, gold, { glow: beams, shadow: [4, 6, 14] }, out);

// Desert recolour shared by build.js (street atlases) and ../canal_orient/build.js (noria crossing road decals).
const { rgb2lab, lab2rgb } = require('../canal_orient/lab.js');
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// Colour moves, in Lab/LCh. The vanilla atlases sit at hue 75-105 deg (olive/green) with a* ~ 1-3:
//  - hue of the yellow-green band is pulled toward sand (beach_06 sand is Lab 64/4/18, hue ~77),
//  - lightness raised, chroma slightly raised,
//  - dirt road: the saturated olive fringe (dry grass, C > 16) becomes a light sand drift,
//  - stone street: moss in the joints (C > 9) becomes pale, low-chroma drifted sand.
const STREETS = [
  {
    name: 'desert_road', src: 'data/dlc06/graphics/effects/street/africa_street_01', cfg: 'africa_street_01', diff: 'earth_street_01_diff',
    p: { dL: 9, hue: 69, hk: 0.8, Cadd: 4, fringe: [16, 26, 55, 0.7, 19] },
  },
  {
    name: 'stone_street', src: 'data/dlc06/graphics/effects/street/africa_street_02', cfg: 'africa_street_02', diff: 'africa_street_02_diff',
    p: { dL: 6, hue: 72, hk: 0.9, Cadd: 4, moss: [9, 14, 9, 13] },
  },
];

function recolour(img, p) {
  const d = img.data;
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4, [L, a, b] = rgb2lab(d[o], d[o + 1], d[o + 2]);
    const C = Math.hypot(a, b), h0 = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
    const wc = ss(1, 4, C), wh = ss(25, 50, h0) * (1 - ss(150, 190, h0)) * p.hk;
    const h = h0 + (p.hue - h0) * wh * wc;
    let L2 = L + p.dL, C2 = C + p.Cadd * wc;
    if (p.fringe) {
      const [c0, c1, Lt, Lk, Ct] = p.fringe, wf = ss(c0, c1, C) * ss(50, 70, h0);
      if (wf > 0) { L2 = L2 * (1 - wf) + (Lt + (L - 33) * Lk) * wf; C2 = C2 * (1 - wf) + Ct * wf; }
    }
    if (p.moss) {
      const [c0, c1, dL, Ct] = p.moss, wm = ss(c0, c1, C) * ss(60, 80, h0);
      if (wm > 0) { L2 += dL * wm; C2 = C2 * (1 - wm) + Ct * wm; }
    }
    const hr = h * Math.PI / 180;
    d.set(lab2rgb(L2, C2 * Math.cos(hr), C2 * Math.sin(hr)), o);
  }
  return img;
}

const PARAMS = Object.fromEntries(STREETS.map(s => [s.name, s.p]));
module.exports = { recolour, STREETS, PARAMS };

// Top-down height map + albedo of a cfg in model space (+x right, +z down in the image, not mirrored).
// render(cfgRel) -> { h: Float32Array N*N top-surface y (-99 = nothing), img: RGB Buffer }, 60 px per m over ±6 m.
const path = require('path');
const MOD = path.resolve(__dirname, '../../..');
const { loadScene } = require('../ornament_icons/scene.js');
const { encode } = require('../ornament_icons/png.js');
const R = 6, K = 60, N = 2 * R * K;

function sample(t, u, v) {
  u -= Math.floor(u); v -= Math.floor(v);
  const x = Math.min(t.w - 1, Math.floor(u * t.w)), y = Math.min(t.h - 1, Math.floor(v * t.h)), q = (y * t.w + x) * t.ch;
  return [t.px[q], t.px[q + 1], t.px[q + 2], t.ch === 4 ? t.px[q + 3] : 255];
}
const toPx = v => [(v[0] + R) * K, (v[2] + R) * K];

function render(cfgRel) {
  const scene = loadScene(MOD, cfgRel);
  const h = new Float32Array(N * N).fill(-99), col = new Uint8Array(N * N * 3), up = new Float32Array(N * N);
  for (const t of scene.tris) {
    const P = t.v.map(toPx);
    const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(area) < 1e-9) continue;
    const e1 = t.v[1].map((x, i) => x - t.v[0][i]), e2 = t.v[2].map((x, i) => x - t.v[0][i]);
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const ny = Math.abs(n[1] / (Math.hypot(...n) || 1));
    const x0 = Math.max(0, Math.floor(Math.min(...P.map(p => p[0])))), x1 = Math.min(N - 1, Math.ceil(Math.max(...P.map(p => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...P.map(p => p[1])))), y1 = Math.min(N - 1, Math.ceil(Math.max(...P.map(p => p[1]))));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area;
      const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area, w2 = 1 - w0 - w1;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const yy = w0 * t.v[0][1] + w1 * t.v[1][1] + w2 * t.v[2][1];
      const i = y * N + x; if (yy <= h[i]) continue;
      let c = t.mat.color ? t.mat.color.map(v => v * 255) : [190, 190, 190];
      if (t.mat.tex && t.uv) {
        const s = sample(t.mat.tex, w0 * t.uv[0][0] + w1 * t.uv[1][0] + w2 * t.uv[2][0], w0 * t.uv[0][1] + w1 * t.uv[1][1] + w2 * t.uv[2][1]);
        if (s[3] < 128) continue; // alpha-cut texels (gaps in planks, hidden geometry) are not floor
        c = s;
      }
      h[i] = yy; up[i] = ny; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
  }
  const img = Buffer.alloc(N * N * 3);
  for (let i = 0; i < N * N; i++) {
    if (h[i] < -50) { img[i * 3] = 30; img[i * 3 + 1] = 60; img[i * 3 + 2] = 110; continue; }
    const f = 0.55 + 0.45 * up[i];
    for (let k = 0; k < 3; k++) img[i * 3 + k] = Math.min(255, col[i * 3 + k] * f);
  }
  return { h, img };
}

const COLORS = { Shoveler: [255, 220, 0], Sweeper: [0, 255, 255], Hammerer_UP: [255, 0, 255], Hammerer_Down: [255, 120, 0], Crowd_01: [0, 255, 0], Crowd_02: [0, 180, 0], foreman: [255, 255, 255] };
// 1 m grid (red = axes), a diamond per dummy in its group colour, a black tick toward the dummy's +x (the way the unit faces)
function overlay(file, base, dummies) {
  const img = Buffer.from(base);
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 3; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; };
  for (let g = -R; g <= R; g++) { const p = (g + R) * K; for (let j = 0; j < N; j++) { const c = g === 0 ? [255, 0, 0] : [120, 120, 120]; put(p, j, c); put(j, p, c); } }
  for (const d of dummies) {
    const [px, py] = toPx(d.p), c = COLORS[d.g] || [255, 0, 0];
    for (let s = 4; s < 16; s++) for (let w = -1; w <= 1; w++) put(px + Math.cos(d.yaw) * s - Math.sin(d.yaw) * w, py - Math.sin(d.yaw) * s - Math.cos(d.yaw) * w, [0, 0, 0]);
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (Math.abs(dx) + Math.abs(dy) <= 5) put(px + dx, py + dy, c);
  }
  encode(file, N, N, 3, img);
}

module.exports = { render, overlay, R, K, N };

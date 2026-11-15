// node uvmap.js -> for every texture used by the embassy, writes uv_<base>.json: per texel {ny, y, model} of the
// faces that use it (last write wins; steep faces written after flat ones), plus uv_<base>.png visualisation
const path = require('path'), fs = require('fs');
const T = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/ornament_icons/';
const { loadScene } = require(T + 'scene.js');
const { encode } = require(T + 'png.js');
const MOD = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const CFG = 'data/graphics/buildings/orient/oriental_embassy/oriental_embassy.cfg';
const scene = loadScene(MOD, CFG, { p: [0, 0, 0], q: [0, 0, 0, 1], s: [1, 1, 1] }, {});
const maps = {};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
for (const t of scene.tris) {
  const tex = t.mat && t.mat.tex; if (!tex || !t.uv) continue;
  const base = path.basename(tex.src).replace(/_0\.dds$/i, '');
  const W = tex.w, H = tex.h;
  const m = maps[base] ??= { W, H, ny: new Float32Array(W * H).fill(NaN), y: new Float32Array(W * H).fill(NaN), nx: new Float32Array(W * H).fill(NaN), nz: new Float32Array(W * H).fill(NaN) };
  const e1 = t.v[1].map((x, k) => x - t.v[0][k]), e2 = t.v[2].map((x, k) => x - t.v[0][k]);
  let n = cross(e1, e2); const l = Math.hypot(...n) || 1; n = n.map(x => x / l);
  const yc = (t.v[0][1] + t.v[1][1] + t.v[2][1]) / 3;
  const P = t.uv.map(([u, v]) => [(u - Math.floor(Math.min(...t.uv.map(q => q[0])))) * W, (v - Math.floor(Math.min(...t.uv.map(q => q[1])))) * H]);
  const [a, b, c] = P;
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  if (Math.abs(area) < 1e-9) continue;
  const x0 = Math.floor(Math.min(a[0], b[0], c[0])) - 1, x1 = Math.ceil(Math.max(a[0], b[0], c[0])) + 1;
  const y0 = Math.floor(Math.min(a[1], b[1], c[1])) - 1, y1 = Math.ceil(Math.max(a[1], b[1], c[1])) + 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w0 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / area, w1 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / area, w2 = 1 - w0 - w1;
    const tol = -0.75 / Math.sqrt(Math.abs(area));
    if (w0 < tol || w1 < tol || w2 < tol) continue;
    const X = ((x % W) + W) % W, Y = ((y % H) + H) % H, i = Y * W + X;
    m.ny[i] = n[1]; m.nx[i] = n[0]; m.nz[i] = n[2]; m.y[i] = yc;
  }
}
for (const [base, m] of Object.entries(maps)) {
  const px = Buffer.alloc(m.W * m.H * 4);
  for (let i = 0; i < m.W * m.H; i++) {
    if (isNaN(m.ny[i])) continue;
    px[i * 4] = Math.abs(m.ny[i]) > 0.35 ? 255 : 0; px[i * 4 + 1] = Math.min(255, m.y[i] * 50); px[i * 4 + 2] = 128 + m.nx[i] * 127; px[i * 4 + 3] = 255;
  }
  encode(`uv_${base}.png`, m.W, m.H, 4, px);
  fs.writeFileSync(`uv_${base}.bin`, Buffer.concat([m.ny, m.y, m.nx, m.nz].map(a => Buffer.from(a.buffer))));
  console.log(base, m.W, m.H);
}

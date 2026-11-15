// writes door_mask.png (512²): texels covered by the door-leaf triangles (UV in the old door rectangle)
const T = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/ornament_icons/';
const { loadScene } = require(T + 'scene.js');
const { encode } = require(T + 'png.js');
const MOD = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const sc = loadScene(MOD, 'data/graphics/buildings/orient/oriental_embassy/oriental_embassy.cfg', { p: [0,0,0], q: [0,0,0,1], s: [1,1,1] }, {});
const N = 512, m = Buffer.alloc(N * N * 4);
for (const t of sc.tris) {
  if (!t.uv || !t.mat.tex || !/indian_warehouse_diff/.test(t.mat.tex.src)) continue;
  const P = t.uv.map(([u, v]) => [u * N, v * N]);
  const cu = (P[0][0] + P[1][0] + P[2][0]) / 3, cv = (P[0][1] + P[1][1] + P[2][1]) / 3;
  if (!(cu > 160 && cu < 216 && cv > 8 && cv < 105)) continue;
  console.log(P.map(p => p.map(x => x.toFixed(1)).join(',')).join('  '));
  const [a, b, c] = P, area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w0 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / area, w1 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / area, w2 = 1 - w0 - w1;
    if (w0 >= -1e-6 && w1 >= -1e-6 && w2 >= -1e-6) { const o = (y * N + x) * 4; m[o] = m[o + 1] = m[o + 2] = m[o + 3] = 255; }
  }
}
encode('door_mask.png', N, N, 4, m);

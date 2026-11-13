// node dome_mirror_preview.js <work dir> : silk plantation (left) vs the mirrored Rammed Earth Works (right), same camera, two views.
// Uses the mod's own files: 1404 s_silk_plantation_lod0 + its ground, local rdm/rammed_earth_farm_lod0 + flipped ground,
// both with maps/rammed_earth_farm_diff_0.png. Writes <work dir>/dome_mirror_preview.png.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { loadGltf, render, quad } = require('../canal_orient/render.js');
const PNG = require('../canal_orient/png.js');
const R4 = process.env.USERPROFILE + '/.vscode/extensions/jakobharder.anno-modding-tools-2.3.1/external/rdm4-bin.exe';
const MOD = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/data/graphics/';
const W = process.argv[2];
const ex = (rdm, name) => {
  const d = path.join(W, name); fs.mkdirSync(d, { recursive: true });
  execFileSync(R4, ['-i', rdm, '-o', d, '-e', 'gltf'], { stdio: 'pipe' });
  const g = fs.readdirSync(d).find(f => f.endsWith('.gltf'));
  return loadGltf(path.join(d, g));
};
const dq = (sx, sz, y) => { const q = quad(sx, sz, y); q.uv = q.uv.map(([u, v]) => [u, 1 - v]); return q; };
const diff = PNG.decode(MOD + 'buildings/orient/rammed_earth_farm/maps/rammed_earth_farm_diff_0.png');
const scene = (rdm, ground, name) => [
  { mesh: quad(8, 8, -0.02), tex: { w: 1, h: 1, data: Buffer.from([120, 150, 110, 255]) } },
  { mesh: dq(3, 3, 0), tex: PNG.decode(ground), decal: true },
  { mesh: ex(rdm, name), tex: diff, alphaTest: true },
];
const sets = [
  scene(MOD + '1404_import/buildings/farm/south/silk_plantation/rdm/s_silk_plantation_lod0.rdm',
    MOD + '1404_import/buildings/farm/south/silk_plantation/maps/s_silk_plantation_ground_diff_0_0_384_384.png', 'silk'),
  scene(MOD + 'buildings/orient/rammed_earth_farm/rdm/rammed_earth_farm_lod0.rdm',
    MOD + 'buildings/orient/rammed_earth_farm/maps/rammed_earth_farm_ground_diff_0_0_384_384.png', 'mirror'),
];
const VW = 520, VH = 440, views = [45, 225];
const o = PNG.create(VW * 2, VH * views.length);
views.forEach((yaw, r) => sets.forEach((items, c) => {
  const f = path.join(W, `v_${r}_${c}.png`);
  render(items, { w: VW, h: VH, scale: 85, center: [0, 0.9, 0], yaw, pitch: 35, bg: [205, 185, 150] }, f);
  const t = PNG.decode(f);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++)
    o.data.set(t.data.subarray((y * VW + x) * 4, (y * VW + x) * 4 + 4), ((y + r * VH) * VW * 2 + x + c * VW) * 4);
}));
PNG.encode(path.join(W, 'dome_mirror_preview.png'), o, false);
console.log('wrote', path.join(W, 'dome_mirror_preview.png'));

// Preview the Rammed Earth Works with the field_03 pool, built from the mod's own rdm/ and maps/ files.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { loadGltf, render, quad } = require('./render.js');
const PNG = require('./png.js');
const R4 = process.env.USERPROFILE + '/.vscode/extensions/jakobharder.anno-modding-tools-2.3.1/external/rdm4-bin.exe';
const MOD = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/data/graphics/buildings/orient/rammed_earth_farm/';
const prims = f => {
  const g = JSON.parse(fs.readFileSync(f)), dir = path.dirname(f), bufs = g.buffers.map(b => fs.readFileSync(path.join(dir, b.uri)));
  const acc = i => { const a = g.accessors[i], bv = g.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type], buf = bufs[bv.buffer], off = (bv.byteOffset || 0) + (a.byteOffset || 0), o = [];
    for (let k = 0; k < a.count; k++) { const e = []; for (let c = 0; c < n; c++) e.push(a.componentType === 5126 ? buf.readFloatLE(off + (k * n + c) * 4) : a.componentType === 5123 ? buf.readUInt16LE(off + (k * n + c) * 2) : buf.readUInt32LE(off + (k * n + c) * 4)); o.push(n === 1 ? e[0] : e); } return o; };
  return g.meshes[0].primitives.map(p => ({ mat: p.material, mesh: { pos: acc(p.attributes.POSITION), nrm: acc(p.attributes.NORMAL), uv: acc(p.attributes.TEXCOORD_0), idx: acc(p.indices) } }));
};
const ex = name => { const d = path.resolve('p3', name); fs.mkdirSync(d, { recursive: true }); execFileSync(R4, ['-i', MOD + 'rdm/' + name + '.rdm', '-o', d, '-e', 'gltf'], { stdio: 'pipe' }); return prims(path.join(d, 'out.gltf')); };
const T = f => PNG.decode(f);
const farm = T('pvtex/aqua_farm_colony01_01_diff_0.png'), field = T('aqua_farm_module_colony01_01_diff_0.png'), sand = T('rammed_earth_pool_sand_diff_0.png');
const matTex = [farm, field, farm, T('rammed_earth_tank_sand_diff_0.png')];
const dq = (sx, sz, y) => { const q = quad(sx, sz, y); q.uv = q.uv.map(([u, v]) => [u, 1 - v]); return q; };   // decal v runs along -z
const PZ = -1.44, PR = 270;
const items = [
  { mesh: quad(16, 16, -0.75), tex: { w: 1, h: 1, data: Buffer.from([210, 210, 210, 255]) } },
  { mesh: quad(4, 6, -0.72), tex: { w: 1, h: 1, data: Buffer.from([120, 150, 110, 255]) } },
  { mesh: dq(4, 3, -0.7), tex: T(__dirname + '/rammed_earth_farm_ground_diff_0.png'), t: [0, 0, 1.5], decal: true },
  { mesh: dq(3.5, 4.2, -0.69), tex: T('rammed_earth_pool_ground_diff_0.png'), t: [0, 0, -1.35], rot: PR, decal: true },
  ...ex('rammed_earth_farm_lod0').map(p => ({ mesh: p.mesh, tex: T('after_trim.png'), alphaTest: true, t: [0, 0, 1.5] })),
  ...ex('rammed_earth_pool_lod0').map(p => ({ mesh: p.mesh, tex: matTex[p.mat], alphaTest: p.mat !== 3, t: [0, -0.073869, PZ], rot: PR })),
  ...ex('rammed_earth_pool_sand_lod0').map(p => ({ mesh: p.mesh, tex: sand, t: [0, 0, PZ], rot: PR })),
];
const views = [[45, 'a'], [225, 'b'], [135, 'c'], [0, 'd']];
for (const [yaw, f] of views) render(items, { w: 700, h: 560, scale: 80, center: [0, 0.4, 0], yaw, pitch: f === 'd' ? 90 : 35, bg: [205, 185, 150] }, `p3_${f}.png`);
const o = PNG.create(1400, 1120);
views.forEach(([, f], i) => { const t = PNG.decode(`p3_${f}.png`), ox = (i % 2) * 700, oy = Math.floor(i / 2) * 560;
  for (let y = 0; y < 560; y++) for (let x = 0; x < 700; x++) o.data.set(t.data.subarray((y * 700 + x) * 4, (y * 700 + x) * 4 + 4), ((y + oy) * 1400 + x + ox) * 4); });
PNG.encode('p3_sheet.png', o, false);

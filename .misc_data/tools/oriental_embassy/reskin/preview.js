// node preview.js out_prefix [overrides.json]  -> renders the embassy cfg at 512 px from two azimuths
// overrides: { "indian_warehouse_diff_512": "path/to.png", ... } swaps textures by base name
const path = require('path'), fs = require('fs');
const T = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/ornament_icons/';
const { loadScene } = require(T + 'scene.js');
const R = require(T + 'render.js');
const { decode } = require(T + 'png.js');
const MOD = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const CFG = 'data/graphics/buildings/orient/oriental_embassy/oriental_embassy.cfg';
const [out, ov] = process.argv.slice(2);
const over = ov ? JSON.parse(fs.readFileSync(ov, 'utf8')) : {};
const scene = loadScene(MOD, CFG, { p: [0, 0, 0], q: [0, 0, 0, 1], s: [1, 1, 1] }, {});
const cache = {};
const swap = t => {
  if (!t || !t.src) return t;
  const b = path.basename(t.src).replace(/_0\.dds$|\.png$/i, '');
  if (!over[b]) return t;
  return cache[b] ??= Object.assign(decode(over[b]), { src: over[b] });
};
for (const t of scene.tris) if (t.mat) t.mat.tex = swap(t.mat.tex); else if (t.tex) t.tex = swap(t.tex);
for (const d of scene.decals) d.tex = swap(d.tex);
const SUN = [0.55, 0.65, -0.5];
for (const [name, az] of [['front', 200], ['back', 20]]) {
  const r = R.render(scene, { el: 32, az, mirror: true, light: SUN, amb: 0.3, dif: 0.8, size: 512, ss: 2, smSize: 2048, aoSize: 512, aoDirs: 8, aoStrength: 0.8, skyColor: [0.85, 0.9, 1.1], sunColor: [1.1, 1.0, 0.9], fit: { width: 470, bottom: 500, top: 10, maxW: 500 } });
  R.toPng(`${out}_${name}.png`, r.img, 512, c => c.map(v => 255 * Math.pow(Math.min(1, v / 255), 0.85)));
  console.log(`${out}_${name}.png`);
}

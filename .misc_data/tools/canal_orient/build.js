// Orient canal skin: stone-block canal atlas (diffuse + normal) like the noria pool edge, Orient-sand ground strips,
// and local cfg copies pointing at them.
// node build.js <mod root> [vanilla root]   (needs C:\tools\texconv.exe and C:\tools\rdm4-bin.exe)
// Output: <mod>/data/graphics/buildings/orient/canal/{*.cfg,*.ifo,*.fc,maps/*}
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const PNG = require('./png.js');
const { rgb2lab, lab2rgb } = require('./lab.js');
const { uvmap } = require('./uvmap.js');
const { stoneAtlas } = require('./stone.js');

const MOD = process.argv[2];
const VAN = process.argv[3] || 'D:/anno_data/1800';
if (!MOD) { console.error('usage: node build.js <mod root> [vanilla root]'); process.exit(1); }
const TEXCONV = 'C:/tools/texconv.exe', RDM4 = 'C:/tools/rdm4-bin.exe';
const SRC = 'data/dlc06/graphics/effects/street/irrigation_system_01';
const DST = 'data/graphics/buildings/orient/canal';
const outDir = path.join(MOD, DST), mapDir = path.join(outDir, 'maps');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canal_orient_'));
fs.mkdirSync(mapDir, { recursive: true });

// Street 112842 CfgAdditionAtlas plus the crossings 117786 / 127913.
const CFGS = [
  'irrigation_channel_single_01', 'irrigation_channel_end_01', 'irrigation_channel_short_01', 'irrigation_channel_curv_01',
  'irrigation_channel_3way_01', 'irrigation_channel_cross_01', 'irrigation_channel_curv_bassin_01',
  'irrigation_channel_3way_bassin_03', 'irrigation_channel_3way_bassin_02', 'irrigation_channel_tripple_corner_bassin_01',
  'irrigation_channel_short_bassin_01', 'irrigation_channel_3way_bassin_01', 'irrigation_channel_double_corner_bassin_01',
  'irrigation_channel_curv_bassin_02', 'irrigation_channel_place_bassin_01', 'irrigation_channel_unsupported_01',
  'irrigation_channel_long_01_01', 'irrigation_channel_long_01_02', 'irrigation_channel_long_01_03', 'irrigation_channel_long_01_04',
  'irrigation_channel_long_02_01', 'irrigation_channel_long_02_02', 'irrigation_channel_long_02_03', 'irrigation_channel_long_02_04',
  'irrigation_channel_short_02', 'irrigation_channel_short_03', 'irrigation_channel_short_04', 'irrigation_channel_short_05',
  'irrigation_channel_short_05_duck',
  'irrigation_channel_crossing_01', 'irrigation_channel_crossing_01_closed_open',
  'irrigation_channel_crossing_02', 'irrigation_channel_crossing_02_closed_open',
];
// Retextured maps (vanilla name -> local name). Metal and props maps stay vanilla.
const DECALS = ['straight', 'single', 'end', 'curve', 'cross', '3way'].map(k => `canal_system_ground_${k}_01_diff`);
const RENAME = { canal_system_diff: 'canal_system_orient_diff', canal_system_norm: 'canal_system_orient_norm' };
for (const k of DECALS) RENAME[k] = k.replace(/_diff$/, '_orient_diff');
// Road decals of the crossings get the same desert recolour as the Orient streets (../orient_streets/recolour.js):
// crossing_01 = desert road 1404000845, crossing_02 = fast street 1404005165.
const { recolour: streetRecolour, PARAMS: STREET_PARAMS } = require('../orient_streets/recolour.js');
const ROAD_DECALS = { irrigation_crossing_diff: 'desert_road', irrigation_crossing_02_diff: 'stone_street' };
for (const k in ROAD_DECALS) RENAME[k] = k.replace(/_diff$/, '_orient_diff');

const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const texconv = args => execFileSync(TEXCONV, ['-nologo', '-y', ...args], { stdio: 'pipe' });
const vanillaPng = name => { texconv(['-ft', 'png', '-o', tmp, path.join(VAN, SRC, 'maps', name + '_0.dds')]); return PNG.decode(path.join(tmp, name + '_0.png')); };

// Ground strip: red-brown dirt (Lab ~33/2/17) -> Orient sand (colony02_beach_06, Lab 64/4/18); grass (a < 0) kept.
function recolourDecal(img) {
  const d = img.data;
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4, [L, a, b] = rgb2lab(d[o], d[o + 1], d[o + 2]), w = ss(-3, 2, a);
    if (w <= 0.001) continue;
    const p = [52 + (L - 33) * 0.8, 4 + (a - 2) * 0.5, 18 + (b - 17) * 0.6];
    d.set(lab2rgb(p[0] * w + L * (1 - w), p[1] * w + a * (1 - w), p[2] * w + b * (1 - w)), o);
  }
  return img;
}

function halve(img) {
  const w = img.w >> 1, h = img.h >> 1, out = PNG.create(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) s += img.data[((2 * y + dy) * img.w + 2 * x + dx) * 4 + c];
    out.data[(y * w + x) * 4 + c] = (s + 2) >> 2;
  }
  return out;
}

// _0.._4 as box halvings (no _0.png source in the mod, see commit a3ab10c3), BC7 with full mips like vanilla
function writeTexture(base, img) {
  for (let k = 0; k < 5; k++) {
    if (k) img = halve(img);
    const p = path.join(tmp, `${base}_${k}.png`);
    PNG.encode(p, img);
    texconv(['-sepalpha', '-f', 'BC7_UNORM', '-m', '0', '-o', mapDir, p]);
  }
  console.log('texture', base);
}

// meshes that use the canal atlas, from the vanilla cfgs
const rdms = new Set();
for (const c of CFGS) {
  const s = fs.readFileSync(path.join(VAN, SRC, c + '.cfg'), 'latin1');
  for (const m of s.split('<ConfigType>MODEL</ConfigType>').slice(1)) {
    const fn = (m.match(/<FileName>([^<]*)<\/FileName>/) || [])[1], tex = (m.match(/<cModelDiffTex>([^<]*)</) || [])[1];
    if (fn && tex && tex.endsWith('/maps/canal_system_diff.psd')) rdms.add(fn.replace(/\\/g, '/'));
  }
}
const meshes = [...rdms].map(f => {
  const name = path.basename(f, '.rdm'), dir = path.join(tmp, 'gltf', name);
  fs.mkdirSync(dir, { recursive: true });
  execFileSync(RDM4, ['-i', path.join(VAN, f), '-o', dir, '-e', 'gltf', '--force'], { stdio: 'pipe' });
  return { name, gltf: path.join(dir, 'out.gltf') };
});
console.log('atlas meshes', meshes.length);

const diff = vanillaPng('canal_system_diff');
const stone = stoneAtlas(diff, vanillaPng('canal_system_norm'), uvmap(meshes, diff.w));
writeTexture(RENAME.canal_system_diff, stone.diff);
writeTexture(RENAME.canal_system_norm, stone.norm);
for (const k of DECALS) writeTexture(RENAME[k], recolourDecal(vanillaPng(k)));
for (const [k, street] of Object.entries(ROAD_DECALS)) writeTexture(RENAME[k], streetRecolour(vanillaPng(k), STREET_PARAMS[street]));

// cfgs keep vanilla meshes, props and metal maps; only the retextured map paths move
for (const c of CFGS) {
  let s = fs.readFileSync(path.join(VAN, SRC, c + '.cfg'), 'latin1');
  for (const [from, to] of Object.entries(RENAME)) s = s.split(`${SRC}/maps/${from}.psd`).join(`${DST}/maps/${to}.psd`);
  if (new RegExp(`${SRC}/maps/(canal_system_(diff|norm|ground_[a-z0-9]+_01_diff)|irrigation_crossing(_02)?_diff)\\.psd`).test(s)) throw new Error('unreplaced texture in ' + c);
  fs.writeFileSync(path.join(outDir, c + '.cfg'), s, 'latin1');
  for (const ext of ['.ifo', '.fc']) {
    const f = path.join(VAN, SRC, c + ext);
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(outDir, c + ext));
  }
}
console.log('cfgs', CFGS.length);
fs.rmSync(tmp, { recursive: true, force: true });

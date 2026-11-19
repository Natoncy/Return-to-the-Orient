// Orient street skins: desert road 1404000845 and fast street 1404005165 get desert-coloured copies of the Enbesa
// street atlases (africa_street_01 / africa_street_02). Only the diffuse changes; normal/height/metal stay vanilla.
// node build.js "<mod root>" [vanilla root, default D:/anno_data/1800]
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const PNG = require('../canal_orient/png.js');
const { recolour, STREETS } = require('./recolour.js');

const MOD = process.argv[2], VAN = process.argv[3] || 'D:/anno_data/1800';
if (!MOD) { console.error('usage: node build.js "<mod root>" [vanilla root]'); process.exit(1); }
const TEXCONV = 'C:/tools/texconv.exe';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orient_streets_'));
const texconv = args => execFileSync(TEXCONV, ['-nologo', '-y', ...args], { stdio: 'pipe' });

function halve(img) {
  const w = img.w >> 1, h = img.h >> 1, out = PNG.create(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) s += img.data[((2 * y + dy) * img.w + 2 * x + dx) * 4 + c];
    out.data[(y * w + x) * 4 + c] = (s + 2) >> 2;
  }
  return out;
}

for (const s of STREETS) {
  const outDir = path.join(MOD, 'data/graphics/buildings/orient/street', s.name), mapDir = path.join(outDir, 'maps');
  fs.mkdirSync(mapDir, { recursive: true });
  const base = s.name + '_diff';

  texconv(['-ft', 'png', '-o', tmp, path.join(VAN, s.src, 'maps', s.diff + '_0.dds')]);
  let img = recolour(PNG.decode(path.join(tmp, s.diff + '_0.png')), s.p);
  for (let k = 0; k < 5; k++) {           // _0.._4 like vanilla, each a box halving, BC7 with full mips
    if (k) img = halve(img);
    const p = path.join(tmp, `${base}_${k}.png`);
    PNG.encode(p, img);
    texconv(['-sepalpha', '-f', 'BC7_UNORM', '-m', '0', '-o', mapDir, p]);
  }

  // cfg/ifo/bfg copied from vanilla; only the diffuse path changes
  const cfg = fs.readFileSync(path.join(VAN, s.src, s.cfg + '.cfg'), 'latin1');
  const from = `${s.src}/maps/${s.diff}.psd`, to = `data/graphics/buildings/orient/street/${s.name}/maps/${base}.psd`;
  if (!cfg.includes(from)) throw new Error('diffuse path not found in ' + s.cfg);
  fs.writeFileSync(path.join(outDir, s.name + '.cfg'), cfg.split(from).join(to), 'latin1');
  for (const ext of ['.ifo', '.bfg']) fs.copyFileSync(path.join(VAN, s.src, s.cfg + ext), path.join(outDir, s.name + ext));
  console.log('street', s.name);
}
fs.rmSync(tmp, { recursive: true, force: true });

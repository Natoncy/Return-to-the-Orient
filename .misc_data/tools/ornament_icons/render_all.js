// Renders the icon of every mod ornament whose IconFilename lies in data/graphics/icons/ornaments into out/,
// plus out/sheet.png for review. --install copies each PNG into the mod and builds its _0.._3.dds with annotex.
// Usage: node render_all.js [--only name,name] [--install]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { makeIcon } = require('./icon.js');
const MOD = path.resolve(__dirname, '../../..');
const ASSETS = path.join(MOD, 'data/config/export/main/asset/assets_includes/buildings/ornaments');
const ICONS = 'data/graphics/icons/ornaments/';
const OUT = path.join(__dirname, 'out');

const SKIP = [];
const PICK = { lighthouse: 3, ruin_large: 1 };   // variation index shown on the icon (default 0)
// Facing (user's rule, like the vanilla Enbesa fences): fronts point to the bottom left (model -z), walls run from the
// bottom left to the top right (model z), T branches and corner arms point to the bottom right (model +x).
// rotY > 0 turns clockwise seen from above; <icon>_varNN icons inherit the menu icon's entry.
const OPTS = { place: { pngDecals: true },       // place_01 paving only exists as PNG
  // the spray is the only difference to the no-spray variation
  fountain: { particles: true, look: { particleSize: 0.45, particleTint: [0.85, 0.9, 1.1] } },
  // user's picks (tent_var04 needs its 0, or it would inherit the tent's turn)
  statue: { rotY: 90 }, tent: { rotY: -90 }, tent_var03: { rotY: 180 }, tent_var04: { rotY: 0 }, tent_var05: { rotY: 90 },
  prayer_ground: { rotY: -90 }, street_canopy_large: { rotY: -90 }, street_canopy_small: { rotY: -90 },
  watchtower: { rotY: 90 }, citywall_tower: { rotY: -90 }, lighthouse: { rotY: 180 }, sultanspalace_palace: { rotY: 90 },
  // walls are modelled along x; gates stay in their wall line, so their arch faces the bottom right
  citywall: { rotY: 90 }, citygate: { rotY: 90 }, fence01: { rotY: 90 }, stonewall: { rotY: 90 }, stonewall_large: { rotY: 90 },
  ruin_large: { rotY: 90 }, ruin_small_var12: { rotY: 90 }, ruin_small_var13: { rotY: 90 }, ruin_small_var14: { rotY: 90 },
  ruin_small_var15: { rotY: 90 }, sultanspalace_gate: { rotY: 90 }, sultanspalace_corner: { rotY: 90 },
  stonewall_junction_t_large: { rotY: -90 }, stonewall_junction_t_small: { rotY: -90 },
  stonewall_junction_corner_a: { rotY: -90 }, // corner_b stays unturned (user)
  stonewall_junction_cross: { rotY: 90, look: { el: 60 } } }; // seen from higher up, so the tall wall does not hide the low arms

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const install = args.includes('--install');

const jobs = new Map();
for (const f of fs.readdirSync(ASSETS).filter(f => f.endsWith('.xml'))) {
  for (const a of fs.readFileSync(path.join(ASSETS, f), 'utf8').split('<Asset>').slice(1)) {
    const icon = (a.match(/<IconFilename>([^<]*)</) || [])[1] || '';
    const name = (a.match(/<Name>([^<]*)</) || [])[1];
    if (!icon.startsWith(ICONS) || SKIP.includes(name)) continue;
    const cfgs = [...a.matchAll(/<Filename>([^<]*\.cfg)</g)].map(m => m[1]);
    // VariationIcons item i shows variation i; a menu icon not among them shows the PICK variation
    const vi = (a.match(/<VariationIcons>([\s\S]*?)<\/VariationIcons>/) || [])[1] || '';
    const icons = [...[...vi.matchAll(/<IconFilename>([^<]*)</g)].map((m, i) => [m[1], i]), [icon, PICK[path.basename(icon, '.png')] ?? 0]];
    for (const [file, i] of icons) {
      const base = path.basename(file, '.png');
      if (!file.startsWith(ICONS) || jobs.has(base) || (only && !only.includes(base))) continue;
      jobs.set(base, cfgs[i]);
    }
  }
}
fs.mkdirSync(OUT, { recursive: true });
for (const [base, cfg] of jobs) {
  const out = path.join(OUT, base + '.png');
  // <icon>_varNN variation icons share the menu icon's options
  makeIcon(MOD, cfg, out, OPTS[base] || OPTS[base.replace(/_var\d\d$/, '')] || {});
  if (!install) continue;
  // annotex writes the .dds files into its working directory
  execFileSync('C:/tools/annotex.exe', ['-f=diff', '-l=4', base + '.png'], { cwd: OUT, stdio: 'ignore' });
  for (const suffix of ['', '_0', '_1', '_2', '_3']) {
    const ext = suffix ? '.dds' : '.png';
    fs.copyFileSync(path.join(OUT, base + suffix + ext), path.join(MOD, ICONS, base + suffix + ext));
  }
}
const pngs = [...jobs.keys()].map(b => path.join(OUT, b + '.png'));
if (pngs.length) execFileSync(process.execPath, [path.join(__dirname, 'sheet.js'), path.join(OUT, 'sheet.png'), '8', '1', ...pngs], { stdio: 'inherit' });
console.log(`${jobs.size} icons${install ? ' installed' : ''}`);

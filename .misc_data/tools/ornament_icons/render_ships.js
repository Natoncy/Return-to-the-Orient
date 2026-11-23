// Renders the mod's ship icons with ship_icon.js into out/ships/; --install copies each PNG into the mod
// (icons ship as .png only, no _0.._3.dds).
// Usage: node render_ships.js [--only name,name] [--install]
const fs = require('fs'), path = require('path');
const { makeShipIcon } = require('./ship_icon.js');
const MOD = path.resolve(__dirname, '../../..');

// opts are the user-approved look per ship; see ship_icon.js for what each one does
const SHIPS = {
  // Oriental Trading Ship 1404005167. Bow turned toward the viewer like the vanilla icons (user: 345 was too side-on),
  // rig stretched above the deck like the vanilla icons, 1404 textures toned down to the vanilla palette, warm sky
  // light (the default bluish one turns the sail shadows mauve after the saturation boost).
  orient_cargo: {
    cfg: 'data/graphics/vehicle/orient/orient_cargo_ship/orient_cargo_ship.cfg',
    icon: 'data/graphics/icons/ships/icon_ship_orient_cargo.png',
    opts: { az: 325, el: 26, stretchY: 1.7, stretchFrom: 1.3, exposure: 0.38, saturation: 1.45, look: { skyColor: [1.02, 0.97, 0.88] } },
  },
};

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const install = args.includes('--install');
fs.mkdirSync(path.join(__dirname, 'out', 'ships'), { recursive: true });
for (const [name, s] of Object.entries(SHIPS)) {
  if (only && !only.includes(name)) continue;
  const out = path.join(__dirname, 'out', 'ships', path.basename(s.icon));
  makeShipIcon(MOD, s.cfg, out, s.opts);
  if (install) {
    const dst = path.join(MOD, s.icon);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(out, dst);
    console.log(`  installed ${s.icon}`);
  }
}

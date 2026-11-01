// Monument construction drawings (972x544 like vanilla, see README).
// Phase k (asset with UpgradeTarget = stage k+1) shows the model of stage k+1, as vanilla does.
// Usage: node make.js <monument> [outDir] [--install]   (install: copy the PNGs into the mod; UI images ship without .dds)
const fs = require('fs'), path = require('path');
const { gbuffer, extent } = require('./gbuffer.js');
const { compose, ground } = require('./style.js');
const { encode } = require('../ornament_icons/png.js');

const MOD = path.resolve(__dirname, '../../..');
const UI = 'data/ui/2kimages/main/assets16/monument_construction/';
const W = 972, H = 544, SS = 3;
// stages: model of each monument asset in build order, the last one = finished.
// images: file number -> stage shown (planned colours what the stage before already has); blueprint = finished stage.
// cam: geometry below y = 0 is under the terrain. top/ground: rows of the finished model's top and of y = 0;
// maxW: widest the drawing may get (the World's Fair spans 877 px).
const LH = 'data/graphics/buildings/orient/lighthouse/iaam/orient/005kustengebaude/leuchtturm/';
const MQ = 'data/graphics/1404_import/buildings/public/south/sultan_mosque/';
const MONUMENTS = {
  // arcade side (model -z, the land side), framed like the vanilla tower drawing
  lighthouse: {
    name: 'orient_lighthouse/monument_orient_lighthouse',
    stages: [1, 2, 3, 4].map(i => `${LH}stufe0${i}/leuchtturm0${i}.cfg`),
    images: { '01': 1, '02': 2, '03': 3 },
    cam: { az: 180, el: 0, clipBelow: -0.01 }, top: 26, ground: 494, maxW: 877,
  },
  // long side with the courtyard on the left and the dome on the right, like the old images it replaces.
  // 1404000323 uses _02, 324 _03, 325 _04; the finished 327 shows _04_coloured as its blueprint. _01 is unused.
  grand_mosque: {
    name: 'monument_grand_mosque',
    stages: ['s_sultan_mosque_unfinished_00', 's_sultan_mosque_unfinished_01', 's_sultan_mosque_unfinished_02', 's_sultan_mosque'].map(n => `${MQ}${n}.cfg`),
    images: { '01': 0, '02': 1, '03': 2, '04': 3 },
    cam: { az: 270, el: 0, clipBelow: -0.01 }, top: 45, ground: 497, maxW: 860,
  },
};

const args = process.argv.slice(2), install = args.includes('--install');
const pos = args.filter(a => !a.startsWith('--')), M = MONUMENTS[pos[0]];
if (!M) { console.log(`usage: node make.js <${Object.keys(MONUMENTS).join('|')}> [outDir] [--install]`); process.exit(1); }
const OUT = pos[1] || path.join(__dirname, 'out');
const NAME = path.basename(M.name);
fs.mkdirSync(OUT, { recursive: true });

const fin = M.stages.length - 1, ext = extent(MOD, M.stages[fin], M.cam);
const k = Math.min((M.ground - M.top) / ext.y1, M.maxW / (ext.x1 - ext.x0));
const view = { k, cx: (ext.x0 + ext.x1) / 2, groundY: M.ground };
const gx0 = Math.round(W / 2 + (ext.x0 - view.cx) * k) - 70, gx1 = Math.round(W / 2 + (ext.x1 - view.cx) * k) + 70;
console.log(`scale ${k.toFixed(1)} px/unit, ground x ${gx0}..${gx1}`);

const gb = {};
const G = i => gb[i] || (gb[i] = gbuffer(MOD, M.stages[i], { ...M.cam, W, H, ss: SS, view }));
// drop specks: tiny parts that touch nothing else (a lone crane hook floats above lighthouse stage 2)
function despeck(img, minPx = 30) {
  const { w, h, px } = img, seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || px[s * 4 + 3] <= 8) continue;
    const comp = [s]; seen[s] = 1;
    for (let c = 0; c < comp.length; c++) {
      const i = comp[c], x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, j = yy * w + xx;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h || seen[j] || px[j * 4 + 3] <= 8) continue;
        seen[j] = 1; comp.push(j);
      }
    }
    if (comp.length < minPx) for (const i of comp) px.fill(0, i * 4, i * 4 + 4);
  }
  return img;
}
function save(name, img, mode) {
  despeck(img);
  ground(img, Math.max(0, gx0), Math.min(W - 1, gx1), M.ground, mode);
  const f = path.join(OUT, name + '.png');
  encode(f, img.w, img.h, 4, img.px);
  let top = H; for (let i = 0; i < img.w * img.h; i++) if (img.px[i * 4 + 3] > 40) { top = Math.floor(i / img.w); break; }
  console.log(`${f}: top row ${top}`);
}
save(`${NAME}_00`, compose(G(fin), 'blueprint'), 'blueprint');
for (const [nn, st] of Object.entries(M.images)) {
  save(`${NAME}_${nn}`, compose(G(st), 'planned', { prev: st > 0 ? G(st - 1) : null }), 'planned');
  save(`${NAME}_${nn}_coloured`, compose(G(st), 'coloured'), 'coloured');
}

if (install) {
  const dst = path.join(MOD, UI, path.dirname(M.name));
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(OUT).filter(f => /^(.*)_\d\d(_coloured)?\.png$/.exec(f)?.[1] === NAME))
    fs.copyFileSync(path.join(OUT, f), path.join(dst, f));
  console.log('installed into ' + dst);
}

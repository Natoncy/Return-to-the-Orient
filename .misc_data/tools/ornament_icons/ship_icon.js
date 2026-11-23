// Vanilla-style ship icon (256x256, like data/ui/2kimages/main/3dicons/ships/icon_ship_*.png): bow toward the viewer at
// the bottom left (azimuth 320, the vanilla schooner icon's angle), camera 28 deg above the water, light from the upper left front, sky occlusion, the whole hull drawn
// (no water clip), dark outline, framed to fill the canvas like the vanilla icons (box about x 7..246, y 6..247).
// Sinking parts are left out: models named *destruct*/*debris*/*wreck* and every PROPCONTAINER (floating boards).
// Colours: ship_tone_lut.json, fitted by fit_ship_tone.js against vanilla ship icons. Flags carry the player colour as a
// dye mask and render black, so they get the light blue of the vanilla trade-ship icons' pennants (flagColor).
// Usage: node ship_icon.js <modRoot> <cfg rel> <out.png> [jsonOptions]
//   options: az (deg, 320), el (deg, 28), lightAz/lightEl (deg, 30/40), flagColor ([r,g,b] or null), rotY (turns the ship, deg), skipModel (extra regex), linear (no tone curve),
//            exposure (linear multiplier before the tone curve; mod textures from 1404 are brighter than vanilla),
//            saturation (after the tone curve, 1.2: the vanilla icons are painted more saturated than the models),
//            stretchY + stretchFrom (rig stretch above deck height, see shipScene),
//            draft (fast preview), look (render overrides)
const fs = require('fs'), path = require('path');
const { loadScene, IDENT } = require('./scene.js');
const R = require('./render.js');

const SIZE = 256;
const LUT_FILE = path.join(__dirname, 'ship_tone_lut.json');
const lut = () => fs.existsSync(LUT_FILE) ? JSON.parse(fs.readFileSync(LUT_FILE, 'utf8')) : null;
const toneOf = L => c => c.map((v, k) => { const x = Math.max(0, Math.min(255, v)), i = Math.floor(Math.min(254, x)), f = x - i; return L[k][i] * (1 - f) + L[k][i + 1] * f; });
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const OUTLINE = { core: 2.2, radius: 6, coreA: 0.95, haloA: 0.35, color: [20, 20, 20] };

function bounds(img, size, thr = 0.5) {
  let x0 = size, x1 = -1, y0 = size, y1 = -1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (img[(y * size + x) * 4 + 3] > thr) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
}

function shipScene(modRoot, cfgRel, o = {}) {
  const extra = o.skipModel ? new RegExp(o.skipModel, 'i') : null;
  const skip = (n, f) => /destruct|debris|wreck/i.test(n + ' ' + f) || (extra && extra.test(n + ' ' + f));
  const rot = o.rotY ? { p: [0, 0, 0], q: [0, Math.sin(o.rotY * Math.PI / 360), 0, Math.cos(o.rotY * Math.PI / 360)], s: [1, 1, 1] } : IDENT;
  const scene = loadScene(modRoot, cfgRel, rot, { skipModel: skip, noProps: true });
  // stretchY above stretchFrom (deck height): vanilla icons draw the rig taller than the model; a low, long ship
  // otherwise fills only half the square. The hull below the deck keeps its shape.
  const sy = o.stretchY ?? 1, y0 = o.stretchFrom ?? 0;
  if (sy !== 1) for (const t of scene.tris) {
    const up = t.v.map(v => v[1] > y0);
    t.v = t.v.map(v => [v[0], v[1] > y0 ? y0 + (v[1] - y0) * sy : v[1], v[2]]);
    if (t.n) t.n = t.n.map((n, i) => up[i] ? norm([n[0], n[1] / sy, n[2]]) : n);
  }
  return scene;
}

// returns { img (linear, no outline), view }
function renderShip(scene, o = {}) {
  const el = o.el ?? 28, az = o.az ?? 320;
  const cam = R.camera(el, az);
  // toward-light vector: lightAz deg from "toward the camera" round to the screen left, lightEl deg above the water
  const la = (o.lightAz ?? 30) * Math.PI / 180, le = (o.lightEl ?? 40) * Math.PI / 180;
  const h = norm([-cam.fwd[0], 0, -cam.fwd[2]]), l = norm([-cam.right[0], 0, -cam.right[2]]);
  const light = norm([0, 1, 2].map(i => i === 1 ? Math.sin(le) : Math.cos(le) * (Math.cos(la) * h[i] + Math.sin(la) * l[i])));
  const base = { el, az, mirror: true, size: SIZE, light, amb: 0.3, dif: 0.75, sunColor: [1.08, 1.02, 0.94], skyColor: [0.9, 0.95, 1.05],
    groundClip: -100, ss: 4, smSize: 2048, aoSize: 512, aoDirs: 16, aoStrength: 0.8, ...o.look };
  if (o.draft) Object.assign(base, { ss: 2, aoDirs: 0 });
  const X0 = 8, X1 = 245, Y0 = 6, Y1 = 246;
  const pts = scene.tris.flatMap(t => t.v);
  let r = R.render(scene, { ...base, ss: 1, aoDirs: 0, fit: { groundPts: pts, width: 200, bottom: 230, top: 20, maxW: 200 } });
  let view = r.view;
  for (let it = 0; it < 3; it++) {
    const ol = R.outline(r.img, SIZE, OUTLINE), b = bounds(ol, SIZE);
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
    const f = Math.min((X1 - X0 + 1) / w, (Y1 - Y0 + 1) / h);
    const sxL = view.cx + (b.x0 - SIZE / 2) / view.k, sxR = view.cx + (b.x1 + 1 - SIZE / 2) / view.k, syB = view.bottomY + (view.bottom - (b.y1 + 1)) / view.k;
    view = { k: view.k * f, cx: (sxL + sxR) / 2, bottomY: syB, bottom: (Y0 + Y1 + 1) / 2 + h * f / 2 };
    r = R.render(scene, { ...base, ss: 1, aoDirs: 0, view });
  }
  r = R.render(scene, { ...base, view });
  return { img: r.img, view };
}

// flat flag colour whose sunlit, tone-mapped result is about rgb
function tintFlags(scene, L, rgb, exposure, re = /flag/i) {
  const inv = (k, v) => { let i = 0; while (i < 255 && L[k][i + 1] < v) i++; return i; };
  const mat = { tex: null, color: rgb.map((v, k) => inv(k, v) / 0.85 / 200 / exposure), name: 'flag tint' };
  for (const t of scene.tris) if (t.src && re.test(t.src)) t.mat = mat;
}

function makeShipIcon(modRoot, cfgRel, out, o = {}) {
  const scene = shipScene(modRoot, cfgRel, o);
  const L = o.linear ? null : lut();
  const flag = o.flagColor === undefined ? [95, 165, 240] : o.flagColor;
  const ex = o.exposure ?? 1, sat = o.saturation ?? 1.2;
  if (L && flag) tintFlags(scene, L, flag, ex);
  const { img } = renderShip(scene, o);
  // tone first, then the outline, so the outline keeps the vanilla near-black (20,20,20)
  const tone = L ? toneOf(L) : null;
  for (let i = 0; i < SIZE * SIZE; i++) {
    let c = [0, 1, 2].map(k => img[i * 4 + k] * ex);
    if (tone) c = tone(c);
    if (sat !== 1) { const y = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; c = c.map(v => y + (v - y) * sat); }
    for (let k = 0; k < 3; k++) img[i * 4 + k] = c[k];
  }
  R.toPng(out, R.outline(img, SIZE, OUTLINE), SIZE, null);
  const b = bounds(img, SIZE);
  console.log(`${out}: tris ${scene.tris.length}, box x ${b.x0}-${b.x1} y ${b.y0}-${b.y1}${L ? '' : ' (linear)'}`);
}
module.exports = { makeShipIcon, shipScene, renderShip, SIZE };
if (require.main === module) {
  const [modRoot, cfg, out, opt] = process.argv.slice(2);
  makeShipIcon(modRoot, cfg, out, opt ? JSON.parse(opt) : {});
}

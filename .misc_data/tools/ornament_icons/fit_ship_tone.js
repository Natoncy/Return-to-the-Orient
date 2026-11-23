// Fits ship_tone_lut.json: renders vanilla ships linear with ship_icon.js and matches each channel's quantiles to
// their vanilla icons (interior pixels only, the outline is eroded away on both sides).
// Usage: node fit_ship_tone.js   (needs D:\anno_data\1800 and C:\tools\texconv.exe)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { shipScene, renderShip, SIZE } = require('./ship_icon.js');
const { decode } = require('./png.js');
const VAN = 'D:/anno_data/1800';
const SHIPS = [
  ['data/graphics/vehicle/schooner/schooner.cfg', 'icon_ship_schooner'],
  ['data/graphics/vehicle/clipper/clipper.cfg', 'icon_ship_clipper'],
  ['data/graphics/vehicle/frigate/frigate.cfg', 'icon_ship_frigatte'],
  ['data/graphics/vehicle/gunboat/gunboat.cfg', 'icon_ship_gunboat'],
];
const tmp = path.join(__dirname, 'cache', 'ship_tone');
fs.mkdirSync(tmp, { recursive: true });

// alpha mask eroded by r px
function interior(alphaAt, w, h, r) {
  const m = new Uint8Array(w * h);
  for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) {
    let ok = true;
    for (let j = -r; j <= r && ok; j++) for (let i = -r; i <= r; i++) if (alphaAt(x + i, y + j) < 0.99) { ok = false; break; }
    m[y * w + x] = ok ? 1 : 0;
  }
  return m;
}

const src = [[], [], []], dst = [[], [], []];
for (const [cfg, icon] of SHIPS) {
  const png = path.join(tmp, icon + '_0.png');
  if (!fs.existsSync(png)) execFileSync('C:/tools/texconv.exe', ['-nologo', '-y', '-ft', 'PNG', '-o', tmp.replace(/\//g, '\\'), path.join(VAN, 'data/ui/2kimages/main/3dicons/ships', icon + '_0.dds').replace(/\//g, '\\')]);
  const v = decode(png);
  const vm = interior((x, y) => v.px[(y * v.w + x) * v.ch + 3] / 255, v.w, v.h, 5);
  for (let i = 0; i < v.w * v.h; i++) if (vm[i]) for (let k = 0; k < 3; k++) dst[k].push(v.px[i * v.ch + k]);
  const { img } = renderShip(shipScene(VAN, cfg), {});
  const rm = interior((x, y) => img[(y * SIZE + x) * 4 + 3], SIZE, SIZE, 5);
  let n = 0;
  for (let i = 0; i < SIZE * SIZE; i++) if (rm[i]) { n++; for (let k = 0; k < 3; k++) src[k].push(Math.max(0, Math.min(255, img[i * 4 + k]))); }
  console.log(`${icon}: vanilla ${vm.reduce((a, b) => a + b, 0)} px, render ${n} px`);
}

// per channel: input level -> vanilla value at the same quantile, then monotone + light smoothing
const lut = [0, 1, 2].map(k => {
  const s = Float64Array.from(src[k]).sort(), d = Float64Array.from(dst[k]).sort();
  const q = x => { let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < x) lo = m + 1; else hi = m; } return lo / s.length; };
  let out = [];
  for (let i = 0; i < 256; i++) {
    const a = q(i - 0.5), b = q(i + 0.5), mid = Math.min(0.9999, (a + b) / 2);
    out.push(d[Math.floor(mid * d.length)]);
  }
  for (let i = 1; i < 256; i++) out[i] = Math.max(out[i], out[i - 1]);
  const sm = out.map((_, i) => { let t = 0, w = 0; for (let j = -3; j <= 3; j++) { const ii = i + j; if (ii < 0 || ii > 255) continue; t += out[ii]; w++; } return t / w; });
  sm[0] = Math.min(sm[0], out[0]);
  return sm.map(x => +x.toFixed(2));
});
fs.writeFileSync(path.join(__dirname, 'ship_tone_lut.json'), JSON.stringify(lut));
for (const p of [10, 25, 50, 75, 90]) console.log(`p${p}:`, [0, 1, 2].map(k => { const s = Float64Array.from(src[k]).sort(); return s[Math.floor(p / 100 * s.length)].toFixed(0) + '->' + lut[k][Math.round(s[Math.floor(p / 100 * s.length)])].toFixed(0); }).join(' '));
console.log('wrote ship_tone_lut.json');

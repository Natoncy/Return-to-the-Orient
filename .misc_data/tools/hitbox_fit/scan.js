// For every .ifo with a sibling .cfg: model height (Models + child cfgs, props too) vs the highest IntersectBox top.
const fs = require('fs'), path = require('path');
const MOD = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const { loadScene } = require(path.join(MOD, '.misc_data/tools/ornament_icons/scene.js'));
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['data'];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.ifo$/i.test(e.name) ? [path.join(d, e.name)] : []);
const boxes = (s, tag) => [...s.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => {
  const g = sub => { const r = m[1].match(new RegExp(`<${sub}>\\s*<xf>([^<]*)</xf>\\s*<yf>([^<]*)</yf>\\s*<zf>([^<]*)</zf>`)); return r ? r.slice(1).map(Number) : null; };
  return { p: g('Position'), e: g('Extents') };
}).filter(b => b.p && b.e);
const out = [];
const log = console.log; console.log = () => {};
for (const r of roots) for (const ifo of walk(path.join(MOD, r))) {
  const cfg = ifo.replace(/\.ifo$/i, '.cfg');
  if (!fs.existsSync(cfg)) continue;
  const rel = path.relative(MOD, cfg).split(path.sep).join('/');
  const s = fs.readFileSync(ifo, 'utf8');
  const ib = boxes(s, 'IntersectBox');
  let tris;
  try { tris = loadScene(MOD, rel).tris; } catch (e) { out.push({ rel, err: e.message }); continue; }
  if (!tris.length) { out.push({ rel, notris: 1, nib: ib.length }); continue; }
  // y of every vertex weighted by triangle area -> robust top (99th pct of area) and absolute top
  const ys = [];
  let ymax = -1e9;
  for (const t of tris) {
    const [a, b, c] = t.v, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const ar = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
    const y = (a[1] + b[1] + c[1]) / 3;
    ys.push([y, ar]);
    ymax = Math.max(ymax, a[1], b[1], c[1]);
  }
  ys.sort((p, q) => p[0] - q[0]);
  const tot = ys.reduce((x, p) => x + p[1], 0);
  let acc = 0, y98 = ymax;
  for (const [y, ar] of ys) { acc += ar; if (acc >= 0.98 * tot) { y98 = y; break; } }
  const top = ib.length ? Math.max(...ib.map(b => b.p[1] + b.e[1])) : null;
  out.push({ rel, nib: ib.length, top, ymax, y98, tris: tris.length });
}
console.log = log;
fs.writeFileSync(path.join(__dirname, 'scan.json'), JSON.stringify(out, null, 1));
const bad = out.filter(o => o.top != null && o.y98 - o.top > 0.75).sort((a, b) => (b.y98 - b.top) - (a.y98 - a.top));
for (const o of bad) log(`${(o.y98 - o.top).toFixed(2).padStart(6)}  box ${o.top.toFixed(2)}  model98 ${o.y98.toFixed(2)} max ${o.ymax.toFixed(2)}  n${o.nib}  ${o.rel}`);
log('total', out.length, 'flagged', bad.length, 'noBox', out.filter(o => o.nib === 0).length, 'err', out.filter(o => o.err).length);

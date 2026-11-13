// For each sub-cfg: the FILE entries that place it (transform y / tilt). Also: all FileName refs in the given cfgs resolve.
const fs = require('fs'), path = require('path');
const C = require('./common');
const cfgs = C.walk(C.MOD, [], (n) => n.toLowerCase().endsWith('.cfg'));
const place = new Map();
for (const f of cfgs) {
  C.each(C.parse(fs.readFileSync(f, 'latin1')), (n) => {
    if (n.v.ConfigType !== 'FILE' || !n.v.FileName || !/\.cfg$/i.test(n.v.FileName)) return;
    const t = n.kids.find((k) => k.v.ConfigType === 'ORIENTATION_TRANSFORM');
    const y = t ? C.num(t.v['Position.y']) : 0;
    const tilt = t ? Math.abs(C.num(t.v['Rotation.x'])) + Math.abs(C.num(t.v['Rotation.z'])) > 1e-3 : false;
    const k = C.norm(n.v.FileName);
    if (!place.has(k)) place.set(k, []);
    place.get(k).push(`${y.toFixed(3)}${tilt ? ' tilt' : ''} adapt=${n.v.AdaptTerrainHeight} in ${C.rel(f).split('/').slice(-1)[0]}`);
  });
}
for (const s of process.argv.slice(2).filter((a) => !a.startsWith('--'))) console.log(s.split('/').slice(-1)[0], '\n   ', (place.get(s.toLowerCase()) || []).join('\n    '));
if (process.argv.includes('--refs')) {
  const list = fs.readFileSync(path.join(__dirname, 'touched.txt'), 'utf8').trim().split(/\r?\n/).filter((l) => l.endsWith('.cfg'));
  let bad = 0, n = 0;
  for (const r of list) for (const m of fs.readFileSync(path.join(C.MOD, r), 'latin1').matchAll(/<FileName>([^<]+\.(rdm|cfg|prp|rdp))<\/FileName>/gi)) {
    n++; if (!C.resolve(m[1])) { bad++; console.log('MISSING', m[1], 'in', r); }
  }
  console.log(`${n} refs in ${list.length} cfgs, ${bad} unresolved`);
}

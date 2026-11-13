// After the bake: list in-scope top-level cfgs that still have MODEL materials at 0 or offset models,
// and sub-cfgs whose model materials differ from the git index (flipped last turn).
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const C = require('./common');
const cfgs = C.walk(C.MOD, [], (n) => n.toLowerCase().endsWith('.cfg'));
const sub = new Set();
for (const f of cfgs) for (const m of fs.readFileSync(f, 'latin1').matchAll(/<FileName>([^<]+\.cfg)<\/FileName>/gi)) sub.add(C.norm(m[1]));
const zero = [], offs = [], subFlipped = [];
let top = 0, crlfBad = 0;
for (const f of cfgs) {
  const r = C.rel(f);
  if (!C.inScope(r)) continue;
  const src = fs.readFileSync(f, 'latin1');
  if (src.includes('\n') && /[^\r]\n/.test(src)) crlfBad++;
  const tree = C.parse(src);
  let z = 0, o = 0;
  C.each(tree, (n) => {
    if (n.v.ConfigType !== 'MODEL') return;
    if (C.bakeParams(n)) o++;
    C.each(n, (c) => { if (c.v.ConfigType === 'MATERIAL' && c.v.ADJUST_TO_TERRAIN_HEIGHT === '0') z++; });
  });
  if (sub.has(r.toLowerCase())) {
    let base = null;
    try { base = execFileSync('git', ['-C', C.MOD, 'show', ':' + r], { encoding: 'latin1', maxBuffer: 1 << 28 }); } catch {}
    if (base !== null) {
      const cnt = (s) => (s.match(/<ADJUST_TO_TERRAIN_HEIGHT>1</g) || []).length;
      if (cnt(src) !== cnt(base)) subFlipped.push(`${r} (${cnt(base)} -> ${cnt(src)})`);
    }
    continue;
  }
  top++;
  if (z) zero.push(`${r}: ${z} materials at 0`);
  if (o) offs.push(`${r}: ${o} offset models`);
}
console.log(`${top} top-level land cfgs; CRLF problems: ${crlfBad}`);
console.log('still 0:', zero); console.log('still offset:', offs); console.log('sub-cfgs with changed ADJUST count:', subFlipped);

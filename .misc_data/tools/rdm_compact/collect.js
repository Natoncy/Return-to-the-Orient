// Walk cfg FileName references recursively from the given cfgs; print every .rdm (with existing _lodN siblings).
const fs = require('fs'), path = require('path');
const root = process.argv[2], seen = new Set(), rdms = new Set();
const norm = p => p.replace(/\\/g, '/').toLowerCase();
function walk(rel) {
  rel = norm(rel); if (seen.has(rel)) return; seen.add(rel);
  const f = path.join(root, rel); if (!fs.existsSync(f)) { console.error('missing', rel); return; }
  const t = fs.readFileSync(f, 'latin1');
  for (const m of t.matchAll(/<FileName>([^<]+)<\/FileName>/g)) {
    const r = norm(m[1].trim());
    if (r.endsWith('.cfg')) walk(r);
    else if (r.endsWith('.rdm')) {
      rdms.add(r);
      const lm = r.match(/^(.*_lod)\d\.rdm$/);
      if (lm) for (let k = 0; k < 5; k++) { const s = lm[1] + k + '.rdm'; if (fs.existsSync(path.join(root, s))) rdms.add(s); }
    }
  }
}
for (const c of process.argv.slice(3)) walk(c);
for (const r of [...rdms].sort()) console.log(r);

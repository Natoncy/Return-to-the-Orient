// List cfg FileName references (.rdm/.cfg) under <modRoot>/data/graphics whose path contains <filter> but whose file is missing.
// Usage: node danglingrefs.js <modRoot> [filter]
const fs = require('fs'), path = require('path');
const [root, filter = ''] = process.argv.slice(2);
let n = 0, missing = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.cfg$/i.test(e.name)) continue;
    for (const m of fs.readFileSync(p, 'latin1').matchAll(/<FileName>([^<]+\.(rdm|cfg))<\/FileName>/gi)) {
      const ref = m[1].trim().replace(/\\/g, '/');
      if (!ref.toLowerCase().includes(filter.toLowerCase())) continue;
      n++;
      if (!fs.existsSync(path.join(root, ref))) { missing++; console.log('MISSING', ref, 'in', path.relative(root, p)); }
    }
  }
})(path.join(root, 'data/graphics'));
console.log(n, 'refs checked,', missing, 'missing');

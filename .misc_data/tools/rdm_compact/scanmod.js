// Scan every .rdm under <modRoot>/data/graphics for degenerate and zero-area triangles.
// Prints: path, metas, index size, stride, tris, degenerate, zeroArea, and how many cfgs reference it.
// Usage: node scanmod.js <modRoot> [pathFilter]
const fs = require('fs'), path = require('path');
const { readStruct } = require('./rdmio.js');
const half = h => { const s = h >> 15, e = (h >> 10) & 31, m = h & 1023; const v = e === 0 ? m / 1024 * 2 ** -14 : (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; };
const [root, filter = ''] = process.argv.slice(2);
const files = [], cfgs = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.rdm$/i.test(e.name) && !/[\\/]anim[\\/]/i.test(p)) files.push(p);
    else if (/\.cfg$/i.test(e.name)) cfgs.push(p);
  }
})(path.join(root, 'data/graphics'));
const refs = {};
for (const c of cfgs) for (const m of fs.readFileSync(c, 'latin1').matchAll(/<FileName>([^<]+\.rdm)<\/FileName>/gi)) {
  const k = m[1].trim().replace(/\\/g, '/').toLowerCase();
  (refs[k] = refs[k] || new Set()).add(path.relative(root, c).replace(/\\/g, '/'));
}
for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  if (!rel.includes(filter)) continue;
  let st; try { st = readStruct(f); } catch (e) { console.log(rel, 'UNREADABLE', e.message); continue; }
  let deg = 0, zero = 0, tris = 0;
  for (const m of st.metas) {
    if (m.isize !== 2) continue;
    const b = st.b, P = i => [0, 2, 4].map(k => half(b.readUInt16LE(m.vb + i * m.stride + k)));
    for (let t = 0; t < m.icount / 3; t++) {
      tris++;
      const ix = [0, 1, 2].map(q => b.readUInt16LE(m.ib + (3 * t + q) * 2));
      if (ix[0] === ix[1] || ix[1] === ix[2] || ix[0] === ix[2]) { deg++; continue; }
      const [a, c, d] = ix.map(P), u = a.map((v, k) => c[k] - v), w = a.map((v, k) => d[k] - v);
      if (Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2 < 1e-6) zero++;
    }
  }
  if (!deg && !zero) continue;
  const m0 = st.metas[0], r = refs[rel.toLowerCase()];
  console.log([rel, 'metas=' + st.metas.length, 'isize=' + m0.isize, 'stride=' + m0.stride, 'inst=' + m0.micount, 'tris=' + tris, 'deg=' + deg, 'zero=' + zero, 'cfgs=' + (r ? r.size : 0)].join('\t'));
}

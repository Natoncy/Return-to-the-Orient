// Triangles with (near) zero area but distinct indices, and vertices not referenced by any non-degenerate triangle.
const { readStruct } = require('./rdmio.js');
const half = h => { const s = h >> 15, e = (h >> 10) & 31, m = h & 1023; const v = e === 0 ? m / 1024 * 2 ** -14 : (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; };
for (const file of process.argv.slice(2)) {
  const st = readStruct(file), m = st.metas[0], b = st.b;
  const P = i => [0, 2, 4].map(k => half(b.readUInt16LE(m.vb + i * m.stride + k)));
  const used = new Uint8Array(m.vcount); let tiny = 0, deg = 0; const tb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (let t = 0; t < m.icount / 3; t++) {
    const ix = [0, 1, 2].map(q => b.readUInt16LE(m.ib + (3 * t + q) * 2));
    if (ix[0] === ix[1] || ix[1] === ix[2] || ix[0] === ix[2]) { deg++; continue; }
    ix.forEach(i => used[i] = 1);
    const [a, c, d] = ix.map(P), u = a.map((v, k) => c[k] - v), w = a.map((v, k) => d[k] - v);
    const area = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
    if (area < 1e-6) { tiny++; for (const p of [a, c, d]) for (let k = 0; k < 3; k++) { tb[k] = Math.min(tb[k], p[k]); tb[k + 3] = Math.max(tb[k + 3], p[k]); } }
  }
  const orphan = used.reduce((s, x) => s + (x ? 0 : 1), 0);
  console.log(file.split('/').pop(), 'tris', m.icount / 3, 'degenerate', deg, 'zeroArea', tiny, tiny ? 'bbox ' + tb.map(v => v.toFixed(2)).join(',') : '', 'verts', m.vcount, 'orphanVerts', orphan);
}

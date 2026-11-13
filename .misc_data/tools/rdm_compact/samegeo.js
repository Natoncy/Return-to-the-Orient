// Check that new.rdm draws exactly the old visible triangles: same order, same full vertex bytes per corner,
// and everything outside VB/IB/MeshInstances unchanged (apart from the shifted pointers).
const { readStruct } = require('./rdmio.js');
const half = h => { const s = h >> 15, e = (h >> 10) & 31, m = h & 1023; const v = e === 0 ? m / 1024 * 2 ** -14 : (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; };
function tris(file, all) {
  const st = readStruct(file), m = st.metas[0], b = st.b, out = [];
  const V = i => b.subarray(m.vb + i * m.stride, m.vb + (i + 1) * m.stride);
  const P = i => [0, 2, 4].map(k => half(b.readUInt16LE(m.vb + i * m.stride + k)));
  for (let t = 0; t < m.icount / 3; t++) {
    const ix = [0, 1, 2].map(q => b.readUInt16LE(m.ib + (3 * t + q) * 2));
    if (!all) {
      if (ix[0] === ix[1] || ix[1] === ix[2] || ix[0] === ix[2]) continue;
      const [a, c, d] = ix.map(P), u = a.map((v, k) => c[k] - v), w = a.map((v, k) => d[k] - v);
      const ZERO = process.env.ZERO || 'area'; // same switch as rebuild.js
      if (ZERO === 'point' ? a.every((v, k) => v === c[k] && v === d[k]) : ZERO === 'area' && Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2 < 1e-6) continue;
    }
    out.push(Buffer.concat(ix.map(V)).toString('hex'));
  }
  return { out, st, m };
}
const [oldF, newF] = process.argv.slice(2);
const A = tris(oldF, false), B = tris(newF, true);
const same = A.out.length === B.out.length && A.out.every((x, k) => x === B.out[k]);
const tailA = A.st.b.subarray(A.m.ib + A.m.icount * 2), tailB = B.st.b.subarray(B.m.ib + B.m.icount * 2);
const headSame = A.st.b.subarray(0, 32).equals(B.st.b.subarray(0, 32));
console.log(newF.split('/').slice(-3).join('/'), same ? 'GEOMETRY SAME' : 'GEOMETRY DIFFERS', A.out.length, 'tris', 'tailLen', tailA.length === tailB.length ? 'same' : 'DIFF', 'hdr32', headSame ? 'same' : 'differs(ptr)');

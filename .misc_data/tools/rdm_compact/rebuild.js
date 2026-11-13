// Rebuild a single-Meta static .rdm without degenerate triangles (and optionally without triangles whose whole UV footprint is
// transparent in the material's diffuse alpha), dropping vertices no kept triangle uses. Layout: head | VB | IB | tail;
// MeshInstances get new start/count, the Meta IB pointer moves, every pointer into the tail shifts by the size change.
// Usage: node rebuild.js in.rdm out.rdm [tex0.png,tex1.png,...]   (texture list per material slot enables the alpha test)
const fs = require('fs');
const { readStruct } = require('./rdmio.js');
const { decode } = require('./pngtool.js');
const half = h => { const s = h >> 15, e = (h >> 10) & 31, m = h & 1023; const v = e === 0 ? m / 1024 * 2 ** -14 : (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; };
const [inp, out, texArg] = process.argv.slice(2);
const st = readStruct(inp), m = st.metas[0], b = st.b;
if (st.metas.length !== 1 || m.isize !== 2) throw new Error('only single-Meta, 16-bit index meshes');
const tex = texArg ? texArg.split(',').map(f => f ? decode(f) : null) : [];
const THR = 25, DIL = +(process.env.DIL ?? 1); // DIL=0: interior texels only (plus the vertex/centroid texels)
const uv = i => [half(b.readUInt16LE(m.vb + i * m.stride + 20)), half(b.readUInt16LE(m.vb + i * m.stride + 22))];
function visible(ix, im) { // any texel with alpha > THR inside the UV triangle (dilated by DIL texels)
  if (!im || im.ch < 4) return true;
  const T = ix.map(uv).map(([u, v]) => [u * im.w, v * im.h]);
  const x0 = Math.floor(Math.min(...T.map(p => p[0]))) - DIL, x1 = Math.ceil(Math.max(...T.map(p => p[0]))) + DIL;
  const y0 = Math.floor(Math.min(...T.map(p => p[1]))) - DIL, y1 = Math.ceil(Math.max(...T.map(p => p[1]))) + DIL;
  const d = (T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (T[1][1] - T[0][1]);
  const dist = (px, py) => { // signed-ish: inside test with tolerance in texels
    if (Math.abs(d) < 1e-9) return 0;
    const l1 = ((T[1][0] - px) * (T[2][1] - py) - (T[2][0] - px) * (T[1][1] - py)) / d, l2 = ((T[2][0] - px) * (T[0][1] - py) - (T[0][0] - px) * (T[2][1] - py)) / d;
    return Math.min(l1, l2, 1 - l1 - l2);
  };
  const scale = Math.max(x1 - x0, y1 - y0, 1), tol = DIL > 0 ? -(DIL + 0.75) / scale : 0;
  const at = (x, y) => { const tx = ((Math.floor(x) % im.w) + im.w) % im.w, ty = ((Math.floor(y) % im.h) + im.h) % im.h; return im.px[(ty * im.w + tx) * 4 + 3]; };
  for (const p of [...T, [(T[0][0] + T[1][0] + T[2][0]) / 3, (T[0][1] + T[1][1] + T[2][1]) / 3]]) if (at(p[0], p[1]) > THR) return true;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (dist(x + 0.5, y + 0.5) < tol) continue;
    const tx = ((x % im.w) + im.w) % im.w, ty = ((y % im.h) + im.h) % im.h;
    if (im.px[(ty * im.w + tx) * 4 + 3] > THR) return true;
  }
  return false;
}
const idx = k => b.readUInt16LE(m.ib + k * 2);
const remap = new Int32Array(m.vcount).fill(-1), newV = [], newI = [], inst = [];
let dropDeg = 0, dropHid = 0, dropZero = 0;
// zero-area triangles with distinct indices (vertices collapsed onto one point) outline as specks just like (i,i,i)
// ZERO=area (default): drop every zero-area triangle; ZERO=point: only all-corners-equal ones (keeps slivers and
// rest-pose cloth meshes, which can be flat by design); ZERO=off: keep all
const ZERO = process.env.ZERO || 'area';
const pos = i => [0, 2, 4].map(k => half(b.readUInt16LE(m.vb + i * m.stride + k)));
const area = ix => { const [a, c, d] = ix.map(pos), u = a.map((v, k) => c[k] - v), w = a.map((v, k) => d[k] - v); return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2; };
const samePoint = ix => { const [a, c, d] = ix.map(pos); return a.every((v, k) => v === c[k] && v === d[k]); };
for (const ins of m.inst) {
  const start = newI.length;
  for (let t = ins.start / 3; t < (ins.start + ins.count) / 3; t++) {
    const ix = [idx(3 * t), idx(3 * t + 1), idx(3 * t + 2)];
    if (ix[0] === ix[1] || ix[1] === ix[2] || ix[0] === ix[2]) { dropDeg++; continue; }
    if (ZERO !== 'off' && (ZERO === 'point' ? samePoint(ix) : area(ix) < 1e-6)) { dropZero++; continue; }
    if (!visible(ix, tex[ins.mat])) { dropHid++; continue; }
    for (const i of ix) { remap[i] = 1; newI.push(i); }
  }
  inst.push({ start, count: newI.length - start, mat: ins.mat });
}
// keep the original vertex order: kept vertices renumbered ascending
for (let i = 0, n = 0; i < m.vcount; i++) if (remap[i] > 0) { remap[i] = n++; newV.push(i); }
for (let k = 0; k < newI.length; k++) newI[k] = remap[newI[k]];
const oldTail = m.ib + m.icount * 2, tail = b.subarray(oldTail);
const head = Buffer.from(b.subarray(0, m.vb));
const vbuf = Buffer.alloc(newV.length * m.stride);
newV.forEach((oi, ni) => b.copy(vbuf, ni * m.stride, m.vb + oi * m.stride, m.vb + (oi + 1) * m.stride));
const ihdr = Buffer.alloc(8); ihdr.writeUInt32LE(newI.length, 0); ihdr.writeUInt32LE(2, 4);
const ibuf = Buffer.alloc(newI.length * 2); newI.forEach((v, k) => ibuf.writeUInt16LE(v, k * 2));
const newIB = m.vb + vbuf.length + 8, newTail = newIB + ibuf.length, delta = newTail - oldTail;
// pointers into the tail, found by value range in head and tail, on 4-byte steps from each section's start
// (a byte-wise scan hit false pointers in n_small_pool: bytes straddling two fields, e.g. 00 30 00 00)
const fix = (buf, base) => { const hits = []; for (let o = 0; o + 4 <= buf.length; o += 4) { const v = buf.readUInt32LE(o); if (v >= oldTail && v < b.length) hits.push(base + o); } return hits; };
const res = Buffer.concat([head, vbuf, ihdr, ibuf, Buffer.from(tail)]);
const ptrs = [...fix(head, 0).map(o => o), ...fix(tail, oldTail).map(o => o - oldTail + newTail)];
for (const o of ptrs) res.writeUInt32LE(res.readUInt32LE(o) + delta, o);
// counts and IB pointer
res.writeUInt32LE(newV.length, m.vb - 8);
if (res.readUInt32LE(m.entry + 16) !== m.ib) throw new Error('meta IB pointer mismatch');
res.writeUInt32LE(newIB, m.entry + 16);
inst.forEach((s, k) => { const o = m.mi + k * m.misize; res.writeUInt32LE(s.start, o); res.writeUInt32LE(s.count, o + 4); });
fs.writeFileSync(out, res);
console.log(`${inp.split('/').pop()}: tris ${m.icount / 3} -> ${newI.length / 3} (degenerate ${dropDeg}, zero-area ${dropZero}, alpha-hidden ${dropHid}), verts ${m.vcount} -> ${newV.length}, ptrs fixed ${ptrs.length}, bytes ${b.length} -> ${res.length}`);

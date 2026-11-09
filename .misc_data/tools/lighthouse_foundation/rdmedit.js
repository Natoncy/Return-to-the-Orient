// Minimal single-Meta, single-instance, stride-24 rdm editor: raw vertex records + index list, rewrite with tail pointer fix-up.
const fs = require('fs');
const { readStruct } = require('C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/rdm_compact/rdmio.js');
function half(h) { const s = h >> 15, e = (h >> 10) & 31, f = h & 1023; const v = e === 0 ? f / 1024 * 2 ** -14 : (1 + f / 1024) * 2 ** (e - 15); return s ? -v : v; }
function toHalf(v) { const f = new Float32Array([v]), i = new Uint32Array(f.buffer)[0]; const s = (i >>> 16) & 0x8000; let e = ((i >>> 23) & 0xff) - 127 + 15, m = i & 0x7fffff;
  if (v === 0) return s; if (e <= 0) return s; if (e >= 31) return s | 0x7c00; m = m + 0x1000; if (m & 0x800000) { m = 0; e++; } return s | (e << 10) | (m >> 13); }
function load(file) {
  const st = readStruct(file), m = st.metas[0], b = st.b;
  if (st.metas.length !== 1 || m.stride !== 24 || m.micount !== 1 || m.isize !== 2) throw new Error('unsupported ' + file);
  const verts = []; for (let i = 0; i < m.vcount; i++) verts.push(Buffer.from(b.subarray(m.vb + i * 24, m.vb + i * 24 + 24)));
  const idx = []; for (let i = 0; i < m.icount; i++) idx.push(b.readUInt16LE(m.ib + i * 2));
  return { st, m, b, verts, idx };
}
const P = v => [0, 1, 2].map(k => half(v.readUInt16LE(k * 2)));
const setP = (v, p) => p.forEach((x, k) => v.writeUInt16LE(toHalf(x), k * 2));
const UV = v => [half(v.readUInt16LE(20)), half(v.readUInt16LE(22))];
const setUV = (v, uv) => { v.writeUInt16LE(toHalf(uv[0]), 20); v.writeUInt16LE(toHalf(uv[1]), 22); };
function save(M, out) {
  const { m, b, verts, idx } = M;
  const oldTail = m.ib + m.icount * 2, tail = b.subarray(oldTail), head = Buffer.from(b.subarray(0, m.vb));
  const vbuf = Buffer.concat(verts);
  const ihdr = Buffer.alloc(8); ihdr.writeUInt32LE(idx.length, 0); ihdr.writeUInt32LE(2, 4);
  const ibuf = Buffer.alloc(idx.length * 2); idx.forEach((v, k) => ibuf.writeUInt16LE(v, k * 2));
  const newIB = m.vb + vbuf.length + 8, newTail = newIB + ibuf.length, delta = newTail - oldTail;
  const fix = (buf, base) => { const h = []; for (let o = 0; o + 4 <= buf.length; o += 4) { const v = buf.readUInt32LE(o); if (v >= oldTail && v < b.length) h.push(base + o); } return h; };
  const res = Buffer.concat([head, vbuf, ihdr, ibuf, Buffer.from(tail)]);
  const ptrs = delta ? [...fix(head, 0), ...fix(tail, oldTail).map(o => o - oldTail + newTail)] : [];
  for (const o of ptrs) res.writeUInt32LE(res.readUInt32LE(o) + delta, o);
  res.writeUInt32LE(verts.length, m.vb - 8);
  res.writeUInt32LE(newIB, m.entry + 16);
  res.writeUInt32LE(idx.length, m.mi + 4);
  fs.writeFileSync(out, res);
  console.log(out.split(/[\\/]/).pop(), 'verts', verts.length, 'tris', idx.length / 3, 'ptrs fixed', ptrs.length);
}
const triN = (a, b, c) => { const u = [0, 1, 2].map(k => b[k] - a[k]), w = [0, 1, 2].map(k => c[k] - a[k]); const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const l = Math.hypot(...n) || 1; return n.map(x => x / l); };
module.exports = { load, save, P, setP, UV, setUV, triN, half, toHalf };

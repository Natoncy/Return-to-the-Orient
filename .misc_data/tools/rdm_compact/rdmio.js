// Structured .rdm reader for single/multi-Meta meshes: header ptr @32 -> Meta table (92-byte entries).
// Meta: +0 name, +4 vertex format, +8 ?, +12 VB, +16 IB, +20 MeshInstances, +28..+51 bbox min/max (float).
const fs = require('fs');
function readStruct(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x014d4452) throw new Error('not rdm ' + file);
  const mt = b.readUInt32LE(32), mcount = b.readUInt32LE(mt - 8), msize = b.readUInt32LE(mt - 4);
  if (msize !== 92) throw new Error('meta size ' + msize);
  const metas = [];
  for (let i = 0; i < mcount; i++) {
    const e = mt + i * 92, u = k => b.readUInt32LE(e + k);
    const vb = u(12), ib = u(16), mi = u(20), vf = u(4);
    const m = {
      entry: e, vb, ib, mi, vf,
      vcount: b.readUInt32LE(vb - 8), stride: b.readUInt32LE(vb - 4),
      icount: b.readUInt32LE(ib - 8), isize: b.readUInt32LE(ib - 4),
      micount: b.readUInt32LE(mi - 8), misize: b.readUInt32LE(mi - 4),
      bbox: [28, 32, 36, 40, 44, 48].map(k => b.readFloatLE(e + k)),
    };
    const ap = b.readUInt32LE(vf), an = b.readUInt32LE(ap - 8);
    m.attrs = [...Array(an)].map((_, k) => [0, 4, 8, 12].map(q => b.readUInt32LE(ap + k * 16 + q)));
    m.inst = [...Array(m.micount)].map((_, k) => ({ start: b.readUInt32LE(mi + k * m.misize), count: b.readUInt32LE(mi + k * m.misize + 4), mat: b.readUInt32LE(mi + k * m.misize + 8) }));
    metas.push(m);
  }
  return { b, mt, metas, hdr: [...Array(10)].map((_, k) => b.readUInt32LE(k * 4)) };
}
module.exports = { readStruct };
if (require.main === module) for (const f of process.argv.slice(2)) {
  const s = readStruct(f);
  console.log(f.split(/[\/]/).pop(), 'len', s.b.length, 'hdr', s.hdr.join(','));
  for (const m of s.metas) console.log('   meta@' + m.entry, `vb@${m.vb} ${m.vcount}x${m.stride} ib@${m.ib} ${m.icount}x${m.isize} mi@${m.mi} ${m.micount}x${m.misize} inst=${m.inst.map(i => `${i.start}+${i.count}:m${i.mat}`).join(',')} attrs=${m.attrs.map(a => a.join('/')).join(' ')} bbox=${m.bbox.map(v => v.toFixed(3)).join(',')} ibEnd=${m.ib + m.icount * m.isize}`);
}

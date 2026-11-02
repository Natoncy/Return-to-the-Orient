// Mirror a static .rdm along x (x -> -x) in place of its bytes, no rdm4 round trip.
// node mirror_rdm.js <in.rdm> <out.rdm> [--info]
// Every Meta block: P4h x sign flipped, N/G/B x byte -> 255-b (4th byte = z flag kept), winding reversed, bbox x swapped.
const fs = require('fs');
const [IN, OUT] = process.argv.slice(2);
const b = Buffer.from(fs.readFileSync(IN));
const u32 = o => b.readUInt32LE(o);
const meta = u32(32), nMeta = u32(meta - 8), metaSize = u32(meta - 4);
if (metaSize !== 92) throw new Error('unexpected Meta entry size ' + metaSize);
const done = new Set();
for (let m = 0; m < nMeta; m++) {
  const e = meta + m * 92;
  // vertex format: [n][24] whose first u32 -> descriptors [id, type, ?, count]
  const vf = u32(e + 4), desc = u32(vf), nd = u32(desc - 8), ds = u32(desc - 4);
  const attrs = []; let off = 0;
  for (let k = 0; k < nd; k++) {
    const d = desc + k * ds, id = u32(d), type = u32(d + 4), cnt = u32(d + 12);
    const size = type === 6 ? 2 * cnt : type === 5 ? 4 : type === 1 ? 4 * cnt : NaN;
    if (Number.isNaN(size)) throw new Error('attribute type ' + type);
    attrs.push({ id, type, cnt, off }); off += size;
  }
  const vb = u32(e + 12), nv = u32(vb - 8), stride = u32(vb - 4);
  if (stride !== off) throw new Error(`stride ${stride} != ${off}`);
  if (!done.has(vb)) {
    done.add(vb);
    for (let v = 0; v < nv; v++) {
      const p = vb + v * stride;
      for (const a of attrs) {
        if (a.id === 0 && a.type === 6) b[p + a.off + 1] ^= 0x80;              // half x sign
        else if (a.id === 0 && a.type === 1) b.writeFloatLE(-b.readFloatLE(p + a.off), p + a.off);
        else if ((a.id === 1 || a.id === 2 || a.id === 3) && a.type === 5) b[p + a.off] = 255 - b[p + a.off];
      }
    }
  }
  const ib = u32(e + 16), ni = u32(ib - 8), is = u32(ib - 4);
  if (!done.has(ib)) {
    done.add(ib);
    for (let t = 0; t + 2 < ni; t += 3) {
      const o1 = ib + (t + 1) * is, o2 = ib + (t + 2) * is;
      if (is === 2) { const x = b.readUInt16LE(o1); b.writeUInt16LE(b.readUInt16LE(o2), o1); b.writeUInt16LE(x, o2); }
      else { const x = b.readUInt32LE(o1); b.writeUInt32LE(b.readUInt32LE(o2), o1); b.writeUInt32LE(x, o2); }
    }
  }
  const mnx = b.readFloatLE(e + 28), mxx = b.readFloatLE(e + 40);
  b.writeFloatLE(-mxx, e + 28); b.writeFloatLE(-mnx, e + 40);
  console.log(`meta ${m}: ${nv} verts stride ${stride} attrs ${attrs.map(a => a.id + ':' + a.type).join(',')}, ${ni} idx x${is}, bbox x ${mnx.toFixed(3)}..${mxx.toFixed(3)}`);
}
if (u32(40)) throw new Error('skinned mesh: mirror the skeleton too');
if (OUT && OUT !== '--info') fs.writeFileSync(OUT, b);

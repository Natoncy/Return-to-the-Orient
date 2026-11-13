// Small RGBA PNG helper.
//   node pngtool.js alpha <in.png> <out.png>     -> writes the alpha channel as an RGB image (white = opaque)
//   node pngtool.js opaque <in.png> <out.png>    -> copy with alpha forced to 255
//   node pngtool.js stats <in.png>               -> share of pixels with alpha < 128
const fs = require('fs'), zlib = require('zlib');
function decode(file) {
  const b = fs.readFileSync(file);
  let o = 8, w, h, depth, type; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; }
    if (t === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const ch = { 6: 4, 2: 3, 4: 2, 0: 1 }[type];
  if (depth !== 8 || !ch) throw new Error(`${file}: unsupported PNG (depth ${depth}, type ${type})`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[y * stride + x - ch] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = (x >= ch && y) ? px[(y - 1) * stride + x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, ch, px };
}
function encode(file, w, h, ch, px) {
  const stride = w * ch, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const table = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  const crc = buf => { let x = 0xffffffff; for (const v of buf) x = table[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = { 4: 6, 3: 2 }[ch];
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]));
}
module.exports = { decode, encode };
if (require.main === module) {
  const [cmd, inp, out] = process.argv.slice(2);
  const { w, h, ch, px } = decode(inp);
  if (cmd === 'stats') {
    if (ch !== 4) { console.log('no alpha'); process.exit(0); }
    let low = 0; for (let i = 3; i < px.length; i += 4) if (px[i] < 128) low++;
    console.log((100 * low / (w * h)).toFixed(1) + '% below 128');
  } else if (cmd === 'alpha') {
    const o = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) o[i * 3] = o[i * 3 + 1] = o[i * 3 + 2] = ch === 4 ? px[i * 4 + 3] : 255;
    encode(out, w, h, 3, o);
  } else if (cmd === 'opaque') {
    if (ch === 4) for (let i = 3; i < px.length; i += 4) px[i] = 255;
    encode(out, w, h, ch, px);
  }
}

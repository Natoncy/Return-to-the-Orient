// Rotating lighthouse beacon for the completed lighthouse (stage 4): writes stufe04/rdm/beacon_lod0.rdm and the 256 px source
// textures maps/beacon_{diff,norm,metal}.png (encode with encode.sh). Local frame of beacon.cfg: y up, origin = rotation axis at
// lens height, the two lamp barrels point along +z and -z (the spotlights in beacon.cfg shine the same way).
// Parts: iron turntable, brass neck, brass lamp housing with a finial, two brass barrels with an iron band, a polished bezel
// and a stepped (Fresnel) lens. One material; the lens glows through the normal map's blue channel (GLOW_ENABLED).
// The mesh is written into a copy of a small single-Meta static rdm (head | VB | IB | tail, pointers fixed, bbox set).
// usage: node beacon.js <template.rdm> <out.rdm> <mapsDir>
const fs = require('fs'), path = require('path');
const T = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/rdm_compact/';
const { readStruct } = require(T + 'rdmio.js');
const { encode } = require(T + 'pngtool.js');
const f16 = (() => { const f = new Float32Array(1), u = new Uint32Array(f.buffer); return v => {
  f[0] = v; const x = u[0], s = (x >>> 16) & 0x8000; let e = ((x >>> 23) & 0xff) - 127 + 15, m = x & 0x7fffff;
  if (e <= 0) return s; if (e >= 31) return s | 0x7c00;
  let r = s | (e << 10) | (m >> 13); if (m & 0x1000) r++; return r; }; })();
const add = (a, c) => a.map((v, k) => v + c[k]), sub = (a, c) => a.map((v, k) => v - c[k]), mul = (a, s) => a.map(v => v * s);
const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2], cr = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const nrm = a => { const l = Math.hypot(...a); return l > 1e-9 ? mul(a, 1 / l) : null; };
const [tpl, out, maps] = process.argv.slice(2);

// ---------- UV regions (0..1) ----------
const LENS = { cu: 0.25, cv: 0.25, r: 0.235 };
const BRASS = [0.52, 0.02, 0.98, 0.48], IRON = [0.02, 0.52, 0.48, 0.98], POLISH = [0.52, 0.52, 0.98, 0.98];
const cyl = reg => (th, t) => [reg[0] + (reg[2] - reg[0]) * th / (2 * Math.PI), reg[1] + (reg[3] - reg[1]) * Math.min(Math.max(t, 0), 1)];

// ---------- geometry ----------
const verts = [], tris = [];
const V = (p, n, uv) => (verts.push({ p, n, uv }), verts.length - 1);
const LS = 24;
// lathe: strips of [r, h] (smooth normals inside a strip, hard edges between strips) around axis dir `ax` through `c`
function lathe(strips, ax, e1, c, uvOf) {
  const e2 = cr(ax, e1);
  for (const prof of strips) {
    const rows = prof.map(([r, h], k) => {
      const a = prof[Math.max(k - 1, 0)], q = prof[Math.min(k + 1, prof.length - 1)];
      const dr = q[0] - a[0], dh = q[1] - a[1], l = Math.hypot(dr, dh);
      return [...Array(LS + 1).keys()].map(s => {
        const th = 2 * Math.PI * s / LS, rad = add(mul(e1, Math.cos(th)), mul(e2, Math.sin(th)));
        const n = nrm(add(mul(rad, dh / l), mul(ax, -dr / l)));
        return V(add(c, add(mul(ax, h), mul(rad, r))), n, uvOf(th, r, h, k / Math.max(prof.length - 1, 1)));
      });
    });
    for (let k = 0; k + 1 < rows.length; k++) for (let s = 0; s < LS; s++) {
      const a = rows[k][s], q = rows[k][s + 1], d = rows[k + 1][s], e = rows[k + 1][s + 1];
      if (prof[k][0] > 1e-6) tris.push([a, d, q]);          // a ring at r = 0 collapses to the axis: skip its zero-area half
      if (prof[k + 1][0] > 1e-6) tris.push([q, d, e]);
    }
  }
}
const Y = [0, 1, 0], X = [1, 0, 0], O = [0, 0, 0];
// turntable (iron), neck (brass), housing + finial (brass / polished)
lathe([[[0, -0.300], [0.13, -0.300]], [[0.13, -0.300], [0.13, -0.270]], [[0.13, -0.270], [0.045, -0.270]]], Y, X, O, cyl(IRON));
lathe([[[0.045, -0.270], [0.045, -0.150]]], Y, X, O, cyl(BRASS));
lathe([[[0.045, -0.150], [0.10, -0.135], [0.112, -0.115]], [[0.112, -0.115], [0.112, 0.115]], [[0.112, 0.115], [0.10, 0.140], [0.07, 0.185], [0.035, 0.215]]],
  Y, X, O, (th, r, h) => cyl(BRASS)(th, (h + 0.15) / 0.365));
lathe([[[0.035, 0.215], [0.025, 0.245], [0.042, 0.262], [0.03, 0.285], [0, 0.300]]], Y, X, O, (th, r, h) => cyl(POLISH)(th, (h - 0.215) / 0.085));
// two barrels along +z / -z, each: barrel, iron band, bezel, stepped lens
const RB = 0.095, RL = 0.102;
for (const sg of [1, -1]) {
  const ax = [0, 0, sg];
  lathe([[[RB, 0.06], [RB, 0.155]], [[RB, 0.181], [RB, 0.255]]], ax, X, O, (th, r, h) => cyl(BRASS)(th, (h - 0.06) / 0.2));
  lathe([[[RB, 0.155], [0.104, 0.158], [0.104, 0.178], [RB, 0.181]]], ax, X, O, (th, r, h) => cyl(IRON)(th, (h - 0.155) / 0.026));
  lathe([[[RB, 0.255], [0.118, 0.272]], [[0.118, 0.272], [0.122, 0.285], [0.118, 0.300]], [[0.118, 0.300], [RL, 0.300]], [[RL, 0.300], [RL, 0.293]]],
    ax, X, O, (th, r, h) => cyl(POLISH)(th, (h - 0.255) / 0.045));
  const lensUV = (th, r) => [LENS.cu + Math.cos(th) * r / RL * LENS.r, LENS.cv + Math.sin(th) * r / RL * LENS.r];
  lathe([[[RL, 0.293], [0.072, 0.306]], [[0.072, 0.306], [0.072, 0.299]], [[0.072, 0.299], [0.042, 0.311]], [[0.042, 0.311], [0.042, 0.304]],
    [[0.042, 0.304], [0.025, 0.313], [0, 0.318]]], ax, X, O, lensUV);
}
// orient triangles so the geometric normal agrees with the vertex normals
let flipped = 0;
for (const t of tris) {
  const p = t.map(i => verts[i].p), g = cr(sub(p[1], p[0]), sub(p[2], p[0]));
  if (dot(g, t.map(i => verts[i].n).reduce(add)) < 0) { [t[1], t[2]] = [t[2], t[1]]; flipped++; }
}
// tangents per vertex from the UV gradients of the adjacent triangles: T = -dP/du, B = -dP/dv
const acc = verts.map(() => ({ u: [0, 0, 0], v: [0, 0, 0] }));
for (const t of tris) {
  const [p0, p1, p2] = t.map(i => verts[i].p), [w0, w1, w2] = t.map(i => verts[i].uv);
  const e1 = sub(p1, p0), e2 = sub(p2, p0), du1 = w1[0] - w0[0], dv1 = w1[1] - w0[1], du2 = w2[0] - w0[0], dv2 = w2[1] - w0[1];
  const den = du1 * dv2 - du2 * dv1; if (Math.abs(den) < 1e-12) continue;
  const dPu = mul(sub(mul(e1, dv2), mul(e2, dv1)), 1 / den), dPv = mul(sub(mul(e2, du1), mul(e1, du2)), 1 / den);
  for (const i of t) { acc[i].u = add(acc[i].u, dPu); acc[i].v = add(acc[i].v, dPv); }
}

// ---------- encode into the template ----------
const st = readStruct(tpl), m = st.metas[0], b = st.b;
if (st.metas.length !== 1 || m.isize !== 2 || m.stride !== 24 || m.inst.length !== 1) throw new Error('unexpected template layout');
const nb = v => Math.max(0, Math.min(255, Math.round((v + 1) * 127.5)));
const vbuf = Buffer.alloc(verts.length * 24);
verts.forEach(({ p, n, uv }, k) => {
  const o = k * 24;
  let Tg = nrm(sub(mul(acc[k].u, -1), mul(n, dot(mul(acc[k].u, -1), n)))) || nrm(cr(n, Math.abs(n[1]) < 0.9 ? Y : X));
  let Bg = nrm(sub(mul(acc[k].v, -1), mul(n, dot(mul(acc[k].v, -1), n)))) || nrm(cr(n, Tg));
  p.forEach((v, q) => vbuf.writeUInt16LE(f16(v), o + q * 2)); vbuf.writeUInt16LE(0, o + 6);
  [[n, 8], [Tg, 12], [Bg, 16]].forEach(([a, off]) => { for (let q = 0; q < 3; q++) vbuf[o + off + q] = nb(a[q]); vbuf[o + off + 3] = vbuf[o + off + 2] < 128 ? 1 : 0; });
  vbuf.writeUInt16LE(f16(uv[0]), o + 20); vbuf.writeUInt16LE(f16(uv[1]), o + 22);
});
if (verts.length > 65535) throw new Error('too many vertices');
const newI = tris.flat();
const oldTail = m.ib + m.icount * 2, tail = b.subarray(oldTail);
const head = Buffer.from(b.subarray(0, m.vb));
const ihdr = Buffer.alloc(8); ihdr.writeUInt32LE(newI.length, 0); ihdr.writeUInt32LE(2, 4);
const ibuf = Buffer.alloc(newI.length * 2); newI.forEach((v, k) => ibuf.writeUInt16LE(v, k * 2));
const newIB = m.vb + vbuf.length + 8, newTail = newIB + ibuf.length, delta = newTail - oldTail;
const fix = (buf, base) => { const hits = []; for (let o = 0; o + 4 <= buf.length; o += 4) { const v = buf.readUInt32LE(o); if (v >= oldTail && v < b.length) hits.push(base + o); } return hits; };
const res = Buffer.concat([head, vbuf, ihdr, ibuf, Buffer.from(tail)]);
const ptrs = [...fix(head, 0), ...fix(tail, oldTail).map(o => o - oldTail + newTail)];
for (const o of ptrs) res.writeUInt32LE(res.readUInt32LE(o) + delta, o);
res.writeUInt32LE(verts.length, m.vb - 8);
if (res.readUInt32LE(m.entry + 16) !== m.ib) throw new Error('meta IB pointer mismatch');
res.writeUInt32LE(newIB, m.entry + 16);
res.writeUInt32LE(0, m.mi); res.writeUInt32LE(newI.length, m.mi + 4);
const lo = [0, 1, 2].map(q => Math.min(...verts.map(v => v.p[q]))), hi = [0, 1, 2].map(q => Math.max(...verts.map(v => v.p[q])));
[...lo, ...hi].forEach((v, k) => res.writeFloatLE(v, m.entry + 28 + k * 4));
fs.writeFileSync(out, res);
console.log(`beacon verts ${verts.length}, tris ${tris.length}, flips ${flipped}, ptrs ${ptrs.length}, bbox ${lo.map(v => v.toFixed(3))} .. ${hi.map(v => v.toFixed(3))}`);

// ---------- textures (256 px): diff, norm (rg flat, b = glow, a = gloss), metal (r = metallic, a = AO) ----------
const S = 256, D = Buffer.alloc(S * S * 4), N = Buffer.alloc(S * S * 4), M = Buffer.alloc(S * S * 4);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const noise = [...Array(S * S)].map(rnd);
const inR = (x, y, r) => x >= r[0] * S && x < r[2] * S && y >= r[1] * S && y < r[3] * S;
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const o = (y * S + x) * 4, nz = noise[y * S + x] - 0.5, u = (x + 0.5) / S, v = (y + 0.5) / S;
  let c, glow = 0, gloss, metal;
  const lr = Math.hypot(u - LENS.cu, v - LENS.cv) / LENS.r;
  if (u < 0.5 && v < 0.5 && lr <= 1.04) {
    // lens: warm white with darker concentric Fresnel rings and a hot centre
    const ring = Math.abs(((lr * 6.2) % 1) - 0.5) > 0.42, hot = Math.max(0, 1 - lr * 3);
    c = ring ? [236, 214, 160] : [255, 244, 206]; c = c.map((q, k) => Math.min(255, q + hot * [0, 11, 40][k]));
    glow = ring ? 200 : 255; gloss = 230; metal = 0;
  } else if (inR(x, y, IRON) || (u < 0.5 && v >= 0.5)) {
    const g = 56 + nz * 16; c = [g + 2, g, g - 3]; gloss = 70; metal = 170;
  } else if (u >= 0.5 && v >= 0.5) {
    const sh = Math.sin(u * 40) * 10; c = [228 + sh + nz * 10, 188 + sh + nz * 8, 96 + nz * 8]; gloss = 190; metal = 255;
  } else {
    // brass (also the lens quadrant outside the circle): streaky, a darker seam line every 32 px along v
    const sh = Math.sin(u * 70 + nz) * 8, seam = (y % 32) < 2 ? -40 : 0;
    c = [192 + sh + seam + nz * 18, 144 + sh + seam + nz * 14, 58 + seam * 0.5 + nz * 10]; gloss = 150; metal = 230;
  }
  [D[o], D[o + 1], D[o + 2], D[o + 3]] = [...c.map(q => Math.max(0, Math.min(255, Math.round(q)))), 255];
  [N[o], N[o + 1], N[o + 2], N[o + 3]] = [128, 128, glow, gloss];
  [M[o], M[o + 1], M[o + 2], M[o + 3]] = [metal, 0, 0, 255];
}
encode(path.join(maps, 'beacon_diff.png'), S, S, 4, D);
encode(path.join(maps, 'beacon_norm.png'), S, S, 4, N);
encode(path.join(maps, 'beacon_metal.png'), S, S, 4, M);
console.log('textures written to', maps);

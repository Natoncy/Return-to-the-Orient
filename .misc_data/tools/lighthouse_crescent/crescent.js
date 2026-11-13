// Replace the statue on the completed lighthouse's tower (lighthouse_lod1.rdm, stage 4) with a gold 3D crescent finial.
// Removes every connected component whose lowest vertex is above DROPY, appends a lathe stem (base, rings, pear bulb, knob)
// and a tapered crescent tube in the XY plane (horns up, faces +-z), then rewrites head | VB | IB | tail with pointer fix-up.
// UVs: matcap-style lookup into the old statue's gold robe (u from n.x, v from n.y). Tangents follow T = -dP/du, B = -dP/dv.
// usage: node crescent.js in.rdm out.rdm   (in = the statue version, git 81e876e8: stufe04/rdm/lighthouse_lod1.rdm)
const fs = require('fs');
const { readStruct } = require('C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/rdm_compact/rdmio.js');
const half = h => { const s = h >> 15, e = (h >> 10) & 31, m = h & 1023; const v = e === 0 ? m / 1024 * 2 ** -14 : (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; };
const f16 = (() => { const f = new Float32Array(1), u = new Uint32Array(f.buffer); return v => {
  f[0] = v; const x = u[0], s = (x >>> 16) & 0x8000; let e = ((x >>> 23) & 0xff) - 127 + 15, m = x & 0x7fffff;
  if (e <= 0) return s; if (e >= 31) return s | 0x7c00;
  let r = s | (e << 10) | (m >> 13); if (m & 0x1000) r++; return r; }; })();
const [inp, out] = process.argv.slice(2);
const st = readStruct(inp), m = st.metas[0], b = st.b;
if (st.metas.length !== 1 || m.isize !== 2 || m.stride !== 24 || m.inst.length !== 1) throw new Error('unexpected layout');
const P = i => [0, 2, 4].map(k => half(b.readUInt16LE(m.vb + i * m.stride + k)));
const idx = k => b.readUInt16LE(m.ib + k * 2);

// ---------- drop the statue (components entirely above DROPY) ----------
const DROPY = 12.1;
const par = [...Array(m.vcount).keys()], fd = x => par[x] === x ? x : (par[x] = fd(par[x]));
const key = {}; for (let i = 0; i < m.vcount; i++) { const k = P(i).map(v => v.toFixed(3)).join(); if (key[k] !== undefined) par[fd(i)] = fd(key[k]); else key[k] = i; }
for (let t = 0; t < m.icount / 3; t++) { const a = fd(idx(3 * t)); par[fd(idx(3 * t + 1))] = a; par[fd(idx(3 * t + 2))] = a; }
const minY = {}; for (let i = 0; i < m.vcount; i++) { const r = fd(i); minY[r] = Math.min(minY[r] ?? Infinity, P(i)[1]); }
const keepI = []; let dropped = 0;
for (let t = 0; t < m.icount / 3; t++) { const ix = [0, 1, 2].map(q => idx(3 * t + q)); if (minY[fd(ix[0])] > DROPY) { dropped++; continue; } keepI.push(...ix); }
const used = new Int32Array(m.vcount).fill(-1); const oldV = [];
for (const i of keepI) if (used[i] < 0) used[i] = 1;
for (let i = 0, n = 0; i < m.vcount; i++) if (used[i] > 0) { used[i] = n++; oldV.push(i); }
const newI = keepI.map(i => used[i]);

// ---------- new geometry ----------
const CX = -0.021, CZ = 0.189, Y0 = 12.2;          // drum top centre
const add = (a, c) => a.map((v, k) => v + c[k]), sub = (a, c) => a.map((v, k) => v - c[k]), mul = (a, s) => a.map(v => v * s);
const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2], cr = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const nrm = a => { const l = Math.hypot(...a); return l > 1e-9 ? mul(a, 1 / l) : null; };
const verts = [], tris = [];  // verts: {p, n}
const V = (p, n) => (verts.push({ p, n }), oldV.length + verts.length - 1);

// lathe: profile [r, h] bottom -> top, smooth normals from the profile slope
const prof = [
  [0.27, 0.00], [0.27, 0.05], [0.22, 0.09], [0.15, 0.11],             // flared foot
  [0.10, 0.15], [0.085, 0.24], [0.13, 0.27], [0.13, 0.30], [0.08, 0.33], // stem + ring
  [0.07, 0.40], [0.11, 0.43], [0.11, 0.46], [0.075, 0.49],               // second ring
  [0.12, 0.53], [0.19, 0.60], [0.215, 0.68], [0.20, 0.76], [0.15, 0.84], [0.095, 0.90], [0.06, 0.95], // pear bulb
  [0.045, 0.99], [0.075, 1.02], [0.095, 1.07], [0.075, 1.12], [0.045, 1.15], [0.035, 1.22],           // knob + neck
];
const LS = 16;
{
  const rows = prof.map(([r, h], k) => {
    const a = prof[Math.max(k - 1, 0)], c = prof[Math.min(k + 1, prof.length - 1)];
    const dr = c[0] - a[0], dh = c[1] - a[1], l = Math.hypot(dr, dh);  // profile tangent; outward normal = (dh, -dr)
    const row = [];
    for (let s = 0; s < LS; s++) {
      const th = 2 * Math.PI * s / LS, cx = Math.cos(th), sz = Math.sin(th);
      row.push(V([CX + r * cx, Y0 + h, CZ + r * sz], nrm([dh / l * cx, -dr / l, dh / l * sz])));
    }
    return row;
  });
  for (let k = 0; k + 1 < rows.length; k++) for (let s = 0; s < LS; s++) {
    const a = rows[k][s], c = rows[k][(s + 1) % LS], d = rows[k + 1][s], e = rows[k + 1][(s + 1) % LS];
    tris.push([a, d, c], [c, d, e]);
  }
  const topC = V([CX, Y0 + prof[prof.length - 1][1] + 0.02, CZ], [0, 1, 0]);  // little dome closing the neck
  const last = rows[rows.length - 1]; for (let s = 0; s < LS; s++) tris.push([last[s], topC, last[(s + 1) % LS]]);
}

// crescent: tube along an arc (radius RC around centre C, angle phi from the bottom, |phi| <= PMAX), ellipse cross-section
// with in-plane half-width A and depth half-width B, both tapering to the horn tips
const RC = 0.42, A0 = 0.14, B0 = 0.075, PMAX = 145 * Math.PI / 180, NA = 28, NS = 12;
const CY = Y0 + 1.20 + A0 + RC;
const S = (phi, th) => {
  const t = Math.abs(phi) / PMAX, c = Math.cos(Math.PI / 2 * Math.min(t, 1));
  const a = A0 * Math.pow(c, 0.75), bb = B0 * Math.pow(c, 0.45);
  const rad = [Math.sin(phi), -Math.cos(phi), 0];  // outward from the arc centre
  return [CX + rad[0] * (RC + a * Math.cos(th)), CY + rad[1] * (RC + a * Math.cos(th)), CZ + bb * Math.sin(th)];
};
{
  // rings from -PEND to +PEND (stop short of the tips: tiny rings collapse under half precision near y 13-14), then one tip vertex per horn
  const PEND = PMAX * 0.93;
  const rows = [];
  for (let k = 0; k <= NA; k++) {
    const phi = -PEND + 2 * PEND * k / NA, row = [];
    for (let s = 0; s < NS; s++) {
      const th = 2 * Math.PI * s / NS, e = 1e-4;
      const n = nrm(cr(mul(sub(S(phi + e, th), S(phi - e, th)), 1 / e), mul(sub(S(phi, th + e), S(phi, th - e)), 1 / e)));
      const p = S(phi, th), axis = [CX + Math.sin(phi) * RC, CY - Math.cos(phi) * RC, CZ];
      row.push(V(p, dot(n, sub(p, axis)) >= 0 ? n : mul(n, -1)));
    }
    rows.push(row);
  }
  for (let k = 0; k < NA; k++) for (let s = 0; s < NS; s++) {
    const a = rows[k][s], c = rows[k][(s + 1) % NS], d = rows[k + 1][s], e = rows[k + 1][(s + 1) % NS];
    tris.push([a, c, d], [c, e, d]);
  }
  for (const [end, sg] of [[0, -1], [NA, 1]]) {
    const phi = sg * PMAX, tip = [CX + Math.sin(phi) * RC, CY - Math.cos(phi) * RC, CZ];
    const tan = nrm([Math.cos(phi) * sg, Math.sin(phi) * sg, 0]);  // along the arc, pointing out of the horn
    const tv = V(tip, tan), row = rows[end];
    for (let s = 0; s < NS; s++) tris.push(sg > 0 ? [row[s], row[(s + 1) % NS], tv] : [row[(s + 1) % NS], row[s], tv]);
  }
}

// orient every new triangle so its geometric normal agrees with the vertex normals (the mesh convention: cross(p1-p0, p2-p0) = front)
let flipped = 0;
for (const t of tris) {
  const p = t.map(i => verts[i - oldV.length].p), g = cr(sub(p[1], p[0]), sub(p[2], p[0]));
  const n = t.map(i => verts[i - oldV.length].n).reduce(add);
  if (dot(g, n) < 0) { [t[1], t[2]] = [t[2], t[1]]; flipped++; }
}

// ---------- encode new vertices ----------
const U0 = 434 / 512, DU = 15 / 512, Vv0 = 20 / 512, DV = 40 / 512;   // one fold of the gold robe in lighthouse_diff_512: dark-bright-dark
const nb = v => Math.max(0, Math.min(255, Math.round((v + 1) * 127.5)));
const vbNew = Buffer.alloc(verts.length * 24);
verts.forEach(({ p, n }, k) => {
  const o = k * 24;
  p.forEach((v, q) => vbNew.writeUInt16LE(f16(v), o + q * 2)); vbNew.writeUInt16LE(0, o + 6);
  let T = nrm(sub([-1, 0, 0], mul(n, -n[0]))) || nrm(sub([0, 0, -1], mul(n, -n[2])));
  let B = nrm(sub(sub([0, 1, 0], mul(n, n[1])), mul(T, dot(T, [0, 1, 0])))) || nrm(cr(n, T));
  [[n, 8], [T, 12], [B, 16]].forEach(([a, off]) => { for (let q = 0; q < 3; q++) vbNew[o + off + q] = nb(a[q]); vbNew[o + off + 3] = 0; });
  vbNew.writeUInt16LE(f16(U0 + (n[0] * 0.5 + 0.5) * DU), o + 20);
  vbNew.writeUInt16LE(f16(Vv0 + (0.5 - n[1] * 0.5) * DV), o + 22);
});
for (const t of tris) newI.push(...t);
const vcount = oldV.length + verts.length;
if (vcount > 65535) throw new Error('too many vertices');

// ---------- write ----------
const oldTail = m.ib + m.icount * 2, tail = b.subarray(oldTail);
const head = Buffer.from(b.subarray(0, m.vb));
const vbuf = Buffer.alloc(vcount * 24);
oldV.forEach((oi, ni) => b.copy(vbuf, ni * 24, m.vb + oi * 24, m.vb + (oi + 1) * 24));
vbNew.copy(vbuf, oldV.length * 24);
const ihdr = Buffer.alloc(8); ihdr.writeUInt32LE(newI.length, 0); ihdr.writeUInt32LE(2, 4);
const ibuf = Buffer.alloc(newI.length * 2); newI.forEach((v, k) => ibuf.writeUInt16LE(v, k * 2));
const newIB = m.vb + vbuf.length + 8, newTail = newIB + ibuf.length, delta = newTail - oldTail;
const fix = (buf, base) => { const hits = []; for (let o = 0; o + 4 <= buf.length; o += 4) { const v = buf.readUInt32LE(o); if (v >= oldTail && v < b.length) hits.push(base + o); } return hits; };
const res = Buffer.concat([head, vbuf, ihdr, ibuf, Buffer.from(tail)]);
const ptrs = [...fix(head, 0), ...fix(tail, oldTail).map(o => o - oldTail + newTail)];
for (const o of ptrs) res.writeUInt32LE(res.readUInt32LE(o) + delta, o);
res.writeUInt32LE(vcount, m.vb - 8);
if (res.readUInt32LE(m.entry + 16) !== m.ib) throw new Error('meta IB pointer mismatch');
res.writeUInt32LE(newIB, m.entry + 16);
res.writeUInt32LE(0, m.mi); res.writeUInt32LE(newI.length, m.mi + 4);
fs.writeFileSync(out, res);
console.log(`statue tris dropped ${dropped}, verts ${m.vcount} -> ${vcount} (+${verts.length}), tris ${m.icount / 3} -> ${newI.length / 3} (+${tris.length}), winding flips ${flipped}, ptrs ${ptrs.length}, top y ${Math.max(...verts.map(v => v.p[1])).toFixed(3)}`);

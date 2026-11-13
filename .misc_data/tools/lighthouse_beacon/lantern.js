// Open up the lantern of the completed lighthouse's tower (lighthouse_lod1.rdm, stage 4): drop the 8 glass panes, give the
// pillars between the arched openings an inner face (pane plane = inner wall plane), and close the room with a tiled floor at the
// sill height (y 9.68) and a plaster ceiling at the arch apex (y 10.93). Adds a static brass pedestal for the rotating beacon
// (beacon.js / beacon.cfg). Rewrites head | VB | IB | tail with pointer fix-up like crescent.js.
// UVs: inner faces = the red jamb plaster (u 502-507), floor = the octagonal tile floor (u 28-152, v 298-422),
// ceiling = the plaster octagon cap (u 372-452, v 389-474), pedestal = the gold matcap fold used by the crescent.
// usage: node lantern.js in.rdm out.rdm   (in = stufe04/rdm/lighthouse_lod1.rdm with the crescent but still glazed;
//        the shipped file has no panes left, so a second run stops with "expected 16 pane triangles")
const fs = require('fs');
const { readStruct } = require('C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient/.misc_data/tools/rdm_compact/rdmio.js');
const half = h => { const s = h >> 15, e = (h >> 10) & 31, m = h & 1023; const v = e === 0 ? m / 1024 * 2 ** -14 : (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; };
const f16 = (() => { const f = new Float32Array(1), u = new Uint32Array(f.buffer); return v => {
  f[0] = v; const x = u[0], s = (x >>> 16) & 0x8000; let e = ((x >>> 23) & 0xff) - 127 + 15, m = x & 0x7fffff;
  if (e <= 0) return s; if (e >= 31) return s | 0x7c00;
  let r = s | (e << 10) | (m >> 13); if (m & 0x1000) r++; return r; }; })();
const add = (a, c) => a.map((v, k) => v + c[k]), sub = (a, c) => a.map((v, k) => v - c[k]), mul = (a, s) => a.map(v => v * s);
const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2], cr = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const nrm = a => { const l = Math.hypot(...a); return l > 1e-9 ? mul(a, 1 / l) : null; };

const [inp, out] = process.argv.slice(2);
const st = readStruct(inp), m = st.metas[0], b = st.b;
if (st.metas.length !== 1 || m.isize !== 2 || m.stride !== 24 || m.inst.length !== 1) throw new Error('unexpected layout');
const P = i => [0, 2, 4].map(k => half(b.readUInt16LE(m.vb + i * m.stride + k)));
const UV = i => [20, 22].map(k => half(b.readUInt16LE(m.vb + i * m.stride + k)) * 512);
const idx = k => b.readUInt16LE(m.ib + k * 2);
const YF = 9.68, YJ = 10.734, YC = 10.93;   // floor/sill, jamb top, arch apex = ceiling
const near = (a, c, e = 0.004) => Math.abs(a - c) < e;

// ---------- find the panes (window glass: u 463-487, v 237-318, between sill and apex) ----------
const keepI = [], panes = [];
for (let t = 0; t < m.icount / 3; t++) {
  const ix = [0, 1, 2].map(q => idx(3 * t + q)), ps = ix.map(P), uv = ix.map(UV);
  const isPane = ps.every(p => p[1] > YF - 0.01 && p[1] < YC + 0.01) && uv.every(([u, v]) => u > 462 && u < 488 && v > 236 && v < 319)
    && Math.max(...ps.map(p => p[1])) - Math.min(...ps.map(p => p[1])) > 1;
  if (isPane) panes.push(ps); else keepI.push(...ix);
}
if (panes.length !== 16) throw new Error('expected 16 pane triangles, found ' + panes.length);

// group the 16 triangles into 8 quads by plane, centre = mean of the quad centroids
const quads = [];
for (const tri of panes) {
  const c = mul(tri.reduce(add), 1 / 3);
  let q = quads.find(q => Math.hypot(q.c[0] - c[0], q.c[2] - c[2]) < 0.25);
  if (!q) quads.push(q = { c, pts: [] });
  for (const p of tri) if (!q.pts.some(o => Math.hypot(...sub(o, p)) < 1e-3)) q.pts.push(p);
}
if (quads.length !== 8 || quads.some(q => q.pts.length !== 4)) throw new Error('pane quads ' + quads.map(q => q.pts.length));
for (const q of quads) q.c = mul(q.pts.reduce(add), 1 / 4);
const CX = quads.reduce((s, q) => s + q.c[0], 0) / 8, CZ = quads.reduce((s, q) => s + q.c[2], 0) / 8;
for (const q of quads) {
  q.ang = Math.atan2(q.c[2] - CZ, q.c[0] - CX);
  q.n = nrm([q.c[0] - CX, 0, q.c[2] - CZ]);                       // outward (horizontal)
  q.t = [-q.n[2], 0, q.n[0]];                                     // along the face, increasing angle
  const ts = q.pts.map(p => dot(sub(p, q.c), q.t));
  q.tJ0 = Math.min(...ts); q.tJ1 = Math.max(...ts);               // jamb inner edges
  q.a = dot(sub(q.c, [CX, 0, CZ]), q.n);                          // inner apothem
}
quads.sort((p, q) => p.ang - q.ang);

// arch slant tops at the apex height on the inner plane (existing soffit vertices)
const allP = [...Array(m.vcount).keys()].map(P);
for (const q of quads) {
  const s = allP.filter(p => near(p[1], YC) && Math.abs(dot(sub(p, [CX, 0, CZ]), q.n) - q.a) < 0.01 && Math.abs(dot(sub(p, q.c), q.t)) < 0.15)
    .map(p => dot(sub(p, q.c), q.t));
  if (s.length < 2) throw new Error('no soffit vertices for face at ' + (q.ang * 180 / Math.PI).toFixed(1));
  q.tS0 = Math.min(...s); q.tS1 = Math.max(...s);
}
// inner corners = intersections of adjacent inner planes (xz)
const P3 = (q, t, y) => [q.c[0] + q.t[0] * t, y, q.c[2] + q.t[2] * t];
const corner = (q, r) => {   // solve q.c + q.t*s = r.c + r.t*u in xz
  const d = sub(r.c, q.c), den = q.t[0] * -r.t[2] - q.t[2] * -r.t[0];
  return (d[0] * -r.t[2] - d[2] * -r.t[0]) / den;                // s along q
};
quads.forEach((q, k) => { const r = quads[(k + 1) % 8]; q.tC1 = corner(q, r); r.tC0 = corner(r, q); });

// ---------- new geometry ----------
const polys = [];   // { pts, uvs (texels), n }
const poly = (pts, uvs, n) => polys.push({ pts, uvs, n });
// inner faces of the pillars (jamb plaster: u 502..507, v 343 at YJ .. 410 at YF; slanted part continues above)
const vOf = y => 343 + (YJ - y) / (YJ - YF) * 67;
for (const q of quads) {
  const n = mul(q.n, -1);
  const uL = t => 502 + (t - q.tC0) / (q.tJ0 - q.tC0) * 5, uR = t => 502 + (q.tC1 - t) / (q.tC1 - q.tJ1) * 5;
  const L = [[q.tC0, YF], [q.tJ0, YF], [q.tJ0, YJ], [q.tS0, YC], [q.tC0, YC]];
  const R = [[q.tJ1, YF], [q.tC1, YF], [q.tC1, YC], [q.tS1, YC], [q.tJ1, YJ]];
  poly(L.map(([t, y]) => P3(q, t, y)), L.map(([t, y]) => [uL(Math.min(t, q.tJ0)), vOf(y)]), n);
  poly(R.map(([t, y]) => P3(q, t, y)), R.map(([t, y]) => [uR(Math.max(t, q.tJ1)), vOf(y)]), n);
}
// floor and ceiling: the inner octagon, texture octagons rotated so their flats meet the walls
const oct = quads.map(q => P3(q, q.tC1, 0));
const a0 = quads[0].ang, aIn = quads.reduce((s, q) => s + q.a, 0) / 8;
const planar = (p, cu, cv, apo) => { const x = p[0] - CX, z = p[2] - CZ, c = Math.cos(-a0), s = Math.sin(-a0), k = apo / aIn;
  return [cu + (x * c - z * s) * k, cv + (x * s + z * c) * k]; };
{
  const ring = oct.map(p => [p[0], YF, p[2]]);
  poly([[CX, YF, CZ], ...ring, ring[0]], [[CX, YF, CZ], ...ring, ring[0]].map(p => planar(p, 90, 360, 60)), [0, 1, 0]);
  const top = oct.map(p => [p[0], YC, p[2]]);
  poly([[CX, YC, CZ], ...top, top[0]], [[CX, YC, CZ], ...top, top[0]].map(p => planar(p, 412, 431, 38)), [0, -1, 0]);
}
// fan-triangulate the polygons (pt 0 = fan centre for floor/ceiling; inner faces are convex pentagons)
const verts = [], tris = [];
const V = (p, n, uv) => (verts.push({ p, n, uv }), m.vcount + verts.length - 1);   // indices fixed up after compaction
for (const { pts, uvs, n } of polys) {
  // T = -dP/du, B = -dP/dv from the first non-degenerate corner triple
  let T = null, B = null;
  for (let k = 1; k + 1 < pts.length && !T; k++) {
    const e1 = sub(pts[k], pts[0]), e2 = sub(pts[k + 1], pts[0]);
    const du1 = (uvs[k][0] - uvs[0][0]) / 512, dv1 = (uvs[k][1] - uvs[0][1]) / 512, du2 = (uvs[k + 1][0] - uvs[0][0]) / 512, dv2 = (uvs[k + 1][1] - uvs[0][1]) / 512;
    const den = du1 * dv2 - du2 * dv1; if (Math.abs(den) < 1e-9) continue;
    const dPu = mul(sub(mul(e1, dv2), mul(e2, dv1)), 1 / den), dPv = mul(sub(mul(e2, du1), mul(e1, du2)), 1 / den);
    T = nrm(sub(mul(dPu, -1), mul(n, dot(mul(dPu, -1), n)))); B = nrm(sub(mul(dPv, -1), mul(n, dot(mul(dPv, -1), n))));
  }
  const ids = pts.map((p, k) => V(p, n, uvs[k])); verts.slice(-pts.length).forEach(v => { v.T = T; v.B = B; });
  for (let k = 1; k + 1 < ids.length; k++) tris.push([ids[0], ids[k], ids[k + 1]]);
}
// static brass pedestal (lathe), gold matcap UVs like the crescent
const PED = [[0.17, 0], [0.17, 0.025], [0.14, 0.04], [0.10, 0.05], [0.075, 0.07], [0.06, 0.10], [0.055, 0.20], [0.07, 0.23], [0.10, 0.25], [0.12, 0.27], [0.12, 0.30]];
const LS = 16, gold = n => [434 + (n[0] * 0.5 + 0.5) * 15, 20 + (0.5 - n[1] * 0.5) * 40];
{
  const rows = PED.map(([r, h], k) => {
    const a = PED[Math.max(k - 1, 0)], c = PED[Math.min(k + 1, PED.length - 1)];
    const dr = c[0] - a[0], dh = c[1] - a[1], l = Math.hypot(dr, dh);
    return [...Array(LS).keys()].map(s => {
      const th = 2 * Math.PI * s / LS, n = nrm([dh / l * Math.cos(th), -dr / l, dh / l * Math.sin(th)]);
      return V([CX + r * Math.cos(th), YF + h, CZ + r * Math.sin(th)], n, gold(n));
    });
  });
  for (let k = 0; k + 1 < rows.length; k++) for (let s = 0; s < LS; s++) {
    const a = rows[k][s], c = rows[k][(s + 1) % LS], d = rows[k + 1][s], e = rows[k + 1][(s + 1) % LS];
    tris.push([a, d, c], [c, d, e]);
  }
  const yTop = YF + PED[PED.length - 1][1], ring = [...Array(LS).keys()].map(s => { const th = 2 * Math.PI * s / LS, r = PED[PED.length - 1][0];
    return V([CX + r * Math.cos(th), yTop, CZ + r * Math.sin(th)], [0, 1, 0], gold([0, 1, 0])); });
  const cTop = V([CX, yTop, CZ], [0, 1, 0], gold([0, 1, 0]));
  for (let s = 0; s < LS; s++) tris.push([cTop, ring[s], ring[(s + 1) % LS]]);
}
// orient each triangle so its geometric normal agrees with the vertex normals (front = cross(p1-p0, p2-p0))
const NV = i => verts[i - m.vcount];
let flipped = 0;
for (const t of tris) {
  const p = t.map(i => NV(i).p), g = cr(sub(p[1], p[0]), sub(p[2], p[0]));
  if (dot(g, t.map(i => NV(i).n).reduce(add)) < 0) { [t[1], t[2]] = [t[2], t[1]]; flipped++; }
}

// ---------- compact old vertices (panes dropped) and encode new ones ----------
const used = new Int32Array(m.vcount).fill(-1), oldV = [];
for (const i of keepI) used[i] = 1;
for (let i = 0, n = 0; i < m.vcount; i++) if (used[i] > 0) { used[i] = n++; oldV.push(i); }
const remap = i => i < m.vcount ? used[i] : oldV.length + (i - m.vcount);
const newI = keepI.map(remap);
for (const t of tris) newI.push(...t.map(remap));
const nb = v => Math.max(0, Math.min(255, Math.round((v + 1) * 127.5)));
const vbNew = Buffer.alloc(verts.length * 24);
verts.forEach(({ p, n, uv, T, B }, k) => {
  const o = k * 24;
  if (!T) { T = nrm(sub([-1, 0, 0], mul(n, -n[0]))) || nrm(sub([0, 0, -1], mul(n, -n[2]))); B = nrm(sub(sub([0, 1, 0], mul(n, n[1])), mul(T, dot(T, [0, 1, 0])))) || nrm(cr(n, T)); }
  p.forEach((v, q) => vbNew.writeUInt16LE(f16(v), o + q * 2)); vbNew.writeUInt16LE(0, o + 6);
  [[n, 8], [T, 12], [B, 16]].forEach(([a, off]) => { for (let q = 0; q < 3; q++) vbNew[o + off + q] = nb(a[q]); vbNew[o + off + 3] = vbNew[o + off + 2] < 128 ? 1 : 0; });
  vbNew.writeUInt16LE(f16(uv[0] / 512), o + 20); vbNew.writeUInt16LE(f16(uv[1] / 512), o + 22);
});
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
console.log(`centre ${CX.toFixed(4)},${CZ.toFixed(4)} inner apothem ${aIn.toFixed(4)}; panes dropped ${panes.length}, verts ${m.vcount} -> ${vcount}, tris ${m.icount / 3} -> ${newI.length / 3} (+${tris.length}), flips ${flipped}, ptrs ${ptrs.length}`);
console.log('faces', quads.map(q => `${(q.ang * 180 / Math.PI).toFixed(1)}: J ${q.tJ0.toFixed(3)}/${q.tJ1.toFixed(3)} S ${q.tS0.toFixed(3)}/${q.tS1.toFixed(3)} C ${q.tC0.toFixed(3)}/${q.tC1.toFixed(3)}`).join('\n      '));

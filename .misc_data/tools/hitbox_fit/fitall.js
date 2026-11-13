// node fitall.js report            -> uncovered share of the model (inside the BuildBlocker, above 5 cm) per referenced building ifo
// node fitall.js apply <list.txt>  -> append fitted IntersectBoxes for the uncovered height slabs, grow BoundingBox
const fs = require('fs'), path = require('path');
const MOD = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const { loadScene } = require(path.join(MOD, '.misc_data/tools/ornament_icons/scene.js'));
const [mode, listFile] = process.argv.slice(2);
const SLAB = 0.25, TOL = 0.05;
const vec = (b, sub) => { const r = b.match(new RegExp(`<${sub}>\\s*<xf>([^<]*)</xf>\\s*<yf>([^<]*)</yf>\\s*<zf>([^<]*)</zf>`)); return r ? r.slice(1).map(Number) : null; };
const ibs = s => [...s.matchAll(/<IntersectBox>([\s\S]*?)<\/IntersectBox>/g)].map(m => ({ p: vec(m[1], 'Position'), e: vec(m[1], 'Extents') })).filter(b => b.p && b.e);
function footprint(s) {
  const bb = s.match(/<BuildBlocker>([\s\S]*?)<\/BuildBlocker>/);
  if (!bb) return null;
  const ps = [...bb[1].matchAll(/<xf>([^<]*)<\/xf>\s*<zf>([^<]*)<\/zf>/g)].map(m => [+m[1], +m[2]]);
  if (!ps.length) return null;
  return [Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1]))];
}
const inBox = (b, q) => Math.abs(q[0] - b.p[0]) <= b.e[0] + TOL && Math.abs(q[1] - b.p[1]) <= b.e[1] + TOL && Math.abs(q[2] - b.p[2]) <= b.e[2] + TOL;
// deterministic area-weighted surface samples
function samples(tris, fp) {
  const out = [];
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const t of tris) {
    const [a, b, c] = t.v, u = [0, 1, 2].map(k => b[k] - a[k]), w = [0, 1, 2].map(k => c[k] - a[k]);
    const ar = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
    if (!ar) continue;
    const n = Math.min(200, Math.ceil(ar / 0.02));
    for (let i = 0; i < n; i++) {
      let r1 = rnd(), r2 = rnd();
      if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
      const q = [0, 1, 2].map(k => a[k] + r1 * u[k] + r2 * w[k]);
      if (q[1] < 0.05 || q[0] < fp[0] - TOL || q[0] > fp[2] + TOL || q[2] < fp[1] - TOL || q[2] > fp[3] + TOL) continue;
      out.push({ q, w: ar / n });
    }
  }
  return out;
}
function analyse(rel) {
  let ifo = path.join(MOD, rel.replace(/\.cfg$/i, '.ifo'));
  if (!fs.existsSync(ifo)) ifo = path.join('D:/anno_data/1800', rel.replace(/\.cfg$/i, '.ifo'));
  const s = fs.readFileSync(ifo, 'utf8');
  const boxes = ibs(s);
  let fp = footprint(s);
  if (!fp && boxes.length) fp = [Math.min(...boxes.map(b => b.p[0] - b.e[0])), Math.min(...boxes.map(b => b.p[2] - b.e[2])), Math.max(...boxes.map(b => b.p[0] + b.e[0])), Math.max(...boxes.map(b => b.p[2] + b.e[2]))];
  if (!fp || !boxes.length) return null;
  const log = console.log; console.log = () => {};
  const tris = loadScene(MOD, rel).tris;
  console.log = log;
  const S = samples(tris, fp);
  let tot = 0, unc = 0;
  for (const x of S) { tot += x.w; if (!boxes.some(b => inBox(b, x.q))) { x.u = 1; unc += x.w; } }
  return { ifo, s, boxes, fp, S, tot, unc, frac: tot ? unc / tot : 0, top: Math.max(...boxes.map(b => b.p[1] + b.e[1])) };
}
function fit(A) {
  const { S, fp } = A;
  const ymax = Math.max(...S.map(x => x.q[1]));
  const n = Math.ceil(ymax / SLAB);
  // per slab: points binned on a 0.5 m grid, 8-connected clusters -> one rect each (towers apart from the body stay apart)
  const G = 0.5, slabs = [...Array(n)].map(() => new Map());
  for (const x of S) {
    const m = slabs[Math.min(n - 1, Math.floor(x.q[1] / SLAB))], key = Math.floor(x.q[0] / G) + ',' + Math.floor(x.q[2] / G);
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(x);
  }
  const area = r => Math.max(0.04, (r[2] - r[0]) * (r[3] - r[1]));
  const uni = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  const overlap = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
  const out = [];
  let open = [];
  for (let i = 0; i < n; i++) {
    const m = slabs[i], seen = new Set(), clusters = [];
    for (const k of m.keys()) {
      if (seen.has(k)) continue;
      const st = [k], pts = [];
      seen.add(k);
      while (st.length) {
        const c = st.pop(), [cx, cz] = c.split(',').map(Number);
        pts.push(...m.get(c));
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const nk = (cx + dx) + ',' + (cz + dz); if (m.has(nk) && !seen.has(nk)) { seen.add(nk); st.push(nk); } }
      }
      let tot = 0, unc = 0;
      const r = [1e9, 1e9, -1e9, -1e9];
      for (const x of pts) { tot += x.w; if (x.u) unc += x.w; r[0] = Math.min(r[0], x.q[0]); r[1] = Math.min(r[1], x.q[2]); r[2] = Math.max(r[2], x.q[0]); r[3] = Math.max(r[3], x.q[2]); }
      // mostly uncovered clusters get a box; tiny loose bits (< 0.02 m² of surface) are skipped
      if (unc > 0.02 && unc / tot > 0.1) clusters.push(r);
    }
    const next = [];
    for (const r of clusters) {
      const b = open.find(o => !o.used && overlap(o.r, r) && area(uni(o.r, r)) <= 1.35 * Math.min(area(o.r), area(r)) + 0.1);
      if (b) { b.r = uni(b.r, r); b.y1 = (i + 1) * SLAB; b.used = true; next.push(b); }
      else { const nb = { y0: i * SLAB, y1: (i + 1) * SLAB, r, used: true }; out.push(nb); next.push(nb); }
    }
    for (const b of next) b.used = false;
    open = next;
  }
  // 3D pass: merge the pair whose bounding box wastes the least air, while it stays under 30 % extra volume
  // (occ = volume of the original fragments, so air can't pile up over a chain of merges)
  const vol = b => area(b.r) * (b.y1 - b.y0);
  for (const b of out) b.occ = vol(b);
  for (;;) {
    let best = null;
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j], u = { r: uni(a.r, b.r), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1), occ: a.occ + b.occ };
      const extra = vol(u) / u.occ;
      if (extra <= 1.3 && (!best || extra < best.extra)) best = { i, j, u, extra };
    }
    if (!best) break;
    out.splice(best.j, 1); out[best.i] = best.u;
  }
  const top = ymax;
  return out.map(b => {
    const y1 = Math.min(b.y1, top + 0.02), r = [Math.max(fp[0], b.r[0]), Math.max(fp[1], b.r[1]), Math.min(fp[2], b.r[2]), Math.min(fp[3], b.r[3])];
    const hx = Math.max(0.1, (r[2] - r[0]) / 2), hz = Math.max(0.1, (r[3] - r[1]) / 2);
    return { p: [(r[0] + r[2]) / 2, (b.y0 + y1) / 2, (r[1] + r[3]) / 2], e: [hx, (y1 - b.y0) / 2, hz] };
  });
}
const f = x => String(+x.toFixed(4));
const boxXml = (tag, name, p, e) => [
  `\t<${tag}>`, `\t\t<Name>${name}</Name>`,
  '\t\t<Position>', ...p.map((v, k) => `\t\t\t<${'xyz'[k]}f>${f(v)}</${'xyz'[k]}f>`), '\t\t</Position>',
  '\t\t<Rotation>', '\t\t\t<xf>0</xf>', '\t\t\t<yf>0</yf>', '\t\t\t<zf>0</zf>', '\t\t\t<wf>1</wf>', '\t\t</Rotation>',
  '\t\t<Extents>', ...e.map((v, k) => `\t\t\t<${'xyz'[k]}f>${f(v)}</${'xyz'[k]}f>`), '\t\t</Extents>',
  `\t</${tag}>`];

if (mode === 'report') {
  const refs = new Set(fs.readFileSync(path.join(__dirname, 'refs.txt'), 'utf8').split(/\r?\n/));
  const scan = require('./scan.json').filter(o => o.nib > 0 && refs.has(o.rel.toLowerCase()));
  const rows = [];
  for (const o of scan) { const A = analyse(o.rel); if (A) rows.push([A.frac, A.unc, A.top, o.rel]); }
  rows.sort((a, b) => b[0] - a[0]);
  for (const r of rows) if (r[0] > 0.1 && r[1] > 0.3) console.log(`${(100 * r[0]).toFixed(0).padStart(3)}%  ${r[1].toFixed(1).padStart(6)}m²  top ${r[2].toFixed(2)}  ${r[3]}`);
} else if (mode === 'apply') {
  for (const rel of fs.readFileSync(listFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const A = analyse(rel);
    const add = fit(A);
    if (!add.length) { console.log('nothing', rel); continue; }
    let s = A.s;
    const eol = s.includes('\r\n') ? '\r\n' : '\n';
    const names = [...s.matchAll(/<IntersectBox>\s*<Name>Hitbox_(\d+)<\/Name>/g)].map(m => +m[1]);
    let next = names.length ? Math.max(...names) + 1 : A.boxes.length;
    const xml = add.map(b => boxXml('IntersectBox', `Hitbox_${next++}`, b.p, b.e).join(eol)).join(eol + eol);
    const lastEnd = s.lastIndexOf('</IntersectBox>') + '</IntersectBox>'.length;
    s = s.slice(0, lastEnd) + eol + eol + xml + s.slice(lastEnd);
    // BoundingBox = union with the new boxes
    const bm = s.match(/(\t*)<BoundingBox>([\s\S]*?)<\/BoundingBox>/);
    if (bm) {
      const p = vec(bm[2], 'Position'), e = vec(bm[2], 'Extents');
      const lo = p.map((v, k) => v - e[k]), hi = p.map((v, k) => v + e[k]);
      for (const b of add) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b.p[k] - b.e[k]); hi[k] = Math.max(hi[k], b.p[k] + b.e[k]); }
      const nb = boxXml('BoundingBox', 'BoundingBox', lo.map((v, k) => (v + hi[k]) / 2), lo.map((v, k) => (hi[k] - v) / 2)).join(eol);
      s = s.replace(/\t*<BoundingBox>[\s\S]*?<\/BoundingBox>/, nb);
    }
    fs.writeFileSync(A.ifo, s);
    const B = analyse(rel);
    console.log(`${(100 * A.frac).toFixed(0).padStart(3)}% -> ${(100 * B.frac).toFixed(0).padStart(3)}%  +${add.length}  top ${A.top.toFixed(2)} -> ${B.top.toFixed(2)}  ${rel}`);
  }
}
if (mode === 'one') for (const rel of process.argv.slice(3)) { const A = analyse(rel); if (A) console.log(`${(100 * A.frac).toFixed(0).padStart(3)}% ${A.unc.toFixed(1).padStart(6)}m² top ${A.top.toFixed(2)} ${rel}`); }

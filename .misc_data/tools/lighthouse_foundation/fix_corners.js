// Spots 1+2: move the back-corner sea wall + corner pillar out to the terrace corner (x ±3.84, z -0.40)
// and close the corner above the terrace with a front-facing quad. Mesh local = world + (0, 0.5, 0.4).
// node fix_corners.js <stufe04/rdm dir> <outDir>
const E = require('./rdmedit.js');
const [src, out] = process.argv.slice(2);
const W2L = w => [w[0], w[1] + 0.5, w[2] + 0.4], L2W = l => [l[0], l[1] - 0.5, l[2] - 0.4];
const near = (a, b, e = 0.02) => a.every((x, k) => Math.abs(x - b[k]) < e);

function moveVerts(M, list) {
  for (const [i, expect, to] of list) {
    const w = L2W(E.P(M.verts[i]));
    if (!near(w, expect)) throw new Error(`vertex ${i} at ${w} expected ${expect}`);
    E.setP(M.verts[i], W2L(to));
  }
}

// ---- walk mesh: sea wall corners
const walk = E.load(src + '/lighthouse_lod1_walk.rdm');
moveVerts(walk, [
  [164, [3.520, 0.828, -0.333], [3.84, 0.828, -0.40]],
  [165, [3.717, -2.586, -0.353], [3.84, -2.586, -0.40]],
  [178, [-3.721, -2.586, -0.396], [-3.84, -2.586, -0.40]],
  [179, [-3.533, 0.829, -0.403], [-3.84, 0.829, -0.40]],
]);
// closing quads, mapped like the terrace front face of the same side (same +z plane orientation)
function triVerts(M, t) { return [0, 1, 2].map(k => M.idx[t * 3 + k]); }
function affineUV(M, t) { // uv = A*[x,y,1] fitted on triangle t (world x,y)
  const vs = triVerts(M, t).map(i => ({ w: L2W(E.P(M.verts[i])), uv: E.UV(M.verts[i]) }));
  const [a, b, c] = vs; const det = (b.w[0] - a.w[0]) * (c.w[1] - a.w[1]) - (c.w[0] - a.w[0]) * (b.w[1] - a.w[1]);
  const coef = k => { const du1 = b.uv[k] - a.uv[k], du2 = c.uv[k] - a.uv[k];
    const gx = (du1 * (c.w[1] - a.w[1]) - du2 * (b.w[1] - a.w[1])) / det, gy = (du2 * (b.w[0] - a.w[0]) - du1 * (c.w[0] - a.w[0])) / det;
    return (x, y) => a.uv[k] + gx * (x - a.w[0]) + gy * (y - a.w[1]); };
  const U = coef(0), V = coef(1); return { f: (x, y) => [U(x, y), V(x, y)], tmpl: vs, idx: triVerts(M, t) };
}
function addQuad(M, refTri, x0, x1, y0, y1, z) {
  const map = affineUV(M, refTri);
  const n = E.triN(...map.tmpl.map(v => v.w)); if (n[2] < 0.99) throw new Error('ref tri not +z ' + n);
  const base = M.verts.length, tmpl = M.verts[map.idx[0]];
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  for (const [x, y] of pts) { const v = Buffer.from(tmpl); E.setP(v, W2L([x, y, z])); E.setUV(v, map.f(x, y - 0.5)); M.verts.push(v); }
  const lo = Math.min(x0, x1) === x0; // keep +z winding
  const q = lo ? [0, 1, 2, 2, 3, 0] : [0, 2, 1, 2, 0, 3];
  M.idx.push(...q.map(k => base + k));
  const t = M.idx.length / 3 - 2; for (const tt of [t, t + 1]) { const nn = E.triN(...triVerts(M, tt).map(i => L2W(E.P(M.verts[i])))); if (nn[2] < 0.99) throw new Error('quad winding ' + nn); }
}
addQuad(walk, 74, 3.50, 3.84, 0.343, 0.839, -0.40);   // +x corner, terrace front face 74 (x 1.92..3.84)
addQuad(walk, 64, -3.84, -3.50, 0.343, 0.839, -0.40); // -x corner, terrace front face 64 (x -3.84..-2.66)
E.save(walk, out + '/lighthouse_lod1_walk.rdm');

// ---- prop walk mesh: corner pillar + cornice outer corner
const pw = E.load(src + '/lighthouse_prop_walk_lod0.rdm');
moveVerts(pw, [
  [154, [3.627, 0.839, -0.374], [3.84, 0.839, -0.40]],
  [172, [3.627, 0.839, -0.374], [3.84, 0.839, -0.40]],
  [178, [3.627, 0.839, -0.374], [3.84, 0.839, -0.40]],
  [155, [3.813, -2.584, -0.410], [3.84, -2.584, -0.40]],
  [266, [-3.631, 0.839, -0.374], [-3.84, 0.839, -0.40]],
  [270, [-3.631, 0.839, -0.374], [-3.84, 0.839, -0.40]],
  [276, [-3.814, -2.584, -0.339], [-3.84, -2.584, -0.40]],
]);
E.save(pw, out + '/lighthouse_prop_walk_lod0.rdm');

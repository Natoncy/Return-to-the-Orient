// Spots 3+4: widen the two end stair pieces so their outer side meets the deck-opening / landing edge.
// Works in the stage frame: lateral axis = stair row direction (toward world -x), along = up/down the stair.
// node fix_stairs.js <stairs rdm dir> <outDir>
const E = require('./rdmedit.js'), X = require('./stairxf.js');
const [src, out] = process.argv.slice(2);
const files = { var1: 'stairs_1_var1', mirror: 'n_venetian_footbridge_stairs_1_var1_mirror' };
const lerpLine = (a, b) => al => a[1] + (al - a[0]) * (b[1] - a[1]) / (b[0] - a[0]); // points [along, lat]
// +x end (instance -0.24, 2.8): walk landing edge (0.25,2.39)->(0,3.44)
const pxT = lerpLine([-2.245, -0.857], [-3.324, -0.886]);
// -x end (instance -1.73, 2.4): deck opening edge (-2.37,1.73)->(-2.53,2.08), then landing side wall (-2.53,2.08)->(-2.66,3.44)
const nxA = lerpLine([-2.282, 1.843], [-2.662, 1.909]), nxB = lerpLine([-2.662, 1.909], [-4.009, 1.684]);
const nxT = al => al > -2.662 ? nxA(al) : nxB(al);
const jobs = [
  { tag: 'px', inst: [-0.24, 2.8], sel: { var1: [-0.76, -0.735], mirror: [-0.875, -0.865] }, T: pxT },
  { tag: 'nx', inst: [-1.73, 2.4], sel: { var1: [1.445, 1.465], mirror: [1.325, 1.335] }, T: nxT },
];
for (const j of jobs) for (const mdl in files) {
  const M = E.load(`${src}/${files[mdl]}_lod0.rdm`);
  const [lo, hi] = j.sel[mdl]; let n = 0, dmin = 9, dmax = -9;
  // tris 66-71 are tiny loose triangles next to the side plane; moving their shared vertex flips them
  const keep = new Set(); for (let t = 66; t <= 71; t++) for (let k = 0; k < 3; k++) keep.add(M.idx[t * 3 + k]);
  for (const [vi, v] of M.verts.entries()) {
    if (keep.has(vi)) continue;
    const w = X.toWorld(j.inst, mdl, E.P(v)), la = X.lat(w);
    if (la < lo || la > hi) continue;
    const a = X.al(w), t = j.T(a); dmin = Math.min(dmin, t - la); dmax = Math.max(dmax, t - la);
    E.setP(v, X.toLocal(j.inst, mdl, X.fromLA(t, w[1], a))); n++;
  }
  console.log(j.tag, mdl, 'moved', n, 'shift', dmin.toFixed(3), '..', dmax.toFixed(3));
  E.save(M, `${out}/${files[mdl]}_${j.tag}_lod0.rdm`);
}

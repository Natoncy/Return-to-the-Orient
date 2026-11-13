// Scores detect.js against the hand-made masks already wired in the mod (pairs of diffuse + cNightGlowMap).
// usage: node calibrate.js <modRoot> <workDir> [grid]   -> per-texture precision/recall, then a parameter grid search
const fs = require('fs'), path = require('path');
const L = require('./lib.js'), D = require('./detect.js');
const [modRoot, workDir, grid] = process.argv.slice(2);
const survey = JSON.parse(fs.readFileSync(path.join(workDir, '..', 'survey.json'), 'utf8'));
const pairs = new Map();
for (const s of survey) if (s.used && s.lit) for (const m of L.cfgModels(path.join(modRoot, s.cfg))) for (const mt of m.mats)
  if (mt.ng === '1' && mt.map && mt.diff && /\.png$/i.test(mt.map) && !/ground/.test(mt.diff)) pairs.set(mt.diff, mt.map);
const sets = [];
for (const [diff, map] of pairs) {
  const ml = L.ddsLevels(modRoot, map); if (!ml.length) continue;
  const pr = D.prepare(modRoot, workDir, diff); if (!pr || !pr.tris) continue;
  const ref = L.ddsToPng(ml[0], path.join(workDir, 'cache')); if (ref.w !== pr.W || ref.h !== pr.H) continue;
  const truth = new Uint8Array(pr.N); for (let i = 0; i < pr.N; i++) truth[i] = Math.max(ref.px[i * ref.ch], ref.px[i * ref.ch + 1], ref.px[i * ref.ch + 2]) > 127 ? 1 : 0;
  sets.push({ pr, truth });
}
function score(P, verbose) {
  let TP = 0, FP = 0, FN = 0;
  for (const { pr, truth } of sets) {
    const res = D.detect(pr, P), g = new Uint8Array(pr.N);
    for (const c of res.keep) for (const j of c.px) g[j] = 1;
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < pr.N; i++) if (!pr.used[i]) continue; else if (g[i] && truth[i]) tp++; else if (g[i]) fp++; else if (truth[i]) fn++;
    TP += tp; FP += fp; FN += fn;
    if (verbose) console.log(pr.key.padEnd(80), `P ${(100 * tp / (tp + fp || 1)).toFixed(0)}% R ${(100 * tp / (tp + fn || 1)).toFixed(0)}% blobs ${res.keep.length}`);
  }
  return { p: TP / (TP + FP || 1), r: TP / (TP + FN || 1) };
}
const base = score(D.DEF, true); console.log('default', base);
if (grid) {
  const out = [];
  for (const dark of [0.15, 0.2, 0.25, 0.3]) for (const rel of [0.4, 0.5, 0.6]) for (const minA of [30, 60, 120]) for (const ring of [1.6, 2.0, 2.5]) for (const fill of [0.1, 0.2, 0.3]) {
    const P = { ...D.DEF, dark, rel, minA, ring, fill }, r = score(P); out.push({ ...r, f: 2 * r.p * r.r / (r.p + r.r || 1), dark, rel, minA, ring, fill });
  }
  out.sort((a, b) => b.f - a.f); for (const o of out.slice(0, 12)) console.log(JSON.stringify(o));
}

// Builds night-glow masks from masks.json and wires them into every cfg material that uses the diffuse without one.
// usage: node build.js <modRoot> <workDir> [--apply]
//   masks.json entries, keyed by the diffuse path as written in the cfgs:
//     { "reuse": "<existing mask path as cfg path>" }                 -> wire only
//     { "keep": [[x0,y0,x1,y1], ...], "groups": false, ...params }   -> detect.js blobs whose centre lies in a rect (0..1 uv)
//     { "same": "<other diffuse key>" }                               -> same rects as another texture with the same layout
//   writes <diff minus _diff>_mask_<lod>.dds next to the diffuse (BC1, full mips, one file per diffuse LOD file)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const L = require('./lib.js'), D = require('./detect.js');
const [modRoot, workDir, flag] = process.argv.slice(2), apply = flag === '--apply';
const conf = JSON.parse(fs.readFileSync(path.join(__dirname, 'masks.json'), 'utf8'));
const survey = JSON.parse(fs.readFileSync(path.join(workDir, '..', 'survey.json'), 'utf8')).filter(s => s.used);
const norm = s => (s || '').replace(/\\/g, '/').toLowerCase();
const maskName = L.maskName;
const outDir = path.join(workDir, 'build'); fs.mkdirSync(outDir, { recursive: true });
const wire = {};
for (const [tex, e0] of Object.entries(conf)) {
  if (tex.startsWith('//')) continue;
  const e = e0.same ? { ...conf[e0.same], ...e0 } : e0;
  if (e.skip) continue;
  if (e.reuse) { wire[norm(tex)] = e.reuse; continue; }
  const pr = D.prepare(modRoot, workDir, tex); if (!pr) { console.log('NO DDS', tex); continue; }
  const res = D.detect(pr, { ...D.DEF, ...(e.params || {}) });
  const inAny = (c, rects) => { const cx = (c.x0 + c.x1 + 1) / 2 / pr.W, cy = (c.y0 + c.y1 + 1) / 2 / pr.H; return (rects || []).some(([a, b, c2, d]) => cx >= a && cx <= c2 && cy >= b && cy <= d); };
  res.keep = res.keep.filter(c => inAny(c, e.keep) && !inAny(c, e.drop));
  const mask = D.render(pr, res, workDir, !!e.groups);
  const mtex = maskName(tex), base = path.basename(mtex, '.png'), dir = path.dirname(path.join(modRoot, mtex));
  const lv = L.ddsLevels(modRoot, tex), files = [];
  for (let i = 0; i < lv.length; i++) { // box-downsample level 0 for each diffuse LOD file
    const f = 1 << i, w = Math.max(1, pr.W >> i), h = Math.max(1, pr.H >> i), o = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let ch = 0; ch < 3; ch++) {
      let a = 0; for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) a += mask[((y * f + yy) * pr.W + x * f + xx) * 3 + ch];
      o[(y * w + x) * 3 + ch] = Math.round(a / f / f);
    }
    const png = path.join(outDir, `${base}_${i}.png`); L.encode(png, w, h, 3, o); files.push(png);
  }
  const glow = res.keep.reduce((a, c) => a + c.px.length, 0);
  console.log(`${mtex}  blobs ${res.keep.length}  glow ${(100 * glow / pr.N).toFixed(2)}%  lods ${lv.length}`);
  if (apply) {
    for (const i in files) { const dst = path.join(dir, `${base}_${i}.dds`); if (fs.existsSync(dst)) console.log('  overwrite', dst); }
    cp.execFileSync(L.TEXCONV, ['-nologo', '-y', '-f', 'BC1_UNORM', '-m', '0', '-o', dir, ...files], { stdio: 'pipe' });
  }
  wire[norm(tex)] = mtex;
}
// cfg wiring: only materials that have no night-glow map yet
let nCfg = 0, nMat = 0;
for (const s of survey) {
  if (!s.cfg.startsWith('data/')) continue; // shared submods belong to other authors
  const file = path.join(modRoot, s.cfg), { out, n } = L.wireCfgText(fs.readFileSync(file, 'utf8'), wire, false);
  if (n) { nCfg++; nMat += n; console.log(`  ${s.cfg}: ${n} material(s)`); if (apply) fs.writeFileSync(file, out); }
}
console.log(`${apply ? 'wired' : 'would wire'} ${nMat} materials in ${nCfg} cfgs`);

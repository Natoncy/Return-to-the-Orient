// Survey: which in-scope top-level cfgs have MODELs that need a Y/tilt bake, where their meshes live,
// whether the meshes are skinned, and how often each mesh is used with which parameters.
const fs = require('fs');
const path = require('path');
const C = require('./common');
const { readStruct } = require(path.join(C.MOD, '.misc_data/tools/rdm_compact/rdmio.js'));

const cfgs = C.walk(C.MOD, [], (n) => n.toLowerCase().endsWith('.cfg'));
const subCfgs = new Set();
const uses = new Map(); // mesh norm path -> [{cfg, key}]
const parsed = new Map();
for (const f of cfgs) {
  const src = fs.readFileSync(f, 'latin1');
  for (const m of src.matchAll(/<FileName>([^<]+\.cfg)<\/FileName>/gi)) subCfgs.add(C.norm(m[1]));
  const tree = C.parse(src);
  parsed.set(f, tree);
  C.each(tree, (n) => {
    if (n.v.ConfigType !== 'MODEL' || !n.v.FileName) return;
    const p = C.bakeParams(n);
    const key = p ? `y${p.y}|s${p.s}|${p.tilt ? [p.q.x, p.q.y, p.q.z, p.q.w].join(',') : 'yaw'}` : 'none';
    const k = C.norm(n.v.FileName);
    if (!uses.has(k)) uses.set(k, []);
    uses.get(k).push({ cfg: C.rel(f), key, scope: C.inScope(C.rel(f)) });
  });
}

let nCfg = 0, nModel = 0, skinned = [], missing = [], vanilla = new Set(), modm = new Set(), shared = [];
const perCfg = [];
for (const f of cfgs) {
  const r = C.rel(f);
  if (!C.inScope(r) || subCfgs.has(r.toLowerCase())) continue;
  const tree = parsed.get(f);
  let need = 0;
  C.each(tree, (n) => {
    if (n.v.ConfigType !== 'MODEL' || !n.v.FileName) return;
    const p = C.bakeParams(n);
    if (!p) return;
    need++; nModel++;
    const res = C.resolve(n.v.FileName);
    if (!res) { missing.push(`${r}: ${n.v.FileName}`); return; }
    (res.where === 'mod' ? modm : vanilla).add(C.norm(n.v.FileName));
    try {
      const s = readStruct(res.file);
      if (s.hdr[10 - 0] || s.b.readUInt32LE(40)) skinned.push(`${r}: ${n.v.FileName}`);
    } catch (e) { missing.push(`${r}: ${n.v.FileName} (${e.message})`); }
  });
  if (need) { nCfg++; perCfg.push(`${String(need).padStart(3)} ${r}`); }
}
for (const [k, list] of uses) {
  const keys = new Set(list.filter((u) => u.key !== 'none' && u.scope).map((u) => u.key));
  if (!keys.size) continue;
  const other = list.filter((u) => u.key === 'none' || !u.scope).length;
  if (keys.size > 1 || other) shared.push(`${k}: ${keys.size} bake variants, ${other} other uses`);
}
console.log(perCfg.join('\n'));
console.log(`\n${nCfg} cfgs, ${nModel} models to bake; meshes: ${modm.size} mod, ${vanilla.size} vanilla`);
console.log(`sub-cfgs (FILE children) skipped: ${[...subCfgs].filter((s) => C.inScope(s)).length}`);
console.log('\nskinned:', skinned.length); skinned.slice(0, 20).forEach((l) => console.log('  ' + l));
console.log('\nmissing:', missing.length); missing.slice(0, 20).forEach((l) => console.log('  ' + l));
console.log('\nmeshes needing copies:', shared.length); shared.slice(0, 40).forEach((l) => console.log('  ' + l));

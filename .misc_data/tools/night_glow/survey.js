// Lists every building cfg and whether its materials carry a night-glow mask.
// usage: node survey.js <modRoot>  -> JSON array on stdout
const fs = require('fs'), path = require('path');
const root = process.argv[2] || '.';
function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === '.misc_data') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const all = walk(root, []);
const norm = p => p.split(path.sep).join('/');
// cfg references from asset xml and other cfgs/ifos (any submod)
const refs = new Set();
for (const p of all) if (/\.(xml|include|cfg)$/i.test(p)) {
  const t = fs.readFileSync(p, 'utf8');
  for (const m of t.matchAll(/data\/graphics\/[^<>"\s]+?\.cfg/gi)) refs.add(m[0].toLowerCase());
}
const res = [];
for (const p of all) {
  const rel = norm(path.relative(root, p));
  if (!/\.cfg$/i.test(rel) || !/data\/graphics\/(buildings|1404_import\/buildings)\//.test(rel)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const mats = [...t.matchAll(/<Config>\s*<ConfigType>MATERIAL<\/ConfigType>[\s\S]*?<\/Config>/g)].map(m => {
    const b = m[0], g = k => (b.match(new RegExp('<' + k + '>([^<]*)</' + k + '>')) || [])[1];
    return { name: g('Name'), diff: g('cModelDiffTex'), ng: g('NIGHT_GLOW_ENABLED'), map: g('cNightGlowMap'), shader: g('ShaderID') };
  });
  const lit = mats.filter(m => m.ng === '1' && m.map);
  const sub = rel.split('/').slice(0, 1)[0];
  res.push({ cfg: rel, used: refs.has(rel.replace(/^[^/]+\/(?=data\/)/, '').toLowerCase()) || refs.has(rel.toLowerCase()),
    mats: mats.length, lit: lit.length, litMaps: [...new Set(lit.map(m => m.map))],
    unlitDiffs: [...new Set(mats.filter(m => !(m.ng === '1' && m.map)).map(m => m.diff))] });
}
console.log(JSON.stringify(res, null, 1));

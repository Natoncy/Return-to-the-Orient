// Lists mod building assets by night-glow state: new (lit now, not at HEAD), more (lit at HEAD, more materials lit now),
// old (already lit), none. Names from texts_german.xml. Follows FILE sub-cfgs; vanilla cfgs are read from the D: tree.
// usage: node buildings.js <modRoot> [vanillaRoot]  -> markdown on stdout
const fs = require('fs'), path = require('path'), cp = require('child_process');
const L = require('./lib.js');
const [modRoot, vanRoot = 'D:/anno_data/1800'] = process.argv.slice(2);
function walk(d, out) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; }
const de = {};
for (const m of fs.readFileSync(path.join(modRoot, 'data/config/gui/texts_german.xml'), 'utf8').matchAll(/<GUID>(\d+)<\/GUID>\s*(?:<!--[\s\S]*?-->\s*)?<Text>([^<]*)<\/Text>/g)) de[m[1]] = m[2];
const assets = {};
const assetDir = path.join(modRoot, 'data/config/export/main/asset');
for (const f of walk(assetDir, []).filter(f => f.endsWith('.xml'))) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/<Asset>([\s\S]*?)<\/Asset>/g)) {
    const b = m[1], g = (b.match(/<Standard>[\s\S]*?<GUID>(\d+)<\/GUID>/) || [])[1]; if (!g) continue;
    assets[g] = { guid: g, name: (b.match(/<Name>([^<]*)<\/Name>/) || [])[1], template: (b.match(/<Template>([^<]*)<\/Template>/) || [])[1],
      base: (b.match(/<BaseAssetGUID>(\d+)<\/BaseAssetGUID>/) || [])[1],
      cfgs: [...new Set([...b.matchAll(/<Filename>([^<]*\.cfg)<\/Filename>/gi)].map(x => x[1].replace(/\\/g, '/')))],
      file: path.relative(assetDir, f).replace(/\\/g, '/') };
  }
}
const read = (rel, head) => {
  if (head) { try { return cp.execFileSync('git', ['show', 'HEAD:' + rel], { cwd: modRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }); } catch { /* new or vanilla */ } }
  for (const r of [modRoot, vanRoot]) { const p = path.join(r, rel); if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); }
  return null;
};
const memo = {};
function lit(rel, head, seen = new Set()) { // number of lit materials in the cfg tree, null if no file
  const k = head + rel; if (k in memo) return memo[k];
  if (seen.has(rel)) return 0; seen.add(rel);
  const t = read(rel, head); if (t === null) return (memo[k] = null);
  let n = [...t.matchAll(/<Config>\s*<ConfigType>MATERIAL<\/ConfigType>[\s\S]*?<\/Config>/g)].filter(m => /<NIGHT_GLOW_ENABLED>1</.test(m[0]) && /<cNightGlowMap>[^<]+</.test(m[0])).length;
  for (const m of t.matchAll(/<ConfigType>FILE<\/ConfigType>[\s\S]*?<FileName>([^<]*\.cfg)<\/FileName>/g)) n += lit(m[1].replace(/\\/g, '/'), head, seen) || 0;
  return (memo[k] = n);
}
const cfgsOf = (a, d = 0) => a.cfgs.length ? a.cfgs : a.base && assets[a.base] && d < 5 ? cfgsOf(assets[a.base], d + 1) : [];
const rows = [];
for (const a of Object.values(assets)) {
  const cfgs = cfgsOf(a).filter(c => /graphics\/(buildings|1404_import\/buildings|\S*\/buildings)\//.test(c) || /data\/dlc\d+\/graphics\/buildings/.test(c));
  if (!cfgs.length) continue;
  let now = 0, then = 0, known = false;
  for (const c of cfgs) { const n = lit(c, false); if (n !== null) { known = true; now += n; then += lit(c, true) || 0; } }
  if (!known) continue;
  const state = now === 0 ? 'none' : then === 0 ? 'new' : now > then ? 'more' : 'old';
  rows.push({ ...a, de: de[a.guid] || '', state, cat: a.file.split('/').slice(1, -1).join('/') || a.file });
}
rows.sort((x, y) => x.cat.localeCompare(y.cat) || (x.de || x.name).localeCompare(y.de || y.name));
const out = s => rows.filter(r => s.includes(r.state)).map(r => `| ${r.de || '—'} | ${r.name} | ${r.guid} | ${r.cat} |`).join('\n');
console.log(`## new\n${out(['new'])}\n\n## more\n${out(['more'])}\n\n## none\n${out(['none'])}\n\ncounts: ${['new', 'more', 'old', 'none'].map(s => s + ' ' + rows.filter(r => r.state === s).length).join(', ')}`);

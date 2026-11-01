// Dangling-path check: every file path named in an XML of this repo's mods (data/... values and
// <Include File>) must exist in an enabled mod's data tree, via a .lnk, or in vanilla (D: tree list).
// Image paths also resolve through <base>_0.dds. Prints missing refs to stdout.
// usage: node check.js <repo> <vanilla_files.txt>
const fs = require('fs'), path = require('path');
const [ROOT, VAN] = process.argv.slice(2);
const vanilla = new Set(fs.readFileSync(VAN, 'latin1').split(/\r?\n/));
const vanDirs = new Set();
for (const k of vanilla) { let d = k; while ((d = path.posix.dirname(d)) !== '.' && !vanDirs.has(d)) vanDirs.add(d); }
// vanilla assets use this editor-only icon too
const HARMLESS = new Set(['test_data/graphics/wwise_icons/soundbank.png']);

// mod roots = folders with modinfo.json + data/; disabled if any path segment starts with '-'
const mods = [];
(function findMods(dir, rel, disabled) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  if (ents.some(e => e.name === 'modinfo.json') && ents.some(e => e.isDirectory() && e.name === 'data'))
    mods.push({ dir, rel: rel || '<main>', disabled });
  for (const e of ents) {
    if (!e.isDirectory() || e.name === 'data' || e.name.startsWith('.')) continue;
    findMods(path.join(dir, e.name), rel ? rel + '/' + e.name : e.name, disabled || e.name.startsWith('-'));
  }
})(ROOT, '', false);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
}
const files = new Map();   // lowercase key -> [mod]
const dirs = new Map();    // lowercase dir -> Set(mod)
const xmls = [];
for (const m of mods) {
  const list = []; walk(path.join(m.dir, 'data'), list);
  for (const abs of list) {
    const key = path.relative(m.dir, abs).replace(/\\/g, '/').toLowerCase();
    if (!files.has(key)) files.set(key, []);
    files.get(key).push(m);
    let d = key; while ((d = path.posix.dirname(d)) !== '.') { if (!dirs.has(d)) dirs.set(d, new Set()); dirs.get(d).add(m); }
    // data/sound/**.xml = Wwise soundbank info (authoring paths), never read by the game
    if (key.endsWith('.xml') && !key.startsWith('data/sound/')) xmls.push({ mod: m, abs, key, file: path.relative(ROOT, abs).replace(/\\/g, '/') });
  }
}
const exists = k => vanilla.has(k) || (files.get(k) || []).some(m => !m.disabled);
const dirExists = k => vanDirs.has(k) || [...(dirs.get(k) || [])].some(m => !m.disabled);
function resolves(k) {
  const ext = path.posix.extname(k);
  if (['.png', '.psd', '.tga', '.dds', '.jpg'].includes(ext) && exists(k.slice(0, -ext.length) + '_0.dds')) return true;
  return exists(k) || exists(k + '.lnk') || dirExists(k);
}

// whole path up to the next delimiter; extension-less ones are folder refs
const PATHRE = /(?<![\w.])data[\\/][^"'<>\s|*?:\x00-\x1f]+/gi;
const LOOSERE = />\s*([^<>"\s/]+(?:\/[^<>"\s/]+)+\.(?:cfg|rdm|dds|png|fc|a7m|a7t|a7tinfo|rdp|prp|ifo|bnk|xml|psd|tga))\s*</gi;
const refs = [];
for (const x of xmls) {
  // blank out comments but keep line numbers
  const txt = fs.readFileSync(x.abs, 'utf8').replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  const lines = txt.split('\n');
  const lineOf = i => txt.slice(0, i).split('\n').length;
  const condOf = line => {
    for (let i = line - 1; i >= 0; i--) {
      const m = /<ModOp\b[^>]*/.exec(lines[i]);
      if (m) { const c = /Condition="([^"]+)"/.exec(m[0]); return c ? c[1] : ''; }
    }
    return '';
  };
  const add = (ref, k, i, kind) => {
    k = path.posix.normalize(k.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase());
    const line = lineOf(i);
    refs.push({ x, line, ref, key: k, kind, cond: condOf(line) });
  };
  for (const m of txt.matchAll(/<Include\s+File="([^"]+)"/g)) {
    const f = m[1];
    add(f, f.startsWith('/') ? f.slice(1) : path.posix.join(path.posix.dirname(x.key), f), m.index, 'include');
  }
  for (const m of txt.matchAll(PATHRE)) add(m[0], m[0].replace(/[.,;)\]]+$/, ''), m.index, 'path');
  for (const m of txt.matchAll(LOOSERE)) if (!/^data[\\/]/i.test(m[1])) add(m[1], m[1], m.index, 'path');
}

// which XMLs does the game load? roots = enabled XMLs patching a vanilla file (incl. assets.xml), then Includes
const loaded = new Set();
const q = [];
for (const x of xmls) if (!x.mod.disabled && (vanilla.has(x.key) || vanilla.has(x.key.slice(0, -4)))) { loaded.add(x); q.push(x); }
const xmlByModKey = new Map(xmls.map(x => [x.mod.rel + '|' + x.key, x]));
while (q.length) {
  const x = q.shift();
  for (const r of refs) {
    if (r.kind !== 'include' || r.x !== x) continue;
    const t = xmlByModKey.get(x.mod.rel + '|' + r.key) || xmls.find(y => !y.mod.disabled && y.key === r.key);
    if (t && !loaded.has(t)) { loaded.add(t); q.push(t); }
  }
}

// same basename elsewhere = likely move target
const byBase = new Map();
const baseOf = k => path.posix.basename(k).replace(/(_\d)?\.[a-z0-9]+$/, '');
const addBase = (k, where) => { const b = baseOf(k); if (!byBase.has(b)) byBase.set(b, new Set()); byBase.get(b).add(where + ': ' + k); };
for (const [k, ms] of files) for (const m of ms) addBase(k, m.rel);
for (const k of vanilla) if (k) addBase(k, 'vanilla');

const bad = refs.filter(r => !HARMLESS.has(r.key) && !resolves(r.key));
const live = bad.filter(r => loaded.has(r.x)), dead = bad.filter(r => !loaded.has(r.x));
console.log(`${mods.length} mods (${mods.filter(m => m.disabled).length} disabled), ${xmls.length} XML files (${loaded.size} loaded), ${refs.length} path refs, ${bad.length} unresolved`);
function print(title, list) {
  console.log(`\n## ${title}: ${list.length}`);
  const byKey = new Map();
  for (const r of list) { if (!byKey.has(r.key)) byKey.set(r.key, []); byKey.get(r.key).push(r); }
  for (const [k, rs] of [...byKey].sort()) {
    console.log(`\n${k}`);
    for (const r of rs) console.log(`  ${r.x.file}:${r.line}${r.cond ? '  [' + r.cond + ']' : ''}`);
    for (const s of [...(byBase.get(baseOf(k)) || [])].slice(0, 4)) console.log(`  similar  ${s}`);
  }
}
print('Unresolved in loaded XML', live);
print('Unresolved in XML the game never loads (disabled mod / not included)', dead);

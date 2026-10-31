// Reachability scan: which files under <repo>/data are never loaded by the game.
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2], SCR = process.argv[3];
const vanilla = new Set(fs.readFileSync(path.join(SCR, 'vanilla_files.txt'), 'latin1').split(/\r?\n/));

// mods = repo root + every folder below it with modinfo.json + data/ (shared mods sit in shared_*/<mod>)
const mods = [{ name: '<main>', dir: ROOT }];
(function findMods(dir, rel) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('.') || d.name === 'data') continue;
    const sub = path.join(dir, d.name), name = rel ? rel + '/' + d.name : d.name;
    if (fs.existsSync(path.join(sub, 'data')) && fs.existsSync(path.join(sub, 'modinfo.json'))) mods.push({ name, dir: sub });
    findMods(sub, name);
  }
})(ROOT, '');
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
}
const files = new Map();      // key -> [abs paths]
const keyOf = new Map();      // abs -> key
const modOf = new Map();
for (const m of mods) {
  const list = []; walk(path.join(m.dir, 'data'), list);
  for (const abs of list) {
    const key = path.relative(m.dir, abs).replace(/\\/g, '/').toLowerCase();
    if (!files.has(key)) files.set(key, []);
    files.get(key).push(abs); keyOf.set(abs, key); modOf.set(abs, m);
  }
}
const keys = [...files.keys()];
// index for prefix / sibling lookups
const byDir = new Map();
for (const k of keys) { const d = path.posix.dirname(k); if (!byDir.has(d)) byDir.set(d, []); byDir.get(d).push(k); }

const used = new Map();       // key -> reason
const queue = [];
function mark(k, why) { if (!files.has(k) || used.has(k)) return; used.set(k, why); queue.push(k); }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const islandsDone = new Set();

function resolve(ref, from) {
  let k = ref.replace(/\\/g, '/').toLowerCase().replace(/^\/+/, '').replace(/\/+/g, '/');
  k = path.posix.normalize(k);
  const why = 'ref by ' + from;
  mark(k, why);
  const ext = path.posix.extname(k), base = k.slice(0, k.length - ext.length), dir = path.posix.dirname(k);
  const sib = byDir.get(dir) || [];
  const tex = base.replace(/_\d$/, '');
  if (['.psd', '.png', '.tga', '.dds', '.jpg'].includes(ext)) {
    const re = new RegExp('^' + esc(tex) + '(_\\d+)?\\.(dds|png)$');
    for (const s of sib) if (re.test(s)) mark(s, why + ' (tex lod)');
  }
  if (ext === '.rdm' && /_lod\d+$/.test(base)) {
    const re = new RegExp('^' + esc(base.replace(/_lod\d+$/, '')) + '_lod\\d+\\.rdm$');
    for (const s of sib) if (re.test(s)) mark(s, why + ' (mesh lod)');
  }
  if (ext === '.cfg') for (const e of ['.ifo', '.fc', '.bfg']) mark(base + e, why + ' (cfg companion)');
  if (ext === '.prp') { mark(base + '.brp', why + ' (prp companion)'); mark(base + '.ifo', why + ' (prp companion)'); }
  if (ext === '.a7m' && !islandsDone.has(k)) {
    islandsDone.add(k);
    for (const s of keys) if (s.startsWith(dir + '/')) mark(s, why + ' (island folder)');
    // props placed on the island: the shipped .a7m is compressed, its decoded gamedata/rd3d XML lives in .misc_data
    const src = path.join(ROOT, '.misc_data', dir);
    if (fs.existsSync(src)) for (const f of fs.readdirSync(src)) if (f.endsWith('.xml'))
      for (const m of fs.readFileSync(path.join(src, f), 'latin1').matchAll(PATHRE)) resolve(m[0], k + ' (decoded ' + f + ')');
  }
  if (ext === '.a7t') for (const e of ['.a7tinfo', '.a7te']) mark(base + e, why + ' (map companion)');
  if (ext === '.lnk') {}
}

const SKIP = new Set(['.dds', '.rdm', '.png', '.ctt', '.tmc', '.bnk', '.bk2', '.glb', '.obj', '.a7m', '.a7t', '.jpg', '.psd', '.xcf']);
// extension must not be followed by a word char, so icon_workforce_2.5d_envoy.png isn't cut at ".5d"
const PATHRE = /data[\\/][^"<>\s|*?:\x00-\x1f]+?\.[a-z0-9]{1,8}(?![\w-])/gi;
const bankIds = new Set();
function scan(k) {
  for (const abs of files.get(k)) {
    const ext = path.extname(abs).toLowerCase();
    if (SKIP.has(ext)) continue;
    const buf = fs.readFileSync(abs);
    let txt = buf.toString('latin1');
    if (['.xml', '.cfg', '.ifo', '.cf7', '.prp', '.json'].includes(ext)) txt = txt.replace(/<!--[\s\S]*?-->/g, '');
    if (['.a7minfo', '.a7tinfo', '.a7me', '.a7te', '.fc', '.bfg', '.brp'].includes(ext)) txt += '\n' + buf.toString('utf16le');
    for (const m of txt.matchAll(PATHRE)) resolve(m[0], k);
    if (ext === '.lnk') resolve(txt.trim(), k);
    for (const m of txt.matchAll(/<Include\s+File="([^"]+)"/g)) {
      const f = m[1];
      const tgt = f.startsWith('/') ? f.slice(1) : path.posix.join(path.posix.dirname(k), f);
      resolve(tgt, k);
    }
    if (ext === '.xml') for (const m of txt.matchAll(/\b(\d{6,10})\b/g)) bankIds.add(m[1]);
  }
}

// roots
for (const k of keys) {
  const ext = path.posix.extname(k);
  if (ext === '.xml' && vanilla.has(k.slice(0, -4))) mark(k, 'patches vanilla ' + k.slice(0, -4));
  else if (vanilla.has(k)) mark(k, ext === '.xml' ? 'patches vanilla file' : 'overrides vanilla file');
  else if (ext === '.lnk') mark(k, 'lnk');
}
while (queue.length) scan(queue.shift());
// sound banks are referenced by numeric id
for (const k of keys) {
  const m = /\/(\d+)\.bnk$/.exec(k);
  if (m && bankIds.has(m[1])) { mark(k, 'bank id in xml'); }
}
while (queue.length) scan(queue.shift());

// report for main data only
const main = [];
for (const [abs, k] of keyOf) if (modOf.get(abs).name === '<main>') main.push({ k, abs, size: fs.statSync(abs).size });
const unused = main.filter(f => !used.has(f.k));
fs.writeFileSync(path.join(SCR, 'unused.json'), JSON.stringify(unused.map(f => [f.k, f.size])));
fs.writeFileSync(path.join(SCR, 'used.json'), JSON.stringify([...used]));
console.log('main files', main.length, 'unused', unused.length, 'MB', (unused.reduce((a, f) => a + f.size, 0) / 1e6).toFixed(1));

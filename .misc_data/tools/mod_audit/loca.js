// Localization audit for our own mods (main + Natoncy_* + Intetsch_* submods).
const fs = require('fs'), path = require('path');
const SCR = process.argv[2];
const R = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const LANGS = ['english', 'german', 'french', 'italian', 'spanish', 'polish', 'russian', 'japanese', 'korean', 'chinese', 'taiwanese', 'portuguese', 'brazilian'];
const strip = t => t.replace(/<!--[\s\S]*?-->/g, '');
function readTexts(f) {
  const m = new Map(); if (!fs.existsSync(f)) return null;
  for (const x of strip(fs.readFileSync(f, 'utf8')).matchAll(/<Text>\s*<GUID>(\d+)<\/GUID>\s*<Text>([\s\S]*?)<\/Text>\s*<\/Text>/g)) m.set(x[1], x[2]);
  return m;
}
function walk(d, out, stopAtMods) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name.startsWith('-')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (stopAtMods && fs.existsSync(path.join(p, 'modinfo.json'))) continue; walk(p, out, stopAtMods); }
    else if (/\.xml$/i.test(e.name) && !/texts_\w+\.xml$/i.test(e.name) && !/[\\/]data[\\/]sound[\\/]/i.test(p)) out.push(p);
  }
}
const mods = [{ name: 'main', gui: path.join(R, 'data/config/gui'), src: [path.join(R, 'data'), path.join(R, 'Natoncy_orient_after_other_mods'), path.join(R, 'Natoncy_orient_trigger_reset')] }];
for (const g of ['shared_products', 'shared_importdock', 'shared_misc', 'shared_portraits']) for (const e of fs.readdirSync(path.join(R, g))) {
  if (!/^(Natoncy|Intetsch)_/.test(e)) continue;
  const d = path.join(R, g, e); if (!fs.existsSync(path.join(d, 'data'))) continue;
  mods.push({ name: `${g}/${e}`, gui: path.join(d, 'data/config/gui'), src: [path.join(d, 'data')] });
}
const out = [];
const vt = new Map(); for (const x of fs.readFileSync(path.join(R, '.misc_data/_original_texts_english.xml'), 'utf8').matchAll(/<GUID>(\d+)<\/GUID>/g)) vt.set(x[1], 1);
for (const mod of mods) {
  const T = {}; for (const l of LANGS) T[l] = readTexts(path.join(mod.gui, `texts_${l}.xml`));
  const langs = LANGS.filter(l => T[l]);
  if (!T.english) { out.push(`\n# ${mod.name}: no texts_english.xml`); continue; }
  const files = []; for (const s of mod.src) if (fs.existsSync(s)) walk(s, files, true);
  const assets = new Map(); // guid -> {tpl, name, loca, override}
  for (const f of files) {
    const t = strip(fs.readFileSync(f, 'utf8'));
    const re = /<(\/?)Asset>/g; let depth = 0, st = -1, m;
    while ((m = re.exec(t))) {
      if (!m[1]) { if (depth++ === 0) st = m.index; } else if (--depth === 0) {
        const b = t.slice(st, re.lastIndex);
        const g = /<Standard>\s*<GUID>(\d+)<\/GUID>/.exec(b); if (!g) continue;
        const tpl = (/<Template>([^<]+)<\/Template>/.exec(b) || [])[1] || '';
        const nm = (/<Name>([^<]*)<\/Name>/.exec(b) || [])[1] || '';
        const own = b.replace(/<Asset>[\s\S]*?<\/Asset>/g, '');
        assets.set(g[1], { tpl, nm, loca: /<LocaText>/.test(b), override: /<TextOverride>/.test(b), file: path.relative(R, f) });
      }
    }
  }
  const all = new Set(); for (const l of langs) for (const g of T[l].keys()) all.add(g);
  const lines = [];
  for (const l of langs) { const miss = [...all].filter(g => !T[l].has(g)); if (miss.length) lines.push(`missing in ${l}: ${miss.length}: ${miss.slice(0, 30).join(' ')}`); }
  // assets with LocaText but no entry
  const noText = [...assets].filter(([g, a]) => a.loca && !a.override && !T.english.has(g));
  if (noText.length) lines.push(`assets with LocaText but no texts entry: ${noText.length}`, ...noText.map(([g, a]) => `   ${g} ${a.tpl} ${a.nm}  [${a.file}]`));
  // orphans
  const orphan = [...T.english.keys()].filter(g => !assets.has(g));
  if (orphan.length) lines.push(`entries without an asset in this mod: ${orphan.length}: ${orphan.join(' ')}`);
  // identical to English, tokens
  const same = {}, tok = [];
  const toks = s => (s.match(/\[[^\]]+\]/g) || []).sort().join('|');
  for (const l of langs) if (l !== 'english') for (const [g, s] of T[l]) {
    const e = T.english.get(g); if (e === undefined) continue;
    if (s.trim() === e.trim() && /[a-z]{4}/.test(e) && e.length > 12) (same[l] = same[l] || []).push(g);
    if (toks(s) !== toks(e)) tok.push(`${l} ${g}: en {${toks(e)}} vs {${toks(s)}}`);
    const ob = (s.match(/&lt;b&gt;/g) || []).length, cb = (s.match(/&lt;\/b&gt;/g) || []).length; if (ob !== cb) tok.push(`${l} ${g}: <b> ${ob} vs </b> ${cb}`);
    if (!s.trim()) tok.push(`${l} ${g}: empty`);
  }
  for (const [l, gs] of Object.entries(same)) lines.push(`same as English in ${l}: ${gs.length}: ${gs.slice(0, 40).join(' ')}`);
  if (tok.length) lines.push(`token problems: ${tok.length}`, ...tok.slice(0, 60).map(x => '   ' + x));
  if (lines.length) out.push(`\n# ${mod.name} (${langs.length} languages, ${T.english.size} entries, ${assets.size} assets)`, ...lines);
}
fs.writeFileSync(path.join(SCR, 'loca.txt'), out.join('\n'));
console.log(out.join('\n'));

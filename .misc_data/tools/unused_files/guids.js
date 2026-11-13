// Assets defined by the main mod whose GUID is never referenced by any other shipped text.
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2], SCR = process.argv[3];
const used = new Map(JSON.parse(fs.readFileSync(path.join(SCR, 'used.json'))));
const TXT = new Set(['.xml', '.cfg', '.ifo', '.cf7', '.lua', '.fc', '.json']);
const list = [];
(function w(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) w(p); else if (TXT.has(path.extname(e.name).toLowerCase())) list.push(p);
  }
})(ROOT);
const defs = new Map();   // guid -> {template, name, file}
const refs = new Map();   // guid -> count of non-definition mentions
const refFiles = new Map();
for (const abs of list) {
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  const k = rel.toLowerCase();
  if (k.startsWith('data/') && !used.has(k)) continue;           // file the game never loads
  if (/texts_[a-z]+\.xml$/.test(k)) continue;                      // LineIds are not usage
  const txt = fs.readFileSync(abs, 'latin1').replace(/<!--[\s\S]*?-->/g, m => m.replace(/\d/g, 'x'));
  const defPos = new Set();
  const isMain = k.startsWith('data/config/');
  for (const m of txt.matchAll(/<Standard>\s*<GUID>(\d+)<\/GUID>/g)) {
    const g = m[1], at = m.index + m[0].indexOf(g);
    defPos.add(at);
    if (!isMain) continue;
    const before = txt.slice(Math.max(0, m.index - 3000), m.index);
    const t = [...before.matchAll(/<Template>([^<]+)<\/Template>/g)].pop();
    const n = /<Name>([^<]*)<\/Name>/.exec(txt.slice(m.index, m.index + 600));
    if (!defs.has(g)) defs.set(g, { template: t ? t[1] : '?', name: n ? n[1] : '', file: rel });
  }
  for (const m of txt.matchAll(/(?<![\d.])(\d{4,10})(?![\d.])/g)) {
    if (defPos.has(m.index)) continue;
    refs.set(m[1], (refs.get(m[1]) || 0) + 1);
    if (!refFiles.has(m[1])) refFiles.set(m[1], rel);
  }
}
// Templates that run or show on their own, not via a GUID reference
const SELF = /^(Trigger|.*Trigger.*|Text|Quest.*|Audio|Sound.*|Infotip.*|ProductFilter.*|.*Notification.*)$/;
const unref = [...defs].filter(([g]) => !refs.has(g));
const by = {};
for (const [g, d] of unref) (by[d.template] = by[d.template] || []).push([g, d]);
const out = [];
for (const [t, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
  out.push(`${v.length} ${t}${SELF.test(t) ? '  (self-starting / UI, usually fine)' : ''}`);
  for (const [g, d] of v) out.push(`    ${g} ${d.name}  [${d.file}]`);
}
fs.writeFileSync(path.join(SCR, 'guids.txt'), out.join('\n'));
console.log('defined', defs.size, 'unreferenced', unref.length);
console.log(out.filter(l => !l.startsWith('    ')).join('\n'));

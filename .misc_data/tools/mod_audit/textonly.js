// References in our loaded source that resolve only to a mod texts_*.xml LineId (no asset, no group, no vanilla text),
// and orphan LineIds (in our texts files, but no asset/group defines that GUID).
const fs = require('fs'), path = require('path');
const SCR = process.argv[2];
const R = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const GT = new Set(fs.readFileSync(path.join(SCR, 'guidtags.txt'), 'utf8').split('\n'));
const S3 = fs.readFileSync(path.join(SCR, 'xt/S3.xml'), 'utf8');
const A = new Set();
for (const m of S3.matchAll(/<(?:Standard|Group)>\s*<GUID>(\d+)<\/GUID>/g)) A.add(m[1]);
const VT = new Set();
for (const m of fs.readFileSync(path.join(R, '.misc_data/_original_texts_english.xml'), 'utf8').matchAll(/<GUID>(\d+)<\/GUID>/g)) VT.add(m[1]);
const files = [];
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name.startsWith('-')) continue; const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (/\.xml$/i.test(e.name) && !/[\\/]data[\\/]sound[\\/]/i.test(p)) files.push(p); } })(R);
const strip = t => t.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
// conditional definitions in source
const C = new Set();
for (const f of files) if (!/texts_\w+\.xml$/i.test(f)) for (const m of strip(fs.readFileSync(f, 'utf8')).matchAll(/<(?:Standard|Group)>\s*<GUID>(\d+)<\/GUID>/g)) C.add(m[1]);
const MT = new Map();
for (const f of files) if (/texts_english\.xml$/i.test(f)) for (const m of strip(fs.readFileSync(f, 'utf8')).matchAll(/<GUID>(\d+)<\/GUID>/g)) MT.set(m[1], path.relative(R, f).split(path.sep).join('/'));
const out = ['## refs that resolve only to a mod text LineId'];
for (const f of files) {
  if (/texts_\w+\.xml$/i.test(f)) continue;
  const t = strip(fs.readFileSync(f, 'utf8'));
  const rel = path.relative(R, f).split(path.sep).join('/');
  for (const m of t.matchAll(/<([A-Za-z_]\w*)>(-?\d+)<\/\1>/g)) {
    const [, tag, v] = m;
    if (A.has(v) || VT.has(v) || C.has(v) || !MT.has(v)) continue;
    if (!GT.has(tag) && !/^1404\d{6}$/.test(v)) continue;
    out.push(`${v} <${tag}> ${rel}:${t.slice(0, m.index).split('\n').length}`);
  }
}
out.push('\n## orphan LineIds (texts_english, no asset/group anywhere, not vanilla)');
for (const [g, f] of MT) if (!A.has(g) && !C.has(g) && !VT.has(g)) out.push(`${g} ${f}`);
fs.writeFileSync(path.join(SCR, 'textonly.txt'), out.join('\n'));
console.log(out.join('\n'));

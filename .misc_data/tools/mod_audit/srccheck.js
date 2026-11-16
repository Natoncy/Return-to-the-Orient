// Static pass over the Natoncy source XMLs: numbers in GUID-holding tags (guidtags.txt) or in 1404xxxxxx form
// that no asset/group/text defines (final S3, vanilla texts, any mod source incl. conditional ones).
// Also: GUIDs defined twice across source files, and text LineIds defined twice within one texts file.
const fs = require('fs'), path = require('path');
const SCR = process.argv[2];
const R = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const GT = new Set(fs.readFileSync(path.join(SCR, 'guidtags.txt'), 'utf8').split('\n'));
const S3 = fs.readFileSync(path.join(SCR, 'xt/S3.xml'), 'utf8');
const K = new Set();
for (const m of S3.matchAll(/<(?:Standard|Group)>\s*<GUID>(\d+)<\/GUID>/g)) K.add(m[1]);
for (const m of fs.readFileSync(path.join(R, '.misc_data/_original_texts_english.xml'), 'utf8').matchAll(/<GUID>(\d+)<\/GUID>/g)) K.add(m[1]);
const files = [];
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name.startsWith('-')) continue; const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (/\.xml$/i.test(e.name) && !/[\\/]data[\\/]sound[\\/]/i.test(p)) files.push(p); } })(R);
const strip = t => t.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
const defs = new Map(); // guid -> [file:line]
const texts = [];
const ours = f => { const r = path.relative(R, f).split(path.sep).join('/'); return !r.includes('/') || /^(data|Natoncy_|shared_\w+\/Natoncy_)/.test(r); };
for (const f of files) {
  const t = strip(fs.readFileSync(f, 'utf8'));
  const rel = path.relative(R, f).split(path.sep).join('/');
  if (/texts_\w+\.xml$/i.test(f)) {
    const seen = new Map();
    for (const m of t.matchAll(/<GUID>(\d+)<\/GUID>/g)) { K.add(m[1]); seen.set(m[1], (seen.get(m[1]) || 0) + 1); }
    for (const [g, n] of seen) if (n > 1) texts.push(`${rel}: LineId ${g} x${n}`);
    continue;
  }
  for (const m of t.matchAll(/<(?:Standard|Group)>\s*<GUID>(\d+)<\/GUID>/g)) {
    K.add(m[1]);
    const line = t.slice(0, m.index).split('\n').length;
    if (!defs.has(m[1])) defs.set(m[1], []); defs.get(m[1]).push(`${rel}:${line}`);
  }
}
// ModID-aware: the same GUID in two copies of one mod (nested shared copies) is fine if bodies are equal; just list
const dups = [...defs].filter(([g, l]) => l.length > 1);
const bad = new Map();
for (const f of files) {
  if (/texts_\w+\.xml$/i.test(f) || !ours(f)) continue;
  const t = strip(fs.readFileSync(f, 'utf8'));
  const rel = path.relative(R, f).split(path.sep).join('/');
  for (const m of t.matchAll(/<([A-Za-z_]\w*)>(-?\d+)<\/\1>/g)) {
    const [, tag, v] = m;
    if (K.has(v) || +v < 100) continue;
    if (!GT.has(tag) && !/^1404\d{6}$/.test(v)) continue;
    const line = t.slice(0, m.index).split('\n').length;
    const k = v; if (!bad.has(k)) bad.set(k, []); bad.get(k).push(`${rel}:${line} <${tag}>`);
  }
  // GUIDs inside ModOp GUID="a,b" attributes / Path [GUID='x'] are targets; the loader reports those
}
const out = [`## GUIDs defined more than once in source: ${dups.length}`];
for (const [g, l] of dups) out.push(`${g}: ${l.join(' | ')}`);
out.push(`\n## text LineIds doubled within one texts file: ${texts.length}`, ...texts);
out.push(`\n## numbers in GUID fields of our source XML that nothing defines: ${bad.size}`);
for (const [g, l] of [...bad].sort()) out.push(`${g}: ${l.slice(0, 4).join(' | ')}${l.length > 4 ? ` (+${l.length - 4})` : ''}`);
fs.writeFileSync(path.join(SCR, 'srccheck.txt'), out.join('\n'));
console.log(out.join('\n'));

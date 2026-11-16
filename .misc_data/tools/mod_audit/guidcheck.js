// GUID check on the fully patched assets (xt/S3.xml) vs vanilla.
// usage: node guidcheck.js <scratch>
const fs = require('fs'), path = require('path');
const SCR = process.argv[2];
const R = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const VAN = 'D:/anno_data/1800/data/config/export/main/asset/assets.xml';

function assets(txt) {             // balanced <Asset> blocks -> [{guid, name, body}]
  const out = []; const re = /<(\/?)Asset>/g; let depth = 0, start = -1, m;
  while ((m = re.exec(txt))) {
    if (!m[1]) { if (depth++ === 0) start = m.index; }
    else if (--depth === 0) {
      const body = txt.slice(start, re.lastIndex);
      const g = /<Standard>\s*<GUID>(\d+)<\/GUID>/.exec(body);
      const n = /<Standard>[\s\S]*?<Name>([^<]*)<\/Name>/.exec(body);
      out.push({ guid: g ? g[1] : null, name: n ? n[1] : '', body });
    }
  }
  return out;
}
console.time('load');
const van = assets(fs.readFileSync(VAN, 'utf8'));
const fin = assets(fs.readFileSync(path.join(SCR, 'xt/S3.xml'), 'utf8'));
console.timeEnd('load');
const V = new Map(); for (const a of van) if (a.guid) V.set(a.guid, a);
const D = new Map(); const dup = new Map();
for (const a of fin) if (a.guid) { if (D.has(a.guid)) dup.set(a.guid, (dup.get(a.guid) || 1) + 1); D.set(a.guid, a); }
// all GUIDs defined anywhere in S3 (incl. ones nested under other tags)
const T = new Set();
for (const f of ['.misc_data/_original_texts_english.xml']) for (const m of fs.readFileSync(path.join(R, f), 'utf8').matchAll(/<GUID>(\d+)<\/GUID>/g)) T.add(m[1]);
const modTexts = [];
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name.startsWith('-')) continue; const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (/^texts_english\.xml$/i.test(e.name)) modTexts.push(p); } })(R);
for (const f of modTexts) for (const m of fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').matchAll(/<GUID>(\d+)<\/GUID>/g)) T.add(m[1]);
// group GUIDs in the final file
const S3txt = fs.readFileSync(path.join(SCR, 'xt/S3.xml'), 'utf8');
for (const m of S3txt.matchAll(/<Group>\s*<GUID>(\d+)<\/GUID>/g)) T.add(m[1]);
// GUIDs defined in any mod source file (maybe under a Condition, e.g. New Horizons only)
const C = new Map();
const srcXml = [];
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name.startsWith('-')) continue; const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (/\.xml$/i.test(e.name) && !/texts_\w+\.xml$/i.test(e.name) && !/[\\/]data[\\/]sound[\\/]/i.test(p)) srcXml.push(p); } })(R);
for (const f of srcXml) {
  const t = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of t.matchAll(/<(?:Standard|Group)>\s*<GUID>(\d+)<\/GUID>/g)) if (!C.has(m[1])) C.set(m[1], path.relative(R, f));
}

// tags that hold GUIDs in vanilla
const stat = new Map();
for (const a of van) for (const m of a.body.matchAll(/<([A-Za-z_]\w*)>(-?\d+)<\/\1>/g)) {
  if (m[1] === 'GUID' && /<Standard>\s*$/.test(a.body.slice(Math.max(0, m.index - 40), m.index))) continue;
  const s = stat.get(m[1]) || { n: 0, ok: 0 }; s.n++;
  const v = m[2]; if (+v < 100) { s.n--; stat.set(m[1], s); continue; } if (V.has(v) || T.has(v) || v === '0' || v === '-1') s.ok++;
  stat.set(m[1], s);
}
const GT = new Set([...stat].filter(([t, s]) => s.n >= 5 && s.ok / s.n >= 0.97 && !['Amount', 'Value', 'ID'].includes(t)).map(([t]) => t));
GT.add('GUID'); GT.add('Product'); GT.add('Item'); GT.add('Building'); GT.add('Text'); GT.add('BaseAssetGUID');
fs.writeFileSync(path.join(SCR, 'guidtags.txt'), [...GT].sort().join('\n'));

const known = v => D.has(v) || T.has(v) || v === '0' || v === '-1';
const norm = b => b.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
const changed = fin.filter(a => a.guid && (!V.has(a.guid) || norm(V.get(a.guid).body) !== norm(a.body)));
const isNew = a => !V.has(a.guid);
const bad = [];
for (const a of changed) {
  const seen = new Set();
  const vb = V.has(a.guid) ? V.get(a.guid).body : '';
  for (const m of a.body.matchAll(/<([A-Za-z_]\w*)>(-?\d+)<\/\1>/g)) {
    const [, tag, v] = m;
    if (tag === 'GUID' && /<Standard>\s*$/.test(a.body.slice(Math.max(0, m.index - 40), m.index))) continue;
    if (known(v) || (+v >= 0 && +v < 100 && !GT.has(tag))) continue; if (+v>=0 && +v<100) continue;
    const is1404 = /^14040\d{5}$/.test(v) || /^1404\d{6}$/.test(v);
    if (!GT.has(tag) && !is1404) continue;
    if (vb && vb.includes(m[0])) continue; // already in vanilla
    const k = tag + v; if (seen.has(k)) continue; seen.add(k);
    bad.push(`${a.guid} ${a.name}${isNew(a) ? '' : ' (vanilla, patched)'}: <${tag}>${v}${C.has(v) ? '   [conditional def in ' + C.get(v) + ']' : ''}`);
  }
}
const lines = [];
lines.push(`assets vanilla ${V.size}, final ${D.size}, new ${fin.filter(a => a.guid && !V.has(a.guid)).length}, changed vanilla ${changed.filter(a => V.has(a.guid)).length}`);
lines.push(`\n## duplicate GUIDs in final assets: ${dup.size}`);
for (const [g, n] of dup) lines.push(`${g} x${n} ${D.get(g).name}`);
lines.push(`\n## undefined references in new/changed assets: ${bad.length}`);
lines.push(...bad);
fs.writeFileSync(path.join(SCR, 'guidcheck.txt'), lines.join('\n'));
console.log(lines.join('\n'));

// For each flagged site in srccheck.txt: enclosing ModOp Condition + whether the file's assets/ModOps are loaded.
const fs = require('fs'), path = require('path');
const SCR = process.argv[2];
const R = 'C:/Users/maxim/Documents/Anno 1800/mods/[Addon] Return to the Orient';
const txt = fs.readFileSync(path.join(SCR, 'srccheck.txt'), 'utf8').split('## numbers')[1].split('\n').slice(1);
// loaded files: follow Includes from every mod's data/config/export/main/asset/assets.xml (+ other roots)
const loaded = new Set();
function follow(f) {
  const k = path.resolve(f).toLowerCase(); if (loaded.has(k) || !fs.existsSync(f)) return; loaded.add(k);
  const t = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of t.matchAll(/<Include\s+File="([^"]+)"/g)) follow(path.join(path.dirname(f), m[1]));
}
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name.startsWith('-')) continue; const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (/^(assets|templates|infotips|properties|export\.bin)\.xml$/i.test(e.name) || /data[\\/]config[\\/]gui[\\/]/i.test(p) || /data[\\/]infotips[\\/]/i.test(p)) follow(p); } })(R);
for (const l of txt) {
  if (!l.trim()) continue;
  const [g, rest] = l.split(/: (.*)/s);
  const sites = rest.split(' | ').map(s => s.replace(/ \(\+\d+\)$/, ''));
  const info = sites.map(s => {
    const m = /^(.*):(\d+) /.exec(s); const f = path.join(R, m[1]); const line = +m[2];
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    let cond = '';
    for (let i = line - 1; i >= 0; i--) { const mm = /<ModOp\b[^>]*>/.exec(lines[i]); if (mm) { const c = /Condition=["']([^"']+)["']/.exec(mm[0]); cond = c ? c[1] : '-'; break; } }
    return `${m[1].split('/').pop()}:${line} ${loaded.has(path.resolve(f).toLowerCase()) ? 'LOADED' : 'not-loaded'} cond=${cond}`;
  });
  console.log(g + '\n   ' + info.join('\n   '));
}

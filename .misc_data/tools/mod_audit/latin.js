// Latin words (>=5 letters) inside non-Latin-script translations, excluding words that also occur in the
// same entry's English only as proper names (capitalised). Prints candidates of half-English text.
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const read = l => { const m = new Map(); for (const x of fs.readFileSync(path.join(dir, `texts_${l}.xml`), 'utf8').matchAll(/<GUID>(\d+)<\/GUID>[\s\S]*?<Text>([\s\S]*?)<\/Text>/g)) m.set(x[1], x[2]); return m; };
const en = read('english');
for (const l of ['russian', 'japanese', 'korean', 'chinese', 'taiwanese']) {
  const t = read(l); const hits = [];
  for (const [g, s] of t) {
    const clean = s.replace(/\[[^\]]*\]/g, '').replace(/&lt;[^&]*&gt;/g, '').replace(/&[a-z]+;/g, '');
    const words = (clean.match(/[A-Za-z]{5,}/g) || []).filter(w => /^[a-z]/.test(w));
    if (words.length) hits.push(`${g}: ${[...new Set(words)].slice(0, 6).join(' ')}`);
  }
  console.log(`## ${l}: ${hits.length}`); console.log(hits.slice(0, 40).join('\n'));
}

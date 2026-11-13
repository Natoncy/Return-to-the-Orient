// Remove the MODEL <Config> block(s) whose FileName ends with one of the given rdm names (byte-preserving splice, CRLF kept).
// Usage: node dropmodel.js file.cfg name1.rdm [name2.rdm ...]
const fs = require('fs');
const [file, ...names] = process.argv.slice(2);
let t = fs.readFileSync(file, 'latin1');
for (const name of names) {
  const fi = t.search(new RegExp('<FileName>[^<]*/' + name.replace(/\./g, '\\.') + '</FileName>'));
  if (fi < 0) throw new Error('not found ' + name);
  // walk back to the enclosing <Config> of this MODEL: the nearest unmatched <Config> before FileName
  let depth = 0, start = -1;
  for (let i = fi; i >= 0; i--) {
    if (t.startsWith('</Config>', i)) depth++;
    else if (t.startsWith('<Config>', i)) { if (depth === 0) { start = i; break; } depth--; }
  }
  const head = t.slice(start, fi);
  if (!/<ConfigType>MODEL<\/ConfigType>/.test(head)) throw new Error('enclosing config is not MODEL for ' + name);
  depth = 0; let end = -1;
  for (let i = start; i < t.length; i++) {
    if (t.startsWith('<Config>', i)) depth++;
    else if (t.startsWith('</Config>', i)) { depth--; if (depth === 0) { end = i + 9; break; } }
  }
  // take the line's leading whitespace and the trailing newline and one blank line with it
  let s = start; while (s > 0 && (t[s - 1] === '\t' || t[s - 1] === ' ')) s--;
  let e = end; const nl = t.slice(e).match(/^\r?\n([ \t]*\r?\n)?/); if (nl) e += nl[0].length;
  console.log(`${name}: removed ${t.slice(s, e).split('\n').length - 1} lines`);
  t = t.slice(0, s) + t.slice(e);
}
fs.writeFileSync(file, t, 'latin1');

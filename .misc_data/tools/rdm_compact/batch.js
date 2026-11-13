// Dry run over a list of mod-relative .rdm paths: backup -> rebuild -> samegeo -> load with both rdm4-bin builds.
// Writes <work>/backup/<rel>, <work>/new/<rel>; installs nothing. Prints one line per mesh and a summary of failures/empties.
// Usage: node batch.js <modRoot> <list.txt> <workDir>      (ZERO=point|area|off is passed through to rebuild/samegeo)
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const [root, listFile, work] = process.argv.slice(2);
const list = fs.readFileSync(listFile, 'utf8').trim().split(/\r?\n/).map(l => l.split('\t')[0]).filter(Boolean);
const ext = fs.readdirSync(path.join(process.env.USERPROFILE, '.vscode/extensions')).filter(d => d.startsWith('jakobharder.anno-modding-tools-')).sort().pop();
const exes = { tools: 'C:/tools/rdm4-bin.exe', ext: path.join(process.env.USERPROFILE, '.vscode/extensions', ext, 'external/rdm4-bin.exe') };
const node = (script, args) => spawnSync(process.execPath, [path.join(__dirname, script), ...args], { encoding: 'utf8', env: process.env });
function loads(file) { // the extension build rejects long paths, so convert from a short copy
  const t = path.join(work, 't'), res = {};
  for (const [k, exe] of Object.entries(exes)) {
    fs.rmSync(t, { recursive: true, force: true }); fs.mkdirSync(path.join(t, 'o'), { recursive: true });
    fs.copyFileSync(file, path.join(t, 'x.rdm'));
    const p = spawnSync(exe, ['-i', path.join(t, 'x.rdm'), '-o', path.join(t, 'o'), '-e', 'gltf'], { encoding: 'utf8' });
    res[k] = !(p.stdout + p.stderr).split('\n').some(l => /panic|error/i.test(l));
  }
  return res;
}
const bad = [], empty = [];
for (const r of list) {
  const src = path.join(root, r), bf = path.join(work, 'backup', r), nf = path.join(work, 'new', r);
  fs.mkdirSync(path.dirname(bf), { recursive: true }); fs.mkdirSync(path.dirname(nf), { recursive: true });
  if (!fs.existsSync(bf)) fs.copyFileSync(src, bf); // keep the first backup on reruns
  const rb = node('rebuild.js', [bf, nf]), line = (rb.stdout || rb.stderr).trim().split('\n').pop();
  const kept = +((line.match(/tris \d+ -> (\d+)/) || [])[1] ?? -1);
  if (kept === 0) { empty.push(r); console.log('EMPTY ', r, '|', line); continue; }
  const sg = node('samegeo.js', [bf, nf]).stdout.trim();
  const lo = loads(bf), ln = loads(nf);
  const ok = rb.status === 0 && /GEOMETRY SAME/.test(sg) && /tailLen same/.test(sg) && Object.keys(exes).every(k => !lo[k] || ln[k]);
  if (!ok) bad.push(r);
  console.log(ok ? 'OK    ' : 'FAIL  ', r, '|', line.replace(/^[^:]*: /, ''), '|', sg.replace(/^\S+ /, ''), '| load old', JSON.stringify(lo), 'new', JSON.stringify(ln));
}
console.log(`\n${list.length} meshes, ${bad.length} failed, ${empty.length} empty`);
for (const r of bad) console.log('FAILED', r);
for (const r of empty) console.log('EMPTY', r);

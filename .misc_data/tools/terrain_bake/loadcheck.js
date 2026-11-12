// Load each listed mod mesh (game paths, one per line, or args) with both rdm4-bin builds via a short temp copy.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const C = require('./common');
const list = process.argv[2] === '-f' ? fs.readFileSync(process.argv[3], 'utf8').trim().split(/\r?\n/) : process.argv.slice(2);
const ext = fs.readdirSync(path.join(process.env.USERPROFILE, '.vscode/extensions')).filter((d) => d.startsWith('jakobharder.anno-modding-tools-')).sort().pop();
const exes = { tools: 'C:/tools/rdm4-bin.exe', ext: path.join(process.env.USERPROFILE, '.vscode/extensions', ext, 'external/rdm4-bin.exe') };
const t = path.join(__dirname, 't');
let bad = 0;
for (const g of list) {
  const res = {};
  for (const [k, exe] of Object.entries(exes)) {
    fs.rmSync(t, { recursive: true, force: true }); fs.mkdirSync(path.join(t, 'o'), { recursive: true });
    fs.copyFileSync(path.join(C.MOD, g), path.join(t, 'x.rdm'));
    const p = spawnSync(exe, ['-i', path.join(t, 'x.rdm'), '-o', path.join(t, 'o'), '-e', 'gltf'], { encoding: 'utf8' });
    res[k] = !(p.stdout + p.stderr).split('\n').some((l) => /panic|error/i.test(l)) && fs.readdirSync(path.join(t, 'o')).length > 0;
  }
  const ok = Object.values(res).every(Boolean);
  if (!ok) bad++;
  if (!ok || process.env.V) console.log(ok ? 'OK  ' : 'FAIL', g, JSON.stringify(res));
}
console.log(`${list.length} meshes, ${bad} failed`);

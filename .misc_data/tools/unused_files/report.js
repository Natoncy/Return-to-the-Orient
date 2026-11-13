// Writes the markdown report + plain path list.
const fs = require('fs'), path = require('path');
const OUT = process.argv[2];
const u = JSON.parse(fs.readFileSync('unused.json'));
const { full, part } = JSON.parse(fs.readFileSync('groups.json'));
const guids = fs.readFileSync('guids.txt', 'utf8');
const mb = b => (b / 1e6).toFixed(1) + ' MB';
const total = u.reduce((a, x) => a + x[1], 0);
const L = [];
L.push('# Unused files in `data/`', '', `Generated 2026-10-27 on \`develop\` (8f2cca28). ${u.length} of 20,719 files (${mb(total)} of 4.3 GB) are never loaded by the game.`, '');
L.push('## How it was checked', '',
  '- Roots: every `.xml` that patches a vanilla path (assets, texts, gui, `export.bin.xml`, `world_map_01.fc.xml`), every `.lnk`, every file that overrides a vanilla path (vanilla list from `D:\\anno_data\\1800`).',
  '- Followed from there: `<Include>`s (XML comments stripped), every `data/...` path in loaded XML / cfg / ifo / prp / fc / lnk, across the main mod and all submods.',
  '- Implicit companions: `x.cfg` → `x.ifo` `x.fc` `x.bfg`; `x.prp` → `x.brp` `x.ifo`; `x_lod0.rdm` → all `x_lodN.rdm`; texture `x.psd/.png` → `x_N.dds` + `x.png`; `.a7m` → its island folder; `.a7t` → `.a7tinfo/.a7te`; `NNN.bnk` → bank id in XML.',
  '- Branches `v0.7.0` and `ai_settlement` (unmerged) reference none of these files.',
  '- Not counted as unused: the ~1,000 source `.png` copies next to used `_N.dds` (repo convention; the game never reads them either).', '');
const by = {};
for (const [k, s] of u) { const e = k.split('.').pop(); (by[e] = by[e] || [0, 0]); by[e][0]++; by[e][1] += s; }
L.push('## By file type', '', '| type | files | size |', '|---|---:|---:|');
for (const [e, [n, s]] of Object.entries(by).sort((a, b) => b[1][1] - a[1][1])) L.push(`| .${e} | ${n} | ${mb(s)} |`);
L.push('');
L.push('## Never-loaded working files', '',
  '- `.glb` (27) / `.obj` (3): Blender / converter exports next to rdm meshes.',
  '- `.cf7` (42): feedback sources; every one has its compiled `.fc` beside it.',
  '- `camel_fields/production_colony02_03_field_0[1-4].xml`: fc dumps. The mod loader treats them as patches of non-existent files.',
  '- `sound/generatedsoundbanks/**/*.json|.txt|.xml` (27): Wwise metadata next to the banks. The `.xml` ones are also seen as patches.',
  '- `icons/items/unused*.png` / `unussed *.png` (8): spare item icons.', '');
L.push('## Unused XML includes', '',
  '- `assets_includes/production_chains/assets_orient_alembics_chain.xml`: its `<Include>` is commented out.',
  '- `assets_includes/buildings/production/export/assets_export_orient_05_elephant_hunting_cabin_africa.xml`: its `<Include>` is commented out.', '');
L.push(`## Folders where nothing is used (${full.length}, ${mb(full.reduce((a, [, v]) => a + v.us, 0))})`, '',
  'Mostly `1404_import` originals whose meshes/textures were later copied into a `buildings/orient/...` folder; the cfgs point at the copy.', '',
  '| size | files | folder |', '|---:|---:|---|');
for (const [k, v] of full) L.push(`| ${mb(v.us)} | ${v.n} | \`${k}\` |`);
L.push('');
L.push(`## Folders with unused leftovers (${part.length}, ${mb(part.reduce((a, [, v]) => a + v.us, 0))})`, '',
  '| unused size | unused / all | folder |', '|---:|---:|---|');
for (const [k, v] of part) L.push(`| ${mb(v.us)} | ${v.u} / ${v.n} | \`${k}\` |`);
L.push('');
L.push('## Asset GUIDs nobody references', '',
  'Defined in the main mod and not mentioned by any other loaded file (texts excluded). Most are fine because the engine finds them by other means:',
  '- **Fine:** Text in text groups (monument fluff), RandomIsland / FertilitySet / MineSlotSet (picked by region), Kahina VisualObjects (placed by the island file), triggers, quest pool, population group, herd.',
  '- **Worth a look:** `1404000153` ProductList *AllGoodsUnlock_OrientSort_WithoutOil*, `1404000975` Kahina Orient profile, texts `1404000947` (caftan item fluff), `1404000182` (*LevelUp_NewAge_Title_Orient02*), `1404000595` (pearl necklace recipe desc), 10 envoy AudioTexts `1404000543`–`561`.', '',
  '<details><summary>Full list</summary>', '', '```', guids, '```', '', '</details>', '');
L.push('## All unused files', '', 'Also as a plain list in `unused_files.txt`.', '', '<details><summary>' + u.length + ' paths</summary>', '', '```');
for (const [k, s] of u.sort()) L.push(k);
L.push('```', '', '</details>', '');
fs.writeFileSync(path.join(OUT, 'unused_files_report.md'), L.join('\n'));
fs.writeFileSync(path.join(OUT, 'unused_files.txt'), u.map(x => x[0]).sort().join('\n') + '\n');
console.log('written');

// Oriental Embassy model: copy of the former IAAM Test variation 2 (sbm/.../speicherstadt/warehouse_var01.cfg)
// into buildings/orient/oriental_embassy, without the quay ground (s_footbridge_* plates) and the market clutter
// in front (market stand, front goods piles, harbour crane + crate box). Re-runnable: overwrites the new cfg/ifo
// and copies the rdm/maps files the cfg still references. The ground decal is added by ground.js.
// The source folder was deleted on 2026-11-10 (unused after this copy); to re-run, restore it first:
//   git checkout 2525a4ce -- data/graphics/buildings/orient/sbm/iaam/orient/005kustengebaude/speicherstadt
//   node promote.js
const fs = require('fs'), path = require('path');
const MOD = path.join(__dirname, '..', '..', '..');
const SRC_DIR = 'data/graphics/buildings/orient/sbm/iaam/orient/005kustengebaude/speicherstadt/';
const DST_DIR = 'data/graphics/buildings/orient/oriental_embassy/';
const SRC = path.join(MOD, SRC_DIR, 'warehouse_var01.cfg');
const DST = path.join(MOD, DST_DIR, 'oriental_embassy.cfg');

// all goods piles go: the ones behind the building would stick out of the 6x4 footprint
const DROP_FILES = /s_footbridge_|s_market_stand_|n_goods_|reparaturkran[\\/]prop_s630\.cfg/i;
const DROP_MODELS = /oriental_crane_lod0|box_harbour_masters_office02/i;

// balanced <Config>...</Config> blocks directly below a list tag
function blocks(text, listTag) {
  const open = text.indexOf(`<${listTag}>`), close = text.indexOf(`</${listTag}>`, open);
  const out = []; let i = open, depth = 0, start = -1;
  const re = /<Config>|<\/Config>/g; re.lastIndex = open;
  let m;
  while ((m = re.exec(text)) && m.index < close) {
    if (m[0] === '<Config>') { if (depth === 0) start = m.index; depth++; }
    else { depth--; if (depth === 0) out.push([start, m.index + m[0].length]); }
  }
  return out;
}
let t = fs.readFileSync(SRC, 'utf8');
const cut = [];
for (const [a, b] of blocks(t, 'Files')) { const s = t.slice(a, b); const fn = (s.match(/<FileName>([^<]*)</) || [])[1] || ''; if (DROP_FILES.test(fn)) cut.push([a, b, fn]); }
for (const [a, b] of blocks(t, 'Models')) { const s = t.slice(a, b); const fn = (s.match(/<FileName>([^<]*)</) || [])[1] || ''; if (DROP_MODELS.test(fn)) cut.push([a, b, fn]); }
cut.sort((p, q) => q[0] - p[0]);
for (const [a, b, fn] of cut) {
  // also eat the indentation + newline before the block
  let s = a; while (s > 0 && /[ \t]/.test(t[s - 1])) s--; if (t[s - 1] === '\n') s--; if (t[s - 1] === '\r') s--;
  t = t.slice(0, s) + t.slice(b); console.log('dropped', fn.split(/[\\/]/).pop());
}
t = t.split(SRC_DIR).join(DST_DIR);
fs.mkdirSync(path.join(MOD, DST_DIR, 'rdm'), { recursive: true });
fs.mkdirSync(path.join(MOD, DST_DIR, 'maps'), { recursive: true });
// copy referenced rdm + texture files (texture refs name .png/.psd; the game loads <base>_N.dds)
const refs = [...t.matchAll(/>(data\/graphics\/buildings\/orient\/oriental_embassy\/[^<]+)</g)].map(m => m[1]);
let copied = 0;
for (const r of new Set(refs)) {
  const rel = r.slice(DST_DIR.length), from = path.join(MOD, SRC_DIR, rel);
  if (/\.rdm$/i.test(r)) { if (fs.existsSync(from)) { fs.copyFileSync(from, path.join(MOD, r)); copied++; } else console.log('missing', r); continue; }
  const base = rel.replace(/\.(png|psd|dds)$/i, ''), dir = path.dirname(path.join(MOD, SRC_DIR, base));
  const files = fs.readdirSync(dir).filter(f => f.startsWith(path.basename(base) + '_') && /_\d+\.dds$/i.test(f) || f === path.basename(base) + '.png');
  if (!files.length) console.log('no texture files for', r);
  for (const f of files) { fs.copyFileSync(path.join(dir, f), path.join(MOD, DST_DIR, path.dirname(rel), f)); copied++; }
}
// ---- footprint 6x4 (user: no big area in front): the building spans z -0.01..2.85, so move it by DZ to
// z -1.41..1.45 (about 0.6 of paving in front and 0.55 behind) ----
const DZ = -1.4, HX = 3, HZ = 2;
const shift = (s, tag) => s.replace(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'), (_, v) => `<${tag}>${+(+v + DZ).toFixed(6)}</${tag}>`);
t = shift(shift(t, 'Position.z'), 'MeshCenter.z'); // Center stays at 0: the building is now centred on the footprint
t = t.replace(/<Extent\.z>[^<]*<\/Extent\.z>/, `<Extent.z>${HZ}</Extent.z>`);
fs.writeFileSync(DST, t);

let ifo = fs.readFileSync(SRC.replace(/\.cfg$/, '.ifo'), 'utf8');
// shift every Position's zf (Rotation/Extents untouched), then rebuild the BuildBlocker and drop the old click
// boxes: they were sized for the 6x6 quay layout (hitbox_fit adds fitted ones afterwards)
ifo = ifo.replace(/(<Position>[\s\S]*?<zf>)([^<]*)(<\/zf>)/g, (_, a, v, b) => `${a}${+(+v + DZ).toFixed(6)}${b}`);
const corner = (x, z) => `\t\t<Position>\n\t\t\t<xf>${x}</xf>\n\t\t\t<zf>${z}</zf>\n\t\t</Position>\n`;
ifo = ifo.replace(/<BuildBlocker>[\s\S]*?<\/BuildBlocker>/, `<BuildBlocker>\n${corner(HX, HZ)}${corner(HX, -HZ)}${corner(-HX, -HZ)}${corner(-HX, HZ)}\t</BuildBlocker>`);
ifo = ifo.replace(/[ \t]*<IntersectBox>[\s\S]*?<\/IntersectBox>\r?\n?/g, '');
const box =(cx, cy, cz, ex, ey, ez) => `<Position>\n\t\t\t<xf>${cx}</xf>\n\t\t\t<yf>${cy}</yf>\n\t\t\t<zf>${cz}</zf>\n\t\t</Position>\n\t\t<Rotation>\n\t\t\t<xf>0</xf>\n\t\t\t<yf>0</yf>\n\t\t\t<zf>0</zf>\n\t\t\t<wf>1</wf>\n\t\t</Rotation>\n\t\t<Extents>\n\t\t\t<xf>${ex}</xf>\n\t\t\t<yf>${ey}</yf>\n\t\t\t<zf>${ez}</zf>\n\t\t</Extents>`;
// one seed box (dome base); hitbox_fit/fitall.js apply then adds fitted boxes for the rest (it needs an existing box)
ifo = ifo.replace(/([ \t]*<MeshBoundingBox>)/, `\t<IntersectBox>\n\t\t<Name>Hitbox_0</Name>\n\t\t${box(0, 1.2, 0.02, 0.9, 1.2, 1.0)}\n\t</IntersectBox>\n$1`);
// bounding box = the building (x -2.77..2.76, y 0..5.28, z -1.41..1.45)
ifo = ifo.replace(/(<BoundingBox>\s*<Name>BoundingBox<\/Name>\s*)<Position>[\s\S]*?<\/Extents>/, `$1${box(0, 2.64, 0.02, 2.8, 2.64, 1.45)}`);
fs.writeFileSync(DST.replace(/\.cfg$/, '.ifo'), ifo);
console.log('wrote', DST, 'files copied', copied, 'footprint', 2 * HX + 'x' + 2 * HZ, 'dz', DZ);

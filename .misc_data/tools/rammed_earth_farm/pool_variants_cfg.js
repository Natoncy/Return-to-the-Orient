// Derives the sand oxidation pool variants 01 and 02 from rammed_earth_pool_field_03.cfg (eoy21 field_03 with the tank).
// node pool_variants_cfg.js <rammed_earth_farm folder>
// Meshes: rdm/rammed_earth_pool_0N_* = x-mirrored eoy21 field_0N copies (mirror_rdm.js), so the mirrored pool ground decal and the
// 270° pool transform of variant 03 fit them too. Material slots and MaterialLODInfos follow the vanilla field_0N cfgs;
// field_01's aqua_farm_diff_dark (a test_data texture in vanilla) gets the aqua_farm_diff textures.
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const src = fs.readFileSync(path.join(dir, 'rammed_earth_pool_field_03.cfg'), 'utf8');

const start = src.indexOf('<Models>') + '<Models>'.length, end = src.indexOf('</Models>');
const head = src.slice(0, start), tail = src.slice(end);
// split the Models section into its MODEL configs (each starts with "<Config>" followed by MODEL)
const parts = src.slice(start, end).split(/(?=\t\t<Config>\s*<ConfigType>MODEL<\/ConfigType>)/);
const models = parts.filter(p => p.includes('<ConfigType>MODEL</ConfigType>'));
const byFile = f => { const m = models.find(p => p.includes(f)); if (!m) throw new Error('no model ' + f); return m; };
const pool = byFile('rammed_earth_pool_lod0.rdm'), cutout = byFile('rammed_earth_pool_lod0_cutout.rdm'), sand = byFile('rammed_earth_pool_sand_lod0.rdm');
const mats = pool.match(/<Config>\s*<ConfigType>MATERIAL<\/ConfigType>[\s\S]*?<\/Config>/g);
const mat = name => { const m = mats.find(x => x.includes('<Name>' + name + '</Name>')); if (!m) throw new Error('no material ' + name); return m; };

const lodInfos = lods => '<MaterialLODInfos>\r\n' + lods.map(l => '\t\t\t\t<i>\r\n\t\t\t\t\t<Indices>\r\n' +
  l.map(i => '\t\t\t\t\t\t<i>' + i + '</i>\r\n').join('') + '\t\t\t\t\t</Indices>\r\n\t\t\t\t</i>\r\n').join('') + '\t\t\t</MaterialLODInfos>';

const variants = {
  '01': { mats: [mat('aqua_farm_diff'), mat('aqua_farm_diff').replace('<Name>aqua_farm_diff</Name>', '<Name>aqua_farm_diff_dark</Name>'), mat('aqua_field_diff'), mat('cloth_wet')],
          lods: [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [1, 2, 3]], sandY: '-0.058871' },
  '02': { mats: [mat('aqua_farm_diff'), mat('aqua_field_diff'), mat('cloth_wet')],
          lods: [[0, 1, 2], [0, 1, 2], [0, 1, 2], [0, 1, 2], [1, 2]], sandY: '0' },
};

for (const [v, o] of Object.entries(variants)) {
  let p = pool.replace(/<Materials>[\s\S]*<\/Materials>/, '<Materials>\r\n' + o.mats.join('\r\n') + '\r\n\t\t\t</Materials>')
    .replace(/<MaterialLODInfos>[\s\S]*?<\/MaterialLODInfos>/, lodInfos(o.lods))
    .replace('rammed_earth_pool_lod0.rdm', `rammed_earth_pool_${v}_lod0.rdm`);
  const c = cutout.replace('rammed_earth_pool_lod0_cutout.rdm', `rammed_earth_pool_${v}_lod0_cutout.rdm`);
  const s = sand.replace('rammed_earth_pool_sand_lod0.rdm', `rammed_earth_pool_${v}_sand_lod0.rdm`)
    .replace(/<Position\.y>[^<]*<\/Position\.y>/, `<Position.y>${o.sandY}</Position.y>`);
  const out = head + '\r\n' + [p, c, s].join('') + tail;
  if (out.includes('tank')) throw new Error('tank left in ' + v);
  fs.writeFileSync(path.join(dir, `rammed_earth_pool_field_${v}.cfg`), out);
  fs.copyFileSync(path.join(dir, 'rammed_earth_pool_field_03.ifo'), path.join(dir, `rammed_earth_pool_field_${v}.ifo`));
  console.log(v, 'models', (out.match(/<ConfigType>MODEL</g) || []).length, 'materials', (out.match(/<ConfigType>MATERIAL</g) || []).length);
}

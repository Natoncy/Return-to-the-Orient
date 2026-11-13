// Orient skin for Madame Kahina's harbour (third party 08) in the Orient session.
// node build.js <out root> [vanilla root, default D:/anno_data/1800]   (needs C:\tools\texconv.exe)
// Writes data/graphics/buildings/orient/kahina: recoloured maps plus copies of the vanilla cfgs/ifos/bfgs that
// point to them. Meshes, props and the vanilla Old World cfgs stay untouched.
// ONLY=<regex> rebuilds only the matching local maps (the cfgs are always rewritten).
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const PNG = require('../canal_orient/png.js');
const { rgb2lab, lab2rgb } = require('../canal_orient/lab.js');

const OUT = process.argv[2], VAN = process.argv[3] || 'D:/anno_data/1800';
if (!OUT) { console.log('usage: node build.js <out root> [vanilla root]'); process.exit(1); }
const SRC = 'data/graphics/buildings/3rd_party/3rd_party_08/maps';
const DST = 'data/graphics/buildings/orient/kahina';
const mapDir = path.join(OUT, DST, 'maps');
fs.mkdirSync(mapDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kahina_orient_'));
const texconv = args => execFileSync('C:/tools/texconv.exe', ['-nologo', '-y', ...args], { stdio: 'pipe' });
const vanillaPng = rel => { texconv(['-ft', 'png', '-f', 'R8G8B8A8_UNORM', '-o', tmp, path.join(VAN, rel + '_0.dds')]); return PNG.decode(path.join(tmp, path.basename(rel) + '_0.png')); };
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const chroma = (a, b) => Math.hypot(a, b);

// per-pixel Lab map; f(L, a, b) returns [L, a, b, weight] (weight 0 keeps the pixel)
function labMap(img, f) {
  const d = img.data;
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4, [L, a, b] = rgb2lab(d[o], d[o + 1], d[o + 2]), r = f(L, a, b);
    if (!r || r[3] <= 0.001) continue;
    const w = Math.min(1, r[3]);
    d.set(lab2rgb(r[0] * w + L * (1 - w), r[1] * w + a * (1 - w), r[2] * w + b * (1 - w)), o);
  }
  return img;
}
// grey stone -> sandstone with lightness L0 + (L - Lm) * k; coloured pixels (chroma above c0..c1) stay
const sandstone = (Lm, L0, k, c0 = 8, c1 = 14) => img => labMap(img, (L, a, b) => [L0 + (L - Lm) * k, 5 + a * 0.4, 21 + (b - 5) * 0.5, 1 - ss(c0, c1, chroma(a, b))]);
const TEAL = [36, -17, -4];   // glazed tile colour of the kontor roofs

// Palette of the Enbesa restyles: plaster L 67-76 / a 0-5 / b 24-27; glazed teal-green tile like Moroccan roofs.
// [vanilla map (file name in SRC, or path under data/graphics), local map, recolour, {half: downscale once}]
const MAPS = [
  // grey plaster (Lab 59/0/0) -> cream plaster; the cfgs still multiply it by 0.875
  ['white_painted_bricks_diff', 'kahina_plaster_diff', img => labMap(img, (L, a, b) => [79 + (L - 59) * 0.7, 3 + a * 0.5, 24 + b * 0.5, 1])],
  // brown concrete (47/3/10) -> warm sandstone trim
  ['concrete_brown_diff', 'kahina_sandstone_diff', img => labMap(img, (L, a, b) => [64 + (L - 47) * 0.8, 5 + (a - 3) * 0.6, 22 + (b - 10) * 0.6, 1])],
  // dark red slate bricks (20/8/4) -> teal-green glazed tiles
  ['roof_slate_shingles_diff', 'kahina_roof_tiles_diff', img => labMap(img, (L, a, b) => [36 + (L - 20) * 1.4, -17 + (a - 8.4) * 0.6, -4 + (b - 3.5) * 0.6, 1])],
  // red granite plinth (38/11/8) -> darker sandstone
  ['marble_tiles_diff', 'kahina_plinth_diff', img => labMap(img, (L, a, b) => [52 + (L - 38) * 0.9, 6 + (a - 11) * 0.4, 20 + (b - 8) * 0.5, 1])],
  // blue-grey glass grid -> dark wood lattice with amber panes; the teal/gold ornament strips (chroma > 12) stay
  ['window_panes_diff', 'kahina_windows_diff', img => labMap(img, (L, a, b) => [L * 0.95, 7 + a * 0.3, 16 + b * 0.3, 1 - ss(8, 14, chroma(a, b))])],
  // grey stone ornaments -> cream stone; gold, the wooden door and the black padding stay
  ['baked_elements_diff', 'kahina_baked_elements_diff', img => labMap(img, (L, a, b) => [L * 1.03 + 4, 3 + a * 0.5, 22 + b * 0.3, (1 - ss(7, 12, chroma(a, b))) * ss(12, 20, L)])],
  // market hall atlas: maroon roof sheets -> teal glazed sheets, grey stone -> cream, gold frame stays
  ['3rd_party_08_02_diff', 'kahina_hall_diff', img => labMap(img, (L, a, b) => {
    const roof = ss(3, 6, a - Math.max(0, b - 4)) * (1 - ss(40, 50, L)), stone = (1 - ss(5, 9, chroma(a, b))) * ss(18, 26, L);
    if (roof > stone) return [36 + (L - 22) * 1.4, -17 + (a - 9) * 0.5, -4 + (b - 4) * 0.5, roof];
    return [75 + (L - 45) * 0.6, 3 + a * 0.5, 24 + b * 0.5, stone];
  })],
  // glazed tiles get more gloss (normal-map alpha) than the slate
  ['roof_slate_shingles_norm', 'kahina_roof_tiles_norm', img => { const d = img.data; for (let i = 3; i < d.length; i += 4) d[i] = Math.min(255, Math.round(d[i] * 1.3 + 40)); return img; }],

  // --- neighbours around the kontor ---
  // the harbour platform: grey paving, stairs and retaining walls -> sandstone
  ['white_floor_diff', 'kahina_platform_floor_diff', sandstone(64, 72, 0.9)],
  ['3rd_party_08_stairs_diff', 'kahina_platform_stairs_diff', sandstone(47, 62, 0.9)],
  ['harbor_system_01_whitened_diff', 'kahina_platform_wall_diff', sandstone(42, 56, 0.9)],
  ['buildings/special/quay_system_01/maps/harbor_system_03_diff', 'kahina_quay_wall_diff', sandstone(43, 54, 0.9)],
  ['buildings/special/harbor_system/harbor_system_01/maps/harbor_system_01_ground_tileable_diff', 'kahina_paving_diff', sandstone(57, 66, 1)],
  // dark grey brick of the islet gates and the chimney -> sandstone blocks
  ['buildings/3rd_party/3rd_party_03/maps/3rd_party_03_module_01_dif', 'kahina_gate_diff', sandstone(30, 50, 0.95, 10, 18)],
  // stone quay ramp + rope bridge posts; the wood stays
  ['buildings/3rd_party/quay_system_02/maps/quay_system_02_02_diff', 'kahina_quay_stone_diff', sandstone(23, 44, 0.95, 10, 18)],
  // fountain basin -> cream stone
  ['buildings/ornamental/city_props_system/city_props_system_2x2/maps/city_props_system_fountain_01_diff', 'kahina_fountain_diff', sandstone(43, 62, 0.85, 6, 10)],
  // equestrian statue: grey plinth -> sandstone, the green bronze stays
  ['buildings/ornamental/city_props_system/city_props_system_2x2/maps/city_props_system_2x2_02_diff', 'kahina_statue_diff', sandstone(30, 52, 0.9, 4, 8)],
  // pavilion: grey stone -> cream, green copper dome -> teal glaze
  ['buildings/ornamental/park_props_system/park_props_system_2x2/maps/park_props_system_pavillon_01_diff', 'kahina_pavilion_diff', img => labMap(img, (L, a, b) => {
    const dome = ss(6, 12, -a);
    if (dome > 0.5) return [TEAL[0] + (L - 50) * 0.9, TEAL[1] + (a + 15) * 0.4, TEAL[2] + (b - 4) * 0.4, dome];
    return [66 + (L - 45) * 0.8, 4 + a * 0.4, 20 + (b - 4) * 0.5, 1 - ss(6, 10, chroma(a, b))];
  })],
  // crane + crate tower atlas: yellow paint -> teal paint (orange tiles and rust stay); halved from 4096
  ['buildings/3rd_party/3rd_party_06/maps/3rd_party_06_diff', 'kahina_crane_diff', img => labMap(img, (L, a, b) =>
    [TEAL[0] + 4 + (L - 60) * 0.8, TEAL[1] + (a - 5) * 0.3, TEAL[2] + (b - 50) * 0.2, ss(30, 40, b) * (1 - ss(12, 18, a))]), { half: 1 }],
  // water wheel: red paddles -> teal paint
  ['vehicle/tourism_ship_02/maps/tourism_ship_02_diff', 'kahina_wheel_diff', img => labMap(img, (L, a, b) =>
    [TEAL[0] + (L - 40) * 0.8, TEAL[1] + (a - 40) * 0.1, TEAL[2], ss(22, 32, a - Math.max(0, b - 30))])],
];
const vanillaMap = m => m.includes('/') ? 'data/graphics/' + m : `${SRC}/${m}`;

function halve(img) {
  const w = img.w >> 1, h = img.h >> 1, out = PNG.create(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) s += img.data[((2 * y + dy) * img.w + 2 * x + dx) * 4 + c];
    out.data[(y * w + x) * 4 + c] = (s + 2) >> 2;
  }
  return out;
}
// _0.png source next to the DDS, _0.._4 as box halvings, BC7 like the other restyles
function writeTexture(base, img) {
  PNG.encode(path.join(mapDir, base + '_0.png'), img);
  for (let k = 0; k < 5; k++) {
    if (k) img = halve(img);
    const p = path.join(tmp, `${base}_${k}.png`);
    PNG.encode(p, img);
    texconv(['-sepalpha', '-f', 'BC7_UNORM', '-m', '0', '-o', mapDir, p]);
  }
  console.log('texture', base);
}
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
for (const [src, dst, fn, o = {}] of MAPS) if (!only || only.test(dst)) {
  let img = vanillaPng(vanillaMap(src));
  if (o.half) img = halve(img);
  writeTexture(dst, fn(img));
}

// vanilla cfg (under data/graphics) -> local name. Every map in MAPS is re-pointed; other normals, metal maps and
// meshes stay vanilla.
const B = 'buildings/3rd_party/';
const CFGS = {
  [B + '3rd_party_08_kontor/3rd_party_08_kontor']: 'kahina_kontor',
  [B + '3rd_party_08/3rd_party_08_kontor_hall']: 'kahina_kontor_hall',
  [B + '3rd_party_08/3rd_party_08_kontor_hall_endpiece']: 'kahina_kontor_hall_endpiece',
  [B + '3rd_party_08/3rd_party_08_kontor_front_02']: 'kahina_kontor_front_02',
  [B + '3rd_party_08/3rd_party_08_kontor_front_03']: 'kahina_kontor_front_03',
  [B + '3rd_party_08/3rd_party_08_kontor_main_small']: 'kahina_kontor_main_small',
  [B + '3rd_party_08/3rd_party_08_kontor_tower']: 'kahina_kontor_tower',
  [B + '3rd_party_08/3rd_party_08_kontor_tower_small']: 'kahina_kontor_tower_small',
  [B + '3rd_party_08/3rd_party_08_kontor_bridge']: 'kahina_kontor_bridge',
  [B + '3rd_party_08/3rd_party_08_hall_01']: 'kahina_hall_01',
  [B + '3rd_party_08/3rd_party_08_hall_02']: 'kahina_hall_02',
  // neighbours
  [B + '3rd_party_08/3rd_party_08_platform_all']: 'kahina_platform',
  [B + '3rd_party_03/3rd_party_03_gate_01']: 'kahina_gate_01',
  [B + '3rd_party_03/3rd_party_03_gate_02']: 'kahina_gate_02',
  [B + '3rd_party_03/3rd_party_03_chimney_01']: 'kahina_chimney_01',
  [B + 'quay_system_02/quay_system_02_element_04_var_01']: 'kahina_quay_element_04_var_01',
  [B + 'quay_system_02/quay_system_02_element_ramp_small_01']: 'kahina_quay_element_ramp_small_01',
  [B + 'quay_system_02/quay_system_02_element_rope_bridge_01_var_01']: 'kahina_quay_element_rope_bridge_01_var_01',
  [B + 'quay_system_02/quay_system_02_element_rope_bridge_01_var_02']: 'kahina_quay_element_rope_bridge_01_var_02',
  [B + 'quay_system_02/quay_system_02_element_rope_bridge_01_var_03']: 'kahina_quay_element_rope_bridge_01_var_03',
  [B + 'quay_system_02/quay_system_02_element_rope_bridge_01_var_04']: 'kahina_quay_element_rope_bridge_01_var_04',
  [B + '3rd_party_05_kontor/3rd_party_05_fountain_01']: 'kahina_fountain',
  [B + '3rd_party_05_kontor/3rd_party05_wheel']: 'kahina_wheel',
  [B + '3rd_party_06/3rd_party_06_crane_01']: 'kahina_crane',
  [B + '3rd_party_06/3rd_party_06_platform_03_var01']: 'kahina_crane_platform',
  'props/ornamental/statue_02': 'kahina_statue',
  'props/decoration/pavillon': 'kahina_pavilion',
};
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const [src, dst] of Object.entries(CFGS)) {
  const dir = path.join(VAN, 'data/graphics', path.dirname(src)), base = path.basename(src);
  for (const ext of ['.cfg', '.ifo', '.bfg', '.fc']) {
    const f = path.join(dir, base + ext);
    if (!fs.existsSync(f)) continue;
    if (ext !== '.cfg') { fs.copyFileSync(f, path.join(OUT, DST, dst + ext)); continue; }
    // latin1 keeps the bytes; the cfgs are CRLF, so no line-based tools
    let s = fs.readFileSync(f, 'latin1'), n = 0;
    for (const [vm, lm] of MAPS.map(m => [vanillaMap(m[0]), m[1]])) {
      s = s.replace(new RegExp(esc(vm + '.') + '(psd|png)', 'g'), () => (n++, `${DST}/maps/${lm}.psd`));
    }
    // FILE references between the copied cfgs (backslash style like vanilla)
    for (const [cs, cd] of Object.entries(CFGS)) {
      const vanillaRef = `data\\graphics\\${cs.replace(/\//g, '\\')}.cfg`;
      s = s.replace(new RegExp(esc(vanillaRef), 'g'), () => (n++, `${DST.replace(/\//g, '\\')}\\${cd}.cfg`));
    }
    fs.writeFileSync(path.join(OUT, DST, dst + ext), s, 'latin1');
    console.log('cfg', dst, n, 'refs');
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

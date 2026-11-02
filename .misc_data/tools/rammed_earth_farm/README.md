# Rammed Earth Farm

Rammed Earth `1404009000` replaces the Enbesa mud bricks `114402` in the Orient. The Rammed Earth Farm `1404009002`
(clay → rammed earth, 30 s) uses oxidation pool fields `1404009003`, chain `1404009004`, unlock pool `1404001299`
(formerly the mud bricks pool).

Scripts (run from a working folder; they expect their inputs next to themselves):

- `dome.js <maps dir>`: needs `gltf.gltf` (`rdm4-bin -i s_silk_plantation_lod0.rdm -o gltf -e gltf`) and
  `s_silk_plantation_diff_0.png` (texconv). The silk plantation dome gores (faces above y 0.95, atlas box x < 480, 160 < y < 365)
  are recoloured in Lab: teal → clay brown (L 44, a 17, b 27), gold trim → dark brown (L 26, a 12, b 18; was sandstone L 70 until 2026-11-02), dark lines kept.
  It needs a `dds/` folder next to itself. Run `silk.js` on the maps folder afterwards, since dome.js rewrites the whole texture. `trim_preview.png`: before / after the dark trim.
  It writes `rammed_earth_farm_diff_0..2.dds` (BC7, box halvings, like the original's three levels) and the `_0.png` source.
- `probe.js [diff png] [out png] [w h scale]`: software render preview + uv height map.
- `icon.js <out png>`: keys the baked checkerboard out of the placeholder art (`src.png`), crops and area-scales to 128 px.
  Then `annotex -f=diff -l=4` in the icon folder.
- `costcheck.js <patched assets.xml> [product]`: Mod3 assets whose resolved cost (through BaseAssetGUID) still uses a product.

`rammed_earth_preview.png`: silk plantation (left), rammed earth farm (right), icon.

## Oxidation pool (2026-11-02)

The Rammed Earth Works is 3x7 now: the dome sits on z 0.5..3.5 (cfg offset z 2, its ground decal too) and the eoy21 aqua farm
module pool (`field_01_lod0.rdm` + terrain cutout, vanilla paths) fills z -3.5..0.5 (offset z -1.5; moved to this side on request). The pool's water mesh
`field_01_water_lod0.rdm` is reused with a shader 8 sand material instead of water. Hitbox_1 covers the whole footprint, Hitbox_2 the pool.

- `pool_tex.js <out dir>` (run where its inputs are): `sand_01_diff_0.png` (dlc02 zoo sand, texconv) → `rammed_earth_pool_sand_diff_0.png`,
  grain kept, recoloured to (178, 146, 100); `aqua_farm_module_ground_colony01_01_diff_0.png` → `rammed_earth_pool_ground_diff_0.png`,
  green/olive pixels (hue 40–170) pushed to dirt, map shifted to the silk ground mean (needs `silkground.png`). The pool decal has `HasDetails 0`.
- `half.js in out`: box halving for the `_1`/`_2` levels; then `texconv -f BC7_UNORM -m 0`.
- `rammed_earth_pool_sand_norm_*.dds` are straight copies of dlc02 `sand_01_norm_0..2.dds`.
- `pool_preview.js 2 -1.5 0 x` renders the composition; `pool_preview.png` is the result.

## Brown silk (2026-11-02)

`silk.js <maps dir>` recolours the grey/white silk in `rammed_earth_farm_diff_0.png` (after `dome.js`) to browns, per atlas box:
trough fill, basket bundles, big drying sheet, grey cloth, striped hanging cloths (Lab targets in the script; luminance detail kept,
only pixels with chroma < 19, so the dark dome trim is skipped). Then it rebuilds `_0.._2.dds`. `silk_preview.png`: before (left) / after (right).

## Mirrored x -> -x (2026-11-02)

The whole building is mirrored across x = 0 (the long axis z keeps dome at +z, pool at -z). All meshes are local copies in
`data/graphics/buildings/orient/rammed_earth_farm/rdm/`, because the silk plantation and the vanilla pool keep the originals:

- `mirror_rdm.js in.rdm out.rdm`: static rdm x-mirror at byte level (half x sign, N/G/B x byte 255-b, winding reversed, Meta bbox x).
  Mirroring twice gives the original bytes; winding/normal agreement stays 100%.
  `rammed_earth_farm_lod0` ← 1404 `s_silk_plantation_lod0`; `rammed_earth_pool_lod0..4`, `_lod0_cutout`, `rammed_earth_pool_sand_lod0`
  ← eoy21 `field_01_lod0..4`, `field_01_lod0_cutout`, `field_01_water_lod0`.
- `flip.js in.png out.png [invertR]`: decal flips. Dome ground → `maps/rammed_earth_farm_ground_diff_0_0_384_384.png` (PNG only, like the
  1404 original); pool ground diff flipped after `pool_tex.js`; pool ground normal = eoy21 norm flipped with R inverted → `rammed_earth_pool_ground_norm_0..2.dds`.
- cfg: Center.x / MeshCenter.x negated (all transforms have x 0). ifo: every position x negated; the symmetric BuildBlocker keeps its corner order.
- `mirror_preview.png`: before (left) / after (right).

## Pool = field_03 with the tank (2026-11-02)

The user picked variant 3 (eoy21 `field_03`, pool plus raised round tank; all variants: `pool_variants.png`).
`rdm/rammed_earth_pool_lod0..4`, `_lod0_cutout`, `_sand_lod0` and the new `rammed_earth_pool_tank_cutout_lod0` (from `ground_barrel_cutout_lod0`)
are x-mirrored copies of the field_03 meshes. In the cfg every pool part and the pool decal turn 180° (Rotation.y 1, w 0), so the tank
sits at the far end (world ≈ x 0.78, z −2.41), away from the dome. The tank cutout sits at (0.762055, −0.143161, −2.057294).
The pool model keeps all 4 vanilla material slots (aqua_farm_diff, aqua_field_diff, cloth_wet, and slot 3 = tank water → `pool_sand`)
with `[0,1,2,3]` on every LOD. The field_01 version had only slot 0, so most of that pool did not render. ifo: Hitbox_3 = tank.
`pool_preview.png` now shows this version (4 views).

Tank sand (2026-11-02): material slot 3 of the pool model is `tank_sand` with `maps/rammed_earth_tank_sand_diff_0..2.dds`, the same
sand_01 grain recoloured to (138, 82, 54), darker and redder than the pool sand (178, 146, 100). The sand fill keeps `pool_sand`.
`tank_sand_preview.png` is a close-up.

## 6x4 footprint, pool turned clockwise (2026-11-02)

Footprint 4 (x) by 6 (z): BuildBlocker ±2 / ±3, Hitbox_1 extents (2, 0.1, 3). The dome block moved to z 1.5 (model, decal,
Hitbox_0, infolayer, DamageImpact0/1 all −0.5). The pool parts turned another 90° clockwise seen from above: Rotation.y −0.707107,
w 0.707107 (270°; with the standard q·v·q*, +90° about y is clockwise in the top view, x right / z up). Pool centre z −1.44, so the
mesh (local x −1.56..1.42, z −1.88..1.84) lands on x −1.84..1.88, z −3.0..−0.02. Tank cutout (−0.557294, −0.143161, −2.202055),
Hitbox_2 extents (1.8, 0.1, 1.3), Hitbox_3 (tank) at (−0.91, 0.25, −2.22). transporter_spawn (1.75, 0, 2.75).

- Dome ground: `ground_extend.js ground_source_384.png rammed_earth_farm_ground_diff_0.png` widens the old 384 px (3 m) silk
  ground to 512 px (4 m), 88 px new ground on each side. A first version tiled 64 px blocks of cobbles and showed
  horizontal lines in game (the patch is darker at the top). Now: cobble detail (high-pass) from x 25..140, y 210..288, sampled
  at random offsets on a 28 px grid with smooth, variance-preserving weights, over a smooth base colour; the last 16 px fade into
  the old edge columns. Alpha = the mirrored ragged edge. `ground_preview.png` = top view of the dome half. Then `half.js` twice and `texconv -sepalpha -f BC7_UNORM -m 0` → `maps/rammed_earth_farm_ground_diff_0..2.dds`;
  the cfg now names `maps/rammed_earth_farm_ground_diff.png` (Extents 2 × 1.5). The old `_0_0_384_384.png` is `ground_source_384.png` here.
- Pool ground decal: turned with the pool, centre z −1.35, Extents.x 1.75 / z 2.1 (world x ±2.1, z −3.1..0.4), so it runs under the
  dome decal's ragged edge and no terrain shows between them.
- `pool_preview.js` (run in a folder with the pool textures, `after_trim.png` and a `p3/` export dir) renders 3 views and a top view
  on a green 4x6 footprint; `pool_preview.png` is the result.

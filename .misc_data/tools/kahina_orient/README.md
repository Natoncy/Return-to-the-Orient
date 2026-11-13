# Madame Kahina's Orient harbour skin

Gives the Orient trade island `moderate_3rdparty08_01` Middle Eastern colours. The Old World Kahina island
keeps the vanilla look, because the Orient island now places its own copies of the buildings.

## Use

`node build.js "<mod root>" [vanilla root, default D:/anno_data/1800]` (Node, `C:\tools\texconv.exe`).
It rebuilds `data/graphics/buildings/orient/kahina`: the recoloured maps and copies of 11 vanilla cfgs with their `.ifo`/`.bfg`.
`ONLY=<regex>` rebuilds only the matching maps. The cfgs are rewritten every time.

## What changes

All the Kahina buildings use tileable shader-8 materials. The skin swaps those maps and keeps every mesh at its
vanilla path:

| vanilla map | local map | change |
|---|---|---|
| white_painted_bricks_diff | kahina_plaster_diff | grey plaster → cream (Lab 79/3/24) |
| concrete_brown_diff | kahina_sandstone_diff | brown concrete → warm sandstone |
| roof_slate_shingles_diff/_norm | kahina_roof_tiles_diff/_norm | dark red slate → teal-green glazed tile, more gloss |
| marble_tiles_diff | kahina_plinth_diff | red granite → dark sandstone |
| window_panes_diff | kahina_windows_diff | blue glass grid → dark wood lattice (teal/gold strips kept) |
| baked_elements_diff | kahina_baked_elements_diff | grey stone ornaments → cream (gold, door kept) |
| 3rd_party_08_02_diff | kahina_hall_diff | market hall roof sheets → teal, stone → cream (gold frame kept) |

The neighbours around the kontor get the same palette:

| vanilla map | local map | used by |
|---|---|---|
| white_floor, 3rd_party_08_stairs, harbor_system_01_whitened, harbor_system_03 | kahina_platform_floor/_stairs/_wall, kahina_quay_wall | harbour platform: grey paving, stairs, retaining walls → sandstone |
| harbor_system_01_ground_tileable | kahina_paving | platform + kontor bridge |
| 3rd_party_03_module_01_dif | kahina_gate | islet gates and the chimney: dark brick → sandstone |
| quay_system_02_02 | kahina_quay_stone | quay ramp + rope bridges (wood stays) |
| city_props_system_fountain_01 / _2x2_02 | kahina_fountain / kahina_statue | fountain → cream stone; statue plinth → sandstone, bronze kept |
| park_props_system_pavillon_01 | kahina_pavilion | pavilion: cream stone, green dome → teal |
| 3rd_party_06 (halved to 2048) | kahina_crane | crane + crate tower: yellow paint → teal |
| tourism_ship_02 | kahina_wheel | water wheel: red paddles → teal |

The golden domes (`roof_golden`), awnings, hanging cloth, pergolas, wooden decks/piers/stairs, the cast-iron
lampposts (props; no Orient lamp exists) and other props stay vanilla.

## Assets and island

- `buildings/assets_kahina_orient.xml`: VisualObjects 1404008900–909, Orient copies of 101173, 101171, 101172, 101175,
  101178, 101179, 100758, 100759, 101169 and 101322. The Orient kontor 1404000974 uses `kahina_kontor.cfg`.
- 1404008910–919: copies of the neighbours 101314 (platform), 100725 (gates), 100723 (chimney), 100689 (quay system,
  20 variations), 100862 (fountain), 101022 (statue), 101042 (pavilion), 101159 (crane), 101184 (crate tower) and
  100858 (water wheel). **Variation lists keep the vanilla order**: the island stores a variation index per object.
  Variations without Orient maps point to the vanilla cfgs.
- In the island's `gamedata.xml` (in `.misc_data`) 105 + 99 placed objects were re-pointed from the vanilla GUIDs to
  these copies. The file was then recompressed (FileDBReader, `-c 2`, Island_Gamedata_V2) and repacked into the `.a7m`
  with RdaConsole (`pack -v 2`).

`preview_harbour_before_after.png` shows the whole harbour as placed on the island (left: only the main buildings
reskinned, right: with the neighbours). `preview_before_after.png` shows vanilla on top and the Orient skin below. It is a software render: no normal mapping
and no in-game lighting.

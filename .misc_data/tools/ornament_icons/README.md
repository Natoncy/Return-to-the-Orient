# Ornament icons

Renders 128x128 build-menu icons for the mod's ornaments in the style of the vanilla Enbesa ornament icons
(`data/ui/2kimages/main/3dicons/ornaments/africa`): same camera, sun from the right, desert sand ground, dark outline.
Plain Node.js, no packages. It needs the extracted vanilla tree on `D:\anno_data\1800` and `C:\tools\` (rdm4-bin, texconv, annotex).

## Use

- `node render_all.js` renders every ornament whose `IconFilename` lies in `data/graphics/icons/ornaments/` into `out/`.
  `out/sheet.png` shows them all.
- `node render_all.js --only palm,tent` renders only those icons.
- `--install` also copies each PNG into the mod and builds its `_0.dds` to `_3.dds` with annotex.
- `node icon.js <modRoot> <cfg> <out.png> [json]` renders one cfg. Options: `{"noGround":true}` draws no sand,
  `{"skipModel":"waterfall"}` drops models by name or file, `{"rotY":90}` rotates the object, and
  `{"pngDecals":true}` draws decals that have no `_0.dds`.

A new ornament is picked up automatically when its `IconFilename` points into `data/graphics/icons/ornaments/`.
The variation shown is the first one, unless `PICK` in `render_all.js` says otherwise.

`VariationIcons` entries under `data/graphics/icons/ornaments/` are rendered too: item i shows variation i. For the
variation the menu icon already shows, the entry reuses the menu icon. The others are named `<icon>_varNN.png`
(NN = variation number from 01). They share the menu icon's `OPTS`.
orientPlace01 (`place`) deliberately has no `VariationIcons` (user, 2026-10-21): its 16 pavings look nearly the same,
so it keeps one icon and the game picks a variation at random.

`{"particles":true}` draws one frame of the cfg's PARTICLE systems (`rdp.js` reads the baked `.rdp`) as soft discs.
The fountain needs it, because its spray is the only difference from the no-spray variation. Full discs cover more than
the sparse particle textures, and the warm tone curve turns water cream, so `look` takes `particleSize`, `particleAlpha`
and `particleTint`.

## How it matches vanilla

These values were fitted by rendering vanilla Africa ornament cfgs and comparing the result with their icons:

- Orthographic camera, elevation 38.5°, azimuth 225°. Geometry from rdm4-bin's glTF is mirrored in x, otherwise the
  vanilla well's pots, bush and beam end up on the wrong side.
- Sun at azimuth 285° and elevation 45° in that mirrored space, so shadows fall to the left. The sun is warm and the
  sky is bluish, with sky occlusion from 24 shadow maps.
- Decal textures run u along +x and v along −z, checked against the Africa fence decals.
- Framing: the visible width is 120 px and the bottom edge sits on row 124. Tall objects are shrunk to fit.
- `tone_lut.json` maps the linear render to the vanilla colours per channel. It came from matching quantiles against
  the vanilla icons. Red clips at about input 100, so the ornament's own decals are first dimmed to the sand's
  brightness. Otherwise bright mosaics come out flat yellow.
- Ground: the 1x1 sand decal `africa_ornaments_1x1_ground_sand_01_diff`, 9-sliced over the `.ifo` BuildBlocker plus 0.05.
- Decals without a `_0.dds` (the 1404 converter's `*_0_0_W_H.png` grounds) are skipped, because the game doesn't load them.
- Water (shader 7 without a texture) is grey-blue. Steep water such as waterfalls is drawn faint.
- Model parts below y = −0.01 are cut off, because the terrain hides them in game. The obelisk mesh, for example,
  sits 4.6 units underground.

`scene.js` loads the cfg tree: MODEL, FILE, PROPCONTAINER/PROP (`.prp`), CLOTH, DECAL and MaterialLODInfos.
`render.js` is the rasteriser. Meshes and textures are cached in `cache/`, which is git-ignored.

## Ship icons

`ship_icon.js` renders 256x256 ship icons like the vanilla `data/ui/2kimages/main/3dicons/ships/icon_ship_*` ones, with
a transparent background and the bow toward the viewer at the bottom left. `node render_ships.js [--install]` renders
the mod's ships listed in its `SHIPS` table into `out/ships/`, and `--install` copies the PNG into the mod (PNG only).

- Camera: azimuth 320 and elevation 28 match the vanilla schooner icon. The Orient trading ship uses 325/26 (the user
  picked this angle over a more side-on 345). Same mirrored glTF space as the ornaments.
- Light comes from 30 deg left of the camera and 40 deg up (`lightAz`/`lightEl`). A light built from the camera's
  up vector came from behind and left the sails black.
- Sinking parts are skipped: models named `destruct`/`debris`/`wreck` (the destroyed-clipper hull and debris) and
  every PROPCONTAINER (floating boards, `scene.js` option `noProps`).
- Tone: `fit_ship_tone.js` fits `ship_tone_lut.json` by matching quantiles of linear renders of the vanilla
  schooner, clipper, frigate and gunboat against their icons. The tone runs before the outline so the outline stays
  vanilla near-black (20,20,20). Mod textures from 1404 are brighter than vanilla, so they need `exposure` < 1.
  `saturation` (default 1.2) imitates the painted look.
- Flags carry the player colour as a dye mask and render black. They get the light blue of the vanilla trade-ship
  pennants (`flagColor`). Each scene triangle carries `src`, its mesh file, for that kind of per-model override.
- `stretchY` above `stretchFrom` (deck height) makes the rig taller, like the vanilla icons. The hull keeps its shape.

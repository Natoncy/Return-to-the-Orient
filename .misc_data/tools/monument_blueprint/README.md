# Monument construction drawings

Renders the drawings in the monument construction window (`Monument/BackgroundImage`) for the Oriental Lighthouse
and the Grand Mosque, in the style of the vanilla ones in `data/ui/2kimages/main/assets16/monument_construction/`.
Plain Node.js, no packages. Scene loading, meshes and textures come from `../ornament_icons/scene.js` and its cache.

## Use

- `node make.js lighthouse` or `node make.js grand_mosque` writes the PNGs into `out/` (git-ignored).
- `--install` also copies them into `data/ui/2kimages/main/assets16/monument_construction/` (the lighthouse into
  `orient_lighthouse/`). It builds no `_0.dds` to `_3.dds`: UI images ship as .png only (user rule, 2026-10-30).
- Another monument: add an entry to `MONUMENTS` in `make.js` (stage cfgs, image numbers, camera, framing).

## The monuments

- Lighthouse: arcade side (model −z, the land side), framed like the vanilla tower. Phase 1 (1404004800) shows stufe02,
  phase 2 (1404007000) stufe03, phase 3 (1404007001) the finished stufe04.
- Grand Mosque: the long side with the courtyard on the left and the dome on the right, like the photo-style images
  it replaced on 2026-10-23. 1404000323 uses `_02` (unfinished_01), 324 `_03` (unfinished_02), 325 `_04` (finished);
  the finished 327 shows `_04_coloured` as its blueprint, like the vanilla World's Fair. `_01` (unfinished_00) is unused.

## How it matches vanilla

- 972x544 RGBA, like every vanilla monument image. An annotex `_0.dds` of it would be 706260 bytes, the same as vanilla.
- Pure elevation (orthographic, elevation 0°), game handedness (x mirrored).
  Geometry below y = 0 is cut off, because the terrain hides it.
- Framing: the finished model's top and y = 0 sit on fixed rows, centred, at most 860–877 px wide (the World's Fair spans 877).
  All images of a monument share one scale, so they overlay each other in the window.
- Each phase's images show the model of the stage that phase builds (its `UpgradeTarget`), as vanilla does.
- `_00` (Blueprint, the same for all phases): the finished monument as a faint whitish drawing.
- `_NN` (PhasePlanned): sepia ink with a monochrome wash and hatching in the shade. Parts the stage before already
  has are coloured, like the lower half of vanilla `monument_tower_02`.
- `_NN_coloured` (PhaseFinished): ink over a watercolour wash of the model's own colours.
- Ink lines come from the G-buffer: silhouette, depth steps, creases, material changes, plus texture detail
  (Sobel on the albedo). Specks under 30 px that touch nothing are removed (a lone crane hook above stufe02).
- `ProgressbarHeight` is not tied to the drawing height in vanilla (tower: 70 and 400). Both monuments keep the
  vanilla 3-phase values 50/65/70.

`gbuffer.js` renders depth, normal, albedo, material id and sun shadow per supersample. `style.js` turns that into
the three looks and draws the hatched ground line.

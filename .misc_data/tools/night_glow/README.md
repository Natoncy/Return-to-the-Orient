# night_glow

Night-glow masks (`cNightGlowMap`, `_mask_<lod>.dds`) for buildings that had none.
Glow = white (like the 1404 masks); vanilla residences use R/G/B as separate light groups (`groups: true`).

1. `node survey.js <modRoot> > <scratch>/survey.json` lists every building cfg and whether its materials are lit.
2. `node detect.js <modRoot> <scratch>/work <diffTex>...` renders `<key>.preview.png`: dark openings on wall
   faces of the meshes using the texture (yellow kept, red rejected, dim = not a wall, blue = unused, grid every 1/16).
3. Pick the real windows/doors per texture in `masks.json` (`keep`/`drop` rects in uv 0..1, `same` for a
   copy with the same layout, `reuse` to point at an existing mod or vanilla mask with the same UV layout).
4. `node build.js <modRoot> <scratch>/final [--apply]` writes BC1 `_mask_<lod>.dds` next to the diffuse (one per
   diffuse LOD file) and sets `NIGHT_GLOW_ENABLED`/`GLOW_ENABLED` 1 + `cNightGlowMap` on unlit materials in `data/` cfgs.
   Materials that already have a mask are never touched; shared submods are skipped.

**Painting by hand:** `node .misc_data/tools/night_glow/painter.js`, then http://localhost:8768 (launch config
`night-glow-painter`). Pick a building, pick one of its diffuse textures, paint (brush, eraser, rectangle, magic wand,
"suggestions" rectangle that takes the detector's candidates), save. Saving writes the `_mask_<lod>.dds` next to the
diffuse, backs up the old ones to `night_glow/backup/`, and points every material in `data/` cfgs that uses that
diffuse at it — so all buildings sharing the texture get it. Ticked "copies" (same file name and size elsewhere)
get the same mask. An empty mask switches the glow off. Vanilla-only textures are read-only.

`calibrate.js` scores the detector against the existing hand-made masks: pixel F1 is only ~0.27, so the
detector is a candidate finder, not a mask maker — always review the previews.

Done 2026-11-03: 19 generated masks, 76 materials in 39 cfgs (rest reuse ambassador/sultan/vanilla masks).
Skipped on purpose: tents, palisades, stalls, props, ground, palace glass textures, noisy IAAM tiling
textures (herrenhaus, zimmermann, bakery, copper smelter, toolmaker), vanilla-derived textures whose vanilla
original has no mask (Kahina, harbor_04/05, fuel station, labs, museum).

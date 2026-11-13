# terrain_bake

Bakes MODEL transform Y offsets (and tilts) into the `.rdm` vertices so a building can use
`ADJUST_TO_TERRAIN_HEIGHT` 1 on every model material.

Why: with terrain adaption on, the engine drops a MODEL's transform Y. Roofs and domes that the IAAM/1404
conversions lower with `Position.y` floated above their walls (embassy, 2026-11-10). Vanilla combines
adaption freely with x/z offsets, yaw and scale, but never with tilt and only with tiny Y offsets.

- Yaw-only model: `v.y += Ty / Scale`, transform `Position.y` → 0. Normals untouched.
- Tilted model: `v = R(s·v) + (0, Ty, 0)` with N/G/B rotated; transform → (Tx, 0, Tz), identity, Scale 1.
- Mod mesh whose every use needs the same bake: baked in place. Otherwise each variant gets a copy
  `<name>_bN[_lodK].rdm` next to it; vanilla meshes are copied into `<cfg dir>/rdm/`. All `_lodN` siblings follow.
- Then every MODEL material in that cfg gets `ADJUST_TO_TERRAIN_HEIGHT` 1.
- Scope: land building cfgs under `data/graphics/buildings` and `1404_import` that are not FILE children.
  Water-edge models (harbour, kontor, quay, trading company, lighthouse, river slot, canals) are excluded,
  skinned meshes are skipped (their cfg stays as is). Decals, FILE/LIGHT/PARTICLE/PROPCONTAINER flags stay as authored.

Scripts (Node, no packages):
- `node survey.js` – what would need baking.
- `node bake.js [--only <substring>] [--apply]` – dry run by default; prints each mesh with its max world-space error.
- `node loadcheck.js -f list.txt` – loads meshes with both rdm4-bin builds (short temp copy).
- `node verify.js` – top-level land cfgs still at 0 or still offset; sub-cfgs whose ADJUST count differs from the index.
- `node subcheck.js <sub.cfg>... [--refs]` – where FILE entries place a sub-cfg.

Run 2026-11-10: 44 cfgs, 117 mesh files (76 in place, 41 copies), max error 2 mm (half floats). Only
`heavy_orient_07` (skinned agriculture vehicle) was skipped.

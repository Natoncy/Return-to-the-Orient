# lighthouse_foundation

Closes the four foundation gaps on the lighthouse platform (all 4 stages, 2026-11-09).

- `fix_corners.js <stufe04/rdm> <outDir>`: back corners. In `lighthouse_lod1_walk.rdm` the sea-wall corner verts
  (164/165, 178/179) move out to the terrace corner (x ±3.84, z −0.40, world); two +z quads (x ±3.50..±3.84,
  y 0.34..0.84) close the corner above the terrace, UV-mapped like the terrace front faces 74/64.
  In `lighthouse_prop_walk_lod0.rdm` the corner pillar / cornice outer verts move to the same corner.
  The two walk meshes are identical in all four stufe*/rdm folders; copy the outputs into each.
  Mesh local = world + (0, 0.5, 0.4) (the stage MODEL transform).
- `fix_stairs.js <stairs_bridges/occident/rdm> <outDir>`: stair sides. Writes `*_px_lod0.rdm` (row end at
  x −0.24, model +x / game left) and `*_nx_lod0.rdm` (row end at x −1.73, model −x / game right) from the
  originals, moving each half-mesh's outer side plane onto the deck-opening / landing edge of the walk mesh.
  Tris 66–71 (loose bits next to the side plane) keep their verts, or they flip.
  Used via `okzident_stairs_1_var2_px.cfg` / `_nx.cfg`; the middle piece keeps the original cfg.
- `rdmedit.js`: single-Meta stride-24 rdm load/save with tail pointer fix-up. `stairxf.js`: stair piece
  local ↔ stage transforms (lateral/along axes of the rotated stair row).

Both scripts start from the original (pre-fix) meshes; re-running them on their own output moves nothing twice
only for the stairs (they read the unsuffixed originals). For the corners, run on `git show` copies of the old walk meshes.

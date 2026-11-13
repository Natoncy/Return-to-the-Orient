# rdm_compact

Removes hidden geometry from static single-Meta `.rdm` meshes by rebuilding them, instead of collapsing
triangles. Collapsed (i,i,i) or zero-area triangles are invisible normally, but the selection/hover outline
draws each one as a floating speck.

- `collect.js <modRoot> <cfg>...` lists every .rdm reachable from the cfgs (follows FILE sub-cfgs, adds `_lodN` siblings).
- `tinytris.js <rdm>...` counts degenerate, zero-area triangles and orphan vertices.
- `rebuild.js in.rdm out.rdm [tex0.png,...]` drops degenerate and zero-area triangles (plus, with textures,
  fully transparent ones) and unused vertices, then fixes the IB and tail pointers. Pointers are only searched
  on 4-byte steps from each section start; a byte-wise scan corrupted `n_small_pool_lod0`.
- `samegeo.js old.rdm new.rdm` proves the new file draws exactly the old visible triangles.
- `dropmodel.js file.cfg name.rdm...` removes MODEL blocks whose mesh became empty. rdm4-bin panics on an
  empty MeshInstance, so never ship an empty mesh.

Also check each rebuilt mesh loads in both rdm4-bin builds. The VS Code extension build rejects long paths,
so copy the file to a short path first.

`ZERO=area` (default) also drops zero-area slivers. `ZERO=point` drops only triangles whose three corners share
one position. Use `point` on anything that might be cloth: `n_corsair_harbour_building_03_cloth.rdm` is
entirely zero-area at rest.

- `scanmod.js <modRoot> [filter]` reports every mesh with degenerate or zero-area triangles and how many cfgs use it.
- `batch.js <modRoot> <list> <workDir>` is a dry run: backup, rebuild, samegeo and both rdm4-bin loads per mesh.
  It installs nothing; copy `<workDir>/new/...` over the mod files yourself.
- `danglingrefs.js <modRoot> [filter]` lists cfg FileName references whose file is missing.

Done 2026-10-24:
- the lighthouse monument, all four stages (ZERO=area);
- sbm, sultanspalace, palm_leaves_module_orient, obelisk, citywall, silo, market_stalls and tent04 (ZERO=point):
  72 meshes, about 27.7k triangles. The second quay-wall MODEL in
  `sbm/.../kaimauer/orient/s_footbridge_wood01_4x1.cfg` was empty and has been dropped.

Not touched: a handful of degenerates in vanilla-derived meshes (airship platform, harbor_orient_04, heavy_orient_07,
kontor LODs, world map kontor), and the unused holzsteg pier.

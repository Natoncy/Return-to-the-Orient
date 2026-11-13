# Lighthouse construction feedback

Writes the feedback files (`.fc`) of the three Oriental Lighthouse construction stages,
`stufe01/leuchtturm01.fc` … `stufe03/leuchtturm03.fc`. The game loads an `.fc` next to the `.cfg` of the same name,
so no asset changes are needed. The finished lighthouse (`stufe04`) has none, like the finished Grand Mosque.

Plain Node.js, no packages. Meshes and textures come from `../ornament_icons/scene.js` and its cache.

## Use

- `node gen.js` writes the files into `out/` (git-ignored) to review them first.
- `node gen.js --write` writes them into the stage folders.
- `--fresh` re-renders the stage height maps. They are cached in `out/`, so use this after any stage model change.
- Every run writes `out/stageN_dummies.png`: a top view of the stage with a 1 m grid (red = model axes) and one
  diamond per dummy, with a black tick showing the direction the worker faces. Colours: yellow Shoveler, cyan Sweeper,
  magenta Hammerer_UP, orange Hammerer_Down, greens Crowd_01/02, white foreman.

## How it is built

- **Actors** are the Grand Mosque's (`s_sultan_mosque_unfinished_00.fc`), copied byte for byte: all three mosque stages
  share one actor block, and only their dummies differ. That block is a trimmed vanilla World's Fair stage
  (`monument_01_01.fc`). Its actors whose dummies the mosque dropped (unloaders, carriers, crane crew) stay inert here too.
- **Dummies** are new. Group names, group Ids and the `_N` dummy Ids are kept from the mosque, because the actors
  reference `Shoveler_0`, `foreman_0`, `Crowd_01_0` and the others by name and Id. Fewer dummies per group is fine: each
  group actor multiplies by its group's dummy count.
- **HeightAdaptationMode 0** (keep the dummy's y) on every dummy, as on the decks of vanilla harbour buildings. The
  mosque's mode 1 would snap workers to the terrain, which is the sea floor under the lighthouse.
- **Placement:** `STAGES` in `gen.js` lists approximate spots per stage and group as `[x, level, z, yaw]`. Each spot is
  snapped to the nearest free floor at that level within 0.45 m: nothing above the floor within the worker's radius,
  and at least 70% of that radius on the floor. Slatted scaffold decks have gaps between the boards.
  Levels: deck 0.83, side terraces 0.34, gallery 5.63, stage 3 top floor 8.96, stage 1/2 scaffold tops 2.58–3.72.
- **Facing:** a unit faces its dummy's local +x, which is (cos a, 0, −sin a) for yaw a. `'wall:<deg>'` faces the nearest
  geometry at least 0.6 m higher within ±45° of `deg`, which the standing hammerers use. `'tower'` faces the model centre
  (crowds, foremen). An omitted yaw is seeded random. `RotationY` is written as −yaw, the editor convention.
- Scale 0.5 / crowd 0.45 come from the actors, as on the mosque. Both monuments are 1404 imports.

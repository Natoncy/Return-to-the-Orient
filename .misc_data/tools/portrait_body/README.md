# Portrait lower bodies

Generates the static lower body of the Nomad (`resident_orient_tier01`) and Envoy (`resident_orient_tier02`) portraits.
Both are submods, `shared_portraits/Natoncy_portrait_1404_<nn>_nomad` / `_envoy` (ModIDs still `natoncy_player_portrait_1404_…`), like the 1404 portraits (`../portrait_1404`, Submods).
`build.sh` and `patchcfg.js` find them by name, so a renumbering does not break them.
Each body is a second, unanimated MODEL in the portrait cfg. It continues the bust straight down from its bottom edge
to hip level (mesh z 150 / 140). The bust mesh and its animations are not touched.

## Use

`bash build.sh` (Git Bash, Node, `C:\tools\texconv.exe` and `annotex.exe`, rdm4-bin from the Anno modding tools extension).
It exports the busts, builds the meshes, bakes the textures, converts everything and copies the results into the mod.
The output is deterministic, so an unchanged run reproduces the shipped files byte for byte.
`prevhi.png` shows both portraits rendered from the front and from the game's ~25° yaw.

`patchcfg.js <mod>` adds the body MODEL to both cfgs and grows the cfg/ifo bounds down to y = -6.6.
It is a one-time step on a clean cfg and refuses to run twice.

The Envoy cfg's ORIENTATION_TRANSFORM `Position.y` was lowered from 0 to −0.78, in both its models, so its eyes sit at
the Nomad's eye height (world y 2.95) in the profile screen. Before, the Envoy stood ~77 px higher there.
`patchcfg.js` copies the bust's transform, so redo that change after re-patching a clean cfg.

## How it works

- `body.js` finds the bust's bottom edge: the boundary edges that carry the lowest surface point when the bust is cut
  with half-planes around the body axis (`rimCuts` in rim.js).
  - Both busts end in a 7-vertex edge (Nomad −108°…107°, Envoy −117°…116°). The back is open, like the bust's.
  - Columns are those vertices plus points every ≤3.5 units along each edge between them.
  - Each column drops straight down. Rows 0..30 are the rows; row 0 is the bust's own edge vertices.
  - Each quad is split along alternating diagonals (checkerboard).
  - A tuck row 3 units up behind the bust's surface hides any crack.
  - The seam row uses the bust's normals, and the wall's own horizontal normals take over from row 2.
  - A fan closes the bottom.
- UVs: u is the arc length along the edge from the front centre, and v is the drop below the edge.
  Because the wall is a straight extrusion, the map has no shear or stretch at all (about 3.2–3.3 px per unit).
- `bake.js` rasterizes the body in UV space and computes each texel from its position on the body. It uses colour
  ramps learned from the bust texture, fold shading and fine grain taken from the bust's fabric.
  The bust's rim colours are carried a few units down so the seam disappears.
  - Nomad: brown robe. Its folds continue the bust's own folds: the robe is sampled 3–6 units above the rim every
    0.4 units along the edge (`cutUV` in rim.js, restricted to the rim triangle's garment piece).
    That profile is carried down with a slow sway and changing depth, and new folds start further down.
    Short streaks and two grain layers from the robe texture keep it about as crisp as the bust robe:
    the mean |Laplacian| is ~2.0–2.3 vs 1.1–2.2 on the bust, measured unlit by `node sharp.js`.
    A keffiyeh-cloth sash runs at z 101–119 (`CFG['01'].band`).
  - Envoy: the cape drape keeps going below the brooch (`hem()`).
    The kaftan has gathered horizontal folds (`hfolds`). `KAFTAN_LIFT` = 0.26 matches the brightness of the shirt on the bust
    (lum 124 vs 126, measured unlit).
    Four braids use the frieze strip at the bottom of the bust texture, turned vertical and placed by arc length (`arcAt`).
    The frieze is darker than the braids on the bust, so `braidTone` maps its colours onto the bust braids' mean and spread
    (spread ×1.3 for a crisper lattice). The bust braids are sampled just above the rim.
    The same frieze forms the belt at z 94–108.
- `node silh.js` prints the bust and body silhouette half-widths per height, from the front and from the game's yaw.
- `icon.js` renders the 256px player-portrait picker tiles from bust + body. The output is
  `data/ui/2kimages/main/profiles/orient_portrait_{nomad,envoy}.png` plus `_0.._3.dds`.
  - Framing follows the vanilla profile icons: head at the top, shoulders to the edges, cut at the chest, yaw −14°.
  - It supersamples 4×, keeps a transparent background, and bleeds colour into it for clean mips.
  - A mesh with `alphaTest` set (e.g. 128) has the texels below that alpha cut out, as the game does.
    The Nomad and Envoy tiles do not set it. `../portrait_1404` does, for the 1404 hair and feather cards.
  - The DDS sizes match the vanilla fingerprint: 87556 / 22020 / 5636 / 1540.

  The portrait assets 1404000154/155 use these tiles as `IconFilename`. Each submod's assets.xml defines its asset and
  adds it to CreateGameScene (500769) `Portraits`. The main mod still uses both GUIDs: the Nomad and Envoy resident
  profiles (`profiles/assets_orient_nomads.xml`, `_envoys.xml`) and the Envoy quest decisions. So these two submods are required.

## Portrait test quests

The test quests were used to check the portraits in game and then removed again (2026-10-04); they are not in the mod.
Re-run the script to bring them back.

`node testquests.js <mod>` writes `assets_includes/test_quests/` (GUIDs 1404003700–704 Nomad, 1404003710–714 Envoy)
and their English/German entries in `texts_*.xml`, replacing any earlier entries in 1404003700–719.
Each test is one delivery quest modelled on vanilla 102187 (`A7_QuestDeliveryObject`):
- It starts immediately (`QuestStart`, no starter object). The giver is the Nomads / Envoys profile, so the notifications
  and the quest log show the portrait.
- The objective is 5t of Dates (1888999749, Shared_Date) delivered to any of your trading posts
  (`ConditionObjectPlayerKontor`), with the vanilla objective text 13014.
- Voiced lines: neutral on start, positive on delivery, negative when aborted from the quest log.

Start them from the console with `ts.Quests.StartQuestForCurrentPlayerNet(1404003700)` (Nomad) or `(1404003710)` (Envoy).
To remove them: delete the folder, its line in `assets_includes/assets__index.xml`, and the 10 text entries per language.
The script does not add that include line; add `<Include File="test_quests/assets__index.xml" />` after the `story` line yourself.

Mesh space as in the busts: +Z is down, −Y faces the viewer. The cfg ORIENTATION_TRANSFORM is the bust's, shared by both models.

An earlier version shaped a torso with arms (superellipse + arm tubes, widths tuned to user sketches).
The user replaced it on 2026-10-04 with this plain extrusion.

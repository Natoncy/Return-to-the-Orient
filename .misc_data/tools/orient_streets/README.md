# Orient street skins

Desert-coloured copies of the two Enbesa street atlases, so Orient roads stop looking olive/green.

| Street | Asset | Vanilla source | Mod cfg |
|---|---|---|---|
| Desert Road | `1404000845` | `data/dlc06/graphics/effects/street/africa_street_01` | `data/graphics/buildings/orient/street/desert_road/desert_road.cfg` |
| Fast street (stone) | `1404005165` | `data/dlc06/graphics/effects/street/africa_street_02` | `data/graphics/buildings/orient/street/stone_street/stone_street.cfg` |

## Use

`node build.js "<mod root>" [vanilla root, default D:/anno_data/1800]` (Node, `C:\tools\texconv.exe`; reuses `../canal_orient/png.js` and `lab.js`).
It rewrites `maps/<name>_diff_0.._4.dds` and copies the vanilla `.cfg`/`.ifo`/`.bfg`, changing only the diffuse path.
Normal, height and metal maps stay vanilla (referenced from dlc06).

## What changes (Lab/LCh, parameters in `STREETS`)

- The yellow-green hue band (vanilla sits at hue 75–105°, a* ≈ 1–3) is pulled toward sand (hue 69/72; Orient sand beach_06 is Lab 64/4/18).
- Lightness +9 (road) / +6 (stone), chroma +4.
- Desert road: the saturated olive fringe (dry grass, C > 16) becomes a light sand drift.
- Stone street: moss in the joints (C > 9) becomes pale, low-chroma drifted sand; cobbles and kerbs read as sandstone.
- Alpha untouched. `_k.dds` are box halvings of `_0`, encoded `-sepalpha -f BC7_UNORM -m 0`.

`preview_desert_road.png`, `preview_stone_street.png`: vanilla (left) vs Orient (right), over Orient sand.
The colour moves live in `recolour.js`; `../canal_orient/build.js` reuses them for the noria crossing road decals (`preview_crossings.png`: desert road crossing on top, fast street crossing below). Bridges keep their vanilla textures.

# Embassy reskin (2026-11-15)

"Less dirty, more official": walls → clean cream limestone (stains + grime low-pass removed, crisp mouldings kept),
dome → Old World verdigris copper (vanilla `institution_03_diff` copper sheet) with gilded frieze/rivets,
vault roofs → Orient Iznik cobalt/turquoise on white glaze. Glass, openings, gilding and the door are kept.

Run from a work folder:
1. `src/`: the pre-reskin `_0.dds` of the embassy maps as PNG (git `HEAD~` of `oriental_embassy/maps`, texconv `-ft png`).
2. `owfull/institution_03_diff_0.png`: `D:\anno_data\1800\...\public\institution_03\maps\institution_03_diff_0.dds` → png (1536²).
3. `node uvmap.js` (texel → face map, `uv_*.bin`), `python reskin.py` (writes `out/`), `node preview.js name ov.json` to check.
4. Encode: `texconv -sepalpha -f BC7_UNORM -m 0`, copy over the `_0.dds` (the `_1`/`_2` are .lnk).
Changed: indian_warehouse_diff_512, s_sultan_residence_dome_diff + _norm (gloss), s_ambassador_house03_roof_diff + _norm (gloss).

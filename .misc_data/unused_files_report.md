# Unused files in `data/`

Generated 2026-10-27 on `develop` (8f2cca28). 3 of 20,719 files (0.0 MB of 4.3 GB) are never loaded by the game.

## How it was checked

- Roots: every `.xml` that patches a vanilla path (assets, texts, gui, `export.bin.xml`, `world_map_01.fc.xml`), every `.lnk`, every file that overrides a vanilla path (vanilla list from `D:\anno_data\1800`).
- Followed from there: `<Include>`s (XML comments stripped), every `data/...` path in loaded XML / cfg / ifo / prp / fc / lnk, across the main mod and all submods.
- Implicit companions: `x.cfg` → `x.ifo` `x.fc` `x.bfg`; `x.prp` → `x.brp` `x.ifo`; `x_lod0.rdm` → all `x_lodN.rdm`; texture `x.psd/.png` → `x_N.dds` + `x.png`; `.a7m` → its island folder; `.a7t` → `.a7tinfo/.a7te`; `NNN.bnk` → bank id in XML.
- Branches `v0.7.0` and `ai_settlement` (unmerged) reference none of these files.
- Not counted as unused: the ~1,000 source `.png` copies next to used `_N.dds` (repo convention; the game never reads them either).

## By file type

| type | files | size |
|---|---:|---:|
| .xml | 3 | 0.0 MB |

## Never-loaded working files

- `.glb` (27) / `.obj` (3): Blender / converter exports next to rdm meshes.
- `.cf7` (42): feedback sources; every one has its compiled `.fc` beside it.
- `camel_fields/production_colony02_03_field_0[1-4].xml`: fc dumps. The mod loader treats them as patches of non-existent files.
- `sound/generatedsoundbanks/**/*.json|.txt|.xml` (27): Wwise metadata next to the banks. The `.xml` ones are also seen as patches.
- `icons/items/unused*.png` / `unussed *.png` (8): spare item icons.

## Unused XML includes

- `assets_includes/production_chains/assets_orient_alembics_chain.xml`: its `<Include>` is commented out.
- `assets_includes/buildings/production/export/assets_export_orient_05_elephant_hunting_cabin_africa.xml`: its `<Include>` is commented out.

## Folders where nothing is used (0, 0.0 MB)

Mostly `1404_import` originals whose meshes/textures were later copied into a `buildings/orient/...` folder; the cfgs point at the copy.

| size | files | folder |
|---:|---:|---|

## Folders with unused leftovers (3, 0.0 MB)

| unused size | unused / all | folder |
|---:|---:|---|
| 0.0 MB | 1 / 11 | `data/config/export/main/asset/assets_includes/buildings/production/export` |
| 0.0 MB | 1 / 31 | `data/config/export/main/asset/assets_includes/production_chains` |
| 0.0 MB | 1 / 51 | `data/config/export/main/asset/assets_includes/asset_pools` |

## Asset GUIDs nobody references

Defined in the main mod and not mentioned by any other loaded file (texts excluded). Most are fine because the engine finds them by other means:
- **Fine:** Text in text groups (monument fluff), RandomIsland / FertilitySet / MineSlotSet (picked by region), Kahina VisualObjects (placed by the island file), triggers, quest pool, population group, herd.
- **Worth a look:** `1404000153` ProductList *AllGoodsUnlock_OrientSort_WithoutOil*, `1404000975` Kahina Orient profile, texts `1404000947` (caftan item fluff), `1404000182` (*LevelUp_NewAge_Title_Orient02*), `1404000595` (pearl necklace recipe desc), 10 envoy AudioTexts `1404000543`–`561`.

<details><summary>Full list</summary>

```
95 Text  (self-starting / UI, usually fine)
    1404000622 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000623 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000624 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000625 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000626 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000627 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000628 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000629 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000630 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000631 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000632 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000633 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000634 Fluff General Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000636 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000637 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000638 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000639 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000640 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000641 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000642 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000643 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000644 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000645 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000646 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000647 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000648 Fluff General Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000650 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000751 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000652 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000653 Fluff General Mid   [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000654 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000655 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000656 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000657 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000658 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000659 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000660 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000661 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000662 Fluff General Mid  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000664 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000665 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000666 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000667 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000668 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000669 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000670 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000671 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000672 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000673 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000674 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000675 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000676 Fluff General High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000678 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000679 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000680 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000681 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000682 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000683 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000684 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000685 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000686 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000687 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000688 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000689 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000690 Fluff General Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000693 Fluff Small Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000694 Fluff Small Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000697 Fluff Small Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000698 Fluff Small Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000700 Fluff Small Medium  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000701 Fluff Small Medium  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000704 Fluff Small High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000705 Fluff Small High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000708 Fluff Small Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000709 Fluff Small Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000712 Fluff Medium Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000713 Fluff Medium Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000716 Fluff Medium Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000717 Fluff Medium Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000720 Fluff Medium Medium  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000721 Fluff Medium Medium  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000724 Fluff Medium High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000725 Fluff Medium High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000728 Fluff Medium Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000729 Fluff Medium Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000732 Fluff Large Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000733 Fluff Large Very Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000736 Fluff Large Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000737 Fluff Large Low  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000740 Fluff Large Medium  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000741 Fluff Large Medium  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000744 Fluff Large High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000745 Fluff Large High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000748 Fluff Large Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
    1404000749 Fluff Large Very High  [data/config/export/main/asset/assets_includes/monument_events/assets_fluff_text.xml]
24 FertilitySet
    1404009509 Set Orient High 1  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404009510 Set Orient High 2  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404009511 Set Orient High 3  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404009512 Set Orient High 4  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404009513 Set Orient High 5  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404009514 Set Orient High 6  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404009515 Set Orient High 7  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404009516 Set Orient High 8  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_high.xml]
    1404000009 Set Orient Low 1  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404000378 Set Orient Low 2  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404001146 Set Orient Low 3  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404001147 Set Orient Low 4  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404001148 Set Orient Low 5  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404001149 Set Orient Low 6  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404001150 Set Orient Low 7  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404009500 Set Orient Low 8  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_low.xml]
    1404009501 Set Orient Medium 1  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
    1404009502 Set Orient Medium 2  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
    1404009503 Set Orient Medium 3  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
    1404009504 Set Orient Medium 4  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
    1404009505 Set Orient Medium 5  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
    1404009506 Set Orient Medium 6  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
    1404009507 Set Orient Medium 7  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
    1404009508 Set Orient Medium 8  [data/config/export/main/asset/assets_includes/fertilities/sets/assets_set_orient_medium.xml]
20 VisualObject
    1404008900 3rd_party_08_kontor_hall_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008901 3rd_party_08_kontor_front_02_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008902 3rd_party_08_kontor_front_03_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008903 3rd_party_08_kontor_main_small_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008904 3rd_party_08_kontor_tower_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008905 3rd_party_08_kontor_tower_small_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008906 3rd_party_08_hall_01_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008907 3rd_party_08_hall_02_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008908 3rd_party_08_kontor_bridge_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008909 3rd_party_08_kontor_hall_endpiece_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008910 3rd_party_08_platform_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008911 3rd_party_03_gate_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008912 3rd_party_03_chimney_01_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008913 Quay_System_2_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008914 fountain_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008915 Statue_02_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008916 Pavillon_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008917 3rd_party_06_crane_01_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008918 3rd_party_06_platform_03_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
    1404008919 3rd_party_05_millwheel_kahina_orient  [data/config/export/main/asset/assets_includes/buildings/assets_kahina_orient.xml]
20 RandomIsland
    1404000189 orient_d_01  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_01.xml]
    1404000190 orient_d_02  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_02.xml]
    1404000191 orient_d_03  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_03.xml]
    1404000192 orient_d_04  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_04.xml]
    1404000193 orient_d_05  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_05.xml]
    1404000194 orient_d_06  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_06.xml]
    1404000195 orient_d_07  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_07.xml]
    1404000196 orient_d_08  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_08.xml]
    1404000197 orient_d_09  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_09.xml]
    1404000198 orient_d_10  [data/config/export/main/asset/assets_includes/islands/assets_orient_d_10.xml]
    1404001026 orient_l_05  [data/config/export/main/asset/assets_includes/islands/assets_orient_l_05.xml]
    1404001027 orient_l_06  [data/config/export/main/asset/assets_includes/islands/assets_orient_l_06.xml]
    1404001028 orient_m_02  [data/config/export/main/asset/assets_includes/islands/assets_orient_m_02.xml]
    1404001029 orient_m_04  [data/config/export/main/asset/assets_includes/islands/assets_orient_m_04.xml]
    1404001030 orient_m_05  [data/config/export/main/asset/assets_includes/islands/assets_orient_m_05.xml]
    1404001031 orient_m_09  [data/config/export/main/asset/assets_includes/islands/assets_orient_m_09.xml]
    1404000187 orient_s_01  [data/config/export/main/asset/assets_includes/islands/assets_orient_s_01.xml]
    1404000188 orient_s_02  [data/config/export/main/asset/assets_includes/islands/assets_orient_s_02.xml]
    1404000599 orient_s_03  [data/config/export/main/asset/assets_includes/islands/assets_orient_s_03.xml]
    1404000600 orient_s_05  [data/config/export/main/asset/assets_includes/islands/assets_orient_s_05.xml]
18 ?
    1404003905 Riverslot Orient  [data/config/export/main/asset/assets_includes/buildings/production/assets_river_orient_01_agate_collector.xml]
    1404003913 Riverslot_workarea Orient  [data/config/export/main/asset/assets_includes/buildings/production/assets_river_orient_01_agate_collector.xml]
    1404002040 Orient | Building Generic Worker M Normal  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002041 Orient | Building Generic Worker M Muscular  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002042 Orient | Building Generic Worker F Normal  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002043 Orient | Building Generic Worker F Large  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002044 Orient | Building Street Feedback Worker  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002045 Orient | Building Tier 01 Large Female  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002046 Orient | Building Tier 01 Normal Female  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002047 Orient | Building Tier 01 Normal Male  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002048 Orient | Building Tier 01 Muscular Male  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002049 Orient | Building Tier 01 Child  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002050 Orient | Building Tier 02 Large Female  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002051 Orient | Building Tier 02 Normal Female  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002052 Orient | Building Tier 02 Normal Male  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002053 Orient | Building Tier 02 Muscular Male  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002054 Orient | Building Tier 02 Child  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
    1404002055 Orient | Building Traveling Vendor  [data/config/export/main/asset/assets_includes/units/assets_inhabitant_building_feedback.xml]
10 AudioText
    1404000543 AudioText Play_residents_6608760: Why should more Envoys move here? Without adequate Provisions...  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000545 AudioText Play_residents_6608761: Many of us are simply used to the luxury of the Sultan&apos;s palace!  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000547 AudioText Play_residents_6608762: If you wish to attract more Envoys to your City, you will have to offer them much more!  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000549 AudioText Play_residents_6608763: In Envoy circles it is said that the Supplies in your City would be too inadequate to allow one to live here comfortably...  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000551 AudioText Play_residents_6608764: A little more affluence, and more Envoys are sure to move in here, inshallah!  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000553 AudioText Play_residents_6608765: Many Envoys do not want to come and live in your City; they say it&apos;s too provincialâ¦ Wellâ¦  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000555 AudioText Play_residents_6608766: A few Houses won&apos;t be enough to attract more Envoys here!  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000557 AudioText Play_residents_6608767: Don&apos;t you think you should offer People like me something more?   [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000559 AudioText Play_residents_6608768: I am afraid that Envoys will refuse to move here until you have provided all the necessary comforts!  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
    1404000561 AudioText Play_residents_6608769: The demands of many Envoys have increased even moreâ¦  [data/config/export/main/asset/assets_includes/audio/voices/audio_text/assets_audio_text_envoy.xml]
8 MineSlotSet
    1404001294 Orient Set 01 (Balanced)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_01_balanced.xml]
    1404001295 Orient Set 02 (Silver, No Oil)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_02_silver_no_oil.xml]
    1404001296 Orient Set 03 (Oil, No Silver)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_03_oil_no_silver.xml]
    1404001297 Orient Set 04 (Oil &amp; Silver, No Clay)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_04_oil_silver_no_clay.xml]
    1404009517 Orient Starter Set 01 (Balanced)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_starter.xml]
    1404009518 Orient Starter Set 02 (Balanced Clay Focus)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_starter.xml]
    1404009519 Orient Starter Set 03 (Balanced Silver Focus)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_starter.xml]
    1404009520 Orient Starter Set 04 (Balanced Oil Focus)  [data/config/export/main/asset/assets_includes/fertilities/mine_sets/assets_mine_set_orient_starter.xml]
5 Trigger  (self-starting / UI, usually fine)
    1404001001 Enter Orient Session  [data/config/export/main/asset/assets_includes/triggers/assets_enter_session.xml]
    1404004104 Intermediate Orient Base  [data/config/export/main/asset/assets_includes/triggers/assets_intermediate_orient_base.xml]
    1404007025 orient lighthouse retire island lock triggers  [data/config/export/main/asset/assets_includes/triggers/assets_lighthouse_unique.xml]
    1404000855 SessionExit Music  [data/config/export/main/asset/assets_includes/triggers/assets_music_triggers.xml]
    1404000860 Exit to Menu Register  [data/config/export/main/asset/assets_includes/triggers/assets_music_triggers.xml]
1 Herd
    1404000174 Herd Dromedary  [data/config/export/main/asset/assets_includes/animals/assets_herd_dromedary.xml]
1 Profile_3rdParty
    1404000975 Third_party_08 (Madame Kahina Orient)  [data/config/export/main/asset/assets_includes/assets_profile_kahina_orient.xml]
1 PopulationGroup7
    1404000152 Orient population  [data/config/export/main/asset/assets_includes/population_groups/assets_orientals.xml]
1 QuestPool  (self-starting / UI, usually fine)
    1404001272 RQ_AllQuest_ParentPoolOrient  [data/config/export/main/asset/assets_includes/quests/pools/assets_all.xml]
```

</details>

## All unused files

Also as a plain list in `unused_files.txt`.

<details><summary>3 paths</summary>

```
data/config/export/main/asset/assets_includes/asset_pools/assets_asset_pool_orient_ivory.xml
data/config/export/main/asset/assets_includes/buildings/production/export/assets_export_orient_05_elephant_hunting_cabin_africa.xml
data/config/export/main/asset/assets_includes/production_chains/assets_orient_alembics_chain.xml
```

</details>

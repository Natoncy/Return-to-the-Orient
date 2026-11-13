# hitbox_fit

Finds buildings whose `.ifo` IntersectBoxes (mouse selection) miss part of the model and adds fitted boxes.

1. `grep -rhoi "data/graphics/[^<\"]*\.cfg" data/config shared_misc --include=*.xml | tr A-Z a-z | sort -u > refs.txt` (cfgs used by assets)
2. `node scan.js` -> `scan.json` (model height vs box top for every ifo under `data/`)
3. `node fitall.js report` -> share of the model surface (inside the BuildBlocker, above 5 cm) outside every box
4. `node fitall.js apply list.txt` -> appends boxes, grows the BoundingBox. Existing boxes are kept, so it never shrinks the clickable area.
   `node fitall.js one <cfg...>` reports single files (vanilla paths work too).

Fit: 0.25 m slabs, 0.5 m-grid clusters per slab (towers apart from the body stay apart), vertical merge of similar
rects, then a 3D merge while the merged box is at most 30 % air. Boxes are clamped to the BuildBlocker rectangle.
Skipped on purpose (2026-11-03): farm fields (flat in vanilla) and the Kahina island objects (no boxes in vanilla).
`list.txt` = the 136 files fixed on 2026-11-03.

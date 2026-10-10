# Unit texture mask workflow

Hand-painted region masks for the Orient unit atlases. These replace the automatic
cloth/skin/hair detector, which kept mislabelling things (faces, hair, flat motif panels)
because no local image statistic reliably separates them.

## Run the painter

From `.misc_data`:

```bash
npx --yes http-server -p 8765 -c-1
```

Then open <http://localhost:8765/tools/texture_mask_painter.html>

It must be served over http, not opened as a `file://` path — the folder-write API the
tool uses for saving is only available in a secure context.

On first load, click **Choose masks folder…** and pick `.misc_data/mask_work/masks`.
Saves then go straight into the repo. If you skip that, Save falls back to downloading
the PNG and you move it in yourself.

## Viewing the result

<http://localhost:8765/tools/unit_viewer.html> lines all the units up together so the set
can be judged as a crowd rather than one atlas at a time.

- **Orient / Vanilla / Split A/B** — swaps the textures instantly. Split alternates the two
  across the lineup, which is the quickest way to see whether the new set still reads as a
  coherent population.
- **Game / Mid / Close** — Game places the camera so a unit is about 42 px tall, which is
  roughly Anno's default zoom. That is the view that matters for judging motif scale; a
  pattern that looks right at Close can vanish entirely at Game. The panel always states
  the pixel height actually in use.
- **show** filters to women, men, children or a tier.
- **Reload textures** re-reads `out_png` without a page refresh, so you can leave it open
  beside `reskin_from_masks.ps1` and iterate.
- Unlit by default, for the same reason as the painter: you want the atlas's real colours.

Body meshes in bind pose only — hats, props and carried equipment are separate meshes and
are not shown. For those, build the in-game test ornament.

## Labels

| Label | Colour | What the pipeline does with it |
|---|---|---|
| Cloth | green | motif replacement + Orient palette tint |
| Skin | orange | value/hue grade only, no motif |
| Hair | blue | left alone |
| Leather/Metal | yellow | light grade, no motif |
| *unassigned* | black | left alone |

## Painting

Each texture opens with an **auto-seed** from the old detector, so you are correcting
rather than starting blank. It is wrong in predictable places — faces, hair, and large
flat garment panels — which is the point of the tool.

- **Wand** is the fastest way to grab a flat garment panel; raise *Tol* for gradients,
  untick *contiguous* to take every similar pixel in the atlas at once.
- **Model** panel on the right shows the body mesh wearing either the texture or the
  mask, so you can tell which UV island is a sleeve and which is a hem. Mask view updates
  live while you paint.
- The model is the body mesh in bind pose. Props, hats and equipment are separate meshes
  and are not shown.
- **F / B / L / R** place the camera; **Flip 180°** turns the model itself.

### If a model looks like the texture does not fit it

It is facing away from you. The meshes are not consistently oriented, so the default
camera shows some of them from behind: you get hair where the face should be, which reads
exactly like a broken UV mapping.

It is not broken. That was checked properly — a UV checker renders as a clean, upright
grid, the head island's measured UV box lands precisely on the head, and the mesh/texture
pairing in the cfg matches vanilla byte for byte. Turn the model round and everything
lines up.

Press **Flip 180°**. The choice is remembered per texture in browser storage. To make it
permanent for everyone, add the texture name to the `$yaw` table in `export_models.ps1`;
three child meshes are already in there.

Do not trust a dark or black model as evidence of anything either — see below.

### Known pitfalls in the viewer

- **Black / untextured model.** The preview canvas is resized to match each atlas, and the
  GPU texture has to be reallocated when that size changes, otherwise WebGL logs
  `glCopySubTextureCHROMIUM: Offset overflows texture dimensions` and the model renders
  black. Handled by disposing the texture on size change — if it ever comes back, that is
  the first thing to check in the console.
- **A control appears to do nothing.** The preview pane throttles `requestAnimationFrame`
  when it is not focused, so the view only repainted when something else forced a redraw.
  Every view action now renders explicitly.
- The preview is **unlit** on purpose, so you judge the atlas's real colours and shading
  never masks a problem.

## Copying a mask between textures

Most of these atlases share a mesh, so one painted mask covers several textures. The
sidebar tags each with its mesh group (`M1`, `M2`, …) — **same number means identical UVs
and a mask transfers exactly**. Ten groups cover all twenty textures, so there are only
ten masks to actually paint:

| Group | Textures |
|---|---|
| M1 | tier_01_large_f_01, tier_01_large_f_02 |
| M3 | tier_01_muscular_m_02, tier_02_muscular_m_01, tier_02_muscular_m_02 |
| M4 | normal_f_01, normal_f_02 |
| M5 | tier01_normal_m_01, tier01_normal_m_01_var, tier01_normal_m_02 |
| M6 | tier_01_small_f_01, tier_02_small_f_01 |
| M7 | tier_02_large_f_01, tier_02_large_f_02 |
| M8 | tier_02_normal_f_01, tier_02_normal_f_02 |
| M9 | tier02_normal_m_01, tier02_normal_m_02 |
| M2, M10 | one texture each |

Two ways to copy:

- **Copy** / **Paste** (`Ctrl+C` / `Ctrl+V`) — clipboard for the mask currently open.
- **copy from…** dropdown — pulls another texture's *saved* mask straight off disk, so
  you do not have to open it first. Same-mesh options are listed under “same mesh — exact
  fit”, everything else under a warning heading.

Pasting across different-sized atlases rescales nearest-neighbour, so labels stay crisp
and never blend into an invalid colour. Pasting across different meshes is allowed but
warns, since the UV islands will not line up.

Paste is undoable (`Ctrl+Z`) and does not save by itself — press `Ctrl+S`, or
**Save all edited** when you have pasted across a whole group.

## Regenerating the inputs

```powershell
.\export_textures.ps1   # vanilla atlases -> textures\ , writes manifest.json
.\export_models.ps1     # matching body meshes -> models\ , adds "model" to the manifest
```

`textures\` and `models\` are derived from the game install and can be regenerated at any
time. `masks\` is the hand-authored part and is the thing worth keeping in version
control.

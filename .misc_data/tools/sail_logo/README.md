# sail_logo: put the player logo on a sail

How to turn a plain cloth sail into a sail that shows the player logo, like the middle sail of the Oriental Trading Ship.

## How a logo sail works

Nothing in the textures marks where the logo goes. The diffuse map, the normal map and the dye mask are not involved. A logo sail needs three things:

1. **A second UV set in the cloth `.rdm`.** A plain sail has one `T2f` (stride 60). A logo sail has two (stride 68). The first set maps the sail texture. The second places the logo: the logo fills the second set's 0..1 square, and everywhere outside that square shows no logo. In vanilla this second set is always a flat projection onto the sail plane, with v pointing down.
2. **`<LOGO_ATLAS_ENABLED>1</LOGO_ATLAS_ENABLED>`** in the cloth material.
3. **`<Name>player_logo</Name>`** on the CLOTH config. Every vanilla logo sail uses this name.

The logo is drawn in the player colour on top of the sail, whatever the dye mask says, because `INVERSE_LOGO_COLORING` is 0. It reads correctly from one side of the sail and mirrored from the other, the same as vanilla.

You only choose two numbers: the logo **centre** and its **size**, both in metres. The tool computes the UVs, rewrites the `.rdm` and patches the cfg.

## Requirements

- Node.js.
- `C:\tools\texconv.exe`, used for the previews. Set the environment variable `TEXCONV` if it lives somewhere else.
- The vanilla extract `D:\anno_data\1800`, needed only for sails that use vanilla textures. Set `ANNO_DATA` to change the path.

Paths in the cfg are looked up first in the cfg's own mod root (the folder above `data/graphics`), then in the vanilla extract.

## Step by step

Run everything from this folder. `<cfg>` is the ship's `.cfg`, for example
`"../../../data/graphics/vehicle/orient/orient_cargo_ship/orient_cargo_ship.cfg"`.

### 1. Find the sail

```
node sail_logo.js list <cfg>
```

This prints every CLOTH entry in the cfg: its number (`#2`), its name, its rdm, whether the logo is switched on, and how many UV sets the rdm has. Pick the sail by number. It is usually the biggest, most central one.

### 2. Pick a starting position

```
node sail_logo.js fit <cfg> 2
```

The output gives:
- the sail outline in logo coordinates;
- its centroid;
- the **largest square that fits on the sail**, plus a 90 % version as a starting suggestion.

**Coordinates.** All positions are in metres from the cloth's pivot, as seen from the viewing side:
- **R** = right, **D** = down.
- `--at R,D` is the logo centre.
- `--size S` is the edge of the logo square.

**Viewing side.** The logo reads correctly from the side you pass in `--view`; from the other side it is mirrored, as in vanilla.

| Option | Use it for |
|---|---|
| `--view +x` | Sails across the ship, seen from the bow. This is the default for those sails. |
| `--view +z` or `--view -z` | Fore-and-aft sails, seen from one side of the ship or the other. |

Without `--view`, the tool picks the side the sail faces, taking the positive direction of the axis closest to the sail normal.

### 3. Preview and adjust

```
node sail_logo.js preview <cfg> 2 --at 0.29,0.848 --size 1.166 --out sail.png
```

This draws the sail flat, as seen from the viewing side. It shows:
- the diffuse texture;
- the player-colour stripes from the dye mask;
- the logo square: by default the test square with an "F" in the top-left corner, or any logo you pass with `--logo file.png` or `--logo file.dds`.

Grid lines are 0.5 m apart, and the two lighter lines are the pivot axes. Change `--at` and `--size` until the logo sits where you want it.

**This preview matched the game exactly** on the Oriental Trading Ship. Only the cloth billowing in the wind is missing.

Without `--at` and `--size`, the preview shows the logo UV that is already stored in the rdm.

### 4. Apply

```
node sail_logo.js apply <cfg> 2 --at 0.29,0.848 --size 1.166
```

- **rdm:** if it has one UV set, the tool inserts the second set and moves all pointers. It then undoes the change in memory and checks that this gives back the original file byte for byte. Nothing is written if that check fails. If the rdm already has a logo UV set, the tool just rewrites it, so you can re-run `apply` with new numbers as often as you like.
- **cfg:** it sets that cloth's `LOGO_ATLAS_ENABLED` to 1 and its `Name` to `player_logo`. Add `--no-cfg` to leave the cfg alone.

### 5. Tidy up the other sails

Run `list` again. A sail flagged **`LOGO_ATLAS_ENABLED 1 without a logo UV`** has no logo UV, so set its `LOGO_ATLAS_ENABLED` to 0 by hand. That is what vanilla does for sails without a logo.

### 6. Check in game

1. Enable the test submod `Natoncy_orient_test_logo`.
2. Start a **new game** and pick the **Test Square** logo. It comes right after the Orient logos in the picker. The logo is fixed when a game is created, so an old save keeps its own logo.
3. Get the ship, for example from the shipyard or in creative mode.

What to look for:
- The square shows the full logo area.
- The "F" must read normally from your viewing side.
- If the square sits wrong, change the numbers, run `apply` again, and reload.

### 7. Commit and record the numbers

Commit the `.rdm` and the `.cfg`, then add the placement to the table below. You need these numbers again whenever the sail mesh is exported anew.

## Pitfalls

- **Re-exporting the sail removes the logo.** The `.glb` next to the rdm has no logo UV. After rebuilding the rdm from it, run `apply` again with the numbers from the table.
- **Real logos look smaller than the square.** Player logos have transparent margins: their artwork covers only 15–40 % of the image. Vanilla logo squares are 1.0–1.9 m, about 60–85 % of the shorter sail side, and their corners may overhang the sail a little.
- **Anno is left-handed.** Seen from the bow (+x) with y up, screen-right is +z. The tool handles this, but keep it in mind when you read cfg rotations yourself.
- **Supported files:** cloth rdms with a single mesh and float UVs. That covers vanilla cloth (`P3f_N3b,T2f`) and the rdm4-template sails in this mod. For anything else the tool stops with an error and changes nothing.

## Placements

| Ship | cfg cloth | Command |
|---|---|---|
| Oriental Trading Ship 1404005167 | `orient_cargo_ship.cfg` #2 (middle sail) | `apply ... 2 --at 0.29,0.848 --size 1.166` (view +x) |

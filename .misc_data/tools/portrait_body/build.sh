#!/usr/bin/env bash
# Rebuilds the static lower-body meshes and textures of the Orient portraits and copies them into the mod.
# Run from Git Bash. Working files land next to this script (git-ignored).
set -e
cd "$(dirname "$0")"
MOD="$(cd ../../.. && pwd -W)"
RDM4="$(ls -d ~/.vscode/extensions/jakobharder.anno-modding-tools-*/external | tail -1)/rdm4-bin.exe"
# each portrait is a submod, shared_portraits/Natoncy_portrait_1404_<nn>_<name> (../portrait_1404/picker.json)
sub() { ls -d "$MOD"/shared_portraits/Natoncy_portrait_1404_*_$1 | head -1; }
name() { if [ $1 = 01 ]; then echo nomad; else echo envoy; fi; }

for t in 01 02; do
  D="$(sub $(name $t))/data/graphics/portraits/orient/resident_orient_tier$t"
  mkdir -p g$t tex body$t
  "$RDM4" -i "$D/rdm/resident_orient_tier$t.rdm" -o g$t -s -e gltf --force 2>/dev/null
  /c/tools/texconv.exe -nologo -y -ft png -o tex "$D/maps/resident_orient_tier${t}_diff_0.dds" > /dev/null
done

node body.js 01 02

for t in 01 02; do
  D="$(sub $(name $t))/data/graphics/portraits/orient/resident_orient_tier$t"
  node bake.js $t
  "$RDM4" -i body$t/body.gltf -o body$t/resident_orient_tier${t}_body.rdm -g P4h_N4b_G4b_B4b_T2h --no_transform --force 2>/dev/null
  cp body$t/body_diff.png body$t/resident_orient_tier${t}_body_diff.png
  (cd body$t && /c/tools/annotex.exe -f=diff -l=3 resident_orient_tier${t}_body_diff.png > /dev/null)
  cp body$t/resident_orient_tier${t}_body.rdm "$D/rdm/"
  cp body$t/resident_orient_tier${t}_body_diff_[012].dds "$D/maps/"
  cp body$t/resident_orient_tier${t}_body_diff.png "$MOD/.misc_data/data/graphics/Portraits/orient/resident_orient_tier$t/"
done

# player-portrait picker tiles (256px, like the vanilla profile icons), rendered from bust + body
node icon.js > /dev/null
for n in nomad envoy; do
  P="$(sub $n)/data/ui/2kimages/main/profiles"
  cp orient_portrait_$n.png "$P/"
  (cd "$P" && /c/tools/annotex.exe -f=diff -l=4 orient_portrait_$n.png > /dev/null)
done

node prevhi.js
echo "done - preview: prevhi.png"

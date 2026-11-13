#!/bin/sh
# Encode the beacon source textures (maps/beacon_{diff,norm,metal}.png, 256 px) into the building LOD files
# beacon_*_0/_1/_2.dds (256/128/64 px, BC7_UNORM, full mip chain). -sepalpha keeps the gloss/AO alpha out of the colour mips.
# usage: sh encode.sh <mapsDir> <tmpDirWindowsPath>   (texconv is a Windows exe: give the temp dir as C:\...)
MAPS="$1"; TMPW="$2"; TMP=$(cygpath -u "$TMPW"); mkdir -p "$TMP"
for n in diff norm metal; do for l in 0 1 2; do
  s=$((256 >> l)); cp "$MAPS/beacon_$n.png" "$TMP/beacon_${n}_$l.png"
  MSYS_NO_PATHCONV=1 C:/tools/texconv.exe -nologo -y -sepalpha -f BC7_UNORM -m 0 -w $s -h $s -o "$TMPW" "$TMPW\beacon_${n}_$l.png" > /dev/null || echo "FAIL $n $l"
  cp "$TMP/beacon_${n}_$l.dds" "$MAPS/"
done; done
ls -l "$MAPS"/beacon_*.dds

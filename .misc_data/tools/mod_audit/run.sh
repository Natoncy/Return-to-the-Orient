# Mod audit (2026-11-16). Usage from Git Bash: bash .misc_data/tools/mod_audit/run.sh
# 1. chain.sh   : xmltest in mod-loader.log order -> out/xt/S1..S3.xml + stage logs; prints every warning
# 2. guidcheck  : duplicate GUIDs + undefined GUID refs in new/changed assets of S3.xml -> out/guidcheck.txt
# 3. srccheck   : same on our source XML incl. New Horizons-only ModOps; cond.js shows their Condition
# 4. textonly   : refs that only hit a texts_*.xml LineId + orphan LineIds
# 5. loca/latin : 13-language completeness, same-as-English, [token] and <b> mismatches, half-English CJK/RU
# Update the submod list in chain.sh from Documents/Anno 1800/log/mod-loader.log when the mod set changes.
set -e
HERE="$(cd "$(dirname "$0")" && pwd -W)"; OUT="$HERE/out"; mkdir -p "$OUT"
cp "$HERE/chain.sh" "$OUT/chain.sh"; bash "$OUT/chain.sh"
W="$(cd "$OUT" && pwd -W)"
node --max-old-space-size=12000 "$HERE/guidcheck.js" "$W" > /dev/null
node --max-old-space-size=12000 "$HERE/srccheck.js" "$W" > /dev/null
node "$HERE/cond.js" "$W" > "$OUT/cond.txt"
node --max-old-space-size=12000 "$HERE/textonly.js" "$W" > /dev/null
node "$HERE/loca.js" "$W" > /dev/null
node "$HERE/latin.js" "$(cd "$HERE/../../../data/config/gui" && pwd -W)" > "$OUT/latin.txt"
echo "reports in $OUT"

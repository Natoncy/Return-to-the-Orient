# Usage: bash run.sh   (from Git Bash; writes .misc_data/unused_files_report.md + unused_files.txt)
set -e
HERE="$(cd "$(dirname "$0")" && pwd -W)"; ROOT="$(cd "$HERE/../../.." && pwd -W)"; OUT="$HERE/out"; mkdir -p "$OUT"; cd "$OUT"
[ -f vanilla_files.txt ] || (cd /d/anno_data/1800 && find data -type f | tr A-Z a-z | grep -vE '^data/graphics/(buildings/orient|1404_import)') > vanilla_files.txt
node --max-old-space-size=8000 "$HERE/unused.js" "$ROOT" .
node "$HERE/group.js" "$ROOT" > groups.txt
node --max-old-space-size=8000 "$HERE/guids.js" "$ROOT" .
node "$HERE/report.js" "$ROOT/.misc_data"

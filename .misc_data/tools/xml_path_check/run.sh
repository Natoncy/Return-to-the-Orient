# Usage: bash run.sh   (from Git Bash; writes .misc_data/xml_path_check_report.txt)
set -e
HERE="$(cd "$(dirname "$0")" && pwd -W)"; ROOT="$(cd "$HERE/../../.." && pwd -W)"
VAN="$HERE/../unused_files/out/vanilla_files.txt"
[ -f "$VAN" ] || (mkdir -p "$(dirname "$VAN")" && cd /d/anno_data/1800 && find data -type f | tr A-Z a-z | grep -vE '^data/graphics/(buildings/orient|1404_import)') > "$VAN"
node --max-old-space-size=8000 "$HERE/check.js" "$ROOT" "$VAN" | tee "$ROOT/.misc_data/xml_path_check_report.txt"

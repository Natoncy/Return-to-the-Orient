"""Replace a texture's lower LOD files (_1.dds, _2.dds, ...) with mod-loader links to its _0.dds.

Why: the game streams model textures low tier first and only loads _0 after a close zoom, so 1404/IAAM
conversions (about 1/3 of vanilla's texel density) look blurry until then. A file `name_1.dds.lnk` whose
content is the game path of `name_0.dds` makes every tier load the full-resolution file, with no duplicated
data. Confirmed in game on the Oriental Embassy (2026-11-10).

usage: python make_links.py <folder> [<folder> ...] [--dry-run]
Folders are relative to the mod root (or absolute inside it). Idempotent: re-running only touches new or
regenerated tier files. A regenerated real `name_N.dds` next to an existing `.lnk` is removed again.
Restore with git (`git checkout -- <folder>`) if the real files were committed.
"""
import os, sys, re

MOD_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
TIER = re.compile(r'^(?P<base>.+)_(?P<n>[1-9])\.dds(?P<lnk>\.lnk)?$', re.I)
PATH_BUDGET = 152  # longest allowed path relative to the mod root, see mod-path-length notes


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry-run' in sys.argv
    if not args: sys.exit(__doc__)
    made = removed_bytes = skipped = 0; too_long = []
    for folder in args:
        root = folder if os.path.isabs(folder) else os.path.join(MOD_ROOT, folder)
        for d, _, files in os.walk(root):
            names = set(files)
            for f in sorted(files):
                m = TIER.match(f)
                if not m or m.group('lnk'): continue
                zero = m.group('base') + '_0.dds'
                if zero not in names: skipped += 1; continue
                rel_zero = os.path.relpath(os.path.join(d, zero), MOD_ROOT).replace(os.sep, '/')
                link = os.path.join(d, f + '.lnk')
                rel_link = os.path.relpath(link, MOD_ROOT).replace(os.sep, '/')
                if len(rel_link) > PATH_BUDGET: too_long.append(rel_link); continue
                removed_bytes += os.path.getsize(os.path.join(d, f)); made += 1
                if dry: continue
                with open(link, 'w', newline='') as fh: fh.write(rel_zero)  # no trailing newline, like the .xml.lnk files
                os.remove(os.path.join(d, f))
    print('%s %d links, %.1f MB of tier files %s, %d tier files without _0 left alone'
          % ('would make' if dry else 'made', made, removed_bytes / 1048576, 'to remove' if dry else 'removed', skipped))
    for p in too_long: print('SKIPPED (path over %d chars):' % PATH_BUDGET, p)


if __name__ == '__main__':
    main()

"""List every mod-shipped texture a set of cfgs uses (following FILE children), with its tier count.

usage: python cfg_textures.py <cfg or folder> [...] [--folders]
Prints one line per texture set: tiers present (e.g. 0,1,2 or 0,1L,2L where L = .lnk) and the _0 path.
--folders prints only the folders that hold texture sets with real (unlinked) tier files.
"""
import os, re, sys
MOD_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
REF = re.compile(r'<(?:c\w*Tex|cNightGlowMap|cModel\w*Tex|cHeightMap|FileName)>([^<]+)<', re.I)

def norm(p): return p.strip().replace(chr(92), '/').lstrip('/')

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    todo = []
    for a in args:
        p = a if os.path.isabs(a) else os.path.join(MOD_ROOT, a)
        if os.path.isdir(p):
            for d, _, fs in os.walk(p): todo += [os.path.join(d, f) for f in fs if f.endswith('.cfg')]
        else: todo.append(p)
    seen = set(); tex = {}; missing_cfg = set()
    while todo:
        c = os.path.normcase(os.path.abspath(todo.pop()))
        if c in seen: continue
        seen.add(c)
        for ref in REF.findall(open(c, encoding='utf-8', errors='replace').read()):
            r = norm(ref); low = r.lower()
            if low.endswith('.cfg'):
                q = os.path.join(MOD_ROOT, r)
                if os.path.exists(q): todo.append(q)
                else: missing_cfg.add(r)
            elif low.endswith(('.png', '.psd', '.dds', '.tga')):
                base = re.sub(r'(_\d)?\.(png|psd|dds|tga)$', '', r, flags=re.I)
                tex.setdefault(base, set()).add(os.path.relpath(c, MOD_ROOT))
    folders = {}
    for base in sorted(tex):
        tiers = []
        for n in range(6):
            f = os.path.join(MOD_ROOT, '%s_%d.dds' % (base, n))
            if os.path.exists(f): tiers.append(str(n))
            elif os.path.exists(f + '.lnk'): tiers.append('%dL' % n)
        if not tiers: continue  # vanilla texture or not shipped by the mod
        if any(t.isdigit() and t != '0' for t in tiers): folders.setdefault(os.path.dirname(base), []).append(base)
        if '--folders' not in sys.argv: print('%-14s %s' % (','.join(tiers), base))
    print('\n%d cfgs scanned, %d texture sets shipped by the mod; folders with unlinked tiers:' % (len(seen), sum(1 for b in tex if os.path.exists(os.path.join(MOD_ROOT, b + '_0.dds')))))
    for d, bs in sorted(folders.items()): print('  %3d  %s' % (len(bs), d))
    if missing_cfg: print('child cfgs not in the mod (vanilla):', len(missing_cfg))

if __name__ == '__main__': main()

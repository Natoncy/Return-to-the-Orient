"""Repack the used UV islands of one .rdm into a smaller atlas, 1:1 pixels (no resampling).

usage: repack.py config.json
config: {"rdm": path (rewritten in place), "src": [W,H], "dst": [W,H], "pad": 6,
         "textures": [{"src": ".../x_diff_0.dds", "out": ".../maps/y_diff", "fmt": "BC7_UNORM"}, ...],
         "levels": 3}
"""
import sys, os, json, struct, subprocess
import numpy as np
from PIL import Image

SP = os.path.dirname(os.path.abspath(__file__))
TEXCONV = r'C:\tools\texconv.exe'


def u(b, o): return struct.unpack_from('<I', b, o)[0]


def decode0(p):
    out = os.path.join(SP, 'dec'); os.makedirs(out, exist_ok=True)
    r = subprocess.run([TEXCONV, '-nologo', '-y', '-m', '1', '-f', 'R8G8B8A8_UNORM', '-ft', 'PNG', '-o', out, p], capture_output=True, text=True)
    q = os.path.join(out, os.path.splitext(os.path.basename(p))[0] + '.png')
    if not os.path.exists(q): raise RuntimeError(r.stdout + r.stderr)
    return np.array(Image.open(q).convert('RGBA'))


def load_mesh(b):
    e = u(b, 32)
    vb = u(b, e + 12); n, sz = u(b, vb - 8), u(b, vb - 4)
    ib = u(b, e + 16); ni, isz = u(b, ib - 8), u(b, ib - 4)
    idx = np.frombuffer(b, np.uint16 if isz == 2 else np.uint32, ni, ib).reshape(-1, 3)
    raw = np.frombuffer(bytes(b[vb:vb + n * sz]), np.uint8).reshape(n, sz).copy()
    return vb, n, sz, idx, raw


def islands(n, idx):
    par = list(range(n))
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for t in idx:
        for a in t[1:]: par[f(int(a))] = f(int(t[0]))
    g = {}
    for t in idx:
        for a in t: g.setdefault(f(int(a)), set()).add(int(a))
    return [sorted(v) for v in g.values()]


def dilate(img, cov, iters=600):
    img = img.astype(np.float32); cov = cov.copy()
    for _ in range(iters):
        if cov.all(): break
        acc = np.zeros_like(img); cnt = np.zeros(cov.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sc = np.roll(cov, (dy, dx), (0, 1)); si = np.roll(img, (dy, dx), (0, 1))
            m = sc & ~cov
            acc[m] += si[m]; cnt[m] += 1
        new = cnt > 0
        img[new] = acc[new] / cnt[new][:, None]; cov = cov | new
    if not cov.all(): img[~cov] = img[cov].mean(0)
    return img


def down2(a):
    h, w = a.shape[:2]
    return a.reshape(h // 2, 2, w // 2, 2, -1).mean((1, 3))


def main():
    cfg = json.load(open(sys.argv[1]))
    W, H = cfg['src']; Wn, Hn = cfg['dst']; pad = cfg.get('pad', 6)
    b = bytearray(open(cfg['rdm'], 'rb').read())
    vb, n, sz, idx, raw = load_mesh(b)
    uv = raw[:, sz - 4:].copy().view(np.float16).astype(np.float64)

    # island rects in source pixels (with padding), merged when overlapping
    rects = []
    for vs in islands(n, idx):
        mn = uv[vs].min(0) * [W, H]; mx = uv[vs].max(0) * [W, H]
        r = [int(np.floor(mn[0])), int(np.floor(mn[1])), int(np.ceil(mx[0])), int(np.ceil(mx[1]))]
        rects.append([r, set(vs)])
    merged = True
    while merged:
        merged = False
        for i in range(len(rects)):
            for j in range(i + 1, len(rects)):
                a, c = rects[i][0], rects[j][0]
                if a[0] < c[2] and c[0] < a[2] and a[1] < c[3] and c[1] < a[3]:
                    rects[i][0] = [min(a[0], c[0]), min(a[1], c[1]), max(a[2], c[2]), max(a[3], c[3])]
                    rects[i][1] |= rects[j][1]; del rects[j]; merged = True; break
            if merged: break
    for rv in rects:  # padding after merging: neighbours may share padding pixels, each gets its own copy
        r = rv[0]; rv[0] = [max(0, r[0] - pad), max(0, r[1] - pad), min(W, r[2] + pad), min(H, r[3] + pad)]

    # shelf packing, tallest first; offsets kept even so the _1 level stays aligned
    order = sorted(range(len(rects)), key=lambda i: -(rects[i][0][3] - rects[i][0][1]))
    x = y = shelf = 0; place = {}
    for i in order:
        r = rects[i][0]; w, h = r[2] - r[0], r[3] - r[1]
        if x + w > Wn: x = 0; y += shelf; shelf = 0
        if y + h > Hn or w > Wn: sys.exit('does not fit: %s in %dx%d' % (r, Wn, Hn))
        place[i] = (x, y); x += w + (w % 2); shelf = max(shelf, h + (h % 2))
    print('packed %d rects, used height %d of %d' % (len(rects), y + shelf, Hn))

    # textures
    for t in cfg['textures']:
        src = decode0(t['src'])
        assert src.shape[1] == W and src.shape[0] == H, (t['src'], src.shape)
        dst = np.zeros((Hn, Wn, 4), np.float32); cov = np.zeros((Hn, Wn), bool)
        for i, (r, _) in enumerate(rects):
            dx, dy = place[i]; w, h = r[2] - r[0], r[3] - r[1]
            dst[dy:dy + h, dx:dx + w] = src[r[1]:r[3], r[0]:r[2]]; cov[dy:dy + h, dx:dx + w] = True
        img = dilate(dst, cov)
        os.makedirs(os.path.dirname(t['out']), exist_ok=True)
        lvl = img
        for L in range(cfg.get('levels', 3)):
            png = os.path.join(SP, 'enc', os.path.basename(t['out']) + '_%d.png' % L)
            os.makedirs(os.path.dirname(png), exist_ok=True)
            Image.fromarray(np.clip(lvl + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(png)
            args = [TEXCONV, '-nologo', '-y', '-sepalpha', '-m', '0', '-f', t['fmt'], '-o', os.path.dirname(t['out']), png]
            if t['fmt'].startswith('BC1'): args.insert(3, '-dx9')
            r = subprocess.run(args, capture_output=True, text=True)
            outp = os.path.join(os.path.dirname(t['out']), os.path.basename(t['out']) + '_%d.dds' % L)
            if not os.path.exists(outp): sys.exit(r.stdout + r.stderr)
            lvl = down2(lvl)
        print('wrote', t['out'] + '_0..%d.dds' % (cfg.get('levels', 3) - 1))

    # UVs
    new = uv.copy()
    for i, (r, vs) in enumerate(rects):
        dx, dy = place[i]; vs = sorted(vs)
        new[vs, 0] = (uv[vs, 0] * W - r[0] + dx) / Wn
        new[vs, 1] = (uv[vs, 1] * H - r[1] + dy) / Hn
    raw[:, sz - 4:] = new.astype(np.float16).view(np.uint8).reshape(n, 4)
    b[vb:vb + n * sz] = raw.tobytes()
    open(cfg['rdm'], 'wb').write(b)
    err = np.abs(new.astype(np.float16).astype(np.float64) * [Wn, Hn] - new * [Wn, Hn]).max()
    print('rdm UVs rewritten, max half rounding %.3f px' % err)
    json.dump({'rects': [r for r, _ in rects], 'place': [place[i] for i in range(len(rects))]},
              open(os.path.join(SP, os.path.basename(cfg['rdm']) + '.pack.json'), 'w'))


if __name__ == '__main__':
    main()

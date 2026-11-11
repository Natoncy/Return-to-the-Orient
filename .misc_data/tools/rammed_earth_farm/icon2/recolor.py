"""Rammed earth icon from the two-block art (src_blocks.png, 512 px, cream stone).

Keeps the painted shading and outline, replaces the colour with horizontal earth/clay
layers. Side faces get bands that follow each face's slanted top edge; top faces take the
top layer's colour. Faces are quads read off the source by hand (pixel coords).

python recolor.py <out 128 png> [<out 512 preview png>]
"""
import sys, os, math
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
src = Image.open(os.path.join(HERE, 'src_blocks.png')).convert('RGBA')
W, H = src.size
a = np.asarray(src).astype(np.float32) / 255.0
rgb, alpha = a[..., :3], a[..., 3]

# side faces: (top-left, top-right, bottom-left, bottom-right); left/right edges are vertical
# top faces: polygon only.  Order = paint priority (block B is in front of block A).
FACES = [
    # block B (front right)
    dict(kind='side', block='B', top=((222, 242), (398, 272)), bot=((222, 410), (388, 445)),
         poly=[(214, 236), (398, 268), (390, 452), (214, 416)]),
    dict(kind='side', block='B', top=((398, 272), (467, 152)), bot=((388, 445), (453, 300)),
         poly=[(398, 268), (472, 146), (472, 300), (390, 452)]),
    dict(kind='top', block='B', poly=[(214, 240), (338, 122), (474, 146), (398, 268)]),
    # block A (back left)
    dict(kind='side', block='A', top=((52, 150), (192, 178)), bot=((60, 298), (205, 335)),
         poly=[(44, 146), (194, 172), (210, 342), (50, 302)]),
    dict(kind='side', block='A', top=((192, 178), (322, 80)), bot=((205, 335), (330, 240)),
         poly=[(194, 172), (326, 74), (334, 250), (210, 342)]),
    dict(kind='top', block='A', poly=[(44, 146), (204, 52), (328, 74), (194, 172)]),
]

# layers top → bottom: (relative thickness, colour). Earth tones with clay-brown bands.
LAYERS = [
    (1.00, (206, 152, 92)),   # dusty ochre (top)
    (0.60, (156, 78, 44)),    # clay red-brown
    (1.20, (222, 176, 112)),  # sandy tan
    (0.50, (100, 60, 38)),    # dark umber
    (0.90, (190, 108, 62)),   # terracotta
    (1.10, (210, 158, 94)),   # ochre
    (0.55, (142, 76, 46)),    # clay brown
    (1.00, (178, 124, 76)),   # mid earth
    (0.65, (112, 70, 44)),    # dark earth (bottom)
]
thick = np.array([l[0] for l in LAYERS]); edges = np.concatenate([[0], np.cumsum(thick) / thick.sum()])
cols = np.array([l[1] for l in LAYERS], np.float32) / 255.0
TOP_COL = np.array((212, 164, 106), np.float32) / 255.0

def line_y(p, q, x):
    (x0, y0), (x1, y1) = p, q
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)

def poly_mask(poly):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(poly, fill=1)
    return np.asarray(m).astype(bool)

ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
face_id = np.full((H, W), -1, np.int32)
for i, f in enumerate(FACES):
    m = poly_mask(f['poly']) & (face_id < 0)
    face_id[m] = i
# block pixels outside every quad (rough painted edges) → nearest assigned pixel
fg = alpha > 0.02
for _ in range(40):  # grow assigned faces into unassigned block pixels, 1 px per pass
    miss = fg & (face_id < 0)
    if not miss.any():
        break
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        nb = np.roll(face_id, (dy, dx), (0, 1))
        take = miss & (nb >= 0) & (face_id < 0)
        face_id[take] = nb[take]

# deterministic wobble so band boundaries look hand-rammed, not ruled
rng = np.random.default_rng(7)
def wobble(x, seed):
    r = np.random.default_rng(seed)
    out = np.zeros_like(x)
    for k, amp in ((0.018, 0.012), (0.045, 0.006), (0.11, 0.003)):
        out += amp * np.sin(x * k + r.uniform(0, 6.3))
    return out

base = np.zeros((H, W, 3), np.float32)
for i, f in enumerate(FACES):
    m = face_id == i
    if not m.any():
        continue
    if f['kind'] == 'top':
        base[m] = TOP_COL
        continue
    x, y = xs[m], ys[m]
    yt = line_y(*f['top'], x); yb = line_y(*f['bot'], x)
    t = np.clip((y - yt) / np.maximum(yb - yt, 1), 0, 0.9999)
    t = np.clip(t + wobble(x, 11 if f['block'] == 'A' else 23), 0, 0.9999)
    idx = np.searchsorted(edges, t, side='right') - 1
    # soften band boundaries over ~1.5 px of t
    c = cols[idx]
    frac_in = (t - edges[idx]) / (edges[idx + 1] - edges[idx])
    band_px = (edges[idx + 1] - edges[idx]) * (yb - yt)
    soft = 1.5 / np.maximum(band_px, 1)
    w_prev = np.clip(0.5 - frac_in / soft, 0, 0.5)[:, None]
    prev = cols[np.maximum(idx - 1, 0)]
    c = c * (1 - w_prev) + prev * w_prev
    # per-band grain: fine speckle so layers read as packed earth
    c = c * (1 + rng.normal(0, 0.035, (len(x), 1)).astype(np.float32))
    base[m] = c

# shading from the source: luminance relative to the cream base, contrast slightly reduced
lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
REF = 0.86  # mid luminance of the lit cream
shade = (lum / REF)
shade = np.where(shade > 1, 1 + (shade - 1) * 0.6, 1 - (1 - shade) * 0.95)
out = base * shade[..., None]
grey = (out @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
out = np.clip(grey + (out - grey) * 1.15, 0, 1)  # keep the earth warm after darkening
# outline / near-black stays as painted
dark = np.clip((0.22 - lum) / 0.12, 0, 1)[..., None]
out = out * (1 - dark) + rgb * dark

res = np.dstack([out, alpha])
img = Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')

# crop to the block bbox, pad square (like icon.js), scale with premultiplied alpha
yy, xx = np.nonzero(alpha > 0.02)
x0, x1, y0, y1 = xx.min(), xx.max(), yy.min(), yy.max()
side = int(round(max(x1 - x0 + 1, y1 - y0 + 1) * 1.04))
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
box = (int(round(cx - side / 2)), int(round(cy - side / 2)))
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(img, (-box[0], -box[1]))
small = sq.convert('RGBa').resize((128, 128), Image.LANCZOS).convert('RGBA')
small.save(sys.argv[1])
if len(sys.argv) > 2:
    sq.save(sys.argv[2])
print('bbox', x0, y0, x1, y1, 'side', side)

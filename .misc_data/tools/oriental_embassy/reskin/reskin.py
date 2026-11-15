# Oriental Embassy "official" reskin: clean limestone/cream walls, Old World verdigris dome with gilded frieze,
# Orient Iznik blue-white tile vaults. Reads src/*.png (vanilla-of-mod textures) + uv_*.bin, writes out/*.png
import numpy as np
from PIL import Image, ImageFilter
import os
S = 4  # output scale vs the 512 sources
os.makedirs('out', exist_ok=True)
rng = np.random.default_rng(7)

# ---------- colour helpers ----------
def srgb2lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return 255 * np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
WP = np.array([0.95047, 1.0, 1.08883])
def rgb2lab(rgb):
    xyz = srgb2lin(rgb) @ M.T / WP
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
def lab2rgb(lab):
    fy = (lab[..., 0] + 16) / 116; fx = fy + lab[..., 1] / 500; fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) / (24389 / 27)) * WP
    return lin2srgb(xyz @ np.linalg.inv(M).T)

def blur(a, r):
    a = np.asarray(a, np.float64)
    if r > 4:
        f = int(r // 2); h, w = a.shape
        sm = np.array(Image.fromarray(a.astype(np.float32), 'F').resize((max(1, w // f), max(1, h // f)), Image.BOX))
        sm = blur(sm, r / f)
        return np.array(Image.fromarray(sm.astype(np.float32), 'F').resize((w, h), Image.BILINEAR)).astype(np.float64)
    R = max(1, int(np.ceil(3 * r)))
    x = np.arange(-R, R + 1); k = np.exp(-x * x / (2 * r * r)); k /= k.sum()
    p = np.pad(a, ((R, R), (R, R)), mode='reflect')
    p = sum(k[i] * p[i:i + p.shape[0] - 2 * R, :] for i in range(2 * R + 1))
    p = sum(k[i] * p[:, i:i + p.shape[1] - 2 * R] for i in range(2 * R + 1))
    return p
def nblur(a, w, r):  # normalised (masked) blur
    return blur(a * w, r) / np.maximum(blur(w.astype(np.float32), r), 1e-4)
def smooth(x, e0, e1):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def load(p, up=True):
    im = Image.open(p).convert('RGBA')
    a = np.array(im).astype(np.float64)
    if not up: return a
    big = np.array(im.resize((im.width * S, im.height * S), Image.LANCZOS)).astype(np.float64)
    for c in range(3):
        big[..., c] = big[..., c] + 0.6 * (big[..., c] - blur(big[..., c], 0.5 * S))
    return np.clip(big, 0, 255)
def down(m, shape):
    return np.array(Image.fromarray(m.astype(np.float32), 'F').resize((shape[1], shape[0]), Image.BOX)).astype(np.float64)
def grain(shape):
    return blur(rng.standard_normal(shape), 0.7) * 2.2 + blur(rng.standard_normal(shape), 2.5 * S) * 6
def save(p, a):
    Image.fromarray(np.clip(np.round(a), 0, 255).astype(np.uint8), 'RGBA').save(p)
def uvmask(base, shape):
    raw = np.fromfile(f'uv_{base}.bin', dtype=np.float32)
    n = shape[0] * shape[1]
    ny, y, nx, nz = (raw[i * n:(i + 1) * n].reshape(shape) for i in range(4))
    used = ~np.isnan(ny)
    used = Image.fromarray(used.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))
    used = np.array(used.resize((shape[1] * S, shape[0] * S), Image.NEAREST)) > 0
    return used, None

# ---------- clean stone (walls, drum, roof rims) ----------
# target: Old World pale limestone with an Orient cream warmth; grime low-pass mostly removed
STONE = dict(L=80.0, a=3.0, b=18.0)
def clean_stone(lab, w, keep):
    """lab: image Lab; w: region weight; keep: weight of pixels to leave alone (windows, wood, colour)"""
    L = lab[..., 0]
    region = (w > 0.5) & (keep < 0.5)
    rw = region.astype(np.float64)
    Lb = nblur(L, rw, 10 * S)
    Lm = nblur(L, rw, 2.2 * S)
    med = np.median(L[region]) if region.any() else 60
    # crisp detail (mouldings, joints, 1-3 px) kept, blotchy stains (3-10 px) mostly removed, grime low-pass flattened
    fine = L - Lm
    mid = Lm - Lb
    C = np.hypot(lab[..., 1], lab[..., 2])
    stain = smooth(C - nblur(C, rw, 6 * S), 1, 6)  # warmer/more saturated than surroundings = dirt
    mid = np.where(mid < 0, mid * (0.45 - 0.3 * stain), mid * 0.5)
    fine = np.where(fine < 0, fine * (0.85 - 0.35 * stain), fine * 0.9)
    det = np.maximum(fine + mid, -22)
    newL = STONE['L'] + (Lb - med) * 0.3 + det + grain(L.shape)
    # darker detail reads as grey Old World stone joints rather than brown dirt
    dark = smooth(-det, 3, 14)
    na = STONE['a'] * (1 - 0.5 * dark)
    nb = STONE['b'] * (1 - 0.45 * dark)
    new = np.stack([newL, na + 0 * newL, nb], -1)
    k = (w * (1 - keep))[..., None]
    return lab * (1 - k) + new * k

# =====================================================================
# 1. walls: indian_warehouse_diff_512
# =====================================================================
src = load('src/indian_warehouse_diff_512_0.png')
lab = rgb2lab(src[..., :3])
used, ny = uvmask('indian_warehouse_diff_512', (512, 512))
L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
C = np.hypot(a, b)
# protect: glass/lattice (cool, low b), saturated colour (gold, cloth, paint), dark wood (door, beams), deep openings
glass = smooth(10 - b, 0, 5)
colour = smooth(C, 40, 50) * smooth(b, 32, 40)  # gilding
openings = smooth(26 - L, 0, 6)
keep = np.clip(np.maximum.reduce([glass, colour, openings]), 0, 1)
keep = np.clip(blur(keep, 0.8 * S) * 1.2, 0, 1)
# the wooden door of the entrance block is protected whole
# (painted pointed-arch leaf only: the door mesh is a wider pentagon, its shoulders show the stone surround)
_s = load('src/indian_warehouse_diff_512_0.png', up=False)
_l = rgb2lab(_s[..., :3])
_dm = np.array(Image.open('door_mask.png').convert('L')) > 128
_leaf = _dm & ((_l[..., 0] < 36) | ((_l[..., 2] > 16) & (_l[..., 0] < 52) & (_l[..., 1] > 5)))
for _y in range(512):  # fill each row between the outermost leaf pixels (shield shape is convex per row)
    _xs = np.nonzero(_leaf[_y, 150:225])[0]
    if len(_xs) > 1: _leaf[_y, 150 + _xs[0]:150 + _xs[-1] + 1] = True
_leaf = np.array(Image.fromarray(_leaf.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)))
Image.fromarray(_leaf).save('door_leaf.png')
door = blur(np.array(Image.fromarray(_leaf).resize((512 * S, 512 * S), Image.BILINEAR)).astype(np.float64) / 255, 0.6 * S)
keep = np.maximum(keep, door * smooth(62 - L, 0, 10))
w = used.astype(np.float64)
lab2 = clean_stone(lab, w, keep)
# door wood: clean it a little (richer, less grey dirt)
dw = door * (1 - glass)
lab2[..., 1] = lab2[..., 1] + dw * 3
lab2[..., 2] = lab2[..., 2] + dw * 4
out = src.copy(); out[..., :3] = lab2rgb(lab2)
save('out/indian_warehouse_diff_512_0.png', out)

# =====================================================================
# 2. dome: s_sultan_residence_dome_diff
# =====================================================================
src = load('src/s_sultan_residence_dome_diff_0.png')
H, W = src.shape[:2]
lab = rgb2lab(src[..., :3])
used, ny = uvmask('s_sultan_residence_dome_diff', (H // S, W // S))
yy, xx = np.mgrid[0:H, 0:W]
xs, ys = xx / S, yy / S
drum = used & (((xs >= 335) & (ys < 95)) | ((ys >= 316) & (ys < 412) & (xs < 140)))
gore = (used & (xs < 335) & (ys < 316)) | drum  # drum strips sit on the dome base: copper too
drum = drum & False
# Old World verdigris: clean left sheet of the vanilla institution_03 copper roof, mirror-tiled
pat = np.array(Image.open('owfull/institution_03_diff_0.png').convert('RGB')).astype(np.float64)[1165:1515, 712:912]
ph, pw = pat.shape[:2]
s = 0.62 * S * 0.8  # a little finer than the 512 version, so the sheet keeps more native detail
patim = Image.fromarray(pat.astype(np.uint8)).resize((int(pw * s), int(ph * s)), Image.LANCZOS)
pat = np.array(patim).astype(np.float64); ph, pw = pat.shape[:2]
tile = np.concatenate([pat, pat[:, ::-1]], 1); tile = np.concatenate([tile, tile[::-1]], 0)
th, tw = tile.shape[:2]
P = tile[yy % th, xx % tw]
plab = rgb2lab(P)
# patina a touch cleaner / lighter than vanilla (official, not neglected)
pL = plab[..., 0]; pLm = pL.mean()
plab[..., 0] = 54 + (pL - pLm) * 0.75
plab[..., 1] = plab[..., 1] * 1.05 - 1.5
plab[..., 2] = plab[..., 2] * 1.0
L = lab[..., 0]
Lb = nblur(L, gore.astype(np.float64), 4 * S)
det = L - Lb
# frieze triangles, rivets and bands: bright detail -> gilded
gold = smooth(det, 7, 16) * gore
gold = np.clip(blur(gold, 0.6 * S) * 1.3, 0, 1)
new = plab.copy()
new[..., 0] = plab[..., 0] + np.clip(det, -25, 25) * 0.55
GOLD = np.array([70.0, 9.0, 52.0])
gl = GOLD + 0 * new
gl[..., 0] = 64 + np.clip(det, 0, 30) * 0.6
new = new * (1 - gold[..., None]) + gl * gold[..., None]
k = gore[..., None].astype(np.float64)
lab2 = lab * (1 - k) + new * k
# drum: clean stone like the walls, its triangle frieze gilded too
dL = lab[..., 0]
dLb = nblur(dL, drum.astype(np.float64), 4 * S)
ddet = dL - dLb
lab2 = clean_stone(lab2, drum.astype(np.float64), np.zeros((H, W)))
dg = smooth(ddet, 8, 16) * drum
lab2 = lab2 * (1 - dg[..., None]) + gl * dg[..., None]
out = src.copy(); out[..., :3] = lab2rgb(lab2)
save('out/s_sultan_residence_dome_diff_0.png', out)
# gloss: copper and gold a bit shiny (normal alpha)
nrm = load('src/s_sultan_residence_dome_norm_0.png', up=False)
nrm[..., 3] = np.maximum(nrm[..., 3], down(gore * 55 + gold * 90, nrm.shape[:2]))
save('out/s_sultan_residence_dome_norm_0.png', nrm)
np.save('dome_gore.npy', gore)

# =====================================================================
# 3. vault roofs: s_ambassador_house03_roof_diff  (Iznik blue/turquoise on white)
# =====================================================================
src = load('src/s_ambassador_house03_roof_diff_0.png')
H, W = src.shape[:2]
lab = rgb2lab(src[..., :3])
used, ny = uvmask('s_ambassador_house03_roof_diff', (H // S, W // S))
yy, xx = np.mgrid[0:H, 0:W]
panel = np.zeros((H, W), bool); panel[2 * S:170 * S, 27 * S:198 * S] = True
rim = used & ~panel
L = lab[..., 0]
Lp = L[panel]
lo, hi = np.percentile(Lp, 6), np.percentile(Lp, 88)
t = np.clip((L - lo) / (hi - lo), 0, 1)
# gradient map: cobalt -> turquoise -> white glaze
stops = [(0.0, (30, 14, -46)), (0.32, (42, 6, -40)), (0.52, (62, -26, -14)), (0.74, (84, -3, 6)), (1.0, (91, -1, 7))]
def gmap(t):
    res = np.zeros(t.shape + (3,))
    for (t0, c0), (t1, c1) in zip(stops[:-1], stops[1:]):
        m = (t >= t0) & (t <= t1)
        f = ((t - t0) / (t1 - t0))[m][:, None]
        res[m] = np.array(c0) * (1 - f) + np.array(c1) * f
    return res
tiles = gmap(t)
# subtle per-tile glaze variation from the original's low-pass so it is not flat
tiles[..., 0] += (blur(L, 3 * S) - blur(L, 12 * S)) * 0.15 + blur(rng.standard_normal(L.shape), 0.8) * 1.2
k = panel[..., None].astype(np.float64)
lab2 = lab * (1 - k) + tiles * k
lab2 = clean_stone(lab2, rim.astype(np.float64), np.zeros((H, W)))
out = src.copy(); out[..., :3] = lab2rgb(lab2)
save('out/s_ambassador_house03_roof_diff_0.png', out)
nrm = load('src/s_ambassador_house03_roof_norm_0.png', up=False)
nrm[..., 3] = np.maximum(nrm[..., 3], down(panel * 110.0, nrm.shape[:2]))
save('out/s_ambassador_house03_roof_norm_0.png', nrm)
print('ok')

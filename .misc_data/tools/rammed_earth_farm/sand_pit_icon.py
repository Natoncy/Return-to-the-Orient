# Recolours the blue water of the vanilla fish pond module icon into orange-yellow sand.
import sys, colorsys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
px = im.load()
W, H = im.size
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        hd = h * 360
        if s < 0.12 or not (170 <= hd <= 250):
            continue
        # soft weight: full inside 185..235, fading at the edges and at low saturation
        w = min(1.0, (hd - 170) / 15, (250 - hd) / 15) * min(1.0, (s - 0.12) / 0.15)
        nh = 40 / 360
        ns = min(1.0, s * 0.85 + 0.1)
        nv = min(1.0, v * 0.95 + 0.08)
        nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, nv)
        px[x, y] = (round(r + (nr * 255 - r) * w), round(g + (ng * 255 - g) * w), round(b + (nb * 255 - b) * w), a)
im.save(dst)

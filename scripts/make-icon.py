#!/usr/bin/env python3
"""Placeholder Mileprint mark (replica/brand.md, logo brief): one continuous
route line drawing a lowercase "m" that ends in a dot. Teal on near-black.
A designer should replace these before launch. Run: python3 scripts/make-icon.py"""
import math
from PIL import Image, ImageDraw

TEAL = (62, 224, 197, 255)
BG = (10, 10, 11, 255)
SS = 4  # supersample for smooth edges


def m_path(size, pad):
    """Points of an 'm': up the left stem, two arches, down to the right foot."""
    w = size - 2 * pad
    left, right = pad, pad + w
    top, bottom = pad + w * 0.18, pad + w * 0.82
    mid = (left + right) / 2
    r = (mid - left) / 2  # arch radius
    pts = [(left, bottom), (left, top + r)]
    for cx in (left + r, mid + r):
        for i in range(0, 181, 6):
            a = math.radians(180 - i)
            pts.append((cx + r * math.cos(a), top + r - r * math.sin(a)))
        pts.append((cx + r, bottom if cx == mid + r else top + r + (bottom - top - r) * 0.0))
        if cx == left + r:
            pts.append((mid, bottom))  # down the middle stem
            pts.append((mid, top + r))
    return pts


def draw_mark(size, stroke, pad, colour, bg=None, dot=True):
    S = size * SS
    im = Image.new('RGBA', (S, S), bg or (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(x * SS, y * SS) for x, y in m_path(size, pad)]
    d.line(pts, fill=colour, width=int(stroke * SS), joint='curve')
    for x, y in (pts[0], pts[-1]):  # round caps
        rr = stroke * SS / 2
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=colour)
    if dot:
        x, y = pts[-1]
        rr = stroke * SS * 0.95
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=colour)
    return im.resize((size, size), Image.LANCZOS)


def save(img, path, rgb=False):
    (img.convert('RGB') if rgb else img).save(path, optimize=True)
    print('wrote', path, img.size)


if __name__ == '__main__':
    out = 'assets/images/'
    save(draw_mark(1024, 92, 230, TEAL, BG), out + 'icon.png', rgb=True)  # iOS: no transparency
    save(draw_mark(512, 64, 150, TEAL), out + 'splash-icon.png')
    save(draw_mark(512, 40, 150, TEAL), out + 'android-icon-foreground.png')  # inside the adaptive safe zone
    save(Image.new('RGBA', (512, 512), BG), out + 'android-icon-background.png')
    save(draw_mark(432, 36, 126, (255, 255, 255, 255)), out + 'android-icon-monochrome.png')
    save(draw_mark(48, 7, 8, TEAL, BG, dot=False), out + 'favicon.png')

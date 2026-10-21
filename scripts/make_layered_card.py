"""Builds the layered Draft Heroes card: transparent PNG layers + a manifest.

Layers (back to front): background, logo, player, text, frame, ball. The player
is cut out of src/assets/ronaldo_card.webp with rembg (cached as player_cutout.png);
everything else is drawn here. Run with a venv that has pillow, numpy and rembg:

    python scripts/make_layered_card.py
"""
import json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
ASSETS = os.path.join(ROOT, 'src', 'assets')
OUT = os.path.join(ASSETS, 'layered-card')
W, H = 700, 980
SS = 2  # supersample for anti-aliasing
NAVY, DEEP, GOLD, CYAN = (14, 22, 56), (6, 10, 30), (255, 200, 60), (0, 229, 255)
FONTS = '/System/Library/Fonts/Supplemental/'
impact = lambda s: ImageFont.truetype(FONTS + 'Impact.ttf', s)
din = lambda s: ImageFont.truetype(FONTS + 'DIN Condensed Bold.ttf', s)


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def background():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    t = y / H
    top, bot = np.array([34, 30, 110], np.float32), np.array([6, 10, 34], np.float32)
    img = top[None, None] * (1 - t[..., None]) + bot[None, None] * t[..., None]
    # Sunburst rays fanning out from behind the player's head.
    cx, cy = W / 2, 300
    ang = np.arctan2(y - cy, x - cx)
    rays = (np.sin(ang * 12) > 0).astype(np.float32)
    dist = np.hypot(x - cx, y - cy) / 700
    img += (rays * np.clip(1 - dist, 0, 1) * 34)[..., None] * np.array([0.6, 0.7, 1.0])
    # Hot glow behind the head.
    glow = np.exp(-(((x - cx) / 230) ** 2 + ((y - cy) / 260) ** 2))
    img += glow[..., None] * np.array([70, 90, 170], np.float32)
    # Diagonal gold speed stripes.
    stripe = ((x + y * 0.55) % 120) < 5
    img[stripe] = img[stripe] * 0.6 + np.array([255, 200, 60]) * 0.4 * np.clip(1.1 - t[stripe][:, None], 0.25, 1)
    # Halftone dots creeping up from the bottom.
    gy, gx = (y % 18) - 9, (x % 18) - 9
    dots = (np.hypot(gx, gy) < 4.2 * np.clip((t - 0.55) * 2.6, 0, 1))
    img[dots] += 28
    # Vignette.
    v = np.clip(1 - 0.55 * (((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2) * 0.5, 0.45, 1)
    img *= v[..., None]
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    out.putalpha(rounded_mask((W, H), 46))
    return out


def shield(draw, cx, cy, w, h, fill, outline, width):
    pts = [(cx - w / 2, cy - h / 2), (cx + w / 2, cy - h / 2), (cx + w / 2, cy + h * 0.1)]
    for i in range(1, 13):  # curved point at the bottom
        a = i / 12
        pts.append((cx + w / 2 * (1 - a) ** 0.9, cy + h * 0.1 + h * 0.4 * a ** 1.4))
    for i in range(12, -1, -1):
        a = i / 12
        pts.append((cx - w / 2 * (1 - a) ** 0.9, cy + h * 0.1 + h * 0.4 * a ** 1.4))
    draw.polygon(pts, fill=fill, outline=outline, width=width)


def logo():
    img = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = W / 2 * SS, 290 * SS
    # Large watermark crest behind the player.
    shield(d, cx, cy, 380 * SS, 430 * SS, (255, 255, 255, 18), (255, 200, 60, 110), 7 * SS)
    shield(d, cx, cy, 330 * SS, 375 * SS, None, (255, 255, 255, 60), 3 * SS)
    d.text((cx, cy - 10 * SS), 'DH', font=impact(190 * SS), fill=(255, 200, 60, 70), anchor='mm')
    for k in range(5):  # crown of stars
        a = math.radians(-90 + (k - 2) * 22)
        sx, sy = cx + math.cos(a) * 230 * SS, cy + math.sin(a) * 230 * SS - 20 * SS
        d.text((sx, sy), '★', font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf', 34 * SS), fill=(255, 200, 60, 140), anchor='mm')
    return img.resize((W, H), Image.LANCZOS)


def player():
    cut_path = os.path.join(OUT, 'player_cutout.png')
    if not os.path.exists(cut_path):
        from rembg import remove, new_session
        src = Image.open(os.path.join(ASSETS, 'ronaldo_card.webp')).convert('RGB')
        remove(src, session=new_session('isnet-general-use')).save(cut_path)
    cut = Image.open(cut_path).convert('RGBA')
    a = np.array(cut).astype(np.float32)
    h0, w0 = a.shape[:2]
    yy, xx = np.mgrid[0:h0, 0:w0].astype(np.float32)
    alpha = np.clip((a[..., 3] - 70) / 150, 0, 1)  # harden the faint ghosting rembg leaves
    alpha *= np.clip((540 - yy) / 110, 0, 1)  # torso dissolves before the text block
    edge = np.clip(np.minimum(xx - 14, 486 - xx) / 14, 0, 1)
    alpha *= np.where(yy > 330, edge, 1)  # drop the old card frame down the sides
    alpha *= np.where(yy > 335, np.clip((xx - 80) / 40, 0, 1), 1)  # ghost of the old crest left of the torso
    a[..., 3] = alpha * 255
    cut = Image.fromarray(a.astype(np.uint8), 'RGBA')
    scale = W / w0
    cut = cut.resize((W, round(h0 * scale)), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(cut, (0, -52))
    return out


def ball():
    R, S = 96, 4
    n = 2 * R * S
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    c = n / 2
    nx, ny = (x - c) / (R * S), (y - c) / (R * S)
    r2 = nx * nx + ny * ny
    nz = np.sqrt(np.clip(1 - r2, 0, 1))
    light = np.clip(nx * -0.4 + ny * -0.5 + nz * 0.75, 0, 1)
    shade = 0.55 + 0.45 * light
    img = np.ones((n, n, 3), np.float32) * 255 * shade[..., None]
    base = Image.fromarray(img.astype(np.uint8), 'RGB').convert('RGBA')
    d = ImageDraw.Draw(base)

    def pent(px, py, rad, rot):
        return [(px + math.cos(rot + i * 2 * math.pi / 5) * rad, py + math.sin(rot + i * 2 * math.pi / 5) * rad) for i in range(5)]

    patches = [pent(c, c, 0.27 * R * S, -math.pi / 2)]
    for k in range(5):
        a = -math.pi / 2 + k * 2 * math.pi / 5
        patches.append(pent(c + math.cos(a) * 0.82 * R * S, c + math.sin(a) * 0.82 * R * S, 0.27 * R * S, a + math.pi))
        # seams joining the centre patch to the outer ones
        d.line([(c + math.cos(a) * 0.27 * R * S, c + math.sin(a) * 0.27 * R * S), (c + math.cos(a) * 0.6 * R * S, c + math.sin(a) * 0.6 * R * S)], fill=(40, 40, 50, 255), width=4 * S)
    for p in patches:
        d.polygon(p, fill=(20, 22, 32, 255))
    arr = np.array(base).astype(np.float32)
    # Re-apply sphere shading over the patches, then specular and cut to a disc.
    arr[..., :3] *= (0.5 + 0.5 * light)[..., None] / np.maximum(shade, 1e-3)[..., None] * shade[..., None] if False else 1
    arr[..., :3] *= (0.6 + 0.4 * light)[..., None]
    spec = np.exp(-(((nx + 0.35) / 0.25) ** 2 + ((ny + 0.4) / 0.2) ** 2))
    arr[..., :3] += spec[..., None] * 140
    rim = np.clip(r2, 0, 1) ** 6
    arr[..., :3] += rim[..., None] * np.array([0, 90, 110])  # cyan rim light
    arr[..., 3] = np.clip((1 - np.sqrt(r2)) * R * S / 2, 0, 1) * 255
    ball_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA').resize((2 * R, 2 * R), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # Soft contact glow, then the ball.
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([500 - 20, 500 - 20, 680 + 20, 680 + 20], fill=(0, 229, 255, 70))
    out.alpha_composite(glow.filter(ImageFilter.GaussianBlur(28)))
    out.alpha_composite(ball_img, (590 - R, 590 - R))
    return out


def tracked(draw, cx, y, text, font, fill, tracking, stroke=0, stroke_fill=None):
    widths = [draw.textlength(ch, font=font) for ch in text]
    x = cx - (sum(widths) + tracking * (len(text) - 1)) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill, anchor='ls', stroke_width=stroke, stroke_fill=stroke_fill)
        x += w + tracking


def texts():
    img = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = lambda v: v * SS
    # Translucent plate under the name and stats.
    d.rounded_rectangle([s(40), s(668), s(660), s(930)], s(28), fill=(6, 10, 30, 175), outline=(255, 200, 60, 160), width=s(3))
    d.text((s(70), s(190)), '95', font=impact(s(150)), fill=GOLD, anchor='ls', stroke_width=s(5), stroke_fill=DEEP)
    d.text((s(76), s(250)), 'LW', font=din(s(62)), fill=(255, 255, 255, 255), anchor='ls', stroke_width=s(3), stroke_fill=DEEP)
    tracked(d, s(350), s(752), 'RONALDO', impact(s(86)), (255, 255, 255, 255), s(5), s(3), DEEP)
    stats = [('PAC', 90), ('SHO', 93), ('PAS', 82), ('DRI', 90), ('DEF', 33), ('PHY', 80)]
    for i, (k, v) in enumerate(stats):
        x = s(100 + i * 100)
        d.text((x, s(808)), k, font=din(s(36)), fill=GOLD, anchor='ms')
        d.text((x, s(862)), str(v), font=impact(s(54)), fill=(255, 255, 255, 255), anchor='ms')
    d.line([s(90), s(884), s(610), s(884)], fill=(255, 200, 60, 120), width=s(2))
    d.text((s(350), s(914)), 'DRAFT HEROES  •  ICON SERIES', font=din(s(30)), fill=(0, 229, 255, 235), anchor='ms')
    # Small solid badge, top right.
    shield(d, s(600), s(118), s(96), s(110), (14, 22, 56, 255), GOLD, s(5))
    d.text((s(600), s(118)), 'DH', font=impact(s(52)), fill=GOLD, anchor='mm')
    return img.resize((W, H), Image.LANCZOS)


def frame():
    img = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = lambda v: v * SS
    d.rounded_rectangle([s(4), s(4), s(W - 5), s(H - 5)], s(44), outline=GOLD, width=s(14))
    d.rounded_rectangle([s(22), s(22), s(W - 23), s(H - 23)], s(30), outline=(255, 255, 255, 150), width=s(3))
    for sx in (1, -1):  # corner accents
        for sy in (1, -1):
            cx, cy = (s(52) if sx > 0 else s(W - 52)), (s(52) if sy > 0 else s(H - 52))
            d.line([(cx, cy), (cx + sx * s(60), cy)], fill=CYAN, width=s(5))
            d.line([(cx, cy), (cx, cy + sy * s(60))], fill=CYAN, width=s(5))
    return img.resize((W, H), Image.LANCZOS)


def shadow_of(layer):
    """Soft black silhouette of a layer, moved around by the parallax effect."""
    alpha = layer.getchannel('A').filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.75))
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    out.putalpha(alpha)
    return out


LAYERS = [
    ('background', background, 0.0),
    ('logo', logo, 0.2),
    ('player', player, 0.55),
    ('text', texts, 0.4),
    ('frame', frame, 0.0),
    ('ball', ball, 1.0),
]
SHADOWS = {'player', 'ball'}
FLAT_ORDER = ['background', 'logo', 'player', 'frame', 'text', 'ball']

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    flat = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    manifest = {'width': W, 'height': H, 'layers': []}
    for name, fn, depth in LAYERS:
        im = fn()
        im.save(os.path.join(OUT, f'{name}.png'), optimize=True)
        if name in SHADOWS:
            shadow_of(im).save(os.path.join(OUT, f'{name}_shadow.png'), optimize=True)
            manifest['layers'].append({'id': f'{name}_shadow', 'file': f'{name}_shadow.png', 'depth': depth, 'shadowOf': name})
        manifest['layers'].append({'id': name, 'file': f'{name}.png', 'depth': depth})
    for name in FLAT_ORDER:
        flat.alpha_composite(Image.open(os.path.join(OUT, f'{name}.png')))
    flat.save(os.path.join(OUT, 'flat.png'), optimize=True)
    manifest['flat'] = 'flat.png'
    json.dump(manifest, open(os.path.join(OUT, 'layers.json'), 'w'), indent=2)
    print('wrote', OUT)

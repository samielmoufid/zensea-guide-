# Visuels des cartes de leçons : un handpan Zensea vu de la place du joueur,
# posé sur le plancher du temple, une note frappée qui s'allume (onde dorée).
import json, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
HP = 'public/atelier/handpans/'
PL = 'public/temple/plancher-diff.jpg'
champs = json.load(open(HP + 'champs.json'))
W, H = 1280, 720

def sol(seed):
    random.seed(seed)
    p = Image.open(PL).convert('RGB')
    p = p.rotate(90 if seed % 2 else 0, expand=True).resize((W, W))
    p = p.crop((0, (W - H) // 2, W, (W - H) // 2 + H))
    p = ImageEnhance.Brightness(p).enhance(0.55)
    vert = Image.new('RGB', (W, H), (10, 30, 22))
    p = Image.blend(p, vert, 0.38)
    # lumière douce venue du haut à gauche, coins plongés dans le noir
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for r in range(900, 0, -12):
        d.ellipse((W * .62 - r * 1.25, H * .48 - r, W * .62 + r * 1.25, H * .48 + r), fill=int(255 * (1 - r / 900) ** .7))
    noir = Image.new('RGB', (W, H), (3, 8, 6))
    return Image.composite(p, noir, m.filter(ImageFilter.GaussianBlur(40)))

def carte(mid, note, out, rot=0, seed=0):
    fond = sol(seed)
    D = int(H * .96); cx, cy = int(W * .67), int(H * .53)
    hp = Image.open(HP + f'hp-{mid}.jpg').convert('RGB').resize((D, D), Image.LANCZOS).rotate(rot, resample=Image.BICUBIC)
    mask = Image.new('L', (D, D), 0); ImageDraw.Draw(mask).ellipse((2, 2, D - 2, D - 2), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.5))
    # ombre portée
    om = Image.new('L', (W, H), 0)
    ImageDraw.Draw(om).ellipse((cx - D / 2 + 18, cy - D / 2 + 34, cx + D / 2 + 30, cy + D / 2 + 46), fill=210)
    fond = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), fond, om.filter(ImageFilter.GaussianBlur(38)))
    fond.paste(hp, (cx - D // 2, cy - D // 2), mask)
    # la note frappée
    c = champs[mid]
    pts = [c['ding']] + c['champs']
    u, v = pts[note % len(pts)]
    a = math.radians(-rot); uu, vv = u * math.cos(a) - v * math.sin(a), u * math.sin(a) + v * math.cos(a)
    R = D / 2 * 0.94
    nx, ny = cx + uu * R, cy + vv * R
    rc = R * (c['rayonDing'] if note % len(pts) == 0 else c['rayonChamp']) * 1.25
    lum = Image.new('RGB', (W, H), (0, 0, 0)); dl = ImageDraw.Draw(lum)
    for k in range(26, 0, -1):
        rr = rc * (0.4 + k * 0.09); t = (1 - k / 26) ** 2
        dl.ellipse((nx - rr, ny - rr, nx + rr, ny + rr), fill=(int(255 * t * .55), int(226 * t * .55), int(170 * t * .5)))
    lum = lum.filter(ImageFilter.GaussianBlur(10))
    fond = ImageChops.add(fond, lum)
    on = Image.new('RGBA', (W, H), (0, 0, 0, 0)); do = ImageDraw.Draw(on)
    for k, al in ((1.35, 170), (1.9, 95), (2.6, 45)):
        rr = rc * k; do.ellipse((nx - rr, ny - rr, nx + rr, ny + rr), outline=(240, 222, 178, al), width=3)
    on = on.filter(ImageFilter.GaussianBlur(0.8))
    fond = Image.alpha_composite(fond.convert('RGBA'), on).convert('RGB')
    # grain léger
    random.seed(seed + 7)
    g = Image.effect_noise((W, H), 18).convert('RGB')
    fond = Image.blend(fond, ImageChops.multiply(fond, g.point(lambda x: 200 + x // 5)), .35)
    fond.save(out, quality=86, optimize=True, progressive=True)

PLAN = [('108', 3, 0), ('101', 0, 12), ('112', 5, -8), ('106', 2, 20), ('103', 7, 0), ('114', 4, -15),
        ('110', 1, 6), ('121', 6, -4), ('117', 8, 10), ('102', 3, -20), ('119', 5, 14), ('109', 2, -6)]
for k, (mid, note, rot) in enumerate(PLAN):
    carte(mid, note, f'carte-{k+1:02d}.jpg', rot, k)
    print('ok', k + 1, mid)

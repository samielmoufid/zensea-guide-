# Cartes de normales des handpans, sans le grain du martelage.
# Part des cartes de hauteur (hm-*.jpg) : on efface le bruit fin (flou gaussien),
# on garde les creux des champs et le dôme du ding, puis on recalcule les normales
# en 512 px (le relief lissé n'a pas de détail plus fin), avec la même convention (signes et force) que les anciennes cartes nm-*.jpg.
import glob, os, json
import numpy as np
from PIL import Image, ImageFilter
D = 'public/atelier/handpans/'
N = 512

def charge(f, n=None):
    im = Image.open(f)
    if n: im = im.resize((n, n), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)

def gradients(h):
    gx = np.zeros_like(h); gy = np.zeros_like(h)
    gx[:, 1:-1] = (h[:, 2:] - h[:, :-2]) / 2
    gy[1:-1, :] = (h[2:, :] - h[:-2, :]) / 2
    return gx, gy

# Convention et force : ajustées une fois sur une carte existante, dans les champs lissés.
def calibre(mid):
    h = charge(D + f'hm-{mid}.jpg') / 255
    hl = np.asarray(Image.fromarray((h * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
    nm = charge(D + f'nm-{mid}.jpg')
    nml = np.stack([np.asarray(Image.fromarray(nm[..., c].astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32) for c in range(3)], -1) / 127.5 - 1
    gx, gy = gradients(hl)
    m = (np.abs(gx) + np.abs(gy)) > np.percentile(np.abs(gx) + np.abs(gy), 90)
    kx = (nml[..., 0][m] * gx[m]).sum() / (gx[m] ** 2).sum()
    ky = (nml[..., 1][m] * gy[m]).sum() / (gy[m] ** 2).sum()
    return kx, ky

# mesuré une fois avec calibre('103') sur les cartes d'origine (à 512 px)
kx, ky = -40.8, 41.1
print('force x %.1f, y %.1f (à 512 px)' % (kx, ky))
CH = json.load(open(D + 'champs.json'))
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
u, v = (xx + .5) / N * 2 - 1, (yy + .5) / N * 2 - 1

def masque(c):
    # 1 dans les champs et le ding (avec leur bord), 0 sur la coque : fondu doux entre les deux
    m = np.zeros((N, N), np.float32)
    pts = [(c.get('ding', [0, 0]), c.get('rayonDing', .17))] + [(q, c.get('rayonChamp', .1)) for q in c.get('champs', [])]
    for (cx, cy), r in pts:
        d = np.sqrt((u - cx) ** 2 + (v - cy) ** 2) / r
        m = np.maximum(m, np.clip((1.8 - d) / .5, 0, 1))
    return m * m * (3 - 2 * m)

for f in sorted(glob.glob(D + 'hm-*.jpg')):
    nom = os.path.basename(f)[3:-4]
    h = Image.open(f).convert('L').filter(ImageFilter.GaussianBlur(4)).resize((N, N), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2))
    h = np.asarray(h, np.float32) / 255
    c = CH.get(nom)
    if not c:
        # le dessous (pas de champs) : on ne garde que les grandes formes, le gu et le bord
        h = np.asarray(Image.fromarray((h * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(8)), np.float32) / 255
    if c:
        m = masque(c)
        disque = (u * u + v * v) < .9
        base = np.median(h[disque & (m < .01)]) if (disque & (m < .01)).any() else np.median(h)
        h = base + (h - base) * m
    gx, gy = gradients(h)
    # même pente quelle que soit la taille : les gradients rétrécissent quand N grandit
    x, y = gx * kx * N / 512, gy * ky * N / 512
    z = np.ones_like(x)
    l = np.sqrt(x * x + y * y + z * z)
    rgb = np.stack([x / l, y / l, z / l], -1)
    out = np.clip((rgb + 1) * 127.5, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(D + f'nm-{nom}.jpg', quality=90, optimize=True)
    print('nm', nom)

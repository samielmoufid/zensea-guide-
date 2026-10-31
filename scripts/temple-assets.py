"""Prépare les images du temple doré à partir des fichiers Poly Haven (CC0).

  python3 -I scripts/temple-assets.py <dossier des téléchargements> public/temple

Entrées : sunset_forest.jpg (panorama 8K « tonemapped »), sunset_forest_1k.hdr,
hinoki_planks_{diff,nor_gl,rough}_2k.jpg, dark_wood_{diff,nor_gl,rough}_2k.jpg.
Le panorama est étalonné « heure dorée » : balance chaude, ciel réchauffé vers
l'horizon, voile doré bas, contraste doux.
"""
import os
import shutil
import sys

import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def jpg(nom, img, q=86):
    cv2.imwrite(os.path.join(OUT, nom), img, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])


pano = cv2.imread(os.path.join(SRC, 'sunset_forest.jpg')).astype(np.float32) / 255.0
H, W = pano.shape[:2]
b, g, r = pano[..., 0], pano[..., 1], pano[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
el = 0.5 - (np.arange(H, dtype=np.float32)[:, None] + 0.5) / H          # +0.5 zénith … −0.5 nadir
# ciel : clair et bleuté
ciel = np.clip((b - np.maximum(r, g) * 0.92) * 6, 0, 1) * np.clip((lum - 0.45) * 3, 0, 1) * (el > -0.05)
# dégradé de couchant : pêche en haut, or près de l'horizon
haut = np.array([0.66, 0.78, 0.98], np.float32)      # BGR pêche rosé
bas = np.array([0.52, 0.80, 1.00], np.float32)       # BGR or pâle
k = np.clip(el / 0.35, 0, 1)[..., None]
grad = bas * (1 - k) + haut * k
out = pano.copy()
m = ciel[..., None] * 0.85
out = out * (1 - m) + (grad * (0.75 + 0.35 * lum[..., None])) * m
# balance chaude et voile doré près de l'horizon
out *= np.array([0.86, 0.98, 1.08], np.float32)
voile = np.exp(-np.abs(el) / 0.09)[..., None] * 0.10
out = out * (1 - voile) + np.array([0.55, 0.78, 1.0], np.float32) * voile
# contraste doux, ombres un peu plus profondes
out = np.clip(out, 0, 1)
out = out * out * (3 - 2 * out) * 0.35 + out * 0.65
# le sol (sous le plancher) s'assombrit : il ne se voit qu'entre les lattes du bord
sol = np.clip((-el - 0.08) / 0.25, 0, 1)[..., None]
out *= 1 - sol * 0.35
out8 = (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
jpg('foret-6k.jpg', cv2.resize(out8, (6144, 3072), interpolation=cv2.INTER_AREA), 84)
jpg('foret-4k.jpg', cv2.resize(out8, (4096, 2048), interpolation=cv2.INTER_AREA), 85)
jpg('foret-mini.jpg', cv2.resize(out8, (1024, 512), interpolation=cv2.INTER_AREA), 80)
# Lumière de la forêt (HDR) en deux PNG sans perte : mantisses RVB et exposant
# commun (RGBE). Le .hdr n'est pas servi partout ; deux PNG, si.
hdr = cv2.imread(os.path.join(SRC, 'sunset_forest_1k.hdr'), cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR)[..., ::-1]
mx = hdr.max(-1)
mant_, ex = np.frexp(mx)
k = np.where(mx > 1e-32, mant_ * 256.0 / np.maximum(mx, 1e-32), 0)
mant = np.clip(hdr * k[..., None], 0, 255).astype(np.uint8)
expo = np.where(mx > 1e-32, ex + 128, 0).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, 'lumiere-rvb.png'), mant[..., ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 9])
cv2.imwrite(os.path.join(OUT, 'lumiere-exp.png'), expo, [cv2.IMWRITE_PNG_COMPRESSION, 9])

for src, dst in (('hinoki_planks', 'plancher'), ('dark_wood', 'bois-sombre')):
    for k, q in (('diff', 84), ('nor_gl', 90), ('rough', 82)):
        im = cv2.imread(os.path.join(SRC, f'{src}_{k}_2k.jpg'))
        jpg(f'{dst}-{k}.jpg', cv2.resize(im, (1024, 1024), interpolation=cv2.INTER_AREA), q)

tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(len(os.listdir(OUT)), 'fichiers,', round(tot / 1e6, 2), 'Mo')

"""Assemble les fichiers de theme du visualiseur mural Murizelia.

  python3 -I tools/build.py <racine mur3d>

Entrees : out/meta.json, out/tex/*, room/*, src/*
Sortie  : theme/assets/*, theme/snippets/mm-mur-3d.liquid
"""
import json
import os
import shutil
import sys
import time

import cv2
import numpy as np

BASE = sys.argv[1]
OUT = os.path.join(BASE, 'theme')
AS = os.path.join(OUT, 'assets')
SN = os.path.join(OUT, 'snippets')
for d in (AS, SN):
    os.makedirs(d, exist_ok=True)

meta = json.load(open(os.path.join(BASE, 'out', 'meta.json')))
TEX = os.path.join(BASE, 'out', 'tex')

# rugosite du carreau / du joint (le joint est mat, le carreau brille)
RUGO = {'mosaique': (0.10, 0.85), 'damier': (0.12, 0.8), 'baguettes': (0.14, 0.85)}


def jpg(path, img, q):
    cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_PROGRESSIVE, 0])


tuiles = {}
for e in meta:
    h = e['handle']
    fam = e['famille']
    # couleur étalonnée sur les photos d'ambiance quand elle existe (tools/etalon.py)
    etal = os.path.join(BASE, 'out', 'tex-etal', h + '.jpg')
    alb = cv2.imread(etal if os.path.exists(etal) else os.path.join(TEX, h + '.jpg'))
    nor = cv2.imread(os.path.join(TEX, h + '-n.jpg'))
    jpg(os.path.join(AS, 'mm-mur-%s.jpg' % h), alb, 86)
    jpg(os.path.join(AS, 'mm-mur-%s-n.jpg' % h), nor, 90)
    vignette = cv2.resize(alb, (240, 240), interpolation=cv2.INTER_AREA)
    jpg(os.path.join(AS, 'mm-mur-%s-t.jpg' % h), vignette, 82)
    rugo = fam in RUGO
    if rugo:
        hm = cv2.imread(os.path.join(TEX, h + '-h.png'), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
        t, j = RUGO[fam]
        r = j + (t - j) * np.clip(hm * 1.4 - 0.2, 0, 1)
        # canal vert = rugosite (convention glTF / three.js)
        img = np.zeros((256, 256, 3), np.uint8)
        img[..., 1] = (r * 255).astype(np.uint8)
        img[..., 0] = img[..., 2] = img[..., 1]
        jpg(os.path.join(AS, 'mm-mur-%s-r.jpg' % h), img, 88)
    # couleur moyenne : fond de vignette pendant le chargement
    moy = alb.reshape(-1, 3).mean(0)
    tuiles[h] = {
        'f': fam,
        'm': e['motif_cm'],
        'p': e['plaque_cm'],
        'r': 1 if rugo else 0,
        'c': '#%02x%02x%02x' % (int(moy[2]), int(moy[1]), int(moy[0])),
    }

# textures de la piece 3D (Poly Haven, CC0)
ROOM = os.path.join(BASE, 'room')
for src, dst, size, q in [
    ('laminate_floor_02_diff.jpg', 'mm-mur-sol-chene.jpg', 1024, 80),
    ('laminate_floor_02_nor_gl.jpg', 'mm-mur-sol-chene-n.jpg', 512, 86),
    ('herringbone_parquet_diff.jpg', 'mm-mur-sol-chevron.jpg', 1024, 80),
    ('herringbone_parquet_nor_gl.jpg', 'mm-mur-sol-chevron-n.jpg', 512, 86),
    ('oak_veneer_01_diff.jpg', 'mm-mur-bois.jpg', 1024, 80),
    ('oak_veneer_01_nor_gl.jpg', 'mm-mur-bois-n.jpg', 512, 86),
]:
    im = cv2.imread(os.path.join(ROOM, src))
    jpg(os.path.join(AS, dst), cv2.resize(im, (size, size), interpolation=cv2.INTER_AREA), q)

# photo d'exemple (rendue une fois par tools/demo.mjs) si disponible
demo = os.path.join(BASE, 'out', 'demo.jpg')
if os.path.exists(demo):
    shutil.copy(demo, os.path.join(AS, 'mm-mur-demo.jpg'))

VERSION = time.strftime('%Y%m%d%H%M')
SRC = os.path.join(BASE, 'src')
for nom in ('mm-mur-3d.js', 'mm-mur-3d-scene.js'):
    s = open(os.path.join(SRC, nom), encoding='utf-8').read()
    s = s.replace('/*@@TUILES@@*/{}', json.dumps(tuiles, ensure_ascii=False, separators=(',', ':')))
    s = s.replace('@@VERSION@@', VERSION)
    open(os.path.join(AS, nom), 'w', encoding='utf-8').write(s)

liq = open(os.path.join(SRC, 'mm-mur-3d.liquid'), encoding='utf-8').read()
liq = liq.replace('@@HANDLES@@', ','.join(sorted(tuiles)))
open(os.path.join(SN, 'mm-mur-3d.liquid'), 'w', encoding='utf-8').write(liq)

tot = sum(os.path.getsize(os.path.join(AS, f)) for f in os.listdir(AS))
print(len(tuiles), 'carreaux,', len(os.listdir(AS)), 'assets,', round(tot / 1e6, 2), 'Mo')

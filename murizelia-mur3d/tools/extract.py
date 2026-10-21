"""Extraction des textures raccordables a partir de la photo « plaque sur fond blanc ».

Pour chaque produit :
  1. on estime la couleur du fond sur le pourtour de l'image ;
  2. on isole la plaque (ecart au fond + fermeture morphologique) et on prend son rectangle ;
  3. on mesure le pas de la grille (autocorrelation des profils) pour en deduire la largeur du joint ;
  4. on recadre la plaque et on ajoute un demi-joint sur chaque bord : le motif se repete alors
     exactement comme deux plaques posees bord a bord ;
  5. on calcule une carte de relief (carreau haut, joint bas) et la carte de normales associee.

Sortie : out/tex/<handle>.jpg (couleur), out/tex/<handle>-n.jpg (normales), out/meta.json
"""
import json, os, sys, re
import numpy as np
import cv2

BASE = sys.argv[1]
OUT = os.path.join(BASE, 'out')
os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'dbg'), exist_ok=True)
P = json.load(open(os.path.join(BASE, 'data/produits.json')))
TEX = 1024          # taille de la texture couleur
NTEX = 512          # taille de la carte de normales


def famille(p):
    t = p['title']
    if t.startswith('Marbr'):
        return 'marbre'
    if t.startswith('Mosa'):
        return 'damier' if 'damier' in p['handle'] else 'mosaique'
    return 'baguettes'


def taille_cm(p):
    m = re.search(r'(\d+(?:-\d+)?)x(\d+(?:-\d+)?)-cm', p['handle'])
    if m:
        return float(m.group(1).replace('-', '.')), float(m.group(2).replace('-', '.'))
    return 30.0, 30.0


def fond(img):
    b = np.concatenate([img[:12].reshape(-1, 3), img[-12:].reshape(-1, 3),
                        img[:, :12].reshape(-1, 3), img[:, -12:].reshape(-1, 3)])
    return np.median(b, axis=0)


def boite_plaque(img, bg):
    diff = np.abs(img.astype(np.int16) - bg.astype(np.int16)).sum(axis=2)
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    bords = cv2.Canny(cv2.GaussianBlur(gris, (5, 5), 0), 20, 60)
    m = ((diff > 24) | (bords > 0)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, w, h = stats[i, :4]
    # ajustement fin : on resserre sur les lignes/colonnes vraiment « plaque »
    sub = diff[y:y + h, x:x + w] > 30
    cols = np.where(sub.mean(axis=0) > 0.25)[0]
    rows = np.where(sub.mean(axis=1) > 0.25)[0]
    if len(cols) > w * 0.6 and len(rows) > h * 0.6:
        x, w = x + cols[0], cols[-1] - cols[0] + 1
        y, h = y + rows[0], rows[-1] - rows[0] + 1
    return int(x), int(y), int(w), int(h)


def affine_bords(img, x, y, w, h, fen_frac):
    """Place chaque bord sur le saut net carreau/fond (l'ombre portee, elle, est diffuse)."""
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (3, 3), 0)
    gx = np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3))
    gy = np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    H, W = g.shape
    fx = max(4, int(w * fen_frac)); fy = max(4, int(h * fen_frac))
    ya, yb = y + int(h * 0.15), y + int(h * 0.85)
    xa, xb = x + int(w * 0.15), x + int(w * 0.85)
    px = gx[ya:yb].mean(axis=0)
    py = gy[:, xa:xb].mean(axis=1)
    def pic(profil, a, b):
        a, b = max(0, a), min(len(profil), b)
        return a + int(np.argmax(profil[a:b]))
    l = pic(px, x - 6, x + fx)
    r = pic(px, x + w - fx, x + w + 6)
    t = pic(py, y - 6, y + fy)
    b = pic(py, y + h - fy, y + h + 6)
    return l, t, r - l, b - t


def periode(profil, mini, maxi):
    p = profil - profil.mean()
    ac = np.correlate(p, p, mode='full')[len(p) - 1:]
    ac /= ac[0] + 1e-9
    seg = ac[mini:maxi]
    return mini + int(np.argmax(seg)), float(seg.max())


def joint(plaque, fam):
    """Largeur du joint (px) et couleur, mesurees sur l'axe horizontal."""
    if fam == 'marbre':
        return 0, None
    g = cv2.cvtColor(plaque, cv2.COLOR_BGR2GRAY).astype(np.float32)
    W = plaque.shape[1]
    prof = g.mean(axis=0)
    if fam == 'baguettes':
        per, _ = periode(prof, W // 12, W // 5)
    elif fam == 'damier':
        per, _ = periode(prof, W // 6, W // 2)
    else:
        per, _ = periode(prof, W // 20, W // 6)
    n = max(1, round(W / per))
    gap = n * per - W
    # repli : mesure directe des colonnes claires
    clair = prof > np.percentile(prof, 92)
    runs, cur = [], 0
    for v in clair:
        if v:
            cur += 1
        elif cur:
            runs.append(cur); cur = 0
    direct = int(np.median(runs)) if runs else 0
    if not (1 <= gap <= per * 0.25):
        gap = direct
    gap = int(np.clip(gap, 2, max(3, per * 0.2)))
    # couleur du joint : pixels des colonnes les plus claires, hors bords
    idx = np.argsort(prof)[-max(3, gap * n):]
    col = np.median(plaque[:, idx].reshape(-1, 3), axis=0)
    if fam == 'damier':
        # dans un damier, les « joints » se confondent avec les carreaux blancs : joint fin et neutre
        gap = max(2, min(gap, int(W * 0.006)))
        col = np.array([236, 236, 234], dtype=np.float32)
    return gap, col, per, n


def eclairage_neutre(tex, fam):
    """Retire le reflet et le degrade du studio (basses frequences de luminance) :
    sinon la tache de lumiere de la photo se repeterait sur chaque plaque du mur."""
    if fam in ('marbre', 'damier'):
        return tex
    sig, force = {'mosaique': (tex.shape[0] / 6, 0.85), 'baguettes': (tex.shape[0] / 4, 0.6)}[fam]
    lab = cv2.cvtColor(tex, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab[..., 0]
    bas = cv2.GaussianBlur(np.pad(L, int(sig * 2), mode='wrap'), (0, 0), sig)[int(sig * 2):-int(sig * 2), int(sig * 2):-int(sig * 2)]
    lab[..., 0] = np.clip(L - force * (bas - bas.mean()), 0, 255)
    return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)


def sans_reflets(tex, fam):
    """Efface les reflets speculaires du studio sur les carreaux colores (pixels clairs et
    desatures entoures de couleur) : un reflet fige se repeterait a l'identique sur le mur."""
    if fam != 'damier':
        return tex
    lab = cv2.cvtColor(tex, cv2.COLOR_BGR2LAB)
    L = lab[..., 0].astype(np.float32)
    sat = np.hypot(lab[..., 1].astype(np.float32) - 128, lab[..., 2].astype(np.float32) - 128)
    k = 41 if fam != 'damier' else 61
    sat_env = cv2.medianBlur(np.clip(sat, 0, 255).astype(np.uint8), k).astype(np.float32)
    L_env = cv2.medianBlur(L.astype(np.uint8), k).astype(np.float32)
    spec = (L > L_env + 28) & (sat < sat_env * 0.55) & (sat_env > 18)
    m = cv2.dilate(spec.astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
    if m.mean() < 0.2:
        return tex
    return cv2.inpaint(tex, m, 6, cv2.INPAINT_TELEA)


def lignes_joint(profil, n, per):
    """Centres des n-1 joints interieurs (maxima locaux du profil de luminosite)."""
    pr = np.convolve(profil, np.ones(3) / 3, mode='same')
    L = len(pr)
    pas = L / n
    out = []
    for k in range(1, n):
        c = int(round(k * pas))
        a, b = max(1, c - int(pas * 0.3)), min(L - 1, c + int(pas * 0.3))
        out.append(a + int(np.argmax(pr[a:b])))
    return [0] + out + [L]


def mosaique_sans_reflets(pl, n, parite=False):
    """Repere chaque petit carreau ; ceux qui portent un reflet de studio sont remplaces par un
    carreau propre de la meme plaque (meme taille, meme teinte de lot)."""
    g = cv2.cvtColor(pl, cv2.COLOR_BGR2GRAY).astype(np.float32)
    lab = cv2.cvtColor(pl, cv2.COLOR_BGR2LAB).astype(np.float32)
    sat = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
    xs = lignes_joint(g.mean(axis=0), n, None)
    ys = lignes_joint(g.mean(axis=1), n, None)
    cells = []
    for j in range(n):
        for i in range(n):
            x0, x1, y0, y1 = xs[i], xs[i + 1], ys[j], ys[j + 1]
            m = max(2, int((x1 - x0) * 0.12))
            core = g[y0 + m:y1 - m, x0 + m:x1 - m]
            cs = sat[y0 + m:y1 - m, x0 + m:x1 - m]
            if core.size == 0:
                continue
            med = np.median(core)
            reflet = float(((core > med + 40) & (cs < np.median(cs) * 0.6 + 4)).mean())
            cells.append({'i': i, 'j': j, 'box': (x0, y0, x1, y1), 'reflet': reflet, 'L': float(med),
                          'S': float(np.median(cs))})
    if not cells:
        return pl, 0
    classe = (lambda c: (c['i'] + c['j']) % 2) if parite else (lambda c: 0)
    groupes = {}
    for c in cells:
        groupes.setdefault(classe(c), []).append(c)
    rng = np.random.default_rng(7)
    out = pl.copy(); total = 0
    for grp in groupes.values():
        Lg = np.median([c['L'] for c in grp]); Sg = np.median([c['S'] for c in grp])
        for c in grp:
            # carreau entierement « delave » par le reflet : plus clair et plus gris que les autres
            if c['L'] > Lg + 22 and c['S'] < Sg * 0.7 and Sg > 12:
                c['reflet'] = max(c['reflet'], 1.0)
        seuil = max(0.035, np.percentile([c['reflet'] for c in grp], 75) * 1.25)
        propres = [c for c in grp if c['reflet'] < seuil * 0.5]
        sales = [c for c in grp if c['reflet'] >= seuil]
        if not propres or len(sales) > len(grp) * 0.6:
            continue
        for c in sales:
            d = propres[int(rng.integers(len(propres)))]
            x0, y0, x1, y1 = c['box']; a0, b0, a1, b1 = d['box']
            out[y0:y1, x0:x1] = cv2.resize(pl[b0:b1, a0:a1], (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
            total += 1
    return out, total
    for c in []:
        d = None
        x0, y0, x1, y1 = c['box']; a0, b0, a1, b1 = d['box']
        patch = cv2.resize(pl[b0:b1, a0:a1], (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
        out[y0:y1, x0:x1] = patch
    return out, len(sales)


def hauteur(tex, fam, gap_px):
    """Carte de relief : 1 sur le carreau, 0 dans le joint, chanfrein arrondi."""
    g = cv2.cvtColor(tex, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    S = tex.shape[0]
    if fam == 'marbre':
        h = np.ones_like(g)
        b = max(2, S // 300)
        h[:b, :] = h[-b:, :] = 0.0
        h[:, :b] = h[:, -b:] = 0.0
        return cv2.GaussianBlur(h, (0, 0), b)
    lab = cv2.cvtColor(tex, cv2.COLOR_BGR2LAB).astype(np.float32)
    sat = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
    if fam == 'damier':
        bords = cv2.Canny((g * 255).astype(np.uint8), 30, 90)
        h = 1.0 - cv2.dilate(bords, np.ones((3, 3), np.uint8)).astype(np.float32) / 255.0
        return cv2.GaussianBlur(h, (0, 0), max(1.5, S / 400))
    # joint = clair et peu sature
    seuil_l = np.percentile(g, 88)
    m = ((g > seuil_l) & (sat < np.percentile(sat, 40) + 6)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    tile = 1.0 - m.astype(np.float32)
    # distance au joint -> chanfrein arrondi (effet 3D bombe)
    d = cv2.distanceTransform((tile > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    rayon = max(3.0, S / (60 if fam == 'mosaique' else 45))
    h = np.clip(d / rayon, 0, 1)
    h = np.sin(h * np.pi / 2)
    return cv2.GaussianBlur(h, (0, 0), 1.2)


def normales(h, force):
    # derivees periodiques (le motif se repete) : on travaille sur une copie bordee en miroir du motif
    k = 4
    hp = np.pad(h, k, mode='wrap')
    hx = cv2.Sobel(hp, cv2.CV_32F, 1, 0, ksize=3)[k:-k, k:-k]
    hy = cv2.Sobel(hp, cv2.CV_32F, 0, 1, ksize=3)[k:-k, k:-k]
    nx, ny, nz = -hx * force, hy * force, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nz / l, ny / l, nx / l], axis=2)   # BGR pour cv2 : B=z, G=y, R=x
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


meta = []
for p in P:
    fam = famille(p)
    wcm, hcm = taille_cm(p)
    src = os.path.join(BASE, 'dl', p['handle'], '0.webp')
    img = cv2.imdecode(np.fromfile(src, np.uint8), cv2.IMREAD_COLOR)
    bg = fond(img)
    x, y, w, h = boite_plaque(img, bg)
    # fenetre de recherche : moins d'un demi-carreau pour les grilles, 5 % pour le marbre
    fen = {'marbre': 0.05, 'mosaique': 0.035, 'damier': 0.06, 'baguettes': 0.04}[fam]
    x, y, w, h = affine_bords(img, x, y, w, h, fen)
    if fam == 'marbre':
        ins = max(3, int(w * 0.015))              # on retire le chant et l'ombre portee
        pl = img[y + ins:y + h - ins, x + ins:x + w - ins]
        pl = cv2.resize(pl, (TEX, TEX), interpolation=cv2.INTER_AREA)
        gap = 0
        unit = pl.copy()
        # joint capillaire entre deux plaques posees bord a bord
        unit[:1, :] = (unit[:1, :] * 0.9).astype(np.uint8)
        unit[:, :1] = (unit[:, :1] * 0.9).astype(np.uint8)
        info = {}
    else:
        pl = img[y:y + h, x:x + w]
        gap, col, per, n = joint(pl, fam)
        remplaces = 0
        if fam == 'mosaique':
            pl, remplaces = mosaique_sans_reflets(pl, n)
        elif fam == 'damier':
            n = 4                                  # plaque de 4 x 4 carres de 6,35 cm
            pl, remplaces = mosaique_sans_reflets(pl, n, parite=True)
        half = gap / 2.0
        # plaque + demi-joint de chaque cote, a l'echelle de la plaque
        Wp, Hp = pl.shape[1], pl.shape[0]
        Wu, Hu = Wp + gap, Hp + gap
        unit = np.empty((int(round(Hu)), int(round(Wu)), 3), np.uint8)
        unit[:] = col.astype(np.uint8)
        o = int(round(half))
        unit[o:o + Hp, o:o + Wp] = pl
        unit = cv2.resize(unit, (TEX, TEX), interpolation=cv2.INTER_AREA)
        info = {'periode_px': int(per), 'carreaux_par_ligne': int(n), 'carreaux_remplaces': int(remplaces)}
    unit = eclairage_neutre(sans_reflets(unit, fam), fam)
    hmap = hauteur(unit, fam, gap)
    nmap = normales(cv2.resize(hmap, (NTEX, NTEX), interpolation=cv2.INTER_AREA),
                    {'marbre': 2.0, 'mosaique': 5.0, 'damier': 3.0, 'baguettes': 4.0}[fam])
    cv2.imwrite(os.path.join(OUT, 'tex', p['handle'] + '.jpg'), unit, [cv2.IMWRITE_JPEG_QUALITY, 84])
    cv2.imwrite(os.path.join(OUT, 'tex', p['handle'] + '-n.jpg'), nmap, [cv2.IMWRITE_JPEG_QUALITY, 90])
    cv2.imwrite(os.path.join(OUT, 'tex', p['handle'] + '-h.png'), (cv2.resize(hmap, (256, 256), interpolation=cv2.INTER_AREA) * 255).clip(0, 255).astype(np.uint8))
    # controle visuel : 3 x 3 repetitions
    rep = np.tile(cv2.resize(unit, (300, 300), interpolation=cv2.INTER_AREA), (3, 3, 1))
    dbg = img.copy()
    cv2.rectangle(dbg, (x, y), (x + w, y + h), (0, 0, 255), 3)
    cv2.imwrite(os.path.join(OUT, 'dbg', p['handle'] + '-rep.jpg'), rep, [cv2.IMWRITE_JPEG_QUALITY, 80])
    cv2.imwrite(os.path.join(OUT, 'dbg', p['handle'] + '-box.jpg'), cv2.resize(dbg, (400, 400)), [cv2.IMWRITE_JPEG_QUALITY, 80])
    # le motif repete represente la plaque + le joint
    gap_cm = gap / max(w, 1) * wcm
    meta.append({
        'handle': p['handle'], 'titre': p['title'], 'famille': fam,
        'plaque_cm': [wcm, hcm], 'motif_cm': [round(wcm + gap_cm, 2), round(hcm + gap_cm, 2)],
        'joint_px': int(gap), 'boite': [x, y, w, h], **info,
        'variantes': p['variants'], 'url': p['url'],
    })
    print(f"{fam:9s} {p['handle'][:58]:58s} boite={w}x{h} joint={gap}px {info}")

json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
print(len(meta), 'textures')

"""Étalonnage des couleurs : les carreaux de la texture (photo plaque fond blanc) sont recalés sur la
couleur des mêmes carreaux dans les photos d'ambiance de la fiche produit.
python3 -I tools/etalon.py <racine> [--appliquer]  -> out/etalon.json (+ out/tex-etal/*.jpg)"""
import json, os, sys
import cv2, numpy as np
BASE = sys.argv[1]; APPL = '--appliquer' in sys.argv
meta = json.load(open(os.path.join(BASE, 'out/meta.json')))
os.makedirs(os.path.join(BASE, 'out/tex-etal'), exist_ok=True)

def hsv(img):  # OpenCV : H 0..180, S, V 0..255
    return cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)

def dh(a, b):  # écart de teinte circulaire (0..90 en unités OpenCV)
    d = np.abs(a - b) % 180
    return np.minimum(d, 180 - d)

def teinte_moy(h, w=None):
    ang = h / 180 * 2 * np.pi
    c, s = np.cos(ang), np.sin(ang)
    if w is not None: c, s = c * w, s * w
    return (np.arctan2(s.sum(), c.sum()) / (2 * np.pi) * 180) % 180

rapport = {}
for e in meta:
    h = e['handle']
    tex = cv2.imread(os.path.join(BASE, 'out/tex', h + '.jpg'))
    T = hsv(tex)
    carreau = T[..., 1] > 50          # pixels colorés du carreau (joints et blancs exclus)
    info = {'famille': e['famille'], 'part_couleur': round(float(carreau.mean()), 3)}
    if e['famille'] == 'marbre' or carreau.mean() < 0.15:
        info['action'] = 'aucune (carreau peu coloré ou marbre)'
        rapport[h] = info
        continue
    ht = teinte_moy(T[..., 0][carreau], T[..., 1][carreau])
    st, vt = float(np.median(T[..., 1][carreau])), float(np.median(T[..., 2][carreau]))
    ambs = []
    for i in (1, 2):
        f = os.path.join(BASE, 'dl', h, '%d.webp' % i)
        if not os.path.exists(f): continue
        A = hsv(cv2.imread(f))
        sel = (dh(A[..., 0], ht) < 10) & (A[..., 1] > st * 0.6) & (A[..., 2] > 20)
        # le carrelage doit former une zone à part : si la sélection couvre presque toute l'image
        # (lumière chaude, bois, décor de même teinte), la mesure ne dit rien du carreau
        if sel.mean() < 0.06 or sel.mean() > 0.45: continue
        Ab = hsv(cv2.GaussianBlur(cv2.imread(f), (0, 0), 8))
        selb = (dh(Ab[..., 0], ht) < 10) & (Ab[..., 1] > st * 0.6) & (Ab[..., 2] > 20)
        smoy = float(np.median(Ab[..., 1][selb])) if selb.mean() > 0.03 else 0.0
        ambs.append((float(sel.mean()), teinte_moy(A[..., 0][sel], A[..., 1][sel]), float(np.median(A[..., 1][sel])), float(np.median(A[..., 2][sel])), smoy))
    if not ambs:
        info['action'] = 'aucune (carreau non retrouvé dans les ambiances)'
        rapport[h] = info
        continue
    pa = sum(a[0] for a in ambs)
    ha = teinte_moy(np.array([a[1] for a in ambs]), np.array([a[0] for a in ambs]))
    sa = sum(a[0] * a[2] for a in ambs) / pa
    va = sum(a[0] * a[3] for a in ambs) / pa
    gs = float(np.clip(sa / max(st, 1), 1.0, 1.6))
    gv = 1.0   # la luminosité vient de l'éclairage de la photo du client, on ne la touche pas
    dteinte = float(np.clip(((ha - ht + 90) % 180) - 90, -3, 3))   # ±6° au plus (plantes, bois dans les ambiances)
    if len(ambs) < 2 or max(float(dh(a[1], b[1])) for a in ambs for b in ambs) > 4:
        dteinte = 0.0   # une seule ambiance, ou des ambiances en désaccord : on laisse la teinte
    info.update({'texture': [round(ht * 2), round(st / 2.55), round(vt / 2.55)], 'ambiance': [round(ha * 2), round(sa / 2.55), round(va / 2.55)],
                 'gain_saturation': round(gs, 2), 'gain_luminosite': round(gv, 2), 'decalage_teinte_deg': round(dteinte * 2, 1)})
    if APPL and (gs > 1.02 or abs(dteinte) > 0.5 or e['famille'] == 'mosaique'):
        # on n'agit que sur les pixels colorés, avec une transition douce vers les joints
        w = np.clip((T[..., 1] - 30) / 40, 0, 1)
        T2 = T.copy()
        T2[..., 0] = (T[..., 0] + dteinte * w) % 180
        T2[..., 1] = np.clip(T[..., 1] * (1 + (gs - 1) * w), 0, 255)
        T2[..., 2] = np.clip(T[..., 2] * (1 + (gv - 1) * w), 0, 255)
        if e['famille'] == 'mosaique':
            # vue de loin, la couleur perçue est la moyenne carreaux + joints : les joints de la photo plaque
            # (larges, gris clair) délavent le carreau. On les fond vers une teinte chaude plus sombre,
            # comme dans les ambiances, jusqu'à retrouver la saturation moyenne des ambiances.
            cible = sum(a[0] * a[4] for a in ambs) / pa
            g = 1 - w
            def essai(al):
                T3 = T2.copy()
                T3[..., 0] = np.where(g > 0.5, ha, T2[..., 0])   # joints peu saturés : la teinte n'y pèse presque pas
                T3[..., 1] = T2[..., 1] * (1 - g * al) + g * al * min(sa, 255) * 0.45
                T3[..., 2] = T2[..., 2] * (1 - g * al * 0.45)
                b = hsv(cv2.GaussianBlur(cv2.cvtColor(T3.astype(np.uint8), cv2.COLOR_HSV2BGR), (0, 0), 24))
                return T3, float(np.median(b[..., 1]))
            al, T3 = 0.0, T2
            s0 = essai(0.0)[1]
            if s0 < cible:
                lo, hi = 0.0, 0.5
                for _ in range(12):
                    mid = (lo + hi) / 2
                    if essai(mid)[1] < cible: lo = mid
                    else: hi = mid
                al = hi
                T3, s1 = essai(al)
                info.update({'joints': round(al, 2), 'sat_moyenne': [round(s0 / 2.55), round(s1 / 2.55), round(cible / 2.55)]})
            T2 = T3
            if al == 0 and gs <= 1.02 and abs(dteinte) <= 0.5:
                rapport[h] = info
                continue
        out = cv2.cvtColor(T2.astype(np.uint8), cv2.COLOR_HSV2BGR)
        cv2.imwrite(os.path.join(BASE, 'out/tex-etal', h + '.jpg'), out, [cv2.IMWRITE_JPEG_QUALITY, 90])
    rapport[h] = info
json.dump(rapport, open(os.path.join(BASE, 'out/etalon.json'), 'w'), ensure_ascii=False, indent=1)
for h, i in rapport.items():
    print(f"{h[:52]:52s} {i.get('action', '')} {('tex ' + str(i['texture']) + ' amb ' + str(i['ambiance']) + ' sat x' + str(i['gain_saturation']) + ' lum x' + str(i['gain_luminosite']) + ' teinte ' + str(i['decalage_teinte_deg']) + (' joints ' + str(i['joints']) + ' satmoy ' + str(i['sat_moyenne']) if 'joints' in i else '')) if 'texture' in i else ''}")

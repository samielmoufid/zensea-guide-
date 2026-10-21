"""Ajoute le bloc « Voir en 3D » au modèle produit (après le bloc benefits de la section main).
python3 -I tools/insert_block.py entree.json sortie.json"""
import json, re, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
m = re.match(r'\s*(/\*.*?\*/)\s*', s, re.S)
entete = m.group(1) if m else ''
d = json.loads(s[m.end():] if m else s)
main = d['sections']['main']
BLOC = 'mur_3d'
if BLOC not in main['blocks']:
    main['blocks'][BLOC] = {
        'type': 'custom-code',
        'settings': {
            'show_on_display': 'desktop_and_mobile',
            'custom_liquid': "{% render 'mm-mur-3d', product: closest.product %}",
            'margin_top': 8, 'margin_bottom': 4, 'additional_class': '',
        },
        'blocks': {},
    }
    ordre = main['block_order']
    i = ordre.index('benefits') + 1 if 'benefits' in ordre else 1
    ordre.insert(i, BLOC)
out = (entete + '\n' if entete else '') + json.dumps(d, ensure_ascii=False, indent=2) + '\n'
open(dst, 'w', encoding='utf-8').write(out)
print(main['block_order'])

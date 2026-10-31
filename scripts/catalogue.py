"""Catalogue des handpans pour le temple : noms, prix et variantes, depuis la
boutique (products.json public de zensea.fr).

  curl -s "https://zensea.fr/products.json?limit=250" -o /tmp/products.json
  python3 -I scripts/catalogue.py /tmp/products.json public/temple/catalogue.json

Clé : le numéro du modèle (handpan-103-dore → "103"). Variantes « n-hz »
(« 9-440 », « 14-432 »…) avec leur prix et l'identifiant Shopify, pour que
« Je le veux » ouvre la fiche sur la bonne configuration.
"""
import json
import re
import sys

src, dst = sys.argv[1], sys.argv[2]
produits = json.load(open(src, encoding='utf-8'))['products']
cat = {}
for p in produits:
    m = re.match(r'handpan-(\d{3,4})-', p['handle'])
    if not m:
        continue
    variantes = {}
    for v in p['variants']:
        vm = re.match(r'(\d+) notes / (\d+) Hz', v['title'])
        if vm:
            variantes[f'{vm.group(1)}-{vm.group(2)}'] = {'id': v['id'], 'prix': float(v['price']), 'dispo': v.get('available', True)}
    if not variantes:
        continue
    cat[m.group(1)] = {
        'handle': p['handle'],
        'nom': p['title'].split(' — ')[0].strip(),
        'titre': p['title'],
        'variantes': variantes,
    }
json.dump(cat, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(cat), 'handpans :', ', '.join(f"{k} {v['nom']}" for k, v in sorted(cat.items())))

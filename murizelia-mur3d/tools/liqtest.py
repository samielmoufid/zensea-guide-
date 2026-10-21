import json, re, sys
from liquid import Environment
BASE = sys.argv[1]
env = Environment()
env.add_filter('asset_url', lambda s: '//murizelia.fr/cdn/shop/t/9/assets/' + s + '?v=123')
env.add_filter('json', lambda v: json.dumps(v, ensure_ascii=False) if not hasattr(v, '__liquid__') else json.dumps(v))
src = open(BASE + '/theme/snippets/mm-mur-3d.liquid', encoding='utf-8').read()
prods = json.load(open(BASE + '/data/produits.json', encoding='utf-8'))
def produit(p):
    return {'handle': p['handle'], 'title': p['title'], 'url': '/products/' + p['handle'],
            'price': int(round(float(p['variants'][0]['price']) * 100)),
            'variants': [{'id': int(v['id'].split('/')[-1]), 'title': v['title'], 'price': int(round(float(v['price']) * 100)), 'available': True} for v in p['variants']]}
ps = [produit(p) for p in prods] + [{'handle': 'shampouineuse-x', 'title': 'Autre', 'url': '/products/x', 'price': 100, 'variants': []}]
ctx = {'product': ps[3], 'closest': {'product': ps[3]}, 'cart': {'currency': {'iso_code': 'EUR'}},
       'collections': {'carrelage-mural-adhesif': {'products': ps}}}
out = env.from_string(src).render(**ctx)
m = re.search(r'<script type="application/json" data-mm-m3-data>(.*?)</script>', out, re.S)
d = json.loads(m.group(1))
print('JSON ok :', len(d['produits']), 'produits ; courant =', d['courant'])
print('vignette :', re.search(r"background-image:url\('([^']+)'", out).group(1))
print('variantes ex. :', d['produits'][0]['v'])
out2 = env.from_string(src).render(**{**ctx, 'product': ps[-1], 'closest': {'product': ps[-1]}})
print('produit hors liste -> sortie vide :', out2.strip() == '')

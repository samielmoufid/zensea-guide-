"""Aperçu privé du temple (artifact claude.ai) : construit dist-apercu/ avec la
page au format « contenu seul » (apercu.html), le code du temple, et les images.

  npx vite build --config vite.apercu.config.js && python3 -I scripts/apercu.py
"""
import os
import re
import shutil

D = 'dist-apercu'
for src, dst in (('public/temple', 'temple'), ('public/atelier/handpans', 'atelier/handpans')):
    shutil.copytree(src, os.path.join(D, dst), dirs_exist_ok=True)
os.makedirs(os.path.join(D, 'livre'), exist_ok=True)
for f in os.listdir('public/livre'):
    if f.endswith('.jpg'):
        shutil.copy(os.path.join('public/livre', f), os.path.join(D, 'livre', f))

s = open(os.path.join(D, 'index.html'), encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)</body>', s, re.S).group(1)
liens = re.findall(r'<script type="importmap">.*?</script>|<link rel="(?:stylesheet|preconnect)"[^>]*>', head, re.S)
modules = re.findall(r'<script type="module"[^>]*></script>', head)
page = ('<title>Temple des handpans</title>\n'
        '<style>:root{color-scheme:dark}html,body{height:100%;background:#1a120c}</style>\n'
        + '\n'.join(liens) + '\n'
        # le premier élément du corps ouvre <body> : la classe se pose juste après
        + body.strip().replace('</canvas>', '</canvas>\n<script>document.body.classList.add("t-page")</script>', 1)
        + '\n' + '\n'.join(modules) + '\n')
open(os.path.join(D, 'apercu.html'), 'w', encoding='utf-8').write(page)
n = sum(len(f) for _, _, f in os.walk(D))
print('apercu.html', len(page), 'octets ;', n, 'fichiers')

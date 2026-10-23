#!/bin/sh
# tools/masque.sh <photo> <u,v;u,v;u,v;u,v> <sortie.png> [sens] : masque des objets à 480 px, visualisé
python3 -I - "$1" "$2" <<'PY'
import sys, json, cv2, numpy as np
im = cv2.imread(sys.argv[1]); h, w = im.shape[:2]; k = 480 / max(w, h)
W, H = round(w * k), round(h * k)
s = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
open('seg2/in.raw', 'wb').write(cv2.cvtColor(s, cv2.COLOR_BGR2RGBA).tobytes())
q = [[float(a) * W, float(b) * H] for a, b in (p.split(',') for p in sys.argv[2].split(';'))]
open('seg2/in.json', 'w').write(json.dumps({'W': W, 'H': H, 'q': q}))
PY
J=$(cat seg2/in.json)
W=$(python3 -c "import json;print(json.load(open('seg2/in.json'))['W'])"); H=$(python3 -c "import json;print(json.load(open('seg2/in.json'))['H'])"); Q=$(python3 -c "import json;print(json.dumps(json.load(open('seg2/in.json'))['q']))")
node tools/zone.mjs seg2/in.raw $W $H "$Q" ${4:-0.5} && python3 -I tools/zoneviz.py "$1" $W $H "$Q" "$3"

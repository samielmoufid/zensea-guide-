#!/bin/sh
# tools/etapes.sh <photo> <quad u,v;…> <sortie.png> : étapes du masque (rouge = objet)
./tools/masque.sh "$1" "$2" seg2/mk-tmp.png >/dev/null
W=$(python3 -c "import json;print(json.load(open('seg2/in.json'))['W'])"); H=$(python3 -c "import json;print(json.load(open('seg2/in.json'))['H'])"); Q=$(python3 -c "import json;print(json.dumps(json.load(open('seg2/in.json'))['q']))")
node tools/masque-etapes.mjs seg2/in.raw $W $H "$Q"
python3 -I - "$1" $W $H "$3" <<'PY'
import sys, cv2, numpy as np
f, W, H, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
b = cv2.resize(cv2.imread(f), (W, H), interpolation=cv2.INTER_AREA)
rows = []
for i in range(5):
    O = np.frombuffer(open('seg2/etape-%d.raw' % i, 'rb').read(), np.uint8).reshape(H, W)
    v = b.astype(float); v[O > 0] = v[O > 0] * 0.4 + np.array([40, 40, 230]) * 0.6
    rows.append(v.astype(np.uint8))
cv2.imwrite(out, np.vstack([np.hstack(rows[:3]), np.hstack(rows[3:] + [b])]))
PY

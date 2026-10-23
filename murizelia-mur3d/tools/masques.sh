#!/bin/sh
# tools/masques.sh <sortie.jpg> : masque des objets sur toutes les photos d'essai, en planche
set -e
i=0
while read -r photo quad; do
  ./tools/masque.sh "$photo" "$quad" seg2/mq-$i.png | sed "s|^|$(basename $photo) |"
  i=$((i + 1))
done <<'L'
seg2/bureau.jpg 0.01,0.01;0.99,0.01;0.99,0.62;0.01,0.62
seg2/ps5.jpg 0.026,0.23;0.794,0.246;0.794,0.648;0.031,0.656
vues/t-room.jpg 0.36,0.2;0.98,0.03;0.98,0.9;0.36,0.9
seg2/faience.jpg 0.05,0.05;0.95,0.05;0.95,0.7;0.05,0.7
vues/t-lebombo.jpg 0.08,0.05;0.98,0.05;0.98,0.95;0.08,0.95
vues/t-christmas.jpg 0.3,0.38;0.95,0.38;0.95,0.78;0.3,0.78
out/demo.jpg 0.248,0.22;0.979,0.168;0.979,0.625;0.248,0.6175
L
python3 -I - "$1" <<'PY'
import sys, cv2, numpy as np
ims = [cv2.imread('seg2/mq-%d.png' % i) for i in range(7)]
ims = [cv2.resize(a, (int(a.shape[1] * 300 / a.shape[0]), 300)) for a in ims]
rows, row, wsum = [], [], 0
for a in ims:
    if wsum + a.shape[1] > 1500: rows.append(row); row, wsum = [], 0
    row.append(a); wsum += a.shape[1] + 4
rows.append(row)
W = max(sum(a.shape[1] + 4 for a in r) for r in rows)
out = [cv2.copyMakeBorder(np.hstack([cv2.copyMakeBorder(a, 0, 0, 0, 4, cv2.BORDER_CONSTANT) for a in r]), 0, 4, 0, W - sum(a.shape[1] + 4 for a in r), cv2.BORDER_CONSTANT) for r in rows]
cv2.imwrite(sys.argv[1], np.vstack(out), [cv2.IMWRITE_JPEG_QUALITY, 82])
PY

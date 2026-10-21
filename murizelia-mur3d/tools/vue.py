"""Vue perspective depuis un panorama equirectangulaire.
python3 -I tools/vue.py pano.jpg sortie.jpg yaw pitch hfov W H"""
import sys, numpy as np, cv2
src, dst = sys.argv[1], sys.argv[2]
yaw, pitch, hfov = map(float, sys.argv[3:6]); W, H = int(sys.argv[6]), int(sys.argv[7])
pano = cv2.imread(src)
PH, PW = pano.shape[:2]
f = (W / 2) / np.tan(np.radians(hfov) / 2)
x, y = np.meshgrid(np.arange(W) - W / 2 + 0.5, np.arange(H) - H / 2 + 0.5)
d = np.stack([x, -y, np.full_like(x, f)], -1)
d /= np.linalg.norm(d, axis=-1, keepdims=True)
p = np.radians(pitch)
Rx = np.array([[1, 0, 0], [0, np.cos(p), -np.sin(p)], [0, np.sin(p), np.cos(p)]])
d = d @ Rx.T
lon = np.arctan2(d[..., 0], d[..., 2]) + np.radians(yaw)
lat = np.arcsin(np.clip(d[..., 1], -1, 1))
mx = ((lon / (2 * np.pi)) % 1.0) * PW
my = (0.5 - lat / np.pi) * PH
out = cv2.remap(pano, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_AREA if False else cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)
cv2.imwrite(dst, out, [cv2.IMWRITE_JPEG_QUALITY, 88])

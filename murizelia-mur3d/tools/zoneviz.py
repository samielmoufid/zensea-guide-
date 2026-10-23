import sys, json, numpy as np
from PIL import Image, ImageDraw
img, W, H, quad, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), json.loads(sys.argv[4]), sys.argv[5]
im = Image.open(img).convert('RGB').resize((W, H))
m = np.frombuffer(open('seg2/out.raw','rb').read(), np.uint8).reshape(H, W)
a = np.array(im).astype(np.float32)
a[m > 0] = a[m > 0] * 0.35 + np.array([40, 110, 230]) * 0.65
o = Image.fromarray(a.astype(np.uint8)); ImageDraw.Draw(o).polygon([tuple(p) for p in quad], outline=(255, 40, 40))
o.save(out)

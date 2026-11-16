import os
from PIL import Image

root = r"C:\Users\admin\.gemini\antigravity\scratch\streetfighter"
jin_p = os.path.join(root, "docs", "assets", "portrait_jin.png")
li_p = os.path.join(root, "docs", "assets", "portrait_lihua.png")

if os.path.exists(jin_p):
    im = Image.open(jin_p)
    print("Jin image size:", im.size, "mode:", im.mode)

if os.path.exists(li_p):
    im2 = Image.open(li_p)
    print("Li-Hua image size:", im2.size, "mode:", im2.mode)

# Let's also check what other images exist in assets/
for dirpath, _, filenames in os.walk(os.path.join(root, "assets")):
    for f in filenames:
        if f.endswith(('.png', '.jpg', '.webp')):
            print("Found image:", os.path.relpath(os.path.join(dirpath, f), root))

import base64
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from render import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
ICON = os.path.join(ROOT, "store-assets", "icon")
OUT = os.path.join(ROOT, "store-assets", "android")
os.makedirs(OUT, exist_ok=True)

# Play Store listing icon: 512x512, opaque. Google applies its own corner mask.
Image.open(f"{ICON}/icon-1024.png").convert("RGB").resize((512, 512), Image.LANCZOS).save(f"{OUT}/icon-512.png")

tile = base64.b64encode(open(f"{ICON}/icon-rounded.png", "rb").read()).decode()
html = f"""
<div style="width:1024px;height:500px;position:relative;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;
  background:radial-gradient(ellipse at 22% 50%, #6A4120 0%, #3F2813 55%, #2A1A0C 100%);">
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 2px, rgba(0,0,0,.03) 2px 5px);"></div>
  <img src="data:image/png;base64,{tile}" style="position:absolute;left:84px;top:110px;width:280px;height:280px;filter:drop-shadow(0 14px 22px rgba(0,0,0,.5));">
  <div style="position:absolute;left:410px;top:150px;color:#FBF3D6;">
    <div style="font-size:92px;font-weight:700;letter-spacing:-1px;line-height:1">FrameOn</div>
    <div style="font-size:31px;line-height:1.45;margin-top:22px;color:#E8D9A0;">Share your art. Discover artists.<br>Buy original work from the maker.</div>
  </div>
</div>"""
render(html, f"{OUT}/feature-graphic-1024x500.png", 1024, 500)
print("ok")

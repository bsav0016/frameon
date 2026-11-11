import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import icon_art as art  # noqa: E402
from render import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT = os.path.join(ROOT, "store-assets", "icon")
APP = os.path.join(ROOT, "assets", "images")

render(art.icon_full(), f"{OUT}/icon-1024.png", 1024, 1024)
render(art.icon_android_background(), f"{OUT}/android-background.png", 1024, 1024)
render(art.icon_android_foreground(), f"{OUT}/android-foreground.png", 1024, 1024, transparent=True)
render(art.icon_android_monochrome(), f"{OUT}/android-monochrome.png", 1024, 1024, transparent=True)
render(art.icon_rounded(), f"{OUT}/icon-rounded.png", 1024, 1024, transparent=True)

# Files the Expo app reads.
Image.open(f"{OUT}/icon-1024.png").convert("RGB").save(f"{APP}/icon.png")  # iOS rejects icons with an alpha channel
for name in ("android-background", "android-foreground", "android-monochrome"):
    Image.open(f"{OUT}/{name}.png").save(f"{APP}/{name}.png")
rounded = Image.open(f"{OUT}/icon-rounded.png")
rounded.save(f"{APP}/splash-icon.png")
rounded.resize((512, 512), Image.LANCZOS).save(f"{APP}/logo.png")
Image.open(f"{OUT}/icon-1024.png").convert("RGB").resize((48, 48), Image.LANCZOS).save(f"{APP}/favicon.png")
print("ok")

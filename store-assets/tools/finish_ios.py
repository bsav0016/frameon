"""Adds an iOS status bar and home indicator to the raw captures and writes the final App Store files."""
import glob
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__)
RAW = os.path.join(HERE, "..", "ios", "_raw")
OUT = os.path.join(HERE, "..", "ios")
SS = 2  # supersampling for smooth shapes
FONT = r"C:\Windows\Fonts\segoeuib.ttf"

NAMES = {"1-home": "01-home", "2-artwork": "02-artwork", "3-search": "03-search", "4-artist": "04-artist", "5-checkout": "05-checkout", "6-activity": "06-activity"}


def status_bar(width_px: int, color=(0, 0, 0, 255)) -> Image.Image:
    """59pt status bar at 3x: clock on the left; signal, wifi and battery on the right."""
    k = 3 * SS
    img = Image.new("RGBA", (width_px * SS, 59 * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cy = 30 * k
    font = ImageFont.truetype(FONT, int(17 * k))
    d.text((52 * k, cy), "9:41", font=font, fill=color, anchor="lm")

    right = width_px / 3 * k - 30 * k  # right edge of the icon cluster
    # battery
    bw, bh = 27 * k, 13 * k
    bx, by = right - bw, cy - bh / 2
    d.rounded_rectangle((bx, by, bx + bw, by + bh), radius=4.5 * k, outline=(0, 0, 0, 110), width=int(1 * k))
    d.rounded_rectangle((bx + 2 * k, by + 2 * k, bx + bw - 2 * k, by + bh - 2 * k), radius=2.8 * k, fill=color)
    d.rounded_rectangle((bx + bw + 1.5 * k, cy - 2.5 * k, bx + bw + 3.2 * k, cy + 2.5 * k), radius=1 * k, fill=(0, 0, 0, 110))
    # wifi: three arcs and a dot
    wx, wy = bx - 12 * k, cy + 5 * k
    for r in (11, 7.5, 4):
        d.arc((wx - r * k, wy - r * k, wx + r * k, wy + r * k), start=225, end=315, fill=color, width=int(2.4 * k))
    d.ellipse((wx - 1.6 * k, wy - 2.2 * k, wx + 1.6 * k, wy + 1.0 * k), fill=color)
    # cellular bars
    sx = wx - 24 * k
    for i, h in enumerate((4.5, 7, 9.5, 12)):
        x = sx + i * 4.6 * k
        d.rounded_rectangle((x, cy + 6 * k - h * k, x + 3.2 * k, cy + 6 * k), radius=1 * k, fill=color)
    return img.resize((width_px, 59 * 3), Image.LANCZOS)


def home_indicator(width_px: int) -> Image.Image:
    img = Image.new("RGBA", (width_px * SS, 34 * 3 * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = 144 * 3 * SS, 5 * 3 * SS
    cx = width_px * SS / 2
    d.rounded_rectangle((cx - w / 2, 34 * 3 * SS - 8 * 3 * SS - h, cx + w / 2, 34 * 3 * SS - 8 * 3 * SS), radius=h / 2, fill=(0, 0, 0, 235))
    return img.resize((width_px, 34 * 3), Image.LANCZOS)


def main() -> None:
    for path in sorted(glob.glob(os.path.join(RAW, "*.png"))):
        base = os.path.basename(path)[:-4]  # e.g. 6.9in-1-home
        device, _, key = base.partition("-")
        img = Image.open(path).convert("RGBA")
        img.alpha_composite(status_bar(img.width), (0, 0))
        img.alpha_composite(home_indicator(img.width), (0, img.height - 34 * 3))
        folder = os.path.join(OUT, device)
        os.makedirs(folder, exist_ok=True)
        img.convert("RGB").save(os.path.join(folder, NAMES[key] + ".png"))  # no alpha channel: App Store Connect rejects it
        print(device, NAMES[key], img.size)


if __name__ == "__main__":
    main()

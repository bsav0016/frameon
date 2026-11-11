"""Procedurally painted demo artwork (1200x1500) used to fill the app for store screenshots."""
import math
import os
import random
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from render import render  # noqa: E402

W, H = 1200, 1500
OUT = os.path.join(os.path.dirname(__file__), "demo-art")

GRAIN = """
<filter id="paper" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="3" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.07  0 0 0 0 0.04  0 0 0 .9 -.32"/>
</filter>
<filter id="blur8"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="blur30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter>
<radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>
"""


def frame(inner: str, extra_defs: str = "") -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>{GRAIN}{extra_defs}</defs>'
        f'{inner}<rect width="{W}" height="{H}" filter="url(#paper)" opacity=".5"/><rect width="{W}" height="{H}" fill="url(#vig)"/></svg>'
    )


def ridge(y0: float, amp: float, seed: int, step: int = 12) -> str:
    rnd = random.Random(seed)
    waves = [(rnd.uniform(0.004, 0.011), rnd.uniform(0, 6.28), rnd.uniform(0.4, 1)) for _ in range(4)]
    pts = []
    for x in range(-20, W + 40, step):
        y = y0 + amp * sum(a * math.sin(f * x + p) for f, p, a in waves) / 2.2
        pts.append(f"{x},{y:.1f}")
    return "M" + " L".join(pts) + f" L{W + 20},{H} L-20,{H} Z"


def dusk_ridge() -> str:
    layers = ["#7A3E73", "#5A2F66", "#40265A", "#2B1B4A", "#1A1236"]
    mountains = "".join(f'<path d="{ridge(760 + i * 120, 120 - i * 10, 10 + i)}" fill="{c}"/>' for i, c in enumerate(layers))
    mist = '<rect x="0" y="780" width="1200" height="260" fill="url(#mist)" opacity=".5"/>'
    return frame(
        '<rect width="1200" height="1500" fill="url(#sky)"/>'
        '<circle cx="600" cy="800" r="330" fill="url(#glow)"/><circle cx="600" cy="790" r="120" fill="#FFE9B0"/>'
        + mountains
        + mist,
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241747"/><stop offset=".35" stop-color="#B2406F"/>'
        '<stop offset=".62" stop-color="#F08A56"/><stop offset=".8" stop-color="#FBD38A"/></linearGradient>'
        '<radialGradient id="glow"><stop offset="0" stop-color="#FFE3A3" stop-opacity=".85"/><stop offset="1" stop-color="#FFB36B" stop-opacity="0"/></radialGradient>'
        '<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8B58C" stop-opacity="0"/><stop offset="1" stop-color="#F8B58C" stop-opacity=".9"/></linearGradient>',
    )


def tidal() -> str:
    bands = []
    colors = ["#BFE6E0", "#8FD0CF", "#5DB5BF", "#3A97AD", "#2A7A98", "#1F5F82", "#174A6E", "#10375A", "#0B2745"]
    for i, c in enumerate(colors):
        y = 700 + i * 95
        pts = []
        for x in range(-20, W + 40, 10):
            pts.append(f"{x},{y + math.sin(x * (0.012 + i * 0.0012) + i) * (14 + i * 6):.1f}")
        bands.append(f'<path d="M{" L".join(pts)} L{W + 20},{H} L-20,{H} Z" fill="{c}"/>')
        if i < 6:
            foam = " ".join(f"{x},{y + math.sin(x * (0.012 + i * 0.0012) + i) * (14 + i * 6) + 3:.1f}" for x in range(0, W + 1, 10))
            bands.append(f'<polyline points="{foam}" fill="none" stroke="#fff" stroke-opacity="{0.55 - i * 0.07:.2f}" stroke-width="{7 - i}" stroke-linecap="round"/>')
    return frame(
        '<rect width="1200" height="1500" fill="url(#sky)"/><circle cx="820" cy="470" r="110" fill="#FFF1D0"/><circle cx="820" cy="470" r="210" fill="url(#glow)"/>' + "".join(bands),
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9C9A8"/><stop offset=".6" stop-color="#FCE6C8"/></linearGradient>'
        '<radialGradient id="glow"><stop offset="0" stop-color="#FFF" stop-opacity=".6"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></radialGradient>',
    )


def ember_field() -> str:
    return frame(
        '<rect width="1200" height="1500" fill="#3A0F14"/>'
        '<g filter="url(#blur8)"><rect x="140" y="170" width="920" height="470" rx="14" fill="#E4572E"/>'
        '<rect x="140" y="690" width="920" height="360" rx="14" fill="#B3261E"/>'
        '<rect x="140" y="1100" width="920" height="230" rx="14" fill="#F2A33A"/></g>'
        '<rect x="140" y="170" width="920" height="470" rx="14" fill="url(#hi)" opacity=".35"/>',
        '<linearGradient id="hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>',
    )


def composition() -> str:
    return frame(
        '<rect width="1200" height="1500" fill="#F2E8D0"/>'
        '<circle cx="470" cy="560" r="330" fill="#C8553D"/>'
        '<path d="M 330 1130 A 290 290 0 0 1 910 1130 Z" fill="#1F3A5F"/>'
        '<polygon points="720,300 1010,820 430,820" fill="#E9B44C" opacity=".92"/>'
        '<circle cx="870" cy="1260" r="70" fill="#2B2B2B"/><circle cx="260" cy="1250" r="46" fill="#C8553D"/>'
        '<line x1="120" y1="1010" x2="1080" y2="1010" stroke="#2B2B2B" stroke-width="9"/>'
        '<line x1="880" y1="150" x2="880" y2="1360" stroke="#2B2B2B" stroke-width="5"/>'
        '<path d="M120 150 A 200 200 0 0 1 320 350 L120 350 Z" fill="#2B2B2B"/>'
    )


def birch_hollow() -> str:
    rnd = random.Random(5)
    trunks = []
    for layer, (opacity, blur, count, width) in enumerate([(0.35, 6, 7, 46), (0.6, 3, 6, 70), (1.0, 0, 5, 104)]):
        for i in range(count):
            x = (i + rnd.uniform(0.1, 0.9)) * (W / count)
            w = width * rnd.uniform(0.8, 1.2)
            tilt = rnd.uniform(-1.5, 1.5)
            trunks.append(
                f'<g opacity="{opacity}" {"filter=url(#blur8)" if blur else ""} transform="rotate({tilt} {x} 750)">'
                f'<rect x="{x:.0f}" y="-40" width="{w:.0f}" height="1600" fill="#EFE9DA"/>'
                + "".join(f'<rect x="{x + rnd.uniform(0, w * 0.6):.0f}" y="{rnd.uniform(0, 1450):.0f}" width="{rnd.uniform(14, w * 0.6):.0f}" height="{rnd.uniform(6, 12):.0f}" fill="#3A3A32" opacity=".75"/>' for _ in range(14))
                + "</g>"
            )
    bokeh = "".join(
        f'<circle cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(100, 1100):.0f}" r="{rnd.uniform(10, 42):.0f}" fill="#F7D774" opacity="{rnd.uniform(0.1, 0.35):.2f}" filter="url(#blur8)"/>'
        for _ in range(26)
    )
    return frame(
        '<rect width="1200" height="1500" fill="url(#bg)"/>' + "".join(trunks) + bokeh + '<rect width="1200" height="1500" fill="url(#fog)"/>',
        '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DB59A"/><stop offset="1" stop-color="#4C6B52"/></linearGradient>'
        '<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#DDE8D6" stop-opacity="0"/><stop offset="1" stop-color="#DDE8D6" stop-opacity=".45"/></linearGradient>',
    )


def moonlit() -> str:
    rnd = random.Random(9)
    stars = "".join(f'<circle cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(0, 760):.0f}" r="{rnd.uniform(1.2, 3.4):.1f}" fill="#fff" opacity="{rnd.uniform(0.4, 1):.2f}"/>' for _ in range(120))
    shimmer = "".join(
        f'<rect x="{600 - w / 2:.0f}" y="{820 + i * 34}" width="{w:.0f}" height="6" rx="3" fill="#EAF1FF" opacity="{0.7 - i * 0.04:.2f}"/>'
        for i, w in enumerate([210, 260, 180, 300, 220, 340, 260, 380, 300, 420, 320, 340, 260, 200, 150, 100])
    )
    pines = "".join(f'<polygon points="{x},{b} {x + 70 * s:.0f},{b + 200 * s:.0f} {x - 70 * s:.0f},{b + 200 * s:.0f}" fill="#06101F"/>' for x, b, s in [(130, 600, 1.4), (230, 660, 1.1), (1080, 640, 1.3), (990, 700, 1.0)])
    return frame(
        '<rect width="1200" height="1500" fill="url(#sky)"/>' + stars
        + '<circle cx="600" cy="480" r="260" fill="url(#glow)"/><circle cx="600" cy="480" r="115" fill="#F4F1E1"/>'
        '<circle cx="568" cy="452" r="22" fill="#DAD6C2"/><circle cx="640" cy="510" r="30" fill="#DAD6C2"/><circle cx="612" cy="430" r="14" fill="#DAD6C2"/>'
        '<rect x="0" y="800" width="1200" height="700" fill="url(#water)"/>' + shimmer + pines + '<path d="M0 800 H1200 V840 H0Z" fill="#06101F" opacity=".5"/>',
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050B1F"/><stop offset="1" stop-color="#1D3664"/></linearGradient>'
        '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B3158"/><stop offset="1" stop-color="#050B1F"/></linearGradient>'
        '<radialGradient id="glow"><stop offset="0" stop-color="#DCE6FF" stop-opacity=".55"/><stop offset="1" stop-color="#DCE6FF" stop-opacity="0"/></radialGradient>',
    )


def monstera() -> str:
    leaf = "M0,0 C 40,-170 330,-210 430,-20 C 350,60 330,140 240,210 C 170,150 90,120 0,0 Z"
    slits = "".join(f'<path d="M{150 + i * 40},{-30 + i * 22} L{330 + i * 16},{-40 + i * 52}" stroke="#0F3D2E" stroke-width="16" stroke-linecap="round"/>' for i in range(3))
    leaves = []
    for (x, y, rot, scale, col) in [(380, 1020, -28, 1.35, "#2F7D4F"), (760, 1130, 38, 1.2, "#3F9561"), (520, 760, -70, 1.1, "#1F6B45"), (860, 700, 12, 1.0, "#57AE74"), (250, 560, -110, 0.9, "#2A7449")]:
        leaves.append(
            f'<g transform="translate({x} {y}) rotate({rot}) scale({scale})"><path d="{leaf}" fill="{col}"/>{slits}'
            '<path d="M0,0 C 120,30 260,40 400,10" stroke="#BFE8C7" stroke-opacity=".6" stroke-width="7" fill="none"/></g>'
        )
    return frame('<rect width="1200" height="1500" fill="#0F3D2E"/><circle cx="650" cy="760" r="520" fill="#1A5A40" opacity=".55" filter="url(#blur30)"/>' + "".join(leaves))


def dune_light() -> str:
    dunes = []
    for i, c in enumerate(["#F6C9A0", "#EFA977", "#DE8454", "#C2623A", "#8E3F2A"]):
        y = 700 + i * 150
        pts = " ".join(f"{x},{y + math.sin(x * 0.006 + i * 1.7) * (80 - i * 6) + math.sin(x * 0.014 + i) * 22:.1f}" for x in range(-20, W + 40, 12))
        dunes.append(f'<path d="M{pts.replace(" ", " L")} L{W + 20},{H} L-20,{H} Z" fill="{c}"/>')
    return frame(
        '<rect width="1200" height="1500" fill="url(#sky)"/><circle cx="880" cy="470" r="150" fill="url(#glow)"/><circle cx="880" cy="470" r="76" fill="#FFF4DA"/>' + "".join(dunes),
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4B58C"/><stop offset=".55" stop-color="#FBE3C0"/></linearGradient>'
        '<radialGradient id="glow"><stop offset="0" stop-color="#FFF" stop-opacity=".8"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></radialGradient>',
    )


PIECES = {
    "dusk-ridge": dusk_ridge,
    "tidal": tidal,
    "ember-field": ember_field,
    "composition": composition,
    "birch-hollow": birch_hollow,
    "moonlit": moonlit,
    "monstera": monstera,
    "dune-light": dune_light,
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in PIECES.items():
        png = f"{OUT}/{name}.png"
        render(fn(), png, W, H)
        Image.open(png).convert("RGB").save(f"{OUT}/{name}.jpg", quality=86)
        os.unlink(png)
        print(name)
    # contact sheet for a quick look
    sheet = Image.new("RGB", (4 * 300, 2 * 375), "white")
    for i, name in enumerate(PIECES):
        sheet.paste(Image.open(f"{OUT}/{name}.jpg").resize((300, 375)), ((i % 4) * 300, (i // 4) * 375))
    sheet.save(f"{OUT}/_sheet.png")

"""Vector art for the FrameOn icon, shared by every asset script. Pure strings, rendered by headless Chrome."""
import math

GOLD = ("#F1E4AE", "#DCC783", "#C4AA5C")


def defs() -> str:
    return f"""
<defs>
  <linearGradient id="woodBase" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#A56B33"/><stop offset=".5" stop-color="#8B5A2B"/><stop offset="1" stop-color="#6A4120"/>
  </linearGradient>
  <filter id="grainH" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 1.1 -0.35" result="g"/>
    <feComposite in="g" in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="grainV" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.09 0.004" numOctaves="3" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 1.1 -0.35" result="g"/>
    <feComposite in="g" in2="SourceGraphic" operator="in"/>
  </filter>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="{GOLD[0]}"/><stop offset=".55" stop-color="{GOLD[1]}"/><stop offset="1" stop-color="{GOLD[2]}"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".10"/>
  </linearGradient>
  <clipPath id="plaqueClip"><rect width="724" height="724"/></clipPath>
  <filter id="soften" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="drop" x="-10%" y="-10%" width="130%" height="130%">
    <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".22"/>
  </filter>
</defs>"""


def wood_panel() -> str:
    """Full-bleed 1024 wood, used as the Android adaptive background."""
    return """
<rect width="1024" height="1024" fill="url(#woodBase)"/>
<rect width="1024" height="1024" fill="#000" filter="url(#grainH)" opacity=".55"/>"""


def frame() -> str:
    """Mitered picture frame filling 1024x1024 with a 150px border; the opening is 150..874."""

    def side(points: str, light: float, grain: str) -> str:
        tint = "#fff" if light > 0 else "#000"
        return (
            f'<polygon points="{points}" fill="url(#woodBase)"/>'
            f'<polygon points="{points}" fill="#000" filter="url(#{grain})" opacity=".55"/>'
            f'<polygon points="{points}" fill="{tint}" opacity="{abs(light)}"/>'
        )

    return (
        side("0,0 1024,0 874,150 150,150", 0.20, "grainH")
        + side("0,0 150,150 150,874 0,1024", 0.08, "grainV")
        + side("1024,0 1024,1024 874,874 874,150", -0.16, "grainV")
        + side("0,1024 150,874 874,874 1024,1024", -0.30, "grainH")
        + '<path d="M0 0 L150 150 M1024 0 L874 150 M0 1024 L150 874 M1024 1024 L874 874" stroke="#2b1a0a" stroke-opacity=".55" stroke-width="3"/>'
        + '<rect x="146" y="146" width="732" height="732" fill="none" stroke="#2b1a0a" stroke-width="8" opacity=".7"/>'
    )


def power_symbol(cx: float, cy: float, r: float, stroke: float, color: str) -> str:
    """Power icon: a ring open at the top with a bar through the gap. Replaces the O in ON."""
    a = math.radians(55)  # half angle of the gap, measured from straight up
    x1, y1 = cx - r * math.sin(a), cy - r * math.cos(a)
    x2, y2 = cx + r * math.sin(a), cy - r * math.cos(a)
    return (
        f'<path d="M {x2:.1f} {y2:.1f} A {r} {r} 0 1 1 {x1:.1f} {y1:.1f}" fill="none" stroke="{color}" stroke-width="{stroke}" stroke-linecap="round"/>'
        f'<line x1="{cx}" y1="{cy - r - stroke * 0.5:.1f}" x2="{cx}" y2="{cy - r * 0.1:.1f}" stroke="{color}" stroke-width="{stroke}" stroke-linecap="round"/>'
    )


def lettering(color: str = "#1B1409") -> str:
    """FRAME over ON, drawn in a 724x724 box. Impact gives the heavy condensed look of the original logo."""
    return f"""
<g font-family="Impact, 'Arial Narrow', sans-serif" fill="{color}">
  <text x="362" y="322" font-size="226" text-anchor="middle" textLength="560" lengthAdjust="spacingAndGlyphs">FRAME</text>
  {power_symbol(267, 478, 87, 40, color)}
  <text x="482" y="585" font-size="267" text-anchor="middle" textLength="165" lengthAdjust="spacingAndGlyphs">N</text>
</g>"""


def plaque(x: float, y: float, size: float, radius: float = 0, shaded: bool = True) -> str:
    """Gold plaque with lettering, positioned and scaled from its 724 design box."""
    k = size / 724
    r = radius / k
    body = f'<rect width="724" height="724" rx="{r:.1f}" fill="url(#gold)"/>'
    if shaded:
        body += f'<rect width="724" height="724" rx="{r:.1f}" fill="url(#sheen)"/>'
    if shaded:
        # soft shadow cast by the frame onto the plaque
        body += '<g clip-path="url(#plaqueClip)"><rect x="-10" y="-10" width="744" height="744" fill="none" stroke="#3a2810" stroke-opacity=".45" stroke-width="44" filter="url(#soften)"/></g>'
    body += f'<rect x="28" y="28" width="668" height="668" rx="{max(r - 20, 0):.1f}" fill="none" stroke="#8f7a3a" stroke-opacity=".5" stroke-width="3"/>'
    engraved = f'<g transform="translate(0 4)" opacity=".5">{lettering("#FFF8DC")}</g>' if shaded else ""
    return f'<g transform="translate({x} {y}) scale({k:.5f})">{body}{engraved}{lettering()}</g>'


def svg(inner: str, size: int = 1024) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{defs()}{inner}</svg>'


def icon_full() -> str:
    """iOS and Play Store icon: opaque, full bleed, the platform rounds the corners."""
    return svg(frame() + plaque(150, 150, 724))


def icon_android_background() -> str:
    return svg(wood_panel())


def icon_android_foreground() -> str:
    """Plaque only, inside the adaptive-icon safe zone (a 66% circle) so no launcher mask can clip it."""
    size = 470
    off = (1024 - size) / 2
    return svg(f'<g filter="url(#drop)">{plaque(off, off, size, radius=34)}</g>')


def icon_android_monochrome() -> str:
    size = 470
    off = (1024 - size) / 2
    k = size / 724
    return svg(
        f'<g transform="translate({off} {off}) scale({k:.5f})">'
        f'<rect x="17" y="17" width="690" height="690" rx="60" fill="none" stroke="#fff" stroke-width="34"/>{lettering("#FFFFFF")}</g>'
    )


def icon_rounded() -> str:
    """The icon as a rounded tile on a transparent background, for the splash screen and the in-app logo."""
    return svg(f'<clipPath id="tile"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#tile)">{frame()}{plaque(150, 150, 724)}</g>')

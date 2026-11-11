"""Renders an SVG/HTML string to a PNG with headless Chrome."""
import os
import subprocess
import tempfile

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def render(html: str, out_path: str, width: int, height: int, transparent: bool = False, scale: float = 1.0) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    background = "transparent" if transparent else "#fff"
    page = f"<!doctype html><meta charset='utf-8'><style>html,body{{margin:0;padding:0;background:{background}}}svg{{display:block}}</style>{html}"
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(page)
        src = f.name
    profile = tempfile.mkdtemp(prefix="chrome-render-")  # a private profile so a running Chrome does not interfere
    args = [
        CHROME, "--headless=new", f"--user-data-dir={profile}", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
        f"--window-size={int(width * scale)},{int(height * scale) + 160}", f"--force-device-scale-factor={scale}",
        f"--screenshot={os.path.abspath(out_path)}", "file:///" + src.replace("\\", "/"),
    ]
    if transparent:
        args.insert(2, "--default-background-color=00000000")
    try:
        subprocess.run(args, check=True, capture_output=True, timeout=120)
    finally:
        os.unlink(src)
    # Headless Chrome reserves some height for its own UI, so render taller and crop to the exact size.
    from PIL import Image

    img = Image.open(out_path)
    img.crop((0, 0, int(width * scale), int(height * scale))).save(out_path)

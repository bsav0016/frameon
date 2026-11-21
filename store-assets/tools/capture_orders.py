"""Captures the order screens from the web build running against the LOCAL emulators (see seed-orders-emulator.mjs).

Usage: python capture_orders.py <path-to-web-export> <node-dir-with-playwright-core>
The export must have been built with EXPO_PUBLIC_FIREBASE_EMULATOR=1, the Firebase Auth and Firestore emulators must be
running and seeded, and demo-art/*.jpg (from demo_art.py) must exist. Writes raw captures to ios/_raw and android/_raw.
"""
import os
import shutil
import subprocess
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(__file__)
STORE = os.path.join(HERE, "..")
PORT = 8099
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# name: (css width, css height, scale, iPhone-style safe areas, output folder)
DEVICES = {
    "6.9in": (440, 956, 3, True, "ios"),  # 1320x2868
    "6.5in": (428, 926, 3, True, "ios"),  # 1284x2778
    "android": (360, 720, 3, False, "android"),  # 1080x2160, Play needs at most 2:1
}


class SpaHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(os.path.join(path, "index.html")):
            self.path = "/index.html"
        return super().send_head()

    def log_message(self, *args):
        pass


NODE_SCRIPT = r"""
const { chromium } = require('playwright-core');
const [,, base, outDir, w, h, scale, safe, tag, chrome] = process.argv;
(async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale, isMobile: true, hasTouch: true });
  if (safe === '1') {
    // Emulate iPhone safe areas: 59pt status bar on top, 34pt home indicator below the 49pt tab bar.
    await ctx.addInitScript(() => {
      const css = '#root{padding-top:59px;box-sizing:border-box;background:#fff} [role=tablist]{height:94px !important;padding-bottom:34px !important;box-sizing:border-box} [role=tab]{height:60px !important}';
      const add = () => { const el = document.createElement('style'); el.textContent = css; document.documentElement.appendChild(el); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
    });
  }
  const page = await ctx.newPage();
  const settle = async (ms = 1800) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(ms); };
  const shot = async (name) => { await settle(); await page.screenshot({ path: `${outDir}/${tag}-${name}.png` }); console.log('shot', tag, name); };

  await page.goto(base + '/sign-in');
  await page.waitForFunction(() => typeof globalThis.__emulatorSignIn === 'function', null, { timeout: 30000 });
  await page.evaluate(() => globalThis.__emulatorSignIn('elena@example.test', 'emulator-only-password'));
  await page.goto(base + '/orders');
  await page.getByText('Shipped').first().waitFor({ timeout: 30000 });
  await shot('7-order-tracking');

  await page.getByRole('button', { name: 'Sales' }).click();
  await page.getByRole('button', { name: 'Mark shipped' }).first().waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Mark shipped' }).first().click();
  await page.getByRole('button', { name: 'UPS' }).click();
  await page.getByLabel('Tracking number').fill('1Z999AA10123456784');
  await page.getByLabel('Tracking number').blur();
  await shot('8-ship-order');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
"""


def main() -> None:
    web_dir, node_dir = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    art = os.path.join(HERE, "demo-art")
    shutil.copytree(art, os.path.join(web_dir, "demo-art"), dirs_exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), partial(SpaHandler, directory=web_dir))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    script = os.path.join(node_dir, "capture-orders.js")
    open(script, "w", encoding="utf-8").write(NODE_SCRIPT)
    try:
        for tag, (w, h, scale, safe, folder) in DEVICES.items():
            out = os.path.join(STORE, folder, "_raw")
            os.makedirs(out, exist_ok=True)
            subprocess.run(
                ["node", script, f"http://127.0.0.1:{PORT}", os.path.abspath(out), str(w), str(h), str(scale), "1" if safe else "0", tag, CHROME],
                cwd=node_dir, check=True, timeout=600,
            )
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()

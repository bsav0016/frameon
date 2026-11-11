"""Serves the web build of the app and captures App Store screenshots at exact iPhone sizes with a scripted browser.

Usage: python capture_ios.py <path-to-web-export> <node-dir-with-playwright-core>
Needs the demo community from seed-demo.mjs (it reads demo-state.json for ids).
"""
import json
import os
import subprocess
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "ios", "_raw")
STATE = json.load(open(os.path.join(HERE, "demo-state.json")))
PORT = 8099
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

DEVICES = {  # App Store Connect sizes: 6.9" 1320x2868, 6.5" 1284x2778 (both 3x)
    "6.9in": (440, 956),
    "6.5in": (428, 926),
}


class SpaHandler(SimpleHTTPRequestHandler):
    """Static files with an index.html fallback, like a single-page-app host."""

    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(os.path.join(path, "index.html")):
            self.path = "/index.html"
        return super().send_head()

    def log_message(self, *args):
        pass


def serve(directory: str) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), partial(SpaHandler, directory=directory))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


NODE_SCRIPT = r"""
const { chromium } = require('playwright-core');
const [,, base, outDir, w, h, tag, stateJson, chrome] = process.argv;
const state = JSON.parse(stateJson);
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: +w, height: +h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  // Emulate iPhone safe areas: 59pt status bar on top, 34pt home indicator below the 49pt tab bar.
  await ctx.addInitScript(() => {
    const css = '#root{padding-top:59px;box-sizing:border-box;background:#fff} [role=tablist]{height:94px !important;padding-bottom:34px !important;box-sizing:border-box} [role=tab]{height:60px !important}';
    const add = () => { const el = document.createElement('style'); el.textContent = css; document.documentElement.appendChild(el); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  });
  const page = await ctx.newPage();
  const settle = async (ms = 1800) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(ms); };
  const shot = async (name) => { await settle(); await page.screenshot({ path: `${outDir}/${tag}-${name}.png` }); console.log('shot', tag, name); };

  await page.goto(base + '/sign-in');
  await page.getByLabel('Username').fill('avery_lane');
  await page.getByLabel('Password').fill('Demo-Frame-2026!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('elena.moreau').first().waitFor({ timeout: 30000 });
  await shot('1-home');

  await page.goto(`${base}/post/${state.posts['dusk-ridge']}`);
  await page.getByText('Buy for').waitFor({ timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('2-artwork');

  await page.goto(`${base}/explore`);
  await page.waitForTimeout(2500);
  await shot('3-search');

  await page.goto(`${base}/user/${state.uids.elena}`);
  await page.getByText('Follow').first().waitFor({ timeout: 30000 });
  await shot('4-artist');

  await page.goto(`${base}/checkout/${state.posts['ember-field']}`);
  await page.getByLabel('Full name').fill('Avery Lane');
  await page.getByLabel('Address', { exact: true }).fill('412 Harbor Street');
  await page.getByLabel('City').fill('Duluth');
  await page.getByLabel('State / Province').fill('MN');
  await page.getByLabel('ZIP / Postal code').fill('55802');
  await shot('5-checkout');

  await page.goto(`${base}/notifications`);
  await page.getByText('started following you').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot('6-activity');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
"""


def main() -> None:
    web_dir, node_dir = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    os.makedirs(OUT, exist_ok=True)
    server = serve(web_dir)
    script = os.path.join(node_dir, "capture.js")
    open(script, "w", encoding="utf-8").write(NODE_SCRIPT)
    try:
        for tag, (w, h) in DEVICES.items():
            subprocess.run(
                ["node", script, f"http://127.0.0.1:{PORT}", os.path.abspath(OUT), str(w), str(h), tag, json.dumps(STATE), CHROME],
                cwd=node_dir, check=True, timeout=600,
            )
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()

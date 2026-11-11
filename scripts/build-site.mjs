// Builds the public website (privacy policy, terms, support) from the same text the app shows in Settings, so
// the two can never drift apart. Output goes to site-out/, which the Pages workflow publishes.
// Node 24 runs the .ts source directly (type stripping), so there is nothing to compile first.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LEGAL_UPDATED, PRIVACY, TERMS } from '../src/lib/legal.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site-out');
const REPO = 'https://github.com/bsav0016/frameon';
// Set SUPPORT_EMAIL (a repository variable in the Pages workflow) to show an email address; otherwise GitHub issues is shown.
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim();

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const contact = SUPPORT_EMAIL
  ? `<a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>`
  : `<a href="${REPO}/issues">${REPO}/issues</a> (a GitHub account is needed; email support will be added)`;

const css = `
:root{--bg:#FBF7E8;--surface:#fff;--text:#1A1A1A;--muted:#6B6659;--primary:#8B5A2B;--accent:#E8D9A0;--border:#E2DCC4}
@media (prefers-color-scheme:dark){:root{--bg:#14110C;--surface:#1F1A12;--text:#F4EFDD;--muted:#A89F88;--primary:#D4A15F;--accent:#3A3122;--border:#3A3122}}
*{box-sizing:border-box;overflow-wrap:anywhere}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
header,main,footer{max-width:720px;margin:0 auto;padding:0 20px}
header{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding-top:28px;padding-bottom:8px}
header img{width:44px;height:44px;border-radius:10px}header a{color:var(--text);text-decoration:none;font-weight:700;font-size:20px}
nav{margin-left:auto;display:flex;gap:16px;font-size:15px}nav a{color:var(--primary);font-weight:600}
h1{font-size:34px;line-height:1.2;margin:28px 0 4px}h2{font-size:20px;margin:30px 0 4px}
p{margin:6px 0}.muted{color:var(--muted);font-size:15px}a{color:var(--primary)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:6px 22px 20px;margin-top:18px}
footer{padding-top:36px;padding-bottom:48px;color:var(--muted);font-size:14px}`;

const page = (title, description, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="icon" href="/frameon/assets/icon.png"><style>${css}</style></head>
<body><header><img src="/frameon/assets/icon.png" alt="FrameOn icon"><a href="/frameon/">FrameOn</a>
<nav><a href="/frameon/privacy/">Privacy</a><a href="/frameon/terms/">Terms</a><a href="/frameon/support/">Support</a></nav></header>
<main>${body}</main><footer>&copy; ${new Date().getFullYear()} FrameOn</footer></body></html>`;

const legalBody = (heading, sections) =>
  `<h1>${heading}</h1><p class="muted">Last updated ${esc(LEGAL_UPDATED)}</p><div class="card">${sections
    .map((s) => `<h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p>`)
    .join('')}<h2>Contact</h2><p>${contact}</p></div>`;

const write = (path, html) => {
  mkdirSync(dirname(join(out, path)), { recursive: true });
  writeFileSync(join(out, path), html);
};

write('index.html', page('FrameOn', 'FrameOn is an app for sharing and buying original art.', `<h1>FrameOn</h1><p>Share your art, discover artists, and buy original work directly from the maker.</p>
<div class="card"><h2>Policies</h2><p><a href="/frameon/privacy/">Privacy Policy</a><br><a href="/frameon/terms/">Terms of Use</a></p><h2>Help</h2><p><a href="/frameon/support/">Support</a></p></div>`));
write('privacy/index.html', page('Privacy Policy - FrameOn', 'How FrameOn collects, uses and protects your information.', legalBody('Privacy Policy', PRIVACY)));
write('terms/index.html', page('Terms of Use - FrameOn', 'The rules for using FrameOn.', legalBody('Terms of Use', TERMS)));
write('support/index.html', page('Support - FrameOn', 'Get help with FrameOn.', `<h1>Support</h1><div class="card"><h2>Contact</h2><p>${contact}</p>
<h2>Report a problem or abuse</h2><p>In the app, use the flag on a post or comment, or the menu on a profile. Reports are reviewed within 24 hours.</p>
<h2>Delete your account</h2><p>Open Settings in the app and choose Delete account. This removes your profile, posts and comments.</p></div>`));

mkdirSync(join(out, 'assets'), { recursive: true });
copyFileSync(join(root, 'assets', 'images', 'logo.png'), join(out, 'assets', 'icon.png'));
console.log('site built in', out);

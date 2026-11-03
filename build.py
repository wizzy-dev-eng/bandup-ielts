#!/usr/bin/env python3
"""Builds web/index.html from src/*.css and src/*.js."""
import pathlib, re
W = pathlib.Path(__file__).resolve().parent
S = W / 'src'
css = '\n'.join((S / f).read_text(encoding='utf-8') for f in sorted(p.name for p in S.glob('*.css')))
js = '\n'.join((S / f).read_text(encoding='utf-8') for f in sorted(p.name for p in S.glob('*.js')))
css = re.sub(r'/\*(?!!)[\s\S]*?\*/', '', css)
import lighten
css += '\n/* light theme (generated) */\n' + lighten.walk(css) + '\n' + re.sub(r'/\*(?!!)[\s\S]*?\*/', '', (S / 'light' / 'manual.css').read_text(encoding='utf-8'))
FONTS = 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..600&family=Poppins:wght@400;500;600&display=swap'
ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23F6A9D3'/%3E%3Cstop offset='1' stop-color='%23C8B6FF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='16' fill='%2305050A'/%3E%3Ccircle cx='32' cy='32' r='17' fill='none' stroke='url(%23g)' stroke-width='5'/%3E%3Cpath d='M15 32h34' stroke='url(%23g)' stroke-width='4'/%3E%3C/svg%3E"
FALLBACK = ('<div style="max-width:560px;margin:15vh auto;padding:32px;font:16px/1.6 system-ui,sans-serif;color:#fff;'
            'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:24px">'
            '<h1 style="font-weight:400;margin:0 0 12px">BandUp</h1>'
            '<p>The file <b>ielts-data.js</b> was not found. Put it in the same folder as <b>index.html</b> and reload the page.</p>'
            '<p style="color:rgba(255,255,255,.6)">Файл <b>ielts-data.js</b> не найден. Положите его в ту же папку, что и <b>index.html</b>, и обновите страницу.</p></div>')
html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#05050A">
<meta name="color-scheme" content="dark">
<script>(function(){{try{{var t=localStorage.getItem('bandup.theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',t);if(t==='light'){{document.querySelector('meta[name=theme-color]').content='#F6F5FB';document.querySelector('meta[name=color-scheme]').content='light'}}}}catch(e){{}}}})()</script>
<title>BandUp – IELTS preparation by levels A, B and C</title>
<meta name="description" content="BandUp: IELTS-style Listening, Reading, Writing and Speaking practice by levels A, B and C, with a task builder, practice variants and an exam guide.">
<link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="preload" as="image" href="media/globe.jpg">
<style>
{css}
</style>
</head>
<body>
<noscript><div style="padding:40px;color:#fff;font-family:system-ui">BandUp needs JavaScript. / Для работы сайта включите JavaScript.</div></noscript>
<script src="ielts-data.js"></script>
<script>
(() => {{
'use strict';
if (!window.IELTS_DATA) {{ document.body.insertAdjacentHTML('beforeend', {FALLBACK!r}); return; }}
{js}
}})();
</script>
</body>
</html>
'''
(W / 'index.html').write_text(html, encoding='utf-8')
print('index.html', len(html.encode('utf-8')) // 1024, 'KB')

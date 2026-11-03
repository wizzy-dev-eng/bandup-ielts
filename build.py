#!/usr/bin/env python3
"""Builds web/index.html from src/*.css and src/*.js."""
import pathlib, re
W = pathlib.Path(__file__).resolve().parent
S = W / 'src'
css = '\n'.join((S / f).read_text(encoding='utf-8') for f in sorted(p.name for p in S.glob('*.css')))
js = '\n'.join((S / f).read_text(encoding='utf-8') for f in sorted(p.name for p in S.glob('*.js')))
css = re.sub(r'/\*(?!!)[\s\S]*?\*/', '', css)
def protect_print(css, fn):
    out, i = [], 0
    while True:
        j = css.find('@media print', i)
        if j < 0: out.append(fn(css[i:])); break
        out.append(fn(css[i:j]))
        k = css.index('{', j) + 1; d = 1
        while d: d += {'{': 1, '}': -1}.get(css[k], 0); k += 1
        out.append(css[j:k]); i = k
    return ''.join(out)
KW = {'normal': '400', 'bold': '700'}
def scale_fonts(c):
    def fs(m):
        v = m.group(1).strip()
        if re.search(r'(em|%)\b|inherit|initial|var\(--s', v) and 'clamp' not in v: return m.group(0)
        if not re.search(r'px|rem|vw|vh|clamp', v): return m.group(0)
        return f'font-size:calc(({v}) * var(--fs,1))'
    c = re.sub(r'font-size:([^;{}!]+)', fs, c)
    def fw(m):
        v = KW.get(m.group(1), m.group(1))
        return f'font-weight:calc({v} + var(--fw,0))'
    c = re.sub(r'font-weight:\s*(\d{3}|normal|bold)\b', fw, c)
    def sh(m):
        w, size, rest = m.group(1), m.group(2), m.group(3)
        w = KW.get(w, w) if w else '400'
        return f'font:{size}{rest};font-size:calc({size} * var(--fs,1));font-weight:calc({w} + var(--fw,0))'
    c = re.sub(r'(?<![-\w])font:\s*(?:(\d{3}|normal|bold)\s+)?(\d*\.?\d+px)((?:/[\d.]+)?\s+[^;{}]+)', sh, c)
    return c
import lighten
css += '\n/* light theme (generated) */\n' + lighten.walk(css) + '\n' + re.sub(r'/\*(?!!)[\s\S]*?\*/', '', (S / 'light' / 'manual.css').read_text(encoding='utf-8'))
css = protect_print(css, scale_fonts) + '\nb{font-weight:calc(600 + var(--fw,0))}'
FONTS = 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,200..700&family=Poppins:wght@300;400;500;600;700&display=swap'
LOGO = re.search(r"const LOGO_PATH = '([^']+)'", (S / '01b_ui.js').read_text(encoding='utf-8')).group(1)
ICON = 'data:image/svg+xml,' + ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#F6A9D3'/><stop offset='1' stop-color='#C8B6FF'/></linearGradient></defs><rect width='64' height='64' rx='16' fill='#05050A'/><g transform='translate(8 9) scale(1.5)'><path fill='url(#g)' fill-rule='evenodd' d='" + LOGO + "'/></g></svg>").replace('#', '%23').replace('<', '%3C').replace('>', '%3E')
FALLBACK = ('<div style="max-width:560px;margin:15vh auto;padding:32px;font:16px/1.6 system-ui,sans-serif;color:#fff;'
            'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:24px">'
            '<h1 style="font-weight:600;margin:0 0 12px">lynx<span style="color:#F6A9D3">.</span></h1>'
            '<p>The file <b>ielts-data.js</b> was not found. Put it in the same folder as <b>index.html</b> and reload the page.</p>'
            '<p style="color:rgba(255,255,255,.6)">Файл <b>ielts-data.js</b> не найден. Положите его в ту же папку, что и <b>index.html</b>, и обновите страницу.</p></div>')
html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#05050A">
<meta name="color-scheme" content="dark">
<script>(function(){{try{{var d=document.documentElement,s={{}};try{{s=JSON.parse(localStorage.getItem('lynx.settings')||'{{}}')||{{}}}}catch(e){{}}var t=s.theme;if(t!=='light'&&t!=='dark'){{t=(localStorage.getItem('bandup.theme')||'').replace(/"/g,'')}}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.setAttribute('data-theme',t);if(t==='light'){{document.querySelector('meta[name=theme-color]').content='#F6F5FB';document.querySelector('meta[name=color-scheme]').content='light'}}var F={{s:.9,m:1,l:1.12,xl:1.25}},W={{light:-100,normal:0,bold:100}};if(F[s.fs])d.style.setProperty('--fs',F[s.fs]);if(W[s.fw]!=null)d.style.setProperty('--fw',W[s.fw]);if(s.eco)d.setAttribute('data-eco','');if((localStorage.getItem('bandup.lang')||'').indexOf('ru')>-1)d.lang='ru'}}catch(e){{}}}})()</script>
<title>lynx. – IELTS preparation by levels A, B and C</title>
<meta name="description" content="lynx.: IELTS-style Listening, Reading, Writing and Speaking practice by levels A, B and C, with a task builder, practice variants and an exam guide.">
<link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{css}
</style>
</head>
<body>
<noscript><div style="padding:40px;color:#fff;font-family:system-ui">lynx. needs JavaScript. / Для работы сайта включите JavaScript.</div></noscript>
<script src="ielts-data.js"></script>
<script src="ielts-ru.js"></script>
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

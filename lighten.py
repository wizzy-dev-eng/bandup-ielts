"""Generates light-theme overrides from the dark CSS: every declaration with a theme colour
is re-emitted under [data-theme=light] with a mapped colour."""
import re
INK = (24, 20, 48)
ACC = {  # dark-theme accent -> light-theme accent
    (110,168,255):(37,99,214), (215,123,255):(150,60,210), (255,107,122):(214,48,72),
    (91,224,168):(14,140,92), (255,199,107):(178,112,20), (200,182,255):(104,76,214),
    (246,169,211):(194,62,136), (236,232,255):(75,58,158)}
DARK_SURF = {(12,12,20),(14,14,22),(16,16,26),(20,20,32),(11,11,20),(20,20,31),(18,10,26)}
def hx(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def rgba(c, a=1): return f'rgba({c[0]},{c[1]},{c[2]},{round(a,3)})' if a < 1 else '#%02x%02x%02x' % c
COL = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)|#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b')
def map_col(m, prop, solo):
    s = m.group(0)
    if s.startswith('#'): c, a = hx(s), 1.0
    else: c, a = tuple(int(m.group(i)) for i in (1, 2, 3)), float(m.group(4) or 1)
    bg = prop.startswith('background') or prop.startswith('--bg')
    if c == (255,255,255):
        if bg and solo and a <= .085: return rgba((255,255,255), min(.92, .55 + a*5)), True
        if bg and solo and a < 1: return rgba(INK, a*.55), True
        return rgba(INK, a), True
    if c == (0,0,0):
        if 'shadow' in prop: return rgba((40,30,90), a*.22), True
        return rgba((255,255,255), a), True
    if c == (5,5,10):
        if not bg and 'shadow' not in prop: return '#ffffff', True
        if a == 1: return '#f6f5fb', True
        return (rgba((20,18,40), .32) if a >= .6 else rgba((246,245,251), max(a, .78))), True
    if c in DARK_SURF: return rgba((255,255,255), max(a, .94)), True
    if c in ACC: return rgba(ACC[c], min(1, a*1.25) if a < 1 else 1), True
    return s, False
def split_top(s, sep):
    out, d, q, cur = [], 0, None, ''
    for ch in s:
        if q:
            cur += ch; q = None if ch == q else q; continue
        if ch in '"\'': q = ch
        elif ch == '(': d += 1
        elif ch == ')': d -= 1
        if ch == sep and d == 0: out.append(cur); cur = ''
        else: cur += ch
    out.append(cur); return out
def pref(sel):
    res = []
    for p in split_top(sel, ','):
        p = p.strip()
        if not p: continue
        if p.startswith('html'): res.append('html[data-theme=light]' + p[4:])
        elif p.startswith(':root'): res.append(':root[data-theme=light]' + p[5:])
        else: res.append('[data-theme=light] ' + p)
    return ','.join(res)
def decls(body):
    out = []
    for d in split_top(body, ';'):
        if ':' not in d: continue
        prop, val = d.split(':', 1); prop = prop.strip().lower(); val = val.strip()
        if 'mask' in prop or prop.startswith('--') : continue
        solo = bool(re.fullmatch(r'(rgba?\([^)]*\)|#[0-9A-Fa-f]{3,6})(\s*!important)?', val))
        hit = [False]
        def r(m):
            v, ok = map_col(m, prop, solo); hit[0] |= ok; return v
        nv = COL.sub(r, val)
        if hit[0]:
            if prop == 'background': prop = 'background-color' if solo else ('background-image' if 'gradient(' in nv and not re.search(r'\b(no-repeat|center|cover|url\()', nv) else prop)
            out.append(f'{prop}:{nv}')
    return ';'.join(out)
def walk(css):
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        head = css[i:j].strip()
        d, k = 1, j + 1
        while d and k < n:
            if css[k] == '{': d += 1
            elif css[k] == '}': d -= 1
            k += 1
        body = css[j+1:k-1]
        if head.startswith('@'):
            if head.startswith('@media') and 'print' not in head or head.startswith('@supports'):
                inner = walk(body)
                if inner: out.append(f'{head}{{{inner}}}')
        elif not head.startswith(':root'):
            dd = decls(body)
            if dd: out.append(f'{pref(head)}{{{dd}}}')
        i = k
    return '\n'.join(out)

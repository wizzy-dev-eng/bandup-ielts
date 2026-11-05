/* ---------- autocomplete for logins: a dropdown under login fields and for @mentions in the chat ---------- */
const AC = { el: null, owner: null, cache: new Map() };
function acFetch(q) {
  q = q.toLowerCase(); if (AC.cache.has(q)) return AC.cache.get(q);
  const p = api('users', { q: { q } }).then(j => (j.users || []).map(u => ({ ...u, frame: null }))).catch(() => { AC.cache.delete(q); return []; });
  AC.cache.set(q, p); if (AC.cache.size > 80) AC.cache.delete(AC.cache.keys().next().value);
  return p;
}
on('auth', () => AC.cache.clear());
/* fixed elements inside a <dialog> with backdrop-filter are placed relative to the dialog: correct by the measured shift */
function fixedPlace(el, x, y) {
  el.style.left = x + 'px'; el.style.top = y + 'px';
  const b = el.getBoundingClientRect(), dx = b.left - x, dy = b.top - y;
  if (Math.abs(dx) > .5 || Math.abs(dy) > .5) { el.style.left = (x - dx) + 'px'; el.style.top = (y - dy) + 'px'; }
}
function acBox(host) {
  if (!AC.el) {
    const el = AC.el = document.createElement('div'); el.className = 'acx'; el.id = 'acx'; el.setAttribute('role', 'listbox'); el.setAttribute('aria-label', tr('Suggestions', 'Подсказки'));
    el.addEventListener('pointerdown', e => e.preventDefault());
    el.addEventListener('click', e => { const b = e.target.closest('[data-aci]'); if (b && AC.owner) AC.owner.pick(+b.dataset.aci); });
  }
  if (AC.el.parentNode !== host) host.appendChild(AC.el);
  return AC.el;
}
/* mode: 'one' – the whole field is one login, 'list' – logins separated by commas, 'mention' – @login inside text */
function acAttach(inp, o = {}) {
  if (!inp || inp.dataset.ac) return; inp.dataset.ac = '1';
  const md = () => (typeof o.mode === 'function' ? o.mode() : o.mode) || 'one', lid = 'acx';
  let items = [], idx = 0, tok = null, seq = 0, open = false, skip = false;
  inp.setAttribute('autocomplete', 'off'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'false');
  if (inp.tagName === 'INPUT') inp.setAttribute('role', 'combobox');
  const token = () => {
    const v = inp.value, c = inp.selectionStart ?? v.length, mode = md();
    if (mode === 'mention') { const m = v.slice(0, c).match(/(?:^|[\s(,])@([A-Za-z0-9_]{0,40})$/); return m ? { a: c - m[1].length - 1, z: c, q: m[1] } : null; }
    if (mode === 'list') { const a = c - (v.slice(0, c).match(/[^\s,;]*$/) || [''])[0].length; let z = c; while (z < v.length && !/[\s,;]/.test(v[z])) z++; return { a, z, q: v.slice(a, z).replace(/^@/, '') }; }
    return { a: 0, z: v.length, q: v.trim().replace(/^@/, '') };
  };
  const has = (u, q) => !q || u.login.toLowerCase().startsWith(q) || (u.nick || '').toLowerCase().split(/\s+/).some(w => w.startsWith(q)) || (q.length > 2 && (u.nick || '').toLowerCase().includes(q));
  function merge(loc, rem) {
    const ex = new Set((o.exclude ? o.exclude() : []).map(s => String(s).toLowerCase())); if (Auth.user && !o.self) ex.add(Auth.user.login.toLowerCase());
    const out = [], seen = new Set();
    for (const u of [...loc, ...rem]) { const k = u && u.login && u.login.toLowerCase(); if (!k || seen.has(k) || ex.has(k)) continue; seen.add(k); out.push(u); if (out.length >= (o.max || 6)) break; }
    return out;
  }
  function place() {
    if (!open || !AC.el) return;
    const an = (o.anchor && o.anchor()) || inp.closest('.fld-in') || inp, r = an.getBoundingClientRect(), W = innerWidth, H = innerHeight, el = AC.el;
    if (!document.contains(inp) || !r.width) return hide();
    const w = Math.min(Math.max(r.width, 240), o.wide || 360, W - 16); el.style.width = w + 'px';
    const h = el.offsetHeight, up = o.up || (r.bottom + 6 + h > H - 8 && r.top - 6 - h > 8);
    el.classList.toggle('up', !!up);
    fixedPlace(el, Math.round(Math.max(8, Math.min(W - w - 8, r.left))), Math.round(up ? r.top - 6 - h : r.bottom + 6));
  }
  function render(list) {
    items = list; if (!items.length) return hide();
    if (idx >= items.length) idx = 0;
    const host = inp.closest('dialog[open]') || document.body, el = acBox(host);
    if (AC.owner && AC.owner !== api_) AC.owner.hide();
    AC.owner = api_; open = true;
    el.innerHTML = (o.title ? `<p class="acx-h">${esc(o.title)}</p>` : '') + items.map((u, i) => `<button type="button" class="acx-it${i === idx ? ' on' : ''}" role="option" id="acx-${i}" aria-selected="${i === idx}" data-aci="${i}" tabindex="-1">${avatarHtml(u, 30)}<span class="acx-t"><b>${esc(u.nick || u.login)}${u.premium ? `<i class="acx-pm">${ic('crown')}</i>` : ''}</b><small>@${esc(u.login)}${u.tag ? ` · ${esc(u.tag)}` : ''}</small></span></button>`).join('');
    el.classList.add('on'); inp.setAttribute('aria-expanded', 'true'); inp.setAttribute('aria-controls', lid); inp.setAttribute('aria-activedescendant', 'acx-' + idx);
    place();
  }
  function hide() {
    seq++; if (!open) return; open = false; items = [];
    inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant');
    if (AC.owner === api_) { AC.owner = null; if (AC.el) { AC.el.classList.remove('on'); AC.el.innerHTML = ''; } }
  }
  function mark() { if (!AC.el) return; $$('.acx-it', AC.el).forEach((b, i) => { b.classList.toggle('on', i === idx); b.setAttribute('aria-selected', String(i === idx)); }); inp.setAttribute('aria-activedescendant', 'acx-' + idx); const b = $('.acx-it.on', AC.el); b && b.scrollIntoView({ block: 'nearest' }); }
  function pick(i) {
    const u = items[i], mode = md(); if (!u) return; tok = token() || tok; if (!tok) return hide();
    const v = inp.value, ins = mode === 'mention' ? '@' + u.login + ' ' : mode === 'list' ? u.login + ', ' : u.login;
    const tail = mode === 'list' ? v.slice(tok.z).replace(/^[\s,;]+/, '') : v.slice(tok.z);
    inp.value = v.slice(0, tok.a) + ins + tail; const k = tok.a + ins.length;
    hide(); skip = true; inp.focus(); try { inp.setSelectionRange(k, k); } catch (e) { }
    inp.dispatchEvent(new Event('input', { bubbles: true })); skip = false;
    o.onPick && o.onPick(u);
  }
  const remote = debounce(async (q, my) => { const rem = await acFetch(q); if (my !== seq || !document.contains(inp)) return; render(merge(local(q), rem)); }, 160);
  const local = q => (o.local ? o.local() : []).filter(u => u && u.login && has(u, q));
  function update() {
    if (skip) return; const mode = md();
    tok = token(); if (!tok || (mode !== 'mention' && !tok.q)) return hide();
    const q = tok.q.toLowerCase(), my = ++seq, loc = merge(local(q), []);
    if (loc.length) render(loc); else if (!open) hide();
    if (o.remote === false || !q) { if (!loc.length) hide(); return; }
    remote(q, my);
  }
  const api_ = { hide, pick, place };
  inp.addEventListener('input', update);
  inp.addEventListener('click', () => { if (md() === 'mention') update(); });
  inp.addEventListener('keydown', e => {
    if (!open || e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; mark(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); pick(idx); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); }
  });
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) hide(); }, 120));
  return api_;
}
addEventListener('resize', () => AC.owner && AC.owner.place(), { passive: true });
addEventListener('scroll', e => { if (AC.owner && !(AC.el && AC.el.contains(e.target))) AC.owner.place(); }, { passive: true, capture: true });
addEventListener('hashchange', () => AC.owner && AC.owner.hide());

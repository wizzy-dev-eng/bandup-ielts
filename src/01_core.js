'use strict';
const D = window.IELTS_DATA;
D.i18n.en['common.skip'] = D.i18n.en['common.skip'] || 'Skip to content'; if (D.i18n.ru) D.i18n.ru['common.skip'] = D.i18n.ru['common.skip'] || 'К содержанию';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = s => String(s ?? '').replace(/\*\*|__/g, '');
function md(s, gap) {
  let h = esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<em>$1</em>').replace(/\n/g, '<br>');
  if (gap) h = h.replace(/\{\{(\d+)\}\}/g, (_, n) => gap(+n));
  return h;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const uid = (p = 'u') => p + Math.random().toString(36).slice(2, 9);
const fmt = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), x = s % 60; return String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
const shuffle = (a, r = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n, r = Math.random) => shuffle(a, r).slice(0, n);
const pickOne = (a, r = Math.random) => a[Math.floor(r() * a.length)];
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function debounce(f, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; }
function lev(a, b) {
  if (a === b) return 0; const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
const countWords = s => (String(s).trim().split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))).length;
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

/* ---------- storage ---------- */
const SK = D.meta.storageKeys;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};

/* ---------- events ---------- */
const bus = new EventTarget();
const on = (n, f) => { bus.addEventListener(n, f); return () => bus.removeEventListener(n, f); };
const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));

/* ---------- i18n ---------- */
let lang = store.get(SK.lang, 'en'); if (!D.i18n[lang]) lang = 'en';
function t(k, vars) { let s = (D.i18n[lang] && D.i18n[lang][k]) ?? D.i18n.en[k] ?? k; if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? ''); return s; }
const T = (k, tag = 'span', cls = '') => `<${tag} data-i18n="${k}"${cls ? ` class="${cls}"` : ''}>${esc(t(k))}</${tag}>`;
function applyLang(root = document) {
  document.documentElement.lang = lang;
  $$('[data-i18n]', root).forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-label]', root).forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
  $$('[data-i18n-title]', root).forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
  $$('[data-i18n-ph]', root).forEach(el => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
}
/* data overlay: window.IELTS_RU holds Russian versions of descriptive texts (exam materials stay in English) */
const RU = window.IELTS_RU || null;
function byIdToIdx(arr, ov) { if (!ov || Array.isArray(ov)) return ov; const o = []; Object.keys(ov).forEach(id => { const i = arr.findIndex(x => x.id === id); if (i >= 0) o[i] = ov[id]; }); return o; }
if (RU) { if (RU.tasks) RU.tasks = byIdToIdx(D.tasks, RU.tasks); if (RU.variants) RU.variants = byIdToIdx(D.variants, RU.variants); if (RU.levels) RU.levels = byIdToIdx(D.levels, RU.levels); }
function maskPick(src, mask) { if (mask && typeof mask === 'object' && src && typeof src === 'object') { const o = Array.isArray(src) ? [] : {}; Object.keys(mask).forEach(k => { if (k in src && mask[k] != null) o[k] = maskPick(src[k], mask[k]); }); return o; } return src; }
function deepApply(dst, src) { Object.keys(src).forEach(k => { const sv = src[k]; if (sv == null) return; if (typeof sv === 'object' && dst[k] && typeof dst[k] === 'object') deepApply(dst[k], sv); else dst[k] = sv; }); }
const D_EN = RU ? JSON.parse(JSON.stringify(maskPick(D, RU))) : null;
function applyDataLang(l) { if (!RU) return; deepApply(D, JSON.parse(JSON.stringify(l === 'ru' ? RU : D_EN))); }
if (lang === 'ru') applyDataLang('ru');
function setLang(l) { if (!D.i18n[l] || l === lang) return; lang = l; store.set(SK.lang, l); applyDataLang(l); applyLang(); emit('lang', l); }
const skillName = id => t('skill.' + id);
const SKILL = Object.fromEntries(D.skills.map(s => [s.id, s]));
const LEVEL = Object.fromEntries(D.levels.map(l => [l.id, l]));
const TASK = Object.fromEntries(D.tasks.map(x => [x.id, x]));

/* ---------- icons ---------- */
const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  practice: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  builder: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>',
  variants: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  guide: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
  progress: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
  print: '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3M8 21v-7h8v7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  speaker: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  headphones: '<path d="M4 17v-5a8 8 0 0 1 16 0v5"/><rect x="3" y="14" width="4.5" height="7" rx="1.8"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.8"/>',
  book: '<path d="M2.5 4.5h6A3.5 3.5 0 0 1 12 8v12.5a2.5 2.5 0 0 0-2.5-2.5h-7z"/><path d="M21.5 4.5h-6A3.5 3.5 0 0 0 12 8v12.5a2.5 2.5 0 0 1 2.5-2.5h7z"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  bolt: '<path d="M13 2 4 14h8l-1 8 9-12h-8z"/>',
  bulb: '<path d="M9 18h6M10 21.5h4"/><path d="M15 14.5c.3-1.2 1-2 1.8-2.9A6 6 0 1 0 7.2 11.6c.8.9 1.5 1.7 1.8 2.9"/>',
  note: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h5"/>',
  checklist: '<path d="m3.5 6.5 1.8 1.8L8.5 5M3.5 13.5l1.8 1.8 3.2-3.3M3.5 20l1.8-.2M12 7h8.5M12 14h8.5M12 20h8.5"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  layers: '<path d="m12 3 9.5 5-9.5 5-9.5-5z"/><path d="m2.5 12.5 9.5 5 9.5-5M2.5 17l9.5 5 9.5-5"/>',
  library: '<path d="M4.5 19.5a2.5 2.5 0 0 1 2.5-2.5h12.5V2.5H7a2.5 2.5 0 0 0-2.5 2.5z"/><path d="M4.5 19.5A2.5 2.5 0 0 0 7 22h12.5v-5M9 7h6"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.4A8.5 8.5 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  wave: '<path d="M2.5 10v4M6.5 6.5v11M10.5 3v18M14.5 7.5v9M18.5 5v14M22 10v4"/>',
  alert: '<path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  ruler: '<rect x="2" y="7.5" width="20" height="9" rx="2"/><path d="M6 7.5v3.5M10 7.5v2.5M14 7.5v3.5M18 7.5v2.5"/>',
  type: '<path d="M4 7V4.5h16V7M12 4.5v15M9 19.5h6"/>',
  puzzle: '<path d="M10 3.5a2 2 0 1 1 4 0V5h4a1 1 0 0 1 1 1v4h-1.5a2 2 0 1 0 0 4H19v4a1 1 0 0 1-1 1h-4v-1.5a2 2 0 1 0-4 0V19H6a1 1 0 0 1-1-1v-4h1.5a2 2 0 1 0 0-4H5V6a1 1 0 0 1 1-1h4z"/>',
  compass: '<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3z"/>',
  timer: '<circle cx="12" cy="13.5" r="8"/><path d="M10 2.5h4M12 13.5l3-3M19 6l1.5-1.5"/>',
  calendar: '<rect x="3.5" y="4.5" width="17" height="16.5" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
  target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
  flask: '<path d="M9.5 2.5v6.5L4.4 18.2A2.2 2.2 0 0 0 6.3 21.5h11.4a2.2 2.2 0 0 0 1.9-3.3L14.5 9V2.5M8 2.5h8M7 15.5h10"/>',
  clipboard: '<rect x="8.5" y="2.5" width="7" height="4" rx="1"/><path d="M15.5 4.5h2a2 2 0 0 1 2 2V20a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2M9 12h6M9 16h4"/>',
  chart: '<path d="M3.5 3.5v17h17"/><path d="M8 16.5v-4M12.5 16.5V8M17 16.5v-6.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>',
  approx: '<path d="M4 9.5c2.5-2.5 5.5 2.5 8 0s5.5-2.5 8 0M4 15.5c2.5-2.5 5.5 2.5 8 0s5.5-2.5 8 0"/>',
  slow: '<path d="M12 21a9 9 0 1 1 9-9"/><path d="M12 12l-3-4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;
const SK_IC = { L: 'headphones', R: 'book', W: 'pen', S: 'mic' };
D.skills.forEach(s => { s.icon = ic(SK_IC[s.id] || 'practice'); });
const levelPill = (l, extra = '') => `<span class="lp lv-${LEVEL[l] ? l : 'x'}"><i></i>${LEVEL[l] ? T('level.' + l) : esc(l)}${extra}</span>`;
const skillPill = s => `<span class="lp">${SKILL[s].icon} ${T('skill.' + s)}</span>`;

/* ---------- live region, toast ---------- */
function announce(msg) { const el = $('#live'); if (!el) return; el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); }
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2500); announce(msg); }

/* ---------- dialogs ---------- */
function openDialog({ title, body, actions = '', wide = false, onOpen, onClose, titleKey, cls = '' }) {
  const opener = document.activeElement;
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg' + (wide ? ' wide' : '') + (cls ? ' ' + cls : '');
  const hid = uid('dh');
  dlg.setAttribute('aria-labelledby', hid);
  dlg.innerHTML = `<div class="dlg-in"><div class="dlg-head"><h2 id="${hid}" class="display">${titleKey ? T(titleKey) : esc(title)}</h2><button class="icon-btn" data-close data-i18n-label="nav.close" aria-label="${esc(t('nav.close'))}">${ic('x')}</button></div><div class="dlg-body">${body}</div>${actions ? `<div class="dlg-actions">${actions}</div>` : ''}</div>`;
  document.body.appendChild(dlg);
  const close = (v) => {
    if (!dlg.open || dlg.classList.contains('closing')) return;
    if (reduced() || (typeof ecoOn === 'function' && ecoOn())) return dlg.close(v);
    dlg.classList.add('closing'); setTimeout(() => dlg.close(v), 190);
  };
  const h0 = location.hash, onHash = () => { if (location.hash !== h0) close(''); };
  window.addEventListener('hashchange', onHash);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(''); });
  dlg.addEventListener('close', () => { window.removeEventListener('hashchange', onHash); onClose && onClose(dlg.returnValue); dlg.remove(); if (opener && opener.focus && document.contains(opener)) opener.focus(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(''); if (e.target.closest('[data-close]')) close(''); });
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  onOpen && onOpen(dlg, close);
  return { el: dlg, close };
}
function confirmDlg(msg, okKey = 'common.back') {
  return new Promise(res => {
    let val = false;
    openDialog({
      title: msg, body: '', actions: `<button class="pill pill-outline" data-close>${esc(lang === 'ru' ? 'Отмена' : 'Cancel')}</button><button class="pill pill-white" data-ok>${esc(lang === 'ru' ? 'Да' : 'Yes')}</button>`,
      onOpen: (d, close) => { $('[data-ok]', d).addEventListener('click', () => { val = true; close('ok'); }); $('[data-ok]', d).focus(); },
      onClose: () => res(val)
    });
  });
}

/* ---------- tabs ---------- */
function tabsHtml(id, tabs, active, label, cls = '') {
  return `<div class="tabs ${cls}" role="tablist" aria-label="${esc(label)}" data-tabs="${id}">${tabs.map(tb => `<button type="button" role="tab" id="${id}-t-${tb.id}" data-tab="${tb.id}" aria-selected="${tb.id === active}" aria-controls="${id}-panel" tabindex="${tb.id === active ? 0 : -1}">${tb.html}</button>`).join('')}<span class="tab-ind" aria-hidden="true"></span></div>`;
}
function moveInd(tl, instant) {
  const a = $('[role=tab][aria-selected=true]', tl), ind = $('.tab-ind', tl); if (!a || !ind) return;
  const first = !ind.dataset.on; ind.dataset.on = '1';
  if (typeof liquidTo === 'function') liquidTo(ind, a.offsetLeft, a.offsetWidth, first || instant); else { ind.style.left = a.offsetLeft + 'px'; ind.style.width = a.offsetWidth + 'px'; }
}
function bindTabs(tl, onSelect) {
  const tabs = () => $$('[role=tab]', tl);
  const select = (b, focus = true) => {
    tabs().forEach(x => { const s = x === b; x.setAttribute('aria-selected', s); x.tabIndex = s ? 0 : -1; });
    if (focus) b.focus(); moveInd(tl); onSelect && onSelect(b.dataset.tab, b);
  };
  tl.addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) select(b, false); });
  tl.addEventListener('keydown', e => {
    const list = tabs(), i = list.indexOf(document.activeElement); if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % list.length; else if (e.key === 'ArrowLeft') j = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = list.length - 1;
    if (j != null) { e.preventDefault(); select(list[j]); }
  });
  requestAnimationFrame(() => moveInd(tl, true));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveInd(tl, true));
  return { select: id => { const b = tabs().find(x => x.dataset.tab === id); if (b) select(b, false); } };
}
window.addEventListener('resize', debounce(() => $$('[role=tablist]').forEach(x => moveInd(x, true)), 100));
on('lang', () => requestAnimationFrame(() => $$('[role=tablist]').forEach(x => moveInd(x, true))));

/* ---------- timer ---------- */
class Timer {
  constructor({ el, seconds = null, onEnd, onTick }) { this.el = el; this.seconds = seconds; this.onEnd = onEnd; this.onTick = onTick; this.acc = 0; this.running = false; this.done = false; this.warned = {}; this.render(); }
  get started() { return this.running || this.acc > 0; }
  start() { if (this.running || this.done) return; this.running = true; this.t0 = Date.now(); this.iv = setInterval(() => this.render(), 250); this.render(); }
  pause() { if (!this.running) return; this.acc += Date.now() - this.t0; this.running = false; clearInterval(this.iv); this.render(); }
  stop() { this.pause(); this.done = true; }
  reset(seconds = this.seconds) { this.pause(); this.acc = 0; this.done = false; this.seconds = seconds; this.warned = {}; if (this.el) this.el.classList.remove('warn', 'urgent', 'up'); this.render(); }
  elapsed() { return (this.acc + (this.running ? Date.now() - this.t0 : 0)) / 1000; }
  remaining() { return this.seconds == null ? null : Math.max(0, this.seconds - this.elapsed()); }
  render() {
    const val = this.seconds == null ? this.elapsed() : this.remaining();
    if (this.el) { const tv = $('.tv', this.el) || this.el; tv.textContent = fmt(val); }
    if (this.seconds != null && this.el) {
      if (val <= 300 && this.seconds > 300 && !this.warned[300]) { this.warned[300] = 1; this.el.classList.add('warn'); announce(lang === 'ru' ? 'Осталось 5 минут' : '5 minutes left'); }
      if (val <= 60 && this.seconds > 60 && !this.warned[60]) { this.warned[60] = 1; this.el.classList.add('urgent'); announce(lang === 'ru' ? 'Осталась 1 минута' : '1 minute left'); }
    }
    this.onTick && this.onTick(val, this);
    if (this.seconds != null && this.running && val <= 0) { this.stop(); if (this.el) this.el.classList.add('up'); announce(t('task.timeUp')); this.onEnd && this.onEnd(); }
  }
  destroy() { clearInterval(this.iv); this.running = false; }
}
const timerChip = () => `<span class="timer-chip" role="timer" aria-live="off">${ic('clock')}<span class="tv">00:00</span></span>`;

/* ---------- progress store ---------- */
const Progress = {
  all() { const v = store.get(SK.progress, []); return Array.isArray(v) ? v : []; },
  add(e) { const a = this.all(); a.push({ id: uid('p'), date: new Date().toISOString(), variantId: null, extra: {}, ...e }); store.set(SK.progress, a); emit('progress'); },
  clear() { store.set(SK.progress, []); emit('progress'); },
  best(taskId) { const a = this.all().filter(e => e.taskId === taskId && e.kind !== 'variant'); if (!a.length) return null; return a.reduce((m, e) => (e.percent ?? 0) > (m.percent ?? 0) ? e : m, a[0]); }
};
const Profile = { get() { return store.get(SK.profile, {}) || {}; }, set(p) { store.set(SK.profile, p); emit('profile'); } };
function daysLeft() {
  const p = Profile.get(); if (!p.date) return null;
  const d = new Date(p.date + 'T00:00:00'), now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

/* ---------- scoring helpers ---------- */
const ANCH = D.exam.anchors;
function estimateBand(raw, test) {
  const list = ANCH[test] || ANCH.listening;
  let best = null; for (const a of list) if (raw >= a.raw) best = a.band;
  return best == null ? { below: true, band: list[0].band } : { below: false, band: best };
}
const bandText = e => e.below ? `${t('raw.below')} ${e.band.toFixed(1).replace('.0', '')}` : `${t('raw.about')} ${e.band}`;
const overall = (a) => Math.round(((a[0] + a[1] + a[2] + a[3]) / 4) * 2) / 2;

/* ---------- speech ---------- */
const speech = {
  voices: [], supported: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window, token: 0, items: null, idx: 0, playing: false,
  init() {
    if (!this.supported) return;
    const load = () => { this.voices = speechSynthesis.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang)); emit('voices'); };
    load();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', load); else speechSynthesis.onvoiceschanged = load;
  },
  rank(v) { const o = ['en-GB', 'en-AU', 'en-IE', 'en-NZ', 'en-CA', 'en-US']; const i = o.findIndex(p => v.lang.replace('_', '-').toLowerCase().startsWith(p.toLowerCase())); return (i < 0 ? 9 : i) + (v.localService ? 0 : .5); },
  pick(gender, exclude) {
    const F = /libby|sonia|serena|kate|samantha|karen|moira|female|susan|hazel|tessa|fiona|victoria|zira|aria|jenny|emma|natasha|clara|maisie|mia|olivia|amy/i;
    const M = /ryan|george|daniel|arthur|oliver|\bmale\b|thomas|james|alex|david|mark|guy|fred|rishi|william|lee|brian|eric|roger/i;
    const vs = [...this.voices].sort((a, b) => this.rank(a) - this.rank(b)).filter(v => v !== exclude);
    const want = v => gender === 'male' ? (M.test(v.name) && !F.test(v.name)) : F.test(v.name);
    return vs.find(want) || vs[0] || null;
  },
  cast(speakers) {
    const map = {}; let used = null; const codes = Object.keys(speakers);
    const one = this.voices.length < 2;
    codes.forEach(c => {
      const g = speakers[c].voice; const v = this.pick(g, one ? null : used); used = v || used;
      map[c] = { voice: v, pitch: one && codes.length > 1 ? (g === 'male' ? 0.85 : 1.15) : 1 };
    });
    return map;
  },
  play(items, { rate = 0.95, from = 0, onLine, onEnd } = {}) {
    if (!this.supported) return;
    this.stop(); this.items = items; this.idx = from; this.rate = rate; this.onLine = onLine; this.onEnd = onEnd; this.playing = true;
    const tok = ++this.token; try { speechSynthesis.cancel(); } catch (e) { } setTimeout(() => this._next(tok), 60);
  },
  _next(tok) {
    if (tok !== this.token || !this.items) return;
    if (this.idx >= this.items.length) { this.playing = false; const f = this.onEnd; this.items = null; f && f(); return; }
    const it = this.items[this.idx]; const u = new SpeechSynthesisUtterance(it.text);
    if (it.voice) { u.voice = it.voice; u.lang = it.voice.lang; } else u.lang = 'en-GB';
    u.rate = this.rate; u.pitch = it.pitch || 1;
    let done = false;
    const next = () => { if (done || tok !== this.token) return; done = true; this.idx++; setTimeout(() => this._next(tok), it.gap ?? 350); };
    u.onend = next; u.onerror = e => { if (e.error === 'interrupted' || e.error === 'canceled') return; next(); };
    this.onLine && this.onLine(this.idx, it);
    speechSynthesis.speak(u);
  },
  pause() { this.token++; this.playing = false; try { speechSynthesis.cancel(); } catch (e) { } },
  resume() { if (!this.items) return; this.playing = true; const tok = ++this.token; this._next(tok); },
  stop() { this.token++; this.playing = false; this.items = null; if (this.supported) try { speechSynthesis.cancel(); } catch (e) { } },
  say(text, gender = 'male', rate = 0.95) { const v = this.pick(gender); this.play([{ text: speakable(text), voice: v }], { rate }); }
};
function speakable(s) {
  return plain(s)
    .replace(/\b[A-Z](?:-[A-Z]){2,}\b/g, m => m.split('-').join(', '))
    .replace(/\b0\d{3,4} \d{3} \d{3}\b|\b\d{5,}\b/g, m => m.split(' ').map(g => g.split('').map(c => c === '0' ? 'oh' : c).join(' ')).join(', '));
}
function splitSentences(s) { return String(s).split(/(?<=[.!?…])\s+(?=[A-Z“"‘'(0-9])/).filter(Boolean); }

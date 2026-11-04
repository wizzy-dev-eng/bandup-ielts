/* ---------- shell: nav, sheet, footer ---------- */
const NAV = [['home', '#/', 'nav.home'], ['practice', '#/practice', 'nav.practice'], ['builder', '#/builder', 'nav.builder'], ['variants', '#/variants', 'nav.variants'], ['guide', '#/guide/format', 'nav.guide'], ['progress', '#/progress', 'nav.progress']];
const MEDIA = D.meta.media;
/* extra UI strings (aria labels etc.), kept here so applyLang() can switch them */
const I18X = { 'aria.main': ['Main', 'Основная навигация'], 'aria.menu': ['Menu', 'Меню'], 'aria.lang': ['Language', 'Язык'], 'aria.footer': ['Footer', 'Подвал сайта'], 'aria.home': ['home', 'главная'], 'foot.services': ['Our services', 'Наши сервисы'], 'foot.cookies': ['Cookies', 'Файлы cookie'], 'set.fs_s': ['Small', 'Мелкий'], 'set.fs_m': ['Normal', 'Обычный'], 'set.fs_l': ['Large', 'Крупный'], 'set.fs_xl': ['Extra large', 'Очень крупный'] };
Object.entries(I18X).forEach(([k, [e, r]]) => { D.i18n.en[k] = e; if (D.i18n.ru) D.i18n.ru[k] = r; });
function stillImg(cls = '') { return `<img class="${cls}" src="${esc(MEDIA.still.local)}" data-remote="${esc(MEDIA.still.remote)}" alt="" width="${MEDIA.still.width}" height="${MEDIA.still.height}" decoding="async">`; }
function fixImgFallback(root) { $$('img[data-remote]', root).forEach(img => { const f = () => { if (img.src !== img.dataset.remote) img.src = img.dataset.remote; }; img.addEventListener('error', f, { once: true }); if (img.complete && img.naturalWidth === 0) f(); }); }
function shellHtml() {
  return `<a class="skip" href="#main" data-i18n="common.skip">${lang === 'ru' ? 'К содержанию' : 'Skip to content'}</a>
<header class="nav" id="nav">
  <div class="nav-row">
    <a class="brand" href="#/" aria-label="${esc(D.meta.brand)} – ${esc(t('aria.home'))}">${brandHtml()}</a>
    <nav class="nav-links" data-i18n-label="aria.main" aria-label="${esc(t('aria.main'))}"><span class="nav-ind" aria-hidden="true"></span>${NAV.map(([k, h, l]) => `<a href="${h}" data-nav="${k}">${T(l)}</a>`).join('')}</nav>
    <div class="nav-right">
      <div class="lang"><button class="lang-btn" id="langBtn" aria-haspopup="true" aria-expanded="false" data-i18n-label="nav.lang" aria-label="${esc(t('nav.lang'))}">${ic('globe')}<span class="lc">${lang.toUpperCase()}</span>${ic('chev', 'chev')}</button>
        <div class="lang-menu" id="langMenu" role="menu" hidden><button role="menuitemradio" data-lang="en" aria-checked="${lang === 'en'}"><span>English · EN</span><span class="mchk">${ic('check', 'draw')}</span></button><button role="menuitemradio" data-lang="ru" aria-checked="${lang === 'ru'}"><span>Русский · RU</span><span class="mchk">${ic('check', 'draw')}</span></button></div></div>
      <button class="icon-btn gear-btn" id="gearBtn" type="button" aria-haspopup="dialog" aria-expanded="false" data-i18n-label="set.title" aria-label="${esc(t('set.title'))}" data-tip="${esc(t('set.title'))}">${ic('gear')}</button>
      <div class="auth-slot" id="authSlot"></div>
      <button class="burger" id="burger" aria-expanded="false" aria-controls="sheet" data-i18n-label="nav.menu" aria-label="${esc(t('nav.menu'))}"><i></i><i></i></button>
    </div>
  </div>
  <div class="nav-search" id="navSearch">${searchHtml()}</div>
</header>
<div class="sheet" id="sheet" hidden><div class="sheet-panel" role="dialog" aria-modal="true" data-i18n-label="aria.menu" aria-label="${esc(t('aria.menu'))}">
  <div class="sheet-top"><a class="brand" href="#/">${brandHtml()}</a><button class="icon-btn" id="sheetClose" data-i18n-label="nav.close" aria-label="${esc(t('nav.close'))}">${ic('x')}</button></div>
  ${NAV.map(([k, h, l]) => `<a class="sl" href="${h}" data-nav="${k}">${ic(k)}${T(l)}</a>`).join('')}
  <a class="sl" href="#/about" data-nav="about">${ic('about')}${T('nav.about')}</a>
  <a class="sl" href="#/people" data-nav="people">${ic('people')}<span data-i18n="people.title">${esc(t('people.title'))}</span></a>
  <div class="seg" role="group" data-i18n-label="aria.lang" aria-label="${esc(t('aria.lang'))}"><button data-lang="en" aria-pressed="${lang === 'en'}">EN</button><button data-lang="ru" aria-pressed="${lang === 'ru'}">RU</button></div>
  <button class="sl sl-btn" type="button" data-open-settings>${ic('gear')}${T('set.title')}</button>
  <div class="sheet-actions" id="sheetAuth"></div>
</div></div>
<main id="main" tabindex="-1"><div id="view"></div></main>
<div id="print-root" aria-hidden="true"></div>
<div class="toast" id="toast" role="status"></div>
<div class="sr-only" id="live" aria-live="polite"></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--pink)"/><stop offset="1" style="stop-color:var(--lilac)"/></linearGradient></defs></svg>`;
}
function footerHtml() {
  return `<footer class="footer"><div class="lightline"><i></i></div><div class="row"><a class="brand" href="#/">${brandHtml()}</a>
  <nav aria-label="${esc(t('aria.footer'))}"><a href="#/about">${T('nav.about')}</a><a href="#/guide/format">${T('nav.guide')}</a><a href="#/progress">${T('nav.progress')}</a><a href="#/services">${T('foot.services')}</a><a href="#/privacy">${esc(tr('Privacy policy', 'Политика конфиденциальности'))}</a><a href="#/contact">${esc(tr('Contact us', 'Связаться с нами'))}</a><button type="button" class="foot-lnk" data-cookies>${T('foot.cookies')}</button></nav></div>
  <p>${T('common.footer')}</p><p>${esc(D.meta.note)}</p></footer>`;
}
function initShell() {
  document.body.insertAdjacentHTML('afterbegin', shellHtml());
  fixImgFallback(document.body);
  const nav = $('#nav');
  let lastY = scrollY;
  const onScroll = () => { const y = scrollY; nav.classList.toggle('scrolled', y > 10); if (Math.abs(y - lastY) > 6) { nav.classList.toggle('compact', y > 160 && y > lastY && !nav.contains(document.activeElement)); lastY = y; } };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // language menu
  const lb = $('#langBtn'), lm = $('#langMenu');
  let lmT = 0;
  const closeLm = () => {
    if (lm.hidden || lm.classList.contains('closing')) return; lb.setAttribute('aria-expanded', 'false');
    if (reduced()) { lm.hidden = true; return; }
    lm.classList.add('closing'); clearTimeout(lmT); lmT = setTimeout(() => { lm.hidden = true; lm.classList.remove('closing'); }, 150);
  };
  lb.addEventListener('click', e => { e.stopPropagation(); if (!lm.hidden && !lm.classList.contains('closing')) return closeLm(); clearTimeout(lmT); lm.classList.remove('closing'); lm.hidden = false; lb.setAttribute('aria-expanded', 'true'); $('button[aria-checked=true]', lm).focus(); });
  lm.addEventListener('keydown', e => { const b = $$('button', lm), i = b.indexOf(document.activeElement); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); b[(i + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length].focus(); } if (e.key === 'Escape') { closeLm(); lb.focus(); } });
  document.addEventListener('click', e => { if (e.target.closest('[data-open-settings]')) { e.preventDefault(); closeSheet(false); openSettings(); }
  if (!e.target.closest('.lang')) closeLm(); const lbtn = e.target.closest('[data-lang]'); if (lbtn) { setLang(lbtn.dataset.lang); closeLm(); } });
  // sheet
  const sheet = $('#sheet'), burger = $('#burger');
  const openSheet = () => { sheet.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('#sheetClose').focus(); };
  const closeSheet = (focus = true) => { if (sheet.hidden) return; sheet.hidden = true; burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; if (focus) burger.focus(); };
  burger.addEventListener('click', openSheet);
  $('#sheetClose').addEventListener('click', () => closeSheet());
  sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('a')) closeSheet(false); if (e.target.closest('[data-profile]')) { closeSheet(false); openProfile(); } });
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Tab') { const f = $$('a,button', sheet).filter(x => x.offsetParent); const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  addEventListener('hashchange', () => { closeSheet(false); if (typeof closeSettings === 'function' && document.body.classList.contains('set-open')) closeSettings(); });
  $('#gearBtn').addEventListener('click', () => openSettings());
  addEventListener('resize', debounce(() => moveNavInd(true), 100));
  initSearch(); renderAuth();
  on('lang', () => { $('.lc', lb).textContent = lang.toUpperCase(); $$('[data-lang]').forEach(b => { b.setAttribute(b.getAttribute('role') === 'menuitemradio' ? 'aria-checked' : 'aria-pressed', String(b.dataset.lang === lang)); }); $('.skip').textContent = lang === 'ru' ? 'К содержанию' : 'Skip to content'; updateBadge(); });
  on('profile', updateBadge); updateBadge();
}
function setActiveNav(key) { $$('[data-nav]').forEach(a => { if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); moveNavInd(false); }
function moveNavInd(instant) {
  const ind = $('.nav-ind'); if (!ind) return; const a = $('.nav-links a[aria-current="page"]');
  if (!a || !a.offsetWidth) { ind.classList.remove('on'); return; }
  const first = !ind.classList.contains('on'); ind.classList.add('on');
  liquidTo(ind, a.offsetLeft, a.offsetWidth, instant || first);
}
function updateBadge() { const b = $('#profileBadge'); if (!b) return; const d = daysLeft(); if (d == null || d < 0) { b.hidden = true; return; } b.hidden = false; b.textContent = lang === 'ru' ? `${d} дн.` : `${d} days`; }

/* ---------- profile dialog ---------- */
function openProfile() {
  const p = Profile.get();
  const bands = []; for (let b = 4; b <= 9; b += .5) bands.push(b.toFixed(1));
  openDialog({
    titleKey: 'profile.title',
    body: `<form id="pf" class="stack">
      <label class="field">${T('profile.name')}<input class="inp" name="name" value="${esc(p.name || '')}" autocomplete="given-name"></label>
      <div class="grid g2"><label class="field">${T('profile.target')}<select class="inp" name="target"><option value="">—</option>${bands.map(b => `<option ${p.target === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
      <label class="field">${T('profile.date')}<input class="inp" type="date" name="date" value="${esc(p.date || '')}"></label></div>
      <label class="field">${T('variants.yourLevel')}<select class="inp" name="level"><option value="">—</option>${D.levels.map(l => `<option value="${l.id}" ${p.level === l.id ? 'selected' : ''}>${esc(l.name)} · ${esc(l.label)}</option>`).join('')}</select></label>
      <p class="muted" id="pfDays"></p></form>`,
    actions: `<button class="pill pill-outline" data-close>${T('nav.close')}</button><button class="pill pill-white" id="pfSave">${T('profile.save')}</button>`,
    onOpen: (d, close) => {
      const f = $('#pf', d);
      const days = () => { const v = f.date.value; const el = $('#pfDays', d); if (!v) { el.textContent = ''; return; } const dd = new Date(v + 'T00:00:00'), n = new Date(); n.setHours(0, 0, 0, 0); const k = Math.round((dd - n) / 864e5); el.textContent = k === 0 ? t('profile.today') : k > 0 ? t('profile.daysLeft', { n: k }) : ''; };
      f.date.addEventListener('input', days); days();
      const save = e => { e && e.preventDefault(); Profile.set({ ...Profile.get(), name: f.name.value.trim(), target: f.target.value, date: f.date.value, level: f.level.value }); toast(t('profile.saved')); close('ok'); };
      $('#pfSave', d).addEventListener('click', save); f.addEventListener('submit', save);
      f.name.focus();
    }
  });
}

/* ---------- band calculator + raw estimator ---------- */
const cefrOf = b => b >= 8.5 ? 'C2' : b >= 7 ? 'C1' : b >= 5.5 ? 'B2' : b >= 4 ? 'B1' : 'A1–A2';
const lvlOf = b => b >= 7 ? 'C' : b >= 4 ? 'B' : 'A';
const BANDS = []; for (let b = 9; b >= 0; b -= .5) BANDS.push(b);
function bandSel(id, k, v) {
  const lid = `${id}-${k}-l`, vid = `${id}-${k}-v`;
  return `<div class="bsel" data-bsel="${k}"><span class="bsel-l" id="${lid}">${T('skill.' + k)}</span>
  <button type="button" class="bsel-btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${lid} ${vid}"><span class="bsel-v" id="${vid}">${v.toFixed(1)}</span><span class="bsel-c">${cefrOf(v)}</span>${ic('chev', 'chev')}</button>
  <input type="hidden" data-c="${k}" value="${v.toFixed(1)}">
  <div class="bsel-pop" role="listbox" aria-labelledby="${lid}" tabindex="-1" hidden>${BANDS.map((b, i) => `<button type="button" role="option" data-v="${b.toFixed(1)}" aria-selected="${b === v}" style="--i:${i};--w:${(b / 9 * 100).toFixed(1)}%" class="lv-${lvlOf(b)}"><b>${b.toFixed(1)}</b><i aria-hidden="true"></i><small>${cefrOf(b)}</small></button>`).join('')}</div></div>`;
}
function calcHtml(id) {
  const lv = tr('Level', 'Уровень');
  return `<div class="calc" id="${id}"><div class="calc-grid">${bandSel(id, 'L', 6.5)}${bandSel(id, 'R', 6.5)}${bandSel(id, 'W', 5)}${bandSel(id, 'S', 7)}</div>
  <div class="calc-out2" aria-live="polite"><div class="co"><span class="kicker">${T('calc.average')}</span><span class="co-n" data-avg>6.25</span><small>&nbsp;</small></div>
  <div class="co main"><span class="kicker">${T('calc.overall')}</span><span class="co-n grad" data-ov>6.5</span><small>${esc(tr('rounded', 'с округлением'))}</small></div>
  <div class="co"><span class="kicker">CEFR</span><span class="co-n" data-cefr>B2</span><small data-lvl>${esc(lv)} B</small></div></div>
  <p class="note">${T('calc.rule')}</p></div>`;
}
const openBsel = { cur: null };
function closeBsel(focus) { const s = openBsel.cur; if (!s) return; openBsel.cur = null; const pop = $('.bsel-pop', s), btn = $('.bsel-btn', s); btn.setAttribute('aria-expanded', 'false'); s.classList.remove('open');
  if (reduced() || ecoOn()) pop.hidden = true; else { pop.classList.add('closing'); setTimeout(() => { pop.classList.remove('closing'); if (!s.classList.contains('open')) pop.hidden = true; }, 160); }
  if (focus) btn.focus(); }
document.addEventListener('pointerdown', e => { if (openBsel.cur && !openBsel.cur.contains(e.target)) closeBsel(false); });
function bindCalc(root) {
  const val = k => parseFloat($(`[data-c="${k}"]`, root).value);
  const upd = () => {
    const v = ['L', 'R', 'W', 'S'].map(val), avg = v.reduce((a, b) => a + b) / 4, ov = overall(v);
    $('[data-avg]', root).textContent = String(+avg.toFixed(3)); $('[data-ov]', root).textContent = ov.toFixed(1);
    $('[data-cefr]', root).textContent = cefrOf(ov); $('[data-lvl]', root).textContent = `${tr('Level', 'Уровень')} ${lvlOf(ov)}`;
    $$('[data-bsel]', root).forEach(s => { const x = val(s.dataset.bsel); $('.bsel-v', s).textContent = x.toFixed(1); $('.bsel-c', s).textContent = cefrOf(x); $$('[role=option]', s).forEach(o => o.setAttribute('aria-selected', String(+o.dataset.v === x))); });
  };
  const pick = (s, v) => { const inp = $('[data-c]', s); inp.value = v; inp.dispatchEvent(new Event('change')); closeBsel(true); };
  $$('[data-bsel]', root).forEach(s => {
    const btn = $('.bsel-btn', s), pop = $('.bsel-pop', s);
    $('[data-c]', s).addEventListener('change', upd);
    btn.addEventListener('click', () => {
      if (openBsel.cur === s) return closeBsel(true);
      closeBsel(false); openBsel.cur = s; pop.hidden = false; pop.classList.remove('closing'); s.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      const sel = $('[aria-selected=true]', pop) || $('[role=option]', pop);
      pop.scrollTop = Math.max(0, sel.offsetTop - pop.clientHeight / 2 + sel.offsetHeight / 2); sel.focus({ preventScroll: true });
    });
    pop.addEventListener('click', e => { const o = e.target.closest('[role=option]'); if (o) pick(s, o.dataset.v); });
    pop.addEventListener('keydown', e => {
      const os = $$('[role=option]', pop), i = os.indexOf(document.activeElement);
      const go = j => { e.preventDefault(); os[Math.max(0, Math.min(os.length - 1, j))].focus(); };
      if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(os.length - 1);
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); closeBsel(true); }
    });
  });
  upd();
}
function openCalc() { openDialog({ titleKey: 'calc.title', wide: true, cls: 'calc-dlg', body: calcHtml('calcDlg') + `<div class="lightline"><i></i></div><h3 class="raw-h">${T('raw.title')}</h3>` + rawHtml('rawDlg'), onOpen: d => { bindCalc($('#calcDlg', d)); bindRaw($('#rawDlg', d)); } }); }
const RAW_TESTS = [['listening', 'skill.L'], ['readingAcademic', 'raw.academic'], ['readingGeneral', 'raw.general']];
function rawHtml(id) {
  return `<div class="raw" id="${id}"><div class="seg" role="group" aria-label="${esc(tr('Test', 'Тест'))}">${RAW_TESTS.map(([k, l], i) => `<button type="button" data-test="${k}" aria-pressed="${!i}">${T(l)}</button>`).join('')}</div>
  <div class="rs-row"><div class="rs" data-rs role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="40" aria-valuenow="30" aria-label="${esc(t('raw.correct'))}" style="--p:.75">
    <div class="rs-track"><i class="rs-fill"></i><span class="rs-ticks" data-ticks></span></div><span class="rs-thumb"><span class="rs-tip" data-tip-v>30</span></span></div>
    <label class="rs-num"><input class="inp" type="number" min="0" max="40" step="1" value="30" inputmode="numeric" data-n aria-label="${esc(t('raw.correct'))}"><span>/ 40</span></label></div>
  <div class="rs-scale" aria-hidden="true"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span></div>
  <div class="raw-out"><div class="big-num grad" data-out>7</div><div class="raw-meta"><div class="muted" data-outtxt></div><div class="row"><span class="lp" data-rcefr></span><span class="lp" data-rlvl></span></div></div></div>
  <div class="tbl-wrap calc-tw"><table class="tbl calc-tbl"><thead><tr><th scope="col">${esc(tr('Band', 'Балл'))}</th>${RAW_TESTS.map(([k, l]) => `<th scope="col" data-col="${k}">${T(l)}</th>`).join('')}<th scope="col">CEFR</th></tr></thead><tbody data-at></tbody></table></div>
  <p class="note">${esc(ANCH.note)} <a href="${esc(ANCH.source)}" target="_blank" rel="noopener">ielts.org</a></p></div>`;
}
function rawRange(list, band) { const i = list.findIndex(a => a.band === band); if (i < 0) return '—'; const lo = list[i].raw, hi = i < list.length - 1 ? list[i + 1].raw - 1 : 40; return lo === hi ? String(lo) : `${lo}–${hi}`; }
function bindRaw(root) {
  let test = 'listening', v = 30, drag = false;
  const rs = $('[data-rs]', root), n = $('[data-n]', root), tip = $('[data-tip-v]', root);
  const bands = [...new Set(ANCH.listening.map(a => a.band))].sort((a, b) => b - a);
  const table = () => {
    const e = estimateBand(v, test);
    $('[data-at]', root).innerHTML = bands.map(b => `<tr class="${!e.below && e.band === b ? 'on' : ''} lv-${lvlOf(b)}"><th scope="row"><span class="bdot"></span>${b.toFixed(1)}</th>${RAW_TESTS.map(([k]) => `<td class="${k === test ? 'cur' : ''}">${rawRange(ANCH[k], b)}</td>`).join('')}<td><span class="cefr-t">${cefrOf(b)}</span></td></tr>`).join('');
    $$('[data-col]', root).forEach(th => th.classList.toggle('cur', th.dataset.col === test));
    $('[data-ticks]', root).innerHTML = ANCH[test].map(a => `<i style="left:${a.raw / 40 * 100}%" class="${!e.below && a.band === e.band ? 'on' : ''}"></i>`).join('');
  };
  const upd = (opts = {}) => {
    const e = estimateBand(v, test);
    rs.style.setProperty('--p', (v / 40).toFixed(4)); rs.setAttribute('aria-valuenow', String(v)); rs.setAttribute('aria-valuetext', `${v} / 40`); tip.textContent = v;
    if (!opts.keepField) n.value = v;
    $('[data-out]', root).textContent = e.below ? '<' + e.band : e.band; $('[data-outtxt]', root).textContent = `${v}/40 → ${bandText(e)}`;
    const b = e.below ? 3.5 : e.band; $('[data-rcefr]', root).textContent = 'CEFR ' + cefrOf(b);
    const l = $('[data-rlvl]', root); l.className = 'lp lv-' + lvlOf(b); l.innerHTML = `<i></i>${esc(tr('Level', 'Уровень'))} ${lvlOf(b)}`;
    table();
  };
  const setV = (x, opts) => { x = Math.max(0, Math.min(40, Math.round(x))); if (x === v && !opts) return; v = x; upd(opts); };
  const fromX = e => { const r = $('.rs-track', rs).getBoundingClientRect(); return (e.clientX - r.left) / r.width * 40; };
  rs.addEventListener('pointerdown', e => { if (e.button) return; drag = true; rs.classList.add('drag'); rs.setPointerCapture(e.pointerId); rs.focus({ preventScroll: true }); setV(fromX(e)); setTimeout(() => drag && rs.classList.add('dragging'), 140); });
  rs.addEventListener('pointermove', e => { if (drag) { rs.classList.add('dragging'); setV(fromX(e)); } });
  const end = () => { drag = false; rs.classList.remove('drag', 'dragging'); };
  rs.addEventListener('pointerup', end); rs.addEventListener('pointercancel', end);
  rs.addEventListener('keydown', e => { const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key]; if (k) { e.preventDefault(); setV(v + k); } else if (e.key === 'Home') { e.preventDefault(); setV(0); } else if (e.key === 'End') { e.preventDefault(); setV(40); } });
  n.addEventListener('input', () => { if (n.value.trim() === '') return; const x = parseInt(n.value, 10); if (!isFinite(x)) return; v = Math.max(0, Math.min(40, x)); upd({ keepField: true }); });
  n.addEventListener('blur', () => { n.value = v; });
  n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); n.value = v; } });
  $$('[data-test]', root).forEach(b => b.addEventListener('click', () => { test = b.dataset.test; $$('[data-test]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b))); upd(); }));
  upd();
}

/* ---------- router ---------- */
let curMeta = {}, cleanups = [], leaveGuard = null, renderTok = 0, firstRender = true, lastHash = location.hash, suppressNext = false;
const onCleanup = f => cleanups.push(f);
function parseHash() { const h = (location.hash || '').replace(/^#/, '') || '/'; const i = h.indexOf('?'); const path = (i < 0 ? h : h.slice(0, i)) || '/'; return { path: path.replace(/\/+$/, '') || '/', q: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) }; }
const ROUTES = [];
const route = (re, fn) => ROUTES.push([re, fn]);
async function render(opts = {}) {
  const instant = !!opts.instant;
  const tok = ++renderTok;
  const { path, q } = parseHash();
  cleanups.forEach(f => { try { f(); } catch (e) { console.error(e); } }); cleanups = []; leaveGuard = null; speech.stop();
  let page = notFound, params = [];
  for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) { page = fn; params = m.slice(1); break; } }
  const view = $('#view');
  if (!firstRender && !instant && !reduced()) { view.classList.add('leaving'); await wait(200); if (tok !== renderTok) return; }
  view.classList.remove('leaving');
  if (!instant && !reduced()) view.classList.add('pre');
  if (!instant) window.scrollTo(0, 0);
  view.innerHTML = '';
  let meta = {};
  try { meta = page(view, params, q) || {}; } catch (e) { console.error(e); view.innerHTML = `<div class="page"><div class="glass empty"><p>Error: ${esc(e.message)}</p><a class="pill pill-white" href="#/">${T('common.home')}</a></div></div>`; }
  curMeta = meta;
  if (!meta.noFooter) view.insertAdjacentHTML('beforeend', footerHtml());
  fixImgFallback(view);
  setActiveNav(meta.nav || '');
  document.title = `${D.meta.brand} – ${meta.title || ''}`;
  if (meta.nav !== 'home') Globe.setMode('page');
  requestAnimationFrame(() => { view.classList.remove('pre'); });
  if (!firstRender && !instant) { const h1 = $('h1', view); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); } announce(meta.title || ''); }
  firstRender = false;
}
addEventListener('hashchange', async () => {
  if (suppressNext) { suppressNext = false; lastHash = location.hash; return; }
  if (leaveGuard && leaveGuard()) {
    const target = location.hash; suppressNext = true; location.hash = lastHash;
    const ok = await confirmDlg(lang === 'ru' ? 'Покинуть задание? Ответы будут потеряны.' : 'Leave this task? Your answers will be lost.');
    if (!ok) return; leaveGuard = null; location.hash = target; return;
  }
  lastHash = location.hash;
  if (curMeta && typeof curMeta.soft === 'function' && curMeta.softRe) { const { path, q } = parseHash(), m = path.match(curMeta.softRe); if (m && curMeta.soft(m.slice(1), q) !== false) return; }
  render();
});
addEventListener('beforeunload', e => { if (leaveGuard && leaveGuard()) { e.preventDefault(); e.returnValue = ''; } });
function setQuery(q) { const { path } = parseHash(); const s = q.toString(); const h = '#' + path + (s ? '?' + s : ''); history.replaceState(null, '', h); lastHash = h; }
function pageHead(labelHtml, titleKey, subKey, titleText) {
  return `<header class="page-head"><span class="glass-pill">${labelHtml}</span><h1 class="page-title display" tabindex="-1"><span class="grad" ${titleKey ? `data-i18n="${titleKey}"` : ''}>${titleKey ? esc(t(titleKey)) : esc(titleText)}</span></h1>${subKey ? `<p class="page-sub">${T(subKey)}</p>` : ''}<div class="lightline"><i></i></div></header>`;
}
function notFound(v) { v.innerHTML = `<div class="page"><div class="glass empty"><h1 class="display page-title"><span class="grad">404</span></h1><p>${T('common.notFound')}</p><a class="pill pill-white" href="#/">${T('common.home')}</a></div></div>`; return { title: '404' }; }

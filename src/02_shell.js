/* ---------- shell: nav, sheet, footer ---------- */
const NAV = [['home', '#/', 'nav.home'], ['practice', '#/practice', 'nav.practice'], ['builder', '#/builder', 'nav.builder'], ['variants', '#/variants', 'nav.variants'], ['guide', '#/guide/format', 'nav.guide'], ['progress', '#/progress', 'nav.progress']];
const MEDIA = D.meta.media;
function stillImg(cls = '') { return `<img class="${cls}" src="${esc(MEDIA.still.local)}" data-remote="${esc(MEDIA.still.remote)}" alt="" width="${MEDIA.still.width}" height="${MEDIA.still.height}" decoding="async">`; }
function fixImgFallback(root) { $$('img[data-remote]', root).forEach(img => { const f = () => { if (img.src !== img.dataset.remote) img.src = img.dataset.remote; }; img.addEventListener('error', f, { once: true }); if (img.complete && img.naturalWidth === 0) f(); }); }
function shellHtml() {
  return `<a class="skip" href="#main" data-i18n="common.skip">${lang === 'ru' ? 'К содержанию' : 'Skip to content'}</a>
<header class="nav" id="nav">
  <div class="nav-row">
    <a class="brand" href="#/" aria-label="${esc(D.meta.brand)} – home">${brandHtml()}</a>
    <nav class="nav-links" aria-label="Main"><span class="nav-ind" aria-hidden="true"></span>${NAV.map(([k, h, l]) => `<a href="${h}" data-nav="${k}">${T(l)}</a>`).join('')}</nav>
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
<div class="sheet" id="sheet" hidden><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="sheet-top"><a class="brand" href="#/">${brandHtml()}</a><button class="icon-btn" id="sheetClose" data-i18n-label="nav.close" aria-label="${esc(t('nav.close'))}">${ic('x')}</button></div>
  ${NAV.map(([k, h, l]) => `<a class="sl" href="${h}" data-nav="${k}">${ic(k)}${T(l)}</a>`).join('')}
  <a class="sl" href="#/about" data-nav="about">${ic('about')}${T('nav.about')}</a>
  <a class="sl" href="#/people" data-nav="people">${ic('people')}<span data-i18n="people.title">${esc(t('people.title'))}</span></a>
  <div class="seg" role="group" aria-label="Language"><button data-lang="en" aria-pressed="${lang === 'en'}">EN</button><button data-lang="ru" aria-pressed="${lang === 'ru'}">RU</button></div>
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
  <nav aria-label="Footer"><a href="#/about">${T('nav.about')}</a><a href="#/guide/format">${T('nav.guide')}</a><a href="#/progress">${T('nav.progress')}</a></nav></div>
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
  const closeLm = () => { lm.hidden = true; lb.setAttribute('aria-expanded', 'false'); };
  lb.addEventListener('click', e => { e.stopPropagation(); const o = lm.hidden; lm.hidden = !o; lb.setAttribute('aria-expanded', String(o)); if (o) $('button[aria-checked=true]', lm).focus(); });
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
function calcHtml(id) {
  const opts = []; for (let b = 0; b <= 9; b += .5) opts.push(b.toFixed(1));
  const sel = (k, v) => `<label class="field">${T('skill.' + k)}<select class="inp" data-c="${k}">${opts.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  const ex = D.exam.rounding.examples;
  return `<div class="calc" id="${id}"><div class="grid g4">${sel('L', '6.5')}${sel('R', '6.5')}${sel('W', '5.0')}${sel('S', '7.0')}</div>
  <div class="calc-out"><div><div class="kicker">${T('calc.average')}</div><div class="big-num" data-avg style="font-size:40px">6.25</div></div><div><div class="kicker">${T('calc.overall')}</div><div class="big-num grad" data-ov>6.5</div></div></div>
  <p class="note">${T('calc.rule')}</p><div class="row" style="margin-top:10px">${ex.map((e, i) => `<button class="pill pill-glass pill-sm preset" data-preset="${i}">${e.L} · ${e.R} · ${e.W} · ${e.S}</button>`).join('')}</div></div>`;
}
function bindCalc(root) {
  const s = k => $(`[data-c="${k}"]`, root);
  const upd = () => { const v = ['L', 'R', 'W', 'S'].map(k => parseFloat(s(k).value)); const avg = v.reduce((a, b) => a + b) / 4; $('[data-avg]', root).textContent = String(+avg.toFixed(3)); $('[data-ov]', root).textContent = overall(v).toFixed(1); };
  $$('select', root).forEach(x => x.addEventListener('change', upd));
  $$('[data-preset]', root).forEach(b => b.addEventListener('click', () => { const e = D.exam.rounding.examples[+b.dataset.preset]; ['L', 'R', 'W', 'S'].forEach(k => s(k).value = e[k].toFixed(1)); upd(); }));
  upd();
}
function openCalc() { openDialog({ titleKey: 'calc.title', wide: true, body: calcHtml('calcDlg') + `<div class="lightline"><i></i></div><h3 style="margin-bottom:12px">${T('raw.title')}</h3>` + rawHtml('rawDlg'), onOpen: d => { bindCalc($('#calcDlg', d)); bindRaw($('#rawDlg', d)); } }); }
function rawHtml(id) {
  return `<div class="raw" id="${id}"><div class="seg" role="group" aria-label="Test"><button data-test="listening" aria-pressed="true">${T('skill.L')}</button><button data-test="readingAcademic" aria-pressed="false">${T('raw.academic')}</button><button data-test="readingGeneral" aria-pressed="false">${T('raw.general')}</button></div>
  <div class="grid g2" style="margin-top:16px;align-items:end"><label class="field">${T('raw.correct')}<input type="range" min="0" max="40" value="30" data-r></label><label class="field" style="max-width:120px">&nbsp;<input class="inp" type="number" min="0" max="40" value="30" data-n aria-label="${esc(t('raw.correct'))}"></label></div>
  <div class="calc-out"><div class="big-num grad" data-out>7</div><div class="muted" data-outtxt></div></div>
  <div class="tbl-wrap" style="margin-top:16px"><table class="tbl" style="min-width:0"><thead><tr><th>Correct answers</th>${ANCH.listening.map(a => `<th class="num">${a.raw}</th>`).join('')}</tr></thead><tbody data-at></tbody></table></div>
  <p class="note">${esc(ANCH.note)} <a href="${esc(ANCH.source)}" target="_blank" rel="noopener">ielts.org</a></p></div>`;
}
function bindRaw(root) {
  let test = 'listening';
  const r = $('[data-r]', root), n = $('[data-n]', root);
  const upd = () => {
    const v = Math.max(0, Math.min(40, parseInt(n.value || r.value, 10) || 0)); const e = estimateBand(v, test);
    $('[data-out]', root).textContent = e.below ? '<' + e.band : e.band; $('[data-outtxt]', root).textContent = `${v}/40 → ${bandText(e)}`;
    $('[data-at]', root).innerHTML = ['listening', 'readingAcademic', 'readingGeneral'].map(k => `<tr${k === test ? ' style="background:var(--glass-2)"' : ''}><td>${k === 'listening' ? T('skill.L') : k === 'readingAcademic' ? T('raw.academic') : T('raw.general')}</td>${ANCH[k].map(a => `<td class="num">${a.band}</td>`).join('')}</tr>`).join('');
  };
  r.addEventListener('input', () => { n.value = r.value; upd(); }); n.addEventListener('input', () => { r.value = n.value; upd(); });
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
  lastHash = location.hash; render();
});
addEventListener('beforeunload', e => { if (leaveGuard && leaveGuard()) { e.preventDefault(); e.returnValue = ''; } });
function setQuery(q) { const { path } = parseHash(); const s = q.toString(); const h = '#' + path + (s ? '?' + s : ''); history.replaceState(null, '', h); lastHash = h; }
function pageHead(labelHtml, titleKey, subKey, titleText) {
  return `<header class="page-head"><span class="glass-pill">${labelHtml}</span><h1 class="page-title display" tabindex="-1"><span class="grad" ${titleKey ? `data-i18n="${titleKey}"` : ''}>${titleKey ? esc(t(titleKey)) : esc(titleText)}</span></h1>${subKey ? `<p class="page-sub">${T(subKey)}</p>` : ''}<div class="lightline"><i></i></div></header>`;
}
function notFound(v) { v.innerHTML = `<div class="page"><div class="glass empty"><h1 class="display page-title"><span class="grad">404</span></h1><p>${T('common.notFound')}</p><a class="pill pill-white" href="#/">${T('common.home')}</a></div></div>`; return { title: '404' }; }

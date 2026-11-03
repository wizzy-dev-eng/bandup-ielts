/* ---------- settings sheet (gear) ---------- */
let setSheetEl = null;
function settingsBody() {
  const v = Settings.v, th = curTheme();
  const seg = (k, opts, cur) => `<div class="seg" role="group" aria-label="${esc(t('set.' + k))}">${opts.map(([val, html]) => `<button type="button" data-set="${k}" data-val="${val}" aria-pressed="${String(val) === String(cur)}">${html}</button>`).join('')}</div>`;
  const row = (k, icon, label, ctrl, hint = '') => `<div class="set-row" data-row="${k}"><div class="set-lbl"><span class="set-ic">${ic(icon)}</span><div><b>${T(label)}</b>${hint ? `<p>${T(hint)}</p>` : ''}</div></div><div class="set-ctrl">${ctrl}</div></div>`;
  return `${row('theme', 'palette', 'set.theme', seg('theme', [['dark', `${ic('moon')}${T('set.dark')}`], ['light', `${ic('sun')}${T('set.light')}`]], th))}
  ${row('eco', 'leaf', 'set.eco', `<button type="button" class="switch" role="switch" data-set="eco" aria-checked="${!!v.eco}" aria-label="${esc(t('set.eco'))}"><i></i></button>`, 'set.ecoHint')}
  ${row('fs', 'type', 'set.fs', seg('fs', [['s', '<span class="fs-s">A</span>'], ['m', '<span class="fs-m">A</span>'], ['l', '<span class="fs-l">A</span>'], ['xl', '<span class="fs-xl">A</span>']], v.fs))}
  ${row('fw', 'weight', 'set.fw', seg('fw', [['light', T('set.fwLight')], ['normal', T('set.fwNormal')], ['bold', T('set.fwBold')]], v.fw))}
  ${row('lang', 'globe', 'set.lang', seg('lang', [['en', 'English'], ['ru', 'Русский']], lang))}
  <p class="set-preview">${T('set.preview')}</p>`;
}
function openSettings(focusKey) {
  if (!setSheetEl) {
    setSheetEl = document.createElement('div'); setSheetEl.className = 'setsheet'; setSheetEl.hidden = true;
    setSheetEl.innerHTML = `<div class="setsheet-bg" data-sclose></div><section class="setsheet-panel" role="dialog" aria-modal="true" aria-labelledby="setTitle"><div class="grab" aria-hidden="true"></div>
      <header class="set-head"><h2 id="setTitle" class="display">${ic('gear', 'spin')}${T('set.title')}</h2><button class="icon-btn" type="button" data-sclose data-i18n-label="nav.close" aria-label="${esc(t('nav.close'))}">${ic('x')}</button></header>
      <div class="set-body" id="setBody"></div><footer class="set-foot"><button type="button" class="txt-btn" data-sreset>${ic('replay')}${T('set.reset')}</button></footer></section>`;
    document.body.appendChild(setSheetEl);
    setSheetEl.addEventListener('click', e => {
      if (e.target.closest('[data-sclose]')) return closeSettings();
      if (e.target.closest('[data-sreset]')) { Settings.reset(); refreshSettings(); toast(lang === 'ru' ? 'Настройки сброшены' : 'Settings reset'); return; }
      const b = e.target.closest('[data-set]'); if (!b) return;
      const k = b.dataset.set;
      if (k === 'eco') Settings.set('eco', !Settings.v.eco);
      else if (k === 'lang') setLang(b.dataset.val);
      else Settings.set(k, b.dataset.val);
      refreshSettings();
    });
    setSheetEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); closeSettings(); }
      if (e.key === 'Tab') { const f = $$('button,a,[tabindex="0"]', setSheetEl).filter(x => x.offsetParent); const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    on('lang', () => { if (!setSheetEl.hidden) refreshSettings(); });
  }
  $('#setBody', setSheetEl).innerHTML = settingsBody(); applyLang(setSheetEl);
  setSheetEl.hidden = false; document.body.classList.add('set-open'); $('#gearBtn') && $('#gearBtn').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => { setSheetEl.classList.add('open'); initSegs(setSheetEl); }));
  setTimeout(() => {
    const row = focusKey && $(`[data-row="${focusKey}"]`, setSheetEl);
    if (row) { row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1600); ($('[aria-pressed="true"],[role=switch]', row) || row).focus(); }
    else $('[data-sclose].icon-btn', setSheetEl).focus();
  }, 80);
}
function refreshSettings() {
  if (!setSheetEl) return; const v = Settings.v, th = curTheme();
  $$('[data-set]', setSheetEl).forEach(b => {
    const k = b.dataset.set;
    if (k === 'eco') b.setAttribute('aria-checked', String(!!v.eco));
    else b.setAttribute('aria-pressed', String(b.dataset.val === (k === 'theme' ? th : k === 'lang' ? lang : v[k])));
  });
}
function closeSettings() {
  if (!setSheetEl || setSheetEl.hidden) return;
  setSheetEl.classList.remove('open'); document.body.classList.remove('set-open');
  const g = $('#gearBtn'); if (g) { g.setAttribute('aria-expanded', 'false'); g.focus({ preventScroll: true }); }
  setTimeout(() => { if (!setSheetEl.classList.contains('open')) setSheetEl.hidden = true; }, fxOff() ? 0 : 420);
}
on('theme', refreshSettings);

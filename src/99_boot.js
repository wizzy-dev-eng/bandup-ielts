/* ---------- boot ---------- */
applySettings();
speech.init();
Globe.init();
initShell();
applyLang();
document.addEventListener('click', e => {
  const sk = e.target.closest('.skip'); if (sk) { e.preventDefault(); const m = $('#main'); m.setAttribute('tabindex', '-1'); m.focus(); return; }
});
on('lang', () => { if (!(leaveGuard && leaveGuard())) { const y = scrollY; render({ instant: true }).then(() => window.scrollTo(0, y)); } else { document.title = `${D.meta.brand} – ${curMeta && curMeta.title || ''}`; toast(lang === 'ru' ? 'Остальной текст переведётся после завершения задания' : 'The rest of the page will switch after you finish the task'); } });
window.lynx = window.BandUp = { version: D.meta.version, estimateBand, overall, encodeSet, decodeSet, dictItems, buildPrint, Progress, Sets };
render();
Auth.refresh();
on('auth', () => { if (curMeta && curMeta.auth) render({ instant: true }); });

/* ---------- boot ---------- */
speech.init();
initShell();
applyLang();
document.addEventListener('click', e => {
  const sk = e.target.closest('.skip'); if (sk) { e.preventDefault(); const m = $('#main'); m.setAttribute('tabindex', '-1'); m.focus(); return; }
});
on('lang', () => { if (curMeta && curMeta.relang) { const y = scrollY; render({ instant: true }).then(() => window.scrollTo(0, y)); } else document.title = `${D.meta.brand} – ${curMeta && curMeta.title || ''}`; });
window.BandUp = { version: D.meta.version, estimateBand, overall, encodeSet, decodeSet, dictItems, buildPrint, Progress, Sets };
render();

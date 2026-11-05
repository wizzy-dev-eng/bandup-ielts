/* ---------- tooltips: one fixed element, kept inside the screen ---------- */
const Tip = { el: null, cur: null, raf: 0 };
function tipPlace() {
  const t = Tip.cur, el = Tip.el; if (!t || !el || !document.contains(t)) return tipHide();
  const r = t.getBoundingClientRect(), W = innerWidth, H = innerHeight, m = 8;
  el.style.maxWidth = Math.min(320, W - m * 2) + 'px';
  const w = el.offsetWidth, h = el.offsetHeight;
  let x = r.left + r.width / 2 - w / 2; x = Math.max(m, Math.min(W - w - m, x));
  let y = r.bottom + 10, up = false; if (y + h > H - m && r.top - 10 - h > m) { y = r.top - 10 - h; up = true; }
  fixedPlace(el, Math.round(x), Math.round(y));
  el.style.setProperty('--ax', Math.round(Math.max(12, Math.min(w - 12, r.left + r.width / 2 - x))) + 'px');
  el.classList.toggle('up', up);
}
function tipShow(t) {
  const txt = t.dataset.tip; if (!txt) return tipHide();
  if (!Tip.el) { Tip.el = document.createElement('div'); Tip.el.className = 'tipx'; Tip.el.setAttribute('role', 'tooltip'); Tip.el.id = 'tipx'; }
  const host = t.closest('dialog[open]') || document.body; if (Tip.el.parentNode !== host) host.appendChild(Tip.el);
  Tip.cur = t; Tip.el.textContent = txt; Tip.el.classList.remove('on'); tipPlace();
  cancelAnimationFrame(Tip.raf); Tip.raf = requestAnimationFrame(() => Tip.el && Tip.el.classList.add('on'));
}
function tipHide() { Tip.cur = null; cancelAnimationFrame(Tip.raf); if (Tip.el) { Tip.el.classList.remove('on'); } }
document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const t = e.target.closest && e.target.closest('[data-tip]'); if (t === Tip.cur) return; t ? tipShow(t) : tipHide(); });
document.addEventListener('pointerout', e => { if (Tip.cur && (!e.relatedTarget || !Tip.cur.contains(e.relatedTarget))) { const n = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]'); n ? tipShow(n) : tipHide(); } });
document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t && t.matches(':focus-visible')) tipShow(t); });
document.addEventListener('focusout', () => tipHide());
document.addEventListener('pointerdown', () => tipHide(), true);
addEventListener('scroll', () => { if (Tip.cur) tipHide(); }, { passive: true, capture: true });
addEventListener('hashchange', tipHide);
document.addEventListener('keydown', e => { if (e.key === 'Escape') tipHide(); });

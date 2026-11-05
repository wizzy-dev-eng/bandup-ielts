/* ---------- masonry for card grids: two columns without holes, the last card of each column fills the rest ---------- */
function keepFocus() {
  const ae = document.activeElement, y = scrollY; if (!ae || ae === document.body) return () => { if (Math.abs(scrollY - y) > 2) scrollTo(0, y); };
  let s = null; try { s = [ae.selectionStart, ae.selectionEnd]; } catch (e) { }
  return () => { if (document.activeElement !== ae && document.contains(ae)) { ae.focus({ preventScroll: true }); try { if (s && s[0] != null) ae.setSelectionRange(s[0], s[1]); } catch (e) { } } if (Math.abs(scrollY - y) > 2) scrollTo(0, y); };
}
function msLayout(grid) {
  const cards = grid._ms; if (!cards) return;
  const two = innerWidth > 640, cols0 = $$(':scope > .ms-col', grid);
  if (!two) {
    if (!grid.classList.contains('ms-on')) return;
    const back = keepFocus(); cards.forEach(c => { c.classList.remove('ms-grow'); grid.appendChild(c); }); cols0.forEach(x => x.remove()); grid.classList.remove('ms-on'); back(); return;
  }
  cards.forEach(c => c.classList.remove('ms-grow'));
  const hs = cards.map(c => c.hidden ? 0 : c.offsetHeight), H = [0, 0], put = [[], []];
  cards.forEach((c, i) => { const k = c.hidden ? 0 : H[0] <= H[1] + 1 ? 0 : 1; put[k].push(c); if (!c.hidden) H[k] += hs[i] + 18; });
  let cols = cols0; if (cols.length !== 2) { cols = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'ms-col'; return d; }); }
  const same = cols0.length === 2 && put.every((arr, k) => arr.length === cols[k].children.length && arr.every((c, i) => cols[k].children[i] === c));
  if (!same) {
    const back = keepFocus();
    grid.classList.add('ms-on'); if (cols0.length !== 2) { cols0.forEach(x => x.remove()); grid.append(...cols); }
    put.forEach((arr, k) => arr.forEach(c => cols[k].appendChild(c)));
    back();
  }
  put.forEach(arr => { const last = arr.filter(c => !c.hidden).pop(); last && last.classList.add('ms-grow'); });
}
function msAttach(grid) {
  if (!grid || grid._ms) return () => { };
  grid._ms = [...grid.children].filter(c => !c.classList.contains('ms-col'));
  let raf = 0;
  const run = () => { raf = 0; if (!document.contains(grid)) return stop(); msLayout(grid); };
  const sched = () => { if (!raf) raf = requestAnimationFrame(run); };
  const ro = 'ResizeObserver' in window ? new ResizeObserver(sched) : null;
  ro && grid._ms.forEach(c => ro.observe(c));
  addEventListener('resize', sched, { passive: true });
  const stop = () => { ro && ro.disconnect(); removeEventListener('resize', sched); cancelAnimationFrame(raf); };
  onCleanup(stop);
  msLayout(grid);
  return sched;
}
/* ---------- textareas that grow with the text instead of a resize handle ---------- */
function taGrow(ta) {
  if (!ta || !ta.isConnected) return; const max = +(ta.dataset.max || 420);
  ta.style.height = 'auto'; const h = ta.scrollHeight + 2; ta.style.height = Math.min(h, max) + 'px'; ta.style.overflowY = h > max ? 'auto' : 'hidden';
}
document.addEventListener('input', e => { const t = e.target; if (t && t.matches && t.matches('textarea.ta-grow')) taGrow(t); });
document.addEventListener('focusin', e => { const t = e.target; if (t && t.matches && t.matches('textarea.ta-grow')) taGrow(t); });
new MutationObserver(ms => {
  let hit = false; for (const m of ms) { for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches('textarea.ta-grow') || n.querySelector('textarea.ta-grow'))) { hit = true; break; } if (hit) break; }
  if (hit) requestAnimationFrame(() => $$('textarea.ta-grow').forEach(taGrow));
}).observe(document.documentElement, { childList: true, subtree: true });

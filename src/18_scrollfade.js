/* ---------- scroll hint: fade the edge of horizontally scrollable rows (filters, tabs, tables) ---------- */
const SF_SEL = '.tabs, .tbl-wrap, .hm-scroll';
function sfUpdate(el) {
  const max = el.scrollWidth - el.clientWidth;
  el.classList.toggle('sf-on', max > 2); el.classList.toggle('sf-l', el.scrollLeft > 2); el.classList.toggle('sf-r', el.scrollLeft < max - 2);
}
const sfRO = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => sfUpdate(e.target))) : null;
function sfScan() {
  $$(SF_SEL).forEach(el => {
    if (el.dataset.sf) return sfUpdate(el);
    el.dataset.sf = '1'; el.addEventListener('scroll', () => sfUpdate(el), { passive: true });
    if (sfRO) sfRO.observe(el); sfUpdate(el);
  });
}
new MutationObserver(debounce(sfScan, 80)).observe(document.body, { childList: true, subtree: true });
addEventListener('resize', debounce(sfScan, 120));

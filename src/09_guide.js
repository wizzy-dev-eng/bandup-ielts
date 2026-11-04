/* ---------- exam guide ---------- */
const GUIDE_TABS = ['format', 'scoring', 'cefr', 'compare', 'difficulties', 'history'];
const DIFF_LINKS = [['#/practice', ic('puzzle')], ['#/drill/dictation', ic('type')], ['#/practice/C-L?mode=exam', ic('headphones')], ['#/variant/exam-c', ic('timer')], ['#/practice/B-W', ic('pen')], ['#/practice/C-R', ic('book')], ['#/variant/speaking-mock', ic('mic')], ['profile', ic('calendar')]];
const paras = arr => (Array.isArray(arr) ? arr : [arr]).filter(Boolean).map(x => `<p>${md(x)}</p>`).join('');
function dataTable(tb, sticky) { return `<div class="tbl-wrap"><table class="tbl${sticky ? ' sticky' : ''}">${tb.caption ? `<caption class="ch-h" style="padding:16px 18px 6px">${esc(tb.caption)}</caption>` : ''}<thead><tr>${tb.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${tb.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${md(c)}</td>` : `<th scope="row">${md(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>${tb.note ? `<p class="note">${md(tb.note)}</p>` : ''}`; }
function guidePanel(id) {
  const E = D.exam, ru = lang === 'ru';
  if (id === 'format') return `<div class="prose">${paras(E.about)}${paras(E.versions)}${paras(E.timing)}</div>${dataTable(E.format)}
    <div class="grid g2" style="margin-top:22px">${E.sections.map(s => `<article class="glass card skill-card"><div class="em" aria-hidden="true">${SKILL[s.skill].icon}</div><h3>${esc(s.title)}</h3><p>${md(s.text)}</p><p style="margin-top:12px"><a class="txt-btn" href="#/practice?skill=${s.skill}">${esc(ru ? 'Тренироваться' : 'Practise')} →</a></p></article>`).join('')}</div>
    <div class="prose" style="margin-top:18px">${paras(E.formatSummary)}</div>`;
  if (id === 'scoring') return `<div class="prose">${paras(E.scoringText)}</div>
    <div class="grid g2" style="margin-top:18px;align-items:start"><div class="ladder" aria-label="${esc(tr('Band scale', 'Шкала баллов'))}">${E.bands.map(b => `<div class="${b.band < 4 ? 'lo' : ''} lv-${b.band >= 7 ? 'C' : b.band >= 4 ? 'B' : 'A'}"><b>${b.band}</b><span>${esc(b.label)}</span></div>`).join('')}</div>
    <div class="stack"><div class="glass panel"><h3 class="grp-title">${ic('pen')} ${T('skill.W')}</h3><ul class="dash">${E.criteria.writing.map(x => `<li>${md(x)}</li>`).join('')}</ul></div><div class="glass panel"><h3 class="grp-title">${ic('mic')} ${T('skill.S')}</h3><ul class="dash">${E.criteria.speaking.map(x => `<li>${md(x)}</li>`).join('')}</ul></div><p class="note">${md(E.criteria.note)}</p></div></div>
    <section class="glass panel" style="margin-top:22px"><h3 class="grp-title">${ic('calc')} ${T('calc.title')}</h3><p class="instr">${md(E.rounding.rule)}</p>${calcHtml('gcalc')}</section>
    <section class="glass panel" style="margin-top:18px"><h3 class="grp-title">${T('raw.title')}</h3>${rawHtml('graw')}</section>`;
  if (id === 'cefr') {
    let cat = '';
    const segs = E.cefr.rows.map(r => { if (r[0]) cat = r[0][0]; return `<div class="lv-${cat}"><b>${esc(r[1])}</b>${esc(r[2])}</div>`; }).join('');
    return `<div class="prose">${paras(E.cefr.text)}</div><div class="cefr-bar" role="img" aria-label="${esc(tr('CEFR and IELTS bands', 'Уровни CEFR и баллы IELTS'))}">${segs}</div>${dataTable(E.cefr)}`;
  }
  if (id === 'compare') return `<div class="prose">${paras(E.compare.text)}</div>${dataTable(E.compare, true)}`;
  if (id === 'difficulties') return `<div class="prose">${paras(E.difficulties.intro)}</div>
    <div class="grid g2" style="margin-top:18px">${E.difficulties.items.map((d, i) => { const [href, em] = DIFF_LINKS[i] || ['#/practice', '•']; const label = esc(ru ? 'Потренировать' : 'Practise this'); return `<article class="glass card diff-card"><div class="em" aria-hidden="true">${em}</div><h3>${esc(d.title)}</h3><p>${md(d.text)}</p>${href === 'profile' ? `<button type="button" class="txt-btn" data-open-profile style="align-self:flex-start">${esc(ru ? 'Указать дату экзамена' : 'Set your exam date')} →</button>` : `<a class="txt-btn" href="${href}" style="align-self:flex-start">${label} →</a>`}</article>`; }).join('')}</div>
    <div class="prose" style="margin-top:18px">${paras(E.difficulties.summary)}</div>`;
  if (id === 'history') return `<div class="prose">${paras(E.history.intro)}</div><div class="timeline">${E.history.timeline.map(x => `<div class="tli"><div class="glass card"><div class="yr grad">${esc(x.year)}</div><p>${md(x.text)}</p></div></div>`).join('')}</div>`;
  return '';
}
route(/^\/guide(?:\/(\w+))?$/, (v, [tab]) => {
  let cur = GUIDE_TABS.includes(tab) ? tab : 'format';
  v.innerHTML = `<div class="page">${pageHead(`${ic('guide')} IELTS`, 'guide.title', null)}
    <div class="tabbar">${tabsHtml('gt', GUIDE_TABS.map(id => ({ id, html: T('guide.' + id) })), cur, 'Guide sections')}</div>
    <div id="gt-panel" role="tabpanel" data-gp></div>
    <details class="disc" style="margin-top:32px"><summary>${ic('library')} ${T('guide.sources')}</summary><div class="dc"><ol class="dash">${D.exam.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span class="faint">${esc(s.url.replace(/^https?:\/\//, ''))}</span></li>`).join('')}</ol></div></details></div>`;
  const panel = $('[data-gp]', v);
  const show = id => {
    cur = id; panel.setAttribute('aria-labelledby', 'gt-t-' + id); panel.innerHTML = guidePanel(id);
    if (id === 'scoring') { bindCalc($('#gcalc', panel)); bindRaw($('#graw', panel)); }
    const pb = $('[data-open-profile]', panel); if (pb) pb.addEventListener('click', openProfile);
    const h = '#/guide/' + id; if (location.hash !== h) { history.replaceState(null, '', h); lastHash = h; }
  };
  bindTabs($('[data-tabs=gt]', v), show);
  show(cur);
  return { title: t('guide.title'), nav: 'guide', relang: true };
});

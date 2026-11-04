/* ---------- progress ---------- */
function entryName(e) {
  if (e.kind === 'variant') { const x = D.variants.find(y => y.id === e.variantId); return `${ic('compass')} ${esc(x ? x.title : (e.extra && e.extra.title) || (lang === 'ru' ? 'Набор' : 'Set'))}`; }
  if (TASK[e.taskId]) { const tk = TASK[e.taskId]; return `${SKILL[tk.skill].icon} ${esc(tk.code + ' ' + tk.title)}`; }
  if (e.taskId === 'drill:tfng') return `${ic('book')} ${t('drill.tfng')}`;
  if (e.taskId === 'drill:dictation') return `${ic('type')} ${t('drill.dictation')}`;
  if (e.taskId === 'drill:quiz') return `${ic('bulb')} ${t('quiz.title')}`;
  if (/^bank:/.test(e.taskId || '')) return `${ic('pen')} ${t('skill.W')} · ${e.taskId.slice(5)}`;
  if (/^sp:/.test(e.taskId || '')) return `${ic('mic')} ${t('skill.S')} · ${e.taskId.slice(3)}`;
  return esc(e.taskId || '—');
}
const entryScore = e => e.kind === 'W' ? `${Object.values((e.extra && e.extra.words) || {}).join(' + ')} ${t('writing.words')}` : e.kind === 'S' ? `${t('writing.checklist')} ${e.score}/${e.total}` : e.kind === 'variant' ? (e.extra && e.extra.level ? `${t('variants.yourLevel')}: ${e.extra.level}` : e.total ? `${e.score}/${e.total}` : '\u2713') : `${e.score}/${e.total}${e.extra && e.extra.estimate != null ? ` · ≈ ${e.extra.below ? '<' : ''}${e.extra.estimate}` : ''}`;
/* per-skill band estimate: C-level tasks use the official conversion; A and B tasks are capped because they are easier than the exam */
const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
function skillEstimate(all, sk) {
  const es = all.filter(e => e.kind === 'LR' && TASK[e.taskId] && TASK[e.taskId].skill === sk && e.total);
  if (!es.length) return null;
  const test = sk === 'L' ? 'listening' : 'readingAcademic', cap = { A: 5, B: 6.5, C: 9 };
  const bands = es.slice(-3).map(e => { const lv = TASK[e.taskId].level, raw = Math.round((e.percent || 0) / 100 * 40); const b = e.extra && e.extra.estimate != null && !e.extra.below ? e.extra.estimate : estimateBand(raw, test).below ? 3.5 : estimateBand(raw, test).band; return Math.min(b, cap[lv] || 9); });
  return { band: Math.round(bands.reduce((a, b) => a + b, 0) / bands.length * 2) / 2, n: es.length, best: Math.max(...es.map(e => e.percent || 0)), trend: es.slice(-8).map(e => e.percent || 0) };
}
function streakOf(days) {
  const has = k => days.has(k); let cur = 0; const d = new Date();
  if (!has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (has(dayKey(d))) { cur++; d.setDate(d.getDate() - 1); }
  const sorted = [...days].sort(); let best = 0, run = 0, prev = null;
  sorted.forEach(k => { const t = new Date(k + 'T12:00:00'); run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; });
  return { cur, best, today: has(dayKey(new Date())) };
}
function heatHtml(all, weeks) {
  const cnt = {}; all.forEach(e => { const k = dayKey(e.date); cnt[k] = (cnt[k] || 0) + 1; });
  const end = new Date(); end.setHours(12, 0, 0, 0); const start = new Date(end);
  start.setDate(start.getDate() - (weeks - 1) * 7); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const cells = [], months = []; let lastM = -1, col = 0;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d), n = cnt[k] || 0, wd = (d.getDay() + 6) % 7;
    if (wd === 0) { if (d.getMonth() !== lastM) { months.push([col, d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { month: 'short' })]); lastM = d.getMonth(); } col++; }
    cells.push(`<i class="hm-c l${n === 0 ? 0 : n < 2 ? 1 : n < 4 ? 2 : n < 6 ? 3 : 4}" style="grid-row:${wd + 1}" title="${esc(fmtDate(k + 'T12:00:00', true))}: ${n}"></i>`);
  }
  const wl = lang === 'ru' ? ['Пн', '', 'Ср', '', 'Пт', '', ''] : ['Mon', '', 'Wed', '', 'Fri', '', ''];
  return `<div class="hm" style="--cols:${col}"><div class="hm-m">${months.map(([c, m]) => `<span style="grid-column:${c + 1}">${esc(m)}</span>`).join('')}</div><div class="hm-w">${wl.map(x => `<span>${x}</span>`).join('')}</div><div class="hm-g" role="img" aria-label="${esc(tr('Activity by day', 'Активность по дням'))}">${cells.join('')}</div></div>
  <div class="hm-leg"><span>${esc(tr('Less', 'Меньше'))}</span>${[0, 1, 2, 3, 4].map(l => `<i class="hm-c l${l}"></i>`).join('')}<span>${esc(tr('More', 'Больше'))}</span></div>`;
}
function nextSteps(all, prof, est) {
  const out = [], done = id => all.some(e => e.taskId === id), best = id => { const b = Progress.best(id); return b ? b.percent || 0 : null; };
  const lv = /^[ABC]$/.test(prof.level || '') ? prof.level : null;
  if (!all.length) out.push({ icon: 'compass', href: '#/variant/diagnostic', t: tr('Find your level', 'Узнай свой уровень'), d: tr('A short diagnostic test shows where to start.', 'Короткий диагностический тест покажет, с чего начать.'), main: true });
  const base = lv || 'A';
  const nextLv = { A: 'B', B: 'C', C: 'C' };
  const cand = ['L', 'R', 'W', 'S'].map(sk => {
    const id = base + '-' + sk, b = best(id);
    if (!done(id)) return { sk, id, w: 0 };
    if (b != null && b >= 80 && base !== 'C' && !done(nextLv[base] + '-' + sk)) return { sk, id: nextLv[base] + '-' + sk, w: 1, up: true };
    return { sk, id, w: 2 + (b == null ? 0 : b / 100) + ((est[sk] && est[sk].n) || 0) * .05 };
  }).sort((a, b) => a.w - b.w);
  cand.slice(0, all.length ? 2 : 1).forEach((c, i) => { const tk = TASK[c.id]; if (!tk) return; out.push({ icon: SK_IC[c.sk], href: '#/practice/' + c.id, t: `${tk.code} · ${tk.title}`, d: c.w === 0 ? tr('You have not tried this one yet.', 'Ты ещё не пробовал это задание.') : c.up ? tr('You did well on the previous level – try the next one.', 'Предыдущий уровень даётся хорошо – попробуй следующий.') : tr('Your weakest skill right now – one more try.', 'Сейчас это самый слабый навык – ещё одна попытка.'), main: !out.length && i === 0 }); });
  out.push({ icon: 'bolt', href: '#/drill/tfng', t: t('drill.tfng'), d: tr('Five minutes to keep the streak going.', 'Пять минут, чтобы не прерывать серию.') });
  return out.slice(0, 3);
}
route(/^\/progress$/, v => {
  const ru = lang === 'ru', all = Progress.all(), prof = Profile.get();
  const work = all.filter(e => e.kind !== 'variant');
  const tasksDone = new Set(all.filter(e => TASK[e.taskId]).map(e => e.taskId)).size;
  const dl = daysLeft();
  const totalSec = work.reduce((a, e) => a + (e.seconds || 0), 0);
  const weekAgo = Date.now() - 7 * 864e5, weekSec = work.filter(e => new Date(e.date) > weekAgo).reduce((a, e) => a + (e.seconds || 0), 0);
  const days = new Set(all.map(e => dayKey(e.date))), st = streakOf(days);
  const est = { L: skillEstimate(all, 'L'), R: skillEstimate(all, 'R') };
  const ws = sk => { const es = all.filter(e => e.kind === sk); return es.length ? { n: es.length, last: es[es.length - 1], best: Math.max(...es.map(e => e.percent || 0)) } : null; };
  const W = ws('W'), S = ws('S');
  const lrBands = ['L', 'R'].map(k => est[k] && est[k].band).filter(x => x != null);
  const hm = d => { const h = Math.floor(d / 3600), m = Math.round((d % 3600) / 60); return h ? `${h} ${tr('h', 'ч')} ${m} ${tr('min', 'мин')}` : `${m} ${tr('min', 'мин')}`; };
  const tiles = [
    ['chart', String(work.length), t('progress.attempts')],
    ['practice', `${tasksDone} / 12`, tr('collection tasks done', 'заданий сборника выполнено')],
    ['fire', String(st.cur), tr(`day streak · best ${st.best}`, `дн. подряд · рекорд ${st.best}`)],
    ['clock', hm(totalSec), tr(`total time · ${hm(weekSec)} this week`, `всего · ${hm(weekSec)} за неделю`)]
  ];
  const skillCard = (sk, i) => {
    const e = est[sk], x = sk === 'W' ? W : sk === 'S' ? S : null;
    const band = e ? e.band : null, lvlc = band == null ? 'x' : band < 5 ? 'A' : band < 6.5 ? 'B' : 'C';
    const spark = e && e.trend.length > 1 ? `<span class="sk-spark" aria-hidden="true">${e.trend.map((p, j) => `<i style="--h:${Math.max(6, p)}%;--j:${j}"></i>`).join('')}</span>` : '';
    const big = band != null ? band.toFixed(1) : x ? `${x.n}×` : '—';
    const sub = band != null ? `${cefrOf(band)} · ${tr('best', 'лучший')} ${e.best}%` : x ? (sk === 'W' ? `${Object.values((x.last.extra && x.last.extra.words) || {}).join(' + ') || 0} ${t('writing.words')}` : `${t('writing.checklist')} ${x.last.score}/${x.last.total}`) : tr('no attempts yet', 'попыток пока нет');
    return `<article class="glass sk-card lv-${lvlc}" style="--i:${i}"><div class="sk-h"><span class="em">${SKILL[sk].icon}</span><b>${T('skill.' + sk)}</b>${band != null ? `<span class="lp lv-${lvlc}"><i></i>≈ ${esc(tr('band', 'балл'))}</span>` : x ? `<span class="lp">${esc(tr('self-check', 'самопроверка'))}</span>` : ''}</div>
      <div class="sk-k display">${esc(big)}</div><div class="sk-s">${esc(sub)}</div>${spark}</article>`;
  };
  const bars = D.tasks.map((tk, i) => {
    const es = all.filter(e => e.taskId === tk.id && e.kind !== 'variant');
    const best = es.length ? Math.max(...es.map(e => e.percent || 0)) : 0;
    return `<div class="bar-col lv-${tk.level}" style="--i:${i}" title="${esc(tk.code + ' · ' + (es.length ? `${t('progress.best')} ${best}% · ${es.length}×` : tr('not tried', 'не пробовал')))}"><div class="bar-track"><div class="bar-fill" style="height:${best}%"></div>${es.length ? `<b class="bar-v">${best}</b>` : ''}</div><span>${esc(tk.code)} ${SKILL[tk.skill].icon}</span></div>`;
  }).join('');
  const recent = all.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-20).reverse();
  const steps = nextSteps(all, prof, est);
  const empty = !all.length;
  v.innerHTML = `<div class="page prog-page">${pageHead(`${ic('progress')} ${T('nav.progress')}`, 'progress.title', Auth.user ? 'progress.subSync' : 'progress.sub')}
   <div class="grid g4 prog-tiles">${tiles.map(([i, k, l], n) => `<div class="glass stat pstat" style="--i:${n}"><span class="em">${ic(i)}</span><div><div class="k">${esc(k)}</div><div class="v">${esc(l)}</div></div></div>`).join('')}</div>
   <p class="muted prog-meta">${[prof.level ? `${T('variants.yourLevel')}: <a class="lp lv-${prof.level}" href="#/practice?level=${prof.level}"><i></i>${esc(t('level.' + prof.level))}</a>` : '', prof.target ? `${T('profile.target')}: <strong>${esc(prof.target)}</strong>` : '', dl != null && dl >= 0 ? `${esc(tr('days to the exam', 'дней до экзамена'))}: <strong>${dl}</strong>` : '', lrBands.length ? `${esc(tr('L + R estimate', 'Оценка L + R'))}: <strong>≈ ${(Math.round(lrBands.reduce((a, b) => a + b, 0) / lrBands.length * 2) / 2).toFixed(1)}</strong>` : ''].filter(Boolean).join(' · ')}</p>
   <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad">${esc(tr('What to do next', 'Что делать дальше'))}</span></h2></div>
    <div class="next-grid">${steps.map((s, i) => `<a class="glass card next-card${s.main ? ' main' : ''}" href="${s.href}" style="--i:${i}"><span class="em">${ic(s.icon)}</span><span class="nx-t"><b>${esc(s.t)}</b><small>${esc(s.d)}</small></span>${ic('arrow', 'nx-go')}</a>`).join('')}</div></section>
   <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad">${esc(tr('Skills', 'Навыки'))}</span></h2><p class="muted">${esc(tr('Listening and Reading: a rough band from your last three attempts (A and B tasks are easier than the exam, so their estimate is capped). Writing and Speaking are checked by yourself.', 'Listening и Reading: примерный балл по трём последним попыткам (задания A и B легче экзамена, поэтому их оценка ограничена). Writing и Speaking ты проверяешь сам.'))}</p></div>
    <div class="sk-grid">${['L', 'R', 'W', 'S'].map(skillCard).join('')}</div></section>
   <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad">${esc(tr('Activity', 'Активность'))}</span></h2><p class="muted">${esc(st.today ? tr('You have practised today – nice.', 'Сегодня ты уже занимался – отлично.') : st.cur ? tr('Practise today to keep the streak.', 'Позанимайся сегодня, чтобы не прервать серию.') : tr('Each day with at least one task is a square.', 'Каждый день хотя бы с одним заданием – это квадрат.'))}</p></div>
    <div class="glass panel hm-wrap"><div class="hm-scroll">${heatHtml(all, 18)}</div></div></section>
   <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad">${esc(tr('Best result per task', 'Лучший результат по заданиям'))}</span></h2><p class="muted">${esc(tr('Bar height is the best percentage. For Writing and Speaking it shows the word minimum met / self-check.', 'Высота столбика – лучший процент. Для Writing и Speaking – выполнение минимума слов / самопроверка.'))}</p></div>
    <div class="glass"><div class="bars${empty ? ' is-empty' : ''}" role="img" aria-label="${esc(tr('Chart of results for the 12 tasks', 'Диаграмма результатов по 12 заданиям'))}">${bars}</div></div></section>
   <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad">${esc(tr('Recent attempts', 'Последние попытки'))}</span></h2></div>
    ${recent.length ? `<div class="tbl-wrap"><table class="tbl pg-tbl"><thead><tr><th scope="col">${esc(tr('Date', 'Дата'))}</th><th scope="col">${esc(tr('Task', 'Задание'))}</th><th scope="col" class="c-mode">${esc(tr('Mode', 'Режим'))}</th><th scope="col">${T('task.score')}</th><th scope="col" class="num">${esc(tr('Time', 'Время'))}</th></tr></thead><tbody>${recent.map(e => `<tr><td>${esc(new Date(e.date).toLocaleString(ru ? 'ru-RU' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td><td class="en">${entryName(e)}</td><td class="c-mode">${e.mode === 'exam' ? T('task.exam') : T('task.practice')}</td><td>${esc(entryScore(e)).replace('\u2713', `<span class="res-st ok">${ic('check')}</span>`)}</td><td class="num">${e.seconds ? fmt(e.seconds) : '—'}</td></tr>`).join('')}</tbody></table></div>` : `<div class="glass empty"><div class="em em-lg">${ic('chart')}</div><p>${T('progress.empty')}</p><a class="pill pill-white" href="#/variant/diagnostic">${ic('compass')} ${esc(tr('Start with the diagnostic', 'Начать с диагностики'))}</a></div>`}</section>
   <div class="check-bar"><button type="button" class="pill pill-outline" data-exp>${ic('download')} ${T('progress.export')}</button><label class="pill pill-outline" style="cursor:pointer">${ic('upload')} ${esc(tr('Import JSON', 'Импорт JSON'))}<input type="file" accept="application/json,.json" data-imp class="sr-only"></label>${empty ? '' : `<button type="button" class="pill pill-glass" data-reset>${ic('trash')} ${T('progress.reset')}</button>`}<button type="button" class="pill pill-glass" data-open-profile>${ic('user')} ${T('profile.title')}</button></div></div>`;
  const hs = $('.hm-scroll', v); if (hs) requestAnimationFrame(() => { hs.scrollLeft = hs.scrollWidth; });
  $('[data-exp]', v).addEventListener('click', () => {
    const data = { app: D.meta.brand, version: D.meta.version, exported: new Date().toISOString(), progress: Progress.all(), profile: Profile.get(), sets: Sets.all(), drafts: Drafts.all() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `lynx-progress-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('[data-imp]', v).addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const o = JSON.parse(await f.text()); if (!o || !Array.isArray(o.progress)) throw new Error('format');
      if (!(await confirmDlg(ru ? 'Заменить текущий прогресс данными из файла?' : 'Replace your current progress with the data from the file?'))) return;
      store.set(SK.progress, o.progress.filter(x => x && typeof x === 'object' && x.kind)); if (o.profile && typeof o.profile === 'object') Profile.set(o.profile); if (Array.isArray(o.sets)) store.set(SK.sets, o.sets); if (o.drafts && typeof o.drafts === 'object') store.set(SK.drafts, o.drafts);
      toast(ru ? 'Данные импортированы' : 'Data imported'); render();
    } catch (err) { toast(ru ? 'Не удалось прочитать файл' : 'Could not read the file'); }
  });
  const rs = $('[data-reset]', v); if (rs) rs.addEventListener('click', async () => { if (await confirmDlg(t('progress.confirm'))) { Progress.clear(); toast(ru ? 'Прогресс удалён' : 'Progress deleted'); render(); } });
  $('[data-open-profile]', v).addEventListener('click', openProfile);
  const offP = on('profile', () => { if (!$('dialog[open]')) render(); }); onCleanup(offP);
  return { title: t('progress.title'), nav: 'progress', relang: true, auth: true };
});

/* ---------- about ---------- */
route(/^\/about$/, v => {
  const p = D.meta.project, C = D.collection, ru = lang === 'ru';
  v.innerHTML = `<div class="page">${pageHead(`${ic('about')} ${esc(p.city)} · ${p.year}`, 'about.title', null)}
   <section class="glass panel" style="padding:30px"><div class="kicker">${esc(ru ? 'Исследовательский проект' : 'Research project')}</div><h2 class="display" style="font-size:clamp(24px,3vw,34px);font-weight:300;margin:10px 0 16px;line-height:1.2">${esc(p.title)}</h2>
    <div class="grid g3" style="margin-top:6px"><div><div class="kicker">${esc(ru ? 'Автор' : 'Author')}</div><p style="margin:6px 0 0">${esc(p.author)}, ${esc(p.grade)}</p></div><div><div class="kicker">${esc(ru ? 'Руководитель' : 'Supervisor')}</div><p style="margin:6px 0 0">${esc(p.supervisor)}</p></div><div><div class="kicker">${esc(ru ? 'Школа' : 'School')}</div><p style="margin:6px 0 0">${esc(p.school)}</p></div></div></section>
   <div class="grid g2" style="margin-top:18px;align-items:start"><section class="glass panel prose"><h3 class="grp-title">${ic('target')} ${esc(ru ? 'Цель' : 'Aim')}</h3><p>${md(p.aim)}</p><h3 class="grp-title" style="margin-top:16px">${ic('flask')} ${esc(ru ? 'Методы' : 'Methods')}</h3><p>${md(p.methods)}</p></section>
    <section class="glass panel"><h3 class="grp-title">${ic('clipboard')} ${esc(ru ? 'Задачи' : 'Objectives')}</h3><ol class="dash">${p.objectives.map(x => `<li>${md(x)}</li>`).join('')}</ol></section></div>
   <section class="glass panel prose" style="margin-top:18px"><p>${md(p.significance)}</p><p>${md(p.product)}</p></section>
   <section class="sec"><div class="sec-head"><span class="glass-pill">A · B · C</span><h2 class="sec-title display"><span class="grad">${esc(ru ? 'Структура сборника' : 'Structure of the collection')}</span></h2><p class="muted">${md(C.intro)}</p></div>
    ${dataTable({ head: C.structure.head, rows: C.structure.rows })}
    <div class="glass panel" style="margin-top:18px"><h3 class="grp-title">${ic('chart')} ${esc(ru ? 'Как оценивать результат' : 'How to read your score')}</h3><ul class="dash">${C.scoreGuide.map(x => `<li>${md(x)}</li>`).join('')}</ul></div></section>
   <details class="disc"><summary>${ic('library')} ${T('guide.sources')}</summary><div class="dc"><ol class="dash">${D.exam.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ol></div></details></div>`;
  return { title: t('about.title'), nav: 'about', relang: true };
});

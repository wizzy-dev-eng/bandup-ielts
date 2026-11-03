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
route(/^\/progress$/, v => {
  const ru = lang === 'ru', all = Progress.all(), prof = Profile.get();
  const tasksDone = new Set(all.filter(e => TASK[e.taskId]).map(e => e.taskId)).size;
  const lr = all.filter(e => e.kind === 'LR');
  const avg = lr.length ? Math.round(lr.reduce((a, e) => a + (e.percent || 0), 0) / lr.length) : null;
  const dl = daysLeft();
  const totalSec = all.filter(e => e.kind !== 'variant').reduce((a, e) => a + (e.seconds || 0), 0);
  const tiles = [
    [String(all.filter(e => e.kind !== 'variant').length), t('progress.attempts')],
    [`${tasksDone} / 12`, ru ? 'заданий сборника выполнено' : 'collection tasks done'],
    [avg == null ? '—' : avg + '%', ru ? 'средний результат L + R' : 'average L + R score'],
    [dl == null ? (prof.target ? String(prof.target) : '—') : dl < 0 ? '—' : String(dl), dl == null ? (prof.target ? t('profile.target') : (ru ? 'дата экзамена не указана' : 'no exam date yet')) : (ru ? 'дней до экзамена' : 'days to the exam')]
  ];
  const bars = D.tasks.map(tk => {
    const es = all.filter(e => e.taskId === tk.id && e.kind !== 'variant');
    const best = es.length ? Math.max(...es.map(e => e.percent || 0)) : 0, last = es.length ? es[es.length - 1].percent || 0 : null;
    return `<div class="bar-col lv-${tk.level}" title="${esc(tk.code + ' ' + tk.title)}${es.length ? ` – ${t('progress.best')} ${best}%` : ''}"><div class="bar-track"><div class="bar-fill" style="height:${best}%"></div>${last != null ? `<div class="bar-last" style="bottom:${last}%"></div>` : ''}</div><span>${esc(tk.code)} ${SKILL[tk.skill].icon}</span></div>`;
  }).join('');
  const recent = all.slice(-20).reverse();
  v.innerHTML = `<div class="page">${pageHead(`${ic('progress')} ${T('nav.progress')}`, 'progress.title', Auth.user ? 'progress.subSync' : 'progress.sub')}
   <div class="grid g4">${tiles.map(([k, l]) => `<div class="glass stat"><div class="k grad">${esc(k)}</div><div class="v">${esc(l)}</div></div>`).join('')}</div>
   ${prof.level ? `<p class="muted" style="margin-top:14px">${T('variants.yourLevel')}: <a class="lp lv-${prof.level}" href="#/practice?level=${prof.level}"><i></i>${esc(t('level.' + prof.level))}</a>${prof.target ? ` · ${T('profile.target')}: <strong>${esc(prof.target)}</strong>` : ''} · ${esc(ru ? 'всего времени' : 'total time')}: ${fmt(totalSec)}</p>` : ''}
   <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad">${esc(ru ? 'Лучший результат по заданиям' : 'Best result per task')}</span></h2><p class="muted">${esc(ru ? 'Столбик – лучший процент, тонкая линия – последняя попытка. Для Writing и Speaking – выполнение минимума слов / самопроверка.' : 'The bar shows the best percentage, the thin line the last attempt. For Writing and Speaking it shows word minimum met / self-check.')}</p></div>
    <div class="glass"><div class="bars" role="img" aria-label="${esc(ru ? 'Диаграмма результатов по 12 заданиям' : 'Chart of results for the 12 tasks')}">${bars}</div></div></section>
   <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad">${esc(ru ? 'Последние попытки' : 'Recent attempts')}</span></h2></div>
    ${recent.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">${esc(ru ? 'Дата' : 'Date')}</th><th scope="col">${esc(ru ? 'Задание' : 'Task')}</th><th scope="col">${esc(ru ? 'Режим' : 'Mode')}</th><th scope="col">${T('task.score')}</th><th scope="col" class="num">${esc(ru ? 'Время' : 'Time')}</th></tr></thead><tbody>${recent.map(e => `<tr><td>${esc(new Date(e.date).toLocaleString(ru ? 'ru-RU' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td><td class="en">${entryName(e)}</td><td>${e.mode === 'exam' ? T('task.exam') : T('task.practice')}</td><td>${esc(entryScore(e)).replace('\u2713', `<span class="res-st ok">${ic('check')}</span>`)}</td><td class="num">${fmt(e.seconds || 0)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="glass empty"><p>${T('progress.empty')}</p><a class="pill pill-white" href="#/practice">${T('nav.practice')} ${ic('arrow')}</a></div>`}</section>
   <div class="check-bar"><button type="button" class="pill pill-outline" data-exp>${ic('download')} ${T('progress.export')}</button><label class="pill pill-outline" style="cursor:pointer">${ic('upload')} ${esc(ru ? 'Импорт JSON' : 'Import JSON')}<input type="file" accept="application/json,.json" data-imp class="sr-only"></label><button type="button" class="pill pill-glass" data-reset>${ic('trash')} ${T('progress.reset')}</button><button type="button" class="pill pill-glass" data-open-profile>${ic('user')} ${T('profile.title')}</button></div></div>`;
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
  $('[data-reset]', v).addEventListener('click', async () => { if (await confirmDlg(t('progress.confirm'))) { Progress.clear(); toast(ru ? 'Прогресс удалён' : 'Progress deleted'); render(); } });
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
   <p class="note">${md(D.meta.note)}</p>
   <details class="disc"><summary>${ic('library')} ${T('guide.sources')}</summary><div class="dc"><ol class="dash">${D.exam.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ol></div></details></div>`;
  return { title: t('about.title'), nav: 'about', relang: true };
});

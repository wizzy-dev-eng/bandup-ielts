/* ---------- runner: variants & sets ---------- */
function itemPlayer(it, mode) {
  const o = { mode, embedded: true, save: false };
  if (it.t === 'task') return makeTaskPlayer(TASK[it.id], o);
  if (it.t === 'w1' || it.t === 'w2') return writingPlayer(wTaskFrom(it), o);
  if (it.t === 'sp') return speakingPlayer(spTaskFrom(it), o);
  if (it.t === 'tfng') return tfngPlayer(it.ids, { list: true, save: false, embedded: true });
  return dictPlayer({ kinds: it.kinds, n: it.n, seed: it.seed }, { save: false, embedded: true });
}
const lvLabel = l => LEVEL[l] ? t('level.' + l) : l === 'mixed' ? (lang === 'ru' ? 'Смешанный' : 'Mixed') : l;
function runSet(v, cfg) {
  const ru = lang === 'ru', exam = cfg.mode === 'exam', items = cfg.items, infos = items.map(itemInfo), rule = cfg.rule;
  const players = new Array(items.length).fill(null);
  let cur = 0, finished = false, stoppedAt = null, recLevel = null;
  v.innerHTML = `<div class="page runner"><div class="task-head"><div class="left"><a class="back" href="${cfg.back}">${ic('back')} ${esc(cfg.backLabel)}</a>
    <div class="row"><span class="lp lv-${LEVEL[cfg.level] ? cfg.level : 'x'}"><i></i>${esc(lvLabel(cfg.level || 'mixed'))}</span><span class="lp">${exam ? T('task.exam') : T('task.practice')}</span><span class="lp">${ic('clock')} ${cfg.minutes ? `${cfg.minutes} ${T('common.min')}` : T('common.noLimit')}</span><span class="lp">${items.length} ${T('variants.tasks')}</span></div>
    <h1 class="page-title display" tabindex="-1"><span class="grad">${esc(cfg.title)}</span></h1>${cfg.desc ? `<p class="page-sub" style="margin:0">${esc(cfg.desc)}</p>` : ''}</div>
    <div class="right">${cfg.extraBtn || ''}${timerChip()}</div></div>
    ${exam ? `<p class="mode-hint">${ic('alert')} ${T('task.examHint')}</p>` : ''}
    ${rule ? `<details class="disc" open><summary>${ic('compass')} ${esc(ru ? 'Как определяется уровень' : 'How your level is decided')}</summary><div class="dc"><ul class="dash">${rule.steps.map(s => `<li>${esc(s.text)}</li>`).join('')}</ul></div></details>` : ''}
    <nav class="stepper" aria-label="${esc(ru ? 'Задания' : 'Tasks')}">${infos.map((f, i) => `<button type="button" class="step" data-step="${i}"><b>${i + 1}</b><span aria-hidden="true">${f.em}</span><span>${esc(f.short)}</span></button>`).join('')}</nav>
    <div class="lightline"><i></i></div><div data-stage></div>
    <div class="runner-nav"><button type="button" class="pill pill-outline" data-go="prev">${ic('back')} ${T('variants.prev')}</button><span class="row"><button type="button" class="pill pill-white" data-go="next">${T('variants.next')} ${ic('arrow')}</button><button type="button" class="pill pill-white" data-go="finish">${ic('check')} ${T('variants.finish')}</button></span></div>
    <div data-results></div></div>`;
  const stage = $('[data-stage]', v), steps = $$('[data-step]', v);
  const tm = new Timer({ el: $('.task-head .timer-chip', v), seconds: cfg.minutes ? cfg.minutes * 60 : null, onEnd: () => { if (exam && !finished) { toast(t('task.timeUp')); finish(true); } else toast(ru ? 'Рекомендованное время вышло' : 'The recommended time is over'); } });
  if (exam) tm.start();
  const startTm = () => { if (!tm.started && !finished) tm.start(); };
  stage.addEventListener('input', startTm); stage.addEventListener('click', startTm);
  const ensure = i => {
    if (players[i]) return players[i];
    const p = players[i] = itemPlayer(items[i], cfg.mode);
    const wrap = document.createElement('section'); wrap.className = 'run-item'; wrap.dataset.item = i; wrap.hidden = true;
    const f = infos[i];
    wrap.innerHTML = `<div class="row" style="margin:18px 0 4px"><span class="kicker">${esc(ru ? 'Задание' : 'Task')} ${i + 1} ${T('common.of')} ${items.length}</span>${f.drill ? '<span class="lp">' + ic('bolt') + '</span>' : levelPill(f.level)}</div><h2 class="grp-title" style="font-size:22px">${f.em} ${esc(f.title)}</h2>${f.sub && items[i].t === 'task' ? `<p class="faint" style="margin:4px 0 0">${esc(f.sub)}</p>` : ''}`;
    wrap.appendChild(p.el); stage.appendChild(wrap); return p;
  };
  const markDone = () => steps.forEach((s, i) => s.classList.toggle('done', !!(players[i] && players[i].isChecked())));
  const limit = () => stoppedAt != null ? stoppedAt : items.length - 1;
  const go = (i, focus = true) => {
    i = Math.max(0, Math.min(limit(), i)); cur = i; ensure(i);
    $$('.run-item', stage).forEach(w => w.hidden = +w.dataset.item !== i);
    steps.forEach((s, j) => { if (j === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current'); s.disabled = j > limit(); });
    $('[data-go=prev]', v).hidden = i === 0; $('[data-go=next]', v).hidden = i >= limit(); $('[data-go=finish]', v).hidden = finished || i < limit();
    markDone();
    if (focus) { const h = $(`.run-item[data-item="${i}"] h2`, stage); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } window.scrollTo({ top: Math.max(0, $('.stepper', v).getBoundingClientRect().top + scrollY - 90), behavior: reduced() ? 'auto' : 'smooth' }); }
    speech.stop();
  };
  // diagnostic rule
  const stepOf = i => rule ? rule.steps.findIndex(s => s.tasks.includes(items[i].t === 'task' ? items[i].id : '')) : -1;
  const evalStep = k => { const s = rule.steps[k]; return s.tasks.every(id => { const i = items.findIndex(x => x.id === id); const r = ensure(i).result(); return r && r.score >= s.pass[id]; }); };
  async function next() {
    if (rule && !finished) {
      const k = stepOf(cur), s = rule.steps[k];
      const last = s && items.findIndex(x => x.id === s.tasks[s.tasks.length - 1]) === cur;
      if (last && k < rule.steps.length - 1) {
        const unchecked = s.tasks.some(id => !ensure(items.findIndex(x => x.id === id)).isChecked());
        if (unchecked && !(await confirmDlg(ru ? 'Проверить ответы этого этапа и продолжить?' : 'Check your answers for this stage and continue?'))) return;
        const pass = evalStep(k); markDone();
        if (!pass && rule.stopEarly) { recLevel = s.ifFail; stoppedAt = cur; finish(true); return; }
      }
    }
    go(cur + 1);
  }
  async function finish(forced = false) {
    if (finished) return;
    if (!forced && !(await confirmDlg(ru ? 'Завершить вариант? Непроверенные задания будут проверены сейчас.' : 'Finish the variant? Unchecked tasks will be checked now.'))) return;
    finished = true; tm.stop(); speech.stop();
    const upto = limit();
    if (rule && !recLevel) { for (let k = 0; k < rule.steps.length; k++) { const s = rule.steps[k]; if (!evalStep(k)) { recLevel = s.ifFail; break; } if (k === rule.steps.length - 1) recLevel = s.ifPass; } }
    const rows = [];
    for (let i = 0; i <= upto; i++) { const p = ensure(i); const r = p.result(); rows.push({ i, f: infos[i], it: items[i], r }); }
    markDone();
    let lrS = 0, lrT = 0; const sk = { L: [0, 0, false], R: [0, 0, false] };
    rows.forEach(({ it, r, f }) => { if (r && (r.kind === 'LR' || r.kind === 'drill')) { lrS += r.score; lrT += r.total; } if (r && r.kind === 'LR') { const s = sk[f.skill]; s[0] += r.score; s[1] += r.total; if (f.level === 'C') s[2] = true; } });
    const ests = ['L', 'R'].filter(k => sk[k][1] && sk[k][2]).map(k => { const raw = Math.round(sk[k][0] / sk[k][1] * 40); const e = estimateBand(raw, k === 'L' ? 'listening' : 'readingAcademic'); return `<div class="result-row"><span>${SKILL[k].icon} ${T('skill.' + k)} · ${T('task.estimate')}</span><strong>${esc(bandText(e))} <span class="faint">(${raw}/40)</span></strong></div>`; }).join('');
    const seconds = Math.round(tm.elapsed());
    rows.forEach(({ r }) => { if (r) Progress.add({ ...r, variantId: cfg.variantId || 'set' }); });
    const pct = lrT ? Math.round(lrS / lrT * 100) : Math.round(rows.filter(x => x.r).reduce((a, x) => a + (x.r.percent || 0), 0) / Math.max(1, rows.length));
    Progress.add({ kind: 'variant', taskId: null, variantId: cfg.variantId || 'set', mode: cfg.mode, score: lrS, total: lrT, percent: pct, seconds, extra: { title: cfg.title, level: recLevel, items: rows.length } });
    if (recLevel) { Profile.set({ ...Profile.get(), level: recLevel }); }
    const rowTxt = r => !r ? '—' : r.kind === 'W' ? Object.values(r.extra.words).map(w => `${w} ${t('writing.words')}`).join(' + ') + ` · ${r.score}/${r.total} ✓` : r.kind === 'S' ? `${t('writing.checklist')}: ${r.score}/${r.total}` : `${r.score} / ${r.total}`;
    const resBox = $('[data-results]', v);
    resBox.innerHTML = `<section class="glass panel" style="margin-top:26px" aria-labelledby="resH"><div class="row between"><h2 class="sec-title display" id="resH" style="font-size:30px"><span class="grad">${T('variants.result')}</span></h2><span class="lp">${ic('clock')} ${fmt(seconds)}</span></div>
      ${recLevel ? `<div class="glass score-card lv-${recLevel}" style="margin:16px 0"><div class="txt"><div class="kicker">${T('variants.yourLevel')}</div><div class="big-num" style="color:var(--acc)">${esc(t('level.' + recLevel))}</div><p>${esc(LEVEL[recLevel].label)} · CEFR ${esc(LEVEL[recLevel].cefr)} · IELTS ${esc(LEVEL[recLevel].band)}</p><p>${stoppedAt != null ? esc(ru ? 'Задания уровня A пока даются трудно – начни с уровня A.' : 'The Level A tasks were not yet easy enough – start with Level A.') : ''}</p><a class="pill pill-white pill-sm" href="#/practice?level=${recLevel}">${T('nav.practice')} · ${esc(recLevel)} ${ic('arrow')}</a></div></div>` : ''}
      <div style="margin-top:10px">${rows.map(({ i, f, r }) => `<div class="result-row"><span>${i + 1}. ${f.em} ${esc(f.title)}</span><strong>${esc(rowTxt(r))}</strong></div>`).join('')}
      ${lrT ? `<div class="result-row"><span>${esc(ru ? 'Итого (Listening, Reading и тренажёры)' : 'Total (Listening, Reading and drills)')}</span><strong>${lrS} / ${lrT} · ${pct}%</strong></div>` : ''}${ests}</div>
      <p class="faint" style="margin-top:12px">${T('task.guideOnly')}${ests ? '' : ' ' + esc(ru ? 'Оценка в баллах IELTS показывается только для заданий уровня C.' : 'Band estimates are shown only for Level C tasks.')}</p>
      <div class="check-bar"><button type="button" class="pill pill-white" data-again>${ic('replay')} ${esc(ru ? 'Пройти ещё раз' : 'Try again')}</button><a class="pill pill-outline" href="#/progress">${ic('progress')} ${T('nav.progress')}</a><a class="pill pill-outline" href="#/variants">${T('nav.variants')}</a></div></section>`;
    $('[data-again]', resBox).addEventListener('click', () => render());
    $('[data-go=finish]', v).hidden = true; go(Math.min(cur, upto), false);
    resBox.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); $('#resH', resBox).setAttribute('tabindex', '-1'); $('#resH', resBox).focus({ preventScroll: true });
    announce(t('variants.result'));
  }
  $('.stepper', v).addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b && !b.disabled) go(+b.dataset.step); });
  $('[data-go=prev]', v).addEventListener('click', () => go(cur - 1));
  $('[data-go=next]', v).addEventListener('click', next);
  $('[data-go=finish]', v).addEventListener('click', () => finish(false));
  stage.addEventListener('click', () => requestAnimationFrame(markDone));
  go(0, false);
  leaveGuard = () => !finished && (exam ? tm.started : players.some(p => p && p.dirty()));
  onCleanup(() => { tm.destroy(); players.forEach(p => p && p.destroy()); });
}

route(/^\/variants$/, v => {
  const ru = lang === 'ru', hist = Progress.all().filter(e => e.kind === 'variant');
  v.innerHTML = `<div class="page">${pageHead(`${ic('variants')} ${T('nav.variants')} · ${D.variants.length}`, 'variants.title', 'variants.sub')}
  <div class="grid g3">${D.variants.map(x => { const last = hist.filter(e => e.variantId === x.id).pop(); const lv = LEVEL[x.level] ? x.level : (x.level.includes('C') ? 'C' : x.level.includes('B') ? 'B' : 'x');
    const n = x.random ? `${x.random.part1Topics} + 1 + 1` : x.items.length;
    return `<article class="glass card glow cta-card lv-${lv}"><div class="row between" style="width:100%"><span class="kicker">${x.mode === 'exam' ? T('task.exam') : T('task.practice')}</span><span class="vic" aria-hidden="true">${x.random ? ic('dice') : x.rule ? ic('compass') : (x.items.map(i => SKILL[TASK[i].skill].icon).filter((e, j, a) => a.indexOf(e) === j).join(''))}</span></div>
    <h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p><div class="row"><span class="lp lv-${lv}"><i></i>${esc(lvLabel(x.level))}</span><span class="lp">${ic('clock')} ${x.minutes ? `${x.minutes} ${T('common.min')}` : T('common.noLimit')}</span><span class="lp">${esc(String(n))} ${T('variants.tasks')}</span>${last ? `<span class="lp ok">${ic('check')} ${last.extra && last.extra.level ? esc(last.extra.level) : last.total ? `${last.score}/${last.total}` : esc(ru ? 'пройден' : 'done')}</span>` : ''}</div>
    <a class="pill pill-white pill-sm" href="#/variant/${x.id}" style="margin-top:auto">${T('variants.start')} ${ic('arrow')}</a></article>`; }).join('')}</div>
  <section class="sec"><div class="glass panel row between"><div><h2 class="grp-title">${ic('builder')} ${T('builder.title')}</h2><p class="muted" style="margin:6px 0 0">${T('builder.sub')}</p></div><a class="pill pill-outline" href="#/builder">${T('nav.builder')} ${ic('arrow')}</a></div></section></div>`;
  return { title: t('variants.title'), nav: 'variants', relang: true };
});
route(/^\/variant\/([\w-]+)$/, (v, [id]) => {
  const x = D.variants.find(y => y.id === id); if (!x) return notFound(v);
  const ru = lang === 'ru';
  let items = x.items.map(tid => ({ t: 'task', id: tid }));
  if (x.random) items = [randomSpItem(null, Math.random, x.random.part1Topics || 3)];
  runSet(v, { title: x.title, desc: x.desc, mode: x.mode, minutes: x.minutes, items, variantId: x.id, rule: x.rule, level: x.level, back: '#/variants', backLabel: t('variants.title'),
    extraBtn: x.random ? `<button type="button" class="pill pill-outline" data-newmock>${ic('dice')} ${T('speaking.newMock')}</button>` : '' });
  const nm = $('[data-newmock]', v);
  if (nm) nm.addEventListener('click', async () => { if (leaveGuard && leaveGuard() && !(await confirmDlg(ru ? 'Начать новый пробник? Текущий будет сброшен.' : 'Start a new mock? The current one will be reset.'))) return; leaveGuard = null; render(); });
  return { title: x.title, nav: 'variants' };
});
route(/^\/set(?:\/([\w-]+))?$/, (v, [id], q) => {
  const ru = lang === 'ru';
  const s = id ? Sets.get(id) : decodeSet(q.get('code') || '');
  if (!s) { v.innerHTML = `<div class="page"><div class="glass empty"><h1 class="display page-title"><span class="grad">${esc(ru ? 'Набор не найден' : 'Set not found')}</span></h1><p>${esc(ru ? 'Возможно, он был удалён или ссылка повреждена.' : 'It may have been deleted, or the link is broken.')}</p><a class="pill pill-white" href="#/builder">${T('nav.builder')}</a></div></div>`; return { title: '404', nav: 'builder' }; }
  const lvs = [...new Set(s.items.map(itemLevel).filter(Boolean))];
  const mins = s.items.reduce((a, it) => a + (itemInfo(it).minutes || 0), 0);
  runSet(v, { title: s.name || D.meta.brand, mode: s.mode, minutes: s.mode === 'exam' ? mins : null, items: s.items, variantId: id ? 'set:' + id : 'set', level: lvs.length === 1 ? lvs[0] : 'mixed', back: id ? `#/builder?edit=${id}` : `#/builder?set=${encodeSet(s)}`, backLabel: t('builder.title') });
  return { title: s.name || t('builder.title'), nav: 'builder' };
});

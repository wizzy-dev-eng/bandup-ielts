/* ---------- practice library ---------- */
function taskMetaPills(tk) {
  const n = tk.questionsCount ? `${tk.questionsCount} ${lang === 'ru' ? 'вопр.' : 'questions'}` : tk.parts ? `${tk.parts.length} ${lang === 'ru' ? 'задания' : 'tasks'}` : `${['part1', 'part2', 'part3'].filter(p => tk.speaking[p]).length} ${lang === 'ru' ? 'части' : 'parts'}`;
  const tm = tk.minutes ? `${tk.minutes} ${t('common.min')}` : t('common.noLimit');
  const best = Progress.best(tk.id);
  const b = best ? (best.kind === 'LR' ? `<span class="lp ok">${ic('check')} ${t('progress.best')} ${best.score}/${best.total}</span>` : `<span class="lp ok">${ic('check')} ${lang === 'ru' ? 'Выполнено' : 'Done'}</span>`) : '';
  return `<span class="lp">${esc(n)}</span><span class="lp">${ic('clock')} ${esc(tm)}</span>${b}`;
}
route(/^\/practice$/, (v, _, q) => {
  let lv = q.get('level') || 'all', sk = q.get('skill') || 'all';
  if (!['all', 'A', 'B', 'C'].includes(lv)) lv = 'all'; if (!['all', 'L', 'R', 'W', 'S'].includes(sk)) sk = 'all';
  v.innerHTML = `<div class="page">${pageHead(`${ic('practice')} ${T('nav.practice')} · 12`, 'practice.title', 'practice.sub')}
  <div class="tabbar">${tabsHtml('flv', [{ id: 'all', html: T('practice.all') }, ...D.levels.map(l => ({ id: l.id, html: `<span class="dot lv-${l.id}"></span>${esc(l.id)}` }))], lv, 'Level')}
  ${tabsHtml('fsk', [{ id: 'all', html: T('practice.all') }, ...D.skills.map(s => ({ id: s.id, html: `${s.icon} ${T('skill.' + s.id)}` }))], sk, 'Skill')}</div>
  <div id="fsk-panel" role="tabpanel" aria-label="Tasks"><div class="grid gauto" id="taskGrid"></div></div>
  <section class="sec"><div class="sec-head"><span class="glass-pill">${ic('bolt')} ${T('practice.drills')}</span></div>
   <div class="grid g3">
    <a class="glass card glow task-card lv-A" href="#/drill/tfng"><div class="top"><span class="code">T/F/NG</span><span class="em">${ic('book')}</span></div><h3>${T('drill.tfng')}</h3><p class="part">${esc(plain(D.drills.tfng.rule))}</p><div class="meta"><span class="lp">${D.drills.tfng.items.length}</span></div></a>
    <a class="glass card glow task-card lv-B" href="#/drill/dictation"><div class="top"><span class="code">A–Z 0–9</span><span class="em">${ic('headphones')}</span></div><h3>${T('drill.dictation')}</h3><p class="part">${esc(D.drills.dictation.intro)}</p><div class="meta"><span class="lp">${D.drills.dictation.kinds.length} kinds</span></div></a>
    <a class="glass card glow task-card lv-C" href="#/drill/quiz"><div class="top"><span class="code">?</span><span class="em">${ic('bulb')}</span></div><h3>${T('quiz.title')}</h3><p class="part">${esc(D.drills.quiz.intro)}</p><div class="meta"><span class="lp">${D.drills.quiz.items.length}</span></div></a>
   </div></section>
  <details class="disc"><summary>${lang === 'ru' ? 'Как работать с заданиями' : 'How to work with the tasks'}</summary><div class="dc"><ul class="dash">${D.collection.howTo.map(h => `<li>${md(h)}</li>`).join('')}</ul></div></details></div>`;
  const grid = $('#taskGrid', v);
  const draw = () => {
    const list = D.tasks.filter(x => (lv === 'all' || x.level === lv) && (sk === 'all' || x.skill === sk));
    grid.innerHTML = list.map(x => `<a class="glass card glow task-card lv-${x.level}" href="#/practice/${x.id}"><div class="top"><span class="code">${esc(x.code)}</span><span class="em" aria-hidden="true">${SKILL[x.skill].icon}</span></div><div class="row">${levelPill(x.level)}${skillPill(x.skill)}</div><h3>${esc(x.title)}</h3><p class="part">${esc(x.part)}</p><div class="meta">${taskMetaPills(x)}</div></a>`).join('') || `<div class="glass empty"><p>—</p></div>`;
    const qq = new URLSearchParams(); if (lv !== 'all') qq.set('level', lv); if (sk !== 'all') qq.set('skill', sk); setQuery(qq);
  };
  bindTabs($('[data-tabs=flv]', v), id => { lv = id; draw(); });
  bindTabs($('[data-tabs=fsk]', v), id => { sk = id; draw(); });
  draw();
  return { title: t('practice.title'), nav: 'practice', relang: true };
});

/* ---------- answer checking ---------- */
function norm(s) { return String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\u2018\u2019\u201B\u2032`]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/£/g, '').replace(/\s+/g, ' ').trim().replace(/[.,;]+$/, '').trim(); }
function overLimit(s, lim) {
  let words = 0, nums = 0, prev = false;
  for (const tk of s.split(' ').filter(Boolean)) {
    const isNum = /^[\d.,:\/%-]+$/.test(tk) && /\d/.test(tk);
    if (isNum && lim.number) { if (!prev) nums++; prev = true; } else { words++; prev = false; }
  }
  return lim.number ? (words > lim.maxWords || nums > 1) : words > lim.maxWords;
}
function judge(q, g, raw) {
  const v = String(raw ?? '').trim();
  if (!v) return 'empty';
  if (q.kind === 'choice') return v.toLowerCase() === String(q.accept[0]).toLowerCase() ? 'ok' : 'bad';
  const nv = norm(v), acc = q.accept.map(norm);
  if (acc.includes(nv)) return 'ok';
  if (g.limit && overLimit(nv, g.limit)) return 'over';
  if (nv.length >= 4 && acc.some(a => lev(nv, a) === 1)) return 'almost';
  return 'bad';
}
const ST_KEY = { ok: 'task.correct', bad: 'task.wrong', almost: 'task.almost', over: 'task.overLimit', empty: 'task.empty' };
const ST_IC = { ok: ic('check'), bad: ic('x'), almost: ic('approx'), over: ic('x'), empty: ic('x') };
function scoreGuideLine(score, total) {
  const g = D.collection.scoreGuide; const pick = (s, idx) => { const body = s.replace(/^\*\*.*?\*\*\s*/, ''); const parts = body.split('; '); return parts[Math.min(idx, parts.length - 1)]; };
  if (total === 10) return pick(g[0], score >= 9 ? 0 : score >= 7 ? 1 : 2);
  if (total === 13) return pick(g[1], score >= 11 ? 0 : score >= 8 ? 1 : 2);
  return '';
}
const ring = pct => { const r = 34, c = 2 * Math.PI * r; return `<svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle class="bg" cx="42" cy="42" r="${r}"/><circle class="fg" cx="42" cy="42" r="${r}" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/></svg>`; };

/* ---------- Listening / Reading player ---------- */
function lrPlayer(task, { mode = 'practice', embedded = false, save = true, timerEl = null } = {}) {
  const P = uid('q'); const exam = mode === 'exam';
  const el = document.createElement('div'); el.className = 'player lr';
  const qs = task.groups.flatMap(g => g.questions.map(q => ({ q, g })));
  const total = qs.length;
  let checked = false, lastScore = null, started = false, timer = null, startT = Date.now();
  const gapHtml = (q, g, pr) => {
    if (pr) return `<span class="pgap">(${q.n})</span>`;
    if (q.kind === 'choice') return `<span class="gapw"><b class="qn">${q.n}</b><select class="gsel" data-n="${q.n}" aria-label="Question ${q.n}"><option value="">—</option>${(q.options || g.options).map(o => `<option value="${esc(o.key)}">${esc(o.key)}${o.text && o.text !== o.key ? ' · ' + esc(o.text) : ''}</option>`).join('')}</select></span>`;
    return `<span class="gapw"><b class="qn">${q.n}</b><input class="gap" data-n="${q.n}" aria-label="Question ${q.n}" autocomplete="off" autocapitalize="off" spellcheck="false"></span>`;
  };
  const qItem = (q, g) => {
    if (g.type === 'sentence') return `<li class="qi" data-qi="${q.n}"><p>${md(q.prompt, () => gapHtml(q, g))}</p><div class="qfb"></div></li>`;
    if (g.type === 'headings' || g.type === 'matchInfo') {
      const opts = g.options;
      return `<li class="qi" data-qi="${q.n}"><div class="sel-row"><label for="${P}s${q.n}"><b class="qn">${q.n}</b>${md(q.prompt)}</label><select class="gsel" id="${P}s${q.n}" data-n="${q.n}"><option value="">—</option>${opts.map(o => `<option value="${esc(o.key)}">${esc(g.type === 'headings' ? o.key : o.key)}</option>`).join('')}</select></div><div class="qfb"></div></li>`;
    }
    const opts = q.options || g.options;
    const rich = !!q.options;
    return `<li class="qi" data-qi="${q.n}"><fieldset><legend><b class="qn">${q.n}</b>${md(q.prompt)}</legend><div class="choice${rich ? ' col' : ''}">${opts.map(o => `<label class="opt${rich ? ' block' : ''}"><input type="radio" name="${P}-q${q.n}" value="${esc(o.key)}"><span>${rich ? `<b>${esc(o.key)}</b>${md(o.text)}` : esc(o.text)}</span></label>`).join('')}</div></fieldset><div class="qfb"></div></li>`;
  };
  const groupHtml = (g) => {
    const qm = Object.fromEntries(g.questions.map(q => [q.n, q]));
    const gp = n => gapHtml(qm[n], g);
    let body = '';
    if (g.kind === 'form') body = `<div class="form-card"><div class="form-title">${md(g.title)}</div>${g.rows.map(r => `<div class="form-row${/__Example/.test(r.text) ? ' ex' : ''}"><div class="fl">${md(r.label)}</div><div class="fv">${md(r.text, gp)}</div></div>`).join('')}</div>`;
    else if (g.kind === 'notes') body = `<div class="notes">${g.notes.map(x => x.heading ? `<h4>${md(x.heading)}</h4>` : `<p class="nl">${md(x.text, gp)}</p>`).join('')}</div>`;
    else if (g.kind === 'summary') body = (g.options ? `<div class="wordbox" aria-label="${esc(g.optionsTitle || 'Word box')}">${g.options.map(o => `<span><b>${esc(o.key)}</b>${esc(o.text)}</span>`).join('')}</div>` : '') + `<div class="summary">${md(g.text, gp)}</div>`;
    else {
      if (g.type === 'headings') body += `<div class="optlist"><h4>${esc(g.optionsTitle)}</h4>${g.options.map(o => `<div><b>${esc(o.key)}</b><span>${esc(o.text)}</span></div>`).join('')}${g.example ? `<div class="faint" style="margin-top:6px"><em>Example: ${esc(g.example)}</em></div>` : ''}</div>`;
      body += `<ol class="qlist">${g.questions.map(q => qItem(q, g)).join('')}</ol>`;
    }
    const inline = g.kind !== 'list' || g.type === 'sentence';
    return `<section class="glass grp" data-g="${g.range}"><div class="grp-head"><h3 class="grp-title">${lang === 'ru' ? 'Вопросы' : 'Questions'} ${esc(g.range)}</h3>${g.limit ? `<span class="lp warn">${esc(g.limit.label)}</span>` : ''}</div><p class="instr">${md(g.instructions)}</p>${body}${inline && g.kind !== 'list' ? '<div class="grp-fb" hidden></div>' : ''}</section>`;
  };
  const isL = task.skill === 'L';
  const tipsHtml = task.tips && task.tips.length ? `<details class="disc tips"${task.level === 'A' ? ' open' : ''}><summary>${ic('bulb')} ${T('task.tips')}</summary><div class="dc"><ul class="dash tip-list">${task.tips.map(x => `<li>${md(x)}</li>`).join('')}</ul></div></details>` : '';
  const groupsHtml = task.groups.map(groupHtml).join('');
  const checkBar = `<div class="check-bar"><button class="pill pill-white" data-act="check">${ic('check')} ${T('task.check')}</button>${!exam ? `<button class="pill pill-outline" data-act="show">${T('task.show')}</button>` : ''}<button class="pill pill-glass" data-act="reset" hidden>${ic('replay')} ${T('task.reset')}</button></div><div data-score></div>`;
  if (isL) {
    el.innerHTML = `${task.intro ? `<p class="instr" style="margin-top:6px">${md(task.intro)}</p>` : ''}${tipsHtml}${audioPanelHtml(P, exam)}${groupsHtml}${checkBar}<div class="transcript-wrap"></div>`;
  } else {
    const ps = task.passage;
    el.innerHTML = `${task.intro ? `<p class="instr" style="margin-top:6px">${md(task.intro)}</p>` : ''}${tipsHtml}
    ${tabsHtml(P + 'r', [{ id: 'text', html: T('task.passage') }, { id: 'qs', html: T('task.questions') }], 'text', 'Text or questions', 'rtabs')}
    <div class="reading-split" id="${P}r-panel"><article class="glass passage" data-rpanel="text" aria-label="${esc(ps.title)}"><h2>${esc(ps.title)}</h2>${ps.paragraphs.map(p => `<p><span class="pl">${esc(p.label)}</span><span>${md(p.text)}</span></p>`).join('')}</article>
    <div class="qs" data-rpanel="qs" hidden>${groupsHtml}${checkBar}</div></div>`;
    const tl = $('.rtabs', el);
    const show = id => { $$('[data-rpanel]', el).forEach(p => p.hidden = p.dataset.rpanel !== id); };
    bindTabs(tl, id => show(id));
    show('text');
  }
  // audio
  let audio = null;
  if (isL) audio = bindAudio(el, P, task, exam, () => { begin(); if (exam && timer && !timer.started) timer.start(); });
  // timer
  const begin = () => { if (started) return; started = true; startT = Date.now(); if (timer && !timer.started && !exam) timer.start(); };
  el.addEventListener('input', begin); el.addEventListener('change', begin);
  const examMin = task.minutes || (isL ? 10 : 20);
  const attachTimer = te => { if (!te) return; timer = new Timer({ el: te, seconds: exam ? examMin * 60 : (task.minutes ? task.minutes * 60 : null), onEnd: () => { if (exam && !checked) { toast(t('task.timeUp')); check(); } } }); if (exam && !isL) { timer.start(); started = true; } };
  attachTimer(timerEl);
  const answerOf = q => {
    if (q.kind === 'text') return $(`input.gap[data-n="${q.n}"]`, el)?.value || '';
    const s = $(`select[data-n="${q.n}"]`, el); if (s) return s.value;
    const r = $(`input[name="${P}-q${q.n}"]:checked`, el); return r ? r.value : '';
  };
  const fbHtml = (q, st, ans) => `<div class="fb ${st}"><span class="st">${ST_IC[st]} ${T(ST_KEY[st])}</span>${st !== 'ok' ? `<span class="muted">${ans ? `${lang === 'ru' ? 'Твой ответ' : 'Your answer'}: <span class="ans">${esc(ans)}</span> · ` : ''}${lang === 'ru' ? 'Ответ' : 'Answer'}: <span class="ans">${esc(q.answer)}</span></span>` : `<span class="ans">${esc(q.answer)}</span>`}<details><summary>${T('task.explanation')}</summary><div class="why">${md(q.why)}</div></details></div>`;
  function check(silent = false) {
    if (checked) return lastScore;
    audio && audio.stop();
    let score = 0;
    $$('.grp-fb', el).forEach(x => { x.innerHTML = ''; x.hidden = false; });
    for (const { q, g } of qs) {
      const ans = answerOf(q), st = judge(q, g, ans);
      if (st === 'ok') score++;
      const inp = $(`[data-n="${q.n}"]`, el);
      if (inp) { inp.classList.add('st-' + st); inp.disabled = true; }
      $$(`input[name="${P}-q${q.n}"]`, el).forEach(r => { r.disabled = true; const lab = r.closest('.opt'); if (r.value === q.accept[0]) lab.classList.add('ok'); else if (r.checked) lab.classList.add('bad'); });
      const li = $(`[data-qi="${q.n}"] .qfb`, el);
      const html = (li ? '' : `<b class="qn">${q.n}</b>`) + fbHtml(q, st, ans);
      if (li) li.innerHTML = html; else { const box = $(`[data-g="${g.range}"] .grp-fb`, el); if (box) box.insertAdjacentHTML('beforeend', `<div class="row" style="align-items:flex-start;flex-wrap:nowrap">${html}</div>`); }
    }
    checked = true; timer && timer.stop();
    const pct = Math.round(score / total * 100);
    const raw40 = Math.round(score / total * 40);
    const est = task.level === 'C' ? estimateBand(raw40, isL ? 'listening' : 'readingAcademic') : null;
    $('[data-score]', el).innerHTML = `<div class="glass score-card" role="status">${ring(pct)}<div class="txt"><div class="kicker">${T('task.score')}</div><div class="big-num">${score} / ${total}</div><p>${esc(scoreGuideLine(score, total))}</p>${est ? `<p>${T('task.estimate')}: <strong>${esc(bandText(est))}</strong> (${raw40}/40)</p>` : `<p class="faint">${lang === 'ru' ? 'Оценка в баллах IELTS показывается только для заданий уровня C – они соответствуют реальному экзамену.' : 'Band estimates are shown only for Level C tasks, which match the real exam.'}</p>`}<p class="faint">${T('task.guideOnly')}</p></div></div>`;
    $('[data-act=check]', el).hidden = true; const sb = $('[data-act=show]', el); if (sb) sb.hidden = true; $('[data-act=reset]', el).hidden = false;
    if (isL) $('.transcript-wrap', el).innerHTML = transcriptHtml(task, !exam);
    if (isL && !exam) bindTranscript(el, task);
    const seconds = Math.round(timer ? timer.elapsed() : (Date.now() - startT) / 1000);
    lastScore = { kind: 'LR', taskId: task.id, mode, score, total, percent: pct, seconds, extra: est ? { estimate: est.band, below: est.below } : {} };
    if (save && !silent) Progress.add(lastScore);
    if (!silent) { announce(`${t('task.score')}: ${score} / ${total}`); if (!embedded) $('[data-score]', el).scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); }
    return lastScore;
  }
  function reset() {
    checked = false; lastScore = null; started = false;
    $$('input.gap', el).forEach(i => { i.value = ''; i.disabled = false; i.className = 'gap'; });
    $$('select.gsel', el).forEach(s => { s.value = ''; s.disabled = false; s.className = 'gsel'; });
    $$('input[type=radio]', el).forEach(r => { r.checked = false; r.disabled = false; r.closest('.opt').classList.remove('ok', 'bad'); });
    $$('.qfb', el).forEach(x => x.innerHTML = ''); $$('.grp-fb', el).forEach(x => { x.innerHTML = ''; x.hidden = true; });
    $('[data-score]', el).innerHTML = ''; $('[data-act=check]', el).hidden = false; const sb = $('[data-act=show]', el); if (sb) sb.hidden = false; $('[data-act=reset]', el).hidden = true;
    if (isL) { $('.transcript-wrap', el).innerHTML = ''; audio && audio.reset(); }
    timer && timer.reset(); if (exam && !isL && timer) { timer.start(); started = true; }
  }
  function showAnswers() {
    for (const { q } of qs) {
      if (q.kind === 'text') { const i = $(`input.gap[data-n="${q.n}"]`, el); if (i) i.value = q.accept[0]; }
      else { const s = $(`select[data-n="${q.n}"]`, el); if (s) s.value = q.accept[0]; const r = $(`input[name="${P}-q${q.n}"][value="${CSS.escape(q.accept[0])}"]`, el); if (r) r.checked = true; }
    }
    check(true);
  }
  el.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || !el.contains(b)) return; if (b.dataset.act === 'check') check(); if (b.dataset.act === 'reset') reset(); if (b.dataset.act === 'show') showAnswers(); });
  const answered = () => qs.some(({ q }) => answerOf(q));
  return {
    el, kind: 'LR', task,
    check: (silent) => check(silent), result: () => check(true) || lastScore,
    isChecked: () => checked,
    dirty: () => !checked && (answered() || (exam && timer && timer.running)),
    attachTimer, destroy: () => { audio && audio.stop(); timer && timer.destroy(); }
  };
}

/* ---------- audio panel (Web Speech) ---------- */
function audioPanelHtml(P, exam) {
  return `<div class="glass audio" data-audio="${P}"><div class="audio-top">
  <button class="icon-btn lg" data-a="play" aria-label="${esc(t('audio.play'))}" data-i18n-label="audio.play">${ic('play')}</button>
  <div class="audio-meta"><div class="audio-title">${T('audio.play')} ${exam ? `<span class="lp warn" style="margin-left:6px">${T('audio.once')}</span>` : ''}</div><div class="audio-bar"><i></i></div><div class="audio-time" data-a="time">0 / 0</div></div>
  ${exam ? '' : `<div class="audio-ctrls"><button class="icon-btn" data-a="replay" aria-label="${esc(t('audio.replay'))}" data-i18n-title="audio.replay" title="${esc(t('audio.replay'))}">${ic('replay')}</button><button class="icon-btn" data-a="slow" aria-pressed="false" aria-label="${esc(t('audio.slow'))}" title="${esc(t('audio.slow'))}">0.8×</button></div>`}
  </div><div data-a="countdown"></div><div class="audio-note" data-a="note"></div>
  <details class="disc" style="margin-bottom:0"><summary>${T('audio.voices')}</summary><div class="dc voices" data-a="voices"></div></details></div>`;
}
function buildItems(task, cast) {
  const items = []; const lines = task.audio.lines;
  lines.forEach((ln, i) => {
    const ss = splitSentences(ln.t); const c = cast[ln.s] || {};
    ss.forEach((s, j) => items.push({ text: speakable(s), voice: c.voice, pitch: c.pitch, line: i, gap: j === ss.length - 1 ? (lines[i + 1] && lines[i + 1].s !== ln.s ? 700 : 450) : 300 }));
  });
  return items;
}
function bindAudio(root, P, task, exam, onStart) {
  const box = $(`[data-audio="${P}"]`, root);
  const playB = $('[data-a=play]', box), bar = $('.audio-bar i', box), time = $('[data-a=time]', box), note = $('[data-a=note]', box), cd = $('[data-a=countdown]', box), vbox = $('[data-a=voices]', box);
  const nLines = task.audio.lines.length;
  let cast = {}, items = [], state = 'idle', played = false, rate = 0.95, curIdx = 0, cdTimer = null, override = {};
  const setNote = () => { note.textContent = !speech.supported || !speech.voices.length ? t('audio.noVoice') : ''; };
  const recast = () => { cast = speech.cast(task.audio.speakers); Object.keys(override).forEach(k => { const v = speech.voices.find(x => x.name === override[k]); if (v) cast[k] = { voice: v, pitch: 1 }; }); items = buildItems(task, cast); drawVoices(); setNote(); };
  const drawVoices = () => {
    const sp = task.audio.speakers;
    vbox.innerHTML = Object.keys(sp).map(k => `<label class="field">${esc(sp[k].name)}<select class="inp" data-v="${k}">${speech.voices.length ? speech.voices.map(v => `<option value="${esc(v.name)}" ${cast[k] && cast[k].voice === v ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('') : '<option>—</option>'}</select></label>`).join('');
    $$('select', vbox).forEach(s => s.addEventListener('change', () => { override[s.dataset.v] = s.value; recast(); }));
  };
  recast();
  const offV = on('voices', recast);
  const progress = (i) => { const it = items[i]; if (!it) return; curIdx = i; bar.style.width = ((it.line + 1) / nLines * 100) + '%'; time.textContent = `${it.line + 1} / ${nLines}`; };
  const setIcon = p => { playB.innerHTML = ic(p ? 'pause' : 'play'); playB.setAttribute('aria-label', t(p ? 'audio.pause' : 'audio.play')); };
  const ended = () => { state = 'ended'; played = true; setIcon(false); bar.style.width = '100%'; time.textContent = `${nLines} / ${nLines}`; if (exam) { playB.disabled = true; note.textContent = t('audio.played'); } };
  const start = (from = 0) => { if (!speech.supported) { setNote(); return; } state = 'playing'; setIcon(true); onStart && onStart(); speech.play(items, { rate, from, onLine: progress, onEnd: ended }); };
  time.textContent = `0 / ${nLines}`;
  playB.addEventListener('click', () => {
    if (exam) {
      if (state !== 'idle') return;
      state = 'countdown'; playB.disabled = true; onStart && onStart();
      let left = 30;
      cd.innerHTML = `<div class="countdown">${ic('clock')}<span>${lang === 'ru' ? 'Посмотри на вопросы' : 'Look at the questions'}: <b data-cd>0:30</b></span><button class="txt-btn" data-skip>${lang === 'ru' ? 'Пропустить' : 'Skip'}</button></div>`;
      const go = () => { clearInterval(cdTimer); cd.innerHTML = ''; start(0); };
      $('[data-skip]', cd).addEventListener('click', go);
      cdTimer = setInterval(() => { left--; const c = $('[data-cd]', cd); if (c) c.textContent = '0:' + String(left).padStart(2, '0'); if (left <= 0) go(); }, 1000);
      return;
    }
    if (state === 'playing') { speech.pause(); state = 'paused'; setIcon(false); }
    else if (state === 'paused') { state = 'playing'; setIcon(true); speech.resume(); }
    else start(0);
  });
  const rb = $('[data-a=replay]', box); if (rb) rb.addEventListener('click', () => start(0));
  const sb = $('[data-a=slow]', box); if (sb) sb.addEventListener('click', () => { rate = rate === 0.8 ? 0.95 : 0.8; sb.setAttribute('aria-pressed', String(rate === 0.8)); if (state === 'playing') { speech.pause(); speech.rate = rate; start(curIdx); } });
  return {
    stop: () => { clearInterval(cdTimer); speech.stop(); if (state === 'playing' || state === 'paused') { state = 'ended'; setIcon(false); } },
    reset: () => { clearInterval(cdTimer); speech.stop(); cd.innerHTML = ''; state = 'idle'; played = false; playB.disabled = false; setIcon(false); bar.style.width = '0'; time.textContent = `0 / ${nLines}`; setNote(); },
    destroy: () => { offV(); clearInterval(cdTimer); },
    lineItems: (i) => items.filter(x => x.line === i)
  };
}
function transcriptHtml(task, withPlay) {
  const sp = task.audio.speakers;
  return `<details class="disc transcript" open><summary>${ic('note')} ${T('task.transcript')}</summary><div class="dc">${task.audio.note ? `<p class="faint">${md(task.audio.note)}</p>` : ''}${task.audio.lines.map((l, i) => `<div class="tl" data-line="${i}">${withPlay ? `<button class="icon-btn" data-line-play="${i}" aria-label="Play line ${i + 1}">${ic('play')}</button>` : ''}<b title="${esc(sp[l.s] ? sp[l.s].name : '')}">${esc(Object.keys(sp).length > 1 ? l.s + ':' : '')}</b><span>${md(l.t)}</span></div>`).join('')}</div></details>`;
}
function bindTranscript(el, task) {
  const cast = speech.cast(task.audio.speakers);
  $$('[data-line-play]', el).forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.linePlay, ln = task.audio.lines[i], c = cast[ln.s] || {};
    $$('.tl', el).forEach(x => x.classList.toggle('cur', +x.dataset.line === i));
    speech.play(splitSentences(ln.t).map(s => ({ text: speakable(s), voice: c.voice, pitch: c.pitch, gap: 250 })), { rate: 0.95 });
  }));
}

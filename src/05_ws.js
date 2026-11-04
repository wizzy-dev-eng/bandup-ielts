/* ---------- charts ---------- */
const CH_COL = ['var(--ch1)', 'var(--ch2)', 'var(--ch3)', 'var(--ch4)'];
const CH_MARK = ['circle', 'square', 'triangle', 'diamond'];
const CH_DASH = ['', '7 4', '2 4', '10 3 2 3'];
function niceScale(m) { const raw = (m || 1) / 5; const p = 10 ** Math.floor(Math.log10(raw)); const f = raw / p; const s = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; return { step: s, top: Math.ceil(m / s) * s }; }
function srTable(cap, head, rows) { return `<table class="sr-only"><caption>${esc(cap)}</caption><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
function chMarker(kind, x, y, col) {
  const f = 'style="fill:var(--ch-bg);stroke:' + col + '" stroke-width="2"';
  if (kind === 'square') return `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" ${f}/>`;
  if (kind === 'triangle') return `<path d="M${x} ${y - 6}L${x + 5.5} ${y + 4}H${x - 5.5}Z" ${f}/>`;
  if (kind === 'diamond') return `<path d="M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z" ${f}/>`;
  return `<circle cx="${x}" cy="${y}" r="4.5" ${f}/>`;
}
function chartHtml(ch, caption) {
  const cap = caption ? `<figcaption>${md(caption)}</figcaption>` : '';
  if (ch.kind === 'table') return `<figure class="chart"><div class="tbl-wrap"><table class="tbl"><caption class="ch-h">${esc(ch.title)}</caption><thead><tr><th scope="col">${esc(ch.unit === '%' ? '%' : '')}</th>${ch.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${ch.rows.map(r => `<tr><th scope="row">${esc(r.name)}</th>${r.values.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${cap}</figure>`;
  if (ch.kind === 'process') {
    const n = ch.steps.length;
    const li = ch.steps.map((s, i) => { const row = i < 4 ? 1 : 2, col = i < 4 ? i + 1 : 4 - (i - 4); const dir = i === n - 1 ? '' : i < 3 ? 'r' : i === 3 ? 'd' : 'l'; return `<li style="grid-column:${col};grid-row:${row}"${dir ? ` data-dir="${dir}"` : ''}><b><span>${s.n}</span>${esc(s.title)}</b>${esc(s.text)}</li>`; }).join('');
    return `<figure class="chart"><div class="ch-h" id="${uid('ph')}">${esc(ch.title)}</div><ol class="process" aria-label="${esc(ch.title)}">${li}</ol>${cap}</figure>`;
  }
  const W = 640, H = 372, L = 62, R = 18, Tp = 44;
  const series = ch.kind === 'bar' ? [{ name: ch.unit || '', values: ch.values }] : ch.series;
  const cats = ch.kind === 'line' ? ch.x.map(String) : ch.categories;
  const legend = ch.kind !== 'bar';
  const Bt = legend ? 74 : 48, PH = H - Tp - Bt, PW = W - L - R;
  const mx = Math.max(...series.flatMap(s => s.values));
  const { step, top } = niceScale(mx);
  const y = v => Tp + PH - (v / top) * PH;
  let g = `<text class="ch-title" x="${W / 2}" y="22" text-anchor="middle">${esc(ch.title)}</text>`;
  for (let v = 0; v <= top + 1e-9; v += step) g += `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="ch-t" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${+v.toFixed(2)}</text>`;
  if (ch.axis) g += `<text class="ch-t" transform="translate(16 ${Tp + PH / 2}) rotate(-90)" text-anchor="middle">${esc(ch.axis)}</text>`;
  g += `<line class="ch-axis" x1="${L}" x2="${W - R}" y1="${Tp + PH}" y2="${Tp + PH}"/><line class="ch-axis" x1="${L}" x2="${L}" y1="${Tp}" y2="${Tp + PH}"/>`;
  const band = PW / cats.length;
  if (ch.kind === 'line') {
    const xp = i => L + band * (i + 0.5);
    cats.forEach((c, i) => g += `<text class="ch-t" x="${xp(i)}" y="${Tp + PH + 20}" text-anchor="middle">${esc(c)}</text>`);
    series.forEach((s, k) => {
      const col = CH_COL[k % 4];
      g += `<polyline fill="none" style="stroke:${col}" stroke-width="2.4" stroke-linejoin="round" ${CH_DASH[k % 4] ? `stroke-dasharray="${CH_DASH[k % 4]}"` : ''} points="${s.values.map((v, i) => `${xp(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
      s.values.forEach((v, i) => g += chMarker(CH_MARK[k % 4], +xp(i).toFixed(1), +y(v).toFixed(1), col));
    });
  } else {
    const k = series.length, inner = band * (k > 1 ? 0.74 : 0.56), bw = inner / k;
    cats.forEach((c, i) => {
      const x0 = L + band * i + (band - inner) / 2;
      series.forEach((s, j) => {
        const v = s.values[i], yy = y(v), col = CH_COL[(k > 1 ? j : i % 1) % 4];
        g += `<rect x="${(x0 + bw * j + 1).toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(Tp + PH - yy).toFixed(1)}" rx="3" style="fill:${col}" fill-opacity="${k > 1 ? (j ? .9 : .55) : .85}"/>`;
        g += `<text class="ch-t" x="${(x0 + bw * j + bw / 2).toFixed(1)}" y="${(yy - 6).toFixed(1)}" text-anchor="middle">${v}</text>`;
      });
      g += `<text class="ch-t" x="${L + band * (i + .5)}" y="${Tp + PH + 20}" text-anchor="middle">${esc(c)}</text>`;
    });
  }
  if (legend) {
    const items = series.map((s, k) => ({ s, k, w: 42 + s.name.length * 6.6 }));
    let x = (W - items.reduce((a, b) => a + b.w + 14, -14)) / 2; const ly = H - 18;
    items.forEach(({ s, k, w }) => {
      const col = CH_COL[k % 4];
      if (ch.kind === 'line') g += `<line x1="${x}" x2="${x + 28}" y1="${ly}" y2="${ly}" style="stroke:${col}" stroke-width="2.4" ${CH_DASH[k % 4] ? `stroke-dasharray="${CH_DASH[k % 4]}"` : ''}/>` + chMarker(CH_MARK[k % 4], x + 14, ly, col);
      else g += `<rect x="${x + 6}" y="${ly - 7}" width="16" height="14" rx="3" style="fill:${col}" fill-opacity="${k ? .9 : .55}"/>`;
      g += `<text class="ch-t" x="${x + 34}" y="${ly + 4}">${esc(s.name)}</text>`; x += w + 14;
    });
  }
  const head = [ch.kind === 'line' ? '' : (lang === 'ru' ? 'Категория' : 'Category'), ...(ch.kind === 'bar' ? [ch.unit || ''] : series.map(s => s.name))];
  const rows = cats.map((c, i) => [c, ...series.map(s => s.values[i])]);
  const label = `${ch.title}${ch.unit ? ` (${ch.unit})` : ''}`;
  return `<figure class="chart"><div class="svgw"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" focusable="false">${g}</svg></div>${srTable(label, head, rows)}${cap}</figure>`;
}

/* ---------- drafts ---------- */
const Drafts = {
  all() { const v = store.get(SK.drafts, {}); return v && typeof v === 'object' ? v : {}; },
  get(k) { return (this.all()[k] || {}).text || ''; },
  set(k, text) { const a = this.all(); if (text && text.trim()) a[k] = { text, at: Date.now() }; else delete a[k]; store.set(SK.drafts, a); }
};
const ulHtml = arr => `<ul class="dash">${arr.map(x => `<li>${md(x)}</li>`).join('')}</ul>`;
const tblHtml = tb => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${tb.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${tb.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${md(c)}</td>` : `<th scope="row">${md(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function checklistHtml(list, open) {
  return `<details class="disc checklist"${open ? ' open' : ''}><summary>${ic('checklist')} ${T('writing.checklist')}</summary><div class="dc">${list.map((c, ci) => `<div class="cl-group"><h4>${esc(c.criterion)}</h4>${c.items.map((x, xi) => `<label class="chk"><input type="checkbox" data-cl="${ci}-${xi}"><span>${md(x)}</span></label>`).join('')}</div>`).join('')}</div></details>`;
}
const finishLabel = () => lang === 'ru' ? 'Завершить' : 'Finish';
const againLabel = () => lang === 'ru' ? 'Продолжить работу' : 'Keep working';

/* ---------- Writing player ---------- */
function writingPlayer(task, { mode = 'practice', embedded = false, save = true, timerEl = null } = {}) {
  const P = uid('w'), exam = mode === 'exam', ru = lang === 'ru';
  const el = document.createElement('div'); el.className = 'player wr';
  const parts = task.parts;
  let finished = false, lastRes = null, timer = null, startT = Date.now(), started = false;
  const dk = p => p.draftKey || `${task.id}:${p.id}`;
  const short = p => p.short || (lang === 'ru' ? (p.id === 't2' ? 'Задание 2' : p.id === 't1gt' ? 'Задание 1 · GT' : 'Задание 1') : (p.id === 't2' ? 'Task 2' : p.id === 't1gt' ? 'Task 1 · GT' : 'Task 1'));
  const help = p => {
    const out = [];
    if (p.plan) out.push([ic('map'), T('writing.plan'), tblHtml(p.plan)]);
    if (p.structure) out.push([ic('layers'), esc(ru ? 'Структура' : 'Structure'), ulHtml(p.structure)]);
    if (p.vocabulary) out.push([ic('library'), esc(ru ? 'Лексика' : 'Vocabulary'), tblHtml(p.vocabulary)]);
    if (p.useful) out.push([ic('chat'), T('writing.useful'), ulHtml(p.useful)]);
    if (p.ideas) out.push([ic('bulb'), T('writing.ideas'), ulHtml(p.ideas)]);
    return out.map(([e, h, b]) => `<details class="disc"><summary>${e} ${h}</summary><div class="dc">${b}</div></details>`).join('');
  };
  const partHtml = (p, i) => `<section class="wpart" data-wp="${p.id}"${i ? ' hidden' : ''} aria-label="${esc(p.label)}">
    <div class="prompt"><div class="row" style="margin-bottom:12px"><span class="lp">${esc(p.label)}</span><span class="lp">${ic('clock')} ${p.minutes} ${T('common.min')}</span><span class="lp">≥ ${p.minWords} ${T('writing.words')}</span></div><p style="margin:0">${md(p.instructions)}</p></div>
    ${p.chart ? chartHtml(p.chart, p.caption) : ''}
    <div data-help${exam ? ' hidden' : ''}>${help(p)}</div>
    <div class="wbox"><label class="field" for="${P}-${p.id}">${esc(ru ? 'Твой текст' : 'Your answer')}</label><textarea class="inp" id="${P}-${p.id}" data-wt="${p.id}" lang="en" spellcheck="false" autocapitalize="sentences"></textarea>
      <div class="wbar" aria-hidden="true"><i></i></div>
      <div class="wcount"><span><b data-wc>0</b> ${T('writing.words')} · ${T('writing.min')} ${p.minWords}</span><span data-wmsg aria-live="polite"></span><span class="row" style="gap:10px">${exam ? '' : '<span class="faint" data-saved></span>'}<span class="timer-chip" data-pt role="timer" title="${esc(short(p))}">${ic('clock')}<span class="tv">${fmt(p.minutes * 60)}</span></span></span></div></div>
    <div class="check-bar">${p.model ? `<button type="button" class="pill pill-outline" data-act="model"${exam ? ' hidden' : ''}>${T('writing.model')}</button>` : ''}${exam ? '' : `<button type="button" class="pill pill-glass" data-act="clear">${ic('trash')} ${T('writing.clear')}</button>`}</div>
    <div data-model></div></section>`;
  const tipsHtml = task.tips && task.tips.length ? `<details class="disc tips"${task.level === 'A' && !exam ? ' open' : ''}><summary>${ic('bulb')} ${T('task.tips')}</summary><div class="dc"><ul class="dash tip-list">${task.tips.map(x => `<li>${md(x)}</li>`).join('')}</ul></div></details>` : '';
  const multi = parts.length > 1;
  el.innerHTML = `${tipsHtml}${multi ? tabsHtml(P + 't', parts.map(p => ({ id: p.id, html: esc(short(p)) })), parts[0].id, 'Writing tasks') : ''}
  <div id="${P}t-panel"${multi ? ' role="tabpanel"' : ''}>${parts.map(partHtml).join('')}</div>
  ${checklistHtml(D.collection.checklists.writing, false)}
  <div class="check-bar"><button type="button" class="pill pill-white" data-act="finish">${ic('check')} <span data-fl>${esc(finishLabel())}</span></button><button type="button" class="pill pill-glass" data-act="again" hidden>${ic('replay')} ${esc(againLabel())}</button></div><div data-res></div>`;
  if (multi) bindTabs($('.tabs', el), id => $$('[data-wp]', el).forEach(s => s.hidden = s.dataset.wp !== id));
  const st = {};
  const upd = s => {
    const n = countWords(s.ta.value), min = s.p.minWords;
    $('[data-wc]', s.sec).textContent = n;
    const bar = $('.wbar', s.sec); bar.classList.toggle('done', n >= min); $('i', bar).style.width = Math.min(100, n / min * 100) + '%';
    $('[data-wmsg]', s.sec).innerHTML = n >= min ? `<span class="ok">${ic('check')}${esc(t('writing.ok'))}</span>` : n ? esc(t('writing.short', { n: min })) : '';
  };
  const begin = () => { if (started) return; started = true; startT = Date.now(); if (timer && !timer.started) timer.start(); };
  parts.forEach(p => {
    const sec = $(`[data-wp="${p.id}"]`, el), ta = $('textarea', sec);
    const s = st[p.id] = { p, sec, ta };
    s.timer = new Timer({ el: $('[data-pt]', sec), seconds: p.minutes * 60, onEnd: () => toast(ru ? `Рекомендованное время на ${short(p)} закончилось` : `The recommended time for ${short(p)} is over`) });
    if (!exam) ta.value = Drafts.get(dk(p));
    s.save = debounce(() => { if (finished && exam) return; Drafts.set(dk(p), ta.value); const sv = $('[data-saved]', sec); if (sv) { sv.textContent = t('writing.autosaved'); clearTimeout(s.svT); s.svT = setTimeout(() => { sv.textContent = ''; }, 1800); } }, 600);
    ta.addEventListener('input', () => { upd(s); begin(); if (!finished) s.timer.start(); if (!exam) s.save(); });
    upd(s);
  });
  async function showModel(s) {
    const box = $('[data-model]', s.sec), p = s.p;
    if (box.innerHTML) { box.innerHTML = ''; return; }
    if (!finished && countWords(s.ta.value) < p.minWords && !(await confirmDlg(ru ? 'Лучше сначала написать свой текст. Всё равно показать образец?' : 'It is better to write your own text first. Show the model answer anyway?'))) return;
    const words = p.model.reduce((a, x) => a + countWords(plain(x)), 0);
    box.innerHTML = `<div class="model"><div class="kicker" style="margin-bottom:10px">${T('writing.model')} · ${words} ${T('writing.words')}</div>${p.model.map(x => `<p>${md(x)}</p>`).join('')}</div>`;
  }
  function finish(silent = false) {
    if (finished) return lastRes;
    finished = true; timer && timer.stop(); Object.values(st).forEach(s => { s.timer.pause(); if (exam) s.ta.readOnly = true; else Drafts.set(dk(s.p), s.ta.value); });
    const words = Object.fromEntries(parts.map(p => [p.id, countWords(st[p.id].ta.value)]));
    const met = parts.filter(p => words[p.id] >= p.minWords).length;
    const cls = $$('[data-cl]', el), ck = cls.filter(c => c.checked).length;
    const seconds = Math.round(timer ? timer.elapsed() : (Date.now() - startT) / 1000);
    const pct = Math.round(met / parts.length * 100);
    lastRes = { kind: 'W', taskId: task.id, mode, score: met, total: parts.length, percent: pct, seconds, extra: { words, selfCheck: ck, selfTotal: cls.length } };
    $$('[data-help]', el).forEach(h => h.hidden = false); $$('[data-act=model]', el).forEach(b => b.hidden = false);
    $('[data-act=finish]', el).hidden = true; $('[data-act=again]', el).hidden = exam;
    $('[data-res]', el).innerHTML = `<div class="glass score-card" role="status">${ring(pct)}<div class="txt"><div class="kicker">${esc(ru ? 'Итог' : 'Summary')}</div><div class="big-num">${met} / ${parts.length}</div><p>${parts.map(p => `${esc(short(p))}: <strong>${words[p.id]}</strong> / ${p.minWords} ${words[p.id] >= p.minWords ? `<span class="res-st ok">${ic('check')}</span>` : `<span class="res-st bad">${ic('x')}</span>`}`).join(' · ')}</p><p>${T('writing.checklist')}: ${ck} / ${cls.length} · ${fmt(seconds)}</p><p class="faint">${esc(ru ? 'Письмо не проверяется автоматически: сравни свой текст с образцом и пройди самопроверку по критериям.' : 'Writing is not marked automatically: compare your text with the model answer and go through the self-check.')}</p></div></div>`;
    if (save && !silent) Progress.add(lastRes);
    if (!silent) { announce(ru ? 'Готово' : 'Finished'); if (!embedded) $('[data-res]', el).scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); }
    return lastRes;
  }
  function again() { finished = false; lastRes = null; $('[data-res]', el).innerHTML = ''; $('[data-act=finish]', el).hidden = false; $('[data-act=again]', el).hidden = true; }
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || !el.contains(b)) return;
    const sec = b.closest('[data-wp]'), s = sec && st[sec.dataset.wp];
    if (b.dataset.act === 'model' && s) showModel(s);
    if (b.dataset.act === 'clear' && s) confirmDlg(ru ? 'Удалить черновик?' : 'Delete this draft?').then(ok => { if (!ok) return; s.ta.value = ''; Drafts.set(dk(s.p), ''); upd(s); });
    if (b.dataset.act === 'finish') finish();
    if (b.dataset.act === 'again') again();
  });
  const totalMin = parts.reduce((a, p) => a + (p.minutes || 0), 0) || task.minutes || 60;
  const attachTimer = te => { if (!te) return; timer = new Timer({ el: te, seconds: exam ? totalMin * 60 : null, onEnd: () => { if (exam && !finished) { toast(t('task.timeUp')); finish(); } } }); if (exam) { timer.start(); started = true; } };
  attachTimer(timerEl);
  const anyText = () => Object.values(st).some(s => s.ta.value.trim());
  return {
    el, kind: 'W', task,
    check: silent => finish(silent), result: () => finish(true),
    isChecked: () => finished,
    dirty: () => !finished && exam && (anyText() || (timer && timer.running)),
    attachTimer,
    destroy: () => { timer && timer.destroy(); Object.values(st).forEach(s => { s.timer.destroy(); if (!exam && !(finished && exam)) Drafts.set(dk(s.p), s.ta.value); }); }
  };
}

/* ---------- Speaking player ---------- */
function speakingPlayer(task, { mode = 'practice', embedded = false, save = true, timerEl = null } = {}) {
  const P = uid('s'), exam = mode === 'exam', S = task.speaking, ru = lang === 'ru';
  const el = document.createElement('div'); el.className = 'player sp';
  const parts = ['part1', 'part2', 'part3'].filter(k => S[k]);
  let finished = false, lastRes = null, timer = null, startT = Date.now(), started = false, asked = 0;
  let rec = null, recChunks = [], recStream = null, recorded = false, phase = 'idle', phT = null;
  const urls = [];
  const samplesFor = n => (S.samples || []).filter(s => s.part === n).map(s => `<details class="disc" data-sample${exam ? ' hidden' : ''}><summary>${ic('wave')} ${T('speaking.sample')}: ${esc(s.title.replace(/^Part \d:\s*/, ''))}</summary><div class="dc prose">${s.paragraphs.map(x => `<p>${md(x)}</p>`).join('')}</div></details>`).join('');
  const usefulFor = arr => arr && arr.length ? `<details class="disc" data-useful${exam ? ' hidden' : ''}><summary>${ic('chat')} ${T('writing.useful')}</summary><div class="dc">${ulHtml(arr)}</div></details>` : '';
  const head = k => `<h2 class="grp-title" style="margin-bottom:8px">${esc(S[k].label)}</h2>`;
  const p1 = S.part1 ? `<section class="sp-part" data-sp="part1">${head('part1')}
    ${S.part1.instructions ? `<p class="instr">${md(S.part1.instructions)}</p>` : ''}
    ${tabsHtml(P + 'tp', S.part1.topics.map((tp, i) => ({ id: String(i), html: esc(tp.title) })), '0', 'Topics')}
    <div class="glass panel" id="${P}tp-panel" role="tabpanel" style="margin-top:14px">
      <div class="kicker" data-qcount style="margin-bottom:10px"></div>
      <div class="bubble" data-bubble aria-live="polite">${esc(ru ? 'Нажми «Задать вопрос» – экзаменатор прочитает вопрос вслух.' : 'Press “Ask next question” – the examiner will read it aloud.')}</div>
      <div class="phase"><button type="button" class="pill pill-white" data-act="ask">${ic('speaker')} ${esc(ru ? 'Задать вопрос' : 'Ask next question')}</button><button type="button" class="pill pill-outline" data-act="repeat" disabled>${ic('replay')} ${T('speaking.readAloud')}</button><span class="timer-chip" data-p1t role="timer" title="${esc(ru ? 'Около 30 секунд на ответ' : 'About 30 seconds per answer')}">${ic('clock')}<span class="tv">00:30</span></span></div>
      ${exam ? '' : `<details class="disc" style="margin:16px 0 0"><summary>${esc(ru ? 'Все вопросы темы' : 'All questions in this topic')}</summary><div class="dc"><ul class="dash" data-qall></ul></div></details>`}
    </div>
    ${S.part1.tip ? `<details class="disc" data-useful${exam ? ' hidden' : ''}><summary>${ic('bulb')} ${T('task.tips')}</summary><div class="dc">${ulHtml(S.part1.tip)}</div></details>` : ''}${samplesFor(1)}</section>` : '';
  const P2 = S.part2, c = P2 && P2.card;
  const prepS = (P2 && P2.prepSeconds) || 60, spkS = (P2 && P2.speakSeconds) || 120, tgtS = (P2 && P2.targetSeconds) || 60;
  const p2 = P2 ? `<section class="sp-part" data-sp="part2"${parts[0] === 'part2' ? '' : ' hidden'}>${head('part2')}
    <div class="cue"><div class="kicker" style="margin-bottom:10px">${esc(ru ? 'Карточка' : 'Task card')}</div><h3>${esc(c.topic)}</h3><p>${esc(c.say)}</p><ul class="dash">${c.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p>${esc(c.explain)}</p></div>
    ${P2.note ? `<p class="instr" style="margin-top:14px">${md(P2.note)}</p>` : ''}
    <label class="field" style="margin-top:14px">${T('speaking.notes')}<textarea class="inp" data-notes rows="4" style="min-height:110px"></textarea></label>
    <div class="glass panel" style="margin-top:18px">
      <div class="phase"><div><div class="kicker" data-phl>${T('speaking.prep')}</div><div class="big-num" data-pht><span class="tv">${fmt(prepS)}</span></div></div>
      <div class="row"><button type="button" class="pill pill-white" data-act="prep">${ic('clock')} ${T('speaking.startPrep')}</button><button type="button" class="pill pill-outline" data-act="speak">${ic('mic')} ${T('speaking.startSpeak')}</button><button type="button" class="pill pill-glass" data-act="rec" aria-pressed="false">${ic('mic')} ${T('speaking.record')}</button></div>
      <div class="pbar" aria-hidden="true"><i data-pbi></i><span class="mark" style="left:${(tgtS / spkS * 100).toFixed(1)}%"></span></div>
      <p class="faint" style="flex-basis:100%;margin:2px 0 0;font-size:12.5px">${esc(ru ? `Зелёная метка – ${tgtS} с: постарайся говорить хотя бы до неё.` : `Green mark – ${tgtS} s: try to keep talking at least until you reach it.`)}</p></div>
      <div data-rec-out></div><p class="audio-note" data-rec-note></p></div>
    ${usefulFor(P2.useful)}${samplesFor(2)}</section>` : '';
  const P3 = S.part3;
  const p3 = P3 ? `<section class="sp-part" data-sp="part3"${parts[0] === 'part3' ? '' : ' hidden'}>${head('part3')}
    <p class="instr">${P3.instructions ? md(P3.instructions) : esc(ru ? 'Дискуссия: отвечай развёрнуто – мнение, причина, пример, иногда другая точка зрения.' : 'Discussion: give extended answers – opinion, reason, example and sometimes the other side.')}</p>
    <ol class="qlist">${P3.questions.map((q, i) => `<li class="qi"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><button type="button" class="icon-btn" data-say3="${i}" aria-label="${esc(t('speaking.readAloud'))}" title="${esc(t('speaking.readAloud'))}">${ic('speaker')}</button><p style="margin:7px 0 0">${esc(q)}</p></div></li>`).join('')}</ol>
    ${usefulFor(P3.useful)}${samplesFor(3)}</section>` : '';
  el.innerHTML = `${parts.length > 1 ? tabsHtml(P + 'p', parts.map(k => ({ id: k, html: esc(S[k].label.split(':')[0]) })), parts[0], 'Speaking parts') : ''}
  <div id="${P}p-panel" role="tabpanel" style="margin-top:18px">${p1}${p2}${p3}</div>
  ${checklistHtml(D.collection.checklists.speaking, false)}
  <div class="check-bar"><button type="button" class="pill pill-white" data-act="finish">${ic('check')} ${esc(finishLabel())}</button><button type="button" class="pill pill-glass" data-act="again" hidden>${ic('replay')} ${esc(againLabel())}</button></div><div data-res></div>`;
  if (parts.length > 1) bindTabs($(`[data-tabs="${P}p"]`, el), id => { $$('[data-sp]', el).forEach(s => s.hidden = s.dataset.sp !== id); speech.stop(); });
  const begin = () => { if (started) return; started = true; startT = Date.now(); if (timer && !timer.started) timer.start(); };
  // part 1
  let topic = 0, qi = -1, curQ = '', p1t = null, p1tabs = null;
  if (S.part1) {
    const topics = S.part1.topics, bubble = $('[data-bubble]', el), rep = $('[data-act=repeat]', el);
    p1t = new Timer({ el: $('[data-p1t]', el), seconds: 30 });
    const draw = () => { const tp = topics[topic]; const qa = $('[data-qall]', el); if (qa) qa.innerHTML = tp.questions.map(q => `<li>${esc(q)}</li>`).join(''); $('[data-qcount]', el).textContent = `${tp.title} · ${Math.max(0, qi + 1)} / ${tp.questions.length}`; };
    p1tabs = bindTabs($(`[data-tabs="${P}tp"]`, el), id => { topic = +id; qi = -1; draw(); });
    draw();
    $('[data-act=ask]', el).addEventListener('click', () => {
      begin();
      if (qi + 1 >= topics[topic].questions.length) {
        if (topic + 1 < topics.length) { p1tabs.select(String(topic + 1)); }
        else { bubble.textContent = ru ? 'Часть 1 закончена. Переходи к следующей части.' : 'That is the end of Part 1. Move on to the next part.'; speech.say('Thank you. That is the end of Part 1.', 'male'); p1t.reset(30); return; }
      }
      qi++; curQ = topics[topic].questions[qi]; asked++;
      bubble.textContent = curQ; rep.disabled = false; draw();
      speech.say(curQ, 'male'); p1t.reset(30); p1t.start();
    });
    rep.addEventListener('click', () => curQ && speech.say(curQ, 'male'));
  }
  // part 2
  const stopPhase = () => { if (phT) { phT.destroy(); phT = null; } };
  const setPhase = (key) => { const l = $('[data-phl]', el); if (l) l.innerHTML = T(key); };
  const startSpeak = () => {
    stopPhase(); phase = 'speak'; begin(); setPhase('speaking.speak'); announce(t('speaking.speak'));
    const pbi = $('[data-pbi]', el);
    phT = new Timer({ el: $('[data-pht]', el), seconds: spkS, onTick: v => { pbi.style.width = ((spkS - v) / spkS * 100) + '%'; }, onEnd: () => { phase = 'done'; stopRec(); speech.say('Thank you.', 'male'); toast(ru ? 'Время вышло' : 'Time is up'); } });
    phT.start();
  };
  const startPrep = () => {
    stopPhase(); phase = 'prep'; begin(); setPhase('speaking.prep'); $('[data-pbi]', el).style.width = '0';
    phT = new Timer({ el: $('[data-pht]', el), seconds: prepS, onEnd: () => { speech.say('All right. Remember you have one to two minutes for this. Please start speaking now.', 'male'); startSpeak(); } });
    phT.start(); announce(t('speaking.prep'));
  };
  const setRecBtn = onn => { const b = $('[data-act=rec]', el); if (!b) return; b.setAttribute('aria-pressed', String(onn)); b.innerHTML = onn ? `<span class="rec-dot" aria-hidden="true"></span> ${T('speaking.stop')}` : `${ic('mic')} ${T('speaking.record')}`; };
  async function startRec() {
    const note = $('[data-rec-note]', el);
    if (!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext)) { note.textContent = t('speaking.noRec'); return; }
    try { recStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { note.textContent = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? t('speaking.micDenied') : (ru ? 'Микрофон недоступен: ' : 'The microphone is not available: ') + (e && (e.message || e.name)); return; }
    if (finished) { recStream.getTracks().forEach(x => x.stop()); return; }
    recChunks = [];
    const mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
    try { rec = new MediaRecorder(recStream, mt ? { mimeType: mt } : undefined); } catch (e) { note.textContent = t('speaking.noRec'); return; }
    rec.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
    rec.onstop = () => {
      const type = (rec && rec.mimeType) || mt || 'audio/webm'; const blob = new Blob(recChunks, { type }); const url = URL.createObjectURL(blob); urls.push(url); recorded = true;
      const ext = /mp4/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm';
      const out = $('[data-rec-out]', el); if (out) out.innerHTML = `<div class="kicker" style="margin-top:16px">${T('speaking.playback')}</div><audio controls src="${url}"></audio><div class="row" style="margin-top:8px"><a class="pill pill-sm pill-glass" href="${url}" download="BandUp-speaking-${esc(task.id)}.${ext}">${ic('download')} ${esc(ru ? 'Скачать' : 'Download')}</a></div>`;
      if (recStream) recStream.getTracks().forEach(x => x.stop()); recStream = null; setRecBtn(false);
    };
    rec.start(); setRecBtn(true); note.textContent = ''; begin();
  }
  function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); else if (recStream) { recStream.getTracks().forEach(x => x.stop()); recStream = null; } }
  // part 3
  $$('[data-say3]', el).forEach(b => b.addEventListener('click', () => { begin(); asked++; speech.say(P3.questions[+b.dataset.say3], 'male'); }));
  function finish(silent = false) {
    if (finished) return lastRes;
    finished = true; stopPhase(); stopRec(); speech.stop(); timer && timer.stop(); p1t && p1t.pause();
    const cls = $$('[data-cl]', el), ck = cls.filter(x => x.checked).length;
    const seconds = Math.round(timer ? timer.elapsed() : (Date.now() - startT) / 1000);
    const pct = cls.length ? Math.round(ck / cls.length * 100) : 0;
    lastRes = { kind: 'S', taskId: task.id, mode, score: ck, total: cls.length, percent: pct, seconds, extra: { recorded, asked } };
    $$('[data-sample],[data-useful]', el).forEach(x => x.hidden = false);
    $('[data-act=finish]', el).hidden = true; $('[data-act=again]', el).hidden = exam;
    $('[data-res]', el).innerHTML = `<div class="glass score-card" role="status">${ring(pct)}<div class="txt"><div class="kicker">${T('writing.checklist')}</div><div class="big-num">${ck} / ${cls.length}</div><p>${esc(ru ? `Вопросов прозвучало: ${asked}` : `Questions asked: ${asked}`)}${recorded ? ' · ' + esc(ru ? 'есть запись' : 'recording made') : ''} · ${fmt(seconds)}</p><p class="faint">${esc(ru ? 'Устная часть не оценивается автоматически: прослушай запись, сравни с образцом и отметь пункты самопроверки.' : 'Speaking is not marked automatically: listen to your recording, compare it with the sample and tick the self-check.')}</p></div></div>`;
    if (save && !silent) Progress.add(lastRes);
    if (!silent) { announce(ru ? 'Готово' : 'Finished'); if (!embedded) $('[data-res]', el).scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); }
    return lastRes;
  }
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || !el.contains(b)) return;
    const a = b.dataset.act;
    if (a === 'prep') startPrep();
    if (a === 'speak') { speech.stop(); startSpeak(); }
    if (a === 'rec') { if (rec && rec.state === 'recording') stopRec(); else startRec(); }
    if (a === 'finish') finish();
    if (a === 'again') { finished = false; lastRes = null; $('[data-res]', el).innerHTML = ''; $('[data-act=finish]', el).hidden = false; b.hidden = true; }
  });
  const attachTimer = te => { if (!te) return; timer = new Timer({ el: te, seconds: exam ? (task.minutes || 14) * 60 : null, onEnd: () => { if (exam && !finished) { toast(t('task.timeUp')); finish(); } } }); };
  attachTimer(timerEl);
  return {
    el, kind: 'S', task,
    check: silent => finish(silent), result: () => finish(true), isChecked: () => finished,
    dirty: () => !finished && (phase === 'prep' || phase === 'speak' || !!(rec && rec.state === 'recording') || (exam && started)),
    attachTimer,
    destroy: () => { stopPhase(); try { stopRec(); } catch (e) { } speech.stop(); p1t && p1t.destroy(); timer && timer.destroy(); setTimeout(() => urls.forEach(u => URL.revokeObjectURL(u)), 0); }
  };
}

/* ---------- pseudo tasks from banks ---------- */
function wTaskFrom(it) {
  if (it.task) { const tk = TASK[it.task]; const p = tk.parts.find(x => x.id === it.part) || tk.parts[0]; return { id: tk.id, level: tk.level, skill: 'W', code: tk.code, title: tk.title, tips: tk.tips, parts: [{ ...p, short: it.t === 'w2' ? 'Task 2' : 'Task 1' }] }; }
  const b = (it.t === 'w1' ? D.banks.writingTask1 : D.banks.writingTask2).find(x => x.id === it.bank);
  if (!b) return null;
  const label = it.t === 'w2' ? 'Task 2: an essay' : b.type === 'letter' ? 'Task 1 (General Training): a letter' : `Task 1 (Academic): ${b.chart.kind === 'table' ? 'a table' : b.chart.kind === 'line' ? 'a line graph' : 'a bar chart'}`;
  return { id: 'bank:' + b.id, level: b.level, skill: 'W', code: it.t === 'w2' ? 'W2' : 'W1', title: label, parts: [{ ...b, id: b.id, label, draftKey: 'bank:' + b.id, short: it.t === 'w2' ? 'Task 2' : 'Task 1' }] };
}
function spTaskFrom(it) {
  const B = D.banks;
  const topics = (it.p1 || []).map(n => B.speakingPart1.find(x => x.title === n)).filter(Boolean);
  const c = B.speakingPart2.find(x => x.id === it.card) || B.speakingPart2[0];
  const tgt = c.level === 'C' ? 110 : c.level === 'B' ? 90 : 60, ru = lang === 'ru';
  const sp = {
    part2: { label: ru ? 'Часть 2: монолог' : 'Part 2: the long turn', card: { topic: c.topic, say: c.say, points: c.points, explain: c.explain }, note: ru ? 'На подготовку даётся **одна минута**, можно делать заметки. Затем говорите **от одной до двух минут**.' : 'You have **one minute** to prepare and can make notes. Then speak for **one to two minutes**.', prepSeconds: 60, speakSeconds: 120, targetSeconds: tgt },
    part3: { label: ru ? 'Часть 3: обсуждение' : 'Part 3: discussion', questions: c.part3 }
  };
  if (topics.length) sp.part1 = { label: ru ? 'Часть 1: знакомство и интервью' : 'Part 1: introduction and interview', instructions: ru ? 'Отвечайте на каждый вопрос **2–4 предложениями**: ответ + причина + пример.' : 'Answer each question in **2–4 sentences**: answer + reason + example.', topics };
  return { id: 'sp:' + c.id, level: c.level, skill: 'S', code: 'S', title: c.topic.replace(/\.$/, ''), minutes: 14, speaking: { part1: sp.part1, part2: sp.part2, part3: sp.part3 } };
}
function randomSpItem(level, rng = Math.random, p1n = 2) {
  const pool = D.banks.speakingPart2.filter(c => !level || c.level === level);
  return { t: 'sp', card: pickOne(pool.length ? pool : D.banks.speakingPart2, rng).id, p1: sample(D.banks.speakingPart1, p1n, rng).map(x => x.title) };
}

/* ---------- task page ---------- */
function makeTaskPlayer(tk, opts) { return (tk.skill === 'W' ? writingPlayer : tk.skill === 'S' ? speakingPlayer : lrPlayer)(tk, opts); }
route(/^\/practice\/([A-C]-[LRWS])$/, (v, [id], q) => {
  const tk = TASK[id]; if (!tk) return notFound(v);
  const mode = q.get('mode') === 'exam' ? 'exam' : 'practice', ru = lang === 'ru';
  const hints = {
    L: t('task.examHint'),
    R: ru ? 'Режим экзамена: строгий таймер, показать ответы нельзя, проверка – в конце.' : 'Exam mode: a strict timer, answers cannot be revealed and are checked at the end.',
    W: ru ? 'Режим экзамена: строгий таймер, подсказки и образцы скрыты до конца, когда время выходит, текст блокируется.' : 'Exam mode: a strict timer, help and model answers are hidden until you finish, and the text locks when time is up.',
    S: ru ? 'Режим экзамена: подсказки и образцы ответов скрыты до конца.' : 'Exam mode: useful language and sample answers are hidden until you finish.'
  };
  const i = D.tasks.indexOf(tk), prev = D.tasks[i - 1], next = D.tasks[i + 1];
  const tm = tk.minutes ? `${tk.minutes} ${t('common.min')}` : t('common.noLimit');
  v.innerHTML = `<div class="page task-page lv-${tk.level}"><div class="task-head"><div class="left"><a class="back" href="#/practice?level=${tk.level}">${ic('back')} ${T('practice.title')}</a>
    <div class="row">${levelPill(tk.level)}${skillPill(tk.skill)}<span class="lp">${esc(tk.code)}</span><span class="lp">${ic('clock')} ${esc(tm)}</span></div>
    <h1 class="page-title display" tabindex="-1"><span class="grad">${esc(tk.title)}</span></h1><p class="page-sub" style="margin:0">${esc(tk.part)}</p></div>
    <div class="right"><div class="seg" role="group" aria-label="${esc(tr('Mode', 'Режим'))}"><button type="button" data-mode="practice" aria-pressed="${mode === 'practice'}">${T('task.practice')}</button><button type="button" data-mode="exam" aria-pressed="${mode === 'exam'}">${T('task.exam')}</button></div>${timerChip()}</div></div>
    ${mode === 'exam' ? `<p class="mode-hint">${ic('alert')} ${esc(hints[tk.skill])}</p>` : ''}<div class="lightline"><i></i></div><div data-player></div>
    <nav class="runner-nav" aria-label="${esc(tr('Tasks', 'Задания'))}">${prev ? `<a class="pill pill-outline" href="#/practice/${prev.id}">${ic('back')} ${esc(prev.code)} ${SKILL[prev.skill].icon}</a>` : '<span></span>'}${next ? `<a class="pill pill-outline" href="#/practice/${next.id}">${esc(next.code)} ${SKILL[next.skill].icon} ${ic('arrow')}</a>` : ''}</nav></div>`;
  const pl = makeTaskPlayer(tk, { mode, timerEl: $('.task-head .timer-chip', v) });
  $('[data-player]', v).appendChild(pl.el);
  $$('[data-mode]', v).forEach(b => b.addEventListener('click', () => { if (b.dataset.mode !== mode) location.hash = `#/practice/${id}${b.dataset.mode === 'exam' ? '?mode=exam' : ''}`; }));
  leaveGuard = () => pl.dirty();
  onCleanup(() => pl.destroy());
  return { title: `${tk.code} ${tk.title}`, nav: 'practice' };
});

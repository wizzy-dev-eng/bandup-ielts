/* ---------- T/F/NG trainer ---------- */
const TF_OPTS = ['TRUE', 'FALSE', 'NOT GIVEN'];
function tfngPlayer(ids, { list = false, save = true, embedded = false } = {}) {
  const P = uid('tf'), ru = lang === 'ru', all = D.drills.tfng.items;
  const items = ids && ids.length ? ids.map(id => all.find(x => x.id === id)).filter(Boolean) : shuffle(all);
  const el = document.createElement('div'); el.className = 'player drill';
  let checked = false, lastRes = null, idx = 0, score = 0, answered = 0, startT = Date.now();
  const fbHtml = (it, a) => { const st = !a ? 'empty' : a === it.answer ? 'ok' : 'bad'; return { st, html: `<div class="fb ${st}"><span class="st">${ST_IC[st]} ${T(ST_KEY[st])}</span><span class="muted">${esc(ru ? 'Ответ' : 'Answer')}: <span class="ans">${it.answer}</span></span><div class="why" style="flex-basis:100%">${md(it.why)}</div></div>` }; };
  const choice = (it, i) => `<div class="choice" role="radiogroup" aria-label="${esc(it.statement)}">${TF_OPTS.map(o => `<label class="opt"><input type="radio" name="${P}-${i}" value="${o}"><span>${o}</span></label>`).join('')}</div>`;
  const rule = `<details class="disc"><summary>${ic('ruler')} ${esc(ru ? 'Правило' : 'The rule')}</summary><div class="dc"><p>${md(D.drills.tfng.rule)}</p></div></details>`;
  const res = (sc, tot) => { const pct = Math.round(sc / tot * 100); return { kind: 'drill', taskId: 'drill:tfng', mode: 'practice', score: sc, total: tot, percent: pct, seconds: Math.round((Date.now() - startT) / 1000), extra: {} }; };
  if (list) {
    el.innerHTML = `${rule}<ol class="qlist">${items.map((it, i) => `<li class="qi glass panel" data-i="${i}" style="margin-top:14px"><p class="faint" style="margin:0">${md(it.text)}</p><p class="stmt" style="margin:12px 0"><b class="qn">${i + 1}</b>${md(it.statement)}</p>${choice(it, i)}<div class="qfb"></div></li>`).join('')}</ol>
      <div class="check-bar"><button type="button" class="pill pill-white" data-act="check">${ic('check')} ${T('task.check')}</button></div><div data-score></div>`;
    const check = (silent = false) => {
      if (checked) return lastRes; checked = true; let sc = 0;
      items.forEach((it, i) => { const r = $(`input[name="${P}-${i}"]:checked`, el), a = r ? r.value : ''; const f = fbHtml(it, a); if (f.st === 'ok') sc++; $(`[data-i="${i}"] .qfb`, el).innerHTML = f.html; $$(`input[name="${P}-${i}"]`, el).forEach(x => { x.disabled = true; const lab = x.closest('.opt'); if (x.value === it.answer) lab.classList.add('ok'); else if (x.checked) lab.classList.add('bad'); }); });
      lastRes = res(sc, items.length); const pct = lastRes.percent;
      $('[data-score]', el).innerHTML = `<div class="glass score-card" role="status">${ring(pct)}<div class="txt"><div class="kicker">${T('task.score')}</div><div class="big-num">${sc} / ${items.length}</div></div></div>`;
      $('[data-act=check]', el).hidden = true; if (save && !silent) Progress.add(lastRes); return lastRes;
    };
    el.addEventListener('click', e => { if (e.target.closest('[data-act=check]')) check(); });
    return { el, kind: 'drill', check, result: () => check(true), isChecked: () => checked, dirty: () => !checked && !!$('input:checked', el), destroy() { } };
  }
  const draw = () => {
    if (idx >= items.length) {
      checked = true; lastRes = res(score, items.length); if (save) Progress.add(lastRes);
      el.innerHTML = `<div class="glass drill-card" role="status"><div class="score-card" style="padding:0;border:0;background:none">${ring(lastRes.percent)}<div class="txt"><div class="kicker">${T('task.score')}</div><div class="big-num">${score} / ${items.length}</div><p>${esc(ru ? 'Правило: TRUE – текст говорит то же самое; FALSE – противоречит; NOT GIVEN – информации нет.' : 'Remember: TRUE – the text says the same; FALSE – it says the opposite; NOT GIVEN – there is no information.')}</p></div></div><div class="drill-nav"><span></span><button type="button" class="pill pill-white" data-act="restart">${ic('replay')} ${T('task.reset')}</button></div></div>`;
      return;
    }
    const it = items[idx];
    el.innerHTML = `${rule}<div class="glass drill-card" aria-live="polite"><div class="row between"><span class="kicker">${idx + 1} / ${items.length}</span><span class="lp ok">${ic('check')} ${score}</span></div>
      <p style="margin:16px 0 0;color:var(--muted)">${md(it.text)}</p><p class="stmt">${md(it.statement)}</p>${choice(it, 0)}<div class="qfb" data-fb></div>
      <div class="drill-nav"><button type="button" class="pill pill-outline" data-act="check">${ic('check')} ${T('task.check')}</button><button type="button" class="pill pill-white" data-act="next" hidden>${T('drill.new')} ${ic('arrow')}</button></div></div>`;
  };
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'check') {
      const it = items[idx], r = $(`input[name="${P}-0"]:checked`, el); if (!r) { toast(ru ? 'Выбери ответ' : 'Choose an answer'); return; }
      const f = fbHtml(it, r.value); if (f.st === 'ok') score++; answered++;
      $('[data-fb]', el).innerHTML = f.html; $$(`input[name="${P}-0"]`, el).forEach(x => { x.disabled = true; const lab = x.closest('.opt'); if (x.value === it.answer) lab.classList.add('ok'); else if (x.checked) lab.classList.add('bad'); });
      b.hidden = true; const nx = $('[data-act=next]', el); nx.hidden = false; nx.focus();
    }
    if (b.dataset.act === 'next') { idx++; draw(); const f = $('input', el) || $('[data-act=restart]', el); f && f.focus(); }
    if (b.dataset.act === 'restart') { idx = 0; score = 0; answered = 0; checked = false; startT = Date.now(); items.splice(0, items.length, ...shuffle(items)); draw(); }
  });
  draw();
  return { el, kind: 'drill', check: () => lastRes, result: () => lastRes || res(score, Math.max(answered, 1)), isChecked: () => checked, dirty: () => false, destroy() { } };
}

/* ---------- dictation generator ---------- */
const DIG = ['oh', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const sayDigits = s => { const out = []; for (let i = 0; i < s.length; i++) { if (s[i + 1] === s[i] && s[i + 2] !== s[i]) { out.push('double ' + DIG[+s[i]]); i++; } else out.push(DIG[+s[i]]); } return out.join(', '); };
const ordinal = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const DICT_KIND = { spelling: ['Spelling', 'Имена'], phone: ['Phone', 'Телефон'], price: ['Price', 'Цена'], date: ['Date', 'Дата'], time: ['Time', 'Время'], postcode: ['Postcode', 'Индекс'] };
const kindName = k => (DICT_KIND[k] || [k, k])[lang === 'ru' ? 1 : 0];
function dictGen(kind, r) {
  const d = D.drills.dictation, ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  if (kind === 'spelling') {
    const name = pickOne(d.names, r);
    if (r() < 0.4) { const st = pickOne(d.streets, r); const ans = `${name} ${st}`; return { kind, answer: ans, say: `I live on ${ans}. That's ${name.toUpperCase().split('').join('-')}, ${st}.`, judge: a => { const x = norm(a), y = norm(ans); return !x ? 'empty' : x === y ? 'ok' : lev(x, y) === 1 ? 'almost' : 'bad'; } }; }
    return { kind, answer: name, say: `My surname is ${name}. That's ${name.toUpperCase().split('').join('-')}.`, judge: a => { const x = norm(a), y = norm(name); return !x ? 'empty' : x === y ? 'ok' : lev(x, y) === 1 ? 'almost' : 'bad'; } };
  }
  if (kind === 'phone') {
    const num = d.phonePattern.replace(/#/g, () => String(ri(0, 9)));
    return { kind, answer: num, say: `My phone number is ${num.split(' ').map(sayDigits).join('... ')}.`, judge: a => { const x = String(a).replace(/\D/g, ''); return !x ? 'empty' : x === num.replace(/\D/g, '') ? 'ok' : lev(x, num.replace(/\D/g, '')) === 1 ? 'almost' : 'bad'; } };
  }
  if (kind === 'price') {
    const p = ri(d.priceRange[0], d.priceRange[1]), pc = pickOne([0, 0, 50, 25, 75, 99, 20, 45, 95], r), val = p + pc / 100;
    const ans = '£' + (pc ? val.toFixed(2) : String(p));
    return { kind, answer: ans, say: `The ticket costs ${p} pound${p === 1 ? '' : 's'}${pc ? ' ' + pc : ''}.`, judge: a => { const s = String(a).trim(); if (!s) return 'empty'; const m = s.replace(/,/g, '.').replace(/[£\s]|pounds?/gi, '').match(/^(\d+)(?:\.(\d{1,2}))?$/); if (!m) return 'bad'; const v = +m[1] + (m[2] ? +(m[2].length === 1 ? m[2] + '0' : m[2]) / 100 : 0); return Math.abs(v - val) < 0.001 ? 'ok' : 'bad'; } };
  }
  if (kind === 'date') {
    const day = ri(1, 28), mi = ri(0, 11), mon = d.months[mi];
    return { kind, answer: `${day} ${mon}`, say: `The course starts on the ${ordinal(day)} of ${mon}.`, judge: a => {
      const s = String(a).toLowerCase().trim(); if (!s) return 'empty';
      const nums = (s.match(/\d+/g) || []).map(Number);
      const words = s.replace(/\d+(st|nd|rd|th)?/g, ' ').replace(/\b(of|the)\b/g, ' ').match(/[a-z]+/g) || [];
      if (words.length) { const w = words[0], full = mon.toLowerCase(); if (nums[0] !== day) return 'bad'; if (w.length >= 3 && full.startsWith(w)) return 'ok'; return w[0] === full[0] && lev(w, full) <= 2 ? 'almost' : 'bad'; }
      return nums.length >= 2 && nums[0] === day && nums[1] === mi + 1 ? 'ok' : 'bad';
    } };
  }
  if (kind === 'time') {
    const pm = r() < 0.5, h = pm ? ri(1, 9) : ri(6, 11), m = pickOne([0, 15, 30, 45, 10, 20, 40, 50, 5], r);
    const nh = h % 12 + 1;
    const phrase = m === 0 ? `${h} o'clock` : m === 15 ? `a quarter past ${h}` : m === 30 ? `half past ${h}` : m === 45 ? `a quarter to ${nh}` : `${h} ${m < 10 ? 'oh ' + m : m}`;
    const ans = `${h}:${String(m).padStart(2, '0')} ${pm ? 'pm' : 'am'}`;
    return { kind, answer: ans, say: `The ${pm ? 'evening' : 'morning'} train leaves at ${phrase}.`, judge: a => {
      const s = String(a).toLowerCase().trim(); if (!s) return 'empty';
      const mt = s.match(/(\d{1,2})\s*[:.]\s*(\d{2})/) || s.match(/^(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)?$/);
      if (!mt) return 'bad'; let hh = +mt[1]; const mm = mt[2] && /\d/.test(mt[2]) ? +mt[2] : 0;
      if (hh > 12) { if (!pm) return 'bad'; hh -= 12; }
      if (/\b(am|a\.m\.)/.test(s) && pm) return 'bad'; if (/\b(pm|p\.m\.)/.test(s) && !pm) return 'bad';
      return hh === h && mm === m ? 'ok' : 'bad';
    } };
  }
  // postcode
  const pat = pickOne(d.postcodePatterns, r), L = d.postcodeLetters;
  const code = pat.split('').map(ch => ch === 'L' ? L[ri(0, L.length - 1)] : ch === 'N' ? String(ri(1, 9)) : ch).join('');
  const spoken = code.split(' ').map(g => g.split('').map(ch => /\d/.test(ch) ? DIG[+ch] : ch).join(', ')).join('... ');
  return { kind: 'postcode', answer: code, say: `The postcode is ${spoken}.`, judge: a => { const x = String(a).toUpperCase().replace(/\s/g, ''), y = code.replace(/\s/g, ''); return !x ? 'empty' : x === y ? 'ok' : lev(x, y) === 1 ? 'almost' : 'bad'; } };
}
function dictItems(kinds, n, seed) {
  const r = mulberry32(seed >>> 0); const ks = kinds && kinds.length ? kinds : D.drills.dictation.kinds;
  const order = []; while (order.length < n) order.push(...shuffle(ks, r)); return order.slice(0, n).map(k => dictGen(k, r));
}
function dictPlayer({ kinds, n = 6, seed = 1 } = {}, { save = true, embedded = false } = {}) {
  const P = uid('dc'), ru = lang === 'ru';
  const el = document.createElement('div'); el.className = 'player drill';
  const items = dictItems(kinds, n, seed);
  let checked = false, lastRes = null, startT = Date.now();
  const used = [...new Set(items.map(i => i.kind))];
  el.innerHTML = `<div class="glass panel"><p class="instr" style="margin-top:0">${esc(ru ? 'Нажми на динамик, послушай и запиши ответ. Можно слушать несколько раз.' : 'Press the speaker, listen and write the answer. You can listen more than once.')}</p>
    <div class="audio-note" data-note></div>
    ${items.map((it, i) => `<div class="dict-item" data-i="${i}"><button type="button" class="icon-btn" data-listen="${i}" aria-label="${esc(t('drill.listen'))} ${i + 1}">${ic('speaker')}</button><b class="qn">${i + 1}</b><span class="lp">${esc(kindName(it.kind))}</span><input class="inp" data-in="${i}" aria-label="${esc(t('drill.your'))} ${i + 1}" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="qfb"></div></div>`).join('')}
    <details class="disc" style="margin:16px 0 0"><summary>${ic('ruler')} ${esc(ru ? 'Как это звучит и что принимается' : 'How it is said and what is accepted')}</summary><div class="dc"><ul class="dash">${used.map(k => `<li><strong>${esc(kindName(k))}:</strong> ${esc(D.drills.dictation.rules[k])}</li>`).join('')}</ul></div></details></div>
    <div class="check-bar"><button type="button" class="pill pill-white" data-act="check">${ic('check')} ${T('task.check')}</button><button type="button" class="pill pill-glass" data-act="script" hidden>${ic('note')} ${T('task.transcript')}</button></div><div data-score></div><div data-script></div>`;
  if (!speech.supported || !speech.voices.length) $('[data-note]', el).textContent = t('audio.noVoice');
  const offV = on('voices', () => { const nt = $('[data-note]', el); if (nt) nt.textContent = speech.voices.length ? '' : t('audio.noVoice'); });
  const check = (silent = false) => {
    if (checked) return lastRes; checked = true; speech.stop(); let sc = 0;
    items.forEach((it, i) => {
      const inp = $(`[data-in="${i}"]`, el), a = inp.value, st = it.judge(a);
      if (st === 'ok') sc++; inp.classList.add('st-' + st); inp.disabled = true;
      $(`[data-i="${i}"] .qfb`, el).innerHTML = `<div class="fb ${st}"><span class="st">${ST_IC[st]} ${T(ST_KEY[st])}</span>${st !== 'ok' ? `<span class="muted">${esc(ru ? 'Ответ' : 'Answer')}: <span class="ans">${esc(it.answer)}</span></span>` : ''}</div>`;
    });
    const pct = Math.round(sc / items.length * 100);
    lastRes = { kind: 'drill', taskId: 'drill:dictation', mode: 'practice', score: sc, total: items.length, percent: pct, seconds: Math.round((Date.now() - startT) / 1000), extra: { kinds: used } };
    $('[data-score]', el).innerHTML = `<div class="glass score-card" role="status">${ring(pct)}<div class="txt"><div class="kicker">${T('task.score')}</div><div class="big-num">${sc} / ${items.length}</div><p class="faint">${esc(ru ? 'В Listening Part 1 ошибка в одной букве – это неверный ответ.' : 'In Listening Part 1, one wrong letter makes the answer wrong.')}</p></div></div>`;
    $('[data-act=check]', el).hidden = true; $('[data-act=script]', el).hidden = false;
    if (save && !silent) Progress.add(lastRes); if (!silent) announce(`${t('task.score')}: ${sc} / ${items.length}`);
    return lastRes;
  };
  el.addEventListener('click', e => {
    const l = e.target.closest('[data-listen]'); if (l) { const it = items[+l.dataset.listen]; speech.play([{ text: it.say, voice: speech.pick(+l.dataset.listen % 2 ? 'male' : 'female') }], { rate: 0.9 }); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'check') check();
    if (b.dataset.act === 'script') { const s = $('[data-script]', el); s.innerHTML = s.innerHTML ? '' : `<div class="glass panel" style="margin-top:14px">${items.map((it, i) => `<p style="margin:6px 0"><b class="qn">${i + 1}</b>${esc(it.say)}</p>`).join('')}</div>`; }
  });
  return { el, kind: 'drill', items, check, result: () => check(true), isChecked: () => checked, dirty: () => !checked && $$('[data-in]', el).some(i => i.value.trim()), destroy() { offV(); speech.stop(); } };
}

/* ---------- quiz ---------- */
function quizPlayer({ save = true } = {}) {
  const P = uid('qz'), ru = lang === 'ru', Q = D.drills.quiz;
  const el = document.createElement('div'); el.className = 'player drill';
  let checked = false, lastRes = null;
  el.innerHTML = `<p class="instr">${md(Q.intro)}</p><ol class="qlist">${Q.items.map((q, i) => `<li class="qi glass panel" data-i="${i}" style="margin-top:14px"><fieldset><legend><b class="qn">${i + 1}</b>${md(q.q)}</legend><div class="choice">${q.options.map(o => `<label class="opt"><input type="radio" name="${P}-${i}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div></fieldset><div class="qfb"></div></li>`).join('')}</ol>
   <div class="check-bar"><button type="button" class="pill pill-white" data-act="check">${ic('check')} ${T('task.check')}</button><button type="button" class="pill pill-glass" data-act="reset" hidden>${ic('replay')} ${T('task.reset')}</button></div><div data-score></div>`;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'check' && !checked) {
      checked = true; let sc = 0;
      Q.items.forEach((q, i) => { const r = $(`input[name="${P}-${i}"]:checked`, el), a = r ? r.value : ''; const st = !a ? 'empty' : a === q.answer ? 'ok' : 'bad'; if (st === 'ok') sc++;
        $$(`input[name="${P}-${i}"]`, el).forEach(x => { x.disabled = true; const lab = x.closest('.opt'); if (x.value === q.answer) lab.classList.add('ok'); else if (x.checked) lab.classList.add('bad'); });
        $(`[data-i="${i}"] .qfb`, el).innerHTML = `<div class="fb ${st}"><span class="st">${ST_IC[st]} ${T(ST_KEY[st])}</span><span class="muted">${esc(ru ? 'Ответ' : 'Answer')}: <span class="ans">${esc(q.answer)}</span></span><div class="why" style="flex-basis:100%">${md(q.why)}</div></div>`; });
      const pct = Math.round(sc / Q.items.length * 100);
      lastRes = { kind: 'drill', taskId: 'drill:quiz', mode: 'practice', score: sc, total: Q.items.length, percent: pct, seconds: 0, extra: {} };
      if (save) Progress.add(lastRes);
      $('[data-score]', el).innerHTML = `<div class="glass score-card" role="status">${ring(pct)}<div class="txt"><div class="kicker">${T('task.score')}</div><div class="big-num">${sc} / ${Q.items.length}</div><p>${esc(ru ? 'Подробнее об экзамене – в разделе «Гид по экзамену».' : 'Learn more in the Exam guide.')} <a class="txt-btn" href="#/guide">${T('nav.guide')} →</a></p></div></div>`;
      b.hidden = true; $('[data-act=reset]', el).hidden = false; $('[data-score]', el).scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    }
    if (b.dataset.act === 'reset') { checked = false; $$('input', el).forEach(x => { x.checked = false; x.disabled = false; x.closest('.opt').classList.remove('ok', 'bad'); }); $$('.qfb', el).forEach(x => x.innerHTML = ''); $('[data-score]', el).innerHTML = ''; b.hidden = true; $('[data-act=check]', el).hidden = false; }
  });
  return { el, kind: 'drill', check: () => lastRes, result: () => lastRes, isChecked: () => checked, dirty: () => !checked && !!$('input:checked', el), destroy() { } };
}

/* ---------- drill routes ---------- */
route(/^\/drill\/(tfng|dictation|quiz)$/, (v, [kind], q) => {
  const ru = lang === 'ru';
  const titleKey = kind === 'tfng' ? 'drill.tfng' : kind === 'dictation' ? 'drill.dictation' : 'quiz.title';
  v.innerHTML = `<div class="page"><a class="back" href="#/practice">${ic('back')} ${T('practice.title')}</a>${pageHead(`${ic('bolt')} ${T('practice.drills')}`, titleKey, null)}<div data-tools></div><div data-player></div></div>`;
  let pl = null;
  const mount = () => { pl && pl.destroy(); const box = $('[data-player]', v); box.innerHTML = ''; box.appendChild(pl.el); };
  if (kind === 'tfng') { pl = tfngPlayer(null); mount(); }
  if (kind === 'quiz') { pl = quizPlayer(); mount(); }
  if (kind === 'dictation') {
    const d = D.drills.dictation;
    let kinds = (q.get('kinds') || '').split(',').filter(k => d.kinds.includes(k)); if (!kinds.length) kinds = [...d.kinds];
    let n = Math.min(20, Math.max(3, +q.get('n') || 6)), seed = +q.get('seed') || Math.floor(Math.random() * 1e9);
    $('[data-tools]', v).innerHTML = `<p class="instr">${esc(d.intro)}</p><div class="glass panel" style="margin:16px 0"><div class="row" style="align-items:flex-end;gap:18px">
      <fieldset class="toggle-pills"><legend class="field" style="margin-bottom:8px">${esc(ru ? 'Что тренируем' : 'What to practise')}</legend><div class="choice">${d.kinds.map(k => `<label class="opt"><input type="checkbox" value="${k}"${kinds.includes(k) ? ' checked' : ''}><span>${esc(kindName(k))}</span></label>`).join('')}</div></fieldset>
      <label class="field" style="width:120px">${T('drill.count')}<select class="inp" data-n>${[4, 6, 8, 10, 12].map(x => `<option${x === n ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
      <button type="button" class="pill pill-white" data-new>${ic('dice')} ${T('drill.new')}</button></div></div>`;
    const go = (newSeed) => { if (newSeed) seed = Math.floor(Math.random() * 1e9); pl = dictPlayer({ kinds, n, seed }); mount(); const qq = new URLSearchParams({ kinds: kinds.join(','), n, seed }); setQuery(qq); };
    $$('.toggle-pills input', v).forEach(c => c.addEventListener('change', () => { kinds = $$('.toggle-pills input:checked', v).map(x => x.value); if (!kinds.length) { c.checked = true; kinds = [c.value]; } go(true); }));
    $('[data-n]', v).addEventListener('change', e => { n = +e.target.value; go(true); });
    $('[data-new]', v).addEventListener('click', () => go(true));
    go(false);
  }
  leaveGuard = () => pl && pl.dirty();
  onCleanup(() => pl && pl.destroy());
  return { title: t(titleKey), nav: 'practice' };
});

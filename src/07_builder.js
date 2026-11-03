/* ---------- sets store & items ---------- */
const Sets = {
  all() { const v = store.get(SK.sets, []); return Array.isArray(v) ? v : []; },
  get(id) { return this.all().find(s => s.id === id) || null; },
  save(s) { const a = this.all(); const i = a.findIndex(x => x.id === s.id); if (i >= 0) a[i] = s; else a.unshift(s); store.set(SK.sets, a); },
  del(id) { store.set(SK.sets, this.all().filter(s => s.id !== id)); }
};
function validItem(it) {
  if (!it || typeof it !== 'object') return false;
  if (it.t === 'task') return !!TASK[it.id];
  if (it.t === 'w1' || it.t === 'w2') return it.task ? !!(TASK[it.task] && TASK[it.task].parts && TASK[it.task].parts.some(p => p.id === it.part)) : !!(it.t === 'w1' ? D.banks.writingTask1 : D.banks.writingTask2).find(b => b.id === it.bank);
  if (it.t === 'sp') return !!D.banks.speakingPart2.find(c => c.id === it.card);
  if (it.t === 'tfng') return Array.isArray(it.ids) && it.ids.length > 0;
  if (it.t === 'dict') return Array.isArray(it.kinds) && it.n > 0;
  return false;
}
const encodeSet = s => b64e(JSON.stringify({ v: 1, n: s.name || '', m: s.mode, i: s.items }));
function decodeSet(c) {
  try { const o = JSON.parse(b64d(String(c))); if (!o || !Array.isArray(o.i)) return null; const items = o.i.filter(validItem); if (!items.length) return null; return { name: String(o.n || '').slice(0, 80), mode: o.m === 'exam' ? 'exam' : 'practice', items }; }
  catch (e) { return null; }
}
function w1Pool(lv) { const out = []; D.tasks.filter(x => x.skill === 'W' && x.level === lv).forEach(tk => tk.parts.forEach(p => { if (p.id !== 't2') out.push({ t: 'w1', task: tk.id, part: p.id }); })); D.banks.writingTask1.filter(b => b.level === lv).forEach(b => out.push({ t: 'w1', bank: b.id })); return out; }
function w2Pool(lv) { const out = []; D.tasks.filter(x => x.skill === 'W' && x.level === lv).forEach(tk => tk.parts.forEach(p => { if (p.id === 't2') out.push({ t: 'w2', task: tk.id, part: p.id }); })); D.banks.writingTask2.filter(b => b.level === lv).forEach(b => out.push({ t: 'w2', bank: b.id })); return out; }
const itemLevel = it => it.t === 'task' ? TASK[it.id].level : it.t === 'sp' ? (D.banks.speakingPart2.find(c => c.id === it.card) || {}).level : (it.t === 'w1' || it.t === 'w2') ? (it.task ? TASK[it.task].level : ((it.t === 'w1' ? D.banks.writingTask1 : D.banks.writingTask2).find(b => b.id === it.bank) || {}).level) : null;
function rerollItem(it, rng = Math.random) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (it.t === 'w1' || it.t === 'w2') { const pool = (it.t === 'w1' ? w1Pool : w2Pool)(itemLevel(it)).filter(x => !same(x, it)); return pool.length ? pickOne(pool, rng) : it; }
  if (it.t === 'sp') { let n = randomSpItem(itemLevel(it), rng, (it.p1 || []).length || 2), k = 0; while (n.card === it.card && k++ < 8) n = randomSpItem(itemLevel(it), rng, (it.p1 || []).length || 2); return n; }
  if (it.t === 'tfng') return { t: 'tfng', ids: sample(D.drills.tfng.items, it.ids.length, rng).map(x => x.id) };
  if (it.t === 'dict') return { ...it, seed: Math.floor(rng() * 1e9) };
  return it;
}
function genItems({ levels, skills, extras }, rng = Math.random) {
  const items = [];
  for (const sk of ['L', 'R', 'W', 'S']) if (skills.includes(sk)) for (const lv of ['A', 'B', 'C']) if (levels.includes(lv)) {
    if (sk === 'L' || sk === 'R') items.push({ t: 'task', id: `${lv}-${sk}` });
    if (sk === 'W') { items.push(pickOne(w1Pool(lv), rng)); items.push(pickOne(w2Pool(lv), rng)); }
    if (sk === 'S') items.push(randomSpItem(lv, rng, 2));
  }
  if (extras.includes('tfng')) items.push({ t: 'tfng', ids: sample(D.drills.tfng.items, 5, rng).map(x => x.id) });
  if (extras.includes('dict')) items.push({ t: 'dict', kinds: [...D.drills.dictation.kinds], n: 6, seed: Math.floor(rng() * 1e9) });
  return items;
}
function itemInfo(it) {
  if (it.t === 'task') { const tk = TASK[it.id]; return { em: SKILL[tk.skill].icon, short: tk.code, title: `${tk.code} · ${t('skill.' + tk.skill)}: ${tk.title}`, sub: tk.part, level: tk.level, skill: tk.skill, minutes: tk.minutes || { L: 10, R: 20, W: 45, S: 12 }[tk.skill], fixed: true }; }
  if (it.t === 'w1' || it.t === 'w2') { const w = wTaskFrom(it), p = w.parts[0]; return { em: ic('pen'), short: it.t === 'w1' ? 'W1' : 'W2', title: `${t('skill.W')} · ${it.task ? TASK[it.task].code + ' · ' : ''}${p.label}`, sub: plain(p.instructions), level: w.level, skill: 'W', minutes: p.minutes || 20 }; }
  if (it.t === 'sp') { const s = spTaskFrom(it); return { em: ic('mic'), short: 'S', title: `${t('skill.S')}: ${s.title}`, sub: [(it.p1 || []).join(', '), 'Part 2', 'Part 3'].filter(Boolean).join(' · '), level: s.level, skill: 'S', minutes: 14 }; }
  if (it.t === 'tfng') return { em: ic('book'), short: 'T/F/NG', title: `${t('drill.tfng')} × ${it.ids.length}`, sub: plain(D.drills.tfng.rule).slice(0, 120), level: 'x', minutes: 5, drill: true };
  return { em: ic('type'), short: 'A–Z', title: `${t('drill.dictation')} × ${it.n}`, sub: it.kinds.map(kindName).join(', '), level: 'x', minutes: 5, drill: true };
}
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = s; ta.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { } ta.remove(); return ok;
  }
}
const shareLink = s => location.href.split('#')[0] + '#/builder?set=' + encodeSet(s);
async function shareSet(s) {
  const link = shareLink(s), ok = await copyText(link);
  if (ok) toast(t('common.copy'));
  openDialog({ title: t('builder.share'), body: `<label class="field">${esc(lang === 'ru' ? 'Ссылка на набор' : 'Link to this set')}<input class="inp" readonly value="${esc(link)}" data-link></label><p class="note">${esc(lang === 'ru' ? 'Набор хранится прямо в ссылке – отправь её однокласснику или учителю.' : 'The whole set is stored in the link – send it to a classmate or a teacher.')}</p>`, onOpen: d => { const i = $('[data-link]', d); i.focus(); i.select(); } });
}

/* ---------- print ---------- */
function printGroups(tk) {
  const gp = n => `<span class="pgap">(${n})</span>`;
  return tk.groups.map(g => {
    let body = '';
    if (g.kind === 'form') body = `<table><caption style="text-align:left;font-weight:600;padding:3pt 0">${md(g.title)}</caption>${g.rows.map(r => `<tr><th style="width:38%">${md(r.label)}</th><td>${md(r.text, gp)}</td></tr>`).join('')}</table>`;
    else if (g.kind === 'notes') body = g.notes.map(x => x.heading ? `<h4 style="margin:6pt 0 2pt">${md(x.heading)}</h4>` : `<p>– ${md(x.text, gp)}</p>`).join('');
    else if (g.kind === 'summary') body = (g.options ? `<table><tr>${g.options.map(o => `<td><b>${esc(o.key)}</b> ${esc(o.text)}</td>`).join('')}</tr></table>` : '') + `<p style="line-height:2">${md(g.text, gp)}</p>`;
    else {
      if (g.type === 'headings' || g.type === 'matchInfo') body += `${g.optionsTitle ? `<p><b>${esc(g.optionsTitle)}</b></p>` : ''}${g.options.map(o => `<p><b>${esc(o.key)}</b> ${esc(o.text)}</p>`).join('')}`;
      body += g.questions.map(q => {
        if (g.type === 'sentence') return `<p><b>${q.n}</b> ${md(q.prompt, gp)}</p>`;
        if (g.type === 'headings' || g.type === 'matchInfo') return `<p><b>${q.n}</b> ${md(q.prompt)} <span class="pgap"></span></p>`;
        const rich = !!q.options, opts = q.options || g.options;
        return `<p><b>${q.n}</b> ${md(q.prompt)}</p><p style="padding-left:14pt">${opts.map(o => rich ? `<b>${esc(o.key)}</b> ${md(o.text)}` : esc(o.text)).join(rich ? '<br>' : ' / ')}</p>`;
      }).join('');
    }
    return `<h3>Questions ${esc(g.range)}</h3><p><em>${md(g.instructions)}</em></p>${body}`;
  }).join('');
}
function printWPart(p) { const lines = Math.round(p.minWords / 9) + 4; return `<p><b>${esc(p.label)}</b> · ${p.minutes} min · ≥ ${p.minWords} words</p><p>${md(p.instructions)}</p>${p.chart ? chartHtml(p.chart, p.caption) : ''}${'<div class="pline"></div>'.repeat(lines)}`; }
function printS(S) {
  let s = '';
  if (S.part1) s += `<h3>${esc(S.part1.label)}</h3>${S.part1.topics.map(tp => `<p><b>${esc(tp.title)}:</b> ${tp.questions.map(esc).join(' ')}</p>`).join('')}`;
  if (S.part2) { const c = S.part2.card; s += `<h3>${esc(S.part2.label)}</h3><div class="pcue"><p><b>${esc(c.topic)}</b></p><p>${esc(c.say)}</p><ul>${c.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p>${esc(c.explain)}</p></div><p><em>1 minute to prepare, 1–2 minutes to speak.</em></p>`; }
  if (S.part3) s += `<h3>${esc(S.part3.label)}</h3><ol>${S.part3.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ol>`;
  return s;
}
function printItem(it, n, keyP, scrP) {
  const head = (title, sub) => `<h2>${n}. ${esc(title)}</h2>${sub ? `<p><em>${esc(sub)}</em></p>` : ''}`;
  const sec = html => `<section class="ptask${n > 1 ? ' pb' : ''}">${html}</section>`;
  if (it.t === 'task') {
    const tk = TASK[it.id];
    if (tk.skill === 'L' || tk.skill === 'R') {
      let s = head(`${tk.code} ${SKILL[tk.skill].name}: ${tk.title}`, tk.part);
      if (tk.skill === 'L') s += `<p><em>${esc(lang === 'ru' ? 'Аудио: учитель читает скрипт вслух или запись звучит на сайте.' : 'Audio: the teacher reads the script aloud, or play it on the website.')}</em></p>`;
      if (tk.skill === 'R') s += `<h3>${esc(tk.passage.title)}</h3>${tk.passage.paragraphs.map(p => `<p>${p.label ? `<b>${esc(p.label)}</b> ` : ''}${md(p.text)}</p>`).join('')}`;
      s += printGroups(tk);
      keyP.push(`<h3>${n}. ${esc(tk.code)} ${esc(tk.title)}</h3><p>${tk.groups.flatMap(g => g.questions).map(q => `<b>${q.n}</b> ${esc(q.answer)}`).join(' · ')}</p>`);
      if (tk.skill === 'L') scrP.push(`<h3>${n}. ${esc(tk.code)} ${esc(tk.title)}</h3>${tk.audio.lines.map(l => `<p><b>${esc(l.s)}:</b> ${md(l.t)}</p>`).join('')}`);
      return sec(s);
    }
    if (tk.skill === 'W') return sec(head(`${tk.code} ${tk.title}`, tk.part) + tk.parts.map(printWPart).join(''));
    return sec(head(`${tk.code} ${tk.title}`, tk.part) + printS(tk.speaking));
  }
  if (it.t === 'w1' || it.t === 'w2') { const w = wTaskFrom(it); return sec(head(`${SKILL.W.name} ${w.parts[0].short}`, w.title) + printWPart(w.parts[0])); }
  if (it.t === 'sp') { const s = spTaskFrom(it); return sec(head(`${SKILL.S.name}: ${s.title}`) + printS(s.speaking)); }
  if (it.t === 'tfng') {
    const items = it.ids.map(id => D.drills.tfng.items.find(x => x.id === id)).filter(Boolean);
    keyP.push(`<h3>${n}. T/F/NG</h3><p>${items.map((x, i) => `<b>${i + 1}</b> ${x.answer}`).join(' · ')}</p>`);
    return sec(head(D.drills.tfng.title) + `<p>${md(D.drills.tfng.rule)}</p>` + items.map((x, i) => `<p style="margin-top:8pt">${md(x.text)}</p><p><b>${i + 1}</b> ${md(x.statement)} &nbsp; TRUE / FALSE / NOT GIVEN</p>`).join(''));
  }
  const di = dictItems(it.kinds, it.n, it.seed);
  keyP.push(`<h3>${n}. ${esc(D.drills.dictation.title)}</h3><p>${di.map((x, i) => `<b>${i + 1}</b> ${esc(x.answer)}`).join(' · ')}</p>`);
  scrP.push(`<h3>${n}. ${esc(D.drills.dictation.title)}</h3>${di.map((x, i) => `<p><b>${i + 1}</b> ${esc(x.say)}</p>`).join('')}`);
  return sec(head(D.drills.dictation.title) + `<p>${esc(D.drills.dictation.intro)}</p>` + di.map((x, i) => `<p><b>${i + 1}</b> (${esc(kindName(x.kind))}) <span class="pgap" style="min-width:60mm"></span></p>`).join(''));
}
function buildPrint(set, { key = true, scripts = true } = {}) {
  const ru = lang === 'ru', keyP = [], scrP = [];
  const body = set.items.map((it, i) => printItem(it, i + 1, keyP, scrP)).join('');
  $('#print-root').innerHTML = `<h1>${esc(set.name || D.meta.brand)}</h1><p>${esc(D.meta.brand)} · ${esc(set.mode === 'exam' ? t('task.exam') : t('task.practice'))} · ${new Date().toLocaleDateString(ru ? 'ru-RU' : 'en-GB')}</p>${body}${key && keyP.length ? `<section class="pb"><h2>${ru ? 'Ключи' : 'Answer key'}</h2>${keyP.join('')}</section>` : ''}${scripts && scrP.length ? `<section class="pb"><h2>${ru ? 'Аудиоскрипты' : 'Audio scripts'}</h2>${scrP.join('')}</section>` : ''}`;
}
function printSet(set, opts) {
  buildPrint(set, opts);
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => { try { window.print(); } catch (e) { } setTimeout(() => { if (!matchMedia('print').matches) done(); }, 1000); }, 60);
}
function openPrint(set) {
  const ru = lang === 'ru';
  openDialog({
    title: t('builder.print'), body: `<label class="chk"><input type="checkbox" data-k checked><span>${esc(ru ? 'Добавить ключи с ответами' : 'Add the answer key')}</span></label><label class="chk"><input type="checkbox" data-s checked><span>${esc(ru ? 'Добавить аудиоскрипты (для учителя)' : 'Add the audio scripts (for the teacher)')}</span></label><p class="note">${esc(ru ? 'Каждое задание начинается с новой страницы. Ключи и скрипты – в конце.' : 'Each task starts on a new page. The key and scripts come at the end.')}</p>`,
    actions: `<button class="pill pill-outline" data-close>${esc(ru ? 'Отмена' : 'Cancel')}</button><button class="pill pill-white" data-go>${ic('print')} ${T('builder.print')}</button>`,
    onOpen: (d, close) => $('[data-go]', d).addEventListener('click', () => { const o = { key: $('[data-k]', d).checked, scripts: $('[data-s]', d).checked }; close('ok'); printSet(set, o); })
  });
}

/* ---------- builder page ---------- */
let BST = null;
const newBST = () => ({ id: null, name: '', mode: 'practice', levels: ['B'], skills: ['L', 'R', 'W', 'S'], extras: [], items: [] });
function inferBST(s) {
  const lv = [...new Set(s.items.map(itemLevel).filter(Boolean))], sk = [...new Set(s.items.map(it => it.t === 'task' ? TASK[it.id].skill : it.t === 'sp' ? 'S' : (it.t === 'w1' || it.t === 'w2') ? 'W' : null).filter(Boolean))];
  const ex = s.items.filter(i => i.t === 'tfng' || i.t === 'dict').map(i => i.t);
  return { ...newBST(), ...s, levels: lv.length ? lv : ['B'], skills: sk, extras: ex };
}
route(/^\/builder$/, (v, _, q) => {
  const ru = lang === 'ru';
  if (!BST) BST = newBST();
  const code = q.get('set'), edit = q.get('edit');
  if (code) { const s = decodeSet(code); if (s) { BST = inferBST({ ...s, id: null }); setTimeout(() => toast(ru ? 'Набор загружен из ссылки' : 'Set loaded from the link'), 300); } else setTimeout(() => toast(ru ? 'Ссылка повреждена' : 'The link is broken'), 300); setQuery(new URLSearchParams()); }
  else if (edit) { const s = Sets.get(edit); if (s) BST = inferBST(s); setQuery(new URLSearchParams()); }
  const st = BST;
  const box = (name, val, html, arr) => `<label class="opt"><input type="checkbox" name="${name}" value="${val}"${arr.includes(val) ? ' checked' : ''}><span>${html}</span></label>`;
  v.innerHTML = `<div class="page">${pageHead(`${ic('builder')} ${T('nav.builder')}`, 'builder.title', 'builder.sub')}
  <div class="builder-grid">
   <form class="glass panel stack" data-form novalidate>
    <fieldset class="toggle-pills"><legend class="kicker">${T('builder.levels')}</legend><div class="choice">${D.levels.map(l => box('lv', l.id, `<span class="dot lv-${l.id}"></span>${T('level.' + l.id)}`, st.levels)).join('')}</div></fieldset>
    <fieldset class="toggle-pills"><legend class="kicker">${T('builder.skills')}</legend><div class="choice">${D.skills.map(s => box('sk', s.id, `${s.icon} ${T('skill.' + s.id)}`, st.skills)).join('')}</div></fieldset>
    <fieldset class="toggle-pills"><legend class="kicker">${T('builder.extras')}</legend><div class="choice">${box('ex', 'tfng', ic('book') + ' T/F/NG', st.extras)}${box('ex', 'dict', `${ic('type')} ${esc(ru ? 'Диктант' : 'Dictation')}`, st.extras)}</div></fieldset>
    <div><div class="kicker" style="margin-bottom:8px">${T('builder.mode')}</div><div class="seg" role="group" aria-label="${esc(t('builder.mode'))}"><button type="button" data-mode="practice" aria-pressed="${st.mode === 'practice'}">${T('task.practice')}</button><button type="button" data-mode="exam" aria-pressed="${st.mode === 'exam'}">${T('task.exam')}</button></div></div>
    <label class="field">${T('builder.name')}<input class="inp" name="name" maxlength="80" value="${esc(st.name)}" placeholder="${esc(ru ? 'Например: пробник B, неделя 3' : 'e.g. Level B mock, week 3')}"></label>
    <p class="audio-note" data-err role="alert"></p>
    <button type="submit" class="pill pill-white">${ic('dice')} ${T('builder.generate')}</button>
   </form>
   <section class="glass panel" data-setbox aria-label="${esc(ru ? 'Набор' : 'Set')}"></section>
  </div>
  <section class="sec"><div class="sec-head"><h2 class="sec-title display"><span class="grad" data-i18n="builder.saved">${esc(t('builder.saved'))}</span></h2></div><div data-saved></div></section></div>`;
  const form = $('[data-form]', v), sbox = $('[data-setbox]', v);
  const defName = () => `${D.meta.brand} · ${st.levels.join('+') || '–'} · ${st.skills.join('') || (ru ? 'тренажёры' : 'drills')}`;
  const cur = () => { const prev = st.id ? Sets.get(st.id) : null; return { id: st.id, name: st.name || defName(), mode: st.mode, items: st.items, created: st.created || Date.now(), ...(prev && prev.public ? { public: true } : {}) }; };
  const drawSet = () => {
    if (!st.items.length) { sbox.innerHTML = `<div class="empty"><div class="em em-lg" aria-hidden="true">${ic('puzzle')}</div><p>${esc(ru ? 'Выбери уровни и навыки и нажми «Собрать набор». Задания Writing и Speaking берутся случайно из банков.' : 'Choose levels and skills and press “Generate set”. Writing and Speaking prompts are picked at random from the banks.')}</p></div>`; return; }
    const infos = st.items.map(itemInfo), mins = infos.reduce((a, f) => a + (f.minutes || 0), 0);
    sbox.innerHTML = `<div class="row between" style="align-items:flex-start"><div><div class="kicker">${st.mode === 'exam' ? T('task.exam') : T('task.practice')}${st.id ? ' · ' + esc(ru ? 'сохранён' : 'saved') : ''}</div><h2 class="grp-title" style="font-size:21px;margin-top:6px">${esc(st.name || defName())}</h2><p class="faint" style="margin:4px 0 0">${tasksN(st.items.length)} · ≈ ${mins} ${T('common.min')}</p></div>
      <button type="button" class="pill pill-sm pill-glass" data-a="rerollAll">${ic('dice')} ${T('builder.reroll')}</button></div>
      <div style="margin-top:18px" role="list">${infos.map((f, i) => `<div class="bitem" role="listitem" data-i="${i}"><span class="em" aria-hidden="true">${f.em}</span><div class="bt"><b>${esc(f.title)}</b><span>${esc(f.sub)}</span></div>${f.drill ? '<span class="lp">' + ic('bolt') + '</span>' : levelPill(f.level)}<div class="acts">
        <button type="button" class="icon-btn" data-a="up" aria-label="${esc(ru ? 'Выше' : 'Move up')}" title="${esc(ru ? 'Выше' : 'Move up')}"${i ? '' : ' disabled'}>${ic('up')}</button><button type="button" class="icon-btn" data-a="down" aria-label="${esc(ru ? 'Ниже' : 'Move down')}" title="${esc(ru ? 'Ниже' : 'Move down')}"${i < infos.length - 1 ? '' : ' disabled'}>${ic('down')}</button><button type="button" class="icon-btn" data-a="reroll" aria-label="${esc(t('builder.reroll'))}" title="${esc(t('builder.reroll'))}"${f.fixed ? ' disabled' : ''}>${ic('dice')}</button><button type="button" class="icon-btn" data-a="rm" aria-label="${esc(t('builder.delete'))}" title="${esc(t('builder.delete'))}">${ic('trash')}</button></div></div>`).join('')}</div>
      <div class="check-bar"><button type="button" class="pill pill-white" data-a="start">${ic('play')} ${T('variants.start')}</button><button type="button" class="pill pill-outline" data-a="save">${ic('save')} ${T('builder.save')}</button><button type="button" class="pill pill-outline" data-a="share">${ic('link')} ${T('builder.share')}</button><button type="button" class="pill pill-outline" data-a="print">${ic('print')} ${T('builder.print')}</button></div>`;
  };
  const drawSaved = () => {
    const all = Sets.all(), el = $('[data-saved]', v);
    el.innerHTML = all.length ? `<div class="grid g3">${all.map(s => `<article class="glass card set-card"><div class="kicker">${s.mode === 'exam' ? T('task.exam') : T('task.practice')} · ${tasksN(s.items.length)}</div><h3 style="font-size:17px;margin:8px 0 4px">${esc(s.name)}</h3><p class="faint" style="margin:0 0 14px;font-size:13px">${new Date(s.created || Date.now()).toLocaleDateString(ru ? 'ru-RU' : 'en-GB')}</p><div class="row set-acts"><a class="pill pill-sm pill-white" href="#/set/${esc(s.id)}">${ic('play')} ${T('variants.start')}</a><a class="pill pill-sm pill-outline" href="#/builder?edit=${esc(s.id)}">${T('builder.open')}</a></div><div class="set-foot">${Auth.user ? `<button type="button" class="pub-tg" data-pub="${esc(s.id)}" aria-pressed="${!!s.public}" aria-label="${esc(s.public ? tr('Public: shown in your profile', 'Публичный: виден в профиле') : tr('Private: show in my profile', 'Личный: показать в профиле'))}" data-tip="${esc(s.public ? tr('Hide from profile', 'Скрыть из профиля') : tr('Show in profile', 'Показать в профиле'))}">${ic(s.public ? 'eye' : 'eyeOff')}<span>${esc(s.public ? tr('Public', 'Публичный') : tr('Private', 'Личный'))}</span></button>` : ''}<span class="sp"></span><button type="button" class="icon-btn" data-share="${esc(s.id)}" aria-label="${esc(t('builder.share'))}" title="${esc(t('builder.share'))}">${ic('link')}</button><button type="button" class="icon-btn" data-del="${esc(s.id)}" aria-label="${esc(t('builder.delete'))}" title="${esc(t('builder.delete'))}">${ic('trash')}</button></div></article>`).join('')}</div>` : `<p class="muted">${esc(ru ? 'Пока нет сохранённых наборов.' : 'No saved sets yet.')}</p>`;
  };
  form.addEventListener('change', () => { st.levels = $$('[name=lv]:checked', form).map(x => x.value); st.skills = $$('[name=sk]:checked', form).map(x => x.value); st.extras = $$('[name=ex]:checked', form).map(x => x.value); });
  $('[name=name]', form).addEventListener('input', e => { st.name = e.target.value; const h = $('.grp-title', sbox); if (h) h.textContent = st.name || defName(); });
  $$('[data-mode]', form).forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; $$('[data-mode]', form).forEach(x => x.setAttribute('aria-pressed', String(x === b))); drawSet(); }));
  form.addEventListener('submit', e => {
    e.preventDefault(); form.dispatchEvent(new Event('change'));
    const err = $('[data-err]', form);
    if (!st.levels.length || (!st.skills.length && !st.extras.length)) { err.textContent = t('builder.empty'); return; }
    err.textContent = ''; st.items = genItems(st); st.id = null; st.created = Date.now(); drawSet(); announce(`${tasksN(st.items.length)}`);
    if (matchMedia('(max-width:900px)').matches) sbox.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  });
  sbox.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const row = b.closest('[data-i]'), i = row ? +row.dataset.i : -1, a = b.dataset.a;
    if (a === 'up' && i > 0) { [st.items[i - 1], st.items[i]] = [st.items[i], st.items[i - 1]]; drawSet(); $(`[data-i="${i - 1}"] [data-a=up]`, sbox)?.focus() || $(`[data-i="${i - 1}"] [data-a=down]`, sbox)?.focus(); }
    if (a === 'down' && i < st.items.length - 1) { [st.items[i + 1], st.items[i]] = [st.items[i], st.items[i + 1]]; drawSet(); ($(`[data-i="${i + 1}"] [data-a=down]:not([disabled])`, sbox) || $(`[data-i="${i + 1}"] [data-a=up]`, sbox))?.focus(); }
    if (a === 'reroll' && i >= 0) { st.items[i] = rerollItem(st.items[i]); drawSet(); $(`[data-i="${i}"] [data-a=reroll]`, sbox)?.focus(); }
    if (a === 'rm' && i >= 0) { st.items.splice(i, 1); drawSet(); }
    if (a === 'rerollAll') { st.items = st.items.map(x => rerollItem(x)); drawSet(); }
    if (a === 'save') { if (!st.id) st.id = uid('set'); const s = cur(); st.created = s.created; Sets.save(s); toast(ru ? 'Набор сохранён' : 'Set saved'); drawSet(); drawSaved(); }
    if (a === 'share') shareSet(cur());
    if (a === 'print') openPrint(cur());
    if (a === 'start') { if (st.id) { Sets.save(cur()); location.hash = `#/set/${st.id}`; } else location.hash = `#/set?code=${encodeSet(cur())}`; }
  });
  $('[data-saved]', v).addEventListener('click', async e => {
    const d = e.target.closest('[data-del]'), sh = e.target.closest('[data-share]');
    const pb = e.target.closest('[data-pub]'); if (pb) { const s = Sets.get(pb.dataset.pub); if (s) { s.public = !s.public; Sets.save(s); drawSaved(); toast(s.public ? tr('The set is now public in your profile', 'Набор теперь виден в профиле') : tr('The set is private again', 'Набор снова личный')); $(`[data-pub="${s.id}"]`, v)?.focus(); } return; }
    if (sh) { const s = Sets.get(sh.dataset.share); if (s) shareSet(s); }
    if (d) { if (!(await confirmDlg(ru ? 'Удалить набор?' : 'Delete this set?'))) return; Sets.del(d.dataset.del); if (st.id === d.dataset.del) st.id = null; drawSaved(); drawSet(); }
  });
  drawSet(); drawSaved();
  return { title: t('builder.title'), nav: 'builder', relang: true, auth: true };
});

/* ---------- global search (nav pill) ---------- */
const tr = (en, ru) => lang === 'ru' ? ru : en;
function searchHtml() {
  return `<div class="search" role="search"><label class="search-pill" for="navQ">${ic('search')}<input id="navQ" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="searchList" aria-autocomplete="list" data-i18n-ph="search.ph" placeholder="${esc(t('search.ph'))}" aria-label="${esc(t('search.ph'))}"><kbd aria-hidden="true">/</kbd></label>
  <div class="search-pop" id="searchPop" hidden><ul role="listbox" id="searchList" aria-label="${esc(t('search.ph'))}"></ul></div></div>`;
}
function searchIndex() {
  const S = [];
  const add = (g, icon, title, sub, go, keys = '') => S.push({ g, icon, title, sub, go, keys });
  const nk = { home: 'main start главная начало домой', practice: 'tasks library exercises практика задания библиотека упражнения', builder: 'constructor generator set конструктор генератор набор', variants: 'mock tests exam варианты пробники тесты экзамен', guide: 'exam guide info format справочник гид формат экзамен', progress: 'results stats history прогресс результаты статистика история' };
  NAV.forEach(([k, h, l]) => add('sections', k, t(l), '', h, nk[k] + ' ' + D.i18n.en[l] + ' ' + (D.i18n.ru[l] || '')));
  add('sections', 'about', t('nav.about'), tr('Aim, objectives, author', 'Цель, задачи, автор'), '#/about', 'about project research author aim о проекте исследование автор цель');
  add('sections', 'people', t('people.title'), tr('Find other learners', 'Найти других учеников'), '#/people', 'people users profiles community люди пользователи профили');
  GUIDE_TABS.forEach(id => add('sections', 'guide', t('guide.' + id), t('nav.guide'), '#/guide/' + id, D.i18n.en['guide.' + id] + ' ' + (D.i18n.ru['guide.' + id] || '') + (id === 'scoring' ? ' band score оценка баллы' : id === 'history' ? ' история' : id === 'compare' ? ' огэ егэ oge use' : '')));
  add('sections', 'calc', t('calc.title'), tr('Average of four skills → overall band', 'Среднее по четырём навыкам → общий балл'), () => openCalc(), 'band calculator overall score калькулятор балл общий');
  add('sections', 'compass', t('home.diagnostic'), tr('Diagnostic test', 'Диагностический тест'), '#/variant/diagnostic', 'diagnostic level test диагностика уровень тест');
  add('sections', 'calendar', t('profile.title'), tr('Target band and exam date', 'Целевой балл и дата экзамена'), () => openProfile(), 'goals target date exam цели дата экзамена балл');
  [['tfng', 'book', t('drill.tfng'), 'true false not given верно неверно'], ['dictation', 'headphones', t('drill.dictation'), 'spelling numbers dictation диктант буквы цифры'], ['quiz', 'bulb', t('quiz.title'), 'quiz questions викторина тест']].forEach(([id, i, n, k]) => add('tasks', i, n, t('practice.drills'), '#/drill/' + id, k));
  D.tasks.forEach(x => add('tasks', SK_IC[x.skill], `${x.code} · ${taskTitle(x)}`, `${t('level.' + x.level)} · ${t('skill.' + x.skill)}`, '#/practice/' + x.id, `${x.title} ${x.part} ${D.i18n.en['skill.' + x.skill]} ${D.i18n.ru['skill.' + x.skill]} ${x.level}${x.skill}`));
  D.variants.forEach(x => add('tasks', 'variants', variantTitle(x), t('variants.title'), '#/variant/' + x.id, x.title + ' ' + x.id));
  add('settings', 'moon', `${t('set.theme')}: ${t('set.dark')}`, t('set.title'), () => { Settings.set('theme', 'dark'); toast(t('set.dark')); }, 'dark theme night тёмная темная тема ночь');
  add('settings', 'sun', `${t('set.theme')}: ${t('set.light')}`, t('set.title'), () => { Settings.set('theme', 'light'); toast(t('set.light')); }, 'light theme day светлая тема день');
  add('settings', 'leaf', t('set.eco'), t('set.title'), () => openSettings('eco'), 'power saving eco battery animations performance энергосбережение эко батарея анимации');
  add('settings', 'type', t('set.fs'), t('set.title'), () => openSettings('fs'), 'font text size bigger smaller шрифт размер текста крупнее');
  add('settings', 'weight', t('set.fw'), t('set.title'), () => openSettings('fw'), 'font weight bold thin толщина жирный тонкий');
  add('settings', 'globe', t('set.lang'), 'English · Русский', () => openSettings('lang'), 'language english russian язык английский русский');
  add('settings', 'gear', t('set.title'), tr('All settings', 'Все настройки'), () => openSettings(), 'settings preferences options настройки параметры');
  if (Auth.user) {
    add('sections', 'user', t('auth.myProfile'), '@' + Auth.user.login, '#/u/' + Auth.user.login, 'my profile account avatar мой профиль аккаунт');
    add('settings', 'pen', tr('Edit profile', 'Редактировать профиль'), tr('Avatar, nickname, login, password', 'Аватар, ник, логин, пароль'), '#/me', 'edit profile avatar nickname login password редактировать аватар ник логин пароль');
    add('settings', 'logout', t('auth.logout'), '@' + Auth.user.login, () => Auth.logout(), 'logout sign out exit выйти выход');
  } else {
    add('sections', 'userPlus', t('auth.signup'), tr('Create an account', 'Создать аккаунт'), '#/signup', 'sign up register account регистрация аккаунт создать');
    add('sections', 'login', t('auth.login'), tr('Sign in to sync progress', 'Синхронизировать прогресс'), '#/login', 'log in sign in войти вход');
  }
  return S;
}
const taskTitle = x => (lang === 'ru' && x.ru && x.ru.title) || x.title;
const variantTitle = x => (lang === 'ru' && x.ru && x.ru.title) || x.title;
const nrm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}@_.+ ]+/gu, ' ');
function searchRun(qs) {
  const q = nrm(qs).trim(); if (!q) return null;
  const words = q.split(/\s+/);
  const res = [];
  for (const it of searchIndex()) {
    const title = nrm(it.title), hay = title + ' ' + nrm(it.sub) + ' ' + nrm(it.keys);
    if (!words.every(w => hay.includes(w))) continue;
    let sc = 0; if (title.startsWith(q)) sc += 6; else if (title.includes(q)) sc += 4; words.forEach(w => { if (title.split(' ').some(x => x.startsWith(w))) sc += 2; });
    res.push({ ...it, sc });
  }
  res.sort((a, b) => b.sc - a.sc);
  const seen = new Set();
  return res.filter(r => { const k = r.title + '|' + (typeof r.go === 'string' ? r.go : ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 9);
}
function initSearch() {
  const inp = $('#navQ'), pop = $('#searchPop'), list = $('#searchList'), box = $('.search');
  let items = [], act = -1;
  const GL = { sections: 'search.sections', tasks: 'search.tasks', settings: 'search.settings', people: 'people.title' };
  const close = () => { pop.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); box.classList.remove('open'); act = -1; };
  const hi = (s, q) => { const words = nrm(q).trim().split(/\s+/).filter(Boolean); let h = esc(s); words.forEach(w => { const i = nrm(s).indexOf(w); if (i >= 0 && w.length > 0) { const raw = s.slice(i, i + w.length); h = h.replace(esc(raw), `<mark>${esc(raw)}</mark>`); } }); return h; };
  const draw = () => {
    const q = inp.value.trim();
    let res = searchRun(q);
    if (res === null) res = searchIndex().filter(x => ['#/practice', '#/variant/diagnostic', '#/guide/format', '#/builder'].includes(x.go) || (x.g === 'settings' && /gear/.test(x.icon))).map(x => ({ ...x }));
    items = res.slice();
    if (q) items.push({ g: 'people', icon: 'people', title: t('search.people'), sub: `«${q}»`, go: '#/people?q=' + encodeURIComponent(q), people: true });
    let html = '', g = '';
    if (q && res.length === 0) html += `<li class="sr-empty" role="presentation">${ic('search')}<span>${esc(tr('Nothing found in sections and settings', 'В разделах и настройках ничего не найдено'))}</span></li>`;
    items.forEach((it, i) => {
      if (it.g !== g) { g = it.g; html += `<li class="sr-g" role="presentation">${esc(t(GL[g]))}</li>`; }
      html += `<li role="option" id="sr${i}" class="sr-i${it.people ? ' sr-people' : ''}" data-i="${i}" aria-selected="false"><span class="sr-ic">${ic(it.icon)}</span><span class="sr-t"><b>${hi(it.title, q)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${typeof it.go === 'string' ? ic('arrow', 'sr-go') : ic('sparkle', 'sr-go')}</li>`;
    });
    list.innerHTML = html; pop.hidden = false; box.classList.add('open'); inp.setAttribute('aria-expanded', 'true');
    setAct(items.length && q ? 0 : -1);
  };
  const setAct = i => { act = i; $$('.sr-i', list).forEach(li => li.setAttribute('aria-selected', String(+li.dataset.i === i))); if (i >= 0) { inp.setAttribute('aria-activedescendant', 'sr' + i); const li = $('#sr' + i); li && li.scrollIntoView({ block: 'nearest' }); } else inp.removeAttribute('aria-activedescendant'); };
  const go = i => { const it = items[i]; if (!it) return; close(); inp.value = ''; inp.blur(); if (typeof it.go === 'string') location.hash = it.go; else it.go(); };
  inp.addEventListener('input', draw);
  inp.addEventListener('focus', draw);
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (pop.hidden) draw(); setAct(Math.min(items.length - 1, act + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(Math.max(0, act - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (act >= 0) go(act); else if (inp.value.trim()) go(items.length - 1); }
    else if (e.key === 'Escape') { if (!pop.hidden) { e.stopPropagation(); close(); } else { inp.value = ''; inp.blur(); } }
  });
  list.addEventListener('mousedown', e => e.preventDefault());
  list.addEventListener('click', e => { const li = e.target.closest('.sr-i'); if (li) go(+li.dataset.i); });
  list.addEventListener('mousemove', e => { const li = e.target.closest('.sr-i'); if (li && +li.dataset.i !== act) setAct(+li.dataset.i); });
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) close(); }, 120));
  document.addEventListener('keydown', e => {
    const tg = e.target, typing = tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName));
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { if ($('dialog[open]') || document.body.classList.contains('set-open')) return; e.preventDefault(); $('#nav').classList.remove('compact'); inp.focus(); }
  });
  on('lang', () => { inp.placeholder = t('search.ph'); inp.setAttribute('aria-label', t('search.ph')); if (!pop.hidden) draw(); });
}

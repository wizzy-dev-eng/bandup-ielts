/* ---------- account pages: sign up, log in, profile, edit, people ---------- */
Object.assign(D.i18n.en, { 'progress.subSync': 'Results are saved in your account and synced between devices.', 'people.title': 'People', 'profile.title': 'My goals', 'nav.profile': 'My profile' });
Object.assign(D.i18n.ru, { 'progress.subSync': 'Результаты сохраняются в аккаунте и синхронизируются между устройствами.', 'people.title': 'Люди', 'profile.title': 'Мои цели', 'nav.profile': 'Мой профиль' });
const goHash = h => setTimeout(() => { location.hash = h; }, 0);
function recentName(r) {
  const tk = TASK[r.taskId];
  if (tk) return [SKILL[tk.skill].icon, `${esc(tk.code)} · ${esc(tk.title)}`];
  if (r.kind === 'variant' || !r.taskId) { const v = D.variants.find(y => y.id === r.variantId); return [ic('compass'), esc(v ? v.title : (r.title || tr('Set', 'Набор')))]; }
  if (r.taskId === 'drill:tfng') return [ic('book'), t('drill.tfng')];
  if (r.taskId === 'drill:dictation') return [ic('type'), t('drill.dictation')];
  if (r.taskId === 'drill:quiz') return [ic('bulb'), t('quiz.title')];
  if (/^bank:/.test(r.taskId)) return [ic('pen'), `${t('skill.W')} · ${esc(r.taskId.slice(5))}`];
  return [ic('variants'), esc(r.title || r.taskId)];
}
function fld({ name, label, icon, type = 'text', ph = '', auto = '', value = '', max = 0, extra = '', hint = '', eye = false, st = false }) {
  const id = 'f-' + name;
  return `<div class="fld" data-f="${name}"><label class="fld-l" for="${id}">${esc(label)}</label>
  <div class="fld-in">${ic(icon)}<input class="inp" id="${id}" name="${name}" type="${type}" ${auto ? `autocomplete="${auto}"` : ''} placeholder="${esc(ph)}" value="${esc(value)}"${max ? ` maxlength="${max}"` : ''} spellcheck="false" autocapitalize="off" ${extra}>${st ? '<span class="fld-st" aria-hidden="true"></span>' : ''}${eye ? `<button type="button" class="fld-eye" data-eye aria-pressed="false" aria-label="${esc(tr('Show password', 'Показать пароль'))}">${ic('eye')}</button>` : ''}${max ? `<span class="fld-cnt">${[...value].length}/${max}</span>` : ''}</div>
  <p class="fld-msg" id="${id}-m" aria-live="polite">${hint ? `<span class="fld-hint">${esc(hint)}</span>` : ''}</p></div>`;
}
function pwRulesHtml() { return `<ul class="pw-rules" aria-label="${esc(tr('Password requirements', 'Требования к паролю'))}">${PW_RULES.map(([k, , l]) => `<li data-rule="${k}"><span class="pr-ic">${ic('check', 'draw')}</span>${esc(tr(l[0], l[1]))}</li>`).join('')}</ul>`; }
function bindFields(form) {
  form.addEventListener('click', e => {
    const b = e.target.closest('[data-eye]'); if (!b) return;
    const inp = $('input', b.parentElement), on = inp.type === 'password';
    inp.type = on ? 'text' : 'password'; b.setAttribute('aria-pressed', String(on)); b.innerHTML = ic(on ? 'eyeOff' : 'eye');
    b.setAttribute('aria-label', on ? tr('Hide password', 'Скрыть пароль') : tr('Show password', 'Показать пароль'));
  });
  form.addEventListener('input', e => { const c = e.target.parentElement && $('.fld-cnt', e.target.parentElement); if (c) c.textContent = `${[...e.target.value].length}/${e.target.maxLength}`; const f = e.target.closest('.fld'); if (f && f.classList.contains('bad')) setMsg(form, f.dataset.f, ''); });
}
function setMsg(form, name, msg, kind = 'bad') {
  const f = $(`[data-f="${name}"]`, form); if (!f) return;
  const m = $('.fld-msg', f), inp = $('input,textarea', f);
  f.classList.toggle('bad', !!msg && kind === 'bad'); f.classList.toggle('good', kind === 'good' && !!msg);
  if (msg) { m.innerHTML = `${ic(kind === 'bad' ? 'x' : 'check', 'draw')}<span>${esc(msg)}</span>`; inp && inp.setAttribute('aria-invalid', String(kind === 'bad')); }
  else { m.innerHTML = f.dataset.hint ? `<span class="fld-hint">${esc(f.dataset.hint)}</span>` : ''; inp && inp.removeAttribute('aria-invalid'); }
}
function bindPwRules(form, inp) {
  const upd = () => $$('[data-rule]', form).forEach(li => { const r = PW_RULES.find(x => x[0] === li.dataset.rule); li.classList.toggle('ok', r[1](inp.value)); });
  inp.addEventListener('input', upd); upd();
}
function loginChecker(form, name, current) {
  const inp = $(`[name="${name}"]`, form), st = $(`[data-f="${name}"] .fld-st`, form);
  let seq = 0, state = 'idle';
  const set = (s, msg, kind) => { state = s; if (st) st.dataset.s = s; setMsg(form, name, msg || '', kind); };
  const run = debounce(async () => {
    const v = inp.value.trim(), my = ++seq;
    if (!v) return set('idle');
    if (current && v.toLowerCase() === current.toLowerCase()) return set('idle');
    if (!LOGIN_RE.test(v)) return set('bad', v.length < 4 && /^[A-Za-z0-9_]*$/.test(v) ? tr('At least 4 characters', 'Минимум 4 символа') : tr('Only Latin letters, digits and _', 'Только латинские буквы, цифры и _'), 'bad');
    set('busy');
    try { const j = await api('check', { q: { login: v } }); if (my !== seq) return; j.ok ? set('ok', tr('Login is free', 'Логин свободен'), 'good') : set('bad', errText({ code: j.reason || 'login_taken' }), 'bad'); }
    catch (e) { if (my === seq) set('idle'); }
  }, 350);
  inp.addEventListener('input', () => { if (st) st.dataset.s = 'busy'; run(); });
  return { get state() { return state; } };
}
function busyBtn(b, on) { b.disabled = on; b.classList.toggle('busy', on); }
function authAside(mode) {
  const pts = mode === 'signup'
    ? [['chart', 'Progress on every device', 'Прогресс на всех устройствах'], ['user', 'A public profile with avatar', 'Публичный профиль с аватаром'], ['layers', 'Share your own task sets', 'Делись своими наборами заданий'], ['people', 'Find other learners', 'Находи других учеников']]
    : [['chart', 'Your results are saved in the cloud', 'Результаты сохраняются в облаке'], ['layers', 'Saved sets and drafts sync', 'Наборы и черновики синхронизируются'], ['lock', 'Sessions are protected', 'Сессии защищены']];
  return `<aside class="auth-aside glass"><div class="auth-logo">${logoSvg(64)}</div><h2 class="display"><span class="grad">${esc(mode === 'signup' ? tr('Join lynx.', 'Присоединяйся к lynx.') : tr('Welcome back', 'С возвращением'))}</span></h2>
  <ul class="auth-pts">${pts.map(([i, en, ru]) => `<li><span class="em">${ic(i)}</span><span>${esc(tr(en, ru))}</span></li>`).join('')}</ul></aside>`;
}
route(/^\/signup$/, (v, _, q) => {
  if (Auth.user) { goHash('#/u/' + Auth.user.login); return { title: t('auth.signup') }; }
  v.innerHTML = `<div class="page auth-page"><div class="auth-wrap">${authAside('signup')}
  <form class="glass auth-card" novalidate data-auth><h1 class="display page-title"><span class="grad">${esc(tr('Create an account', 'Создать аккаунт'))}</span></h1>
  <p class="muted">${esc(tr('Your local progress will move into the new account.', 'Твой текущий прогресс перенесётся в новый аккаунт.'))}</p>
  ${fld({ name: 'email', label: 'Email', icon: 'mail', type: 'email', auto: 'email', ph: 'name@example.com', extra: 'inputmode="email" required' })}
  ${fld({ name: 'login', label: tr('Login', 'Логин'), icon: 'at', auto: 'username', ph: 'lynx_fan', st: true, hint: tr('Latin letters, digits and _, from 4 characters. Others will see it in your profile link.', 'Латинские буквы, цифры и _, от 4 символов. Он будет в ссылке на твой профиль.'), extra: 'required maxlength="24"' })}
  ${fld({ name: 'nick', label: tr('Nickname', 'Ник'), icon: 'user', auto: 'nickname', ph: tr('How to call you', 'Как тебя называть'), max: 32, extra: 'required' })}
  ${fld({ name: 'password', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'new-password', eye: true, extra: 'required' })}
  ${pwRulesHtml()}
  ${fld({ name: 'password2', label: tr('Repeat password', 'Повтори пароль'), icon: 'lock', type: 'password', auto: 'new-password', eye: true, extra: 'required' })}
  <p class="form-err" data-err role="alert"></p>
  <button class="pill pill-white auth-submit" type="submit"><span class="spin" aria-hidden="true"></span>${ic('userPlus')}<span>${esc(tr('Create account', 'Создать аккаунт'))}</span></button>
  <p class="auth-alt">${esc(tr('Already have an account?', 'Уже есть аккаунт?'))} <a href="#/login${q.get('next') ? '?next=' + encodeURIComponent(q.get('next')) : ''}">${esc(t('auth.login'))}</a></p></form></div></div>`;
  const f = $('[data-auth]', v);
  $$('.fld', f).forEach(x => { const h = $('.fld-hint', x); if (h) x.dataset.hint = h.textContent; });
  bindFields(f); bindPwRules(f, f.password); const lc = loginChecker(f, 'login');
  f.password2.addEventListener('input', () => { if (f.password2.value && f.password2.value === f.password.value) setMsg(f, 'password2', tr('Passwords match', 'Пароли совпадают'), 'good'); else setMsg(f, 'password2', ''); });
  f.addEventListener('submit', async e => {
    e.preventDefault(); const err = $('[data-err]', f); err.textContent = '';
    const d = { email: f.email.value.trim(), login: f.login.value.trim(), nick: f.nick.value.trim(), password: f.password.value };
    let bad = null; const flag = (n, m) => { setMsg(f, n, m); bad = bad || n; };
    if (!EMAIL_RE.test(d.email)) flag('email', errText({ code: 'email_bad' }));
    if (!LOGIN_RE.test(d.login)) flag('login', errText({ code: 'login_bad' })); else if (lc.state === 'bad') bad = bad || 'login';
    if (!d.nick || [...d.nick].length > 32) flag('nick', errText({ code: 'nick_bad' }));
    if (!pwOk(d.password)) flag('password', errText({ code: 'pw_weak' }));
    if (f.password2.value !== d.password) flag('password2', errText({ code: 'pw_mismatch' }));
    if (bad) { f[bad].focus(); return; }
    const b = $('.auth-submit', f); busyBtn(b, true);
    try { const u = await Auth.signup(d); toast(tr(`Welcome, ${u.nick}!`, `Добро пожаловать, ${u.nick}!`)); location.hash = q.get('next') || '#/u/' + u.login; }
    catch (ex) { const map = { email_bad: 'email', email_taken: 'email', login_bad: 'login', login_taken: 'login', nick_bad: 'nick', pw_weak: 'password' }; if (map[ex.code]) { setMsg(f, map[ex.code], errText(ex)); f[map[ex.code]].focus(); } else err.textContent = errText(ex); }
    finally { busyBtn(b, false); }
  });
  return { title: t('auth.signup'), nav: 'signup', relang: true };
});
route(/^\/login$/, (v, _, q) => {
  if (Auth.user) { goHash('#/u/' + Auth.user.login); return { title: t('auth.login') }; }
  v.innerHTML = `<div class="page auth-page"><div class="auth-wrap">${authAside('login')}
  <form class="glass auth-card" novalidate data-auth><h1 class="display page-title"><span class="grad">${esc(t('auth.login'))}</span></h1>
  <p class="muted">${esc(tr('Log in to sync your progress, sets and profile.', 'Войди, чтобы синхронизировать прогресс, наборы и профиль.'))}</p>
  ${fld({ name: 'id', label: tr('Email or login', 'Email или логин'), icon: 'mail', auto: 'username', ph: 'name@example.com', extra: 'required' })}
  ${fld({ name: 'password', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true, extra: 'required' })}
  <p class="form-err" data-err role="alert"></p>
  <button class="pill pill-white auth-submit" type="submit"><span class="spin" aria-hidden="true"></span>${ic('login')}<span>${esc(t('auth.login'))}</span></button>
  <p class="auth-alt">${esc(tr('No account yet?', 'Ещё нет аккаунта?'))} <a href="#/signup${q.get('next') ? '?next=' + encodeURIComponent(q.get('next')) : ''}">${esc(t('auth.signup'))}</a></p></form></div></div>`;
  const f = $('[data-auth]', v); bindFields(f);
  f.addEventListener('submit', async e => {
    e.preventDefault(); const err = $('[data-err]', f); err.textContent = '';
    if (!f.id.value.trim()) { setMsg(f, 'id', tr('Enter your email or login', 'Введи email или логин')); f.id.focus(); return; }
    if (!f.password.value) { setMsg(f, 'password', tr('Enter the password', 'Введи пароль')); f.password.focus(); return; }
    const b = $('.auth-submit', f); busyBtn(b, true);
    try { const u = await Auth.login(f.id.value.trim(), f.password.value); toast(tr(`Hi, ${u.nick}!`, `Привет, ${u.nick}!`)); location.hash = q.get('next') || '#/u/' + u.login; }
    catch (ex) { err.textContent = errText(ex); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
    finally { busyBtn(b, false); }
  });
  return { title: t('auth.login'), nav: 'login', relang: true };
});

/* ---------- profile ---------- */
const SKILL_KEYS = ['L', 'R', 'W', 'S'];
function setCard(s, own) {
  const kinds = [...new Set((s.items || []).map(it => it.t === 'task' && TASK[it.id] ? TASK[it.id].skill : (it.t === 'tfng' || it.t === 'dict') ? 'D' : (it.t === 'w1' || it.t === 'w2') ? 'W' : it.t === 'sp' ? 'S' : null).filter(Boolean))];
  return `<article class="glass card set-card pub-set"><div class="row between"><span class="kicker">${s.mode === 'exam' ? T('task.exam') : T('task.practice')}</span><span class="vic" aria-hidden="true">${kinds.map(k => k === 'D' ? ic('bolt') : SKILL[k].icon).join('')}</span></div>
  <h3>${esc(s.name || 'Set')}</h3><p class="faint">${tasksN((s.items || []).length)}${s.created ? ' · ' + fmtDate(s.created) : ''}</p>
  <div class="row set-acts"><a class="pill pill-sm pill-white" href="#/set?code=${encodeSet(s)}">${ic('play')} ${T('builder.open')}</a><button type="button" class="pill pill-sm pill-outline" data-dl="${esc(s.id)}">${ic('download')} JSON</button>${own ? '' : `<button type="button" class="icon-btn" data-copyset="${esc(s.id)}" aria-label="${esc(tr('Save to my sets', 'Сохранить к себе'))}" title="${esc(tr('Save to my sets', 'Сохранить к себе'))}">${ic('save')}</button>`}</div></article>`;
}
function downloadJson(name, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name.replace(/[^\p{L}\p{N}_.-]+/gu, '-').replace(/-+/g, '-') + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function profileHtml(u, me) {
  const s = u.stats || {}, sk = s.skills || {};
  const stat = (icon, n, l) => `<div class="glass stat pstat"><span class="em">${ic(icon)}</span><div><div class="k">${esc(String(n))}</div><div class="v">${esc(l)}</div></div></div>`;
  const bars = SKILL_KEYS.map(k => { const x = sk[k] || { n: 0 }; const pct = x.best != null ? x.best : Math.min(100, (x.n || 0) * 20); return `<div class="sbar"><span class="sb-l">${SKILL[k].icon}${T('skill.' + k)}</span><span class="sb-t"><i style="--w:${pct}%"></i></span><span class="sb-v">${x.best != null ? x.best + '%' : x.n ? x.n + '×' : '—'}</span></div>`; }).join('');
  const sets = u.sets || [];
  return `<section class="prof glass" style="--h:${hashHue(u.login)}"><div class="prof-cover" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="prof-main">${avatarHtml(u, 116, 'prof-av')}
    <div class="prof-id"><h1 class="display page-title" tabindex="-1">${esc(u.nick)}</h1><p class="prof-login">@${esc(u.login)}${me ? `<span class="lp ok">${ic('check')} ${esc(tr('This is you', 'Это ты'))}</span>` : ''}</p></div>
    <div class="prof-acts">${me ? `<a class="pill pill-white pill-sm" href="#/me">${ic('pen')} ${esc(tr('Edit profile', 'Редактировать'))}</a><button type="button" class="pill pill-outline pill-sm" data-logout>${ic('logout')} ${esc(t('auth.logout'))}</button>` : `<button type="button" class="pill pill-glass pill-sm" data-copylink>${ic('link')} ${esc(tr('Copy link', 'Скопировать ссылку'))}</button>`}</div></div>
  ${u.bio ? `<p class="prof-bio">${esc(u.bio)}</p>` : me ? `<p class="prof-bio faint">${esc(tr('Add a few words about yourself in the profile settings.', 'Добавь пару слов о себе в настройках профиля.'))}</p>` : ''}
  <div class="prof-meta"><span>${ic('calendar')} ${esc(tr('Joined', 'С нами с'))} ${fmtDate(u.created, true)}</span>${u.seen ? `<span>${ic('clock')} ${esc(tr('Active', 'Активность'))}: ${fmtDate(u.seen, true)}</span>` : ''}${s.level ? `<span>${ic('target')} ${esc(tr('Level', 'Уровень'))} ${esc(s.level)}</span>` : ''}</div></section>
  <div class="grid g4 prof-stats">${stat('chart', s.attempts || 0, tr('attempts', 'попыток'))}${stat('practice', `${s.tasks || 0}/12`, tr('tasks done', 'заданий пройдено'))}${stat('variants', s.variants || 0, tr('variants finished', 'вариантов пройдено'))}${stat('layers', sets.length, tr('public sets', 'публичных наборов'))}</div>
  <section class="sec"><div class="grid g2 prof-row"><div class="glass panel"><h2 class="grp-title">${ic('chart')} ${esc(tr('Skills', 'Навыки'))}</h2><p class="faint" style="margin:4px 0 14px;font-size:13px">${esc(tr('Best result in Listening and Reading, number of attempts in Writing and Speaking.', 'Лучший результат в Listening и Reading, число попыток в Writing и Speaking.'))}</p><div class="sbars">${bars}</div></div>
  <div class="glass panel"><h2 class="grp-title">${ic('star')} ${esc(tr('Recent activity', 'Последние результаты'))}</h2>${(s.recent || []).length ? `<ul class="recent">${s.recent.map(r => { const nm = recentName(r); return `<li><span class="em">${nm[0]}</span><span class="rt"><b>${nm[1]}</b><small>${fmtDate(r.date)}</small></span>${r.total ? `<span class="lp">${r.score}/${r.total}</span>` : ''}</li>`; }).join('')}</ul>` : `<p class="muted">${esc(tr('No results yet.', 'Пока нет результатов.'))}</p>`}</div></div></section>
  <section class="sec"><div class="sec-head"><span class="glass-pill">${ic('layers')} ${esc(tr('Showcase', 'Витрина'))}</span><h2 class="sec-title display"><span class="grad">${esc(tr('Public sets', 'Публичные наборы'))}</span></h2>${me ? `<p class="muted">${esc(tr('Open the builder and press the eye button on a saved set to show it here.', 'Открой конструктор и нажми на «глаз» у сохранённого набора, чтобы показать его здесь.'))}</p>` : ''}</div>
  ${sets.length ? `<div class="grid g3">${sets.map(x => setCard(x, me)).join('')}</div>` : `<div class="glass empty"><div class="em em-lg">${ic('layers')}</div><p>${esc(me ? tr('You have no public sets yet.', 'У тебя пока нет публичных наборов.') : tr('No public sets yet.', 'Публичных наборов пока нет.'))}</p>${me ? `<a class="pill pill-white pill-sm" href="#/builder">${ic('builder')} ${T('nav.builder')}</a>` : ''}</div>`}</section>`;
}
function loadingHtml() { return `<div class="glass loading-card"><span class="spin big" aria-hidden="true"></span><span>${esc(t('common.loading'))}</span></div>`; }
function errorCard(e, retry) { return `<div class="glass empty"><div class="em em-lg">${ic(e.code === 'not_found' ? 'search' : 'alert')}</div><p>${esc(errText(e))}</p><div class="row" style="justify-content:center">${retry ? `<button class="pill pill-white pill-sm" data-retry>${ic('replay')} ${esc(tr('Try again', 'Повторить'))}</button>` : ''}<a class="pill pill-outline pill-sm" href="#/people">${ic('people')} ${T('people.title')}</a></div></div>`; }
route(/^\/u\/([A-Za-z0-9_]{1,40})$/, (v, [login]) => {
  const me = !!(Auth.user && Auth.user.login.toLowerCase() === login.toLowerCase());
  v.innerHTML = `<div class="page prof-page"><div data-pv>${loadingHtml()}</div></div>`;
  const box = $('[data-pv]', v), tok = renderTok;
  let user = null;
  const load = () => api('user', { q: { login } }).then(j => {
    if (tok !== renderTok) return; user = j.user; box.innerHTML = profileHtml(user, me); document.title = `${D.meta.brand} – ${user.nick} (@${user.login})`;
    if (me && Auth.user && (Auth.user.avatar !== user.avatar || Auth.user.nick !== user.nick)) Auth.setUser({ ...Auth.user, avatar: user.avatar, nick: user.nick });
  }).catch(e => { if (tok !== renderTok) return; box.innerHTML = errorCard(e, e.code !== 'not_found'); const r = $('[data-retry]', box); r && r.addEventListener('click', () => { box.innerHTML = loadingHtml(); load(); }); });
  load();
  box.addEventListener('click', e => {
    const dl = e.target.closest('[data-dl]'), cp = e.target.closest('[data-copyset]');
    if (e.target.closest('[data-copylink]')) { navigator.clipboard && navigator.clipboard.writeText(location.href.split('#')[0] + '#/u/' + user.login).then(() => toast(t('common.copy'))); }
    if (dl && user) { const s = user.sets.find(x => x.id === dl.dataset.dl); if (s) downloadJson(`lynx-${user.login}-${s.name || s.id}`, { format: 'lynx.set', version: 1, author: '@' + user.login, ...s }); }
    if (cp && user) { const s = user.sets.find(x => x.id === cp.dataset.copyset); if (s) { Sets.save({ ...s, id: uid('set'), public: false, from: '@' + user.login, created: Date.now() }); toast(tr('Saved to your sets', 'Сохранено в твои наборы')); } }
  });
  return { title: '@' + login, nav: me ? 'me' : 'people', relang: true, auth: true };
});
route(/^\/me$/, v => {
  if (!Auth.user) { goHash('#/login?next=' + encodeURIComponent('#/me')); return { title: t('auth.login') }; }
  const u = Auth.user;
  v.innerHTML = `<div class="page me-page">${pageHead(`${ic('user')} @${esc(u.login)}`, null, null, tr('Edit profile', 'Редактирование профиля'))}
  <div class="grid g2 me-grid">
   <form class="glass panel me-card" data-pf novalidate><h2 class="grp-title">${ic('user')} ${esc(tr('Profile', 'Профиль'))}</h2>
    <div class="av-edit">${avatarHtml(u, 96, 'me-av')}<div class="stack"><label class="pill pill-sm pill-white file-btn">${ic('camera')} ${esc(tr('Upload photo', 'Загрузить фото'))}<input type="file" accept="image/*" data-avfile hidden></label>${u.avatar ? `<button type="button" class="txt-btn" data-avrm>${ic('trash')} ${esc(tr('Remove photo', 'Удалить фото'))}</button>` : ''}<p class="faint" style="font-size:12.5px;margin:0">${esc(tr('JPG, PNG or WebP. It will be cropped to a square.', 'JPG, PNG или WebP. Фото обрежется до квадрата.'))}</p></div></div>
    ${fld({ name: 'nick', label: tr('Nickname', 'Ник'), icon: 'user', value: u.nick, max: 32 })}
    <div class="fld" data-f="bio"><label class="fld-l" for="f-bio">${esc(tr('About me', 'О себе'))}</label><div class="fld-in ta">${ic('note')}<textarea class="inp" id="f-bio" name="bio" maxlength="200" rows="3" placeholder="${esc(tr('Target band, favourite skill, exam date…', 'Цель, любимый навык, дата экзамена…'))}">${esc(u.bio || '')}</textarea><span class="fld-cnt">${[...(u.bio || '')].length}/200</span></div><p class="fld-msg"></p></div>
    <div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('save')} ${esc(t('profile.save'))}</button><a class="pill pill-outline" href="#/u/${esc(u.login)}">${ic('eye')} ${esc(tr('View profile', 'Открыть профиль'))}</a></div></form>
   <form class="glass panel me-card" data-lf novalidate><h2 class="grp-title">${ic('at')} ${esc(tr('Account', 'Аккаунт'))}</h2>
    ${fld({ name: 'email', label: 'Email', icon: 'mail', value: u.email || '', extra: 'readonly' })}
    ${fld({ name: 'login', label: tr('Login', 'Логин'), icon: 'at', value: u.login, st: true, extra: 'maxlength="24"', hint: u.nextLoginChange && new Date(u.nextLoginChange) > new Date() ? tr('Next change: ', 'Следующая смена: ') + fmtDate(u.nextLoginChange, true) : tr('The login can be changed once every 30 days.', 'Логин можно менять раз в 30 дней.') })}
    <div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('check')} ${esc(tr('Change login', 'Сменить логин'))}</button></div></form>
   <form class="glass panel me-card" data-pwf novalidate><h2 class="grp-title">${ic('lock')} ${esc(tr('Password', 'Пароль'))}</h2>
    ${fld({ name: 'old', label: tr('Current password', 'Текущий пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}
    ${fld({ name: 'password', label: tr('New password', 'Новый пароль'), icon: 'lock', type: 'password', auto: 'new-password', eye: true })}
    ${pwRulesHtml()}
    ${fld({ name: 'password2', label: tr('Repeat new password', 'Повтори новый пароль'), icon: 'lock', type: 'password', auto: 'new-password', eye: true })}
    <div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('lock')} ${esc(tr('Change password', 'Сменить пароль'))}</button></div></form>
   <div class="glass panel me-card danger"><h2 class="grp-title">${ic('alert')} ${esc(tr('Session and account', 'Сессия и аккаунт'))}</h2><p class="muted">${esc(tr('Logging out clears your results from this browser; they stay in your account.', 'При выходе результаты удаляются из этого браузера, но остаются в аккаунте.'))}</p>
    <div class="row"><button type="button" class="pill pill-outline" data-logout>${ic('logout')} ${esc(t('auth.logout'))}</button><button type="button" class="pill pill-danger" data-delacc>${ic('trash')} ${esc(tr('Delete account', 'Удалить аккаунт'))}</button></div></div>
  </div></div>`;
  $$('.fld', v).forEach(x => { const h = $('.fld-hint', x); if (h) x.dataset.hint = h.textContent; });
  const pf = $('[data-pf]', v), lf = $('[data-lf]', v), pwf = $('[data-pwf]', v);
  [pf, lf, pwf].forEach(bindFields); bindPwRules(pwf, pwf.password);
  const lc = loginChecker(lf, 'login', u.login);
  const withBusy = async (form, fn) => { const b = $('button[type=submit]', form); busyBtn(b, true); try { await fn(); } finally { busyBtn(b, false); } };
  const patch = async body => { const j = await api('profile', { method: 'PATCH', body }); Auth.setUser(j.user); return j.user; };
  pf.addEventListener('submit', e => { e.preventDefault(); const nick = pf.nick.value.trim(); if (!nick) { setMsg(pf, 'nick', errText({ code: 'nick_bad' })); return; }
    withBusy(pf, async () => { try { await patch({ nick, bio: pf.bio.value.trim() }); toast(t('profile.saved')); } catch (ex) { setMsg(pf, ex.code === 'bio_bad' ? 'bio' : 'nick', errText(ex)); } }); });
  lf.addEventListener('submit', e => { e.preventDefault(); const nl = lf.login.value.trim();
    if (nl === u.login) return setMsg(lf, 'login', errText({ code: 'login_same' }));
    if (!LOGIN_RE.test(nl)) return setMsg(lf, 'login', errText({ code: 'login_bad' }));
    withBusy(lf, async () => { try { const nu = await patch({ login: nl }); toast(tr('Login changed', 'Логин изменён')); render({ instant: true }); } catch (ex) { setMsg(lf, 'login', errText(ex)); } }); });
  pwf.addEventListener('submit', e => { e.preventDefault();
    if (!pwf.old.value) return setMsg(pwf, 'old', tr('Enter the current password', 'Введи текущий пароль'));
    if (!pwOk(pwf.password.value)) return setMsg(pwf, 'password', errText({ code: 'pw_weak' }));
    if (pwf.password.value !== pwf.password2.value) return setMsg(pwf, 'password2', errText({ code: 'pw_mismatch' }));
    withBusy(pwf, async () => { try { await api('password', { method: 'POST', body: { old: pwf.old.value, password: pwf.password.value } }); pwf.reset(); bindPwRules(pwf, pwf.password); toast(tr('Password changed', 'Пароль изменён')); } catch (ex) { setMsg(pwf, ex.code === 'pw_weak' ? 'password' : 'old', errText(ex)); } }); });
  $('[data-avfile]', v).addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { const url = await squareJpeg(file, 192); await patch({ avatar: url }); toast(tr('Photo updated', 'Фото обновлено')); render({ instant: true }); }
    catch (ex) { toast(errText(ex.code ? ex : { code: 'avatar_bad' })); }
  });
  const rm = $('[data-avrm]', v); if (rm) rm.addEventListener('click', async () => { try { await patch({ avatar: null }); render({ instant: true }); } catch (ex) { toast(errText(ex)); } });
  $('[data-delacc]', v).addEventListener('click', () => {
    openDialog({ title: tr('Delete the account?', 'Удалить аккаунт?'), body: `<p class="muted">${esc(tr('The profile, saved results and public sets will be deleted for ever. Enter the password to confirm.', 'Профиль, сохранённые результаты и публичные наборы удалятся навсегда. Введи пароль для подтверждения.'))}</p><form data-df novalidate>${fld({ name: 'pw', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}</form>`,
      actions: `<button class="pill pill-outline" data-close>${esc(tr('Cancel', 'Отмена'))}</button><button class="pill pill-danger" data-okdel><span class="spin" aria-hidden="true"></span>${ic('trash')} ${esc(tr('Delete', 'Удалить'))}</button>`,
      onOpen: (d, close) => { const df = $('[data-df]', d); bindFields(df); df.pw.focus(); const go = async e => { e && e.preventDefault(); const b = $('[data-okdel]', d); busyBtn(b, true); try { await api('delete', { method: 'POST', body: { password: df.pw.value } }); close('ok'); Sync.clearLocal(); Auth.setUser(null); toast(tr('The account has been deleted', 'Аккаунт удалён')); location.hash = '#/'; } catch (ex) { setMsg(df, 'pw', errText(ex)); } finally { busyBtn(b, false); } }; df.addEventListener('submit', go); $('[data-okdel]', d).addEventListener('click', go); } });
  });
  return { title: tr('Edit profile', 'Редактирование профиля'), nav: 'me', relang: true, auth: true };
});
function squareJpeg(file, size) {
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type) || file.size > 15e6) return rej(new Error('bad'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const s = Math.min(img.naturalWidth, img.naturalHeight); if (!s) { URL.revokeObjectURL(url); return rej(new Error('bad')); } const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .86)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad')); };
    img.src = url;
  });
}

/* ---------- people ---------- */
function personCard(p) {
  return `<a class="glass card person" href="#/u/${esc(p.login)}" style="--h:${hashHue(p.login)}">${avatarHtml(p, 56)}<div class="pc-t"><b>${esc(p.nick)}</b><span>@${esc(p.login)}</span>${p.bio ? `<small>${esc(p.bio)}</small>` : ''}</div><div class="pc-m"><span class="lp">${ic('chart')} ${p.attempts || 0}</span><span class="lp">${ic('practice')} ${p.tasks || 0}/12</span></div>${ic('arrow', 'pc-go')}</a>`;
}
route(/^\/people$/, (v, _, q) => {
  let qs = q.get('q') || '';
  v.innerHTML = `<div class="page people-page">${pageHead(`${ic('people')} lynx.`, 'people.title', null)}<p class="page-sub">${esc(tr('Find other learners by login or nickname and look at their public sets.', 'Находи других учеников по логину или нику и смотри их публичные наборы.'))}</p>
  <label class="big-search glass" for="pq">${ic('search')}<input id="pq" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(tr('Login or nickname', 'Логин или ник'))}" value="${esc(qs)}"><span class="spin" aria-hidden="true"></span></label>
  <p class="faint people-cnt" data-cnt aria-live="polite"></p><div class="grid g3" data-pl></div></div>`;
  const inp = $('#pq', v), list = $('[data-pl]', v), cnt = $('[data-cnt]', v), lbl = $('.big-search', v), tok = renderTok;
  let seq = 0;
  const load = async () => {
    const my = ++seq; lbl.classList.add('busy');
    try {
      const j = await api('users', { q: { q: qs } }); if (my !== seq || tok !== renderTok) return;
      cnt.textContent = qs ? tr(`Found: ${j.users.length}`, `Найдено: ${j.users.length}`) : tr('Recently active', 'Недавно активные');
      list.innerHTML = j.users.length ? j.users.map(personCard).join('') : `<div class="glass empty" style="grid-column:1/-1"><div class="em em-lg">${ic('people')}</div><p>${esc(tr(`No one found for «${qs}».`, `По запросу «${qs}» никого не нашли.`))}</p>${Auth.user ? '' : `<a class="pill pill-white pill-sm" href="#/signup">${ic('userPlus')} ${T('auth.signup')}</a>`}</div>`;
    } catch (e) { if (my === seq && tok === renderTok) { cnt.textContent = ''; list.innerHTML = `<div style="grid-column:1/-1">${errorCard(e, true)}</div>`; const r = $('[data-retry]', list); r && r.addEventListener('click', load); } }
    finally { if (my === seq) lbl.classList.remove('busy'); }
  };
  inp.addEventListener('input', debounce(() => { qs = inp.value.trim(); const p = new URLSearchParams(); if (qs) p.set('q', qs); setQuery(p); load(); }, 300));
  load(); if (!qs) setTimeout(() => inp.focus({ preventScroll: true }), 60);
  return { title: t('people.title'), nav: 'people', relang: true };
});

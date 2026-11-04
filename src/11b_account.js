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
    : mode === 'forgot' ? [['key', 'No email needed', 'Почта не нужна'], ['shieldCheck', 'An admin confirms it is you', 'Админ подтверждает, что это ты'], ['lock', 'Old sessions are closed', 'Старые сессии закрываются']]
    : [['chart', 'Your results are saved in the cloud', 'Результаты сохраняются в облаке'], ['layers', 'Saved sets and drafts sync', 'Наборы и черновики синхронизируются'], ['lock', 'Sessions are protected', 'Сессии защищены']];
  return `<aside class="auth-aside glass"><div class="auth-logo">${logoSvg(64)}</div><h2 class="display"><span class="grad">${esc(mode === 'signup' ? tr('Join lynx.', 'Присоединяйся к lynx.') : mode === 'forgot' ? tr('Get back in', 'Вернуть доступ') : tr('Welcome back', 'С возвращением'))}</span></h2>
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
  bindFields(f); bindPwRules(f, f.password); const lc = loginChecker(f, 'login'); consentGate(f);
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
    if (!consentOk()) { consentGate(f, true); return; }
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
  <p class="forgot-l"><a href="#/forgot">${ic('key')} ${esc(tr('Forgot password?', 'Забыл пароль?'))}</a></p>
  <p class="form-err" data-err role="alert"></p>
  <button class="pill pill-white auth-submit" type="submit"><span class="spin" aria-hidden="true"></span>${ic('login')}<span>${esc(t('auth.login'))}</span></button>
  <p class="auth-alt">${esc(tr('No account yet?', 'Ещё нет аккаунта?'))} <a href="#/signup${q.get('next') ? '?next=' + encodeURIComponent(q.get('next')) : ''}">${esc(t('auth.signup'))}</a></p></form></div></div>`;
  const f = $('[data-auth]', v); bindFields(f); consentGate(f);
  f.addEventListener('submit', async e => {
    e.preventDefault(); const err = $('[data-err]', f); err.textContent = '';
    if (!consentOk()) { consentGate(f, true); return; }
    if (!f.id.value.trim()) { setMsg(f, 'id', tr('Enter your email or login', 'Введи email или логин')); f.id.focus(); return; }
    if (!f.password.value) { setMsg(f, 'password', tr('Enter the password', 'Введи пароль')); f.password.focus(); return; }
    const b = $('.auth-submit', f); busyBtn(b, true);
    try { const u = await Auth.login(f.id.value.trim(), f.password.value); toast(tr(`Hi, ${u.nick}!`, `Привет, ${u.nick}!`)); location.hash = q.get('next') || '#/u/' + u.login; }
    catch (ex) { err.textContent = errText(ex); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
    finally { busyBtn(b, false); }
  });
  return { title: t('auth.login'), nav: 'login', relang: true };
});

/* ---------- forgot password: request → staff approval → new password (no email) ---------- */
const RESET_KEY = 'lynx.reset';
route(/^\/forgot$/, v => {
  if (Auth.user) { goHash('#/me'); return { title: tr('Password reset', 'Сброс пароля') }; }
  v.innerHTML = `<div class="page auth-page"><div class="auth-wrap">${authAside('forgot')}<div class="glass auth-card" data-rs-box></div></div></div>`;
  const box = $('[data-rs-box]', v), tok = renderTok;
  let timer = 0; onCleanup(() => clearTimeout(timer));
  const head = (title, sub) => `<h1 class="display page-title" tabindex="-1"><span class="grad">${esc(title)}</span></h1>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}`;
  const steps = n => `<ol class="rs-steps" aria-label="${esc(tr('Steps', 'Шаги'))}">${[tr('Request', 'Запрос'), tr('Admin check', 'Проверка'), tr('New password', 'Новый пароль')].map((x, i) => `<li class="${i < n ? 'done' : i === n ? 'cur' : ''}"><span>${i < n ? ic('check') : i + 1}</span>${esc(x)}</li>`).join('')}</ol>`;
  const form1 = () => {
    box.innerHTML = `${head(tr('Forgot your password?', 'Забыл пароль?'), tr('There is no email in lynx. yet, so an administrator checks the request by hand. After approval you set a new password right here, in this browser.', 'Писем lynx. пока не отправляет, поэтому запрос вручную проверяет администратор. После одобрения новый пароль задаётся прямо здесь, в этом браузере.'))}${steps(0)}
    <form novalidate data-f1>${fld({ name: 'id', label: tr('Email or login', 'Email или логин'), icon: 'mail', auto: 'username', ph: 'name@example.com', extra: 'required' })}
    <div class="fld" data-f="note"><label class="fld-l" for="f-note">${esc(tr('Note for the admin (optional)', 'Комментарий для админа (необязательно)'))}</label><div class="fld-in ta">${ic('note')}<textarea class="inp" id="f-note" name="note" maxlength="300" rows="3" placeholder="${esc(tr('Something that proves the account is yours: when you signed up, your sets, your nickname…', 'То, что подтвердит, что аккаунт твой: когда регистрировался, какие наборы, ник…'))}"></textarea><span class="fld-cnt">0/300</span></div><p class="fld-msg"></p></div>
    <p class="form-err" data-err role="alert"></p>
    <button class="pill pill-white auth-submit" type="submit"><span class="spin" aria-hidden="true"></span>${ic('key')}<span>${esc(tr('Send the request', 'Отправить запрос'))}</span></button></form>
    <p class="auth-alt"><a href="#/login">${ic('back')} ${esc(t('auth.login'))}</a></p>`;
    const f = $('[data-f1]', box); bindFields(f);
    f.addEventListener('submit', async e => {
      e.preventDefault(); const err = $('[data-err]', f); err.textContent = '';
      const id = f.id.value.trim(); if (!id) { setMsg(f, 'id', tr('Enter your email or login', 'Введи email или логин')); f.id.focus(); return; }
      const b = $('.auth-submit', f); busyBtn(b, true);
      try { const j = await api('reset_request', { method: 'POST', body: { id, note: f.note.value.trim() } }); store.set(RESET_KEY, { rid: j.rid, token: j.token, login: j.login, ts: Date.now() }); show(); }
      catch (ex) { err.textContent = ex.code === 'protected' ? tr('This account cannot be restored this way.', 'Этот аккаунт нельзя восстановить таким способом.') : errText(ex); }
      finally { busyBtn(b, false); }
    });
  };
  const again = () => { store.del(RESET_KEY); form1(); };
  const msg = (icon, cls, title, text, n) => {
    box.innerHTML = `${head(tr('Password reset', 'Сброс пароля'))}${steps(n)}<div class="rs-state ${cls}"><span class="rs-ic">${ic(icon)}</span><div><b>${esc(title)}</b><p>${esc(text)}</p></div></div>
    <div class="row rs-acts"><button type="button" class="pill pill-outline pill-sm" data-again>${ic('replay')} ${esc(tr('New request', 'Новый запрос'))}</button><a class="pill pill-glass pill-sm" href="#/login">${ic('login')} ${esc(t('auth.login'))}</a></div>`;
    $('[data-again]', box).addEventListener('click', again);
  };
  const waiting = st => {
    box.innerHTML = `${head(tr('Request sent', 'Запрос отправлен'))}${steps(1)}<div class="rs-state wait"><span class="rs-ic"><span class="spin big" aria-hidden="true"></span></span><div><b>@${esc(st.login)}</b><p>${esc(tr('An administrator will check the request soon. Keep this page open or come back later in this browser – the status updates by itself.', 'Администратор скоро проверит запрос. Держи страницу открытой или вернись позже в этом же браузере – статус обновится сам.'))}</p></div></div>
    <div class="row rs-acts"><button type="button" class="pill pill-outline pill-sm" data-cancel>${ic('x')} ${esc(tr('Cancel the request', 'Отменить запрос'))}</button></div>`;
    $('[data-cancel]', box).addEventListener('click', again);
  };
  const newPw = st => {
    box.innerHTML = `${head(tr('Set a new password', 'Новый пароль'), tr('The request was approved. Choose a new password for ', 'Запрос одобрен. Придумай новый пароль для ') + '@' + st.login + '.')}${steps(2)}
    <form novalidate data-f2>${fld({ name: 'password', label: tr('New password', 'Новый пароль'), icon: 'lock', type: 'password', auto: 'new-password', eye: true })}${pwRulesHtml()}${fld({ name: 'password2', label: tr('Repeat new password', 'Повтори новый пароль'), icon: 'lock', type: 'password', auto: 'new-password', eye: true })}
    <p class="form-err" data-err role="alert"></p><button class="pill pill-white auth-submit" type="submit"><span class="spin" aria-hidden="true"></span>${ic('check')}<span>${esc(tr('Save the password', 'Сохранить пароль'))}</span></button></form>`;
    const f = $('[data-f2]', box); bindFields(f); bindPwRules(f, f.password); f.password.focus();
    f.addEventListener('submit', async e => {
      e.preventDefault(); const err = $('[data-err]', f); err.textContent = '';
      if (!pwOk(f.password.value)) return setMsg(f, 'password', errText({ code: 'pw_weak' }));
      if (f.password.value !== f.password2.value) return setMsg(f, 'password2', errText({ code: 'pw_mismatch' }));
      const b = $('.auth-submit', f); busyBtn(b, true);
      try { await api('reset_finish', { method: 'POST', body: { rid: st.rid, token: st.token, password: f.password.value } }); store.del(RESET_KEY); toast(tr('Password changed. Log in with the new one.', 'Пароль изменён. Войди с новым паролем.')); location.hash = '#/login'; }
      catch (ex) { if (ex.code === 'reset_state' || ex.code === 'not_found') show(); else err.textContent = errText(ex); }
      finally { busyBtn(b, false); }
    });
  };
  const show = async (quiet) => {
    clearTimeout(timer);
    const st = store.get(RESET_KEY, null);
    if (!st || !st.rid || !st.token) return form1();
    if (!quiet) box.innerHTML = `<div class="loading-card"><span class="spin big" aria-hidden="true"></span><span>${esc(t('common.loading'))}</span></div>`;
    let state;
    try { state = (await api('reset_status', { q: { rid: st.rid, token: st.token } })).state; }
    catch (ex) { if (tok !== renderTok) return; if (ex.code === 'not_found') state = 'expired'; else { timer = setTimeout(() => show(true), 15000); return; } }
    if (tok !== renderTok) return;
    if (state === 'pending') { if (!$('[data-cancel]', box)) waiting(st); timer = setTimeout(() => show(true), 8000); }
    else if (state === 'approved') newPw(st);
    else if (state === 'rejected') msg('ban', 'bad', tr('The request was rejected', 'Запрос отклонён'), tr('The administrator could not confirm that the account is yours. You can send a new request with a more detailed note.', 'Администратор не смог подтвердить, что аккаунт твой. Можно отправить новый запрос с более подробным комментарием.'), 1);
    else if (state === 'done') { store.del(RESET_KEY); msg('check', 'ok', tr('The password has already been changed', 'Пароль уже изменён'), tr('Log in with the new password.', 'Войди с новым паролем.'), 3); }
    else msg('clock', 'bad', tr('The request is no longer valid', 'Запрос больше не действует'), state === 'replaced' ? tr('A newer request was sent for this account.', 'Для этого аккаунта отправлен более новый запрос.') : tr('It has expired. Send a new one.', 'Срок действия истёк. Отправь новый.'), 1);
  };
  show();
  return { title: tr('Password reset', 'Сброс пароля'), nav: 'login', relang: true };
});

/* ---------- profile ---------- */
const SKILL_KEYS = ['L', 'R', 'W', 'S'];
const SET_KIND_TIP = { L: ['Listening', 'Listening'], R: ['Reading', 'Reading'], W: ['Writing', 'Writing'], S: ['Speaking', 'Speaking'], D: ['Drills', 'Тренажёры'] };
function setCard(s, own, canDel) {
  const kinds = [...new Set((s.items || []).map(it => it.t === 'task' && TASK[it.id] ? TASK[it.id].skill : (it.t === 'tfng' || it.t === 'dict') ? 'D' : (it.t === 'w1' || it.t === 'w2') ? 'W' : it.t === 'sp' ? 'S' : null).filter(Boolean))];
  return `<article class="glass card set-card pub-set"><div class="row between"><span class="kicker">${s.mode === 'exam' ? T('task.exam') : T('task.practice')}</span><span class="vic">${kinds.map(k => `<span class="vic-i" data-tip="${esc(tr(...SET_KIND_TIP[k]))}" aria-label="${esc(tr(...SET_KIND_TIP[k]))}" role="img">${k === 'D' ? ic('bolt') : SKILL[k].icon}</span>`).join('')}</span></div>
  <h3>${esc(s.name || 'Set')}</h3><p class="faint">${tasksN((s.items || []).length)}${s.created ? ' · ' + fmtDate(s.created) : ''}</p>
  <div class="row set-acts"><a class="pill pill-sm pill-white" href="#/set?code=${encodeSet(s)}">${ic('play')} ${T('builder.open')}</a><button type="button" class="pill pill-sm pill-outline" data-dl="${esc(s.id)}">${ic('download')} JSON</button>${own ? '' : `<button type="button" class="icon-btn" data-copyset="${esc(s.id)}" aria-label="${esc(tr('Save to my sets', 'Сохранить к себе'))}" data-tip="${esc(tr('Save to my sets', 'Сохранить к себе'))}">${ic('save')}</button>`}${canDel ? `<button type="button" class="icon-btn mod-del" data-delset="${esc(s.id)}" aria-label="${esc(tr('Remove the set (moderation)', 'Удалить набор (модерация)'))}" data-tip="${esc(tr('Remove (moderation)', 'Удалить (модерация)'))}">${ic('trash')}</button>` : ''}</div></article>`;
}
function downloadJson(name, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name.replace(/[^\p{L}\p{N}_.-]+/gu, '-').replace(/-+/g, '-') + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function profileHtml(u, me) {
  const s = u.stats || {}, sk = s.skills || {}, mod = u.mod || null;
  const stat = (icon, n, l) => `<div class="glass stat pstat"><span class="em">${ic(icon)}</span><div><div class="k">${esc(String(n))}</div><div class="v">${esc(l)}</div></div></div>`;
  const bars = SKILL_KEYS.map(k => { const x = sk[k] || { n: 0 }; const pct = x.best != null ? x.best : Math.min(100, (x.n || 0) * 20); return `<div class="sbar"><span class="sb-l">${SKILL[k].icon}${T('skill.' + k)}</span><span class="sb-t"><i style="--w:${pct}%"></i></span><span class="sb-v">${x.best != null ? x.best + '%' : x.n ? x.n + '×' : '—'}</span></div>`; }).join('');
  const sets = u.sets || [], canDel = !!(mod && mod.canModerate);
  const showMod = !!(mod && (mod.canModerate || mod.canRole || mod.canBadges) && !me);
  return `<section class="prof glass${u.banned ? ' is-banned' : ''}" style="--h:${hashHue(u.login)}">${coverHtml(u.banner)}
  <div class="prof-main">${avatarHtml(u, 116, 'prof-av')}
    <div class="prof-id"><h1 class="display page-title" tabindex="-1">${esc(u.nick)}</h1><p class="prof-login"><span>@${esc(u.login)}</span>${badgesHtml(u)}</p></div>
    <div class="prof-side"><div class="prof-acts">${me ? `<a class="pill pill-white pill-sm" href="#/me">${ic('pen')} ${esc(tr('Edit profile', 'Редактировать'))}</a><button type="button" class="pill pill-outline pill-sm" data-logout>${ic('logout')} ${esc(t('auth.logout'))}</button>` : `<button type="button" class="pill pill-glass pill-sm" data-copylink>${ic('link')} ${esc(tr('Copy link', 'Скопировать ссылку'))}</button>`}${showMod ? `<button type="button" class="pill pill-outline pill-sm mod-btn" data-mod>${ic('shield')} ${esc(tr('Moderate', 'Модерация'))}</button>` : ''}${me && isStaffU(u) ? `<a class="pill pill-outline pill-sm mod-btn" href="#/admin">${ic('shield')} ${esc(tr('Admin panel', 'Админ-панель'))}</a>` : ''}</div>
    ${socialsHtml(u.socials)}</div></div>
  ${u.banned && mod ? `<p class="prof-ban">${ic('ban')} ${esc(tr('Blocked', 'Заблокирован'))} ${mod.bannedUntil && /^9999/.test(mod.bannedUntil) ? esc(tr('forever', 'навсегда')) : mod.bannedUntil ? esc(tr('until ', 'до ') + fmtDate(mod.bannedUntil, true)) : ''}${mod.banReason ? ' · ' + esc(mod.banReason) : ''}</p>` : ''}
  ${u.bio ? `<p class="prof-bio">${esc(u.bio)}</p>` : me ? `<p class="prof-bio faint">${esc(tr('Add a few words about yourself in the profile settings.', 'Добавь пару слов о себе в настройках профиля.'))}</p>` : ''}
  <div class="prof-meta"><span>${ic('calendar')} ${esc(tr('Joined', 'С нами с'))} ${fmtDate(u.created, true)}</span>${u.seen ? `<span>${ic('clock')} ${esc(tr('Active', 'Активность'))}: ${fmtDate(u.seen, true)}</span>` : ''}${s.level ? `<span>${ic('target')} ${esc(tr('Level', 'Уровень'))} ${esc(s.level)}</span>` : ''}</div></section>
  <div class="grid g4 prof-stats">${stat('chart', s.attempts || 0, tr('attempts', 'попыток'))}${stat('practice', `${s.tasks || 0}/12`, tr('tasks done', 'заданий пройдено'))}${stat('variants', s.variants || 0, tr('variants finished', 'вариантов пройдено'))}${stat('layers', sets.length, tr('public sets', 'публичных наборов'))}</div>
  <section class="sec"><div class="grid g2 prof-row"><div class="glass panel"><h2 class="grp-title">${ic('chart')} ${esc(tr('Skills', 'Навыки'))}</h2><p class="faint" style="margin:4px 0 14px;font-size:13px">${esc(tr('Best result in Listening and Reading, number of attempts in Writing and Speaking.', 'Лучший результат в Listening и Reading, число попыток в Writing и Speaking.'))}</p><div class="sbars">${bars}</div></div>
  <div class="glass panel"><h2 class="grp-title">${ic('star')} ${esc(tr('Recent activity', 'Последние результаты'))}</h2>${(s.recent || []).length ? `<ul class="recent">${s.recent.map(r => { const nm = recentName(r); return `<li><span class="em">${nm[0]}</span><span class="rt"><b>${nm[1]}</b><small>${fmtDate(r.date)}</small></span>${r.total ? `<span class="lp">${r.score}/${r.total}</span>` : ''}</li>`; }).join('')}</ul>` : `<p class="muted">${esc(tr('No results yet.', 'Пока нет результатов.'))}</p>`}</div></div></section>
  ${achievementsHtml()}
  <section class="sec"><div class="sec-head"><span class="glass-pill">${ic('layers')} ${esc(tr('Showcase', 'Витрина'))}</span><h2 class="sec-title display"><span class="grad">${esc(tr('Public sets', 'Публичные наборы'))}</span></h2>${me ? `<p class="muted">${esc(tr('Open the builder and press the eye button on a saved set to show it here.', 'Открой конструктор и нажми на «глаз» у сохранённого набора, чтобы показать его здесь.'))}</p>` : ''}</div>
  ${sets.length ? `<div class="grid g3">${sets.map(x => setCard(x, me, canDel)).join('')}</div>` : `<div class="glass empty"><div class="em em-lg">${ic('layers')}</div><p>${esc(me ? tr('You have no public sets yet.', 'У тебя пока нет публичных наборов.') : tr('No public sets yet.', 'Публичных наборов пока нет.'))}</p>${me ? `<a class="pill pill-white pill-sm" href="#/builder">${ic('builder')} ${T('nav.builder')}</a>` : ''}</div>`}</section>`;
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
    if (me && Auth.user && (Auth.user.avatar !== user.avatar || Auth.user.nick !== user.nick || Auth.user.role !== user.role || Auth.user.frame !== user.frame)) Auth.setUser({ ...Auth.user, avatar: user.avatar, nick: user.nick, role: user.role, badges: user.badges, frame: user.frame, socials: user.socials, banner: user.banner });
  }).catch(e => { if (tok !== renderTok) return; box.innerHTML = errorCard(e, e.code !== 'not_found'); const r = $('[data-retry]', box); r && r.addEventListener('click', () => { box.innerHTML = loadingHtml(); load(); }); });
  load();
  box.addEventListener('click', e => {
    const dl = e.target.closest('[data-dl]'), cp = e.target.closest('[data-copyset]');
    if (e.target.closest('[data-copylink]')) { navigator.clipboard && navigator.clipboard.writeText(location.href.split('#')[0] + '#/u/' + user.login).then(() => toast(t('common.copy'))); }
    if (dl && user) { const s = user.sets.find(x => x.id === dl.dataset.dl); if (s) downloadJson(`lynx-${user.login}-${s.name || s.id}`, { format: 'lynx.set', version: 1, author: '@' + user.login, ...s }); }
    if (cp && user) { const s = user.sets.find(x => x.id === cp.dataset.copyset); if (s) { Sets.save({ ...s, id: uid('set'), public: false, from: '@' + user.login, created: Date.now() }); toast(tr('Saved to your sets', 'Сохранено в твои наборы')); } }
    if (e.target.closest('[data-mod]') && user) openModDialog(user, () => { box.innerHTML = loadingHtml(); load(); });
    const ds = e.target.closest('[data-delset]');
    if (ds && user) { const s = user.sets.find(x => x.id === ds.dataset.delset); modAsk({ title: tr('Remove this public set?', 'Удалить этот публичный набор?'), text: s ? `«${s.name || s.id}» · @${user.login}` : '', ok: tr('Remove', 'Удалить'), danger: true, run: reason => api('mod', { method: 'POST', body: { login: user.login, action: 'del_set', setId: ds.dataset.delset, reason } }), done: () => { toast(tr('The set was removed', 'Набор удалён')); box.innerHTML = loadingHtml(); load(); } }); }
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
   <section class="glass panel me-card me-look" data-look><h2 class="grp-title">${ic('palette')} ${esc(tr('Appearance', 'Оформление'))}</h2>
    <div class="look-prev" data-lprev><div data-lcov>${coverHtml(u.banner && u.banner !== 'img' ? u.banner : null)}</div><div class="look-pav" data-lav>${avatarHtml(u, 76)}</div><div class="look-pid"><b>${esc(u.nick)}</b><span>@${esc(u.login)}</span></div></div>
    <div class="look-sec"><h3 class="look-h">${esc(tr('Banner', 'Баннер'))}</h3><div class="look-opts" role="radiogroup" aria-label="${esc(tr('Banner', 'Баннер'))}">
     <button type="button" role="radio" class="bn-opt" data-bn="" aria-checked="${!u.banner}"><span class="bn-sw bn-def"></span><small>${esc(tr('Default', 'Обычный'))}</small></button>
     ${BANNER_P.map(p => `<button type="button" role="radio" class="bn-opt" data-bn="p:${p}" aria-checked="${u.banner === 'p:' + p}"><span class="bn-sw bn-${p}"></span><small>${esc(tr(...BANNER_N[p]))}</small></button>`).join('')}
     <label class="bn-opt bn-up" data-bnup aria-checked="${u.banner === 'img'}"><span class="bn-sw">${ic('image')}</span><small>${esc(tr('Upload', 'Загрузить'))}</small><input type="file" accept="image/jpeg,image/png,image/webp" data-bnfile class="sr-only"></label></div>
     <p class="faint look-note">${esc(tr('Your picture is cropped to 3:1 (1200 × 400).', 'Картинка обрежется до 3:1 (1200 × 400).'))}</p></div>
    <div class="look-sec"><h3 class="look-h">${esc(tr('Avatar frame', 'Рамка аватара'))}</h3><div class="look-opts" role="radiogroup" aria-label="${esc(tr('Avatar frame', 'Рамка аватара'))}">
     <button type="button" role="radio" class="fr-opt" data-fr="" aria-checked="${!u.frame}">${avatarHtml({ ...u, frame: null }, 48)}<small>${esc(tr('None', 'Без рамки'))}</small></button>
     ${FRAME_P.map(fr => `<button type="button" role="radio" class="fr-opt" data-fr="${fr}" aria-checked="${u.frame === fr}">${avatarHtml({ ...u, frame: fr }, 48)}<small>${esc(tr(...FRAME_N[fr]))}</small></button>`).join('')}</div></div></section>
   <form class="glass panel me-card" data-sf novalidate><h2 class="grp-title">${ic('link')} ${esc(tr('Social links', 'Соцсети'))}</h2><p class="faint" style="margin:0;font-size:13px">${esc(tr('Paste a link or a username. The links appear in your public profile.', 'Вставь ссылку или ник – они появятся в публичном профиле.'))}</p>
    ${SOC.map(([k, n]) => fld({ name: 's_' + k, label: n, icon: k, value: (u.socials || {})[k] || '', ph: { discord: tr('username or user ID', 'ник или ID'), github: 'username', telegram: '@username', tiktok: '@username' }[k], extra: 'maxlength="100" inputmode="url"' })).join('')}
    <div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('save')} ${esc(t('profile.save'))}</button></div></form>
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
  const patch = async body => { const j = await api('profile', { method: 'PATCH', body }); Auth.setUser(j.user); return j.user; };
  [pf, lf, pwf].forEach(bindFields); bindPwRules(pwf, pwf.password);
  const lc = loginChecker(lf, 'login', u.login);
  const withBusy = async (form, fn) => { const b = $('button[type=submit]', form); busyBtn(b, true); try { await fn(); } finally { busyBtn(b, false); } };
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
  /* appearance */
  const look = $('[data-look]', v);
  const paintLook = me => {
    $('[data-lcov]', look).innerHTML = coverHtml(me.banner); $('[data-lav]', look).innerHTML = avatarHtml(me, 76);
    const isImg = !!me.banner && /^data:/.test(me.banner);
    $$('[data-bn]', look).forEach(b => b.setAttribute('aria-checked', String((b.dataset.bn || null) === (isImg ? '__' : me.banner || null))));
    $('[data-bnup]', look).setAttribute('aria-checked', String(isImg));
    $$('[data-fr]', look).forEach(b => b.setAttribute('aria-checked', String((b.dataset.fr || null) === (me.frame || null))));
  };
  let lookCur = { ...u, banner: u.banner === 'img' ? null : u.banner };
  api('user', { q: { login: u.login } }).then(j => { if (j.user && document.contains(look)) { lookCur = { ...lookCur, banner: j.user.banner, frame: j.user.frame }; paintLook(lookCur); } }).catch(() => { });
  const lookSave = async (body, b) => { look.classList.add('busy'); try { const nu = await patch(body); lookCur = { ...lookCur, ...nu, banner: 'banner' in body ? body.banner : lookCur.banner }; paintLook(lookCur); toast(t('profile.saved')); } catch (ex) { toast(errText(ex)); } finally { look.classList.remove('busy'); } };
  look.addEventListener('click', e => {
    const bn = e.target.closest('[data-bn]'), fr = e.target.closest('[data-fr]');
    if (bn && bn.getAttribute('aria-checked') !== 'true') lookSave({ banner: bn.dataset.bn || null });
    if (fr && fr.getAttribute('aria-checked') !== 'true') lookSave({ frame: fr.dataset.fr || null });
  });
  $('[data-bnfile]', look).addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
    try { const url = await bannerJpeg(file); await lookSave({ banner: url }); } catch (ex) { toast(errText({ code: 'banner_bad' })); }
  });
  /* socials */
  const sf = $('[data-sf]', v); bindFields(sf);
  const SOC_OK = { discord: /^(?:\d{17,20}|[a-z0-9_.]{2,32})$/, github: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, telegram: /^[A-Za-z][A-Za-z0-9_]{3,31}$/, tiktok: /^[A-Za-z0-9_.]{2,24}$/ };
  sf.addEventListener('submit', e => {
    e.preventDefault(); const socials = {}; let bad = null;
    SOC.forEach(([k]) => { const x = parseSocial(k, sf['s_' + k].value); sf['s_' + k].value = x; if (x && !SOC_OK[k].test(x)) { setMsg(sf, 's_' + k, errText({ code: 'social_bad' })); bad = bad || k; } else { setMsg(sf, 's_' + k, ''); if (x) socials[k] = x; } });
    if (bad) { sf['s_' + bad].focus(); return; }
    withBusy(sf, async () => { try { await patch({ socials }); toast(t('profile.saved')); } catch (ex) { const k = ex.data && ex.data.field; if (k && sf['s_' + k]) setMsg(sf, 's_' + k, errText(ex)); else toast(errText(ex)); } });
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

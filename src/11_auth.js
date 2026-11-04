/* ---------- accounts: API client, auth state, cloud sync ---------- */
const API_URL = '/api/app', HINT = 'lynx.authHint', SYNC_KEY = 'lynx.sync';
const LOGIN_RE = /^[A-Za-z0-9_]{4,24}$/, EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const PW_RULES = [['len', s => s.length >= 8, ['At least 8 characters', 'Не меньше 8 символов']], ['num', s => /\d/.test(s), ['A digit', 'Цифра']], ['up', s => /\p{Lu}/u.test(s), ['A capital letter', 'Заглавная буква']], ['sp', s => /[^\p{L}\p{N}\s]/u.test(s), ['A special character, e.g. ! ? @ #', 'Спецсимвол, например ! ? @ #']]];
const pwOk = s => PW_RULES.every(r => r[1](s));
async function api(r, { method = 'GET', body, q, keepalive = false } = {}) {
  const u = API_URL + '?r=' + encodeURIComponent(r) + (q ? '&' + new URLSearchParams(q) : '');
  let res;
  try { res = await fetch(u, { method, credentials: 'same-origin', cache: 'no-store', keepalive, headers: { 'X-Requested-With': 'lynx', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined }); }
  catch (e) { const er = new Error('network'); er.code = location.protocol === 'file:' ? 'no_api' : 'network'; er.data = {}; throw er; }
  let j = null; try { j = await res.json(); } catch (e) { }
  if (!res.ok || !j) { const er = new Error((j && j.error) || 'http_' + res.status); er.code = (j && j.error) || (res.status === 404 || res.status === 405 || res.status === 501 ? 'no_api' : 'server'); er.status = res.status; er.data = j || {}; throw er; }
  return j;
}
const ERR = {
  network: ['No connection to the server. Check the Internet and try again.', 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.'],
  no_api: ['Accounts work only on the online version of the site.', 'Аккаунты работают только в онлайн-версии сайта.'],
  server: ['Server error. Please try again a bit later.', 'Ошибка сервера. Попробуй чуть позже.'],
  no_db: ['The database is not connected yet.', 'База данных ещё не подключена.'],
  email_bad: ['Enter a valid email.', 'Введи корректный email.'],
  email_taken: ['This email is already registered.', 'Этот email уже зарегистрирован.'],
  login_bad: ['Login: Latin letters, digits and _, 4–24 characters.', 'Логин: латинские буквы, цифры и _, от 4 до 24 символов.'],
  login_taken: ['This login is already taken.', 'Этот логин уже занят.'],
  login_same: ['This is already your login.', 'Это и так твой логин.'],
  login_wait: ['The login can be changed once every 30 days.', 'Логин можно менять раз в 30 дней.'],
  nick_bad: ['Nickname: 1–32 characters.', 'Ник: от 1 до 32 символов.'],
  bio_bad: ['About me: up to 200 characters.', 'О себе: до 200 символов.'],
  pw_weak: ['The password needs 8+ characters, a digit, a capital letter and a special character.', 'Пароль: от 8 символов, цифра, заглавная буква и спецсимвол.'],
  pw_mismatch: ['The passwords do not match.', 'Пароли не совпадают.'],
  creds: ['Wrong email / login or password.', 'Неверный email / логин или пароль.'],
  locked: ['Too many attempts. Try again in {m} min.', 'Слишком много попыток. Попробуй через {m} мин.'],
  auth: ['Please log in again.', 'Войди в аккаунт ещё раз.'],
  pw_wrong: ['The current password is wrong.', 'Текущий пароль неверный.'],
  too_big: ['Too much data to save.', 'Слишком много данных для сохранения.'],
  avatar_bad: ['This image cannot be used.', 'Это изображение не подходит.'],
  not_found: ['User not found.', 'Пользователь не найден.'],
  csrf: ['The request was blocked. Reload the page.', 'Запрос заблокирован. Обнови страницу.'],
  rate: ['Too many requests. Wait a minute.', 'Слишком много запросов. Подожди минуту.'],
  banned: ['This account is blocked', 'Этот аккаунт заблокирован'],
  forbidden: ['You do not have the rights for this.', 'Для этого нет прав.'],
  protected: ['Staff accounts cannot be moderated.', 'Аккаунты администрации нельзя модерировать.'],
  self: ['You cannot do this with your own account.', 'Со своим аккаунтом так нельзя.'],
  social_bad: ['Check this handle.', 'Проверь ник или ссылку.'],
  banner_bad: ['This banner cannot be used. Try a smaller picture.', 'Этот баннер не подходит. Попробуй картинку поменьше.'],
  frame_bad: ['Unknown frame.', 'Неизвестная рамка.'],
  text_bad: ['Write the text first.', 'Сначала напиши текст.'],
  reset_state: ['The request has not been approved yet.', 'Запрос ещё не одобрен.'],
  ip_banned: ['Access from this network is blocked.', 'Доступ из этой сети заблокирован.'],
  tfa_bad: ['Wrong code. Check the time on your phone and try again.', 'Неверный код. Проверь время на телефоне и попробуй ещё раз.'],
  tfa_expired: ['The sign-in took too long. Enter the password again.', 'Вход занял слишком много времени. Введи пароль ещё раз.'],
  tfa_on: ['Two-step verification is already on.', 'Двухэтапная проверка уже включена.'],
  tfa_off: ['Two-step verification is off.', 'Двухэтапная проверка выключена.'],
  premium: ['This is a Premium feature.', 'Это функция Premium.'],
  privacy: ['This user’s privacy settings do not allow it.', 'Настройки приватности пользователя этого не позволяют.'],
  chat_gone: ['This chat is no longer available.', 'Этот чат больше недоступен.'],
  too_long: ['The message is too long (up to 2000 characters).', 'Сообщение слишком длинное (до 2000 символов).'],
  title_bad: ['Group name: 1–48 characters.', 'Название группы: от 1 до 48 символов.'],
  group_full: ['The group is full (50 members).', 'В группе уже 50 участников.'],
  key_exists: ['The encryption key already exists.', 'Ключ шифрования уже создан.'],
  bad: ['Something is wrong with the request.', 'Что-то не так с запросом.']
};
const fmtDate = (d, long) => new Date(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', long ? { day: 'numeric', month: 'long', year: 'numeric' } : undefined);
function errText(e) {
  const x = ERR[e && e.code] || ERR.server; let s = tr(x[0], x[1]);
  if (e && e.data && e.data.minutes) s = s.replace('{m}', e.data.minutes);
  if (e && e.code === 'login_wait' && e.data && e.data.until) s += ' ' + tr('Next change: ', 'Следующая смена: ') + fmtDate(e.data.until, true) + '.';
  if (e && e.code === 'banned') { const u = e.data && e.data.until; s += (!u || /^9999/.test(u) ? tr(' forever', ' навсегда') : tr(' until ', ' до ') + fmtDate(u, true)) + '.'; if (e.data && e.data.reason) s += ' ' + tr('Reason: ', 'Причина: ') + e.data.reason; }
  return s;
}
const hashHue = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) >>> 0; return h % 360; };
function avatarHtml(u, size = 32, cls = '') {
  if (u && size >= 40 && /^(glow|gold|aurora|ice|neon|cosmic|prism)$/.test(u.frame || '')) cls += ` fr fr-${u.frame}`;
  if (u && u.avatar) return `<span class="av ${cls}" style="--s:${size}px"><img src="${esc(u.avatar)}" alt="" width="${size}" height="${size}" decoding="async"></span>`;
  const n = String((u && (u.nick || u.login)) || '?').trim() || '?';
  return `<span class="av av-def ${cls}" style="--s:${size}px;--h:${hashHue((u && u.login) || n)}" aria-hidden="true">${esc([...n][0].toUpperCase())}</span>`;
}

const SYNCED = new Set([SK.progress, SK.profile, SK.sets, SK.drafts]);
const _sset = store.set.bind(store), _sdel = store.del.bind(store);
store.set = (k, v) => { const r = _sset(k, v); if (SYNCED.has(k)) Sync.touch(); return r; };
store.del = k => { _sdel(k); if (SYNCED.has(k)) Sync.touch(); };
function mergeData(a, b) {
  a = a || {}; b = b || {};
  const byId = (x, y) => { const m = new Map(); [...(Array.isArray(y) ? y : []), ...(Array.isArray(x) ? x : [])].forEach(e => { if (e && e.id) m.set(e.id, { ...(m.get(e.id) || {}), ...e }); }); return [...m.values()]; };
  const prog = byId(a.progress, b.progress).sort((p, q) => String(p.date).localeCompare(String(q.date)));
  const sets = byId(a.sets, b.sets).sort((p, q) => (q.created || 0) - (p.created || 0));
  const prof = { ...(b.profile || {}) }; Object.entries(a.profile || {}).forEach(([k, v]) => { if (v !== '' && v != null) prof[k] = v; });
  return { progress: prog, sets, profile: prof, drafts: { ...(b.drafts || {}), ...(a.drafts || {}) } };
}
const Sync = {
  st: Object.assign({ dirty: false, ts: 0 }, store.get(SYNC_KEY, {})), tm: 0, busy: null, again: false,
  local() { return { progress: store.get(SK.progress, []), profile: store.get(SK.profile, {}), sets: store.get(SK.sets, []), drafts: store.get(SK.drafts, {}) }; },
  write(d) { d = d || {}; _sset(SK.progress, Array.isArray(d.progress) ? d.progress : []); _sset(SK.profile, d.profile || {}); _sset(SK.sets, Array.isArray(d.sets) ? d.sets : []); _sset(SK.drafts, d.drafts || {}); emit('progress'); emit('profile'); emit('sets'); },
  save() { _sset(SYNC_KEY, this.st); },
  touch() { if (!Auth.user) return; this.st.dirty = true; this.save(); clearTimeout(this.tm); this.tm = setTimeout(() => this.push(), 1200); setSync('wait'); },
  async push() {
    if (!Auth.user) return; if (this.busy) { this.again = true; return this.busy; }
    clearTimeout(this.tm); setSync('busy');
    this.busy = (async () => {
      try { const j = await api('data', { method: 'PUT', body: { data: this.local(), base: this.st.ts } }); this.st = { dirty: false, ts: j.ts }; this.save(); setSync('ok'); }
      catch (e) {
        if (e.status === 409 && e.data && e.data.data) { this.write(mergeData(this.local(), e.data.data)); this.st.ts = e.data.ts; this.st.dirty = true; this.save(); this.again = true; }
        else if (e.status === 401) { Auth.setUser(null); } else setSync('err');
      } finally { this.busy = null; if (this.again) { this.again = false; setTimeout(() => this.push(), 300); } }
    })();
    return this.busy;
  },
  flush() { clearTimeout(this.tm); return this.st.dirty && Auth.user ? this.push() : Promise.resolve(); },
  fromServer(data, ts) {
    if (this.st.dirty) { this.write(mergeData(this.local(), data || {})); this.push(); }
    else if (ts && ts !== this.st.ts) { this.write(data || {}); this.st = { dirty: false, ts }; this.save(); if (curMeta && curMeta.relang) render({ instant: true }); }
  },
  merge(data, ts) { this.st.ts = ts || 0; this.write(mergeData(this.local(), data || {})); this.st.dirty = true; this.save(); return this.push(); },
  clearLocal() { SYNCED.forEach(k => _sdel(k)); this.st = { dirty: false, ts: 0 }; _sdel(SYNC_KEY); emit('progress'); emit('profile'); emit('sets'); }
};
function setSync(s) { const el = $('#authSlot .av-pill'); if (el) el.dataset.sync = s; }
addEventListener('pagehide', () => {
  if (!Auth.user || !Sync.st.dirty) return;
  const body = { data: Sync.local(), base: Sync.st.ts };
  if (JSON.stringify(body).length < 60000) api('data', { method: 'PUT', body, keepalive: true }).catch(() => { });
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Sync.flush(); else if (Auth.user && Date.now() - (Auth.lastCheck || 0) > 60000) Auth.refresh(); });

const Auth = {
  user: store.get(HINT, null), lastCheck: 0,
  setUser(u) {
    const was = this.user && this.user.login;
    this.user = u ? { login: u.login, nick: u.nick, avatar: u.avatar || null, bio: u.bio || '', email: u.email || '', created: u.created, nextLoginChange: u.nextLoginChange || null,
      role: u.role || 'user', badges: Array.isArray(u.badges) ? u.badges : [], frame: u.frame || null, socials: u.socials || {}, banner: u.banner && !/^data:/.test(u.banner) ? u.banner : null,
      premium: u.premium || null, bt: u.bt || null, tfa: !!u.tfa, privacy: u.privacy || null, e2e: !!u.e2e } : null;
    if (this.user) _sset(HINT, this.user); else { _sdel(HINT); this.unread = { n: 0 }; }
    renderAuth(); if (was !== (this.user && this.user.login)) emit('auth', this.user);
  },
  unread: { n: 0 },
  get staff() { return !!this.user && ['admin', 'coowner', 'owner'].includes(this.user.role); },
  get premium() { return !!(this.user && this.user.premium); },
  setUnread(x) { if (!x || typeof x !== 'object') return; this.unread = { n: Number(x.n) || 0, chat: Number(x.chat) || 0, staff: x.staff || null }; paintBell(); emit('unread', this.unread); },
  pollUnread() { if (!this.user || document.visibilityState !== 'visible') return; api('unread').then(j => this.setUnread(j)).catch(e => { if (e.status === 401) this.refresh(); }); },
  async refresh() {
    this.lastCheck = Date.now();
    try { const j = await api('me'); if (j.user) { this.setUser(j.user); this.setUnread(j.unread); Sync.fromServer(j.data, j.ts); } else if (this.user) { this.setUser(null); Sync.clearLocal(); } }
    catch (e) { if (e.code === 'no_api' && this.user) this.setUser(null); }
  },
  /* returns the user, or { tfa: true, ticket } when a second step is needed */
  async login(id, password) {
    const j = await api('login', { method: 'POST', body: { id, password } });
    if (j.tfa) return { tfa: true, ticket: j.ticket };
    return this.finish(j, password);
  },
  async login2(ticket, code, password) { const j = await api('login2', { method: 'POST', body: { ticket, code } }); return this.finish(j, password); },
  async finish(j, password) { this.setUser(j.user); this.setUnread(j.unread); E2E.setup(j.user.login, password); await Sync.merge(j.data, j.ts); return j.user; },
  async signup(f) { const j = await api('signup', { method: 'POST', body: { ...f, data: Sync.local() } }); Sync.st = { dirty: false, ts: j.ts }; Sync.save(); this.setUser(j.user); if (j.unread) this.setUnread(j.unread); E2E.setup(j.user.login, f.password); return j.user; },
  async logout() {
    await Sync.flush().catch(() => { });
    try { await api('logout', { method: 'POST', body: {} }); } catch (e) { }
    const l = this.user && this.user.login; if (l) E2E.forget(l);
    Sync.clearLocal(); this.setUser(null); toast(tr('You have logged out', 'Ты вышел из аккаунта')); location.hash = '#/';
  }
};
const bellLabel = n => tr('Notifications', 'Уведомления') + (n ? ` (${n})` : '');
function paintBell() {
  const n = (Auth.unread && Auth.unread.n) || 0, txt = n > 99 ? '99+' : String(n);
  $$('[data-bell]').forEach(b => {
    const was = Number(b.dataset.n || 0); b.dataset.n = n; b.classList.toggle('has', n > 0);
    const c = $('.nt-n', b); if (c) c.textContent = n ? txt : '';
    b.setAttribute('aria-label', bellLabel(n)); if (b.hasAttribute('data-tip')) b.dataset.tip = tr('Notifications', 'Уведомления');
    if (n > was && !reduced()) { b.classList.remove('nt-ring'); void b.offsetWidth; b.classList.add('nt-ring'); }
  });
}
function renderAuth() {
  const slot = $('#authSlot'), sh = $('#sheetAuth'); if (!slot) return;
  const u = Auth.user;
  if (u) {
    slot.innerHTML = `<a class="av-pill" href="#/u/${esc(u.login)}" aria-label="${esc(t('auth.myProfile'))}" data-tip="${esc(t('auth.myProfile'))}">${avatarHtml(u, 30)}<span class="nm">${esc(u.nick || u.login)}</span></a>${premBtnHtml(u)}<a class="icon-btn nt-btn" href="#/notifications" data-bell data-tip="${esc(tr('Notifications', 'Уведомления'))}" aria-label="${esc(bellLabel(0))}">${ic('bell')}<b class="nt-n" aria-hidden="true"></b></a>`;
    if (sh) sh.innerHTML = `<a class="pill pill-glass" href="#/u/${esc(u.login)}">${avatarHtml(u, 24)}<span>${esc(t('auth.myProfile'))}</span></a><a class="pill pill-glass nt-sheet" href="#/notifications" data-bell aria-label="${esc(bellLabel(0))}">${ic('bell')}<span>${esc(tr('Notifications', 'Уведомления'))}</span><b class="nt-n" aria-hidden="true"></b></a><a class="pill pill-glass" href="#/chat">${ic('chat')}<span>${esc(tr('Chats', 'Чаты'))}</span></a><a class="pill pill-glass pm-sheet" href="#/premium">${ic('gem')}<span>Premium</span></a>${Auth.staff ? `<a class="pill pill-glass" href="#/admin">${ic('shield')}<span>${esc(tr('Admin panel', 'Админ-панель'))}</span></a>` : ''}<button type="button" class="pill pill-outline" data-logout>${ic('logout')}<span>${esc(t('auth.logout'))}</span></button>`;
    paintBell();
  } else {
    slot.innerHTML = `<a class="pill pill-sm pill-ghost auth-in" href="#/login">${esc(t('auth.login'))}</a><a class="pill pill-sm pill-white auth-up" href="#/signup">${esc(t('auth.signup'))}</a>`;
    if (sh) sh.innerHTML = `<a class="pill pill-white" href="#/signup">${ic('userPlus')}<span>${esc(t('auth.signup'))}</span></a><a class="pill pill-outline" href="#/login">${ic('login')}<span>${esc(t('auth.login'))}</span></a>`;
  }
  paintFab();
}
on('lang', renderAuth);
function premBtnHtml(u) {
  const p = u && u.premium, tip = p ? tr('Premium is active', 'Premium активен') : 'Premium';
  return `<a class="icon-btn pm-btn${p ? ' on' : ''}" href="#/premium" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><svg class="ic pm-gem" viewBox="0 0 24 24" aria-hidden="true"><path class="g1" d="M6.5 4h11l4 5L12 20.5 2.5 9z"/><path class="g2" d="M2.5 9h19M9.6 4 8 9l4 11.5L16 9l-1.6-5"/></svg><i class="pm-sp s1"></i><i class="pm-sp s2"></i><i class="pm-sp s3"></i></a>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { e.preventDefault(); Auth.logout(); } });
setInterval(() => Auth.pollUnread(), 45000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Auth.user && Date.now() - (Auth.lastCheck || 0) <= 60000) Auth.pollUnread(); });

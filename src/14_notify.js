/* ---------- notifications: announcements + personal messages ---------- */
function relTime(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (!isFinite(s)) return '';
  if (s < 45) return tr('just now', 'только что');
  const rtf = new Intl.RelativeTimeFormat(lang === 'ru' ? 'ru' : 'en', { numeric: 'auto' });
  for (const [u, n] of [['minute', 60], ['hour', 3600], ['day', 86400], ['week', 604800]]) { const next = { minute: 3600, hour: 86400, day: 604800, week: 2592000 }[u]; if (s < next) return rtf.format(-Math.round(s / n), u); }
  return fmtDate(d, true);
}
const FIELD_N = { nick: ['nickname', 'ник'], bio: ['“About me”', '«О себе»'], chat: ['chat message', 'сообщение в чате'], login: ['login', 'логин'], socials: ['social links', 'соцсети'], frame: ['avatar frame', 'рамку аватара'], avatar: ['avatar', 'аватар'], banner: ['banner', 'баннер'] };
const BADGE_N = { wizzy: 'wizzy', neo: 'neo', lead_dev: 'Lead Developer' };
const ROLE_N = { owner: ['owner', 'владелец'], coowner: ['co-owner', 'совладелец'], admin: ['administrator', 'администратор'], user: ['user', 'пользователь'] };
function noteView(n) {
  const d = n.data || {}, by = d.by ? '@' + d.by : tr('the administration', 'администрация');
  const L = (en, ru) => tr(en, ru);
  if (n.kind === 'flag') return { icon: 'flag', cls: 'k-flag', title: L(`The filter flagged @${d.login}’s ${tr(...(FIELD_N[d.field] || ['text', 'текст']))}`, `Фильтр отметил ${tr(...(FIELD_N[d.field] || ['text', 'текст']))} у @${d.login}`), text: (d.words || []).length ? L('Words: ', 'Слова: ') + d.words.join(', ') : '', link: ['#/admin?tab=flags', L('Open the queue', 'Открыть очередь')] };
  if (n.kind === 'reset') return { icon: 'key', cls: 'k-reset', title: L(`@${d.login} asks to reset the password`, `@${d.login} просит сбросить пароль`), text: '', link: ['#/admin?tab=resets', L('Review', 'Проверить')] };
  if (n.kind === 'warn') return { icon: 'alert', cls: 'k-warn', title: L('Warning from the administration', 'Предупреждение от администрации') + (d.strikes ? L(` · strike ${d.strikes} of 3`, ` · страйк ${d.strikes} из 3`) : ''), text: (n.body || '') + (d.strikes && d.strikes < 3 ? L(` After 3 strikes the account is blocked for a day.`, ` После 3 страйков аккаунт блокируется на сутки.`) : ''), by };
  if (n.kind === 'friend_req') return { icon: 'userPlus', cls: 'k-fr', title: L(`${d.nick || d.login} wants to be your friend`, `${d.nick || d.login} хочет добавить тебя в друзья`), text: '@' + (d.login || ''), fr: d.login, link: ['#/u/' + d.login, L('Profile', 'Профиль')] };
  if (n.kind === 'friend_ok') return { icon: 'userCheck', cls: 'k-fr', title: L(`${d.nick || d.login} accepted your friend request`, `${d.nick || d.login} принял(а) твою заявку в друзья`), text: '', link: ['#/u/' + d.login, L('Open profile', 'Открыть профиль')] };
  if (n.kind === 'strike_ban') return { icon: 'ban', cls: 'k-mod', title: L(`@${d.login} was blocked for a day after 3 strikes`, `@${d.login} заблокирован на сутки после 3 страйков`), text: '', link: ['#/admin?tab=banned', L('Blocked users', 'Блокировки')] };
  if (n.kind === 'mod') {
    const a = d.action, why = n.body ? L('Reason: ', 'Причина: ') + n.body : '';
    const m = {
      reset_bio: ['note', L('Your “About me” was cleared by a moderator', 'Модератор очистил твоё «О себе»')],
      reset_avatar: ['image', L('Your avatar, banner and frame were reset', 'Твой аватар, баннер и рамка сброшены')],
      edit: ['pen', L(`A moderator edited your profile: ${(d.fields || []).map(f => tr(...(FIELD_N[f] || [f, f]))).join(', ')}`, `Модератор изменил твой профиль: ${(d.fields || []).map(f => tr(...(FIELD_N[f] || [f, f]))).join(', ')}`)],
      clear_strikes: ['check', L('Your strikes were cleared', 'Твои страйки сняты')],
      ip_ban: ['ban', L('Your account and network were blocked', 'Твой аккаунт и сеть заблокированы')],
      rename: ['pen', d.login ? L(`Your login was changed: @${d.login[0]} → @${d.login[1]}`, `Твой логин изменён: @${d.login[0]} → @${d.login[1]}`) : d.nick ? L(`Your nickname was changed to “${d.nick[1]}”`, `Твой ник изменён на «${d.nick[1]}»`) : L('Your profile was edited', 'Твой профиль изменён')],
      del_set: ['trash', L(`Your public set “${d.set || ''}” was removed`, `Твой публичный набор «${d.set || ''}» удалён`)],
      unban: ['lockOpen', L('Your account was unblocked', 'Твой аккаунт разблокирован')],
      ban: ['ban', d.auto ? L('Your account was blocked for a day after 3 strikes', 'Твой аккаунт заблокирован на сутки после 3 страйков') : L('Your account was blocked', 'Твой аккаунт заблокирован')],
      role: ['shield', d.role === 'admin' || d.role === 'coowner' ? L(`You are now ${d.role === 'coowner' ? 'a co-owner' : 'an administrator'}`, `Теперь ты ${tr(...ROLE_N[d.role])}`) : L(`Your ${tr(...(ROLE_N[d.from] || ROLE_N.admin))} role was removed`, `Роль «${tr(...(ROLE_N[d.from] || ROLE_N.admin))}» снята`)],
      badges: ['star', (d.added || []).length ? L(`New badge: ${d.added.map(b => BADGE_N[b] || b).join(', ')}`, `Новый значок: ${d.added.map(b => BADGE_N[b] || b).join(', ')}`) : L(`Badge removed: ${(d.removed || []).map(b => BADGE_N[b] || b).join(', ')}`, `Значок снят: ${(d.removed || []).map(b => BADGE_N[b] || b).join(', ')}`)],
      pw_reset: ['key', L('Your password was reset. All sessions were closed.', 'Пароль сброшен. Все сессии закрыты.')]
    }[a] || ['shield', n.title || L('Moderation', 'Модерация')];
    return { icon: m[0], cls: 'k-mod', title: m[1], text: why, by: a === 'pw_reset' || d.auto ? '' : by };
  }
  return { icon: 'bell', cls: '', title: n.title || L('Notification', 'Уведомление'), text: n.body || '' };
}
function annHtml(a) {
  return `<article class="glass nt-ann${a.read ? '' : ' unread'}"><div class="nt-ann-h"><span class="nt-ic k-ann">${ic('megaphone')}</span><div class="nt-t"><b>${esc(a.title)}</b><small>${a.author ? `<a href="#/u/${esc(a.author.login)}">${esc(a.author.nick || a.author.login)}</a> · ` : ''}${esc(relTime(a.created))}</small></div>${a.read ? '' : `<span class="nt-dot" aria-label="${esc(tr('new', 'новое'))}"></span>`}</div><p class="nt-ann-b">${esc(a.body)}</p></article>`;
}
function noteHtml(n) {
  const x = noteView(n);
  return `<li class="nt-item ${x.cls}${n.read ? '' : ' unread'}" data-nid="${n.id}"><span class="nt-ic">${ic(x.icon)}</span><div class="nt-t"><b>${esc(x.title)}</b>${x.text ? `<p>${esc(x.text)}</p>` : ''}<small>${esc(relTime(n.created))}${x.by ? ' · ' + esc(x.by) : ''}</small>${x.fr && !n.read ? `<div class="nt-fr"><button type="button" class="pill pill-white pill-sm" data-fra="accept" data-login="${esc(x.fr)}">${ic('check')} ${esc(tr('Accept', 'Принять'))}</button><button type="button" class="pill pill-outline pill-sm" data-fra="decline" data-login="${esc(x.fr)}">${ic('x')} ${esc(tr('Decline', 'Отклонить'))}</button></div>` : ''}${x.link ? `<a class="nt-go" href="${esc(x.link[0])}">${esc(x.link[1])} ${ic('arrow')}</a>` : ''}</div>${n.read ? '' : `<span class="nt-dot" aria-label="${esc(tr('new', 'новое'))}"></span>`}<button type="button" class="icon-btn nt-del" data-ndel="${n.id}" aria-label="${esc(tr('Delete', 'Удалить'))}">${ic('x')}</button></li>`;
}
route(/^\/notifications$/, v => {
  if (!Auth.user) { goHash('#/login?next=' + encodeURIComponent('#/notifications')); return { title: t('auth.login') }; }
  v.innerHTML = `<div class="page nt-page">${pageHead(`${ic('bell')} lynx.`, null, null, tr('Notifications', 'Уведомления'))}<div data-nt>${loadingHtml()}</div></div>`;
  const box = $('[data-nt]', v), tok = renderTok;
  let data = null;
  const paint = () => {
    const items = data.items, anns = data.announcements, st = data.unread && data.unread.staff;
    const readN = items.filter(n => n.read).length;
    box.innerHTML = `${Auth.staff ? `<a class="glass nt-staff" href="#/admin"><span class="nt-ic k-mod">${ic('shield')}</span><span><b>${esc(tr('Admin panel', 'Админ-панель'))}</b><small>${esc(tr(`Flags: ${st ? st.flags : 0} · reset requests: ${st ? st.resets : 0}`, `Отметки фильтра: ${st ? st.flags : 0} · запросы сброса: ${st ? st.resets : 0}`))}</small></span>${ic('arrow')}</a>` : ''}
    ${anns.length ? `<section class="sec nt-sec"><h2 class="grp-title">${ic('megaphone')} ${esc(tr('Announcements', 'Объявления'))}</h2><div class="nt-anns">${anns.map(annHtml).join('')}</div></section>` : ''}
    <section class="sec nt-sec"><div class="row between"><h2 class="grp-title">${ic('bell')} ${esc(tr('For you', 'Для тебя'))}</h2>${readN ? `<button type="button" class="txt-btn" data-nclear>${ic('trash')} ${esc(tr('Clear read', 'Очистить прочитанные'))}</button>` : ''}</div>
    ${items.length ? `<ul class="glass nt-list">${items.map(noteHtml).join('')}</ul>` : `<div class="glass empty"><div class="em em-lg">${ic('bell')}</div><p>${esc(tr('Nothing here yet. Messages from the administration will appear here.', 'Пока пусто. Здесь появятся сообщения от администрации.'))}</p></div>`}</section>`;
  };
  const load = async () => {
    try {
      data = await api('notifications'); if (tok !== renderTok) return; paint(); Auth.setUnread(data.unread);
      const toRead = data.items.filter(n => !n.read && n.kind !== 'friend_req').map(n => n.id);
      if (toRead.length || data.announcements.some(a => !a.read)) {
        const j = await api('notifications', { method: 'POST', body: { op: 'read', ann: true, ids: toRead.length ? toRead : [0] } }); Auth.setUnread(j.unread);
        data.items.forEach(n => { if (n.kind !== 'friend_req') n.read = true; }); data.announcements.forEach(a => { a.read = true; });
        setTimeout(() => { if (tok === renderTok && document.contains(box)) { $$('.unread', box).forEach(el => el.classList.add('seen')); setTimeout(() => { if (tok === renderTok) paint(); }, 600); } }, 3000);
      }
    } catch (e) { if (tok !== renderTok) return; box.innerHTML = errorCard(e, true); const r = $('[data-retry]', box); r && r.addEventListener('click', () => { box.innerHTML = loadingHtml(); load(); }); }
  };
  box.addEventListener('click', async e => {
    const fa = e.target.closest('[data-fra]');
    if (fa) { busyBtn(fa, true); try { await api('friends', { method: 'POST', body: { op: fa.dataset.fra, login: fa.dataset.login } }); toast(fa.dataset.fra === 'accept' ? tr('You are friends now', 'Теперь вы друзья') : tr('Request declined', 'Заявка отклонена')); const li = fa.closest('li'), n = data.items.find(x => x.id === +li.dataset.nid); if (n) n.read = true; paint(); Auth.pollUnread(); } catch (ex) { toast(errText(ex)); busyBtn(fa, false); } return; }
    const del = e.target.closest('[data-ndel]');
    if (del) { const li = del.closest('li'); li.classList.add('out'); try { const j = await api('notifications', { method: 'POST', body: { op: 'delete', id: +del.dataset.ndel } }); Auth.setUnread(j.unread); data.items = data.items.filter(n => n.id !== +del.dataset.ndel); setTimeout(paint, reduced() ? 0 : 220); } catch (ex) { li.classList.remove('out'); toast(errText(ex)); } }
    if (e.target.closest('[data-nclear]')) { try { const j = await api('notifications', { method: 'POST', body: { op: 'clear' } }); Auth.setUnread(j.unread); data.items = data.items.filter(n => !n.read); paint(); toast(tr('Cleared', 'Очищено')); } catch (ex) { toast(errText(ex)); } }
  });
  load();
  return { title: tr('Notifications', 'Уведомления'), nav: 'notifications', relang: true, auth: true };
});

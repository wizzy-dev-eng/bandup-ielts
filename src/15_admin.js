/* ---------- staff tools: moderation dialog and admin panel ---------- */
function modAsk({ title, text = '', ok, danger = false, run, done, reason = true }) {
  openDialog({
    title, cls: 'mod-ask',
    body: `${text ? `<p class="muted" style="margin-top:0">${esc(text)}</p>` : ''}${reason ? `<form data-maf novalidate><div class="fld" data-f="reason"><label class="fld-l" for="ma-r">${esc(tr('Reason (the user will see it)', 'Причина (её увидит пользователь)'))}</label><div class="fld-in ta">${ic('note')}<textarea class="inp" id="ma-r" name="reason" maxlength="300" rows="2"></textarea></div></div></form>` : ''}<p class="form-err" data-err role="alert"></p>`,
    actions: `<button class="pill pill-outline" data-close>${esc(tr('Cancel', 'Отмена'))}</button><button class="pill ${danger ? 'pill-danger' : 'pill-white'}" data-ok><span class="spin" aria-hidden="true"></span>${esc(ok)}</button>`,
    onOpen: (d, close) => {
      const b = $('[data-ok]', d), r = $('textarea', d); (r || b).focus();
      b.addEventListener('click', async () => { busyBtn(b, true); try { await run(r ? r.value.trim() : ''); close('ok'); done && done(); } catch (ex) { $('[data-err]', d).textContent = errText(ex); } finally { busyBtn(b, false); } });
    }
  });
}
function banText(until) { return !until ? '' : /^9999/.test(until) ? tr('forever', 'навсегда') : tr('until ', 'до ') + fmtDate(until, true); }
function openModDialog(u, after) {
  const m = u.mod || {}, can = !!m.canModerate, ub = Array.isArray(u.badges) ? u.badges : [];
  const sec = (icon, title, inner, cls = '') => `<section class="md-sec ${cls}"><h3>${ic(icon)} ${esc(title)}</h3>${inner}</section>`;
  const DAYS = [1, 3, 7, 30, 90, 365, 0];
  const body = `<div class="md-user">${avatarHtml(u, 48)}<div class="md-id"><b>${esc(u.nick)}</b><span>@${esc(u.login)}</span></div><span class="md-bdg">${badgesHtml(u, true)}</span></div>
  ${!can ? `<p class="md-note">${ic('shield')} ${esc(isStaffU(u) ? tr('This is a staff account, so moderation is off. The owner can remove the admin role first.', 'Это аккаунт администрации, модерация недоступна. Владелец может сначала снять роль админа.') : tr('You cannot moderate this account.', 'Этот аккаунт нельзя модерировать.'))}</p>` : ''}
  ${can ? `<div class="fld" data-f="reason"><label class="fld-l" for="md-r">${esc(tr('Reason (the user will see it)', 'Причина (её увидит пользователь)'))}</label><div class="fld-in ta">${ic('note')}<textarea class="inp" id="md-r" maxlength="300" rows="2" placeholder="${esc(tr('For example: rude words in the profile', 'Например: грубые слова в профиле'))}"></textarea></div></div>
  ${sec('sparkle', tr('Quick actions', 'Быстрые действия'), `<div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="reset_bio"${u.bio ? '' : ' disabled'}>${ic('note')} ${esc(tr('Clear “About me”', 'Очистить «О себе»'))}</button><button type="button" class="pill pill-outline pill-sm" data-ma="reset_avatar">${ic('image')} ${esc(tr('Reset avatar and banner', 'Сбросить аватар и баннер'))}</button></div>`)}
  ${sec('pen', tr('Rename', 'Переименовать'), `<div class="md-grid"><label><span>${esc(tr('Nickname', 'Ник'))}</span><input class="inp" data-mnick value="${esc(u.nick)}" maxlength="32"></label><label><span>${esc(tr('Login', 'Логин'))}</span><input class="inp" data-mlogin value="${esc(u.login)}" maxlength="24" spellcheck="false" autocapitalize="off"></label><button type="button" class="pill pill-outline pill-sm" data-ma="rename">${ic('check')} ${esc(tr('Save', 'Сохранить'))}</button></div>`)}
  ${sec('alert', tr('Warning', 'Предупреждение'), `<textarea class="inp" data-mwarn rows="2" maxlength="500" placeholder="${esc(tr('Message for the user', 'Сообщение пользователю'))}"></textarea><div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="warn">${ic('alert')} ${esc(tr('Send the warning', 'Отправить предупреждение'))}</button></div>`)}
  ${sec('ban', tr('Block', 'Блокировка'), u.banned ? `<p class="muted" style="margin:0 0 10px">${esc(tr('Blocked', 'Заблокирован'))} ${esc(banText(m.bannedUntil))}${m.banReason ? ' · ' + esc(m.banReason) : ''}</p><button type="button" class="pill pill-white pill-sm" data-ma="unban">${ic('lockOpen')} ${esc(tr('Unblock', 'Разблокировать'))}</button>`
    : `<div class="seg md-days" role="group" aria-label="${esc(tr('Duration', 'Срок'))}">${DAYS.map(d => `<button type="button" data-days="${d}" aria-pressed="${d === 7}">${d ? esc(tr(d + ' d', d + ' дн.')) : '∞'}</button>`).join('')}</div><div class="md-row"><button type="button" class="pill pill-danger pill-sm" data-ma="ban">${ic('ban')} ${esc(tr('Block', 'Заблокировать'))}</button></div>`, 'danger')}` : ''}
  ${m.canRole ? sec('shield', tr('Role', 'Роль'), `<div class="md-row"><span class="lp">${esc(u.role === 'admin' ? tr('Administrator', 'Администратор') : tr('User', 'Пользователь'))}</span><button type="button" class="pill pill-outline pill-sm" data-ma="role" data-role="${u.role === 'admin' ? 'user' : 'admin'}">${ic('shield')} ${esc(u.role === 'admin' ? tr('Remove admin role', 'Снять роль админа') : tr('Make admin', 'Сделать админом'))}</button></div>`) : ''}
  ${m.canBadges ? sec('star', tr('Badges', 'Значки'), `<div class="md-row">${Object.keys(BADGE_N).map(b => `<label class="chk"><input type="checkbox" data-badge="${b}"${ub.includes(b) ? ' checked' : ''}><span>${esc(BADGE_N[b])}</span></label>`).join('')}<button type="button" class="pill pill-outline pill-sm" data-ma="badges">${ic('check')} ${esc(tr('Save badges', 'Сохранить значки'))}</button></div>`) : ''}
  <p class="form-err" data-err role="alert"></p>`;
  openDialog({
    title: tr('Moderation', 'Модерация'), body, wide: true, cls: 'mod-dlg',
    onOpen: (d, close) => {
      const err = $('[data-err]', d), rs = $('#md-r', d);
      d.addEventListener('click', async e => {
        const day = e.target.closest('[data-days]'); if (day) { $$('[data-days]', d).forEach(x => x.setAttribute('aria-pressed', String(x === day))); return; }
        const b = e.target.closest('[data-ma]'); if (!b) return;
        const a = b.dataset.ma, body = { login: u.login, action: a, reason: rs ? rs.value.trim() : '' };
        err.textContent = '';
        if (a === 'rename') { body.nick = $('[data-mnick]', d).value.trim(); body.newLogin = $('[data-mlogin]', d).value.trim(); }
        if (a === 'warn') { body.text = $('[data-mwarn]', d).value.trim(); if (!body.text) { err.textContent = errText({ code: 'text_bad' }); $('[data-mwarn]', d).focus(); return; } }
        if (a === 'ban') { const p = $('[data-days][aria-pressed="true"]', d); body.days = p ? +p.dataset.days : 7; if (!(await confirmDlg(tr(`Block @${u.login} ${body.days ? 'for ' + body.days + ' d' : 'forever'}?`, `Заблокировать @${u.login} ${body.days ? 'на ' + body.days + ' дн.' : 'навсегда'}?`)))) return; }
        if (a === 'role') body.role = b.dataset.role;
        if (a === 'badges') body.badges = $$('[data-badge]', d).filter(x => x.checked).map(x => x.dataset.badge);
        busyBtn(b, true);
        try {
          await api('mod', { method: 'POST', body }); toast(tr('Done', 'Готово')); close('ok');
          if (a === 'rename' && body.newLogin && body.newLogin !== u.login) location.hash = '#/u/' + body.newLogin; else after && after();
        } catch (ex) { err.textContent = errText(ex); } finally { busyBtn(b, false); }
      });
    }
  });
}
const LOG_N = {
  reset_bio: ['cleared “About me” of', 'очистил «О себе» у'], reset_avatar: ['reset the avatar of', 'сбросил аватар у'], rename: ['renamed', 'переименовал'], del_set: ['removed a set of', 'удалил набор у'],
  warn: ['warned', 'предупредил'], ban: ['blocked', 'заблокировал'], unban: ['unblocked', 'разблокировал'], role: ['changed the role of', 'сменил роль у'], badges: ['changed the badges of', 'сменил значки у'],
  flag_resolved: ['resolved a flag on', 'закрыл отметку у'], flag_dismissed: ['dismissed a flag on', 'отклонил отметку у'], reset_approve: ['approved a password reset for', 'одобрил сброс пароля для'], reset_reject: ['rejected a password reset for', 'отклонил сброс пароля для'],
  announce: ['posted an announcement', 'опубликовал объявление'], unannounce: ['deleted an announcement', 'удалил объявление']
};
function markWords(text, words) {
  let h = esc(text);
  (words || []).forEach(w => { const e = esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if (e) h = h.replace(new RegExp(e, 'giu'), m => `<mark>${m}</mark>`); });
  return h;
}
route(/^\/admin$/, (v, _, q) => {
  if (!Auth.user) { goHash('#/login?next=' + encodeURIComponent('#/admin')); return { title: t('auth.login') }; }
  let tab = q.get('tab') || 'flags', data = null;
  v.innerHTML = `<div class="page adm-page">${pageHead(`${ic('shield')} lynx.`, null, null, tr('Admin panel', 'Админ-панель'))}<div data-adm>${loadingHtml()}</div></div>`;
  const box = $('[data-adm]', v), tok = renderTok;
  const who = u => `<a class="adm-who" href="#/u/${esc(u.login)}">${avatarHtml(u, 36)}<span><b>${esc(u.nick || u.login)}</b><small>@${esc(u.login)}</small></span></a>`;
  const empty = (icon, txt) => `<div class="glass empty"><div class="em em-lg">${ic(icon)}</div><p>${esc(txt)}</p></div>`;
  const panels = {
    flags: () => data.flags.length ? data.flags.map(f => `<article class="glass adm-card" data-flag="${f.id}">${who(f.user)}<div class="adm-body"><span class="kicker">${ic('flag')} ${esc(tr(...(FIELD_N[f.field] || ['text', 'текст'])))} · ${esc(relTime(f.created))}</span><p class="adm-text">${markWords(f.text, f.words)}</p><div class="adm-words">${f.words.map(w => `<span class="lp bad">${esc(w)}</span>`).join('')}</div>
      ${f.canAct ? '' : `<p class="md-note">${ic('shield')} ${esc(tr('Staff account: moderation is off. The owner can remove the admin role first.', 'Аккаунт администрации: модерация недоступна. Владелец может сначала снять роль админа.'))}</p>`}</div>
      <div class="adm-acts">${f.canAct ? `${f.field === 'bio' ? `<button type="button" class="pill pill-white pill-sm" data-fx="clear">${ic('note')} ${esc(tr('Clear “About me”', 'Очистить «О себе»'))}</button>` : ''}<button type="button" class="pill pill-outline pill-sm" data-fx="mod">${ic('shield')} ${esc(tr('Moderate', 'Модерация'))}</button><button type="button" class="pill pill-outline pill-sm" data-fx="resolved">${ic('check')} ${esc(tr('Resolved', 'Решено'))}</button>` : ''}<button type="button" class="pill pill-glass pill-sm" data-fx="dismissed">${ic('x')} ${esc(tr('Not a problem', 'Не нарушение'))}</button></div></article>`).join('') : empty('flag', tr('The filter has not flagged anything.', 'Фильтр ничего не отметил.')),
    resets: () => data.resets.length ? data.resets.map(r => `<article class="glass adm-card" data-reset="${r.id}">${who(r.user)}<div class="adm-body"><span class="kicker">${ic('key')} ${esc(relTime(r.created))} · ${esc(tr('expires ', 'истекает '))}${esc(fmtDate(r.expires, true))}</span><p class="adm-text">${r.note ? esc(r.note) : `<span class="faint">${esc(tr('No note.', 'Без комментария.'))}</span>`}</p>${r.canAct ? '' : `<p class="md-note">${ic('crown')} ${esc(tr('Only the owner can approve requests from administrators.', 'Запросы администраторов одобряет только владелец.'))}</p>`}</div>
      <div class="adm-acts">${r.canAct ? `<button type="button" class="pill pill-white pill-sm" data-rx="1">${ic('check')} ${esc(tr('Approve', 'Одобрить'))}</button><button type="button" class="pill pill-outline pill-sm" data-rx="0">${ic('x')} ${esc(tr('Reject', 'Отклонить'))}</button>` : ''}</div></article>`).join('') : empty('key', tr('No password reset requests.', 'Запросов на сброс пароля нет.')),
    banned: () => data.banned.length ? data.banned.map(b => `<article class="glass adm-card" data-ban="${esc(b.login)}">${who(b)}<div class="adm-body"><span class="kicker">${ic('ban')} ${esc(banText(b.until))}</span>${b.reason ? `<p class="adm-text">${esc(b.reason)}</p>` : ''}</div><div class="adm-acts"><button type="button" class="pill pill-outline pill-sm" data-unban>${ic('lockOpen')} ${esc(tr('Unblock', 'Разблокировать'))}</button></div></article>`).join('') : empty('ban', tr('Nobody is blocked.', 'Заблокированных нет.')),
    ann: () => `<form class="glass panel adm-annf" data-annf novalidate><h3 class="grp-title">${ic('megaphone')} ${esc(tr('New announcement', 'Новое объявление'))}</h3><p class="faint" style="margin:0;font-size:13px">${esc(tr('Everyone will see it in their notifications.', 'Все увидят его в уведомлениях.'))}</p>
      <input class="inp" name="title" maxlength="120" placeholder="${esc(tr('Title', 'Заголовок'))}" required><textarea class="inp" name="body" maxlength="2000" rows="4" placeholder="${esc(tr('Text', 'Текст'))}" required></textarea><p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('megaphone')} ${esc(tr('Publish', 'Опубликовать'))}</button></div></form>
      ${data.announcements.map(a => `<article class="glass adm-card" data-ann="${a.id}"><div class="adm-body"><span class="kicker">${ic('megaphone')} ${esc(relTime(a.created))}${a.author ? ' · @' + esc(a.author) : ''}</span><b>${esc(a.title)}</b><p class="adm-text">${esc(a.body)}</p></div><div class="adm-acts"><button type="button" class="icon-btn" data-unann aria-label="${esc(tr('Delete', 'Удалить'))}" data-tip="${esc(tr('Delete', 'Удалить'))}">${ic('trash')}</button></div></article>`).join('')}`,
    staff: () => `${data.me.role === 'owner' ? `<form class="glass panel adm-addf" data-addf novalidate><label class="fld-l" for="adm-add">${esc(tr('Give the admin role by login', 'Выдать роль админа по логину'))}</label><div class="row"><input class="inp" id="adm-add" name="login" maxlength="24" placeholder="login" spellcheck="false" autocapitalize="off"><button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('shield')} ${esc(tr('Make admin', 'Сделать админом'))}</button></div><p class="form-err" data-err role="alert"></p></form>` : ''}
      ${data.staff.map(s => `<article class="glass adm-card" data-staff="${esc(s.login)}">${who(s)}<div class="adm-body"><div class="adm-bdg">${badgesHtml(s, true)}</div></div><div class="adm-acts">${data.me.role === 'owner' && s.role === 'admin' ? `<button type="button" class="pill pill-outline pill-sm" data-demote>${ic('x')} ${esc(tr('Remove admin role', 'Снять роль админа'))}</button>` : ''}</div></article>`).join('')}`,
    log: () => data.log.length ? `<ol class="glass adm-log">${data.log.map(l => `<li><span class="lg-t">${esc(relTime(l.created))}</span><span class="lg-x">${l.actor ? `<a href="#/u/${esc(l.actor)}">@${esc(l.actor)}</a>` : '—'} ${esc(tr(...(LOG_N[l.action] || [l.action, l.action])))} ${l.target ? `<a href="#/u/${esc(l.target)}">@${esc(l.target)}</a>` : ''}${l.detail && l.detail.reason ? ` <span class="faint">· ${esc(l.detail.reason)}</span>` : ''}${l.detail && l.detail.title ? ` <span class="faint">· ${esc(l.detail.title)}</span>` : ''}${l.detail && l.detail.days != null ? ` <span class="faint">· ${esc(l.detail.days ? tr(l.detail.days + ' d', l.detail.days + ' дн.') : '∞')}</span>` : ''}</span></li>`).join('')}</ol>` : empty('clipboard', tr('No actions yet.', 'Действий пока нет.'))
  };
  const TABS = () => [['flags', 'flag', tr('Filter', 'Фильтр'), data.flags.length], ['resets', 'key', tr('Password resets', 'Сброс пароля'), data.resets.length], ['banned', 'ban', tr('Blocked', 'Блокировки'), data.banned.length], ['ann', 'megaphone', tr('Announcements', 'Объявления'), 0], ['staff', 'shield', tr('Staff', 'Команда'), 0], ['log', 'clipboard', tr('Log', 'Журнал'), 0]];
  const paintPanel = () => { const p = $('[data-ap]', box); if (p) { p.innerHTML = `<div class="adm-list">${panels[tab]()}</div>`; } };
  const paint = () => {
    if (!panels[tab]) tab = 'flags';
    box.innerHTML = `<div class="adm-top"><span class="lp">${ic('people')} ${esc(tr('Users: ', 'Пользователей: '))}${data.users}</span><span class="lp">${ic(data.me.role === 'owner' ? 'crown' : 'shield')} ${esc(data.me.role === 'owner' ? tr('Owner', 'Владелец') : tr('Admin', 'Админ'))}</span></div>
    <div class="tabs-scroll">${tabsHtml('adm', TABS().map(([id, i, l, n]) => ({ id, html: `${ic(i)}<span>${esc(l)}</span>${n ? `<b class="tab-n">${n}</b>` : ''}` })), tab, tr('Sections', 'Разделы'), 'adm-tabs')}</div>
    <div id="adm-panel" role="tabpanel" data-ap></div>`;
    bindTabs($('.adm-tabs', box), id => { tab = id; const p = new URLSearchParams(); p.set('tab', id); setQuery(p); paintPanel(); });
    paintPanel();
  };
  const load = async () => {
    try { data = await api('admin'); if (tok !== renderTok) return; paint(); }
    catch (e) { if (tok !== renderTok) return; box.innerHTML = e.code === 'forbidden' ? empty('shield', tr('This page is only for the administration.', 'Эта страница только для администрации.')) : errorCard(e, true); const r = $('[data-retry]', box); r && r.addEventListener('click', () => { box.innerHTML = loadingHtml(); load(); }); }
  };
  const reload = async () => { await load(); Auth.pollUnread(); };
  const act = async (btn, fn, okMsg) => { busyBtn(btn, true); try { await fn(); toast(okMsg || tr('Done', 'Готово')); await reload(); } catch (ex) { toast(errText(ex)); } finally { if (document.contains(btn)) busyBtn(btn, false); } };
  box.addEventListener('click', async e => {
    const fx = e.target.closest('[data-fx]'), rx = e.target.closest('[data-rx]');
    if (fx) {
      const card = fx.closest('[data-flag]'), f = data.flags.find(x => x.id === +card.dataset.flag), k = fx.dataset.fx;
      if (k === 'resolved' || k === 'dismissed') return act(fx, () => api('admin', { method: 'POST', body: { op: 'flag', id: f.id, status: k } }));
      if (k === 'clear') return modAsk({ title: tr(`Clear “About me” of @${f.user.login}?`, `Очистить «О себе» у @${f.user.login}?`), text: f.text, ok: tr('Clear', 'Очистить'), danger: true, run: reason => api('mod', { method: 'POST', body: { login: f.user.login, action: 'reset_bio', reason } }), done: () => { toast(tr('Done', 'Готово')); reload(); } });
      if (k === 'mod') { busyBtn(fx, true); try { const j = await api('user', { q: { login: f.user.login } }); openModDialog(j.user, reload); } catch (ex) { toast(errText(ex)); } finally { busyBtn(fx, false); } }
    }
    if (rx) { const id = +rx.closest('[data-reset]').dataset.reset; return act(rx, () => api('admin', { method: 'POST', body: { op: 'reset', id, approve: rx.dataset.rx === '1' } }), rx.dataset.rx === '1' ? tr('Approved: the user can set a new password now', 'Одобрено: теперь пользователь может задать новый пароль') : tr('Rejected', 'Отклонено')); }
    const ub = e.target.closest('[data-unban]'); if (ub) return act(ub, () => api('mod', { method: 'POST', body: { login: ub.closest('[data-ban]').dataset.ban, action: 'unban' } }));
    const un = e.target.closest('[data-unann]'); if (un) { if (!(await confirmDlg(tr('Delete the announcement?', 'Удалить объявление?')))) return; return act(un, () => api('admin', { method: 'POST', body: { op: 'unannounce', id: +un.closest('[data-ann]').dataset.ann } })); }
    const dm = e.target.closest('[data-demote]'); if (dm) { const l = dm.closest('[data-staff]').dataset.staff; if (!(await confirmDlg(tr(`Remove the admin role from @${l}?`, `Снять роль админа с @${l}?`)))) return; return act(dm, () => api('mod', { method: 'POST', body: { login: l, action: 'role', role: 'user' } })); }
  });
  box.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, b = $('button[type=submit]', f), err = $('[data-err]', f); err.textContent = '';
    if (f.matches('[data-annf]')) { const title = f.elements['title'].value.trim(), body = f.elements['body'].value.trim(); if (!title || !body) { err.textContent = errText({ code: 'text_bad' }); return; } busyBtn(b, true); try { await api('admin', { method: 'POST', body: { op: 'announce', title, body } }); toast(tr('Published', 'Опубликовано')); await reload(); } catch (ex) { err.textContent = errText(ex); } finally { if (document.contains(b)) busyBtn(b, false); } }
    if (f.matches('[data-addf]')) { const l = f.login.value.trim().replace(/^@/, ''); if (!l) return; busyBtn(b, true); try { await api('mod', { method: 'POST', body: { login: l, action: 'role', role: 'admin' } }); toast(tr(`@${l} is an admin now`, `@${l} теперь админ`)); await reload(); } catch (ex) { err.textContent = errText(ex); } finally { if (document.contains(b)) busyBtn(b, false); } }
  });
  load();
  return { title: tr('Admin panel', 'Админ-панель'), nav: 'admin', relang: true, auth: true };
});

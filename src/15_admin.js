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
  const m = u.mod || {}, can = !!m.canModerate, ub = Array.isArray(u.badges) ? u.badges : [], soc = u.socials || {};
  const sec = (icon, title, inner, cls = '') => `<section class="md-sec ${cls}"><h3>${ic(icon)} ${esc(title)}</h3>${inner}</section>`;
  const DAYS = [1, 3, 7, 30, 90, 365, 0], st = Number(m.strikes) || 0;
  const roleBtns = () => {
    const opts = [['user', tr('User', 'Пользователь')], ['admin', tr('Administrator', 'Администратор')]].concat(m.canCoowner ? [['coowner', tr('Co-owner', 'Совладелец')]] : []);
    return `<div class="seg md-role" role="group" aria-label="${esc(tr('Role', 'Роль'))}">${opts.map(([r, l]) => `<button type="button" data-rolepick="${r}" aria-pressed="${(u.role || 'user') === r}">${esc(l)}</button>`).join('')}</div><div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="role">${ic('shield')} ${esc(tr('Apply role', 'Применить роль'))}</button></div>`;
  };
  const body = `<div class="md-user">${avatarHtml(u, 48)}<div class="md-id"><b>${esc(u.nick)}</b><span>@${esc(u.login)}</span></div><span class="md-bdg">${badgesHtml(u, true)}</span></div>
  ${!can ? `<p class="md-note">${ic('shield')} ${esc(isStaffU(u) ? tr('This is a staff account, so moderation is off. The owner can remove the role first.', 'Это аккаунт администрации, модерация недоступна. Владелец может сначала снять роль.') : tr('You cannot moderate this account.', 'Этот аккаунт нельзя модерировать.'))}</p>` : ''}
  ${can ? `<div class="md-strikes" data-strikes><span class="md-st-dots" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</span><span><b>${esc(tr(`Strikes: ${st} of 3`, `Страйки: ${st} из 3`))}</b><small>${esc(tr(`Warnings in total: ${m.warnsTotal || 0}. The 3rd strike blocks the account for a day.`, `Всего предупреждений: ${m.warnsTotal || 0}. 3-й страйк блокирует аккаунт на сутки.`))}</small></span>${st ? `<button type="button" class="pill pill-glass pill-sm" data-ma="clear_strikes">${ic('x')} ${esc(tr('Clear', 'Снять'))}</button>` : ''}</div>
  <div class="fld" data-f="reason"><label class="fld-l" for="md-r">${esc(tr('Reason (the user will see it)', 'Причина (её увидит пользователь)'))}</label><div class="fld-in ta">${ic('note')}<textarea class="inp" id="md-r" maxlength="300" rows="2" placeholder="${esc(tr('For example: rude words in the profile', 'Например: грубые слова в профиле'))}"></textarea></div></div>
  ${sec('sparkle', tr('Quick actions', 'Быстрые действия'), `<div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="reset_bio"${u.bio ? '' : ' disabled'}>${ic('note')} ${esc(tr('Clear “About me”', 'Очистить «О себе»'))}</button><button type="button" class="pill pill-outline pill-sm" data-ma="reset_avatar">${ic('image')} ${esc(tr('Reset avatar and banner', 'Сбросить аватар и баннер'))}</button></div>`)}
  ${sec('pen', tr('Edit profile', 'Редактировать профиль'), `<div class="md-grid md-edit"><label><span>${esc(tr('Nickname', 'Ник'))}</span><input class="inp" data-e="nick" value="${esc(u.nick)}" maxlength="32"></label><label><span>${esc(tr('Login', 'Логин'))}</span><input class="inp" data-e="newLogin" value="${esc(u.login)}" maxlength="24" spellcheck="false" autocapitalize="off"></label>
    <label class="md-wide"><span>${esc(tr('About me', 'О себе'))}</span><textarea class="inp" data-e="bio" maxlength="200" rows="2">${esc(u.bio || '')}</textarea></label>
    ${SOC.map(([k, n]) => `<label><span>${esc(n)}</span><input class="inp" data-soc="${k}" value="${esc(soc[k] || '')}" maxlength="100" spellcheck="false" autocapitalize="off"></label>`).join('')}
    <label><span>${esc(tr('Avatar frame', 'Рамка аватара'))}</span><select class="inp" data-e="frame"><option value="">${esc(tr('None', 'Без рамки'))}</option>${FRAME_P.concat(FRAME_X).map(f => `<option value="${f}"${u.frame === f ? ' selected' : ''}>${esc(tr(...FRAME_N[f]))}</option>`).join('')}</select></label>
    <div class="md-chks"><label class="chk"><input type="checkbox" data-e="resetAvatar"><span>${esc(tr('Remove the avatar', 'Убрать аватар'))}</span></label><label class="chk"><input type="checkbox" data-e="resetBanner"><span>${esc(tr('Remove the banner', 'Убрать баннер'))}</span></label></div></div>
    <div class="md-row"><button type="button" class="pill pill-white pill-sm" data-ma="edit">${ic('check')} ${esc(tr('Save changes', 'Сохранить изменения'))}</button></div>`)}
  ${sec('alert', tr('Warning', 'Предупреждение'), `<textarea class="inp" data-mwarn rows="2" maxlength="500" placeholder="${esc(tr('Message for the user', 'Сообщение пользователю'))}"></textarea><div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="warn">${ic('alert')} ${esc(tr(`Warn (strike ${Math.min(3, st + 1)} of 3)`, `Предупредить (страйк ${Math.min(3, st + 1)} из 3)`))}</button></div>`)}
  ${sec('ban', tr('Block', 'Блокировка'), u.banned ? `<p class="muted" style="margin:0 0 10px">${esc(tr('Blocked', 'Заблокирован'))} ${esc(banText(m.bannedUntil))}${m.banReason ? ' · ' + esc(banReasonText(m.banReason)) : ''}${m.ipBanned ? ' · ' + esc(tr('by IP too', 'также по IP')) : ''}</p><button type="button" class="pill pill-white pill-sm" data-ma="unban">${ic('lockOpen')} ${esc(tr('Unblock', 'Разблокировать'))}</button>`
    : `<div class="seg md-days" role="group" aria-label="${esc(tr('Duration', 'Срок'))}">${DAYS.map(d => `<button type="button" data-days="${d}" aria-pressed="${d === 7}">${d ? esc(tr(d + ' d', d + ' дн.')) : '∞'}</button>`).join('')}</div>
    <label class="chk md-ipchk"><input type="checkbox" data-ipban${(m.ips || []).length ? '' : ' disabled'}><span>${esc(tr('Also block the network (IP)', 'Заблокировать и сеть (IP)'))}${(m.ips || []).length ? ` <small class="faint">${esc(m.ips.join(', '))}</small>` : ` <small class="faint">${esc(tr('no addresses yet', 'адресов пока нет'))}</small>`}</span></label>
    <div class="md-row"><button type="button" class="pill pill-danger pill-sm" data-ma="ban">${ic('ban')} ${esc(tr('Block', 'Заблокировать'))}</button></div>`, 'danger')}` : ''}
  ${m.canRole ? sec('shield', tr('Role', 'Роль'), roleBtns()) : ''}
  ${m.canBadges ? sec('star', tr('Badges', 'Значки'), `<div class="md-row">${Object.keys(BADGE_N).map(b => `<label class="chk"><input type="checkbox" data-badge="${b}"${ub.includes(b) ? ' checked' : ''}><span>${esc(BADGE_N[b])}</span></label>`).join('')}<button type="button" class="pill pill-outline pill-sm" data-ma="badges">${ic('check')} ${esc(tr('Save badges', 'Сохранить значки'))}</button></div>`) : ''}
  ${can ? sec('trash', tr('Delete the account', 'Удалить аккаунт'), `<p class="muted" style="margin:0 0 10px">${esc(tr('The profile, results, sets and messages are removed for good.', 'Профиль, результаты, наборы и сообщения удалятся навсегда.'))}</p><button type="button" class="pill pill-danger pill-sm" data-ma="delete_account">${ic('trash')} ${esc(tr('Delete account', 'Удалить аккаунт'))}</button>`, 'danger') : ''}
  <p class="form-err" data-err role="alert"></p>`;
  openDialog({
    title: tr('Moderation', 'Модерация'), body, wide: true, cls: 'mod-dlg',
    onOpen: (d, close) => {
      const err = $('[data-err]', d), rs = $('#md-r', d);
      d.addEventListener('click', async e => {
        const day = e.target.closest('[data-days]'); if (day) { $$('[data-days]', d).forEach(x => x.setAttribute('aria-pressed', String(x === day))); return; }
        const rp = e.target.closest('[data-rolepick]'); if (rp) { $$('[data-rolepick]', d).forEach(x => x.setAttribute('aria-pressed', String(x === rp))); return; }
        const b = e.target.closest('[data-ma]'); if (!b) return;
        let a = b.dataset.ma; const body = { login: u.login, action: a, reason: rs ? rs.value.trim() : '' };
        err.textContent = '';
        if (a === 'edit') {
          $$('[data-e]', d).forEach(x => { body[x.dataset.e] = x.type === 'checkbox' ? x.checked : x.value.trim(); });
          body.frame = body.frame || null; body.socials = {};
          $$('[data-soc]', d).forEach(x => { const v = parseSocial(x.dataset.soc, x.value); if (v) body.socials[x.dataset.soc] = v; });
        }
        if (a === 'warn') { body.text = $('[data-mwarn]', d).value.trim(); if (!body.text) { err.textContent = errText({ code: 'text_bad' }); $('[data-mwarn]', d).focus(); return; } }
        if (a === 'ban') {
          const p = $('[data-days][aria-pressed="true"]', d), ip = $('[data-ipban]', d); body.days = p ? +p.dataset.days : 7;
          if (ip && ip.checked) { a = body.action = 'ip_ban'; }
          if (!(await confirmDlg(tr(`Block @${u.login} ${body.days ? 'for ' + body.days + ' d' : 'forever'}${a === 'ip_ban' ? ' together with the network' : ''}?`, `Заблокировать @${u.login} ${body.days ? 'на ' + body.days + ' дн.' : 'навсегда'}${a === 'ip_ban' ? ' вместе с сетью' : ''}?`)))) return;
        }
        if (a === 'delete_account' && !(await confirmDlg(tr(`Delete @${u.login} for good?`, `Удалить @${u.login} навсегда?`)))) return;
        if (a === 'role') { const p = $('[data-rolepick][aria-pressed="true"]', d); body.role = p ? p.dataset.rolepick : 'user'; if (body.role === (u.role || 'user')) { close('ok'); return; } }
        if (a === 'badges') body.badges = $$('[data-badge]', d).filter(x => x.checked).map(x => x.dataset.badge);
        busyBtn(b, true);
        try {
          const j = await api('mod', { method: 'POST', body });
          toast(j.autoBan ? tr('3rd strike: the account is blocked for a day', '3-й страйк: аккаунт заблокирован на сутки') : a === 'warn' ? tr(`Warning sent · strike ${j.strikes} of 3`, `Предупреждение отправлено · страйк ${j.strikes} из 3`) : a === 'delete_account' ? tr('The account was deleted', 'Аккаунт удалён') : tr('Done', 'Готово'));
          close('ok');
          if (a === 'delete_account') { if (/^#\/u\//.test(location.hash)) location.hash = '#/people'; else after && after(); }
          else if ((a === 'rename' || a === 'edit') && body.newLogin && body.newLogin !== u.login && /^#\/u\//.test(location.hash)) location.hash = '#/u/' + body.newLogin; else after && after();
        } catch (ex) { err.textContent = errText(ex); } finally { busyBtn(b, false); }
      });
    }
  });
}
function banReasonText(r) { return r === 'auto:strikes' ? tr('3 strikes (automatic)', '3 страйка (автоматически)') : r; }
const LOG_N = {
  reset_bio: ['cleared “About me” of', 'очистил «О себе» у'], reset_avatar: ['reset the avatar of', 'сбросил аватар у'], rename: ['renamed', 'переименовал'], del_set: ['removed a set of', 'удалил набор у'],
  warn: ['warned', 'предупредил'], ban: ['blocked', 'заблокировал'], unban: ['unblocked', 'разблокировал'], role: ['changed the role of', 'сменил роль у'], badges: ['changed the badges of', 'сменил значки у'],
  flag_resolved: ['resolved a flag on', 'закрыл отметку у'], flag_dismissed: ['dismissed a flag on', 'отклонил отметку у'], reset_approve: ['approved a password reset for', 'одобрил сброс пароля для'], reset_reject: ['rejected a password reset for', 'отклонил сброс пароля для'],
  announce: ['posted an announcement', 'опубликовал объявление'], unannounce: ['deleted an announcement', 'удалил объявление'],
  edit: ['edited the profile of', 'изменил профиль'], delete_account: ['deleted the account', 'удалил аккаунт'], ip_ban: ['blocked (with IP)', 'заблокировал (с IP)'], clear_strikes: ['cleared the strikes of', 'снял страйки у'],
  auto_ban: ['3 strikes: automatic block of', '3 страйка: автоблокировка'], del_msg: ['deleted a chat message of', 'удалил сообщение в чате у']
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
      <div class="adm-acts">${f.canAct ? `${f.field === 'chat' && f.ref ? `<button type="button" class="pill pill-white pill-sm" data-fx="delmsg">${ic('trash')} ${esc(tr('Delete the message', 'Удалить сообщение'))}</button>` : ''}${f.field === 'bio' ? `<button type="button" class="pill pill-white pill-sm" data-fx="clear">${ic('note')} ${esc(tr('Clear “About me”', 'Очистить «О себе»'))}</button>` : ''}<button type="button" class="pill pill-outline pill-sm" data-fx="mod">${ic('shield')} ${esc(tr('Moderate', 'Модерация'))}</button><button type="button" class="pill pill-outline pill-sm" data-fx="resolved">${ic('check')} ${esc(tr('Resolved', 'Решено'))}</button>` : ''}<button type="button" class="pill pill-glass pill-sm" data-fx="dismissed">${ic('x')} ${esc(tr('Not a problem', 'Не нарушение'))}</button></div></article>`).join('') : empty('flag', tr('The filter has not flagged anything.', 'Фильтр ничего не отметил.')),
    resets: () => data.resets.length ? data.resets.map(r => `<article class="glass adm-card" data-reset="${r.id}">${who(r.user)}<div class="adm-body"><span class="kicker">${ic('key')} ${esc(relTime(r.created))} · ${esc(tr('expires ', 'истекает '))}${esc(fmtDate(r.expires, true))}</span><p class="adm-text">${r.note ? esc(r.note) : `<span class="faint">${esc(tr('No note.', 'Без комментария.'))}</span>`}</p>${r.canAct ? '' : `<p class="md-note">${ic('crown')} ${esc(tr('Only the owner can approve requests from administrators.', 'Запросы администраторов одобряет только владелец.'))}</p>`}</div>
      <div class="adm-acts">${r.canAct ? `<button type="button" class="pill pill-white pill-sm" data-rx="1">${ic('check')} ${esc(tr('Approve', 'Одобрить'))}</button><button type="button" class="pill pill-outline pill-sm" data-rx="0">${ic('x')} ${esc(tr('Reject', 'Отклонить'))}</button>` : ''}</div></article>`).join('') : empty('key', tr('No password reset requests.', 'Запросов на сброс пароля нет.')),
    banned: () => data.banned.length ? data.banned.map(b => `<article class="glass adm-card" data-ban="${esc(b.login)}">${who(b)}<div class="adm-body"><span class="kicker">${ic('ban')} ${esc(banText(b.until))}${b.ipBans ? ` · IP: ${b.ipBans}` : ''}</span>${b.reason ? `<p class="adm-text">${esc(banReasonText(b.reason))}</p>` : ''}</div><div class="adm-acts"><button type="button" class="pill pill-outline pill-sm" data-unban>${ic('lockOpen')} ${esc(tr('Unblock', 'Разблокировать'))}</button></div></article>`).join('') : empty('ban', tr('Nobody is blocked.', 'Заблокированных нет.')),
    ann: () => `<form class="glass panel adm-annf" data-annf novalidate><h3 class="grp-title">${ic('megaphone')} ${esc(tr('New announcement', 'Новое объявление'))}</h3><p class="faint" style="margin:0;font-size:13px">${esc(tr('Everyone will see it in their notifications.', 'Все увидят его в уведомлениях.'))}</p>
      <input class="inp" name="title" maxlength="120" placeholder="${esc(tr('Title', 'Заголовок'))}" required><textarea class="inp" name="body" maxlength="2000" rows="4" placeholder="${esc(tr('Text', 'Текст'))}" required></textarea><p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('megaphone')} ${esc(tr('Publish', 'Опубликовать'))}</button></div></form>
      ${data.announcements.map(a => `<article class="glass adm-card" data-ann="${a.id}"><div class="adm-body"><span class="kicker">${ic('megaphone')} ${esc(relTime(a.created))}${a.author ? ' · @' + esc(a.author) : ''}</span><b>${esc(a.title)}</b><p class="adm-text">${esc(a.body)}</p></div><div class="adm-acts"><button type="button" class="icon-btn" data-unann aria-label="${esc(tr('Delete', 'Удалить'))}" data-tip="${esc(tr('Delete', 'Удалить'))}">${ic('trash')}</button></div></article>`).join('')}`,
    staff: () => `${data.me.role === 'owner' || data.me.role === 'coowner' ? `<form class="glass panel adm-addf" data-addf novalidate><label class="fld-l" for="adm-add">${esc(tr('Give the admin role by login', 'Выдать роль админа по логину'))}</label><div class="row"><input class="inp" id="adm-add" name="login" maxlength="24" placeholder="login" spellcheck="false" autocapitalize="off"><button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('shield')} ${esc(tr('Make admin', 'Сделать админом'))}</button></div>${data.me.role === 'coowner' ? `<p class="faint" style="margin:0;font-size:12.5px">${esc(tr('You can remove only the admins you appointed.', 'Снять можно только тех админов, которых назначил ты.'))}</p>` : ''}<p class="form-err" data-err role="alert"></p></form>` : ''}
      ${data.staff.map(s => `<article class="glass adm-card" data-staff="${esc(s.login)}">${who(s)}<div class="adm-body"><div class="adm-bdg">${badgesHtml(s, true)}<span class="lp">${esc(tr(...(ROLE_N[s.role] || ROLE_N.user)))}</span></div>${s.by && s.role !== 'owner' ? `<small class="faint">${esc(tr('appointed by ', 'назначил '))}<a href="#/u/${esc(s.by)}">@${esc(s.by)}</a></small>` : ''}</div><div class="adm-acts">${s.canDemote ? `<button type="button" class="pill pill-outline pill-sm" data-demote data-role="${esc(s.role)}">${ic('x')} ${esc(s.role === 'coowner' ? tr('Remove co-owner role', 'Снять роль совладельца') : tr('Remove admin role', 'Снять роль админа'))}</button>` : ''}</div></article>`).join('')}`,
    log: () => data.log.length ? `<ol class="glass adm-log">${data.log.map(l => `<li><span class="lg-t">${esc(relTime(l.created))}</span><span class="lg-x">${l.actor ? `<a href="#/u/${esc(l.actor)}">@${esc(l.actor)}</a>` : '—'} ${esc(tr(...(LOG_N[l.action] || [l.action, l.action])))} ${l.target ? `<a href="#/u/${esc(l.target)}">@${esc(l.target)}</a>` : ''}${l.detail && l.detail.reason ? ` <span class="faint">· ${esc(l.detail.reason)}</span>` : ''}${l.detail && l.detail.title ? ` <span class="faint">· ${esc(l.detail.title)}</span>` : ''}${l.detail && l.detail.days != null ? ` <span class="faint">· ${esc(l.detail.days ? tr(l.detail.days + ' d', l.detail.days + ' дн.') : '∞')}</span>` : ''}</span></li>`).join('')}</ol>` : empty('clipboard', tr('No actions yet.', 'Действий пока нет.'))
  };
  const TABS = () => [['flags', 'flag', tr('Filter', 'Фильтр'), data.flags.length], ['resets', 'key', tr('Password resets', 'Сброс пароля'), data.resets.length], ['banned', 'ban', tr('Blocked', 'Блокировки'), data.banned.length], ['ann', 'megaphone', tr('Announcements', 'Объявления'), 0], ['staff', 'shield', tr('Staff', 'Команда'), 0], ['log', 'clipboard', tr('Log', 'Журнал'), 0]];
  const paintPanel = () => { const p = $('[data-ap]', box); if (p) { p.innerHTML = `<div class="adm-list">${panels[tab]()}</div>`; } };
  const paint = () => {
    if (!panels[tab]) tab = 'flags';
    box.innerHTML = `<div class="adm-top"><span class="lp">${ic('people')} ${esc(tr('Users: ', 'Пользователей: '))}${data.users}</span><span class="lp">${ic('gem')} Premium: ${data.premium || 0}</span>${data.ipBans ? `<span class="lp">${ic('ban')} ${esc(tr('IP blocks: ', 'Блокировки IP: '))}${data.ipBans}</span>` : ''}<span class="lp">${ic(data.me.role === 'admin' ? 'shield' : 'crown')} ${esc(tr(...(ROLE_N[data.me.role] || ROLE_N.admin)).replace(/^./, c => c.toUpperCase()))}</span></div>
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
      if (k === 'delmsg') { if (!(await confirmDlg(tr('Delete this chat message?', 'Удалить это сообщение в чате?')))) return; return act(fx, async () => { try { await api('chat', { method: 'POST', body: { op: 'del_msg', id: f.ref } }); } catch (ex) { if (ex.code !== 'not_found') throw ex; await api('admin', { method: 'POST', body: { op: 'flag', id: f.id, status: 'resolved' } }); } }, tr('The message was deleted', 'Сообщение удалено')); }
      if (k === 'clear') return modAsk({ title: tr(`Clear “About me” of @${f.user.login}?`, `Очистить «О себе» у @${f.user.login}?`), text: f.text, ok: tr('Clear', 'Очистить'), danger: true, run: reason => api('mod', { method: 'POST', body: { login: f.user.login, action: 'reset_bio', reason } }), done: () => { toast(tr('Done', 'Готово')); reload(); } });
      if (k === 'mod') { busyBtn(fx, true); try { const j = await api('user', { q: { login: f.user.login } }); openModDialog(j.user, reload); } catch (ex) { toast(errText(ex)); } finally { busyBtn(fx, false); } }
    }
    if (rx) { const id = +rx.closest('[data-reset]').dataset.reset; return act(rx, () => api('admin', { method: 'POST', body: { op: 'reset', id, approve: rx.dataset.rx === '1' } }), rx.dataset.rx === '1' ? tr('Approved: the user can set a new password now', 'Одобрено: теперь пользователь может задать новый пароль') : tr('Rejected', 'Отклонено')); }
    const ub = e.target.closest('[data-unban]'); if (ub) return act(ub, () => api('mod', { method: 'POST', body: { login: ub.closest('[data-ban]').dataset.ban, action: 'unban' } }));
    const un = e.target.closest('[data-unann]'); if (un) { if (!(await confirmDlg(tr('Delete the announcement?', 'Удалить объявление?')))) return; return act(un, () => api('admin', { method: 'POST', body: { op: 'unannounce', id: +un.closest('[data-ann]').dataset.ann } })); }
    const dm = e.target.closest('[data-demote]'); if (dm) { const l = dm.closest('[data-staff]').dataset.staff; if (!(await confirmDlg(tr(`Remove the ${dm.dataset.role === 'coowner' ? 'co-owner' : 'admin'} role from @${l}?`, `Снять роль ${dm.dataset.role === 'coowner' ? 'совладельца' : 'админа'} с @${l}?`)))) return; return act(dm, () => api('mod', { method: 'POST', body: { login: l, action: 'role', role: 'user' } })); }
  });
  box.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, b = $('button[type=submit]', f), err = $('[data-err]', f); err.textContent = '';
    if (f.matches('[data-annf]')) { const title = f.elements['title'].value.trim(), body = f.elements['body'].value.trim(); if (!title || !body) { err.textContent = errText({ code: 'text_bad' }); return; } busyBtn(b, true); try { await api('admin', { method: 'POST', body: { op: 'announce', title, body } }); toast(tr('Published', 'Опубликовано')); await reload(); } catch (ex) { err.textContent = errText(ex); } finally { if (document.contains(b)) busyBtn(b, false); } }
    if (f.matches('[data-addf]')) { const l = f.login.value.trim().replace(/^@/, ''); if (!l) return; busyBtn(b, true); try { await api('mod', { method: 'POST', body: { login: l, action: 'role', role: 'admin' } }); toast(tr(`@${l} is an admin now`, `@${l} теперь админ`)); await reload(); } catch (ex) { err.textContent = errText(ex); } finally { if (document.contains(b)) busyBtn(b, false); } }
  });
  load();
  return { title: tr('Admin panel', 'Админ-панель'), nav: 'admin', relang: true, auth: true };
});

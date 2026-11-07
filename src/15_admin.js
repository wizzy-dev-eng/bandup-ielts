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
  <div class="fld" data-f="reason"><label class="fld-l" for="md-r">${esc(tr('Reason (the user will see it)', 'Причина (её увидит пользователь)'))}</label><div class="fld-in ta">${ic('note')}<textarea class="inp ta-grow" id="md-r" maxlength="300" rows="2" placeholder="${esc(tr('For example: rude words in the profile', 'Например: грубые слова в профиле'))}"></textarea></div></div>
  ${sec('sparkle', tr('Quick actions', 'Быстрые действия'), `<div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="reset_bio"${u.bio ? '' : ' disabled'}>${ic('note')} ${esc(tr('Clear “About me”', 'Очистить «О себе»'))}</button><button type="button" class="pill pill-outline pill-sm" data-ma="reset_avatar">${ic('image')} ${esc(tr('Reset avatar and banner', 'Сбросить аватар и баннер'))}</button></div>`)}
  ${sec('pen', tr('Edit profile', 'Редактировать профиль'), `<div class="md-grid md-edit"><label><span>${esc(tr('Nickname', 'Ник'))}</span><input class="inp" data-e="nick" value="${esc(u.nick)}" maxlength="32"></label><label><span>${esc(tr('Login', 'Логин'))}</span><input class="inp" data-e="newLogin" value="${esc(u.login)}" maxlength="24" spellcheck="false" autocapitalize="off"></label>
    <label class="md-wide"><span>${esc(tr('About me', 'О себе'))}</span><textarea class="inp ta-grow" data-e="bio" maxlength="200" rows="2">${esc(u.bio || '')}</textarea></label>
    ${SOC.map(([k, n]) => `<label><span>${esc(n)}</span><input class="inp" data-soc="${k}" value="${esc(soc[k] || '')}" maxlength="100" spellcheck="false" autocapitalize="off"></label>`).join('')}
    <label><span>${esc(tr('Avatar frame', 'Рамка аватара'))}</span><select class="inp" data-e="frame"><option value="">${esc(tr('None', 'Без рамки'))}</option>${FRAME_P.concat(FRAME_X).map(f => `<option value="${f}"${u.frame === f ? ' selected' : ''}>${esc(tr(...FRAME_N[f]))}</option>`).join('')}</select></label>
    <div class="md-chks"><label class="chk"><input type="checkbox" data-e="resetAvatar"><span>${esc(tr('Remove the avatar', 'Убрать аватар'))}</span></label><label class="chk"><input type="checkbox" data-e="resetBanner"><span>${esc(tr('Remove the banner', 'Убрать баннер'))}</span></label></div></div>
    <div class="md-row"><button type="button" class="pill pill-white pill-sm" data-ma="edit">${ic('check')} ${esc(tr('Save changes', 'Сохранить изменения'))}</button></div>`)}
  ${sec('alert', tr('Warning', 'Предупреждение'), `<textarea class="inp ta-grow" data-mwarn rows="2" maxlength="500" placeholder="${esc(tr('Message for the user', 'Сообщение пользователю'))}"></textarea><div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="warn">${ic('alert')} ${esc(tr(`Warn (strike ${Math.min(3, st + 1)} of 3)`, `Предупредить (страйк ${Math.min(3, st + 1)} из 3)`))}</button></div>`)}
  ${sec('ban', tr('Block', 'Блокировка'), u.banned ? `<p class="muted" style="margin:0 0 10px">${esc(tr('Blocked', 'Заблокирован'))} ${esc(banText(m.bannedUntil))}${m.banReason ? ' · ' + esc(banReasonText(m.banReason)) : ''}${m.ipBanned ? ' · ' + esc(tr('by IP too', 'также по IP')) : ''}</p><button type="button" class="pill pill-white pill-sm" data-ma="unban">${ic('lockOpen')} ${esc(tr('Unblock', 'Разблокировать'))}</button>`
    : `<div class="seg md-days" role="group" aria-label="${esc(tr('Duration', 'Срок'))}">${DAYS.map(d => `<button type="button" data-days="${d}" aria-pressed="${d === 7}">${d ? esc(tr(d + ' d', d + ' дн.')) : '∞'}</button>`).join('')}</div>
    <label class="chk md-ipchk"><input type="checkbox" data-ipban${(m.ips || []).length ? '' : ' disabled'}><span>${esc(tr('Also block the network (IP)', 'Заблокировать и сеть (IP)'))}${(m.ips || []).length ? ` <small class="faint">${esc(m.ips.join(', '))}</small>` : ` <small class="faint">${esc(tr('no addresses yet', 'адресов пока нет'))}</small>`}</span></label>
    <div class="md-row"><button type="button" class="pill pill-danger pill-sm" data-ma="ban">${ic('ban')} ${esc(tr('Block', 'Заблокировать'))}</button></div>`, 'danger')}` : ''}
  ${m.canRole ? sec('shield', tr('Role', 'Роль'), roleBtns()) : ''}
  ${m.canBadges ? sec('star', tr('Badges', 'Значки'), mdBadgesHtml(u, m)) : ''}
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
          if (j.queued) { toast(tr('Sent to the owner for approval', 'Отправлено владельцу на одобрение')); close('ok'); after && after(); return; }
          toast(j.autoBan ? tr('3rd strike: the account is blocked for a day', '3-й страйк: аккаунт заблокирован на сутки') : a === 'warn' ? tr(`Warning sent · strike ${j.strikes} of 3`, `Предупреждение отправлено · страйк ${j.strikes} из 3`) : a === 'delete_account' ? tr('The account was deleted', 'Аккаунт удалён') : tr('Done', 'Готово'));
          close('ok');
          if (a === 'delete_account') { if (/^#\/u\//.test(location.hash)) location.hash = '#/people'; else after && after(); }
          else if ((a === 'rename' || a === 'edit') && body.newLogin && body.newLogin !== u.login && /^#\/u\//.test(location.hash)) location.hash = '#/u/' + body.newLogin; else after && after();
        } catch (ex) { err.textContent = errText(ex); } finally { busyBtn(b, false); }
      });
    }
  });
}
const BADGE_GROUPS = [['personal', ['Personal', 'Именные'], ['wizzy', 'neo', 'lead_dev']], ['premium', ['Premium', 'Premium'], ['premium']], ['trial', ['New shapes (trial)', 'Новые формы (пробные)'], ['t_hex', 't_ribbon', 't_star', 't_glitch', 't_flame', 't_orbit']]];
function badgePreview(id) {
  if (id === 'premium') return premBadgeHtml({ premium: { forever: true } }, true);
  return badgesHtml({ badges: [id], role: 'user' }, true);
}
function mdBadgesHtml(u, m) {
  const ub = Array.isArray(u.badges) ? u.badges : [], excl = m.excl || [], own = !!m.isOwner;
  const has = id => id === 'premium' ? !!m.premForever : ub.includes(id);
  return `${BADGE_GROUPS.map(([k, h, ids]) => `<div class="md-bg"><span class="md-bgh">${esc(tr(...h))}</span><div class="md-row">${ids.map(id => { const lock = excl.includes(id) && !own; return `<label class="chk md-bchk${lock ? ' locked' : ''}"${lock ? ` data-tip="${esc(tr('Exclusive: only the owner can change it', 'Эксклюзивный: менять может только владелец'))}"` : excl.includes(id) ? ` data-tip="${esc(tr('Exclusive badge', 'Эксклюзивный значок'))}"` : ''}><input type="checkbox" data-badge="${id}"${has(id) ? ' checked' : ''}${lock ? ' disabled' : ''}>${badgePreview(id)}${excl.includes(id) ? `<span class="md-ex" aria-label="${esc(tr('exclusive', 'эксклюзивный'))}">${ic('lock')}</span>` : ''}</label>`; }).join('')}</div></div>`).join('')}
  <p class="faint md-bnote">${esc(tr('Premium here means Premium forever. Badges with a lock are exclusive.', 'Premium здесь – это Premium навсегда. Значки с замком – эксклюзивные.'))}</p>
  <div class="md-row"><button type="button" class="pill pill-outline pill-sm" data-ma="badges">${ic('check')} ${esc(tr('Save badges', 'Сохранить значки'))}</button></div>`;
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
  v.innerHTML = `<div class="page adm-page">${pageHead(`${ic('shield')} lynx.`, null, null, tr('Admin panel', 'Админ-панель'))}${pinBarHtml()}<div data-adm>${loadingHtml()}</div></div>`;
  const box = $('[data-adm]', v), tok = renderTok;
  pinGuard(v);
  const X = { stickers: null, logs: null, log: null, logQ: { del: false, user: '' } };
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
    queue: () => data.queue.length ? data.queue.map(a => `<article class="glass adm-card" data-apr="${a.id}">${a.user ? who(a.user) : `<span class="faint">${esc(tr('Deleted account', 'Удалённый аккаунт'))}</span>`}<div class="adm-body"><span class="kicker">${ic(a.kind === 'role' ? 'shield' : 'trash')} ${esc(relTime(a.created))}${a.by ? ` · ${esc(tr('from ', 'от '))}<a href="#/u/${esc(a.by.login)}">@${esc(a.by.login)}</a>` : ''}</span>
      <b>${esc(a.kind === 'role' ? tr('Role: ', 'Роль: ') + tr(...(ROLE_N[a.payload.role] || ROLE_N.user)) : tr('Delete the account', 'Удалить аккаунт'))}</b>${a.payload.reason ? `<p class="adm-text">${esc(a.payload.reason)}</p>` : ''}</div>
      <div class="adm-acts">${data.me.role === 'owner' ? `<button type="button" class="pill pill-white pill-sm" data-apx="1">${ic('check')} ${esc(tr('Approve', 'Одобрить'))}</button><button type="button" class="pill pill-outline pill-sm" data-apx="0">${ic('x')} ${esc(tr('Reject', 'Отклонить'))}</button>` : `<span class="lp">${ic('clock')} ${esc(tr('Waiting for the owner', 'Ждёт владельца'))}</span>`}</div></article>`).join('') : empty('inbox', data.me.role === 'owner' ? tr('Nothing waits for your approval.', 'Ничего не ждёт одобрения.') : tr('You have no requests waiting for the owner.', 'У тебя нет запросов, ждущих владельца.')),
    perms: () => { const P = data.perms || [], st = data.staff.filter(x => x.perms); return st.length ? `<p class="faint adm-hint">${esc(tr('Marked rights work at once. “Directly” lets the person appoint admins and delete accounts without your approval.', 'Отмеченные права работают сразу. «Напрямую» позволяет назначать админов и удалять аккаунты без твоего одобрения.'))}</p>` + st.map(x => `<article class="glass adm-card adm-perm" data-pl="${esc(x.login)}">${who(x)}<div class="adm-body"><div class="pm-grid">${P.map(k => `<label class="chk pm-chk${(data.permDef[x.role] || {})[k] ? ' def' : ''}"><input type="checkbox" data-pk="${k}"${x.perms[k] ? ' checked' : ''}><span>${esc(tr(...(PERM_N[k] || [k, k])))}</span></label>`).join('')}</div>
      <label class="sw-row"><span class="sw"><input type="checkbox" data-pdirect${x.direct ? ' checked' : ''}><i></i></span><span><b>${esc(tr('Directly, without approval', 'Напрямую, без одобрения'))}</b><small>${esc(tr('Roles and account deletion', 'Роли и удаление аккаунтов'))}</small></span></label></div>
      <div class="adm-acts"><span class="lp">${esc(tr(...(ROLE_N[x.role] || ROLE_N.user)))}</span><button type="button" class="pill pill-white pill-sm" data-psave>${ic('save')} ${esc(tr('Save', 'Сохранить'))}</button></div></article>`).join('') : empty('shield', tr('No staff yet besides you.', 'Кроме тебя, в команде пока никого.')); },
    badges: () => `<div class="glass panel adm-bx"><h3 class="grp-title">${ic('lock')} ${esc(tr('Exclusive badges', 'Эксклюзивные значки'))}</h3><p class="faint" style="margin:0;font-size:13px">${esc(tr('Only you can give or remove exclusive badges. Admins and co-owners can manage the others.', 'Эксклюзивные значки можешь выдавать и снимать только ты. Остальными могут управлять админы и совладельцы.'))}</p>
      <div class="bx-grid">${(data.badgeList || []).map(id => `<label class="bx${(data.excl || []).includes(id) ? ' on' : ''}"><input type="checkbox" class="sr-only" data-bx="${id}"${(data.excl || []).includes(id) ? ' checked' : ''}><span class="bx-prev">${badgePreview(id)}</span><span class="bx-st">${ic('lock')}<span>${esc(tr('Exclusive', 'Эксклюзив'))}</span></span></label>`).join('')}</div>
      <div class="row"><button type="button" class="pill pill-white pill-sm" data-bxsave>${ic('save')} ${esc(tr('Save', 'Сохранить'))}</button></div></div>`,
    promo: () => `<div class="glass panel adm-season"><h3 class="grp-title">${ic('crown')} ${esc(tr('Home promotion banner', 'Баннер акции на главной'))}</h3><p class="muted">${esc(tr('This only hides the home page banner. The promotion continues and remains visible on the Premium page.', 'Скрывается только баннер на главной. Акция продолжает действовать и остаётся на странице Premium.'))}</p><button type="button" class="pill pill-white pill-sm" data-promo-toggle>${esc(data.promoVisible ? tr('Hide banner', 'Скрыть баннер') : tr('Show banner', 'Показать баннер'))}</button><p class="faint">${esc(data.promoVisible ? tr('Visible', 'Баннер виден') : tr('Hidden', 'Баннер скрыт'))}</p></div>`,
    season: () => { const se = data.season || { mode: 'auto', ranges: [] }; return `<div class="glass panel adm-season" data-season><h3 class="grp-title">${ic('snow')} ${esc(tr('New Year theme', 'Новогодняя тема'))}<span class="lp ${se.on ? 'ok' : ''}">${esc(se.on ? tr('On now', 'Сейчас включена') : tr('Off now', 'Сейчас выключена'))}</span></h3>
      <p class="faint" style="margin:0;font-size:13px">${esc(tr('A garland on the top bar, a Santa hat on the lynx and soft snow – for everyone at once. Users can hide it in their settings. Dates are in Moscow time.', 'Гирлянда на верхней панели, шапка Санты у рыси и лёгкий снег – сразу у всех. Пользователи могут скрыть её в своих настройках. Даты – по московскому времени.'))}</p>
      <div class="seg" role="radiogroup" aria-label="${esc(tr('Mode', 'Режим'))}">${[['auto', tr('By the calendar', 'По календарю')], ['on', tr('Always on', 'Всегда включена')], ['off', tr('Off', 'Выключена')]].map(([k, l]) => `<button type="button" role="radio" data-smode="${k}" aria-checked="${se.mode === k}" aria-pressed="${se.mode === k}">${esc(l)}</button>`).join('')}</div>
      <div class="sea-ranges" data-sranges>${se.ranges.map(r => seaRange(r)).join('')}</div>
      <div class="row"><button type="button" class="pill pill-glass pill-sm" data-sadd>${ic('plus')} ${esc(tr('Add dates', 'Добавить даты'))}</button><button type="button" class="pill pill-white pill-sm" data-ssave>${ic('save')} ${esc(tr('Save', 'Сохранить'))}</button></div>
      <p class="faint" style="margin:0;font-size:12.5px">${esc(tr('Today in Moscow: ', 'Сегодня в Москве: ') + fmtDate(se.today, true))}</p></div>`; },
    stickers: () => X.stickers ? `${X.stickers.canManage ? `<div class="glass panel stk-up"><h3 class="grp-title">${ic('sticker')} ${esc(tr('New stickers', 'Новые стикеры'))}</h3><p class="faint" style="margin:0;font-size:13px">${esc(tr('PNG with a transparent background, square works best. Big pictures are reduced to 320 px. Everyone can send them in chats.', 'PNG с прозрачным фоном, лучше квадратный. Большие картинки уменьшаются до 320 px. Отправлять их в чатах могут все.'))}</p>
      <label class="stk-drop" data-stkdrop>${ic('upload')}<span>${esc(tr('Choose or drop PNG files', 'Выбери или перетащи PNG-файлы'))}</span><input type="file" accept="image/png" multiple class="sr-only" data-stkfile></label></div>` : ''}
      <div class="stk-admin">${X.stickers.stickers.length ? X.stickers.stickers.map(x => `<figure class="glass stk-it" data-stk="${x.id}"><img src="${esc(x.url)}" alt="${esc(x.name)}" loading="lazy" decoding="async"><figcaption>${X.stickers.canManage ? `<input class="inp" value="${esc(x.name)}" maxlength="32" data-stkname placeholder="${esc(tr('Name', 'Название'))}"><button type="button" class="icon-btn" data-stkdel aria-label="${esc(tr('Delete', 'Удалить'))}" data-tip="${esc(tr('Delete', 'Удалить'))}">${ic('trash')}</button>` : esc(x.name)}</figcaption></figure>`).join('') : empty('sticker', tr('No stickers yet.', 'Стикеров пока нет.'))}</div>` : loadingHtml(),
    logs: () => !X.logs ? loadingHtml() : X.log ? chatLogHtml(X.log, X.logQ) : X.logs.length ? `<p class="faint adm-hint">${esc(tr('The global chat and groups with deleted messages. Private chats are end-to-end encrypted and are not shown.', 'Общий чат и группы вместе с удалёнными сообщениями. Личные чаты защищены сквозным шифрованием и сюда не попадают.'))}</p><div class="cl-list">${X.logs.map(c => `<button type="button" class="glass cl-chat" data-clc="${c.id}"><span class="cl-ic">${ic(c.kind === 'global' ? 'globe' : 'users')}</span><span class="cl-t"><b>${esc(c.kind === 'global' ? tr('Global chat', 'Общий чат') : c.title || tr('Group', 'Группа'))}</b><small>${esc(tr(`${c.total} messages · ${c.members} members`, `${c.total} сообщ. · ${c.members} участн.`))}</small></span>${c.deleted ? `<span class="lp bad">${ic('trash')} ${c.deleted}</span>` : ''}${ic('chev', 'cl-chev')}</button>`).join('')}</div>` : empty('chat', tr('No chats yet.', 'Чатов пока нет.')),
    log: () => data.log.length ? `<ol class="glass adm-log">${data.log.map(l => `<li><span class="lg-t">${esc(relTime(l.created))}</span><span class="lg-x">${l.actor ? `<a href="#/u/${esc(l.actor)}">@${esc(l.actor)}</a>` : '—'} ${esc(tr(...(LOG_N[l.action] || [l.action, l.action])))} ${l.target ? `<a href="#/u/${esc(l.target)}">@${esc(l.target)}</a>` : ''}${l.detail && l.detail.reason ? ` <span class="faint">· ${esc(l.detail.reason)}</span>` : ''}${l.detail && l.detail.title ? ` <span class="faint">· ${esc(l.detail.title)}</span>` : ''}${l.detail && l.detail.days != null ? ` <span class="faint">· ${esc(l.detail.days ? tr(l.detail.days + ' d', l.detail.days + ' дн.') : '∞')}</span>` : ''}</span></li>`).join('')}</ol>` : empty('clipboard', tr('No actions yet.', 'Действий пока нет.'))
  };
  const P0 = () => data.me.perms || {}, own = () => data.me.role === 'owner';
  const TABS = () => [P0().flags && ['flags', 'flag', tr('Filter', 'Фильтр'), data.flags.length], P0().resets && ['resets', 'key', tr('Password resets', 'Сброс пароля'), data.resets.length], ['queue', 'inbox', tr('Approvals', 'Одобрения'), data.queue.length], ['banned', 'ban', tr('Blocked', 'Блокировки'), data.banned.length], P0().announce && ['ann', 'megaphone', tr('Announcements', 'Объявления'), 0], ['staff', 'shield', tr('Staff', 'Команда'), 0], own() && ['perms', 'key', tr('Rights', 'Права'), 0], own() && ['badges', 'star', tr('Badges', 'Значки'), 0], ['stickers', 'sticker', tr('Stickers', 'Стикеры'), 0], P0().chatlogs && ['logs', 'chat', tr('Chat logs', 'Чат-логи'), 0], own() && data.me.login.toLowerCase() === 'wizzy' && ['promo', 'crown', tr('Promotion', 'Акция'), 0], own() && ['season', 'snow', tr('Season', 'Сезон'), 0], ['log', 'clipboard', tr('Log', 'Журнал'), 0]].filter(Boolean);
  const paintPanel = () => {
    const p = $('[data-ap]', box); if (!p) return; p.innerHTML = `<div class="adm-list adm-${tab}">${panels[tab]()}</div>`; initSegs(p);
    if (tab === 'stickers' && !X.stickers) api('stickers').then(j => { X.stickers = j; if (tab === 'stickers') paintPanel(); }).catch(ex => toast(errText(ex)));
    if (tab === 'logs' && !X.logs) api('chatlog').then(j => { X.logs = j.chats; if (tab === 'logs') paintPanel(); }).catch(ex => { if (ex.code !== 'pin_cancel') toast(errText(ex)); });
  };
  const openLog = async (id, more) => {
    const q = { chat: id }; if (X.logQ.del) q.del = '1'; if (X.logQ.user) q.user = X.logQ.user; if (more && X.log) q.before = X.log.messages[X.log.messages.length - 1].id;
    try { const j = await api('chatlog', { q }); X.log = more && X.log ? { ...j, messages: X.log.messages.concat(j.messages) } : j; paintPanel(); } catch (ex) { toast(errText(ex)); }
  };
  const paint = () => {
    if (!TABS().some(x => x[0] === tab)) tab = TABS()[0][0];
    box.innerHTML = `<div class="adm-top"><span class="lp">${ic('people')} ${esc(tr('Users: ', 'Пользователей: '))}${data.users}</span><span class="lp">${ic('crown')} Premium: ${data.premium || 0}</span>${data.ipBans ? `<span class="lp">${ic('ban')} ${esc(tr('IP blocks: ', 'Блокировки IP: '))}${data.ipBans}</span>` : ''}<span class="lp">${ic(data.me.role === 'admin' ? 'shield' : 'crown')} ${esc(tr(...(ROLE_N[data.me.role] || ROLE_N.admin)).replace(/^./, c => c.toUpperCase()))}</span></div>
    <div class="tabs-scroll">${tabsHtml('adm', TABS().map(([id, i, l, n]) => ({ id, html: `${ic(i)}<span>${esc(l)}</span>${n ? `<b class="tab-n">${n}</b>` : ''}` })), tab, tr('Sections', 'Разделы'), 'adm-tabs')}</div>
    <div id="adm-panel" role="tabpanel" data-ap></div>`;
    bindTabs($('.adm-tabs', box), id => { tab = id; const p = new URLSearchParams(); p.set('tab', id); setQuery(p); paintPanel(); });
    paintPanel();
  };
  const load = async () => {
    try { data = await api('admin'); if (tok !== renderTok) return; paint(); }
    catch (e) { if (tok !== renderTok) return; if (e.code === 'pin_cancel') { goHash('#/me'); return; } box.innerHTML = e.code === 'forbidden' ? empty('shield', tr('This page is only for the administration.', 'Эта страница только для администрации.')) : errorCard(e, true); const r = $('[data-retry]', box); r && r.addEventListener('click', () => { box.innerHTML = loadingHtml(); load(); }); }
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
    const apx = e.target.closest('[data-apx]'); if (apx) { const id = +apx.closest('[data-apr]').dataset.apr, ok = apx.dataset.apx === '1'; if (ok && !(await confirmDlg(tr('Approve this request?', 'Одобрить этот запрос?')))) return; return act(apx, () => api('admin', { method: 'POST', body: { op: 'approve', id, ok } }), ok ? tr('Approved', 'Одобрено') : tr('Rejected', 'Отклонено')); }
    const ps = e.target.closest('[data-psave]'); if (ps) { const card = ps.closest('[data-pl]'), perms = {}; $$('[data-pk]', card).forEach(x => { perms[x.dataset.pk] = x.checked; }); return act(ps, () => api('admin', { method: 'POST', body: { op: 'perms', login: card.dataset.pl, perms, direct: $('[data-pdirect]', card).checked } }), tr('Rights saved', 'Права сохранены')); }
    const pt = e.target.closest('[data-promo-toggle]'); if (pt) return act(pt, async () => { await api('admin', { method: 'POST', body: { op: 'promo_visibility', visible: !data.promoVisible } }); promoCache = null; }, tr('Saved', 'Сохранено'));
    const bxl = e.target.closest('.bx'); if (bxl && e.target.matches('input')) bxl.classList.toggle('on', e.target.checked);
    const bxs = e.target.closest('[data-bxsave]'); if (bxs) return act(bxs, () => api('admin', { method: 'POST', body: { op: 'badge_excl', ids: $$('[data-bx]', box).filter(x => x.checked).map(x => x.dataset.bx) } }), tr('Saved', 'Сохранено'));
    if (e.target.closest('[data-sadd]')) { const t0 = new Date().toISOString().slice(0, 10); $('[data-sranges]', box).insertAdjacentHTML('beforeend', seaRange({ from: t0, to: t0 })); return; }
    const srm = e.target.closest('[data-srm]'); if (srm) { srm.closest('.sea-r').remove(); return; }
    const sm = e.target.closest('[data-smode]'); if (sm) { $$('[data-smode]', box).forEach(x => { const on = x === sm; x.setAttribute('aria-checked', on); x.setAttribute('aria-pressed', on); }); return; }
    const ss = e.target.closest('[data-ssave]'); if (ss) { const mode = ($('[data-smode][aria-checked="true"]', box) || {}).dataset?.smode || 'auto', ranges = $$('.sea-r', box).map(r => ({ from: $('[data-sf]', r).value, to: $('[data-st]', r).value })); return act(ss, async () => { const j = await api('admin', { method: 'POST', body: { op: 'season', mode, ranges } }); Season.apply(j.season.on); }, tr('Saved', 'Сохранено')); }
    const sd = e.target.closest('[data-stkdel]'); if (sd) { const id = +sd.closest('[data-stk]').dataset.stk; if (!(await confirmDlg(tr('Delete this sticker?', 'Удалить этот стикер?')))) return; busyBtn(sd, true); try { await api('stickers', { method: 'POST', body: { op: 'del', id } }); X.stickers.stickers = X.stickers.stickers.filter(x => x.id !== id); paintPanel(); toast(tr('Deleted', 'Удалено')); } catch (ex) { toast(errText(ex)); busyBtn(sd, false); } return; }
    const clc = e.target.closest('[data-clc]'); if (clc) { X.logQ = { del: false, user: '' }; return openLog(+clc.dataset.clc); }
    if (e.target.closest('[data-clback]')) { X.log = null; paintPanel(); return; }
    if (e.target.closest('[data-clmore]')) return openLog(X.log.chat.id, true);
    const cld = e.target.closest('[data-cldel]'); if (cld) { X.logQ.del = !X.logQ.del; return openLog(X.log.chat.id); }
    const dm = e.target.closest('[data-demote]'); if (dm) { const l = dm.closest('[data-staff]').dataset.staff; if (!(await confirmDlg(tr(`Remove the ${dm.dataset.role === 'coowner' ? 'co-owner' : 'admin'} role from @${l}?`, `Снять роль ${dm.dataset.role === 'coowner' ? 'совладельца' : 'админа'} с @${l}?`)))) return; return act(dm, () => api('mod', { method: 'POST', body: { login: l, action: 'role', role: 'user' } })); }
  });
  box.addEventListener('change', async e => {
    const sn = e.target.closest('[data-stkname]'); if (sn) { const id = +sn.closest('[data-stk]').dataset.stk; try { await api('stickers', { method: 'POST', body: { op: 'rename', id, name: sn.value.trim() } }); const x = X.stickers.stickers.find(s => s.id === id); if (x) x.name = sn.value.trim(); toast(tr('Saved', 'Сохранено')); } catch (ex) { toast(errText(ex)); } }
    const sf = e.target.closest('[data-stkfile]'); if (sf) { const files = [...sf.files]; sf.value = ''; stkUpload(files); }
  });
  const stkUpload = async files => {
    let n = 0;
    for (const f of files) {
      try { const data = await stickerPng(f); const j = await api('stickers', { method: 'POST', body: { op: 'add', name: f.name.replace(/\.png$/i, '').slice(0, 32), data } }); X.stickers.stickers.push(j.sticker); n++; }
      catch (ex) { toast(`${f.name}: ${errText(ex.code ? ex : { code: 'sticker_bad' })}`); }
    }
    if (n) { toast(tr(`Stickers added: ${n}`, `Добавлено стикеров: ${n}`)); paintPanel(); }
  };
  box.addEventListener('dragover', e => { const d = e.target.closest('[data-stkdrop]'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  box.addEventListener('dragleave', e => { const d = e.target.closest('[data-stkdrop]'); if (d) d.classList.remove('over'); });
  box.addEventListener('drop', e => { const d = e.target.closest('[data-stkdrop]'); if (!d) return; e.preventDefault(); d.classList.remove('over'); stkUpload([...e.dataTransfer.files].filter(f => f.type === 'image/png')); });
  box.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, b = $('button[type=submit]', f), err = $('[data-err]', f); err.textContent = '';
    if (f.matches('[data-annf]')) { const title = f.elements['title'].value.trim(), body = f.elements['body'].value.trim(); if (!title || !body) { err.textContent = errText({ code: 'text_bad' }); return; } busyBtn(b, true); try { await api('admin', { method: 'POST', body: { op: 'announce', title, body } }); toast(tr('Published', 'Опубликовано')); await reload(); } catch (ex) { err.textContent = errText(ex); } finally { if (document.contains(b)) busyBtn(b, false); } }
    if (f.matches('[data-clf]')) { X.logQ.user = f.u.value.trim().replace(/^@/, ''); return openLog(X.log.chat.id); }
    if (f.matches('[data-addf]')) { const l = f.login.value.trim().replace(/^@/, ''); if (!l) return; busyBtn(b, true); try { await api('mod', { method: 'POST', body: { login: l, action: 'role', role: 'admin' } }); toast(tr(`@${l} is an admin now`, `@${l} теперь админ`)); await reload(); } catch (ex) { err.textContent = errText(ex); } finally { if (document.contains(b)) busyBtn(b, false); } }
  });
  load();
  return { title: tr('Admin panel', 'Админ-панель'), nav: 'admin', relang: true, auth: true };
});

const PERM_N = { edit: ['Edit profiles', 'Править профили'], warn: ['Warnings', 'Предупреждения'], ban: ['Blocks', 'Блокировки'], delete: ['Delete accounts', 'Удалять аккаунты'], roles: ['Give roles', 'Выдавать роли'], badges: ['Badges', 'Значки'], flags: ['Word filter', 'Фильтр слов'], resets: ['Password resets', 'Сброс паролей'], announce: ['Announcements', 'Объявления'], msgdel: ['Delete & pin messages', 'Удалять и закреплять сообщения'], chatlogs: ['Chat logs', 'Чат-логи'], stickers: ['Stickers', 'Стикеры'] };
Object.assign(LOG_N, { queue_role: ['asked the owner to change the role of', 'попросил владельца сменить роль'], queue_delete: ['asked the owner to delete', 'попросил владельца удалить'], approve: ['decided on a request about', 'решил запрос по'], perms: ['changed the rights of', 'изменил права'], badge_excl: ['changed the exclusive badges', 'изменил эксклюзивные значки'], season: ['changed the season theme', 'изменил сезонную тему'], sticker_add: ['added a sticker', 'добавил стикер'], sticker_del: ['deleted a sticker', 'удалил стикер'], pin_msg: ['pinned a message of', 'закрепил сообщение'] });
function seaRange(r) { return `<div class="sea-r"><label><span>${esc(tr('From', 'С'))}</span><input class="inp" type="date" data-sf value="${esc(r.from)}"></label><span class="sea-dash" aria-hidden="true">–</span><label><span>${esc(tr('To', 'По'))}</span><input class="inp" type="date" data-st value="${esc(r.to)}"></label><button type="button" class="icon-btn" data-srm aria-label="${esc(tr('Remove', 'Убрать'))}" data-tip="${esc(tr('Remove', 'Убрать'))}">${ic('trash')}</button></div>`; }
function chatLogHtml(L, Q) {
  const ms = L.messages;
  return `<div class="cl-head"><button type="button" class="pill pill-glass pill-sm" data-clback>${ic('back')} ${esc(tr('All chats', 'Все чаты'))}</button><b>${esc(L.chat.kind === 'global' ? tr('Global chat', 'Общий чат') : L.chat.title)}</b>
    <form class="cl-f" data-clf novalidate><input class="inp" name="u" value="${esc(Q.user)}" placeholder="${esc(tr('@login', '@логин'))}" spellcheck="false" autocapitalize="off" maxlength="40"><button class="icon-btn" type="submit" aria-label="${esc(tr('Filter', 'Фильтр'))}">${ic('search')}</button></form>
    <button type="button" class="pill pill-sm ${Q.del ? 'pill-white' : 'pill-outline'}" data-cldel aria-pressed="${Q.del}">${ic('trash')} ${esc(tr('Only deleted', 'Только удалённые'))}</button></div>
  ${ms.length ? `<ol class="glass cl-msgs">${ms.map(m => `<li class="cl-m${m.deleted ? ' del' : ''}${m.pin ? ' pin' : ''}">${m.user ? `<a href="#/u/${esc(m.user.login)}">${avatarHtml(m.user, 28)}</a>` : `<span class="cl-sys">${ic('bell')}</span>`}<div class="cl-mb"><span class="cl-mh">${m.user ? `<a href="#/u/${esc(m.user.login)}"><b>${esc(m.user.nick)}</b></a> <small>@${esc(m.user.login)}</small>` : `<b>${esc(tr('System', 'Система'))}</b>`}<small class="faint">${esc(fmtDate(m.at, true))} ${esc(new Date(m.at).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-GB', { hour: '2-digit', minute: '2-digit' }))}</small>${m.pin ? `<span class="lp">${ic('pin')}</span>` : ''}</span>
    <p>${m.kind === 'sticker' ? `<span class="faint">[${esc(tr('sticker', 'стикер'))}]</span>` : m.kind === 'sys' ? `<span class="faint">[${esc(tr('system message', 'системное сообщение'))}]</span>` : esc(m.body || '')}</p>${m.deleted ? `<small class="cl-delby">${ic('trash')} ${esc(tr('Deleted', 'Удалено'))}${m.delBy ? ` · @${esc(m.delBy)}` : ''}${m.deletedAt ? ' · ' + esc(relTime(m.deletedAt)) : ''}</small>` : ''}</div></li>`).join('')}</ol>${L.more ? `<div class="row" style="justify-content:center"><button type="button" class="pill pill-glass pill-sm" data-clmore>${ic('chev')} ${esc(tr('Older', 'Раньше'))}</button></div>` : ''}` : `<div class="glass empty"><div class="em em-lg">${ic('chat')}</div><p>${esc(tr('No messages.', 'Сообщений нет.'))}</p></div>`}`;
}
/* sticker PNG: keep transparency, reduce to 320 px, must fit the server limit */
function stickerPng(file) {
  return new Promise((res, rej) => {
    if (file.type !== 'image/png' || file.size > 8e6) return rej(new Error('bad'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight; URL.revokeObjectURL(url); if (!W || !H) return rej(new Error('bad'));
      const go = m => { const k = Math.min(1, m / Math.max(W, H)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k)); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/png'); };
      let out = go(320); if (out.length > 410000) out = go(240); if (out.length > 410000) out = go(180);
      out.length <= 410000 ? res(out) : rej(new Error('bad'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad')); };
    img.src = url;
  });
}

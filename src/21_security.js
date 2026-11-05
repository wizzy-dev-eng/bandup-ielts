/* ---------- privacy & security: sessions, two-step verification, who can reach me, encryption ---------- */
function meTabsHtml(cur) {
  const T2 = [['profile', '#/me', 'user', tr('Profile', 'Профиль')], ['security', '#/me/security', 'shieldLock', tr('Privacy & security', 'Приватность и безопасность')]];
  return `<nav class="me-tabs" aria-label="${esc(tr('Settings sections', 'Разделы настроек'))}">${T2.map(([k, h, i, l]) => `<a href="${h}"${k === cur ? ' aria-current="page"' : ''}>${ic(i)}<span>${esc(l)}</span></a>`).join('')}</nav>`;
}
function uaInfo(ua) {
  ua = String(ua || '');
  const os = /iPhone|iPod/.test(ua) ? 'iOS' : /iPad/.test(ua) ? 'iPadOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /YaBrowser/.test(ua) ? 'Yandex Browser' : /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  const dev = /iPad|Tablet/.test(ua) ? 'tablet' : /Mobi|iPhone|Android/.test(ua) ? 'smartphone' : 'monitor';
  return { os, br, dev, name: [br, os].filter(Boolean).join(' · ') || tr('Unknown device', 'Неизвестное устройство') };
}
function codesBlock(codes) {
  return `<div class="rc-box"><ol class="rc-list">${codes.map(c => `<li><code>${esc(c)}</code></li>`).join('')}</ol><div class="row"><button type="button" class="pill pill-glass pill-sm" data-rccopy>${ic('copy')} ${esc(tr('Copy', 'Скопировать'))}</button><button type="button" class="pill pill-glass pill-sm" data-rcdl>${ic('download')} ${esc(tr('Download .txt', 'Скачать .txt'))}</button></div>
  <p class="faint" style="margin:0;font-size:12.5px">${esc(tr('Each code works once. Keep them somewhere safe: they let you in if you lose the phone.', 'Каждый код работает один раз. Сохрани их в надёжном месте: они пустят в аккаунт, если потеряешь телефон.'))}</p></div>`;
}
function bindCodes(root, codes) {
  const txt = `lynx. – ${tr('recovery codes', 'коды восстановления')} (@${Auth.user ? Auth.user.login : ''})\n${new Date().toISOString().slice(0, 10)}\n\n${codes.join('\n')}\n`;
  const c = $('[data-rccopy]', root), d = $('[data-rcdl]', root);
  c && c.addEventListener('click', () => { const ok = () => toast(tr('Codes copied', 'Коды скопированы')); navigator.clipboard ? navigator.clipboard.writeText(codes.join('\n')).then(ok, ok) : ok(); });
  d && d.addEventListener('click', () => { const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = 'lynx-recovery-codes.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); });
}
function tfaEnableDialog(done) {
  openDialog({
    title: tr('Turn on two-step verification', 'Включить двухэтапную проверку'), cls: 'tfa-dlg',
    body: `<div data-step><p class="muted" style="margin-top:0">${esc(tr('Enter your password to start.', 'Введи пароль, чтобы начать.'))}</p><form data-tf novalidate>${fld({ name: 'pw', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}<p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('arrow')} ${esc(tr('Continue', 'Дальше'))}</button></div></form></div>`,
    onOpen: (d, close) => {
      const step = $('[data-step]', d); let f = $('[data-tf]', d); bindFields(f); setTimeout(() => f.pw.focus(), 50);
      f.addEventListener('submit', async e => {
        e.preventDefault(); const b = $('button[type=submit]', f); busyBtn(b, true);
        try {
          const j = await api('security', { method: 'POST', body: { op: 'tfa_begin', password: f.pw.value } });
          const sec = j.secret.replace(/(.{4})/g, '$1 ').trim();
          step.innerHTML = `<ol class="tfa-steps"><li>${esc(tr('Install an authenticator app: Google Authenticator, Microsoft Authenticator, Yandex Key, Aegis or 2FAS.', 'Установи приложение-аутентификатор: Google Authenticator, Microsoft Authenticator, Яндекс Ключ, Aegis или 2FAS.'))}</li><li>${esc(tr('Scan the QR code or enter the key by hand.', 'Отсканируй QR-код или введи ключ вручную.'))}</li><li>${esc(tr('Type the 6-digit code from the app.', 'Введи 6-значный код из приложения.'))}</li></ol>
            <div class="tfa-qr"><div class="qr-wrap">${QR.svg(j.uri, { label: tr('QR code for the authenticator app', 'QR-код для приложения-аутентификатора') })}</div><div class="tfa-key"><small>${esc(tr('Key', 'Ключ'))}</small><code data-sec>${esc(sec)}</code><button type="button" class="pill pill-glass pill-sm" data-seccopy>${ic('copy')} ${esc(tr('Copy', 'Скопировать'))}</button></div></div>
            <form data-tc novalidate>${fld({ name: 'code', label: tr('Code from the app', 'Код из приложения'), icon: 'key', auto: 'one-time-code', ph: '123 456', extra: 'inputmode="numeric" maxlength="7"' })}<p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('shieldCheck')} ${esc(tr('Turn on', 'Включить'))}</button></div></form>`;
          $('[data-seccopy]', step).addEventListener('click', () => { const ok = () => toast(tr('Key copied', 'Ключ скопирован')); navigator.clipboard ? navigator.clipboard.writeText(j.secret).then(ok, ok) : ok(); });
          const tc = $('[data-tc]', step); bindFields(tc); setTimeout(() => tc.code.focus(), 50);
          tc.addEventListener('submit', async e2 => {
            e2.preventDefault(); const b2 = $('button[type=submit]', tc); busyBtn(b2, true);
            try {
              const r = await api('security', { method: 'POST', body: { op: 'tfa_enable', code: tc.code.value.replace(/\s/g, '') } });
              step.innerHTML = `<div class="tfa-ok"><span class="tfa-ic">${ic('shieldCheck')}</span><b>${esc(tr('Two-step verification is on', 'Двухэтапная проверка включена'))}</b><p class="muted">${esc(tr('Save the recovery codes now – they are shown only once.', 'Сохрани коды восстановления сейчас – они показываются один раз.'))}</p></div>${codesBlock(r.codes)}<div class="row" style="justify-content:flex-end"><button type="button" class="pill pill-white" data-close>${ic('check')} ${esc(tr('I saved the codes', 'Я сохранил коды'))}</button></div>`;
              bindCodes(step, r.codes); done && done();
            } catch (ex) { setMsg(tc, 'code', errText(ex)); } finally { busyBtn(b2, false); }
          });
        } catch (ex) { setMsg(f, 'pw', errText(ex)); } finally { busyBtn(b, false); }
      });
    }
  });
}
function tfaCheckDialog(op, done) {
  const off = op === 'tfa_disable';
  openDialog({
    title: off ? tr('Turn off two-step verification', 'Выключить двухэтапную проверку') : tr('New recovery codes', 'Новые коды восстановления'), cls: 'tfa-dlg',
    body: `<div data-step><p class="muted" style="margin-top:0">${esc(off ? tr('Your account will be protected by the password only.', 'Аккаунт будет защищён только паролем.') : tr('The old codes will stop working.', 'Старые коды перестанут работать.'))}</p><form data-tf novalidate>${fld({ name: 'pw', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}${fld({ name: 'code', label: tr('Code from the app or a recovery code', 'Код из приложения или код восстановления'), icon: 'key', auto: 'one-time-code', extra: 'maxlength="12" spellcheck="false" autocapitalize="off"' })}<p class="form-err" data-err role="alert"></p><div class="row"><button class="pill ${off ? 'pill-danger' : 'pill-white'}" type="submit"><span class="spin" aria-hidden="true"></span>${ic(off ? 'x' : 'refresh')} ${esc(off ? tr('Turn off', 'Выключить') : tr('Make new codes', 'Создать новые коды'))}</button></div></form></div>`,
    onOpen: (d, close) => {
      const step = $('[data-step]', d), f = $('[data-tf]', d); bindFields(f); setTimeout(() => f.pw.focus(), 50);
      f.addEventListener('submit', async e => {
        e.preventDefault(); const b = $('button[type=submit]', f); busyBtn(b, true);
        try {
          const r = await api('security', { method: 'POST', body: { op, password: f.pw.value, code: f.code.value.trim() } });
          if (off) { close('ok'); toast(tr('Two-step verification is off', 'Двухэтапная проверка выключена')); }
          else { step.innerHTML = codesBlock(r.codes) + `<div class="row" style="justify-content:flex-end"><button type="button" class="pill pill-white" data-close>${ic('check')} ${esc(tr('Done', 'Готово'))}</button></div>`; bindCodes(step, r.codes); }
          done && done();
        } catch (ex) { setMsg(f, ex.code === 'pw_wrong' ? 'pw' : 'code', errText(ex)); } finally { busyBtn(b, false); }
      });
    }
  });
}
const PRIV_OPTS = {
  dm: [['Who can write to me', 'Кто может мне писать'], [['all', 'Everyone', 'Все'], ['friends', 'Friends', 'Друзья'], ['none', 'Nobody', 'Никто']], 'chat'],
  friends: [['Who can send friend requests', 'Кто может звать в друзья'], [['all', 'Everyone', 'Все'], ['none', 'Nobody', 'Никто']], 'userPlus'],
  groups: [['Who can add me to groups', 'Кто может добавлять в группы'], [['all', 'Everyone', 'Все'], ['friends', 'Friends', 'Друзья'], ['none', 'Nobody', 'Никто']], 'users']
};
route(/^\/me\/security$/, v => {
  if (!Auth.user) { goHash('#/login?next=' + encodeURIComponent('#/me/security')); return { title: t('auth.login') }; }
  const u = Auth.user;
  v.innerHTML = `<div class="page me-page sec-page">${pageHead(`${ic('user')} @${esc(u.login)}`, null, null, tr('Privacy & security', 'Приватность и безопасность'))}${meTabsHtml('security')}${pinBarHtml()}<div data-sx>${loadingHtml()}</div></div>`;
  pinGuard(v);
  const box = $('[data-sx]', v), tok = renderTok; let data = null, hasLocal = false, allSess = false;
  const paint = () => {
    const ss = data.sessions, others = ss.filter(x => !x.current).length, tf = data.tfa, p = data.privacy;
    box.innerHTML = `<div class="grid g2 me-grid">
    <section class="glass panel me-card sx-sess"><h2 class="grp-title">${ic('monitor')} ${esc(tr('Where you are signed in', 'Где выполнен вход'))}</h2>
      <ul class="sess-list">${(allSess || ss.length <= 6 ? ss : ss.slice(0, 5)).map(x => { const i = uaInfo(x.ua); return `<li class="sess${x.current ? ' cur' : ''}"><span class="sess-ic">${ic(i.dev)}</span><div class="sess-t"><b>${esc(i.name)}${x.current ? `<span class="lp sess-me">${esc(tr('This device', 'Это устройство'))}</span>` : ''}</b><small>${esc([x.ip, x.current ? tr('active now', 'активно сейчас') : relTime(x.seen)].filter(Boolean).join(' · '))}</small><small class="faint">${esc(tr('Signed in ', 'Вход: ') + fmtDate(x.created, true))}</small></div>${x.current ? '' : `<button type="button" class="icon-btn" data-revoke="${x.id}" aria-label="${esc(tr('End this session', 'Завершить сеанс'))}" data-tip="${esc(tr('End session', 'Завершить'))}">${ic('logout')}</button>`}</li>`; }).join('')}</ul>
      ${!allSess && ss.length > 6 ? `<button type="button" class="sess-more" data-sessall>${ic('chev')} ${esc(tr(`Show all (${ss.length})`, `Показать все (${ss.length})`))}</button>` : ''}
      ${others ? `<div class="row"><button type="button" class="pill pill-outline pill-sm" data-revall>${ic('logout')} ${esc(tr(`End other sessions (${others})`, `Завершить другие сеансы (${others})`))}</button></div>` : `<p class="faint" style="margin:0;font-size:13px">${esc(tr('No other active sessions.', 'Других активных сеансов нет.'))}</p>`}</section>
    <section class="glass panel me-card sx-tfa"><h2 class="grp-title">${ic('shieldLock')} ${esc(tr('Two-step verification', 'Двухэтапная проверка'))}</h2>
      <div class="sx-state ${tf.on ? 'on' : ''}"><span class="sx-dot"></span><b>${esc(tf.on ? tr('On', 'Включена') : tr('Off', 'Выключена'))}</b></div>
      <p class="muted" style="margin:0">${esc(tf.on ? tr(`After the password we ask for a code from your app. Recovery codes left: ${tf.codes}.`, `После пароля попросим код из приложения. Осталось кодов восстановления: ${tf.codes}.`) : tr('Protect the account with a code from an authenticator app on your phone.', 'Защити аккаунт кодом из приложения-аутентификатора на телефоне.'))}</p>
      <div class="row">${tf.on ? `<button type="button" class="pill pill-glass pill-sm" data-tfcodes>${ic('refresh')} ${esc(tr('New recovery codes', 'Новые коды восстановления'))}</button><button type="button" class="pill pill-outline pill-sm" data-tfoff>${ic('x')} ${esc(tr('Turn off', 'Выключить'))}</button>` : `<button type="button" class="pill pill-white pill-sm" data-tfon>${ic('qr')} ${esc(tr('Turn on', 'Включить'))}</button>`}</div></section>
    ${pinCardHtml(data)}${sqCardHtml(data)}
    <section class="glass panel me-card sx-priv"><h2 class="grp-title">${ic('chat')} ${esc(tr('Chat & communication', 'Чаты и общение'))}</h2>
      ${Object.entries(PRIV_OPTS).map(([k, [lab, opts, icn]]) => `<div class="sx-pr"><span class="sx-pl">${ic(icn)} ${esc(tr(...lab))}</span><div class="seg sx-seg" role="radiogroup" aria-label="${esc(tr(...lab))}">${opts.map(([val, en, ru]) => `<button type="button" role="radio" data-pk="${k}" data-pv="${val}" aria-checked="${p[k] === val}" aria-pressed="${p[k] === val}">${esc(tr(en, ru))}</button>`).join('')}</div></div>`).join('')}
      <p class="faint" style="margin:0;font-size:12.5px">${esc(tr('The administration can always write to you in the global chat.', 'Администрация всегда может ответить тебе в общем чате.'))}</p></section>
    <section class="glass panel me-card sx-e2e"><h2 class="grp-title">${ic('lock')} ${esc(tr('Encryption of private messages', 'Шифрование личных сообщений'))}</h2>
      <div class="sx-state ${data.e2e && hasLocal ? 'on' : ''}"><span class="sx-dot"></span><b>${esc(!E2E.ok ? tr('Not supported by this browser', 'Не поддерживается этим браузером') : !data.e2e ? tr('Not set up yet', 'Ещё не настроено') : hasLocal ? tr('Active on this device', 'Работает на этом устройстве') : tr('Locked on this device', 'Заблокировано на этом устройстве'))}</b></div>
      <p class="muted" style="margin:0">${esc(tr('Private chats are end-to-end encrypted: the key is made in your browser and protected by your password, so nobody else – not even the server – can read them.', 'Личные чаты шифруются сквозным шифрованием: ключ создаётся в браузере и защищён твоим паролем, поэтому их не прочитает никто другой – даже сервер.'))}</p>
      ${E2E.ok && (!data.e2e || !hasLocal) ? `<form class="row sx-unl" data-unl novalidate>${fld({ name: 'pw', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}<button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('lockOpen')} ${esc(data.e2e ? tr('Unlock', 'Разблокировать') : tr('Set up', 'Настроить'))}</button></form>` : ''}
      <p class="faint" style="margin:0;font-size:12.5px"><a href="#/privacy">${esc(tr('How we handle your data', 'Как мы обращаемся с данными'))}</a></p></section></div>`;
    const unl = $('[data-unl]', box); if (unl) bindFields(unl);
    initSegs(box); msAttach($('.me-grid', box));
  };
  const load = async () => {
    try { const [sx, keys] = await Promise.all([api('security'), api('keys')]); const loc = await E2E.local(u.login); data = sx; hasLocal = !!loc && !!keys.pub && loc.pub === keys.pub; if (tok !== renderTok) return; paint(); }
    catch (e) { if (tok !== renderTok) return; if (e.code === 'pin_cancel') { goHash('#/me'); return; } box.innerHTML = errorCard(e, true); const r = $('[data-retry]', box); r && r.addEventListener('click', () => { box.innerHTML = loadingHtml(); load(); }); }
  };
  box.addEventListener('click', async e => {
    const rv = e.target.closest('[data-revoke]'); if (rv) { busyBtn(rv, true); try { await api('security', { method: 'POST', body: { op: 'revoke', id: +rv.dataset.revoke } }); toast(tr('The session was ended', 'Сеанс завершён')); load(); } catch (ex) { toast(errText(ex)); busyBtn(rv, false); } return; }
    if (e.target.closest('[data-sessall]')) { allSess = true; paint(); return; }
    const ra = e.target.closest('[data-revall]'); if (ra) { if (!(await confirmDlg(tr('End all other sessions?', 'Завершить все другие сеансы?')))) return; busyBtn(ra, true); try { const j = await api('security', { method: 'POST', body: { op: 'revoke_others' } }); toast(tr(`Sessions ended: ${j.n}`, `Завершено сеансов: ${j.n}`)); load(); } catch (ex) { toast(errText(ex)); busyBtn(ra, false); } return; }
    if (e.target.closest('[data-tfon]')) return tfaEnableDialog(() => { Auth.setUser({ ...Auth.user, tfa: true }); load(); });
    if (e.target.closest('[data-tfoff]')) return tfaCheckDialog('tfa_disable', () => { Auth.setUser({ ...Auth.user, tfa: false }); load(); });
    if (e.target.closest('[data-tfcodes]')) return tfaCheckDialog('tfa_codes', () => load());
    if (e.target.closest('[data-pinset]')) return pinSetDialog(!!data.pin.on, () => { const had = Auth.user.pin; Auth.setUser({ ...Auth.user, pin: true }); if (!had) render({ instant: true }); else load(); });
    if (e.target.closest('[data-pinrm]')) return pwDialog(tr('Remove the PIN', 'Убрать PIN-код'), tr('The admin panel and these settings will open without the PIN.', 'Админ-панель и эти настройки будут открываться без PIN-кода.'), async pw => { await api('pin', { method: 'POST', body: { op: 'remove', password: pw } }); Auth.setUser({ ...Auth.user, pin: false }); toast(tr('The PIN was removed', 'PIN-код убран')); render({ instant: true }); });
    if (e.target.closest('[data-pinrs]')) return pinResetDialog(() => render({ instant: true }));
    if (e.target.closest('[data-sqset]')) return sqDialog(data.sq, () => load());
    if (e.target.closest('[data-sqoff]')) return pwDialog(tr('Turn off the security question', 'Выключить контрольный вопрос'), tr('The login will need only the password and the 2FA code.', 'Для входа будут нужны только пароль и код 2FA.'), async pw => { await api('security', { method: 'POST', body: { op: 'sq_off', password: pw } }); toast(tr('The security question is off', 'Контрольный вопрос выключен')); load(); });
    const pk = e.target.closest('[data-pk]');
    if (pk && pk.getAttribute('aria-checked') !== 'true') {
      const k = pk.dataset.pk, val = pk.dataset.pv, prev = data.privacy[k];
      data.privacy[k] = val; $$(`[data-pk="${k}"]`, box).forEach(b => { const on = b.dataset.pv === val; b.setAttribute('aria-checked', on); b.setAttribute('aria-pressed', on); });
      try { const j = await api('security', { method: 'POST', body: { op: 'privacy', [k]: val } }); data.privacy = j.privacy; Auth.setUser({ ...Auth.user, privacy: j.privacy }); toast(t('profile.saved')); }
      catch (ex) { data.privacy[k] = prev; paint(); toast(errText(ex)); }
    }
  });
  box.addEventListener('submit', async e => {
    const f = e.target.closest('[data-unl]'); if (!f) return; e.preventDefault(); const b = $('button[type=submit]', f); busyBtn(b, true);
    try { await E2E.unlock(u.login, f.pw.value); toast(tr('Encryption is ready on this device', 'Шифрование готово на этом устройстве')); load(); }
    catch (ex) { setMsg(f, 'pw', errText(ex.code ? ex : { code: 'server' })); } finally { busyBtn(b, false); }
  });
  load();
  return { title: tr('Privacy & security', 'Приватность и безопасность'), nav: 'me', relang: true, auth: true };
});

/* ---------- PIN and the security question (owner) ---------- */
function pinCardHtml(data) {
  if (!Auth.staff || !data.pin) return '';
  const p = data.pin, tf = data.tfa.on, next = p.nextReset && new Date(p.nextReset) > new Date() ? p.nextReset : null;
  return `<section class="glass panel me-card sx-pin"><h2 class="grp-title">${ic('lock')} ${esc(tr('PIN for important sections', 'PIN-код для важных разделов'))}</h2>
    <div class="sx-state ${p.on ? 'on' : ''}"><span class="sx-dot"></span><b>${esc(p.on ? tr('On', 'Включён') : tr('Off', 'Выключен'))}</b></div>
    <p class="muted" style="margin:0">${esc(tr('The PIN is asked before the admin panel and these settings. After it they stay open for 1 minute without activity; the lock button closes them at once.', 'PIN спрашивается перед админ-панелью и этими настройками. После него они открыты 1 минуту без действий; кнопка с замком закрывает их сразу.'))}</p>
    ${!tf && !p.on ? `<p class="faint" style="margin:0;font-size:12.5px">${ic('shieldLock')} ${esc(tr('Turn on two-step verification first – it is needed to reset a forgotten PIN.', 'Сначала включи двухэтапную проверку – она нужна, чтобы сбросить забытый PIN.'))}</p>` : ''}
    <div class="row">${p.on ? `<button type="button" class="pill pill-glass pill-sm" data-pinset>${ic('refresh')} ${esc(tr('Change PIN', 'Сменить PIN'))}</button><button type="button" class="pill pill-outline pill-sm" data-pinrm>${ic('x')} ${esc(tr('Remove', 'Убрать'))}</button>` : `<button type="button" class="pill pill-white pill-sm" data-pinset${tf ? '' : ' disabled'}>${ic('lock')} ${esc(tr('Set a PIN', 'Поставить PIN'))}</button>`}</div>
    ${p.on ? `<p class="faint" style="margin:0;font-size:12.5px">${next ? esc(tr('Next reset with 2FA: ', 'Следующий сброс через 2FA: ') + fmtDate(next, true)) : `<button type="button" class="txt-btn" data-pinrs>${ic('key')} ${esc(tr('Forgot the PIN? Reset with 2FA (once in 30 days)', 'Забыл PIN? Сбросить через 2FA (раз в 30 дней)'))}</button>`}</p>` : ''}</section>`;
}
function sqCardHtml(data) {
  const q = data.sq; if (!q) return '';
  return `<section class="glass panel me-card sx-sq"><h2 class="grp-title">${ic('help')} ${esc(tr('Security question', 'Контрольный вопрос'))}</h2>
    <div class="sx-state ${q.on ? 'on' : ''}"><span class="sx-dot"></span><b>${esc(q.on ? tr('On', 'Включён') : tr('Off', 'Выключен'))}</b></div>
    <p class="muted" style="margin:0">${esc(tr('One more step at login for the owner account: after the password and the 2FA code you answer your own question.', 'Ещё один шаг при входе в аккаунт владельца: после пароля и кода 2FA нужно ответить на свой вопрос.'))}</p>
    ${q.on ? `<p class="sq-q">${ic('help')}<b>${esc(q.text)}</b></p>` : ''}
    <div class="row"><button type="button" class="pill pill-${q.on ? 'glass' : 'white'} pill-sm" data-sqset>${ic(q.on ? 'pen' : 'plus')} ${esc(q.on ? tr('Change', 'Изменить') : tr('Set the question', 'Задать вопрос'))}</button>${q.on ? `<button type="button" class="pill pill-outline pill-sm" data-sqoff>${ic('x')} ${esc(tr('Turn off', 'Выключить'))}</button>` : ''}</div></section>`;
}
function pwDialog(title, text, run) {
  openDialog({
    title, cls: 'tfa-dlg',
    body: `<form data-pwd novalidate><p class="muted" style="margin-top:0">${esc(text)}</p>${fld({ name: 'pw', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}<p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('check')} ${esc(tr('Confirm', 'Подтвердить'))}</button></div></form>`,
    onOpen: (d, close) => {
      const f = $('[data-pwd]', d); bindFields(f); setTimeout(() => f.pw.focus(), 50);
      f.addEventListener('submit', async e => { e.preventDefault(); const b = $('button[type=submit]', f); busyBtn(b, true); try { await run(f.pw.value); close('ok'); } catch (ex) { setMsg(f, 'pw', errText(ex)); } finally { busyBtn(b, false); } });
    }
  });
}
function pinSetDialog(change, done) {
  openDialog({
    title: change ? tr('Change the PIN', 'Сменить PIN-код') : tr('Set a PIN', 'Поставить PIN-код'), cls: 'tfa-dlg',
    body: `<form data-ps novalidate><p class="muted" style="margin-top:0">${esc(tr('4–8 digits. Avoid 1111, 1234 and your birthday.', '4–8 цифр. Не используй 1111, 1234 и дату рождения.'))}</p>
      ${fld({ name: 'pin', label: tr('New PIN', 'Новый PIN'), icon: 'key', type: 'password', auto: 'off', extra: 'inputmode="numeric" maxlength="8"' })}
      ${fld({ name: 'pin2', label: tr('Repeat the PIN', 'Повтори PIN'), icon: 'key', type: 'password', auto: 'off', extra: 'inputmode="numeric" maxlength="8"' })}
      ${fld({ name: 'pw', label: tr('Account password', 'Пароль от аккаунта'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}
      <p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('check')} ${esc(tr('Save', 'Сохранить'))}</button></div></form>`,
    onOpen: (d, close) => {
      const f = $('[data-ps]', d); bindFields(f); setTimeout(() => f.pin.focus(), 50);
      [f.pin, f.pin2].forEach(x => x.addEventListener('input', () => { x.value = x.value.replace(/\D/g, ''); }));
      f.addEventListener('submit', async e => {
        e.preventDefault();
        if (!/^\d{4,8}$/.test(f.pin.value)) { setMsg(f, 'pin', tr('4–8 digits', '4–8 цифр')); return; }
        if (f.pin.value !== f.pin2.value) { setMsg(f, 'pin2', tr('The PINs do not match', 'PIN-коды не совпадают')); return; }
        const b = $('button[type=submit]', f); busyBtn(b, true);
        try { await api('pin', { method: 'POST', body: { op: 'set', pin: f.pin.value, password: f.pw.value } }); PinGate.until = Date.now() + 60000; close('ok'); toast(tr('The PIN is saved', 'PIN-код сохранён')); done && done(); }
        catch (ex) { if (ex.code === 'pin_required' && await pinAsk()) { busyBtn(b, false); f.requestSubmit(); return; } setMsg(f, ex.code === 'pw_wrong' ? 'pw' : 'pin', errText(ex)); } finally { busyBtn(b, false); }
      });
    }
  });
}
function sqDialog(sq, done) {
  openDialog({
    title: tr('Security question', 'Контрольный вопрос'), cls: 'tfa-dlg',
    body: `<form data-sqf novalidate><p class="muted" style="margin-top:0">${esc(tr('Pick a question only you know the answer to. Case, spaces and punctuation in the answer do not matter.', 'Выбери вопрос, ответ на который знаешь только ты. Регистр, пробелы и знаки препинания в ответе не важны.'))}</p>
      ${fld({ name: 'q', label: tr('Question', 'Вопрос'), icon: 'help', value: sq && sq.text || '', max: 120, extra: 'maxlength="120"' })}
      ${fld({ name: 'a', label: tr('Answer', 'Ответ'), icon: 'key', type: 'password', eye: true, auto: 'off', extra: 'maxlength="200"' })}
      ${fld({ name: 'pw', label: tr('Account password', 'Пароль от аккаунта'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}
      <p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('check')} ${esc(tr('Save', 'Сохранить'))}</button></div></form>`,
    onOpen: (d, close) => {
      const f = $('[data-sqf]', d); bindFields(f); setTimeout(() => f.q.focus(), 50);
      f.addEventListener('submit', async e => {
        e.preventDefault(); const b = $('button[type=submit]', f); busyBtn(b, true);
        try { await api('security', { method: 'POST', body: { op: 'sq_set', question: f.q.value.trim(), answer: f.a.value, password: f.pw.value } }); close('ok'); toast(tr('The security question is saved', 'Контрольный вопрос сохранён')); done && done(); }
        catch (ex) { setMsg(f, ex.code === 'pw_wrong' ? 'pw' : ex.code === 'sq_q_bad' ? 'q' : 'a', errText(ex)); } finally { busyBtn(b, false); }
      });
    }
  });
}

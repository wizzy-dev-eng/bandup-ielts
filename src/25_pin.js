/* ---------- PIN lock: the admin panel and the security settings open for 1 minute after the PIN ---------- */
const PIN_ROUTES = ['security', 'admin', 'mod', 'chatlog', 'stickers'];
const PinGate = { until: 0, pending: null, lastTouch: 0 };
const pinOn = () => !!(Auth.user && Auth.user.pin);
function pinMark() { if (pinOn()) PinGate.until = Date.now() + 60000; paintPinBars(); }
function pinAsk() {
  if (PinGate.pending) return PinGate.pending;
  PinGate.pending = new Promise(res => {
    let ok = false;
    openDialog({
      title: tr('Enter the PIN', 'Введи PIN-код'), cls: 'pin-dlg',
      body: `<form data-pinf novalidate class="pin-form"><span class="pin-ic" aria-hidden="true">${ic('shieldLock')}</span>
        <p class="muted">${esc(tr('This section is protected. After the PIN it stays open for 1 minute without activity.', 'Этот раздел защищён. После PIN-кода он открыт 1 минуту без действий.'))}</p>
        <label class="pin-field"><span class="sr-only">PIN</span><input class="pin-inp" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" pattern="[0-9]*" placeholder="••••" aria-label="PIN"></label>
        <p class="form-err" data-err role="alert"></p>
        <button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('lockOpen')} ${esc(tr('Unlock', 'Открыть'))}</button>
        <button type="button" class="txt-btn pin-forgot" data-pinreset>${ic('key')} ${esc(tr('Forgot the PIN?', 'Забыл PIN-код?'))}</button></form>`,
      onOpen: (d, close) => {
        const f = $('[data-pinf]', d), inp = f.pin, err = $('[data-err]', f);
        setTimeout(() => inp.focus(), 60);
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 8); err.textContent = ''; });
        f.addEventListener('submit', async e => {
          e.preventDefault(); if (inp.value.length < 4) { err.textContent = tr('4–8 digits', '4–8 цифр'); return; }
          const b = $('button[type=submit]', f); busyBtn(b, true);
          try { await api('pin', { method: 'POST', body: { op: 'unlock', pin: inp.value } }); ok = true; PinGate.until = Date.now() + 60000; PinGate.lastTouch = Date.now(); close('ok'); }
          catch (ex) { err.textContent = errText(ex); inp.value = ''; inp.focus(); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
          finally { busyBtn(b, false); }
        });
        $('[data-pinreset]', d).addEventListener('click', () => { close(''); pinResetDialog(); });
      },
      onClose: () => { res(ok); if (ok) paintPinBars(); }
    });
  }).finally(() => { PinGate.pending = null; });
  return PinGate.pending;
}
function pinResetDialog(done) {
  openDialog({
    title: tr('Reset the PIN', 'Сбросить PIN-код'), cls: 'tfa-dlg',
    body: `<form data-pr novalidate><p class="muted" style="margin-top:0">${esc(tr('The PIN can be reset once in 30 days with the password and a two-step verification code.', 'PIN можно сбросить раз в 30 дней – паролем и кодом двухэтапной проверки.'))}</p>
      ${fld({ name: 'pw', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}
      ${fld({ name: 'code', label: tr('Code from the app or a recovery code', 'Код из приложения или код восстановления'), icon: 'key', auto: 'one-time-code', ph: '123 456', extra: 'maxlength="12"' })}
      <p class="form-err" data-err role="alert"></p><div class="row"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('refresh')} ${esc(tr('Reset', 'Сбросить'))}</button></div></form>`,
    onOpen: (d, close) => {
      const f = $('[data-pr]', d); bindFields(f); setTimeout(() => f.pw.focus(), 50);
      f.addEventListener('submit', async e => {
        e.preventDefault(); const b = $('button[type=submit]', f); busyBtn(b, true);
        try { await api('pin', { method: 'POST', body: { op: 'reset', password: f.pw.value, code: f.code.value.replace(/\s/g, '') } }); Auth.setUser({ ...Auth.user, pin: false }); close('ok'); toast(tr('The PIN was removed. You can set a new one.', 'PIN-код снят. Можно задать новый.')); done && done(); }
        catch (ex) { setMsg(f, ex.code === 'pw_wrong' ? 'pw' : 'code', errText(ex)); } finally { busyBtn(b, false); }
      });
    }
  });
}
/* the bar with the countdown and the lock button on protected pages */
function pinBarHtml() { return pinOn() ? `<div class="pin-bar" data-pinbar><span class="pin-st">${ic('lockOpen')}<span data-pinleft>${esc(tr('Unlocked', 'Открыто'))}</span></span><button type="button" class="pill pill-glass pill-sm" data-pinlock>${ic('lock')} ${esc(tr('Lock', 'Закрыть'))}</button></div>` : ''; }
function paintPinBars() {
  const left = Math.max(0, Math.ceil((PinGate.until - Date.now()) / 1000));
  $$('[data-pinleft]').forEach(el => { el.textContent = PinGate.until ? tr('Unlocked · ', 'Открыто · ') + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : tr('Locked', 'Закрыто'); el.closest('.pin-bar').classList.toggle('low', !!PinGate.until && left <= 15); });
}
async function pinLock(auto) {
  PinGate.until = 0;
  try { await api('pin', { method: 'POST', body: { op: 'lock' } }); } catch (e) { }
  toast(auto ? tr('The section was locked after a minute without activity', 'Раздел закрыт после минуты без действий') : tr('The section is locked', 'Раздел закрыт'));
  if (/^#\/(admin|me\/security)/.test(location.hash)) location.hash = '#/me';
}
function pinGuard(root) {
  if (!pinOn()) return;
  const tick = setInterval(() => { paintPinBars(); if (PinGate.until && Date.now() > PinGate.until) { clearInterval(tick); pinLock(true); } }, 1000);
  const act = () => { if (!PinGate.until || Date.now() - PinGate.lastTouch < 15000) return; PinGate.lastTouch = Date.now(); api('pin', { method: 'POST', body: { op: 'touch' } }).then(j => { if (j.open) pinMark(); }).catch(() => { }); };
  const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  evs.forEach(n => addEventListener(n, act, { passive: true }));
  const lk = e => { if (e.target.closest('[data-pinlock]')) { e.preventDefault(); clearInterval(tick); pinLock(false); } };
  root.addEventListener('click', lk);
  onCleanup(() => { clearInterval(tick); evs.forEach(n => removeEventListener(n, act)); });
  paintPinBars();
}

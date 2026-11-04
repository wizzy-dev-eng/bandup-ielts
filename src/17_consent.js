/* ---------- cookie consent: accounts need one session cookie ---------- */
const CONSENT_KEY = 'lynx.consent';
const consentVal = () => { const c = store.get(CONSENT_KEY, null); return c && (c.v === 'yes' || c.v === 'no') ? c.v : null; };
const consentOk = () => consentVal() !== 'no';
function setConsent(v) { store.set(CONSENT_KEY, { v, ts: Date.now() }); hideConsent(); emit('consent', v); $$('[data-auth]').forEach(f => consentGate(f)); }
function hideConsent() { const b = $('#consent'); if (!b) return; if (reduced()) return b.remove(); b.classList.add('out'); setTimeout(() => b.remove(), 260); }
function showConsent(force) {
  if ($('#consent') || (!force && consentVal())) return;
  const el = document.createElement('section'); el.id = 'consent'; el.className = 'consent glass'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'consentT');
  el.innerHTML = `<span class="cs-ic">${ic('cookie')}</span><div class="cs-t"><b id="consentT">${esc(tr('Cookies on lynx.', 'Cookie на lynx.'))}</b><p>${esc(tr('We use one cookie to keep you signed in and the browser storage to save your progress and settings. No ads, no trackers.', 'Мы используем один cookie, чтобы ты оставался в аккаунте, и хранилище браузера для прогресса и настроек. Без рекламы и трекеров.'))}</p></div>
  <div class="cs-a"><button type="button" class="pill pill-outline pill-sm" data-cs="no">${esc(tr('Decline', 'Отклонить'))}</button><button type="button" class="pill pill-white pill-sm" data-cs="yes">${ic('check')} ${esc(tr('Accept', 'Принять'))}</button></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { const b = e.target.closest('[data-cs]'); if (b) { setConsent(b.dataset.cs); toast(b.dataset.cs === 'yes' ? tr('Cookies allowed', 'Cookie разрешены') : tr('Cookies declined', 'Cookie отклонены')); } });
  if (force) setTimeout(() => $('[data-cs="yes"]', el).focus(), 50);
}
/* login and sign-up need the session cookie: show a note with an "Allow" button when it was declined */
function consentGate(form, flash) {
  if (!form) return; let n = $('.cs-gate', form);
  if (consentOk()) { if (n) n.remove(); $$('.auth-submit', form).forEach(b => { b.disabled = false; }); return; }
  if (!n) {
    n = document.createElement('div'); n.className = 'cs-gate'; n.setAttribute('role', 'note');
    n.innerHTML = `<span class="cs-ic">${ic('cookie')}</span><p>${esc(tr('You declined cookies. Accounts need one cookie to keep you signed in, so logging in is off for now.', 'Ты отклонил cookie. Аккаунту нужен один cookie, чтобы оставаться в системе, поэтому вход пока отключён.'))}</p><button type="button" class="pill pill-white pill-sm" data-cs-allow>${ic('check')} ${esc(tr('Allow', 'Разрешить'))}</button>`;
    const sub = $('.auth-submit', form); (sub || form.lastChild).insertAdjacentElement('beforebegin', n);
    $('[data-cs-allow]', n).addEventListener('click', () => { setConsent('yes'); toast(tr('Cookies allowed', 'Cookie разрешены')); });
  }
  $$('.auth-submit', form).forEach(b => { b.disabled = true; });
  if (flash) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); }
}
document.addEventListener('click', e => { if (e.target.closest('[data-cookies]')) { e.preventDefault(); const b = $('#consent'); if (b) b.remove(); showConsent(true); } });
on('lang', () => { if ($('#consent')) { $('#consent').remove(); showConsent(true); } });
setTimeout(() => showConsent(false), 1200);

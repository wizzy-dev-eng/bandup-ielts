/* ---------- lynx. ui layer: brand, extra icons, settings, liquid indicators ---------- */
D.meta.brand = 'lynx.';
Object.assign(ICONS, {
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/>',
  weight: '<path d="M6 12h8a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6.5a4 4 0 0 1 0 8"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>',
  palette: '<circle cx="12" cy="12" r="9.5"/><path d="M12 2.5a9.5 9.5 0 0 0 0 19c1.4 0 2-.9 2-1.8 0-1.4-1.4-1.6-1.4-3 0-1 .8-1.7 1.8-1.7H17a4.5 4.5 0 0 0 4.5-4.5c0-4.4-4.3-8-9.5-8z"/><path d="M7.5 11h.01M10 7h.01M15 7.5h.01"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>'
});
ICONS.check = '<path pathLength="1" d="M5 12.5l4.5 4.5L19 7"/>';
ICONS.x = '<path pathLength="1" d="M6 6l12 12"/><path pathLength="1" d="M18 6 6 18"/>';
const LOGO_PATH = 'M4.2 19 5.6 11.8 7.6 3 13 8.9Q16 8 19 8.9L24.4 3 26.4 11.8 27.8 19 30.4 23.4 25 25.6 16 30.6 7 25.6 1.6 23.4Z M8.6 7.4 8 11.4 11 9.4Z M23.4 7.4 24 11.4 21 9.4Z M9.4 17.3Q11.9 15 14.2 17.7 11.7 18.9 9.4 17.3Z M22.6 17.3Q20.1 15 17.8 17.7 20.3 18.9 22.6 17.3Z M14.5 21.5H17.5L16 23.3Z';
let logoN = 0;
function logoSvg(size = 26) { const id = 'lg' + (++logoN); return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--pink)"/><stop offset="1" style="stop-color:var(--lilac)"/></linearGradient></defs><path fill="url(#${id})" fill-rule="evenodd" d="${LOGO_PATH}"/><path d="M7.6 3 7.1.4M24.4 3 24.9.4" stroke="url(#${id})" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>`; }
const NY_HAT = '<svg class="ny-hat" viewBox="0 0 40 30" aria-hidden="true"><path class="h-red" d="M4 24C8 12 16 4 27 3c5 0 8 3 9 8-4-3-8-3-11 0-3 4-4 9-5 13z"/><path class="h-shade" d="M25 3c5 0 8 3 9 8-3-2-6-2-8-1 0-3 0-5-1-7z"/><rect class="h-fur" x="1" y="21" width="23" height="7" rx="3.5"/><circle class="h-pom" cx="35.5" cy="13" r="3.6"/></svg>';
const brandHtml = () => `<span class="logo-wrap">${logoSvg()}${NY_HAT}</span><span class="bname">lynx<b>.</b></span>`;

/* ---------- extra UI strings ---------- */
Object.assign(D.i18n.en, {
  'set.surface': 'Interface style', 'set.glass': 'Glass', 'set.satin': 'Satin', 'set.solid': 'Solid', 'set.outline': 'Outline', 'set.season': 'New Year theme', 'set.seasonHint': 'Garland, a Santa hat on the lynx and light snow.', 'set.title': 'Settings', 'set.theme': 'Theme', 'set.dark': 'Dark', 'set.light': 'Light', 'set.eco': 'Power saving', 'set.ecoHint': 'Stops animations and heavy glass effects so the site runs faster on weak devices.',
  'set.fs': 'Text size', 'set.fw': 'Text weight', 'set.fwLight': 'Light', 'set.fwNormal': 'Regular', 'set.fwBold': 'Bold', 'set.lang': 'Language', 'set.reset': 'Reset settings', 'set.preview': 'The quick brown lynx jumps over the lazy dog.',
  'search.ph': 'Search sections, settings and people', 'search.people': 'Search in people', 'search.sections': 'Sections', 'search.settings': 'Settings', 'search.tasks': 'Tasks',
  'auth.signup': 'Sign up', 'auth.login': 'Log in', 'auth.logout': 'Log out', 'auth.myProfile': 'My profile'
});
Object.assign(D.i18n.ru, {
  'set.surface': 'Стиль интерфейса', 'set.glass': 'Стекло', 'set.satin': 'Сатин', 'set.solid': 'Плотный', 'set.outline': 'Контур', 'set.season': 'Новогодняя тема', 'set.seasonHint': 'Гирлянда, шапка Санты у рыси и лёгкий снег.', 'set.title': 'Настройки', 'set.theme': 'Тема', 'set.dark': 'Тёмная', 'set.light': 'Светлая', 'set.eco': 'Энергосбережение', 'set.ecoHint': 'Отключает анимации и тяжёлые стеклянные эффекты, чтобы сайт быстрее работал на слабых устройствах.',
  'set.fs': 'Размер текста', 'set.fw': 'Толщина текста', 'set.fwLight': 'Тонкий', 'set.fwNormal': 'Обычный', 'set.fwBold': 'Жирный', 'set.lang': 'Язык', 'set.reset': 'Сбросить настройки', 'set.preview': 'Съешь же ещё этих мягких французских булок, да выпей чаю.',
  'search.ph': 'Поиск разделов, настроек и людей', 'search.people': 'Искать среди людей', 'search.sections': 'Разделы', 'search.settings': 'Настройки', 'search.tasks': 'Задания',
  'auth.signup': 'Регистрация', 'auth.login': 'Войти', 'auth.logout': 'Выйти', 'auth.myProfile': 'Мой профиль'
});

/* ---------- settings ---------- */
const SET_KEY = 'lynx.settings';
const FS = { s: .9, m: 1, l: 1.12, xl: 1.25 }, FW = { light: -100, normal: 0, bold: 100 };
const Settings = {
  v: Object.assign({ theme: null, eco: false, fs: 'm', fw: 'normal', surface: 'glass' }, store.get(SET_KEY, {})),
  get(k) { return this.v[k]; },
  set(k, val) { this.v[k] = val; store.set(SET_KEY, this.v); applySettings(); emit('settings', { k, val }); },
  reset() { this.v = { theme: this.v.theme, eco: false, fs: 'm', fw: 'normal', surface: 'glass' }; store.set(SET_KEY, this.v); applySettings(); emit('settings', {}); }
};
(() => { const old = store.get('bandup.theme', null); if (!Settings.v.theme && (old === 'light' || old === 'dark')) Settings.v.theme = old; })();
const curTheme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
const ecoOn = () => !!Settings.v.eco;
const fxOff = () => ecoOn() || reduced();
function applySettings() {
  const r = document.documentElement, v = Settings.v;
  const th = v.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const changed = r.dataset.theme !== th;
  r.dataset.theme = th;
  r.dataset.surface = ['glass', 'satin', 'solid', 'outline'].includes(v.surface) ? v.surface : 'glass';
  const m = $('meta[name=theme-color]'); if (m) m.content = th === 'light' ? '#F6F5FB' : '#05050A';
  const cs = $('meta[name=color-scheme]'); if (cs) cs.content = th;
  r.style.setProperty('--fs', FS[v.fs] || 1); r.style.setProperty('--fw', FW[v.fw] || 0);
  r.toggleAttribute('data-eco', !!v.eco);
  if (changed) emit('theme', th);
}
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (!Settings.v.theme) applySettings(); }); } catch (e) { }

/* ---------- liquid glass indicator ---------- */
function liquidTo(ind, x1, w1, instant) {
  const x0 = parseFloat(ind.style.left), w0 = parseFloat(ind.style.width);
  ind.style.left = x1 + 'px'; ind.style.width = w1 + 'px';
  if (instant || !(w0 > 0) || fxOff() || !ind.animate) return;
  if (Math.abs(x1 - x0) < 1 && Math.abs(w1 - w0) < 1) return;
  ind.getAnimations().forEach(a => a.cancel());
  const R0 = x0 + w0, R1 = x1 + w1, dir = x1 > x0 ? 1 : -1, far = Math.min(1, Math.abs(x1 - x0) / 240);
  const lead = dir > 0 ? { l: x0 + (x1 - x0) * .18, r: R0 + (R1 - R0) * .92 } : { l: x0 + (x1 - x0) * .92, r: R0 + (R1 - R0) * .18 };
  const over = 5 * dir * (.4 + far * .6);
  ind.animate([
    { left: x0 + 'px', width: w0 + 'px', transform: 'scale(1,1)' },
    { left: lead.l + 'px', width: (lead.r - lead.l) + 'px', transform: `scale(1,${(1 - .16 * far).toFixed(3)})`, offset: .42 },
    { left: (x1 + over * .4) + 'px', width: (w1 + Math.abs(over) * .6) + 'px', transform: 'scale(1,.96)', offset: .74 },
    { left: x1 + 'px', width: w1 + 'px', transform: 'scale(1,1)' }
  ], { duration: 520 + far * 160, easing: 'cubic-bezier(.33,.9,.35,1)' });
}
/* segmented controls (.seg) get a sliding glass pill */
function syncSeg(seg, instant) {
  let ind = seg.querySelector(':scope>.seg-ind');
  if (!ind) { ind = document.createElement('i'); ind.className = 'seg-ind'; ind.setAttribute('aria-hidden', 'true'); seg.prepend(ind); seg.dataset.li = '1'; }
  const a = seg.querySelector(':scope>button[aria-pressed="true"]');
  if (!a || !a.offsetWidth) { ind.style.opacity = a ? '' : '0'; if (!a) return; return; }
  ind.style.opacity = '1';
  liquidTo(ind, a.offsetLeft, a.offsetWidth, instant || seg.dataset.li !== '2');
  seg.dataset.li = '2';
}
const segRO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => syncSeg(e.target, true))) : null;
function initSegs(root = document) { $$('.seg', root).forEach(s => { if (!s.dataset.li) { syncSeg(s, true); segRO && segRO.observe(s); } }); }
let segScan = 0;
new MutationObserver(ms => {
  for (const m of ms) {
    if (m.type === 'attributes') { const s = m.target.parentElement; if (s && s.classList.contains('seg')) syncSeg(s, false); }
    else if (m.addedNodes.length && !segScan) segScan = requestAnimationFrame(() => { segScan = 0; initSegs(); });
  }
}).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed'] });

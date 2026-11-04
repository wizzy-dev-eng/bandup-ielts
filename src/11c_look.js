/* ---------- profile look: banners, frames, badges, socials, achievements ---------- */
const BANNER_P = ['aurora', 'sunset', 'ocean', 'nebula', 'mint', 'ember', 'mono'], FRAME_P = ['glow', 'gold', 'aurora', 'ice', 'neon'];
const BANNER_N = { aurora: ['Aurora', 'Сияние'], sunset: ['Sunset', 'Закат'], ocean: ['Ocean', 'Океан'], nebula: ['Nebula', 'Туманность'], mint: ['Mint', 'Мята'], ember: ['Ember', 'Угли'], mono: ['Graphite', 'Графит'] };
const FRAME_N = { glow: ['Glow', 'Свечение'], gold: ['Gold', 'Золото'], aurora: ['Aurora', 'Сияние'], ice: ['Ice', 'Лёд'], neon: ['Neon', 'Неон'] };
const BANNER_X = ['galaxy', 'holo'], FRAME_X = ['cosmic', 'prism'];
Object.assign(BANNER_N, { galaxy: ['Galaxy', 'Галактика'], holo: ['Hologram', 'Голограмма'] });
Object.assign(FRAME_N, { cosmic: ['Cosmic', 'Космос'], prism: ['Prism', 'Призма'] });
const isStaffU = u => !!u && ['admin', 'coowner', 'owner'].includes(u.role);
function coverHtml(b) {
  if (b && /^p:/.test(b) && BANNER_X.includes(b.slice(2))) return `<div class="prof-cover bn bn-${b.slice(2)} bn-x" aria-hidden="true"><i></i><i></i><i></i><s></s></div>`;
  if (b && /^p:/.test(b) && BANNER_P.includes(b.slice(2))) return `<div class="prof-cover bn bn-${b.slice(2)}" aria-hidden="true"><i></i><i></i><i></i></div>`;
  if (b && (/^data:image\/(jpeg|webp|gif);base64,/.test(b) || /^\/api\/app\?r=img&/.test(b))) return `<div class="prof-cover bn-img" aria-hidden="true"><img src="${esc(b)}" alt="" decoding="async"></div>`;
  return `<div class="prof-cover" aria-hidden="true"><i></i><i></i><i></i></div>`;
}
const lynxMark = () => `<svg class="ic bdg-lynx" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`;
const BADGE_DEF = {
  wizzy: () => ['wizzy', tr('Creator of lynx.', 'Создатель lynx.')],
  neo: () => ['neo', tr('Co-creator of lynx.', 'Сооснователь lynx.')],
  lead_dev: () => ['Lead Developer', tr('Lead developer of the site', 'Ведущий разработчик сайта')]
};
/* owner / co-owner can rename their named badges: u.bt = { id: { n, d } } */
const badgeText = (u, id) => { const d = BADGE_DEF[id](), x = u && u.bt && u.bt[id]; return [x && x.n ? x.n : d[0], x && x.d ? x.d : d[1]]; };
function premBadgeHtml(u, small) {
  const p = u && u.premium; if (!p) return '';
  const tip = p.forever ? (p.no ? tr(`Premium forever · one of the first 100 · №${p.no}`, `Premium навсегда · один из первых 100 · №${p.no}`) : tr('Premium forever', 'Premium навсегда')) : tr('Premium until ', 'Premium до ') + fmtDate(p.until, true);
  return `<span class="bdg bdg-prem${small ? ' sm' : ''}" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc('Premium – ' + tip)}">${ic('crown')}${p.forever ? `<span class="pm-inf" aria-hidden="true">∞</span>` : ''}<span>${p.no ? esc(String(p.no)) : 'Premium'}</span></span>`;
}
function badgesHtml(u, small) {
  const b = Array.isArray(u.badges) ? u.badges : [], out = [];
  const tag = (cls, icon, label, tip) => `<span class="bdg ${cls}${small ? ' sm' : ''}" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(label + ' – ' + tip)}">${icon}<span>${esc(label)}</span></span>`;
  if (b.includes('wizzy')) out.push(tag('bdg-wizzy', lynxMark(), ...badgeText(u, 'wizzy')));
  if (b.includes('neo')) out.push(tag('bdg-neo', lynxMark(), ...badgeText(u, 'neo')));
  if (b.includes('lead_dev')) out.push(tag('bdg-dev', ic('code'), ...badgeText(u, 'lead_dev')));
  if (u.role === 'owner' && !b.includes('wizzy')) out.push(tag('bdg-owner', ic('crown'), tr('Owner', 'Владелец'), tr('Owner of the site', 'Владелец сайта')));
  if (u.role === 'coowner' && !b.includes('neo')) out.push(tag('bdg-co', ic('crown'), tr('Co-owner', 'Совладелец'), tr('Co-owner of the site', 'Совладелец сайта')));
  if (u.premium) out.push(premBadgeHtml(u, small));
  if (u.role === 'admin') out.push(tag('bdg-admin', ic('shield'), tr('Admin', 'Админ'), tr('Administrator: keeps the community safe', 'Администратор: следит за порядком')));
  if (u.banned) out.push(tag('bdg-ban', ic('ban'), tr('Blocked', 'Заблокирован'), tr('This account is blocked', 'Этот аккаунт заблокирован')));
  return out.join('');
}
const SOC = [['discord', 'Discord'], ['github', 'GitHub'], ['telegram', 'Telegram'], ['tiktok', 'TikTok']];
function socialUrl(k, v) {
  if (k === 'discord') return /^\d{17,20}$/.test(v) ? 'https://discord.com/users/' + v : null;
  return { github: 'https://github.com/', telegram: 'https://t.me/', tiktok: 'https://www.tiktok.com/@' }[k] + v;
}
function socialsHtml(s) {
  const list = SOC.filter(([k]) => s && s[k]); if (!list.length) return '';
  return `<div class="socials" aria-label="${esc(tr('Social links', 'Соцсети'))}">${list.map(([k, n]) => {
    const v = s[k], url = socialUrl(k, v), shown = k === 'discord' ? (url ? 'Discord' : v) : k === 'github' ? v : '@' + v;
    const inner = `<span class="soc-ic">${ic(k)}</span><span class="soc-t">${esc(shown)}</span>`;
    return url ? `<a class="soc soc-${k}" href="${esc(url)}" target="_blank" rel="noopener noreferrer me" aria-label="${esc(n + ': ' + shown)}">${inner}${ic('external', 'soc-x')}</a>`
      : `<button type="button" class="soc soc-${k}" data-copytxt="${esc(v)}" aria-label="${esc(n + ': ' + v + ' – ' + tr('copy', 'скопировать'))}">${inner}${ic('copy', 'soc-x')}</button>`;
  }).join('')}</div>`;
}
function parseSocial(k, raw) {
  let v = String(raw || '').trim(); if (!v) return '';
  const re = { discord: /discord(?:app)?\.com\/users\/(\d{17,20})/i, github: /github\.com\/([A-Za-z0-9-]+)/i, telegram: /(?:t|telegram)\.me\/([A-Za-z0-9_]+)/i, tiktok: /tiktok\.com\/@?([A-Za-z0-9_.]+)/i }[k];
  const m = re && v.match(re); if (m) v = m[1];
  v = v.replace(/^@/, '').replace(/\/+$/, '');
  return k === 'discord' ? v.toLowerCase() : v;
}
function achievementsHtml() {
  const A = [['trophy', 'First result', 'Первый результат'], ['fire', '7 days in a row', '7 дней подряд'], ['target', 'Band 7 estimate', 'Оценка 7.0'], ['layers', 'Set author', 'Автор набора'], ['headphones', 'All Listening tasks', 'Все задания Listening'], ['compass', 'Full mock test', 'Полный пробный тест']];
  return `<section class="sec ach-sec"><div class="sec-head"><span class="glass-pill">${ic('trophy')} ${esc(tr('Achievements', 'Достижения'))}<span class="soon">${esc(tr('Soon', 'Скоро'))}</span></span><p class="muted">${esc(tr('Badges for streaks, scores and your own sets are on the way.', 'Скоро здесь появятся награды за серии, баллы и собственные наборы.'))}</p></div>
  <div class="ach-grid">${A.map(([i, en, ru], n) => `<div class="glass ach" style="--i:${n}" aria-disabled="true"><span class="ach-ic">${ic(i)}<i class="ach-lock">${ic('lock')}</i></span><b>${esc(tr(en, ru))}</b><small>${esc(tr('Locked', 'Закрыто'))}</small></div>`).join('')}</div></section>`;
}
/* banner upload: crop to 3:1, 1200×400 JPEG, smaller if the data URL is too long */
function bannerJpeg(file) {
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type) || file.size > 20e6) return rej(new Error('bad'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight; if (!W || !H) { URL.revokeObjectURL(url); return rej(new Error('bad')); }
      let sw = W, sh = W / 3; if (sh > H) { sh = H; sw = H * 3; }
      const draw = (w, q) => { const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w / 3); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#110f18'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); };
      let out = draw(1200, .82);
      for (const [w, q] of [[1200, .7], [1000, .7], [900, .62], [800, .55]]) { if (out.length <= 450000) break; out = draw(w, q); }
      URL.revokeObjectURL(url); out.length <= 460000 ? res(out) : rej(new Error('bad'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad')); };
    img.src = url;
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copytxt]'); if (!b) return;
  const v = b.dataset.copytxt; const ok = () => toast(tr(`Copied: ${v}`, `Скопировано: ${v}`));
  if (navigator.clipboard) navigator.clipboard.writeText(v).then(ok, ok); else ok();
});
/* owner / co-owner: rename the named badges they have */
function badgeEditorHtml(u) {
  if (!(u.role === 'owner' || u.role === 'coowner')) return '';
  const mine = (u.badges || []).filter(b => BADGE_DEF[b]); if (!mine.length) return '';
  return `<section class="glass panel me-card me-bt" data-bted><h2 class="grp-title">${ic('star')} ${esc(tr('My badges', 'Мои значки'))}</h2><p class="faint" style="margin:0;font-size:13px">${esc(tr('Change the name and the tooltip of your badges. Leave the fields empty to use the default text.', 'Поменяй название и подсказку своих значков. Оставь поля пустыми, чтобы вернуть обычный текст.'))}</p>
  ${mine.map(b => { const d = BADGE_DEF[b](), x = (u.bt && u.bt[b]) || {}; return `<form class="bt-row" data-bt="${b}" novalidate><div class="bt-prev" data-btprev>${badgesHtml({ badges: [b], bt: u.bt, role: 'user' })}</div>
    <label><span>${esc(tr('Name', 'Название'))}</span><input class="inp" name="n" maxlength="24" value="${esc(x.n || '')}" placeholder="${esc(d[0])}"></label>
    <label><span>${esc(tr('Tooltip', 'Подсказка'))}</span><input class="inp" name="d" maxlength="80" value="${esc(x.d || '')}" placeholder="${esc(d[1])}"></label>
    <button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('save')} ${esc(t('profile.save'))}</button></form>`; }).join('')}</section>`;
}
function bindBadgeEditor(root) {
  const box = $('[data-bted]', root); if (!box) return;
  box.addEventListener('input', e => { const f = e.target.closest('[data-bt]'); if (!f) return; const id = f.dataset.bt, bt = { ...(Auth.user.bt || {}), [id]: { n: f.n.value.trim(), d: f.d.value.trim() } }; $('[data-btprev]', f).innerHTML = badgesHtml({ badges: [id], bt, role: 'user' }); });
  box.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target.closest('[data-bt]'); if (!f) return; const b = $('button[type=submit]', f); busyBtn(b, true);
    try { const j = await api('badge_text', { method: 'POST', body: { id: f.dataset.bt, n: f.n.value.trim(), d: f.d.value.trim() } }); Auth.setUser({ ...Auth.user, bt: j.bt || null }); toast(t('profile.saved')); }
    catch (ex) { toast(errText(ex)); } finally { busyBtn(b, false); }
  });
}

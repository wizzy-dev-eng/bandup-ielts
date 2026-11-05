/* ---------- Premium: plans, perks, the "first 100 forever" promo ---------- */
const PLANS = [
  { id: 'm1', months: 1, price: 149, name: ['Month', 'Месяц'] },
  { id: 'm3', months: 3, price: 349, name: ['3 months', '3 месяца'], hit: true },
  { id: 'y1', months: 12, price: 1290, name: ['Year', 'Год'] }
];
const PERKS = [
  ['image', ['Animated avatar and banner', 'Анимированные аватар и баннер'], ['Upload GIFs – your profile comes alive.', 'Загружай GIF – профиль оживёт.']],
  ['sparkle', ['Exclusive looks', 'Эксклюзивное оформление'], ['Cosmic and Prism frames, Galaxy and Hologram banners.', 'Рамки «Космос» и «Призма», баннеры «Галактика» и «Голограмма».']],
  ['crown', ['Premium badge', 'Значок Premium'], ['A badge next to your name. The first 100 get a numbered ∞ badge.', 'Значок рядом с именем. Первые 100 получают номерной значок ∞.']],
  ['sticker', ['Stickers in chats', 'Стикеры в чатах'], ['Packs for the chats are on the way.', 'Наборы для чатов уже в работе.'], true],
  ['headset', ['Priority support', 'Приоритетная поддержка'], ['Your questions are answered first.', 'На твои вопросы отвечаем в первую очередь.']],
  ['rocket', ['Support lynx.', 'Поддержка lynx.'], ['Help keep the practice free for everyone.', 'Помогаешь сохранить практику бесплатной для всех.']]
];
const rub = n => n.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB').replace(/\u00a0/g, ' ') + ' ₽';
let promoCache = null;
function loadPromo() { if (!promoCache) promoCache = api('promo').catch(e => { promoCache = null; throw e; }); setTimeout(() => { promoCache = null; }, 30000); return promoCache; }
function promoHtml(p, cls = '') {
  const pct = Math.max(2, Math.round(p.given / p.total * 100)), me = Auth.user, mine = me && me.premium && me.premium.no;
  const left = p.total - p.given;
  const status = p.done ? tr('All 100 places are taken – thank you!', 'Все 100 мест заняты – спасибо!') : mine ? tr(`You are №${mine} of ${p.total}`, `Ты №${mine} из ${p.total}`) : tr(`${left} of ${p.total} places left`, `Осталось ${left} из ${p.total} мест`);
  const cta = p.done && cls.includes('pp-wide') ? '' : p.done ? `<a class="pill pill-sm pill-white" href="#/premium">${ic('crown')} ${esc(tr('Plans', 'Тарифы'))}</a>` : me ? (mine ? `<a class="pill pill-sm pill-white" href="#/me">${ic('palette')} ${esc(tr('Try the looks', 'К оформлению'))}</a>` : `<a class="pill pill-sm pill-white" href="#/premium">${ic('crown')} ${esc(tr('Premium', 'Premium'))}</a>`) : `<a class="pill pill-sm pill-white" href="#/signup">${ic('userPlus')} ${esc(tr('Sign up', 'Регистрация'))}</a>`;
  return `<div class="pm-promo glass ${cls}${p.done ? ' done' : ''}">
    <div class="pp-top"><span class="pp-ic" aria-hidden="true">${ic('crown')}<i class="pp-inf">∞</i></span><span class="pp-tt"><span class="pp-k">${ic('sparkle')} ${esc(p.done ? tr('Thank you!', 'Спасибо!') : tr('Limited offer', 'Ограниченная акция'))}</span><b class="pp-t">${esc(tr(`${p.total} users get Premium forever`, `${p.total} пользователей получат Premium навсегда`))}</b></span><span class="pp-n"><b>${p.given}</b>/${p.total}</span></div>
    <div class="pp-bar" title="${esc(status)}" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.given}" aria-label="${esc(tr('Places taken', 'Занято мест'))}"><i style="--w:${pct}%"></i></div>
    <div class="pp-foot"><span class="pp-s">${esc(status)}</span>${cta}</div></div>`;
}
/* fills a placeholder after the API answers; hides it when there is no API */
function mountPromo(el, cls) {
  if (!el) return;
  loadPromo().then(p => { if (!document.contains(el)) return; el.innerHTML = promoHtml(p, cls); el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in'))); }).catch(() => { el.hidden = true; });
}
function premNudge() {
  openDialog({ title: 'Premium', cls: 'pm-nudge', body: `<div class="pmn"><span class="pmn-gem" aria-hidden="true">${ic('crown')}</span><p class="muted">${esc(tr('This look comes with Premium. Animated GIFs, exclusive frames and banners, a badge and more.', 'Это оформление доступно с Premium. Анимированные GIF, эксклюзивные рамки и баннеры, значок и другое.'))}</p></div>`,
    actions: `<button class="pill pill-outline" data-close>${esc(tr('Later', 'Позже'))}</button><a class="pill pill-white" href="#/premium" data-close>${ic('crown')} ${esc(tr('See Premium', 'Смотреть Premium'))}</a>` });
}
route(/^\/premium$/, v => {
  const u = Auth.user, p = u && u.premium;
  const perMonth = pl => Math.round(pl.price / pl.months), full = pl => PLANS[0].price * pl.months;
  v.innerHTML = `<div class="page pm-page">
  <header class="pm-hero"><span class="glass-pill">${ic('crown')} lynx. Premium</span><h1 class="page-title display" tabindex="-1"><span class="grad">${esc(tr('More colour for your profile', 'Больше красок для профиля'))}</span></h1>
   <p class="page-sub">${esc(tr('Animated avatars, exclusive frames and banners, a badge next to your name. All the IELTS practice stays free.', 'Анимированные аватары, эксклюзивные рамки и баннеры, значок рядом с именем. Вся практика IELTS остаётся бесплатной.'))}</p>
   ${p ? `<div class="glass pm-have"><span class="pm-have-ic">${ic('crown')}</span><div><b>${esc(p.forever ? tr('You have Premium forever', 'У тебя Premium навсегда') : tr('Premium is active until ', 'Premium активен до ') + fmtDate(p.until, true))}</b><small>${p.no ? esc(tr(`One of the first 100 · №${p.no}`, `Один из первых 100 · №${p.no}`)) : ''}</small></div>${premBadgeHtml(u)}<a class="pill pill-white pill-sm" href="#/me">${ic('palette')} ${esc(tr('Open the looks', 'К оформлению'))}</a></div>` : ''}
   <div data-promo hidden></div></header>
  <section class="sec pm-plans" aria-label="${esc(tr('Plans', 'Тарифы'))}"><div class="grid g3">${PLANS.map((pl, i) => `<article class="glass pm-plan${pl.hit ? ' hit' : ''}" style="--i:${i}">${pl.hit ? `<span class="pm-hit">${ic('fire')} ${esc(tr('Best seller', 'Хит продаж'))}</span>` : ''}
    <h2 class="pm-name">${esc(tr(...pl.name))}</h2>
    <div class="pm-price"><b>${esc(rub(pl.price))}</b>${pl.months > 1 ? `<s>${esc(rub(full(pl)))}</s>` : ''}</div>
    <p class="pm-per">${pl.months > 1 ? esc(tr(`≈ ${rub(perMonth(pl))} a month · save ${Math.round((1 - pl.price / full(pl)) * 100)}%`, `≈ ${rub(perMonth(pl))} в месяц · выгода ${Math.round((1 - pl.price / full(pl)) * 100)}%`)) : esc(tr('Billed monthly', 'Оплата каждый месяц'))}</p>
    <ul class="pm-feat">${PERKS.slice(0, pl.months === 1 ? 3 : pl.months === 3 ? 5 : 6).map(([icn, t1]) => `<li>${ic('check')} ${esc(tr(...t1))}</li>`).join('')}</ul>
    ${p && p.forever ? `<button type="button" class="pill pill-outline pm-buy" disabled>${ic('check')} ${esc(tr('Already yours forever', 'Уже твоё навсегда'))}</button>` : `<button type="button" class="pill ${pl.hit ? 'pill-white' : 'pill-outline'} pm-buy" data-buy="${pl.id}">${ic('card')} ${esc(p ? tr('Extend', 'Продлить') : tr('Choose', 'Выбрать'))}</button>`}</article>`).join('')}</div>
   <p class="faint pm-note">${ic('clock')} ${esc(tr('Online payment opens soon. Prices are in roubles.', 'Онлайн-оплата скоро откроется. Цены в рублях.'))}</p></section>
  <section class="sec"><div class="sec-head"><span class="glass-pill">${ic('sparkle')} ${esc(tr('What you get', 'Что входит'))}</span><h2 class="sec-title display"><span class="grad">${esc(tr('Premium perks', 'Возможности Premium'))}</span></h2></div>
   <div class="grid g3 pm-perks">${PERKS.map(([icn, t1, t2, soon], i) => `<div class="glass pm-perk" style="--i:${i}"><span class="pm-pi">${ic(icn)}</span><b>${esc(tr(...t1))}${soon ? `<span class="pm-soon">${esc(tr('Soon', 'Скоро'))}</span>` : ''}</b><p>${esc(tr(...t2))}</p></div>`).join('')}</div></section>
  <section class="sec"><div class="sec-head"><span class="glass-pill">${ic('palette')} ${esc(tr('Preview', 'Превью'))}</span><h2 class="sec-title display"><span class="grad">${esc(tr('Exclusive looks', 'Эксклюзивное оформление'))}</span></h2></div>
   <div class="grid g2 pm-prev">${BANNER_X.map((b, i) => `<div class="glass pm-pv"><div class="pm-pv-c">${coverHtml('p:' + b)}</div><div class="pm-pv-a">${avatarHtml({ ...(u || { login: 'lynx', nick: 'lynx' }), frame: FRAME_X[i] }, 72)}<div><b>${esc(tr(...BANNER_N[b]))} + ${esc(tr(...FRAME_N[FRAME_X[i]]))}</b><small>${esc(tr('banner and frame', 'баннер и рамка'))}</small></div></div></div>`).join('')}</div></section>
  <section class="sec pm-faq"><div class="grid g2">
   <div class="glass panel"><h3>${ic('gift')} ${esc(tr('How do I get it for free?', 'Как получить бесплатно?'))}</h3><p class="muted">${esc(tr('The first 100 accounts get Premium automatically and forever, with a numbered badge. Just sign up.', 'Первые 100 аккаунтов получают Premium автоматически и навсегда, с номерным значком. Просто зарегистрируйся.'))}</p></div>
   <div class="glass panel"><h3>${ic('shield')} ${esc(tr('Does Premium change the practice?', 'Premium влияет на практику?'))}</h3><p class="muted">${esc(tr('No. Tasks, variants, the builder and the guide are free for everyone. Premium is only about the look and support.', 'Нет. Задания, варианты, конструктор и справочник бесплатны для всех. Premium – только оформление и поддержка.'))}</p></div></div></section></div>`;
  if (!(p && p.forever)) mountPromo($('[data-promo]', v), 'pp-wide');
  v.addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b) toast(tr('Payment is coming soon', 'Оплата скоро появится')); });
  return { title: 'Premium', nav: 'premium', relang: true };
});

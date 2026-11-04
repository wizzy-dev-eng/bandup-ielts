/* ---------- privacy policy and contact page ---------- */
const POLICY_DATE = '2026-11-04';
const POLICY = [
  ['about', ['Who we are', 'Кто мы'], [
    ['lynx. is a free site for IELTS preparation made as a school research project “IELTS as a Way to Assess English Proficiency: How to Prepare for It” (Ukhta Technical Lyceum named after G.V. Rassokhin).', 'lynx. – бесплатный сайт для подготовки к IELTS, созданный в рамках школьного исследовательского проекта «IELTS как способ оценки владения английским языком: как к нему подготовиться» (Ухтинский технический лицей им. Г.В. Рассохина).'],
    ['This page explains what data the site keeps, why, and how you can change or delete it.', 'Здесь рассказано, какие данные хранит сайт, зачем, и как их изменить или удалить.']]],
  ['eye', ['Without an account', 'Без аккаунта'], [
    ['You can practise without signing up. Then your results, drafts, sets and settings stay only in your browser (localStorage) and are not sent to us.', 'Заниматься можно без регистрации. Тогда результаты, черновики, наборы и настройки хранятся только в твоём браузере (localStorage) и нам не отправляются.']]],
  ['user', ['What we keep for an account', 'Что хранится для аккаунта'], [
    ['Email, login and nickname. The password is never stored as is – only as a salted one-way hash that cannot be turned back into the password.', 'Email, логин и ник. Пароль не хранится в открытом виде – только в виде одностороннего хеша с солью, из которого пароль восстановить нельзя.'],
    ['What you add to the profile: “About me”, avatar, banner, frame, social links, public sets.', 'То, что ты добавляешь в профиль: «О себе», аватар, баннер, рамка, соцсети, публичные наборы.'],
    ['Synced study data: results, sets, drafts and profile goals – so they are the same on all your devices.', 'Синхронизируемые учебные данные: результаты, наборы, черновики и цели – чтобы они были одинаковыми на всех устройствах.'],
    ['Friends, chats, notifications, the time of your last activity.', 'Друзья, чаты, уведомления, время последней активности.']]],
  ['globe', ['IP address and devices', 'IP-адрес и устройства'], [
    ['For every sign-in we keep the IP address, the browser name (user agent) and the time of the last visit. You see this list in “Privacy & security” and can end any session.', 'Для каждого входа мы храним IP-адрес, название браузера (user agent) и время последнего визита. Этот список виден в разделе «Приватность и безопасность», и любой сеанс можно завершить.'],
    ['The last five IP addresses of an account are kept to protect the community: the administration can block a network that is used for abuse. Staff see these addresses only partly hidden.', 'Последние пять IP-адресов аккаунта хранятся для защиты сообщества: администрация может заблокировать сеть, с которой нарушают правила. Сотрудники видят адреса только частично скрытыми.']]],
  ['cookie', ['Cookies and browser storage', 'Cookie и хранилище браузера'], [
    ['One cookie, lynx_sid: it keeps you signed in for up to 30 days. It is HttpOnly, so scripts cannot read it.', 'Один cookie – lynx_sid: он держит тебя в аккаунте до 30 дней. Он HttpOnly, поэтому скрипты не могут его прочитать.'],
    ['localStorage keeps settings, progress and your cookie choice; IndexedDB keeps the encryption key of private chats on this device.', 'localStorage хранит настройки, прогресс и твой выбор по cookie; IndexedDB хранит ключ шифрования личных чатов на этом устройстве.'],
    ['No ads, no analytics, no trackers.', 'Никакой рекламы, аналитики и трекеров.']]],
  ['lock', ['Chats and encryption', 'Чаты и шифрование'], [
    ['Private messages are end-to-end encrypted when both people have keys. The key pair is made in your browser; the private key reaches the server only encrypted with a key derived from your password. Neither the administration nor the server can read these messages.', 'Личные сообщения защищены сквозным шифрованием, если ключи есть у обоих собеседников. Пара ключей создаётся в браузере; закрытый ключ попадает на сервер только в зашифрованном виде – ключом, полученным из твоего пароля. Ни администрация, ни сервер не могут прочитать такие сообщения.'],
    ['If the other person has not set up encryption yet, the message is sent without it and is marked with an open lock.', 'Если собеседник ещё не настроил шифрование, сообщение уходит без него и помечается открытым замком.'],
    ['Messages in the global chat and in groups are not encrypted: an automatic filter checks them for rude words, and the administration can delete messages that break the rules.', 'Сообщения в общем чате и группах не шифруются: автоматический фильтр проверяет их на грубые слова, а администрация может удалять сообщения с нарушениями.']]],
  ['shieldLock', ['Two-step verification', 'Двухэтапная проверка'], [
    ['If you turn it on, the server keeps the secret needed to check the codes from your app. Recovery codes are kept only as hashes.', 'Если ты её включишь, сервер хранит секрет для проверки кодов из приложения. Коды восстановления хранятся только в виде хешей.']]],
  ['monitor', ['Where the data is stored', 'Где хранятся данные'], [
    ['The site runs on Vercel (servers in Frankfurt, region fra1). The database is a managed PostgreSQL by Neon. All traffic goes over HTTPS.', 'Сайт работает на Vercel (серверы во Франкфурте, регион fra1). База данных – управляемый PostgreSQL от Neon. Весь трафик идёт по HTTPS.'],
    ['We do not sell or hand your data to anyone.', 'Мы не продаём и никому не передаём твои данные.']]],
  ['people', ['Who sees what', 'Кто что видит'], [
    ['Everyone can see the public profile: nickname, login, avatar, banner, badges, “About me”, social links, study stats and public sets.', 'Всем виден публичный профиль: ник, логин, аватар, баннер, значки, «О себе», соцсети, учебная статистика и публичные наборы.'],
    ['Who can write to you, send friend requests or add you to groups – you decide in “Privacy & security”.', 'Кто может писать тебе, звать в друзья или добавлять в группы – решаешь ты в разделе «Приватность и безопасность».']]],
  ['trash', ['Changing and deleting', 'Изменение и удаление'], [
    ['You can edit the profile at any time. “Delete account” in the profile removes the account, the study data, public sets, friends, chat membership and your messages for good.', 'Профиль можно изменить в любой момент. Кнопка «Удалить аккаунт» в профиле навсегда удаляет аккаунт, учебные данные, публичные наборы, друзей, участие в чатах и твои сообщения.'],
    ['Logging out removes your results from this browser; they stay in the account.', 'При выходе результаты удаляются из этого браузера, но остаются в аккаунте.']]]
];
route(/^\/privacy$/, v => {
  v.innerHTML = `<div class="page legal-page">${pageHead(`${ic('doc')} lynx.`, null, null, tr('Privacy policy', 'Политика конфиденциальности'))}
  <p class="page-sub">${esc(tr('Short version: we keep only what the site needs to work, private messages are end-to-end encrypted, and you can delete everything yourself.', 'Коротко: храним только то, что нужно для работы сайта, личные сообщения шифруются сквозным шифрованием, и всё можно удалить самому.'))}</p>
  <p class="faint lg-date">${ic('calendar')} ${esc(tr('Updated: ', 'Обновлено: ') + fmtDate(POLICY_DATE, true))}</p>
  <nav class="glass lg-toc" aria-label="${esc(tr('Contents', 'Содержание'))}">${POLICY.map(([i, h], n) => `<a href="#/privacy" data-lg="${n}">${ic(i)}<span>${esc(tr(...h))}</span></a>`).join('')}</nav>
  <div class="lg-list">${POLICY.map(([i, h, ps], n) => `<section class="glass panel lg-sec" id="lg-${n}"><h2 class="grp-title">${ic(i)} ${esc(tr(...h))}</h2>${ps.map(p => `<p>${esc(tr(...p))}</p>`).join('')}</section>`).join('')}</div>
  <div class="glass panel lg-end"><p class="muted">${esc(tr('Questions about your data? Write to us.', 'Вопросы о данных? Напиши нам.'))}</p><a class="pill pill-white pill-sm" href="#/contact">${ic('mail')} ${esc(tr('Contact us', 'Связаться с нами'))}</a></div></div>`;
  v.addEventListener('click', e => { const a = e.target.closest('[data-lg]'); if (!a) return; e.preventDefault(); const s = $('#lg-' + a.dataset.lg); if (s) s.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); });
  return { title: tr('Privacy policy', 'Политика конфиденциальности'), nav: 'privacy', relang: true };
});
route(/^\/contact$/, v => {
  v.innerHTML = `<div class="page legal-page">${pageHead(`${ic('mail')} lynx.`, null, null, tr('Contact us', 'Связаться с нами'))}
  <p class="page-sub">${esc(tr('A contact form is coming soon. Until then you can reach the team right on the site.', 'Скоро здесь появится форма обратной связи. А пока с командой можно связаться прямо на сайте.'))}</p>
  <div class="grid g3 ct-grid">
   <a class="glass card ct-card" href="#/chat"><span class="em">${ic('chat')}</span><h3>${esc(tr('Global chat', 'Общий чат'))}</h3><p>${esc(tr('Ask a question – the administration reads the chat.', 'Задай вопрос – администрация читает чат.'))}</p></a>
   <a class="glass card ct-card" href="#/people"><span class="em">${ic('people')}</span><h3>${esc(tr('Write to the team', 'Написать команде'))}</h3><p>${esc(tr('Open a profile of the staff and press “Message”.', 'Открой профиль сотрудника и нажми «Написать».'))}</p></a>
   <div class="glass card ct-card soon-card" aria-disabled="true"><span class="em">${ic('mail')}</span><h3>${esc(tr('Contact form', 'Форма обратной связи'))}<span class="pm-soon">${esc(tr('Soon', 'Скоро'))}</span></h3><p>${esc(tr('Messages without an account – in one of the next updates.', 'Сообщения без аккаунта – в одном из следующих обновлений.'))}</p></div></div></div>`;
  return { title: tr('Contact us', 'Связаться с нами'), nav: 'contact', relang: true };
});

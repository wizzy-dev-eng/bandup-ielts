/* ---------- privacy policy and contact page ---------- */
const POLICY_DATE = '2026-11-05';
const POLICY = [
  ['about', ['Who we are', 'Кто мы'], [
    ['lynx. is a free site for IELTS preparation. It grew out of the school research project “IELTS as a Way to Assess English Proficiency: How to Prepare for It” (Ukhta Technical Lyceum named after G.V. Rassokhin) and is now also a personal project of its author.', 'lynx. – бесплатный сайт для подготовки к IELTS. Он вырос из школьного исследовательского проекта «IELTS как способ оценки владения английским языком: как к нему подготовиться» (Ухтинский технический лицей им. Г.В. Рассохина), а теперь это ещё и личный проект автора.'],
    ['This page explains what data the site keeps, why, and how you can change or delete it.', 'Здесь рассказано, какие данные хранит сайт, зачем, и как их изменить или удалить.']]],
  ['eye', ['Without an account', 'Без аккаунта'], [
    ['You can practise without signing up. Then your results, drafts, sets and settings stay only in your browser (localStorage) and are not sent to us.', 'Заниматься можно без регистрации. Тогда результаты, черновики, наборы и настройки хранятся только в твоём браузере (localStorage) и нам не отправляются.']]],
  ['user', ['What we keep for an account', 'Что хранится для аккаунта'], [
    ['Email, login and nickname. The password is never stored as is – only as a salted one-way hash that cannot be turned back into the password.', 'Email, логин и ник. Пароль не хранится в открытом виде – только в виде одностороннего хеша с солью, из которого пароль восстановить нельзя.'],
    ['What you add to the profile: “About me”, avatar, banner, frame, social links, public sets.', 'То, что ты добавляешь в профиль: «О себе», аватар, баннер, рамка, соцсети, публичные наборы.'],
    ['Synced study data: results, sets, drafts and profile goals – so they are the same on all your devices.', 'Синхронизируемые учебные данные: результаты, наборы, черновики и цели – чтобы они были одинаковыми на всех устройствах.'],
    ['Friends, chats, notifications, the time of your last activity.', 'Друзья, чаты, уведомления, время последней активности.']]],
  ['music', ['Music and Spotify in the profile', 'Музыка и Spotify в профиле'], [
    ['If you add a track to the profile, the audio file (up to 6 MB), its cover and the tags read from the file (title, artist, album, length) are stored in our database and anyone who opens your profile can listen to it. Upload only music you may share. Removing the track deletes the file.', 'Если ты добавишь трек в профиль, аудиофайл (до 6 МБ), обложка и теги из файла (название, исполнитель, альбом, длительность) хранятся в нашей базе, и послушать трек может любой, кто откроет профиль. Загружай только ту музыку, которой можно делиться. При удалении трека файл стирается.'],
    ['A Spotify link is kept as a short ID. The player is an embedded widget from open.spotify.com: it loads only on your profile page, and Spotify may set its own cookies according to its privacy policy. We do not connect to your Spotify account.', 'Ссылка на Spotify хранится как короткий ID. Плеер – встроенный виджет open.spotify.com: он загружается только на странице профиля, и Spotify может ставить свои cookie по своей политике конфиденциальности. К твоему аккаунту Spotify мы не подключаемся.']]],
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
    ['Messages in the global chat and in groups are not encrypted: an automatic filter checks them for rude words, and the administration can delete messages that break the rules.', 'Сообщения в общем чате и группах не шифруются: автоматический фильтр проверяет их на грубые слова, а администрация может удалять сообщения с нарушениями.'],
    ['A deleted message in the global chat or a group disappears for everyone, but its text stays in the moderation log that only staff with this right can open – so abuse can still be checked. Deleted private messages are erased completely.', 'Удалённое сообщение в общем чате или группе пропадает у всех, но его текст остаётся в журнале модерации, который могут открыть только сотрудники с таким правом, – чтобы нарушения можно было проверить. Удалённые личные сообщения стираются полностью.']]],
  ['shieldLock', ['Two-step verification', 'Двухэтапная проверка'], [
    ['If you turn it on, the server keeps the secret needed to check the codes from your app. Recovery codes are kept only as hashes.', 'Если ты её включишь, сервер хранит секрет для проверки кодов из приложения. Коды восстановления хранятся только в виде хешей.'],
    ['A PIN for important sections and the answer to a security question are kept only as one-way hashes, like the password.', 'PIN-код для важных разделов и ответ на контрольный вопрос хранятся только в виде односторонних хешей, как и пароль.']]],
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

/* ---------- terms of use and copyright ---------- */
const LEGAL_DATE = '2026-11-05';
const TERMS = [
  ['doc', ['About these rules', 'Об этих правилах'], [
    ['By using lynx. you agree to these rules. If you do not agree, please do not use the site. We may update the rules; the date of the last change is shown above.', 'Пользуясь lynx., ты соглашаешься с этими правилами. Если ты не согласен, пожалуйста, не пользуйся сайтом. Правила могут обновляться; дата последнего изменения указана выше.']]],
  ['user', ['Your account', 'Твой аккаунт'], [
    ['One person – one account. Keep the password to yourself; you answer for everything done from your account. Turning on two-step verification is strongly recommended.', 'Один человек – один аккаунт. Не сообщай пароль другим: за действия с твоего аккаунта отвечаешь ты. Очень советуем включить двухэтапную проверку.'],
    ['The login, nickname, avatar, banner and “About me” must not insult anyone, pretend to be another person or the administration, or contain ads.', 'Логин, ник, аватар, баннер и «О себе» не должны никого оскорблять, выдавать себя за другого человека или администрацию и содержать рекламу.']]],
  ['chat', ['Behaviour in chats', 'Поведение в чатах'], [
    ['Be kind. No insults, threats, harassment, spam, flooding, adult content, hate or calls for violence. Do not share other people’s personal data.', 'Будь доброжелателен. Нельзя оскорблять, угрожать, травить, спамить, флудить, публиковать контент 18+, разжигать ненависть и призывать к насилию. Не делись чужими личными данными.'],
    ['The administration can delete messages, give warnings (3 strikes block the account for a day) and block accounts and networks that break the rules.', 'Администрация может удалять сообщения, выносить предупреждения (3 страйка блокируют аккаунт на сутки) и блокировать аккаунты и сети, которые нарушают правила.']]],
  ['upload', ['What you upload', 'Что ты загружаешь'], [
    ['You may upload only pictures, music and texts that you made yourself or have the right to share. You keep the rights to them and allow lynx. to store and show them to other users while they are on the site.', 'Загружать можно только свои картинки, музыку и тексты или те, которыми ты вправе делиться. Права на них остаются у тебя, а lynx. ты разрешаешь хранить их и показывать другим пользователям, пока они на сайте.'],
    ['We remove materials that break these rules or someone’s rights.', 'Материалы, которые нарушают эти правила или чьи-то права, мы удаляем.']]],
  ['crown', ['Premium', 'Premium'], [
    ['Premium gives extra looks and features. The first 100 accounts got it forever as a thank-you. Premium cannot be sold or passed to another account.', 'Premium открывает дополнительное оформление и функции. Первые 100 аккаунтов получили его навсегда в благодарность. Premium нельзя продать или передать другому аккаунту.']]],
  ['alert', ['The site “as is”', 'Сайт «как есть»'], [
    ['lynx. is a free learning project. We try to keep it working and correct, but cannot promise it will always be available or error-free. Practice scores are only a guide and do not replace an official IELTS result.', 'lynx. – бесплатный учебный проект. Мы стараемся, чтобы всё работало и было верно, но не можем обещать, что сайт всегда будет доступен и без ошибок. Баллы за практику – ориентир, они не заменяют официальный результат IELTS.']]],
  ['ban', ['Ending the use', 'Прекращение использования'], [
    ['You can delete your account at any time in the profile settings. We may block an account that seriously or repeatedly breaks the rules.', 'Удалить аккаунт можно в любой момент в настройках профиля. Аккаунт, который серьёзно или неоднократно нарушает правила, может быть заблокирован.']]]
];
const COPYR = [
  ['star', ['Our content', 'Наш контент'], [
    ['The design, the lynx. name and logo, the code, the texts of tasks, guides, drills and illustrations of the site belong to lynx. All rights reserved.', 'Дизайн, название и логотип lynx., код, тексты заданий, гайды, тренажёры и иллюстрации сайта принадлежат lynx. Все права защищены.'],
    ['You may use the materials for your own study and share links to the site. Copying, publishing or selling them elsewhere needs our written permission.', 'Материалы можно использовать для личной подготовки и делиться ссылками на сайт. Копировать, публиковать или продавать их в других местах можно только с нашего письменного разрешения.']]],
  ['flag', ['Trademarks', 'Товарные знаки'], [
    ['lynx.™ and the lynx logo are our trademarks. IELTS is a registered trademark of the University of Cambridge, the British Council and IDP Education. lynx. is not affiliated with them or endorsed by them; all tasks on the site are IELTS-style practice written for lynx., not official test materials.', 'lynx.™ и логотип с рысью – наши товарные знаки. IELTS – зарегистрированный товарный знак Кембриджского университета, Британского совета и IDP Education. lynx. с ними не связан и ими не одобрен; все задания на сайте – тренировочные материалы в формате IELTS, написанные для lynx., а не официальные материалы экзамена.'],
    ['Official information about the exam: ielts.org.', 'Официальная информация об экзамене: ielts.org.']]],
  ['users', ['Content of users', 'Контент пользователей'], [
    ['Avatars, banners, music, stickers, sets and messages belong to the people who uploaded them. Each user answers for having the right to share what they upload.', 'Аватары, баннеры, музыка, стикеры, наборы и сообщения принадлежат тем, кто их загрузил. Каждый пользователь отвечает за то, что вправе делиться загруженным.']]],
  ['shield', ['If your rights are broken', 'Если нарушены твои права'], [
    ['If you think something on lynx. breaks your copyright, write to the administration (see “Contact us”): give a link to the page or the profile, describe your work and how to reach you. We check every request and remove the material if the claim is confirmed.', 'Если ты считаешь, что что-то на lynx. нарушает твои авторские права, напиши администрации (раздел «Связаться с нами»): дай ссылку на страницу или профиль, опиши свою работу и как с тобой связаться. Мы проверяем каждое обращение и удаляем материал, если нарушение подтвердится.']]]
];
function legalPage(v, { secs, title, sub, date, nav, icon }) {
  v.innerHTML = `<div class="page legal-page">${pageHead(`${ic(icon)} lynx.`, null, null, title)}
  <p class="page-sub">${esc(sub)}</p>
  <p class="faint lg-date">${ic('calendar')} ${esc(tr('Updated: ', 'Обновлено: ') + fmtDate(date, true))}</p>
  <nav class="glass lg-toc" aria-label="${esc(tr('Contents', 'Содержание'))}">${secs.map(([i, h], n) => `<a href="#/${nav}" data-lg="${n}">${ic(i)}<span>${esc(tr(...h))}</span></a>`).join('')}</nav>
  <div class="lg-list">${secs.map(([i, h, ps], n) => `<section class="glass panel lg-sec" id="lg-${n}"><h2 class="grp-title">${ic(i)} ${esc(tr(...h))}</h2>${ps.map(p => `<p>${esc(tr(...p)).replace('ielts.org', '<a href="https://ielts.org" target="_blank" rel="noopener noreferrer">ielts.org</a>')}</p>`).join('')}</section>`).join('')}</div>
  <div class="glass panel lg-end"><p class="muted">${esc(tr('Questions? Write to us.', 'Есть вопросы? Напиши нам.'))}</p><a class="pill pill-white pill-sm" href="#/contact">${ic('mail')} ${esc(tr('Contact us', 'Связаться с нами'))}</a></div></div>`;
  v.addEventListener('click', e => { const a = e.target.closest('[data-lg]'); if (!a) return; e.preventDefault(); const s = $('#lg-' + a.dataset.lg); if (s) s.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); });
  return { title, nav, relang: true };
}
route(/^\/terms$/, v => legalPage(v, { secs: TERMS, icon: 'doc', nav: 'terms', date: LEGAL_DATE, title: tr('Terms of use', 'Правила пользования'), sub: tr('Short version: be kind, upload only what you may share, and remember that practice scores are only a guide.', 'Коротко: будь доброжелателен, загружай только то, чем вправе делиться, и помни, что баллы за практику – только ориентир.') }));
route(/^\/copyright$/, v => legalPage(v, { secs: COPYR, icon: 'shield', nav: 'copyright', date: LEGAL_DATE, title: tr('Copyright', 'Защита авторских прав'), sub: tr('Who owns what on lynx. and what to do if your work was used without permission.', 'Кому что принадлежит на lynx. и что делать, если твою работу использовали без разрешения.') }));

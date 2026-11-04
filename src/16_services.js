/* ---------- lynx. services ---------- */
route(/^\/services$/, v => {
  const S = [
    { id: 'ielts', icon: 'globe', on: true, href: '#/', name: 'lynx. IELTS', en: 'Practice for all four parts of IELTS: tasks at three levels, drills, mock tests, a set builder and progress tracking.', ru: 'Подготовка ко всем четырём частям IELTS: задания трёх уровней, тренажёры, пробные варианты, конструктор наборов и прогресс.' },
    { id: 'edu', icon: 'cap', name: 'lynx. Education', en: 'School subjects and olympiad practice in the same calm interface.', ru: 'Школьные предметы и олимпиадные задания в том же спокойном интерфейсе.' },
    { id: 'biz', icon: 'briefcase', name: 'lynx. Business', en: 'English for work: emails, meetings and presentations.', ru: 'Английский для работы: письма, встречи и презентации.' },
    { id: 'arch', icon: 'archive', name: 'lynx. Archive', en: 'An open archive of public sets and study materials from the community.', ru: 'Открытый архив публичных наборов и учебных материалов сообщества.' }
  ];
  v.innerHTML = `<div class="page svc-page">${pageHead(`${ic('apps')} lynx.`, null, null, tr('Our services', 'Наши сервисы'))}
  <p class="page-sub">${esc(tr('One lynx. account works everywhere: your profile, progress and sets go with you.', 'Один аккаунт lynx. работает везде: профиль, прогресс и наборы всегда с тобой.'))}</p>
  <div class="svc-grid">${S.map((s, i) => `<${s.on ? `a href="${s.href}"` : 'div aria-disabled="true"'} class="glass card svc${s.on ? ' on' : ' svc-soon'}" style="--i:${i}"><div class="svc-h"><span class="svc-ic">${ic(s.icon)}</span>${s.on ? `<span class="lp ok">${ic('check')} ${esc(tr('You are here', 'Ты здесь'))}</span>` : `<span class="lp">${ic('clock')} ${esc(tr('Soon', 'Скоро'))}</span>`}</div>
    <h2 class="svc-n display">${esc(s.name)}</h2><p>${esc(tr(s.en, s.ru))}</p>${s.on ? `<span class="svc-go">${esc(tr('Open', 'Открыть'))} ${ic('arrow')}</span>` : ''}</${s.on ? 'a' : 'div'}>`).join('')}</div>
  <section class="glass panel svc-acc"><span class="svc-ic">${logoSvg(30)}</span><div><h2 class="grp-title">${esc(tr('One lynx. account', 'Один аккаунт lynx.'))}</h2><p class="muted">${esc(tr('Sign up once – new services will open with the same login and password.', 'Зарегистрируйся один раз – новые сервисы откроются с тем же логином и паролем.'))}</p></div>${Auth.user ? `<a class="pill pill-outline pill-sm" href="#/u/${esc(Auth.user.login)}">${ic('user')} ${esc(t('auth.myProfile'))}</a>` : `<a class="pill pill-white pill-sm" href="#/signup">${ic('userPlus')} ${esc(t('auth.signup'))}</a>`}</section></div>`;
  return { title: tr('Our services', 'Наши сервисы'), nav: 'services', relang: true };
});

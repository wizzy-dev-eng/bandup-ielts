/* ---------- home ---------- */
let heroPlayedOnce = false;
const CHIPS = [
  { k: 'hex', x: 30.4, y: 17.2, i: 7 }, { k: 'A', x: 12.7, y: 48.0, i: 8 }, { k: 'B', x: 92.0, y: 52.2, i: 9 }, { k: 'C', x: 88.4, y: 65.7, i: 10 }];
function heroHtml(entering) {
  const chip = c => c.k === 'hex'
    ? `<button class="chip hex" style="left:${c.x}%;top:${c.y}%;--i:${c.i}" data-calc data-i18n-label="hero.chipBand" aria-label="${esc(t('hero.chipBand'))}">9.0</button>`
    : `<a class="chip lv-${c.k}" style="left:${c.x}%;top:${c.y}%;--i:${c.i}" href="#/practice?level=${c.k}" aria-label="${esc(LEVEL[c.k].name)} – ${esc(LEVEL[c.k].label)}">${c.k}</a>`;
  return `<section class="hero${entering ? ' entering' : ''}" aria-labelledby="heroTitle">
  <div class="plate" aria-hidden="true"></div>
  <div class="chips">${CHIPS.map(chip).join('')}</div>
  <div class="hero-inner">
    <span class="glass-pill rise" style="--i:1">${ic('bolt')} ${T('hero.pill')}</span>
    <h1 class="hero-title display" id="heroTitle" tabindex="-1"><span class="ln rise" style="--i:2"><span class="grad" data-i18n="hero.title1">${esc(t('hero.title1'))}</span></span> <span class="ln rise" style="--i:3"><span class="grad" data-i18n="hero.title2">${esc(t('hero.title2'))}</span></span></h1>
    <p class="hero-sub rise" style="--i:4"><span class="ln" data-i18n="hero.sub1">${esc(t('hero.sub1'))}</span> <span class="ln" data-i18n="hero.sub2">${esc(t('hero.sub2'))}</span></p>
    <a class="pill pill-white cta rise" style="--i:5" href="#/variant/diagnostic">${T('hero.cta')} ${ic('arrow')}</a>
    <div class="hero-promo" data-promo hidden></div>
  </div>
  <button class="scroll-hint rise" style="--i:11" aria-label="${esc(tr('Scroll down', 'Прокрутить вниз'))}" id="scrollHint">
    <svg viewBox="0 0 170 76" aria-hidden="true"><defs><path id="arcL" d="M 22 62 A 63 63 0 0 1 70 12"/><path id="arcR" d="M 100 12 A 63 63 0 0 1 148 62"/></defs>
      <text><textPath href="#arcL" startOffset="50%" text-anchor="middle">${esc(t('hero.scroll1'))}</textPath></text><text><textPath href="#arcR" startOffset="50%" text-anchor="middle">${esc(t('hero.scroll2'))}</textPath></text></svg>
    <span class="mouse"></span></button>
</section>`;
}
route(/^\/$/, (v) => {
  const entering = !heroPlayedOnce && !reduced(); heroPlayedOnce = true;
  if (entering) { document.body.classList.add('first-load'); setTimeout(() => document.body.classList.remove('first-load'), 2000); }
  const facts = D.exam.facts;
  const ruBrief = { L: 'Участник слушает четыре записи и отвечает на 40 вопросов — по десять в каждой части.', R: 'Раздел длится 60 минут и состоит из трёх секций с 40 вопросами.', W: 'За 60 минут нужно выполнить два задания.', S: 'Speaking — личное интервью с экзаменатором, которое длится 11–14 минут и записывается.' };
  const secFirst = D.exam.sections.map(s => ({ ...s, first: lang === 'ru' && ruBrief[s.skill] ? ruBrief[s.skill] : splitSentences(s.text)[0] }));
  v.innerHTML = heroHtml(entering) + `<div class="home-sections" id="homeStart">
  <section class="sec" aria-labelledby="hLv"><div class="sec-head"><span class="glass-pill">A · B · C</span><h2 class="sec-title display" id="hLv"><span class="grad" data-i18n="home.levels">${esc(t('home.levels'))}</span></h2><p class="muted">${T('home.levelsSub')}</p></div>
    <div class="grid g3">${D.levels.map(l => `<article class="glass card glow level-card lv-${l.id}"><div class="big">${l.id}</div><h3>${esc(l.name)} · ${esc(l.label)}</h3><div class="meta"><span class="lp"><i></i>CEFR ${esc(l.cefr)}</span><span class="lp"><i></i>IELTS ${esc(l.band)}</span><span class="lp">${ic('clock')} ${esc(l.timing)}</span></div><p>${md(l.intro)}</p><a class="pill pill-white pill-sm" href="#/practice?level=${l.id}" style="align-self:flex-start">${esc(lang === 'ru' ? 'Практика: уровень ' + l.id : 'Practise Level ' + l.id)} ${ic('arrow')}</a></article>`).join('')}</div>
    <p style="margin-top:18px"><a class="txt-btn" href="#/variant/diagnostic">${T('home.diagnostic')} →</a></p></section>
  <section class="sec" aria-labelledby="hSk"><div class="sec-head"><span class="glass-pill">${ic('headphones')} ${ic('book')} ${ic('pen')} ${ic('mic')}</span><h2 class="sec-title display" id="hSk"><span class="grad" data-i18n="home.skills">${esc(t('home.skills'))}</span></h2></div>
    <div class="grid g4">${secFirst.map(s => `<a class="glass card skill-card" href="#/practice?skill=${s.skill}"><div class="em" aria-hidden="true">${SKILL[s.skill].icon}</div><h3>${T('skill.' + s.skill)}</h3><p>${esc(s.first)}</p></a>`).join('')}</div></section>
  <section class="sec" aria-labelledby="hFa"><div class="sec-head"><span class="glass-pill">IELTS</span><h2 class="sec-title display" id="hFa"><span class="grad" data-i18n="home.facts">${esc(t('home.facts'))}</span></h2></div>
    <div class="grid g3">${facts.map(f => `<div class="glass stat"><div class="k grad">${esc(f.k)}</div><div class="v">${esc(f.v)}</div></div>`).join('')}</div></section>
  <section class="sec"><div class="grid g3">
    <div class="glass card glow cta-card lv-A"><span class="kicker">${esc(tr('Diagnostic', 'Диагностика'))}</span><h3>${T('home.diagnostic')}</h3><p>${esc(D.variants.find(x => x.id === 'diagnostic').desc)}</p><a class="pill pill-white pill-sm" href="#/variant/diagnostic">${T('variants.start')} ${ic('arrow')}</a></div>
    <div class="glass card glow cta-card lv-B"><span class="kicker">0 – 9</span><h3>${T('home.calc')}</h3><p>${esc(D.exam.rounding.rule.split('.')[0])}.</p><button class="pill pill-white pill-sm" data-calc>${ic('calc')} ${T('calc.title')}</button></div>
    <div class="glass card glow cta-card lv-C"><span class="kicker">${esc(tr('Quiz', 'Викторина'))}</span><h3>${T('home.quiz')}</h3><p>${esc(D.drills.quiz.intro)}</p><a class="pill pill-white pill-sm" href="#/drill/quiz">${T('quiz.title')} ${ic('arrow')}</a></div>
  </div></section></div>`;
  const hero = $('.hero', v);
  Globe.setMode('hero', $('.plate', hero));
  mountPromo($('[data-promo]', hero));
  $$('[data-calc]', v).forEach(b => b.addEventListener('click', openCalc));
  $('#scrollHint', v).addEventListener('click', () => $('#homeStart').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }));
  if (entering) setTimeout(() => hero.classList.remove('entering'), 2400);
  const offLang = on('lang', () => { $$('textPath', hero)[0].textContent = t('hero.scroll1'); $$('textPath', hero)[1].textContent = t('hero.scroll2'); });
  onCleanup(offLang);
  return { title: lang === 'ru' ? 'Подготовка к IELTS' : 'IELTS preparation', nav: 'home', relang: true };
});

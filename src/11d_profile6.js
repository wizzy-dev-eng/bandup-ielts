/* ---------- profile v6: titles from achievements, profile colour wheel, music card ---------- */
const ACH_D = {
  first: ['trophy', 'First step', 'Первый шаг', 'Finish any task', 'Пройди любое задание', 45],
  ten: ['chart', 'Warming up', 'Разогрев', '10 attempts', '10 попыток', 200],
  fifty: ['fire', 'Unstoppable', 'Неудержимый', '50 attempts', '50 попыток', 14],
  explorer: ['compass', 'Explorer', 'Исследователь', 'Try 6 different tasks', 'Попробуй 6 разных заданий', 170],
  complete: ['checklist', 'Completionist', 'Перфекционист', 'Finish all 12 tasks', 'Пройди все 12 заданий', 140],
  listener: ['headphones', 'Sharp ear', 'Чуткий слух', '90% or more in Listening', '90% и больше в Listening', 210],
  reader: ['book', 'Bookworm', 'Книжный червь', '90% or more in Reading', '90% и больше в Reading', 260],
  writer: ['pen', 'Wordsmith', 'Мастер слова', '5 Writing attempts', '5 попыток Writing', 300],
  speaker: ['mic', 'Orator', 'Оратор', '5 Speaking attempts', '5 попыток Speaking', 330],
  mock: ['variants', 'Mock-test veteran', 'Ветеран пробников', 'Finish a full variant', 'Пройди полный вариант', 280],
  author: ['layers', 'Set author', 'Автор наборов', 'Publish a set', 'Опубликуй набор', 100],
  pioneer: ['crown', 'Pioneer', 'Первопроходец', 'One of the first 100 Premium', 'Один из первых 100 Premium', 42]
};
const achName = id => ACH_D[id] ? tr(ACH_D[id][1], ACH_D[id][2]) : '';
function titleHtml(id, sm) {
  const a = ACH_D[id]; if (!a) return '';
  return `<span class="ttl ttl-${esc(id)}${sm ? ' sm' : ''}" style="--th:${a[5]}" data-tip="${esc(tr('Title for: ', 'Титул за: ') + tr(a[3], a[4]))}" tabindex="0">${ic(a[0])}<span>${esc(tr(a[1], a[2]))}</span></span>`;
}
function achievementsHtml(u) {
  const got = new Set((u && u.ach) || []), ids = Object.keys(ACH_D), n = ids.filter(k => got.has(k)).length;
  return `<section class="sec ach-sec"><div class="sec-head"><span class="glass-pill">${ic('trophy')} ${esc(tr('Achievements', 'Достижения'))}<b class="ach-n">${n}/${ids.length}</b></span><p class="muted">${esc(tr('Every achievement unlocks a title that can be shown under the name.', 'Каждое достижение открывает титул, который можно показать под именем.'))}</p></div>
  <div class="ach-grid">${ids.map((k, i) => { const a = ACH_D[k], on = got.has(k), cur = u && u.title === k; return `<div class="glass ach${on ? ' on' : ''}${cur ? ' cur' : ''}" style="--i:${i};--th:${a[5]}"${on ? '' : ' aria-disabled="true"'}><span class="ach-ic">${ic(a[0])}${on ? '' : `<i class="ach-lock">${ic('lock')}</i>`}</span><b>${esc(tr(a[1], a[2]))}</b><small>${esc(cur ? tr('Shown as the title', 'Показан как титул') : tr(a[3], a[4]))}</small></div>`; }).join('')}</div></section>`;
}
/* ---- colour wheel (HSV) ---- */
const PC_PRE = ['#c8b6ff', '#f6a9d3', '#6ea8ff', '#5be0a8', '#ffc76b', '#ff6b7a', '#9fe6ff', '#d77bff', '#ff9f5b', '#b8f26b'];
function hsv2hex(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function hex2hsv(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return { h: 260, s: .3, v: 1 };
  const n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
function cwHtml(color) {
  return `<div class="cw" data-cw><div class="cw-wheel" data-cww><canvas data-cwc aria-hidden="true"></canvas><span class="cw-knob" data-cwk role="slider" tabindex="0" aria-label="${esc(tr('Colour', 'Цвет'))}" aria-valuemin="0" aria-valuemax="360"></span></div>
  <div class="cw-side"><div class="cw-prev"><span class="cw-sw" data-cwsw></span><label class="cw-hex"><span class="sr-only">HEX</span><input class="inp" data-cwhex maxlength="7" spellcheck="false" autocomplete="off" value="${esc(color || '')}" placeholder="#c8b6ff"></label></div>
   <label class="cw-l"><span>${esc(tr('Brightness', 'Яркость'))}</span><input type="range" min="35" max="100" step="1" data-cwv></label>
   <div class="cw-pre" role="group" aria-label="${esc(tr('Ready colours', 'Готовые цвета'))}">${PC_PRE.map(c => `<button type="button" class="cw-p" data-cwp="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>
   <div class="row cw-acts"><button type="button" class="pill pill-white pill-sm" data-cwsave><span class="spin" aria-hidden="true"></span>${ic('check')} ${esc(tr('Apply', 'Применить'))}</button><button type="button" class="txt-btn" data-cwreset>${ic('replay')} ${esc(tr('Default', 'По умолчанию'))}</button></div></div></div>`;
}
function bindCw(root, color, onLive, onSave) {
  const box = $('[data-cw]', root); if (!box) return;
  const cv = $('[data-cwc]', box), wh = $('[data-cww]', box), knob = $('[data-cwk]', box), hexI = $('[data-cwhex]', box), vI = $('[data-cwv]', box), sw = $('[data-cwsw]', box);
  let hsv = hex2hsv(color || '#c8b6ff'), drawnV = -1, raf = 0;
  const cur = () => hsv2hex(hsv.h, hsv.s, hsv.v);
  function draw() {
    const css = wh.clientWidth || 180, dpr = Math.min(2, devicePixelRatio || 1), n = Math.round(css * dpr);
    if (cv.width !== n) { cv.width = cv.height = n; drawnV = -1; }
    if (drawnV === hsv.v) return; drawnV = hsv.v;
    const g = cv.getContext('2d'), img = g.createImageData(n, n), d = img.data, R = n / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x + .5 - R, dy = y + .5 - R, r = Math.hypot(dx, dy) / R, i = (y * n + x) * 4; if (r > 1.01) continue;
      const h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, s = Math.min(1, r), v = hsv.v;
      const f = k => { const q = (k + h / 60) % 6; return v - v * s * Math.max(0, Math.min(q, 4 - q, 1)); };
      d[i] = f(5) * 255; d[i + 1] = f(3) * 255; d[i + 2] = f(1) * 255; d[i + 3] = r > 1 ? Math.round((1.01 - r) * 100 * 255) : 255;
    }
    g.putImageData(img, 0, 0);
  }
  function paint(live = true) {
    const R = (wh.clientWidth || 180) / 2, a = hsv.h * Math.PI / 180, hex = cur();
    knob.style.left = (R + Math.cos(a) * hsv.s * R) + 'px'; knob.style.top = (R + Math.sin(a) * hsv.s * R) + 'px';
    knob.style.setProperty('--c', hex); sw.style.setProperty('--c', hex); box.style.setProperty('--c', hex);
    knob.setAttribute('aria-valuenow', String(Math.round(hsv.h))); knob.setAttribute('aria-valuetext', hex);
    if (document.activeElement !== hexI) hexI.value = hex; vI.value = Math.round(hsv.v * 100); vI.style.setProperty('--c', hsv2hex(hsv.h, hsv.s, 1));
    $$('[data-cwp]', box).forEach(b => b.classList.toggle('on', b.dataset.cwp === hex));
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
    live && onLive && onLive(hex);
  }
  const pick = e => { const r = wh.getBoundingClientRect(), R = r.width / 2, dx = e.clientX - r.left - R, dy = e.clientY - r.top - R; hsv.h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; hsv.s = Math.min(1, Math.hypot(dx, dy) / R); paint(); };
  wh.addEventListener('pointerdown', e => { e.preventDefault(); wh.setPointerCapture && wh.setPointerCapture(e.pointerId); pick(e); knob.focus({ preventScroll: true }); const mv = ev => pick(ev), up = () => { wh.removeEventListener('pointermove', mv); wh.removeEventListener('pointerup', up); wh.removeEventListener('pointercancel', up); }; wh.addEventListener('pointermove', mv); wh.addEventListener('pointerup', up); wh.addEventListener('pointercancel', up); });
  knob.addEventListener('keydown', e => { const k = e.key; if (!/^Arrow/.test(k)) return; e.preventDefault(); if (k === 'ArrowLeft') hsv.h = (hsv.h + 355) % 360; if (k === 'ArrowRight') hsv.h = (hsv.h + 5) % 360; if (k === 'ArrowUp') hsv.s = Math.min(1, hsv.s + .05); if (k === 'ArrowDown') hsv.s = Math.max(0, hsv.s - .05); paint(); });
  vI.addEventListener('input', () => { hsv.v = +vI.value / 100; paint(); });
  hexI.addEventListener('input', () => { const v = hexI.value.trim().toLowerCase(), x = v[0] === '#' ? v : '#' + v; if (/^#[0-9a-f]{6}$/.test(x)) { hsv = hex2hsv(x); hsv.v = Math.max(.35, hsv.v); paint(); } });
  hexI.addEventListener('blur', () => { hexI.value = cur(); });
  box.addEventListener('click', async e => {
    const p = e.target.closest('[data-cwp]'); if (p) { hsv = hex2hsv(p.dataset.cwp); paint(); return; }
    const sv = e.target.closest('[data-cwsave]'); if (sv) { busyBtn(sv, true); try { await onSave(cur()); } finally { busyBtn(sv, false); } return; }
    if (e.target.closest('[data-cwreset]')) { hsv = hex2hsv('#c8b6ff'); paint(false); onLive && onLive(null); onSave(null); }
  });
  addEventListener('resize', () => document.contains(box) && paint(false), { passive: true });
  paint(false); requestAnimationFrame(() => paint(false));
}
/* ---- titles picker on /me ---- */
function titlePickHtml(u) {
  const got = new Set(u.ach || []);
  return `<div class="look-sec"><h3 class="look-h">${esc(tr('Title', 'Титул'))}<span class="look-hn">${got.size}/${Object.keys(ACH_D).length}</span></h3><div class="ttl-opts" role="radiogroup" aria-label="${esc(tr('Title', 'Титул'))}">
   <button type="button" role="radio" class="ttl-opt none" data-ttl="" aria-checked="${!u.title}"><span class="ttl sm">${ic('x')}<span>${esc(tr('No title', 'Без титула'))}</span></span></button>
   ${Object.keys(ACH_D).map(k => { const on = got.has(k), a = ACH_D[k]; return `<button type="button" role="radio" class="ttl-opt${on ? '' : ' locked'}" data-ttl="${k}" aria-checked="${u.title === k}"${on ? '' : ` aria-disabled="true" data-tip="${esc(tr('Locked: ', 'Закрыто: ') + tr(a[3], a[4]))}"`}><span class="ttl sm" style="--th:${a[5]}">${ic(on ? a[0] : 'lock')}<span>${esc(tr(a[1], a[2]))}</span></span></button>`; }).join('')}</div>
   <p class="faint look-note">${esc(tr('Titles are round and sit under the name; badges have their own shapes.', 'Титулы – круглые, они стоят под именем; у значков свои формы.'))}</p></div>`;
}
/* ---- music card on /me ---- */
const fmtMB = n => (n / 1048576).toFixed(n < 1048576 ? 2 : 1) + ' ' + tr('MB', 'МБ');
function musCurHtml(u) {
  const m = u && u.music;
  return `${m ? mpHtml(m, 'mp-me') : `<div class="mus-empty">${ic('disc')}<span><b>${esc(tr('No track yet', 'Трека пока нет'))}</b><small>${esc(tr('It will play in your profile, like in Telegram.', 'Он будет играть в профиле, как в Telegram.'))}</small></span></div>`}
  <div class="row mus-acts"><label class="pill pill-sm ${m ? 'pill-glass' : 'pill-white'} file-btn">${ic('upload')} ${esc(m ? tr('Replace', 'Заменить') : tr('Upload a track', 'Загрузить трек'))}<input type="file" accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav" data-musfile hidden></label>${m ? `<button type="button" class="pill pill-sm pill-glass" data-musedit>${ic('pen')} ${esc(tr('Edit', 'Изменить'))}</button><button type="button" class="txt-btn" data-musdel>${ic('trash')} ${esc(tr('Remove', 'Убрать'))}</button>` : ''}</div>
  ${m ? `<div class="mus-shape"><span>${esc(tr('Cover shape', 'Форма обложки'))}</span><div class="seg" role="group" aria-label="${esc(tr('Cover shape', 'Форма обложки'))}">${[['round', tr('Round', 'Круглая')], ['square', tr('Square', 'Квадратная')]].map(([k, l]) => `<button type="button" data-musshape="${k}" aria-pressed="${(m.shape || 'round') === k}">${esc(l)}</button>`).join('')}</div></div>` : ''}
  <p class="faint look-note">${esc(tr('MP3, M4A, FLAC, OGG or WAV up to 6 MB. The title, artist and cover are read from the file.', 'MP3, M4A, FLAC, OGG или WAV до 6 МБ. Название, исполнитель и обложка читаются из файла.'))}</p>`;
}
function musicCardHtml(u) {
  return `<section class="glass panel me-card me-music" data-mus><h2 class="grp-title">${ic('music')} ${esc(tr('Music', 'Музыка'))}</h2>
  <p class="faint me-note">${esc(tr('Show a track in your profile: upload a file or add a Spotify link.', 'Покажи трек в профиле: загрузи файл или добавь ссылку на Spotify.'))}</p>
  <div class="look-sec"><h3 class="look-h">${esc(tr('Your track', 'Свой трек'))}</h3><div class="mus-cur" data-muscur>${musCurHtml(u)}</div></div>
  <form class="look-sec" data-spf novalidate><h3 class="look-h">${ic('spotify')} Spotify</h3>
   ${fld({ name: 'spotify', label: tr('Link to a track, album or playlist', 'Ссылка на трек, альбом или плейлист'), icon: 'link', value: u.spotify ? spotifyUrl(u.spotify) : '', ph: 'https://open.spotify.com/track/…', extra: 'inputmode="url" maxlength="300"' })}
   <div class="row"><button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('save')} ${esc(t('profile.save'))}</button>${u.spotify ? `<button type="button" class="txt-btn" data-sprm>${ic('trash')} ${esc(tr('Remove', 'Убрать'))}</button>` : ''}</div>
   <div class="spot-prev" data-spprev>${u.spotify ? spotifyHtml(u.spotify, true) : ''}</div>
   <p class="faint look-note">${esc(tr('Spotify shows its own player; full tracks play for those signed in to Spotify.', 'Spotify показывает свой плеер; полностью треки играют у тех, кто вошёл в Spotify.'))}</p></form></section>`;
}
function musicDialog(file, done) {
  const mime = musMime(file);
  if (!mime) return toast(errText({ code: 'music_bad' }));
  if (file.size > MUS.max) return toast(errText({ code: 'music_big' }));
  Promise.all([readTags(file), audioDur(file)]).then(async ([tags, dur]) => {
    let cover = await coverJpeg(tags.pic), busy = false;
    const cvHtml = () => cover ? `<img src="${cover}" alt="">` : `<span class="mp-ph">${ic('music')}</span>`;
    openDialog({
      title: tr('New track', 'Новый трек'), cls: 'mus-dlg',
      body: `<form data-mf novalidate><div class="mus-head"><label class="mus-cv" data-tip="${esc(tr('Change the cover', 'Сменить обложку'))}"><span data-mcv>${cvHtml()}</span><span class="mus-cvb">${ic('camera')}</span><input type="file" accept="image/*" data-mcvf class="sr-only" aria-label="${esc(tr('Cover', 'Обложка'))}"></label>
       <div class="mus-info"><b>${esc(file.name)}</b><small>${esc(fmtMB(file.size))}${dur ? ' · ' + fmtDur(dur) : ''}</small><button type="button" class="txt-btn" data-mcvrm${cover ? '' : ' hidden'}>${ic('trash')} ${esc(tr('Without a cover', 'Без обложки'))}</button></div></div>
       ${fld({ name: 'mtitle', label: tr('Title', 'Название'), icon: 'music', value: tags.title, max: 120 })}
       ${fld({ name: 'martist', label: tr('Artist', 'Исполнитель'), icon: 'user', value: tags.artist, max: 120 })}
       ${fld({ name: 'malbum', label: tr('Album', 'Альбом'), icon: 'disc', value: tags.album, max: 120 })}
       <div class="mus-prog" data-mprog hidden><span class="mus-bar"><i></i></span><small data-mpct>0%</small></div></form>`,
      actions: `<button class="pill pill-outline" data-close>${esc(tr('Cancel', 'Отмена'))}</button><button class="pill pill-white" data-mgo><span class="spin" aria-hidden="true"></span>${ic('upload')} ${esc(tr('Upload', 'Загрузить'))}</button>`,
      onOpen: (d, close) => {
        const f = $('[data-mf]', d); bindFields(f);
        const setCv = () => { $('[data-mcv]', d).innerHTML = cvHtml(); $('[data-mcvrm]', d).hidden = !cover; };
        $('[data-mcvf]', d).addEventListener('change', async e => { const x = e.target.files && e.target.files[0]; e.target.value = ''; if (!x) return; const c = await coverJpeg(x); if (c) { cover = c; setCv(); } else toast(errText({ code: 'cover_bad' })); });
        $('[data-mcvrm]', d).addEventListener('click', () => { cover = null; setCv(); });
        const go = async e => {
          e && e.preventDefault(); if (busy) return; busy = true;
          const b = $('[data-mgo]', d), pr = $('[data-mprog]', d); busyBtn(b, true); pr.hidden = false;
          const meta = { title: f.elements.mtitle.value.trim(), artist: f.elements.martist.value.trim(), album: f.elements.malbum.value.trim(), dur };
          try {
            const user = await musicUpload(file, meta, cover, p => { pr.style.setProperty('--p', Math.round(p * 100) + '%'); $('[data-mpct]', d).textContent = Math.round(p * 100) + '%'; });
            if (user) Auth.setUser(user); close('ok'); toast(tr('The track is in your profile', 'Трек появился в профиле')); done && done();
          } catch (ex) { toast(errText(ex)); pr.hidden = true; } finally { busy = false; document.contains(b) && busyBtn(b, false); }
        };
        f.addEventListener('submit', go); $('[data-mgo]', d).addEventListener('click', go);
      }
    });
  });
}
function musMetaDialog(done) {
  const m = Auth.user && Auth.user.music; if (!m) return;
  openDialog({
    title: tr('Edit the track', 'Изменить трек'), cls: 'mus-dlg',
    body: `<form data-mm novalidate>${fld({ name: 'mtitle', label: tr('Title', 'Название'), icon: 'music', value: m.title || '', max: 120 })}${fld({ name: 'martist', label: tr('Artist', 'Исполнитель'), icon: 'user', value: m.artist || '', max: 120 })}</form>`,
    actions: `<button class="pill pill-outline" data-close>${esc(tr('Cancel', 'Отмена'))}</button><button class="pill pill-white" data-mok><span class="spin" aria-hidden="true"></span>${ic('save')} ${esc(t('profile.save'))}</button>`,
    onOpen: (d, close) => {
      const f = $('[data-mm]', d); bindFields(f);
      const go = async e => { e && e.preventDefault(); const b = $('[data-mok]', d); busyBtn(b, true); try { const j = await api('music', { method: 'POST', body: { op: 'meta', title: f.elements.mtitle.value.trim(), artist: f.elements.martist.value.trim() } }); Auth.setUser(j.user); close('ok'); toast(t('profile.saved')); done && done(); } catch (ex) { toast(errText(ex)); busyBtn(b, false); } };
      f.addEventListener('submit', go); $('[data-mok]', d).addEventListener('click', go);
    }
  });
}
function bindMusicCard(root, relayout) {
  const box = $('[data-mus]', root); if (!box) return;
  const repaint = () => { const c = $('[data-muscur]', box); if (c) c.innerHTML = musCurHtml(Auth.user); mpState(); mpPaint(); relayout && relayout(); };
  box.addEventListener('change', e => { const inp = e.target.closest('[data-musfile]'); if (!inp) return; const f = inp.files && inp.files[0]; inp.value = ''; if (f) musicDialog(f, repaint); });
  const sf = $('[data-spf]', box); bindFields(sf);
  const spSave = async val => {
    const b = $('button[type=submit]', sf); busyBtn(b, true);
    try { const j = await api('profile', { method: 'PATCH', body: { spotify: val } }); Auth.setUser(j.user); sf.elements.spotify.value = j.user.spotify ? spotifyUrl(j.user.spotify) : ''; $('[data-spprev]', box).innerHTML = j.user.spotify ? spotifyHtml(j.user.spotify, true) : ''; const rm = $('[data-sprm]', sf); if (rm) rm.hidden = !j.user.spotify; else if (j.user.spotify) $('.row', sf).insertAdjacentHTML('beforeend', `<button type="button" class="txt-btn" data-sprm>${ic('trash')} ${esc(tr('Remove', 'Убрать'))}</button>`); toast(t('profile.saved')); relayout && relayout(); }
    catch (ex) { setMsg(sf, 'spotify', errText(ex)); } finally { busyBtn(b, false); }
  };
  sf.addEventListener('submit', e => { e.preventDefault(); const raw = sf.elements.spotify.value.trim(); if (!raw) return spSave(null); const s = spotifyParse(raw); if (!s) return setMsg(sf, 'spotify', errText({ code: 'spotify_bad' })); spSave(raw); });
  box.addEventListener('click', async e => {
    const sh = e.target.closest('[data-musshape]'); if (sh) { if (sh.dataset.musshape === (Auth.user.music.shape || 'round')) return; busyBtn(sh, true); try { const j = await api('music', { method: 'POST', body: { op: 'shape', shape: sh.dataset.musshape } }); Auth.setUser(j.user); repaint(); toast(t('profile.saved')); } catch (ex) { toast(errText(ex)); busyBtn(sh, false); } return; }
    if (e.target.closest('[data-musedit]')) return musMetaDialog(repaint);
    if (e.target.closest('[data-sprm]')) return spSave(null);
    if (e.target.closest('[data-musdel]')) {
      if (!(await confirmDlg(tr('Remove the track from your profile?', 'Убрать трек из профиля?')))) return;
      try { const was = Auth.user.music && Auth.user.music.url; const j = await api('music', { method: 'POST', body: { op: 'delete' } }); if (MP.a && MP.url === was) { MP.a.pause(); MP.url = ''; } Auth.setUser(j.user); repaint(); toast(tr('The track was removed', 'Трек убран')); }
      catch (ex) { toast(errText(ex)); }
    }
  });
}

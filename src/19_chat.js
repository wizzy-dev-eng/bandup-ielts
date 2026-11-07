/* ---------- chat: the global room, groups and private messages (private ones are end-to-end encrypted) ---------- */
var CH_DEC = new Map(), CH_PEND = new Map(), CH_STK = { list: null, at: 0, p: null, can: false };
function chStickers(force) {
  if (!force && CH_STK.list && Date.now() - CH_STK.at < 300e3) return Promise.resolve(CH_STK.list);
  if (CH_STK.p) return CH_STK.p;
  CH_STK.p = api('stickers').then(j => { CH_STK.list = j.stickers || []; CH_STK.can = !!j.canManage; CH_STK.at = Date.now(); return CH_STK.list; }).finally(() => { CH_STK.p = null; });
  return CH_STK.p;
}
on('stickers', () => { CH_STK.at = 0; });
on('auth', () => { CH_DEC.clear(); CH_PEND.clear(); });
const CH_RE = /^\/chat(?:\/(\d+))?$/, CH_GAP = 5 * 60e3;
const EMO_RU = ['Смайлы и эмоции', 'Люди и тело', 'Компоненты', 'Животные и природа', 'Еда и напитки', 'Путешествия и места', 'Занятия', 'Предметы', 'Символы', 'Флаги'];
const chLoc = () => lang === 'ru' ? 'ru-RU' : 'en-GB';
const chTime = d => new Date(d).toLocaleTimeString(chLoc(), { hour: '2-digit', minute: '2-digit' });
function chDay(d) {
  const x = new Date(d), n = new Date(), y = new Date(n.getTime() - 864e5);
  if (x.toDateString() === n.toDateString()) return tr('Today', 'Сегодня');
  if (x.toDateString() === y.toDateString()) return tr('Yesterday', 'Вчера');
  return x.toLocaleDateString(chLoc(), { day: 'numeric', month: 'long', ...(x.getFullYear() !== n.getFullYear() ? { year: 'numeric' } : {}) });
}
function chStamp(d) {
  const x = new Date(d), n = new Date();
  if (x.toDateString() === n.toDateString()) return chTime(d);
  if (n - x < 6 * 864e5) return x.toLocaleDateString(chLoc(), { weekday: 'short' });
  return x.toLocaleDateString(chLoc(), { day: 'numeric', month: 'short' });
}
/* plain text → safe HTML with links and @mentions */
function chText(s) {
  return String(s).split(/(https?:\/\/[^\s<>"]+|(?<![\w@])@[A-Za-z0-9_]{2,40})/g).map((p, i) => {
    if (!(i % 2)) return esc(p);
    if (p[0] === '@') return `<a class="cm-at" href="#/u/${esc(p.slice(1))}">${esc(p)}</a>`;
    const m = p.match(/^(.*?)([.,:;!?)\]]*)$/);
    return `<a href="${esc(m[1])}" target="_blank" rel="noopener noreferrer nofollow">${esc(m[1])}</a>${esc(m[2])}`;
  }).join('');
}
const chBig = s => { s = String(s).trim(); return s.length <= 18 && /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s)+$/u.test(s) && (s.match(/\p{Extended_Pictographic}/gu) || []).length <= 3; };
function chSys(m, users, html) {
  let j = {}; try { j = JSON.parse(m.body || '{}') || {}; } catch (e) { }
  const nm = l => { const u = l && users && users[l], s = u && u.nick ? u.nick : l ? '@' + l : tr('Someone', 'Кто-то'); return html ? `<b>${esc(s)}</b>` : s; };
  const a = nm(m.by), b = nm(j.l), n = '«' + (html ? esc(j.n || '') : (j.n || '')) + '»';
  return ({
    create: tr(`${a} created the group ${n}`, `${a} создал(а) группу ${n}`), add: tr(`${a} added ${b}`, `${a} добавил(а) ${b}`),
    kick: tr(`${a} removed ${b}`, `${a} исключил(а) ${b}`), rename: tr(`${a} renamed the group to ${n}`, `${a} переименовал(а) группу в ${n}`),
    leave: tr(`${a} left the group`, `${a} покинул(а) группу`), pin: tr(`${a} pinned a message`, `${a} закрепил(а) сообщение`)
  })[j.t] || (html ? '…' : '');
}
/* decrypt with a per-session cache: { t } = text, null = cannot be read on this device, undefined = keys are locked */
async function chDecrypt(id, body) {
  if (CH_DEC.has(id)) return CH_DEC.get(id);
  if (CH_PEND.has(id)) return CH_PEND.get(id);
  const p = (async () => {
    if (!Auth.user || !(await E2E.local(Auth.user.login))) return undefined;
    let r; try { r = { t: await E2E.open(body) }; } catch (e) { r = null; }
    CH_DEC.set(id, r); return r;
  })();
  CH_PEND.set(id, p); p.finally(() => CH_PEND.delete(id)); return p;
}
const chName = c => c.kind === 'global' ? tr('Global chat', 'Общий чат') : c.kind === 'dm' ? (c.peer ? c.peer.nick || c.peer.login : tr('Deleted account', 'Удалённый аккаунт')) : c.title;
function chAv(c, s) {
  if (c.kind === 'global') return `<span class="av ch-gav" style="--s:${s}px">${logoSvg(Math.round(s * .54))}</span>`;
  if (c.kind === 'group') return `<span class="av ch-grp" style="--s:${s}px;--h:${hashHue('g' + c.id + (c.title || ''))}">${ic('users')}</span>`;
  return avatarHtml(c.peer ? { ...c.peer, frame: null } : null, s);
}
const chTicks = () => `<svg class="cm-tk" viewBox="0 0 20 12" aria-hidden="true"><path d="M1.5 6.6 4.8 9.8 11.5 2.6"/><path class="t2" d="M8.6 9.8 15.6 2.6"/></svg>`;
const chDots = () => `<span class="ch-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;

route(CH_RE, (v, [cid0]) => {
  if (!Auth.user) { goHash('#/login?next=' + encodeURIComponent(location.hash || '#/chat')); return { title: t('auth.login') }; }
  const me = Auth.user, myL = me.login, coarse = matchMedia('(pointer: coarse)').matches;
  v.innerHTML = `<div class="page ch-page"><div class="ch-app glass" data-app>
   <aside class="ch-side" aria-label="${esc(tr('Chat list', 'Список чатов'))}">
    <div class="ch-sh"><h1 class="ch-h display" tabindex="-1"><span class="grad">${esc(tr('Chats', 'Чаты'))}</span></h1><button type="button" class="icon-btn ch-newb" data-new data-tip="${esc(tr('New chat', 'Новый чат'))}" aria-label="${esc(tr('New chat', 'Новый чат'))}">${ic('plus')}</button></div>
    <div class="seg ch-tabs"><button type="button" data-ctab="chats" aria-pressed="true">${ic('chat')}<span>${esc(tr('Chats', 'Чаты'))}</span><b class="ch-tn" data-tn="chats"></b></button><button type="button" data-ctab="friends" aria-pressed="false">${ic('users')}<span>${esc(tr('Friends', 'Друзья'))}</span><b class="ch-tn" data-tn="friends"></b></button></div>
    <label class="ch-find">${ic('search')}<input type="search" data-find placeholder="${esc(tr('Search', 'Поиск'))}" aria-label="${esc(tr('Search chats and friends', 'Поиск по чатам и друзьям'))}" autocomplete="off" spellcheck="false"></label>
    <div class="ch-list" data-list>${'<div class="ch-sk"><i></i><span><b></b><s></s></span></div>'.repeat(5)}</div>
   </aside>
   <section class="ch-main" data-main></section></div></div>`;
  const app = $('[data-app]', v), listBox = $('[data-list]', v), main = $('[data-main]', v), find = $('[data-find]', v);
  let list = null, friends = null, tab = 'chats', filter = '', S = null, alive = true, tl = 0, tm = 0, tf = 0, pendN = 0, decLater = 0;
  const dead = () => !alive;
  const allChats = () => list ? [...(list.global ? [list.global] : []), ...list.chats] : [];
  const findChat = id => allChats().find(c => c.id === id);

  /* ---------- side list ---------- */
  function lastHtml(c) {
    const l = c.last; if (!l) return `<i>${esc(c.kind === 'group' ? tr('The group was created', 'Группа создана') : tr('No messages yet', 'Сообщений пока нет'))}</i>`;
    if (l.kind === 'sys') return esc(chSys({ body: l.body, by: l.by }, l.by ? { [l.by]: { nick: l.nick } } : {}, false));
    const who = l.by === myL ? tr('You: ', 'Вы: ') : c.kind !== 'dm' && l.nick ? l.nick + ': ' : '';
    let body;
    if (l.kind === 'sticker') body = `${ic('sticker')} ${esc(tr('Sticker', 'Стикер'))}`;
    else if (l.enc) { const d = CH_DEC.get(l.id); if (d) body = esc(d.t.replace(/\s+/g, ' ')); else { body = `${ic('lock')} ${esc(tr('Encrypted message', 'Зашифрованное сообщение'))}`; if (d === undefined && !CH_PEND.has(l.id)) chDecrypt(l.id, l.body).then(r => { if (r && !dead()) { clearTimeout(decLater); decLater = setTimeout(paintList, 60); } }); } }
    else body = esc(String(l.body).replace(/\s+/g, ' '));
    return (who ? `<span class="ch-who-p">${esc(who)}</span>` : '') + body;
  }
  function itemHtml(c) {
    const on = S && S.id === c.id, at = c.last ? c.last.at : c.at;
    const pinB = c.kind === 'global' ? '' : `<button type="button" class="ch-ipin${c.pinned ? ' on' : ''}" data-cpin="${c.id}" aria-pressed="${!!c.pinned}" aria-label="${esc(c.pinned ? tr('Unpin the chat', 'Открепить чат') : tr('Pin the chat', 'Закрепить чат'))}" data-tip="${esc(c.pinned ? tr('Unpin', 'Открепить') : tr('Pin to the top', 'Закрепить наверху'))}">${ic(c.pinned ? 'pinOff' : 'pin')}</button>`;
    return `<div class="ch-iw${c.pinned ? ' pinned' : ''}"><a class="ch-it${on ? ' on' : ''}${c.unread ? ' unr' : ''}" href="#/chat/${c.id}" data-cid="${c.id}"${on ? ' aria-current="page"' : ''}>${chAv(c, 46)}<span class="ch-it-t"><b>${esc(chName(c))}${c.kind === 'global' ? `<span class="ch-pin" aria-hidden="true">${ic('globe')}</span>` : ''}${c.kind === 'dm' && c.peer && c.peer.pub ? `<span class="ch-pin" aria-label="${esc(tr('encrypted', 'зашифровано'))}">${ic('lock')}</span>` : ''}</b><small>${lastHtml(c)}</small></span><span class="ch-it-m"><span class="ch-it-tm">${c.pinned ? `<span class="ch-pn" aria-label="${esc(tr('pinned', 'закреплён'))}">${ic('pin')}</span>` : ''}${at ? `<time datetime="${esc(at)}">${esc(chStamp(at))}</time>` : ''}</span>${c.unread ? `<b class="ch-un" aria-label="${esc(tr(`${c.unread} unread`, `непрочитанных: ${c.unread}`))}">${c.unread > 99 ? '99+' : c.unread}</b>` : ''}</span></a>${pinB}</div>`;
  }
  const frRow = (u, acts) => `<div class="ch-fr">${avatarHtml({ ...u, frame: null }, 42)}<a class="ch-fr-t" href="#/u/${esc(u.login)}"><b>${esc(u.nick || u.login)}</b><small>@${esc(u.login)}</small></a><span class="ch-fr-a">${acts}</span></div>`;
  const frBtn = (op, l, icon, label, cls = '') => `<button type="button" class="icon-btn ${cls}" data-fra="${op}" data-l="${esc(l)}" data-tip="${esc(label)}" aria-label="${esc(label + ' – @' + l)}">${ic(icon)}</button>`;
  function friendsHtml() {
    if (!friends) return loadingHtml();
    const f = filter.toLowerCase(), m = u => !f || (u.nick || '').toLowerCase().includes(f) || u.login.toLowerCase().includes(f);
    const inc = friends.incoming.filter(m), fr = friends.friends.filter(m), out = friends.outgoing.filter(m);
    let h = `<form class="ch-addfr" data-addfr novalidate><label class="ch-find ch-af">${ic('userPlus')}<input name="login" placeholder="${esc(tr('Add a friend by login', 'Добавить друга по логину'))}" aria-label="${esc(tr('Login of a friend', 'Логин друга'))}" autocomplete="off" spellcheck="false" autocapitalize="off" maxlength="41"></label><button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${esc(tr('Add', 'Добавить'))}</button></form>`;
    if (inc.length) h += `<p class="ch-sec">${esc(tr('Friend requests', 'Заявки в друзья'))} · ${inc.length}</p>` + inc.map(u => frRow(u, frBtn('accept', u.login, 'check', tr('Accept', 'Принять'), 'ok') + frBtn('decline', u.login, 'x', tr('Decline', 'Отклонить')))).join('');
    h += `<p class="ch-sec">${esc(tr('Friends', 'Друзья'))} · ${fr.length}</p>`;
    h += fr.length ? fr.map(u => frRow(u, frBtn('dm', u.login, 'chat', tr('Message', 'Написать'), 'ok') + frBtn('remove', u.login, 'userMinus', tr('Remove from friends', 'Удалить из друзей')))).join('')
      : `<div class="ch-none">${ic('users')}<p>${esc(f ? tr('Nobody found.', 'Никого не нашлось.') : tr('No friends yet. Find people on the People page or add someone by login.', 'Друзей пока нет. Найди людей на странице «Люди» или добавь по логину.'))}</p>${f ? '' : `<a class="pill pill-glass pill-sm" href="#/people">${ic('people')} ${esc(t('people.title'))}</a>`}</div>`;
    if (out.length) h += `<p class="ch-sec">${esc(tr('Sent requests', 'Отправленные заявки'))} · ${out.length}</p>` + out.map(u => frRow(u, frBtn('cancel', u.login, 'x', tr('Cancel the request', 'Отменить заявку')))).join('');
    return h;
  }
  function paintTabs() {
    const n = friends ? friends.incoming.length : 0, c = $('[data-tn="friends"]', v); if (c) { c.textContent = n || ''; c.classList.toggle('on', n > 0); }
    const u = list ? allChats().reduce((s, c) => s + (c.unread ? 1 : 0), 0) : 0, d = $('[data-tn="chats"]', v); if (d) { d.textContent = u || ''; d.classList.toggle('on', u > 0); }
  }
  function paintList() {
    if (dead()) return; paintTabs();
    const y = listBox.scrollTop;
    if (tab === 'friends') {
      const keep = $('[data-addfr] input', listBox), val = keep ? keep.value : '', foc = keep && document.activeElement === keep;
      listBox.innerHTML = friendsHtml();
      const ni = $('[data-addfr] input', listBox); if (ni && val) ni.value = val;
      if (ni) acAttach(ni, { exclude: () => friends ? [...friends.friends, ...friends.outgoing, ...friends.incoming].map(u => u.login) : [] });
      if (ni && foc) { ni.focus(); if (val) ni.dispatchEvent(new Event('input')); }
    } else if (list) {
      const f = filter.toLowerCase(), items = allChats().filter(c => !f || chName(c).toLowerCase().includes(f) || (c.peer && c.peer.login.toLowerCase().includes(f)));
      listBox.innerHTML = items.length ? items.map(itemHtml).join('') + (list.chats.length || f ? '' : `<div class="ch-none ch-tip">${ic('sparkle')}<p>${esc(tr('Start a private chat or make a group with friends: press + above.', 'Начни личный чат или собери группу с друзьями: нажми + вверху.'))}</p></div>`) : `<div class="ch-none">${ic('search')}<p>${esc(tr('Nothing found.', 'Ничего не найдено.'))}</p></div>`;
    }
    listBox.scrollTop = y;
  }
  async function loadList() {
    try {
      list = await api('chats'); if (dead()) return;
      if (S && S.chat && S.chat.kind === 'dm') { const c = findChat(S.id); if (c && c.peer && S.chat.peer && c.peer.pub !== S.chat.peer.pub) { S.chat.peer.pub = c.peer.pub; paintHead(S); paintFoot(S); } }
      if (S) { const c = findChat(S.id); if (c) c.unread = 0; }
      paintList();
    } catch (e) { if (dead()) return; if (e.status === 401) return Auth.refresh(); if (!list) { listBox.innerHTML = errorCard(e, true); const r = $('[data-retry]', listBox); r && r.addEventListener('click', () => { listBox.innerHTML = loadingHtml(); loadList(); }); } }
  }
  const listLoop = async () => { clearTimeout(tl); if (document.visibilityState === 'visible') await loadList(); if (!dead()) tl = setTimeout(listLoop, 8000); };
  async function loadFriends() { try { friends = await api('friends'); if (dead()) return; paintTabs(); if (tab === 'friends') paintList(); } catch (e) { if (!friends && tab === 'friends' && !dead()) listBox.innerHTML = errorCard(e, false); } }
  const frLoop = async () => { clearTimeout(tf); if (document.visibilityState === 'visible') await loadFriends(); if (!dead()) tf = setTimeout(frLoop, tab === 'friends' ? 10000 : 30000); };
  async function startDm(login, btn) {
    btn && busyBtn(btn, true);
    try { const j = await api('chat', { method: 'POST', body: { op: 'dm', login } }); setTab('chats'); location.hash = '#/chat/' + j.id; loadList(); }
    catch (ex) { toast(errText(ex)); } finally { btn && document.contains(btn) && busyBtn(btn, false); }
  }
  async function pinChat(id, btn) {
    const c = findChat(id); if (!c || c.kind === 'global') return; const on = !c.pinned;
    btn && (btn.disabled = true);
    try { await api('chat', { method: 'POST', body: { op: 'pin_chat', chat: id, on } }); c.pinned = on; toast(on ? tr('The chat is pinned', 'Чат закреплён') : tr('The chat is unpinned', 'Чат откреплён')); await loadList(); if (S && S.id === id && S.chat) paintHead(S); }
    catch (ex) { toast(errText(ex)); } finally { btn && document.contains(btn) && (btn.disabled = false); }
  }
  function setTab(k) { if (tab === k) return; tab = k; $$('[data-ctab]', v).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ctab === k))); paintList(); if (k === 'friends') frLoop(); }
  $('.ch-side', v).addEventListener('click', async e => {
    const tb = e.target.closest('[data-ctab]'); if (tb) return setTab(tb.dataset.ctab);
    if (e.target.closest('[data-new]')) return newChatDialog(friends ? friends.friends : []);
    const cpb = e.target.closest('[data-cpin]'); if (cpb) { e.preventDefault(); return pinChat(+cpb.dataset.cpin, cpb); }
    const fa = e.target.closest('[data-fra]'); if (!fa) return;
    const op = fa.dataset.fra, l = fa.dataset.l;
    if (op === 'dm') return startDm(l, fa);
    if (op === 'remove' && !(await confirmDlg(tr(`Remove @${l} from friends?`, `Удалить @${l} из друзей?`)))) return;
    busyBtn(fa, true);
    try { await api('friends', { method: 'POST', body: { op, login: l } }); toast({ accept: tr('You are friends now', 'Теперь вы друзья'), decline: tr('Request declined', 'Заявка отклонена'), cancel: tr('Request cancelled', 'Заявка отменена'), remove: tr('Removed from friends', 'Удалено из друзей') }[op]); await loadFriends(); Auth.pollUnread(); }
    catch (ex) { toast(errText(ex)); busyBtn(fa, false); }
  });
  listBox.addEventListener('submit', async e => {
    const f = e.target.closest('[data-addfr]'); if (!f) return; e.preventDefault();
    const l = f.login.value.trim().replace(/^@/, ''); if (!l) return f.login.focus();
    const b = $('button[type=submit]', f); busyBtn(b, true);
    try { const j = await api('friends', { method: 'POST', body: { op: 'add', login: l } }); f.login.value = ''; toast(j.rel === 'friends' ? tr('You are friends now', 'Теперь вы друзья') : tr('Request sent', 'Заявка отправлена')); await loadFriends(); }
    catch (ex) { toast(errText(ex)); } finally { busyBtn(b, false); }
  });
  find.addEventListener('input', debounce(() => { filter = find.value.trim(); paintList(); }, 120));

  /* ---------- conversation ---------- */
  function e2eMode(st) {
    const c = st.chat; if (!c || c.kind !== 'dm') return 'none';
    if (!E2E.ok) return 'off';
    if (!st.localOk) return 'locked';
    return c.peer && c.peer.pub ? 'on' : 'off';
  }
  function msgHtml(st, m, prev, anim) {
    let h = '';
    const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
    if (newDay) h += `<li class="cm-day" role="separator"><span>${esc(chDay(m.at))}</span></li>`;
    if (m.deleted) return '';
    if (m.kind === 'sys') { let g = 0; try { const x = JSON.parse(m.body || '{}'); if (x && x.t === 'pin') g = +x.m || 0; } catch (e) { } return h + `<li class="cm-sys${anim ? ' in' : ''}${g ? ' go' : ''}" data-mid="${m.id}"${g ? ` data-goto="${g}"` : ''}><span>${g ? ic('pin') : ''}${chSys(m, st.users, true)}</span></li>`; }
    const dm = st.chat.kind === 'dm', mine = m.mine, u = st.users[m.by] || { login: m.by || '', nick: m.by || tr('Deleted account', 'Удалённый аккаунт') };
    const cont = !newDay && prev && prev.kind !== 'sys' && prev.by === m.by && new Date(m.at) - new Date(prev.at) < CH_GAP;
    let body, txt = null, big = false, stk = false;
    if (m.kind === 'sticker') { const su = st.stk[m.body]; stk = true; body = su ? `<img class="cm-stk" src="${esc(su)}" alt="${esc(tr('Sticker', 'Стикер'))}" width="150" height="150" loading="lazy" decoding="async" draggable="false">` : `<span class="cm-del">${ic('sticker')} ${esc(tr('Sticker', 'Стикер'))}</span>`; }
    else if (m.enc) {
      const d = CH_DEC.get(m.id);
      if (!d && !st.localOk) body = `<span class="cm-nodec">${ic('lock')} ${esc(tr('Encrypted – unlock below to read', 'Зашифровано – разблокируй ниже, чтобы прочитать'))}</span>`;
      else if (d) { txt = d.t; big = chBig(txt); body = chText(txt); }
      else if (d === null) body = `<span class="cm-nodec">${ic('lock')} ${esc(tr('Cannot be decrypted on this device', 'Не удаётся расшифровать на этом устройстве'))}</span>`;
      else body = `<span class="cm-dec" data-dec>${ic('lock')} ${esc(tr('Decrypting…', 'Расшифровка…'))}</span>`;
    } else { txt = m.body; big = chBig(txt); body = chText(txt); }
    const head = !cont && !mine && !dm ? `<a class="cm-nm" href="#/u/${esc(u.login)}" style="--h:${hashHue(u.login)}">${esc(u.nick || u.login)}${isStaffU(u) ? `<span class="cm-st" data-tip="${esc(tr('Site staff', 'Администрация сайта'))}">${ic('shield')}</span>` : ''}${u.premium ? `<span class="cm-pm" aria-label="Premium">${ic('crown')}</span>` : ''}</a>` : '';
    const av = !mine && !dm ? (cont ? '<span class="cm-av"></span>' : `<a class="cm-av" href="#/u/${esc(u.login)}" tabindex="-1" aria-hidden="true">${avatarHtml({ ...u, frame: null }, 34)}</a>`) : '';
    const canDel = !m.pend && (mine || (!dm && st.chat.canDelAll)), canPin = !m.pend && st.chat.canPin;
    const acts = m.pend ? '' : `<span class="cm-acts">${txt != null ? `<button type="button" class="cm-act" data-copy="${m.id}" aria-label="${esc(tr('Copy', 'Скопировать'))}" data-tip="${esc(tr('Copy', 'Скопировать'))}">${ic('copy')}</button>` : ''}${canPin ? `<button type="button" class="cm-act" data-pinm="${m.id}" aria-label="${esc(m.pin ? tr('Unpin', 'Открепить') : tr('Pin', 'Закрепить'))}" data-tip="${esc(m.pin ? tr('Unpin', 'Открепить') : tr('Pin', 'Закрепить'))}">${ic(m.pin ? 'pinOff' : 'pin')}</button>` : ''}${canDel ? `<button type="button" class="cm-act del" data-del="${m.id}" aria-label="${esc(tr('Delete', 'Удалить'))}" data-tip="${esc(tr('Delete', 'Удалить'))}">${ic('trash')}</button>` : ''}</span>`;
    const meta = `<span class="cm-meta">${m.pin ? `<span class="cm-pinned" aria-label="${esc(tr('pinned', 'закреплено'))}">${ic('pin')}</span>` : ''}${m.enc ? `<span class="cm-lk" aria-label="${esc(tr('encrypted', 'зашифровано'))}">${ic('lock')}</span>` : ''}<time datetime="${esc(m.at)}" title="${esc(new Date(m.at).toLocaleString(chLoc()))}">${esc(chTime(m.at))}</time>${mine && dm ? (m.pend ? `<span class="cm-tick pend">${ic('clock')}</span>` : `<span class="cm-tick${m.id <= st.peerRead ? ' rd' : ''}" aria-label="${esc(m.id <= st.peerRead ? tr('read', 'прочитано') : tr('sent', 'отправлено'))}">${chTicks()}</span>`) : ''}</span>`;
    return h + `<li class="cm${mine ? ' mine' : ''}${cont ? ' cont' : ''}${anim ? ' in' : ''}${m.pend ? ' pend' : ''}${dm ? ' dm' : ''}" data-mid="${m.id}">${av}<div class="cm-b${big ? ' big' : ''}${stk ? ' stk' : ''}">${head}<div class="cm-tx">${body}</div>${meta}</div>${acts}</li>`;
  }
  const msgsHtml = (st, arr, prev, anim) => arr.map(m => { const x = msgHtml(st, m, prev, anim); prev = m; return x; }).join('');
  function fillDec(st) {
    $$('[data-dec]', main).forEach(el => {
      const li = el.closest('[data-mid]'), id = +li.dataset.mid, m = st.msgs.find(x => x.id === id); if (!m || el.dataset.busy) return; el.dataset.busy = '1';
      chDecrypt(id, m.body).then(r => { if (r === undefined || S !== st || !document.contains(li)) return; const i = st.msgs.indexOf(m); const nl = document.createElement('template'); nl.innerHTML = msgHtml(st, m, st.msgs[i - 1], false); const keep = st.atBottom; li.replaceWith(nl.content.lastElementChild); if (keep) stick(st); });
    });
  }
  function paintMsgs(st) {
    const ol = $('[data-msgs]', main); if (!ol) return;
    ol.innerHTML = st.msgs.length ? msgsHtml(st, st.msgs, null, false) : '';
    $('[data-hello]', main).hidden = !!st.msgs.length;
    fillDec(st);
  }
  function repaintKeep(st) {
    const sc = $('[data-scroll]', main); if (!sc) return; const fb = sc.scrollHeight - sc.scrollTop;
    paintMsgs(st); if (st.atBottom) stick(st); else sc.scrollTop = sc.scrollHeight - fb;
  }
  function pinText(st, p) {
    if (p.kind === 'sticker') return `${ic('sticker')} ${esc(tr('Sticker', 'Стикер'))}`;
    if (p.enc) {
      const d = CH_DEC.get(p.id); if (d) return esc(d.t.replace(/\s+/g, ' '));
      if (d === undefined && !CH_PEND.has(p.id)) chDecrypt(p.id, p.body).then(r => { if (r && S === st) paintPins(st); });
      return `${ic('lock')} ${esc(tr('Encrypted message', 'Зашифрованное сообщение'))}`;
    }
    return esc(String(p.body || '').replace(/\s+/g, ' '));
  }
  function paintPins(st) {
    const bx = $('[data-pins]', main); if (!bx) return;
    const ps = st.pins || [], n = ps.length; bx.hidden = !n; app.classList.toggle('has-pins', !!n);
    if (!n) { bx.innerHTML = ''; return; }
    if (st.pinIdx >= n) st.pinIdx = 0;
    const p = ps[st.pinIdx], segs = Math.min(n, 4), on = n <= 4 ? st.pinIdx : Math.floor(st.pinIdx * 4 / n);
    const thumb = p.kind === 'sticker' && st.stk[p.body] ? `<img class="ch-pin-im" src="${esc(st.stk[p.body])}" alt="">` : '';
    bx.innerHTML = `<button type="button" class="ch-pin-go" data-pgo aria-label="${esc(tr('Go to the pinned message', 'К закреплённому сообщению'))}"><span class="ch-pin-bars" aria-hidden="true">${Array.from({ length: segs }, (_, i) => `<i${i === on ? ' class="on"' : ''}></i>`).join('')}</span>${thumb}<span class="ch-pin-t"><b>${esc(n > 1 ? tr(`Pinned message ${st.pinIdx + 1} of ${n}`, `Закреплённое сообщение ${st.pinIdx + 1} из ${n}`) : tr('Pinned message', 'Закреплённое сообщение'))}</b><small>${p.nick && st.chat.kind !== 'dm' ? `<span class="ch-who-p">${esc(p.nick)}: </span>` : ''}${pinText(st, p)}</small></span></button>${st.chat.canPin ? `<button type="button" class="icon-btn ch-pin-x" data-punpin="${p.id}" aria-label="${esc(tr('Unpin', 'Открепить'))}" data-tip="${esc(tr('Unpin', 'Открепить'))}">${ic('pinOff')}</button>` : `<span class="ch-pin-ic" aria-hidden="true">${ic('pin')}</span>`}`;
  }
  async function jumpTo(st, id) {
    const sel = `li[data-mid="${id}"]`;
    for (let k = 0; k < 10 && !$(sel, main) && st.more && S === st; k++) { if (st.loadingOld) await new Promise(r => setTimeout(r, 250)); else await loadOlder(st); }
    const li = $(sel, main); if (!li) { toast(tr('This message is too far back or was deleted', 'Это сообщение слишком далеко или удалено')); return; }
    li.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    li.classList.remove('hl'); void li.offsetWidth; li.classList.add('hl'); setTimeout(() => li.classList.remove('hl'), 1800);
  }
  async function pinMsg(st, id, on) {
    try {
      await api('chat', { method: 'POST', body: { op: 'pin_msg', id, on } }); if (S !== st) return;
      const m = st.msgs.find(x => x.id === id);
      if (on && m) { st.pins = [{ id, body: m.body, enc: m.enc, kind: m.kind, at: m.at, by: m.by, nick: (st.users[m.by] || {}).nick || m.by }, ...st.pins.filter(p => p.id !== id)]; st.pinIdx = 0; }
      if (!on) st.pins = st.pins.filter(p => p.id !== id);
      if (m) { m.pin = on; redrawOne(st, m); }
      paintPins(st); toast(on ? tr('The message is pinned', 'Сообщение закреплено') : tr('The message is unpinned', 'Сообщение откреплено'));
    } catch (ex) { toast(errText(ex)); }
  }
  function stick(st) { const sc = $('[data-scroll]', main); if (sc) { sc.scrollTop = sc.scrollHeight; st.atBottom = true; st.newN = 0; paintJump(st); } }
  function paintJump(st) { const j = $('[data-jump]', main); if (!j) return; j.hidden = st.atBottom || !st.newN; $('[data-jn]', j).textContent = st.newN > 99 ? '99+' : st.newN || ''; }
  function appendMsgs(st, arr, anim) {
    const ol = $('[data-msgs]', main); if (!ol || !arr.length) return;
    const i = st.msgs.indexOf(arr[0]), prev = i > 0 ? st.msgs[i - 1] : null;
    const firstPend = $('li.pend', ol), tpl = document.createElement('template'); tpl.innerHTML = msgsHtml(st, arr, prev, anim);
    firstPend ? ol.insertBefore(tpl.content, firstPend) : ol.appendChild(tpl.content);
    $('[data-hello]', main).hidden = true;
    fillDec(st);
  }
  function headSub(st) {
    const c = st.chat;
    if (c.kind === 'global') return esc(tr('Everyone on lynx. · be kind', 'Все пользователи lynx. · будь вежлив'));
    if (c.kind === 'group') { const n = (c.members || []).length; return esc(lang === 'ru' ? `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'участник' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'участника' : 'участников'}` : `${n} member${n === 1 ? '' : 's'}`); }
    const p = c.peer; if (!p) return '';
    if (p.seen && Date.now() - new Date(p.seen) < 3 * 60e3) return `<span class="ch-online">${esc(tr('online', 'в сети'))}</span>`;
    return p.seen ? esc(tr('last seen ', 'был(а) в сети ') + relTime(p.seen)) : '@' + esc(p.login);
  }
  function paintHead(st) {
    const hd = $('[data-head]', main); if (!hd) return;
    const c = st.chat, mode = e2eMode(st);
    const who = c.kind === 'dm'
      ? (c.peer ? `<a class="ch-who" href="#/u/${esc(c.peer.login)}">${avatarHtml(c.peer, 42)}<span class="ch-who-t"><b>${esc(chName(c))}${c.peer.premium ? `<span class="cm-pm">${ic('crown')}</span>` : ''}</b><small data-sub>${headSub(st)}</small></span></a>` : `<span class="ch-who">${chAv(c, 42)}<span class="ch-who-t"><b>${esc(chName(c))}</b></span></span>`)
      : `<button type="button" class="ch-who" data-info aria-label="${esc(tr('Chat info', 'О чате'))}">${chAv(c, 42)}<span class="ch-who-t"><b>${esc(chName(c))}</b><small data-sub>${headSub(st)}</small></span></button>`;
    const chip = mode === 'on' ? `<span class="ch-e2e on" tabindex="0" data-tip="${esc(tr('End-to-end encrypted: only you two can read these messages', 'Сквозное шифрование: читать сообщения можете только вы двое'))}">${ic('lock')}<span>${esc(tr('Encrypted', 'Шифрование'))}</span></span>`
      : mode === 'off' ? `<span class="ch-e2e off" tabindex="0" data-tip="${esc(!E2E.ok ? tr('This browser cannot encrypt messages', 'Этот браузер не умеет шифровать сообщения') : tr(`@${c.peer ? c.peer.login : ''} has not set up encryption yet, so messages are sent without it`, `@${c.peer ? c.peer.login : ''} ещё не настроил(а) шифрование, поэтому сообщения идут без него`))}">${ic('lockOpen')}<span>${esc(tr('Not encrypted', 'Без шифрования'))}</span></span>`
      : mode === 'locked' ? `<span class="ch-e2e lk" tabindex="0" data-tip="${esc(tr('Unlock encryption below to read and send messages', 'Разблокируй шифрование ниже, чтобы читать и отправлять сообщения'))}">${ic('lock')}<span>${esc(tr('Locked', 'Заблокировано'))}</span></span>` : '';
    const lc = findChat(st.id), pinned = !!(lc && lc.pinned);
    const hp = c.kind === 'global' ? '' : `<button type="button" class="icon-btn${pinned ? ' on' : ''}" data-hpin aria-pressed="${pinned}" data-tip="${esc(pinned ? tr('Unpin the chat', 'Открепить чат') : tr('Pin the chat', 'Закрепить чат'))}" aria-label="${esc(pinned ? tr('Unpin the chat', 'Открепить чат') : tr('Pin the chat', 'Закрепить чат'))}">${ic(pinned ? 'pinOff' : 'pin')}</button>`;
    hd.innerHTML = `<a class="icon-btn ch-back" href="#/chat" aria-label="${esc(tr('Back to chats', 'К списку чатов'))}">${ic('back')}</a>${who}<div class="ch-hacts">${chip}${hp}${c.kind !== 'dm' ? `<button type="button" class="icon-btn" data-info data-tip="${esc(c.kind === 'group' ? tr('Members and settings', 'Участники и настройки') : tr('Rules of the chat', 'Правила чата'))}" aria-label="${esc(tr('Chat info', 'О чате'))}">${ic(c.kind === 'group' ? 'users' : 'about')}</button>` : ''}</div>`;
  }
  function paintTyping(st) {
    const box = $('[data-typing]', main); if (!box) return;
    const ty = (st.typing || []).filter(x => x.login !== myL), names = ty.map(x => x.nick || x.login);
    const txt = !names.length ? '' : names.length === 1 ? (st.chat.kind === 'dm' ? tr('typing', 'печатает') : tr(`${names[0]} is typing`, `${names[0]} печатает`)) : names.length === 2 ? tr(`${names[0]} and ${names[1]} are typing`, `${names[0]} и ${names[1]} печатают`) : tr('Several people are typing', 'Несколько человек печатают');
    if (box.dataset.t === txt) return; box.dataset.t = txt;
    box.classList.toggle('on', !!txt); if (txt) box.innerHTML = `${chDots()}<span>${esc(txt)}</span>`;
    const sub = $('[data-sub]', main); if (sub && st.chat.kind === 'dm') sub.innerHTML = txt ? `<span class="ch-tp">${esc(tr('typing', 'печатает'))}${chDots()}</span>` : headSub(st);
  }
  function paintTicks(st) {
    if (st.chat.kind !== 'dm') return;
    $$('li.cm.mine[data-mid] .cm-tick:not(.pend)', main).forEach(t => { const id = +t.closest('[data-mid]').dataset.mid, rd = id <= st.peerRead; if (t.classList.contains('rd') !== rd) { t.classList.toggle('rd', rd); t.setAttribute('aria-label', rd ? tr('read', 'прочитано') : tr('sent', 'отправлено')); } });
  }
  function paintFoot(st) {
    const ft = $('[data-foot]', main); if (!ft) return;
    const c = st.chat, mode = e2eMode(st), keepVal = $('textarea', ft) ? $('textarea', ft).value : '';
    if (c.kind === 'dm' && !c.canSend) { ft.innerHTML = `<p class="ch-note">${ic('ban')} ${esc(!c.peer ? tr('This account was deleted.', 'Этот аккаунт удалён.') : tr('You cannot write to this user: their privacy settings do not allow it or the account is blocked.', 'Этому пользователю нельзя написать: так настроена его приватность или аккаунт заблокирован.'))}</p>`; return; }
    if (mode === 'locked') {
      ft.innerHTML = `<form class="ch-unl" data-unl novalidate><span class="ch-unl-ic">${ic('shieldLock')}</span><div class="ch-unl-t"><b>${esc(c.mePub ? tr('Unlock private messages on this device', 'Разблокируй личные сообщения на этом устройстве') : tr('Turn on encryption for private messages', 'Включи шифрование личных сообщений'))}</b><small>${esc(tr('Enter your password once: the key is made and kept in this browser, the server never sees it.', 'Введи пароль один раз: ключ создаётся и хранится в этом браузере, сервер его не видит.'))}</small></div>${fld({ name: 'pw', label: tr('Password', 'Пароль'), icon: 'lock', type: 'password', auto: 'current-password', eye: true })}<button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('lockOpen')} ${esc(c.mePub ? tr('Unlock', 'Разблокировать') : tr('Turn on', 'Включить'))}</button></form>`;
      bindFields($('[data-unl]', ft)); return;
    }
    const ph = mode === 'on' ? tr('Encrypted message', 'Зашифрованное сообщение') : tr('Message', 'Сообщение');
    ft.innerHTML = `<form class="ch-comp" data-comp novalidate><button type="button" class="ch-cb" data-emo aria-expanded="false" aria-label="${esc(tr('Emoji and stickers', 'Эмодзи и стикеры'))}" data-tip="${esc(tr('Emoji and stickers', 'Эмодзи и стикеры'))}">${ic('smile')}</button><div class="ch-ta"><textarea name="t" rows="1" maxlength="2000" placeholder="${esc(ph)}" aria-label="${esc(ph)}"></textarea><span class="ch-cnt" data-cnt aria-live="polite"></span></div><button type="submit" class="ch-send" aria-label="${esc(tr('Send', 'Отправить'))}" disabled>${ic('send')}</button>
      <div class="ch-emo glass" data-emop hidden role="group" aria-label="${esc(tr('Emoji and stickers', 'Эмодзи и стикеры'))}"><div class="seg ch-emt"><button type="button" data-emt="e" aria-pressed="true">${ic('smile')}<span>${esc(tr('Emoji', 'Эмодзи'))}</span></button><button type="button" data-emt="s" aria-pressed="false">${ic('sticker')}<span>${esc(tr('Stickers', 'Стикеры'))}</span></button></div><div data-emoji-controls><input class="inp ch-emsearch" data-emsearch type="search" placeholder="${esc(tr('Search emoji (English)', 'Поиск эмодзи (по-английски)'))}" aria-label="${esc(tr('Search emoji', 'Поиск эмодзи'))}"><select class="inp ch-emgroup" data-emgroup aria-label="${esc(tr('Emoji category', 'Категория эмодзи'))}">${EMO_GROUPS.map((g,i) => `<option value="${i}">${esc(lang === 'ru' ? (EMO_RU[i] || g) : g)}</option>`).join('')}</select><p class="ch-emhint">${esc(tr('Or use your device emoji keyboard. Windows: Win + . · Mac: Control + Command + Space', 'Или используй эмодзи-клавиатуру устройства. Windows: Win + . · Mac: Control + Command + Space'))}</p><div class="ch-emg" data-emg></div><button type="button" class="txt-btn ch-emmore" data-emmore>${esc(tr('Show more', 'Показать ещё'))}</button></div><div class="ch-stg" data-stg hidden></div></div></form>`;
    const ta = $('textarea', ft); paintEmoji(); if (keepVal) { ta.value = keepVal; taFit(ta); }
    if (c.kind !== 'dm') acAttach(ta, { mode: 'mention', up: true, wide: 340, remote: c.kind === 'global', anchor: () => $('.ch-ta', main), local: () => mentionPool(st), title: tr('Mention', 'Упомянуть') });
  }
  function mentionPool(st) {
    if (st.chat.kind === 'group') return (st.chat.members || []).map(u => ({ ...u, frame: null }));
    const seen = new Set(), out = [];
    for (let i = st.msgs.length - 1; i >= 0 && out.length < 40; i--) { const l = st.msgs[i].by; if (l && !seen.has(l) && st.users[l]) { seen.add(l); out.push({ ...st.users[l], frame: null }); } }
    return out;
  }
  function stkGridHtml(arr) {
    if (!arr.length) return `<div class="ch-stk-none">${ic('sticker')}<p>${esc(tr('No stickers yet. The site team adds them.', 'Стикеров пока нет. Их добавляет команда сайта.'))}</p></div>`;
    return arr.map(x => `<button type="button" class="ch-stk" data-stkid="${x.id}" aria-label="${esc(x.name || tr('Sticker', 'Стикер'))}"${x.name ? ` data-tip="${esc(x.name)}"` : ''}><img src="${esc(x.url)}" alt="" loading="lazy" decoding="async" draggable="false"></button>`).join('');
  }
  let emojiLimit = 160;
  function paintEmoji() {
    const p = $('[data-emop]', main); if (!p) return; const q = $('[data-emsearch]', p).value.trim().toLowerCase(), group = +$('[data-emgroup]', p).value;
    const matches = EMO_DATA.filter(x => q ? x[1].includes(q) || x[0].includes(q) : x[2] === group);
    $('[data-emg]', p).innerHTML = matches.slice(0, emojiLimit).map(x => `<button type="button" data-e="${esc(x[0])}" aria-label="${esc(x[1])}" title="${esc(x[1])}">${esc(x[0])}</button>`).join('');
    $('[data-emmore]', p).hidden = matches.length <= emojiLimit;
  }
  main.addEventListener('input', e => { if (e.target.matches('[data-emsearch]')) { emojiLimit = 160; paintEmoji(); } });
  main.addEventListener('change', e => { if (e.target.matches('[data-emgroup]')) { emojiLimit = 160; $('[data-emsearch]', main).value = ''; paintEmoji(); } });
  function emoTab(k) {
    const p = $('[data-emop]', main); if (!p) return;
    $$('[data-emt]', p).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.emt === k)));
    $('[data-emoji-controls]', p).hidden = k !== 'e'; const g = $('[data-stg]', p); g.hidden = k !== 's';
    if (k !== 's') return;
    if (CH_STK.list) g.innerHTML = stkGridHtml(CH_STK.list); else g.innerHTML = `<div class="ch-stk-none"><span class="spin" aria-hidden="true"></span></div>`;
    chStickers().then(arr => { if (document.contains(g) && !g.hidden) g.innerHTML = stkGridHtml(arr); }).catch(ex => { if (document.contains(g)) g.innerHTML = `<div class="ch-stk-none"><p>${esc(errText(ex))}</p></div>`; });
  }
  function taFit(ta) {
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 168) + 'px';
    const n = [...ta.value].length, c = $('[data-cnt]', main), b = $('.ch-send', main);
    if (c) { c.textContent = n > 1700 ? `${n}/2000` : ''; c.classList.toggle('bad', n > 2000); }
    if (b) b.disabled = !ta.value.trim();
  }
  function emptyMain() {
    const g = list && list.global;
    main.innerHTML = `<div class="ch-empty"><div class="ch-art" aria-hidden="true"><span class="b1">${ic('chat')}</span><span class="b2">${ic('lock')}</span><span class="b3">${ic('users')}</span></div><h2 class="display"><span class="grad">${esc(tr('Your messages', 'Твои сообщения'))}</span></h2><p class="muted">${esc(tr('Pick a chat on the left or start a new one. Private chats are end-to-end encrypted.', 'Выбери чат слева или начни новый. Личные чаты защищены сквозным шифрованием.'))}</p><div class="row"><a class="pill pill-white pill-sm" href="#/chat/${g ? g.id : ''}"${g ? '' : ' data-gl'}>${ic('globe')} ${esc(tr('Global chat', 'Общий чат'))}</a><button type="button" class="pill pill-glass pill-sm" data-new>${ic('plus')} ${esc(tr('New chat', 'Новый чат'))}</button></div></div>`;
  }
  function stopConv() { clearTimeout(tm); tm = 0; }
  async function openChat(id) {
    stopConv(); const prev = S; S = null;
    app.classList.toggle('has-chat', !!id);
    if (!id) { emptyMain(); paintList(); document.title = `${D.meta.brand} – ${tr('Chats', 'Чаты')}`; return; }
    const st = S = { id, msgs: [], users: {}, lastId: 0, firstId: 0, more: false, now: 0, peerRead: 0, chat: null, typing: [], atBottom: true, newN: 0, sending: 0, localOk: false, loadingOld: false, stk: {}, pins: [], pinIdx: 0 };
    paintList();
    if (!prev || prev.id !== id) main.innerHTML = `<div class="ch-load ch-loading-quiet" role="status">${esc(tr('Opening chat…', 'Открываем чат…'))}</div>`;
    try {
      const j = await api('msgs', { q: { chat: id, full: 1, seen: 1 } });
      if (S !== st || dead()) return;
      st.chat = j.chat || { id, kind: 'global', title: '' };
      if (st.chat.kind === 'dm') { const loc = await E2E.local(myL); st.localOk = !!loc && (!st.chat.mePub || loc.pub === st.chat.mePub); if (S !== st) return; }
      ingest(st, j, 'init');
      main.innerHTML = `<header class="ch-head" data-head></header><div class="ch-pins" data-pins hidden></div><div class="ch-scroll" data-scroll><div class="ch-more" data-more>${st.more ? `<span class="spin" aria-hidden="true"></span>` : ''}</div><div class="ch-hello" data-hello hidden>${chAv(st.chat, 64)}<b>${esc(chName(st.chat))}</b><p class="muted">${esc(st.chat.kind === 'dm' ? (e2eMode(st) === 'on' || e2eMode(st) === 'locked' ? tr('Say hi! Messages here are end-to-end encrypted.', 'Поздоровайся! Сообщения здесь защищены сквозным шифрованием.') : tr('Say hi!', 'Поздоровайся!')) : tr('No messages yet. Be the first!', 'Сообщений пока нет. Напиши первым!'))}</p></div><ol class="ch-msgs" data-msgs aria-live="polite" aria-relevant="additions" aria-label="${esc(tr('Messages', 'Сообщения'))}"></ol></div><button type="button" class="ch-jump" data-jump hidden aria-label="${esc(tr('To new messages', 'К новым сообщениям'))}">${ic('down')}<b data-jn></b></button><div class="ch-typing" data-typing aria-live="polite"></div><div class="ch-foot" data-foot></div>`;
      paintHead(st); paintPins(st); paintMsgs(st); paintTyping(st); paintFoot(st);
      requestAnimationFrame(() => stick(st)); setTimeout(() => { if (S === st && st.atBottom) stick(st); }, 120);
      $('[data-scroll]', main).addEventListener('scroll', () => onScroll(st), { passive: true });
      document.title = `${D.meta.brand} – ${chName(st.chat)}`;
      const c = findChat(id); if (c && c.unread) { c.unread = 0; paintList(); }
      if (!c && list) loadList();
      Auth.pollUnread();
      if (!coarse) { const ta = $('textarea', main); ta && ta.focus({ preventScroll: true }); }
      tm = setTimeout(() => poll(st), 2000);
    } catch (e) {
      if (S !== st || dead()) return;
      main.innerHTML = `<div class="ch-empty"><div class="em em-lg">${ic(e.code === 'chat_gone' ? 'chat' : 'alert')}</div><p>${esc(errText(e))}</p><div class="row"><a class="pill pill-glass pill-sm" href="#/chat">${ic('back')} ${esc(tr('To the chats', 'К чатам'))}</a>${e.code === 'chat_gone' ? '' : `<button type="button" class="pill pill-white pill-sm" data-reopen>${ic('replay')} ${esc(tr('Try again', 'Повторить'))}</button>`}</div></div>`;
    }
  }
  function ingest(st, j, mode) {
    Object.assign(st.users, j.users || {});
    const have = new Set(st.msgs.map(m => m.id)), fresh = (j.messages || []).filter(m => !have.has(m.id));
    if (mode === 'old') st.msgs = [...fresh, ...st.msgs];
    else { const pend = st.msgs.filter(m => m.pend); st.msgs = [...st.msgs.filter(m => !m.pend), ...fresh, ...pend]; }
    if (mode !== 'new') st.more = !!j.more;
    const real = st.msgs.filter(m => !m.pend);
    if (real.length) { st.lastId = Math.max(st.lastId, real[real.length - 1].id); st.firstId = real[0].id; }
    if (j.now) st.now = j.now;
    if (j.typing) st.typing = j.typing;
    if (j.peerRead != null) st.peerRead = Math.max(st.peerRead, j.peerRead);
    const gone = [], changed = []; let pinCh = false;
    (j.gone || []).forEach(id => { const i = st.msgs.findIndex(x => x.id === id); if (i >= 0) gone.push(...st.msgs.splice(i, 1)); });
    Object.assign(st.stk, j.stickers || {});
    if (j.pins) {
      const ids = new Set(j.pins.map(p => p.id)); pinCh = (st.pins || []).map(p => p.id).join() !== j.pins.map(p => p.id).join(); st.pins = j.pins;
      st.msgs.forEach(m => { if (m.pend || m.kind === 'sys') return; const p = ids.has(m.id); if (!!m.pin !== p) { m.pin = p; changed.push(m); } });
    }
    return { fresh, gone, changed, pinCh };
  }
  function redrawOne(st, m) { const li = $(`li[data-mid="${m.id}"]`, main); if (!li) return; const i = st.msgs.indexOf(m), tpl = document.createElement('template'); tpl.innerHTML = msgHtml(st, m, st.msgs[i - 1], false); li.replaceWith(tpl.content.lastElementChild); }
  async function poll(st) {
    clearTimeout(tm); if (S !== st || dead()) return;
    if (document.visibilityState === 'visible' && !st.sending) {
      try {
        const q = { chat: st.id, after: st.lastId || 0, since: st.now || 0 }; if (document.hasFocus()) q.seen = 1;
        const j = await api('msgs', { q });
        if (S !== st || dead()) return;
        const { fresh, gone, changed, pinCh } = ingest(st, j, 'new');
        if (fresh.length) {
          const sc = $('[data-scroll]', main), near = sc && sc.scrollHeight - sc.scrollTop - sc.clientHeight < 140;
          appendMsgs(st, fresh, !fxOff());
          const others = fresh.filter(m => !m.mine).length;
          if (near) stick(st); else { st.atBottom = false; st.newN += others; paintJump(st); }
          if (others && q.seen) { const c = findChat(st.id); if (c) { c.unread = 0; c.last = { ...fresh[fresh.length - 1], nick: (st.users[fresh[fresh.length - 1].by] || {}).nick }; c.at = c.last.at; } paintList(); Auth.pollUnread(); }
        }
        if (gone.length) { repaintKeep(st); const c = findChat(st.id); if (c && c.last && gone.some(m => m.id === c.last.id)) loadList(); }
        else changed.forEach(m => redrawOne(st, m));
        if (pinCh) paintPins(st);
        paintTyping(st); paintTicks(st);
      } catch (e) {
        if (S !== st || dead()) return;
        if (e.code === 'chat_gone') { toast(errText(e)); location.hash = '#/chat'; loadList(); return; }
        if (e.status === 401) { Auth.refresh(); return; }
      }
    }
    if (S === st && !dead()) tm = setTimeout(() => poll(st), document.visibilityState === 'visible' ? 2000 : 6000);
  }
  async function loadOlder(st) {
    if (st.loadingOld || !st.more || !st.firstId) return; st.loadingOld = true;
    try {
      const j = await api('msgs', { q: { chat: st.id, before: st.firstId } }); if (S !== st || dead()) return;
      const sc = $('[data-scroll]', main), h0 = sc.scrollHeight, y0 = sc.scrollTop;
      const r = ingest(st, j, 'old'); paintMsgs(st); if (r.pinCh) paintPins(st);
      $('[data-more]', main).innerHTML = st.more ? `<span class="spin" aria-hidden="true"></span>` : `<span class="ch-start">${esc(tr('The beginning of the chat', 'Начало чата'))}</span>`;
      sc.scrollTop = y0 + (sc.scrollHeight - h0);
    } catch (e) { toast(errText(e)); } finally { st.loadingOld = false; }
  }
  function onScroll(st) {
    const sc = $('[data-scroll]', main); if (!sc || S !== st) return;
    st.atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 60; if (st.atBottom && st.newN) { st.newN = 0; } paintJump(st);
    if (sc.scrollTop < 120) loadOlder(st);
  }
  async function send(st, text) {
    text = text.replace(/^\s*\n|\s+$/g, ''); if (!text.trim()) return false;
    if ([...text].length > 2000) { toast(errText({ code: 'too_long' })); return false; }
    const restore = () => { const ta = $('[data-comp] textarea', main); if (ta && S === st) { ta.value = text + (ta.value ? '\n' + ta.value : ''); taFit(ta); } };
    const mode = e2eMode(st); let body = text, enc = false;
    if (mode === 'locked') { restore(); toast(tr('Unlock encryption first', 'Сначала разблокируй шифрование')); return false; }
    if (mode === 'on') { try { body = await E2E.seal(text, st.chat.peer.pub); enc = true; } catch (e) { restore(); toast(tr('Could not encrypt the message', 'Не удалось зашифровать сообщение')); return false; } }
    const tmp = { id: 'p' + (++pendN), by: myL, mine: true, body: text, enc: false, kind: 'text', at: new Date().toISOString(), pend: true };
    return push(st, tmp, { chat: st.id, body, enc }, enc ? text : null, restore);
  }
  function sendSticker(st, s) {
    if (e2eMode(st) === 'locked') { toast(tr('Unlock encryption first', 'Сначала разблокируй шифрование')); return; }
    st.stk[s.id] = s.url;
    const tmp = { id: 'p' + (++pendN), by: myL, mine: true, body: String(s.id), enc: false, kind: 'sticker', at: new Date().toISOString(), pend: true };
    return push(st, tmp, { chat: st.id, sticker: s.id }, null, null);
  }
  async function push(st, tmp, payload, plain, fail) {
    st.users[myL] = st.users[myL] || { login: myL, nick: me.nick, avatar: me.avatar, role: me.role, premium: me.premium };
    st.sending++;
    try {
      const j = await api('msg', { method: 'POST', body: payload });
      if (S !== st) return true;
      if (plain != null) CH_DEC.set(j.message.id, { t: plain });
      Object.assign(st.stk, j.stickers || {});
      st.users[myL] = j.user;
      const i = st.msgs.indexOf(tmp); if (i >= 0) st.msgs.splice(i, 1);
      const li = $(`li[data-mid="${tmp.id}"]`, main);
      if (!st.msgs.some(m => m.id === j.message.id)) { const real = st.msgs.filter(m => !m.pend); st.msgs.splice(real.length, 0, j.message); st.lastId = Math.max(st.lastId, j.message.id); }
      if (li) { const k = st.msgs.findIndex(m => m.id === j.message.id), tpl = document.createElement('template'); tpl.innerHTML = msgHtml(st, j.message, st.msgs[k - 1], false); if ($(`li[data-mid="${j.message.id}"]`, main)) li.remove(); else li.replaceWith(tpl.content.lastElementChild); }
      if (!li && !$(`li[data-mid="${j.message.id}"]`, main)) { appendMsgs(st, [j.message], !fxOff()); stick(st); }
      const c = findChat(st.id); if (c) { c.last = { ...j.message, nick: me.nick }; c.at = j.message.at; if (list && c.kind !== 'global') { list.chats = [c, ...list.chats.filter(x => x !== c)]; } paintList(); }
      return true;
    } catch (e) {
      st.msgs = st.msgs.filter(m => m !== tmp); const li = $(`li[data-mid="${tmp.id}"]`, main); li && li.remove();
      fail && fail();
      toast(errText(e)); if (e.code === 'chat_gone') location.hash = '#/chat';
      return false;
    } finally { st.sending--; }
  }
  let typAt = 0;
  main.addEventListener('input', e => {
    const ta = e.target.closest('[data-comp] textarea'); if (!ta || !S) return; taFit(ta);
    if (ta.value.trim() && Date.now() - typAt > 3000) { typAt = Date.now(); api('typing', { method: 'POST', body: { chat: S.id } }).catch(() => { }); }
  });
  main.addEventListener('keydown', e => {
    const ta = e.target.closest('[data-comp] textarea');
    if (ta && e.key === 'Enter' && !e.shiftKey && !e.isComposing && !coarse) { e.preventDefault(); ta.form.requestSubmit ? ta.form.requestSubmit() : ta.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
    if (e.key === 'Escape') { const p = $('[data-emop]', main); if (p && !p.hidden) { p.hidden = true; $('[data-emo]', main).setAttribute('aria-expanded', 'false'); e.stopPropagation(); } }
  });
  main.addEventListener('submit', async e => {
    const st = S; if (!st) return;
    const comp = e.target.closest('[data-comp]');
    if (comp) { e.preventDefault(); const ta = comp.t, text = ta.value; if (!text.trim()) return; ta.value = ''; taFit(ta); typAt = 0; const p = $('[data-emop]', comp); p.hidden = true; await send(st, text); return; }
    const unl = e.target.closest('[data-unl]');
    if (unl) {
      e.preventDefault(); const b = $('button[type=submit]', unl); if (!unl.pw.value) return unl.pw.focus(); busyBtn(b, true);
      try { const m = await E2E.unlock(myL, unl.pw.value); if (S !== st) return; st.localOk = true; st.chat.mePub = m.pub; CH_DEC.forEach((val, k) => { if (val === null) CH_DEC.delete(k); }); toast(tr('Encryption is ready on this device', 'Шифрование готово на этом устройстве')); paintHead(st); paintFoot(st); paintMsgs(st); stick(st); const ta = $('textarea', main); ta && ta.focus(); }
      catch (ex) { setMsg(unl, 'pw', errText(ex.code ? ex : { code: 'server' })); busyBtn(b, false); }
    }
  });
  main.addEventListener('click', async e => {
    const st = S;
    if (coarse && !e.target.closest('a,button')) { const li = e.target.closest('li.cm'); $$('li.cm.sel', main).forEach(x => x !== li && x.classList.remove('sel')); li && li.classList.toggle('sel'); }
    if (e.target.closest('[data-new]')) return newChatDialog(friends ? friends.friends : []);
    if (e.target.closest('[data-reopen]')) return openChat(+(parseHash().path.match(CH_RE) || [])[1] || null);
    if (!st) return;
    if (e.target.closest('[data-info]')) return st.chat.kind === 'group' ? groupDialog(st) : rulesDialog();
    if (e.target.closest('[data-jump]')) return stick(st);
    if (e.target.closest('[data-hpin]')) return pinChat(st.id, e.target.closest('[data-hpin]'));
    if (e.target.closest('[data-pgo]')) { const p = st.pins[st.pinIdx]; if (!p) return; if (st.pins.length > 1) { st.pinIdx = (st.pinIdx + 1) % st.pins.length; paintPins(st); } return jumpTo(st, p.id); }
    const pu = e.target.closest('[data-punpin]'); if (pu) return pinMsg(st, +pu.dataset.punpin, false);
    const pm = e.target.closest('[data-pinm]'); if (pm) { const m = st.msgs.find(x => String(x.id) === pm.dataset.pinm); if (m) pinMsg(st, m.id, !m.pin); return; }
    const gt = e.target.closest('[data-goto]'); if (gt) return jumpTo(st, +gt.dataset.goto);
    if (e.target.closest('[data-emmore]')) { emojiLimit += 160; paintEmoji(); return; }
    const et = e.target.closest('[data-emt]'); if (et) return emoTab(et.dataset.emt);
    const sk = e.target.closest('[data-stkid]'); if (sk) { const s = (CH_STK.list || []).find(x => String(x.id) === sk.dataset.stkid); const p = $('[data-emop]', main); if (p) { p.hidden = true; $('[data-emo]', main).setAttribute('aria-expanded', 'false'); } if (s) sendSticker(st, s); return; }
    const eb = e.target.closest('[data-emo]');
    if (eb) { const p = $('[data-emop]', main); p.hidden = !p.hidden; eb.setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) $('button', p).focus(); return; }
    const em = e.target.closest('[data-e]');
    if (em) { const ta = $('[data-comp] textarea', main); const a = ta.selectionStart ?? ta.value.length, z = ta.selectionEnd ?? a; ta.value = ta.value.slice(0, a) + em.dataset.e + ta.value.slice(z); const k = a + em.dataset.e.length; ta.focus(); ta.setSelectionRange(k, k); taFit(ta); return; }
    if (!e.target.closest('.ch-emo')) { const p = $('[data-emop]', main); if (p && !p.hidden) { p.hidden = true; $('[data-emo]', main).setAttribute('aria-expanded', 'false'); } }
    const cp = e.target.closest('[data-copy]');
    if (cp) { const m = st.msgs.find(x => String(x.id) === cp.dataset.copy); const txt = m && (m.enc ? (CH_DEC.get(m.id) || {}).t : m.body); if (txt) { const ok = () => toast(tr('Copied', 'Скопировано')); navigator.clipboard ? navigator.clipboard.writeText(txt).then(ok, ok) : ok(); } return; }
    const dl = e.target.closest('[data-del]');
    if (dl) {
      const m = st.msgs.find(x => String(x.id) === dl.dataset.del); if (!m) return;
      if (!(await confirmDlg(m.mine ? tr('Delete this message for everyone?', 'Удалить сообщение у всех?') : tr(`Delete the message from ${(st.users[m.by] || {}).nick || m.by}? It will be logged.`, `Удалить сообщение от ${(st.users[m.by] || {}).nick || m.by}? Действие попадёт в журнал.`)))) return;
      try { await api('chat', { method: 'POST', body: { op: 'del_msg', id: m.id } }); st.msgs = st.msgs.filter(x => x !== m); repaintKeep(st); if (st.pins.some(p => p.id === m.id)) { st.pins = st.pins.filter(p => p.id !== m.id); paintPins(st); } const c = findChat(st.id); if (c && c.last && c.last.id === m.id) loadList(); toast(tr('The message was deleted', 'Сообщение удалено')); }
      catch (ex) { toast(errText(ex)); }
    }
  });
  function rulesDialog() {
    const R2 = [['heart', 'Be kind: no insults, threats or harassment.', 'Будь вежлив: без оскорблений, угроз и травли.'], ['ban', 'No spam, ads or links to suspicious sites.', 'Без спама, рекламы и ссылок на сомнительные сайты.'], ['shieldLock', 'Do not share passwords, phone numbers or addresses.', 'Не делись паролями, телефонами и адресами.'], ['shield', 'Moderators can delete messages and warn: three warnings mean a ban.', 'Модераторы удаляют сообщения и выносят предупреждения: три предупреждения – блокировка.']];
    openDialog({ title: tr('Global chat', 'Общий чат'), cls: 'ch-dlg', body: `<p class="muted" style="margin-top:0">${esc(tr('One room for everyone on lynx.: ask about IELTS, share tips and find study partners.', 'Одна комната для всех на lynx.: спрашивай про IELTS, делись советами и ищи напарников для подготовки.'))}</p><ul class="ch-rules">${R2.map(([i, en, ru]) => `<li>${ic(ICONS[i] ? i : 'check')}<span>${esc(tr(en, ru))}</span></li>`).join('')}</ul>`, actions: `<button class="pill pill-white" data-close>${ic('check')} ${esc(tr('Got it', 'Понятно'))}</button>` });
  }
  async function refreshInfo(st) {
    const j = await api('msgs', { q: { chat: st.id, full: 1, after: st.lastId || 0 } }); if (S !== st) return;
    st.chat = j.chat || st.chat; const { fresh } = ingest(st, j, 'new'); appendMsgs(st, fresh, false); stick(st); paintHead(st);
  }
  function groupDialog(st) {
    const own = () => st.chat.owner;
    const body = () => { const c = st.chat; return `${own() ? `<form class="ch-dform" data-ren novalidate>${fld({ name: 'title', label: tr('Group name', 'Название группы'), icon: 'hash', value: c.title, max: 48 })}<button class="pill pill-glass pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('check')} ${esc(tr('Save', 'Сохранить'))}</button></form>` : ''}
      ${own() ? `<form class="ch-dform" data-addm novalidate>${fld({ name: 'login', label: tr('Add by login', 'Добавить по логину'), icon: 'userPlus', ph: 'login' })}<button class="pill pill-white pill-sm" type="submit"><span class="spin" aria-hidden="true"></span>${ic('plus')} ${esc(tr('Add', 'Добавить'))}</button></form>` : ''}
      <p class="ch-sec">${esc(tr('Members', 'Участники'))} · ${(c.members || []).length}/50</p>
      <ul class="ch-mem">${(c.members || []).map(u => `<li>${avatarHtml({ ...u, frame: null }, 38)}<a href="#/u/${esc(u.login)}" data-close><b>${esc(u.nick || u.login)}${u.login === myL ? ` <span class="faint">(${esc(tr('you', 'ты'))})</span>` : ''}</b><small>@${esc(u.login)}</small></a>${u.owner ? `<span class="lp ch-own">${ic('crown')} ${esc(tr('Creator', 'Создатель'))}</span>` : ''}${own() && u.login !== myL ? `<button type="button" class="icon-btn" data-kick="${esc(u.login)}" data-tip="${esc(tr('Remove from the group', 'Исключить из группы'))}" aria-label="${esc(tr('Remove', 'Исключить') + ' @' + u.login)}">${ic('userMinus')}</button>` : ''}</li>`).join('')}</ul>
      <div class="row ch-dfoot"><button type="button" class="pill pill-outline pill-sm ch-leave" data-leave>${ic('logout')} ${esc(tr('Leave the group', 'Покинуть группу'))}</button></div>`; };
    openDialog({
      title: st.chat.title, cls: 'ch-dlg', body: `<div data-gd>${body()}</div>`,
      onOpen: (d, close) => {
        const box = $('[data-gd]', d);
        const bindAc = () => { const f = $('[data-addm]', box); if (f) acAttach(f.login, { exclude: () => (st.chat.members || []).map(u => u.login), local: () => friends ? friends.friends : [] }); };
        const redraw = () => { box.innerHTML = body(); $$('form', box).forEach(bindFields); bindAc(); $('h2', d).textContent = st.chat.title; };
        $$('form', box).forEach(bindFields); bindAc();
        box.addEventListener('submit', async e => {
          e.preventDefault(); const f = e.target, b = $('button[type=submit]', f); busyBtn(b, true);
          try {
            if (f.matches('[data-ren]')) { const title = f.elements.title.value.trim(); if (!title) throw { code: 'title_bad' }; await api('chat', { method: 'POST', body: { op: 'rename', chat: st.id, title } }); toast(tr('Saved', 'Сохранено')); }
            else { const login = f.login.value.trim().replace(/^@/, ''); if (!login) { busyBtn(b, false); return f.login.focus(); } await api('chat', { method: 'POST', body: { op: 'add', chat: st.id, login } }); toast(tr(`@${login} was added`, `@${login} добавлен(а)`)); }
            await refreshInfo(st); loadList(); redraw();
          } catch (ex) { busyBtn(b, false); setMsg(f, f.matches('[data-ren]') ? 'title' : 'login', errText(ex)); }
        });
        box.addEventListener('click', async e => {
          const k = e.target.closest('[data-kick]');
          if (k) { const l = k.dataset.kick; if (!(await confirmDlg(tr(`Remove @${l} from the group?`, `Исключить @${l} из группы?`)))) return; try { await api('chat', { method: 'POST', body: { op: 'kick', chat: st.id, login: l } }); await refreshInfo(st); redraw(); } catch (ex) { toast(errText(ex)); } return; }
          if (e.target.closest('[data-leave]')) {
            if (!(await confirmDlg(tr('Leave this group? You will not see new messages.', 'Покинуть группу? Новые сообщения будут недоступны.')))) return;
            try { await api('chat', { method: 'POST', body: { op: 'leave', chat: st.id } }); close(''); toast(tr('You left the group', 'Ты покинул(а) группу')); if (list) list.chats = list.chats.filter(c => c.id !== st.id); location.hash = '#/chat'; loadList(); } catch (ex) { toast(errText(ex)); }
          }
        });
      }
    });
  }
  function newChatDialog(fr) {
    let mode = 'dm'; const picked = new Set();
    openDialog({
      title: tr('New chat', 'Новый чат'), cls: 'ch-dlg ch-new',
      body: `<div class="seg ch-nseg"><button type="button" data-nm="dm" aria-pressed="true">${ic('user')}<span>${esc(tr('Private', 'Личный'))}</span></button><button type="button" data-nm="group" aria-pressed="false">${ic('users')}<span>${esc(tr('Group', 'Группа'))}</span></button></div>
      <form data-nf novalidate><div data-gt hidden>${fld({ name: 'title', label: tr('Group name', 'Название группы'), icon: 'hash', max: 48 })}</div>
      ${fld({ name: 'login', label: tr('Login', 'Логин'), icon: 'at', ph: 'login', hint: tr('The login from the profile link, without @', 'Логин из ссылки на профиль, без @') })}
      ${fr.length ? `<p class="ch-sec" data-frl>${esc(tr('Or pick a friend', 'Или выбери друга'))}</p><div class="ch-pick">${fr.map(u => `<button type="button" class="ch-pk" data-pick="${esc(u.login)}" aria-pressed="false">${avatarHtml({ ...u, frame: null }, 28)}<span>${esc(u.nick || u.login)}</span><i class="ch-pk-ok">${ic('check')}</i></button>`).join('')}</div>` : `<p class="faint ch-nofr">${esc(tr('Tip: add friends to pick them here in one tap.', 'Совет: добавь друзей, чтобы выбирать их здесь одним нажатием.'))}</p>`}
      <p class="ch-e2n">${ic('lock')} <span data-e2n>${esc(tr('Private chats are end-to-end encrypted.', 'Личные чаты защищены сквозным шифрованием.'))}</span></p>
      <div class="row" style="justify-content:flex-end"><button class="pill pill-white" type="submit"><span class="spin" aria-hidden="true"></span>${ic('chat')} <span data-go>${esc(tr('Start chat', 'Начать чат'))}</span></button></div></form>`,
      onOpen: (d, close) => {
        const f = $('[data-nf]', d); bindFields(f); setTimeout(() => f.login.focus(), 60);
        acAttach(f.login, { mode: () => mode === 'group' ? 'list' : 'one', local: () => fr, exclude: () => mode === 'group' ? [...picked, ...f.login.value.split(/[\s,;]+/).map(x => x.replace(/^@/, ''))] : [] });
        const sync = () => {
          $$('[data-nm]', d).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.nm === mode)));
          $('[data-gt]', d).hidden = mode !== 'group';
          $('[data-f="login"] .fld-l', d).textContent = mode === 'group' ? tr('Logins (comma separated)', 'Логины через запятую') : tr('Login', 'Логин');
          $('[data-go]', d).textContent = mode === 'group' ? tr('Create the group', 'Создать группу') : tr('Start chat', 'Начать чат');
          $('[data-e2n]', d).textContent = mode === 'group' ? tr('Group chats are not encrypted end-to-end. Up to 50 members.', 'Групповые чаты не шифруются сквозным шифрованием. До 50 участников.') : tr('Private chats are end-to-end encrypted.', 'Личные чаты защищены сквозным шифрованием.');
          $$('[data-pick]', d).forEach(b => b.setAttribute('aria-pressed', String(picked.has(b.dataset.pick))));
        };
        d.addEventListener('click', e => {
          const nm = e.target.closest('[data-nm]'); if (nm) { mode = nm.dataset.nm; if (mode === 'dm' && picked.size > 1) picked.clear(); sync(); (mode === 'group' ? f.elements.title : f.login).focus(); return; }
          const pk = e.target.closest('[data-pick]'); if (!pk) return; const l = pk.dataset.pick;
          if (mode === 'dm') { picked.clear(); picked.add(l); f.login.value = l; } else picked.has(l) ? picked.delete(l) : picked.add(l);
          sync();
        });
        f.addEventListener('submit', async e => {
          e.preventDefault(); const b = $('button[type=submit]', f);
          const typed = f.login.value.split(/[\s,;]+/).map(s => s.replace(/^@/, '').trim()).filter(Boolean);
          if (mode === 'dm') {
            const l = typed[0] || [...picked][0]; if (!l) return setMsg(f, 'login', tr('Enter a login', 'Введи логин'));
            busyBtn(b, true);
            try { const j = await api('chat', { method: 'POST', body: { op: 'dm', login: l } }); close('ok'); location.hash = '#/chat/' + j.id; loadList(); }
            catch (ex) { setMsg(f, 'login', errText(ex)); busyBtn(b, false); }
          } else {
            const title = f.elements.title.value.trim(); if (!title) return setMsg(f, 'title', errText({ code: 'title_bad' }));
            const logins = [...new Set([...picked, ...typed])].filter(l => l.toLowerCase() !== myL.toLowerCase());
            busyBtn(b, true);
            try { const j = await api('chat', { method: 'POST', body: { op: 'group', title, logins } }); close('ok'); if (j.skipped && j.skipped.length) toast(tr(`Not added: ${j.skipped.map(x => '@' + x).join(', ')}`, `Не добавлены: ${j.skipped.map(x => '@' + x).join(', ')}`)); else toast(tr('The group was created', 'Группа создана')); setTab('chats'); location.hash = '#/chat/' + j.id; loadList(); }
            catch (ex) { setMsg(f, 'title', errText(ex)); busyBtn(b, false); }
          }
        });
      }
    });
  }

  const offE2e = on('e2e', () => { if (S && S.chat && S.chat.kind === 'dm' && !S.localOk) { E2E.local(myL).then(loc => { if (!S || !loc) return; S.localOk = !S.chat.mePub || loc.pub === S.chat.mePub; if (S.localOk) { paintHead(S); paintFoot(S); paintMsgs(S); } }); } });
  const onVis = () => { if (document.visibilityState === 'visible' && S) poll(S); };
  document.addEventListener('visibilitychange', onVis);
  onCleanup(() => { alive = false; clearTimeout(tl); clearTimeout(tm); clearTimeout(tf); offE2e(); document.removeEventListener('visibilitychange', onVis); setTimeout(() => Auth.pollUnread(), 50); });
  listLoop(); frLoop(); openChat(cid0 ? +cid0 : null);
  return { title: tr('Chats', 'Чаты'), nav: 'chat', noFooter: true, auth: true, relang: true, softRe: CH_RE, soft: ([id]) => { openChat(id ? +id : null); return true; } };
});

/* ---------- Connect in the top bar: unread chats counter ---------- */
function paintConnect() {
  const n = Auth.user && Auth.unread ? Auth.unread.chat || 0 : 0;
  $$('[data-cn]').forEach(b => { const was = +(b.dataset.n || 0); b.dataset.n = n; b.textContent = n ? (n > 99 ? '99+' : String(n)) : ''; b.classList.toggle('on', n > 0); if (n > was && !reduced()) { b.classList.remove('ping'); void b.offsetWidth; b.classList.add('ping'); } });
  $$('a[data-nav="chat"]').forEach(a => a.setAttribute('aria-label', 'Connect' + (n ? ` – ${tr('unread', 'непрочитанных')}: ${n}` : '')));
}
on('unread', paintConnect);

/* ---------- profile music: a Telegram-style player, Spotify embeds and the uploader that reads tags ---------- */
const MUS = { types: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'], max: 6 * 1024 * 1024,
  ext: { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm' } };
const fmtDur = s => { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function musMime(f) {
  let t = String(f.type || '').toLowerCase(); if (t === 'audio/mp3') t = 'audio/mpeg'; if (t === 'audio/x-flac') t = 'audio/flac'; if (t === 'audio/opus') t = 'audio/ogg'; if (t === 'audio/vnd.wave' || t === 'audio/wave') t = 'audio/wav';
  if (MUS.types.includes(t)) return t;
  const x = (String(f.name || '').match(/\.([a-z0-9]{2,5})$/i) || [])[1]; return (x && MUS.ext[x.toLowerCase()]) || null;
}
/* ---- tags: ID3v2 (MP3), MP4 atoms (M4A), FLAC / Ogg Vorbis comments, WAV LIST INFO ---- */
const tStr = (u, p, n) => { let s = ''; for (let i = 0; i < n && p + i < u.length; i++) s += String.fromCharCode(u[p + i]); return s; };
const tUtf8 = b => new TextDecoder('utf-8').decode(b).replace(/\0+$/, '').trim();
function tLatin(b) {
  let hi = 0, cy = 0; for (const x of b) { if (x >= 0x80) hi++; if (x >= 0xc0 || x === 0xa8 || x === 0xb8) cy++; }
  const cp = hi >= 3 && cy / Math.max(1, b.length) > .3 ? 'windows-1251' : 'iso-8859-1';
  try { return new TextDecoder(cp).decode(b).replace(/\0+$/, '').trim(); } catch (e) { return tStr(b, 0, b.length).trim(); }
}
function id3Text(d) {
  const e = d[0], b = d.subarray(1);
  let s = e === 1 ? new TextDecoder('utf-16').decode(b) : e === 2 ? new TextDecoder('utf-16be').decode(b) : e === 3 ? new TextDecoder('utf-8').decode(b) : tLatin(b.subarray(0, b.indexOf(0) >= 0 ? b.indexOf(0) : b.length));
  return s.replace(/^\ufeff/, '').split('\0').filter(Boolean).join(', ').trim();
}
function id3Pic(d, v2) {
  const e = d[0]; let p = 1, mime = 'image/jpeg';
  if (v2) { if (tStr(d, 1, 3).toUpperCase() === 'PNG') mime = 'image/png'; p = 4; }
  else { const z = d.indexOf(0, 1); if (z < 0) return null; const m = tStr(d, 1, z - 1).toLowerCase(); mime = /\//.test(m) ? m : m === 'png' ? 'image/png' : 'image/jpeg'; p = z + 1; }
  p += 1;
  if (e === 1 || e === 2) { while (p + 1 < d.length && !(d[p] === 0 && d[p + 1] === 0)) p += 2; p += 2; } else { while (p < d.length && d[p] !== 0) p++; p++; }
  return p < d.length ? new Blob([d.slice(p)], { type: mime }) : null;
}
function tagsId3(u, dv) {
  const ver = u[3], syn = (a, b, c, d) => (a << 21) | (b << 14) | (c << 7) | d, size = syn(u[6], u[7], u[8], u[9]), end = Math.min(10 + size, u.length), out = {};
  let p = 10; if (u[5] & 0x40) p += ver === 4 ? syn(u[10], u[11], u[12], u[13]) : dv.getUint32(10) + 4;
  while (p + 10 < end) {
    let id, fs, hl;
    if (ver === 2) { id = tStr(u, p, 3); fs = (u[p + 3] << 16) | (u[p + 4] << 8) | u[p + 5]; hl = 6; }
    else { id = tStr(u, p, 4); fs = ver === 4 ? syn(u[p + 4], u[p + 5], u[p + 6], u[p + 7]) : dv.getUint32(p + 4); hl = 10; }
    if (!/^[A-Z0-9]{3,4}$/.test(id) || fs <= 0 || p + hl + fs > u.length) break;
    const d = u.subarray(p + hl, p + hl + fs);
    try {
      if (id === 'TIT2' || id === 'TT2') out.title = id3Text(d);
      else if (id === 'TPE1' || id === 'TP1') out.artist = id3Text(d);
      else if (id === 'TALB' || id === 'TAL') out.album = id3Text(d);
      else if ((id === 'APIC' || id === 'PIC') && !out.pic) out.pic = id3Pic(d, id === 'PIC');
    } catch (e) { }
    p += hl + fs;
  }
  return out;
}
function tagsMp4(u, dv) {
  const out = {};
  const walk = (s, e, path, depth) => {
    let p = s;
    while (p + 8 <= e && depth < 8) {
      let sz = dv.getUint32(p), h = 8; const tp = tStr(u, p + 4, 4);
      if (sz === 1) { sz = Number(dv.getBigUint64(p + 8)); h = 16; } else if (sz === 0) sz = e - p;
      if (sz < h || p + sz > e) break;
      const cs = p + h, ce = p + sz;
      if (tp === 'moov' || tp === 'udta' || tp === 'ilst') walk(cs, ce, tp, depth + 1);
      else if (tp === 'meta') walk(cs + 4, ce, tp, depth + 1);
      else if (path === 'ilst') {
        let q = cs;
        while (q + 16 <= ce) {
          const s2 = dv.getUint32(q); if (s2 < 16 || q + s2 > ce) break;
          if (tStr(u, q + 4, 4) === 'data') {
            const ty = dv.getUint32(q + 8) & 0xffffff, pl = u.subarray(q + 16, q + s2);
            if (tp === '\xa9nam') out.title = tUtf8(pl); else if (tp === '\xa9ART') out.artist = tUtf8(pl); else if (tp === 'aART' && !out.artist) out.artist = tUtf8(pl);
            else if (tp === '\xa9alb') out.album = tUtf8(pl); else if (tp === 'covr' && !out.pic) out.pic = new Blob([pl.slice()], { type: ty === 14 ? 'image/png' : 'image/jpeg' });
            break;
          }
          q += s2;
        }
      }
      p += sz;
    }
  };
  walk(0, u.length, '', 0);
  return out;
}
function flacPic(dv, u, p) {
  p += 4; const ml = dv.getUint32(p); p += 4; const mime = tStr(u, p, ml) || 'image/jpeg'; p += ml;
  const dl = dv.getUint32(p); p += 4 + dl + 16; const n = dv.getUint32(p); p += 4;
  return n > 0 && p + n <= u.length ? new Blob([u.slice(p, p + n)], { type: mime }) : null;
}
function vorbisC(u, dv, p, end, out) {
  const vl = dv.getUint32(p, true); p += 4 + vl; if (p + 4 > end) return; const n = dv.getUint32(p, true); p += 4;
  for (let i = 0; i < n && p + 4 <= end; i++) {
    const l = dv.getUint32(p, true); p += 4; if (p + l > end) break;
    const s = tUtf8(u.subarray(p, p + l)); p += l; const k = s.slice(0, s.indexOf('=')).toUpperCase(), v = s.slice(s.indexOf('=') + 1).trim();
    if (k === 'TITLE' && !out.title) out.title = v; else if (k === 'ARTIST' && !out.artist) out.artist = v; else if (k === 'ALBUM' && !out.album) out.album = v;
    else if (k === 'METADATA_BLOCK_PICTURE' && !out.pic) { try { const b = Uint8Array.from(atob(v), c => c.charCodeAt(0)); out.pic = flacPic(new DataView(b.buffer), b, 0); } catch (e) { } }
  }
}
function tagsFlac(u, dv) {
  const out = {}; let p = 4;
  while (p + 4 <= u.length) {
    const h = u[p], last = h & 0x80, type = h & 0x7f, len = (u[p + 1] << 16) | (u[p + 2] << 8) | u[p + 3]; p += 4;
    if (p + len > u.length) break;
    try { if (type === 4) vorbisC(u, dv, p, p + len, out); else if (type === 6 && !out.pic) out.pic = flacPic(dv, u, p); } catch (e) { }
    p += len; if (last) break;
  }
  return out;
}
function tagsOgg(u, dv) {
  const out = {}, lim = Math.min(u.length, 262144);
  for (let i = 0; i < lim - 8; i++) {
    const v = u[i] === 3 && tStr(u, i + 1, 6) === 'vorbis' ? i + 7 : u[i] === 0x4f && tStr(u, i, 8) === 'OpusTags' ? i + 8 : 0;
    if (v) { try { vorbisC(u, dv, v, u.length, out); } catch (e) { } break; }
  }
  return out;
}
function tagsWav(u, dv) {
  const out = {}; let p = 12;
  while (p + 8 <= u.length) {
    const id = tStr(u, p, 4), sz = dv.getUint32(p + 4, true);
    if (id === 'LIST' && tStr(u, p + 8, 4) === 'INFO') {
      let q = p + 12; const e = Math.min(u.length, p + 8 + sz);
      while (q + 8 <= e) { const k = tStr(u, q, 4), l = dv.getUint32(q + 4, true), s = tLatin(u.subarray(q + 8, q + 8 + l)); if (k === 'INAM') out.title = s; else if (k === 'IART') out.artist = s; else if (k === 'IPRD') out.album = s; q += 8 + l + (l & 1); }
    }
    p += 8 + sz + (sz & 1);
  }
  return out;
}
async function readTags(file) {
  let out = {};
  try {
    const u = new Uint8Array(await file.arrayBuffer()), dv = new DataView(u.buffer), h = tStr(u, 0, 12);
    if (h.startsWith('ID3')) out = tagsId3(u, dv);
    else if (h.slice(4, 8) === 'ftyp') out = tagsMp4(u, dv);
    else if (h.startsWith('fLaC')) out = tagsFlac(u, dv);
    else if (h.startsWith('OggS')) out = tagsOgg(u, dv);
    else if (h.startsWith('RIFF') && h.slice(8, 12) === 'WAVE') out = tagsWav(u, dv);
  } catch (e) { }
  const base = String(file.name || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ').trim(), m = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!out.title) { out.title = m ? m[2] : base; if (m && !out.artist) out.artist = m[1]; }
  ['title', 'artist', 'album'].forEach(k => { out[k] = String(out[k] || '').slice(0, 120); });
  return out;
}
function audioDur(file) {
  return new Promise(res => {
    const a = new Audio(), url = URL.createObjectURL(file); let done = false;
    const fin = d => { if (done) return; done = true; URL.revokeObjectURL(url); a.removeAttribute('src'); res(isFinite(d) && d > 0 ? Math.round(d) : null); };
    a.preload = 'metadata'; a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(null); setTimeout(() => fin(null), 8000); a.src = url;
  });
}
async function coverJpeg(blob) {
  if (!blob) return null; const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight); if (!s) return null;
    for (const [n, q] of [[420, .86], [360, .82], [300, .78], [240, .72], [180, .66]]) {
      const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#111'; g.fillRect(0, 0, n, n);
      g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, n, n);
      const d = c.toDataURL('image/jpeg', q); if (d.length <= 158000) return d;
    }
    return null;
  } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
}
const blobB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).slice(String(r.result).indexOf(',') + 1)); r.onerror = rej; r.readAsDataURL(b); });
async function musicUpload(file, meta, cover, onProg) {
  const mime = musMime(file); if (!mime || file.size > MUS.max || file.size < 1000) throw { code: file.size > MUS.max ? 'music_big' : 'music_bad' };
  const j = await api('music', { method: 'POST', body: { op: 'begin', size: file.size, mime, meta, cover: cover || null } });
  onProg && onProg(0);
  for (let i = 0; i < j.parts; i++) {
    const data = await blobB64(file.slice(i * j.part, Math.min(file.size, (i + 1) * j.part)));
    for (let t = 0; ; t++) {
      try { await api('music', { method: 'POST', body: { op: 'part', ver: j.ver, idx: i, data } }); break; }
      catch (e) { if (t >= 2 || (e.status && e.status < 500 && e.status !== 429)) throw e; await new Promise(r => setTimeout(r, 900 * (t + 1))); }
    }
    onProg && onProg((i + 1) / j.parts);
  }
  return (await api('music', { method: 'POST', body: { op: 'done', ver: j.ver } })).user;
}
/* ---- Spotify ---- */
function spotifyParse(v) {
  v = String(v || '').trim(); if (!v) return '';
  const m = v.match(/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})/i) || v.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]{22})$/i);
  return m ? m[1].toLowerCase() + ':' + m[2] : null;
}
const spotifyUrl = s => { const [t, id] = String(s).split(':'); return `https://open.spotify.com/${t}/${id}`; };
function spotifyHtml(s, compact) {
  const [t, id] = String(s || '').split(':'); if (!id) return '';
  const h = compact || t === 'track' || t === 'episode' ? 152 : 352;
  return `<div class="spot${h === 152 ? ' sm' : ''}"><iframe title="Spotify" src="https://open.spotify.com/embed/${esc(t)}/${esc(id)}?utm_source=generator&amp;theme=0" width="100%" height="${h}" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>`;
}
/* ---- player: one shared <audio>, many views ---- */
const MP = { a: null, url: '', blobs: new Map(), seek: null, meta: null, fb: false };
function mpHtml(m, cls = '') {
  if (!m || !m.url) return '';
  const t = m.title || tr('Untitled', 'Без названия'), sub = [m.artist, m.album].filter(Boolean).join(' · ');
  return `<div class="mp${cls ? ' ' + cls : ''}" data-mp="${esc(m.url)}" data-size="${+m.size || 0}" data-mime="${esc(m.mime || '')}" data-dur="${+m.dur || 0}" data-t="${esc(t)}" data-ar="${esc(m.artist || '')}" data-al="${esc(m.album || '')}" data-cv="${esc(m.cover || '')}">
  <button type="button" class="mp-cov" data-mpp aria-label="${esc(tr('Play', 'Слушать') + ': ' + t)}">${m.cover ? `<img src="${esc(m.cover)}" alt="" decoding="async" loading="lazy">` : `<span class="mp-ph">${ic('music')}</span>`}<span class="mp-btn"><span class="mp-i1">${ic('play')}</span><span class="mp-i2">${ic('pause')}</span><span class="spin" aria-hidden="true"></span></span></button>
  <div class="mp-b"><div class="mp-tt"><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>
  <div class="mp-row"><span class="mp-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="mp-trk" data-mpt role="slider" tabindex="0" aria-label="${esc(tr('Position', 'Позиция'))}" aria-valuemin="0" aria-valuemax="${Math.round(+m.dur || 0)}" aria-valuenow="0" aria-valuetext="0:00"><i class="mp-buf"></i><i class="mp-fill"></i><b class="mp-knob"></b></div><span class="mp-time" data-mptime>${fmtDur(m.dur)}</span></div></div></div>`;
}
const mpViews = () => MP.url ? $$('[data-mp]').filter(x => x.dataset.mp === MP.url) : [];
function mpAudio() {
  if (MP.a) return MP.a;
  const a = MP.a = new Audio(); a.preload = 'metadata';
  ['play', 'pause', 'playing', 'waiting', 'canplay', 'ended'].forEach(ev => a.addEventListener(ev, mpState));
  ['timeupdate', 'progress', 'durationchange', 'seeked'].forEach(ev => a.addEventListener(ev, mpPaint));
  a.addEventListener('loadedmetadata', () => { if (MP.seek != null && isFinite(a.duration)) { a.currentTime = MP.seek * a.duration; MP.seek = null; } mpPaint(); });
  a.addEventListener('ended', () => { a.currentTime = 0; mpPaint(); });
  a.addEventListener('error', mpFallback);
  return a;
}
function mpDur(el) { const a = MP.a; return a && isFinite(a.duration) && a.duration > 0 ? a.duration : +((el && el.dataset.dur) || 0); }
function mpState() {
  const a = MP.a; if (!a) return; const on = !a.paused && !a.ended, load = on && a.readyState < 3;
  $$('.mp.on').forEach(x => { if (x.dataset.mp !== MP.url) x.classList.remove('on', 'playing', 'loading'); });
  mpViews().forEach(x => { x.classList.add('on'); x.classList.toggle('playing', on); x.classList.toggle('loading', load); const b = $('[data-mpp]', x); b && b.setAttribute('aria-label', (on ? tr('Pause', 'Пауза') : tr('Play', 'Слушать')) + ': ' + x.dataset.t); });
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
}
function mpPaint() {
  const a = MP.a; if (!a) return;
  mpViews().forEach(x => {
    const d = mpDur(x), p = d ? Math.min(1, a.currentTime / d) : 0, t = $('[data-mpt]', x);
    let buf = 0; try { if (a.buffered.length && d) buf = Math.min(1, a.buffered.end(a.buffered.length - 1) / d); } catch (e) { }
    if (t) { t.style.setProperty('--p', (p * 100).toFixed(2) + '%'); t.style.setProperty('--b', (buf * 100).toFixed(1) + '%'); t.setAttribute('aria-valuenow', String(Math.round(a.currentTime))); t.setAttribute('aria-valuetext', fmtDur(a.currentTime)); }
    const tm = $('[data-mptime]', x); if (tm) tm.textContent = a.currentTime > 0 ? fmtDur(a.currentTime) + ' / ' + fmtDur(d) : fmtDur(d);
  });
}
async function mpFallback() {
  const a = MP.a, el = mpViews()[0]; if (!a || !MP.url || MP.fb || MP.blobs.has(MP.url)) { if (MP.url && MP.fb) toast(tr('Could not play the track', 'Не удалось включить трек')); mpState(); return; }
  MP.fb = true; const url = MP.url, size = +((el && el.dataset.size) || 0), n = Math.max(1, Math.ceil(size / 2097152));
  mpViews().forEach(x => x.classList.add('loading'));
  try {
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => fetch(url + '&p=' + i, { credentials: 'same-origin' }).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('http')))));
    const bu = URL.createObjectURL(new Blob(parts, { type: (el && el.dataset.mime) || 'audio/mpeg' })); MP.blobs.set(url, bu);
    if (MP.url !== url) return; a.src = bu; await a.play();
  } catch (e) { toast(tr('Could not play the track', 'Не удалось включить трек')); mpState(); }
}
function mpSession(el) {
  if (!('mediaSession' in navigator) || !el) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: el.dataset.t || '', artist: el.dataset.ar || '', album: el.dataset.al || '', artwork: el.dataset.cv ? [{ src: new URL(el.dataset.cv, location.href).href, sizes: '420x420', type: 'image/jpeg' }] : [] });
    navigator.mediaSession.setActionHandler('play', () => MP.a && MP.a.play());
    navigator.mediaSession.setActionHandler('pause', () => MP.a && MP.a.pause());
  } catch (e) { }
}
function mpToggle(el, at) {
  const a = mpAudio(), url = el.dataset.mp;
  if (MP.url === url && a.src) { if (at != null) { const d = mpDur(el); if (d) a.currentTime = at * d; if (a.paused) a.play().catch(() => { }); } else if (a.paused) a.play().catch(() => { }); else a.pause(); return; }
  a.pause(); MP.url = url; MP.fb = false; MP.seek = at != null ? at : null;
  a.src = MP.blobs.get(url) || url; mpSession(el); mpState();
  a.play().catch(() => { });
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-mpp]'); if (!b) return; const el = b.closest('[data-mp]'); if (el) mpToggle(el); });
document.addEventListener('pointerdown', e => {
  const t = e.target.closest && e.target.closest('[data-mpt]'); if (!t || e.button > 0) return; const el = t.closest('[data-mp]'); if (!el) return;
  e.preventDefault(); const frac = ev => { const r = t.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
  mpToggle(el, frac(e));
  const mv = ev => { if (MP.url === el.dataset.mp && MP.a) { const d = mpDur(el); if (d) MP.a.currentTime = frac(ev) * d; } };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
});
document.addEventListener('keydown', e => {
  const t = e.target.closest && e.target.closest('[data-mpt]'); if (!t) return; const el = t.closest('[data-mp]');
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); return mpToggle(el); }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
  if (MP.url !== el.dataset.mp || !MP.a) return; MP.a.currentTime = Math.max(0, Math.min(mpDur(el), MP.a.currentTime + (e.key === 'ArrowRight' ? 5 : -5)));
});
addEventListener('hashchange', () => { if (MP.a && !MP.a.paused) MP.a.pause(); });
on('auth', () => { if (MP.a) { MP.a.pause(); MP.a.removeAttribute('src'); } MP.url = ''; });

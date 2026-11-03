'use strict';
/* lynx. accounts API – one serverless function, routed by ?r= */
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

let qfn = null, ready = null;
function db() {
  if (qfn) return qfn;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw err(503, 'no_db');
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(url);
  qfn = (text, params = []) => sql.query(text, params);
  return qfn;
}
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL, email_lc TEXT NOT NULL UNIQUE, login TEXT NOT NULL, login_lc TEXT NOT NULL UNIQUE,
    nick TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', avatar TEXT, pw TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb, data_ts BIGINT NOT NULL DEFAULT 0, stats JSONB NOT NULL DEFAULT '{}'::jsonb, pub_sets JSONB NOT NULL DEFAULT '[]'::jsonb,
    failed INT NOT NULL DEFAULT 0, lock_until TIMESTAMPTZ, login_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), seen_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS users_seen_idx ON users(seen_at DESC)`
];
function init() {
  if (!ready) ready = (async () => { const q = db(); for (const s of SCHEMA) await q(s); })().catch(e => { ready = null; throw e; });
  return ready;
}

/* ---------- helpers ---------- */
function err(status, code, extra) { const e = new Error(code); e.status = status; e.code = code; e.extra = extra; return e; }
const LOGIN_RE = /^[A-Za-z0-9_]{4,24}$/, EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const RESERVED = new Set(['admin', 'administrator', 'root', 'support', 'lynx', 'lynx_team', 'moderator', 'system', 'null', 'undefined', 'help', 'about', 'people', 'login', 'signup', 'settings']);
const pwOk = s => typeof s === 'string' && s.length >= 8 && s.length <= 128 && /\d/.test(s) && /\p{Lu}/u.test(s) && /[^\p{L}\p{N}\s]/u.test(s);
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().slice(0, max * 2);
const len = s => [...s].length;
const DAY = 864e5, SESSION_DAYS = 30, LOCK_MIN = 5, MAX_FAILS = 5;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
async function hashPw(pw) { const salt = crypto.randomBytes(16); const h = await scrypt(pw.normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1 }); return `s1$16384$8$1$${salt.toString('base64')}$${h.toString('base64')}`; }
async function checkPw(pw, stored) {
  const p = String(stored || '').split('$');
  if (p.length !== 6 || p[0] !== 's1') { await scrypt('x', 'dummy-salt-value', 64); return false; }
  const want = Buffer.from(p[5], 'base64');
  const got = await scrypt(String(pw || '').normalize('NFKC'), Buffer.from(p[4], 'base64'), want.length, { N: +p[1], r: +p[2], p: +p[3] });
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const DUMMY = 's1$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');
function cookies(req) { const o = {}; String(req.headers.cookie || '').split(';').forEach(c => { const i = c.indexOf('='); if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); }); return o; }
const secure = req => (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https' || !/^(localhost|127\.)/.test(String(req.headers.host || ''));
function setCookie(ctx, token, maxAge) { ctx.cookie = `lynx_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(ctx.req) ? '; Secure' : ''}`; }
async function newSession(ctx, uid) {
  const tok = crypto.randomBytes(32).toString('base64url');
  await db()(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`, [sha(tok), uid]);
  await db()(`DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()`, [uid]);
  setCookie(ctx, tok, SESSION_DAYS * 86400);
}
async function current(ctx) {
  const tok = cookies(ctx.req).lynx_sid; if (!tok || tok.length > 100) return null;
  const rows = await db()(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha(tok)]);
  if (rows[0]) ctx.tokHash = sha(tok);
  return rows[0] || null;
}
async function need(ctx) { const u = await current(ctx); if (!u) throw err(401, 'auth'); return u; }
const iso = d => d ? new Date(d).toISOString() : null;
function self(u) {
  return { login: u.login, nick: u.nick, bio: u.bio, avatar: u.avatar || null, email: u.email, created: iso(u.created_at),
    nextLoginChange: u.login_changed_at ? new Date(new Date(u.login_changed_at).getTime() + 30 * DAY).toISOString() : null };
}
const pub = u => ({ login: u.login, nick: u.nick, bio: u.bio, avatar: u.avatar || null, created: iso(u.created_at), seen: iso(u.seen_at) });
const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
function computeStats(d) {
  const P = Array.isArray(d.progress) ? d.progress.filter(e => e && typeof e === 'object') : [];
  const tasks = new Set(), skills = { L: { n: 0, best: null }, R: { n: 0, best: null }, W: { n: 0 }, S: { n: 0 } };
  let variants = 0;
  for (const e of P) {
    if (e.kind === 'variant') { variants++; continue; }
    const m = /^([ABC])-([LRWS])$/.exec(String(e.taskId || ''));
    if (!m) continue;
    tasks.add(e.taskId); const s = skills[m[2]]; s.n++;
    if ('best' in s && num(e.percent) != null) s.best = Math.max(s.best == null ? 0 : s.best, Math.round(e.percent));
  }
  const recent = P.slice(-6).reverse().map(e => ({ taskId: String(e.taskId || '').slice(0, 20) || null, variantId: e.variantId ? String(e.variantId).slice(0, 40) : null, kind: String(e.kind || '').slice(0, 12), score: num(e.score), total: num(e.total), date: String(e.date || '').slice(0, 30), title: e.extra && e.extra.title ? String(e.extra.title).slice(0, 80) : null }));
  const lv = d.profile && /^[ABC]$/.test(d.profile.level || '') ? d.profile.level : null;
  return { attempts: P.length, tasks: tasks.size, variants, skills, recent, level: lv };
}
function publicSets(d) {
  return (Array.isArray(d.sets) ? d.sets : []).filter(s => s && s.public && Array.isArray(s.items) && s.items.length).slice(0, 30)
    .map(s => ({ id: String(s.id || '').slice(0, 40), name: String(s.name || '').slice(0, 80), mode: s.mode === 'exam' ? 'exam' : 'practice', items: s.items.slice(0, 40), created: num(s.created) }));
}
function sanitizeData(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
  const out = { progress: Array.isArray(d.progress) ? d.progress.slice(-3000) : [], profile: d.profile && typeof d.profile === 'object' && !Array.isArray(d.profile) ? d.profile : {}, sets: Array.isArray(d.sets) ? d.sets.slice(0, 200) : [], drafts: d.drafts && typeof d.drafts === 'object' && !Array.isArray(d.drafts) ? d.drafts : {} };
  if (JSON.stringify(out).length > 900000) throw err(413, 'too_big');
  return out;
}
async function loginTaken(lc, exceptId = 0) { if (RESERVED.has(lc)) return true; const r = await db()(`SELECT 1 FROM users WHERE login_lc = $1 AND id <> $2`, [lc, exceptId]); return r.length > 0; }

/* ---------- routes ---------- */
const R = {};
R['GET check'] = async ctx => {
  const login = String(ctx.q.get('login') || '').trim();
  if (!LOGIN_RE.test(login)) return { ok: false, reason: 'login_bad' };
  return (await loginTaken(login.toLowerCase())) ? { ok: false, reason: 'login_taken' } : { ok: true };
};
R['POST signup'] = async ctx => {
  const b = ctx.body, email = clean(b.email, 254), login = clean(b.login, 24), nick = clean(b.nick, 32);
  if (!EMAIL_RE.test(email) || email.length > 254) throw err(400, 'email_bad');
  if (!LOGIN_RE.test(login)) throw err(400, 'login_bad');
  if (!nick || len(nick) > 32) throw err(400, 'nick_bad');
  if (!pwOk(b.password)) throw err(400, 'pw_weak');
  const q = db();
  if ((await q(`SELECT 1 FROM users WHERE email_lc = $1`, [email.toLowerCase()])).length) throw err(409, 'email_taken');
  if (await loginTaken(login.toLowerCase())) throw err(409, 'login_taken');
  const data = sanitizeData(b.data), ts = Date.now();
  let rows;
  try {
    rows = await q(`INSERT INTO users (email, email_lc, login, login_lc, nick, pw, data, data_ts, stats, pub_sets) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb) RETURNING *`,
      [email, email.toLowerCase(), login, login.toLowerCase(), nick, await hashPw(b.password), JSON.stringify(data), ts, JSON.stringify(computeStats(data)), JSON.stringify(publicSets(data))]);
  } catch (e) { if (e.code === '23505') throw err(409, /email/.test(e.message + (e.detail || '') + (e.constraint || '')) ? 'email_taken' : 'login_taken'); throw e; }
  await newSession(ctx, rows[0].id);
  return { status: 201, body: { user: self(rows[0]), ts } };
};
R['POST login'] = async ctx => {
  const id = clean(ctx.body.id, 254).toLowerCase(), pw = String(ctx.body.password || '');
  if (!id || !pw) throw err(400, 'creds');
  const q = db();
  const rows = await q(id.includes('@') ? `SELECT * FROM users WHERE email_lc = $1` : `SELECT * FROM users WHERE login_lc = $1`, [id]);
  const u = rows[0];
  if (!u) { await checkPw(pw, DUMMY); throw err(401, 'creds'); }
  if (u.lock_until && new Date(u.lock_until) > new Date()) throw err(429, 'locked', { minutes: Math.max(1, Math.ceil((new Date(u.lock_until) - Date.now()) / 6e4)) });
  if (!(await checkPw(pw, u.pw))) {
    const f = (u.failed || 0) + 1;
    if (f >= MAX_FAILS) { await q(`UPDATE users SET failed = 0, lock_until = now() + interval '${LOCK_MIN} minutes' WHERE id = $1`, [u.id]); throw err(429, 'locked', { minutes: LOCK_MIN }); }
    await q(`UPDATE users SET failed = $2 WHERE id = $1`, [u.id, f]);
    throw err(401, 'creds');
  }
  await q(`UPDATE users SET failed = 0, lock_until = NULL, seen_at = now() WHERE id = $1`, [u.id]);
  await newSession(ctx, u.id);
  return { user: self(u), data: u.data || {}, ts: Number(u.data_ts) || 0 };
};
R['POST logout'] = async ctx => {
  const tok = cookies(ctx.req).lynx_sid;
  if (tok) await db()(`DELETE FROM sessions WHERE token_hash = $1`, [sha(tok)]);
  setCookie(ctx, '', 0);
  return { ok: true };
};
R['GET me'] = async ctx => {
  const u = await current(ctx);
  if (!u) { if (cookies(ctx.req).lynx_sid) setCookie(ctx, '', 0); return { user: null }; }
  if (Date.now() - new Date(u.seen_at).getTime() > 5 * 6e4) await db()(`UPDATE users SET seen_at = now() WHERE id = $1`, [u.id]);
  return { user: self(u), data: u.data || {}, ts: Number(u.data_ts) || 0 };
};
R['PUT data'] = async ctx => {
  const u = await need(ctx), data = sanitizeData(ctx.body.data), base = Number(ctx.body.base) || 0, cur = Number(u.data_ts) || 0;
  if (cur && base !== cur) return { status: 409, body: { error: 'conflict', data: u.data || {}, ts: cur } };
  const ts = Math.max(Date.now(), cur + 1);
  const r = await db()(`UPDATE users SET data = $2::jsonb, data_ts = $3, stats = $4::jsonb, pub_sets = $5::jsonb, seen_at = now() WHERE id = $1 AND data_ts = $6 RETURNING id`,
    [u.id, JSON.stringify(data), ts, JSON.stringify(computeStats(data)), JSON.stringify(publicSets(data)), cur]);
  if (!r.length) { const fresh = (await db()(`SELECT data, data_ts FROM users WHERE id = $1`, [u.id]))[0]; return { status: 409, body: { error: 'conflict', data: fresh.data, ts: Number(fresh.data_ts) } }; }
  return { ts };
};
R['PATCH profile'] = async ctx => {
  const u = await need(ctx), b = ctx.body, set = [], vals = [u.id];
  const put = (col, v) => { vals.push(v); set.push(`${col} = $${vals.length}`); };
  if ('nick' in b) { const n = clean(b.nick, 32); if (!n || len(n) > 32) throw err(400, 'nick_bad'); put('nick', n); }
  if ('bio' in b) { const s = clean(b.bio, 200); if (len(s) > 200) throw err(400, 'bio_bad'); put('bio', s); }
  if ('avatar' in b) {
    if (b.avatar === null || b.avatar === '') put('avatar', null);
    else { const a = String(b.avatar); if (a.length > 300000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a)) throw err(400, 'avatar_bad'); put('avatar', a); }
  }
  if ('login' in b) {
    const l = clean(b.login, 24);
    if (l !== u.login) {
      if (!LOGIN_RE.test(l)) throw err(400, 'login_bad');
      if (u.login_changed_at && Date.now() < new Date(u.login_changed_at).getTime() + 30 * DAY) throw err(429, 'login_wait', { until: new Date(new Date(u.login_changed_at).getTime() + 30 * DAY).toISOString() });
      if (l.toLowerCase() !== u.login_lc && await loginTaken(l.toLowerCase(), u.id)) throw err(409, 'login_taken');
      put('login', l); put('login_lc', l.toLowerCase()); set.push('login_changed_at = now()');
    }
  }
  if (!set.length) return { user: self(u) };
  let rows;
  try { rows = await db()(`UPDATE users SET ${set.join(', ')} WHERE id = $1 RETURNING *`, vals); }
  catch (e) { if (e.code === '23505') throw err(409, 'login_taken'); throw e; }
  return { user: self(rows[0]) };
};
R['POST password'] = async ctx => {
  const u = await need(ctx);
  if (!(await checkPw(ctx.body.old, u.pw))) throw err(400, 'pw_wrong');
  if (!pwOk(ctx.body.password)) throw err(400, 'pw_weak');
  await db()(`UPDATE users SET pw = $2 WHERE id = $1`, [u.id, await hashPw(ctx.body.password)]);
  await db()(`DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`, [u.id, ctx.tokHash]);
  return { ok: true };
};
R['POST delete'] = async ctx => {
  const u = await need(ctx);
  if (!(await checkPw(ctx.body.password, u.pw))) throw err(400, 'pw_wrong');
  await db()(`DELETE FROM users WHERE id = $1`, [u.id]);
  setCookie(ctx, '', 0);
  return { ok: true };
};
R['GET user'] = async ctx => {
  const l = String(ctx.q.get('login') || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(l)) throw err(404, 'not_found');
  const rows = await db()(`SELECT login, nick, bio, avatar, created_at, seen_at, stats, pub_sets FROM users WHERE login_lc = $1`, [l]);
  if (!rows[0]) throw err(404, 'not_found');
  return { user: { ...pub(rows[0]), stats: rows[0].stats || {}, sets: rows[0].pub_sets || [] } };
};
R['GET users'] = async ctx => {
  const q = clean(ctx.q.get('q'), 40).toLowerCase().replace(/^@/, '');
  const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%', pre = q.replace(/[\\%_]/g, '\\$&') + '%';
  const rows = await db()(`SELECT login, nick, bio, avatar, created_at, seen_at, stats FROM users
    WHERE ($1 = '' OR login_lc LIKE $2 OR lower(nick) LIKE $2)
    ORDER BY (login_lc = $1) DESC, (login_lc LIKE $3 OR lower(nick) LIKE $3) DESC, seen_at DESC LIMIT 30`, [q, like, pre]);
  return { users: rows.map(r => ({ ...pub(r), bio: (r.bio || '').slice(0, 140), attempts: (r.stats && r.stats.attempts) || 0, tasks: (r.stats && r.stats.tasks) || 0 })) };
};

/* ---------- entry ---------- */
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) { if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch (e) { throw err(400, 'bad_json'); } } if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8') || '{}'); } catch (e) { throw err(400, 'bad_json'); } } return req.body; }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 1500000) throw err(413, 'too_big'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { throw err(400, 'bad_json'); }
}
function send(res, status, obj, cookie) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (cookie) res.setHeader('Set-Cookie', cookie);
  res.end(JSON.stringify(obj));
}
async function handler(req, res) {
  const ctx = { req, cookie: null };
  try {
    const url = new URL(req.url, 'http://local');
    const r = String(url.searchParams.get('r') || ''), fn = R[req.method + ' ' + r];
    if (!fn) return send(res, 404, { error: 'no_route' });
    if (req.method !== 'GET') {
      if (req.headers['x-requested-with'] !== 'lynx') throw err(403, 'csrf');
      const origin = req.headers.origin;
      if (origin) { const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim(); let oh = ''; try { oh = new URL(origin).host; } catch (e) { } if (oh !== host) throw err(403, 'csrf'); }
    }
    ctx.q = url.searchParams;
    ctx.body = req.method === 'GET' ? {} : await readBody(req);
    if (!ctx.body || typeof ctx.body !== 'object') ctx.body = {};
    await init();
    const out = await fn(ctx);
    if (out && out.status) send(res, out.status, out.body, ctx.cookie); else send(res, 200, out, ctx.cookie);
  } catch (e) {
    const st = e.status || 500; if (st >= 500) console.error(e);
    send(res, st, { error: e.status ? e.code : 'server', ...(e.extra || {}) }, ctx.cookie);
  }
}
module.exports = handler;
module.exports.setDb = fn => { qfn = fn; ready = null; };

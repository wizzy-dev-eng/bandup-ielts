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
  `CREATE INDEX IF NOT EXISTS users_seen_idx ON users(seen_at DESC)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS banner TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS frame TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS socials JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_sets JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS ann_seen BIGINT NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS notifications (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', data JSONB NOT NULL DEFAULT '{}'::jsonb, read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id, id DESC)`,
  `CREATE TABLE IF NOT EXISTS announcements (id BIGSERIAL PRIMARY KEY, author_id BIGINT REFERENCES users(id) ON DELETE SET NULL, title TEXT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS flags (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, field TEXT NOT NULL, text TEXT NOT NULL,
    words JSONB NOT NULL DEFAULT '[]'::jsonb, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_by BIGINT, resolved_at TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS reset_requests (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_by BIGINT, decided_at TIMESTAMPTZ, expires_at TIMESTAMPTZ NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS mod_log (id BIGSERIAL PRIMARY KEY, actor_id BIGINT, target_id BIGINT, action TEXT NOT NULL, detail JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v JSONB NOT NULL DEFAULT 'true'::jsonb)`
];
function init() {
  if (!ready) ready = (async () => { const q = db(); for (const s of SCHEMA) await q(s); await bootstrap(q); })().catch(e => { ready = null; throw e; });
  return ready;
}
/* one-time: owner + admin roles, creator badges, scan of existing bios */
async function bootstrap(q) {
  if ((await q(`SELECT 1 FROM kv WHERE k = 'roles_v1'`)).length) return;
  if ((await q(`SELECT 1 FROM users WHERE role = 'owner'`)).length) { await q(`INSERT INTO kv (k) VALUES ('roles_v1') ON CONFLICT DO NOTHING`); return; }
  const own = await q(`UPDATE users SET role = 'owner', badges = '["wizzy","lead_dev"]'::jsonb WHERE login_lc = 'wizzy' RETURNING id`);
  if (!own.length) return;
  await q(`UPDATE users SET role = 'admin' WHERE login_lc = 'mrneoner' AND role = 'user'`);
  const all = await q(`SELECT id, login, nick, bio FROM users`);
  for (const u of all) { await autoFlag(u, 'nick', u.nick); await autoFlag(u, 'bio', u.bio); }
  await q(`INSERT INTO kv (k) VALUES ('roles_v1') ON CONFLICT DO NOTHING`);
}

/* ---------- helpers ---------- */
function err(status, code, extra) { const e = new Error(code); e.status = status; e.code = code; e.extra = extra; return e; }
const LOGIN_RE = /^[A-Za-z0-9_]{4,24}$/, EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const RESERVED = new Set(['admin', 'administrator', 'root', 'support', 'lynx', 'lynx_team', 'moderator', 'system', 'null', 'undefined', 'help', 'about', 'people', 'login', 'signup', 'settings', 'owner', 'notifications', 'services', 'forgot', 'staff', 'moderation']);
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
  if (rows[0] && isBanned(rows[0])) { await db()(`DELETE FROM sessions WHERE user_id = $1`, [rows[0].id]); return null; }
  if (rows[0]) ctx.tokHash = sha(tok);
  return rows[0] || null;
}
async function need(ctx) { const u = await current(ctx); if (!u) throw err(401, 'auth'); return u; }
const iso = d => d ? new Date(d).toISOString() : null;
const arr = v => Array.isArray(v) ? v : [];
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const look = u => ({ role: u.role || 'user', badges: arr(u.badges).filter(b => BADGES.includes(b)), banner: u.banner || null, frame: u.frame || null, socials: obj(u.socials) });
function self(u) {
  return { login: u.login, nick: u.nick, bio: u.bio, avatar: u.avatar || null, email: u.email, created: iso(u.created_at), ...look(u),
    nextLoginChange: u.login_changed_at ? new Date(new Date(u.login_changed_at).getTime() + 30 * DAY).toISOString() : null };
}
const pub = u => ({ login: u.login, nick: u.nick, bio: u.bio, avatar: u.avatar || null, created: iso(u.created_at), seen: iso(u.seen_at), ...look(u) });
const isStaff = u => !!u && (u.role === 'admin' || u.role === 'owner');
const isBanned = u => !!u && !!u.banned_until && new Date(u.banned_until) > new Date();
const BADGES = ['wizzy', 'lead_dev'], BANNERS = ['aurora', 'sunset', 'ocean', 'nebula', 'mint', 'ember', 'mono'], FRAMES = ['glow', 'gold', 'aurora', 'ice', 'neon'];
const FOREVER = '9999-12-31T00:00:00Z';
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
function publicSets(d, hidden) {
  const hid = new Set(arr(hidden));
  return (Array.isArray(d.sets) ? d.sets : []).filter(s => s && s.public && Array.isArray(s.items) && s.items.length && !hid.has(String(s.id || ''))).slice(0, 30)
    .map(s => ({ id: String(s.id || '').slice(0, 40), name: String(s.name || '').slice(0, 80), mode: s.mode === 'exam' ? 'exam' : 'practice', items: s.items.slice(0, 40), created: num(s.created) }));
}
function sanitizeData(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
  const out = { progress: Array.isArray(d.progress) ? d.progress.slice(-3000) : [], profile: d.profile && typeof d.profile === 'object' && !Array.isArray(d.profile) ? d.profile : {}, sets: Array.isArray(d.sets) ? d.sets.slice(0, 200) : [], drafts: d.drafts && typeof d.drafts === 'object' && !Array.isArray(d.drafts) ? d.drafts : {} };
  if (JSON.stringify(out).length > 900000) throw err(413, 'too_big');
  return out;
}
async function loginTaken(lc, exceptId = 0) { if (RESERVED.has(lc)) return true; const r = await db()(`SELECT 1 FROM users WHERE login_lc = $1 AND id <> $2`, [lc, exceptId]); return r.length > 0; }

/* ---------- word filter (RU + EN): a match never blocks, it only flags the text for staff ---------- */
const WB = '(?<![\\p{L}\\p{N}])', WE = '(?![\\p{L}\\p{N}])';
const rx = list => new RegExp(list.map(x => `(?:${x})`).join('|'), 'giu');
const RU_BAD = rx([
  '(?<!стра)ху[йяеёюи]', 'пизд', WB + 'бля', WB + '(?:за|на|по|вы|у|от|отъ|до|при|раз|разъ|съ|подъ|въ|изъ|объ|долбо)?еб(?:а|у|л|н|и|ы|о|т|с|ш|к|' + WE + ')',
  'муд[аои]к|мудил', WB + 'п[иеi]д[оа]?р', WB + 'педик', 'г[ао]ндон', 'шлюх|шалав', WB + 'сук(?:а|и|у|е|ой|ам|ами|ин|ина|ины)' + WE,
  WB + 'чмо(?:ш|х|' + WE + ')', WB + 'лох(?:а|и|у|ов|ам|ушка|ушки)?' + WE, WB + 'дебил', WB + 'идиот', WB + 'даун(?:ы|а|ов|ам)?' + WE,
  WB + 'урод(?:ы|а|ов|ина|ец)?' + WE, WB + 'кретин', WB + 'придур', WB + 'мраз[ьи]', WB + 'сволоч', WB + 'ублюд', WB + 'твар[ьи]' + WE,
  WB + 'гнид', WB + 'скотин', WB + 'быдл', WB + 'дур(?:а|ак|ака|аку|аки|ачок|ачьё)' + WE, WB + 'залуп', WB + 'говн', WB + 'дерьм', WB + 'жоп',
  WB + '(?:на|об|обо|за|по|вы)?сра(?:ть|л|ла|ли|ный|ная|нь|ка)' + WE, WB + 'хер(?:ня|ни|ов|а|у|ом)?' + WE, WB + 'жид(?:ы|ов|у|ам)?' + WE,
  WB + 'чурк', WB + 'хач(?:и|ей|ик)?' + WE, WB + 'хохл', WB + 'нигг?ер', WB + 'ничтожеств', WB + 'тупиц', WB + 'тупорыл', WB + 'шмар',
  WB + 'манд(?:а|ы|у|ой)' + WE, WB + 'отсос', WB + 'соси' + WE, WB + 'выбляд'
]);
const EN_BAD = rx([
  'fuck|fuk(?:ing|er)?' + WE + '|' + WB + 'fck', WB + 'shit|bullshit', WB + 'bitch', WB + 'cunt', WB + 'ass(?:hole|holes|hat|wipe|es)?' + WE,
  WB + 'bastard', WB + 'dick(?:head|s)?' + WE, WB + 'cock(?:s|sucker)?' + WE, WB + 'puss(?:y|ies)' + WE, WB + 'slut', WB + 'whore',
  WB + 'fag(?:got|gots|s)?' + WE, WB + 'nigg', WB + 'retard', WB + 'moron', WB + 'idiot', WB + 'wank', WB + 'twat', WB + 'dumbass',
  WB + 'stfu' + WE, WB + 'kys' + WE, 'kill\\s*your\\s*self', WB + 'motherf'
]);
const TR_BAD = rx([WB + 'бл[яе][дт]', WB + 'сук[аи]' + WE, 'пизд', WB + '(?:на|по)?ху[йи]' + WE, 'хуйн|хуев', WB + 'чмо(?:ш|' + WE + ')', WB + 'пид[оа]р',
  WB + '(?:у|за|вы|по)?еб(?:ат|ан|ал|у' + WE + ')', 'муд[ао]к', 'долбо[её]б', 'г[ао]ндон', 'шлюх', WB + 'дебил', WB + 'лох' + WE, 'уеб[оа]', WB + 'мраз']);
const MAP_RU = { a: 'а', b: 'б', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у', k: 'к', m: 'м', t: 'т', u: 'у', n: 'п', i: 'и', '3': 'з', '0': 'о', '6': 'б', '4': 'ч', '@': 'а', 'і': 'и', 'ї': 'и' };
const MAP_EN = { 'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', 'к': 'k', 'м': 'm', 'т': 't', 'и': 'u', '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '*': 'u' };
const TR2 = { sh: 'ш', ch: 'ч', zh: 'ж', ya: 'я', yo: 'ё', yu: 'ю', ts: 'ц', kh: 'х' }, TR1 = { a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', y: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', x: 'х', c: 'ц', j: 'й', w: 'в' };
const translit = s => s.replace(/sh|ch|zh|ya|yo|yu|ts|kh|[a-z]/g, m => TR2[m] || TR1[m] || m);
const squeeze = s => s.replace(/(\p{L})\1+/gu, '$1');
function scanText(text) {
  const base = String(text || '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е');
  if (!base.trim()) return [];
  const found = new Set();
  const test = (re, str) => { re.lastIndex = 0; for (const m of str.matchAll(re)) { found.add(m[0].trim()); if (found.size > 5) break; } };
  const variants = [base];
  for (const m of base.matchAll(/(?:\p{L}[\s.*_\-|/\\]+){2,}\p{L}/gu)) variants.push(m[0].replace(/[^\p{L}]/gu, ''));
  for (const v of variants) {
    const ru = v.replace(/[a-z0-9@іїё]/g, c => MAP_RU[c] || c), en = v.replace(/[а-я0-9@$!*]/g, c => MAP_EN[c] || c);
    test(RU_BAD, ru); test(RU_BAD, squeeze(ru)); test(EN_BAD, en); test(EN_BAD, squeeze(en)); test(TR_BAD, translit(v)); test(TR_BAD, squeeze(translit(v)));
  }
  return [...found].slice(0, 5);
}
async function notify(uid, kind, data = {}, title = '', body = '') {
  await db()(`INSERT INTO notifications (user_id, kind, title, body, data) VALUES ($1, $2, $3, $4, $5::jsonb)`, [uid, kind, String(title).slice(0, 120), String(body).slice(0, 1000), JSON.stringify(data)]);
}
async function notifyStaff(kind, data, exceptId = 0) {
  const st = await db()(`SELECT id FROM users WHERE role IN ('admin', 'owner') AND id <> $1`, [exceptId]);
  for (const s of st) await notify(s.id, kind, data);
}
async function autoFlag(u, field, text) {
  const words = scanText(text); if (!words.length) return null;
  const q = db();
  if ((await q(`SELECT 1 FROM flags WHERE user_id = $1 AND field = $2 AND text = $3 AND status = 'open'`, [u.id, field, text])).length) return null;
  const r = await q(`INSERT INTO flags (user_id, field, text, words) VALUES ($1, $2, $3, $4::jsonb) RETURNING id`, [u.id, field, String(text).slice(0, 400), JSON.stringify(words)]);
  await notifyStaff('flag', { flag: Number(r[0].id), login: u.login, field, words }, u.id);
  return r[0].id;
}
async function modLog(actor, target, action, detail = {}) { await db()(`INSERT INTO mod_log (actor_id, target_id, action, detail) VALUES ($1, $2, $3, $4::jsonb)`, [actor ? actor.id : null, target ? target.id : null, action, JSON.stringify(detail)]); }
async function unreadOf(u) {
  const r = await db()(`SELECT (SELECT count(*) FROM notifications WHERE user_id = $1 AND NOT read) AS n, (SELECT count(*) FROM announcements WHERE id > $2) AS a`, [u.id, Number(u.ann_seen) || 0]);
  const out = { n: Number(r[0].n) + Number(r[0].a) };
  if (isStaff(u)) { const s = await db()(`SELECT (SELECT count(*) FROM flags WHERE status = 'open') AS f, (SELECT count(*) FROM reset_requests WHERE status = 'pending' AND expires_at > now()) AS r`); out.staff = { flags: Number(s[0].f), resets: Number(s[0].r) }; }
  return out;
}

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
  await q(`UPDATE users SET ann_seen = COALESCE((SELECT max(id) FROM announcements), 0) WHERE id = $1`, [rows[0].id]);
  await autoFlag(rows[0], 'nick', nick);
  await newSession(ctx, rows[0].id);
  return { status: 201, body: { user: self(rows[0]), ts, unread: { n: 0 } } };
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
  if (isBanned(u)) { await q(`UPDATE users SET failed = 0 WHERE id = $1`, [u.id]); throw err(403, 'banned', { until: iso(u.banned_until), reason: u.ban_reason || '' }); }
  await q(`UPDATE users SET failed = 0, lock_until = NULL, seen_at = now() WHERE id = $1`, [u.id]);
  await newSession(ctx, u.id);
  return { user: self(u), data: u.data || {}, ts: Number(u.data_ts) || 0, unread: await unreadOf(u) };
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
  return { user: self(u), data: u.data || {}, ts: Number(u.data_ts) || 0, unread: await unreadOf(u) };
};
R['GET unread'] = async ctx => { const u = await need(ctx); return await unreadOf(u); };
R['PUT data'] = async ctx => {
  const u = await need(ctx), data = sanitizeData(ctx.body.data), base = Number(ctx.body.base) || 0, cur = Number(u.data_ts) || 0;
  if (cur && base !== cur) return { status: 409, body: { error: 'conflict', data: u.data || {}, ts: cur } };
  const ts = Math.max(Date.now(), cur + 1);
  const r = await db()(`UPDATE users SET data = $2::jsonb, data_ts = $3, stats = $4::jsonb, pub_sets = $5::jsonb, seen_at = now() WHERE id = $1 AND data_ts = $6 RETURNING id`,
    [u.id, JSON.stringify(data), ts, JSON.stringify(computeStats(data)), JSON.stringify(publicSets(data, u.hidden_sets)), cur]);
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
  if ('banner' in b) {
    if (b.banner === null || b.banner === '') put('banner', null);
    else { const a = String(b.banner); if (/^p:[a-z]+$/.test(a)) { if (!BANNERS.includes(a.slice(2))) throw err(400, 'banner_bad'); } else if (a.length > 460000 || !/^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a)) throw err(400, 'banner_bad'); put('banner', a); }
  }
  if ('frame' in b) { const f = b.frame ? String(b.frame) : null; if (f && !FRAMES.includes(f)) throw err(400, 'frame_bad'); put('frame', f); }
  if ('socials' in b) { vals.push(JSON.stringify(cleanSocials(b.socials))); set.push(`socials = $${vals.length}::jsonb`); }
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
  const nu = rows[0];
  if (nu.nick !== u.nick) await autoFlag(nu, 'nick', nu.nick);
  if (nu.bio !== u.bio) await autoFlag(nu, 'bio', nu.bio);
  return { user: self(nu) };
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
  const rows = await db()(`SELECT id, login, nick, bio, avatar, created_at, seen_at, stats, pub_sets, role, badges, banner, frame, socials, banned_until, ban_reason, hidden_sets FROM users WHERE login_lc = $1`, [l]);
  const t = rows[0]; if (!t) throw err(404, 'not_found');
  const hid = new Set(arr(t.hidden_sets)), out = { ...pub(t), stats: t.stats || {}, sets: arr(t.pub_sets).filter(x => !hid.has(x.id)), banned: isBanned(t) };
  const me = await current(ctx).catch(() => null);
  if (isStaff(me)) out.mod = { canModerate: canMod(me, t), canRole: me.role === 'owner' && t.role !== 'owner', canBadges: me.role === 'owner', bannedUntil: isBanned(t) ? iso(t.banned_until) : null, banReason: isBanned(t) ? t.ban_reason || '' : null };
  return { user: out };
};
R['GET users'] = async ctx => {
  const q = clean(ctx.q.get('q'), 40).toLowerCase().replace(/^@/, '');
  const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%', pre = q.replace(/[\\%_]/g, '\\$&') + '%';
  const rows = await db()(`SELECT login, nick, bio, avatar, created_at, seen_at, stats, role, badges, frame FROM users
    WHERE ($1 = '' OR login_lc LIKE $2 OR lower(nick) LIKE $2) AND (banned_until IS NULL OR banned_until < now())
    ORDER BY (login_lc = $1) DESC, (login_lc LIKE $3 OR lower(nick) LIKE $3) DESC, seen_at DESC LIMIT 30`, [q, like, pre]);
  return { users: rows.map(r => ({ ...pub(r), banner: null, socials: {}, bio: (r.bio || '').slice(0, 140), attempts: (r.stats && r.stats.attempts) || 0, tasks: (r.stats && r.stats.tasks) || 0 })) };
};

/* ---------- socials ---------- */
const SOC_RE = { discord: /^(?:\d{17,20}|[a-z0-9_.]{2,32})$/, github: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, telegram: /^[A-Za-z][A-Za-z0-9_]{3,31}$/, tiktok: /^[A-Za-z0-9_.]{2,24}$/ };
function cleanSocials(o) {
  const out = {}; o = obj(o);
  for (const k of Object.keys(SOC_RE)) {
    let v = clean(o[k], 64).replace(/^@/, ''); if (!v) continue;
    if (k === 'discord') v = v.toLowerCase();
    if (!SOC_RE[k].test(v)) throw err(400, 'social_bad', { field: k });
    out[k] = v;
  }
  return out;
}

/* ---------- moderation ---------- */
const canMod = (me, t) => isStaff(me) && !!t && me.id !== t.id && !isStaff(t);
const reasonOf = b => clean(b.reason, 300);
R['POST mod'] = async ctx => {
  const me = await need(ctx); if (!isStaff(me)) throw err(403, 'forbidden');
  const b = ctx.body, q = db(), a = String(b.action || '');
  const t = (await q(`SELECT * FROM users WHERE login_lc = $1`, [clean(b.login, 40).toLowerCase()]))[0];
  if (!t) throw err(404, 'not_found');
  const ownerOnly = a === 'role' || a === 'badges';
  if (ownerOnly) { if (me.role !== 'owner') throw err(403, 'forbidden'); }
  else if (!canMod(me, t)) throw err(403, me.id === t.id ? 'self' : 'protected');
  const reason = reasonOf(b);
  let detail = { reason };
  if (a === 'reset_bio') { await q(`UPDATE users SET bio = '' WHERE id = $1`, [t.id]); await q(`UPDATE flags SET status = 'resolved', resolved_by = $2, resolved_at = now() WHERE user_id = $1 AND field = 'bio' AND status = 'open'`, [t.id, me.id]); }
  else if (a === 'reset_avatar') await q(`UPDATE users SET avatar = NULL, banner = NULL, frame = NULL WHERE id = $1`, [t.id]);
  else if (a === 'rename') {
    const set = [], vals = [t.id];
    if (b.nick != null && b.nick !== t.nick) { const n = clean(b.nick, 32); if (!n || len(n) > 32) throw err(400, 'nick_bad'); vals.push(n); set.push(`nick = $${vals.length}`); detail.nick = [t.nick, n]; }
    if (b.newLogin != null && b.newLogin !== t.login) {
      const l = clean(b.newLogin, 24); if (!LOGIN_RE.test(l)) throw err(400, 'login_bad');
      if (l.toLowerCase() !== t.login_lc && await loginTaken(l.toLowerCase(), t.id)) throw err(409, 'login_taken');
      vals.push(l); set.push(`login = $${vals.length}`); vals.push(l.toLowerCase()); set.push(`login_lc = $${vals.length}`); detail.login = [t.login, l];
    }
    if (!set.length) return { ok: true };
    try { await q(`UPDATE users SET ${set.join(', ')} WHERE id = $1`, vals); } catch (e) { if (e.code === '23505') throw err(409, 'login_taken'); throw e; }
    if (detail.nick) await q(`UPDATE flags SET status = 'resolved', resolved_by = $2, resolved_at = now() WHERE user_id = $1 AND field = 'nick' AND status = 'open'`, [t.id, me.id]);
  }
  else if (a === 'del_set') {
    const id = clean(b.setId, 40); if (!id) throw err(400, 'bad');
    const hid = [...new Set([...arr(t.hidden_sets), id])].slice(-200), ps = arr(t.pub_sets).filter(x => x.id !== id);
    await q(`UPDATE users SET hidden_sets = $2::jsonb, pub_sets = $3::jsonb WHERE id = $1`, [t.id, JSON.stringify(hid), JSON.stringify(ps)]);
    const s0 = arr(t.pub_sets).find(x => x.id === id); detail.set = s0 ? s0.name : id;
  }
  else if (a === 'warn') { const text = clean(b.text, 500); if (!text) throw err(400, 'text_bad'); detail = { text }; }
  else if (a === 'ban') {
    const days = Number(b.days); if (!(days === 0 || [1, 3, 7, 30, 90, 365].includes(days))) throw err(400, 'bad');
    const until = days ? new Date(Date.now() + days * DAY).toISOString() : FOREVER;
    await q(`UPDATE users SET banned_until = $2, ban_reason = $3 WHERE id = $1`, [t.id, until, reason]);
    await q(`DELETE FROM sessions WHERE user_id = $1`, [t.id]);
    await q(`UPDATE reset_requests SET status = 'rejected', decided_by = $2, decided_at = now() WHERE user_id = $1 AND status = 'pending'`, [t.id, me.id]);
    detail.until = until; detail.days = days;
  }
  else if (a === 'unban') await q(`UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE id = $1`, [t.id]);
  else if (a === 'role') {
    if (t.role === 'owner') throw err(403, 'protected');
    const role = b.role === 'admin' ? 'admin' : 'user'; if (role === t.role) return { ok: true };
    await q(`UPDATE users SET role = $2 WHERE id = $1`, [t.id, role]); detail = { role };
  }
  else if (a === 'badges') {
    const bs = [...new Set(arr(b.badges).map(String))].filter(x => BADGES.includes(x));
    const old = arr(t.badges); await q(`UPDATE users SET badges = $2::jsonb WHERE id = $1`, [t.id, JSON.stringify(bs)]);
    detail = { added: bs.filter(x => !old.includes(x)), removed: old.filter(x => !bs.includes(x)) };
    if (!detail.added.length && !detail.removed.length) return { ok: true };
  }
  else throw err(400, 'bad');
  await modLog(me, t, a, detail);
  if (t.id !== me.id) await notify(t.id, a === 'warn' ? 'warn' : 'mod', { action: a, by: me.login, ...detail }, '', a === 'warn' ? detail.text : reason);
  return { ok: true };
};

/* ---------- notifications ---------- */
R['GET notifications'] = async ctx => {
  const u = await need(ctx), q = db();
  const items = await q(`SELECT id, kind, title, body, data, read, created_at FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 80`, [u.id]);
  const anns = await q(`SELECT a.id, a.title, a.body, a.created_at, u.login, u.nick, u.avatar, u.role, u.badges FROM announcements a LEFT JOIN users u ON u.id = a.author_id ORDER BY a.id DESC LIMIT 20`);
  return { items: items.map(n => ({ id: Number(n.id), kind: n.kind, title: n.title, body: n.body, data: n.data || {}, read: !!n.read, created: iso(n.created_at) })),
    announcements: anns.map(a => ({ id: Number(a.id), title: a.title, body: a.body, created: iso(a.created_at), read: Number(a.id) <= (Number(u.ann_seen) || 0), author: a.login ? { login: a.login, nick: a.nick, avatar: a.avatar || null, role: a.role, badges: arr(a.badges) } : null })),
    unread: await unreadOf(u) };
};
R['POST notifications'] = async ctx => {
  const u = await need(ctx), b = ctx.body, q = db();
  if (b.op === 'read') {
    if (Array.isArray(b.ids) && b.ids.length) await q(`UPDATE notifications SET read = true WHERE user_id = $1 AND id = ANY($2::bigint[])`, [u.id, b.ids.slice(0, 200).map(Number).filter(Number.isFinite)]);
    else await q(`UPDATE notifications SET read = true WHERE user_id = $1 AND NOT read`, [u.id]);
    if (b.ann || !(Array.isArray(b.ids) && b.ids.length)) await q(`UPDATE users SET ann_seen = GREATEST(ann_seen, COALESCE((SELECT max(id) FROM announcements), 0)) WHERE id = $1`, [u.id]);
  } else if (b.op === 'clear') await q(`DELETE FROM notifications WHERE user_id = $1 AND read`, [u.id]);
  else if (b.op === 'delete') await q(`DELETE FROM notifications WHERE user_id = $1 AND id = $2`, [u.id, Number(b.id) || 0]);
  else throw err(400, 'bad');
  const fresh = (await q(`SELECT * FROM users WHERE id = $1`, [u.id]))[0];
  return { ok: true, unread: await unreadOf(fresh) };
};

/* ---------- admin panel ---------- */
R['GET admin'] = async ctx => {
  const me = await need(ctx); if (!isStaff(me)) throw err(403, 'forbidden');
  const q = db();
  const flags = await q(`SELECT f.id, f.field, f.text, f.words, f.created_at, u.login, u.nick, u.avatar, u.role FROM flags f JOIN users u ON u.id = f.user_id WHERE f.status = 'open' ORDER BY f.id DESC LIMIT 100`);
  const resets = await q(`SELECT r.id, r.note, r.created_at, r.expires_at, u.login, u.nick, u.avatar, u.role FROM reset_requests r JOIN users u ON u.id = r.user_id WHERE r.status = 'pending' AND r.expires_at > now() ORDER BY r.id DESC LIMIT 100`);
  const banned = await q(`SELECT login, nick, avatar, banned_until, ban_reason FROM users WHERE banned_until > now() ORDER BY banned_until DESC LIMIT 200`);
  const staff = await q(`SELECT login, nick, avatar, role, badges FROM users WHERE role IN ('owner', 'admin') ORDER BY role DESC, login_lc`);
  const anns = await q(`SELECT a.id, a.title, a.body, a.created_at, u.login FROM announcements a LEFT JOIN users u ON u.id = a.author_id ORDER BY a.id DESC LIMIT 30`);
  const log = await q(`SELECT l.id, l.action, l.detail, l.created_at, a.login AS actor, t.login AS target FROM mod_log l LEFT JOIN users a ON a.id = l.actor_id LEFT JOIN users t ON t.id = l.target_id ORDER BY l.id DESC LIMIT 60`);
  const cnt = (await q(`SELECT count(*) AS n FROM users`))[0];
  return {
    me: { role: me.role }, users: Number(cnt.n),
    flags: flags.map(f => ({ id: Number(f.id), field: f.field, text: f.text, words: arr(f.words), created: iso(f.created_at), user: { login: f.login, nick: f.nick, avatar: f.avatar || null, role: f.role }, canAct: f.role !== 'owner' && f.role !== 'admin' })),
    resets: resets.map(r => ({ id: Number(r.id), note: r.note, created: iso(r.created_at), expires: iso(r.expires_at), user: { login: r.login, nick: r.nick, avatar: r.avatar || null, role: r.role }, canAct: r.role === 'user' || (r.role === 'admin' && me.role === 'owner') })),
    banned: banned.map(x => ({ login: x.login, nick: x.nick, avatar: x.avatar || null, until: iso(x.banned_until), reason: x.ban_reason || '' })),
    staff: staff.map(x => ({ login: x.login, nick: x.nick, avatar: x.avatar || null, role: x.role, badges: arr(x.badges) })),
    announcements: anns.map(a => ({ id: Number(a.id), title: a.title, body: a.body, created: iso(a.created_at), author: a.login || null })),
    log: log.map(l => ({ id: Number(l.id), action: l.action, detail: l.detail || {}, created: iso(l.created_at), actor: l.actor || null, target: l.target || null }))
  };
};
R['POST admin'] = async ctx => {
  const me = await need(ctx); if (!isStaff(me)) throw err(403, 'forbidden');
  const b = ctx.body, q = db();
  if (b.op === 'flag') {
    const st = b.status === 'resolved' ? 'resolved' : 'dismissed';
    const r = await q(`UPDATE flags SET status = $2, resolved_by = $3, resolved_at = now() WHERE id = $1 AND status = 'open' RETURNING user_id`, [Number(b.id) || 0, st, me.id]);
    if (r.length) await modLog(me, { id: r[0].user_id }, 'flag_' + st, { flag: Number(b.id) });
  } else if (b.op === 'reset') {
    const r = (await q(`SELECT r.*, u.role, u.login FROM reset_requests r JOIN users u ON u.id = r.user_id WHERE r.id = $1`, [Number(b.id) || 0]))[0];
    if (!r || r.status !== 'pending') throw err(404, 'not_found');
    if (!(r.role === 'user' || (r.role === 'admin' && me.role === 'owner'))) throw err(403, 'protected');
    const ok = !!b.approve;
    await q(`UPDATE reset_requests SET status = $2, decided_by = $3, decided_at = now(), expires_at = CASE WHEN $2 = 'approved' THEN now() + interval '24 hours' ELSE expires_at END WHERE id = $1`, [r.id, ok ? 'approved' : 'rejected', me.id]);
    await modLog(me, { id: r.user_id }, ok ? 'reset_approve' : 'reset_reject', { request: Number(r.id) });
  } else if (b.op === 'announce') {
    const title = clean(b.title, 120), body = clean(b.body, 2000);
    if (!title || !body) throw err(400, 'text_bad');
    await q(`INSERT INTO announcements (author_id, title, body) VALUES ($1, $2, $3)`, [me.id, title, body]);
    await modLog(me, null, 'announce', { title });
  } else if (b.op === 'unannounce') {
    await q(`DELETE FROM announcements WHERE id = $1`, [Number(b.id) || 0]);
    await modLog(me, null, 'unannounce', { id: Number(b.id) || 0 });
  } else throw err(400, 'bad');
  return { ok: true };
};

/* ---------- password reset through staff approval (no email) ---------- */
R['POST reset_request'] = async ctx => {
  const id = clean(ctx.body.id, 254).toLowerCase(), note = clean(ctx.body.note, 300), q = db();
  if (!id) throw err(400, 'creds');
  const u = (await q(id.includes('@') ? `SELECT * FROM users WHERE email_lc = $1` : `SELECT * FROM users WHERE login_lc = $1`, [id.replace(/^@/, '')]))[0];
  if (!u) throw err(404, 'not_found');
  if (u.role === 'owner') throw err(403, 'protected');
  const last = (await q(`SELECT created_at FROM reset_requests WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [u.id]))[0];
  if (last && Date.now() - new Date(last.created_at).getTime() < 2 * 6e4) throw err(429, 'rate');
  await q(`UPDATE reset_requests SET status = 'replaced' WHERE user_id = $1 AND status IN ('pending', 'approved')`, [u.id]);
  const tok = crypto.randomBytes(24).toString('base64url');
  const r = await q(`INSERT INTO reset_requests (user_id, token_hash, note, expires_at) VALUES ($1, $2, $3, now() + interval '7 days') RETURNING id`, [u.id, sha(tok), note]);
  await notifyStaff('reset', { request: Number(r[0].id), login: u.login }, u.id);
  return { rid: Number(r[0].id), token: tok, login: u.login };
};
async function resetReq(rid, token) {
  const r = (await db()(`SELECT * FROM reset_requests WHERE id = $1`, [Number(rid) || 0]))[0];
  if (!r || !token || String(token).length > 80 || !crypto.timingSafeEqual(Buffer.from(sha(String(token))), Buffer.from(r.token_hash))) throw err(404, 'not_found');
  return r;
}
R['GET reset_status'] = async ctx => {
  const r = await resetReq(ctx.q.get('rid'), ctx.q.get('token'));
  const exp = new Date(r.expires_at) < new Date();
  return { state: (r.status === 'pending' || r.status === 'approved') && exp ? 'expired' : r.status };
};
R['POST reset_finish'] = async ctx => {
  const r = await resetReq(ctx.body.rid, ctx.body.token);
  if (r.status !== 'approved' || new Date(r.expires_at) < new Date()) throw err(409, 'reset_state', { state: r.status });
  if (!pwOk(ctx.body.password)) throw err(400, 'pw_weak');
  const q = db();
  await q(`UPDATE users SET pw = $2, failed = 0, lock_until = NULL WHERE id = $1`, [r.user_id, await hashPw(ctx.body.password)]);
  await q(`DELETE FROM sessions WHERE user_id = $1`, [r.user_id]);
  await q(`UPDATE reset_requests SET status = 'done' WHERE id = $1`, [r.id]);
  await notify(r.user_id, 'mod', { action: 'pw_reset' });
  return { ok: true };
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
module.exports.scanText = scanText;
module.exports.reinit = () => { ready = null; };

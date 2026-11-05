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
const SCHEMA_VER = 6;
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
  `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v JSONB NOT NULL DEFAULT 'true'::jsonb)`,
  /* v2: media by URL, roles, premium, strikes, 2FA, privacy, E2EE keys, IPs */
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_v TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_v TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role_by BIGINT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_text JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_no INT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_premium_no_idx ON users(premium_no) WHERE premium_no IS NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS strikes INT NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS warns_total INT NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tfa_on BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tfa_secret TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tfa_pending TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tfa_recovery JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tfa_last BIGINT NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS e2e_pub TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS e2e_wrap TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ips JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS global_read BIGINT NOT NULL DEFAULT 0`,
  `CREATE SEQUENCE IF NOT EXISTS sessions_sid_seq`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sid BIGINT NOT NULL DEFAULT nextval('sessions_sid_seq')`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip TEXT`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ua TEXT`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `ALTER TABLE flags ADD COLUMN IF NOT EXISTS ref BIGINT`,
  `CREATE TABLE IF NOT EXISTS tfa_tickets (id_hash TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, tries INT NOT NULL DEFAULT 0, expires_at TIMESTAMPTZ NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ip_bans (ip TEXT PRIMARY KEY, user_id BIGINT, reason TEXT NOT NULL DEFAULT '', by_id BIGINT, until TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS friends (a BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, b BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending',
    req_by BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (a, b), CHECK (a < b))`,
  `CREATE INDEX IF NOT EXISTS friends_b_idx ON friends(b)`,
  `CREATE TABLE IF NOT EXISTS chats (id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL, dm_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS chat_members (chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', last_read BIGINT NOT NULL DEFAULT 0, joined_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (chat_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS chat_members_user_idx ON chat_members(user_id)`,
  `CREATE TABLE IF NOT EXISTS messages (id BIGSERIAL PRIMARY KEY, chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL DEFAULT '', enc BOOLEAN NOT NULL DEFAULT false, kind TEXT NOT NULL DEFAULT 'text', deleted BOOLEAN NOT NULL DEFAULT false, deleted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages(chat_id, id DESC)`,
  `CREATE INDEX IF NOT EXISTS messages_user_idx ON messages(user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS typing (chat_id BIGINT NOT NULL, user_id BIGINT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (chat_id, user_id))`,
  /* v6: profile colour, titles, music, Spotify, staff permissions, approvals, owner security question, PIN, pins, stickers */
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS music_v TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS music_meta JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS music_cover TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS music_pending JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS perms JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS sq_text TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS sq_hash TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_fails INT NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_lock TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_reset_at TIMESTAMPTZ`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pin_until TIMESTAMPTZ`,
  `ALTER TABLE tfa_tickets ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'tfa'`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS del_by BIGINT`,
  `CREATE INDEX IF NOT EXISTS messages_pin_idx ON messages(chat_id) WHERE pinned_at IS NOT NULL`,
  `ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS stickers (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL DEFAULT '', data TEXT NOT NULL, v TEXT NOT NULL, by_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS approvals (id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL, actor_id BIGINT, target_id BIGINT, payload JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_by BIGINT, decided_at TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS music_parts (user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ver TEXT NOT NULL, idx INT NOT NULL, b64 TEXT NOT NULL, PRIMARY KEY (user_id, ver, idx))`,
  `INSERT INTO kv (k, v) VALUES ('promo_n', '0'::jsonb) ON CONFLICT (k) DO NOTHING`,
  `INSERT INTO chats (kind, title, dm_key) VALUES ('global', 'lynx.', 'global') ON CONFLICT (dm_key) DO NOTHING`
];
function init() {
  if (!ready) ready = (async () => {
    const q = db();
    let v = 0; try { const r = await q(`SELECT v FROM kv WHERE k = 'schema'`); v = r[0] ? Number(r[0].v) : 0; } catch (e) { v = 0; }
    if (v !== SCHEMA_VER) { for (const s of SCHEMA) await q(s); await q(`INSERT INTO kv (k, v) VALUES ('schema', $1::jsonb) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`, [JSON.stringify(SCHEMA_VER)]); }
    await bootstrap(q);
  })().catch(e => { ready = null; throw e; });
  return ready;
}
/* one-time data steps, each guarded by a kv flag */
async function bootstrap(q) {
  const done = new Set((await q(`SELECT k FROM kv`)).map(r => r.k));
  const mark = k => q(`INSERT INTO kv (k) VALUES ($1) ON CONFLICT DO NOTHING`, [k]);
  if (!done.has('roles_v1')) {
    if ((await q(`SELECT 1 FROM users WHERE role = 'owner'`)).length) await mark('roles_v1');
    else {
      const own = await q(`UPDATE users SET role = 'owner', badges = '["wizzy","lead_dev"]'::jsonb WHERE login_lc = 'wizzy' RETURNING id`);
      if (own.length) {
        await q(`UPDATE users SET role = 'admin' WHERE login_lc = 'mrneoner' AND role = 'user'`);
        const all = await q(`SELECT id, login, nick, bio FROM users`);
        for (const u of all) { await autoFlag(u, 'nick', u.nick); await autoFlag(u, 'bio', u.bio); }
        await mark('roles_v1');
      }
    }
  }
  if (!done.has('media_v1')) {
    await q(`UPDATE users SET avatar_v = substr(md5(avatar), 1, 12) WHERE avatar IS NOT NULL AND avatar_v IS NULL`);
    await q(`UPDATE users SET banner_v = substr(md5(banner), 1, 12) WHERE banner LIKE 'data:%' AND banner_v IS NULL`);
    await mark('media_v1');
  }
  if (!done.has('promo_v1')) {
    const list = await q(`SELECT id FROM users WHERE premium_no IS NULL ORDER BY created_at, id`);
    for (const u of list) { const n = await nextPromo(q); if (!n) break; await q(`UPDATE users SET premium_no = $2, premium_until = $3 WHERE id = $1`, [u.id, n, FOREVER]); }
    await mark('promo_v1');
  }
  if (!done.has('roles_v2')) {
    const own = (await q(`SELECT id FROM users WHERE role = 'owner' ORDER BY id LIMIT 1`))[0], neo = (await q(`SELECT id, role, badges FROM users WHERE login_lc = 'mrneoner'`))[0];
    if (own && neo) {
      const bs = [...new Set([...arr(neo.badges), 'neo'])];
      await q(`UPDATE users SET role = CASE WHEN role = 'owner' THEN role ELSE 'coowner' END, role_by = $2, badges = $3::jsonb WHERE id = $1`, [neo.id, own.id, JSON.stringify(bs)]);
      await mark('roles_v2');
    }
  }
}
async function nextPromo(q) {
  const r = await q(`UPDATE kv SET v = to_jsonb((v #>> '{}')::int + 1) WHERE k = 'promo_n' AND (v #>> '{}')::int < $1 RETURNING (v #>> '{}')::int AS n`, [PROMO_MAX]);
  return r.length ? Number(r[0].n) : 0;
}

/* ---------- helpers ---------- */
function err(status, code, extra) { const e = new Error(code); e.status = status; e.code = code; e.extra = extra; return e; }
const LOGIN_RE = /^[A-Za-z0-9_]{4,24}$/, EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const RESERVED = new Set(['admin', 'administrator', 'root', 'support', 'lynx', 'lynx_team', 'moderator', 'system', 'null', 'undefined', 'help', 'about', 'people', 'login', 'signup', 'settings', 'owner', 'notifications', 'services', 'forgot', 'staff', 'moderation', 'premium', 'chat', 'privacy', 'contact', 'coowner']);
const pwOk = s => typeof s === 'string' && s.length >= 8 && s.length <= 128 && /\d/.test(s) && /\p{Lu}/u.test(s) && /[^\p{L}\p{N}\s]/u.test(s);
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().slice(0, max * 2);
const len = s => [...s].length;
const DAY = 864e5, SESSION_DAYS = 30, LOCK_MIN = 5, MAX_FAILS = 5, PROMO_MAX = 100;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const ver = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
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
function clientIp(req) {
  const h = req.headers || {};
  let ip = String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip.slice(0, 64) || '0.0.0.0';
}
function maskIp(ip) {
  ip = String(ip || '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.split('.').slice(0, 2).join('.') + '.•.•';
  if (ip.includes(':')) return ip.split(':').filter(Boolean).slice(0, 2).join(':') + ':•';
  return ip ? '•' : '';
}
async function pushIp(u, ip) {
  const list = [ip, ...arr(u.last_ips).filter(x => x !== ip)].slice(0, 5);
  await db()(`UPDATE users SET last_ips = $2::jsonb WHERE id = $1`, [u.id, JSON.stringify(list)]);
}
async function ipBanned(ip) { return (await db()(`SELECT 1 FROM ip_bans WHERE ip = $1 AND until > now()`, [ip])).length > 0; }
async function newSession(ctx, u) {
  const tok = crypto.randomBytes(32).toString('base64url'), ip = clientIp(ctx.req), ua = clean(ctx.req.headers['user-agent'], 250).slice(0, 250);
  await db()(`INSERT INTO sessions (token_hash, user_id, expires_at, ip, ua) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days', $3, $4)`, [sha(tok), u.id, ip, ua]);
  await db()(`DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()`, [u.id]);
  await pushIp(u, ip);
  setCookie(ctx, tok, SESSION_DAYS * 86400);
}
/* columns of the signed-in user: no heavy blobs (avatar / banner images, progress data) */
const UC = p => ['id', 'email', 'login', 'login_lc', 'nick', 'bio', 'pw', 'data_ts', 'failed', 'lock_until', 'login_changed_at', 'created_at', 'seen_at', 'role', 'badges', 'frame', 'socials', 'banned_until', 'ban_reason', 'hidden_sets', 'ann_seen',
  'avatar_v', 'banner_v', 'role_by', 'badge_text', 'premium_no', 'premium_until', 'strikes', 'warns_total', 'tfa_on', 'tfa_secret', 'tfa_pending', 'tfa_recovery', 'tfa_last', 'privacy', 'e2e_pub', 'e2e_wrap', 'last_ips', 'global_read', 'stats', 'pub_sets',
  'theme_color', 'title', 'spotify', 'music_v', 'music_meta', 'music_pending', 'perms', 'sq_text', 'sq_hash', 'pin_hash', 'pin_fails', 'pin_lock', 'pin_reset_at']
  .map(c => p + c).join(', ') + `, CASE WHEN ${p}banner LIKE 'data:%' THEN 'img' ELSE ${p}banner END AS banner`;
const UCOLS = UC(''), UCOLS_U = UC('u.');
async function current(ctx) {
  if (ctx.me !== undefined) return ctx.me;
  const tok = cookies(ctx.req).lynx_sid; if (!tok || tok.length > 100) return (ctx.me = null);
  const ip = clientIp(ctx.req), th = sha(tok);
  const rows = await db()(`SELECT ${UCOLS_U}, s.sid AS s_id, s.ip AS s_ip, s.last_seen AS s_seen, s.pin_until AS s_pin, EXISTS (SELECT 1 FROM ip_bans b WHERE b.ip = $2 AND b.until > now()) AS ipb
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`, [th, ip]);
  const u = rows[0] || null;
  if (u && isBanned(u)) { await db()(`DELETE FROM sessions WHERE user_id = $1`, [u.id]); return (ctx.me = null); }
  if (u && u.ipb && !isStaff(u)) { await db()(`DELETE FROM sessions WHERE token_hash = $1`, [th]); return (ctx.me = null); }
  if (u) {
    ctx.tokHash = th; ctx.sid = Number(u.s_id);
    if (u.s_ip !== ip || Date.now() - new Date(u.s_seen).getTime() > 2 * 6e4) {
      await db()(`UPDATE sessions SET last_seen = now(), ip = $2 WHERE token_hash = $1`, [th, ip]);
      if (u.s_ip !== ip) await pushIp(u, ip);
    }
  }
  return (ctx.me = u);
}
async function need(ctx) { const u = await current(ctx); if (!u) throw err(401, 'auth'); return u; }
const iso = d => d ? new Date(d).toISOString() : null;
const arr = v => Array.isArray(v) ? v : [];
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
/* personal badges, then trial presets with unusual shapes (nobody has them until the owner grants one) */
const TRIAL = ['t_hex', 't_ribbon', 't_star', 't_glitch', 't_flame', 't_orbit'];
const BADGES = ['wizzy', 'lead_dev', 'neo', ...TRIAL], NAMED = ['wizzy', 'neo', 'lead_dev'];
const ALL_BADGES = [...BADGES, 'premium'], EXCL_DEF = ['wizzy', 'neo', 'lead_dev'];
async function badgeExcl() { const r = (await db()(`SELECT v FROM kv WHERE k = 'badge_excl'`))[0]; return r && Array.isArray(r.v) ? r.v.filter(x => ALL_BADGES.includes(x)) : EXCL_DEF; }
/* achievements → titles: computed on the server from the saved progress, a user may show one of the unlocked ones */
const ACH = {
  first: (s) => s.attempts >= 1, ten: (s) => s.attempts >= 10, fifty: (s) => s.attempts >= 50, explorer: (s) => s.tasks >= 6, complete: (s) => s.tasks >= 12,
  listener: (s) => (s.skills.L.best || 0) >= 90, reader: (s) => (s.skills.R.best || 0) >= 90, writer: (s) => s.skills.W.n >= 5, speaker: (s) => s.skills.S.n >= 5,
  mock: (s) => s.variants >= 1, author: (s, u) => arr(u.pub_sets).length >= 1, pioneer: (s, u) => !!u.premium_no && N(u.premium_no) <= 100
};
function achOf(u) {
  const st = obj(u.stats), sk = obj(st.skills), g = k => ({ n: N(obj(sk[k]).n) || 0, best: obj(sk[k]).best == null ? null : N(obj(sk[k]).best) });
  const s = { attempts: N(st.attempts) || 0, tasks: N(st.tasks) || 0, variants: N(st.variants) || 0, skills: { L: g('L'), R: g('R'), W: g('W'), S: g('S') } };
  return Object.keys(ACH).filter(k => { try { return ACH[k](s, u); } catch (e) { return false; } });
}
const COLOR_RE = /^#[0-9a-f]{6}$/;
const SPOT_RE = /^(track|album|playlist|artist|episode|show):([A-Za-z0-9]{22})$/;
function parseSpotify(v) {
  v = String(v || '').trim(); if (!v) return null;
  let m = v.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})(?:[/?#].*)?$/i) || v.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]{22})$/i) || v.match(SPOT_RE);
  if (!m) throw err(400, 'spotify_bad');
  return m[1].toLowerCase() + ':' + m[2];
}
const musicOut = u => { if (!u.music_v) return null; const m = obj(u.music_meta); return { url: imgUrl('m', u, u.music_v), cover: m.c ? imgUrl('c', u, u.music_v) : null, title: m.t || '', artist: m.a || '', album: m.al || '', dur: num(m.d), size: N(m.size) || 0, mime: m.mime || '' }; };
const BANNERS = ['aurora', 'sunset', 'ocean', 'nebula', 'mint', 'ember', 'mono'], FRAMES = ['glow', 'gold', 'aurora', 'ice', 'neon'];
const P_BANNERS = ['galaxy', 'holo'], P_FRAMES = ['cosmic', 'prism'];
const FOREVER = '9999-12-31T00:00:00Z';
const isPremium = u => !!u && !!u.premium_until && new Date(u.premium_until) > new Date();
const premOf = u => isPremium(u) ? { no: u.premium_no ? Number(u.premium_no) : null, forever: new Date(u.premium_until).getUTCFullYear() >= 9000, until: iso(u.premium_until) } : null;
const imgUrl = (k, u, v) => `/api/app?r=img&k=${k}&l=${encodeURIComponent(u.login)}&v=${v}`;
const avUrl = u => u.avatar_v ? imgUrl('a', u, u.avatar_v) : null;
const bnOut = u => !u.banner ? null : (u.banner === 'img' || /^data:/.test(u.banner)) ? (u.banner_v ? imgUrl('b', u, u.banner_v) : null) : u.banner;
function badgeTextOf(u) {
  if (!(u.role === 'owner' || u.role === 'coowner')) return undefined;
  const t = obj(u.badge_text), out = {};
  for (const k of arr(u.badges)) if (t[k] && typeof t[k] === 'object') out[k] = { n: String(t[k].n || '').slice(0, 48), d: String(t[k].d || '').slice(0, 160) };
  return Object.keys(out).length ? out : undefined;
}
const look = u => ({ role: u.role || 'user', badges: arr(u.badges).filter(b => BADGES.includes(b)), banner: bnOut(u), frame: u.frame || null, socials: obj(u.socials), premium: premOf(u), bt: badgeTextOf(u),
  color: COLOR_RE.test(u.theme_color || '') ? u.theme_color : null, title: u.title && ACH[u.title] ? u.title : null, spotify: SPOT_RE.test(u.spotify || '') ? u.spotify : null, music: musicOut(u) });
const PRIV = { dm: ['all', 'friends', 'none'], friends: ['all', 'none'], groups: ['all', 'friends', 'none'] }, PRIV_DEF = { dm: 'all', friends: 'all', groups: 'friends' };
const privOf = u => { const p = obj(u && u.privacy), o = {}; for (const k of Object.keys(PRIV)) o[k] = PRIV[k].includes(p[k]) ? p[k] : PRIV_DEF[k]; return o; };
const pub = u => ({ login: u.login, nick: u.nick, bio: u.bio, avatar: avUrl(u), created: iso(u.created_at), seen: iso(u.seen_at), ...look(u) });
function self(u) {
  return { ...pub(u), email: u.email, tfa: !!u.tfa_on, privacy: privOf(u), e2e: !!u.e2e_pub, ach: achOf(u), pin: !!u.pin_hash, perms: isStaff(u) ? permsOf(u) : undefined,
    nextLoginChange: u.login_changed_at ? new Date(new Date(u.login_changed_at).getTime() + 30 * DAY).toISOString() : null };
}
/* small public card for lists */
const card = u => ({ login: u.login, nick: u.nick, avatar: avUrl(u), frame: u.frame || null, role: u.role || 'user', badges: arr(u.badges).filter(b => BADGES.includes(b)), premium: premOf(u), seen: iso(u.seen_at) });
const CARD = p => `${p}login, ${p}nick, ${p}avatar_v, ${p}frame, ${p}role, ${p}badges, ${p}premium_no, ${p}premium_until, ${p}seen_at`;
const STAFF = ['owner', 'coowner', 'admin'];
const isStaff = u => !!u && STAFF.includes(u.role);
/* granular staff permissions: the owner has all of them, others get role defaults that the owner can override one by one */
const PERMS = ['edit', 'warn', 'ban', 'delete', 'roles', 'badges', 'flags', 'resets', 'announce', 'msgdel', 'chatlogs', 'stickers'];
const PERM_DEF = {
  coowner: { edit: 1, warn: 1, ban: 1, delete: 1, roles: 1, badges: 1, flags: 1, resets: 1, announce: 1, msgdel: 1, chatlogs: 1, stickers: 1 },
  admin: { edit: 1, warn: 1, ban: 1, delete: 1, roles: 0, badges: 0, flags: 1, resets: 1, announce: 1, msgdel: 1, chatlogs: 1, stickers: 1 }
};
function can(u, p) {
  if (!isStaff(u)) return false; if (u.role === 'owner') return true;
  const o = obj(u.perms); if (typeof o[p] === 'boolean') return o[p];
  return !!(PERM_DEF[u.role] || {})[p];
}
const permsOf = u => Object.fromEntries(PERMS.map(p => [p, can(u, p)]));
const isDirect = u => !!u && (u.role === 'owner' || obj(u.perms).direct === true);
function needPerm(u, p) { if (!can(u, p)) throw err(403, 'no_perm', { perm: p }); }
const isBanned = u => !!u && !!u.banned_until && new Date(u.banned_until) > new Date();
const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
const N = v => Number(v);
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
  const st = await db()(`SELECT id FROM users WHERE role IN ('admin', 'coowner', 'owner') AND id <> $1`, [exceptId]);
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
/* chat messages: one open flag per user, refreshed with the latest message instead of piling up */
async function flagChat(u, text, msgId) {
  const words = scanText(text); if (!words.length) return;
  const q = db(), open = (await q(`SELECT id, words FROM flags WHERE user_id = $1 AND field = 'chat' AND status = 'open' LIMIT 1`, [u.id]))[0];
  if (open) { const w = [...new Set([...arr(open.words), ...words])].slice(0, 8); await q(`UPDATE flags SET text = $2, words = $3::jsonb, ref = $4, created_at = now() WHERE id = $1`, [open.id, String(text).slice(0, 400), JSON.stringify(w), msgId]); return; }
  const r = await q(`INSERT INTO flags (user_id, field, text, words, ref) VALUES ($1, 'chat', $2, $3::jsonb, $4) RETURNING id`, [u.id, String(text).slice(0, 400), JSON.stringify(words), msgId]);
  await notifyStaff('flag', { flag: Number(r[0].id), login: u.login, field: 'chat', words }, u.id);
}
async function modLog(actor, target, action, detail = {}) { await db()(`INSERT INTO mod_log (actor_id, target_id, action, detail) VALUES ($1, $2, $3, $4::jsonb)`, [actor ? actor.id : null, target ? target.id : null, action, JSON.stringify(detail)]); }
async function unreadOf(u) {
  const r = await db()(`SELECT (SELECT count(*) FROM notifications WHERE user_id = $1 AND NOT read) AS n, (SELECT count(*) FROM announcements WHERE id > $2) AS a,
    (SELECT count(*) FROM (SELECT 1 FROM chat_members m JOIN messages x ON x.chat_id = m.chat_id AND x.id > m.last_read WHERE m.user_id = $1 AND x.user_id <> $1 AND NOT x.deleted LIMIT 100) s) AS c`, [u.id, Number(u.ann_seen) || 0]);
  const out = { n: Number(r[0].n) + Number(r[0].a), chat: Number(r[0].c) };
  if (isStaff(u)) { const s = await db()(`SELECT (SELECT count(*) FROM flags WHERE status = 'open') AS f, (SELECT count(*) FROM reset_requests WHERE status = 'pending' AND expires_at > now()) AS r, (SELECT count(*) FROM approvals WHERE status = 'pending') AS q`); out.staff = { flags: Number(s[0].f), resets: Number(s[0].r), queue: u.role === 'owner' ? Number(s[0].q) : 0 }; }
  return out;
}

/* ---------- 2FA: TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 digits) + one-time recovery codes ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32enc(buf) { let bits = 0, val = 0, out = ''; for (const b of buf) { val = ((val << 8) | b) & 0xffff; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out; }
function b32dec(s) { let bits = 0, val = 0; const out = []; for (const c of String(s).toUpperCase().replace(/[^A-Z2-7]/g, '')) { val = ((val << 5) | B32.indexOf(c)) & 0xffff; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); }
function hotp(key, counter) {
  const msg = Buffer.alloc(8); msg.writeUInt32BE(Math.floor(counter / 4294967296), 0); msg.writeUInt32BE(counter >>> 0, 4);
  const h = crypto.createHmac('sha1', key).update(msg).digest(), o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}
function totpCheck(secret, code, last = 0) {
  code = String(code || '').replace(/\D/g, ''); if (code.length !== 6 || !secret) return 0;
  const key = b32dec(secret), t = Math.floor(Date.now() / 30000);
  for (const c of [t, t - 1, t + 1]) if (c > last && crypto.timingSafeEqual(Buffer.from(hotp(key, c)), Buffer.from(code))) return c;
  return 0;
}
const normCode = s => String(s || '').toLowerCase().replace(/[^a-z2-7]/g, '');
function newRecovery() { const codes = []; for (let i = 0; i < 8; i++) { const c = b32enc(crypto.randomBytes(5)).toLowerCase(); codes.push(c.slice(0, 4) + '-' + c.slice(4, 8)); } return codes; }
/* checks a TOTP or a recovery code and records its use; true on success */
async function secondFactor(u, code) {
  const raw = String(code || '').trim();
  if (/^\d[\d\s]{5,7}$/.test(raw)) {
    const c = totpCheck(u.tfa_secret, raw, Number(u.tfa_last) || 0); if (!c) return false;
    await db()(`UPDATE users SET tfa_last = $2 WHERE id = $1`, [u.id, c]); return true;
  }
  const n = normCode(raw); if (n.length !== 8) return false;
  const h = sha('rc:' + n), list = arr(u.tfa_recovery);
  if (!list.includes(h)) return false;
  await db()(`UPDATE users SET tfa_recovery = $2::jsonb WHERE id = $1`, [u.id, JSON.stringify(list.filter(x => x !== h))]); return true;
}

/* ---------- PIN: an extra lock for the admin panel and the security settings, kept open for a minute per session ---------- */
const PIN_TTL = 60;
const pinOpen = u => !u.pin_hash || (!!u.s_pin && new Date(u.s_pin) > new Date());
async function needPin(ctx, u) {
  if (!u.pin_hash) return;
  if (!pinOpen(u)) throw err(423, 'pin_required');
  if (ctx.tokHash) await db()(`UPDATE sessions SET pin_until = now() + interval '${PIN_TTL} seconds' WHERE token_hash = $1`, [ctx.tokHash]);
}
const pinWeak = p => !/^\d{4,8}$/.test(p) || /^(\d)\1+$/.test(p) || '01234567890'.includes(p) || '09876543210'.includes(p);
/* ---------- seasonal theme: the owner turns it on, off or sets date ranges (Moscow time) ---------- */
const SEASON_DEF = { mode: 'auto', ranges: [{ from: '2026-12-20', to: '2027-01-10' }] };
async function seasonCfg() { const r = (await db()(`SELECT v FROM kv WHERE k = 'season'`))[0]; const v = r && obj(r.v); return v && ['on', 'off', 'auto'].includes(v.mode) ? { mode: v.mode, ranges: arr(v.ranges) } : SEASON_DEF; }
const mskDay = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
function seasonOn(c) { if (c.mode === 'on') return true; if (c.mode !== 'auto') return false; const d = mskDay(); return arr(c.ranges).some(r => r && r.from <= d && d <= r.to); }
const seasonOut = c => ({ on: seasonOn(c), theme: 'ny' });
const DATE_RE = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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
  if (await ipBanned(clientIp(ctx.req))) throw err(403, 'ip_banned');
  if ((await q(`SELECT 1 FROM users WHERE email_lc = $1`, [email.toLowerCase()])).length) throw err(409, 'email_taken');
  if (await loginTaken(login.toLowerCase())) throw err(409, 'login_taken');
  const data = sanitizeData(b.data), ts = Date.now();
  let rows;
  try {
    rows = await q(`INSERT INTO users (email, email_lc, login, login_lc, nick, pw, data, data_ts, stats, pub_sets) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb) RETURNING ${UCOLS}`,
      [email, email.toLowerCase(), login, login.toLowerCase(), nick, await hashPw(b.password), JSON.stringify(data), ts, JSON.stringify(computeStats(data)), JSON.stringify(publicSets(data))]);
  } catch (e) { if (e.code === '23505') throw err(409, /email/.test(e.message + (e.detail || '') + (e.constraint || '')) ? 'email_taken' : 'login_taken'); throw e; }
  const u = rows[0];
  await q(`UPDATE users SET ann_seen = COALESCE((SELECT max(id) FROM announcements), 0), global_read = COALESCE((SELECT max(id) FROM messages), 0) WHERE id = $1`, [u.id]);
  const n = await nextPromo(q);
  if (n) { try { await q(`UPDATE users SET premium_no = $2, premium_until = $3 WHERE id = $1`, [u.id, n, FOREVER]); u.premium_no = n; u.premium_until = FOREVER; } catch (e) { console.error(e); } }
  await autoFlag(u, 'nick', nick);
  await newSession(ctx, u);
  return { status: 201, body: { user: self(u), ts, unread: { n: 0, chat: 0 } } };
};
async function finishLogin(ctx, u) {
  await db()(`UPDATE users SET failed = 0, lock_until = NULL, seen_at = now() WHERE id = $1`, [u.id]);
  await newSession(ctx, u);
  const d = (await db()(`SELECT data FROM users WHERE id = $1`, [u.id]))[0] || {};
  return { user: self(u), data: d.data || {}, ts: Number(u.data_ts) || 0, unread: await unreadOf(u) };
}
const lockErr = u => err(429, 'locked', { minutes: Math.max(1, Math.ceil((new Date(u.lock_until) - Date.now()) / 6e4)) });
const banErr = u => err(403, 'banned', { until: iso(u.banned_until), reason: u.ban_reason || '' });
R['POST login'] = async ctx => {
  const id = clean(ctx.body.id, 254).toLowerCase(), pw = String(ctx.body.password || '');
  if (!id || !pw) throw err(400, 'creds');
  const q = db();
  const rows = await q(id.includes('@') ? `SELECT ${UCOLS} FROM users WHERE email_lc = $1` : `SELECT ${UCOLS} FROM users WHERE login_lc = $1`, [id.replace(/^@/, '')]);
  const u = rows[0];
  if (!u) { await checkPw(pw, DUMMY); throw err(401, 'creds'); }
  if (u.lock_until && new Date(u.lock_until) > new Date()) throw lockErr(u);
  if (!(await checkPw(pw, u.pw))) {
    const f = (u.failed || 0) + 1;
    if (f >= MAX_FAILS) { await q(`UPDATE users SET failed = 0, lock_until = now() + interval '${LOCK_MIN} minutes' WHERE id = $1`, [u.id]); throw err(429, 'locked', { minutes: LOCK_MIN }); }
    await q(`UPDATE users SET failed = $2 WHERE id = $1`, [u.id, f]);
    throw err(401, 'creds');
  }
  if (isBanned(u)) { await q(`UPDATE users SET failed = 0 WHERE id = $1`, [u.id]); throw banErr(u); }
  if (!isStaff(u) && await ipBanned(clientIp(ctx.req))) throw err(403, 'ip_banned');
  if (u.tfa_on && u.tfa_secret) {
    const tk = crypto.randomBytes(24).toString('base64url');
    await q(`DELETE FROM tfa_tickets WHERE user_id = $1 OR expires_at < now()`, [u.id]);
    await q(`INSERT INTO tfa_tickets (id_hash, user_id, expires_at, stage) VALUES ($1, $2, now() + interval '5 minutes', 'tfa')`, [sha(tk), u.id]);
    return { tfa: true, ticket: tk };
  }
  if (needSq(u)) return await sqTicket(u);
  return await finishLogin(ctx, u);
};
/* owner only: a security question after the password (and 2FA); the session is issued only after the right answer */
const needSq = u => u.role === 'owner' && !!u.sq_hash;
const sqNorm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
async function sqTicket(u, tk) {
  const q = db();
  if (tk) await q(`UPDATE tfa_tickets SET stage = 'sq', tries = 0, expires_at = now() + interval '5 minutes' WHERE id_hash = $1`, [sha(tk)]);
  else {
    tk = crypto.randomBytes(24).toString('base64url');
    await q(`DELETE FROM tfa_tickets WHERE user_id = $1 OR expires_at < now()`, [u.id]);
    await q(`INSERT INTO tfa_tickets (id_hash, user_id, expires_at, stage) VALUES ($1, $2, now() + interval '5 minutes', 'sq')`, [sha(tk), u.id]);
  }
  return { sq: true, ticket: tk, question: u.sq_text || '' };
}
R['POST login3'] = async ctx => {
  const tk = String(ctx.body.ticket || ''), q = db();
  if (!tk || tk.length > 80) throw err(401, 'tfa_expired');
  const t = (await q(`SELECT * FROM tfa_tickets WHERE id_hash = $1 AND expires_at > now() AND stage = 'sq'`, [sha(tk)]))[0];
  if (!t) throw err(401, 'tfa_expired');
  const u = (await q(`SELECT ${UCOLS} FROM users WHERE id = $1`, [t.user_id]))[0];
  if (!u || !needSq(u)) throw err(401, 'tfa_expired');
  if (u.lock_until && new Date(u.lock_until) > new Date()) throw lockErr(u);
  if (isBanned(u)) throw banErr(u);
  const ans = sqNorm(ctx.body.answer);
  if (!ans || ans.length > 200 || !(await checkPw(ans, u.sq_hash))) {
    const f = (u.failed || 0) + 1;
    if (f >= MAX_FAILS) { await q(`UPDATE users SET failed = 0, lock_until = now() + interval '${LOCK_MIN} minutes' WHERE id = $1`, [u.id]); await q(`DELETE FROM tfa_tickets WHERE user_id = $1`, [u.id]); throw err(429, 'locked', { minutes: LOCK_MIN }); }
    await q(`UPDATE users SET failed = $2 WHERE id = $1`, [u.id, f]);
    const r = (await q(`UPDATE tfa_tickets SET tries = tries + 1 WHERE id_hash = $1 RETURNING tries`, [sha(tk)]))[0];
    if (!r || r.tries >= 3) { await q(`DELETE FROM tfa_tickets WHERE id_hash = $1`, [sha(tk)]); throw err(401, 'tfa_expired'); }
    throw err(401, 'sq_bad', { left: 3 - r.tries });
  }
  await q(`DELETE FROM tfa_tickets WHERE user_id = $1`, [u.id]);
  return await finishLogin(ctx, u);
};
R['POST login2'] = async ctx => {
  const tk = String(ctx.body.ticket || ''), q = db();
  if (!tk || tk.length > 80) throw err(401, 'tfa_expired');
  const t = (await q(`SELECT * FROM tfa_tickets WHERE id_hash = $1 AND expires_at > now() AND stage = 'tfa'`, [sha(tk)]))[0];
  if (!t) throw err(401, 'tfa_expired');
  const u = (await q(`SELECT ${UCOLS} FROM users WHERE id = $1`, [t.user_id]))[0];
  if (!u || !u.tfa_on) throw err(401, 'tfa_expired');
  if (u.lock_until && new Date(u.lock_until) > new Date()) throw lockErr(u);
  if (isBanned(u)) throw banErr(u);
  if (!(await secondFactor(u, ctx.body.code))) {
    const f = (u.failed || 0) + 1;
    if (f >= MAX_FAILS) { await q(`UPDATE users SET failed = 0, lock_until = now() + interval '${LOCK_MIN} minutes' WHERE id = $1`, [u.id]); await q(`DELETE FROM tfa_tickets WHERE user_id = $1`, [u.id]); throw err(429, 'locked', { minutes: LOCK_MIN }); }
    await q(`UPDATE users SET failed = $2 WHERE id = $1`, [u.id, f]);
    await q(`UPDATE tfa_tickets SET tries = tries + 1 WHERE id_hash = $1`, [sha(tk)]);
    throw err(401, 'tfa_bad');
  }
  if (needSq(u)) return await sqTicket(u, tk);
  await q(`DELETE FROM tfa_tickets WHERE user_id = $1`, [u.id]);
  return await finishLogin(ctx, u);
};
R['POST logout'] = async ctx => {
  const tok = cookies(ctx.req).lynx_sid;
  if (tok) await db()(`DELETE FROM sessions WHERE token_hash = $1`, [sha(tok)]);
  setCookie(ctx, '', 0);
  return { ok: true };
};
R['GET me'] = async ctx => {
  const u = await current(ctx);
  if (!u) { if (cookies(ctx.req).lynx_sid) setCookie(ctx, '', 0); return { user: null, season: seasonOut(await seasonCfg()) }; }
  if (Date.now() - new Date(u.seen_at).getTime() > 5 * 6e4) await db()(`UPDATE users SET seen_at = now() WHERE id = $1`, [u.id]);
  const d = (await db()(`SELECT data FROM users WHERE id = $1`, [u.id]))[0] || {};
  return { user: self(u), data: d.data || {}, ts: Number(u.data_ts) || 0, unread: await unreadOf(u), season: seasonOut(await seasonCfg()) };
};
R['GET unread'] = async ctx => { const u = await need(ctx); return await unreadOf(u); };
R['PUT data'] = async ctx => {
  const u = await need(ctx), data = sanitizeData(ctx.body.data), base = Number(ctx.body.base) || 0, cur = Number(u.data_ts) || 0;
  if (cur && base !== cur) { const fresh = (await db()(`SELECT data FROM users WHERE id = $1`, [u.id]))[0]; return { status: 409, body: { error: 'conflict', data: fresh.data || {}, ts: cur } }; }
  const ts = Math.max(Date.now(), cur + 1);
  const r = await db()(`UPDATE users SET data = $2::jsonb, data_ts = $3, stats = $4::jsonb, pub_sets = $5::jsonb, seen_at = now() WHERE id = $1 AND data_ts = $6 RETURNING id`,
    [u.id, JSON.stringify(data), ts, JSON.stringify(computeStats(data)), JSON.stringify(publicSets(data, u.hidden_sets)), cur]);
  if (!r.length) { const fresh = (await db()(`SELECT data, data_ts FROM users WHERE id = $1`, [u.id]))[0]; return { status: 409, body: { error: 'conflict', data: fresh.data, ts: Number(fresh.data_ts) } }; }
  return { ts };
};
/* images: JPEG/PNG/WebP for everyone, animated GIF for premium */
const IMG_RE = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
function checkImg(a, u, kind) {
  const m = IMG_RE.exec(a); if (!m) throw err(400, kind + '_bad');
  if (m[1] === 'gif') { if (!isPremium(u)) throw err(403, 'premium'); if (a.length > (kind === 'avatar' ? 2200000 : 2900000)) throw err(413, 'too_big'); return; }
  if (kind === 'banner' && m[1] === 'png') throw err(400, 'banner_bad');
  if (a.length > (kind === 'avatar' ? 400000 : 460000)) throw err(400, kind + '_bad');
}
R['PATCH profile'] = async ctx => {
  const u = await need(ctx), b = ctx.body, set = [], vals = [u.id];
  const put = (col, v, cast = '') => { vals.push(v); set.push(`${col} = $${vals.length}${cast}`); };
  if ('nick' in b) { const n = clean(b.nick, 32); if (!n || len(n) > 32) throw err(400, 'nick_bad'); put('nick', n); }
  if ('bio' in b) { const s = clean(b.bio, 200); if (len(s) > 200) throw err(400, 'bio_bad'); put('bio', s); }
  if ('avatar' in b) {
    if (b.avatar === null || b.avatar === '') { put('avatar', null); put('avatar_v', null); }
    else { const a = String(b.avatar); checkImg(a, u, 'avatar'); put('avatar', a); put('avatar_v', ver(a)); }
  }
  if ('banner' in b) {
    if (b.banner === null || b.banner === '') { put('banner', null); put('banner_v', null); }
    else {
      const a = String(b.banner);
      if (/^p:[a-z]+$/.test(a)) { const p = a.slice(2); if (P_BANNERS.includes(p)) { if (!isPremium(u)) throw err(403, 'premium'); } else if (!BANNERS.includes(p)) throw err(400, 'banner_bad'); put('banner', a); put('banner_v', null); }
      else { checkImg(a, u, 'banner'); put('banner', a); put('banner_v', ver(a)); }
    }
  }
  if ('frame' in b) { const f = b.frame ? String(b.frame) : null; if (f && P_FRAMES.includes(f)) { if (!isPremium(u)) throw err(403, 'premium'); } else if (f && !FRAMES.includes(f)) throw err(400, 'frame_bad'); put('frame', f); }
  if ('socials' in b) put('socials', JSON.stringify(cleanSocials(b.socials)), '::jsonb');
  if ('color' in b) { const c = b.color ? String(b.color).toLowerCase() : null; if (c && !COLOR_RE.test(c)) throw err(400, 'color_bad'); put('theme_color', c); }
  if ('title' in b) { const t = b.title ? String(b.title) : null; if (t && !achOf(u).includes(t)) throw err(400, 'title_locked'); put('title', t); }
  if ('spotify' in b) put('spotify', parseSpotify(b.spotify));
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
  try { rows = await db()(`UPDATE users SET ${set.join(', ')} WHERE id = $1 RETURNING ${UCOLS}`, vals); }
  catch (e) { if (e.code === '23505') throw err(409, 'login_taken'); throw e; }
  const nu = rows[0];
  if (nu.nick !== u.nick) await autoFlag(nu, 'nick', nu.nick);
  if (nu.bio !== u.bio) await autoFlag(nu, 'bio', nu.bio);
  return { user: self(nu) };
};
const okWrap = w => { if (typeof w !== 'string' || w.length > 3000) return false; try { const j = JSON.parse(w); return j && j.v === 1 && ['s', 'i', 'c'].every(k => typeof j[k] === 'string' && /^[A-Za-z0-9+/]+=*$/.test(j[k])) && Number.isInteger(j.n) && j.n >= 100000 && j.n <= 2000000; } catch (e) { return false; } };
const okPub = s => { if (typeof s !== 'string' || s.length > 100 || !/^[A-Za-z0-9+/]+=*$/.test(s)) return false; const b = Buffer.from(s, 'base64'); return b.length === 65 && b[0] === 4; };
R['POST password'] = async ctx => {
  const u = await need(ctx);
  if (!(await checkPw(ctx.body.old, u.pw))) throw err(400, 'pw_wrong');
  if (!pwOk(ctx.body.password)) throw err(400, 'pw_weak');
  const w = ctx.body.wrap, keep = u.e2e_pub && okWrap(w);
  await db()(`UPDATE users SET pw = $2${keep ? ', e2e_wrap = $3' : ''} WHERE id = $1`, keep ? [u.id, await hashPw(ctx.body.password), w] : [u.id, await hashPw(ctx.body.password)]);
  await db()(`DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`, [u.id, ctx.tokHash]);
  return { ok: true, rewrapped: !!keep };
};
/* before deleting a user: hand their groups to the oldest member, drop empty groups */
async function cleanupUser(uid) {
  const q = db();
  const own = await q(`SELECT id FROM chats WHERE owner_id = $1 AND kind = 'group'`, [uid]);
  for (const c of own) {
    const nx = (await q(`SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id <> $2 ORDER BY joined_at LIMIT 1`, [c.id, uid]))[0];
    if (nx) { await q(`UPDATE chats SET owner_id = $2 WHERE id = $1`, [c.id, nx.user_id]); await q(`UPDATE chat_members SET role = 'owner' WHERE chat_id = $1 AND user_id = $2`, [c.id, nx.user_id]); }
    else await q(`DELETE FROM chats WHERE id = $1`, [c.id]);
  }
}
R['POST delete'] = async ctx => {
  const u = await need(ctx);
  if (!(await checkPw(ctx.body.password, u.pw))) throw err(400, 'pw_wrong');
  if (u.role === 'owner') throw err(403, 'protected');
  await cleanupUser(u.id);
  await db()(`DELETE FROM users WHERE id = $1`, [u.id]);
  setCookie(ctx, '', 0);
  return { ok: true };
};
async function relOf(meId, tId) {
  const a = Math.min(N(meId), N(tId)), b = Math.max(N(meId), N(tId));
  const r = (await db()(`SELECT status, req_by FROM friends WHERE a = $1 AND b = $2`, [a, b]))[0];
  if (!r) return 'none'; if (r.status === 'ok') return 'friends'; return N(r.req_by) === N(meId) ? 'out' : 'in';
}
const allowBy = (p, rel) => p === 'all' || (p === 'friends' && rel === 'friends');
function canRole(me, t) {
  if (!me || !t || N(me.id) === N(t.id)) return false;
  if (me.role === 'owner') return t.role !== 'owner';
  if (me.role === 'coowner' || me.role === 'admin') return t.role === 'user' || (t.role === 'admin' && t.role_by != null && N(t.role_by) === N(me.id));
  return false;
}
R['GET user'] = async ctx => {
  const l = String(ctx.q.get('login') || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(l)) throw err(404, 'not_found');
  const rows = await db()(`SELECT ${UCOLS} FROM users WHERE login_lc = $1`, [l]);
  const t = rows[0]; if (!t) throw err(404, 'not_found');
  const hid = new Set(arr(t.hidden_sets)), out = { ...pub(t), stats: t.stats || {}, sets: arr(t.pub_sets).filter(x => !hid.has(x.id)), banned: isBanned(t), ach: achOf(t) };
  const me = await current(ctx).catch(() => null);
  if (me && N(me.id) !== N(t.id)) {
    const rel = await relOf(me.id, t.id), p = privOf(t);
    out.rel = rel; out.canFriend = p.friends === 'all' || rel !== 'none'; out.canDm = !isBanned(t) && allowBy(p.dm, rel);
  }
  if (isStaff(me)) {
    const ipb = (await db()(`SELECT count(*) AS n FROM ip_bans WHERE user_id = $1 AND until > now()`, [t.id]))[0];
    const mayBadges = can(me, 'badges') && (me.role === 'owner' || canMod(me, t));
    out.mod = { canModerate: canMod(me, t), canRole: canRole(me, t) && can(me, 'roles'), canCoowner: me.role === 'owner' && t.role !== 'owner', canBadges: mayBadges, perms: permsOf(me), direct: isDirect(me),
      excl: mayBadges ? await badgeExcl() : [], premForever: !!premOf(t) && premOf(t).forever, isOwner: me.role === 'owner', bannedUntil: isBanned(t) ? iso(t.banned_until) : null, banReason: isBanned(t) ? t.ban_reason || '' : null,
      strikes: Number(t.strikes) || 0, warnsTotal: Number(t.warns_total) || 0, ips: arr(t.last_ips).map(maskIp), ipBanned: Number(ipb.n) > 0, created: iso(t.created_at) };
  }
  return { user: out };
};
R['GET users'] = async ctx => {
  const q = clean(ctx.q.get('q'), 40).toLowerCase().replace(/^@/, '');
  const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%', pre = q.replace(/[\\%_]/g, '\\$&') + '%';
  const rows = await db()(`SELECT login, nick, bio, avatar_v, created_at, seen_at, stats, role, badges, frame, premium_no, premium_until, badge_text FROM users
    WHERE ($1 = '' OR login_lc LIKE $2 OR lower(nick) LIKE $2) AND (banned_until IS NULL OR banned_until < now())
    ORDER BY (login_lc = $1) DESC, (login_lc LIKE $3 OR lower(nick) LIKE $3) DESC, seen_at DESC LIMIT 30`, [q, like, pre]);
  return { users: rows.map(r => ({ ...pub(r), banner: null, socials: {}, bio: (r.bio || '').slice(0, 140), attempts: (r.stats && r.stats.attempts) || 0, tasks: (r.stats && r.stats.tasks) || 0 })) };
};
R['GET img'] = async ctx => {
  const kk = ctx.q.get('k'), l = String(ctx.q.get('l') || '').toLowerCase();
  if (kk === 's') {
    const r = (await db()(`SELECT data AS d, v FROM stickers WHERE id = $1`, [N(ctx.q.get('id')) || 0]))[0];
    const m = r && /^data:(image\/png);base64,(.+)$/.exec(r.d); if (!m) throw err(404, 'not_found');
    return { raw: { type: m[1], buf: Buffer.from(m[2], 'base64'), cache: r.v === ctx.q.get('v') ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=60' } };
  }
  if (!/^[a-z0-9_]{1,40}$/.test(l)) throw err(404, 'not_found');
  if (kk === 'm') return await musicRaw(ctx, l);
  if (kk === 'c') {
    const r = (await db()(`SELECT music_cover AS d, music_v AS v FROM users WHERE login_lc = $1`, [l]))[0];
    const m = r && r.d && /^data:(image\/(?:jpeg|webp));base64,(.+)$/.exec(r.d); if (!m) throw err(404, 'not_found');
    return { raw: { type: m[1], buf: Buffer.from(m[2], 'base64'), cache: r.v === ctx.q.get('v') ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=60' } };
  }
  const k = kk === 'b' ? 'banner' : 'avatar';
  const r = (await db()(`SELECT ${k} AS d, ${k}_v AS v FROM users WHERE login_lc = $1`, [l]))[0];
  const m = r && r.d && /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(r.d);
  if (!m) throw err(404, 'not_found');
  return { raw: { type: m[1], buf: Buffer.from(m[2], 'base64'), cache: r.v === ctx.q.get('v') ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=60' } };
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
const sameSoc = (a, b) => { const n = o => JSON.stringify(Object.keys(obj(o)).sort().map(k => [k, o[k]])); return n(a) === n(b); };

/* ---------- moderation ---------- */
const canMod = (me, t) => isStaff(me) && !!t && N(me.id) !== N(t.id) && !isStaff(t);
const reasonOf = b => clean(b.reason, 300);
const AUTO_BAN = 'auto:strikes';
async function banUser(me, t, until, reason) {
  const q = db();
  await q(`UPDATE users SET banned_until = $2, ban_reason = $3 WHERE id = $1`, [t.id, until, reason]);
  await q(`DELETE FROM sessions WHERE user_id = $1`, [t.id]);
  await q(`UPDATE reset_requests SET status = 'rejected', decided_by = $2, decided_at = now() WHERE user_id = $1 AND status = 'pending'`, [t.id, me ? me.id : null]);
}
const MOD_PERM = { reset_bio: 'edit', reset_avatar: 'edit', rename: 'edit', edit: 'edit', del_set: 'edit', warn: 'warn', clear_strikes: 'warn', ban: 'ban', ip_ban: 'ban', unban: 'ban', delete_account: 'delete', role: 'roles', badges: 'badges' };
/* staff actions that need the owner's approval unless the owner gave this person direct mode */
async function queueApproval(me, t, kind, payload) {
  const q = db();
  const ex = (await q(`SELECT id FROM approvals WHERE status = 'pending' AND kind = $1 AND target_id = $2`, [kind, t.id]))[0];
  if (ex) await q(`UPDATE approvals SET payload = $2::jsonb, actor_id = $3, created_at = now() WHERE id = $1`, [ex.id, JSON.stringify(payload), me.id]);
  else await q(`INSERT INTO approvals (kind, actor_id, target_id, payload) VALUES ($1, $2, $3, $4::jsonb)`, [kind, me.id, t.id, JSON.stringify(payload)]);
  await modLog(me, t, 'queue_' + kind, payload);
  for (const o of await q(`SELECT id FROM users WHERE role = 'owner'`)) await notify(o.id, 'approval', { kind, by: me.login, login: t.login, ...payload });
  return { ok: true, queued: true };
}
R['POST mod'] = async ctx => {
  const me = await need(ctx); if (!isStaff(me)) throw err(403, 'forbidden');
  await needPin(ctx, me);
  const b = ctx.body, q = db(), a = String(b.action || '');
  if (!MOD_PERM[a]) throw err(400, 'bad');
  needPerm(me, MOD_PERM[a]);
  const t = (await q(`SELECT ${UCOLS} FROM users WHERE login_lc = $1`, [clean(b.login, 40).toLowerCase().replace(/^@/, '')]))[0];
  if (!t) throw err(404, 'not_found');
  if (a === 'role') { if (!canRole(me, t)) throw err(403, N(me.id) === N(t.id) ? 'self' : 'protected'); }
  else if (a === 'badges') { if (!(me.role === 'owner' || canMod(me, t))) throw err(403, N(me.id) === N(t.id) ? 'self' : 'protected'); }
  else if (!canMod(me, t)) throw err(403, N(me.id) === N(t.id) ? 'self' : 'protected');
  const reason = reasonOf(b);
  let detail = { reason }, silent = false;
  if (a === 'reset_bio') { await q(`UPDATE users SET bio = '' WHERE id = $1`, [t.id]); await q(`UPDATE flags SET status = 'resolved', resolved_by = $2, resolved_at = now() WHERE user_id = $1 AND field = 'bio' AND status = 'open'`, [t.id, me.id]); }
  else if (a === 'reset_avatar') await q(`UPDATE users SET avatar = NULL, avatar_v = NULL, banner = NULL, banner_v = NULL, frame = NULL WHERE id = $1`, [t.id]);
  else if (a === 'rename' || a === 'edit') {
    const set = [], vals = [t.id], fields = [];
    const put = (col, v, cast = '') => { vals.push(v); set.push(`${col} = $${vals.length}${cast}`); };
    if (b.nick != null && clean(b.nick, 32) !== t.nick) { const n = clean(b.nick, 32); if (!n || len(n) > 32) throw err(400, 'nick_bad'); put('nick', n); detail.nick = [t.nick, n]; fields.push('nick'); }
    if (b.newLogin != null && clean(b.newLogin, 24) !== t.login) {
      const l = clean(b.newLogin, 24); if (!LOGIN_RE.test(l)) throw err(400, 'login_bad');
      if (l.toLowerCase() !== t.login_lc && await loginTaken(l.toLowerCase(), t.id)) throw err(409, 'login_taken');
      put('login', l); put('login_lc', l.toLowerCase()); detail.login = [t.login, l]; fields.push('login');
    }
    if (a === 'edit') {
      if (b.bio != null && clean(b.bio, 200) !== t.bio) { const s = clean(b.bio, 200); if (len(s) > 200) throw err(400, 'bio_bad'); put('bio', s); fields.push('bio'); }
      if (b.socials != null) { const s = cleanSocials(b.socials); if (!sameSoc(s, t.socials)) { put('socials', JSON.stringify(s), '::jsonb'); fields.push('socials'); } }
      if ('frame' in b) { const f = b.frame ? String(b.frame) : null; if (f && !FRAMES.includes(f) && !P_FRAMES.includes(f)) throw err(400, 'frame_bad'); if (f !== (t.frame || null)) { put('frame', f); fields.push('frame'); } }
      if (b.resetAvatar) { set.push('avatar = NULL', 'avatar_v = NULL'); fields.push('avatar'); }
      if (b.resetBanner) { set.push('banner = NULL', 'banner_v = NULL'); fields.push('banner'); }
    }
    if (!set.length) return { ok: true };
    try { await q(`UPDATE users SET ${set.join(', ')} WHERE id = $1`, vals); } catch (e) { if (e.code === '23505') throw err(409, 'login_taken'); throw e; }
    for (const f of ['nick', 'bio']) if (fields.includes(f)) await q(`UPDATE flags SET status = 'resolved', resolved_by = $2, resolved_at = now() WHERE user_id = $1 AND field = $3 AND status = 'open'`, [t.id, me.id, f]);
    detail.fields = fields;
  }
  else if (a === 'del_set') {
    const id = clean(b.setId, 40); if (!id) throw err(400, 'bad');
    const hid = [...new Set([...arr(t.hidden_sets), id])].slice(-200), ps = arr(t.pub_sets).filter(x => x.id !== id);
    await q(`UPDATE users SET hidden_sets = $2::jsonb, pub_sets = $3::jsonb WHERE id = $1`, [t.id, JSON.stringify(hid), JSON.stringify(ps)]);
    const s0 = arr(t.pub_sets).find(x => x.id === id); detail.set = s0 ? s0.name : id;
  }
  else if (a === 'warn') {
    const text = clean(b.text, 500); if (!text) throw err(400, 'text_bad');
    const r = (await q(`UPDATE users SET strikes = strikes + 1, warns_total = warns_total + 1 WHERE id = $1 RETURNING strikes, warns_total`, [t.id]))[0];
    detail = { text, strikes: Number(r.strikes), total: Number(r.warns_total) };
    if (detail.strikes >= 3) {
      const until = new Date(Date.now() + DAY).toISOString();
      await banUser(me, t, until, AUTO_BAN); await q(`UPDATE users SET strikes = 0 WHERE id = $1`, [t.id]);
      await modLog(me, t, 'warn', detail); await notify(t.id, 'warn', { action: 'warn', by: me.login, ...detail }, '', text);
      await modLog(null, t, 'auto_ban', { until, days: 1, reason: AUTO_BAN });
      await notify(t.id, 'mod', { action: 'ban', auto: true, until, days: 1 }, '', '');
      await notifyStaff('strike_ban', { login: t.login, until });
      return { ok: true, autoBan: true, until };
    }
  }
  else if (a === 'clear_strikes') { await q(`UPDATE users SET strikes = 0 WHERE id = $1`, [t.id]); detail.was = Number(t.strikes) || 0; }
  else if (a === 'ban' || a === 'ip_ban') {
    const days = Number(b.days); if (!(days === 0 || [1, 3, 7, 30, 90, 365].includes(days))) throw err(400, 'bad');
    const until = days ? new Date(Date.now() + days * DAY).toISOString() : FOREVER;
    await banUser(me, t, until, reason);
    detail.until = until; detail.days = days;
    if (a === 'ip_ban') {
      const ips = [...new Set([...arr(t.last_ips), ...(await q(`SELECT DISTINCT ip FROM sessions WHERE user_id = $1 AND ip IS NOT NULL`, [t.id])).map(r => r.ip)])].filter(Boolean).slice(0, 10);
      for (const ip of ips) await q(`INSERT INTO ip_bans (ip, user_id, reason, by_id, until) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (ip) DO UPDATE SET user_id = EXCLUDED.user_id, reason = EXCLUDED.reason, by_id = EXCLUDED.by_id, until = EXCLUDED.until, created_at = now()`, [ip, t.id, reason, me.id, until]);
      detail.ips = ips.length;
    }
  }
  else if (a === 'unban') { await q(`UPDATE users SET banned_until = NULL, ban_reason = NULL, strikes = 0 WHERE id = $1`, [t.id]); const r = await q(`DELETE FROM ip_bans WHERE user_id = $1 RETURNING ip`, [t.id]); if (r.length) detail.ips = r.length; }
  else if (a === 'delete_account') {
    if (t.role === 'owner') throw err(403, 'protected');
    if (!isDirect(me)) return await queueApproval(me, t, 'delete', { reason, login: t.login });
    await cleanupUser(t.id);
    await q(`DELETE FROM users WHERE id = $1`, [t.id]);
    await modLog(me, null, 'delete_account', { reason, login: t.login });
    return { ok: true, deleted: true };
  }
  else if (a === 'role') {
    const role = b.role === 'admin' ? 'admin' : b.role === 'coowner' && me.role === 'owner' ? 'coowner' : 'user';
    if (role === t.role) return { ok: true };
    if (role !== 'user' && !isDirect(me)) return await queueApproval(me, t, 'role', { role, from: t.role, reason });
    await q(`UPDATE users SET role = $2, role_by = $3 WHERE id = $1`, [t.id, role, role === 'user' ? null : me.id]); detail = { role, from: t.role };
  }
  else if (a === 'badges') {
    /* 'premium' here means Premium forever; exclusive badges can be changed by the owner only */
    const want = new Set(arr(b.badges).map(String).filter(x => ALL_BADGES.includes(x)));
    const pf = premOf(t), old = new Set([...arr(t.badges).filter(x => BADGES.includes(x)), ...(pf && pf.forever ? ['premium'] : [])]);
    const excl = await badgeExcl();
    if (me.role !== 'owner') for (const x of ALL_BADGES) if (excl.includes(x) && want.has(x) !== old.has(x)) throw err(403, 'exclusive', { badge: x });
    const bs = BADGES.filter(x => want.has(x)), keep = arr(t.badges).filter(x => !BADGES.includes(x));
    await q(`UPDATE users SET badges = $2::jsonb WHERE id = $1`, [t.id, JSON.stringify([...bs, ...keep])]);
    if (want.has('premium') !== old.has('premium')) await q(`UPDATE users SET premium_until = $2 WHERE id = $1`, [t.id, want.has('premium') ? FOREVER : null]);
    detail = { added: [...want].filter(x => !old.has(x)), removed: [...old].filter(x => !want.has(x)) };
    if (!detail.added.length && !detail.removed.length) return { ok: true };
  }
  else throw err(400, 'bad');
  await modLog(me, t, a, detail);
  if (!silent && N(t.id) !== N(me.id)) await notify(t.id, a === 'warn' ? 'warn' : 'mod', { action: a, by: me.login, ...detail }, '', a === 'warn' ? detail.text : reason);
  return { ok: true, ...(a === 'warn' ? { strikes: detail.strikes } : {}) };
};
/* owner / co-owner rename their own named badges */
R['POST badge_text'] = async ctx => {
  const me = await need(ctx); if (!(me.role === 'owner' || me.role === 'coowner')) throw err(403, 'forbidden');
  const id = String(ctx.body.id || ''); if (!NAMED.includes(id) || !arr(me.badges).includes(id)) throw err(400, 'bad');
  const n = clean(ctx.body.n, 24), d = clean(ctx.body.d, 80);
  if (len(n) > 24 || len(d) > 80) throw err(400, 'text_bad');
  const bt = { ...obj(me.badge_text) };
  if (!n && !d) delete bt[id]; else bt[id] = { n, d };
  await db()(`UPDATE users SET badge_text = $2::jsonb WHERE id = $1`, [me.id, JSON.stringify(bt)]);
  return { ok: true, bt: badgeTextOf({ ...me, badge_text: bt }) || {} };
};

/* ---------- notifications ---------- */
R['GET notifications'] = async ctx => {
  const u = await need(ctx), q = db();
  const items = await q(`SELECT id, kind, title, body, data, read, created_at FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 80`, [u.id]);
  const anns = await q(`SELECT a.id, a.title, a.body, a.created_at, ${CARD('u.')} FROM announcements a LEFT JOIN users u ON u.id = a.author_id ORDER BY a.id DESC LIMIT 20`);
  return { items: items.map(n => ({ id: Number(n.id), kind: n.kind, title: n.title, body: n.body, data: n.data || {}, read: !!n.read, created: iso(n.created_at) })),
    announcements: anns.map(a => ({ id: Number(a.id), title: a.title, body: a.body, created: iso(a.created_at), read: Number(a.id) <= (Number(u.ann_seen) || 0), author: a.login ? card(a) : null })),
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
  const fresh = (await q(`SELECT id, ann_seen, role FROM users WHERE id = $1`, [u.id]))[0];
  return { ok: true, unread: await unreadOf(fresh) };
};

/* ---------- admin panel ---------- */
const canReset = (me, role) => role === 'user' || (role === 'admin' && (me.role === 'owner' || me.role === 'coowner')) || (role === 'coowner' && me.role === 'owner');
R['GET admin'] = async ctx => {
  const me = await need(ctx); if (!isStaff(me)) throw err(403, 'forbidden');
  await needPin(ctx, me);
  const q = db(), own = me.role === 'owner';
  const flags = can(me, 'flags') ? await q(`SELECT f.id, f.field, f.text, f.words, f.ref, f.created_at, ${CARD('u.')} FROM flags f JOIN users u ON u.id = f.user_id WHERE f.status = 'open' ORDER BY f.id DESC LIMIT 100`) : [];
  const resets = can(me, 'resets') ? await q(`SELECT r.id, r.note, r.created_at, r.expires_at, ${CARD('u.')} FROM reset_requests r JOIN users u ON u.id = r.user_id WHERE r.status = 'pending' AND r.expires_at > now() ORDER BY r.id DESC LIMIT 100`) : [];
  const queue = await q(`SELECT a.id, a.kind, a.payload, a.created_at, ${CARD('t.')}, x.login AS by_login, x.nick AS by_nick FROM approvals a LEFT JOIN users t ON t.id = a.target_id LEFT JOIN users x ON x.id = a.actor_id
    WHERE a.status = 'pending' AND ($1::boolean OR a.actor_id = $2) ORDER BY a.id DESC LIMIT 100`, [own, me.id]);
  const banned = await q(`SELECT ${CARD('u.')}, u.banned_until, u.ban_reason, (SELECT count(*) FROM ip_bans b WHERE b.user_id = u.id AND b.until > now()) AS ipn FROM users u WHERE u.banned_until > now() ORDER BY u.banned_until DESC LIMIT 200`);
  const staff = await q(`SELECT u.id, ${CARD('u.')}, u.role_by, u.badge_text, u.perms, r.login AS by_login FROM users u LEFT JOIN users r ON r.id = u.role_by WHERE u.role IN ('owner', 'coowner', 'admin') ORDER BY CASE u.role WHEN 'owner' THEN 0 WHEN 'coowner' THEN 1 ELSE 2 END, u.login_lc`);
  const anns = await q(`SELECT a.id, a.title, a.body, a.created_at, u.login FROM announcements a LEFT JOIN users u ON u.id = a.author_id ORDER BY a.id DESC LIMIT 30`);
  const log = await q(`SELECT l.id, l.action, l.detail, l.created_at, a.login AS actor, t.login AS target FROM mod_log l LEFT JOIN users a ON a.id = l.actor_id LEFT JOIN users t ON t.id = l.target_id ORDER BY l.id DESC LIMIT 80`);
  const cnt = (await q(`SELECT count(*) AS n, count(*) FILTER (WHERE premium_until > now()) AS p, (SELECT count(*) FROM ip_bans WHERE until > now()) AS ipb FROM users`))[0];
  return {
    me: { role: me.role, login: me.login, perms: permsOf(me), direct: isDirect(me), pin: !!me.pin_hash }, users: Number(cnt.n), premium: Number(cnt.p), ipBans: Number(cnt.ipb),
    queue: queue.map(a => ({ id: Number(a.id), kind: a.kind, payload: obj(a.payload), created: iso(a.created_at), user: a.login ? card(a) : null, by: a.by_login ? { login: a.by_login, nick: a.by_nick } : null })),
    ...(own ? { perms: PERMS, permDef: PERM_DEF, badgeList: ALL_BADGES, excl: await badgeExcl(), season: { ...(await seasonCfg()), on: seasonOn(await seasonCfg()), today: mskDay() } } : {}),
    flags: flags.map(f => ({ id: Number(f.id), field: f.field, text: f.text, words: arr(f.words), ref: f.ref ? Number(f.ref) : null, created: iso(f.created_at), user: card(f), canAct: !STAFF.includes(f.role) })),
    resets: resets.map(r => ({ id: Number(r.id), note: r.note, created: iso(r.created_at), expires: iso(r.expires_at), user: card(r), canAct: canReset(me, r.role) })),
    banned: banned.map(x => ({ ...card(x), until: iso(x.banned_until), reason: x.ban_reason || '', ipBans: Number(x.ipn) })),
    staff: staff.map(x => ({ ...card(x), by: x.by_login || null, canDemote: canRole(me, x) && can(me, 'roles') && x.role !== 'user', ...(own && x.role !== 'owner' ? { perms: permsOf(x), direct: isDirect(x) } : {}) })),
    announcements: anns.map(a => ({ id: Number(a.id), title: a.title, body: a.body, created: iso(a.created_at), author: a.login || null })),
    log: log.map(l => ({ id: Number(l.id), action: l.action, detail: l.detail || {}, created: iso(l.created_at), actor: l.actor || null, target: l.target || null }))
  };
};
R['POST admin'] = async ctx => {
  const me = await need(ctx); if (!isStaff(me)) throw err(403, 'forbidden');
  await needPin(ctx, me);
  const b = ctx.body, q = db(), own = me.role === 'owner';
  const OP_PERM = { flag: 'flags', reset: 'resets', announce: 'announce', unannounce: 'announce' };
  if (OP_PERM[b.op]) needPerm(me, OP_PERM[b.op]);
  else if (['approve', 'perms', 'badge_excl', 'season'].includes(b.op) && !own) throw err(403, 'forbidden');
  if (b.op === 'approve') {
    const ap = (await q(`SELECT * FROM approvals WHERE id = $1 AND status = 'pending'`, [N(b.id) || 0]))[0]; if (!ap) throw err(404, 'not_found');
    const ok = !!b.ok, pl = obj(ap.payload);
    const t = (await q(`SELECT ${UCOLS} FROM users WHERE id = $1`, [ap.target_id]))[0], actor = (await q(`SELECT id, login, role FROM users WHERE id = $1`, [ap.actor_id]))[0] || null;
    if (ok) {
      if (!t) { await q(`UPDATE approvals SET status = 'rejected', decided_by = $2, decided_at = now() WHERE id = $1`, [ap.id, me.id]); throw err(404, 'not_found'); }
      if (ap.kind === 'role') {
        if (t.role === 'owner') throw err(403, 'protected');
        const role = ['admin', 'coowner'].includes(pl.role) ? pl.role : 'user';
        await q(`UPDATE users SET role = $2, role_by = $3 WHERE id = $1`, [t.id, role, role === 'user' ? null : (actor ? actor.id : me.id)]);
        await modLog(actor || me, t, 'role', { role, from: t.role, approvedBy: me.login });
        await notify(t.id, 'mod', { action: 'role', by: actor ? actor.login : me.login, role, from: t.role }, '', pl.reason || '');
      } else if (ap.kind === 'delete') {
        if (t.role === 'owner' || isStaff(t)) throw err(403, 'protected');
        await cleanupUser(t.id); await q(`DELETE FROM users WHERE id = $1`, [t.id]);
        await modLog(actor || me, null, 'delete_account', { reason: pl.reason || '', login: t.login, approvedBy: me.login });
      }
    }
    await q(`UPDATE approvals SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [ap.id, ok ? 'approved' : 'rejected', me.id]);
    if (actor && N(actor.id) !== N(me.id)) await notify(actor.id, 'approval_done', { kind: ap.kind, ok, login: t ? t.login : pl.login || '', role: pl.role || null });
    await modLog(me, ok && ap.kind === 'delete' ? null : t || null, ok ? 'approve' : 'reject', { kind: ap.kind, by: actor ? actor.login : null, login: t ? t.login : pl.login || '' });
    return { ok: true };
  }
  if (b.op === 'perms') {
    const t = await userByLogin(b.login); if (!isStaff(t) || t.role === 'owner') throw err(400, 'bad');
    const inp = obj(b.perms), d = PERM_DEF[t.role] || {}, out = {};
    for (const p of PERMS) { const v = typeof inp[p] === 'boolean' ? inp[p] : can(t, p); if (v !== !!d[p]) out[p] = v; }
    if (typeof b.direct === 'boolean' ? b.direct : isDirect(t)) out.direct = true;
    await q(`UPDATE users SET perms = $2::jsonb WHERE id = $1`, [t.id, JSON.stringify(out)]);
    await modLog(me, t, 'perms', { perms: out });
    return { ok: true, perms: permsOf({ ...t, perms: out }), direct: !!out.direct };
  }
  if (b.op === 'badge_excl') {
    const ids = [...new Set(arr(b.ids).map(String))].filter(x => ALL_BADGES.includes(x));
    await q(`INSERT INTO kv (k, v) VALUES ('badge_excl', $1::jsonb) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`, [JSON.stringify(ids)]);
    await modLog(me, null, 'badge_excl', { ids });
    return { ok: true, excl: ids };
  }
  if (b.op === 'season') {
    const mode = ['on', 'off', 'auto'].includes(b.mode) ? b.mode : null; if (!mode) throw err(400, 'bad');
    const ranges = arr(b.ranges).slice(0, 12).map(r => ({ from: String(obj(r).from || ''), to: String(obj(r).to || '') }));
    for (const r of ranges) if (!DATE_RE.test(r.from) || !DATE_RE.test(r.to) || r.from > r.to) throw err(400, 'range_bad');
    const v = { mode, ranges };
    await q(`INSERT INTO kv (k, v) VALUES ('season', $1::jsonb) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`, [JSON.stringify(v)]);
    await modLog(me, null, 'season', { mode, n: ranges.length });
    return { ok: true, season: { ...v, on: seasonOn(v), today: mskDay() } };
  }
  if (b.op === 'flag') {
    const st = b.status === 'resolved' ? 'resolved' : 'dismissed';
    const r = await q(`UPDATE flags SET status = $2, resolved_by = $3, resolved_at = now() WHERE id = $1 AND status = 'open' RETURNING user_id`, [Number(b.id) || 0, st, me.id]);
    if (r.length) await modLog(me, { id: r[0].user_id }, 'flag_' + st, { flag: Number(b.id) });
  } else if (b.op === 'reset') {
    const r = (await q(`SELECT r.*, u.role, u.login FROM reset_requests r JOIN users u ON u.id = r.user_id WHERE r.id = $1`, [Number(b.id) || 0]))[0];
    if (!r || r.status !== 'pending') throw err(404, 'not_found');
    if (!canReset(me, r.role)) throw err(403, 'protected');
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
  const u = (await q(id.includes('@') ? `SELECT id, login, role FROM users WHERE email_lc = $1` : `SELECT id, login, role FROM users WHERE login_lc = $1`, [id.replace(/^@/, '')]))[0];
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
  /* a staff-approved reset also turns 2FA off (the user may have lost the phone) and drops the E2EE key, which was locked with the old password */
  await q(`UPDATE users SET pw = $2, failed = 0, lock_until = NULL, tfa_on = false, tfa_secret = NULL, tfa_pending = NULL, tfa_recovery = '[]'::jsonb, e2e_pub = NULL, e2e_wrap = NULL, pin_hash = NULL WHERE id = $1`, [r.user_id, await hashPw(ctx.body.password)]);
  await q(`DELETE FROM sessions WHERE user_id = $1`, [r.user_id]);
  await q(`DELETE FROM tfa_tickets WHERE user_id = $1`, [r.user_id]);
  await q(`UPDATE reset_requests SET status = 'done' WHERE id = $1`, [r.id]);
  await notify(r.user_id, 'mod', { action: 'pw_reset' });
  return { ok: true };
};

/* ---------- privacy & security ---------- */
R['GET security'] = async ctx => {
  const me = await need(ctx);
  await needPin(ctx, me);
  const s = await db()(`SELECT sid, ip, ua, created_at, last_seen FROM sessions WHERE user_id = $1 AND expires_at > now() ORDER BY last_seen DESC LIMIT 50`, [me.id]);
  return { sessions: s.map(x => ({ id: Number(x.sid), ip: maskIp(x.ip), ua: x.ua || '', created: iso(x.created_at), seen: iso(x.last_seen), current: Number(x.sid) === ctx.sid })),
    tfa: { on: !!me.tfa_on, codes: arr(me.tfa_recovery).length }, privacy: privOf(me), e2e: !!me.e2e_pub,
    pin: { on: !!me.pin_hash, resetAt: iso(me.pin_reset_at), nextReset: me.pin_reset_at ? new Date(new Date(me.pin_reset_at).getTime() + 30 * DAY).toISOString() : null },
    sq: me.role === 'owner' ? { on: !!me.sq_hash, text: me.sq_text || '' } : undefined };
};
R['POST security'] = async ctx => {
  const me = await need(ctx), b = ctx.body, q = db(), op = String(b.op || '');
  await needPin(ctx, me);
  const pwNeeded = async () => { if (!(await checkPw(b.password, me.pw))) throw err(400, 'pw_wrong'); };
  if (op === 'sq_set' || op === 'sq_off') {
    if (me.role !== 'owner') throw err(403, 'forbidden'); await pwNeeded();
    if (op === 'sq_off') { await q(`UPDATE users SET sq_text = NULL, sq_hash = NULL WHERE id = $1`, [me.id]); return { ok: true }; }
    const qt = clean(b.question, 120), an = sqNorm(b.answer);
    if (len(qt) < 5 || len(qt) > 120) throw err(400, 'sq_q_bad');
    if (len(an) < 3 || an.length > 200) throw err(400, 'sq_a_bad');
    await q(`UPDATE users SET sq_text = $2, sq_hash = $3 WHERE id = $1`, [me.id, qt, await hashPw(an)]);
    return { ok: true };
  }
  if (op === 'revoke') { const r = await q(`DELETE FROM sessions WHERE user_id = $1 AND sid = $2 AND token_hash <> $3 RETURNING sid`, [me.id, Number(b.id) || 0, ctx.tokHash]); return { ok: true, n: r.length }; }
  if (op === 'revoke_others') { const r = await q(`DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2 RETURNING sid`, [me.id, ctx.tokHash]); return { ok: true, n: r.length }; }
  if (op === 'privacy') {
    const p = { ...privOf(me) }; for (const k of Object.keys(PRIV)) if (b[k] != null) { if (!PRIV[k].includes(b[k])) throw err(400, 'bad'); p[k] = b[k]; }
    await q(`UPDATE users SET privacy = $2::jsonb WHERE id = $1`, [me.id, JSON.stringify(p)]); return { ok: true, privacy: p };
  }
  if (op === 'tfa_begin') {
    if (me.tfa_on) throw err(409, 'tfa_on'); await pwNeeded();
    const secret = b32enc(crypto.randomBytes(20));
    await q(`UPDATE users SET tfa_pending = $2 WHERE id = $1`, [me.id, secret]);
    const label = encodeURIComponent('lynx.') + ':' + encodeURIComponent(me.login);
    return { secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('lynx.')}` };
  }
  if (op === 'tfa_enable') {
    if (me.tfa_on) throw err(409, 'tfa_on'); if (!me.tfa_pending) throw err(409, 'tfa_expired');
    const c = totpCheck(me.tfa_pending, b.code); if (!c) throw err(400, 'tfa_bad');
    const codes = newRecovery();
    await q(`UPDATE users SET tfa_on = true, tfa_secret = tfa_pending, tfa_pending = NULL, tfa_last = $2, tfa_recovery = $3::jsonb WHERE id = $1`, [me.id, c, JSON.stringify(codes.map(x => sha('rc:' + normCode(x))))]);
    return { ok: true, codes };
  }
  if (op === 'tfa_disable' || op === 'tfa_codes') {
    if (!me.tfa_on) throw err(409, 'tfa_off'); if (op === 'tfa_disable' && me.pin_hash) throw err(409, 'pin_first'); await pwNeeded();
    if (!(await secondFactor(me, b.code))) throw err(400, 'tfa_bad');
    if (op === 'tfa_disable') { await q(`UPDATE users SET tfa_on = false, tfa_secret = NULL, tfa_pending = NULL, tfa_recovery = '[]'::jsonb WHERE id = $1`, [me.id]); return { ok: true }; }
    const codes = newRecovery(); await q(`UPDATE users SET tfa_recovery = $2::jsonb WHERE id = $1`, [me.id, JSON.stringify(codes.map(x => sha('rc:' + normCode(x))))]); return { ok: true, codes };
  }
  throw err(400, 'bad');
};

R['POST pin'] = async ctx => {
  const me = await need(ctx), b = ctx.body, q = db(), op = String(b.op || ''), open = pinOpen(me);
  const setOpen = () => q(`UPDATE sessions SET pin_until = now() + interval '${PIN_TTL} seconds' WHERE token_hash = $1`, [ctx.tokHash]);
  if (op === 'status') return { on: !!me.pin_hash, open };
  if (op === 'touch') { if (me.pin_hash && open) await setOpen(); return { on: !!me.pin_hash, open }; }
  if (op === 'lock') { await q(`UPDATE sessions SET pin_until = NULL WHERE token_hash = $1`, [ctx.tokHash]); return { ok: true }; }
  if (op === 'unlock') {
    if (!me.pin_hash) return { ok: true, on: false };
    if (me.pin_lock && new Date(me.pin_lock) > new Date()) throw err(429, 'pin_locked', { minutes: Math.max(1, Math.ceil((new Date(me.pin_lock) - Date.now()) / 6e4)) });
    const pin = String(b.pin || '');
    if (!/^\d{4,8}$/.test(pin) || !(await checkPw(pin, me.pin_hash))) {
      const f = (Number(me.pin_fails) || 0) + 1;
      if (f >= MAX_FAILS) { await q(`UPDATE users SET pin_fails = 0, pin_lock = now() + interval '${LOCK_MIN} minutes' WHERE id = $1`, [me.id]); await q(`UPDATE sessions SET pin_until = NULL WHERE user_id = $1`, [me.id]); throw err(429, 'pin_locked', { minutes: LOCK_MIN }); }
      await q(`UPDATE users SET pin_fails = $2 WHERE id = $1`, [me.id, f]);
      throw err(400, 'pin_bad', { left: MAX_FAILS - f });
    }
    await q(`UPDATE users SET pin_fails = 0, pin_lock = NULL WHERE id = $1`, [me.id]); await setOpen();
    return { ok: true, ttl: PIN_TTL };
  }
  if (op === 'set') {
    if (!me.tfa_on) throw err(409, 'tfa_needed');
    if (me.pin_hash && !open) throw err(423, 'pin_required');
    if (!(await checkPw(b.password, me.pw))) throw err(400, 'pw_wrong');
    const pin = String(b.pin || ''); if (pinWeak(pin)) throw err(400, 'pin_weak');
    await q(`UPDATE users SET pin_hash = $2, pin_fails = 0, pin_lock = NULL WHERE id = $1`, [me.id, await hashPw(pin)]); await setOpen();
    return { ok: true };
  }
  if (op === 'remove') {
    if (!me.pin_hash) return { ok: true };
    if (!open) throw err(423, 'pin_required');
    if (!(await checkPw(b.password, me.pw))) throw err(400, 'pw_wrong');
    await q(`UPDATE users SET pin_hash = NULL, pin_fails = 0, pin_lock = NULL WHERE id = $1`, [me.id]);
    return { ok: true };
  }
  if (op === 'reset') {
    /* forgotten PIN: password + 2FA code, once in 30 days */
    if (!me.pin_hash) return { ok: true };
    if (!me.tfa_on) throw err(409, 'tfa_needed');
    if (me.pin_reset_at && Date.now() < new Date(me.pin_reset_at).getTime() + 30 * DAY) throw err(429, 'pin_reset_wait', { until: new Date(new Date(me.pin_reset_at).getTime() + 30 * DAY).toISOString() });
    if (!(await checkPw(b.password, me.pw))) throw err(400, 'pw_wrong');
    if (!(await secondFactor(me, b.code))) throw err(400, 'tfa_bad');
    await q(`UPDATE users SET pin_hash = NULL, pin_fails = 0, pin_lock = NULL, pin_reset_at = now() WHERE id = $1`, [me.id]);
    return { ok: true };
  }
  throw err(400, 'bad');
};

/* ---------- E2EE keys: public key + private key wrapped on the client with a key derived from the password ---------- */
R['GET keys'] = async ctx => { const me = await need(ctx); return { pub: me.e2e_pub || null, wrap: me.e2e_wrap || null }; };
R['PUT keys'] = async ctx => {
  const me = await need(ctx), b = ctx.body;
  if (!(await checkPw(b.password, me.pw))) throw err(400, 'pw_wrong');
  if (!okPub(b.pub) || !okWrap(b.wrap)) throw err(400, 'bad');
  if (me.e2e_pub && !b.replace) throw err(409, 'key_exists', { pub: me.e2e_pub, wrap: me.e2e_wrap });
  await db()(`UPDATE users SET e2e_pub = $2, e2e_wrap = $3 WHERE id = $1`, [me.id, b.pub, b.wrap]);
  return { ok: true };
};

/* ---------- premium promo ---------- */
R['GET promo'] = async ctx => {
  const r = (await db()(`SELECT (v #>> '{}')::int AS n FROM kv WHERE k = 'promo_n'`))[0];
  const n = Math.min(PROMO_MAX, r ? Number(r.n) : 0);
  return { given: n, total: PROMO_MAX, done: n >= PROMO_MAX };
};

/* ---------- friends ---------- */
const pair = (x, y) => [Math.min(N(x), N(y)), Math.max(N(x), N(y))];
async function userByLogin(l) {
  l = clean(l, 40).toLowerCase().replace(/^@/, ''); if (!/^[a-z0-9_]{1,40}$/.test(l)) throw err(404, 'not_found');
  const u = (await db()(`SELECT ${UCOLS} FROM users WHERE login_lc = $1`, [l]))[0]; if (!u) throw err(404, 'not_found'); return u;
}
R['GET friends'] = async ctx => {
  const me = await need(ctx), id = N(me.id);
  const rows = await db()(`SELECT f.status, f.req_by, f.created_at, ${CARD('u.')} FROM friends f JOIN users u ON u.id = CASE WHEN f.a = $1 THEN f.b ELSE f.a END WHERE f.a = $1 OR f.b = $1 ORDER BY f.created_at DESC LIMIT 400`, [id]);
  const pick = fn => rows.filter(fn).map(r => ({ ...card(r), since: iso(r.created_at) }));
  return { friends: pick(r => r.status === 'ok'), incoming: pick(r => r.status !== 'ok' && N(r.req_by) !== id), outgoing: pick(r => r.status !== 'ok' && N(r.req_by) === id) };
};
R['POST friends'] = async ctx => {
  const me = await need(ctx), q = db(), op = String(ctx.body.op || ''), t = await userByLogin(ctx.body.login);
  if (N(t.id) === N(me.id)) throw err(400, 'self');
  const [a, b] = pair(me.id, t.id), row = (await q(`SELECT status, req_by FROM friends WHERE a = $1 AND b = $2`, [a, b]))[0];
  const mine = row && N(row.req_by) === N(me.id);
  if (op === 'add') {
    if (row && row.status === 'ok') return { ok: true, rel: 'friends' };
    if (row && !mine) { await q(`UPDATE friends SET status = 'ok', created_at = now() WHERE a = $1 AND b = $2`, [a, b]); await notify(t.id, 'friend_ok', { login: me.login, nick: me.nick }); return { ok: true, rel: 'friends' }; }
    if (row) return { ok: true, rel: 'out' };
    if (privOf(t).friends !== 'all') throw err(403, 'privacy');
    if (isBanned(t)) throw err(404, 'not_found');
    const n = (await q(`SELECT count(*) AS n FROM friends WHERE req_by = $1 AND status = 'pending' AND created_at > now() - interval '1 hour'`, [me.id]))[0];
    if (Number(n.n) >= 30) throw err(429, 'rate');
    await q(`INSERT INTO friends (a, b, status, req_by) VALUES ($1, $2, 'pending', $3) ON CONFLICT DO NOTHING`, [a, b, me.id]);
    await q(`DELETE FROM notifications WHERE user_id = $1 AND kind = 'friend_req' AND data->>'login' = $2`, [t.id, me.login]);
    await notify(t.id, 'friend_req', { login: me.login, nick: me.nick });
    return { ok: true, rel: 'out' };
  }
  if (op === 'accept') {
    if (!row || mine || row.status === 'ok') throw err(404, 'not_found');
    await q(`UPDATE friends SET status = 'ok', created_at = now() WHERE a = $1 AND b = $2`, [a, b]);
    await q(`UPDATE notifications SET read = true WHERE user_id = $1 AND kind = 'friend_req' AND data->>'login' = $2`, [me.id, t.login]);
    await notify(t.id, 'friend_ok', { login: me.login, nick: me.nick });
    return { ok: true, rel: 'friends' };
  }
  if (op === 'decline' || op === 'cancel' || op === 'remove') {
    if (!row) return { ok: true, rel: 'none' };
    if (op === 'decline' && (mine || row.status === 'ok')) throw err(400, 'bad');
    if (op === 'cancel' && (!mine || row.status === 'ok')) throw err(400, 'bad');
    if (op === 'remove' && row.status !== 'ok') throw err(400, 'bad');
    await q(`DELETE FROM friends WHERE a = $1 AND b = $2`, [a, b]);
    if (op === 'cancel') await q(`DELETE FROM notifications WHERE user_id = $1 AND kind = 'friend_req' AND data->>'login' = $2`, [t.id, me.login]);
    if (op === 'decline') await q(`UPDATE notifications SET read = true WHERE user_id = $1 AND kind = 'friend_req' AND data->>'login' = $2`, [me.id, t.login]);
    return { ok: true, rel: 'none' };
  }
  throw err(400, 'bad');
};

/* ---------- chat: global room, groups and DMs (DMs are end-to-end encrypted on the client when both sides have keys) ---------- */
const CHAT_MAX = 2000, GROUP_MAX = 50;
async function chatAccess(me, cid) {
  const r = (await db()(`SELECT c.id, c.kind, c.title, c.owner_id, m.last_read, m.user_id AS mem FROM chats c LEFT JOIN chat_members m ON m.chat_id = c.id AND m.user_id = $2 WHERE c.id = $1`, [N(cid) || 0, me.id]))[0];
  if (!r || (r.kind !== 'global' && r.mem == null)) throw err(404, 'chat_gone');
  return r;
}
const LAST_SQL = `(SELECT row_to_json(l) FROM (SELECT x.id, x.body, x.enc, x.kind, x.deleted, x.created_at, lu.login, lu.nick FROM messages x LEFT JOIN users lu ON lu.id = x.user_id WHERE x.chat_id = c.id AND NOT x.deleted ORDER BY x.id DESC LIMIT 1) l) AS last`;
const UNREAD_SQL = r => `(SELECT count(*) FROM (SELECT 1 FROM messages x WHERE x.chat_id = c.id AND x.id > ${r} AND x.user_id <> $1 AND NOT x.deleted LIMIT 100) s) AS unread`;
function lastOut(l) {
  if (!l) return null;
  return { id: N(l.id), body: l.deleted || l.kind === 'sticker' ? '' : l.enc ? l.body : String(l.body || '').slice(0, 160), enc: !!l.enc, kind: l.kind, deleted: !!l.deleted, at: iso(l.created_at), by: l.login || null, nick: l.nick || null };
}
R['GET chats'] = async ctx => {
  const me = await need(ctx), q = db(), id = N(me.id);
  const g = (await q(`SELECT c.id, c.title, c.last_at, ${UNREAD_SQL('$2')}, ${LAST_SQL} FROM chats c WHERE c.kind = 'global' ORDER BY c.id LIMIT 1`, [id, N(me.global_read) || 0]))[0];
  const rows = await q(`SELECT c.id, c.kind, c.title, c.owner_id, c.last_at, m.pinned_at, ${UNREAD_SQL('m.last_read')}, (SELECT count(*) FROM chat_members y WHERE y.chat_id = c.id) AS members, ${LAST_SQL}
    FROM chat_members m JOIN chats c ON c.id = m.chat_id WHERE m.user_id = $1 ORDER BY m.pinned_at DESC NULLS LAST, c.last_at DESC LIMIT 100`, [id]);
  const dmIds = rows.filter(r => r.kind === 'dm').map(r => N(r.id));
  const peers = dmIds.length ? await q(`SELECT m.chat_id, ${CARD('u.')}, u.e2e_pub FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = ANY($1::bigint[]) AND m.user_id <> $2`, [dmIds, id]) : [];
  const pm = new Map(peers.map(p => [N(p.chat_id), { ...card(p), pub: p.e2e_pub || null }]));
  const out = rows.map(r => ({ id: N(r.id), kind: r.kind, title: r.title, owner: N(r.owner_id) === id, members: N(r.members), unread: N(r.unread), at: iso(r.last_at), last: lastOut(r.last), pinned: !!r.pinned_at, peer: r.kind === 'dm' ? pm.get(N(r.id)) || null : undefined }));
  return { global: g ? { id: N(g.id), kind: 'global', title: g.title, unread: N(g.unread), at: iso(g.last_at), last: lastOut(g.last) } : null, chats: out, me: { pub: me.e2e_pub || null } };
};
R['GET msgs'] = async ctx => {
  const me = await need(ctx), q = db(), c = await chatAccess(me, ctx.q.get('chat')), cid = N(c.id), id = N(me.id);
  const after = N(ctx.q.get('after')) || 0, before = N(ctx.q.get('before')) || 0;
  const SEL = `SELECT x.id, x.body, x.enc, x.kind, x.deleted, x.created_at, x.user_id, x.pinned_at, ${CARD('u.')} FROM messages x LEFT JOIN users u ON u.id = x.user_id WHERE x.chat_id = $1 AND NOT x.deleted`;
  let rows;
  if (after) rows = await q(`${SEL} AND x.id > $2 ORDER BY x.id ASC LIMIT 100`, [cid, after]);
  else if (before) rows = (await q(`${SEL} AND x.id < $2 ORDER BY x.id DESC LIMIT 50`, [cid, before])).reverse();
  else rows = (await q(`${SEL} ORDER BY x.id DESC LIMIT 50`, [cid])).reverse();
  const users = {}, messages = rows.map(r => { if (r.login && !users[r.login]) users[r.login] = card(r); return { id: N(r.id), by: r.login || null, mine: N(r.user_id) === id, body: r.deleted ? '' : r.body, enc: !!r.enc, kind: r.kind, deleted: !!r.deleted, pin: !!r.pinned_at, at: iso(r.created_at) }; });
  const typing = (await q(`SELECT u.login, u.nick FROM typing t JOIN users u ON u.id = t.user_id WHERE t.chat_id = $1 AND t.user_id <> $2 AND t.at > now() - interval '6 seconds' LIMIT 5`, [cid, id])).map(r => ({ login: r.login, nick: r.nick }));
  const since = N(ctx.q.get('since')) || 0;
  const gone = since ? (await q(`SELECT id FROM messages WHERE chat_id = $1 AND deleted AND deleted_at > $2`, [cid, new Date(since - 5000).toISOString()])).map(r => N(r.id)) : [];
  const mx = messages.length ? messages[messages.length - 1].id : 0;
  if (ctx.q.get('seen') && mx && !before) {
    if (c.kind === 'global') await q(`UPDATE users SET global_read = GREATEST(global_read, $2) WHERE id = $1`, [id, mx]);
    else if (mx > (N(c.last_read) || 0)) await q(`UPDATE chat_members SET last_read = GREATEST(last_read, $3) WHERE chat_id = $1 AND user_id = $2`, [cid, id, mx]);
  }
  const pins = (await q(`SELECT x.id, x.body, x.enc, x.kind, x.created_at, u.login, u.nick FROM messages x LEFT JOIN users u ON u.id = x.user_id WHERE x.chat_id = $1 AND x.pinned_at IS NOT NULL AND NOT x.deleted ORDER BY x.pinned_at DESC LIMIT 20`, [cid]))
    .map(r => ({ id: N(r.id), body: r.kind === 'sticker' ? r.body : r.enc ? r.body : String(r.body || '').slice(0, 300), enc: !!r.enc, kind: r.kind, at: iso(r.created_at), by: r.login || null, nick: r.nick || null }));
  const sids = [...new Set([...messages, ...pins].filter(m => m.kind === 'sticker').map(m => N(m.body)).filter(Boolean))];
  const stickers = {}; if (sids.length) for (const r of await q(`SELECT id, v FROM stickers WHERE id = ANY($1::bigint[])`, [sids])) stickers[N(r.id)] = stkUrl(r);
  const out = { messages, users, typing, gone, pins, stickers, now: Date.now(), more: !after && rows.length === 50 };
  if (c.kind === 'dm') { const p = (await q(`SELECT m.last_read, u.id AS uid, ${CARD('u.')}, u.e2e_pub, u.privacy, u.banned_until FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = $1 AND m.user_id <> $2`, [cid, id]))[0]; out.peerRead = p ? N(p.last_read) : 0;
    if (ctx.q.get('full')) { const rel = p ? await relOf(id, p.uid) : 'none'; out.chat = { id: cid, kind: 'dm', peer: p ? { ...card(p), pub: p.e2e_pub || null } : null, canSend: !!p && !isBanned(p) && allowBy(privOf(p).dm, rel), mePub: me.e2e_pub || null, canPin: true }; } }
  else if (ctx.q.get('full')) {
    const mem = c.kind === 'group' ? (await q(`SELECT m.role, ${CARD('u.')} FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = $1 ORDER BY (m.role = 'owner') DESC, m.joined_at LIMIT ${GROUP_MAX}`, [cid])).map(r => ({ ...card(r), owner: r.role === 'owner' })) : undefined;
    out.chat = { id: cid, kind: c.kind, title: c.title, owner: N(c.owner_id) === id, members: mem, canSend: true, staff: isStaff(me), canPin: c.kind === 'group' ? N(c.owner_id) === id || can(me, 'msgdel') : can(me, 'msgdel'), canDelAll: can(me, 'msgdel') };
  }
  return out;
};
function okEnc(s) {
  if (typeof s !== 'string' || s.length > 9000) return false;
  try { const j = JSON.parse(s); return j && j.v === 1 && ['iv', 'ct', 's', 'r'].every(k => typeof j[k] === 'string' && /^[A-Za-z0-9+/]+=*$/.test(j[k])) && j.ct.length <= 8000; } catch (e) { return false; }
}
async function sysMsg(cid, uid, data) { await db()(`INSERT INTO messages (chat_id, user_id, body, kind) VALUES ($1, $2, $3, 'sys')`, [cid, uid, JSON.stringify(data)]); await db()(`UPDATE chats SET last_at = now() WHERE id = $1`, [cid]); }
async function rateMsg(me) {
  const r = (await db()(`SELECT count(*) FILTER (WHERE created_at > now() - interval '10 seconds') AS a, count(*) AS b FROM messages WHERE user_id = $1 AND created_at > now() - interval '1 minute'`, [me.id]))[0];
  if (Number(r.a) >= 8 || Number(r.b) >= 40) throw err(429, 'rate');
}
R['POST msg'] = async ctx => {
  const me = await need(ctx), q = db(), b = ctx.body, c = await chatAccess(me, b.chat), cid = N(c.id);
  const sticker = b.sticker != null, enc = !sticker && !!b.enc && c.kind === 'dm';
  let body, kind = 'text', stk = null;
  if (sticker) { const r = (await q(`SELECT id, v FROM stickers WHERE id = $1`, [N(b.sticker) || 0]))[0]; if (!r) throw err(404, 'sticker_gone'); body = String(N(r.id)); kind = 'sticker'; stk = r; }
  else if (enc) { body = String(b.body || ''); if (!okEnc(body)) throw err(400, 'bad'); }
  else { body = clean(b.body, CHAT_MAX).replace(/\n{4,}/g, '\n\n\n'); if (len(body) > CHAT_MAX) throw err(400, 'too_long'); }
  if (!body) throw err(400, 'text_bad');
  if (c.kind === 'dm') {
    const p = (await q(`SELECT u.id, u.privacy, u.banned_until FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = $1 AND m.user_id <> $2`, [cid, me.id]))[0];
    if (!p || isBanned(p)) throw err(403, 'chat_gone');
    if (!allowBy(privOf(p).dm, await relOf(me.id, p.id))) throw err(403, 'privacy');
  }
  await rateMsg(me);
  const r = (await q(`INSERT INTO messages (chat_id, user_id, body, enc, kind) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`, [cid, me.id, body, enc, kind]))[0], mid = N(r.id);
  await q(`UPDATE chats SET last_at = now() WHERE id = $1`, [cid]);
  await q(`DELETE FROM typing WHERE chat_id = $1 AND user_id = $2`, [cid, me.id]);
  if (c.kind === 'global') await q(`UPDATE users SET global_read = GREATEST(global_read, $2) WHERE id = $1`, [me.id, mid]);
  else await q(`UPDATE chat_members SET last_read = GREATEST(last_read, $3) WHERE chat_id = $1 AND user_id = $2`, [cid, me.id, mid]);
  if (c.kind !== 'dm' && kind === 'text') await flagChat(me, body, mid);
  return { message: { id: mid, by: me.login, mine: true, body, enc, kind, deleted: false, pin: false, at: iso(r.created_at) }, user: card(me), stickers: stk ? { [N(stk.id)]: stkUrl(stk) } : {} };
};
R['POST typing'] = async ctx => {
  const me = await need(ctx), c = await chatAccess(me, ctx.body.chat);
  await db()(`INSERT INTO typing (chat_id, user_id, at) VALUES ($1, $2, now()) ON CONFLICT (chat_id, user_id) DO UPDATE SET at = now()`, [c.id, me.id]);
  if (Math.random() < .05) await db()(`DELETE FROM typing WHERE at < now() - interval '1 hour'`);
  return { ok: true };
};
async function canAddToGroup(me, t) { if (isBanned(t)) return false; const p = privOf(t).groups; return p === 'all' || (p === 'friends' && await relOf(me.id, t.id) === 'friends'); }
R['POST chat'] = async ctx => {
  const me = await need(ctx), q = db(), b = ctx.body, op = String(b.op || '');
  if (op === 'dm') {
    const t = await userByLogin(b.login); if (N(t.id) === N(me.id)) throw err(400, 'self');
    const [a, z] = pair(me.id, t.id), key = `dm:${a}:${z}`;
    let c = (await q(`SELECT id FROM chats WHERE dm_key = $1`, [key]))[0];
    if (!c) {
      if (isBanned(t)) throw err(404, 'not_found');
      if (!allowBy(privOf(t).dm, await relOf(me.id, t.id))) throw err(403, 'privacy');
      c = (await q(`INSERT INTO chats (kind, dm_key) VALUES ('dm', $1) ON CONFLICT (dm_key) DO UPDATE SET dm_key = EXCLUDED.dm_key RETURNING id`, [key]))[0];
    }
    await q(`INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING`, [c.id, me.id, t.id]);
    return { ok: true, id: N(c.id) };
  }
  if (op === 'group') {
    const title = clean(b.title, 48); if (!title || len(title) > 48) throw err(400, 'title_bad');
    const n = (await q(`SELECT count(*) AS n FROM chats WHERE owner_id = $1 AND kind = 'group' AND created_at > now() - interval '1 hour'`, [me.id]))[0];
    if (Number(n.n) >= 5) throw err(429, 'rate');
    const c = (await q(`INSERT INTO chats (kind, title, owner_id) VALUES ('group', $1, $2) RETURNING id`, [title, me.id]))[0];
    await q(`INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'owner')`, [c.id, me.id]);
    await sysMsg(c.id, me.id, { t: 'create', n: title });
    const skipped = [];
    for (const l of arr(b.logins).slice(0, GROUP_MAX - 1)) {
      let t; try { t = await userByLogin(l); } catch (e) { skipped.push(String(l)); continue; }
      if (N(t.id) === N(me.id)) continue;
      if (!(await canAddToGroup(me, t))) { skipped.push(t.login); continue; }
      await q(`INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [c.id, t.id]);
    }
    await autoFlag(me, 'nick', title).catch(() => { });
    return { ok: true, id: N(c.id), skipped };
  }
  if (op === 'del_msg') {
    const m = (await q(`SELECT x.id, x.user_id, x.chat_id, x.body, x.deleted, x.kind AS mkind, c.kind, u.login FROM messages x JOIN chats c ON c.id = x.chat_id LEFT JOIN users u ON u.id = x.user_id WHERE x.id = $1`, [N(b.id) || 0]))[0];
    if (!m || m.deleted) throw err(404, 'not_found');
    if (m.mkind === 'sys') throw err(400, 'bad');
    const own = N(m.user_id) === N(me.id), staffDel = !own && can(me, 'msgdel') && m.kind !== 'dm';
    if (!own && !staffDel) throw err(403, 'forbidden');
    if (own) await chatAccess(me, m.chat_id);
    /* the text stays in the database for the staff chat logs (except private chats); users never get it again */
    await q(`UPDATE messages SET deleted = true, deleted_at = now(), del_by = $2, pinned_at = NULL, body = CASE WHEN $3::boolean THEN '' ELSE body END WHERE id = $1`, [m.id, me.id, m.kind === 'dm']);
    if (staffDel) { await modLog(me, { id: m.user_id }, 'del_msg', { text: m.kind === 'dm' ? '' : String(m.body).slice(0, 200) }); await q(`UPDATE flags SET status = 'resolved', resolved_by = $2, resolved_at = now() WHERE ref = $1 AND status = 'open'`, [m.id, me.id]); }
    return { ok: true };
  }
  if (op === 'pin_msg') {
    const m = (await q(`SELECT x.id, x.chat_id, x.kind, x.deleted, x.pinned_at FROM messages x WHERE x.id = $1`, [N(b.id) || 0]))[0];
    if (!m || m.deleted || m.kind === 'sys') throw err(404, 'not_found');
    const c = await chatAccess(me, m.chat_id);
    const ok = c.kind === 'dm' || (c.kind === 'group' && N(c.owner_id) === N(me.id)) || can(me, 'msgdel');
    if (!ok) throw err(403, 'forbidden');
    const on = !!b.on;
    if (on && !m.pinned_at) { const n = (await q(`SELECT count(*) AS n FROM messages WHERE chat_id = $1 AND pinned_at IS NOT NULL AND NOT deleted`, [m.chat_id]))[0]; if (Number(n.n) >= 20) throw err(400, 'pin_full'); }
    await q(`UPDATE messages SET pinned_at = CASE WHEN $2::boolean THEN COALESCE(pinned_at, now()) ELSE NULL END WHERE id = $1`, [m.id, on]);
    if (on && !m.pinned_at && c.kind !== 'dm') await sysMsg(m.chat_id, me.id, { t: 'pin', m: N(m.id) });
    return { ok: true, pin: on };
  }
  if (op === 'pin_chat') {
    const c = await chatAccess(me, b.chat); if (c.kind === 'global') throw err(400, 'bad');
    const on = !!b.on;
    if (on) { const n = (await q(`SELECT count(*) AS n FROM chat_members WHERE user_id = $1 AND pinned_at IS NOT NULL`, [me.id]))[0]; if (Number(n.n) >= 10) throw err(400, 'pin_full'); }
    await q(`UPDATE chat_members SET pinned_at = CASE WHEN $3::boolean THEN COALESCE(pinned_at, now()) ELSE NULL END WHERE chat_id = $1 AND user_id = $2`, [c.id, me.id, on]);
    return { ok: true, pinned: on };
  }
  const c = await chatAccess(me, b.chat), cid = N(c.id);
  if (c.kind !== 'group') throw err(400, 'bad');
  const owner = N(c.owner_id) === N(me.id);
  if (op === 'add') {
    if (!owner) throw err(403, 'forbidden');
    const t = await userByLogin(b.login);
    if ((await q(`SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`, [cid, t.id])).length) return { ok: true };
    const n = (await q(`SELECT count(*) AS n FROM chat_members WHERE chat_id = $1`, [cid]))[0]; if (Number(n.n) >= GROUP_MAX) throw err(400, 'group_full');
    if (!(await canAddToGroup(me, t))) throw err(403, 'privacy');
    await q(`INSERT INTO chat_members (chat_id, user_id, last_read) VALUES ($1, $2, COALESCE((SELECT max(id) FROM messages WHERE chat_id = $1), 0)) ON CONFLICT DO NOTHING`, [cid, t.id]);
    await sysMsg(cid, me.id, { t: 'add', l: t.login }); return { ok: true };
  }
  if (op === 'kick') {
    if (!owner) throw err(403, 'forbidden');
    const t = await userByLogin(b.login); if (N(t.id) === N(me.id)) throw err(400, 'self');
    const r = await q(`DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2 RETURNING user_id`, [cid, t.id]);
    if (r.length) await sysMsg(cid, me.id, { t: 'kick', l: t.login }); return { ok: true };
  }
  if (op === 'rename') {
    if (!owner) throw err(403, 'forbidden');
    const title = clean(b.title, 48); if (!title || len(title) > 48) throw err(400, 'title_bad');
    await q(`UPDATE chats SET title = $2 WHERE id = $1`, [cid, title]); await sysMsg(cid, me.id, { t: 'rename', n: title }); return { ok: true };
  }
  if (op === 'leave') {
    await q(`DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2`, [cid, me.id]);
    const nx = (await q(`SELECT user_id FROM chat_members WHERE chat_id = $1 ORDER BY joined_at LIMIT 1`, [cid]))[0];
    if (!nx) { await q(`DELETE FROM chats WHERE id = $1`, [cid]); return { ok: true }; }
    if (owner) { await q(`UPDATE chats SET owner_id = $2 WHERE id = $1`, [cid, nx.user_id]); await q(`UPDATE chat_members SET role = 'owner' WHERE chat_id = $1 AND user_id = $2`, [cid, nx.user_id]); }
    await sysMsg(cid, me.id, { t: 'leave' }); return { ok: true };
  }
  throw err(400, 'bad');
};

/* ---------- stickers: PNG images uploaded by staff, usable by everyone in chats ---------- */
const STK_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/, STK_MAX = 300;
const stkUrl = r => `/api/app?r=img&k=s&id=${N(r.id)}&v=${r.v}`;
R['GET stickers'] = async ctx => {
  const me = await need(ctx);
  const rows = await db()(`SELECT id, name, v FROM stickers ORDER BY id LIMIT ${STK_MAX}`);
  return { stickers: rows.map(r => ({ id: N(r.id), name: r.name, url: stkUrl(r) })), canManage: can(me, 'stickers') };
};
R['POST stickers'] = async ctx => {
  const me = await need(ctx); needPerm(me, 'stickers'); await needPin(ctx, me);
  const b = ctx.body, q = db(), op = String(b.op || '');
  if (op === 'add') {
    const name = clean(b.name, 32), data = String(b.data || '');
    if (len(name) > 32) throw err(400, 'text_bad');
    if (!STK_RE.test(data) || data.length > 420000) throw err(400, 'sticker_bad');
    const n = (await q(`SELECT count(*) AS n FROM stickers`))[0]; if (Number(n.n) >= STK_MAX) throw err(400, 'sticker_full');
    const r = (await q(`INSERT INTO stickers (name, data, v, by_id) VALUES ($1, $2, $3, $4) RETURNING id, name, v`, [name, data, ver(data), me.id]))[0];
    await modLog(me, null, 'sticker_add', { name, id: N(r.id) });
    return { ok: true, sticker: { id: N(r.id), name: r.name, url: stkUrl(r) } };
  }
  if (op === 'rename') { const name = clean(b.name, 32); if (len(name) > 32) throw err(400, 'text_bad'); await q(`UPDATE stickers SET name = $2 WHERE id = $1`, [N(b.id) || 0, name]); return { ok: true }; }
  if (op === 'del') { const r = await q(`DELETE FROM stickers WHERE id = $1 RETURNING name`, [N(b.id) || 0]); if (r.length) await modLog(me, null, 'sticker_del', { name: r[0].name, id: N(b.id) }); return { ok: true }; }
  throw err(400, 'bad');
};

/* ---------- staff chat logs: the global room and groups, deleted messages included (private chats are not shown) ---------- */
R['GET chatlog'] = async ctx => {
  const me = await need(ctx); if (!isStaff(me)) throw err(403, 'forbidden'); needPerm(me, 'chatlogs'); await needPin(ctx, me);
  const q = db(), cid = N(ctx.q.get('chat')) || 0;
  if (!cid) {
    const rows = await q(`SELECT c.id, c.kind, c.title, c.last_at, (SELECT count(*) FROM chat_members m WHERE m.chat_id = c.id) AS members, (SELECT count(*) FROM messages x WHERE x.chat_id = c.id AND x.deleted) AS del,
      (SELECT count(*) FROM messages x WHERE x.chat_id = c.id) AS total FROM chats c WHERE c.kind IN ('global', 'group') ORDER BY (c.kind = 'global') DESC, c.last_at DESC LIMIT 200`);
    return { chats: rows.map(r => ({ id: N(r.id), kind: r.kind, title: r.title, at: iso(r.last_at), members: N(r.members), deleted: N(r.del), total: N(r.total) })) };
  }
  const c = (await q(`SELECT id, kind, title FROM chats WHERE id = $1`, [cid]))[0]; if (!c || c.kind === 'dm') throw err(404, 'chat_gone');
  const before = N(ctx.q.get('before')) || 0, onlyDel = ctx.q.get('del') === '1', who = clean(ctx.q.get('user'), 40).toLowerCase().replace(/^@/, '');
  const rows = await q(`SELECT x.id, x.body, x.kind, x.deleted, x.deleted_at, x.created_at, x.pinned_at, ${CARD('u.')}, d.login AS del_login FROM messages x LEFT JOIN users u ON u.id = x.user_id LEFT JOIN users d ON d.id = x.del_by
    WHERE x.chat_id = $1 AND ($2::bigint = 0 OR x.id < $2) AND (NOT $3::boolean OR x.deleted) AND ($4::text = '' OR u.login_lc = $4) ORDER BY x.id DESC LIMIT 100`, [cid, before, onlyDel, who]);
  return { chat: { id: N(c.id), kind: c.kind, title: c.title }, more: rows.length === 100,
    messages: rows.map(r => ({ id: N(r.id), body: r.body, kind: r.kind, deleted: !!r.deleted, deletedAt: iso(r.deleted_at), delBy: r.del_login || null, pin: !!r.pinned_at, at: iso(r.created_at), user: r.login ? card(r) : null })) };
};

/* ---------- profile music: uploaded in parts (each request stays far below the 4.5 MB limit), played back with HTTP Range ---------- */
const MUS_MAX = 6 * 1024 * 1024, MUS_PART = 2 * 1024 * 1024, MUS_SERVE = 3 * 1024 * 1024;
const MUS_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'];
const B64_RE = /^[A-Za-z0-9+/]+=*$/;
function musMagic(buf, mime) {
  const h = buf.slice(0, 12), a = h.toString('latin1');
  if (/mpeg/.test(mime)) return a.startsWith('ID3') || (h[0] === 0xff && (h[1] & 0xe0) === 0xe0);
  if (/mp4|m4a/.test(mime)) return a.slice(4, 8) === 'ftyp';
  if (/aac/.test(mime)) return (h[0] === 0xff && (h[1] & 0xf0) === 0xf0) || a.startsWith('ID3');
  if (/flac/.test(mime)) return a.startsWith('fLaC') || a.startsWith('ID3');
  if (/ogg/.test(mime)) return a.startsWith('OggS');
  if (/wav/.test(mime)) return a.startsWith('RIFF') && a.slice(8, 12) === 'WAVE';
  if (/webm/.test(mime)) return h[0] === 0x1a && h[1] === 0x45 && h[2] === 0xdf && h[3] === 0xa3;
  return false;
}
R['POST music'] = async ctx => {
  const me = await need(ctx), b = ctx.body, q = db(), op = String(b.op || ''), pend = obj(me.music_pending);
  if (op === 'begin') {
    const size = N(b.size), mime = String(b.mime || '').toLowerCase(), m = obj(b.meta);
    if (!MUS_TYPES.includes(mime)) throw err(400, 'music_bad');
    if (!(size >= 1000 && size <= MUS_MAX && Number.isInteger(size))) throw err(413, 'music_big');
    let cover = null;
    if (b.cover) { cover = String(b.cover); if (!/^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(cover) || cover.length > 160000) throw err(400, 'cover_bad'); }
    if (pend.at && Date.now() - N(pend.at) < 10000) throw err(429, 'rate');
    const v = crypto.randomBytes(6).toString('hex');
    const meta = { t: clean(m.title, 120).slice(0, 120), a: clean(m.artist, 120).slice(0, 120), al: clean(m.album, 120).slice(0, 120), d: num(m.dur) != null ? Math.max(0, Math.min(36000, Math.round(m.dur))) : null, mime, size, c: !!cover };
    await q(`DELETE FROM music_parts WHERE user_id = $1 AND ver <> COALESCE($2, '')`, [me.id, me.music_v]);
    await q(`UPDATE users SET music_pending = $2::jsonb WHERE id = $1`, [me.id, JSON.stringify({ v, meta, cover, at: Date.now() })]);
    return { ver: v, part: MUS_PART, parts: Math.ceil(size / MUS_PART) };
  }
  if (op === 'part') {
    if (!pend.v || pend.v !== b.ver || Date.now() - N(pend.at) > 3600e3) throw err(409, 'music_expired');
    const size = N(pend.meta.size), parts = Math.ceil(size / MUS_PART), idx = N(b.idx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= parts) throw err(400, 'bad');
    const data = String(b.data || ''); if (!B64_RE.test(data)) throw err(400, 'bad');
    const raw = Buffer.from(data, 'base64'), want = idx < parts - 1 ? MUS_PART : size - MUS_PART * (parts - 1);
    if (raw.length !== want) throw err(400, 'music_part');
    await q(`INSERT INTO music_parts (user_id, ver, idx, b64) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, ver, idx) DO UPDATE SET b64 = EXCLUDED.b64`, [me.id, pend.v, idx, data]);
    return { ok: true };
  }
  if (op === 'done') {
    if (!pend.v || pend.v !== b.ver) throw err(409, 'music_expired');
    const size = N(pend.meta.size), parts = Math.ceil(size / MUS_PART);
    const have = (await q(`SELECT idx FROM music_parts WHERE user_id = $1 AND ver = $2`, [me.id, pend.v])).map(r => N(r.idx));
    if (have.length !== parts) throw err(409, 'music_part');
    const first = (await q(`SELECT substr(b64, 1, 64) AS h FROM music_parts WHERE user_id = $1 AND ver = $2 AND idx = 0`, [me.id, pend.v]))[0];
    if (!first || !musMagic(Buffer.from(first.h, 'base64'), pend.meta.mime)) { await q(`DELETE FROM music_parts WHERE user_id = $1 AND ver = $2`, [me.id, pend.v]); await q(`UPDATE users SET music_pending = NULL WHERE id = $1`, [me.id]); throw err(400, 'music_bad'); }
    const r = (await q(`UPDATE users SET music_v = $2, music_meta = $3::jsonb, music_cover = $4, music_pending = NULL WHERE id = $1 RETURNING ${UCOLS}`, [me.id, pend.v, JSON.stringify(pend.meta), pend.cover || null]))[0];
    await q(`DELETE FROM music_parts WHERE user_id = $1 AND ver <> $2`, [me.id, pend.v]);
    return { ok: true, user: self(r) };
  }
  if (op === 'meta') {
    if (!me.music_v) throw err(404, 'not_found');
    const m = { ...obj(me.music_meta), t: clean(b.title, 120).slice(0, 120), a: clean(b.artist, 120).slice(0, 120) };
    const r = (await q(`UPDATE users SET music_meta = $2::jsonb WHERE id = $1 RETURNING ${UCOLS}`, [me.id, JSON.stringify(m)]))[0];
    return { ok: true, user: self(r) };
  }
  if (op === 'delete') {
    const r = (await q(`UPDATE users SET music_v = NULL, music_meta = NULL, music_cover = NULL, music_pending = NULL WHERE id = $1 RETURNING ${UCOLS}`, [me.id]))[0];
    await q(`DELETE FROM music_parts WHERE user_id = $1`, [me.id]);
    return { ok: true, user: self(r) };
  }
  throw err(400, 'bad');
};
async function musicRaw(ctx, l) {
  const q = db(), u = (await q(`SELECT id, music_v, music_meta FROM users WHERE login_lc = $1`, [l]))[0];
  if (!u || !u.music_v) throw err(404, 'not_found');
  const m = obj(u.music_meta), size = N(m.size), v = ctx.q.get('v'), fresh = v === u.music_v;
  const cache = fresh ? 'private, max-age=31536000, immutable' : 'private, max-age=60';
  const pq = ctx.q.get('p');
  if (pq != null) {
    /* fallback: one whole part per URL, safe for any CDN */
    const idx = N(pq); const r = (await q(`SELECT b64 FROM music_parts WHERE user_id = $1 AND ver = $2 AND idx = $3`, [u.id, u.music_v, Number.isInteger(idx) ? idx : -1]))[0];
    if (!r) throw err(404, 'not_found');
    return { raw: { type: 'application/octet-stream', buf: Buffer.from(r.b64, 'base64'), cache: fresh ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=60' } };
  }
  let start = 0, end = size - 1, partial = false;
  const rg = /^bytes=(\d*)-(\d*)$/.exec(String(ctx.req.headers.range || '').trim());
  if (rg && (rg[1] || rg[2])) {
    partial = true;
    if (rg[1]) { start = N(rg[1]); end = rg[2] ? Math.min(N(rg[2]), size - 1) : size - 1; } else { start = Math.max(0, size - N(rg[2])); }
    if (start >= size || start > end) return { raw: { status: 416, type: m.mime || 'audio/mpeg', buf: Buffer.alloc(0), cache: 'no-store', headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } } };
  }
  if (end - start + 1 > MUS_SERVE) { end = start + MUS_SERVE - 1; partial = true; }
  const i0 = Math.floor(start / MUS_PART), i1 = Math.floor(end / MUS_PART);
  const rows = await q(`SELECT idx, b64 FROM music_parts WHERE user_id = $1 AND ver = $2 AND idx BETWEEN $3 AND $4 ORDER BY idx`, [u.id, u.music_v, i0, i1]);
  if (rows.length !== i1 - i0 + 1) throw err(404, 'not_found');
  const buf = Buffer.concat(rows.map(r => Buffer.from(r.b64, 'base64'))).subarray(start - i0 * MUS_PART, end - i0 * MUS_PART + 1);
  return { raw: { status: partial ? 206 : 200, type: m.mime || 'audio/mpeg', buf, cache, headers: { 'Accept-Ranges': 'bytes', ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) } } };
}

/* ---------- entry ---------- */
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) { if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch (e) { throw err(400, 'bad_json'); } } if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8') || '{}'); } catch (e) { throw err(400, 'bad_json'); } } return req.body; }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 3300000) throw err(413, 'too_big'); chunks.push(c); }
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
    if (out && out.raw) {
      res.statusCode = out.raw.status || 200; res.setHeader('Content-Type', out.raw.type); res.setHeader('Cache-Control', out.raw.cache); res.setHeader('X-Content-Type-Options', 'nosniff');
      for (const [hk, hv] of Object.entries(out.raw.headers || {})) res.setHeader(hk, hv);
      res.setHeader('Content-Security-Policy', "default-src 'none'"); res.setHeader('Content-Length', out.raw.buf.length); return res.end(out.raw.buf);
    }
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

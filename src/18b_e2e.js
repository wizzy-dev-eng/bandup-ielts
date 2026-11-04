/* ---------- end-to-end encryption for direct messages ----------
   ECDH P-256 key pair per account. The private key leaves the browser only wrapped with a key derived from the password
   (PBKDF2-SHA-256, 310 000 rounds → AES-GCM), so the server never sees it. On this device it is kept in IndexedDB as a
   non-extractable CryptoKey. Each pair of users gets an AES-GCM key from ECDH + HKDF. */
const E2E = (() => {
  const sub = window.crypto && crypto.subtle, ok = !!sub && window.isSecureContext !== false && typeof TextEncoder !== 'undefined';
  const ITER = 310000, te = new TextEncoder(), td = new TextDecoder(), CURVE = { name: 'ECDH', namedCurve: 'P-256' };
  const b64 = buf => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  let mem = null, busy = null;
  const derived = new Map();
  const kOf = l => String(l || '').toLowerCase();
  function idb() { return new Promise((res, rej) => { if (!window.indexedDB) return rej(new Error('no_idb')); const r = indexedDB.open('lynx-e2e', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbDo(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('keys', mode), r = fn(tx.objectStore('keys')); tx.oncomplete = () => { db.close(); res(r && r.result); }; tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); }; }); }
  const idbGet = k => idbDo('readonly', s => s.get(k)).catch(() => null);
  const idbPut = (k, v) => idbDo('readwrite', s => s.put(v, k)).catch(() => null);
  const idbDel = k => idbDo('readwrite', s => s.delete(k)).catch(() => null);
  async function pwKey(pw, salt, n) { const base = await sub.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']); return sub.deriveKey({ name: 'PBKDF2', salt, iterations: n, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
  async function wrapPriv(pkcs8, pw) { const s = crypto.getRandomValues(new Uint8Array(16)), i = crypto.getRandomValues(new Uint8Array(12)), k = await pwKey(pw, s, ITER); const c = await sub.encrypt({ name: 'AES-GCM', iv: i }, k, pkcs8); return JSON.stringify({ v: 1, s: b64(s), i: b64(i), c: b64(c), n: ITER }); }
  async function unwrapRaw(wrap, pw) { const w = JSON.parse(wrap), k = await pwKey(pw, unb64(w.s), w.n); return sub.decrypt({ name: 'AES-GCM', iv: unb64(w.i) }, k, unb64(w.c)); }
  async function generate() { const kp = await sub.generateKey(CURVE, true, ['deriveBits']); return { pkcs8: await sub.exportKey('pkcs8', kp.privateKey), pub: b64(await sub.exportKey('raw', kp.publicKey)) }; }
  async function remember(login, pkcs8, pub) {
    const priv = await sub.importKey('pkcs8', pkcs8, CURVE, false, ['deriveBits']);
    mem = { login: kOf(login), priv, pub }; derived.clear(); await idbPut(kOf(login), { priv, pub }); emit('e2e', mem.pub); return mem;
  }
  async function local(login) {
    login = kOf(login || (Auth.user && Auth.user.login)); if (!ok || !login) return null;
    if (busy) await busy.catch(() => { });
    if (mem && mem.login === login) return mem;
    const r = await idbGet(login); if (r && r.priv && r.pub) { mem = { login, priv: r.priv, pub: r.pub }; derived.clear(); return mem; }
    return null;
  }
  /* after login or sign-up (the password is at hand): unwrap the stored copy or create a new pair */
  function setup(login, pw) {
    if (!ok || !pw) return Promise.resolve(null);
    busy = (async () => {
      const k = await api('keys');
      if (k.pub && k.wrap) { try { return await remember(login, await unwrapRaw(k.wrap, pw), k.pub); } catch (e) { /* wrapped with another password: make a new pair */ } }
      const g = await generate(), wrap = await wrapPriv(g.pkcs8, pw);
      try { await api('keys', { method: 'PUT', body: { pub: g.pub, wrap, password: pw, replace: !!k.pub } }); }
      catch (e) { if (e.code === 'key_exists' && e.data && e.data.wrap) return remember(login, await unwrapRaw(e.data.wrap, pw), e.data.pub); throw e; }
      return remember(login, g.pkcs8, g.pub);
    })();
    const p = busy; p.catch(e => console.warn('e2e', e)).finally(() => { if (busy === p) busy = null; });
    return p.catch(() => null);
  }
  /* unlock on a device that has no local copy; a wrong password throws { code: 'pw_wrong' } */
  async function unlock(login, pw) {
    const k = await api('keys');
    if (!k.pub || !k.wrap) { const m = await setup(login, pw); if (!m) { const e = new Error('pw_wrong'); e.code = 'pw_wrong'; throw e; } return m; }
    let raw; try { raw = await unwrapRaw(k.wrap, pw); } catch (e) { const er = new Error('pw_wrong'); er.code = 'pw_wrong'; throw er; }
    return remember(login, raw, k.pub);
  }
  async function rewrap(oldPw, newPw) { if (!ok) return null; try { const k = await api('keys'); if (!k.wrap) return null; return await wrapPriv(await unwrapRaw(k.wrap, oldPw), newPw); } catch (e) { return null; } }
  async function forget(login) { const l = kOf(login); if (mem && mem.login === l) mem = null; derived.clear(); await idbDel(l); }
  function shared(peer) {
    const ck = mem.pub + '|' + peer; if (derived.has(ck)) return derived.get(ck);
    const p = (async () => {
      const pk = await sub.importKey('raw', unb64(peer), CURVE, false, []);
      const bits = await sub.deriveBits({ name: 'ECDH', public: pk }, mem.priv, 256), hk = await sub.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
      return sub.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: te.encode('lynx.dm'), info: te.encode('lynx dm v1') }, hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    })();
    derived.set(ck, p); p.catch(() => derived.delete(ck)); return p;
  }
  async function seal(text, peer) {
    if (!mem) throw new Error('locked');
    const k = await shared(peer), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await sub.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(mem.pub + '>' + peer) }, k, te.encode(text));
    return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct), s: mem.pub, r: peer });
  }
  async function open(body) {
    if (!mem) throw new Error('locked');
    const j = JSON.parse(body), other = j.s === mem.pub ? j.r : j.r === mem.pub ? j.s : null;
    if (!other) throw new Error('other_key');
    const pt = await sub.decrypt({ name: 'AES-GCM', iv: unb64(j.iv), additionalData: te.encode(j.s + '>' + j.r) }, await shared(other), unb64(j.ct));
    return td.decode(pt);
  }
  return { ok, setup, unlock, rewrap, forget, local, seal, open, get pub() { return mem && mem.pub; }, get busy() { return busy; } };
})();

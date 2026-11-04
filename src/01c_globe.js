/* ---------- procedural globe: crisp at any resolution, animated on every page ---------- */
const Globe = (() => {
  let cv, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0, spin = 0, pts = null, rings = null, body = null, bodyKey = '';
  let mode = 'hero', heroEl = null, cur = null, from = null, tr = 1, trStart = 0, dirty = true;
  const TILT = 0.66, FPS = 40;
  function build() {
    pts = []; rings = [];
    for (let la = -78; la <= 82; la += 5) {
      const phi = la * Math.PI / 180, c = Math.cos(phi), n = Math.max(8, Math.round(c * 96));
      for (let i = 0; i < n; i++) pts.push([phi, (i / n) * Math.PI * 2 + (la % 10 ? Math.PI / n : 0), 0.55 + 0.45 * Math.abs(Math.sin(i * 12.9898 + la) * 43758.5453 % 1)]);
      if ((la + 78) % 15 === 0) { const m = Math.round(c * 300); for (let i = 0; i < m; i++) rings.push([phi, (i / m) * Math.PI * 2]); }
    }
  }
  const geomFromPlate = (left, top, w) => ({ cx: left + w * .4985, cy: top + w * .6074, r: w * .4148 });
  function backdropGeom() {
    const vw = innerWidth, vh = innerHeight;
    const w = vw / vh <= 1 ? vw * 2.4 : Math.max(vw, vh * 1.7768);
    const fade = 1 - .38 * Math.min(1, scrollY / 760);
    return { ...geomFromPlate((vw - w) / 2, vh - w * 941 / 1672, w), a: (curTheme() === 'light' ? .44 : .42) * fade, mask: 1 };
  }
  function target() {
    if (mode === 'hero' && heroEl && heroEl.isConnected) {
      /* the globe stays where the hero put it and melts into the page backdrop while the hero scrolls away */
      const p = heroEl.getBoundingClientRect(), y = Math.max(0, scrollY), hero = heroEl.closest('.hero'), hh = (hero && hero.offsetHeight) || innerHeight;
      const x = Math.min(1, y / (hh * .9)), e = x * x * (3 - 2 * x), g0 = geomFromPlate(p.left, p.top + y, p.width);
      if (hero && hero.__ge !== e) { hero.__ge = e; hero.style.setProperty('--ge', e.toFixed(3)); }
      if (e <= 0) return { ...g0, a: 1, mask: 0 };
      const bk = backdropGeom();
      return { cx: lerp(g0.cx, bk.cx, e), cy: lerp(g0.cy, bk.cy, e), r: lerp(g0.r, bk.r, e), a: lerp(1, bk.a, e), mask: e };
    }
    return backdropGeom();
  }
  function bodyLayer(r) {
    const light = curTheme() === 'light', key = Math.round(r) + (light ? 'L' : 'D');
    if (body && bodyKey === key) return body;
    const pad = r * .34, S = Math.ceil((r + pad) * 2 * dpr), c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), o = S / 2, R = r * dpr;
    // halo
    let hg = g.createRadialGradient(o, o, R * .9, o, o, R + pad * dpr);
    hg.addColorStop(0, light ? 'rgba(190,120,255,.42)' : 'rgba(150,70,220,.42)'); hg.addColorStop(.35, light ? 'rgba(240,150,220,.16)' : 'rgba(120,50,190,.16)'); hg.addColorStop(1, light ? 'rgba(240,150,220,0)' : 'rgba(120,50,190,0)');
    g.fillStyle = hg; g.fillRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(o, o, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = light ? '#fbfaff' : '#050509'; g.fillRect(0, 0, S, S);
    // rim colours around the edge
    const cg = g.createConicGradient ? g.createConicGradient(-Math.PI / 2, o, o) : null;
    const stops = light
      ? [[0, '#7c8cff'], [.1, '#5b6bff'], [.22, '#d65cff'], [.33, '#ff6fd0'], [.5, '#ffb0e6'], [.67, '#ff8fd8'], [.8, '#ff5c8a'], [.9, '#ff6b6b'], [1, '#7c8cff']]
      : [[0, '#3a3cff'], [.1, '#2a2cf0'], [.22, '#c021d8'], [.33, '#ff2fc4'], [.5, '#ff7fe0'], [.67, '#f05bd0'], [.8, '#e0203f'], [.9, '#ff2040'], [1, '#3a3cff']];
    if (cg) { stops.forEach(([p, c2]) => cg.addColorStop(p, c2)); g.fillStyle = cg; g.fillRect(0, 0, S, S); }
    // darken / lighten the core so colour stays on the rim
    const core = light ? '251,250,255' : '5,5,9';
    const rg = g.createRadialGradient(o, o + R * .12, 0, o, o + R * .12, R * 1.04);
    rg.addColorStop(0, `rgba(${core},1)`); rg.addColorStop(.6, `rgba(${core},.97)`); rg.addColorStop(.8, `rgba(${core},.72)`); rg.addColorStop(.93, `rgba(${core},.25)`); rg.addColorStop(1, `rgba(${core},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    // soft inner clouds
    g.globalCompositeOperation = light ? 'multiply' : 'screen';
    [[-.55, -.36, .3, light ? 'rgba(255,170,230,.55)' : 'rgba(255,120,220,.38)'], [.62, .2, .34, light ? 'rgba(255,150,225,.5)' : 'rgba(255,60,200,.34)'], [.15, -.72, .3, light ? 'rgba(150,150,255,.4)' : 'rgba(70,60,255,.3)'], [-.72, .5, .3, light ? 'rgba(255,180,235,.5)' : 'rgba(255,140,230,.36)']]
      .forEach(([x, y, s, col]) => { const b = g.createRadialGradient(o + x * R, o + y * R, 0, o + x * R, o + y * R, s * R); b.addColorStop(0, col); b.addColorStop(1, col.replace(/,[\d.]+\)$/, ',0)')); g.fillStyle = b; g.fillRect(0, 0, S, S); });
    g.restore(); g.globalCompositeOperation = 'source-over';
    // fine rim line
    g.lineWidth = Math.max(1, dpr * .8); g.strokeStyle = light ? 'rgba(170,110,255,.35)' : 'rgba(255,200,255,.22)'; g.beginPath(); g.arc(o, o, R - .5, 0, Math.PI * 2); g.stroke();
    body = c; bodyKey = key; return c;
  }
  // [from, to, node positions along the line, spark period in s]; plate units, the outer end sits beyond the screen edge
  const SEGS = [
    [[-.08, .84], [.46, -.1], [.2, .42], 13], [[-.08, .13], [.25, .52], [.26, .62], 9], [[-.08, .47], [.2, .25], [.46], 11], [[.015, -.08], [.12, .36], [.55], 15],
    [[1.08, -.08], [.83, .86], [.3, .66], 12], [[1.08, .6], [.86, 1.04], [.38], 10], [[.69, -.09], [1.08, .31], [.42], 14], [[1.08, .4], [.93, .5], [.5], 8]
  ];
  function lines(gm, now) {
    const w = gm.r / .4148, left = gm.cx - w * .4985, top = gm.cy - w * .6074, h = w * 941 / 1672, light = curTheme() === 'light';
    const P = (x, y) => [(left + x * w) * dpr, (top + y * h) * dpr], col = light ? '60,40,120' : '232,222,255', A = light ? .24 : .32;
    ctx.lineWidth = dpr * .85; ctx.lineCap = 'round';
    SEGS.forEach(([a, b, nodes, per], i) => {
      const p = P(...a), q = P(...b), g = ctx.createLinearGradient(p[0], p[1], q[0], q[1]);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(.24, `rgba(${col},${A})`); g.addColorStop(.8, `rgba(${col},${A})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      ctx.fillStyle = light ? 'rgba(60,40,120,.5)' : 'rgba(255,255,255,.85)';
      ctx.beginPath(); nodes.forEach(t => { const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t; ctx.moveTo(x + 2.1 * dpr, y); ctx.arc(x, y, 2.1 * dpr, 0, 6.2832); }); ctx.fill();
      if (now == null) return;
      const t = ((now / 1000 / per) + i * .37) % 1, k = Math.sin(Math.PI * Math.min(1, t / .9)) ** 2; if (t > .9) return;
      const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, r = 9 * dpr, sg = ctx.createRadialGradient(x, y, 0, x, y, r);
      sg.addColorStop(0, light ? `rgba(194,62,136,${.55 * k})` : `rgba(255,230,250,${.9 * k})`); sg.addColorStop(.25, light ? `rgba(150,60,210,${.22 * k})` : `rgba(246,169,211,${.35 * k})`); sg.addColorStop(1, light ? 'rgba(150,60,210,0)' : 'rgba(246,169,211,0)');
      ctx.fillStyle = sg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
  function draw(gm, now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (gm.cy - gm.r * 1.4 > H || gm.cy + gm.r * .2 < 0 || gm.r < 4) return false;
    ctx.globalAlpha = gm.a;
    lines(gm, fxOff() ? null : now);
    const b = bodyLayer(gm.r), bs = b.width / dpr;
    ctx.drawImage(b, (gm.cx - bs / 2) * dpr, (gm.cy - bs / 2) * dpr, bs * dpr, bs * dpr);
    const light = curTheme() === 'light', R = gm.r * dpr, cx = gm.cx * dpr, cy = gm.cy * dpr, ct = Math.cos(TILT), st = Math.sin(TILT), k = Math.max(.6, gm.r / 620) * dpr;
    const buckets = [[], [], [], [], []];
    for (const [phi, lam, s] of pts) {
      const l = lam + spin, c = Math.cos(phi), X = c * Math.cos(l), Y = Math.sin(phi), Z0 = c * Math.sin(l);
      const Y2 = Y * ct - Z0 * st, Z = Y * st + Z0 * ct; if (Z <= .02) continue;
      const sy = cy - R * Y2; if (sy < -10 || sy > cv.height + 10) continue;
      buckets[Math.min(4, Math.floor(Z * 5))].push(cx + R * X, sy, s);
    }
    const dotCol = light ? '40,30,90' : '255,255,255';
    buckets.forEach((bk, i) => {
      if (!bk.length) return; ctx.fillStyle = `rgba(${dotCol},${(light ? .22 : .3) + i * (light ? .1 : .14)})`; ctx.beginPath();
      for (let j = 0; j < bk.length; j += 3) { const rr = (0.7 + i * .28) * bk[j + 2] * k; ctx.moveTo(bk[j] + rr, bk[j + 1]); ctx.arc(bk[j], bk[j + 1], rr, 0, 6.2832); }
      ctx.fill();
    });
    ctx.fillStyle = `rgba(${dotCol},${light ? .28 : .32})`; ctx.beginPath();
    for (const [phi, lam] of rings) {
      const l = lam + spin * .6, c = Math.cos(phi), X = c * Math.cos(l), Y = Math.sin(phi), Z0 = c * Math.sin(l);
      const Y2 = Y * ct - Z0 * st, Z = Y * st + Z0 * ct; if (Z <= 0) continue;
      ctx.rect(cx + R * X - .45 * k, cy - R * Y2 - .45 * k, .9 * k, .9 * k);
    }
    ctx.fill();
    const m = Math.min(1, Math.max(0, gm.mask || 0));
    if (m >= .01) {
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-in';
      const vh = innerHeight * dpr, q = v => `rgba(0,0,0,${v.toFixed(3)})`, mg = ctx.createLinearGradient(0, 0, 0, cv.height);
      mg.addColorStop(0, q(1 - m)); mg.addColorStop(Math.min(1, .3 * vh / cv.height), q(1 - .45 * m)); mg.addColorStop(Math.min(1, .62 * vh / cv.height), q(1)); mg.addColorStop(Math.min(1, .84 * vh / cv.height), q(1 - .22 * m)); mg.addColorStop(1, q(1 - m));
      ctx.fillStyle = mg; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1; return true;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function frame(now) {
    raf = 0;
    const tg = target();
    let gm = tg;
    if (tr < 1) { tr = Math.min(1, (now - trStart) / 700); const e = 1 - Math.pow(1 - tr, 3); gm = { cx: lerp(from.cx, tg.cx, e), cy: lerp(from.cy, tg.cy, e), r: lerp(from.r, tg.r, e), a: lerp(from.a, tg.a, e), mask: lerp(from.mask || 0, tg.mask || 0, e) }; }
    const animate = !fxOff() && !document.hidden;
    if (animate) spin = (now / 1000) * (Math.PI * 2 / 110);
    let vis = true;
    if (now - last >= 1000 / FPS - 2 || dirty || tr < 1) { vis = draw(gm, now) !== false; cur = gm; last = now; dirty = false; }
    if ((animate && vis) || tr < 1) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && cv) raf = requestAnimationFrame(frame); };
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = Math.max(innerHeight, cv.getBoundingClientRect().height || 0);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px';
    body = null; dirty = true; kick();
  }
  function init() {
    cv = document.createElement('canvas'); cv.id = 'globe'; cv.setAttribute('aria-hidden', 'true'); document.body.prepend(cv);
    ctx = cv.getContext('2d'); build(); resize();
    addEventListener('resize', debounce(resize, 120));
    addEventListener('scroll', () => { dirty = true; kick(); }, { passive: true });
    document.addEventListener('visibilitychange', kick);
    on('theme', () => { body = null; dirty = true; kick(); }); on('settings', () => { dirty = true; kick(); });
  }
  function setMode(m, el) {
    if (!cv) return;
    const nm = m === 'hero' && el ? 'hero' : 'page';
    if (nm === mode && el === heroEl) { dirty = true; kick(); return; }
    from = cur || target(); mode = nm; heroEl = el || null;
    if (fxOff() || !cur) tr = 1; else { tr = 0; trStart = performance.now(); }
    dirty = true; kick();
  }
  return { init, setMode, redraw: () => { dirty = true; kick(); } };
})();

/* ---------- seasonal theme (New Year): garland on the top bar, Santa hat on the lynx, light snow ---------- */
const SEASON_KEY = 'lynx.season';
const Season = {
  on: !!store.get(SEASON_KEY, false), raf: 0, cv: null, flakes: [], gw: 0,
  apply(on) { on = !!on; if (on !== this.on) { this.on = on; store.set(SEASON_KEY, on); } this.paint(); },
  shown() { return this.on && Settings.v.season !== false; },
  paint() {
    const s = this.shown(); document.documentElement.toggleAttribute('data-ny', s);
    if (s) { this.garland(); this.snow(); } else { this.stopSnow(); $$('.ny-garland').forEach(g => { g.innerHTML = ''; }); this.gw = 0; }
  },
  garland() {
    const g = $('#nav .ny-garland'); if (!g) return; const w = Math.round(g.offsetWidth || g.parentElement.offsetWidth); if (!w || (w === this.gw && g.firstChild)) return; this.gw = w;
    const n = Math.max(8, Math.round(w / 46)), step = w / n, H = 22, C = ['#ff6b7a', '#ffd36b', '#7af0c0', '#8ab4ff', '#f6a9d3', '#c8b6ff'];
    let d = `M0 4`; for (let i = 0; i < n; i++) { const x0 = i * step, x1 = x0 + step; d += ` Q${(x0 + x1) / 2} ${H - 6} ${x1} 4`; }
    const bulbs = []; for (let i = 0; i < n; i++) { const x = i * step + step / 2, y = (4 + (H - 6)) / 2 + 1.2; bulbs.push(`<g class="ny-b" style="--d:${(i % 6) * .35}s;--c:${C[i % C.length]}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-2" y="-2.5" width="4" height="3.5" rx="1" class="ny-cap"/><ellipse cx="0" cy="5" rx="3.6" ry="5" class="ny-glass"/></g>`); }
    g.innerHTML = `<svg viewBox="0 0 ${w} ${H + 12}" width="${w}" height="${H + 12}" preserveAspectRatio="none"><path d="${d}" class="ny-wire"/>${bulbs.join('')}</svg>`;
  },
  snow() {
    if (fxOff()) { this.stopSnow(); return; }
    if (!this.cv) { this.cv = document.createElement('canvas'); this.cv.className = 'ny-snow'; this.cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(this.cv); }
    const cv = this.cv, dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const want = Math.min(110, Math.round(W * H / 16000));
    while (this.flakes.length < want) this.flakes.push(this.flake(W, H, true)); this.flakes.length = want;
    if (this.raf) return;
    const g = cv.getContext('2d'); let last = performance.now();
    const tick = now => {
      this.raf = requestAnimationFrame(tick); if (document.hidden) { last = now; return; }
      const dt = Math.min(50, now - last) / 16.7; last = now; const W2 = innerWidth, H2 = innerHeight;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W2, H2);
      const light = curTheme() === 'light';
      for (const f of this.flakes) {
        f.y += f.v * dt; f.p += f.w * dt; f.x += Math.sin(f.p) * .35 * dt + .12 * dt;
        if (f.y > H2 + 6 || f.x > W2 + 6) Object.assign(f, this.flake(W2, H2, false));
        g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fillStyle = light ? `rgba(140,150,200,${f.a * .8})` : `rgba(255,255,255,${f.a})`; g.fill();
      }
    };
    this.raf = requestAnimationFrame(tick);
  },
  flake(W, H, any) { return { x: Math.random() * W, y: any ? Math.random() * H : -6, r: .8 + Math.random() * 2.2, v: .35 + Math.random() * .8, w: .01 + Math.random() * .03, p: Math.random() * 6, a: .35 + Math.random() * .5 }; },
  stopSnow() { cancelAnimationFrame(this.raf); this.raf = 0; if (this.cv) { this.cv.remove(); this.cv = null; } this.flakes = []; }
};
on('settings', () => Season.paint());
addEventListener('resize', debounce(() => { if (Season.shown()) { Season.garland(); if (Season.cv) Season.snow(); } }, 150));
matchMedia('(prefers-reduced-motion: reduce)').addEventListener && matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => Season.paint());

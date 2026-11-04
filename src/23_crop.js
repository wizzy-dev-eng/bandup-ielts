/* ---------- image cropper: drag, wheel, slider and pinch; returns a canvas ---------- */
function openCrop({ file, shape = 'round', aspect = 1, outW = 512, outH = 512, title } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type) || file.size > 25e6) return reject(Object.assign(new Error('bad'), { code: shape === 'round' ? 'avatar_bad' : 'banner_bad' }));
    const url = URL.createObjectURL(file), img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(Object.assign(new Error('bad'), { code: shape === 'round' ? 'avatar_bad' : 'banner_bad' })); };
    img.onload = () => {
      const IW = img.naturalWidth, IH = img.naturalHeight; if (!IW || !IH) return img.onerror();
      let result = null;
      openDialog({
        title: title || (shape === 'round' ? tr('Crop the photo', 'Обрежь фото') : tr('Crop the banner', 'Обрежь баннер')), cls: 'crop-dlg', wide: shape !== 'round',
        body: `<div class="crop-stage ${shape === 'round' ? 'is-round' : 'is-rect'}" data-stage tabindex="0" role="application" aria-label="${esc(tr('Crop area: drag to move, use + and − to zoom', 'Область обрезки: перетаскивай, + и − для масштаба'))}"><img src="${url}" alt="" draggable="false" data-img><div class="crop-frame" data-frame aria-hidden="true"><i></i><i></i></div></div>
          <div class="crop-zoom"><button type="button" class="icon-btn" data-z="-1" aria-label="${esc(tr('Zoom out', 'Уменьшить'))}">${ic('zoomOut')}</button><input type="range" min="1" max="4" step="0.01" value="1" data-zr aria-label="${esc(tr('Zoom', 'Масштаб'))}"><button type="button" class="icon-btn" data-z="1" aria-label="${esc(tr('Zoom in', 'Увеличить'))}">${ic('zoomIn')}</button></div>
          <p class="faint crop-hint">${ic('move')} ${esc(tr('Drag the picture, zoom with the wheel, the slider or two fingers.', 'Двигай картинку, меняй масштаб колёсиком, ползунком или двумя пальцами.'))}</p>`,
        actions: `<button class="pill pill-outline" data-close>${esc(tr('Cancel', 'Отмена'))}</button><button class="pill pill-white" data-cok>${ic('check')} ${esc(tr('Apply', 'Применить'))}</button>`,
        onOpen: (d, close) => {
          const st = $('[data-stage]', d), im = $('[data-img]', d), fr = $('[data-frame]', d), zr = $('[data-zr]', d);
          Object.assign(im.style, { width: IW + 'px', height: IH + 'px' });
          let SW = 0, SH = 0, FX = 0, FY = 0, FW = 0, FH = 0, base = 1, z = 1, ox = 0, oy = 0;
          const layout = () => {
            SW = st.clientWidth; SH = st.clientHeight;
            if (shape === 'round') { FW = FH = Math.min(SW, SH) - 36; } else { FW = SW - 28; FH = FW / aspect; if (FH > SH - 28) { FH = SH - 28; FW = FH * aspect; } }
            FX = (SW - FW) / 2; FY = (SH - FH) / 2; base = Math.max(FW / IW, FH / IH);
            Object.assign(fr.style, { left: FX + 'px', top: FY + 'px', width: FW + 'px', height: FH + 'px' });
          };
          const clamp = () => { const s = base * z; ox = Math.min(0, Math.max(FW - IW * s, ox)); oy = Math.min(0, Math.max(FH - IH * s, oy)); };
          const paint = () => { clamp(); const s = base * z; im.style.transform = `translate(${FX + ox}px,${FY + oy}px) scale(${s})`; zr.value = z; };
          const zoomTo = (nz, px = FW / 2, py = FH / 2) => { nz = Math.min(4, Math.max(1, nz)); const k = nz / z; ox = px - (px - ox) * k; oy = py - (py - oy) * k; z = nz; paint(); };
          layout(); ox = (FW - IW * base) / 2; oy = (FH - IH * base) / 2; paint();
          const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { const cx = (FW / 2 - ox) / (base * z), cy = (FH / 2 - oy) / (base * z); layout(); ox = FW / 2 - cx * base * z; oy = FH / 2 - cy * base * z; paint(); }) : null;
          ro && ro.observe(st);
          const pts = new Map(); let pinch = null;
          st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.classList.add('drag'); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z }; } });
          st.addEventListener('pointermove', e => {
            if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
            if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], r = st.getBoundingClientRect(); const dd = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomTo(pinch.z * dd / pinch.d, (a[0] + b[0]) / 2 - r.left - FX, (a[1] + b[1]) / 2 - r.top - FY); }
            else if (pts.size === 1) { ox += dx; oy += dy; paint(); }
          });
          const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) st.classList.remove('drag'); };
          st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
          st.addEventListener('wheel', e => { e.preventDefault(); const r = st.getBoundingClientRect(); zoomTo(z * Math.exp(-e.deltaY * .0015), e.clientX - r.left - FX, e.clientY - r.top - FY); }, { passive: false });
          zr.addEventListener('input', () => zoomTo(+zr.value));
          $$('[data-z]', d).forEach(b => b.addEventListener('click', () => zoomTo(z * (b.dataset.z === '1' ? 1.2 : 1 / 1.2))));
          st.addEventListener('keydown', e => {
            const m = { ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, 12], ArrowDown: [0, -12] }[e.key];
            if (m) { e.preventDefault(); ox += m[0]; oy += m[1]; paint(); } else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(z * 1.15); } else if (e.key === '-') { e.preventDefault(); zoomTo(z / 1.15); }
          });
          $('[data-cok]', d).addEventListener('click', () => {
            const s = base * z, c = document.createElement('canvas'); c.width = outW; c.height = outH;
            const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = shape === 'round' ? '#fff' : '#110f18'; g.fillRect(0, 0, outW, outH);
            g.drawImage(img, -ox / s, -oy / s, FW / s, FH / s, 0, 0, outW, outH);
            result = c; close('ok');
          });
          setTimeout(() => st.focus({ preventScroll: true }), 60);
          d.addEventListener('close', () => { ro && ro.disconnect(); });
        },
        onClose: () => { URL.revokeObjectURL(url); resolve(result); }
      });
    };
    img.src = url;
  });
}
/* JPEG data URL under a size limit */
function canvasJpeg(c, max, steps) {
  let out = null;
  for (const [w, q] of steps) {
    let src = c; if (w < c.width) { src = document.createElement('canvas'); src.width = w; src.height = Math.round(c.height * w / c.width); const g = src.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, src.width, src.height); }
    out = src.toDataURL('image/jpeg', q); if (out.length <= max) return out;
  }
  return out && out.length <= max ? out : null;
}
const readDataUrl = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
/* avatar / banner picker: GIFs stay animated for Premium (no crop), everything else goes through the cropper */
async function pickImage(file, kind) {
  const av = kind === 'avatar', bad = { code: av ? 'avatar_bad' : 'banner_bad' };
  if (!file || !/^image\//.test(file.type)) throw bad;
  if (file.type === 'image/gif') {
    if (Auth.premium) {
      const lim = av ? 2200000 : 2900000;
      if (file.size * 1.37 + 40 > lim) { toast(tr(`The GIF is too big: up to ${av ? '1.6' : '2.1'} MB`, `GIF слишком большой: до ${av ? '1,6' : '2,1'} МБ`)); return null; }
      return readDataUrl(file);
    }
    toast(tr('Animated GIFs are a Premium feature – a still frame will be used', 'Анимированные GIF доступны с Premium – возьмём неподвижный кадр'));
  }
  const c = await openCrop(av ? { file, shape: 'round', aspect: 1, outW: 512, outH: 512 } : { file, shape: 'rect', aspect: 3, outW: 1200, outH: 400 });
  if (!c) return null;
  const out = av ? canvasJpeg(c, 380000, [[512, .9], [512, .82], [448, .78], [384, .72]]) : canvasJpeg(c, 450000, [[1200, .86], [1200, .76], [1000, .72], [900, .64], [800, .56]]);
  if (!out) throw bad;
  return out;
}

/* =====================================================================
   Arquivo 04: entrada — toque (Pointer Events), mouse e teclado
   - direcional virtual: toque na metade inferior esquerda
   - mira do arremesso: arrastar para trás a partir do jogador ou do botão
   - toque simples num companheiro: passe
   Teclado (PC): WASD/setas movem · Espaço arremessa/pula · E passa ·
   Q dribla/rouba · F bandeja/enterrada
   ===================================================================== */
const Input = (() => {
  const joy = { x: 0, y: 0, id: -1, ox: 0, oy: 0 };
  const aim = { id: -1, sx: 0, sy: 0, key: false, t: 0 };
  const keys = {}, tap = { id: -1, x: 0, y: 0, t: 0 };
  let layer = null, base = null, knob = null, H = null;      // H = handler do modo atual

  const rect = () => layer.getBoundingClientRect();
  function init(el) {
    layer = el; base = U.$('#stick'); knob = U.$('#knob');
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => key(e, true)); window.addEventListener('keyup', (e) => key(e, false));
    window.addEventListener('blur', reset);
  }
  function reset() { joy.id = -1; joy.x = joy.y = 0; aim.id = -1; aim.key = false; for (const k in keys) keys[k] = false; if (base) base.style.display = 'none'; }
  function setHandler(h) { reset(); H = h; }

  function down(e) {
    if (!H) return;
    SND.init(); e.preventDefault();
    const r = rect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const o = H.origin && H.origin();
    if (aim.id < 0 && o && Math.hypot(o.x - x, o.y - y) < 64 && H.aimStart()) { aim.id = e.pointerId; aim.sx = x; aim.sy = y; return; }
    if (joy.id < 0 && H.joy !== false && y > r.height * 0.4 && x < r.width * 0.62) {
      joy.id = e.pointerId; joy.ox = x; joy.oy = y; joy.x = joy.y = 0;
      base.style.display = 'block'; base.style.left = x + 'px'; base.style.top = y + 'px'; knob.style.transform = 'translate(-50%,-50%)';
      return;
    }
    tap.id = e.pointerId; tap.x = x; tap.y = y; tap.t = performance.now();
  }
  function move(e) {
    if (!H) return;
    const r = rect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.pointerId === joy.id) {
      const R = Math.min(56, r.width * 0.15); let dx = x - joy.ox, dy = y - joy.oy; const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      joy.x = dx / R; joy.y = dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    } else if (e.pointerId === aim.id) {
      const L = Math.min(r.height * 0.2, 190);
      // estilingue: puxar para baixo dá força; puxar para o lado inverte a direção
      H.aimMove((y - aim.sy) / L, (-(x - aim.sx) / L) * 0.9);
    }
  }
  function up(e) {
    if (!H) return;
    if (e.pointerId === joy.id) { joy.id = -1; joy.x = joy.y = 0; base.style.display = 'none'; }
    else if (e.pointerId === aim.id) { aim.id = -1; H.aimEnd(e.type === 'pointercancel'); }
    else if (e.pointerId === tap.id) {
      tap.id = -1; const r = rect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (performance.now() - tap.t < 350 && Math.hypot(x - tap.x, y - tap.y) < 14 && H.tap) H.tap(x, y);
    }
  }
  // o botão "Arremessar" inicia a mira com o mesmo dedo
  function aimFromButton(e) {
    if (!H || aim.id >= 0 || !H.aimStart()) return;
    const r = rect(); aim.id = e.pointerId; aim.sx = e.clientX - r.left; aim.sy = e.clientY - r.top;
  }
  function key(e, on) {
    if (!H) return;
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();
    if (keys[c] === on) return; keys[c] = on;
    if (joy.id < 0) {
      joy.x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      joy.y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
      const l = Math.hypot(joy.x, joy.y); if (l > 1) { joy.x /= l; joy.y /= l; }
    }
    if (c === 'Space') {
      if (on) { if (aim.id < 0 && H.aimStart()) { aim.key = true; aim.t = 0; } else if (H.key) H.key('jump'); }
      else if (aim.key) { aim.key = false; H.aimEnd(false); }
    } else if (on && H.key) {
      if (c === 'KeyE') H.key('pass'); else if (c === 'KeyQ') H.key('q'); else if (c === 'KeyF') H.key('layup');
    }
  }
  function update(dt) {                    // teclado: segurar Espaço carrega a força
    if (aim.key && H) { aim.t += dt; H.aimMove(Math.min(1.3, aim.t / 0.85), 0); }
    if (aim.id >= 0 && H && H.aiming && !H.aiming()) aim.id = -1;
    if (aim.key && H && H.aiming && !H.aiming()) aim.key = false;
  }
  return { init, joy, setHandler, aimFromButton, update, reset };
})();

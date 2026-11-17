/* =====================================================================
   Arquivo 04: entrada — toque (Pointer Events), mouse e teclado
   - direcional virtual: toque na metade inferior esquerda
   - ARREMESSO: sempre pelo gesto de arrastar a bola para cima (InputSwipe /
     BallController). O botão "Arremessar" (ou tocar no seu jogador, ou a
     tecla Espaço) só levanta a bola e entra no modo de mira; ele NÃO lança.
   - toque simples num companheiro: passe
   Teclado (PC): WASD/setas movem · Espaço levanta a bola/pula · E passa ·
   Q dribla/rouba · F enterrada · Esc desiste do arremesso. O mouse faz o
   papel do dedo (inclusive no gesto do arremesso).
   ===================================================================== */
const Input = (() => {
  const joy = { x: 0, y: 0, id: -1, ox: 0, oy: 0 };
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
  function reset() {
    joy.id = -1; joy.x = joy.y = 0; for (const k in keys) keys[k] = false; if (base) base.style.display = 'none';
    if (BallController.holding) BallController.drop('');     // perdeu o foco com a bola na mão: ela volta, sem arremessar
  }
  function setHandler(h) { reset(); H = h; }
  function stopJoy() { joy.id = -1; joy.x = joy.y = 0; base.style.display = 'none'; }

  function down(e) {
    if (!H) return;
    SND.init(); e.preventDefault();
    const r = rect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (BallController.active) {                            // modo de mira: o dedo pega a bola (sem direcional)
      if (BallController.grab(e.pointerId, x, y, false, e.timeStamp)) return;
      tap.id = e.pointerId; tap.x = x; tap.y = y; tap.t = performance.now();
      return;
    }
    // tocar no próprio jogador também levanta a bola, já presa ao dedo
    const o = H.origin && H.origin();
    if (o && Math.hypot(o.x - x, o.y - y) < 64 && H.shotStart && H.shotStart()) { stopJoy(); BallController.grab(e.pointerId, x, y, true, e.timeStamp); return; }
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
    if (e.pointerId === InputSwipe.state.id) {
      // o navegador pode juntar vários movimentos num evento só: usa todos, cada um com o seu horário
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const c of list) BallController.move(e.pointerId, c.clientX - r.left, c.clientY - r.top, c.timeStamp);
      return BallController.move(e.pointerId, x, y, e.timeStamp);
    }
    if (e.pointerId === joy.id) {
      const R = Math.min(56, r.width * 0.15); let dx = x - joy.ox, dy = y - joy.oy; const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      joy.x = dx / R; joy.y = dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
  }
  function up(e) {
    if (!H) return;
    if (e.pointerId === InputSwipe.state.id) {              // soltou a bola: o gesto decide se ela é lançada
      const r = rect(); BallController.move(e.pointerId, e.clientX - r.left, e.clientY - r.top, e.timeStamp);
      return BallController.release(e.pointerId, e.type === 'pointercancel');
    }
    if (e.pointerId === joy.id) stopJoy();
    else if (e.pointerId === tap.id) {
      tap.id = -1; const r = rect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (performance.now() - tap.t < 350 && Math.hypot(x - tap.x, y - tap.y) < 14 && H.tap) H.tap(x, y);
    }
  }
  // botão "Arremessar": levanta a bola e ela já fica presa ao mesmo dedo. Quem lança é o swipe.
  function shotFromButton(e) {
    if (!H || !H.shotStart || !H.shotStart()) return;
    try { if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId); } catch (x) { /* sem captura */ }
    stopJoy();
    const r = rect(); BallController.grab(e.pointerId, e.clientX - r.left, e.clientY - r.top, true, e.timeStamp);
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
    if (!on) return;
    if (c === 'Space') { if (!(H.shotStart && H.shotStart()) && H.key && !BallController.active) H.key('jump'); }   // Espaço só levanta a bola
    else if (c === 'Escape') { if (H.shotCancel) H.shotCancel(); }
    else if (H.key) { if (c === 'KeyE') H.key('pass'); else if (c === 'KeyQ') H.key('q'); else if (c === 'KeyF') H.key('layup'); }
  }
  function update() { if (BallController.active && joy.id >= 0) stopJoy(); }
  return { init, joy, setHandler, shotFromButton, update, reset };
})();

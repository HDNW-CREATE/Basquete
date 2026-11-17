/* =====================================================================
   Arquivo 04d: ShotFeedback — efeitos e interface do arremesso por gesto
   - círculo-alvo sobre o aro (diminui e cresce em ciclo enquanto segura);
   - SETA DE FORÇA: nasce na bola e aponta para onde ela vai ser lançada.
     O tamanho é a força (0..100%) e a cor é o resultado previsto:
       verde = fraca · amarela = ideal · vermelha = forte demais.
     Os números vêm do mesmo cálculo usado no lançamento (BallController);
   - giro e brilho da bola com curva, rastro e giro para trás no voo;
   - bola que errou continua quicando e some; textos BOA!/ÓTIMO!/EXCELENTE!
   ===================================================================== */
const ShotFeedback = (() => {
  const $ = U.$, el = {}, shown = {};
  const COL = { weak: '#49e04b', ideal: '#ffd400', strong: '#ff4d3c' }, WORD = { weak: 'FRACA', ideal: 'IDEAL', strong: 'FORTE' };
  let frozen = null, frozenT = 0;         // seta "congelada" por um instante depois de soltar (mostra a força aplicada)
  let tip = '', tipT = 0, tipBad = false; // aviso temporário na base da tela
  let fly = null;                         // bola em voo: { ball, flying, pts, spin, axis }
  let ghost = null;                       // bola anterior que continua quicando até sumir
  let spinning = false, hadSpin = false, axis = null, UP = null, arcOn = false, ballScale = 1;

  function init() {
    ['shotui', 'sw-t', 'sw-tip', 'sw-ring', 'sw-in', 'sw-arrow', 'sw-track', 'sw-shaft', 'sw-head', 'sw-lbl', 'sw-spin', 'sw-cancel', 'sw-pass', 'sw-q'].forEach((id) => { el[id] = $('#' + id); });
    const press = (id, fn) => el[id].addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); SND.init(); SND.play('click'); fn(); });
    press('sw-cancel', () => Match.aimCancel());
    press('sw-pass', () => Match.act('pass'));
    axis = new THREE.Vector3(); UP = new THREE.Vector3(0, 1, 0);
  }
  const vis = (id, on) => { if (shown[id] !== on) { shown[id] = on; el[id].classList.toggle('hidden', !on); } };
  const txt = (id, v) => { const k = 't_' + id; if (shown[k] !== v) { shown[k] = v; el[id].textContent = v; } };

  /* ---------- seta de força ---------- */
  function drawArrow(L, band, s) {
    const { W, H } = GFX.size, a = el['sw-arrow'];
    // Direção na tela: sempre para FRENTE (para cima), inclinada para o lado da cesta e pelo desvio
    // do lançamento (L.yaw: + = direita). Usa um ponto bem acima do aro para a seta não "girar"
    // quando a bola passa por cima da cesta na tela.
    const p = GFX.project(L.hx, CT.HOOP_Y, L.hz);
    const ang = U.clamp(Math.atan2(p.x - s.x, Math.max(1, s.y - p.y) + 0.6 * H) + L.yaw * 3, -0.9, 0.9);
    const bx = s.x + Math.sin(ang) * s.r * 0.95, by = s.y - Math.cos(ang) * s.r * 0.95;
    const max = H * 0.36, len = Math.max(4, L.force * max), c = COL[L.zone], lo = band[0] * 100, hi = band[1] * 100;
    a.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) rotate(${ang.toFixed(3)}rad)`;
    el['sw-track'].style.height = max + 'px';
    el['sw-track'].style.background = `linear-gradient(to top, ${COL.weak} 0 ${lo}%, ${COL.ideal} ${lo}% ${hi}%, ${COL.strong} ${hi}% 100%)`;
    el['sw-shaft'].style.height = len + 'px'; el['sw-shaft'].style.background = c;
    el['sw-head'].style.bottom = len - 1 + 'px'; el['sw-head'].style.borderBottomColor = c;
    const head = GFX.size.W * 0.04 * 1.5, tl = len + head + GFX.size.W * 0.07, l = el['sw-lbl'];
    l.style.left = U.clamp(bx + Math.sin(ang) * tl, W * 0.2, W * 0.8) + 'px'; l.style.top = Math.max(H * 0.2, by - Math.cos(ang) * tl) + 'px'; l.style.color = c;
    txt('sw-lbl', `${Math.round(L.force * 100)}% ${WORD[L.zone]}`);
  }

  /* ---------- círculo-alvo sobre o aro ---------- */
  function drawRing(ses, scale, q) {
    const h = GFX.project(ses.hx, CT.HOOP_Y, ses.hz), m = GFX.camera.matrixWorld.elements;
    const e = GFX.project(ses.hx + m[0] * CT.RIM_R, CT.HOOP_Y + m[1] * CT.RIM_R, ses.hz + m[2] * CT.RIM_R);
    const R = Math.max(GFX.size.W * 0.07, Math.hypot(e.x - h.x, e.y - h.y) * 2.3), r = el['sw-ring'];
    r.style.left = h.x + 'px'; r.style.top = h.y + 'px'; r.style.width = r.style.height = R * 2 + 'px';
    el['sw-in'].style.transform = `scale(${scale.toFixed(3)})`;
    el['sw-in'].style.color = el['sw-in'].style.borderColor = q === 'excellent' ? '#ffd400' : q === 'great' ? '#7dff6a' : q === 'nice' ? '#7fd4ff' : '#ffffff';
  }

  /* ---------- eventos ---------- */
  // a bola foi lançada: congela a seta com a força aplicada e começa o rastro
  function thrown(L, band, ses) {
    frozen = { L, band: band.slice(), s: BallController.screen() }; frozenT = 0.6;
    fly = { ball: ses.ball, flying: ses.flying, pts: [], spin: L.spin, dx: L.dirx, dz: L.dirz, rim: false };
    SND.play('whoosh'); if (L.spin) SND.play('spin', 0.7);
  }
  // swipe curto, lento ou para trás: a bola não foi lançada
  function dropped(why) {
    tip = why === 'weak' ? 'Fraco demais! Empurre mais longo e mais rápido' : 'Deslize PARA CIMA, em direção à cesta'; tipT = 2.4; tipBad = true;
  }
  // cesta de um arremesso por gesto: texto conforme a precisão do círculo (+ curva)
  function scored(meta) {
    if (!meta) return;
    const C = ARREMESSO, q = meta.q, word = q === 'excellent' ? C.textoExcelente : q === 'great' ? C.textoOtimo : q === 'nice' ? C.textoBoa : '';
    if (!word && !meta.spin) return;
    const e = el['sw-q'];
    e.innerHTML = (word || C.textoCurva) + (word && meta.spin ? `<small>${C.textoCurva}</small>` : '');
    e.className = 'out ' + (q || 'curve'); void e.offsetWidth; e.classList.add('go');
    if (q) SND.play(q); else SND.play('nice');
  }
  // a bola do arremesso anterior continua na física (quica no aro/chão) e some depois de "life" segundos
  function ghostFrom(B, life = ARREMESSO.tempoSumirErro) {
    ghost = { x: B.x, y: B.y, z: B.z, vx: B.vx, vy: B.vy, vz: B.vz, cax: B.cax || 0, caz: B.caz || 0, t: life };
    GFX.ball2.quaternion.copy(GFX.ball.quaternion);
    if (fly && fly.ball === B) fly = null;
    GFX.setTrail([]);
  }
  function clear() {
    frozen = null; frozenT = 0; fly = null; ghost = null; tipT = 0; spinning = false; hadSpin = false; ballScale = 1; GFX.ball.scale.setScalar(1);
    GFX.setTrail([]); GFX.setGlow(0, 0); GFX.ball2.visible = false; GFX.traj([]); arcOn = false;
    for (const id of ['shotui']) vis(id, false);
    el['sw-q'].className = 'out';
  }

  /* ---------- atualização por quadro ---------- */
  function update(dt) {
    const bc = BallController, C = ARREMESSO, st = bc.state, ses = bc.session;
    const hand = st === 'idle' || st === 'holding' || st === 'reset', holding = st === 'holding';
    if (frozenT > 0) frozenT -= dt;
    vis('shotui', hand || frozenT > 0);
    vis('sw-t', hand); vis('sw-tip', hand); vis('sw-ring', holding);
    vis('sw-cancel', hand && !!ses.canCancel); vis('sw-pass', hand && !!ses.canPass);
    const g = bc.gesture, L = holding ? bc.preview : null, spin = holding && g ? g.spin : 0;

    // seta: aparece só quando existe força (empurrando para frente); some ao parar ou arrastar para trás
    const arrow = L && L.force > 0 ? { L, band: bc.band, s: bc.screen() } : frozenT > 0 ? frozen : null;
    vis('sw-arrow', !!arrow); vis('sw-lbl', !!arrow);
    if (arrow) { drawArrow(arrow.L, arrow.band, arrow.s); el['sw-arrow'].style.opacity = el['sw-lbl'].style.opacity = L ? 1 : Math.min(1, frozenT / 0.2); }
    // melhoria "Linha de Mira" (ou treino alto): arco pontilhado que a bola vai fazer com o empurrão atual
    if (L && L.force > 0 && ses.arc) {
      const pts = [];
      for (let i = 2; i <= 24; i++) {
        const t = i * 0.06, y = L.y + L.vy * t - 0.5 * CT.G * t * t; if (y < CT.HOOP_Y - 0.2 && L.vy - CT.G * t < 0) break;
        pts.push([L.x + L.vx * t + 0.5 * L.cax * t * t, y, L.z + L.vz * t + 0.5 * L.caz * t * t, 0.55]);
      }
      GFX.traj(pts); arcOn = true;
    } else if (arcOn) { GFX.traj([]); arcOn = false; }

    if (hand) {
      txt('sw-t', ses.title || '');
      if (tipT > 0) tipT -= dt; else tipBad = false;
      let m = tip;
      if (tipT <= 0) {
        if (!holding) m = 'Segure a bola e deslize para cima';
        else if (L && L.force > 0) m = 'Solte para arremessar!';
        else if (spin) m = 'Girando! Agora empurre para a cesta';
        else m = L && L.contest > 0.5 ? 'Marcado! Empurre para a cesta' : 'Empurre para a cesta · solte com o círculo pequeno';
      }
      txt('sw-tip', m); el['sw-tip'].classList.toggle('bad', tipBad || (holding && !!L && L.contest > 0.5 && tipT <= 0));
      if (holding) drawRing(ses, bc.ringScale(), bc.quality());
      // bola na mão: gira devagar parada; com efeito, gira rápido e brilha
      const b = GFX.ball, s = bc.screen();
      b.rotation.y += dt * (C.giroParado + Math.abs(spin) * 26) * (spin < 0 ? -1 : 1); b.rotation.x += dt * C.giroParado * 0.5;
      GFX.setGlow(Math.abs(spin), 0x6fe3ff);
      vis('sw-spin', !!spin);
      if (spin) {
        el['sw-spin'].style.left = s.x + 'px'; el['sw-spin'].style.top = s.y + s.r * 1.35 + 'px'; txt('sw-spin', spin > 0 ? 'CURVA ↻' : '↺ CURVA');
        if (!hadSpin) SND.play('spin');
      }
      hadSpin = !!spin;
    } else { vis('sw-spin', false); hadSpin = false; }

    // na mão a bola é desenhada menor (não tapa a cesta); ao sair, volta ao tamanho real em um instante
    ballScale = hand ? C.tamanhoBolaNaMao : ballScale + (1 - ballScale) * Math.min(1, dt * 9);
    GFX.ball.scale.setScalar(ballScale);
    // bola em voo: giro para trás (backspin), giro lateral da curva, brilho e rastro
    spinning = hand;
    if (fly) {
      const B = fly.ball, on = fly.flying();
      if (on) {
        spinning = true;
        fly.pts.unshift([B.x, B.y, B.z, 1]); if (fly.pts.length > C.rastroPontos) fly.pts.pop();
        axis.set(-fly.dz, 0, fly.dx);
        GFX.ball.rotateOnWorldAxis(axis, C.giroBackspin * dt);
        if (fly.spin) GFX.ball.rotateOnWorldAxis(UP, fly.spin * 20 * dt);
      } else { fly.pts.pop(); fly.pts.pop(); }                 // acabou o voo: o rastro some aos poucos
      const n = fly.pts.length;
      for (let i = 0; i < n; i++) fly.pts[i][3] = (1 - i / C.rastroPontos) * 0.6 * ballScale;
      GFX.setTrail(fly.pts.slice(1), fly.spin ? 0x6fe3ff : 0xffffff);
      if (!hand) GFX.setGlow(on && fly.spin ? Math.abs(fly.spin) : 0, 0x6fe3ff);
      if (!on && !n) fly = null;
    } else if (!hand) GFX.setGlow(0, 0);

    // bola anterior: física real até sumir
    const b2 = GFX.ball2;
    if (ghost) {
      const ev = {}; Phys.step(ghost, dt, ev); ghost.t -= dt;
      if (ev.floor) SND.play('bounce', ev.floor * 0.7); if (ev.rim) SND.play('rim', ev.rim * 0.7); if (ev.board) SND.play('board', 0.7);
      b2.visible = true; b2.position.set(ghost.x, ghost.y, ghost.z); b2.scale.setScalar(U.clamp(ghost.t / 0.25, 0, 1));
      b2.rotation.x += ghost.vz * dt * 4; b2.rotation.z -= ghost.vx * dt * 4;
      if (ghost.t <= 0) ghost = null;
    } else if (b2.visible) b2.visible = false;
  }

  return { init, update, thrown, dropped, scored, ghostFrom, clear, get spinning() { return spinning; } };
})();

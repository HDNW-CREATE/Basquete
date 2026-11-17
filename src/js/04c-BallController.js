/* =====================================================================
   Arquivo 04c: BallController — a bola do arremesso em primeira pessoa
   Máquina de estados:
     OFF      não há arremesso em andamento
     RESET    a bola nova sobe da base da tela (ou a bola fraca cai e volta)
     IDLE     parada em primeiro plano, flutuando e girando devagar
     HOLDING  presa ao dedo (segue com suavidade/lerp); mostra círculo e seta
     FLYING   foi lançada: quem cuida dela agora é a física (Phys)

   Quem abre o arremesso (partida, lance livre ou treino) chama start() com
   uma "sessão":
     { hx, hz        centro do aro
       title         texto no topo da tela
       mods()        -> { assist, noise }: bônus/penalidade de assistência e ruído (marcação etc.)
       onThrow(L)    recebe o lançamento calculado; devolve true se a bola saiu
       canCancel, canPass   botões extras (só na partida)
       ball, flying()       bola em voo (para o rastro e o giro) }
   ===================================================================== */
const BallController = (() => {
  const ST = { OFF: 'off', IDLE: 'idle', HOLDING: 'holding', FLYING: 'flying', RESET: 'reset' };
  let st = ST.OFF, ses = null, t = 0, phase = 'rise', dropV = 0, ringT = 0;
  let preview = null, band = [0.5, 0.6], noise = { a: 0, y: 0 }, gesture = null;
  const scr = { x: 0, y: -1.5 };                  // posição da bola na tela (-1..1; y para cima)
  let pos = null, tmp = null, fwd = null;         // vetores do Three.js (criados no primeiro uso)

  // ponto do mundo que aparece na posição (nx, ny) da tela, a "distanciaBola" metros da câmera
  function toWorld(nx, ny) {
    const cam = GFX.camera;
    tmp.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    cam.getWorldDirection(fwd);
    pos.copy(cam.position).addScaledVector(tmp, ARREMESSO.distanciaBola / Math.max(0.2, tmp.dot(fwd)));
  }
  // posição e raio da bola em pixels (para saber se o dedo tocou nela e para desenhar a seta)
  function screen() {
    const { W, H } = GFX.size, f = Math.tan((GFX.camera.fov * Math.PI) / 360);
    return { x: (scr.x * 0.5 + 0.5) * W, y: (-scr.y * 0.5 + 0.5) * H, r: ((CT.BALL_R * ARREMESSO.tamanhoBolaNaMao) / (ARREMESSO.distanciaBola * f)) * H * 0.5 };
  }
  // tamanho do círculo-alvo: 1 (aberto) -> circuloMinimo (fechado) -> 1, em ciclo
  const ringScale = () => ARREMESSO.circuloMinimo + (1 - ARREMESSO.circuloMinimo) * (0.5 + 0.5 * Math.cos((2 * Math.PI * ringT) / ARREMESSO.tempoCicloCirculo));
  function quality() {
    const s = ringScale();
    return s < ARREMESSO.limiteExcelente ? 'excellent' : s < ARREMESSO.limiteOtimo ? 'great' : s < ARREMESSO.limiteBoa ? 'nice' : '';
  }

  /* Monta o lançamento a partir do gesto atual. É chamada a cada quadro enquanto
     o jogador segura a bola (para desenhar a seta) e mais uma vez ao soltar —
     por isso a seta e a física nunca mostram valores diferentes. */
  function buildLaunch(g) {
    const C = ARREMESSO, q = quality(), m = (ses.mods && ses.mods()) || {};
    const bonus = q === 'excellent' ? C.bonusExcelente : q === 'great' ? C.bonusOtimo : q === 'nice' ? C.bonusBoa : 0;
    const o = {
      x: pos.x, y: pos.y, z: pos.z, hx: ses.hx, hz: ses.hz, force: g.force, dev: g.dev, spin: g.spin,
      assist: U.clamp(C.assistencia + bonus + (m.assist || 0), 0, C.assistenciaMaxima),
      nAng: noise.a * (m.noise || 0), nYaw: noise.y * (m.noise || 0) * 0.8,   // ruído sorteado ao pegar a bola
    };
    const L = ThrowCalculator.compute(o);
    L.quality = q; L.contest = m.contest || 0;
    band = ThrowCalculator.idealBand(o);
    return L;
  }

  /* ---------- controle da sessão ---------- */
  function start(session) {
    if (!pos) { pos = new THREE.Vector3(); tmp = new THREE.Vector3(); fwd = new THREE.Vector3(); }
    ses = session; st = ST.RESET; phase = 'rise'; t = 0; scr.x = 0; scr.y = -1.5; preview = null; gesture = null;
    InputSwipe.cancel(); toWorld(scr.x, scr.y);
  }
  function end() { st = ST.OFF; ses = null; preview = null; InputSwipe.cancel(); }

  /* ---------- entrada (chamado pelo Input) ---------- */
  // o dedo tocou a tela: pega a bola se tocou nela (ou sempre, se "force" — ex.: veio do botão)
  function grab(id, x, y, force, ts) {
    if (st !== ST.IDLE && st !== ST.RESET) return false;
    const s = screen();
    if (!force && Math.hypot(x - s.x, y - s.y) > s.r * 1.45 + 14) return false;
    st = ST.HOLDING; t = 0; ringT = 0; preview = null;
    noise = { a: U.gauss(), y: U.gauss() };
    InputSwipe.begin(id, x, y, ts); SND.play('grab');
    return true;
  }
  function move(id, x, y, ts) { if (st === ST.HOLDING) InputSwipe.move(id, x, y, ts); }
  // o dedo soltou: lança (gesto válido) ou deixa a bola cair e voltar (swipe curto/lento/para trás)
  function release(id, cancel) {
    if (st !== ST.HOLDING) return;
    const g = InputSwipe.end(id); if (!g) return;
    if (!cancel && g.valid) {
      const L = buildLaunch(g);
      if (ses.onThrow(L)) { st = ST.FLYING; t = 0; preview = null; ShotFeedback.thrown(L, band, ses); return; }
    }
    drop(cancel ? '' : g.force > 0 ? 'weak' : 'none');
  }
  function drop(why) {
    st = ST.RESET; phase = 'drop'; t = 0; dropV = 0.6; preview = null; InputSwipe.cancel();
    if (why) { SND.play('drop'); ShotFeedback.dropped(why); }
  }

  /* ---------- atualização por quadro (tempo real, não o tempo do jogo) ---------- */
  function update(dt) {
    if (st === ST.OFF || st === ST.FLYING) return;
    const C = ARREMESSO, { W, H } = GFX.size; t += dt;
    if (st === ST.IDLE) {                           // flutua levemente para cima e para baixo
      const k = 1 - Math.exp(-dt * 9);
      scr.x += (0 - scr.x) * k; scr.y += (C.alturaBola + Math.sin(t * C.flutuacaoVelocidade) * C.flutuacaoAltura - scr.y) * k;
    } else if (st === ST.HOLDING) {                 // segue o dedo com um leve atraso
      ringT += dt; InputSwipe.update(dt);
      const g = InputSwipe.state, k = 1 - Math.exp(-dt * C.suavidadeSeguir);
      scr.x += ((g.x / W) * 2 - 1 - scr.x) * k; scr.y += (-((g.y / H) * 2 - 1) - scr.y) * k;
      toWorld(scr.x, scr.y);
      gesture = g; preview = buildLaunch(g);
      return;
    } else if (phase === 'drop') {                  // swipe fraco: a bola cai na frente do jogador...
      dropV -= 7 * dt; scr.y += dropV * dt;
      if (scr.y < -1.55) { phase = 'rise'; t = 0; scr.x = 0; }
    } else {                                        // ...e uma bola nova sobe da base da tela
      const e = Math.min(1, t / C.tempoReaparecer), k = 1 - (1 - e) * (1 - e) * (1 - e);
      scr.x += (0 - scr.x) * Math.min(1, dt * 12); scr.y = U.lerp(-1.55, C.alturaBola, k);
      if (e >= 1) { st = ST.IDLE; t = 0; }
    }
    toWorld(scr.x, scr.y);
  }

  return {
    ST, start, end, grab, move, release, drop, update, screen, ringScale, quality,
    get state() { return st; }, get active() { return st !== ST.OFF; }, get holding() { return st === ST.HOLDING; },
    get session() { return ses; }, get pos() { return pos; }, get preview() { return preview; }, get band() { return band; },
    get gesture() { return gesture; }, get time() { return t; },
  };
})();

/* =====================================================================
   Arquivo 05: treinos (minigames)
   - three: 5 posições x 3 bolas atrás da linha de 3, contra o relógio
   - ft:    10 lances livres
   - cones: slalom de drible entre cones, contra o relógio
   Os arremessos (three e ft) usam o mesmo gesto de swipe em primeira pessoa
   da partida: BallController + ThrowCalculator + ShotFeedback.
   ===================================================================== */
const Train = (() => {
  const T = {}, B = { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0 };
  let model = null, done = null, cones = [];
  const HZ = -CT.HOOP_Z;
  const INFO = {
    three: { name: 'ARREMESSO DE 3', ic: '🎯', desc: '5 posições, 3 bolas em cada. Segure a bola e deslize para cima. A última de cada posição vale 2 e cesta com curva vale +1!', stars: [6, 11, 15] },
    ft: { name: 'LANCES LIVRES', ic: '🏀', desc: '10 lances livres. Segure a bola e deslize para cima: seta amarela é a força ideal. Solte com o círculo pequeno para mais precisão.', stars: [4, 6, 8] },
    cones: { name: 'DRIBLE ENTRE CONES', ic: '🚧', desc: 'Contorne os cones alternando os lados o mais rápido possível.', stars: [12, 9.5, 7.5] },
  };

  function start(kind, cb) {
    done = cb;
    Object.assign(T, { kind, on: true, t: 0, score: 0, st: 'ready', stT: 0, x: 0, z: 0, y: 0, vx: 0, vz: 0, rot: Math.PI, dph: 0, msg: '', shot: 0, made: false, spot: 0, ball: 0, time: 60, gate: 0, pen: 0, sw: null, rimHit: false, over: false });
    GFX.disposeModel(model);
    const t = TEAMS[S.teamId];
    model = GFX.makeModel(Object.assign({}, S.look, { c1: t.c1, c2: t.c2 }));
    GFX.paintCourt(t.c1, t.c2); GFX.setCones([]); cones = [];
    if (kind === 'three') placeSpot();
    else if (kind === 'ft') { T.x = 0; T.z = -(CT.HL - CT.FT_D - 0.25); }
    else {
      const list = []; for (let i = 0; i < 9; i++) list.push([0, 7 - i * 2]);
      cones = GFX.setCones(list).map((m, i) => ({ m, x: 0, z: list[i][1], hit: false }));
      T.x = 0.9; T.z = 9.2; T.st = 'run';
    }
    GFX.star.visible = false;
    Input.setHandler({ joy: kind === 'cones' });
    if (kind !== 'cones') newBall();
  }
  function placeSpot() {
    const a = [-1.05, -0.55, 0, 0.55, 1.05][T.spot];
    T.x = Math.sin(a) * 7.15; T.z = HZ + Math.cos(a) * 7.15; T.rot = Math.atan2(-T.x, HZ - T.z);
  }
  const skill = () => Math.min(0.95, 0.58 + S.training.level * 0.019);

  // bola nova em primeiro plano: o BallController cuida do gesto e avisa em onThrow quando ela for lançada
  function newBall() {
    T.st = 'ready'; T.stT = 0;
    BallController.start({
      owner: 'train', hx: 0, hz: HZ,
      title: T.kind === 'ft' ? `LANCE LIVRE ${Math.min(10, T.shot + 1)}/10` : T.ball === 2 ? 'BOLA DOURADA · VALE 2' : 'ARREMESSO DE 3',
      mods: () => ({ assist: (skill() - 0.6) * 0.1 + (T.kind === 'ft' ? 0.03 : 0), noise: 0.004, contest: 0 }),
      onThrow: (L) => {
        if (!T.on || T.st !== 'ready') return false;
        Object.assign(B, { x: L.x, y: L.y, z: L.z, vx: L.vx, vy: L.vy, vz: L.vz, cax: L.cax, caz: L.caz });
        T.st = 'fly'; T.stT = 0; T.made = false; T.rimHit = false; T.over = false; T.sw = { q: L.quality, spin: L.spin };
        return true;
      },
      arc: S.training.level >= 5, ball: B, flying: () => T.on && T.st === 'fly' && !T.rimHit && !T.made,
    });
  }
  function finish() {
    if (!T.on) return; T.on = false; BallController.end();
    const I = INFO[T.kind]; let val = T.score, stars;
    if (T.kind === 'cones') { val = T.t + T.pen; stars = I.stars.filter((s) => val <= s).length; }
    else stars = I.stars.filter((s) => val >= s).length;
    SND.play(stars ? 'win' : 'lose');
    if (done) done({ kind: T.kind, val, stars });
  }

  function update(dt) {
    if (!T.on) return;
    T.stT += dt;
    const fl = []; let mode = 'idle', speed = 0;
    if (T.kind === 'cones') {
      // drible: direcional move o jogador; passar pelo lado errado ou derrubar o cone penaliza
      T.t += dt;
      const j = Input.joy, sp = 5.7 + S.training.level * 0.03;
      let ax = j.x * sp - T.vx, az = j.y * sp - T.vz; const al = Math.hypot(ax, az), ma = 24 * dt;
      if (al > ma) { ax *= ma / al; az *= ma / al; }
      T.vx += ax; T.vz += az; const pz = T.z; T.x = U.clamp(T.x + T.vx * dt, -5, 5); T.z = U.clamp(T.z + T.vz * dt, -13, 13);
      speed = Math.hypot(T.vx, T.vz); if (speed > 0.6) T.rot = U.angLerp(T.rot, Math.atan2(T.vx, T.vz), 0.25);
      mode = 'drib'; const a = T.dph; T.dph += dt * 12.5; if (Math.floor(a / Math.PI) !== Math.floor(T.dph / Math.PI)) SND.play('bounce', 0.4);
      for (let i = 0; i < cones.length; i++) {
        const c = cones[i], side = i % 2 ? 1 : -1;
        if (!c.hit && U.dist(T.x, T.z, c.x, c.z) < 0.45) { c.hit = true; c.m.rotation.z = 1.5; c.m.position.y = 0.12; T.pen += 1; SND.play('error'); HUD.float(c.x, 1, c.z, '+1s', 'bad'); }
        if (i === T.gate && pz > c.z && T.z <= c.z) {
          if (T.x * side > 0.15) { SND.play('click'); HUD.float(c.x, 1.2, c.z, '✔', 'good'); } else { T.pen += 2; SND.play('error'); HUD.float(c.x, 1.2, c.z, 'LADO ERRADO +2s', 'bad'); }
          T.gate++;
        }
      }
      if (T.gate < cones.length) { const c = cones[T.gate], side = T.gate % 2 ? 1 : -1; GFX.setRing(GFX.passRing, true, c.x + side * 1.0, c.z, 1.2); } else GFX.setRing(GFX.passRing, false);
      for (let x = -3; x <= 3; x += 0.5) fl.push([x, 0.04, -10.5, 1.3]);
      B.x = T.x + Math.sin(T.rot) * 0.42 - Math.cos(T.rot) * 0.3; B.z = T.z + Math.cos(T.rot) * 0.42 + Math.sin(T.rot) * 0.3; B.y = 0.14 + Math.abs(Math.sin(T.dph)) * 0.78;
      if (T.z < -10.5 && T.gate >= cones.length) finish();
      else if (T.t > 40) finish();
      T.msg = `⏱ ${(T.t + T.pen).toFixed(1)}s`;
      GFX.setFov(46); GFX.cam(T.x * 0.6, 11, T.z + 9.5, T.x * 0.6, 0.6, T.z - 2.5, 1 - Math.exp(-dt * 4));
    } else {
      if (T.kind === 'three') { T.time -= dt; if (T.time <= 0 && T.st !== 'fly') return finish(); }
      if (T.st === 'ready') {
        // bola na mão: a posição vem do BallController (parada, presa ao dedo ou reaparecendo)
        const q = BallController.pos; B.x = q.x; B.y = q.y; B.z = q.z; B.vx = B.vy = B.vz = 0;
      } else if (T.st === 'fly') {
        const ev = {}; Phys.step(B, dt, ev);
        if (ev.floor) SND.play('bounce', ev.floor); if (ev.rim) { SND.play('rim', ev.rim); GFX.hoops[0].shake = 0.4; GFX.hoops[0].kick(B.vx * 0.3, B.vz * 0.3, 0.15); T.rimHit = true; } if (ev.board) { SND.play('board'); T.rimHit = true; }
        if (ev.score === 0 && !T.made) {
          T.made = true; const gold = T.kind === 'three' && T.ball === 2, curve = T.sw && T.sw.spin ? ARREMESSO.bonusCurvaPontos : 0;
          T.score += (gold ? 2 : 1) + curve; SND.play('swish'); GFX.hoops[0].kick(B.vx, B.vz, 1); GFX.hypeUp(0.5);
          GFX.burst(0, CT.HOOP_Y - 0.3, HZ, [0xffd400, 0xffffff, 0xff7a1a], 20, 4);
          HUD.float(0, CT.HOOP_Y + 0.7, HZ, (T.rimHit ? 'NO ARO... E CAIU! ' : '') + (gold ? '+2' : '+1') + (curve ? ` +${curve} CURVA` : ''), 'good'); B.vx *= 0.3; B.vz *= 0.3;
          ShotFeedback.scored(T.sw); T.stT = 0;
        }
        // resultado decidido (cesta, ou bola já abaixo do aro sem chance): a bola antiga continua quicando
        // e some sozinha, enquanto uma nova sobe da base da tela
        if (!T.over && !T.made && (B.y < 2.3 && B.vy < 0 || T.stT > 3.2)) { T.over = true; T.stT = 0; }
        if ((T.made && T.stT > 0.55) || (T.over && T.stT > 0.3)) {
          ShotFeedback.ghostFrom(B, T.made ? 0.9 : ARREMESSO.tempoSumirErro);
          T.shot++;
          if (T.kind === 'three') { T.ball++; if (T.ball > 2) { T.ball = 0; T.spot++; if (T.spot > 4) return finish(); placeSpot(); } if (T.time <= 0) return finish(); }
          else if (T.shot >= 10) return finish();
          newBall();
        }
      }
      T.msg = T.kind === 'three' ? `⏱ ${Math.max(0, T.time).toFixed(0)}s · bola ${Math.min(15, T.spot * 3 + T.ball + 1)}/15` : `Lance ${Math.min(10, T.shot + 1)}/10`;
      // primeira pessoa: olho do arremessador olhando para a cesta (no voo o olhar sobe um pouco atrás da bola)
      const dx = -T.x, dz = HZ - T.z, l = Math.hypot(dx, dz) || 1, ly = T.st === 'fly' && !T.over ? U.clamp(2.6 + (B.y - 2.6) * 0.45, 2.3, 4.6) : 2.6;
      GFX.setFov(58); GFX.cam(T.x + (dx / l) * 0.1, 1.75, T.z + (dz / l) * 0.1, 0, ly, HZ, 1 - Math.exp(-dt * 7));
      GFX.setRing(GFX.passRing, false);
    }
    GFX.floor(fl);
    GFX.animate(model, mode, speed, dt, T.dph);
    model.g.position.set(T.x, T.y, T.z); model.g.rotation.y = T.rot;
    model.g.visible = T.kind === 'cones';                  // nos arremessos a câmera é o próprio jogador
    GFX.setRing(GFX.userRing, T.kind === 'cones', T.x, T.z);
    const bm = GFX.ball; bm.position.set(B.x, B.y, B.z); if (!ShotFeedback.spinning) bm.rotation.x += dt * 5;
  }
  function stop() {
    T.on = false; GFX.disposeModel(model); model = null; GFX.setCones([]); cones = [];
    GFX.setArrow(false); GFX.traj([]); GFX.floor([]); GFX.setRing(GFX.userRing, false); GFX.setRing(GFX.passRing, false);
    if (BallController.active && BallController.session.owner === 'train') BallController.end();
    ShotFeedback.clear();
  }
  return { start, update, stop, finish, INFO, get state() { return T; } };
})();

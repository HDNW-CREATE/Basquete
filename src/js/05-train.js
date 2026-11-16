/* =====================================================================
   Arquivo 05: treinos (minigames)
   - three: 5 posições x 3 bolas atrás da linha de 3, contra o relógio
   - ft:    10 lances livres com mira e barra de força
   - cones: slalom de drible entre cones, contra o relógio
   Reaproveita a física (Phys), a mira (aimViz) e os bonecos (GFX).
   ===================================================================== */
const Train = (() => {
  const T = {}, B = { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0 };
  let model = null, done = null, cones = [];
  const HZ = -CT.HOOP_Z;
  const INFO = {
    three: { name: 'ARREMESSO DE 3', ic: '🎯', desc: '5 posições, 3 bolas em cada. A última de cada posição vale 2!', stars: [6, 11, 15] },
    ft: { name: 'LANCES LIVRES', ic: '🏀', desc: '10 lances livres. Toque na bola em cima do alvo verde: o ponto do toque define a direção e a força.', stars: [4, 6, 8] },
    cones: { name: 'DRIBLE ENTRE CONES', ic: '🚧', desc: 'Contorne os cones alternando os lados o mais rápido possível.', stars: [12, 9.5, 7.5] },
  };

  function start(kind, cb) {
    done = cb;
    Object.assign(T, { kind, on: true, t: 0, score: 0, st: 'ready', stT: 0, x: 0, z: 0, y: 0, vx: 0, vz: 0, rot: Math.PI, dph: 0, aim: { on: false, p: 0, dev: 0 }, msg: '', shot: 0, made: false, spot: 0, ball: 0, time: 45, gate: 0, pen: 0, ftIn: null, sh: false });
    GFX.disposeModel(model);
    const t = TEAMS[S.teamId];
    model = GFX.makeModel(Object.assign({}, S.look, { c1: t.c1, c2: t.c2 }));
    GFX.paintCourt(t.c1, t.c2); GFX.setCones([]); cones = [];
    if (kind === 'three') placeSpot();
    else if (kind === 'ft') { T.x = 0; T.z = -(CT.HL - CT.FT_D - 0.25); HUD.ftShow(true, 1, 10); }
    else {
      const list = []; for (let i = 0; i < 9; i++) list.push([0, 7 - i * 2]);
      cones = GFX.setCones(list).map((m, i) => ({ m, x: 0, z: list[i][1], hit: false }));
      T.x = 0.9; T.z = 9.2; T.st = 'run';
    }
    GFX.star.visible = false;
    Input.setHandler({
      joy: kind === 'cones',
      origin: () => (kind === 'three' ? GFX.project(T.x, 1, T.z) : null),
      aimStart: () => { if (kind !== 'three' || T.st !== 'ready') return false; T.st = 'aim'; T.aim = { on: true, p: 0, dev: 0 }; return true; },
      aimMove: (p, d) => { T.aim.p = U.clamp(p, 0, 1.4); T.aim.dev = U.clamp(d, -0.6, 0.6); },
      aimEnd: (cancel) => { if (T.st === 'aim') { T.aim.on = false; if (cancel || T.aim.p < 0.3) T.st = 'ready'; else shoot3(); } },
      aiming: () => T.st === 'aim',
    });
  }
  function placeSpot() {
    const a = [-1.05, -0.55, 0, 0.55, 1.05][T.spot];
    T.x = Math.sin(a) * 7.15; T.z = HZ + Math.cos(a) * 7.15; T.rot = Math.atan2(-T.x, HZ - T.z);
  }
  const hand = () => ({ x: T.x + Math.sin(T.rot) * 0.24, y: T.y + 2.28, z: T.z + Math.cos(T.rot) * 0.24 });
  const skill = () => Math.min(0.95, 0.58 + S.training.level * 0.019);

  function launch(long, lat, th) {
    const hp = hand(); let ux = -hp.x, uz = HZ - hp.z; const l = Math.hypot(ux, uz); ux /= l; uz /= l;
    Phys.launch(B, hp.x, hp.y, hp.z, ux * long - uz * lat, CT.HOOP_Y, HZ + uz * long + ux * lat, th);
    T.st = 'fly'; T.stT = 0; T.made = false; T.rimHit = false; SND.play('pass', 0.6);
  }
  function shoot3() {
    const a = T.aim, d = U.dist(T.x, T.z, 0, HZ), E = aimErr(a, d);
    if (E.perfect) { SND.play('perfect'); HUD.float(T.x, 2.7, T.z, 'PERFEITO!', 'good'); }
    const sg = (0.022 + 0.0045 * d) * (1.4 - 0.62 * skill());
    launch(E.long + U.gauss() * sg, E.lat + U.gauss() * sg * 0.8, (U.clamp(62 - d * 1.9, 47, 62) * Math.PI) / 180);
  }
  // lance livre: bola à frente da câmera; o toque na bola define o chute (ver ftVel)
  const ftBall = () => (T.on && T.kind === 'ft' && T.st === 'ready' ? { x: T.x, y: FT_BALL.y, z: T.z - FT_BALL.ahead, hx: 0, hz: HZ, rz: ftZone(), full: S.training.level >= 5 } : null);
  function ftInput(du, dv) {
    const b = ftBall(); if (!b) return;
    if (Math.hypot(du, dv) < b.rz) { SND.play('perfect'); HUD.float(0, CT.HOOP_Y + 1.2, HZ, 'PERFEITO!', 'good'); }
    B.x = b.x; B.y = b.y; B.z = b.z; Object.assign(B, ftVel(b.x, b.y, b.z, 0, HZ, du, dv, b.rz));
    T.st = 'fly'; T.stT = 0; T.made = false; T.rimHit = false; SND.play('pass', 0.7);
    HUD.ftShow(false);
  }
  function finish() {
    if (!T.on) return; T.on = false; HUD.ftShow(false);
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
      if (T.kind === 'three' && T.st !== 'done') { T.time -= dt; if (T.time <= 0 && T.st !== 'fly') return finish(); }
      if (T.st === 'ready' || T.st === 'aim') {
        mode = T.st === 'aim' ? 'aim' : T.kind === 'ft' ? 'idle' : 'hold'; T.y = 0;
        const hp = T.kind === 'ft' ? ftBall() : T.st === 'aim' ? hand() : { x: T.x + Math.sin(T.rot) * 0.36, y: 1.2, z: T.z + Math.cos(T.rot) * 0.36 };
        B.x = hp.x; B.y = hp.y; B.z = hp.z; B.vx = B.vy = B.vz = 0;
        if (T.st === 'aim') { const r = aimViz(T.x, T.z, hand(), T.aim, S.training.level >= 5, fl); HUD.aimLabel(true, r.x, r.y, Math.round(T.aim.p * 100), r.good, true); }
      } else if (T.st === 'fly') {
        mode = T.stT < 0.4 && T.kind !== 'ft' ? 'shoot' : 'idle'; T.y = T.stT < 0.5 && T.kind !== 'ft' ? 4 * 0.45 * (T.stT / 0.5) * (1 - T.stT / 0.5) : 0;
        const ev = {}; Phys.step(B, dt, ev);
        if (ev.floor) SND.play('bounce', ev.floor); if (ev.rim) { SND.play('rim', ev.rim); GFX.hoops[0].shake = 0.4; GFX.hoops[0].kick(B.vx * 0.3, B.vz * 0.3, 0.15); T.rimHit = true; } if (ev.board) SND.play('board');
        if (ev.score === 0 && !T.made) {
          T.made = true; const gold = T.kind === 'three' && T.ball === 2;
          T.score += gold ? 2 : 1; SND.play('swish'); GFX.hoops[0].kick(B.vx, B.vz, 1); GFX.hypeUp(0.5);
          GFX.burst(0, CT.HOOP_Y - 0.3, HZ, [0xffd400, 0xffffff, 0xff7a1a], 20, 4);
          HUD.float(0, CT.HOOP_Y + 0.7, HZ, (T.rimHit ? 'NO ARO... E CAIU! ' : '') + (gold ? '+2' : '+1'), 'good'); B.vx *= 0.3; B.vz *= 0.3;
        }
        if ((T.made && T.stT > 0.9 && B.y < 2.2) || (B.y < 1 && T.stT > 0.7) || T.stT > 3) {       // próxima bola
          T.shot++; T.st = 'ready'; T.stT = 0;
          if (T.kind === 'three') { T.ball++; if (T.ball > 2) { T.ball = 0; T.spot++; if (T.spot > 4) return finish(); placeSpot(); } if (T.time <= 0) return finish(); }
          else { if (T.shot >= 10) return finish(); HUD.ftShow(true, T.shot + 1, 10); }
        }
      }
      if (T.st !== 'aim') { GFX.setArrow(false); GFX.traj([]); HUD.aimLabel(false); }
      T.msg = T.kind === 'three' ? `⏱ ${Math.max(0, T.time).toFixed(0)}s · bola ${Math.min(15, T.spot * 3 + T.ball + 1)}/15` : `Lance ${Math.min(10, T.shot + 1)}/10`;
      GFX.setFov(T.kind === 'ft' ? 58 : 46);
      if (T.kind === 'ft') GFX.cam(T.x, 1.75, T.z - 0.1, 0, 2.6, HZ, 1 - Math.exp(-dt * 7));   // primeira pessoa
      else {                                           // câmera atrás do arremessador, olhando para a cesta
        const dx = T.x, dz = T.z - HZ, l = Math.hypot(dx, dz) || 1;
        GFX.cam(U.clamp(T.x + (dx / l) * 6, -9.2, 9.2), 4.6, T.z + (dz / l) * 6, T.x - (dx / l) * 3, 1.8, T.z - (dz / l) * 3, 1 - Math.exp(-dt * 4));
      }
      GFX.setRing(GFX.passRing, false);
    }
    GFX.floor(fl);
    GFX.animate(model, mode, speed, dt, T.dph);
    model.g.position.set(T.x, T.y, T.z); model.g.rotation.y = T.rot;
    GFX.setRing(GFX.userRing, T.kind !== 'ft', T.x, T.z);
    const bm = GFX.ball; bm.position.set(B.x, B.y, B.z); bm.rotation.x += dt * 5;
  }
  function stop() {
    T.on = false; GFX.disposeModel(model); model = null; GFX.setCones([]); cones = [];
    GFX.setArrow(false); GFX.traj([]); GFX.floor([]); GFX.setRing(GFX.userRing, false); GFX.setRing(GFX.passRing, false);
    HUD.ftShow(false); HUD.aimLabel(false);
  }
  return { start, update, stop, ftInput, ftBall, finish, INFO, get state() { return T; } };
})();

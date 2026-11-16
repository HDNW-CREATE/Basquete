/* =====================================================================
   Arquivo 03: física da bola e motor da partida 5x5
   - Phys: gravidade, quique, colisão com aro e tabela, detecção de cesta
   - Match: regras (24s, 8s, volta de quadra, 3s, andada, drible duplo,
     fora, faltas, bônus, lances livres, tempos técnicos, prorrogação),
     IA de ataque/defesa, controle do jogador, replay e "retroceder".
   Time 0 = time do usuário (ataca a cesta de Z negativo, no alto da tela).
   ===================================================================== */

/* ---------------- Física da bola ---------------- */
const Phys = {
  // calcula a velocidade para sair de (x0,y0,z0) e passar por (tx,ty,tz) com ângulo th
  launch(B, x0, y0, z0, tx, ty, tz, th) {
    const dx = tx - x0, dz = tz - z0, d = Math.hypot(dx, dz) || 0.01, dh = ty - y0;
    while (d * Math.tan(th) - dh < 0.2 && th < 1.45) th += 0.04;
    const c = Math.cos(th), v = Math.sqrt((CT.G * d * d) / (2 * c * c * (d * Math.tan(th) - dh)));
    B.x = x0; B.y = y0; B.z = z0;
    B.vx = (dx / d) * v * c; B.vz = (dz / d) * v * c; B.vy = v * Math.sin(th);
  },
  // avança a bola; preenche ev = {floor, rim, board, score}
  step(B, dt, ev) {
    const N = 4, h = dt / N, BR = CT.BALL_R;
    for (let i = 0; i < N; i++) {
      const py = B.y;
      B.vy -= CT.G * h; B.x += B.vx * h; B.y += B.vy * h; B.z += B.vz * h;
      if (B.y < BR) {                                   // piso
        B.y = BR;
        if (B.vy < 0) {
          if (B.vy < -1.3) ev.floor = Math.min(1, -B.vy / 6);
          B.vy = -B.vy * 0.68; B.vx *= 0.88; B.vz *= 0.88;
          if (B.vy < 0.7) B.vy = 0;
        }
      }
      for (let k = 0; k < 2; k++) {
        const e = k ? 1 : -1, zc = e * B.z, cz = e * CT.HOOP_Z;
        if (zc < 9) continue;
        // tabela (1,80 x 1,05 m)
        if (Math.abs(B.x) < 0.94 && B.y > 2.86 && B.y < 3.99 && zc > CT.BOARD_Z - BR && zc < CT.BOARD_Z + 0.08 && e * B.vz > 0) {
          B.z = e * (CT.BOARD_Z - BR); B.vz = -B.vz * 0.6; B.vx *= 0.9; ev.board = true;
        }
        // aro: ponto mais próximo no círculo
        const dxr = B.x, dzr = B.z - cz, rh = Math.hypot(dxr, dzr);
        if (rh > 1e-4 && Math.abs(B.y - CT.HOOP_Y) < BR + 0.03) {
          const px = (dxr / rh) * CT.RIM_R, pz = cz + (dzr / rh) * CT.RIM_R;
          let nx = B.x - px, ny = B.y - CT.HOOP_Y, nz = B.z - pz;
          const dl = Math.hypot(nx, ny, nz), minD = BR + 0.012;
          if (dl < minD && dl > 1e-5) {
            nx /= dl; ny /= dl; nz /= dl;
            const vn = B.vx * nx + B.vy * ny + B.vz * nz;
            if (vn < 0) { B.vx -= 1.52 * vn * nx; B.vy -= 1.52 * vn * ny; B.vz -= 1.52 * vn * nz; ev.rim = Math.min(1, -vn / 4); }
            B.x = px + nx * minD; B.y = CT.HOOP_Y + ny * minD; B.z = pz + nz * minD;
          }
        }
        // cesta: centro da bola cruza o plano do aro descendo, por dentro
        if (py > CT.HOOP_Y && B.y <= CT.HOOP_Y && B.vy < 0 && Math.hypot(B.x, B.z - cz) < CT.RIM_R) ev.score = k;
      }
    }
  },
};


/* Desenha a mira do arremesso: seta amarela de força, cone pontilhado e arco da
   trajetória (completo apenas com a melhoria "Linha de Mira"). Usado na partida e no treino. */
// Erro de mira do jogador: zona "perfeita" de ±4% na força e ±0,06 rad na direção;
// fora dela o erro cresce de forma contínua (em metros no aro).
function aimErr(a, d) {
  const e = a.p - 1, ee = Math.sign(e) * Math.max(0, Math.abs(e) - 0.04), dv = Math.sign(a.dev) * Math.max(0, Math.abs(a.dev) - 0.06);
  return { long: U.clamp(ee * d * 0.5, -1.8, 1.8), lat: d * Math.tan(dv * 0.3), good: ee === 0, perfect: ee === 0 && dv === 0 };
}
function aimViz(x, z, hp, a, full, fl) {
  const hx = 0, hz = -CT.HOOP_Z, d = U.dist(x, z, hx, hz), base = Math.atan2(hx - x, hz - z), ang = base - a.dev;
  const E = aimErr(a, d), good = E.good, long = E.long, lat = E.lat;
  GFX.setArrow(true, x, z, ang, 0.4 + a.p * 2.2, good ? 0x49e04b : a.p > 1.12 ? 0xff5a3c : 0xffd400);
  for (const s of [-1, 1]) for (let i = 1; i < 12; i++) { const r = 0.7 + i * 0.5, aa = base + s * 0.42; fl.push([x + Math.sin(aa) * r, 0.04, z + Math.cos(aa) * r, 0.9]); }
  let ux = hx - hp.x, uz = hz - hp.z; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
  const tx = hx + ux * long - uz * lat, tz = hz + uz * long + ux * lat, T = {};
  Phys.launch(T, hp.x, hp.y, hp.z, tx, CT.HOOP_Y, tz, (U.clamp(62 - d * 1.9, 47, 62) * Math.PI) / 180);
  const tt = Math.hypot(tx - T.x, tz - T.z) / Math.hypot(T.vx, T.vz), pts = [], n = full ? 22 : 9;
  for (let i = 1; i <= n; i++) { const t = (i / 22) * tt; pts.push([T.x + T.vx * t, T.y + T.vy * t - 0.5 * CT.G * t * t, T.z + T.vz * t, full && i === 22 ? 2 : 1]); }
  GFX.traj(pts);
  const sp = GFX.project(x + Math.sin(ang) * (1.4 + a.p * 2.2), 0.6, z + Math.cos(ang) * (1.4 + a.p * 2.2));
  return { x: sp.x, y: sp.y, good, long, lat };
}
// zona verde do lance livre cresce com o nível de treino
const ftZone = () => 0.17 + S.training.level * 0.008;

/* ---------------- Motor da partida ---------------- */
const Match = (() => {
  const M = {}, B = {}, P = [];
  let MODELS = [], CFG = null, REF = null, onEnd = null;
  // posições de ataque em coordenadas locais (lx, distância à linha de fundo)
  const SPOTS = [[0, 9.5], [5.4, 7.5], [-5.4, 7.5], [6.85, 1.4], [-6.85, 1.4], [3.0, 2.7], [-3.0, 2.7], [2.95, 6.3], [-2.95, 6.3]];
  const ROLE_SPOTS = [[0, 1, 2], [1, 2, 3, 4, 0], [1, 2, 3, 4, 7, 8], [7, 8, 3, 4, 5, 6], [5, 6, 7, 8]];

  /* ---- helpers de geometria ---- */
  const dirOf = (t) => (t === 0 ? -1 : 1);                       // sentido de ataque em Z
  const hoopOf = (t) => ({ x: 0, z: dirOf(t) * CT.HOOP_Z });      // cesta atacada pelo time t
  const ldOf = (t, z) => CT.HL - z * dirOf(t);                    // distância à linha de fundo do ataque
  const spotPos = (t, lx, ld) => ({ x: lx * (t ? -1 : 1), z: dirOf(t) * (CT.HL - ld) });
  const inPaint = (t, x, z) => Math.abs(x) < CT.PAINT_W && ldOf(t, z) < CT.PAINT_L && ldOf(t, z) > 0;
  const isThree = (t, x, z) => U.dist(x, z, 0, dirOf(t) * CT.HOOP_Z) > CT.THREE_R || Math.abs(x) > CT.THREE_SIDE;
  const frontState = (t, z) => { const v = z * dirOf(t); return v > 0.3 ? 1 : v < -0.3 ? -1 : 0; };
  const jumpY = (t, h) => (t <= 0 || t >= 1 ? 0 : 4 * h * t * (1 - t));
  const isCtl = (p) => p.isUser && !M.auto;                       // controlado pelo usuário agora?
  const user = () => P.find((p) => p.isUser) || null;
  const fx = (name, ...a) => { if (!M.headless && HUD[name]) HUD[name](...a); };
  const snd = (n, v) => { if (!M.headless) SND.play(n, v); };
  const dbg = (k) => { M.dbg[k] = (M.dbg[k] || 0) + 1; };

  function nearestOpp(p) {
    let best = null, bd = 99;
    for (const q of P) if (q.team !== p.team) { const d = U.dist(p.x, p.z, q.x, q.z); if (d < bd) { bd = d; best = q; } }
    return { q: best, d: bd };
  }
  // menor distância de um adversário à linha de passe p -> q
  function laneOpen(p, q) {
    const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1, s = Math.min(1, l * 0.3);
    const ax = p.x + (dx / l) * s, az = p.z + (dz / l) * s;
    let m = 9;
    for (const o of P) if (o.team !== p.team && o.st !== 'stun') m = Math.min(m, U.segDist(o.x, o.z, ax, az, q.x, q.z));
    return m;
  }
  function laneClear(p) {
    const h = hoopOf(p.team), dx = h.x - p.x, dz = h.z - p.z, l = Math.hypot(dx, dz) || 1;
    for (const o of P) if (o.team !== p.team && U.segDist(o.x, o.z, p.x + (dx / l) * 0.7, p.z + (dz / l) * 0.7, h.x, h.z) < 0.75) return false;
    return true;
  }
  function moveTo(p, tx, tz, f = 1, free = false) {
    if (!free) { tx = U.clamp(tx, -CT.HW + 0.45, CT.HW - 0.45); tz = U.clamp(tz, -CT.HL + 0.45, CT.HL - 0.45); }
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { p.dx = p.dz = 0; return d; }
    const sp = p.spd * f * Math.min(1, d / 0.7);
    p.dx = (dx / d) * sp; p.dz = (dz / d) * sp;
    return d;
  }
  const faceTo = (p, x, z, k = 1) => { p.rot = U.angLerp(p.rot, Math.atan2(x - p.x, z - p.z), k); };

  /* ---- início da partida ---- */
  function mkPlayer(id, team, role, o) {
    return {
      id, team, role, isUser: !!o.user, name: o.name, num: o.num, look: o.look, man: team ? role : 5 + role,
      x: 0, z: 0, y: 0, vx: 0, vz: 0, dx: 0, dz: 0, rot: team ? 0 : Math.PI, spd: o.spd, sk: o.sk,
      st: 'free', stT: 0, stunT: 0, lunge: false, drib: 'live', dph: 0, paintT: 0, travelD: 0, holdT: 0,
      aiT: 0, spot: [0, 1, 2, 7, 6][role], spotT: U.rand(2, 5), cutT: 0, drive: 0, cd: 0, react: 0, crossT: 0, cele: 0,
      passFrom: -1, passT: 0, sh: null, lay: null,
      fouls: 0, pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, tpm: 0, tpa: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, to: 0, dunks: 0,
    };
  }
  function rndLook(team, num) {
    return { skin: U.randi(0, 5), hair: U.randi(0, 5), hairColor: U.randi(0, 3), face: U.randi(0, 2), shoes: U.randi(0, 5), num, c1: team.c1, c2: team.c2 };
  }
  function mkRoster(t, team, cfg) {
    const base = 0.36 + team.stars * 0.1, nums = U.shuffle([4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 21, 23, 30, 33]);
    for (let r = 0; r < 5; r++) {
      const id = t * 5 + r, k = (b = 0) => U.clamp(base + b + U.rand(-0.07, 0.07), 0.3, 0.97);
      if (t === 0 && r === 0) {                          // o usuário joga de armador
        const L = cfg.tlvl || 1;
        P.push(mkPlayer(id, t, r, {
          user: true, name: 'VOCÊ', num: cfg.userLook.num, look: Object.assign({}, cfg.userLook, { c1: team.c1, c2: team.c2 }),
          spd: 5.7 + L * 0.03, sk: { sh: Math.min(0.95, 0.6 + L * 0.018), th: Math.min(0.95, 0.58 + L * 0.019), df: 0.6 + L * 0.012, rb: 0.6, ps: 0.8, dk: 0.85 },
        }));
        continue;
      }
      P.push(mkPlayer(id, t, r, {
        name: rndName(), num: nums[r], look: rndLook(team, nums[r]), spd: [5.6, 5.5, 5.35, 5.2, 5.0][r] * (0.96 + team.stars * 0.012),
        sk: { sh: k(), th: k([0.04, 0.05, 0, -0.1, -0.22][r]), df: k(), rb: k([-0.12, -0.08, 0, 0.1, 0.15][r]), ps: k(), dk: k([-0.2, -0.05, 0.05, 0.12, 0.15][r]) },
      }));
    }
  }
  function start(cfg, endCb) {
    CFG = cfg; onEnd = endCb;
    for (const k of Object.keys(M)) delete M[k];
    Object.assign(M, {
      phase: 'intro', phT: 1.6, q: 1, qlen: cfg.qlen || 120, clock: cfg.qlen || 120, shotClock: 24,
      score: [0, 0], tf: [0, 0], to: [2, 2], poss: -1, arrow: 0, front: false, backT: 0, scOff: false, clockHold: true,
      time: 0, ts: 1, headless: !!cfg.headless, auto: !!cfg.auto, paused: false, pf: null, ft: null, inb: null,
      run: { team: -1, pts: 0 }, boostT: [0, 0], boost: cfg.boost || {}, rewindLeft: cfg.boost && cfg.boost.rewind ? 1 : 0,
      snapStr: null, rewT: 0, userShot: false, coins: 0, callT: 0, passTgt: -1, aim: { on: false, p: 0, dev: 0 },
      userOut: false, userFinal: null, replay: false, replayIn: 0, ftIn: null, dbg: {}, ended: false, hint: '',
    });
    P.length = 0;
    mkRoster(0, cfg.t0, cfg); mkRoster(1, cfg.t1, cfg);
    Object.assign(B, { x: 0, y: 1.3, z: 0, vx: 0, vy: 0, vz: 0, state: 'dead', holder: -1, lastTouch: -1, lastTeam: -1, shooter: -1, pts: 2, rim: false, fromShot: false, ft: false, dunk: false, passTo: -1, passFrom: -1, t: 0, dur: 1, fx: 0, fy: 0, fz: 0, inb: false, safe: false, tried: {}, noGrab: 0, spin: 0 });
    if (!M.headless) {
      MODELS.forEach(GFX.disposeModel); MODELS = P.map((p) => GFX.makeModel(p.look));
      GFX.disposeModel(REF); REF = GFX.makeModel({ skin: 1, hair: 1, hairColor: 1, face: 1, shoes: 1, num: '', c1: 0x9aa3b0, c2: 0x222222, short: 0x222222 });
      GFX.paintCourt(cfg.t0.c1, cfg.t0.c2);
      REC.n = 0; REC.i = 0;
    }
    setTipPositions();
  }
  function setTipPositions() {
    const T = [[0, 5.5], [-3.6, 2.4], [3.6, 2.4], [-2.4, -2.2], [0, 0.6]];
    for (const p of P) { const s = p.team ? -1 : 1, t = T[p.role]; p.x = t[0] * s; p.z = t[1] * s; p.vx = p.vz = 0; p.rot = p.team ? 0 : Math.PI; }
  }

  /* ---- posse de bola ---- */
  function give(p, how) {
    const same = M.poss === p.team, wasShot = B.fromShot, rim = B.rim, pf = B.passFrom, lastTeam = B.lastTeam;
    if (M.userShot) { M.userShot = false; if (M.snapStr && !(p.isUser && how === 'reb')) M.rewT = 3; }
    B.state = 'held'; B.holder = p.id; B.lastTouch = p.id; B.lastTeam = p.team; B.fromShot = false; B.shooter = -1;
    B.vx = B.vy = B.vz = 0; B.safe = false; B.dunk = false; B.ft = false;
    p.drib = 'live'; p.travelD = 0; p.holdT = 0; p.aiT = U.rand(0.25, 0.5); p.drive = 0;
    M.clockHold = false;
    if (how === 'reb') { p.reb++; snd('pass', 0.8); }
    if (!same) {                                        // troca de posse
      M.poss = p.team; M.shotClock = 24; M.backT = 0; M.front = frontState(p.team, p.z) === 1; M.scOff = false;
      for (const q of P) { q.paintT = 0; q.passFrom = -1; q.drive = 0; q.cutT = 0; }
      dbg('poss');
    } else {
      if (M.scOff) {
        M.scOff = false;
        if (wasShot && rim) M.shotClock = 14;           // rebote ofensivo: 14 segundos
        else if (M.shotClock <= 0) return violation('24 SEGUNDOS', p, 'Estouro do relógio de posse');
      }
      if (how === 'inb') { M.front = frontState(p.team, p.z) === 1; M.backT = 0; }
      else if (how === 'pass' && M.front && frontState(p.team, p.z) === -1 && lastTeam === p.team) return violation('VOLTA DE QUADRA', p, 'A bola voltou para a defesa');
      if (how === 'pass') { p.passFrom = pf; p.passT = M.time; }
    }
  }
  function startPass(p, q, o = {}) {
    if (p) {
      const hp = heldPos(p); B.x = hp.x; B.y = hp.y; B.z = hp.z;
      B.lastTouch = p.id; B.lastTeam = p.team; p.cd = 0.3; faceTo(p, q.x, q.z); p.drib = 'live';
    }
    B.state = 'pass'; B.holder = -1; B.passTo = q.id; B.passFrom = p ? p.id : -1; B.t = 0; B.fx = B.x; B.fy = B.y; B.fz = B.z;
    B.dur = Math.max(0.18, U.dist(B.x, B.z, q.x, q.z) / 14); B.inb = !!o.inb; B.safe = !!o.safe; B.tried = {}; B.fromShot = false;
    snd('pass');
  }
  function updPass(dt) {
    const q = P[B.passTo]; B.t += dt / B.dur;
    const t = Math.min(1, B.t);
    B.x = U.lerp(B.fx, q.x, t); B.z = U.lerp(B.fz, q.z, t);
    B.y = U.lerp(B.fy, q.y + 1.25, t) + Math.sin(t * Math.PI) * 0.4 * Math.min(1, B.dur / 0.5);
    if (!B.safe) for (const d of P) {                   // interceptação
      if (d.team === q.team || B.tried[d.id] || t < 0.2 || t > 0.92 || d.st === 'stun') continue;
      if (U.dist(d.x, d.z, B.x, B.z) < 0.75 && B.y < d.y + 2.3) {
        B.tried[d.id] = 1;
        if (Math.random() < (isCtl(d) ? 0.8 : 0.04 + 0.06 * d.sk.df)) {
          d.stl++; if (B.passFrom >= 0) P[B.passFrom].to++;
          dbg('intercept'); snd('steal'); if (d.isUser) fx('banner', 'INTERCEPTOU!', '', 'good');
          return give(d, 'steal');
        }
      }
    }
    if (t >= 1) give(q, B.inb ? 'inb' : 'pass');
  }
  // posição da bola na mão (drible, peito ou acima da cabeça)
  function heldPos(p) {
    const fxx = Math.sin(p.rot), fzz = Math.cos(p.rot), rx = -fzz, rz = fxx;
    if (p.st === 'aim' || p.st === 'shoot') return { x: p.x + fxx * 0.24, y: p.y + 2.28, z: p.z + fzz * 0.24 };
    if (p.st === 'lay') return { x: p.x + fxx * 0.3 + rx * 0.2, y: p.y + 2.42, z: p.z + fzz * 0.3 + rz * 0.2 };
    if (p.drib === 'drib') return { x: p.x + fxx * 0.42 + rx * 0.3, y: 0.14 + Math.abs(Math.sin(p.dph)) * 0.78, z: p.z + fzz * 0.42 + rz * 0.3 };
    return { x: p.x + fxx * 0.36, y: p.y + 1.2, z: p.z + fzz * 0.36 };
  }

  /* ---- arremessos ---- */
  function contest(p) {
    const h = hoopOf(p.team); let ux = h.x - p.x, uz = h.z - p.z; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
    let c = 0, near = null, nd = 9, blocker = null;
    for (const q of P) {
      if (q.team === p.team || q.st === 'stun') continue;
      const dq = U.dist(p.x, p.z, q.x, q.z), front = (q.x - p.x) * ux + (q.z - p.z) * uz > -0.25;
      if (dq < nd) { nd = dq; near = q; }
      if (dq < 2 && (front || dq < 0.8)) {
        c = Math.max(c, U.clamp((2 - dq) / 1.5, 0, 1) * (q.st === 'jump' ? 1.3 : 0.75));
        if (q.st === 'jump' && q.stT > 0.02 && q.stT < 0.44 && dq < 1.3 && front) blocker = q;
      }
    }
    return { c: Math.min(1.2, c), near, nd, blocker };
  }
  function shotSigma(p, d, type, c) {
    const u = isCtl(p);
    let s = type === 'lay' ? 0.062 : u ? 0.022 + 0.0045 * d : 0.034 + 0.0063 * d;
    const sk = type === 'lay' ? p.sk.sh : d > CT.THREE_R - 0.3 ? p.sk.th : p.sk.sh;
    s *= (1.4 - 0.62 * sk) * (1 + 0.9 * c);
    if (u && M.boost.nose) s *= 0.66;
    if (M.boostT[p.team] > 0) s *= 0.88;
    if (type === 'jump' && Math.hypot(p.vx, p.vz) > 2.5) s *= 1.2;
    return s;
  }
  function startShot(p, long, lat) {
    p.st = 'shoot'; p.stT = 0; p.drib = 'dead'; p.dx = p.dz = 0;
    p.sh = { type: 'jump', long, lat, pts: isThree(p.team, p.x, p.z) ? 3 : 2, rel: false };
    for (const q of P) if (q.team !== p.team && q.st === 'free' && !isCtl(q) && U.dist(p.x, p.z, q.x, q.z) < 2.2 && Math.random() < 0.35 + 0.5 * q.sk.df) q.react = U.rand(0.03, 0.2);
  }
  function startLay(p) {
    const h = hoopOf(p.team), d = U.dist(p.x, p.z, h.x, h.z), dir = dirOf(p.team);
    if (isCtl(p) && M.rewindLeft > 0) M.snapStr = snap();
    const dunk = p.sk.dk > 0.62 && d < 3.6 && (isCtl(p) || Math.random() < p.sk.dk - 0.2);
    // falta de ataque (carga): defensor parado no caminho, fora do semicírculo sem carga
    for (const q of P) {
      if (q.team === p.team || q.st !== 'free' || Math.hypot(q.vx, q.vz) > 1) continue;
      if (U.dist(q.x, q.z, h.x, h.z) > CT.NOCHARGE_R && U.segDist(q.x, q.z, p.x, p.z, h.x, h.z) < 0.4 && U.dist(p.x, p.z, q.x, q.z) < 1.3 && Math.random() < (isCtl(q) ? 0.3 : 0.05)) {
        return foul(p, q, 'offensive');
      }
    }
    p.st = 'lay'; p.stT = 0; p.drib = 'dead'; p.vx = p.vz = p.dx = p.dz = 0;
    const side = p.x >= h.x ? 1 : -1;
    p.lay = { type: dunk ? 'dunk' : 'lay', sx: p.x, sz: p.z, T: U.clamp(0.45 + d * 0.13, 0.55, 0.95), ox: dunk ? 0 : side * 0.4, oz: dunk ? 0.45 : 0.7, rel: false };
    p.sh = { type: dunk ? 'dunk' : 'lay', long: 0, lat: 0, pts: 2, rel: false };
    for (const q of P) if (q.team !== p.team && q.st === 'free' && !isCtl(q) && U.dist(h.x, h.z, q.x, q.z) < 2.6 && Math.random() < 0.3 + 0.5 * q.sk.df) q.react = U.rand(0.2, 0.42) * p.lay.T;
  }
  function updLay(p, dt) {
    const L = p.lay, h = hoopOf(p.team), dir = dirOf(p.team), t = p.stT / L.T, k = Math.min(1, t / 0.75), e = k * k * (3 - 2 * k);
    const nx = U.lerp(L.sx, h.x + L.ox, e), nz = U.lerp(L.sz, h.z - dir * L.oz, e);
    p.vx = (nx - p.x) / Math.max(dt, 1e-3); p.vz = (nz - p.z) / Math.max(dt, 1e-3); p.x = nx; p.z = nz;
    p.y = jumpY((t - 0.2) / 0.8, L.type === 'dunk' ? 1.02 : 0.76);
    faceTo(p, h.x, h.z, 0.4);
    if (isCtl(p) && L.type === 'dunk' && t > 0.3 && !L.rel) M.ts = 0.4;      // câmera lenta na enterrada
    if (!L.rel && t >= 0.68) { L.rel = true; p.sh.rel = true; if (L.type === 'dunk') dunkRelease(p); else releaseShot(p); }
    if (t >= 1) { p.st = 'free'; p.y = 0; p.vx = p.vz = 0; p.cd = 0.2; }
  }
  // decide toco/falta e devolve true se a jogada foi interrompida
  function defenseAtRelease(p, type, C) {
    const b = C.blocker;
    if (b) {
      let pr = isCtl(b) ? 0.55 : 0.05 + 0.08 * b.sk.df;
      if (type !== 'jump') pr *= isCtl(b) ? 0.85 : 1.25;
      if (isCtl(p)) pr *= 0.8;
      if (Math.random() < pr) {
        b.blk++; dbg('block'); snd('block'); fx('banner', 'TOCO!', b.isUser ? 'Você bloqueou!' : b.name, b.team === 0 ? 'good' : 'bad');
        if (!M.headless) { GFX.shake(0.12); GFX.hypeUp(0.5); }
        const dir = dirOf(p.team), hp = heldPos(p);
        Object.assign(B, { state: 'loose', holder: -1, x: hp.x, y: hp.y + 0.1, z: hp.z, vx: U.rand(-3, 3), vy: U.rand(1, 3), vz: -dir * U.rand(2, 5), lastTouch: b.id, lastTeam: b.team, fromShot: false, rim: false, noGrab: 0.18, shooter: -1 });
        M.scOff = true; p.fga++;
        if (M.userShot) { M.userShot = false; if (M.snapStr) M.rewT = 3; }
        return true;
      }
    }
    return false;
  }
  function foulAtRelease(p, type, C) {
    const q = C.near; if (!q || C.nd > 0.95) return null;
    let pr;
    if (isCtl(q)) pr = C.nd < 0.55 ? 0.22 : q.st === 'jump' ? 0.08 : 0;
    else pr = (type === 'jump' ? 0.045 : 0.12) * (q.st === 'jump' ? 1.3 : 0.6);
    return Math.random() < pr ? q : null;
  }
  function releaseShot(p) {
    const h = hoopOf(p.team), s = p.sh, type = s.type, C = contest(p), hp = heldPos(p);
    if (defenseAtRelease(p, type, C)) return;
    const fouler = foulAtRelease(p, type, C);
    const d = U.dist(p.x, p.z, h.x, h.z), sg = shotSigma(p, d, type, C.c);
    let ux = h.x - hp.x, uz = h.z - hp.z; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
    const long = s.long + U.gauss() * sg, lat = s.lat + U.gauss() * sg * 0.8;
    const tx = h.x + ux * long - uz * lat, tz = h.z + uz * long + ux * lat;
    const th = type === 'lay' ? 1.18 : (U.clamp(62 - d * 1.9, 47, 62) * Math.PI) / 180;
    Phys.launch(B, hp.x, hp.y, hp.z, tx, CT.HOOP_Y, tz, th);
    Object.assign(B, { state: 'shot', holder: -1, shooter: p.id, pts: s.pts, rim: false, fromShot: true, ft: false, dunk: false, lastTouch: p.id, lastTeam: p.team, noGrab: 0 });
    M.scOff = true; p.fga++; if (s.pts === 3) p.tpa++;
    dbg(s.pts === 3 ? 'fga3' : type === 'lay' ? 'fgaL' : 'fga2');
    if (isCtl(p)) M.userShot = true;
    if (fouler) foul(fouler, p, 'shooting', { pts: s.pts });
  }
  function dunkRelease(p) {
    const h = hoopOf(p.team), dir = dirOf(p.team), C = contest(p);
    if (defenseAtRelease(p, 'dunk', C)) return;
    const fouler = foulAtRelease(p, 'dunk', C), ok = Math.random() < 0.97 - 0.16 * C.c;
    Object.assign(B, { state: 'shot', holder: -1, shooter: p.id, pts: 2, rim: !ok, fromShot: true, ft: false, dunk: ok, lastTouch: p.id, lastTeam: p.team, noGrab: 0.2 });
    if (ok) { B.x = h.x; B.z = h.z; B.y = CT.HOOP_Y + 0.16; B.vx = 0; B.vz = 0; B.vy = -5.5; }
    else { B.x = h.x + U.rand(-0.1, 0.1); B.z = h.z - dir * 0.28; B.y = CT.HOOP_Y + 0.2; B.vx = U.rand(-1.5, 1.5); B.vz = -dir * U.rand(2, 4); B.vy = U.rand(2.5, 4); snd('rim'); }
    M.scOff = true; p.fga++; dbg('fgaD');
    if (!M.headless) { GFX.hoops[p.team].shake = 1; GFX.shake(0.18); }
    if (isCtl(p)) M.userShot = true;
    if (fouler) foul(fouler, p, 'shooting', { pts: 2 });
  }

  /* ---- pontuação ---- */
  function scoreBasket(k) {
    const team = k; let sh = B.shooter >= 0 ? P[B.shooter] : null; if (sh && sh.team !== team) sh = null;
    const pts = sh ? B.pts : 2;
    M.score[team] += pts; M.userShot = false;
    if (sh) {
      sh.pts += pts;
      if (B.ft) sh.ftm++;
      else {
        sh.fgm++; if (pts === 3) sh.tpm++; if (B.dunk) sh.dunks++;
        dbg(pts === 3 ? 'fgm3' : B.dunk ? 'fgmD' : sh.sh && sh.sh.type === 'lay' ? 'fgmL' : 'fgm2');
        if (sh.passFrom >= 0 && M.time - sh.passT < 6 && P[sh.passFrom].team === team) P[sh.passFrom].ast++;
      }
    }
    if (M.run.team === team) M.run.pts += pts; else M.run = { team, pts };
    const dunk = B.dunk, ft = B.ft;
    B.state = 'drop'; B.vx *= 0.3; B.vz *= 0.3; B.vy = Math.max(B.vy, -3.2);
    if (!M.headless) {
      const hp = GFX.hoops[team]; hp.kick(B.vx, B.vz, dunk ? 1.6 : 1);
      SND.play('swish'); SND.cheer(team === 0 ? 1 : 0.45); GFX.hypeUp(team === 0 ? 0.9 : 0.3);
      const t = team ? CFG.t1 : CFG.t0;
      GFX.burst(hp.x, CT.HOOP_Y - 0.3, hp.z, [t.c1, t.c2, 0xffffff, 0xffd400], dunk || pts === 3 ? 44 : 22, dunk ? 6 : 4);
      if (!ft) fx('banner', dunk ? 'ENTERRADA!' : pts === 3 ? '3 PONTOS!' : 'CESTA!', sh ? (sh.isUser ? 'VOCÊ' : sh.name) + ` · ${sh.pts} pts` : '', team === 0 ? 'good' : 'bad');
      else fx('float', hp.x, CT.HOOP_Y + 0.6, hp.z, '+1', team === 0 ? 'good' : 'bad');
      if (sh && sh.isUser && M.boost.coin && !ft) { M.coins += 12; GFX.burst(hp.x, CT.HOOP_Y, hp.z, [0xffd400, 0xffb300], 16, 3); SND.play('coin'); fx('float', hp.x, CT.HOOP_Y + 1.1, hp.z, '+12 🪙', 'coin'); }
    }
    return { team, sh, pts, dunk };
  }
  function afterBasket(r) {
    M.phase = 'scored'; M.phT = 1.5; M.ts = 1;
    for (const p of P) p.cele = p.team === r.team ? 1.5 : 0;
    const diff = Math.abs(M.score[0] - M.score[1]);
    const clutch = r.pts === 3 && M.q >= 4 && M.clock < 45 && diff <= 4;
    if (!M.headless && !M.auto && r.sh && ((r.dunk && (r.sh.isUser || Math.random() < 0.3)) || clutch)) M.replayIn = 0.55;
    M.next = () => {
      if (M.clock <= 0) return endPeriod();
      const other = 1 - r.team, sx = U.pick([-1, 1]) * 3.2, sz = dirOf(r.team) * (CT.HL + 0.45);
      const go = () => inbound(other, sx, sz, { sc: 24 });
      // a IA pede tempo técnico para frear uma sequência do adversário
      if (M.run.team === r.team && M.run.pts >= 8 && M.to[other] > 0 && !(other === 0 && !M.auto)) {
        M.to[other]--; M.boostT[other] = 25; M.run.pts = 0;
        return whistle('TEMPO TÉCNICO', (other ? CFG.t1 : CFG.t0).name, go, 2.4, 'info');
      }
      go();
    };
  }

  /* ---- apito, violações, faltas ---- */
  function cancelAim() { M.aim.on = false; M.ts = 1; }
  function whistle(txt, sub, next, delay = 1.7, kind = 'warn') {
    M.phase = 'whistle'; M.phT = delay; M.next = next; cancelAim(); snd('whistle'); fx('banner', txt, sub, kind);
    for (const p of P) { if (p.st !== 'free') { p.st = 'free'; p.y = 0; } p.dx = p.dz = 0; p.react = 0; p.drive = 0; }
    if (B.state === 'pass') { B.state = 'loose'; B.vx = B.vy = B.vz = 0; }
    M.userShot = false;
  }
  function sideSpot(x, z) {                              // ponto de reposição mais próximo
    if (Math.abs(z) > CT.HL - 0.5 && Math.abs(x) < CT.HW - 0.5) return { x: U.clamp(Math.abs(x) < 2.6 ? Math.sign(x || 1) * 2.6 : x, -6.5, 6.5), z: Math.sign(z) * (CT.HL + 0.45) };
    return { x: Math.sign(x || 1) * (CT.HW + 0.45), z: U.clamp(z, -12.5, 12.5) };
  }
  function violation(name, p, sub) {
    const team = p.team; p.to++; dbg('v_' + name);
    const s = sideSpot(B.x, B.z);
    whistle(name, sub + (p.isUser ? ' · posse do adversário' : ''), () => inbound(1 - team, s.x, s.z, { sc: 24 }), 1.7, team === 0 ? 'bad' : 'good');
  }
  function outOfBounds() {
    const team = 1 - (B.lastTeam < 0 ? 0 : B.lastTeam), s = sideSpot(B.x, B.z), keep = team === M.poss && !B.fromShot;
    dbg('out');
    whistle('BOLA FORA', `Reposição: ${(team ? CFG.t1 : CFG.t0).name}`, () => inbound(team, s.x, s.z, { sc: keep ? Math.max(M.shotClock, 5) : 24 }), 1.3, 'info');
  }
  function foul(f, v, type, o = {}) {
    f.fouls++; M.tf[f.team]++; dbg('foul_' + type);
    const sub = `${f.isUser ? 'VOCÊ' : f.name} · ${f.fouls}ª falta`;
    if (type === 'shooting') {
      M.pf = { f: f.id, v: v.id, pts: o.pts, made: false };
      M.phase = 'foulfly'; M.phT = 0; cancelAim(); snd('whistle'); fx('banner', 'FALTA!', sub, f.team === 0 ? 'bad' : 'good');
      for (const p of P) { p.dx = p.dz = 0; p.react = 0; }
      return;
    }
    if (type === 'offensive') {
      f.to++; const s = sideSpot(B.x, B.z);
      return whistle('FALTA DE ATAQUE', sub, () => { foulOut(f); inbound(1 - f.team, s.x, s.z, { sc: 24 }); }, 1.9, f.team === 0 ? 'bad' : 'good');
    }
    const bonus = M.tf[f.team] > 4, s = sideSpot(B.x, B.z), sc = M.front ? Math.max(M.shotClock, 14) : 24;
    whistle('FALTA!', sub + (bonus ? ' · BÔNUS: 2 lances livres' : ''), () => {
      foulOut(f);
      if (bonus) startFT(v.id, 2); else inbound(v.team, s.x, s.z, { sc });
    }, 1.9, f.team === 0 ? 'bad' : 'good');
  }
  // 5 faltas: jogador eliminado e substituído por um reserva
  function foulOut(f) {
    if (f.fouls < 5) return;
    dbg('foulout');
    const t = f.team ? CFG.t1 : CFG.t0, wasUser = f.isUser;
    if (wasUser) { M.userFinal = statsOf(f); M.userOut = true; f.isUser = false; }
    const num = U.randi(40, 99);
    Object.assign(f, { name: rndName(), num, look: rndLook(t, num), fouls: 0, pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, tpm: 0, tpa: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, to: 0, dunks: 0 });
    for (const k in f.sk) f.sk[k] = Math.max(0.35, f.sk[k] - 0.08);
    if (!M.headless) { GFX.disposeModel(MODELS[f.id]); MODELS[f.id] = GFX.makeModel(f.look); fx('fouledOut', wasUser, f.name); }
  }

  /* ---- reposição de bola ---- */
  function inbound(team, sx, sz, o = {}) {
    M.phase = 'inbound'; M.phT = 0; M.poss = team; M.scOff = false; M.clockHold = true; M.ts = 1; M.front = false; M.backT = 0;
    if (o.sc !== undefined) M.shotClock = o.sc;
    const base = Math.abs(sz) > CT.HL;
    const ps = P.find((p) => p.team === team && p.role === (base ? 3 : 2)), rc = P.find((p) => p.team === team && p.role === 0);
    let rx, rz;
    if (base) { rx = U.clamp(sx * 0.4, -3, 3); rz = sz - Math.sign(sz) * 4.2; }
    else { rx = sx - Math.sign(sx) * 3.6; rz = U.clamp(sz - dirOf(team) * 1.3, -12.5, 12.5); }
    M.inb = { team, sx, sz, ps: ps.id, rc: rc.id, rx, rz };
    for (const p of P) { p.st = 'free'; p.y = 0; p.paintT = 0; p.react = 0; p.cele = 0; p.drive = 0; }
    B.state = 'held'; B.holder = ps.id; B.fromShot = false; B.shooter = -1; ps.drib = 'hold';
  }
  function updInbound(dt) {
    const I = M.inb, ps = P[I.ps], rc = P[I.rc]; M.phT += dt;
    let d1 = 0, d2 = 0;
    for (const p of P) {
      if (p === ps) d1 = moveTo(p, I.sx, I.sz, 2, true);
      else if (p === rc) d2 = moveTo(p, I.rx, I.rz, 1.8);
      else { ai(p, dt); p.dx *= 1.35; p.dz *= 1.35; }
    }
    movePlayers(dt); holdBall(dt);
    if ((M.phT > 1 && d1 < 0.3 && d2 < 0.6) || M.phT > 2.8) {
      if (d1 >= 0.3) { ps.x = I.sx; ps.z = I.sz; }
      if (d2 >= 0.6) { rc.x = I.rx; rc.z = I.rz; }
      holdBall(0); M.phase = 'live'; startPass(ps, rc, { inb: true, safe: true });
    }
  }

  /* ---- lances livres ---- */
  function startFT(sid, n) {
    const s = P[sid], t = s.team; cancelAim();
    M.phase = 'ft'; M.poss = t; M.scOff = false;
    const pos = {}, lane = [[-2.85, 1.9], [2.85, 1.9], [2.85, 3.95], [-4.2, 9.4], [4.4, 9.8]], off = [[-2.85, 2.95], [2.85, 2.95], [-1.8, 10], [1.6, 10.6]];
    P.filter((p) => p.team !== t).sort((a, b) => b.role - a.role).forEach((p, i) => { pos[p.id] = spotPos(t, lane[i][0], lane[i][1]); });
    P.filter((p) => p.team === t && p !== s).sort((a, b) => b.role - a.role).forEach((p, i) => { pos[p.id] = spotPos(t, off[i][0], off[i][1]); });
    pos[sid] = spotPos(t, 0, CT.FT_D + 0.25);
    M.ft = { s: sid, n, i: 0, made: 0, st: 'setup', t: 0, pos };
    for (const p of P) { p.st = 'free'; p.y = 0; p.cele = 0; }
    B.state = 'held'; B.holder = sid; s.drib = 'hold'; M.ftIn = null;
  }
  function ftShoot(long, lat) {
    const f = M.ft, s = P[f.s], h = hoopOf(s.team);
    s.st = 'shoot'; s.stT = 0.2; s.sh = { type: 'jump', rel: true, pts: 1 };
    const hp = heldPos(s); let ux = h.x - hp.x, uz = h.z - hp.z; const l = Math.hypot(ux, uz); ux /= l; uz /= l;
    Phys.launch(B, hp.x, hp.y, hp.z, h.x + ux * long - uz * lat, CT.HOOP_Y, h.z + uz * long + ux * lat, 0.93);
    Object.assign(B, { state: 'shot', holder: -1, shooter: s.id, pts: 1, rim: false, fromShot: true, ft: true, dunk: false, lastTouch: s.id, lastTeam: s.team, noGrab: 0 });
    s.fta++; fx('ftShow', false);
    if (f.i === f.n - 1 && M.clock > 0) { M.phase = 'live'; M.scOff = true; M.clockHold = true; M.ft = null; }   // último lance: bola viva no rebote
    else { f.st = 'fly'; f.t = 0; f.scored = false; }
  }
  function updFT(dt) {
    const f = M.ft, s = P[f.s], h = hoopOf(s.team); f.t += dt;
    for (const p of P) { const g = f.pos[p.id]; if (p.st === 'free') { moveTo(p, g.x, g.z, 1.7); if (Math.hypot(p.dx, p.dz) < 0.5) faceTo(p, h.x, h.z, 0.2); } else p.dx = p.dz = 0; }
    updStates(dt); movePlayers(dt);
    if (f.st === 'setup') {
      holdBall(dt);
      if (f.t > 1.7) { const g = f.pos[s.id]; s.x = g.x; s.z = g.z; s.vx = s.vz = 0; s.rot = Math.atan2(h.x - s.x, h.z - s.z); f.st = 'aim'; f.t = 0; M.ftIn = null; if (isCtl(s)) fx('ftShow', true, f.i + 1, f.n); }
    } else if (f.st === 'aim') {
      s.st = 'aim'; holdBall(dt);
      if (isCtl(s) && !M.headless) {
        if (M.ftIn || f.t > 12) {
          const a = M.ftIn || { aim: U.rand(-0.6, 0.6), pow: U.rand(-0.6, 0.6) }, gz = 0.17 + CFG.tlvl * 0.008 + (M.boost.nose ? 0.06 : 0);
          const sc = (e) => (Math.abs(e) < gz ? e * 0.1 : e);
          if (Math.abs(a.aim) < gz && Math.abs(a.pow) < gz) fx('float', s.x, 2.6, s.z, 'PERFEITO!', 'good');
          ftShoot(sc(a.pow) * 0.5 + U.gauss() * 0.03, sc(a.aim) * 0.34 + U.gauss() * 0.025);
        }
      } else if (f.t > 0.9) {
        if (Math.random() < 0.5 + 0.38 * s.sk.sh) ftShoot(U.gauss() * 0.035, U.gauss() * 0.03);
        else { const a = Math.random() * 6.28, r = U.rand(0.17, 0.3); ftShoot(Math.cos(a) * r, Math.sin(a) * r * 0.7); }
      }
    } else if (f.st === 'fly') {
      const ev = {}; Phys.step(B, dt, ev); ballFx(ev);
      if (ev.rim || ev.board) B.rim = true;
      if (ev.score !== undefined && !f.scored) { f.scored = true; f.made++; scoreBasket(ev.score); }
      if (f.scored ? f.t > 1.1 : (B.y < 1.2 && f.t > 0.6) || f.t > 3) {
        f.i++;
        if (f.i >= f.n) { M.ft = null; return endPeriod(); }       // só chega aqui com o relógio zerado
        f.st = 'setup'; f.t = 1.0; B.state = 'held'; B.holder = s.id; s.st = 'free'; s.drib = 'hold';
      }
    }
  }

  /* ---- bola ao alto, períodos, fim ---- */
  function updTip(dt) {
    M.phT += dt; const t = M.phT;
    for (const p of P) p.dx = p.dz = 0;
    updStates(dt);
    B.x = 0; B.z = 0;
    if (t < 0.9) B.y = 1.3;
    else { const u = t - 0.9; B.y = 1.3 + 7.2 * u - 0.5 * CT.G * u * u; }
    if (t > 1.5) for (const p of P) if (p.role === 4 && p.st === 'free' && !p.tipJ) { p.st = 'jump'; p.stT = 0; p.tipJ = 1; }
    if (t >= 1.95) {
      const c0 = P[4], c1 = P[9], w = Math.random() < 0.5 + (c0.sk.rb - c1.sk.rb) * 0.8 ? 0 : 1;
      M.arrow = 1 - w; M.poss = -1; M.phase = 'live'; M.clockHold = true;
      B.lastTeam = w; B.lastTouch = w ? 9 : 4;
      startPass(null, P[w * 5], { safe: true });
    }
  }
  function endPeriod() {
    snd('buzzer'); cancelAim(); M.ft = null; M.pf = null; fx('ftShow', false);
    for (const p of P) { p.st = 'free'; p.y = 0; p.dx = p.dz = 0; }
    if (M.q >= 4 && M.score[0] !== M.score[1]) { M.phase = 'end'; return finish(); }
    M.phase = 'qbreak';
    if (M.headless) nextPeriod(); else fx('period', M.q, M.score.slice());
  }
  function nextPeriod() {
    M.q++; M.clock = M.q > 4 ? Math.round(M.qlen / 2) : M.qlen;
    if (M.q <= 4) M.tf = [0, 0];                         // prorrogação é extensão do 4º quarto (faltas continuam)
    if (M.q === 3) M.to = [3, 3]; if (M.q > 4) M.to = [1, 1];
    const t = M.arrow; M.arrow = 1 - t;                  // seta de posse alternada
    inbound(t, -(CT.HW + 0.45), 0, { sc: 24 });
  }
  function statsOf(p) { return { pts: p.pts, ast: p.ast, reb: p.reb, stl: p.stl, blk: p.blk, tpm: p.tpm, tpa: p.tpa, fgm: p.fgm, fga: p.fga, ftm: p.ftm, fta: p.fta, to: p.to, dunks: p.dunks, fouls: p.fouls }; }
  function userStats() { const u = user(); return M.userFinal || (u ? statsOf(u) : statsOf(P[0])); }
  function goalVal(stat) {
    const s = userStats();
    return stat === 'def' ? s.stl + s.blk : stat === 'dunk' ? s.dunks : stat === 'win' ? (M.ended && M.score[0] > M.score[1] ? 1 : 0) : s[stat] || 0;
  }
  function finish() {
    if (M.ended) return; M.ended = true;
    const s = userStats(), win = M.score[0] > M.score[1];
    const rating = U.clamp(5 + s.pts * 0.16 + s.ast * 0.4 + s.reb * 0.25 + (s.stl + s.blk) * 0.5 - s.to * 0.35 - (s.fga - s.fgm) * 0.12 + (win ? 0.8 : -0.3), 3, 10);
    const res = {
      score: M.score.slice(), win, user: s, rating, ot: M.q > 4, coins: M.coins,
      goals: (CFG.goals || []).map((g) => ({ g, val: goalVal(g.stat), done: goalVal(g.stat) >= g.goal })),
      box: P.filter((p) => !p.isUser).sort((a, b) => b.pts - a.pts).slice(0, 3).map((p) => ({ name: p.name, team: p.team, pts: p.pts })),
      dbg: M.dbg,
    };
    if (!M.headless) { SND.play(win ? 'win' : 'lose'); for (const p of P) p.cele = p.team === (win ? 0 : 1) ? 99 : 0; }
    if (onEnd) onEnd(res);
  }
  function timeout(team) {
    if (M.to[team] <= 0) return 'Sem tempos técnicos restantes';
    if (!(M.phase === 'live' && B.state === 'held' && P[B.holder].team === team)) return 'Só com a posse de bola do seu time';
    M.to[team]--; M.boostT[team] = 25; M.run.pts = 0;
    const s = sideSpot(B.x, B.z), sc = M.shotClock;
    s.x = Math.sign(B.x || 1) * (CT.HW + 0.45); s.z = U.clamp(B.z, -12.5, 12.5);
    whistle('TEMPO TÉCNICO', (team ? CFG.t1 : CFG.t0).name + ' · precisão extra por 25s', () => inbound(team, s.x, s.z, { sc }), 2.4, 'info');
    return '';
  }

  /* ---- IA ---- */
  function ai(p, dt) {
    if (B.state === 'held' && B.holder === p.id) return aiHandler(p, dt);
    if (B.state === 'shot' || B.state === 'loose' || M.poss < 0) return aiRebound(p, dt);
    if (M.poss === p.team) return aiOffBall(p, dt);
    return aiDefender(p, dt);
  }
  function bestPass(p) {
    const h = hoopOf(p.team), d = U.dist(p.x, p.z, h.x, h.z); let best = null, bs = 0.9;
    for (const q of P) {
      if (q.team !== p.team || q === p || q.st !== 'free') continue;
      if (M.front && frontState(q.team, q.z) < 1) continue;
      const dd = U.dist(p.x, p.z, q.x, q.z); if (dd < 1.5 || dd > 13 || laneOpen(p, q) < 0.8) continue;
      const hq = U.dist(q.x, q.z, h.x, h.z);
      const s = Math.min(nearestOpp(q).d, 3) * 0.5 + (hq < d ? 0.5 : 0) + (q.cutT > 0 && hq < 4.5 ? 1 : 0) + (isCtl(q) ? 1 : 0) + Math.random() * 0.8;
      if (s > bs) { bs = s; best = q; }
    }
    return best;
  }
  function aiHandler(p, dt) {
    const h = hoopOf(p.team), dir = dirOf(p.team), d = U.dist(p.x, p.z, h.x, h.z);
    p.holdT += dt; p.aiT -= dt; p.drib = 'drib';
    const nd = nearestOpp(p), urgent = M.shotClock < 3.5 || M.clock < 2.5, live = M.phase === 'live';
    if (p.drive > 0) {
      p.drive -= dt; moveTo(p, h.x + (p.x > 0 ? 0.5 : -0.5), h.z - dir * 0.9, 1);
      if (d < 3.3 && live) return startLay(p);
    } else if (!M.front) { const s = spotPos(p.team, p.role ? (p.x > 0 ? 3 : -3) : 0, 9.8); moveTo(p, s.x, s.z, 0.95); }
    else {
      const S = SPOTS[p.spot], s = spotPos(p.team, S[0], S[1]); let tx = s.x + Math.sin(M.time * 1.3 + p.id) * 1.2; const tz = s.z + Math.cos(M.time * 1.1 + p.id) * 0.8;
      if (inPaint(p.team, tx, tz) || p.paintT > 1.2) tx = (p.x >= 0 ? 1 : -1) * 3.1;       // não ficar parado no garrafão (3 segundos)
      moveTo(p, tx, tz, p.paintT > 1.2 ? 1 : 0.5);
    }
    if (p.paintT > 1.9 && live && p.drive <= 0) { if (d < 4.2) return startLay(p); }
    if (!live || (p.aiT > 0 && !urgent)) return;
    p.aiT = U.rand(0.3, 0.6);
    const u = user();
    if (u && isCtl(u) && u.team === p.team && M.callT > 0 && u.st === 'free' && laneOpen(p, u) > 0.6 && !(M.front && frontState(u.team, u.z) < 1)) { M.callT = 0; return startPass(p, u); }
    if (!M.front && !urgent) {                           // saída de bola: pivôs entregam ao armador
      const pg = P[p.team * 5];
      if (p.role >= 2 && pg.st === 'free' && laneOpen(p, pg) > 0.6 && U.dist(p.x, p.z, pg.x, pg.z) > 2) return startPass(p, pg);
      if (nd.d < 1.1 && M.backT > 4) { const t = bestPass(p); if (t) return startPass(p, t); }
      return;
    }
    if (d < 3.5 && (nd.d > 0.8 || urgent || Math.random() < 0.45)) return startLay(p);
    const three = d > CT.THREE_R;
    if (d < 8.4) {
      const q = three ? p.sk.th : p.sk.sh;
      let w = nd.d > 1.7 ? 0.42 + 0.4 * q : nd.d > 1.15 ? 0.13 : 0.03;
      if (three) w *= p.role >= 3 ? 0.3 : 0.8; else if (d > 4.6) w *= 0.6;
      if (urgent || Math.random() < w) return startShot(p, 0, 0);
    } else if (urgent) return startShot(p, 0, 0);
    if (laneClear(p) && Math.random() < 0.45) { p.drive = 1.8; return; }
    if (p.holdT > 0.8) { const t = bestPass(p); if (t && Math.random() < 0.65) return startPass(p, t); }
    if (nd.d < 0.9 && Math.random() < 0.004) return violation(Math.random() < 0.6 ? 'ANDADA!' : 'DRIBLE DUPLO!', p, p.name + ' se atrapalhou com a bola');
    if (nd.d < 1.4 && Math.random() < 0.1) p.drive = 1.2;    // tenta passar pelo marcador
  }
  function aiOffBall(p, dt) {
    if (B.state === 'pass' && B.passTo === p.id) { p.dx *= 0.3; p.dz *= 0.3; faceTo(p, B.x, B.z, 0.3); return; }
    p.spotT -= dt;
    if (p.cutT > 0) {                                    // corte para a cesta
      p.cutT -= dt; const s = spotPos(p.team, (p.id % 2 ? 1 : -1) * 0.9, 2.6); moveTo(p, s.x, s.z, 1);
      if (p.paintT > 1.8) p.cutT = 0;
      return;
    }
    const hd = B.state === 'held' ? P[B.holder] : null;
    let S = SPOTS[p.spot], s = spotPos(p.team, S[0], S[1]);
    if (p.spotT <= 0 || (hd && hd !== p && U.dist(s.x, s.z, hd.x, hd.z) < 2.3)) {
      p.spotT = U.rand(3, 6);
      if (M.front && Math.random() < 0.28 && p.paintT < 0.1) { p.cutT = 1.3; return; }
      const used = P.filter((q) => q.team === p.team && q !== p).map((q) => q.spot);
      const opts = ROLE_SPOTS[p.role].filter((i) => !used.includes(i) && !(hd && U.dist(spotPos(p.team, SPOTS[i][0], SPOTS[i][1]).x, spotPos(p.team, SPOTS[i][0], SPOTS[i][1]).z, hd.x, hd.z) < 2.3));
      if (opts.length) p.spot = U.pick(opts);
      S = SPOTS[p.spot]; s = spotPos(p.team, S[0], S[1]);
    }
    if (p.paintT > 1.5) { s.x = (p.x >= 0 ? 1 : -1) * 3.2; s.z = p.z; }                 // sai do garrafão pelo lado mais próximo
    if (moveTo(p, s.x, s.z, M.front && p.paintT < 1.2 ? 0.85 : 1) < 0.5) faceTo(p, B.x, B.z, 0.15);
  }
  function aiDefender(p, dt) {
    const m = P[p.man], h = hoopOf(m.team), hasBall = B.state === 'held' && B.holder === m.id;
    let ux = h.x - m.x, uz = h.z - m.z; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
    let tx, tz;
    if (hasBall) {
      const gap = l > 10.5 ? Math.min(l - 8.5, 5) : m.st === 'aim' || m.st === 'shoot' ? 0.72 : 1.05;
      tx = m.x + ux * gap; tz = m.z + uz * gap;
      p.cd -= dt;
      const dm = U.dist(p.x, p.z, m.x, m.z);
      if (M.phase === 'live' && p.cd <= 0 && dm < 1.3 && m.st === 'free') {      // tentativa de roubo
        p.cd = U.rand(0.9, 1.7);
        const r = Math.random(), ps = Math.max(0.002, 0.004 + 0.009 * p.sk.df - (m.crossT > 0 ? 0.02 : 0));
        if (r < ps) return steal(p, m);
        if (r < ps + 0.009) return foul(p, m, 'personal');
      }
    } else {
      const gap = U.clamp(U.dist(m.x, m.z, B.x, B.z) * 0.28, 1.1, 3);
      tx = m.x + ux * gap + (B.x - m.x) * 0.14; tz = m.z + uz * gap + (B.z - m.z) * 0.14;
      const hd = B.state === 'held' ? P[B.holder] : null;   // ajuda do garrafão em infiltrações
      if (hd && p.role >= 3 && hd.team !== p.team && U.dist(hd.x, hd.z, h.x, h.z) < 4.6 && U.dist(hd.x, hd.z, h.x, h.z) < l) {
        tx = h.x + (hd.x - h.x) * 0.35; tz = h.z + (hd.z - h.z) * 0.35;
      }
    }
    moveTo(p, tx, tz, 0.97 * (0.86 + 0.14 * p.sk.df));
    faceTo(p, m.x, m.z, 0.25);
  }
  function aiRebound(p, dt) {
    const d = U.dist(p.x, p.z, B.x, B.z);
    if (B.state === 'shot' && !B.rim && B.shooter >= 0) {     // bola no ar: bloqueio de rebote
      const st = P[B.shooter].team, h = hoopOf(st), dir = dirOf(st), off = p.team === st;
      if (off && p.role <= 1) { const s = spotPos(st, p.role ? 3 : -1, 11); return void moveTo(p, s.x, s.z, 0.8); }
      if (!off && p.role === 0) { const s = spotPos(st, 2.5, 6.8); return void moveTo(p, s.x, s.z, 0.8); }
      const a = (p.role - 2) * 0.6 + (off ? 0.22 : -0.1), r = off ? 2.3 : 1.45;
      moveTo(p, h.x + Math.sin(a) * r, h.z - dir * Math.cos(a) * r, 0.9);
      return;
    }
    if (d < 7 || p.role >= 2 || M.poss < 0) {
      moveTo(p, B.x + B.vx * 0.3, B.z + B.vz * 0.3, 1);
      if (p.st === 'free' && B.vy < 0 && B.y > 2.4 && B.y < 3.7 && d < 1.2 && Math.random() < dt * 9 * p.sk.rb) { p.st = 'jump'; p.stT = 0; }
    } else p.dx = p.dz = 0;
  }
  function steal(p, m) {
    p.stl++; m.to++; dbg('steal'); snd('steal');
    m.st = 'stun'; m.stT = 0; m.stunT = 0.5; m.lunge = false;
    fx('banner', 'ROUBADA!', p.isUser ? 'Você roubou a bola!' : p.name, p.team === 0 ? 'good' : 'bad');
    give(p, 'steal');
  }

  /* ---- controle do usuário ---- */
  function userControl(p, dt) {
    const j = Input.joy, mag = Math.hypot(j.x, j.y), has = B.state === 'held' && B.holder === p.id;
    if (p.st === 'aim') { p.dx = p.dz = 0; const h = hoopOf(0); faceTo(p, h.x, h.z, 0.3); return; }
    const sp = p.spd * (has ? 0.93 : 1) * (p.crossT > 0 ? 1.3 : 1);
    p.dx = j.x * sp; p.dz = j.y * sp;
    if (has) {
      p.holdT += dt;
      if (mag > 0.15 && p.drib === 'live') p.drib = 'drib';      // começa a driblar ao andar
      if (p.drib === 'dead') {                                   // bola presa: só o pé de apoio (2 passos)
        p.travelD += Math.hypot(p.vx, p.vz) * dt;
        if (p.travelD > 1.25) return violation('ANDADA!', p, 'Mais de dois passos sem driblar');
      }
      // alvo de passe: companheiro na direção do direcional (ou o mais livre)
      let best = -1, bs = -9; const h = hoopOf(0);
      for (const q of P) {
        if (q.team !== 0 || q === p) continue;
        const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1;
        const s = (mag > 0.3 ? ((dx * j.x + dz * j.y) / (l * mag)) * 3 : 0) + Math.min(nearestOpp(q).d, 3) * 0.3 - l * 0.04 - U.dist(q.x, q.z, h.x, h.z) * 0.03;
        if (s > bs) { bs = s; best = q.id; }
      }
      M.passTgt = best;
    } else M.passTgt = -1;
    if (!has && M.poss !== 0 && M.poss >= 0 && mag < 0.1) faceTo(p, B.x, B.z, 0.15);
  }
  // ações dos botões
  function act(a, arg) {
    const p = user(); if (!p || M.auto || M.phase !== 'live' || M.paused) return;
    const has = B.state === 'held' && B.holder === p.id;
    if (a === 'dribble' && has && p.st === 'free') {
      if (p.drib === 'dead') return violation('DRIBLE DUPLO!', p, 'Não pode voltar a driblar após segurar a bola');
      if (p.cd > 0) return;
      p.drib = 'drib'; p.crossT = 0.45; p.cd = 0.9; snd('squeak');
      const o = nearestOpp(p);                                   // drible desconcertante
      if (o.d < 1.5 && Math.random() < 0.4) { o.q.st = 'stun'; o.q.stT = 0; o.q.stunT = 0.6; o.q.lunge = false; fx('float', o.q.x, 2.2, o.q.z, 'DRIBLOU!', 'good'); }
    } else if (a === 'pass') {
      if (has && (p.st === 'free' || p.st === 'aim')) {
        const q = P[arg !== undefined ? arg : M.passTgt]; if (!q || q.team !== 0 || q === p) return;
        if (p.st === 'aim') { p.st = 'free'; cancelAim(); }
        startPass(p, q);
      } else if (!has && M.poss === 0) { M.callT = 1.3; fx('float', p.x, 2.4, p.z, 'PASSA!', 'info'); }
    } else if (a === 'layup' && has && p.st === 'free') {
      const h = hoopOf(0); if (U.dist(p.x, p.z, h.x, h.z) < 4.3) startLay(p);
    } else if (a === 'steal' && !has && p.st === 'free' && p.cd <= 0) {
      p.cd = 1; const hd = B.state === 'held' ? P[B.holder] : null;
      p.st = 'stun'; p.stT = 0; p.stunT = 0.32; p.lunge = true; snd('squeak');
      if (hd && hd.team !== 0 && U.dist(p.x, p.z, hd.x, hd.z) < 1.55 && hd.st !== 'lay') {
        const r = Math.random(), ps = 0.2 + 0.2 * p.sk.df + (hd.st !== 'free' ? -0.1 : 0);
        if (r < ps) steal(p, hd); else if (r > 0.86) foul(p, hd, 'personal');
      }
    } else if (a === 'jump' && p.st === 'free') { p.st = 'jump'; p.stT = 0; }
  }
  function canAim() { const p = user(); return !!p && !M.auto && M.phase === 'live' && !M.paused && B.state === 'held' && B.holder === p.id && p.st === 'free'; }
  function aimStart() {
    if (!canAim()) return false;
    const p = user();
    if (M.rewindLeft > 0) M.snapStr = snap();
    p.st = 'aim'; p.stT = 0; p.drib = 'dead'; M.aim = { on: true, p: 0, dev: 0 };
    if (M.boost.slow) M.ts = 0.3;
    return true;
  }
  function aimMove(pw, dev) { if (M.aim.on) { M.aim.p = U.clamp(pw, 0, 1.4); M.aim.dev = U.clamp(dev, -0.6, 0.6); } }
  function aimEnd(cancel) {
    const p = user(), a = M.aim; if (!a.on) return; a.on = false; M.ts = 1;
    if (!p || p.st !== 'aim') return;
    if (cancel || a.p < 0.3) { p.st = 'free'; return; }            // finta: o drible fica "morto"
    const h = hoopOf(0), d = U.dist(p.x, p.z, h.x, h.z), E = aimErr(a, d);
    startShot(p, E.long, E.lat);
    if (E.perfect) { snd('perfect'); fx('float', p.x, 2.7, p.z, 'PERFEITO!', 'good'); }
  }

  /* ---- movimento, estados, bola ---- */
  function movePlayers(dt) {
    for (const p of P) {
      if (p.st === 'lay') continue;
      if (p.st !== 'free') { p.dx = p.dz = 0; }
      let ax = p.dx - p.vx, az = p.dz - p.vz; const al = Math.hypot(ax, az), ma = 24 * dt;
      if (al > ma) { ax *= ma / al; az *= ma / al; }
      p.vx += ax; p.vz += az; p.x += p.vx * dt; p.z += p.vz * dt;
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0.8 && p.st === 'free' && !(M.poss >= 0 && M.poss !== p.team && !isCtl(p) && B.state === 'held')) faceTo(p, p.x + p.vx, p.z + p.vz, 1 - Math.exp(-dt * 12));
      const lim = isCtl(p) ? 0.7 : 1.2;
      p.x = U.clamp(p.x, -CT.HW - lim, CT.HW + lim); p.z = U.clamp(p.z, -CT.HL - lim, CT.HL + lim);
    }
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {       // colisão corpo a corpo
      const a = P[i], b = P[j]; if (a.st === 'lay' || b.st === 'lay') continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.74 && d > 1e-4) { const o = (0.74 - d) / 2, nx = dx / d, nz = dz / d; a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o; }
    }
  }
  function updStates(dt) {
    for (const p of P) {
      p.stT += dt; if (p.cd > 0 && !(B.state === 'held' && P[B.holder] && P[B.holder].id === p.man)) p.cd -= dt;
      if (p.crossT > 0) p.crossT -= dt; if (p.cele > 0) p.cele -= dt;
      if (p.react > 0) { p.react -= dt; if (p.react <= 0 && p.st === 'free') { p.st = 'jump'; p.stT = 0; } }
      if (p.drib === 'drib' && B.holder === p.id && B.state === 'held') {
        const a = p.dph; p.dph += dt * 12.5;
        if (Math.floor(a / Math.PI) !== Math.floor(p.dph / Math.PI)) snd('bounce', 0.35);
      }
      switch (p.st) {
        case 'shoot': {
          const h = hoopOf(p.team); p.y = jumpY(p.stT / 0.62, M.phase === 'ft' ? 0.12 : 0.5); faceTo(p, h.x, h.z, 0.4);
          if (!p.sh.rel && p.stT >= 0.26) { p.sh.rel = true; releaseShot(p); }
          if (p.stT >= 0.62) { p.st = 'free'; p.y = 0; }
          break;
        }
        case 'jump': p.y = jumpY(p.stT / 0.6, 0.8); if (p.stT >= 0.6) { p.st = 'free'; p.y = 0; } break;
        case 'lay': updLay(p, dt); break;
        case 'stun': if (p.stT >= p.stunT) p.st = 'free'; break;
      }
    }
  }
  function holdBall() { const p = P[B.holder]; if (!p) return; const hp = heldPos(p); B.x = hp.x; B.y = hp.y; B.z = hp.z; }
  function ballFx(ev) {
    if (M.headless) return;
    if (ev.floor) SND.play('bounce', ev.floor);
    if (ev.rim) { SND.play('rim', ev.rim); const k = B.z > 0 ? 1 : 0; GFX.hoops[k].shake = Math.max(GFX.hoops[k].shake, ev.rim * 0.6); GFX.hoops[k].kick(B.vx * 0.3, B.vz * 0.3, 0.15); }
    if (ev.board) SND.play('board');
  }
  function tryGrab() {
    if (B.noGrab > 0) return;
    if (B.state === 'shot' && !B.rim && !(B.vy < 0 && B.y < 2.6)) return;        // sem interferência no arremesso
    let best = null, bs = 0;
    for (const p of P) {
      if (p.st === 'stun' || p.st === 'lay' || p.st === 'shoot') continue;
      const d = U.dist(p.x, p.z, B.x, B.z), reach = p.y + 2.45 + (p.st === 'jump' ? 0.2 : 0);
      if (d < 0.85 && B.y < reach) {
        const s = (1.15 - d) * (0.6 + p.sk.rb) * (p.st === 'jump' ? 1.4 : 1) * U.rand(0.6, 1.4) * (isCtl(p) ? 1.3 : 1);
        if (s > bs) { bs = s; best = p; }
      }
    }
    if (best) give(best, B.fromShot ? 'reb' : 'pick');
  }
  function updBall(dt) {
    if (B.noGrab > 0) B.noGrab -= dt;
    if (B.state === 'held') return holdBall();
    if (B.state === 'pass') return updPass(dt);
    if (B.state === 'shot' || B.state === 'loose' || B.state === 'drop') {
      const ev = {}; Phys.step(B, dt, ev); ballFx(ev);
      if (B.state === 'drop') return;
      if (ev.rim || ev.board) B.rim = true;
      if (ev.floor && B.state === 'shot') { B.rim = true; }                       // tocou o chão: bola solta
      if (ev.score !== undefined) { const r = scoreBasket(ev.score); if (M.phase === 'live') afterBasket(r); return; }
      tryGrab();
    }
  }
  function rules(dt) {
    const h = B.state === 'held' ? P[B.holder] : null;
    if (h) {
      if (Math.abs(h.x) > CT.HW || Math.abs(h.z) > CT.HL) return violation('FORA!', h, 'Pisou fora da quadra');
      const fs = frontState(h.team, h.z);
      if (!M.front) { if (fs === 1) M.front = true; }
      else if (fs === -1) return violation('VOLTA DE QUADRA', h, 'Não pode voltar à quadra de defesa');
    }
    if (M.poss >= 0 && !M.scOff) {
      const any = h || P[M.poss * 5];
      if (!M.front && M.backT >= 8) return violation('8 SEGUNDOS', any, 'Demorou para passar do meio da quadra');
      if (M.shotClock <= 0 && B.state !== 'shot') return violation('24 SEGUNDOS', any, 'Estouro do relógio de posse');
    }
    const ctl = M.poss >= 0 && M.front && (B.state === 'held' || B.state === 'pass');
    for (const p of P) {
      if (ctl && p.team === M.poss && inPaint(p.team, p.x, p.z)) {
        p.paintT += dt;
        if (p.paintT >= 3 && p.st === 'free') { dbg('3s_r' + p.role + (B.holder === p.id ? '_ball' : '') + (p.cutT > 0 ? '_cut' : '') + (p.drive > 0 ? '_drv' : '') + (B.state === 'pass' ? '_pass' : '') + '_sp' + p.spot); return violation('3 SEGUNDOS', p, 'Tempo demais dentro do garrafão'); }
      } else p.paintT = 0;
    }
    if (B.state !== 'held' && B.state !== 'pass' && (Math.abs(B.x) > CT.HW + 0.15 || Math.abs(B.z) > CT.HL + 0.15)) outOfBounds();
  }
  function updLive(dt) {
    if (!M.clockHold) {
      M.clock = Math.max(0, M.clock - dt);
      if (M.poss >= 0 && !M.scOff) { M.shotClock -= dt; if (!M.front) M.backT += dt; }
      for (let t = 0; t < 2; t++) if (M.boostT[t] > 0) M.boostT[t] -= dt;
    }
    if (M.callT > 0) M.callT -= dt;
    for (const p of P) {
      if (p.st === 'free' || p.st === 'aim') { if (isCtl(p)) userControl(p, dt); else if (p.st === 'free') ai(p, dt); }
      if (M.phase !== 'live') return;
    }
    updStates(dt); if (M.phase !== 'live') return;
    movePlayers(dt); updBall(dt); if (M.phase !== 'live') return;
    rules(dt); if (M.phase !== 'live') return;
    if (M.clock <= 0 && B.state !== 'shot') endPeriod();
  }
  function idlePlayers(dt, physics = true) {
    for (const p of P) { p.dx = p.dz = 0; }
    updStates(dt); movePlayers(dt);
    if (B.state === 'held') holdBall(); else if (physics && B.state !== 'pass' && B.state !== 'dead') { const ev = {}; Phys.step(B, dt, ev); ballFx(ev); return ev; }
    return {};
  }
  function update(rdt) {
    if (M.replay) return updReplay(rdt);
    if (M.paused || !CFG) return;
    if (M.rewT > 0) M.rewT -= rdt;
    const dt = rdt * M.ts; M.time += dt;
    switch (M.phase) {
      case 'intro': M.phT -= rdt; if (M.phT <= 0) { M.phase = 'tip'; M.phT = 0; snd('whistle'); } break;
      case 'tip': updTip(dt); break;
      case 'live': updLive(dt); break;
      case 'scored':
        idlePlayers(dt); M.phT -= dt;
        if (M.replayIn > 0) { M.replayIn -= dt; if (M.replayIn <= 0) startReplay(); }
        if (M.phT <= 0) M.next();
        break;
      case 'whistle': idlePlayers(dt); M.phT -= dt; if (M.phT <= 0) M.next(); break;
      case 'foulfly': {                                   // falta no arremesso: espera a bola decidir
        M.phT += dt; const ev = idlePlayers(dt), f = M.pf;
        if (ev.rim || ev.board) B.rim = true;
        if (ev.score !== undefined && !f.made) { f.made = true; f.t = M.phT; scoreBasket(ev.score); fx('banner', 'CESTA E FALTA!', '+1 lance livre', P[f.v].team === 0 ? 'good' : 'bad'); }
        if (f.made ? M.phT > f.t + 1.2 : (B.rim && B.y < 2) || B.y < 0.4 || M.phT > 3.2) {
          M.pf = null; foulOut(P[f.f]); startFT(f.v, f.made ? 1 : f.pts);
        }
        break;
      }
      case 'inbound': updInbound(dt); break;
      case 'ft': updFT(dt); break;
    }
  }

  /* ---- retroceder (snapshot do estado) ---- */
  function snap() { const old = M.snapStr; M.snapStr = null; const str = JSON.stringify({ M, B, P }); M.snapStr = old; return str; }
  function rewind() {
    if (M.rewT <= 0 || !M.snapStr || M.rewindLeft <= 0) return false;
    const o = JSON.parse(M.snapStr), left = M.rewindLeft - 1;
    for (const k of Object.keys(M)) if (typeof M[k] !== 'function') delete M[k];
    Object.assign(M, o.M); Object.assign(B, o.B); o.P.forEach((d, i) => Object.assign(P[i], d));
    M.rewindLeft = left; M.snapStr = null; M.rewT = 0; M.next = null; M.replay = false; M.replayIn = 0;
    fx('banner', 'RETROCEDER!', 'Refaça a jogada', 'info'); snd('levelup');
    return true;
  }

  /* ---- replay: grava poses dos bonecos e reproduz em câmera lenta ---- */
  const REC = { buf: [], n: 0, i: 0, t: 0, MAX: 100, FR: 10 * 13 + 3 };
  let rp = null;
  function record(dt) {
    REC.t += dt; if (REC.t < 1 / 30) return; REC.t = 0;
    let f = REC.buf[REC.i]; if (!f) f = REC.buf[REC.i] = new Float32Array(REC.FR);
    let j = 0;
    for (let k = 0; k < 10; k++) {
      const m = MODELS[k], p = P[k]; f[j++] = p.x; f[j++] = p.y; f[j++] = p.z; f[j++] = p.rot;
      for (const key of GFX.POSE_KEYS) f[j++] = m.pose[key];
    }
    f[j++] = B.x; f[j++] = B.y; f[j++] = B.z;
    REC.i = (REC.i + 1) % REC.MAX; REC.n = Math.min(REC.MAX, REC.n + 1);
  }
  function startReplay() {
    if (REC.n < 40) return;
    const n = Math.min(REC.n, 84);
    rp = { n, k: 0, start: (REC.i - n + REC.MAX) % REC.MAX, hoop: B.z > 0 ? 1 : 0, ang: U.rand(-0.9, 0.9) };
    M.replay = true; fx('replay', true);
  }
  function updReplay(dt) {
    rp.k += dt * 30 * 0.5;
    if (rp.k >= rp.n - 1) return endReplay();
    const f = REC.buf[(rp.start + Math.floor(rp.k)) % REC.MAX]; let j = 0;
    for (let k = 0; k < 10; k++) {
      const m = MODELS[k]; m.g.position.set(f[j], f[j + 1], f[j + 2]); m.g.rotation.y = f[j + 3]; j += 4;
      for (const key of GFX.POSE_KEYS) m.pose[key] = f[j++];
      GFX.applyPose(m);
    }
    GFX.ball.position.set(f[j], f[j + 1], f[j + 2]);
    const h = GFX.hoops[rp.hoop], e = h.e, a = rp.ang + rp.k * 0.006;
    GFX.cam(h.x + Math.sin(a) * 6.5, 3.4, h.z - e * Math.cos(a) * 6.5, h.x, 2.5, h.z, 0.12);
  }
  function endReplay() { if (!M.replay) return; M.replay = false; rp = null; fx('replay', false); }

  /* ---- sincroniza o 3D com o estado lógico ---- */
  function sync(dt) {
    if (M.replay || !CFG) return;
    const u = user(), has = (p) => B.state === 'held' && B.holder === p.id;
    for (const p of P) {
      const m = MODELS[p.id], sp = Math.hypot(p.vx, p.vz); let mode = sp > 0.4 ? 'run' : 'idle';
      if (p.cele > 0 && (M.phase === 'scored' || M.phase === 'end')) mode = 'cele';
      else if (M.phase === 'end' && M.ended) mode = 'sad';
      else if (p.st === 'aim') mode = 'aim';
      else if (p.st === 'shoot') mode = p.sh && p.sh.rel ? 'shoot' : 'aim';
      else if (p.st === 'jump') mode = 'jump';
      else if (p.st === 'lay') mode = p.lay.type === 'dunk' ? 'dunk' : 'lay';
      else if (p.st === 'stun') mode = p.lunge ? 'lunge' : 'sad';
      else if (has(p)) mode = p.drib === 'drib' ? 'drib' : 'hold';
      else if (M.poss >= 0 && M.poss !== p.team && (M.phase === 'live' || M.phase === 'inbound') && U.dist(p.x, p.z, P[p.man].x, P[p.man].z) < 3.2) mode = 'def';
      GFX.animate(m, mode, sp, dt, p.dph);
      m.g.position.set(p.x, p.y, p.z); m.g.rotation.y = p.rot;
    }
    // árbitro acompanha a jogada pela lateral
    REF.tx = U.clamp(B.z + 3, -12, 12);
    const rz = REF.g.position.z, nz = rz + U.clamp(REF.tx - rz, -4 * dt, 4 * dt);
    GFX.animate(REF, Math.abs(nz - rz) > 0.01 ? 'run' : M.phase === 'whistle' ? 'jump' : 'idle', Math.abs(nz - rz) / Math.max(dt, 1e-3), dt);
    REF.g.position.set(8.1, 0, nz); REF.g.rotation.y = Math.abs(nz - rz) > 0.01 ? (nz > rz ? 0 : Math.PI) : -Math.PI / 2;
    // bola
    const bm = GFX.ball; bm.position.set(B.x, B.y, B.z); bm.rotation.x += (B.vz + (B.state === 'held' ? 3 : 0)) * dt * 4; bm.rotation.z -= B.vx * dt * 4;
    // marcadores
    const live = M.phase === 'live' || M.phase === 'inbound';
    GFX.setRing(GFX.userRing, !!u, u ? u.x : 0, u ? u.z : 0);
    GFX.star.visible = !!u; if (u) GFX.star.position.set(u.x, u.y + 2.25 + Math.sin(GFX.time * 4) * 0.05, u.z);
    const defending = u && live && M.poss === 1, man = u ? P[u.man] : null;
    GFX.setRing(GFX.manRing, !!defending, man ? man.x : 0, man ? man.z : 0);
    const pt = u && has(u) && M.passTgt >= 0 && M.phase === 'live' && !M.auto ? P[M.passTgt] : null;
    GFX.setRing(GFX.passRing, !!pt, pt ? pt.x : 0, pt ? pt.z : 0);
    const fl = [];
    if (pt && !M.aim.on) for (let i = 1; i < 14; i++) { const t = i / 14; fl.push([U.lerp(u.x, pt.x, t), 0.04, U.lerp(u.z, pt.z, t), 1]); }
    // mira do arremesso: seta de força + cone pontilhado + arco da trajetória
    if (u && M.aim.on && u.st === 'aim') {
      const r = aimViz(u.x, u.z, heldPos(u), M.aim, !!M.boost.aim, fl);
      fx('aimLabel', true, r.x, r.y, Math.round(M.aim.p * 100), r.good, isThree(0, u.x, u.z));
    } else { GFX.setArrow(false); GFX.traj([]); fx('aimLabel', false); }
    GFX.floor(fl);
    // câmera isométrica acompanhando a jogada
    const ftU = M.phase === 'ft' && M.ft && isCtl(P[M.ft.s]) && M.ft.st !== 'setup';
    if (ftU) { const s = P[M.ft.s]; GFX.setFov(46); GFX.cam(s.x, 4.3, s.z + 5.2, 0, 2.7, -CT.HOOP_Z, 1 - Math.exp(-dt * 4)); }
    else {
      let cx = B.x, cz = B.z;
      if (u) { cx = B.x * 0.55 + u.x * 0.45; cz = B.z * 0.55 + u.z * 0.45; }
      if (M.phase === 'tip' || M.phase === 'intro') { cx = 0; cz = 0; }
      cx = U.clamp(cx * 0.7, -4, 4); cz = U.clamp(cz, -10.5, 11);
      GFX.setFov(46);
      GFX.cam(cx, 15.5, cz + 12.5, cx, 0.6, cz - 1.8, 1 - Math.exp(-dt * 3.5));
    }
    if (M.phase === 'live' || M.phase === 'scored' || M.phase === 'foulfly') record(dt);
    GFX.setBoard(`${M.score[0]}  :  ${M.score[1]}`, U.hex(CFG.t0.c1), U.hex(CFG.t1.c1));
  }

  /* ---- informações para o HUD ---- */
  function view() {
    const u = user(), has = u && B.state === 'held' && B.holder === u.id, live = M.phase === 'live' && !M.auto && !!u;
    let mode = 'none';
    if (live) mode = has ? 'ball' : B.state === 'shot' || B.state === 'loose' ? 'loose' : M.poss === 0 ? 'off' : M.poss === 1 ? 'def' : 'loose';
    const h = hoopOf(0), dh = u ? U.dist(u.x, u.z, h.x, h.z) : 99;
    let hint = '';
    if (live && has && u.drib === 'dead' && u.st === 'free') hint = '✋ Bola presa! Passe ou arremesse';
    else if (live && u.paintT > 1.5) hint = `⚠️ Garrafão: ${(3 - u.paintT).toFixed(1)}s`;
    else if (live && has && !M.front && M.backT > 4.5) hint = `⚠️ Passe do meio: ${(8 - M.backT).toFixed(0)}s`;
    return {
      phase: M.phase, q: M.q, clock: M.clock, shotClock: M.shotClock, score: M.score, tf: M.tf, to: M.to, poss: M.poss, mode,
      near: has && dh < 4.3 && u.st === 'free', dunk: has && dh < 3.6, dead: has && u.drib === 'dead', hint, rewind: M.rewT > 0 && M.rewindLeft > 0,
      stats: userStats(), fouls: u ? u.fouls : 5, userOut: M.userOut, replay: M.replay, paused: M.paused, ended: M.ended,
      goals: (CFG.goals || []).map((g) => Math.min(g.goal, goalVal(g.stat))), boostT: M.boostT[0],
    };
  }
  // avança a partida sem render (simulação após eliminação / testes)
  function fastForward() {
    const hl = M.headless, au = M.auto; M.headless = true; M.auto = true; M.replay = false; M.paused = false;
    if (M.phase === 'qbreak') nextPeriod();
    let n = 0; while (!M.ended && n++ < 400000) update(1 / 30);
    M.headless = hl; M.auto = au;
  }
  function simulate(cfg) { let r = null; start(Object.assign({ headless: true, auto: true }, cfg), (x) => { r = x; }); fastForward(); return r; }
  function stop() { MODELS.forEach(GFX.disposeModel); MODELS = []; GFX.disposeModel(REF); REF = null; CFG = null; GFX.setArrow(false); GFX.traj([]); GFX.floor([]); GFX.setRing(GFX.userRing, false); GFX.setRing(GFX.manRing, false); GFX.setRing(GFX.passRing, false); GFX.star.visible = false; }
  function tapPass(sx, sy) {                              // toque num companheiro = passe
    const u = user(); if (!u || !(B.state === 'held' && B.holder === u.id)) return false;
    let best = -1, bd = 70;
    for (const q of P) if (q.team === 0 && q !== u) { const s = GFX.project(q.x, 1, q.z), d = Math.hypot(s.x - sx, s.y - sy); if (d < bd) { bd = d; best = q.id; } }
    if (best >= 0) { act('pass', best); return true; }
    return false;
  }
  return {
    start, update, sync, view, act, aimStart, aimMove, aimEnd, canAim, rewind, timeout, fastForward, simulate, stop, tapPass, endReplay,
    nextPeriod: () => { if (M.phase === 'qbreak') nextPeriod(); },
    ftInput: (aim, pow) => { M.ftIn = { aim, pow }; },
    pause: (v) => { M.paused = v; },
    userScreen: () => { const u = user(); return u ? GFX.project(u.x, 1, u.z) : null; },
    debug: { startFT, foul, violation, endPeriod, give, startLay },
    get cfg() { return CFG; }, get state() { return M; }, get players() { return P; }, get ball() { return B; }, get active() { return !!CFG; },
  };
})();

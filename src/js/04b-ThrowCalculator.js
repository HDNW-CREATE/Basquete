/* =====================================================================
   Arquivo 04b: ThrowCalculator — física do arremesso e assistência de mira
   Transforma o gesto (força, desvio lateral, giro) em um vetor 3D de
   velocidade para a bola. Não depende de tela nem de DOM: só matemática.

   Como funciona:
   1. FORÇA: a força da seta (0..1) vira velocidade em m/s. Essa velocidade
      NUNCA é alterada depois — a seta e a física usam o mesmo número.
   2. VETOR DO JOGADOR: direção até a cesta, girada pelo desvio lateral do
      swipe, com um ângulo de arco padrão.
   3. VETOR IDEAL: para aquela mesma velocidade, o ângulo de arco e a
      direção que fazem a bola cair dentro do aro (arco alto).
   4. MISTURA: vetor final = jogador × (1 - assistência) + ideal × assistência.
   5. CURVA: o giro vira uma força lateral contínua (efeito Magnus) durante
      o voo; o lançamento já sai um pouco "contra" a curva para compensar.
   ===================================================================== */
const ThrowCalculator = (() => {
  const G = CT.G, RAD = Math.PI / 180;

  // menor velocidade capaz de levar a bola a um alvo a d metros (horizontal) e dh metros acima
  const minSpeed = (d, dh) => Math.sqrt(G * (dh + Math.hypot(dh, d)));
  // ângulo de lançamento que usa essa menor velocidade (o arco "mais econômico")
  const cheapAngle = (d, dh) => Math.PI / 4 + 0.5 * Math.atan2(dh, d);
  // arco mais alto aceito pela assistência (perto da cesta pode ser mais alto)
  const maxAngle = (d) => U.clamp(80 - 2 * d, ARREMESSO.arcoMaximoLonge, ARREMESSO.arcoMaximoPerto) * RAD;
  // força (0..1) -> velocidade (m/s). É a ÚNICA conversão de força do jogo.
  // A curva é mais "macia" no meio (suavidadeForca) para a zona ideal não ficar estreita demais.
  function speedOf(force, d, dh) {
    const f = U.clamp(force, 0, 1), s = f + (ARREMESSO.suavidadeForca * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);
    return minSpeed(d, dh) * U.lerp(ARREMESSO.forcaMinima, ARREMESSO.forcaMaxima, s);
  }

  // ângulo (arco alto) para acertar o alvo com velocidade v; null se a velocidade não alcança
  function angleFor(v, d, dh) {
    const disc = v * v * v * v - G * (G * d * d + 2 * dh * v * v);
    return disc < 0 ? null : Math.atan((v * v + Math.sqrt(disc)) / (G * d));
  }
  // tempo até a bola cruzar a altura do aro DESCENDO (null se não chega lá)
  function timeToRim(v, ang, dh) {
    const vy = v * Math.sin(ang), disc = vy * vy - 2 * G * dh;
    return disc < 0 ? null : (vy + Math.sqrt(disc)) / G;
  }
  // desvio lateral do swipe com "zona reta": swipes quase retos contam como retos
  function deadZone(a) {
    const z = ARREMESSO.zonaReta, s = Math.sign(a), m = Math.abs(a);
    return m <= z ? a * 0.12 : s * (z * 0.12 + (m - z));
  }

  /* Calcula o lançamento.
     o = { x, y, z   posição da bola ao soltar (mundo)
           hx, hz    centro do aro
           force     força da seta, 0..1
           dev       desvio lateral do swipe em rad (0 = reto, + = para a direita)
           spin      giro da curva, -1..1 (+ = curva para a direita)
           assist    assistência final, 0..1
           nAng,nYaw ruído (rad) já sorteado — marcação do defensor, pressa etc. } */
  function compute(o) {
    const dx = o.hx - o.x, dz = o.hz - o.z, d = Math.hypot(dx, dz) || 0.01, dh = CT.HOOP_Y - o.y;
    const ux = dx / d, uz = dz / d;               // direção horizontal até a cesta
    const rx = -uz, rz = ux;                      // "direita" de quem olha para a cesta
    const force = U.clamp(o.force, 0, 1), a = U.clamp(o.assist, 0, 1), spin = U.clamp(o.spin || 0, -1, 1);
    const v = speedOf(force, d, dh);              // FORÇA APLICADA (m/s) — exatamente a da seta
    const aLat = spin * ARREMESSO.forcaCurva;     // aceleração lateral da curva (m/s²)

    // vetor "puro" do jogador
    const angP = cheapAngle(d, dh) + ARREMESSO.anguloExtraJogador * RAD;
    const yawP = deadZone(o.dev || 0) * ARREMESSO.sensibilidadeHorizontal;

    // vetor ideal para ESTA força: arco alto que cai no aro, limitado ao arco máximo
    let angI = angleFor(v, d, dh);
    if (angI === null) angI = cheapAngle(d, dh);  // força insuficiente: o melhor possível ainda é curto
    angI = Math.min(angI, maxAngle(d));
    // compensação da curva: sair um pouco para o lado contrário para a curva trazer a bola de volta
    let yawC = 0;
    if (aLat) {
      for (let i = 0; i < 8; i++) {               // aproximações sucessivas: sair de lado aumenta um pouco a distância efetiva
        const de = d / Math.cos(yawC), an = angleFor(v, de, dh), ang = Math.min(an === null ? cheapAngle(de, dh) : an, maxAngle(d));
        const t = timeToRim(v, ang, dh) || de / (v * Math.cos(ang));
        yawC = U.lerp(yawC, Math.asin(U.clamp((-0.5 * aLat * t) / (v * Math.cos(ang)), -0.5, 0.5)), 0.6);
        angI = ang;
      }
    }
    // mistura jogador x ideal (a força não entra na mistura: ela é sempre a do jogador)
    const ang = U.clamp(U.lerp(angP, angI, a) + (o.nAng || 0), 0.5, 1.4);
    const yaw = U.lerp(yawP + yawC * ARREMESSO.compensacaoCurva, yawC, a) + (o.nYaw || 0);

    const vh = v * Math.cos(ang), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const dirx = ux * cy + rx * sy, dirz = uz * cy + rz * sy;      // direção horizontal do lançamento
    const L = {
      x: o.x, y: o.y, z: o.z, vx: dirx * vh, vy: v * Math.sin(ang), vz: dirz * vh,
      cax: rx * aLat, caz: rz * aLat,             // força lateral contínua da curva
      force, speed: v, ang, yaw, dirx, dirz, d, spin, hx: o.hx, hz: o.hz,
    };
    // previsão: onde a bola cruza a altura do aro (em metros, em relação ao centro do aro)
    const t = timeToRim(v, ang, dh);
    if (t === null) { L.long = -9; L.lat = 0; L.zone = 'weak'; }
    else {
      L.long = vh * cy * t - d;                                    // + = passou do aro · - = ficou curta
      L.lat = vh * sy * t + 0.5 * aLat * t * t;                    // + = para a direita
      L.zone = L.long < -ARREMESSO.toleranciaCurta ? 'weak' : L.long > ARREMESSO.toleranciaLonga ? 'strong' : 'ideal';
    }
    return L;
  }

  // faixa de força "ideal" (amarela) para a situação atual: [início, fim] em 0..1
  function idealBand(o) {
    let lo = -1, hi = -1, best = 0.5, bd = 99;
    const q = Object.assign({}, o, { dev: 0 });
    for (let i = 0; i <= 50; i++) {
      q.force = i / 50; const L = compute(q), e = Math.abs(L.long);
      if (e < bd) { bd = e; best = q.force; }
      if (L.zone === 'ideal') { if (lo < 0) lo = q.force; hi = q.force; }
    }
    return lo < 0 ? [best - 0.01, best + 0.01] : [lo - 0.01, hi + 0.01];
  }

  return { compute, idealBand, minSpeed, cheapAngle, angleFor, speedOf };
})();

/* =====================================================================
   Arquivo 04a: InputSwipe — o GESTO do arremesso (dedo ou mouse)
   Só mede o movimento; não sabe nada de física nem de bola.
   - guarda as últimas posições do dedo com o horário de cada uma
     (janela de ~0,1 s) para calcular velocidade e direção do swipe;
   - FORÇA = tamanho do empurrão PARA CIMA × aproveitamento da velocidade.
     Arrastar para baixo/para trás ou parar o dedo zera a força;
   - desvio lateral do swipe = direção esquerda/direita;
   - movimento circular antes de soltar = giro da curva (curveball).
   Coordenadas: pixels dentro do palco (x → direita, y → para baixo).
   ===================================================================== */
const InputSwipe = (() => {
  const g = {
    id: -1,                 // dedo que está segurando a bola (-1 = nenhum)
    x: 0, y: 0,             // posição atual do dedo
    samples: [],            // amostras recentes: { x, y, t } (t em segundos)
    heard: 0,               // quando chegou o último movimento do dedo (para saber se ele parou)
    baseY: 0,               // onde o empurrão para cima atual começou
    px: 0, py: 0, hasDir: false, lx: 0, ly: 0,   // âncoras para medir o giro (movimento circular)
    turn: 0,                // ângulo acumulado do movimento circular (rad, com sinal)
    spin: 0,                // giro da curva já "carregado": -1..1
    force: 0, dev: 0, vx: 0, vy: 0, len: 0,      // última medição (ver measure)
  };
  const now = () => performance.now() / 1000;
  // horário do evento de toque (mais preciso que "agora": o navegador pode entregar vários eventos juntos)
  const stamp = (ts) => { const n = now(), t = ts / 1000; return ts > 0 && Math.abs(n - t) < 2 ? t : n; };
  const H = () => Math.max(1, GFX.size.H);

  // começa a segurar: zera as medições
  function begin(id, x, y, ts) {
    Object.assign(g, { id, x, y, baseY: y, px: x, py: y, hasDir: false, turn: 0, spin: 0, force: 0, dev: 0, vx: 0, vy: 0, len: 0 });
    g.samples = [{ x, y, t: stamp(ts) }]; g.heard = now();
  }

  function move(id, x, y, ts) {
    if (id !== g.id) return;
    const t = stamp(ts), dy = y - g.y;
    if (x === g.x && y === g.y) return;
    g.x = x; g.y = y; g.samples.push({ x, y, t }); g.heard = now();
    if (dy > 1.5) g.baseY = y;                     // voltou para baixo: o empurrão recomeça daqui
    // giro: soma o quanto a direção do movimento vira a cada ~8 px percorridos
    const mx = x - g.px, my = y - g.py;
    if (Math.hypot(mx, my) >= 8) {
      if (g.hasDir) g.turn += Math.atan2(g.lx * my - g.ly * mx, g.lx * mx + g.ly * my);
      g.lx = mx; g.ly = my; g.hasDir = true; g.px = x; g.py = y;
      const need = ARREMESSO.voltasParaCurva * 2 * Math.PI, a = Math.abs(g.turn);
      if (a >= need) {                             // completou o movimento circular: a bola começa a girar
        const lvl = U.clamp(0.5 + (a - need) / (2.5 * Math.PI), 0.5, 1), dir = Math.sign(g.turn);
        if (lvl > Math.abs(g.spin) || dir !== Math.sign(g.spin)) g.spin = dir * lvl;
      }
    }
    measure();
  }

  /* Mede o gesto no instante t. É a ÚNICA função que calcula a força:
     a seta na tela e o lançamento leem o mesmo g.force. */
  function measure() {
    const C = ARREMESSO, h = H(), s = g.samples;
    // janela: amostras dos últimos ~0,1 s antes da mais recente (sempre sobram pelo menos duas, se existirem)
    const b = s[s.length - 1];
    while (s.length > 2 && b.t - s[0].t > C.janelaAmostras) s.shift();
    const a = s[0], dt = b.t - a.t;
    // dedo parado (nenhum movimento novo há mais de uma janela) ou amostras velhas demais: velocidade zero
    if (s.length < 2 || dt < 0.003 || dt > 0.25 || now() - g.heard > C.janelaAmostras) { g.vx = g.vy = 0; } else { g.vx = (b.x - a.x) / dt; g.vy = (b.y - a.y) / dt; }
    const up = -g.vy / h;                           // velocidade para cima, em "telas por segundo"
    if (up <= 0.02) g.baseY = g.y;                  // dedo parado ou descendo: sem empurrão
    g.len = Math.max(0, g.baseY - g.y) / h;         // tamanho do empurrão para cima (fração da tela)
    if (up < C.velocidadeMinima) { g.force = 0; g.dev = 0; return g; }    // devagar demais: não gera força
    const k = U.clamp((up - C.velocidadeMinima) / Math.max(0.01, C.velocidadeCheia - C.velocidadeMinima), 0, 1);
    const quick = U.lerp(C.fatorSwipeLento, 1, k * k * (3 - 2 * k));     // aproveitamento pela velocidade
    g.force = U.clamp((g.len / C.comprimentoForcaTotal) * quick, 0, 1);
    g.dev = Math.atan2(g.vx, -g.vy);                // 0 = reto para cima · + = para a direita
    return g;
  }

  // solta: devolve a medição final (ou null se o dedo não era o que segurava)
  function end(id) {
    if (id !== g.id) return null;
    measure(); g.id = -1;
    return { force: g.force, dev: g.dev, spin: g.spin, valid: g.force >= ARREMESSO.forcaMinimaParaLancar };
  }
  function cancel() { g.id = -1; g.force = 0; g.spin = 0; g.turn = 0; }
  // o giro acumulado some aos poucos se o dedo parar de girar (evita curva "sem querer")
  function update(dt) {
    if (g.id < 0) return;
    if (Math.abs(g.turn) < ARREMESSO.voltasParaCurva * 2 * Math.PI) g.turn *= Math.exp(-dt * 0.9);
    measure();
  }

  return { begin, move, end, cancel, update, measure, get state() { return g; }, get holding() { return g.id >= 0; } };
})();

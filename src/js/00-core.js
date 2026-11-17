'use strict';
/* =====================================================================
   CUBOLA — Estrela das Quadras
   Jogo original de basquete em estilo "blocky" (low-poly).
   Arquivo 00: utilidades, constantes da quadra (FIBA), dados e save.
   ===================================================================== */

/* ---------- Utilidades ---------- */
const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  // número aleatório com distribuição normal (Box-Muller)
  gauss: () => {
    let u = 0;
    while (!u) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.28318 * Math.random());
  },
  dist: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
  // interpolação de ângulo pelo caminho mais curto
  angLerp(a, b, t) {
    const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return a + d * t;
  },
  hex: (c) => '#' + c.toString(16).padStart(6, '0'),
  fmt: (n) => Math.round(n).toLocaleString('pt-BR'),
  // distância de um ponto P ao segmento AB (plano XZ)
  segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-6;
    const t = U.clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
    return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
  },
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  today: () => new Date().toISOString().slice(0, 10),
  $: (s) => document.querySelector(s),
};

/* ---------- Medidas oficiais FIBA (metros, escala 1:1) ---------- */
const CT = {
  L: 28, W: 15, HL: 14, HW: 7.5,          // quadra 28 x 15
  HOOP_Y: 3.05,                           // altura do aro
  HOOP_Z: 14 - 1.575,                     // centro do aro a 1,575 m da linha de fundo
  BOARD_Z: 14 - 1.2,                      // face da tabela a 1,20 m da linha de fundo
  RIM_R: 0.225,                           // raio interno do aro (45 cm de diâmetro)
  BALL_R: 0.12,                           // raio da bola (tamanho 7)
  THREE_R: 6.75,                          // linha de 3 pontos
  THREE_SIDE: 6.6,                        // trecho reto: a 0,90 m da lateral
  PAINT_W: 2.45, PAINT_L: 5.8,            // garrafão 4,9 x 5,8
  FT_D: 5.8,                              // linha de lance livre a 5,8 m do fundo
  CIRCLE_R: 1.8,                          // círculos (central e lance livre)
  NOCHARGE_R: 1.25,                       // semicírculo sem carga
  G: 9.81,
};

/* ---------- Times fictícios da "Liga Cubo" ---------- */
const TEAMS = [
  { id: 0, name: 'Falcões da Serra',   short: 'FAL', c1: 0x2d8a5f, c2: 0xf6f3e4, stars: 2.5 },
  { id: 1, name: 'Piratas do Porto',   short: 'PIR', c1: 0x23232b, c2: 0xe5383b, stars: 2.5 },
  { id: 2, name: 'Trovão Azul',        short: 'TRO', c1: 0x1f6feb, c2: 0xffd23f, stars: 3.0 },
  { id: 3, name: 'Corujas Roxas',      short: 'COR', c1: 0x7b2cbf, c2: 0xffffff, stars: 3.0 },
  { id: 4, name: 'Lobos do Gelo',      short: 'LOB', c1: 0xdfeaf2, c2: 0x2b4a6f, stars: 3.5 },
  { id: 5, name: 'Tubarões da Baía',   short: 'TUB', c1: 0x0fa3b1, c2: 0xffffff, stars: 3.5 },
  { id: 6, name: 'Cometas Laranja',    short: 'COM', c1: 0xf77f00, c2: 0x10304a, stars: 4.0 },
  { id: 7, name: 'Dragões Rubros',     short: 'DRA', c1: 0xd7263d, c2: 0xfff1c1, stars: 4.0 },
  { id: 8, name: 'Jaguares Dourados',  short: 'JAG', c1: 0xf5b301, c2: 0x1a1a1a, stars: 4.5 },
  { id: 9, name: 'Titãs de Ferro',     short: 'TIT', c1: 0x5c677d, c2: 0xff5d5d, stars: 5.0 },
];
// Seleções (apenas nomes de países; sem federações reais)
const NATIONS = [
  { name: 'Argentina', short: 'ARG', c1: 0x74acdf, c2: 0xffffff, stars: 4.0 },
  { name: 'Espanha',   short: 'ESP', c1: 0xc60b1e, c2: 0xffc400, stars: 4.5 },
  { name: 'França',    short: 'FRA', c1: 0x1f3a93, c2: 0xffffff, stars: 4.5 },
  { name: 'Austrália', short: 'AUS', c1: 0x00843d, c2: 0xffcd00, stars: 4.0 },
  { name: 'Sérvia',    short: 'SRB', c1: 0xb2222d, c2: 0x0c4076, stars: 5.0 },
];
const BRAZIL = { name: 'Brasil', short: 'BRA', c1: 0xffd500, c2: 0x009739, stars: 4.5 };

const FIRST = ['Leo', 'Tico', 'Duda', 'Kadu', 'Beto', 'Zeca', 'Nino', 'Rafa', 'Juca', 'Davi', 'Igor', 'Caio', 'Theo', 'Bento', 'Ravi', 'Otto', 'Luca', 'Enzo', 'Gui', 'Max', 'Tom', 'Hugo'];
const LAST = ['Bloco', 'Cesta', 'Aro', 'Tabela', 'Quique', 'Ponte', 'Garra', 'Trovão', 'Rocha', 'Pulo', 'Vento', 'Faísca', 'Ginga', 'Mola', 'Pivô', 'Rede', 'Salto', 'Brasa'];
const rndName = () => U.pick(FIRST) + ' ' + U.pick(LAST);
const ROLE_NAMES = ['Armador', 'Ala-armador', 'Ala', 'Ala-pivô', 'Pivô'];

/* ---------- Aparência (customização) ---------- */
const SKINS = [0xf2c9a0, 0xe0a878, 0xc68642, 0x8d5524, 0x5c3a1e, 0xffdbc4];
const HAIR_COLORS = [0x2b1b12, 0x111111, 0xd9b44a, 0xe2553d, 0xf2f2f2, 0x3b82f6, 0x9d4edd, 0x38b000];
const HAIRS = [
  { name: 'Careca', cost: 0 }, { name: 'Flat-top', cost: 0 }, { name: 'Espetado', cost: 300 },
  { name: 'Moicano', cost: 300 }, { name: 'Black power', cost: 500 }, { name: 'Comprido', cost: 500 },
  { name: 'Boné', cost: 800 },
];
const FACES = [
  { name: 'Simpático', cost: 0 }, { name: 'Sério', cost: 0 }, { name: 'Bravo', cost: 250 },
  { name: 'Óculos', cost: 600 }, { name: 'Piscada', cost: 250 }, { name: 'Sorrisão', cost: 400 },
];
const SHOES = [
  { name: 'Branco', c: 0xf4f4f4, s: 0x9aa0a6, cost: 0 }, { name: 'Preto', c: 0x222222, s: 0xffffff, cost: 0 },
  { name: 'Vermelho', c: 0xe63946, s: 0xffffff, cost: 300 }, { name: 'Neon', c: 0xb5ff2b, s: 0x222222, cost: 500 },
  { name: 'Ouro', c: 0xffc93c, s: 0x7a4d00, cost: 900 }, { name: 'Céu', c: 0x4cc9f0, s: 0xf72585, cost: 700 },
];

/* ---------- Estilo de vida ---------- */
const LIFE = [
  { name: 'Colchonete', ic: '🛏️', cost: 0,     bonus: 'O começo de tudo' },
  { name: 'Bicicleta',  ic: '🚲', cost: 400,   bonus: 'Moedas +10% por partida', coin: 0.1 },
  { name: 'Cachorro',   ic: '🐶', cost: 800,   bonus: 'Popularidade +10 por vitória', pop: 10 },
  { name: 'Videogame',  ic: '🎮', cost: 1300,  bonus: 'Energia total +1', en: 1 },
  { name: 'Barraca',    ic: '⛺', cost: 2000,  bonus: 'Energia total +1 · requisito da Seleção', en: 1 },
  { name: 'Moto',       ic: '🛵', cost: 3000,  bonus: 'Popularidade +15 por vitória', pop: 15 },
  { name: 'Carro',      ic: '🚗', cost: 4200,  bonus: '+1 treino por rodada', train: 1 },
  { name: 'Apartamento',ic: '🏢', cost: 5800,  bonus: 'Energia total +1', en: 1 },
  { name: 'Academia',   ic: '🏋️', cost: 7600,  bonus: 'XP de treino +25%', txp: 0.25 },
  { name: 'Casa',       ic: '🏠', cost: 10000, bonus: 'Moedas +25% por partida', coin: 0.25 },
  { name: 'Mansão',     ic: '🏰', cost: 15000, bonus: 'Energia total +2 · Popularidade +25', en: 2, pop: 25 },
];
// soma de um bônus até o nível atual de estilo de vida
const lifeBonus = (k) => LIFE.slice(0, S.lifestyle).reduce((s, l) => s + (l[k] || 0), 0);

/* ---------- Melhorias (boosters) usadas antes da partida ---------- */
const BOOST = {
  coin:   { name: 'Arremesso de Moedas', ic: '🪙', cost: 50,  desc: 'Cada cesta sua rende +12 moedas nesta partida.' },
  slow:   { name: 'Câmera Lenta',        ic: '⏱️', cost: 150, desc: 'O tempo quase para enquanto você mira o arremesso.' },
  aim:    { name: 'Linha de Mira',       ic: '🎯', cost: 50,  desc: 'Mostra o arco que a bola vai fazer enquanto você empurra.' },
  nose:   { name: 'Faro de Cesta',       ic: '👟', cost: 200, desc: 'Seus arremessos ficam bem mais precisos.' },
  rewind: { name: 'Retroceder',          ic: '⏪', cost: 200, desc: 'Errou? Volte no tempo e refaça a jogada (1x).' },
};

/* ---------- Metas de partida, tarefas diárias, eventos, objetivos ---------- */
const GOAL_POOL = [
  { id: 'pts',   txt: 'Marque 10+ pontos',        stat: 'pts',   goal: 10, coins: 120 },
  { id: 'three', txt: 'Faça 3 cestas de 3',       stat: 'tpm',   goal: 3,  coins: 150 },
  { id: 'ast',   txt: 'Dê 3 assistências',        stat: 'ast',   goal: 3,  coins: 120 },
  { id: 'reb',   txt: 'Pegue 3 rebotes',          stat: 'reb',   goal: 3,  coins: 100 },
  { id: 'def',   txt: 'Faça 2 roubos ou tocos',   stat: 'def',   goal: 2,  coins: 140 },
  { id: 'dunk',  txt: 'Crave 1 enterrada',        stat: 'dunk',  goal: 1,  coins: 100 },
];
const TASK_POOL = [
  { id: 'play',  txt: 'Jogue 2 partidas',         goal: 2,  coins: 150 },
  { id: 'pts',   txt: 'Marque 25 pontos',         goal: 25, coins: 200 },
  { id: 'three', txt: 'Acerte 4 cestas de 3',     goal: 4,  coins: 200 },
  { id: 'train', txt: 'Complete 2 treinos',       goal: 2,  coins: 150 },
  { id: 'win',   txt: 'Vença 1 partida',          goal: 1,  gems: 5 },
  { id: 'ast',   txt: 'Dê 4 assistências',        goal: 4,  coins: 180 },
];
const EVENT_POOL = [
  { id: 'three', name: 'DIA DO TRIPLO',  ic: '🎯', desc: 'Acerte 6 cestas de 3 hoje para ganhar o prêmio.', goal: 6, gems: 10 },
  { id: 'win',   name: 'MARATONA',       ic: '🔥', desc: 'Vença 3 partidas hoje para ganhar o prêmio.',     goal: 3, gems: 15 },
  { id: 'def',   name: 'MURALHA',        ic: '🧱', desc: 'Some 4 roubos ou tocos hoje.',                    goal: 4, coins: 500 },
  { id: 'pts',   name: 'MÃO QUENTE',     ic: '🌶️', desc: 'Marque 40 pontos hoje somando as partidas.',      goal: 40, gems: 12 },
];
const OBJECTIVES = [
  { id: 'p50',  txt: 'Marque 50 pontos na carreira',     stat: 'pts',  goal: 50,  coins: 300 },
  { id: 'p250', txt: 'Marque 250 pontos na carreira',    stat: 'pts',  goal: 250, gems: 20 },
  { id: 'w5',   txt: 'Vença 5 partidas',                 stat: 'wins', goal: 5,   coins: 400 },
  { id: 'w20',  txt: 'Vença 20 partidas',                stat: 'wins', goal: 20,  gems: 30 },
  { id: 't20',  txt: 'Acerte 20 cestas de 3',            stat: 'tpm',  goal: 20,  coins: 500 },
  { id: 'a25',  txt: 'Dê 25 assistências',               stat: 'ast',  goal: 25,  coins: 400 },
  { id: 'd10',  txt: 'Crave 10 enterradas',              stat: 'dunk', goal: 10,  coins: 400 },
  { id: 'tr5',  txt: 'Chegue ao nível 5 de treino',      stat: 'train', goal: 5,  gems: 10 },
  { id: 'nat',  txt: 'Seja convocado para a Seleção',    stat: 'nat',  goal: 1,   gems: 25 },
  { id: 'camp', txt: 'Seja campeão da Liga Cubo',        stat: 'titles', goal: 1, gems: 50 },
];

/* ---------- Save (localStorage) ---------- */
const SAVE_KEY = 'cubola_save_v1';
let S = null;

// tabela de jogos: turno e returno (método do círculo)
function makeSchedule(n) {
  const ids = [...Array(n).keys()], rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const m = [];
    for (let i = 0; i < n / 2; i++) m.push(r % 2 ? [ids[n - 1 - i], ids[i]] : [ids[i], ids[n - 1 - i]]);
    rounds.push(m);
    ids.splice(1, 0, ids.pop());
  }
  return rounds.concat(rounds.map((r) => r.map(([a, b]) => [b, a])));
}

function newSeason(year) {
  const npcs = [];
  TEAMS.forEach((t) => { for (let i = 0; i < 2; i++) npcs.push({ name: rndName(), team: t.id, pts: 0, ast: 0, g: 0 }); });
  return {
    year, round: 0, schedule: makeSchedule(TEAMS.length),
    table: TEAMS.map((t) => ({ id: t.id, w: 0, l: 0, pf: 0, pa: 0 })),
    results: [],                       // resultados do jogador por rodada
    my: { g: 0, pts: 0, ast: 0, reb: 0, tpm: 0, rate: 0 },
    npcs,
  };
}

function defaultSave() {
  return {
    v: 1, coins: 500, gems: 20, energy: 10, energyTs: Date.now(),
    xp: 0, level: 1,                                  // popularidade
    training: { level: 1, xp: 0 }, trainLeft: 2,
    lifestyle: 1,
    look: { skin: 0, hair: 1, hairColor: 0, face: 0, shoes: 0, num: 7 },
    owned: { hair: [0, 1], face: [0, 1], shoes: [0, 1] },
    boosters: { coin: 2, slow: 1, aim: 2, nose: 0, rewind: 1 },
    teamId: 0, season: newSeason(1),
    career: { g: 0, wins: 0, pts: 0, ast: 0, reb: 0, tpm: 0, dunk: 0, def: 0, rate: 0, titles: 0 },
    national: { called: false, played: 0, wins: 0 },
    daily: null, claimed: {}, tutorial: false,
    settings: { sound: true, music: true, qlen: 120, shadows: true, arremesso: {} },   // arremesso: ajustes feitos em "Ajustar arremesso"
  };
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    S = raw ? Object.assign(defaultSave(), JSON.parse(raw)) : defaultSave();
  } catch (e) { S = defaultSave(); }
  ensureDaily();
  tickEnergy();
  aplicarAjustesArremesso();
}
function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* armazenamento indisponível */ }
}

/* ---------- Progressão ---------- */
const xpNeed = (lvl) => 200 + (lvl - 1) * 150;
function addXP(n) {
  S.xp += Math.round(n);
  let up = 0;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; S.gems += 5; up++; }
  return up;
}
const trainNeed = (lvl) => 60 + lvl * 30;
function addTrainXP(n) {
  n = Math.round(n * (1 + lifeBonus('txp')));
  S.training.xp += n;
  let up = 0;
  while (S.training.xp >= trainNeed(S.training.level) && S.training.level < 20) {
    S.training.xp -= trainNeed(S.training.level); S.training.level++; up++;
  }
  return { n, up };
}
const energyMax = () => 10 + lifeBonus('en');
const ENERGY_MS = 6 * 60 * 1000;          // 1 de energia a cada 6 minutos
function tickEnergy() {
  const max = energyMax();
  if (S.energy >= max) { S.energyTs = Date.now(); return; }
  const n = Math.floor((Date.now() - S.energyTs) / ENERGY_MS);
  if (n > 0) { S.energy = Math.min(max, S.energy + n); S.energyTs += n * ENERGY_MS; }
}
const maxTrain = () => 2 + lifeBonus('train');

// tarefas e evento do dia (renovam à meia-noite)
function ensureDaily() {
  const d = U.today();
  if (S.daily && S.daily.day === d) return;
  const tasks = U.shuffle(TASK_POOL.slice()).slice(0, 3).map((t) => ({ id: t.id, prog: 0, done: false }));
  S.daily = { day: d, tasks, event: { id: U.pick(EVENT_POOL).id, prog: 0, done: false }, login: false };
}
function dailyProgress(id, n) {
  if (!n) return;
  ensureDaily();
  S.daily.tasks.forEach((t) => { if (t.id === id) t.prog += n; });
  if (S.daily.event.id === id) S.daily.event.prog += n;
}
function grant(r) {                         // entrega recompensa {coins, gems}
  if (r.coins) S.coins += r.coins;
  if (r.gems) S.gems += r.gems;
}
const rewardTxt = (r) => (r.coins ? `🪙 ${r.coins}` : '') + (r.gems ? ` 💎 ${r.gems}` : '');

/* ---------- Liga: classificação e simulação das outras partidas ---------- */
function standings() {
  return S.season.table.slice().sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf);
}
const myPos = () => standings().findIndex((t) => t.id === S.teamId) + 1;
const posOf = (id) => standings().findIndex((t) => t.id === id) + 1;
function nextFixture() {
  const se = S.season;
  if (se.round >= se.schedule.length) return null;
  const m = se.schedule[se.round].find((x) => x[0] === S.teamId || x[1] === S.teamId);
  return { home: m[0] === S.teamId, opp: TEAMS[m[0] === S.teamId ? m[1] : m[0]] };
}
function simScore(a, b) {                   // placar simulado entre dois times
  let sa = Math.round(20 + TEAMS[a].stars * 3 + U.gauss() * 5), sb = Math.round(20 + TEAMS[b].stars * 3 + U.gauss() * 5);
  while (sa === sb) { sa += U.randi(0, 5); sb += U.randi(0, 5); }
  return [Math.max(8, sa), Math.max(8, sb)];
}
function applyResult(a, b, sa, sb) {
  const ta = S.season.table.find((t) => t.id === a), tb = S.season.table.find((t) => t.id === b);
  ta.pf += sa; ta.pa += sb; tb.pf += sb; tb.pa += sa;
  if (sa > sb) { ta.w++; tb.l++; } else { tb.w++; ta.l++; }
}
// fecha a rodada: registra o jogo do usuário e simula os demais
function finishRound(myScore, oppScore) {
  const se = S.season;
  se.schedule[se.round].forEach(([a, b]) => {
    if (a === S.teamId) applyResult(a, b, myScore, oppScore);
    else if (b === S.teamId) applyResult(a, b, oppScore, myScore);
    else { const [sa, sb] = simScore(a, b); applyResult(a, b, sa, sb); }
  });
  se.npcs.forEach((n, i) => {               // artilheiros fictícios acumulam números
    const st = TEAMS[n.team].stars;
    n.g++; n.pts += Math.max(0, Math.round((i % 2 ? 5 : 8) + st * 1.2 + U.gauss() * 3));
    n.ast += Math.max(0, Math.round((i % 2 ? 3 : 1.2) + U.gauss() * 1.2));
  });
  se.results.push([myScore, oppScore]);
  se.round++;
}
const seasonOver = () => S.season.round >= S.season.schedule.length;
const natReq = () => ({ pop: S.level >= 6, life: S.lifestyle >= 5, train: S.training.level >= 7 });

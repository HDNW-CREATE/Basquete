/* =====================================================================
   Arquivo 00a: AJUSTES DO ARREMESSO POR GESTO (o "Inspector" do jogo)
   Todas as variáveis de ajuste da mecânica de arremesso ficam aqui.
   - Para mudar o padrão do jogo: edite os valores de ARREMESSO_PADRAO.
   - Para testar sem mexer no código: no jogo, abra ⚙️ Ajustes >
     "Ajustar arremesso" (os valores ficam salvos no aparelho).
   Quem usa: InputSwipe (gesto), ThrowCalculator (física/assistência),
   BallController (estados da bola) e ShotFeedback (efeitos e interface).
   ===================================================================== */
const ARREMESSO_PADRAO = {
  /* ---------- GESTO (InputSwipe) ---------- */
  janelaAmostras: 0.10,          // s — quanto do fim do movimento entra no cálculo da velocidade do swipe
  comprimentoForcaTotal: 0.55,   // fração da ALTURA da tela: empurrão desse tamanho (e rápido) = 100% de força
  velocidadeMinima: 0.30,        // telas/s para cima — mais lento que isso não é arremesso (a bola cai)
  velocidadeCheia: 1.50,         // telas/s — a partir daqui a velocidade já dá o aproveitamento máximo
  fatorSwipeLento: 0.45,         // aproveitamento do empurrão quando ele é lento (1 = não importa a velocidade)
  forcaMinimaParaLancar: 0.12,   // 0..1 — abaixo disso a bola cai na frente do jogador e volta

  /* ---------- FORÇA (ThrowCalculator) ----------
     A força da seta (0..100%) vira velocidade assim:
       velocidade = velocidadeDeReferência × (forcaMinima → forcaMaxima)
     onde a velocidade de referência é a MENOR velocidade que alcança o aro daquele ponto. */
  forcaMinima: 0.52,             // multiplicador com a seta em 0%
  forcaMaxima: 1.42,             // multiplicador com a seta em 100% (limite para não haver arremesso absurdo)
  suavidadeForca: 0.50,          // 0 = força linear · maior = o meio da seta fica mais "macio" (zona ideal mais larga)

  /* ---------- DIREÇÃO ---------- */
  sensibilidadeHorizontal: 0.30, // quanto o desvio lateral do swipe vira a bola (0 = sempre reto)
  zonaReta: 0.06,                // rad — swipes quase retos contam como retos

  /* ---------- ASSISTÊNCIA DE MIRA ----------
     0 = só o vetor do jogador · 1 = sempre o arremesso ideal para a força aplicada.
     A assistência corrige ÂNGULO e DIREÇÃO; a força aplicada é sempre a da seta. */
  assistencia: 0.90,
  bonusBoa: 0.02,                // soma na assistência ao soltar com o círculo "BOA!"
  bonusOtimo: 0.05,              // idem "ÓTIMO!"
  bonusExcelente: 0.08,          // idem "EXCELENTE!"
  assistenciaMaxima: 0.98,
  anguloExtraJogador: 5,         // graus acima do arco mais econômico no vetor "puro" do jogador
  arcoMaximoPerto: 76,           // graus — arco mais alto que a assistência aceita perto da cesta
  arcoMaximoLonge: 66,           // graus — idem de longe
  toleranciaCurta: 0.05,         // m — até quanto a bola pode cair antes do centro do aro e a seta ainda ser "ideal"
  toleranciaLonga: 0.12,         // m — idem depois do centro do aro

  /* ---------- CURVA (efeito / curveball) ---------- */
  forcaCurva: 1.5,               // m/s² de força lateral contínua (efeito Magnus) com giro máximo
  voltasParaCurva: 0.70,         // voltas do dedo (movimento circular) para a bola começar a girar
  compensacaoCurva: 0.85,        // 0..1 — quanto o lançamento já sai "contra" a curva sem o jogador precisar mirar
  bonusCurvaMoedas: 15,          // partida: moedas extras por cesta com curva
  bonusCurvaPontos: 1,           // treino: pontos extras por cesta com curva

  /* ---------- CÍRCULO-ALVO SOBRE O ARO ---------- */
  tempoCicloCirculo: 1.4,        // s — tempo de um ciclo completo (grande → pequeno → grande)
  circuloMinimo: 0.20,           // tamanho do círculo no ponto mais fechado (1 = aberto)
  limiteExcelente: 0.38,         // soltar com o círculo menor que isso = EXCELENTE
  limiteOtimo: 0.62,             // ... = ÓTIMO
  limiteBoa: 0.86,               // ... = BOA

  /* ---------- BOLA NA MÃO (BallController) ---------- */
  distanciaBola: 0.95,           // m à frente da câmera em primeira pessoa
  tamanhoBolaNaMao: 0.62,        // tamanho da bola na mão (1 = tamanho real; menor para não tapar a cesta)
  alturaBola: -0.56,             // posição vertical de descanso na tela (-1 = base, 0 = centro)
  suavidadeSeguir: 16,           // quanto maior, mais "colada" no dedo a bola fica (lerp)
  flutuacaoAltura: 0.035,        // amplitude do sobe-e-desce parado (em fração de tela)
  flutuacaoVelocidade: 2.4,      // velocidade do sobe-e-desce
  giroParado: 0.7,               // rad/s — giro lento da bola parada
  tempoReaparecer: 0.45,         // s — a bola nova sobe da base da tela
  tempoSumirErro: 2.0,           // s — bola que errou quica e some depois desse tempo

  /* ---------- VOO ---------- */
  giroBackspin: 10,              // rad/s — giro para trás durante o voo
  rastroPontos: 16,              // tamanho do rastro atrás da bola

  /* ---------- RITMO DA PARTIDA ---------- */
  tempoMira: 0.45,               // velocidade do jogo enquanto você mira (1 = normal)
  tempoMiraCameraLenta: 0.15,    // idem com a melhoria "Câmera Lenta"

  /* ---------- TEXTOS ---------- */
  textoBoa: 'BOA!', textoOtimo: 'ÓTIMO!', textoExcelente: 'EXCELENTE!', textoCurva: 'CURVA!',
};

// Valores em uso (padrão + o que o jogador mudou em Ajustes)
const ARREMESSO = Object.assign({}, ARREMESSO_PADRAO);

// Controles mostrados na tela "Ajustar arremesso": [chave, rótulo, mínimo, máximo, passo]
const ARREMESSO_CONTROLES = [
  ['forcaMinima', 'Força mínima', 0.3, 0.9, 0.01],
  ['forcaMaxima', 'Força máxima', 1.1, 2.0, 0.01],
  ['suavidadeForca', 'Tolerância da força', 0, 0.8, 0.01],
  ['comprimentoForcaTotal', 'Tamanho do swipe p/ 100%', 0.25, 0.8, 0.01],
  ['sensibilidadeHorizontal', 'Sensibilidade horizontal', 0, 1, 0.01],
  ['assistencia', 'Assistência de mira', 0, 1, 0.01],
  ['forcaCurva', 'Força da curva', 0, 3, 0.1],
  ['compensacaoCurva', 'Compensação da curva', 0, 1, 0.01],
  ['tempoCicloCirculo', 'Ciclo do círculo (s)', 0.6, 3, 0.05],
  ['tempoMira', 'Tempo ao mirar (1 = normal)', 0.1, 1, 0.01],
];

// aplica os ajustes salvos por cima do padrão (chamado ao carregar o jogo e ao mexer nos controles)
function aplicarAjustesArremesso() {
  Object.assign(ARREMESSO, ARREMESSO_PADRAO);
  const o = (S && S.settings && S.settings.arremesso) || {};
  for (const k in o) if (k in ARREMESSO_PADRAO && typeof o[k] === typeof ARREMESSO_PADRAO[k]) ARREMESSO[k] = o[k];
  if (ARREMESSO.forcaMaxima < ARREMESSO.forcaMinima + 0.2) ARREMESSO.forcaMaxima = ARREMESSO.forcaMinima + 0.2;
}

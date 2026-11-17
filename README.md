# CUBOLA — Estrela das Quadras 🏀

Jogo **original** de basquete 3D em estilo "blocky" (low-poly), com modo carreira,
feito para rodar direto no navegador do celular (retrato 9:16) ou do PC.

**Para jogar:** abra o arquivo [`index.html`](index.html) no navegador. É um único arquivo;
só precisa de internet para baixar o Three.js (CDN) e a fonte.

## O que tem

- **Quadra FIBA em escala** (28 × 15 m): linha de 3 a 6,75 m, garrafão 4,9 × 5,8 m na cor do time,
  lance livre, semicírculo sem carga, tabela transparente, aro a 3,05 m e rede animada.
- **Partida 5 × 5** com IA: 4 quartos + prorrogação, bola ao alto, 2/3/1 pontos, 24 s (14 s após rebote
  ofensivo), 8 s, volta de quadra, 3 s no garrafão, andada, drible duplo, bola fora, faltas pessoais,
  de arremesso e de ataque, cesta + 1, bônus após 4 faltas coletivas, eliminação com 5 faltas e tempos técnicos.
- **Controles simples:** direcional virtual, passe tocando no companheiro, botões de driblar, enterrar,
  roubar e bloquear.
- **Arremesso por gesto (swipe) em primeira pessoa:** todo arremesso do jogador — parado, correndo,
  de 2, de 3 e lance livre — é feito segurando a bola e deslizando o dedo para cima, em direção à cesta.
  Não existe arremesso por botão nem automático (veja "Arremesso por gesto" abaixo).
- **Modo carreira:** moedas, gemas, energia, nível de popularidade, liga com 10 times fictícios
  (classificação, calendário, cestinhas, assistentes), convocação para a Seleção, estilo de vida,
  treinos (3 pontos e lances livres com o mesmo gesto, drible entre cones), melhorias de partida, customização,
  metas de partida, tarefas e evento diários, objetivos de carreira.
- **Câmera lenta e replay** em enterradas e cestas de 3 decisivas; "Retroceder" refaz a jogada.
- **Áudio sintetizado** (Web Audio API): quique, swish, aro, tabela, apito, buzina, torcida e música do menu.
- **Progresso salvo** em `localStorage`.

## Teclado (PC)

`WASD`/setas movem · `Espaço` levanta a bola (abre a mira) ou pula · `E` passa/pede a bola ·
`Q` dribla/rouba · `F` enterrada · `Esc` desiste do arremesso. O mouse faz o papel do dedo,
inclusive no gesto do arremesso.

## Arremesso por gesto

1. **Levantar a bola:** toque em ARREMESSAR (ou no seu jogador). A câmera vai para os olhos do jogador
   e a bola aparece em primeiro plano, flutuando e girando devagar. O botão só levanta a bola.
2. **Segurar:** ao tocar na bola ela fica presa ao dedo (segue com suavidade). Um círculo sobre o aro
   abre e fecha em ciclo: soltar com ele pequeno dá mais precisão (BOA! / ÓTIMO! / EXCELENTE!).
3. **Empurrar:** deslize para cima e solte no meio do movimento. Quanto mais longo e rápido o empurrão,
   maior a força; o desvio lateral do swipe vira a bola para a esquerda/direita.
4. **Seta de força:** aparece enquanto você empurra, sempre para frente. Tamanho = força;
   verde = fraca, amarela = ideal, vermelha = forte demais. A seta e a física leem o mesmo número.
   Arrastar para baixo, parar o dedo ou um swipe curto/lento não lança: a bola cai e volta.
5. **Curva:** gire a bola em círculos antes de soltar. Ela brilha, faz uma curva no ar (força lateral
   contínua, efeito Magnus) e a cesta vale bônus (moedas na partida, +1 ponto no treino).
6. **Depois do lançamento:** rastro e giro para trás no voo; na cesta, rede, partículas, som e texto;
   no erro, a bola quica com física real e some em 2 s (treino e lances livres) enquanto uma bola nova
   sobe da base da tela. Na partida a bola que erra continua viva para o rebote.

**Ajustes:** todas as variáveis ficam em `src/js/00a-ArremessoConfig.js` (força mínima/máxima,
sensibilidade horizontal, assistência de mira, força da curva, ciclo do círculo etc.). Dentro do jogo,
⚙️ Ajustes > "Ajustar arremesso" muda as principais com controles deslizantes, sem mexer no código.

## Código

O jogo é escrito em arquivos separados e comentados em `src/` e montado em um único HTML:

| Arquivo | Conteúdo |
| --- | --- |
| `src/js/00-core.js` | utilidades, medidas FIBA, times, dados da carreira, save |
| `src/js/01-audio.js` | efeitos e música com Web Audio API |
| `src/js/02-gfx.js` | Three.js: quadra, ginásio, torcida, cestas, bonecos, partículas |
| `src/js/03-match.js` | física da bola e motor da partida (regras, IA, replay) |
| `src/js/00a-ArremessoConfig.js` | todas as variáveis de ajuste do arremesso por gesto |
| `src/js/04-input.js` | toque, mouse e teclado |
| `src/js/04a-InputSwipe.js` | gesto: amostras com horário, velocidade, força, desvio e giro |
| `src/js/04b-ThrowCalculator.js` | física do lançamento, assistência de mira e curva |
| `src/js/04c-BallController.js` | estados da bola: Idle, Holding, Flying, Reset |
| `src/js/04d-ShotFeedback.js` | círculo-alvo, seta de força, rastro, brilho e textos |
| `src/js/05-train.js` | minigames de treino |
| `src/js/06-ui.js` | HUD e menus |
| `src/js/07-main.js` | laço principal |
| `src/style.css`, `src/index.template.html` | estilos e estrutura |

Depois de editar algo em `src/`, gere o arquivo final com:

```
node build.js
```

Nomes, logo, times e marcas das placas são fictícios e criados para este jogo.

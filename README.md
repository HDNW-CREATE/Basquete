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
- **Controles simples:** direcional virtual, arremesso arrastando para trás (seta de força com % e arco
  pontilhado), passe tocando no companheiro, botões de driblar, enterrar/bandeja, roubar e bloquear.
- **Lance livre em primeira pessoa:** toque na bola em cima do alvo verde; o ponto de contato define
  direção e força, e a física decide (inclusive bater no aro e cair).
- **Modo carreira:** moedas, gemas, energia, nível de popularidade, liga com 10 times fictícios
  (classificação, calendário, cestinhas, assistentes), convocação para a Seleção, estilo de vida,
  treinos (3 pontos, lances livres, drible entre cones), melhorias de partida, customização,
  metas de partida, tarefas e evento diários, objetivos de carreira.
- **Câmera lenta e replay** em enterradas e cestas de 3 decisivas; "Retroceder" refaz a jogada.
- **Áudio sintetizado** (Web Audio API): quique, swish, aro, tabela, apito, buzina, torcida e música do menu.
- **Progresso salvo** em `localStorage`.

## Teclado (PC)

`WASD`/setas movem · `Espaço` arremessa (segure para carregar) ou pula · `E` passa/pede a bola ·
`Q` dribla/rouba · `F` bandeja/enterrada. O mouse faz o papel do dedo.

## Código

O jogo é escrito em arquivos separados e comentados em `src/` e montado em um único HTML:

| Arquivo | Conteúdo |
| --- | --- |
| `src/js/00-core.js` | utilidades, medidas FIBA, times, dados da carreira, save |
| `src/js/01-audio.js` | efeitos e música com Web Audio API |
| `src/js/02-gfx.js` | Three.js: quadra, ginásio, torcida, cestas, bonecos, partículas |
| `src/js/03-match.js` | física da bola e motor da partida (regras, IA, replay) |
| `src/js/04-input.js` | toque, mouse e teclado |
| `src/js/05-train.js` | minigames de treino |
| `src/js/06-ui.js` | HUD e menus |
| `src/js/07-main.js` | laço principal |
| `src/style.css`, `src/index.template.html` | estilos e estrutura |

Depois de editar algo em `src/`, gere o arquivo final com:

```
node build.js
```

Nomes, logo, times e marcas das placas são fictícios e criados para este jogo.

## Bônus: mascotinho para o Claude Code 🦀

A pasta [`mascotinho/`](mascotinho) é um plugin do Claude Code: um caranguejinho em pixel art que fica acima do
campo de digitação, reage ao que o Claude faz (pensando, trabalhando, erro, pronto), ganha moedas por tokens e sobe
de nível. São 8 modelos, entre eles o Basqueteiro e o Boleiro. Para instalar:

```
/plugin install mascotinho --marketplace hdnw-create/basquete
```

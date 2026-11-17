/* =====================================================================
   Arquivo 07: laço principal e troca de modos (menu / partida / treino)
   ===================================================================== */
const Game = (() => {
  let mode = 'menu', last = 0, stageKind = 'none', models = [], kind = 'league', started = false, endT = 0;
  const $ = U.$;

  // "vitrine" 3D dos menus: seu jogador no centro da quadra (e o rival no pré-jogo)
  function stage(k, opp, my) {
    models.forEach(GFX.disposeModel); models = []; stageKind = k;
    if (k === 'none' || !started) return;
    const t = my || TEAMS[S.teamId];
    GFX.paintCourt(t.c1, t.c2);
    const me = GFX.makeModel(Object.assign({}, S.look, { c1: t.c1, c2: t.c2 }));
    models.push(me);
    if (k === 'pre') {
      me.g.position.set(-0.62, 0, 0); me.g.rotation.y = 0.28;
      const o = GFX.makeModel({ skin: U.randi(0, 5), hair: U.randi(1, 5), hairColor: U.randi(0, 3), face: U.randi(1, 2), shoes: U.randi(0, 5), num: U.randi(4, 33), c1: opp.c1, c2: opp.c2 });
      o.g.position.set(0.62, 0, 0); o.g.rotation.y = -0.28; models.push(o);
    }
    GFX.ball.position.set(k === 'pre' ? 0 : 0.55, CT.BALL_R, 0.45);
    GFX.setBoard('CUBOLA');
  }
  const matchHandler = {
    origin: () => (Match.canAim() ? Match.userScreen() : null),
    shotStart: () => Match.aimStart(), shotCancel: () => Match.aimCancel(),   // levantar a bola / desistir (o arremesso é sempre pelo swipe)
    tap: (x, y) => Match.tapPass(x, y),
    key: (k) => { const m = Match.view().mode; Match.act(k === 'q' ? (m === 'ball' ? 'dribble' : 'steal') : k); },
  };
  function startMatch(cfg, k) {
    kind = k; mode = 'match'; stage('none'); endT = 0;
    Match.start(cfg, (res) => { endT = performance.now() + (Match.state.headless ? 300 : 2600); Game._res = res; });
    Input.setHandler(matchHandler); HUD.show('match');
    SND.music(false); SND.crowd(1);
  }
  function startTraining(k) {
    mode = 'train'; stage('none');
    HUD.show('train');
    Train.start(k, (r) => UI.trainResult(r));
    SND.music(false); SND.crowd(0.4);
  }
  function quitTraining() { if (mode === 'train' && Train.state.on) Train.finish(); }
  function toMenu() {
    mode = 'menu'; Match.stop(); Train.stop(); Input.setHandler(null); HUD.show(null); Game._res = null; endT = 0;
    SND.music(true); SND.crowd(0.25);
  }

  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    if (!started) return;
    Input.update(dt);
    BallController.update(dt);                          // bola do arremesso por gesto (tempo real)
    if (mode === 'match') {
      Match.update(dt); Match.sync(dt);
      if (endT && t > endT && Game._res) { const r = Game._res; Game._res = null; endT = 0; UI.closeModal(); HUD.show(null); Input.setHandler(null); UI.result(r, kind); }
    } else if (mode === 'train') Train.update(dt);
    else {
      if (stageKind === 'none') { ShotFeedback.update(dt); return; }   // painel opaco por cima: não precisa renderizar
      models.forEach((m, i) => GFX.animate(m, stageKind === 'pre' ? 'hips' : 'idle', 0, dt));
      const k = 1 - Math.exp(-dt * 6);
      GFX.setFov(46);
      if (stageKind === 'home') GFX.cam(0, 1.55, 5.3, 0, 0.98, 0, k);
      else if (stageKind === 'custom') GFX.cam(0, 1.7, 7.4, 0, -0.75, 0, k);
      else GFX.cam(0, 1.5, 5.6, 0, 0.92, 0, k);
    }
    HUD.update(dt); ShotFeedback.update(dt); GFX.update(dt); GFX.render();
  }

  function fit() { const w = $('#stage').getBoundingClientRect().width; document.documentElement.style.setProperty('--sw', w + 'px'); if (started) GFX.resize(); }
  function boot() {
    if (!window.THREE) {
      document.body.insertAdjacentHTML('beforeend', '<div id="err"><div><h2>Não foi possível carregar o motor 3D</h2><p>O jogo precisa de internet na primeira abertura para baixar o Three.js. Verifique a conexão e recarregue a página.</p></div></div>');
      return;
    }
    loadGame(); fit(); window.addEventListener('resize', fit);
    GFX.init($('#gl')); GFX.setShadows(S.settings.shadows);
    Input.init($('#touch')); HUD.init(); ShotFeedback.init(); UI.init();
    started = true; fit();
    GFX.cam(0, 1.55, 5.3, 0, 0.98, 0, 1);
    $('#splash').addEventListener('click', () => {
      SND.init(); SND.play('click'); $('#splash').classList.add('hidden');
      UI.show('home'); SND.music(true); SND.crowd(0.25);
    }, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (mode === 'match' && !Match.state.paused && !UI.modalOpen) UI.pauseMenu(); SND.music(false); } else if (mode === 'menu') SND.music(true);
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    requestAnimationFrame(frame);
  }
  return { boot, stage, startMatch, startTraining, quitTraining, toMenu, get mode() { return mode; }, _res: null };
})();

// ganchos de depuração/testes (console): CUBOLA.Match.simulate({...})
window.CUBOLA = { Game, Match, Train, UI, HUD, GFX, InputSwipe, BallController, ThrowCalculator, ShotFeedback, ARREMESSO, get save() { return S; }, TEAMS };
Game.boot();

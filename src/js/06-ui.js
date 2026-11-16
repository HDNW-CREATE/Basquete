/* =====================================================================
   Arquivo 06: interface HTML
   - HUD: placar, relógios, botões de ação, avisos animados, lance livre
   - UI: menus do modo carreira (início, loja, partidas, eventos, estilo
     de vida), pré-jogo, resultado e janelas (modais)
   ===================================================================== */
const HUD = (() => {
  const $ = U.$, el = {}, cache = {};
  let toastT = 0, aimOn = false, joyUsed = false;
  const ft = { on: false, stage: 0, t: 0, aim: 0, pow: 0 };
  const set = (id, v) => { if (cache[id] !== v) { cache[id] = v; el[id].textContent = v; } };
  const vis = (id, on) => { const k = 'v_' + id; if (cache[k] !== on) { cache[k] = on; el[id].classList.toggle('hidden', !on); } };
  const cls = (id, c) => { const k = 'c_' + id; if (cache[k] !== c) { cache[k] = c; el[id].className = c; } };

  function init() {
    ['sb', 'sb-a', 'sb-b', 'sb-sc', 'sb-q', 'sb-clk', 'sb-sh', 'sb-f', 'mystats', 'goals', 'hint', 'aimlbl', 'b-shoot', 'b-pass', 'b-drib', 'b-lay', 'b-steal', 'b-jump',
      'btn-rew', 'replay', 'skiprep', 'ftui', 'ft-t', 'ft-aim', 'ft-pow', 'ft-tip', 'btn-pause', 'trainbar', 'tr-score', 'tr-msg', 'tr-quit', 'joyhint', 'banner', 'floats', 'toast', 'hud'].forEach((id) => { el[id] = $('#' + id); });
    const press = (id, fn) => el[id].addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); SND.init(); fn(e); });
    press('b-shoot', (e) => Input.aimFromButton(e));
    press('b-pass', () => Match.act('pass')); press('b-drib', () => Match.act('dribble')); press('b-lay', () => Match.act('layup'));
    press('b-steal', () => Match.act('steal')); press('b-jump', () => Match.act('jump'));
    press('btn-rew', () => Match.rewind()); press('skiprep', () => Match.endReplay());
    press('btn-pause', () => UI.pauseMenu()); press('tr-quit', () => Game.quitTraining());
    press('ftui', ftTap);
  }

  /* ----- avisos ----- */
  function banner(txt, sub, kind = 'warn') {
    el.banner.className = kind;
    el.banner.innerHTML = `<div><h1 class="out">${txt}</h1>${sub ? `<br><p>${sub}</p>` : ''}</div>`;
  }
  function float(x, y, z, txt, c = 'good') {
    const p = GFX.project(x, y, z), d = document.createElement('div');
    d.className = 'out ' + c; d.textContent = txt; d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    el.floats.appendChild(d); setTimeout(() => d.remove(), 1100);
  }
  function toast(msg) { el.toast.textContent = msg; el.toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.toast.classList.remove('on'), 2000); }
  function aimLabel(on, x, y, pct, good, three) {
    if (!on) { if (aimOn) { aimOn = false; el.aimlbl.classList.add('hidden'); } return; }
    aimOn = true; const a = el.aimlbl;
    a.className = 'out' + (good ? ' good' : ''); a.style.left = x + 'px'; a.style.top = y + 'px';
    a.textContent = (good ? 'PERFEITO ' : '') + pct + '%' + (three ? ' ·3' : '');
  }
  function replay(on) { vis('replay', on); vis('skiprep', on); }
  function period(q, sc) {
    const c = Match.cfg, tied = sc[0] === sc[1], s = Match.view().stats;
    const title = q >= 4 ? 'PRORROGAÇÃO!' : q === 2 ? 'INTERVALO' : `FIM DO ${q}º QUARTO`;
    UI.modal(title, `<div class="center" style="font-size:1.9em">${c.t0.short} ${sc[0]} : ${sc[1]} ${c.t1.short}</div>
      <div class="kv"><div><small>Pontos</small><b>${s.pts}</b></div><div><small>Assist.</small><b>${s.ast}</b></div><div><small>Rebotes</small><b>${s.reb}</b></div><div><small>Faltas</small><b>${s.fouls}</b></div></div>
      <p class="txt center">${q >= 4 && tied ? 'Empate! Vamos para o tempo extra.' : q === 2 ? 'Cada time recebe 3 tempos técnicos no 2º tempo.' : 'As faltas coletivas foram zeradas.'}</p>
      <button class="btn y big" data-a="nextPeriod">CONTINUAR</button>`, { noX: true });
  }
  function fouledOut(wasUser, subName) {
    if (!wasUser) return toast(`Substituição: entra ${subName}`);
    Match.pause(true);
    UI.modal('ELIMINADO!', `<p class="txt center">Você cometeu <b>5 faltas</b> e está fora da partida.<br>${subName} entra no seu lugar.</p>
      <div class="row"><button class="btn d grow" data-a="watch">Assistir</button><button class="btn y grow" data-a="simEnd">Simular o fim</button></div>`, { noX: true });
  }

  /* ----- lance livre: duas barras (mira e força) ----- */
  function ftShow(on, i, n) {
    if (!on) { if (ft.on) { ft.on = false; vis('ftui', false); } return; }
    ft.on = true; ft.stage = 0; ft.t = Math.random() * 3; vis('ftui', true);
    el['ft-t'].textContent = `LANCE LIVRE ${i}/${n}`; el['ft-tip'].textContent = 'Toque para travar a MIRA';
    const gz = ftZone() * 50;
    el['ft-aim'].firstElementChild.style.cssText = `left:${50 - gz}%;width:${gz * 2}%`;
    el['ft-pow'].firstElementChild.style.cssText = `top:${50 - gz}%;height:${gz * 2}%`;
    el['ft-pow'].classList.add('dim'); el['ft-aim'].classList.remove('dim');
  }
  function ftTap() {
    if (!ft.on) return;
    SND.play('click');
    if (ft.stage === 0) { ft.stage = 1; ft.t = Math.random() * 2; el['ft-tip'].textContent = 'Toque para travar a FORÇA'; el['ft-pow'].classList.remove('dim'); }
    else if (ft.stage === 1) { ft.stage = 2; if (Game.mode === 'match') Match.ftInput(ft.aim, ft.pow); else Train.ftInput(ft.aim, ft.pow); }
  }
  function ftUpdate(dt) {
    if (!ft.on) return;
    ft.t += dt;
    if (ft.stage === 0) ft.aim = Math.sin(ft.t * 3.3);
    if (ft.stage === 1) { const u = (ft.t * 0.95) % 2; ft.pow = u < 1 ? u * 2 - 1 : 3 - u * 2; }
    el['ft-aim'].lastElementChild.style.left = 50 + ft.aim * 50 + '%';
    el['ft-pow'].lastElementChild.style.top = 50 - ft.pow * 50 + '%';
  }

  /* ----- atualização por quadro ----- */
  const ORD = ['1º', '2º', '3º', '4º'];
  function show(kind) {                        // 'match' | 'train' | null
    el.hud.classList.toggle('hidden', !kind);
    for (const k in cache) delete cache[k];
    ft.on = false;
    const m = kind === 'match';
    ['sb', 'mystats', 'goals', 'btn-pause'].forEach((id) => vis(id, m));
    vis('trainbar', kind === 'train');
    ['b-shoot', 'b-pass', 'b-drib', 'b-lay', 'b-steal', 'b-jump', 'btn-rew', 'replay', 'skiprep', 'ftui'].forEach((id) => vis(id, false));
    vis('joyhint', m && !joyUsed); el.hint.textContent = ''; el.banner.innerHTML = ''; aimLabel(false);
    if (m) {
      const c = Match.cfg;
      el['sb-a'].textContent = c.t0.short; el['sb-a'].style.background = U.hex(c.t0.c1);
      el['sb-b'].textContent = c.t1.short; el['sb-b'].style.background = U.hex(c.t1.c1);
      el.goals.innerHTML = (c.goals || []).map(() => '<div></div>').join('');
    }
  }
  function update(dt) {
    ftUpdate(dt);
    if (Game.mode === 'train') {
      const T = Train.state; set('tr-score', T.kind === 'cones' ? '🚧' : String(T.score)); set('tr-msg', `${Train.INFO[T.kind].name} · ${T.msg}`);
      vis('joyhint', T.kind === 'cones' && T.t < 1.5);
      return;
    }
    if (Game.mode !== 'match' || !Match.active) return;
    const v = Match.view(), c = Match.cfg;
    set('sb-sc', `${v.score[0]} : ${v.score[1]}`);
    set('sb-q', v.q > 4 ? 'PR' + (v.q - 4) : ORD[v.q - 1]);
    const cl = Math.max(0, v.clock);
    set('sb-clk', cl < 10 ? cl.toFixed(1) : `${Math.floor(cl / 60)}:${String(Math.floor(cl % 60)).padStart(2, '0')}`);
    set('sb-sh', String(Math.max(0, Math.ceil(v.shotClock)))); cls('sb-sh', v.shotClock < 5 ? 'low' : '');
    set('sb-f', `Faltas ${v.tf[0]}·${v.tf[1]}   Tempos ${v.to[0]}·${v.to[1]}` + (v.boostT > 0 ? '  🔥' : ''));
    set('mystats', v.userOut ? 'ELIMINADO' : `VOCÊ ${v.stats.pts} pts · ${v.stats.ast} ast · ${v.stats.reb} reb · ${v.fouls}F`);
    (c.goals || []).forEach((g, i) => {
      const d = el.goals.children[i], t = `${g.short || g.txt} ${v.goals[i]}/${g.goal}`;
      if (d && d.textContent !== t) { d.textContent = t; d.className = v.goals[i] >= g.goal ? 'ok' : ''; }
    });
    const m = v.replay || v.paused ? 'none' : v.mode;
    vis('b-shoot', m === 'ball'); vis('b-drib', m === 'ball'); vis('b-lay', m === 'ball' && v.near);
    vis('b-pass', m === 'ball' || m === 'off'); vis('b-steal', m === 'def'); vis('b-jump', m === 'def' || m === 'loose' || m === 'off');
    if (m === 'ball' || m === 'off') { cls('b-pass', 'act ' + (m === 'ball' ? 's2' : 'y s1')); set2('b-pass', m === 'ball' ? 'PASSAR' : 'PEDIR BOLA'); }
    if (m === 'ball') { cls('b-drib', 'act s3' + (v.dead ? ' warn' : '')); set2('b-lay', v.dunk ? 'ENTERRAR' : 'BANDEJA'); }
    if (m === 'def' || m === 'loose' || m === 'off') { cls('b-jump', 'act ' + (m === 'off' ? 's2' : 'y s1')); set2('b-jump', m === 'def' ? 'BLOQUEAR' : 'PULAR'); }
    vis('btn-rew', v.rewind); set('hint', v.hint);
    if (!joyUsed && (Input.joy.x || Input.joy.y)) { joyUsed = true; vis('joyhint', false); }
  }
  const set2 = (id, v) => { const k = 's_' + id; if (cache[k] !== v) { cache[k] = v; el[id].lastElementChild.textContent = v; } };
  return { init, banner, float, toast, aimLabel, replay, period, fouledOut, ftShow, show, update };
})();

/* ===================================================================== */
const UI = (() => {
  const $ = U.$;
  let tab = 'home', PRE = null, modalOpen = false, onClose = null, custTab = 'hair', queue = [];
  const stars = (n) => `<span class="stars">★★★★★<i style="width:${n * 20}%">★★★★★</i></span>`;
  const tdot = (t) => `<span class="tdot" style="background:${U.hex(t.c1)}"></span>`;
  const bar = (v, max, txt) => `<div class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i><span>${txt || `${Math.min(v, max)}/${max}`}</span></div>`;
  const team = () => TEAMS[S.teamId];
  const avg = (v, g) => (g ? (v / g).toFixed(1) : '0.0');

  function refreshTop() {
    tickEnergy();
    $('#t-lvl').textContent = S.level; $('#t-xp').textContent = `${S.xp}/${xpNeed(S.level)}`; $('#t-xpbar').style.width = (S.xp / xpNeed(S.level)) * 100 + '%';
    $('#t-gems').textContent = U.fmt(S.gems); $('#t-coins').textContent = U.fmt(S.coins); $('#t-en').textContent = `${S.energy}/${energyMax()}`;
    // bolinhas de aviso na navegação
    const claim = S.daily.tasks.some((t) => !t.done && t.prog >= TASK_POOL.find((x) => x.id === t.id).goal) || objClaimable();
    const ev = EVENT_POOL.find((e) => e.id === S.daily.event.id), evOk = (!S.daily.event.done && S.daily.event.prog >= ev.goal) || !S.daily.login;
    document.querySelectorAll('.nav').forEach((b) => {
      b.classList.toggle('on', b.dataset.tab === tab);
      const need = (b.dataset.tab === 'home' && claim) || (b.dataset.tab === 'events' && evOk) || (b.dataset.tab === 'life' && S.lifestyle < LIFE.length && S.coins >= LIFE[S.lifestyle].cost);
      let d = b.querySelector('.dot'); if (need && !d) { d = document.createElement('b'); d.className = 'dot'; d.textContent = '!'; b.appendChild(d); } else if (!need && d) d.remove();
    });
  }
  const objVal = (o) => (o.stat === 'train' ? S.training.level : o.stat === 'nat' ? (S.national.called ? 1 : 0) : S.career[o.stat] || 0);
  const objClaimable = () => OBJECTIVES.some((o) => !S.claimed[o.id] && objVal(o) >= o.goal);

  /* ----- modal genérico ----- */
  function modal(title, html, o = {}) {
    const m = $('#modal'); m.classList.remove('hidden'); m.classList.toggle('low', !!o.low);
    $('#m-t').textContent = title; $('#m-b').innerHTML = html; $('#m-x').classList.toggle('hidden', !!o.noX);
    modalOpen = true; onClose = o.onClose || null;
  }
  function closeModal() {
    if (!modalOpen) return; modalOpen = false; $('#modal').classList.add('hidden');
    const f = onClose; onClose = null; if (f) f();
    if (queue.length && Game.mode === 'menu') queue.shift()();
  }
  const later = (fn) => { if (modalOpen) queue.push(fn); else fn(); };

  /* ----- abas ----- */
  function show(t) {
    tab = t || tab; PRE = null;
    $('#top').classList.remove('hidden'); $('#nav').classList.remove('hidden'); $('#pre').classList.add('hidden'); $('#result').classList.add('hidden');
    $('#home').classList.toggle('hidden', tab !== 'home'); $('#panel').classList.toggle('hidden', tab === 'home');
    Game.stage(tab === 'home' ? 'home' : 'none');
    render();
  }
  function hideMenus() { ['#top', '#nav', '#home', '#panel', '#pre', '#result'].forEach((s) => $(s).classList.add('hidden')); }
  function render() {
    ensureDaily(); refreshTop();
    if (tab === 'home') renderHome(); else { $('#panel-in').innerHTML = { shop: shopHtml, league: leagueHtml, events: eventsHtml, life: lifeHtml }[tab](); }
  }
  function renderHome() {
    const se = S.season, fx = nextFixture(), ev = EVENT_POOL.find((e) => e.id === S.daily.event.id), my = se.my;
    const tdone = S.daily.tasks.some((t) => !t.done && t.prog >= TASK_POOL.find((x) => x.id === t.id).goal);
    $('#home').innerHTML = `
      <div class="season out">TEMPORADA ${se.year} · ${fx ? `RODADA ${se.round + 1}/${se.schedule.length}` : 'ENCERRADA'}<small>${team().name} ${stars(team().stars)}</small></div>
      <div class="cards">
        <div class="card" data-a="tab:events"><h4>${ev.ic} ${ev.name}</h4>${bar(S.daily.event.prog, ev.goal)}</div>
        <div class="card" data-a="tab:league"><h4>🆚 ${fx ? fx.opp.name : 'Fim de temporada'}</h4><div>${fx ? `${posOf(fx.opp.id)}º lugar · ${fx.home ? 'em casa' : 'fora'}` : 'Veja a classificação'}</div></div>
      </div>
      <div class="col l">
        <button class="ibtn" data-a="tasks"><i>📋</i><span>Tarefas diárias</span>${tdone ? '<b class="dot">!</b>' : ''}</button>
        <button class="ibtn" data-a="objectives"><i>🎯</i><span>Objetivos</span>${objClaimable() ? '<b class="dot">!</b>' : ''}</button>
        <button class="ibtn" data-a="customize"><i>👕</i><span>Customizar</span></button>
        <button class="ibtn" data-a="howto"><i>❓</i><span>Como jogar</span></button>
      </div>
      <div class="col r">
        <div class="stat rate"><b class="out">${avg(my.rate, my.g)}</b><span>Nota média</span></div>
        <div class="stat"><b class="out">${my.pts}</b><span>Pontos</span></div>
        <div class="stat"><b class="out">${my.ast}</b><span>Assistências</span></div>
        <div class="stat"><b class="out">${my.reb}</b><span>Rebotes</span></div>
      </div>
      <div class="play"><button class="btn y big" data-a="${fx ? 'pre:league' : 'seasonEnd'}">${fx ? 'PRÓXIMA PARTIDA' : 'NOVA TEMPORADA'}</button><small class="out">${fx ? '⚡ 1 de energia por partida' : 'Veja sua campanha e as propostas'}</small></div>`;
  }
  function shopHtml() {
    return `<div class="h1 out">LOJA</div>
      <div class="blk"><h3>🧰 Melhorias de partida</h3>${Object.keys(BOOST).map((k) => { const b = BOOST[k]; return `<div class="item"><span class="ic2">${b.ic}</span><div class="grow"><h4>${b.name}</h4><small>${b.desc}</small></div><span class="cnt">${S.boosters[k]}</span><button class="btn y sm" data-a="buyBoost:${k}">🪙 ${b.cost}</button></div>`; }).join('')}</div>
      <div class="blk"><h3>⚡ Energia</h3><div class="item"><span class="ic2">🔋</span><div class="grow"><h4>Recarga completa</h4><small>Enche sua energia na hora. Ela também volta sozinha: +1 a cada 6 min.</small></div><button class="btn y sm" data-a="buyEnergy">💎 10</button></div></div>
      <div class="blk"><h3>🪙 Moedas</h3><div class="item"><span class="ic2">💰</span><div class="grow"><h4>Saco de moedas</h4><small>Troque 10 gemas por 600 moedas.</small></div><button class="btn y sm" data-a="buyCoins">💎 10</button></div>
      <p>Não há compras com dinheiro de verdade: moedas e gemas são ganhas jogando, subindo de nível e cumprindo tarefas.</p></div>`;
  }
  function leagueHtml() {
    const se = S.season, r = natReq(), n = S.national, opp = NATIONS[n.played % NATIONS.length];
    return `<div class="h1 out">PARTIDAS DE CLUBE</div>
      <div class="blk"><h3>${tdot(team())}${team().name} ${stars(team().stars)}</h3>
        <div class="center">LIGA CUBO · Rodadas: ${se.round}/${se.schedule.length}</div>
        <div class="kv"><div><small>Pos.</small><b>${myPos()}º</b></div><div><small>Pontos</small><b>${se.my.pts}</b></div><div><small>Assistências</small><b>${se.my.ast}</b></div></div>
        <div class="grid" style="grid-template-columns:repeat(4,1fr)">
          <button class="gbtn" data-a="standings"><i>🏅</i>Classificação</button><button class="gbtn" data-a="calendar"><i>🗓️</i>Calendário</button>
          <button class="gbtn" data-a="leaders:pts"><i>🎯</i>Cestinhas</button><button class="gbtn" data-a="leaders:ast"><i>🤝</i>Assistentes</button>
        </div></div>
      <div class="h1 out">PARTIDAS DA SELEÇÃO</div>
      <div class="blk"><h3>${tdot(BRAZIL)}BRASIL ${stars(BRAZIL.stars)}</h3>
        ${n.called ? `<p>Você veste a camisa da Seleção! Jogos: ${n.played} · Vitórias: ${n.wins}</p>
          <div class="item"><span class="ic2">🌎</span><div class="grow"><h4>Amistoso: Brasil x ${opp.name}</h4><small>Vitória rende 💎 8 e muita popularidade.</small></div><button class="btn y sm" data-a="pre:national">JOGAR ⚡2</button></div>`
        : `<div class="center yel">Requisitos para ser convocado</div>
          <div class="req">🛡️ Popularidade nível 6 <b class="${r.pop ? 'ok' : ''}">${r.pop ? '✔' : S.level + '/6'}</b></div>
          <div class="req">🏠 Estilo de vida nível 5 <b class="${r.life ? 'ok' : ''}">${r.life ? '✔' : S.lifestyle + '/5'}</b></div>
          <div class="req">🚧 Treino nível 7 <b class="${r.train ? 'ok' : ''}">${r.train ? '✔' : S.training.level + '/7'}</b></div>`}
      </div>`;
  }
  function eventsHtml() {
    const d = S.daily, ev = EVENT_POOL.find((e) => e.id === d.event.id), evOk = d.event.prog >= ev.goal, tr = S.training;
    return `<div class="h1 out">EVENTOS</div>
      <div class="blk"><h3>🎁 Bônus diário</h3><div class="row"><p class="grow">Volte todo dia: 🪙 150 e ⚡ +2 de energia.</p><button class="btn y sm" data-a="login" ${d.login ? 'disabled' : ''}>${d.login ? 'Recebido' : 'Receber'}</button></div></div>
      <div class="blk"><h3>${ev.ic} ${ev.name} <small style="margin-left:auto;font-size:.7em;color:#fff">⏳ até 00:00</small></h3><p>${ev.desc}</p>
        <div class="row"><div class="grow">${bar(d.event.prog, ev.goal)}</div><button class="btn y sm" data-a="claimEvent" ${evOk && !d.event.done ? '' : 'disabled'}>${d.event.done ? 'Recebido' : rewardTxt(ev)}</button></div></div>
      <div class="blk"><h3>🚧 Treino · Nível ${tr.level}</h3><p>Treinar melhora a precisão dos arremessos, a zona verde do lance livre e a velocidade. Níveis altos atraem a Seleção.</p>
        ${bar(tr.xp, trainNeed(tr.level), tr.level >= 20 ? 'MÁXIMO' : `${tr.xp}/${trainNeed(tr.level)} XP`)}
        <div class="center mt mint">Treinos restantes nesta rodada: ${S.trainLeft}/${maxTrain()}</div>
        ${Object.keys(Train.INFO).map((k) => { const i = Train.INFO[k]; return `<div class="item mt"><span class="ic2">${i.ic}</span><div class="grow"><h4>${i.name}</h4><small>${i.desc}</small></div><button class="btn d sm" data-a="trainInfo:${k}">Ver</button><button class="btn y sm" data-a="train:${k}">Jogar</button></div>`; }).join('')}
        <div class="row mt"><p class="grow">Sem treinos? Compre uma sessão extra.</p><button class="btn sm" data-a="buyTrain">🪙 120</button></div></div>`;
  }
  function lifeHtml() {
    const cur = S.lifestyle, next = LIFE[cur];
    let h = `<div class="h1 out">ESTILO DE VIDA · NÍVEL ${cur}</div>
      <div class="blk center">${next ? `<p>Próximo: <b class="yel">${next.ic} ${next.name}</b> — ${next.bonus}</p><button class="btn y" data-a="lifeUp">MELHORAR 🪙 ${U.fmt(next.cost)}</button>` : '<p>Você chegou ao topo. Vida de estrela!</p>'}</div><div class="blk">`;
    for (let i = LIFE.length - 1; i >= 0; i--) {
      const l = LIFE[i], on = i < cur;
      h += `<div class="life ${on ? 'on' : i > cur ? 'lock' : ''}"><div class="lv">NÍVEL ${i + 1}</div><div class="pic">${on || i === cur ? l.ic : '🔒'}</div><div><h4>${l.name}</h4><small>${l.bonus}</small></div></div>`;
    }
    return h + '</div>';
  }

  /* ----- janelas ----- */
  function tasksModal() {
    modal('TAREFAS DIÁRIAS', S.daily.tasks.map((t, i) => {
      const d = TASK_POOL.find((x) => x.id === t.id), ok = t.prog >= d.goal;
      return `<div class="item"><span class="ic2">${t.done ? '✅' : '📋'}</span><div class="grow"><h4>${d.txt}</h4>${bar(t.prog, d.goal)}</div><button class="btn y sm" data-a="claimTask:${i}" ${ok && !t.done ? '' : 'disabled'}>${t.done ? 'Feito' : rewardTxt(d)}</button></div>`;
    }).join('') + '<p class="txt center">Novas tarefas todos os dias à meia-noite.</p>');
  }
  function objectivesModal() {
    modal('OBJETIVOS', OBJECTIVES.map((o) => {
      const v = objVal(o), done = S.claimed[o.id];
      return `<div class="item"><span class="ic2">${done ? '🏅' : '🎯'}</span><div class="grow"><h4>${o.txt}</h4>${bar(v, o.goal)}</div><button class="btn y sm" data-a="claimObj:${o.id}" ${v >= o.goal && !done ? '' : 'disabled'}>${done ? 'Feito' : rewardTxt(o)}</button></div>`;
    }).join(''));
  }
  function customizeModal() {
    Game.stage('custom');
    const L = S.look, tabs = { hair: 'Cabelo', color: 'Cor', face: 'Rosto', skin: 'Pele', shoes: 'Tênis', num: 'Número' };
    let opts = '';
    const opt = (on, a, inner, style = '') => `<button class="opt ${on ? 'on' : ''}" data-a="${a}" style="${style}">${inner}</button>`;
    const priced = (list, key, own) => list.map((it, i) => opt(L[key] === i, `look:${key}:${i}`, `${it.name}${own.includes(i) ? '' : `<small>🪙${it.cost}</small>`}`)).join('');
    if (custTab === 'hair') opts = priced(HAIRS, 'hair', S.owned.hair);
    else if (custTab === 'face') opts = priced(FACES, 'face', S.owned.face);
    else if (custTab === 'shoes') opts = priced(SHOES, 'shoes', S.owned.shoes);
    else if (custTab === 'color') opts = HAIR_COLORS.map((c, i) => opt(L.hairColor === i, `look:hairColor:${i}`, '', `background:${U.hex(c)}`)).join('');
    else if (custTab === 'skin') opts = SKINS.map((c, i) => opt(L.skin === i, `look:skin:${i}`, '', `background:${U.hex(c)}`)).join('');
    else opts = [0, 1, 3, 5, 7, 8, 9, 10, 11, 13, 15, 23, 24, 30, 33, 77, 99].map((n) => opt(L.num === n, `look:num:${n}`, n)).join('');
    modal('CUSTOMIZAR', `<div class="tabs">${Object.keys(tabs).map((k) => `<button class="${k === custTab ? 'on' : ''}" data-a="custTab:${k}">${tabs[k]}</button>`).join('')}</div><div class="opts">${opts}</div>
      <p class="txt center">O uniforme segue as cores do seu clube: <b>${team().name}</b>.</p>`, { low: true, onClose: () => { if (tab === 'home' && Game.mode === 'menu') Game.stage('home'); } });
  }
  function standingsModal() {
    modal('CLASSIFICAÇÃO', `<table><tr><th>#</th><th>Time</th><th>V</th><th>D</th><th>Saldo</th></tr>${standings().map((r, i) => {
      const t = TEAMS[r.id]; return `<tr class="${r.id === S.teamId ? 'me' : ''}"><td>${i + 1}</td><td>${tdot(t)}${t.name}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf - r.pa > 0 ? '+' : ''}${r.pf - r.pa}</td></tr>`;
    }).join('')}</table><p class="txt center">O 1º colocado ao fim das ${S.season.schedule.length} rodadas é o campeão da Liga Cubo.</p>`);
  }
  function calendarModal() {
    const se = S.season;
    modal('CALENDÁRIO', `<table><tr><th>Rod.</th><th>Adversário</th><th>Local</th><th>Placar</th></tr>${se.schedule.map((rd, i) => {
      const m = rd.find((x) => x[0] === S.teamId || x[1] === S.teamId), home = m[0] === S.teamId, t = TEAMS[home ? m[1] : m[0]], r = se.results[i];
      return `<tr class="${i === se.round ? 'me' : ''}"><td>${i + 1}</td><td>${tdot(t)}${t.name}</td><td>${home ? 'Casa' : 'Fora'}</td><td>${r ? `${r[0] > r[1] ? '✅' : '❌'} ${r[0]}-${r[1]}` : '—'}</td></tr>`;
    }).join('')}</table>`);
  }
  function leadersModal(k) {
    const se = S.season, list = se.npcs.map((n) => ({ name: n.name, team: TEAMS[n.team], v: n[k], g: n.g }));
    list.push({ name: 'VOCÊ', team: team(), v: se.my[k], g: se.my.g, me: true });
    list.sort((a, b) => b.v - a.v);
    modal(k === 'pts' ? 'CESTINHAS' : 'ASSISTENTES', `<table><tr><th>#</th><th>Jogador</th><th>J</th><th>${k === 'pts' ? 'Pts' : 'Ast'}</th><th>Média</th></tr>${list.slice(0, 12).map((r, i) =>
      `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${tdot(r.team)}${r.name}</td><td>${r.g}</td><td>${r.v}</td><td>${avg(r.v, r.g)}</td></tr>`).join('')}</table>`);
  }
  function settingsModal(inMatch) {
    const st = S.settings, tg = (k, lbl) => `<div class="item"><div class="grow"><h4>${lbl}</h4></div><button class="btn ${st[k] ? 'g' : 'd'} sm" data-a="toggle:${k}">${st[k] ? 'LIGADO' : 'DESLIGADO'}</button></div>`;
    modal('AJUSTES', tg('sound', '🔊 Sons') + tg('music', '🎵 Música do menu') + tg('shadows', '🌤️ Sombras (desligue se travar)') +
      `<div class="item"><div class="grow"><h4>⏱️ Duração do quarto</h4><small>Vale para a próxima partida.</small></div>${[60, 120, 180].map((q) => `<button class="btn ${st.qlen === q ? 'y' : 'd'} sm" data-a="qlen:${q}">${q / 60} min</button>`).join('')}</div>
      <div class="row"><button class="btn grow" data-a="howto">❓ Como jogar</button>${inMatch ? '' : '<button class="btn r sm" data-a="reset">Apagar progresso</button>'}</div>`, { onClose: inMatch ? () => pauseMenu() : null });
  }
  function howtoModal() {
    modal('COMO JOGAR', `<div class="txt">
      <p>🕹️ <b>Mover:</b> arraste o dedo na parte de baixo/esquerda da tela (PC: WASD ou setas).</p>
      <p>🏀 <b>Arremessar:</b> segure o botão amarelo (ou o seu jogador) e <b>arraste para trás</b>. A seta mostra a força: solte perto de <b>100%</b> e mantenha a seta reta. O arco pontilhado mostra a trajetória. (PC: segure Espaço.)</p>
      <p>🤝 <b>Passar:</b> toque no companheiro ou use PASSAR (a linha pontilhada mostra o alvo). Sem a bola, PEDIR BOLA chama o passe. (PC: E)</p>
      <p>⚡ <b>Driblar:</b> arranque para desequilibrar o marcador. Se você segurar a bola (finta de arremesso), não pode driblar de novo: é <b>drible duplo</b>; e andar com ela é <b>andada</b>. (PC: Q)</p>
      <p>💥 <b>Enterrar/Bandeja:</b> aparece perto da cesta. (PC: F)</p>
      <p>🛡️ <b>Defesa:</b> marque o jogador do anel vermelho. ROUBAR perto da bola; BLOQUEAR no tempo do arremesso. Errar o tempo pode dar falta — com 5 você é eliminado.</p>
      <p>📏 <b>Regras:</b> 24s de posse (14 após rebote de ataque), 8s para passar do meio, sem volta de quadra, 3s no garrafão, bônus de lances livres após 4 faltas coletivas no quarto, prorrogação em caso de empate.</p></div>
      <button class="btn y big" data-a="close">ENTENDI!</button>`, { onClose: () => { if (!S.tutorial) { S.tutorial = true; saveGame(); } if (Game.mode === 'match' && Match.state.paused) pauseMenu(); } });
  }
  function pauseMenu() {
    if (Game.mode !== 'match' || Match.view().ended) return;
    Match.pause(true);
    const v = Match.view();
    modal('PAUSA', `<div class="center" style="font-size:1.5em">${Match.cfg.t0.short} ${v.score[0]} : ${v.score[1]} ${Match.cfg.t1.short}</div>
      <div class="kv"><div><small>Pontos</small><b>${v.stats.pts}</b></div><div><small>Assist.</small><b>${v.stats.ast}</b></div><div><small>Rebotes</small><b>${v.stats.reb}</b></div><div><small>Faltas</small><b>${v.fouls}/5</b></div></div>
      <button class="btn y big" data-a="resume">CONTINUAR</button>
      <div class="row mt"><button class="btn grow" data-a="timeout">⏱️ Tempo técnico (${v.to[0]})</button><button class="btn d" data-a="settingsM">⚙️</button></div>
      <div class="row"><button class="btn d grow" data-a="howto">❓ Como jogar</button><button class="btn r" data-a="quit">Desistir</button></div>`, { noX: true });
  }

  /* ----- pré-jogo ----- */
  function openPre(kind) {
    tickEnergy();
    let opp, my;
    if (kind === 'league') { const fx = nextFixture(); if (!fx) return seasonEnd(); opp = fx.opp; my = team(); }
    else { opp = NATIONS[S.national.played % NATIONS.length]; my = BRAZIL; }
    const goals = [{ id: 'win', txt: 'Vitória', short: 'Vitória', stat: 'win', goal: 1, coins: 150 }].concat(U.shuffle(GOAL_POOL.slice()).slice(0, 2));
    PRE = { kind, opp, my, goals, boost: {}, cost: kind === 'league' ? 1 : 2 };
    hideMenus(); $('#top').classList.remove('hidden'); $('#pre').classList.remove('hidden');
    Game.stage('pre', opp, my); renderPre();
  }
  function renderPre() {
    refreshTop();
    const p = PRE, se = S.season, act = Object.keys(p.boost);
    $('#pre').innerHTML = `
      <div class="hd out">${p.kind === 'league' ? `LIGA CUBO · RODADA ${se.round + 1}/${se.schedule.length}` : 'AMISTOSO DE SELEÇÕES'}</div>
      <div class="vs"><div><h3 class="out">${p.my.name.toUpperCase()}</h3>${stars(p.my.stars)}${p.kind === 'league' ? `<span class="pos">${myPos()}º</span>` : ''}</div><em class="out">VS</em>
        <div><h3 class="out">${p.opp.name.toUpperCase()}</h3>${stars(p.opp.stars)}${p.kind === 'league' ? `<span class="pos">${posOf(p.opp.id)}º</span>` : ''}</div></div>
      <div class="bot">
        <div class="goalbox"><span class="yel">METAS DA PARTIDA</span>${p.goals.map((g) => `<div class="g"><span>◆ ${g.txt}</span><span>🪙 ${g.coins}</span></div>`).join('')}</div>
        <div class="slots">${[0, 1, 2].map((i) => `<button class="slot ${act[i] ? 'on' : ''}" data-a="boosts">${act[i] ? BOOST[act[i]].ic : '➕'}</button>`).join('')}<span class="txt out" style="font-size:.8em">Toque para ativar<br>melhorias</span></div>
        <div class="row"><button class="btn" data-a="back">◀ Voltar</button><button class="btn y grow" style="font-size:1.35em" data-a="go">BOLA AO ALTO ⚡${p.cost}</button></div>
      </div>`;
  }
  function boostsModal() {
    const p = PRE;
    modal('MELHORIAS', Object.keys(BOOST).map((k) => {
      const b = BOOST[k], on = p.boost[k];
      return `<div class="item"><span class="ic2">${b.ic}</span><div class="grow"><h4>${b.name}</h4><small>${b.desc}</small></div><span class="cnt">${S.boosters[k]}</span>
        <button class="btn y sm" data-a="buyBoost:${k}">🪙${b.cost}</button><button class="btn ${on ? 'r' : 'g'} sm" data-a="useBoost:${k}" ${S.boosters[k] > 0 || on ? '' : 'disabled'}>${on ? 'Tirar' : 'Usar'}</button></div>`;
    }).join('') + '<p class="txt center">Até 3 melhorias por partida. Elas são consumidas ao começar o jogo.</p>', { onClose: () => { if (PRE) renderPre(); } });
  }
  function go() {
    const p = PRE; tickEnergy();
    if (S.energy < p.cost) { SND.play('error'); return HUD.toast('Sem energia! Espere recarregar ou use gemas na Loja.'); }
    if (S.energy >= energyMax()) S.energyTs = Date.now();
    S.energy -= p.cost; Object.keys(p.boost).forEach((k) => { S.boosters[k]--; });
    saveGame(); hideMenus();
    Game.startMatch({ t0: p.my, t1: p.opp, userLook: S.look, tlvl: S.training.level, qlen: S.settings.qlen, boost: p.boost, goals: p.goals }, p.kind);
    if (!S.tutorial) howtoModal();
  }

  /* ----- fim de partida: recompensas e progresso da carreira ----- */
  function result(res, kind) {
    const s = res.user, c = Match.cfg, def = s.stl + s.blk;
    let coins = 60 + s.pts * 4 + (res.win ? 120 : 0) + res.coins;
    res.goals.forEach((g) => { if (g.done) coins += g.g.coins; });
    coins = Math.round(coins * (1 + lifeBonus('coin')));
    const xp = 40 + (res.win ? 70 + lifeBonus('pop') : 15) + Math.round(res.rating * 6) + (kind === 'national' ? 40 : 0);
    S.coins += coins; const ups = addXP(xp);
    const ca = S.career; ca.g++; ca.pts += s.pts; ca.ast += s.ast; ca.reb += s.reb; ca.tpm += s.tpm; ca.dunk += s.dunks; ca.def += def; ca.rate += res.rating; if (res.win) ca.wins++;
    if (kind === 'league') { const my = S.season.my; my.g++; my.pts += s.pts; my.ast += s.ast; my.reb += s.reb; my.tpm += s.tpm; my.rate += res.rating; finishRound(res.score[0], res.score[1]); }
    else { S.national.played++; if (res.win) { S.national.wins++; S.gems += 8; } }
    dailyProgress('play', 1); dailyProgress('pts', s.pts); dailyProgress('three', s.tpm); dailyProgress('ast', s.ast); dailyProgress('def', def); if (res.win) dailyProgress('win', 1);
    S.trainLeft = maxTrain();
    const r = natReq(); let called = false;
    if (!S.national.called && r.pop && r.life && r.train) { S.national.called = true; called = true; }
    saveGame();
    const el = $('#result'); el.classList.remove('hidden');
    el.innerHTML = `<h1 class="out">${res.win ? 'VITÓRIA!' : 'DERROTA'}</h1>
      <div class="sc out">${c.t0.short} ${res.score[0]} : ${res.score[1]} ${c.t1.short}${res.ot ? ' <small>(prorr.)</small>' : ''}</div>
      <div class="blk"><div class="kv"><div><small>Nota</small><b class="yel">${res.rating.toFixed(1)}</b></div><div><small>Pontos</small><b>${s.pts}</b></div><div><small>Assist.</small><b>${s.ast}</b></div><div><small>Rebotes</small><b>${s.reb}</b></div></div>
        <p class="center">Arremessos ${s.fgm}/${s.fga} · 3 pts ${s.tpm}/${s.tpa} · LL ${s.ftm}/${s.fta} · Roubos ${s.stl} · Tocos ${s.blk} · Erros ${s.to}</p>
        ${res.goals.map((g) => `<div class="req">${g.done ? '✅' : '❌'} ${g.g.txt} <b class="${g.done ? 'ok' : ''}">${g.done ? '🪙 +' + g.g.coins : `${g.val}/${g.g.goal}`}</b></div>`).join('')}
        <div class="kv"><div><small>Moedas</small><b>🪙 +${coins}</b></div><div><small>Popularidade</small><b>+${xp} XP</b></div>${kind === 'national' && res.win ? '<div><small>Gemas</small><b>💎 +8</b></div>' : ''}</div></div>
      <button class="btn y big" data-a="resultOk">CONTINUAR</button>`;
    SND.play('coin');
    queue = [];
    if (ups) queue.push(() => { SND.play('levelup'); modal('SUBIU DE NÍVEL!', `<p class="txt center">Sua popularidade chegou ao <b>nível ${S.level}</b>!<br>Recompensa: 💎 ${ups * 5}</p><button class="btn y big" data-a="close">LEGAL!</button>`); });
    if (called) queue.push(() => { SND.play('win'); modal('CONVOCADO!', `<p class="txt center">🇧🇷 O técnico da <b>Seleção</b> chamou você!<br>Os amistosos estão liberados na aba <b>Partidas</b>.</p><button class="btn y big" data-a="close">VAMOS!</button>`); });
    if (kind === 'league' && seasonOver()) queue.push(seasonEnd);
  }
  function seasonEnd() {
    const pos = myPos(), champ = pos === 1, prize = { coins: [3000, 1800, 1200][pos - 1] || 500, gems: champ ? 30 : pos <= 3 ? 10 : 0 };
    const cur = team(), better = TEAMS.filter((t) => t.stars > cur.stars && t.stars <= cur.stars + 1 && (pos <= 4 || S.level >= 5)), offer = better.length ? better[0] : null;
    modal(champ ? '🏆 CAMPEÃO!' : 'FIM DA TEMPORADA', `<p class="txt center">${cur.name} terminou em <b>${pos}º lugar</b>.<br>Sua campanha: <b>${S.season.my.pts} pontos</b>, nota média <b>${avg(S.season.my.rate, S.season.my.g)}</b>.<br>Prêmio: ${rewardTxt(prize)}</p>
      ${offer ? `<div class="item"><span class="ic2">📨</span><div class="grow"><h4>Proposta: ${offer.name}</h4><small>Um clube mais forte quer você! ${offer.stars} estrelas.</small></div><button class="btn g sm" data-a="newSeason:${offer.id}">Aceitar</button></div>` : ''}
      <button class="btn y big" data-a="newSeason:${cur.id}">${offer ? 'FICAR NO CLUBE' : 'NOVA TEMPORADA'}</button>`, { noX: true });
    if (!S.season.paid) { S.season.paid = true; grant(prize); if (champ) S.career.titles++; saveGame(); SND.play(champ ? 'win' : 'coin'); }
  }
  function trainResult(r) {
    const I = Train.INFO[r.kind], xp = 12 + r.stars * 22, g = addTrainXP(xp), coins = r.stars * 30;
    S.coins += coins; dailyProgress('train', 1); saveGame();
    modal(I.name, `<div class="center" style="font-size:2.6em">${'⭐'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>
      <p class="txt center">${r.kind === 'cones' ? `Tempo: <b>${r.val.toFixed(1)}s</b>` : `Acertos: <b>${r.val}</b>`}<br>Treino <b>+${g.n} XP</b> · 🪙 +${coins}${g.up ? `<br><b>Treino subiu para o nível ${S.training.level}!</b>` : ''}</p>
      <div class="row"><button class="btn d grow" data-a="trainBack">Voltar</button><button class="btn y grow" data-a="train:${r.kind}" ${S.trainLeft > 0 ? '' : 'disabled'}>De novo (${S.trainLeft})</button></div>`, { noX: true });
    if (g.up) SND.play('levelup');
  }

  /* ----- ações (delegação de cliques via data-a="nome:arg") ----- */
  const buy = (cost, cur = 'coins') => { if (S[cur] < cost) { SND.play('error'); HUD.toast(cur === 'coins' ? 'Moedas insuficientes!' : 'Gemas insuficientes!'); return false; } S[cur] -= cost; SND.play('coin'); return true; };
  const ACT = {
    tab: (t) => show(t), close: () => closeModal(),
    tasks: tasksModal, objectives: objectivesModal, customize: customizeModal, howto: howtoModal, standings: standingsModal, calendar: calendarModal,
    leaders: (k) => leadersModal(k), settings: () => settingsModal(false), settingsM: () => settingsModal(true),
    pre: (k) => openPre(k), back: () => show('home'), boosts: boostsModal, go,
    seasonEnd, nextPeriod: () => { closeModal(); Match.nextPeriod(); },
    resume: () => { closeModal(); Match.pause(false); },
    watch: () => { closeModal(); Match.pause(false); },
    simEnd: () => { closeModal(); Match.pause(false); Match.fastForward(); },
    timeout: () => { const e = Match.pause(false) || Match.timeout(0); if (e) { Match.pause(true); HUD.toast(e); } else closeModal(); },
    quit: () => { closeModal(); Game.toMenu(); show('home'); HUD.toast('Partida abandonada.'); },
    resultOk: () => { Game.toMenu(); show('home'); if (queue.length) queue.shift()(); },
    claimTask: (i) => { const t = S.daily.tasks[i], d = TASK_POOL.find((x) => x.id === t.id); if (t.done || t.prog < d.goal) return; t.done = true; grant(d); SND.play('coin'); saveGame(); tasksModal(); render(); },
    claimObj: (id) => { const o = OBJECTIVES.find((x) => x.id === id); if (S.claimed[id] || objVal(o) < o.goal) return; S.claimed[id] = true; grant(o); SND.play('coin'); saveGame(); objectivesModal(); render(); },
    claimEvent: () => { const e = S.daily.event, d = EVENT_POOL.find((x) => x.id === e.id); if (e.done || e.prog < d.goal) return; e.done = true; grant(d); SND.play('win'); saveGame(); render(); },
    login: () => { if (S.daily.login) return; S.daily.login = true; S.coins += 150; S.energy = Math.min(energyMax(), S.energy + 2); SND.play('coin'); saveGame(); render(); HUD.toast('Bônus diário: 🪙 150 e ⚡ +2'); },
    buyBoost: (k) => { if (!buy(BOOST[k].cost)) return; S.boosters[k]++; saveGame(); if (PRE) boostsModal(); else render(); refreshTop(); },
    useBoost: (k) => { const b = PRE.boost; if (b[k]) delete b[k]; else { if (Object.keys(b).length >= 3) return HUD.toast('Máximo de 3 melhorias por partida.'); b[k] = true; } boostsModal(); },
    buyEnergy: () => { if (S.energy >= energyMax()) return HUD.toast('Energia já está cheia!'); if (!buy(10, 'gems')) return; S.energy = energyMax(); saveGame(); render(); },
    buyCoins: () => { if (!buy(10, 'gems')) return; S.coins += 600; saveGame(); render(); },
    buyTrain: () => { if (!buy(120)) return; S.trainLeft++; saveGame(); render(); },
    lifeUp: () => { const n = LIFE[S.lifestyle]; if (!n || !buy(n.cost)) return; S.lifestyle++; SND.play('levelup'); saveGame(); render(); HUD.toast(`${n.ic} ${n.name}: ${n.bonus}`); checkCall(); },
    trainInfo: (k) => { const i = Train.INFO[k]; modal(i.name, `<p class="txt center">${i.desc}</p><div class="kv">${[1, 2, 3].map((n) => `<div><small>${'⭐'.repeat(n)}</small><b>${k === 'cones' ? '≤ ' + i.stars[n - 1] + 's' : i.stars[n - 1] + '+'}</b></div>`).join('')}</div><p class="txt center">Cada estrela rende mais XP de treino e moedas.</p><button class="btn y big" data-a="train:${k}">JOGAR</button>`); },
    train: (k) => { if (S.trainLeft <= 0) { SND.play('error'); return HUD.toast('Sem treinos nesta rodada. Jogue uma partida ou compre uma sessão.'); } S.trainLeft--; saveGame(); closeModal(); hideMenus(); Game.startTraining(k); },
    trainBack: () => { closeModal(); Game.toMenu(); show('events'); checkCall(); },
    custTab: (k) => { custTab = k; customizeModal(); },
    look: (key, v) => {
      v = +v; const own = S.owned[key], list = { hair: HAIRS, face: FACES, shoes: SHOES }[key];
      if (own && !own.includes(v)) { if (!buy(list[v].cost)) return; own.push(v); }
      S.look[key] = v; saveGame(); customizeModal(); refreshTop();
    },
    toggle: (k) => { S.settings[k] = !S.settings[k]; saveGame(); if (k === 'shadows') GFX.setShadows(S.settings.shadows); SND.music(Game.mode === 'menu'); settingsModal(Game.mode === 'match'); },
    qlen: (q) => { S.settings.qlen = +q; saveGame(); settingsModal(Game.mode === 'match'); },
    reset: () => modal('APAGAR TUDO?', '<p class="txt center">Isso apaga sua carreira inteira e não pode ser desfeito.</p><div class="row"><button class="btn d grow" data-a="close">Cancelar</button><button class="btn r grow" data-a="resetYes">Apagar</button></div>'),
    resetYes: () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sem acesso */ } loadGame(); closeModal(); show('home'); },
    newSeason: (id) => { S.teamId = +id; S.season = newSeason(S.season.year + 1); saveGame(); closeModal(); show('home'); HUD.toast(`Temporada ${S.season.year}: ${team().name}`); },
  };
  function checkCall() {
    const r = natReq();
    if (!S.national.called && r.pop && r.life && r.train) { S.national.called = true; saveGame(); later(() => { SND.play('win'); modal('CONVOCADO!', '<p class="txt center">🇧🇷 O técnico da <b>Seleção</b> chamou você!<br>Os amistosos estão liberados na aba <b>Partidas</b>.</p><button class="btn y big" data-a="close">VAMOS!</button>'); }); }
  }
  function init() {
    $('#ui').addEventListener('click', (e) => {
      const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
      const [name, ...args] = t.dataset.a.split(':');
      if (ACT[name]) { SND.init(); SND.play('click'); ACT[name](...args); }
    });
    document.querySelectorAll('.nav').forEach((b) => b.addEventListener('click', () => { SND.play('click'); show(b.dataset.tab); }));
    $('#m-x').addEventListener('click', () => { SND.play('click'); closeModal(); });
    $('#t-set').addEventListener('click', () => { SND.play('click'); settingsModal(false); });
    setInterval(() => { if (Game.mode === 'menu' && !PRE) refreshTop(); }, 5000);
  }
  return { init, show, modal, closeModal, result, trainResult, pauseMenu, refreshTop, get tab() { return tab; }, get modalOpen() { return modalOpen; } };
})();

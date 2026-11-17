/* =====================================================================
   Arquivo 01: áudio — tudo sintetizado com a Web Audio API
   (quique, swish, aro, tabela, apito, buzina, torcida, moedas, música)
   ===================================================================== */
const SND = (() => {
  let ctx = null, master = null, crowdGain = null, crowdFilter = null, noiseBuf = null;
  let musicTimer = null, musicGain = null, step = 0, nextT = 0;

  function init() {                       // chamado no primeiro toque (política de autoplay)
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    // buffer de ruído (2 s) reutilizado por swish e torcida
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = w * 0.5 + last * 6; }
    // torcida: ruído filtrado contínuo
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    crowdFilter = ctx.createBiquadFilter(); crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 700; crowdFilter.Q.value = 0.5;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
    src.connect(crowdFilter); crowdFilter.connect(crowdGain); crowdGain.connect(master); src.start();
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
  }
  const on = () => ctx && S && S.settings.sound;

  // oscilador simples com envelope
  function tone(type, f0, f1, dur, vol, delay = 0, dest) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(freq0, freq1, dur, vol, q = 1, delay = 0) {
    const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(freq0, t); f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  const FX = {
    bounce: (v) => { tone('sine', 150, 60, 0.13, 0.5 * v); noise(900, 300, 0.05, 0.12 * v, 2); },
    swish: (v) => { noise(4200, 900, 0.38, 0.5 * v, 1.2); },
    rim: (v) => { tone('triangle', 540, 500, 0.3, 0.3 * v); tone('sine', 813, 790, 0.22, 0.18 * v); noise(2000, 1500, 0.05, 0.1 * v, 4); },
    board: (v) => { tone('sine', 190, 90, 0.16, 0.5 * v); noise(600, 300, 0.07, 0.15 * v, 1); },
    whistle: (v) => {
      const t = ctx.currentTime, o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 2350; l.frequency.value = 34; lg.gain.value = 130;
      l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14 * v, t + 0.02);
      g.gain.setValueAtTime(0.14 * v, t + 0.38); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g); g.connect(master); o.start(t); l.start(t); o.stop(t + 0.52); l.stop(t + 0.52);
    },
    buzzer: (v) => { tone('sawtooth', 148, 148, 1.1, 0.22 * v); tone('sawtooth', 152, 152, 1.1, 0.22 * v); tone('square', 74, 74, 1.1, 0.12 * v); },
    click: (v) => { tone('square', 620, 880, 0.06, 0.12 * v); },
    coin: (v) => { tone('square', 988, 988, 0.07, 0.12 * v); tone('square', 1319, 1319, 0.22, 0.12 * v, 0.07); },
    perfect: (v) => { [784, 988, 1175].forEach((f, i) => tone('triangle', f, f, 0.16, 0.2 * v, i * 0.06)); },
    steal: (v) => { noise(1800, 500, 0.12, 0.4 * v, 2); tone('square', 300, 520, 0.09, 0.1 * v); },
    block: (v) => { tone('sine', 120, 50, 0.22, 0.7 * v); noise(1200, 200, 0.14, 0.4 * v, 1); },
    pass: (v) => { noise(1500, 700, 0.09, 0.18 * v, 2); },
    squeak: (v) => { tone('sine', 1900, 2500, 0.07, 0.05 * v); },
    win: (v) => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('square', f, f, 0.2, 0.12 * v, i * 0.13)); },
    lose: (v) => { [392, 349, 311, 262].forEach((f, i) => tone('triangle', f, f, 0.3, 0.2 * v, i * 0.2)); },
    error: (v) => { tone('sawtooth', 200, 120, 0.2, 0.15 * v); },
    // arremesso por gesto: pegar a bola, lançar, bola girando (curva), bola fraca e precisão do círculo
    grab: (v) => { tone('sine', 420, 640, 0.06, 0.12 * v); },
    whoosh: (v) => { noise(700, 2600, 0.2, 0.3 * v, 1.4); },
    spin: (v) => { tone('sawtooth', 300, 900, 0.22, 0.05 * v); noise(2500, 5000, 0.2, 0.08 * v, 3); },
    drop: (v) => { tone('sine', 300, 140, 0.18, 0.2 * v); },
    nice: (v) => { [784, 988].forEach((f, i) => tone('triangle', f, f, 0.14, 0.2 * v, i * 0.07)); },
    great: (v) => { [784, 988, 1175].forEach((f, i) => tone('triangle', f, f, 0.15, 0.2 * v, i * 0.07)); },
    excellent: (v) => { [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.18, 0.22 * v, i * 0.07)); tone('square', 2093, 2093, 0.25, 0.05 * v, 0.28); },
    levelup: (v) => { [523, 784, 1047, 1568].forEach((f, i) => tone('triangle', f, f, 0.22, 0.2 * v, i * 0.09)); },
  };
  function play(name, vol = 1) { if (on() && FX[name]) FX[name](vol); }

  // torcida: nível de fundo + explosão em cestas
  function crowd(level) {
    if (!ctx) return;
    const v = S.settings.sound ? level : 0;
    crowdGain.gain.cancelScheduledValues(ctx.currentTime);
    crowdGain.gain.setTargetAtTime(0.05 * v, ctx.currentTime, 0.4);
  }
  function cheer(power = 1) {
    if (!on()) return;
    const t = ctx.currentTime, base = crowdGain.gain.value;
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setValueAtTime(base, t);
    crowdGain.gain.linearRampToValueAtTime(0.05 + 0.2 * power, t + 0.15);
    crowdGain.gain.setTargetAtTime(0.05, t + 0.6, 0.7);
    crowdFilter.frequency.setValueAtTime(700, t);
    crowdFilter.frequency.linearRampToValueAtTime(1500, t + 0.2);
    crowdFilter.frequency.setTargetAtTime(700, t + 0.7, 0.6);
  }

  // música leve do menu: baixo + arpejo em loop (agendado com look-ahead)
  const CH = [[262, 330, 392, 494], [220, 262, 330, 392], [175, 220, 262, 349], [196, 247, 294, 392]];
  function schedule() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.25) {
      const bar = CH[Math.floor(step / 8) % 4], i = step % 8;
      if (i % 4 === 0) tone('triangle', bar[0] / 2, bar[0] / 2, 0.42, 0.22, nextT - ctx.currentTime, musicGain);
      tone('square', bar[[0, 2, 1, 3, 2, 1, 3, 2][i]] * 2, bar[[0, 2, 1, 3, 2, 1, 3, 2][i]] * 2, 0.16, 0.035, nextT - ctx.currentTime, musicGain);
      if (i % 2 === 1) tone('sine', 6000, 3000, 0.03, 0.04, nextT - ctx.currentTime, musicGain);
      nextT += 0.19; step++;
    }
  }
  function music(onOff) {
    if (!ctx) return;
    const want = onOff && S.settings.music && S.settings.sound;
    musicGain.gain.setTargetAtTime(want ? 1 : 0, ctx.currentTime, 0.3);
    if (want && !musicTimer) { nextT = ctx.currentTime + 0.05; musicTimer = setInterval(schedule, 80); }
    if (!want && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  return { init, play, crowd, cheer, music, get ready() { return !!ctx; } };
})();

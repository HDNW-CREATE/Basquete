/* =====================================================================
   Arquivo 02: gráficos 3D (Three.js / WebGL)
   Quadra FIBA em escala, ginásio, torcida, cestas com rede animada,
   bonecos "blocky", marcadores de mira, partículas e câmera.
   Eixos: X = largura da quadra, Z = comprimento, Y = altura.
   ===================================================================== */
const GFX = (() => {
  let renderer, scene, camera, sun, canvas, W = 1, H = 1;
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const mats = {}, texCache = {};
  const hoops = [];
  const crowdGroups = [];
  let courtTex, courtCv, boardTex, boardCv, boardTxt = '';
  let hype = 0, time = 0, shakeA = 0;
  const PXM = 64;                                   // pixels por metro na textura do piso

  /* ---------- materiais e texturas ---------- */
  const lam = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  function canvasTex(w, h, draw, key) {
    if (key && texCache[key]) return texCache[key];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (key) texCache[key] = t;
    return t;
  }
  function box(parent, w, h, d, x, y, z, mat, shadow = true) {
    const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = shadow; parent.add(m); return m;
  }
  const FONT = '900 40px "Lilita One", "Arial Black", system-ui, sans-serif';

  /* ---------- textura do piso: madeira + linhas oficiais ---------- */
  function paintCourt(c1, c2) {
    const g = courtCv.getContext('2d'), X = (x) => (x + 9.5) * PXM, Z = (z) => (z + 16) * PXM, s = PXM;
    g.fillStyle = U.hex(c1); g.fillRect(0, 0, courtCv.width, courtCv.height);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, courtCv.width, courtCv.height);
    // tábuas de madeira
    for (let x = -7.5; x < 7.5; x += 0.2) {
      let z = -14 - Math.random() * 2;
      while (z < 14) {
        const len = 1.4 + Math.random() * 1.6, l = 66 + Math.random() * 7;
        g.fillStyle = `hsl(31, 62%, ${l}%)`;
        const z0 = Math.max(z, -14), z1 = Math.min(z + len, 14);
        if (z1 > z0) g.fillRect(X(x), Z(z0), 0.2 * s + 1, (z1 - z0) * s + 1);
        z += len;
      }
      g.fillStyle = 'rgba(90,50,10,.13)'; g.fillRect(X(x), Z(-14), 1, 28 * s);
    }
    const lw = 0.05 * s * 1.4;
    g.strokeStyle = '#fff'; g.lineWidth = lw; g.lineJoin = 'miter';
    for (const e of [-1, 1]) {
      const hz = e * CT.HOOP_Z, a0 = Math.atan2(Math.sqrt(CT.THREE_R ** 2 - CT.THREE_SIDE ** 2), CT.THREE_SIDE);
      // área de 3 pontos levemente tingida
      g.beginPath(); g.moveTo(X(CT.THREE_SIDE), Z(e * 14));
      if (e < 0) g.arc(X(0), Z(hz), CT.THREE_R * s, a0, Math.PI - a0, false);
      else g.arc(X(0), Z(hz), CT.THREE_R * s, -a0, -(Math.PI - a0), true);
      g.lineTo(X(-CT.THREE_SIDE), Z(e * 14)); g.closePath();
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fill(); g.stroke();
      // garrafão (área restritiva) na cor do time
      const pz0 = Math.min(e * 14, e * (14 - CT.PAINT_L));
      g.fillStyle = U.hex(c1); g.fillRect(X(-CT.PAINT_W), Z(pz0), CT.PAINT_W * 2 * s, CT.PAINT_L * s);
      g.strokeRect(X(-CT.PAINT_W), Z(pz0), CT.PAINT_W * 2 * s, CT.PAINT_L * s);
      // semicírculo do lance livre (metade externa cheia, interna tracejada)
      const fz = e * (14 - CT.FT_D);
      g.beginPath(); g.arc(X(0), Z(fz), CT.CIRCLE_R * s, 0, Math.PI, e > 0); g.stroke();
      g.setLineDash([0.35 * s, 0.35 * s]);
      g.beginPath(); g.arc(X(0), Z(fz), CT.CIRCLE_R * s, 0, Math.PI, e < 0); g.stroke();
      g.setLineDash([]);
      // semicírculo sem carga
      g.beginPath(); g.moveTo(X(CT.NOCHARGE_R), Z(e * CT.BOARD_Z));
      g.lineTo(X(CT.NOCHARGE_R), Z(hz)); g.arc(X(0), Z(hz), CT.NOCHARGE_R * s, 0, Math.PI, e > 0);
      g.lineTo(X(-CT.NOCHARGE_R), Z(e * CT.BOARD_Z)); g.stroke();
      // marcas de rebote nas laterais do garrafão
      for (const m of [1.75, 2.6, 3.85, 4.7]) for (const sx of [-1, 1]) {
        g.fillStyle = '#fff'; g.fillRect(X(sx * CT.PAINT_W) + (sx > 0 ? 0 : -0.1 * s), Z(e * (14 - m)) - lw / 2, 0.1 * s, lw);
      }
    }
    // círculo central com o logo do jogo
    g.beginPath(); g.arc(X(0), Z(0), CT.CIRCLE_R * s, 0, 6.2832); g.fillStyle = U.hex(c1); g.fill(); g.stroke();
    g.fillStyle = U.hex(c2); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = FONT.replace('40px', '46px'); g.fillText('CUBOLA', X(0), Z(0) + 3);
    g.beginPath(); g.moveTo(X(-7.5), Z(0)); g.lineTo(X(-CT.CIRCLE_R), Z(0)); g.moveTo(X(CT.CIRCLE_R), Z(0)); g.lineTo(X(7.5), Z(0)); g.stroke();
    g.strokeRect(X(-7.5), Z(-14), 15 * s, 28 * s);
    courtTex.needsUpdate = true;
  }

  /* ---------- ginásio ---------- */
  function buildArena() {
    // piso
    courtCv = document.createElement('canvas'); courtCv.width = 19 * PXM; courtCv.height = 32 * PXM;
    courtTex = new THREE.CanvasTexture(courtCv); courtTex.colorSpace = THREE.SRGBColorSpace; courtTex.anisotropy = 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(19, 32), new THREE.MeshLambertMaterial({ map: courtTex }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), lam(0x2a3350));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; scene.add(outer);

    // arquibancadas + torcida (4 grupos animados com fases diferentes)
    const fanCols = [0xe63946, 0xf77f00, 0xf1f1f1, 0x2b59c3, 0xffd23f, 0x2d8a5f, 0x7b2cbf, 0x333333];
    const seats = [];
    const stand = lam(0x3c4a70), stand2 = lam(0x4a5a86);
    for (let r = 0; r < 8; r++) {
      const off = r * 0.95, y = 0.7 + r * 0.55;
      for (const sx of [-1, 1]) {
        box(scene, 0.95, y, 31, sx * (10.6 + off), y / 2, 0, r % 2 ? stand : stand2, false);
        for (let z = -15; z <= 15; z += 0.62) seats.push([sx * (10.6 + off), y, z + U.rand(-0.08, 0.08), sx > 0 ? -1.57 : 1.57]);
      }
      for (const sz of [-1, 1]) {
        box(scene, 21 + off * 2, y, 0.95, 0, y / 2, sz * (17.6 + off), r % 2 ? stand : stand2, false);
        for (let x = -9.4 - off * 0.6; x <= 9.4 + off * 0.6; x += 0.62) seats.push([x + U.rand(-0.08, 0.08), y, sz * (17.6 + off), sz > 0 ? 3.14 : 0]);
      }
    }
    const NG = 4, per = Math.ceil(seats.length / NG), dummy = new THREE.Object3D(), col = new THREE.Color();
    U.shuffle(seats);
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let gi = 0; gi < NG; gi++) {
      const list = seats.slice(gi * per, (gi + 1) * per), grp = new THREE.Group();
      const bodies = new THREE.InstancedMesh(BOX, white, list.length), heads = new THREE.InstancedMesh(BOX, white, list.length);
      list.forEach((s, i) => {
        dummy.rotation.set(0, s[3], 0);
        dummy.position.set(s[0], s[1] + 0.27, s[2]); dummy.scale.set(0.42, 0.54, 0.3); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
        bodies.setColorAt(i, col.setHex(U.pick(fanCols)));
        dummy.position.set(s[0], s[1] + 0.72, s[2]); dummy.scale.set(0.34, 0.34, 0.34); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
        heads.setColorAt(i, col.setHex(U.pick(SKINS)));
      });
      grp.add(bodies, heads); scene.add(grp); crowdGroups.push(grp);
    }
    // paredes de fundo
    const wall = lam(0x27304d);
    box(scene, 1, 12, 60, -19.5, 6, 0, wall, false); box(scene, 1, 12, 60, 19.5, 6, 0, wall, false);
    box(scene, 40, 12, 1, 0, 6, -26.5, wall, false); box(scene, 40, 12, 1, 0, 6, 26.5, wall, false);

    // placas de publicidade (marcas fictícias)
    const adTex = canvasTex(2048, 64, (g, w, h) => {
      const cols = ['#ff7a1a', '#1f6feb', '#ffd23f', '#e63946', '#2d8a5f', '#7b2cbf'];
      const names = ['CUBOLA', 'LIGA CUBO', 'SUCO MEGA', 'TÊNIS PULO', 'PIZZA BLOCO', 'CUBOLA', 'RÁDIO CESTA', 'LIGA CUBO'];
      names.forEach((n, i) => {
        g.fillStyle = cols[i % cols.length]; g.fillRect(i * 256, 0, 256, h);
        g.fillStyle = i % cols.length === 2 ? '#222' : '#fff'; g.font = FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(n, i * 256 + 128, h / 2 + 3);
      });
    }, 'ads');
    const adMat = new THREE.MeshBasicMaterial({ map: adTex });
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.9), adMat);
      m.position.set(sx * 9.45, 0.45, 0); m.rotation.y = -sx * Math.PI / 2; scene.add(m);
      box(scene, 0.12, 0.92, 30, sx * 9.52, 0.46, 0, lam(0x1b2238), false);
    }
    for (const sz of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(19, 0.9), adMat);
      m.position.set(0, 0.45, sz * 16.6); m.rotation.y = sz > 0 ? Math.PI : 0; scene.add(m);
      box(scene, 19, 0.92, 0.12, 0, 0.46, sz * 16.68, lam(0x1b2238), false);
    }
    // mesa de controle e bancos de reservas
    box(scene, 0.7, 0.8, 4, -8.7, 0.4, 0, lam(0xf2f2f2));
    box(scene, 0.72, 0.5, 3.6, -8.68, 0.5, 0, lam(0x1f6feb), false);
    for (const sz of [-1, 1]) { box(scene, 0.5, 0.42, 4.6, -8.75, 0.21, sz * 6.2, lam(0x20263d)); }
    // câmeras de TV nos cantos
    for (const [x, z] of [[8.7, -15.4], [-8.7, 15.4], [8.7, 9]]) {
      box(scene, 0.08, 1.3, 0.08, x, 0.65, z, lam(0x222222));
      box(scene, 0.4, 0.3, 0.6, x, 1.45, z, lam(0x333a55));
      box(scene, 0.2, 0.2, 0.25, x, 1.45, z + (z > 0 ? -0.4 : 0.4), lam(0x111111));
    }
    // placar gigante na parede do fundo
    boardCv = document.createElement('canvas'); boardCv.width = 512; boardCv.height = 160;
    boardTex = new THREE.CanvasTexture(boardCv); boardTex.colorSpace = THREE.SRGBColorSpace;
    for (const sz of [-1, 1]) {
      const sb = new THREE.Mesh(new THREE.PlaneGeometry(13, 4), new THREE.MeshBasicMaterial({ map: boardTex }));
      sb.position.set(0, 9.6, sz * 25.9); sb.rotation.y = sz > 0 ? Math.PI : 0; scene.add(sb);
    }
    setBoard('CUBOLA');
    for (const e of [-1, 1]) hoops.push(buildHoop(e));
  }
  function setBoard(txt, c1 = '#ff7a1a', c2 = '#1f6feb') {
    if (txt === boardTxt) return; boardTxt = txt;
    const g = boardCv.getContext('2d');
    g.fillStyle = '#10152a'; g.fillRect(0, 0, 512, 160);
    g.fillStyle = c1; g.fillRect(0, 0, 14, 160); g.fillStyle = c2; g.fillRect(498, 0, 14, 160);
    g.fillStyle = '#ffd23f'; g.font = FONT.replace('40px', '74px'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 256, 86);
    boardTex.needsUpdate = true;
  }

  /* ---------- cesta: suporte, tabela transparente, aro e rede animada ---------- */
  function buildHoop(e) {
    const g = new THREE.Group(); scene.add(g);
    // o suporte da cesta de baixo (perto da câmera) é translúcido para não tapar a jogada
    const pad = e > 0 ? new THREE.MeshLambertMaterial({ color: 0x1d3f8f, transparent: true, opacity: 0.28 }) : lam(0x1d3f8f), white = lam(0xffffff);
    box(g, 1.3, 0.5, 1.7, 0, 0.25, e * 15.6, pad, e < 0);
    box(g, 0.32, 3.3, 0.32, 0, 1.9, e * 15.9, pad, e < 0);
    box(g, 0.2, 0.2, 3.1, 0, 3.5, e * 14.4, pad, e < 0);
    const glass = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.28 }));
    glass.scale.set(1.8, 1.05, 0.04); glass.position.set(0, 3.425, e * (CT.BOARD_Z + 0.02)); g.add(glass);
    const fz = e * (CT.BOARD_Z - 0.005);
    box(g, 1.8, 0.05, 0.05, 0, 3.95, fz, white, false); box(g, 1.8, 0.05, 0.05, 0, 2.9, fz, white, false);
    box(g, 0.05, 1.05, 0.05, -0.9, 3.425, fz, white, false); box(g, 0.05, 1.05, 0.05, 0.9, 3.425, fz, white, false);
    box(g, 0.59, 0.04, 0.03, 0, 3.5, fz, white, false); box(g, 0.59, 0.04, 0.03, 0, 3.05, fz, white, false);
    box(g, 0.04, 0.45, 0.03, -0.295, 3.275, fz, white, false); box(g, 0.04, 0.45, 0.03, 0.295, 3.275, fz, white, false);
    const orange = lam(0xff5a1f);
    const rimG = new THREE.Group(); rimG.position.set(0, CT.HOOP_Y, e * CT.BOARD_Z); g.add(rimG);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(CT.RIM_R + 0.012, 0.018, 6, 20), orange);
    rim.rotation.x = Math.PI / 2; rim.position.z = -e * (CT.BOARD_Z - CT.HOOP_Z); rim.castShadow = true; rimG.add(rim);
    box(rimG, 0.12, 0.04, 0.16, 0, -0.01, -e * 0.08, orange, false);
    // rede: malha de losangos em LineSegments
    const NS = 12, RR = [0.225, 0.19, 0.155, 0.13], RY = [0, -0.16, -0.31, -0.44], segs = [];
    for (let k = 0; k < 3; k++) for (let i = 0; i < NS; i++) { segs.push([k, i, k + 1, i + 0.5], [k, i, k + 1, i - 0.5]); }
    const pos = new Float32Array(segs.length * 6), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const net = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
    net.position.set(0, CT.HOOP_Y, e * CT.HOOP_Z); net.frustumCulled = false; g.add(net);
    const h = { e, x: 0, z: e * CT.HOOP_Z, g, rimG, net, sw: { x: 0, z: 0, vx: 0, vz: 0, b: 0, vb: 0 }, shake: 0 };
    h.kick = (vx, vz, pow) => { h.sw.vx += vx * 0.5; h.sw.vz += vz * 0.5; h.sw.vb -= 3.5 * pow; };
    h.update = (dt) => {
      const s = h.sw;                                  // mola amortecida para o balanço e o "estufar"
      s.vx += (-s.x * 90 - s.vx * 5) * dt; s.vz += (-s.z * 90 - s.vz * 5) * dt; s.vb += (-s.b * 160 - s.vb * 7) * dt;
      s.x += s.vx * dt; s.z += s.vz * dt; s.b += s.vb * dt;
      let j = 0;
      const pt = (k, i) => {
        const a = (i / NS) * 6.2832, f = k / 3, r = RR[k] * (1 + (k ? -s.b * 0.5 * f : 0));
        pos[j++] = Math.cos(a) * r + s.x * f * f; pos[j++] = RY[k] * (1 + s.b * 0.35); pos[j++] = Math.sin(a) * r + s.z * f * f;
      };
      for (const sg of segs) { pt(sg[0], sg[1]); pt(sg[2], sg[3]); }
      geo.attributes.position.needsUpdate = true;
      h.shake *= Math.exp(-dt * 6);
      rimG.rotation.x = e * Math.sin(time * 38) * h.shake * 0.12;
    };
    h.update(0);
    return h;
  }

  /* ---------- boneco blocky ---------- */
  function faceTex(skin, face) {
    return canvasTex(64, 64, (g) => {
      g.fillStyle = U.hex(skin); g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#1b1b1b';
      const eye = (x, y, w = 7, h = 10) => g.fillRect(x, y, w, h);
      if (face === 3) { g.fillRect(8, 22, 48, 13); g.fillStyle = '#3aa0ff'; g.fillRect(12, 25, 16, 7); g.fillRect(36, 25, 16, 7); g.fillStyle = '#1b1b1b'; }
      else if (face === 4) { eye(15, 24); g.fillRect(40, 29, 11, 4); }
      else { eye(15, 24); eye(42, 24); }
      if (face === 1) { g.fillRect(11, 17, 14, 4); g.fillRect(39, 17, 14, 4); }
      if (face === 2) { g.save(); g.translate(18, 18); g.rotate(0.35); g.fillRect(-8, -2, 16, 5); g.restore(); g.save(); g.translate(46, 18); g.rotate(-0.35); g.fillRect(-8, -2, 16, 5); g.restore(); }
      if (face === 5) { g.fillStyle = '#7a1f1f'; g.fillRect(19, 42, 26, 12); g.fillStyle = '#fff'; g.fillRect(21, 42, 22, 5); }
      else if (face === 1 || face === 2) { g.fillRect(22, 46, 20, 4); }
      else { g.fillRect(20, 44, 24, 4); g.fillRect(18, 41, 4, 4); g.fillRect(42, 41, 4, 4); }
    }, `f${skin}_${face}`);
  }
  function jerseyTex(c1, c2, num) {
    return canvasTex(64, 64, (g) => {
      g.fillStyle = U.hex(c1); g.fillRect(0, 0, 64, 64);
      g.fillStyle = U.hex(c2); g.fillRect(0, 0, 5, 64); g.fillRect(59, 0, 5, 64); g.fillRect(0, 56, 64, 4);
      g.font = FONT.replace('40px', '34px'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText(num, 32, 30); g.fillText(num, 32, 30);
    }, `j${c1}_${c2}_${num}`);
  }
  function makeModel(L) {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const skin = lam(SKINS[L.skin % SKINS.length]), j1 = lam(L.c1), sh = SHOES[L.shoes % SHOES.length];
    const jt = new THREE.MeshLambertMaterial({ map: jerseyTex(L.c1, L.c2, L.num) });
    const leg = (sx) => {
      const p = new THREE.Group(); p.position.set(sx * 0.135, 0.78, 0); inner.add(p);
      box(p, 0.24, 0.3, 0.27, 0, -0.13, 0, lam(L.short || L.c1));
      box(p, 0.17, 0.3, 0.19, 0, -0.4, 0, skin);
      box(p, 0.19, 0.13, 0.21, 0, -0.58, 0, lam(0xffffff), false);
      box(p, 0.21, 0.13, 0.36, 0, -0.715, 0.06, lam(sh.c));
      box(p, 0.22, 0.04, 0.37, 0, -0.765, 0.06, lam(sh.s), false);
      return p;
    };
    const legL = leg(1), legR = leg(-1);
    const body = new THREE.Group(); body.position.y = 0.78; inner.add(body);
    const torso = new THREE.Mesh(BOX, [j1, j1, j1, j1, jt, jt]); torso.scale.set(0.54, 0.54, 0.3); torso.position.y = 0.27; torso.castShadow = true; body.add(torso);
    const arm = (sx) => {
      const p = new THREE.Group(); p.position.set(sx * 0.345, 0.47, 0); body.add(p);
      box(p, 0.16, 0.15, 0.18, 0, -0.03, 0, j1, false);
      box(p, 0.13, 0.36, 0.15, 0, -0.28, 0, skin);
      box(p, 0.15, 0.13, 0.17, 0, -0.5, 0, skin, false);
      return p;
    };
    const armL = arm(1), armR = arm(-1);
    const head = new THREE.Group(); head.position.y = 0.8; body.add(head);
    const hm = new THREE.Mesh(BOX, [skin, skin, skin, skin, new THREE.MeshLambertMaterial({ map: faceTex(SKINS[L.skin % SKINS.length], L.face || 0) }), skin]);
    hm.scale.set(0.5, 0.46, 0.46); hm.castShadow = true; head.add(hm);
    box(head, 0.06, 0.12, 0.1, 0.27, -0.02, 0, skin, false); box(head, 0.06, 0.12, 0.1, -0.27, -0.02, 0, skin, false);
    const hc = lam(HAIR_COLORS[(L.hairColor || 0) % HAIR_COLORS.length]);
    switch (L.hair) {
      case 1: box(head, 0.54, 0.14, 0.5, 0, 0.28, 0, hc); box(head, 0.54, 0.2, 0.1, 0, 0.14, -0.21, hc, false); break;
      case 2: {
        box(head, 0.52, 0.08, 0.48, 0, 0.25, 0, hc, false);
        const cone = new THREE.ConeGeometry(0.11, 0.34, 4);
        for (let i = 0; i < 9; i++) {
          const c = new THREE.Mesh(cone, hc), a = (i / 9) * 6.28;
          c.position.set(Math.cos(a) * 0.17 * (i % 3 ? 1 : 0.3), 0.4, Math.sin(a) * 0.15 * (i % 3 ? 1 : 0.3));
          c.rotation.set(Math.sin(a) * 0.5, i, -Math.cos(a) * 0.5); c.castShadow = true; head.add(c);
        }
        break;
      }
      case 3: box(head, 0.12, 0.24, 0.5, 0, 0.32, -0.01, hc); break;
      case 4: box(head, 0.64, 0.34, 0.6, 0, 0.3, -0.02, hc); box(head, 0.64, 0.3, 0.14, 0, 0.05, -0.25, hc, false); break;
      case 5: box(head, 0.54, 0.12, 0.5, 0, 0.27, 0, hc); box(head, 0.54, 0.62, 0.1, 0, -0.04, -0.26, hc); break;
      case 6: box(head, 0.54, 0.16, 0.5, 0, 0.27, 0, lam(L.c2)); box(head, 0.4, 0.04, 0.26, 0, 0.21, 0.33, lam(L.c2), false); break;
    }
    scene.add(g);
    return {
      g, inner, body, head, armL, armR, legL, legR, phase: Math.random() * 6, seed: Math.random() * 9,
      pose: { aLx: 0, aRx: 0, aLz: 0.08, aRz: 0.08, lL: 0, lR: 0, lean: 0, by: 0, hd: 0 },
    };
  }
  function disposeModel(m) { if (m) scene.remove(m.g); }

  /* Animação procedural: mistura suave até a pose-alvo do modo atual.
     modos: idle, run, drib, hold, aim, shoot, def, jump, dunk, lay, lunge, cele, sad, sit */
  const POSE_KEYS = ['aLx', 'aRx', 'aLz', 'aRz', 'lL', 'lR', 'lean', 'by', 'hd'];
  function animate(m, mode, speed, dt, dphase = 0) {
    if (speed > 0.3) m.phase += dt * (3 + speed * 2.1);
    const run = Math.min(1, speed / 4), sw = Math.sin(m.phase) * run, P = m.pose;
    const T = { aLx: sw * 0.8, aRx: -sw * 0.8, aLz: 0.08, aRz: 0.08, lL: -sw * 0.95, lR: sw * 0.95, lean: run * 0.2, by: Math.sin(time * 2 + m.seed) * 0.01, hd: 0 };
    switch (mode) {
      case 'drib': T.aRx = -0.85 + Math.sin(dphase) * 0.4; T.aRz = 0.12; T.lean += 0.1; break;
      case 'hold': T.aLx = T.aRx = -1.15; T.aLz = T.aRz = -0.35; break;
      case 'aim': T.aLx = T.aRx = -2.45; T.aLz = T.aRz = -0.22; T.by = -0.07; T.lean = -0.05; T.lL = T.lR = 0; break;
      case 'shoot': T.aRx = -3.0; T.aLx = -2.3; T.aLz = T.aRz = -0.1; T.lL = T.lR = 0.12; T.lean = -0.05; break;
      case 'def': T.aLx = T.aRx = -0.55; T.aLz = T.aRz = 1.0; T.by = -0.09; T.lean = 0.14; T.lL *= 0.6; T.lR *= 0.6; break;
      case 'jump': T.aLx = T.aRx = -3.05; T.aLz = T.aRz = 0.14; T.lL = T.lR = 0.1; T.lean = 0; break;
      case 'dunk': T.aRx = -3.1; T.aLx = -0.7; T.lL = -1.0; T.lR = 0.55; T.lean = -0.18; break;
      case 'lay': T.aRx = -2.9; T.aLx = -0.4; T.lL = -1.05; T.lR = 0.3; T.lean = 0; break;
      case 'lunge': T.aRx = -1.5; T.aRz = -0.45; T.lean = 0.42; break;
      case 'cele': T.aLx = T.aRx = -2.85 + Math.sin(time * 13 + m.seed) * 0.3; T.aLz = T.aRz = 0.4; T.by = Math.abs(Math.sin(time * 9 + m.seed)) * 0.2; T.lL = T.lR = 0; T.lean = 0; break;
      case 'sad': T.hd = 0.4; T.lean = 0.12; T.aLx = T.aRx = 0; break;
      case 'sit': T.lL = T.lR = -1.5; T.aLx = T.aRx = -0.6; T.by = -0.34; T.lean = 0; break;
      case 'hips': T.aLx = T.aRx = 0.25; T.aLz = T.aRz = 0.55; break;
    }
    const k = 1 - Math.exp(-dt * 16);
    for (const key of POSE_KEYS) P[key] += (T[key] - P[key]) * k;
    applyPose(m);
  }
  function applyPose(m) {
    const P = m.pose;
    m.armL.rotation.set(P.aLx, 0, P.aLz); m.armR.rotation.set(P.aRx, 0, -P.aRz);
    m.legL.rotation.x = P.lL; m.legR.rotation.x = P.lR;
    m.body.rotation.x = P.lean; m.head.rotation.x = P.hd; m.inner.position.y = P.by;
  }

  /* ---------- bola ---------- */
  let ball, ball2, glow, trail;
  function buildBall() {
    const t = canvasTex(128, 64, (g) => {
      g.fillStyle = '#ee7a23'; g.fillRect(0, 0, 128, 64);
      g.strokeStyle = '#3a1c08'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 32); g.lineTo(128, 32); g.moveTo(32, 0); g.lineTo(32, 64); g.moveTo(96, 0); g.lineTo(96, 64); g.stroke();
      g.beginPath(); g.ellipse(0, 32, 20, 30, 0, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(64, 32, 20, 30, 0, 0, 6.3); g.stroke();
      g.beginPath(); g.ellipse(128, 32, 20, 30, 0, 0, 6.3); g.stroke();
    }, 'ball');
    ball = new THREE.Mesh(new THREE.SphereGeometry(CT.BALL_R, 12, 9), new THREE.MeshLambertMaterial({ map: t }));
    ball.castShadow = true; scene.add(ball);
    // segunda bola: a que acabou de ser arremessada continua quicando enquanto a nova já aparece na mão
    ball2 = new THREE.Mesh(ball.geometry, ball.material); ball2.castShadow = true; ball2.visible = false; scene.add(ball2);
    // brilho da bola com efeito (curva) e rastro do voo
    glow = new THREE.Mesh(new THREE.SphereGeometry(CT.BALL_R * 1.45, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.visible = false; scene.add(glow);
    trail = new THREE.InstancedMesh(new THREE.SphereGeometry(CT.BALL_R * 0.85, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, depthWrite: false }), 32);
    trail.count = 0; trail.frustumCulled = false; scene.add(trail);
  }
  // brilho em volta da bola (k = 0 desliga · 1 = máximo)
  function setGlow(k, color) {
    glow.visible = k > 0.01; if (!glow.visible) return;
    glow.position.copy(ball.position); glow.material.color.setHex(color); glow.material.opacity = 0.1 + 0.16 * k;
    glow.scale.setScalar(ball.scale.x * (0.95 + 0.07 * Math.sin(time * 16) + 0.1 * k));
  }
  // rastro: lista de [x, y, z, escala], do ponto mais novo para o mais antigo
  function setTrail(pts, color = 0xffffff) { trail.material.color.setHex(color); setDots(trail, pts); }

  /* ---------- marcadores: seta de força, pontilhados, anéis, estrela ---------- */
  let arrow, arrowBody, arrowHead, trajDots, floorDots, userRing, manRing, passRing, star, cones = [];
  const dummy = new THREE.Object3D();
  function buildMarkers() {
    const yel = new THREE.MeshBasicMaterial({ color: 0xffd400, side: THREE.DoubleSide });
    arrow = new THREE.Group(); arrow.visible = false; scene.add(arrow);
    arrowBody = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1), yel); arrowBody.rotation.x = -Math.PI / 2; arrow.add(arrowBody);
    const tri = new THREE.Shape(); tri.moveTo(-0.42, 0); tri.lineTo(0.42, 0); tri.lineTo(0, 0.55); tri.closePath();
    arrowHead = new THREE.Mesh(new THREE.ShapeGeometry(tri), yel); arrowHead.rotation.x = Math.PI / 2; arrow.add(arrowHead);
    arrow.position.y = 0.04;
    const sph = new THREE.SphereGeometry(0.075, 6, 5);
    trajDots = new THREE.InstancedMesh(sph, new THREE.MeshBasicMaterial({ color: 0xffffff }), 48); trajDots.count = 0; trajDots.frustumCulled = false; scene.add(trajDots);
    const disc = new THREE.CircleGeometry(0.075, 8); disc.rotateX(-Math.PI / 2);
    floorDots = new THREE.InstancedMesh(disc, new THREE.MeshBasicMaterial({ color: 0xd8ff3a }), 96); floorDots.count = 0; floorDots.frustumCulled = false; scene.add(floorDots);
    const ring = (c, r0, r1) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 24), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.035; m.visible = false; scene.add(m); return m;
    };
    userRing = ring(0xffe100, 0.46, 0.6); manRing = ring(0xff3b3b, 0.46, 0.56); passRing = ring(0xffffff, 0.44, 0.54);
    const st = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.2832 + Math.PI / 2, r = i % 2 ? 0.1 : 0.24; st[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    star = new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: 0.06, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: 0xffd400, emissive: 0x7a5a00 }));
    star.visible = false; scene.add(star);
  }
  function setArrow(on, x, z, ang, len, color) {
    arrow.visible = on; if (!on) return;
    arrow.position.x = x; arrow.position.z = z; arrow.rotation.y = ang;
    arrowBody.scale.y = len; arrowBody.position.z = 0.5 + len / 2; arrowHead.position.z = 0.5 + len;
    arrowBody.material.color.setHex(color);
  }
  function setDots(mesh, pts) {
    const n = Math.min(pts.length, mesh.instanceMatrix.count);
    for (let i = 0; i < n; i++) { dummy.position.set(pts[i][0], pts[i][1], pts[i][2]); dummy.scale.setScalar(pts[i][3] || 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
  }
  function setRing(r, on, x, z, s = 1) { r.visible = on; if (on) { r.position.x = x; r.position.z = z; r.scale.setScalar(s); } }
  // cones do treino de drible
  function setCones(list) {
    cones.forEach((c) => scene.remove(c)); cones = [];
    const geo = new THREE.ConeGeometry(0.2, 0.5, 6), mat = lam(0xff6a00);
    for (const [x, z] of list) { const c = new THREE.Mesh(geo, mat); c.position.set(x, 0.25, z); c.castShadow = true; scene.add(c); cones.push(c); }
    return cones;
  }

  /* ---------- partículas (confete / moedas) ---------- */
  const NP = 160, parts = [];
  let partMesh;
  function buildParticles() {
    partMesh = new THREE.InstancedMesh(BOX, new THREE.MeshBasicMaterial({ color: 0xffffff }), NP);
    partMesh.frustumCulled = false; scene.add(partMesh);
    for (let i = 0; i < NP; i++) { parts.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, r: 0 }); partMesh.setColorAt(i, new THREE.Color(1, 1, 1)); }
  }
  let partIdx = 0;
  const pcol = new THREE.Color();
  function burst(x, y, z, colors, n = 24, power = 4) {
    for (let i = 0; i < n; i++) {
      const p = parts[partIdx]; partMesh.setColorAt(partIdx, pcol.setHex(U.pick(colors))); partIdx = (partIdx + 1) % NP;
      const a = Math.random() * 6.28, sp = U.rand(0.4, 1) * power;
      p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp; p.vy = U.rand(1.5, 5); p.life = U.rand(0.7, 1.3); p.s = U.rand(0.06, 0.13); p.r = Math.random() * 6;
    }
    partMesh.instanceColor.needsUpdate = true;
  }
  function updateParticles(dt) {
    for (let i = 0; i < NP; i++) {
      const p = parts[i];
      if (p.life > 0) {
        p.life -= dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += dt * 8;
        if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.4; p.vx *= 0.6; p.vz *= 0.6; }
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.r, p.r * 0.7, 0); dummy.scale.setScalar(p.life > 0 ? p.s : 0);
      } else { dummy.position.set(0, -5, 0); dummy.scale.setScalar(0); }
      dummy.updateMatrix(); partMesh.setMatrixAt(i, dummy.matrix);
    }
    dummy.rotation.set(0, 0, 0);
    partMesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------- inicialização, câmera e render ---------- */
  function init(cv) {
    canvas = cv;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x7fb6f5); scene.fog = new THREE.Fog(0x7fb6f5, 45, 95);
    camera = new THREE.PerspectiveCamera(46, 9 / 16, 0.5, 120);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a93b5, 2.1));
    sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    buildArena(); buildBall(); buildMarkers(); buildParticles();
    paintCourt(TEAMS[0].c1, TEAMS[0].c2);
    resize(); window.addEventListener('resize', resize);
  }
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  const camPos = new THREE.Vector3(0, 12, 12), camLook = new THREE.Vector3();
  // move a câmera suavemente até (px,py,pz) olhando para (lx,ly,lz)
  function cam(px, py, pz, lx, ly, lz, k = 1) {
    camPos.x += (px - camPos.x) * k; camPos.y += (py - camPos.y) * k; camPos.z += (pz - camPos.z) * k;
    camLook.x += (lx - camLook.x) * k; camLook.y += (ly - camLook.y) * k; camLook.z += (lz - camLook.z) * k;
  }
  const v3 = new THREE.Vector3();
  function project(x, y, z) {
    v3.set(x, y, z).project(camera);
    return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, vis: v3.z < 1 };
  }
  function update(dt) {
    time += dt;
    hype = Math.max(0, hype - dt * 0.45);
    crowdGroups.forEach((g, i) => { g.position.y = Math.abs(Math.sin(time * (5 + i * 0.7) + i * 1.3)) * (0.03 + hype * 0.22); });
    hoops.forEach((h) => h.update(dt));
    updateParticles(dt);
    if (star.visible) star.rotation.y += dt * 3;
    shakeA *= Math.exp(-dt * 7);
  }
  function render() {
    camera.position.copy(camPos);
    if (shakeA > 0.002) { camera.position.x += Math.sin(time * 61) * shakeA; camera.position.y += Math.cos(time * 53) * shakeA; }
    camera.lookAt(camLook);
    sun.position.set(camLook.x + 7, 20, camLook.z + 9); sun.target.position.set(camLook.x, 0, camLook.z);
    renderer.render(scene, camera);
  }
  return {
    init, resize, render, update, cam, project, paintCourt, setBoard, makeModel, disposeModel, animate, applyPose, POSE_KEYS,
    setArrow, setRing, setCones, burst, hoops,
    traj: (pts) => setDots(trajDots, pts), floor: (pts) => setDots(floorDots, pts),
    setGlow, setTrail, get ball2() { return ball2; },
    get ball() { return ball; }, get star() { return star; }, get userRing() { return userRing; }, get manRing() { return manRing; }, get passRing() { return passRing; },
    get camera() { return camera; }, get size() { return { W, H }; },
    hypeUp: (a) => { hype = Math.min(1.2, hype + a); }, shake: (a) => { shakeA = Math.max(shakeA, a); },
    setShadows: (on) => { renderer.shadowMap.enabled = on; sun.castShadow = on; scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); }); },
    setFov: (f) => { if (camera.fov !== f) { camera.fov = f; camera.updateProjectionMatrix(); } },
    get time() { return time; },
  };
})();

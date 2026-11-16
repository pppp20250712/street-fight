// 街頭格鬥 Street Fight 3D — game flow, HUD and input (port of GameView.kt)
'use strict';

const Scene = { TITLE: 0, FIGHT: 1 };
const Phase = { INTRO: 0, PLAY: 1, KO: 2, END: 3 };

class Game {
  constructor(glCanvas, hudCanvas) {
    this.hud = hudCanvas; this.c = hudCanvas.getContext('2d');
    this.r3d = new Renderer3D(glCanvas); this.glCanvas = glCanvas;
    this.sfx = new Sfx();
    this.frame = 0; this.scene = Scene.TITLE; this.phase = Phase.INTRO; this.phaseT = 0;
    this.round = 1; this.timer = 0; this.hitstop = 0; this.shakeAmt = 0; this.difficulty = 1; this.selected = 0;
    this.koText = ''; this.endTitle = ''; this.endSub = ''; this.roundWinner = null;
    this.comboText = ''; this.comboT = 0; this.comboLeft = true;
    this.empty = new Input(); this.p1in = new Input();
    this.p1 = new Fighter(Styles.RYO, 110, 1); this.p2 = new Fighter(Styles.MEI, 274, -1);
    this.ai = new AI(); this.projs = []; this.parts = []; this.bursts = []; this.hp = { x: 0, y: 0 };
    this.prevA = new Fighter(Styles.RYO, 120, 1); this.prevB = new Fighter(Styles.MEI, 264, -1);
    this.scale = 1; this.ox = 0; this.oy = 0;
    this.cardA = {}; this.cardB = {}; this.diffBtn = {};
    this.joyX = 0; this.joyY = 0; this.joyR = 1; this.knobX = 0; this.knobY = 0;
    this.btnX = [0, 0, 0]; this.btnY = [0, 0, 0]; this.btnR = 1;
    this.btnMain = ['拳', '腳', '必殺']; this.btnSub = ['PUNCH', 'KICK', 'SPECIAL']; this.btnColor = ['#ff8a2a', '#3a9bff', '#c04aff'];
    this.diffNames = ['簡單 EASY', '普通 NORMAL', '困難 HARD'];
    this.joyId = -1; this.btnId = [-1, -1, -1];
    this.kLeft = false; this.kRight = false; this.kUp = false; this.kDown = false;
    this.latchP = false; this.latchK = false; this.latchS = false;
    this.tapped = false; this.tapX = 0; this.tapY = 0; this.keyNav = 0; this.keyConfirm = false;
    this.acc = 0; this.last = 0;
    this.cam = new CamRig();
    this.view = { title: true, fighters: [this.prevA, this.prevB], projs: this.projs, parts: this.parts, bursts: this.bursts, shake: 0, frame: 0, ko: false, cam: this.cam };
    this.bindInput();
    this.resize(); window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(t => this.loop(t));
  }

  // ---------------------------------------------------------------- loop
  loop(t) {
    if (!this.last) this.last = t;
    this.acc += (t - this.last) / 1000; this.last = t;
    if (this.acc > 0.25) this.acc = 0.25;
    const dt = 1 / 60;
    while (this.acc >= dt) { this.step(); this.acc -= dt; }
    this.draw();
    requestAnimationFrame(tt => this.loop(tt));
  }
  step() {
    this.frame++;
    let jl = false, jr = false, ju = false, jd = false;
    if (this.joyId !== -1) {
      const dx = (this.knobX - this.joyX) / this.joyR, dy = (this.knobY - this.joyY) / this.joyR;
      jl = dx < -0.35; jr = dx > 0.35; ju = dy < -0.5; jd = dy > 0.5;
    }
    const p = this.p1in;
    p.left = this.kLeft || jl; p.right = this.kRight || jr; p.up = this.kUp || ju; p.down = this.kDown || jd;
    p.p = this.latchP; p.k = this.latchK; p.s = this.latchS;
    this.latchP = this.latchK = this.latchS = false;
    if (this.scene === Scene.TITLE) this.titleStep(); else this.fightStep();
    this.tapped = false; this.keyNav = 0; this.keyConfirm = false;
    this.syncView(); this.cam.update(this.view);
  }

  // ---------------------------------------------------------------- title
  titleStep() {
    this.prevA.update(this.empty, this.prevB, this); this.prevB.update(this.empty, this.prevA, this);
    if (this.keyNav !== 0) { this.selected = (this.selected + this.keyNav + 2) % 2; this.sfx.play('select'); }
    if (this.tapped) {
      if (inRect(this.cardA, this.tapX, this.tapY)) { this.selected = 0; this.startMatch(0); }
      else if (inRect(this.cardB, this.tapX, this.tapY)) { this.selected = 1; this.startMatch(1); }
      else if (inRect(this.diffBtn, this.tapX, this.tapY)) { this.difficulty = (this.difficulty + 1) % 3; this.sfx.play('select'); }
    } else if (this.keyConfirm) this.startMatch(this.selected);
  }
  startMatch(i) {
    this.sfx.play('select');
    this.p1 = new Fighter(Styles.ALL[i], 110, 1); this.p2 = new Fighter(Styles.ALL[1 - i], 274, -1);
    this.ai.level = this.difficulty; this.round = 1; this.scene = Scene.FIGHT;
    this.startRound();
  }
  startRound() {
    this.p1.resetForRound(110, 1); this.p2.resetForRound(274, -1);
    this.projs.length = 0; this.parts.length = 0; this.bursts.length = 0;
    this.phase = Phase.INTRO; this.phaseT = 0; this.timer = 60 * 60; this.hitstop = 0; this.comboT = 0;
    this.ai.reset(); this.roundWinner = null;
  }

  // ---------------------------------------------------------------- fight
  fightStep() {
    this.updateFx();
    if (this.shakeAmt > 0) { this.shakeAmt *= 0.85; if (this.shakeAmt < 0.3) this.shakeAmt = 0; }
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.phaseT++;
    const p1 = this.p1, p2 = this.p2, E = this.empty;
    switch (this.phase) {
      case Phase.INTRO:
        if (this.phaseT === 2) this.sfx.play('bell');
        if (this.phaseT === 80) this.sfx.play('fight');
        p1.update(E, p2, this); p2.update(E, p1, this);
        if (this.phaseT >= 110) { this.phase = Phase.PLAY; this.phaseT = 0; p1.setState(St.IDLE); p2.setState(St.IDLE); }
        break;
      case Phase.PLAY: {
        if (this.timer > 0) this.timer--;
        const ain = this.ai.think(p2, p1, this.projs);
        p1.update(this.p1in, p2, this); p2.update(ain, p1, this);
        this.separate(); this.checkHit(p1, p2); this.checkHit(p2, p1); this.updateProjs();
        if (this.comboT > 0) this.comboT--;
        if (p1.hp <= 0 || p2.hp <= 0) this.endRound(true); else if (this.timer <= 0) this.endRound(false);
        break;
      }
      case Phase.KO: {
        const slow = this.phaseT < 70 && this.phaseT % 3 !== 0;
        if (!slow) { p1.update(E, p2, this); p2.update(E, p1, this); this.separate(); this.updateProjs(); }
        if (this.phaseT === 80 && this.roundWinner) { const w = this.roundWinner; if (w.hp > 0 && w.grounded) { w.move = null; w.setState(St.WIN); } }
        if (this.phaseT >= 170) {
          if (p1.wins >= 2 || p2.wins >= 2 || this.round >= 5) {
            this.phase = Phase.END; this.phaseT = 0;
            if (p1.wins > p2.wins) { this.endTitle = 'YOU WIN!  你贏了！'; this.endSub = `${p1.style.name} 勝利 PERFECT FIGHTER`; }
            else if (p2.wins > p1.wins) { this.endTitle = 'YOU LOSE  你輸了'; this.endSub = `${p2.style.name} 勝利 — 再挑戰一次！ TRY AGAIN`; }
            else { this.endTitle = 'DRAW GAME  平手'; this.endSub = ''; }
            this.sfx.play('fight');
          } else { this.round++; this.startRound(); }
        }
        break;
      }
      case Phase.END:
        p1.update(E, p2, this); p2.update(E, p1, this);
        if (this.phaseT > 40 && (this.tapped || this.keyConfirm)) {
          this.scene = Scene.TITLE; this.prevA.resetForRound(120, 1); this.prevB.resetForRound(264, -1);
        }
        break;
    }
  }
  endRound(ko) {
    this.phase = Phase.KO; this.phaseT = 0;
    const p1 = this.p1, p2 = this.p2;
    let w = null;
    if (p1.hp <= 0 && p2.hp <= 0) w = null; else if (p2.hp <= 0) w = p1; else if (p1.hp <= 0) w = p2; else if (p1.hp > p2.hp) w = p1; else if (p2.hp > p1.hp) w = p2;
    if (w) w.wins++;
    this.roundWinner = w; this.koText = ko ? 'K.O.' : 'TIME UP';
    this.sfx.play(ko ? 'ko' : 'bell');
  }
  separate() {
    const p1 = this.p1, p2 = this.p2;
    if (p1.state === St.KNOCKDOWN || p1.state === St.KO || p2.state === St.KNOCKDOWN || p2.state === St.KO) return;
    const dx = p2.x - p1.x, minD = 20;
    if (Math.abs(dx) < minD && Math.abs(p1.y - p2.y) < 40) {
      const push = (minD - Math.abs(dx)) / 2;
      const s = dx > 0 ? 1 : (dx < 0 ? -1 : -p1.facing);
      p1.x -= push * s; p2.x += push * s;
      p1.x = clamp(p1.x, G.WALL, G.W - G.WALL); p2.x = clamp(p2.x, G.WALL, G.W - G.WALL);
      if (Math.abs(p2.x - p1.x) < minD - 1) {
        if (p1.x <= G.WALL + 1 || p1.x >= G.W - G.WALL - 1) p2.x = p1.x + minD * s; else p1.x = p2.x - minD * s;
      }
      p1.refresh(); p2.refresh();
    }
  }
  circleHitsRect(cx, cy, r, rc) {
    const nx = clamp(cx, rc.left, rc.right), ny = clamp(cy, rc.top, rc.bottom);
    const dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy <= r * r;
  }
  checkHit(a, b) {
    const m = a.move; if (!m) return;
    if (m.projectile || m.limb === Limb.NONE || !a.isActive()) return;
    if (m.multiEvery > 0) { if (a.moveT - a.lastHitT < m.multiEvery) return; } else if (a.hitDone) return;
    const r = b.hurtRect(); if (!r) return;
    a.hitPoint(this.hp);
    if (!this.circleHitsRect(this.hp.x, this.hp.y, m.reach, r)) return;
    a.hitDone = true; a.lastHitT = a.moveT;
    this.resolve(a, b, m, this.hp.x, this.hp.y);
  }
  resolve(att, def, m, hx, hy) {
    const heightOk = m.height === Hgt.LOW ? def.guardLow : (m.height === Hgt.HIGH ? !def.guardLow : true);
    const away = def.x >= att.x ? 1 : -1;
    const cornered = def.x <= G.WALL + 2 || def.x >= G.W - G.WALL - 2;
    if (def.canBlock() && def.guardBack && heightOk) {
      if (def.hp > 1) def.hp = Math.max(1, def.hp - m.chip);
      def.move = null; def.setState(St.BLOCK); def.stun = m.blockstun; def.vx = away * (m.push + 0.6);
      if (cornered && !m.projectile) att.vx = -away * 1.6;
      this.spark(hx, hy, true); this.sfx.play('block', 0.8); this.hitstop = 4;
      return;
    }
    const wasHurt = def.state === St.HIT || def.state === St.KNOCKDOWN;
    def.comboTaken = wasHurt ? def.comboTaken + 1 : 1;
    const scaleF = Math.max(0.5, 1 - 0.12 * (def.comboTaken - 1));
    const mul = m.kind === 0 ? att.style.punchMul : (m.kind === 1 ? att.style.kickMul : 1);
    def.hp = Math.max(0, def.hp - m.damage * mul * scaleF);
    def.redDelay = 30; def.flash = 6; def.move = null;
    if (def.hp <= 0) { def.setState(St.KO); def.vy = -4; def.vx = away * 2.4; this.hitstop = 24; this.shake(6); }
    else if (m.knockdown || !def.grounded) { def.setState(St.KNOCKDOWN); def.vy = -3.4; def.vx = away * 2; this.hitstop = 8; this.shake(4); }
    else { def.setState(St.HIT); def.stun = m.hitstun; def.vx = away * m.push; this.hitstop = m.kind === 0 ? 5 : 7; this.shake(m.kind === 0 ? 2 : 3.5); }
    if (cornered && !m.projectile && att.grounded) att.vx = -away * 1.8;
    this.spark(hx, hy, false);
    this.sfx.play(m.kind === 0 ? 'hit' : 'heavy', 1, 0.9 + Math.random() * 0.2);
    if (def.comboTaken >= 2) { this.comboText = `${def.comboTaken} HITS!`; this.comboT = 70; this.comboLeft = att === this.p1; }
  }

  // ---------------------------------------------------------------- projectiles & effects
  hasProj(f) { return this.projs.some(p => p.owner === f && !p.dead); }
  spawnProj(f) { this.projs.push(new Proj(f.skel.fHX + f.facing * 4, f.skel.fHY, 3.4 * f.facing, f)); }
  updateProjs() {
    for (const pr of this.projs) {
      if (pr.dead) continue;
      pr.x += pr.vx; pr.life--; pr.anim++;
      if (pr.life <= 0 || pr.x < -10 || pr.x > G.W + 10) { pr.dead = true; continue; }
      for (const o of this.projs) {
        if (o !== pr && !o.dead && o.owner !== pr.owner && Math.abs(o.x - pr.x) < 10 && Math.abs(o.y - pr.y) < 12) {
          o.dead = true; pr.dead = true; this.spark((o.x + pr.x) / 2, pr.y, true); this.sfx.play('block');
        }
      }
      if (pr.dead) continue;
      const target = pr.owner === this.p1 ? this.p2 : this.p1;
      const r = target.hurtRect(); if (!r) continue;
      if (this.circleHitsRect(pr.x, pr.y, 7, r)) { pr.dead = true; this.resolve(pr.owner, target, Moves.KIBLAST, pr.x, pr.y); }
    }
    for (let i = this.projs.length - 1; i >= 0; i--) if (this.projs[i].dead) this.projs.splice(i, 1);
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  dust(x, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + Math.random() * 20 - 10, y: G.FLOOR - 1, z: (Math.random() - 0.5) * 0.6, vx: Math.random() * 1.6 - 0.8, vy: -Math.random() * 0.8, vz: 0, life: 18 + rndI(10), color: 0xB8A8B8, size: 1.5, grav: 0.02 });
  }
  spark(x, y, block) {
    this.bursts.push({ x, y, t: 0, block });
    const cols = block ? [0x8FE0FF, 0xFFFFFF, 0x3A9BFF] : [0xFFF070, 0xFFFFFF, 0xFF8A2A];
    for (let i = 0; i < (block ? 6 : 12); i++) {
      const a = Math.random() * 6.283, sp = 1 + Math.random() * 2.4;
      this.parts.push({ x, y, z: 0.35, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: (Math.random() - 0.3) * 0.05, life: 10 + rndI(10), color: cols[rndI(cols.length)], size: 1.5, grav: 0.1 });
    }
  }
  updateFx() {
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy += p.grav; p.vx *= 0.94; p.life--; }
    for (let i = this.parts.length - 1; i >= 0; i--) if (this.parts[i].life <= 0) this.parts.splice(i, 1);
    for (const b of this.bursts) b.t++;
    for (let i = this.bursts.length - 1; i >= 0; i--) if (this.bursts[i].t > 7) this.bursts.splice(i, 1);
  }

  // ---------------------------------------------------------------- input
  bindInput() {
    const h = this.hud;
    const pos = e => { const r = h.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    h.addEventListener('pointerdown', e => {
      e.preventDefault(); this.sfx.unlock();
      try { h.setPointerCapture(e.pointerId); } catch (_) {}
      const [x, y] = pos(e), id = e.pointerId;
      if (this.scene !== Scene.FIGHT || this.phase === Phase.END) { this.tapped = true; this.tapX = x; this.tapY = y; return; }
      if (x < this.W * 0.45) { if (this.joyId === -1) { this.joyId = id; this.moveKnob(x, y); } }
      else {
        let best = -1, bestD = Infinity;
        for (let i = 0; i < 3; i++) { const d = Math.hypot(x - this.btnX[i], y - this.btnY[i]); if (d < this.btnR * 1.5 && d < bestD && this.btnId[i] === -1) { best = i; bestD = d; } }
        if (best >= 0) { this.btnId[best] = id; if (best === 0) this.latchP = true; else if (best === 1) this.latchK = true; else this.latchS = true; }
      }
    });
    h.addEventListener('pointermove', e => { if (e.pointerId === this.joyId) { const [x, y] = pos(e); this.moveKnob(x, y); } });
    const up = e => {
      const id = e.pointerId;
      if (id === this.joyId) { this.joyId = -1; this.knobX = this.joyX; this.knobY = this.joyY; }
      for (let i = 0; i < 3; i++) if (this.btnId[i] === id) this.btnId[i] = -1;
    };
    h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    h.addEventListener('contextmenu', e => e.preventDefault());
    const keyMap = (code, down) => {
      switch (code) {
        case 'ArrowLeft': case 'KeyA': this.kLeft = down; if (down) this.keyNav = -1; return true;
        case 'ArrowRight': case 'KeyD': this.kRight = down; if (down) this.keyNav = 1; return true;
        case 'ArrowUp': case 'KeyW': case 'Space': this.kUp = down; return true;
        case 'ArrowDown': case 'KeyS': this.kDown = down; return true;
        case 'KeyJ': case 'KeyZ': if (down) { this.latchP = true; this.keyConfirm = true; } return true;
        case 'KeyK': case 'KeyX': if (down) this.latchK = true; return true;
        case 'KeyL': case 'KeyC': if (down) this.latchS = true; return true;
        case 'Enter': case 'NumpadEnter': if (down) this.keyConfirm = true; return true;
      }
      return false;
    };
    window.addEventListener('keydown', e => { this.sfx.unlock(); if (e.repeat) { if (keyMap(e.code, true) !== false) e.preventDefault(); return; } if (keyMap(e.code, true)) e.preventDefault(); });
    window.addEventListener('keyup', e => { if (keyMap(e.code, false)) e.preventDefault(); });
    window.addEventListener('blur', () => { this.kLeft = this.kRight = this.kUp = this.kDown = false; this.joyId = -1; this.btnId.fill(-1); });
  }
  moveKnob(x, y) {
    let dx = x - this.joyX, dy = y - this.joyY; const d = Math.hypot(dx, dy);
    if (d > this.joyR) { dx = dx / d * this.joyR; dy = dy / d * this.joyR; }
    this.knobX = this.joyX + dx; this.knobY = this.joyY + dy;
  }

  // ---------------------------------------------------------------- layout & drawing
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = window.innerWidth, h = window.innerHeight;
    this.W = w; this.H = h; this.dpr = dpr;
    for (const c of [this.glCanvas, this.hud]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px'; }
    this.scale = Math.min(w / G.W, h / G.H);
    this.ox = (w - G.W * this.scale) / 2; this.oy = (h - G.H * this.scale) / 2;
    this.joyR = h * 0.15; this.joyX = Math.max(this.joyR * 1.35, w * 0.12); this.joyY = h - this.joyR * 1.35;
    this.knobX = this.joyX; this.knobY = this.joyY;
    this.btnR = h * 0.085;
    const kx = w - this.btnR * 1.6, ky = h - this.btnR * 1.7;
    this.btnX[1] = kx; this.btnY[1] = ky;
    this.btnX[0] = kx - this.btnR * 2.5; this.btnY[0] = ky + this.btnR * 0.15;
    this.btnX[2] = kx - this.btnR * 1.25; this.btnY[2] = ky - this.btnR * 2.2;
    const X = v => this.X(v), Y = v => this.Y(v);
    this.cardA = { l: X(78), t: Y(98), r: X(162), b: Y(203) };
    this.cardB = { l: X(222), t: Y(98), r: X(306), b: Y(203) };
    this.diffBtn = { l: X(166), t: Y(138), r: X(218), b: Y(168) };
  }
  X(v) { return this.ox + v * this.scale; }
  Y(v) { return this.oy + v * this.scale; }

  syncView() {
    const v = this.view, fight = this.scene === Scene.FIGHT;
    v.title = !fight; v.fighters[0] = fight ? this.p1 : this.prevA; v.fighters[1] = fight ? this.p2 : this.prevB;
    v.shake = fight ? this.shakeAmt : 0; v.frame = this.frame; v.ko = fight && this.phase === Phase.KO;
  }
  draw() {
    const fight = this.scene === Scene.FIGHT;
    this.syncView();
    this.r3d.render(this.view, this.glCanvas.width, this.glCanvas.height);
    const c = this.c;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    if (!fight) this.drawTitle(c); else { this.drawHud(c); this.drawControls(c); }
  }
  label(c, s, x, y, size, color, align = 'center') {
    c.font = `900 ${size}px "Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei",sans-serif`;
    c.textAlign = align; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    c.lineWidth = Math.max(2, size * 0.16); c.strokeStyle = '#000'; c.strokeText(s, x, y);
    c.fillStyle = color; c.fillText(s, x, y);
  }
  roundRect(c, r, rad) { c.beginPath(); c.roundRect(r.l, r.t, r.r - r.l, r.b - r.t, rad); }
  drawTitle(c) {
    const s = this.scale, w = this.W, X = v => this.X(v), Y = v => this.Y(v);
    const grd = c.createLinearGradient(0, 0, 0, Y(100));
    grd.addColorStop(0, 'rgba(0,0,0,0.75)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grd; c.fillRect(0, 0, w, Y(100));
    const pulse = (Math.sin(this.frame * 0.12) + 1) / 2;
    this.label(c, 'STREET FIGHT', w / 2, Y(36), 30 * s, '#ffd040');
    this.label(c, '街 頭 格 鬥  3D', w / 2, Y(58), 15 * s, '#ff5a3a');
    this.label(c, '選擇你的格鬥家   CHOOSE YOUR FIGHTER', w / 2, Y(84), 8 * s, '#fff');
    for (let i = 0; i < 2; i++) {
      const r = i === 0 ? this.cardA : this.cardB, st = Styles.ALL[i], sel = this.selected === i;
      c.fillStyle = sel ? 'rgba(255,208,64,0.16)' : 'rgba(0,0,0,0.12)'; this.roundRect(c, r, 6 * s); c.fill();
      c.lineWidth = sel ? 2.5 * s : 1.2 * s; c.strokeStyle = sel ? `rgb(255,${Math.round(180 + 70 * pulse)},60)` : 'rgba(255,255,255,0.6)'; c.stroke();
      const cx = (r.l + r.r) / 2;
      this.label(c, `${st.name}  ${st.cn}`, cx, r.t + 13 * s, 11 * s, '#fff');
      this.label(c, st.tag, cx, r.t + 23 * s, 6.5 * s, '#ffd040');
      this.label(c, st.specialName, cx, r.b + 9 * s, 6 * s, '#ffb0a0');
    }
    const d = this.diffBtn;
    c.fillStyle = 'rgba(26,16,40,0.8)'; this.roundRect(c, d, 5 * s); c.fill();
    c.lineWidth = 1.2 * s; c.strokeStyle = '#3fe8ff'; c.stroke();
    const dcx = (d.l + d.r) / 2;
    this.label(c, '難度 LEVEL', dcx, d.t + 11 * s, 6.5 * s, '#3fe8ff');
    this.label(c, this.diffNames[this.difficulty], dcx, d.t + 23 * s, 7 * s, '#fff');
    if (Math.floor(this.frame / 30) % 2 === 0) this.label(c, '點選角色開始  TAP A FIGHTER', w / 2, Y(126), 6.5 * s, '#fff');
    this.label(c, '鍵盤 Keys: ← → 移動  ↑ 跳  ↓ 蹲  J 拳  K 腳  L 必殺   (按住「後」防禦 hold BACK to block)', w / 2, Y(214), 5.5 * s, '#ddd');
  }
  drawHud(c) {
    const s = this.scale, X = v => this.X(v), Y = v => this.Y(v), p1 = this.p1, p2 = this.p2;
    this.drawBar(c, p1, 14, true); this.drawBar(c, p2, 214, false);
    this.label(c, `${p1.style.name} ${p1.style.cn}`, X(14), Y(31), 9 * s, '#fff', 'left');
    this.label(c, `${p2.style.name} ${p2.style.cn}`, X(370), Y(31), 9 * s, '#fff', 'right');
    this.label(c, 'YOU', X(14), Y(41), 6 * s, '#7cff7c', 'left');
    this.label(c, 'CPU', X(370), Y(41), 6 * s, '#ff7c7c', 'right');
    for (let i = 0; i < 2; i++) {
      c.fillStyle = p1.wins > i ? '#ffd040' : 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(X(166 - i * 9), Y(27), 3 * s, 0, 7); c.fill();
      c.fillStyle = p2.wins > i ? '#ffd040' : 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(X(218 + i * 9), Y(27), 3 * s, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.8)'; c.beginPath(); c.roundRect(X(178), Y(5), 28 * s, 19 * s, 3 * s); c.fill();
    const secs = Math.floor((this.timer + 59) / 60);
    this.label(c, String(secs), X(192), Y(21), 16 * s, secs <= 10 ? '#ff5a3a' : '#fff');
    if (this.comboT > 0) this.label(c, this.comboText, this.comboLeft ? X(20) : X(364), Y(70), 12 * s, '#ffd040', this.comboLeft ? 'left' : 'right');
    const cx = this.W / 2;
    if (this.phase === Phase.INTRO) {
      if (this.phaseT < 80) this.label(c, `ROUND ${this.round}`, cx, Y(100), 28 * s, '#ffd040');
      else this.label(c, 'FIGHT!  開打！', cx, Y(100), 30 * s, '#ff5a3a');
    } else if (this.phase === Phase.KO) {
      if (this.phaseT < 110) { const big = this.koText === 'K.O.' ? 46 : 30; this.label(c, this.koText, cx, Y(105), big * s, this.koText === 'K.O.' ? '#ff3a2a' : '#ffd040'); }
      else { const w = this.roundWinner; this.label(c, w ? `${w.style.name} WINS  勝！` : 'DOUBLE KO / DRAW  平手', cx, Y(100), 22 * s, '#fff'); }
    } else if (this.phase === Phase.END) {
      c.fillStyle = 'rgba(0,0,0,0.53)'; c.fillRect(0, Y(70), this.W, 70 * s);
      this.label(c, this.endTitle, cx, Y(100), 26 * s, p1.wins > p2.wins ? '#ffd040' : '#ff5a3a');
      this.label(c, this.endSub, cx, Y(116), 8 * s, '#fff');
      if (this.phaseT > 40 && Math.floor(this.frame / 30) % 2 === 0) this.label(c, '點擊返回選單  TAP TO CONTINUE', cx, Y(132), 7 * s, '#ddd');
    }
  }
  drawBar(c, f, x0, left) {
    const w = 156, X = v => this.X(v), Y = v => this.Y(v), s = this.scale;
    c.fillStyle = '#000'; c.fillRect(X(x0 - 2), Y(8), (w + 4) * s, 12 * s);
    c.fillStyle = '#5a0a0a'; c.fillRect(X(x0), Y(10), w * s, 8 * s);
    const red = w * f.redHp / 100, cur = w * f.hp / 100;
    c.fillStyle = '#ff3a2a'; if (left) c.fillRect(X(x0), Y(10), red * s, 8 * s); else c.fillRect(X(x0 + w - red), Y(10), red * s, 8 * s);
    const g = c.createLinearGradient(0, Y(10), 0, Y(18)); const low = f.hp < 25 && Math.floor(this.frame / 8) % 2 === 0;
    g.addColorStop(0, low ? '#ffffff' : '#fff090'); g.addColorStop(1, low ? '#ffffff' : '#e8b020');
    c.fillStyle = g; if (left) c.fillRect(X(x0), Y(10), cur * s, 8 * s); else c.fillRect(X(x0 + w - cur), Y(10), cur * s, 8 * s);
  }
  drawControls(c) {
    if (this.phase === Phase.END) return;
    c.fillStyle = 'rgba(255,255,255,0.19)'; c.beginPath(); c.arc(this.joyX, this.joyY, this.joyR, 0, 7); c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.stroke();
    c.fillStyle = this.joyId !== -1 ? 'rgba(255,255,255,0.67)' : 'rgba(255,255,255,0.47)';
    c.beginPath(); c.arc(this.knobX, this.knobY, this.joyR * 0.42, 0, 7); c.fill();
    for (let i = 0; i < 3; i++) {
      const pressed = this.btnId[i] !== -1, R = this.btnR;
      c.globalAlpha = pressed ? 0.93 : 0.53; c.fillStyle = this.btnColor[i];
      c.beginPath(); c.arc(this.btnX[i], this.btnY[i], R * (pressed ? 0.92 : 1), 0, 7); c.fill(); c.globalAlpha = 1;
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.67)'; c.beginPath(); c.arc(this.btnX[i], this.btnY[i], R, 0, 7); c.stroke();
      this.label(c, this.btnMain[i], this.btnX[i], this.btnY[i] + R * 0.12, R * (i === 2 ? 0.55 : 0.7), '#fff');
      this.label(c, this.btnSub[i], this.btnX[i], this.btnY[i] + R * 0.55, R * 0.24, '#fff');
    }
  }
}
function inRect(r, x, y) { return x >= r.l && x <= r.r && y >= r.t && y <= r.b; }

window.addEventListener('load', () => {
  const gl = document.getElementById('gl'), hud = document.getElementById('hud');
  try { window.game = new Game(gl, hud); }
  catch (e) { document.getElementById('err').style.display = 'flex'; document.getElementById('errmsg').textContent = String(e && e.message || e); console.error(e); }
});

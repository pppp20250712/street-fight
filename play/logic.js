// 街頭格鬥 Street Fight 3D — game logic (port of Data.kt / Fighter.kt / AI.kt / Sfx.kt)
'use strict';

const G = { W: 384, H: 216, FLOOR: 196, GRAV: 0.32, JUMP_V: -6.3, WALL: 16 };
const Dim = { T: 13, S: 13, TORSO: 19, UA: 10, FA: 10, HR: 5.5 };
const rad = d => d * 0.017453292;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const rndF = () => Math.random();
const rndI = n => Math.floor(Math.random() * n);

class Pose {
  constructor(o) {
    this.lean = 6; this.bU = 35; this.bL = 155; this.fU = 55; this.fL = 150;
    this.blU = -22; this.blL = -8; this.flU = 22; this.flL = 6;
    this.head = 0; this.rot = 0; this.lift = 0;
    if (o) Object.assign(this, o);
  }
  copy(o) { const p = new Pose(this); if (o) Object.assign(p, o); return p; }
  mix(o, t) {
    const u = clamp(t, 0, 1);
    const m = (a, b) => a + (b - a) * u;
    return new Pose({
      lean: m(this.lean, o.lean), bU: m(this.bU, o.bU), bL: m(this.bL, o.bL), fU: m(this.fU, o.fU), fL: m(this.fL, o.fL),
      blU: m(this.blU, o.blU), blL: m(this.blL, o.blL), flU: m(this.flU, o.flU), flL: m(this.flL, o.flL),
      head: m(this.head, o.head), rot: m(this.rot, o.rot), lift: m(this.lift, o.lift)
    });
  }
}

const Poses = {};
Poses.RYO_IDLE = new Pose();
Poses.MEI_IDLE = new Pose({ lean: 3, bU: 40, bL: 150, fU: 72, fL: 100, blU: -14, blL: -4, flU: 18, flL: -6 });
Poses.CROUCH = new Pose({ lean: 28, bU: 40, bL: 160, fU: 60, fL: 150, blU: 35, blL: -70, flU: 75, flL: 5 });
Poses.JUMP = new Pose({ lean: 4, bU: 40, bL: 150, fU: 60, fL: 140, blU: 10, blL: -60, flU: 75, flL: -15 });
Poses.P_WIND = new Pose({ lean: 0, bU: 30, bL: 150, fU: 40, fL: 165 });
Poses.P_STRIKE = new Pose({ lean: 14, bU: -25, bL: 110, fU: 90, fL: 90, blU: -26, blL: -10, flU: 26, flL: 8 });
Poses.K_WIND = new Pose({ lean: -6, flU: 80, flL: -5, blU: -8, blL: -4 });
Poses.K_STRIKE = new Pose({ lean: -18, bU: 20, bL: 150, fU: 30, fL: 140, blU: -8, blL: -4, flU: 100, flL: 95 });
Poses.CP_WIND = Poses.CROUCH.copy({ fU: 40, fL: 165 });
Poses.CP_STRIKE = Poses.CROUCH.copy({ lean: 22, fU: 90, fL: 90, bU: -20, bL: 110 });
Poses.SW_WIND = Poses.CROUCH.copy({ lean: 32 });
Poses.SW_STRIKE = new Pose({ lean: 38, bU: 40, bL: 150, fU: 20, fL: 10, blU: 55, blL: -75, flU: 88, flL: 90 });
Poses.JK_STRIKE = new Pose({ lean: -12, bU: 30, bL: 150, fU: 40, fL: 140, blU: 40, blL: -60, flU: 55, flL: 55 });
Poses.JP_STRIKE = Poses.JUMP.copy({ lean: 12, fU: 65, fL: 65 });
Poses.KB_WIND = new Pose({ lean: -10, bU: -40, bL: 15, fU: -35, fL: 20, blU: -35, blL: -20, flU: 32, flL: 15 });
Poses.KB_STRIKE = new Pose({ lean: 10, bU: 82, bL: 88, fU: 88, fL: 90, blU: -35, blL: -20, flU: 32, flL: 15 });
Poses.MEI_WIND = new Pose({ lean: -10, bU: 40, bL: 150, fU: 70, fL: 110, blU: -10, blL: -6, flU: 60, flL: -10 });
Poses.HIT = new Pose({ lean: -22, bU: -40, bL: -10, fU: 20, fL: 100, head: -20 });
Poses.BLOCK = new Pose({ lean: -6, bU: 15, bL: 165, fU: 25, fL: 172 });
Poses.CBLOCK = Poses.CROUCH.copy({ lean: 10, bU: 15, bL: 165, fU: 25, fL: 172 });
Poses.DOWN = new Pose({ lean: 0, bU: 150, bL: 150, fU: 170, fL: 170, blU: -5, blL: 0, flU: 8, flL: 5, head: -10, rot: 90 });
Poses.WIN = new Pose({ lean: 0, bU: 20, bL: 150, fU: 175, fL: 178, blU: -12, blL: -6, flU: 12, flL: 4 });
Poses.MEI_WIN = new Pose({ lean: -4, bU: 40, bL: 150, fU: 150, fL: 120, blU: -10, blL: -4, flU: 60, flL: -20 });

const Hgt = { HIGH: 0, MID: 1, LOW: 2 };
const Limb = { HAND: 0, FOOT: 1, NONE: 2 };

class Move {
  constructor(startup, active, recovery, damage, chip, hitstun, blockstun, push, height, limb, kind, windup, strike, o) {
    Object.assign(this, { startup, active, recovery, damage, chip, hitstun, blockstun, push, height, limb, kind, windup, strike });
    this.reach = 5; this.knockdown = false; this.crouching = false; this.air = false;
    this.multiEvery = 0; this.dash = 0; this.projectile = false; this.custom = null;
    if (o) Object.assign(this, o);
  }
  get total() { return this.startup + this.active + this.recovery; }
  poseAt(t, base) {
    if (this.custom) return this.custom(t, base);
    const s = this.startup;
    if (t <= s * 0.6) return base.mix(this.windup, t / (s * 0.6));
    if (t <= s) return this.windup.mix(this.strike, (t - s * 0.6) / (s * 0.4));
    if (t <= s + this.active) return this.strike;
    return this.strike.mix(base, (t - s - this.active) / this.recovery);
  }
}

const Moves = {};
Moves.PUNCH = new Move(4, 3, 9, 6, 0, 14, 10, 1.6, Hgt.MID, Limb.HAND, 0, Poses.P_WIND, Poses.P_STRIKE);
Moves.KICK = new Move(8, 4, 14, 9, 0, 18, 12, 2.2, Hgt.MID, Limb.FOOT, 1, Poses.K_WIND, Poses.K_STRIKE, { reach: 6 });
Moves.CPUNCH = new Move(4, 3, 9, 5, 0, 13, 9, 1.4, Hgt.MID, Limb.HAND, 0, Poses.CP_WIND, Poses.CP_STRIKE, { crouching: true });
Moves.SWEEP = new Move(9, 4, 20, 8, 0, 16, 12, 1.5, Hgt.LOW, Limb.FOOT, 1, Poses.SW_WIND, Poses.SW_STRIKE, { reach: 6, knockdown: true, crouching: true });
Moves.JPUNCH = new Move(5, 8, 6, 7, 0, 16, 10, 1.5, Hgt.HIGH, Limb.HAND, 0, Poses.JUMP, Poses.JP_STRIKE, { air: true });
Moves.JKICK = new Move(6, 10, 6, 9, 0, 18, 12, 2.0, Hgt.HIGH, Limb.FOOT, 1, Poses.JUMP, Poses.JK_STRIKE, { reach: 6, air: true });
Moves.KIBLAST = new Move(14, 2, 24, 11, 2, 20, 14, 2.6, Hgt.MID, Limb.NONE, 2, Poses.KB_WIND, Poses.KB_STRIKE, { projectile: true });
Moves.PHOENIX = new Move(8, 28, 18, 4.5, 1, 16, 10, 0.8, Hgt.MID, Limb.FOOT, 2, Poses.MEI_WIND, Poses.K_STRIKE, {
  reach: 6, multiEvery: 7, dash: 2.0,
  custom: (t, base) => {
    const a = t - 8;
    if (a < 0) return base.mix(Poses.MEI_WIND, t / 8);
    if (a < 28) {
      const phase = Math.floor(a / 7) % 2;
      const ext = Math.sin((a % 7) / 7 * Math.PI);
      if (phase === 0) return new Pose({ lean: -16, bU: 30, bL: 150, fU: 60, fL: 110, blU: -10, blL: -6, flU: 40 + 65 * ext, flL: 20 + 75 * ext, lift: 2 });
      return new Pose({ lean: -16, bU: 30, bL: 150, fU: 60, fL: 110, blU: 40 + 65 * ext, blL: 20 + 75 * ext, flU: -10, flL: -5, lift: 2 });
    }
    return Poses.K_STRIKE.mix(base, (a - 28) / 18);
  }
});

const Styles = {
  RYO: {
    name: 'RYO', cn: '龍', tag: '力量型 POWER', mei: false,
    skin: 0xE8A878, top: 0xF4F4F6, pants: 0xE6E6EC, glove: 0xD42A2A, hair: 0x15141A, foot: 0xE8A878, trim: 0x101010,
    idle: Poses.RYO_IDLE, win: Poses.WIN, walk: 1.35, punchMul: 1.15, kickMul: 0.95,
    special: Moves.KIBLAST, specialCd: 75, specialName: '氣功彈 KI BLAST'
  },
  MEI: {
    name: 'MEI', cn: '美玲', tag: '速度型 SPEED', mei: true,
    skin: 0xF0B888, top: 0xC81E28, pants: 0x1A1418, glove: 0xC81E28, hair: 0x2A1A14, foot: 0x221A1E, trim: 0xF0C040,
    idle: Poses.MEI_IDLE, win: Poses.MEI_WIN, walk: 1.65, punchMul: 0.9, kickMul: 1.15,
    special: Moves.PHOENIX, specialCd: 70, specialName: '鳳凰連腳 PHOENIX KICKS'
  }
};
Styles.ALL = [Styles.RYO, Styles.MEI];

class Skeleton {
  constructor() {
    this.hipX = 0; this.hipY = 0; this.shX = 0; this.shY = 0; this.headX = 0; this.headY = 0;
    this.fsX = 0; this.fsY = 0; this.bsX = 0; this.bsY = 0;
    this.fElX = 0; this.fElY = 0; this.fHX = 0; this.fHY = 0; this.bElX = 0; this.bElY = 0; this.bHX = 0; this.bHY = 0;
    this.fKX = 0; this.fKY = 0; this.fFX = 0; this.fFY = 0; this.bKX = 0; this.bKY = 0; this.bFX = 0; this.bFY = 0;
  }
  build(x, y, facing, p) {
    const f = facing;
    const dx = (a, l) => Math.sin(rad(a)) * l * f;
    const dy = (a, l) => Math.cos(rad(a)) * l;
    const hFront = dy(p.flU, Dim.T) + dy(p.flL, Dim.S);
    const hBack = dy(p.blU, Dim.T) + dy(p.blL, Dim.S);
    const hipH = Math.max(Math.max(hFront, hBack), 3) + p.lift;
    this.hipX = x; this.hipY = y - hipH;
    this.fKX = this.hipX + dx(p.flU, Dim.T); this.fKY = this.hipY + dy(p.flU, Dim.T);
    this.fFX = this.fKX + dx(p.flL, Dim.S); this.fFY = this.fKY + dy(p.flL, Dim.S);
    this.bKX = this.hipX + dx(p.blU, Dim.T); this.bKY = this.hipY + dy(p.blU, Dim.T);
    this.bFX = this.bKX + dx(p.blL, Dim.S); this.bFY = this.bKY + dy(p.blL, Dim.S);
    this.shX = this.hipX + dx(p.lean, Dim.TORSO); this.shY = this.hipY - dy(p.lean, Dim.TORSO);
    this.headX = this.shX + dx(p.lean + p.head, Dim.HR + 2.5); this.headY = this.shY - dy(p.lean + p.head, Dim.HR + 2.5);
    this.fsX = this.shX + 1.5 * f; this.fsY = this.shY + 1;
    this.bsX = this.shX - 2 * f; this.bsY = this.shY + 1;
    this.fElX = this.fsX + dx(p.fU, Dim.UA); this.fElY = this.fsY + dy(p.fU, Dim.UA);
    this.fHX = this.fElX + dx(p.fL, Dim.FA); this.fHY = this.fElY + dy(p.fL, Dim.FA);
    this.bElX = this.bsX + dx(p.bU, Dim.UA); this.bElY = this.bsY + dy(p.bU, Dim.UA);
    this.bHX = this.bElX + dx(p.bL, Dim.FA); this.bHY = this.bElY + dy(p.bL, Dim.FA);
  }
}

const St = { INTRO: 0, IDLE: 1, WALK_F: 2, WALK_B: 3, CROUCH: 4, JUMP: 5, ATTACK: 6, BLOCK: 7, HIT: 8, KNOCKDOWN: 9, GETUP: 10, KO: 11, WIN: 12 };

class Input {
  constructor() { this.clear(); }
  clear() { this.left = false; this.right = false; this.up = false; this.down = false; this.p = false; this.k = false; this.s = false; }
}

class Fighter {
  constructor(style, startX, startFacing) {
    this.style = style;
    this.x = startX; this.y = G.FLOOR; this.vx = 0; this.vy = 0;
    this.facing = startFacing;
    this.hp = 100; this.redHp = 100; this.redDelay = 0;
    this.state = St.INTRO; this.stateT = 0;
    this.move = null; this.moveT = 0; this.hitDone = false; this.lastHitT = -999;
    this.attackSerial = 0;
    this.stun = 0; this.flash = 0; this.specialCd = 0;
    this.guardBack = false; this.guardLow = false;
    this.comboTaken = 0; this.wins = 0;
    this.airAttackUsed = false; this.walkPhase = 0; this.tick = 0;
    this.pose = style.idle;
    this.skel = new Skeleton();
    this.hurt = { left: 0, top: 0, right: 0, bottom: 0 };
    this.refresh();
  }
  get grounded() { return this.y >= G.FLOOR - 0.01; }
  resetForRound(px, f) {
    this.x = px; this.y = G.FLOOR; this.vx = 0; this.vy = 0; this.facing = f;
    this.hp = 100; this.redHp = 100; this.redDelay = 0;
    this.state = St.INTRO; this.stateT = 0; this.move = null; this.stun = 0; this.flash = 0; this.specialCd = 0;
    this.comboTaken = 0; this.airAttackUsed = false;
    this.refresh();
  }
  setState(s) { this.state = s; this.stateT = 0; }
  isNeutral() { const s = this.state; return s === St.IDLE || s === St.WALK_F || s === St.WALK_B || s === St.CROUCH; }
  canBlock() { return this.grounded && (this.isNeutral() || this.state === St.BLOCK); }
  isActive() {
    const m = this.move; if (!m) return false;
    return this.state === St.ATTACK && this.moveT > m.startup && this.moveT <= m.startup + m.active;
  }
  update(inp, opp, game) {
    this.tick++; this.stateT++;
    if (this.specialCd > 0) this.specialCd--;
    if (this.flash > 0) this.flash--;
    if (this.redDelay > 0) this.redDelay--; else if (this.redHp > this.hp) this.redHp = Math.max(this.hp, this.redHp - 0.6);
    switch (this.state) {
      case St.IDLE: case St.WALK_F: case St.WALK_B: case St.CROUCH: this.face(opp); this.ground(inp, game); break;
      case St.JUMP: this.air(inp, game); break;
      case St.ATTACK: this.attack(inp, game); break;
      case St.BLOCK:
        this.readGuard(inp); this.stun--; this.vx *= 0.8;
        if (this.stun <= 0) this.setState(inp.down ? St.CROUCH : St.IDLE);
        break;
      case St.HIT:
        this.stun--; this.vx *= 0.86;
        if (this.stun <= 0 && this.grounded) { this.setState(St.IDLE); this.comboTaken = 0; }
        break;
      case St.KNOCKDOWN:
        if (this.grounded) { this.vx *= 0.8; if (this.stateT > 55 && this.hp > 0) this.setState(St.GETUP); }
        break;
      case St.GETUP: this.vx = 0; if (this.stateT >= 26) { this.setState(St.IDLE); this.comboTaken = 0; } break;
      case St.KO: if (this.grounded) this.vx *= 0.85; break;
      case St.INTRO: case St.WIN: this.vx = 0; break;
    }
    this.physics(game);
    this.refresh();
  }
  face(opp) { if (Math.abs(opp.x - this.x) > 2) this.facing = opp.x > this.x ? 1 : -1; }
  readGuard(inp) { this.guardBack = this.facing === 1 ? inp.left : inp.right; this.guardLow = inp.down; }
  ground(inp, game) {
    this.readGuard(inp);
    const fwd = this.facing === 1 ? inp.right : inp.left;
    const back = this.guardBack;
    if (inp.s && this.specialCd === 0 && !game.hasProj(this)) { this.startMove(this.style.special, game); return; }
    if (inp.p) { this.startMove(inp.down ? Moves.CPUNCH : Moves.PUNCH, game); return; }
    if (inp.k) { this.startMove(inp.down ? Moves.SWEEP : Moves.KICK, game); return; }
    if (inp.up) {
      this.setState(St.JUMP); this.vy = G.JUMP_V;
      this.vx = fwd ? 1.9 * this.facing : (back ? -1.9 * this.facing : 0);
      this.airAttackUsed = false;
      game.sfx.play('whoosh', 0.35, 0.8);
      return;
    }
    if (inp.down) { if (this.state !== St.CROUCH) this.setState(St.CROUCH); this.vx = 0; return; }
    if (fwd) { if (this.state !== St.WALK_F) this.setState(St.WALK_F); this.vx = this.style.walk * this.facing; this.walkPhase += 0.2; }
    else if (back) { if (this.state !== St.WALK_B) this.setState(St.WALK_B); this.vx = -this.style.walk * 0.8 * this.facing; this.walkPhase -= 0.17; }
    else { if (this.state !== St.IDLE) this.setState(St.IDLE); this.vx = 0; }
  }
  air(inp, game) {
    if (!this.airAttackUsed && (inp.p || inp.k)) { this.airAttackUsed = true; this.startMove(inp.k ? Moves.JKICK : Moves.JPUNCH, game); }
  }
  startMove(m, game) {
    this.move = m; this.moveT = 0; this.hitDone = false; this.lastHitT = -999;
    this.attackSerial++;
    this.setState(St.ATTACK);
    if (!m.air) this.vx = 0;
    if (m.kind === 2) { this.specialCd = this.style.specialCd; game.sfx.play('special', 0.8); }
    else game.sfx.play('whoosh', 0.45, m.kind === 0 ? 1.35 : 1);
  }
  attack(inp, game) {
    const m = this.move; if (!m) { this.setState(St.IDLE); return; }
    this.moveT++;
    if (m.projectile && this.moveT === m.startup + 1) game.spawnProj(this);
    if (m.dash !== 0) this.vx = (this.moveT > m.startup && this.moveT <= m.startup + m.active) ? m.dash * this.facing : this.vx * 0.8;
    else if (!m.air) this.vx *= 0.7;
    if (this.moveT >= m.total) {
      this.move = null;
      if (m.air) { if (this.grounded) this.setState(St.IDLE); else { this.setState(St.JUMP); this.airAttackUsed = true; } }
      else { this.readGuard(inp); this.setState(inp.down ? St.CROUCH : St.IDLE); }
    }
  }
  physics(game) {
    if (!this.grounded || this.vy < 0) {
      this.vy += G.GRAV; this.y += this.vy;
      if (this.y >= G.FLOOR) { this.y = G.FLOOR; this.vy = 0; this.land(game); }
    }
    this.x += this.vx;
    this.x = clamp(this.x, G.WALL, G.W - G.WALL);
  }
  land(game) {
    switch (this.state) {
      case St.JUMP: this.setState(St.IDLE); game.dust(this.x, 4); break;
      case St.ATTACK: if (this.move && this.move.air) { this.move = null; this.setState(St.IDLE); game.dust(this.x, 4); } break;
      case St.KNOCKDOWN: case St.KO: game.dust(this.x - this.facing * 18, 10); game.shake(2.5); game.sfx.play('thud', 0.8); break;
    }
  }
  refresh() { this.pose = this.currentPose(); this.skel.build(this.x, this.y, this.facing, this.pose); }
  currentPose() {
    const idle = this.style.idle;
    switch (this.state) {
      case St.INTRO: case St.IDLE: {
        const b = Math.sin(this.tick * 0.1);
        return idle.copy({ lift: b * 0.7, fL: idle.fL + b * 4, bL: idle.bL - b * 3 });
      }
      case St.WALK_F: case St.WALK_B: {
        const s = Math.sin(this.walkPhase), c = Math.cos(this.walkPhase);
        const fT = idle.flU + s * 14, bT = idle.blU - s * 14;
        return idle.copy({ flU: fT, flL: fT - 12 - Math.max(0, c) * 18, blU: bT, blL: bT - 12 - Math.max(0, -c) * 18 });
      }
      case St.CROUCH: return Poses.CROUCH;
      case St.JUMP: return Poses.JUMP;
      case St.ATTACK: {
        const m = this.move; if (!m) return idle;
        const base = m.crouching ? Poses.CROUCH : (m.air ? Poses.JUMP : idle);
        return m.poseAt(this.moveT, base);
      }
      case St.BLOCK: return this.guardLow ? Poses.CBLOCK : Poses.BLOCK;
      case St.HIT: return Poses.HIT;
      case St.KNOCKDOWN: case St.KO: return Poses.HIT.mix(Poses.DOWN, this.stateT / 14);
      case St.GETUP: return this.stateT < 18 ? Poses.DOWN.mix(Poses.CROUCH, this.stateT / 18) : Poses.CROUCH.mix(idle, (this.stateT - 18) / 8);
      case St.WIN: return this.style.win.copy({ lift: Math.abs(Math.sin(this.tick * 0.12)) * 2 });
    }
    return idle;
  }
  hurtRect() {
    const s = this.state;
    if (s === St.KNOCKDOWN || s === St.GETUP || s === St.KO) return null;
    const h = this.hurt;
    h.left = this.x - 9; h.top = this.skel.headY - Dim.HR - 1; h.right = this.x + 9; h.bottom = Math.max(this.skel.fFY, this.skel.bFY);
    return h;
  }
  hitPoint(out) {
    const m = this.move, s = this.skel;
    if (m && m.limb === Limb.HAND) { out.x = s.fHX; out.y = s.fHY; return; }
    if ((s.fFX - this.x) * this.facing >= (s.bFX - this.x) * this.facing) { out.x = s.fFX; out.y = s.fFY; } else { out.x = s.bFX; out.y = s.bFY; }
  }
}

let projNextId = 0;
class Proj {
  constructor(x, y, vx, owner) { this.x = x; this.y = y; this.vx = vx; this.owner = owner; this.id = projNextId++; this.life = 150; this.dead = false; this.anim = 0; }
}

class AI {
  constructor() { this.level = 1; this.out = new Input(); this.planT = 0; this.pf = false; this.pb = false; this.pu = false; this.pd = false; this.cool = 40; this.seenAtk = -1; this.seenProj = -1; }
  reset() { this.planT = 0; this.cool = 40; this.seenAtk = -1; this.seenProj = -1; }
  setPlan(t, f, b, u, d) { this.planT = t; this.pf = f; this.pb = b; this.pu = u; this.pd = d; }
  applyDirs(me) {
    const o = this.out, r = me.facing === 1;
    if (this.pf) { if (r) o.right = true; else o.left = true; }
    if (this.pb) { if (r) o.left = true; else o.right = true; }
    if (this.pu) o.up = true;
    if (this.pd) o.down = true;
  }
  think(me, opp, projs) {
    const out = this.out; out.clear();
    const d = Math.abs(opp.x - me.x);
    const blockP = [0.12, 0.38, 0.7][this.level];
    const gap = [36, 20, 8][this.level];
    const om = opp.move;
    if (opp.state === St.ATTACK && om && opp.attackSerial !== this.seenAtk) {
      this.seenAtk = opp.attackSerial;
      if (d < 90 && !om.projectile && rndF() < blockP) this.setPlan(om.total - opp.moveT + 6, false, true, false, om.height === Hgt.LOW);
    }
    for (const pr of projs) {
      if (pr.owner === opp && pr.id !== this.seenProj) {
        const dist = (me.x - pr.x) * Math.sign(pr.vx);
        if (dist >= 0 && dist <= 110) {
          this.seenProj = pr.id;
          const r = rndF();
          if (r < blockP * 0.6) this.setPlan(14, true, false, true, false);
          else if (r < blockP + 0.15) this.setPlan(40, false, true, false, false);
        }
      }
    }
    if (this.planT > 0) {
      this.planT--; this.applyDirs(me);
      if (me.state === St.JUMP && d < 50 && rndF() < 0.12) out.k = true;
      return out;
    }
    if (!me.isNeutral()) return out;
    if (this.cool > 0) { this.cool--; return out; }
    this.decide(me, d);
    this.cool = gap + rndI(gap + 1);
    this.applyDirs(me);
    return out;
  }
  decide(me, d) {
    const r = rndF(), mei = me.style.mei, out = this.out;
    if (d > 110) {
      if (r < 0.42) this.setPlan(20 + rndI(25), true, false, false, false);
      else if (r < 0.62 && !mei) out.s = true;
      else if (r < 0.72) this.setPlan(12, true, false, true, false);
      else this.setPlan(15, false, false, false, false);
    } else if (d > 52) {
      if (r < 0.32) this.setPlan(8 + rndI(16), true, false, false, false);
      else if (r < 0.45) this.setPlan(12, true, false, true, false);
      else if (r < 0.58) out.k = true;
      else if (r < 0.70) out.s = true;
      else if (r < 0.82) this.setPlan(14, false, true, false, false);
      else this.setPlan(10, false, false, false, false);
    } else {
      if (r < 0.28) out.p = true;
      else if (r < 0.48) out.k = true;
      else if (r < 0.60) { out.down = true; out.k = true; }
      else if (r < 0.68) { out.down = true; out.p = true; }
      else if (r < 0.76) out.s = true;
      else if (r < 0.88) this.setPlan(16, false, true, false, false);
      else this.setPlan(10, false, true, true, false);
    }
  }
}

/** Retro sound effects synthesized with Web Audio (same recipes as Sfx.kt). */
class Sfx {
  constructor() { this.ctx = null; this.buf = {}; this.rate = 22050; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const R = this.rate, PI = Math.PI;
      const n = s => Math.floor(s * R);
      const noise = () => Math.random() * 2 - 1;
      const mk = (len, fn) => { const b = this.ctx.createBuffer(1, len, R); const d = b.getChannelData(0); fn(d); for (let i = 0; i < len; i++) d[i] = clamp(d[i], -1, 1) * 0.98; return b; };
      const hit = (dur, bright) => mk(n(dur), d => { let lp = 0, ph = 0; for (let i = 0; i < d.length; i++) { const t = i / R; const env = Math.exp(-t * 3.2 / dur); lp += (noise() - lp) * (0.15 + bright * 0.5); ph += 2 * PI * (120 - 70 * t / dur) / R; d[i] = (lp * 0.8 + Math.sin(ph) * 0.7) * env; } });
      const tone = (dur, f, dec) => mk(n(dur), d => { for (let i = 0; i < d.length; i++) { const t = i / R, w = 2 * PI * f * t; d[i] = (Math.sin(w) * 0.5 + Math.sin(w * 2.01) * 0.2 + Math.sin(w * 3.02) * 0.1) * Math.exp(-t * dec); } });
      this.buf.hit = hit(0.13, 1); this.buf.heavy = hit(0.22, 0.6); this.buf.thud = hit(0.16, 0.3);
      this.buf.block = mk(n(0.08), d => { for (let i = 0; i < d.length; i++) { const t = i / R; d[i] = Math.sin(2 * PI * 1700 * t) * Math.exp(-t * 55) * 0.5 + noise() * Math.exp(-t * 90) * 0.4; } });
      this.buf.whoosh = mk(n(0.15), d => { let lp = 0; const dur = 0.15; for (let i = 0; i < d.length; i++) { const t = i / R; lp += (noise() - lp) * (0.05 + 0.25 * t / dur); d[i] = lp * Math.sin(PI * t / dur) * 0.9; } });
      this.buf.special = mk(n(0.4), d => { let ph = 0; const dur = 0.4; for (let i = 0; i < d.length; i++) { const t = i / R; ph += 2 * PI * (220 + 700 * t / dur) / R; d[i] = ((Math.sin(ph) > 0 ? 1 : -1) * 0.25 + noise() * 0.08) * (1 - t / dur); } });
      this.buf.ko = mk(n(0.9), d => { let ph = 0, lp = 0; const dur = 0.9; for (let i = 0; i < d.length; i++) { const t = i / R; ph += 2 * PI * (140 - 100 * t / dur) / R; lp += (noise() - lp) * 0.08; d[i] = (Math.sin(ph) * 0.8 + lp * 0.9) * Math.exp(-t * 3); } });
      this.buf.bell = tone(0.6, 660, 4);
      this.buf.select = tone(0.09, 990, 25);
      const notes = [523, 659, 784, 1046], each = n(0.08);
      this.buf.fight = mk(each * notes.length + n(0.2), d => { for (let i = 0; i < d.length; i++) { const k = Math.min(Math.floor(i / each), notes.length - 1); const t = i / R, local = (i - k * each) / R; d[i] = (Math.sin(2 * PI * notes[k] * t) > 0 ? 1 : -1) * 0.22 * Math.exp(-local * (k === notes.length - 1 ? 6 : 12)); } });
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  }
  play(name, vol = 1, speed = 1) {
    const c = this.ctx, b = this.buf[name];
    if (!c || !b || c.state !== 'running') return;
    const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = clamp(speed, 0.5, 2);
    const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(this.master); s.start();
  }
}

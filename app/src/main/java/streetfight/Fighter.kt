package com.example.myapplication20261102streetfighter.game

import android.graphics.PointF
import android.graphics.RectF
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

enum class St { INTRO, IDLE, WALK_F, WALK_B, CROUCH, JUMP, ATTACK, BLOCK, HIT, KNOCKDOWN, GETUP, KO, WIN }

/** One frame of controller input. Directions are held; p / k / s are "pressed this frame". */
class Input {
    var left = false; var right = false; var up = false; var down = false
    var p = false; var k = false; var s = false
    fun clear() { left = false; right = false; up = false; down = false; p = false; k = false; s = false }
}

class Fighter(val style: Style, startX: Float, startFacing: Int) {
    var x = startX; var y = G.FLOOR; var vx = 0f; var vy = 0f
    var facing = startFacing
    var hp = 100f; var redHp = 100f; var redDelay = 0
    var state = St.INTRO; var stateT = 0
    var move: Move? = null; var moveT = 0; var hitDone = false; var lastHitT = -999
    var attackSerial = 0
    var stun = 0; var flash = 0; var specialCd = 0
    var guardBack = false; var guardLow = false
    var comboTaken = 0
    var wins = 0
    private var airAttackUsed = false
    private var walkPhase = 0f
    private var tick = 0
    var pose: Pose = style.idle
    val skel = Skeleton()
    private val hurt = RectF()

    init { refresh() }

    val grounded: Boolean get() = y >= G.FLOOR - 0.01f

    fun resetForRound(px: Float, f: Int) {
        x = px; y = G.FLOOR; vx = 0f; vy = 0f; facing = f
        hp = 100f; redHp = 100f; redDelay = 0
        state = St.INTRO; stateT = 0; move = null; stun = 0; flash = 0; specialCd = 0
        comboTaken = 0; airAttackUsed = false
        refresh()
    }

    fun setState(s: St) { state = s; stateT = 0 }

    fun isNeutral() = state == St.IDLE || state == St.WALK_F || state == St.WALK_B || state == St.CROUCH

    fun canBlock() = grounded && (isNeutral() || state == St.BLOCK)

    fun isActive(): Boolean {
        val m = move ?: return false
        return state == St.ATTACK && moveT > m.startup && moveT <= m.startup + m.active
    }

    fun update(inp: Input, opp: Fighter, game: GameView) {
        tick++
        stateT++
        if (specialCd > 0) specialCd--
        if (flash > 0) flash--
        if (redDelay > 0) redDelay-- else if (redHp > hp) redHp = max(hp, redHp - 0.6f)

        when (state) {
            St.IDLE, St.WALK_F, St.WALK_B, St.CROUCH -> { face(opp); ground(inp, game) }
            St.JUMP -> air(inp, game)
            St.ATTACK -> attack(inp, game)
            St.BLOCK -> {
                readGuard(inp); stun--; vx *= 0.8f
                if (stun <= 0) setState(if (inp.down) St.CROUCH else St.IDLE)
            }
            St.HIT -> {
                stun--; vx *= 0.86f
                if (stun <= 0 && grounded) { setState(St.IDLE); comboTaken = 0 }
            }
            St.KNOCKDOWN -> {
                if (grounded) { vx *= 0.8f; if (stateT > 55 && hp > 0f) setState(St.GETUP) }
            }
            St.GETUP -> { vx = 0f; if (stateT >= 26) { setState(St.IDLE); comboTaken = 0 } }
            St.KO -> { if (grounded) vx *= 0.85f }
            St.INTRO, St.WIN -> { vx = 0f }
        }
        physics(game)
        refresh()
    }

    private fun face(opp: Fighter) {
        if (abs(opp.x - x) > 2f) facing = if (opp.x > x) 1 else -1
    }

    private fun readGuard(inp: Input) {
        guardBack = if (facing == 1) inp.left else inp.right
        guardLow = inp.down
    }

    private fun ground(inp: Input, game: GameView) {
        readGuard(inp)
        val fwd = if (facing == 1) inp.right else inp.left
        val back = guardBack
        if (inp.s && specialCd == 0 && !game.hasProj(this)) { startMove(style.special, game); return }
        if (inp.p) { startMove(if (inp.down) Moves.CPUNCH else Moves.PUNCH, game); return }
        if (inp.k) { startMove(if (inp.down) Moves.SWEEP else Moves.KICK, game); return }
        if (inp.up) {
            setState(St.JUMP)
            vy = G.JUMP_V
            vx = when { fwd -> 1.9f * facing; back -> -1.9f * facing; else -> 0f }
            airAttackUsed = false
            game.sfx.play("whoosh", 0.35f, 0.8f)
            return
        }
        if (inp.down) {
            if (state != St.CROUCH) setState(St.CROUCH)
            vx = 0f
            return
        }
        when {
            fwd -> { if (state != St.WALK_F) setState(St.WALK_F); vx = style.walk * facing; walkPhase += 0.2f }
            back -> { if (state != St.WALK_B) setState(St.WALK_B); vx = -style.walk * 0.8f * facing; walkPhase -= 0.17f }
            else -> { if (state != St.IDLE) setState(St.IDLE); vx = 0f }
        }
    }

    private fun air(inp: Input, game: GameView) {
        if (!airAttackUsed && (inp.p || inp.k)) {
            airAttackUsed = true
            startMove(if (inp.k) Moves.JKICK else Moves.JPUNCH, game)
        }
    }

    private fun startMove(m: Move, game: GameView) {
        move = m; moveT = 0; hitDone = false; lastHitT = -999
        attackSerial++
        setState(St.ATTACK)
        if (!m.air) vx = 0f
        if (m.kind == 2) {
            specialCd = style.specialCd
            game.sfx.play("special", 0.8f)
        } else {
            game.sfx.play("whoosh", 0.45f, if (m.kind == 0) 1.35f else 1f)
        }
    }

    private fun attack(inp: Input, game: GameView) {
        val m = move ?: run { setState(St.IDLE); return }
        moveT++
        if (m.projectile && moveT == m.startup + 1) game.spawnProj(this)
        if (m.dash != 0f) {
            vx = if (moveT > m.startup && moveT <= m.startup + m.active) m.dash * facing else vx * 0.8f
        } else if (!m.air) {
            vx *= 0.7f
        }
        if (moveT >= m.total) {
            move = null
            if (m.air) {
                if (grounded) setState(St.IDLE) else { state = St.JUMP; airAttackUsed = true }
            } else {
                readGuard(inp)
                setState(if (inp.down) St.CROUCH else St.IDLE)
            }
        }
    }

    private fun physics(game: GameView) {
        if (!grounded || vy < 0f) {
            vy += G.GRAV
            y += vy
            if (y >= G.FLOOR) {
                y = G.FLOOR; vy = 0f
                land(game)
            }
        }
        x += vx
        x = x.coerceIn(G.WALL, G.W - G.WALL)
    }

    private fun land(game: GameView) {
        when (state) {
            St.JUMP -> { setState(St.IDLE); game.dust(x, 4) }
            St.ATTACK -> if (move?.air == true) { move = null; setState(St.IDLE); game.dust(x, 4) }
            St.KNOCKDOWN, St.KO -> { game.dust(x - facing * 18f, 10); game.shake(2.5f); game.sfx.play("thud", 0.8f) }
            else -> {}
        }
    }

    fun refresh() {
        pose = currentPose()
        skel.build(x, y, facing, pose)
    }

    private fun currentPose(): Pose {
        val idle = style.idle
        return when (state) {
            St.INTRO, St.IDLE -> {
                val b = sin(tick * 0.1f)
                idle.copy(lift = b * 0.7f, fL = idle.fL + b * 4f, bL = idle.bL - b * 3f)
            }
            St.WALK_F, St.WALK_B -> {
                val s = sin(walkPhase); val c = cos(walkPhase)
                val fT = idle.flU + s * 14f
                val bT = idle.blU - s * 14f
                idle.copy(flU = fT, flL = fT - 12f - max(0f, c) * 18f, blU = bT, blL = bT - 12f - max(0f, -c) * 18f)
            }
            St.CROUCH -> Poses.CROUCH
            St.JUMP -> Poses.JUMP
            St.ATTACK -> {
                val m = move ?: return idle
                val base = when { m.crouching -> Poses.CROUCH; m.air -> Poses.JUMP; else -> idle }
                m.poseAt(moveT, base)
            }
            St.BLOCK -> if (guardLow) Poses.CBLOCK else Poses.BLOCK
            St.HIT -> Poses.HIT
            St.KNOCKDOWN, St.KO -> Poses.HIT.mix(Poses.DOWN, stateT / 14f)
            St.GETUP -> if (stateT < 18) Poses.DOWN.mix(Poses.CROUCH, stateT / 18f) else Poses.CROUCH.mix(idle, (stateT - 18) / 8f)
            St.WIN -> style.win.copy(lift = abs(sin(tick * 0.12f)) * 2f)
        }
    }

    /** Body hurtbox, or null while invulnerable (knocked down / getting up / KO). */
    fun hurtRect(): RectF? {
        if (state == St.KNOCKDOWN || state == St.GETUP || state == St.KO) return null
        hurt.set(x - 9f, skel.headY - Dim.HR - 1f, x + 9f, max(skel.fFY, skel.bFY))
        return hurt
    }

    /** Point of the striking hand / foot. */
    fun hitPoint(out: PointF) {
        val m = move
        if (m != null && m.limb == Limb.HAND) { out.set(skel.fHX, skel.fHY); return }
        if ((skel.fFX - x) * facing >= (skel.bFX - x) * facing) out.set(skel.fFX, skel.fFY) else out.set(skel.bFX, skel.bFY)
    }
}

class Proj(var x: Float, val y: Float, val vx: Float, val owner: Fighter) {
    val id = nextId++
    var life = 150
    var dead = false
    var anim = 0
    companion object { var nextId = 0 }
}

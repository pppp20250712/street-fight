package com.example.myapplication20261102streetfighter.game

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PointF
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.view.Choreographer
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Game logic, HUD and input. The 3D scene is drawn behind this transparent view by [Renderer3D];
 * after every update the view publishes a [Snapshot] for the GL thread.
 */
class GameView(ctx: Context, private val renderer: Renderer3D, private val requestRender: () -> Unit) : View(ctx), Choreographer.FrameCallback {

    enum class Scene { TITLE, FIGHT }
    enum class Phase { INTRO, PLAY, KO, END }

    private class Part(var x: Float, var y: Float, var z: Float, var vx: Float, var vy: Float, var vz: Float, var life: Int, val color: Int, val size: Float, val grav: Float)
    private class Burst(val x: Float, val y: Float, var t: Int, val block: Boolean)

    val sfx = Sfx(ctx)
    private val txt = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.DEFAULT_BOLD; strokeJoin = Paint.Join.ROUND
    }
    private val ui = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rnd = java.util.Random()

    private var running = false
    private var lastNs = 0L
    private var acc = 0.0
    private var frame = 0L

    private var scene = Scene.TITLE
    private var phase = Phase.INTRO
    private var phaseT = 0
    private var round = 1
    private var timer = 0
    private var hitstop = 0
    private var shakeAmt = 0f
    private var difficulty = 1
    private var selected = 0
    private var koText = ""
    private var endTitle = ""
    private var endSub = ""
    private var roundWinner: Fighter? = null
    private var comboText = ""
    private var comboT = 0
    private var comboLeft = true

    private val empty = Input()
    private val p1in = Input()
    private var p1 = Fighter(Styles.RYO, 110f, 1)
    private var p2 = Fighter(Styles.MEI, 274f, -1)
    private val ai = AI()
    private val projs = ArrayList<Proj>()
    private val parts = ArrayList<Part>()
    private val bursts = ArrayList<Burst>()
    private val hp = PointF()

    private val prevA = Fighter(Styles.RYO, 120f, 1)
    private val prevB = Fighter(Styles.MEI, 264f, -1)
    private val cam = CamRig()

    // layout (screen coordinates)
    private var scale = 1f; private var ox = 0f; private var oy = 0f
    private val cardA = RectF(); private val cardB = RectF(); private val diffBtn = RectF()
    private var joyX = 0f; private var joyY = 0f; private var joyR = 1f
    private var knobX = 0f; private var knobY = 0f
    private val btnX = FloatArray(3); private val btnY = FloatArray(3); private var btnR = 1f
    private val btnMain = arrayOf("拳", "腳", "必殺")
    private val btnSub = arrayOf("PUNCH", "KICK", "SPECIAL")
    private val btnColor = intArrayOf(0xFFFF8A2A.toInt(), 0xFF3A9BFF.toInt(), 0xFFC04AFF.toInt())
    private val diffNames = arrayOf("簡單 EASY", "普通 NORMAL", "困難 HARD")

    // touch & keyboard state
    private var joyId = -1
    private val btnId = intArrayOf(-1, -1, -1)
    private var kLeft = false; private var kRight = false; private var kUp = false; private var kDown = false
    private var latchP = false; private var latchK = false; private var latchS = false
    private var tapped = false; private var tapX = 0f; private var tapY = 0f
    private var keyNav = 0
    private var keyConfirm = false

    init {
        setFocusable(true)
        setFocusableInTouchMode(true)
        requestFocus()
    }

    // ---------------------------------------------------------------- loop

    fun resume() {
        if (running) return
        running = true; lastNs = 0L; acc = 0.0
        Choreographer.getInstance().postFrameCallback(this)
    }

    fun pause() {
        running = false
        Choreographer.getInstance().removeFrameCallback(this)
        joyId = -1; btnId.fill(-1)
    }

    fun release() { pause(); sfx.release() }

    override fun doFrame(frameTimeNanos: Long) {
        if (!running) return
        if (lastNs == 0L) lastNs = frameTimeNanos
        acc += (frameTimeNanos - lastNs) / 1e9
        lastNs = frameTimeNanos
        if (acc > 0.25) acc = 0.25
        val dt = 1.0 / 60.0
        while (acc >= dt) { step(); acc -= dt }
        publish()
        requestRender()
        invalidate()
        Choreographer.getInstance().postFrameCallback(this)
    }

    private fun step() {
        frame++
        // joystick -> directions
        var jl = false; var jr = false; var ju = false; var jd = false
        if (joyId != -1) {
            val dx = (knobX - joyX) / joyR; val dy = (knobY - joyY) / joyR
            jl = dx < -0.35f; jr = dx > 0.35f; ju = dy < -0.5f; jd = dy > 0.5f
        }
        p1in.left = kLeft || jl; p1in.right = kRight || jr
        p1in.up = kUp || ju; p1in.down = kDown || jd
        p1in.p = latchP; p1in.k = latchK; p1in.s = latchS
        latchP = false; latchK = false; latchS = false

        when (scene) {
            Scene.TITLE -> titleStep()
            Scene.FIGHT -> fightStep()
        }
        tapped = false; keyNav = 0; keyConfirm = false
        val fight = scene == Scene.FIGHT
        cam.update(!fight, frame, if (fight) p1.x else prevA.x, if (fight) p2.x else prevB.x, fight && phase == Phase.KO)
    }

    /** Copy everything the 3D renderer needs into its pending snapshot (UI thread -> GL thread). */
    private fun publish() {
        val fight = scene == Scene.FIGHT
        renderer.publish { s ->
            s.title = !fight; s.frame = frame; s.shake = if (fight) shakeAmt else 0f; s.ko = fight && phase == Phase.KO
            s.camX = cam.x; s.camY = cam.y; s.camZ = cam.z; s.camTX = cam.tx; s.camTY = cam.ty
            s.setFighter(0, if (fight) p1 else prevA); s.setFighter(1, if (fight) p2 else prevB)
            s.nProj = 0
            if (fight) for (pr in projs) {
                if (s.nProj >= Snapshot.MAX_PROJ) break
                val o = s.nProj++ * 4
                s.proj[o] = pr.x; s.proj[o + 1] = pr.y; s.proj[o + 2] = pr.vx; s.proj[o + 3] = pr.anim.toFloat()
            }
            s.nPart = 0
            if (fight) for (p in parts) {
                if (s.nPart >= Snapshot.MAX_PART) break
                val i = s.nPart++; val o = i * 6
                s.part[o] = p.x; s.part[o + 1] = p.y; s.part[o + 2] = p.z; s.part[o + 3] = p.size; s.part[o + 4] = p.life.toFloat(); s.part[o + 5] = p.grav
                s.partCol[i] = p.color
            }
            s.nBurst = 0
            if (fight) for (b in bursts) {
                if (s.nBurst >= Snapshot.MAX_BURST) break
                val o = s.nBurst++ * 4
                s.burst[o] = b.x; s.burst[o + 1] = b.y; s.burst[o + 2] = b.t.toFloat(); s.burst[o + 3] = if (b.block) 1f else 0f
            }
        }
    }

    // ---------------------------------------------------------------- title

    private fun titleStep() {
        prevA.update(empty, prevB, this)
        prevB.update(empty, prevA, this)
        if (keyNav != 0) { selected = (selected + keyNav + 2) % 2; sfx.play("select") }
        if (tapped) {
            when {
                cardA.contains(tapX, tapY) -> { selected = 0; startMatch(0) }
                cardB.contains(tapX, tapY) -> { selected = 1; startMatch(1) }
                diffBtn.contains(tapX, tapY) -> { difficulty = (difficulty + 1) % 3; sfx.play("select") }
            }
        } else if (keyConfirm) startMatch(selected)
    }

    private fun startMatch(i: Int) {
        sfx.play("select")
        p1 = Fighter(Styles.ALL[i], 110f, 1)
        p2 = Fighter(Styles.ALL[1 - i], 274f, -1)
        ai.level = difficulty
        round = 1
        scene = Scene.FIGHT
        startRound()
    }

    private fun startRound() {
        p1.resetForRound(110f, 1); p2.resetForRound(274f, -1)
        projs.clear(); parts.clear(); bursts.clear()
        phase = Phase.INTRO; phaseT = 0
        timer = 60 * 60
        hitstop = 0; comboT = 0
        ai.reset()
        roundWinner = null
    }

    // ---------------------------------------------------------------- fight

    private fun fightStep() {
        updateFx()
        if (shakeAmt > 0f) { shakeAmt *= 0.85f; if (shakeAmt < 0.3f) shakeAmt = 0f }
        if (hitstop > 0) { hitstop--; return }
        phaseT++
        when (phase) {
            Phase.INTRO -> {
                if (phaseT == 2) sfx.play("bell")
                if (phaseT == 80) sfx.play("fight")
                p1.update(empty, p2, this); p2.update(empty, p1, this)
                if (phaseT >= 110) {
                    phase = Phase.PLAY; phaseT = 0
                    p1.setState(St.IDLE); p2.setState(St.IDLE)
                }
            }
            Phase.PLAY -> {
                if (timer > 0) timer--
                val ain = ai.think(p2, p1, projs)
                p1.update(p1in, p2, this)
                p2.update(ain, p1, this)
                separate()
                checkHit(p1, p2); checkHit(p2, p1)
                updateProjs()
                if (comboT > 0) comboT--
                if (p1.hp <= 0f || p2.hp <= 0f) endRound(true)
                else if (timer <= 0) endRound(false)
            }
            Phase.KO -> {
                val slow = phaseT < 70 && phaseT % 3 != 0
                if (!slow) {
                    p1.update(empty, p2, this); p2.update(empty, p1, this)
                    separate(); updateProjs()
                }
                if (phaseT == 80) roundWinner?.let { if (it.hp > 0f && it.grounded) { it.move = null; it.setState(St.WIN) } }
                if (phaseT >= 170) {
                    if (p1.wins >= 2 || p2.wins >= 2 || round >= 5) {
                        phase = Phase.END; phaseT = 0
                        if (p1.wins > p2.wins) { endTitle = "YOU WIN!  你贏了！"; endSub = "${p1.style.name} 勝利 PERFECT FIGHTER" }
                        else if (p2.wins > p1.wins) { endTitle = "YOU LOSE  你輸了"; endSub = "${p2.style.name} 勝利 — 再挑戰一次！ TRY AGAIN" }
                        else { endTitle = "DRAW GAME  平手"; endSub = "" }
                        sfx.play("fight")
                    } else {
                        round++
                        startRound()
                    }
                }
            }
            Phase.END -> {
                p1.update(empty, p2, this); p2.update(empty, p1, this)
                if (phaseT > 40 && (tapped || keyConfirm)) {
                    scene = Scene.TITLE
                    prevA.resetForRound(120f, 1); prevB.resetForRound(264f, -1)
                }
            }
        }
    }

    private fun endRound(ko: Boolean) {
        phase = Phase.KO; phaseT = 0
        val w: Fighter? = when {
            p1.hp <= 0f && p2.hp <= 0f -> null
            p2.hp <= 0f -> p1
            p1.hp <= 0f -> p2
            p1.hp > p2.hp -> p1
            p2.hp > p1.hp -> p2
            else -> null
        }
        if (w != null) w.wins++
        roundWinner = w
        koText = if (ko) "K.O." else "TIME UP"
        sfx.play(if (ko) "ko" else "bell")
    }

    private fun separate() {
        val lying1 = p1.state == St.KNOCKDOWN || p1.state == St.KO
        val lying2 = p2.state == St.KNOCKDOWN || p2.state == St.KO
        if (lying1 || lying2) return
        val dx = p2.x - p1.x
        val minD = 20f
        if (abs(dx) < minD && abs(p1.y - p2.y) < 40f) {
            val push = (minD - abs(dx)) / 2f
            val s = if (dx > 0f) 1f else if (dx < 0f) -1f else -p1.facing.toFloat()
            p1.x -= push * s; p2.x += push * s
            p1.x = p1.x.coerceIn(G.WALL, G.W - G.WALL); p2.x = p2.x.coerceIn(G.WALL, G.W - G.WALL)
            if (abs(p2.x - p1.x) < minD - 1f) {   // pinned in a corner: push the other one out
                if (p1.x <= G.WALL + 1f || p1.x >= G.W - G.WALL - 1f) p2.x = p1.x + minD * s
                else p1.x = p2.x - minD * s
            }
            p1.refresh(); p2.refresh()
        }
    }

    private fun circleHitsRect(cx: Float, cy: Float, r: Float, rc: RectF): Boolean {
        val nx = cx.coerceIn(rc.left, rc.right); val ny = cy.coerceIn(rc.top, rc.bottom)
        val dx = cx - nx; val dy = cy - ny
        return dx * dx + dy * dy <= r * r
    }

    private fun checkHit(a: Fighter, b: Fighter) {
        val m = a.move ?: return
        if (m.projectile || m.limb == Limb.NONE || !a.isActive()) return
        if (m.multiEvery > 0) { if (a.moveT - a.lastHitT < m.multiEvery) return } else if (a.hitDone) return
        val r = b.hurtRect() ?: return
        a.hitPoint(hp)
        if (!circleHitsRect(hp.x, hp.y, m.reach, r)) return
        a.hitDone = true; a.lastHitT = a.moveT
        resolve(a, b, m, hp.x, hp.y)
    }

    private fun resolve(att: Fighter, def: Fighter, m: Move, hx: Float, hy: Float) {
        val heightOk = when (m.height) { Hgt.LOW -> def.guardLow; Hgt.HIGH -> !def.guardLow; Hgt.MID -> true }
        val away = if (def.x >= att.x) 1f else -1f
        val cornered = def.x <= G.WALL + 2f || def.x >= G.W - G.WALL - 2f
        if (def.canBlock() && def.guardBack && heightOk) {
            if (def.hp > 1f) def.hp = max(1f, def.hp - m.chip)
            def.move = null
            def.setState(St.BLOCK); def.stun = m.blockstun
            def.vx = away * (m.push + 0.6f)
            if (cornered && !m.projectile) att.vx = -away * 1.6f
            spark(hx, hy, true)
            sfx.play("block", 0.8f)
            hitstop = 4
            return
        }
        val wasHurt = def.state == St.HIT || def.state == St.KNOCKDOWN
        def.comboTaken = if (wasHurt) def.comboTaken + 1 else 1
        val scaleF = max(0.5f, 1f - 0.12f * (def.comboTaken - 1))
        val mul = when (m.kind) { 0 -> att.style.punchMul; 1 -> att.style.kickMul; else -> 1f }
        def.hp = max(0f, def.hp - m.damage * mul * scaleF)
        def.redDelay = 30
        def.flash = 6
        def.move = null
        when {
            def.hp <= 0f -> {
                def.setState(St.KO); def.vy = -4f; def.vx = away * 2.4f
                hitstop = 24; shake(6f)
            }
            m.knockdown || !def.grounded -> {
                def.setState(St.KNOCKDOWN); def.vy = -3.4f; def.vx = away * 2f
                hitstop = 8; shake(4f)
            }
            else -> {
                def.setState(St.HIT); def.stun = m.hitstun; def.vx = away * m.push
                hitstop = if (m.kind == 0) 5 else 7
                shake(if (m.kind == 0) 2f else 3.5f)
            }
        }
        if (cornered && !m.projectile && att.grounded) att.vx = -away * 1.8f
        spark(hx, hy, false)
        sfx.play(if (m.kind == 0) "hit" else "heavy", 1f, 0.9f + rnd.nextFloat() * 0.2f)
        if (def.comboTaken >= 2) {
            comboText = "${def.comboTaken} HITS!"
            comboT = 70; comboLeft = att === p1
        }
    }

    // ---------------------------------------------------------------- projectiles & effects

    fun hasProj(f: Fighter): Boolean = projs.any { it.owner === f && !it.dead }

    fun spawnProj(f: Fighter) {
        projs.add(Proj(f.skel.fHX + f.facing * 4f, f.skel.fHY, 3.4f * f.facing, f))
    }

    private fun updateProjs() {
        for (pr in projs) {
            if (pr.dead) continue
            pr.x += pr.vx; pr.life--; pr.anim++
            if (pr.life <= 0 || pr.x < -10f || pr.x > G.W + 10f) { pr.dead = true; continue }
            for (o in projs) {
                if (o !== pr && !o.dead && o.owner !== pr.owner && abs(o.x - pr.x) < 10f && abs(o.y - pr.y) < 12f) {
                    o.dead = true; pr.dead = true
                    spark((o.x + pr.x) / 2f, pr.y, true); sfx.play("block")
                }
            }
            if (pr.dead) continue
            val target = if (pr.owner === p1) p2 else p1
            val r = target.hurtRect() ?: continue
            if (circleHitsRect(pr.x, pr.y, 7f, r)) {
                pr.dead = true
                resolve(pr.owner, target, Moves.KIBLAST, pr.x, pr.y)
            }
        }
        projs.removeAll { it.dead }
    }

    fun shake(a: Float) { shakeAmt = max(shakeAmt, a) }

    fun dust(x: Float, n: Int) {
        repeat(n) {
            parts.add(Part(x + rnd.nextFloat() * 20f - 10f, G.FLOOR - 1f, (rnd.nextFloat() - 0.5f) * 0.6f, rnd.nextFloat() * 1.6f - 0.8f,
                -rnd.nextFloat() * 0.8f, 0f, 18 + rnd.nextInt(10), 0xFFB8A8B8.toInt(), 1.5f, 0.02f))
        }
    }

    private fun spark(x: Float, y: Float, block: Boolean) {
        bursts.add(Burst(x, y, 0, block))
        val cols = if (block) intArrayOf(0xFF8FE0FF.toInt(), Color.WHITE, 0xFF3A9BFF.toInt())
        else intArrayOf(0xFFFFF070.toInt(), Color.WHITE, 0xFFFF8A2A.toInt())
        repeat(if (block) 6 else 12) {
            val a = rnd.nextFloat() * 6.283f; val sp = 1f + rnd.nextFloat() * 2.4f
            parts.add(Part(x, y, 0.35f, cos(a) * sp, sin(a) * sp, (rnd.nextFloat() - 0.3f) * 0.05f, 10 + rnd.nextInt(10), cols[rnd.nextInt(cols.size)], 1.5f, 0.1f))
        }
    }

    private fun updateFx() {
        for (p in parts) { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy += p.grav; p.vx *= 0.94f; p.life-- }
        parts.removeAll { it.life <= 0 }
        for (b in bursts) b.t++
        bursts.removeAll { it.t > 7 }
    }

    // ---------------------------------------------------------------- input

    override fun onTouchEvent(e: MotionEvent): Boolean {
        val idx = e.actionIndex
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                val id = e.getPointerId(idx); val x = e.getX(idx); val y = e.getY(idx)
                if (scene != Scene.FIGHT || phase == Phase.END) {
                    tapped = true; tapX = x; tapY = y
                    return true
                }
                if (x < width * 0.45f) {
                    if (joyId == -1) { joyId = id; moveKnob(x, y) }
                } else {
                    var best = -1; var bestD = Float.MAX_VALUE
                    for (i in 0..2) {
                        val d = hypot(x - btnX[i], y - btnY[i])
                        if (d < btnR * 1.5f && d < bestD && btnId[i] == -1) { best = i; bestD = d }
                    }
                    if (best >= 0) {
                        btnId[best] = id
                        when (best) { 0 -> latchP = true; 1 -> latchK = true; else -> latchS = true }
                    }
                }
            }
            MotionEvent.ACTION_MOVE -> {
                for (i in 0 until e.pointerCount) if (e.getPointerId(i) == joyId) moveKnob(e.getX(i), e.getY(i))
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                val id = e.getPointerId(idx)
                if (id == joyId) { joyId = -1; knobX = joyX; knobY = joyY }
                for (i in 0..2) if (btnId[i] == id) btnId[i] = -1
            }
            MotionEvent.ACTION_CANCEL -> {
                joyId = -1; knobX = joyX; knobY = joyY; btnId.fill(-1)
            }
        }
        return true
    }

    private fun moveKnob(x: Float, y: Float) {
        var dx = x - joyX; var dy = y - joyY
        val d = hypot(dx, dy)
        if (d > joyR) { dx = dx / d * joyR; dy = dy / d * joyR }
        knobX = joyX + dx; knobY = joyY + dy
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (event.repeatCount > 0 && handles(keyCode)) return true
        return key(keyCode, true) || super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        return key(keyCode, false) || super.onKeyUp(keyCode, event)
    }

    private fun handles(code: Int) = when (code) {
        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_A, KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_D,
        KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_W, KeyEvent.KEYCODE_SPACE, KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_S,
        KeyEvent.KEYCODE_J, KeyEvent.KEYCODE_Z, KeyEvent.KEYCODE_K, KeyEvent.KEYCODE_X, KeyEvent.KEYCODE_L, KeyEvent.KEYCODE_C,
        KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_DPAD_CENTER -> true
        else -> false
    }

    private fun key(code: Int, down: Boolean): Boolean {
        when (code) {
            KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_A -> { kLeft = down; if (down) keyNav = -1 }
            KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_D -> { kRight = down; if (down) keyNav = 1 }
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_W, KeyEvent.KEYCODE_SPACE -> kUp = down
            KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_S -> kDown = down
            KeyEvent.KEYCODE_J, KeyEvent.KEYCODE_Z -> if (down) { latchP = true; keyConfirm = true }
            KeyEvent.KEYCODE_K, KeyEvent.KEYCODE_X -> if (down) latchK = true
            KeyEvent.KEYCODE_L, KeyEvent.KEYCODE_C -> if (down) latchS = true
            KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_DPAD_CENTER -> if (down) keyConfirm = true
            else -> return false
        }
        return true
    }

    // ---------------------------------------------------------------- layout & drawing

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        scale = min(w / G.W.toFloat(), h / G.H.toFloat())
        ox = (w - G.W * scale) / 2f; oy = (h - G.H * scale) / 2f
        joyR = h * 0.15f
        joyX = max(joyR * 1.35f, w * 0.12f); joyY = h - joyR * 1.35f
        knobX = joyX; knobY = joyY
        btnR = h * 0.085f
        val kx = w - btnR * 1.6f; val ky = h - btnR * 1.7f
        btnX[1] = kx; btnY[1] = ky                              // kick
        btnX[0] = kx - btnR * 2.5f; btnY[0] = ky + btnR * 0.15f // punch
        btnX[2] = kx - btnR * 1.25f; btnY[2] = ky - btnR * 2.2f // special
        cardA.set(X(78f), Y(98f), X(162f), Y(203f))
        cardB.set(X(222f), Y(98f), X(306f), Y(203f))
        diffBtn.set(X(166f), Y(138f), X(218f), Y(168f))
    }

    private fun X(v: Float) = ox + v * scale
    private fun Y(v: Float) = oy + v * scale

    override fun onDraw(canvas: Canvas) {
        // the 3D scene is rendered by Renderer3D underneath; this view only draws the HUD and touch controls
        if (scene == Scene.TITLE) drawTitle(canvas) else { drawHud(canvas); drawControls(canvas) }
    }

    private fun label(c: Canvas, s: String, x: Float, y: Float, size: Float, color: Int,
                      align: Paint.Align = Paint.Align.CENTER) {
        txt.textSize = size; txt.textAlign = align
        txt.style = Paint.Style.STROKE; txt.strokeWidth = max(2f, size * 0.16f); txt.color = Color.BLACK
        c.drawText(s, x, y, txt)
        txt.style = Paint.Style.FILL; txt.color = color
        c.drawText(s, x, y, txt)
    }

    private fun drawTitle(c: Canvas) {
        val s = scale
        ui.style = Paint.Style.FILL
        ui.shader = LinearGradient(0f, 0f, 0f, Y(100f), 0xBF000000.toInt(), 0x00000000, Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, width.toFloat(), Y(100f), ui)
        ui.shader = null
        val pulse = (sin(frame * 0.12f) + 1f) / 2f
        label(c, "STREET FIGHT", width / 2f, Y(36f), 30f * s, 0xFFFFD040.toInt())
        label(c, "街 頭 格 鬥  3D", width / 2f, Y(58f), 15f * s, 0xFFFF5A3A.toInt())
        label(c, "選擇你的格鬥家   CHOOSE YOUR FIGHTER", width / 2f, Y(84f), 8f * s, Color.WHITE)

        for (i in 0..1) {
            val r = if (i == 0) cardA else cardB
            val st = Styles.ALL[i]
            val sel = selected == i
            ui.style = Paint.Style.FILL
            ui.color = if (sel) 0x29FFD040 else 0x1F000000
            c.drawRoundRect(r, 6f * s, 6f * s, ui)
            ui.style = Paint.Style.STROKE
            ui.strokeWidth = if (sel) 2.5f * s else 1.2f * s
            ui.color = if (sel) Color.argb(255, 255, (180 + 70 * pulse).toInt(), 60) else 0x99FFFFFF.toInt()
            c.drawRoundRect(r, 6f * s, 6f * s, ui)
            label(c, "${st.name}  ${st.cn}", r.centerX(), r.top + 13f * s, 11f * s, Color.WHITE)
            label(c, st.tag, r.centerX(), r.top + 23f * s, 6.5f * s, 0xFFFFD040.toInt())
            label(c, st.specialName, r.centerX(), r.bottom + 9f * s, 6f * s, 0xFFFFB0A0.toInt())
        }
        ui.style = Paint.Style.FILL
        ui.color = 0xCC1A1028.toInt()
        c.drawRoundRect(diffBtn, 5f * s, 5f * s, ui)
        ui.style = Paint.Style.STROKE; ui.strokeWidth = 1.2f * s; ui.color = 0xFF3FE8FF.toInt()
        c.drawRoundRect(diffBtn, 5f * s, 5f * s, ui)
        ui.style = Paint.Style.FILL
        label(c, "難度 LEVEL", diffBtn.centerX(), diffBtn.top + 11f * s, 6.5f * s, 0xFF3FE8FF.toInt())
        label(c, diffNames[difficulty], diffBtn.centerX(), diffBtn.top + 23f * s, 7f * s, Color.WHITE)
        if ((frame / 30) % 2 == 0L) {
            label(c, "點選角色開始  TAP A FIGHTER", width / 2f, Y(126f), 6.5f * s, Color.WHITE)
        }
        label(c, "鍵盤 Keys: ← → 移動  ↑ 跳  ↓ 蹲  J 拳  K 腳  L 必殺   (按住「後」防禦 hold BACK to block)",
            width / 2f, Y(214f), 5.5f * s, 0xFFDDDDDD.toInt())
    }

    private fun drawHud(c: Canvas) {
        val s = scale
        ui.style = Paint.Style.FILL
        drawBar(c, p1, 14f, true)
        drawBar(c, p2, 214f, false)
        label(c, "${p1.style.name} ${p1.style.cn}", X(14f), Y(31f), 9f * s, Color.WHITE, Paint.Align.LEFT)
        label(c, "${p2.style.name} ${p2.style.cn}", X(370f), Y(31f), 9f * s, Color.WHITE, Paint.Align.RIGHT)
        label(c, "YOU", X(14f), Y(41f), 6f * s, 0xFF7CFF7C.toInt(), Paint.Align.LEFT)
        label(c, "CPU", X(370f), Y(41f), 6f * s, 0xFFFF7C7C.toInt(), Paint.Align.RIGHT)
        for (i in 0..1) {
            ui.color = if (p1.wins > i) 0xFFFFD040.toInt() else 0x66000000
            c.drawCircle(X(166f - i * 9f), Y(27f), 3f * s, ui)
            ui.color = if (p2.wins > i) 0xFFFFD040.toInt() else 0x66000000
            c.drawCircle(X(218f + i * 9f), Y(27f), 3f * s, ui)
        }
        // timer
        ui.color = 0xCC000000.toInt()
        c.drawRoundRect(X(178f), Y(5f), X(206f), Y(24f), 3f * s, 3f * s, ui)
        val secs = (timer + 59) / 60
        label(c, secs.toString(), X(192f), Y(21f), 16f * s, if (secs <= 10) 0xFFFF5A3A.toInt() else Color.WHITE)

        if (comboT > 0) {
            val x = if (comboLeft) X(20f) else X(364f)
            label(c, comboText, x, Y(70f), 12f * s, 0xFFFFD040.toInt(), if (comboLeft) Paint.Align.LEFT else Paint.Align.RIGHT)
        }

        val cx = width / 2f
        when (phase) {
            Phase.INTRO -> {
                if (phaseT < 80) label(c, "ROUND $round", cx, Y(100f), 28f * s, 0xFFFFD040.toInt())
                else label(c, "FIGHT!  開打！", cx, Y(100f), 30f * s, 0xFFFF5A3A.toInt())
            }
            Phase.KO -> {
                if (phaseT < 110) {
                    val big = if (koText == "K.O.") 46f else 30f
                    label(c, koText, cx, Y(105f), big * s, if (koText == "K.O.") 0xFFFF3A2A.toInt() else 0xFFFFD040.toInt())
                } else {
                    val w = roundWinner
                    val msg = if (w == null) "DOUBLE KO / DRAW  平手" else "${w.style.name} WINS  勝！"
                    label(c, msg, cx, Y(100f), 22f * s, Color.WHITE)
                }
            }
            Phase.END -> {
                ui.color = 0x88000000.toInt()
                c.drawRect(0f, Y(70f), width.toFloat(), Y(140f), ui)
                label(c, endTitle, cx, Y(100f), 26f * s, if (p1.wins > p2.wins) 0xFFFFD040.toInt() else 0xFFFF5A3A.toInt())
                label(c, endSub, cx, Y(116f), 8f * s, Color.WHITE)
                if (phaseT > 40 && (frame / 30) % 2 == 0L) label(c, "點擊返回選單  TAP TO CONTINUE", cx, Y(132f), 7f * s, 0xFFDDDDDD.toInt())
            }
            Phase.PLAY -> {}
        }
    }

    private fun drawBar(c: Canvas, f: Fighter, x0: Float, left: Boolean) {
        val w = 156f
        ui.style = Paint.Style.FILL
        ui.color = Color.BLACK
        c.drawRect(X(x0 - 2f), Y(8f), X(x0 + w + 2f), Y(20f), ui)
        ui.color = 0xFF5A0A0A.toInt()
        c.drawRect(X(x0), Y(10f), X(x0 + w), Y(18f), ui)
        val red = w * f.redHp / 100f; val cur = w * f.hp / 100f
        ui.color = 0xFFFF3A2A.toInt()
        if (left) c.drawRect(X(x0), Y(10f), X(x0 + red), Y(18f), ui) else c.drawRect(X(x0 + w - red), Y(10f), X(x0 + w), Y(18f), ui)
        ui.color = if (f.hp < 25f && (frame / 8) % 2 == 0L) 0xFFFFFFFF.toInt() else 0xFFF8D030.toInt()
        if (left) c.drawRect(X(x0), Y(10f), X(x0 + cur), Y(18f), ui) else c.drawRect(X(x0 + w - cur), Y(10f), X(x0 + w), Y(18f), ui)
        ui.color = 0x55FFFFFF
        if (left) c.drawRect(X(x0), Y(10f), X(x0 + cur), Y(12f), ui) else c.drawRect(X(x0 + w - cur), Y(10f), X(x0 + w), Y(12f), ui)
    }

    private fun drawControls(c: Canvas) {
        if (phase == Phase.END) return
        ui.style = Paint.Style.FILL
        ui.color = 0x30FFFFFF
        c.drawCircle(joyX, joyY, joyR, ui)
        ui.style = Paint.Style.STROKE; ui.strokeWidth = 3f; ui.color = 0x66FFFFFF
        c.drawCircle(joyX, joyY, joyR, ui)
        ui.style = Paint.Style.FILL
        ui.color = if (joyId != -1) 0xAAFFFFFF.toInt() else 0x77FFFFFF
        c.drawCircle(knobX, knobY, joyR * 0.42f, ui)
        for (i in 0..2) {
            val pressed = btnId[i] != -1
            ui.style = Paint.Style.FILL
            ui.color = (btnColor[i] and 0x00FFFFFF) or (if (pressed) 0xEE000000.toInt() else 0x88000000.toInt())
            c.drawCircle(btnX[i], btnY[i], btnR * (if (pressed) 0.92f else 1f), ui)
            ui.style = Paint.Style.STROKE; ui.strokeWidth = 3f; ui.color = 0xAAFFFFFF.toInt()
            c.drawCircle(btnX[i], btnY[i], btnR, ui)
            label(c, btnMain[i], btnX[i], btnY[i] + btnR * 0.12f, btnR * (if (i == 2) 0.55f else 0.7f), Color.WHITE)
            label(c, btnSub[i], btnX[i], btnY[i] + btnR * 0.55f, btnR * 0.24f, Color.WHITE)
        }
        ui.style = Paint.Style.FILL
    }
}

package com.example.myapplication20261102streetfighter.game

import kotlin.math.max
import kotlin.math.sin

/** Global constants. The game world is a 384x216 pixel-art canvas that is scaled up to the screen. */
object G {
    const val W = 384
    const val H = 216
    const val FLOOR = 196f
    const val GRAV = 0.32f
    const val JUMP_V = -6.3f
    const val WALL = 16f
}

/** Body proportions in world pixels. */
object Dim {
    const val T = 13f      // thigh
    const val S = 13f      // shin
    const val TORSO = 19f
    const val UA = 10f     // upper arm
    const val FA = 10f     // forearm
    const val HR = 5.5f    // head radius
}

fun rad(d: Float): Float = d * 0.017453292f

/**
 * A pose = joint angles in degrees, for a fighter facing right.
 * 0 = pointing straight down, 90 = pointing forward, 180 = pointing up, negative = backward.
 * Forearm / shin angles are absolute (not relative to the upper limb).
 */
data class Pose(
    val lean: Float = 6f,
    val bU: Float = 35f, val bL: Float = 155f,     // back arm
    val fU: Float = 55f, val fL: Float = 150f,     // front arm
    val blU: Float = -22f, val blL: Float = -8f,   // back leg
    val flU: Float = 22f, val flL: Float = 6f,     // front leg
    val head: Float = 0f,
    val rot: Float = 0f,                           // whole-body fall rotation
    val lift: Float = 0f
) {
    fun mix(o: Pose, t: Float): Pose {
        val u = t.coerceIn(0f, 1f)
        fun m(a: Float, b: Float) = a + (b - a) * u
        return Pose(
            m(lean, o.lean), m(bU, o.bU), m(bL, o.bL), m(fU, o.fU), m(fL, o.fL),
            m(blU, o.blU), m(blL, o.blL), m(flU, o.flU), m(flL, o.flL),
            m(head, o.head), m(rot, o.rot), m(lift, o.lift)
        )
    }
}

object Poses {
    val RYO_IDLE = Pose()
    val MEI_IDLE = Pose(lean = 3f, bU = 40f, bL = 150f, fU = 72f, fL = 100f, blU = -14f, blL = -4f, flU = 18f, flL = -6f)
    val CROUCH = Pose(lean = 28f, bU = 40f, bL = 160f, fU = 60f, fL = 150f, blU = 35f, blL = -70f, flU = 75f, flL = 5f)
    val JUMP = Pose(lean = 4f, bU = 40f, bL = 150f, fU = 60f, fL = 140f, blU = 10f, blL = -60f, flU = 75f, flL = -15f)

    val P_WIND = Pose(lean = 0f, bU = 30f, bL = 150f, fU = 40f, fL = 165f)
    val P_STRIKE = Pose(lean = 14f, bU = -25f, bL = 110f, fU = 90f, fL = 90f, blU = -26f, blL = -10f, flU = 26f, flL = 8f)
    val K_WIND = Pose(lean = -6f, flU = 80f, flL = -5f, blU = -8f, blL = -4f)
    val K_STRIKE = Pose(lean = -18f, bU = 20f, bL = 150f, fU = 30f, fL = 140f, blU = -8f, blL = -4f, flU = 100f, flL = 95f)
    val CP_WIND = CROUCH.copy(fU = 40f, fL = 165f)
    val CP_STRIKE = CROUCH.copy(lean = 22f, fU = 90f, fL = 90f, bU = -20f, bL = 110f)
    val SW_WIND = CROUCH.copy(lean = 32f)
    val SW_STRIKE = Pose(lean = 38f, bU = 40f, bL = 150f, fU = 20f, fL = 10f, blU = 55f, blL = -75f, flU = 88f, flL = 90f)
    val JK_STRIKE = Pose(lean = -12f, bU = 30f, bL = 150f, fU = 40f, fL = 140f, blU = 40f, blL = -60f, flU = 55f, flL = 55f)
    val JP_STRIKE = JUMP.copy(lean = 12f, fU = 65f, fL = 65f)
    val KB_WIND = Pose(lean = -10f, bU = -40f, bL = 15f, fU = -35f, fL = 20f, blU = -35f, blL = -20f, flU = 32f, flL = 15f)
    val KB_STRIKE = Pose(lean = 10f, bU = 82f, bL = 88f, fU = 88f, fL = 90f, blU = -35f, blL = -20f, flU = 32f, flL = 15f)
    val MEI_WIND = Pose(lean = -10f, bU = 40f, bL = 150f, fU = 70f, fL = 110f, blU = -10f, blL = -6f, flU = 60f, flL = -10f)

    val HIT = Pose(lean = -22f, bU = -40f, bL = -10f, fU = 20f, fL = 100f, head = -20f)
    val BLOCK = Pose(lean = -6f, bU = 15f, bL = 165f, fU = 25f, fL = 172f)
    val CBLOCK = CROUCH.copy(lean = 10f, bU = 15f, bL = 165f, fU = 25f, fL = 172f)
    val DOWN = Pose(lean = 0f, bU = 150f, bL = 150f, fU = 170f, fL = 170f, blU = -5f, blL = 0f, flU = 8f, flL = 5f, head = -10f, rot = 90f)
    val WIN = Pose(lean = 0f, bU = 20f, bL = 150f, fU = 175f, fL = 178f, blU = -12f, blL = -6f, flU = 12f, flL = 4f)
    val MEI_WIN = Pose(lean = -4f, bU = 40f, bL = 150f, fU = 150f, fL = 120f, blU = -10f, blL = -4f, flU = 60f, flL = -20f)
}

enum class Hgt { HIGH, MID, LOW }   // HIGH = overhead (block standing), LOW = block crouching
enum class Limb { HAND, FOOT, NONE }

class Move(
    val startup: Int, val active: Int, val recovery: Int,
    val damage: Float, val chip: Float, val hitstun: Int, val blockstun: Int, val push: Float,
    val height: Hgt, val limb: Limb,
    val kind: Int,                       // 0 punch, 1 kick, 2 special
    val windup: Pose, val strike: Pose,
    val reach: Float = 5f,
    val knockdown: Boolean = false,
    val crouching: Boolean = false,
    val air: Boolean = false,
    val multiEvery: Int = 0,
    val dash: Float = 0f,
    val projectile: Boolean = false,
    val custom: ((Int, Pose) -> Pose)? = null
) {
    val total: Int get() = startup + active + recovery

    fun poseAt(t: Int, base: Pose): Pose {
        custom?.let { return it(t, base) }
        val s = startup.toFloat()
        return when {
            t <= startup * 0.6f -> base.mix(windup, t / (s * 0.6f))
            t <= startup -> windup.mix(strike, (t - s * 0.6f) / (s * 0.4f))
            t <= startup + active -> strike
            else -> strike.mix(base, (t - startup - active).toFloat() / recovery)
        }
    }
}

object Moves {
    val PUNCH = Move(4, 3, 9, 6f, 0f, 14, 10, 1.6f, Hgt.MID, Limb.HAND, 0, Poses.P_WIND, Poses.P_STRIKE)
    val KICK = Move(8, 4, 14, 9f, 0f, 18, 12, 2.2f, Hgt.MID, Limb.FOOT, 1, Poses.K_WIND, Poses.K_STRIKE, reach = 6f)
    val CPUNCH = Move(4, 3, 9, 5f, 0f, 13, 9, 1.4f, Hgt.MID, Limb.HAND, 0, Poses.CP_WIND, Poses.CP_STRIKE, crouching = true)
    val SWEEP = Move(9, 4, 20, 8f, 0f, 16, 12, 1.5f, Hgt.LOW, Limb.FOOT, 1, Poses.SW_WIND, Poses.SW_STRIKE, reach = 6f, knockdown = true, crouching = true)
    val JPUNCH = Move(5, 8, 6, 7f, 0f, 16, 10, 1.5f, Hgt.HIGH, Limb.HAND, 0, Poses.JUMP, Poses.JP_STRIKE, air = true)
    val JKICK = Move(6, 10, 6, 9f, 0f, 18, 12, 2.0f, Hgt.HIGH, Limb.FOOT, 1, Poses.JUMP, Poses.JK_STRIKE, reach = 6f, air = true)

    /** RYO special: 氣功彈 Ki Blast (projectile). */
    val KIBLAST = Move(14, 2, 24, 11f, 2f, 20, 14, 2.6f, Hgt.MID, Limb.NONE, 2, Poses.KB_WIND, Poses.KB_STRIKE, projectile = true)

    /** MEI special: 鳳凰連腳 Phoenix Kicks (dashing multi-hit kicks). */
    val PHOENIX = Move(
        8, 28, 18, 4.5f, 1f, 16, 10, 0.8f, Hgt.MID, Limb.FOOT, 2, Poses.MEI_WIND, Poses.K_STRIKE,
        reach = 6f, multiEvery = 7, dash = 2.0f,
        custom = { t, base ->
            val a = t - 8
            when {
                a < 0 -> base.mix(Poses.MEI_WIND, t / 8f)
                a < 28 -> {
                    val phase = (a / 7) % 2
                    val ext = sin((a % 7) / 7f * Math.PI.toFloat())
                    if (phase == 0) Pose(lean = -16f, bU = 30f, bL = 150f, fU = 60f, fL = 110f,
                        blU = -10f, blL = -6f, flU = 40f + 65f * ext, flL = 20f + 75f * ext, lift = 2f)
                    else Pose(lean = -16f, bU = 30f, bL = 150f, fU = 60f, fL = 110f,
                        blU = 40f + 65f * ext, blL = 20f + 75f * ext, flU = -10f, flL = -5f, lift = 2f)
                }
                else -> Poses.K_STRIKE.mix(base, (a - 28) / 18f)
            }
        }
    )
}

class Style(
    val name: String, val cn: String, val tag: String, val mei: Boolean,
    val skin: Int, val top: Int, val pants: Int, val glove: Int, val hair: Int, val foot: Int, val trim: Int,
    val idle: Pose, val win: Pose, val walk: Float, val punchMul: Float, val kickMul: Float,
    val special: Move, val specialCd: Int, val specialName: String
)

object Styles {
    val RYO = Style(
        "RYO", "龍", "力量型 POWER", false,
        skin = 0xFFE8A878.toInt(), top = 0xFFF4F4F6.toInt(), pants = 0xFFE6E6EC.toInt(), glove = 0xFFD42A2A.toInt(),
        hair = 0xFF15141A.toInt(), foot = 0xFFE8A878.toInt(), trim = 0xFF101010.toInt(),
        idle = Poses.RYO_IDLE, win = Poses.WIN, walk = 1.35f, punchMul = 1.15f, kickMul = 0.95f,
        special = Moves.KIBLAST, specialCd = 75, specialName = "氣功彈 KI BLAST"
    )
    val MEI = Style(
        "MEI", "美玲", "速度型 SPEED", true,
        skin = 0xFFF0B888.toInt(), top = 0xFFC81E28.toInt(), pants = 0xFF1A1418.toInt(), glove = 0xFFC81E28.toInt(),
        hair = 0xFF2A1A14.toInt(), foot = 0xFF221A1E.toInt(), trim = 0xFFF0C040.toInt(),
        idle = Poses.MEI_IDLE, win = Poses.MEI_WIN, walk = 1.65f, punchMul = 0.9f, kickMul = 1.15f,
        special = Moves.PHOENIX, specialCd = 70, specialName = "鳳凰連腳 PHOENIX KICKS"
    )
    val ALL = arrayOf(RYO, MEI)
}

/** Joint positions in world coordinates, rebuilt every frame from the pose. */
class Skeleton {
    var hipX = 0f; var hipY = 0f
    var shX = 0f; var shY = 0f
    var headX = 0f; var headY = 0f
    var fsX = 0f; var fsY = 0f; var bsX = 0f; var bsY = 0f
    var fElX = 0f; var fElY = 0f; var fHX = 0f; var fHY = 0f
    var bElX = 0f; var bElY = 0f; var bHX = 0f; var bHY = 0f
    var fKX = 0f; var fKY = 0f; var fFX = 0f; var fFY = 0f
    var bKX = 0f; var bKY = 0f; var bFX = 0f; var bFY = 0f

    fun build(x: Float, y: Float, facing: Int, p: Pose) {
        val f = facing.toFloat()
        fun dx(a: Float, l: Float) = kotlin.math.sin(rad(a)) * l * f
        fun dy(a: Float, l: Float) = kotlin.math.cos(rad(a)) * l
        val hFront = dy(p.flU, Dim.T) + dy(p.flL, Dim.S)
        val hBack = dy(p.blU, Dim.T) + dy(p.blL, Dim.S)
        val hipH = max(max(hFront, hBack), 3f) + p.lift
        hipX = x; hipY = y - hipH
        fKX = hipX + dx(p.flU, Dim.T); fKY = hipY + dy(p.flU, Dim.T)
        fFX = fKX + dx(p.flL, Dim.S); fFY = fKY + dy(p.flL, Dim.S)
        bKX = hipX + dx(p.blU, Dim.T); bKY = hipY + dy(p.blU, Dim.T)
        bFX = bKX + dx(p.blL, Dim.S); bFY = bKY + dy(p.blL, Dim.S)
        shX = hipX + dx(p.lean, Dim.TORSO); shY = hipY - dy(p.lean, Dim.TORSO)
        headX = shX + dx(p.lean + p.head, Dim.HR + 2.5f); headY = shY - dy(p.lean + p.head, Dim.HR + 2.5f)
        fsX = shX + 1.5f * f; fsY = shY + 1f
        bsX = shX - 2f * f; bsY = shY + 1f
        fElX = fsX + dx(p.fU, Dim.UA); fElY = fsY + dy(p.fU, Dim.UA)
        fHX = fElX + dx(p.fL, Dim.FA); fHY = fElY + dy(p.fL, Dim.FA)
        bElX = bsX + dx(p.bU, Dim.UA); bElY = bsY + dy(p.bU, Dim.UA)
        bHX = bElX + dx(p.bL, Dim.FA); bHY = bElY + dy(p.bL, Dim.FA)
    }
}

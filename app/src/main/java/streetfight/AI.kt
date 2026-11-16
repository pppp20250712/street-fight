package com.example.myapplication20261102streetfighter.game

import kotlin.math.abs
import kotlin.math.sign

/** CPU opponent. level: 0 easy, 1 normal, 2 hard. */
class AI {
    var level = 1
    private val rnd = java.util.Random()
    private val out = Input()
    private var planT = 0
    private var pf = false; private var pb = false; private var pu = false; private var pd = false
    private var cool = 40
    private var seenAtk = -1
    private var seenProj = -1

    fun reset() { planT = 0; cool = 40; seenAtk = -1; seenProj = -1 }

    private fun setPlan(t: Int, f: Boolean, b: Boolean, u: Boolean, d: Boolean) {
        planT = t; pf = f; pb = b; pu = u; pd = d
    }

    private fun applyDirs(me: Fighter) {
        val fwdRight = me.facing == 1
        if (pf) { if (fwdRight) out.right = true else out.left = true }
        if (pb) { if (fwdRight) out.left = true else out.right = true }
        if (pu) out.up = true
        if (pd) out.down = true
    }

    fun think(me: Fighter, opp: Fighter, projs: List<Proj>): Input {
        out.clear()
        val d = abs(opp.x - me.x)
        val blockP = floatArrayOf(0.12f, 0.38f, 0.7f)[level]
        val gap = intArrayOf(36, 20, 8)[level]

        // react to a new attack from the player
        val om = opp.move
        if (opp.state == St.ATTACK && om != null && opp.attackSerial != seenAtk) {
            seenAtk = opp.attackSerial
            if (d < 90f && !om.projectile && rnd.nextFloat() < blockP) {
                setPlan(om.total - opp.moveT + 6, false, true, false, om.height == Hgt.LOW)
            }
        }
        // react to incoming projectiles
        for (pr in projs) {
            if (pr.owner === opp && pr.id != seenProj) {
                val dist = (me.x - pr.x) * sign(pr.vx)
                if (dist in 0f..110f) {
                    seenProj = pr.id
                    val r = rnd.nextFloat()
                    if (r < blockP * 0.6f) setPlan(14, true, false, true, false)
                    else if (r < blockP + 0.15f) setPlan(40, false, true, false, false)
                }
            }
        }

        if (planT > 0) {
            planT--
            applyDirs(me)
            if (me.state == St.JUMP && d < 50f && rnd.nextFloat() < 0.12f) out.k = true
            return out
        }
        if (!me.isNeutral()) return out
        if (cool > 0) { cool--; return out }

        decide(me, d)
        cool = gap + rnd.nextInt(gap + 1)
        applyDirs(me)
        return out
    }

    private fun decide(me: Fighter, d: Float) {
        val r = rnd.nextFloat()
        val mei = me.style.mei
        if (d > 110f) {
            when {
                r < 0.42f -> setPlan(20 + rnd.nextInt(25), true, false, false, false)
                r < 0.62f && !mei -> out.s = true
                r < 0.72f -> setPlan(12, true, false, true, false)
                else -> setPlan(15, false, false, false, false)
            }
        } else if (d > 52f) {
            when {
                r < 0.32f -> setPlan(8 + rnd.nextInt(16), true, false, false, false)
                r < 0.45f -> setPlan(12, true, false, true, false)
                r < 0.58f -> out.k = true
                r < 0.70f -> out.s = true
                r < 0.82f -> setPlan(14, false, true, false, false)
                else -> setPlan(10, false, false, false, false)
            }
        } else {
            when {
                r < 0.28f -> out.p = true
                r < 0.48f -> out.k = true
                r < 0.60f -> { out.down = true; out.k = true }
                r < 0.68f -> { out.down = true; out.p = true }
                r < 0.76f -> out.s = true
                r < 0.88f -> setPlan(16, false, true, false, false)
                else -> setPlan(10, false, true, true, false)
            }
        }
    }
}

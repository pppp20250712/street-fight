package com.example.myapplication20261102streetfighter.game

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import kotlin.math.hypot
import kotlin.math.sin

/** Draws fighters with smooth, anti-aliased vector shapes (scaled to screen resolution). */
object FighterArt {
    private val OUT = 0xFF140C10.toInt()
    private val pf = Paint().apply { isAntiAlias = true; style = Paint.Style.FILL }
    private val ps = Paint().apply {
        isAntiAlias = true; style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND
    }
    private val path = Path()
    private var flash = false
    private var fc = 1f
    private var nx = 0f; private var ny = 0f   // torso perpendicular

    private fun col(c: Int, dark: Boolean = false): Int {
        if (flash) return Color.WHITE
        if (!dark) return c
        return Color.rgb((Color.red(c) * 0.72f).toInt(), (Color.green(c) * 0.72f).toInt(), (Color.blue(c) * 0.72f).toInt())
    }

    private fun line(c: Canvas, x1: Float, y1: Float, x2: Float, y2: Float, w: Float, color: Int) {
        ps.color = OUT; ps.strokeWidth = w + 2f
        c.drawLine(x1, y1, x2, y2, ps)
        ps.color = color; ps.strokeWidth = w
        c.drawLine(x1, y1, x2, y2, ps)
    }

    private fun ball(c: Canvas, x: Float, y: Float, r: Float, color: Int) {
        pf.color = OUT; c.drawCircle(x, y, r + 1f, pf)
        pf.color = color; c.drawCircle(x, y, r, pf)
    }

    private fun tri(c: Canvas, hx: Float, hy: Float, ax: Float, ay: Float, bx: Float, by: Float, cx: Float, cy: Float, color: Int) {
        path.reset()
        path.moveTo(hx + ax * fc, hy + ay); path.lineTo(hx + bx * fc, hy + by); path.lineTo(hx + cx * fc, hy + cy); path.close()
        pf.color = color; c.drawPath(path, pf)
    }

    fun shadow(c: Canvas, f: Fighter) {
        val air = (G.FLOOR - f.y).coerceIn(0f, 80f)
        val lying = f.pose.rot > 45f
        val w = (if (lying) 26f else 14f) * (1f - air / 160f)
        val cx = if (lying) f.x - f.facing * 22f else f.x
        pf.color = 0x55000000
        c.drawOval(cx - w, G.FLOOR - 2f, cx + w, G.FLOOR + 2f, pf)
    }

    fun draw(c: Canvas, f: Fighter) {
        val s = f.skel; val p = f.pose; val st = f.style
        fc = f.facing.toFloat()
        flash = f.flash > 0 && f.flash % 2 == 1
        // torso frame
        val dx = s.shX - s.hipX; val dy = s.shY - s.hipY
        val len = hypot(dx, dy).coerceAtLeast(0.01f)
        nx = -dy / len; ny = dx / len

        c.save()
        if (p.rot != 0f) {
            c.translate(0f, -3f * sin(rad(p.rot)))
            c.rotate(-p.rot * fc, f.x, f.y)
        }
        if (st.mei) {
            leg(c, f, false); arm(c, f, false); skirt(c, f); leg(c, f, true)
            torso(c, f); head(c, f); arm(c, f, true)
        } else {
            leg(c, f, false); arm(c, f, false); leg(c, f, true)
            ball(c, s.hipX, s.hipY, 6f, col(st.pants))
            torso(c, f); belt(c, f); head(c, f); arm(c, f, true)
        }
        c.restore()
    }

    private fun foot(c: Canvas, kx: Float, ky: Float, fx: Float, fy: Float, w: Float, color: Int) {
        val dx = fx - kx; val dy = fy - ky
        val l = hypot(dx, dy).coerceAtLeast(0.01f)
        val px = fc * dy / l; val py = -fc * dx / l
        line(c, fx, fy, fx + px * 4f, fy + py * 4f, w, color)
    }

    private fun leg(c: Canvas, f: Fighter, front: Boolean) {
        val s = f.skel; val st = f.style
        val kx = if (front) s.fKX else s.bKX; val ky = if (front) s.fKY else s.bKY
        val fx = if (front) s.fFX else s.bFX; val fy = if (front) s.fFY else s.bFY
        val dark = !front
        if (!st.mei) {
            line(c, s.hipX, s.hipY, kx, ky, 6.5f, col(st.pants, dark))
            line(c, kx, ky, fx, fy, 5.5f, col(st.pants, dark))
            foot(c, kx, ky, fx, fy, 2.5f, col(st.skin, dark))
        } else {
            line(c, s.hipX, s.hipY, kx, ky, 4.5f, col(st.skin, dark))
            line(c, s.hipX, s.hipY, s.hipX + (kx - s.hipX) * 0.45f, s.hipY + (ky - s.hipY) * 0.45f, 6f, col(st.pants, dark))
            val mx = kx + (fx - kx) * 0.35f; val my = ky + (fy - ky) * 0.35f
            line(c, kx, ky, mx, my, 4f, col(st.skin, dark))
            line(c, mx, my, fx, fy, 5f, col(st.foot, dark))
            foot(c, kx, ky, fx, fy, 3f, col(st.foot, dark))
        }
    }

    private fun arm(c: Canvas, f: Fighter, front: Boolean) {
        val s = f.skel; val st = f.style
        val sx = if (front) s.fsX else s.bsX; val sy = if (front) s.fsY else s.bsY
        val ex = if (front) s.fElX else s.bElX; val ey = if (front) s.fElY else s.bElY
        val hx = if (front) s.fHX else s.bHX; val hy = if (front) s.fHY else s.bHY
        val dark = !front
        val w = if (st.mei) 3.5f else 4.5f
        if (st.mei) line(c, sx, sy, ex, ey, w, col(st.skin, dark))
        else line(c, sx, sy, ex, ey, 5.5f, col(st.top, dark))   // karate gi sleeve
        line(c, ex, ey, hx, hy, w - 0.5f, col(st.skin, dark))
        if (!st.mei) {
            ball(c, hx, hy, 3.2f, col(st.glove, dark))
        } else {
            val wx = ex + (hx - ex) * 0.7f; val wy = ey + (hy - ey) * 0.7f
            line(c, wx, wy, hx, hy, 4f, col(st.glove, dark))
            ball(c, hx, hy, 2.2f, col(st.skin, dark))
        }
    }

    private fun torso(c: Canvas, f: Fighter) {
        val s = f.skel; val st = f.style
        // neck
        line(c, s.shX, s.shY, s.headX, s.headY, if (st.mei) 3.5f else 4.5f, col(st.skin))
        val hw = if (st.mei) 5f else 5.5f
        val sw = if (st.mei) 6f else 7.5f
        path.reset()
        path.moveTo(s.hipX + nx * hw, s.hipY + ny * hw)
        path.lineTo(s.shX + nx * sw, s.shY + ny * sw)
        path.lineTo(s.shX - nx * sw, s.shY - ny * sw)
        path.lineTo(s.hipX - nx * hw, s.hipY - ny * hw)
        path.close()
        pf.color = col(st.top); c.drawPath(path, pf)
        ps.color = OUT; ps.strokeWidth = 1.2f; c.drawPath(path, ps)
        if (!st.mei) {
            // karate gi V-neck lapels
            val lx = s.shX + (s.hipX - s.shX) * 0.45f; val ly = s.shY + (s.hipY - s.shY) * 0.45f
            line(c, s.shX - fc * 1f, s.shY - 1f, lx + fc * 1.5f, ly, 1.2f, col(0xFFC8C8D2.toInt()))
            ps.color = col(st.skin); ps.strokeWidth = 1.5f
            c.drawLine(s.shX, s.shY - 1f, s.shX + (lx - s.shX) * 0.4f, s.shY + (ly - s.shY) * 0.4f, ps)
        }
        if (st.mei) {
            // mandarin collar + golden frog-button trim
            val cx = s.shX + (s.headX - s.shX) * 0.45f; val cy = s.shY + (s.headY - s.shY) * 0.45f
            line(c, s.shX, s.shY, cx, cy, 4.5f, col(st.top))
            ps.color = col(st.trim); ps.strokeWidth = 1.2f
            c.drawLine(cx, cy, s.shX + fc * 4f, s.shY + 4f, ps)
            c.drawLine(s.shX + fc * 4f, s.shY + 4f, s.shX + fc * 2f, s.shY + 9f, ps)
        }
    }

    private fun belt(c: Canvas, f: Fighter) {
        val s = f.skel; val st = f.style
        val k = col(st.trim)
        line(c, s.hipX + nx * 6f, s.hipY + ny * 6f, s.hipX - nx * 6f, s.hipY - ny * 6f, 2.5f, k)
        line(c, s.hipX + fc * 2f, s.hipY, s.hipX + fc * 4f, s.hipY + 9f, 1.8f, k)
        line(c, s.hipX + fc * 1f, s.hipY, s.hipX - fc * 1f, s.hipY + 8f, 1.8f, k)
    }

    private fun skirt(c: Canvas, f: Fighter) {
        val s = f.skel; val st = f.style
        val bx = s.hipX + ((s.fKX + s.bKX) / 2f - s.hipX) * 0.8f
        val by = s.hipY + ((s.fKY + s.bKY) / 2f - s.hipY) * 0.8f
        val dx = bx - s.hipX; val dy = by - s.hipY
        val l = hypot(dx, dy).coerceAtLeast(0.01f)
        val px = -dy / l; val py = dx / l
        path.reset()
        path.moveTo(s.hipX + px * 5.5f, s.hipY + py * 5.5f)
        path.lineTo(bx + px * 7f, by + py * 7f)
        path.lineTo(bx - px * 7f, by - py * 7f)
        path.lineTo(s.hipX - px * 5.5f, s.hipY - py * 5.5f)
        path.close()
        pf.color = col(st.top, true); c.drawPath(path, pf)
        ps.color = OUT; ps.strokeWidth = 1.2f; c.drawPath(path, ps)
        ps.color = col(st.trim); ps.strokeWidth = 1f
        c.drawLine(bx + px * 6f, by + py * 6f, bx - px * 6f, by - py * 6f, ps)
    }

    private fun head(c: Canvas, f: Fighter) {
        val s = f.skel; val st = f.style
        val hx = s.headX; val hy = s.headY; val r = Dim.HR
        ball(c, hx, hy, r, col(st.skin))
        val hair = col(st.hair)
        if (!st.mei) {
            tri(c, hx, hy, -2f, -5f, -10f, -4f, -4f, -1f, hair)
            tri(c, hx, hy, -4f, -3f, -9f, 1f, -3f, 1f, hair)
            tri(c, hx, hy, 0f, -6f, -3f, -10f, 3f, -5f, hair)
        } else {
            ball(c, hx - fc * 1f, hy - 7f, 3.2f, hair)
        }
        pf.color = hair; c.drawCircle(hx - fc * 1.2f, hy - 1.6f, r, pf)
        pf.color = col(st.skin); c.drawCircle(hx + fc * 1.6f, hy + 1.2f, r - 1.7f, pf)
        if (!st.mei) {
            tri(c, hx, hy, 2f, -5f, 7f, -3f, 3f, -2f, hair)
        } else {
            ps.color = col(0xFF3CC08A.toInt()); ps.strokeWidth = 1.2f   // jade hairpin
            c.drawLine(hx - fc * 5f, hy - 8.5f, hx + fc * 3f, hy - 6f, ps)
        }
        val ex = hx + fc * 2.6f
        pf.color = OUT
        c.drawRect(ex - 0.7f, hy, ex + 0.7f, hy + 1.8f, pf)
    }
}

/** Builds the pixel-art street stage background once. */
object Stage {
    fun build(res: Float = 1f): Bitmap {
        val w = G.W; val h = G.H
        val b = Bitmap.createBitmap((w * res).toInt(), (h * res).toInt(), Bitmap.Config.ARGB_8888)
        val c = Canvas(b)
        c.scale(res, res)
        val p = Paint().apply { isAntiAlias = false }
        val rnd = java.util.Random(2026)

        // sunset sky bands with dithered edges
        val sky = intArrayOf(0xFF1B1035.toInt(), 0xFF2E1650.toInt(), 0xFF55205E.toInt(), 0xFF8A2D5E.toInt(),
            0xFFC4485A.toInt(), 0xFFE87A4E.toInt(), 0xFFF5B060.toInt())
        val band = 15
        for (i in sky.indices) {
            p.color = sky[i]
            c.drawRect(0f, (i * band).toFloat(), w.toFloat(), ((i + 1) * band).toFloat(), p)
            if (i > 0) {
                p.color = sky[i - 1]
                var x = 0
                while (x < w) { c.drawRect(x.toFloat(), (i * band).toFloat(), x + 1f, i * band + 1f, p); x += 2 }
                var x2 = 1
                while (x2 < w) { c.drawRect(x2.toFloat(), i * band + 2f, x2 + 1f, i * band + 3f, p); x2 += 4 }
            }
        }
        p.color = sky.last(); c.drawRect(0f, (sky.size * band).toFloat(), w.toFloat(), 150f, p)

        // retro striped sun
        p.color = 0xFFFFD27A.toInt(); c.drawCircle(300f, 92f, 24f, p)
        p.color = 0xFFF5B060.toInt()
        for (i in 0 until 5) c.drawRect(270f, 96f + i * 5f, 330f, 97.5f + i * 5f + i * 0.4f, p)

        // far skyline
        p.color = 0xFF3A1E4E.toInt()
        var x = 0f
        while (x < w) {
            val bw = 14f + rnd.nextInt(20); val bh = 30f + rnd.nextInt(45)
            c.drawRect(x, 120f - bh, x + bw, 150f, p)
            x += bw + rnd.nextInt(4)
        }
        // near buildings with lit windows
        x = -6f
        var shade = 0
        while (x < w) {
            val bw = 34f + rnd.nextInt(30); val top = 54f + rnd.nextInt(40)
            p.color = if (shade % 2 == 0) 0xFF1E1230.toInt() else 0xFF26163A.toInt()
            c.drawRect(x, top, x + bw, 150f, p)
            p.color = 0xFF120A1E.toInt(); c.drawRect(x, top, x + bw, top + 2f, p)
            var wy = top + 6f
            while (wy < 140f) {
                var wx = x + 4f
                while (wx < x + bw - 5f) {
                    val lit = rnd.nextFloat() < 0.38f
                    p.color = if (lit) (if (rnd.nextBoolean()) 0xFFFFC85A.toInt() else 0xFFFF9A4A.toInt()) else 0xFF2E2244.toInt()
                    c.drawRect(wx, wy, wx + 3f, wy + 4f, p)
                    wx += 7f
                }
                wy += 9f
            }
            x += bw + 2f; shade++
        }
        // neon signs
        fun neon(nx: Float, ny: Float, nw: Float, nh: Float, color: Int) {
            p.color = 0xFF0C0814.toInt(); c.drawRect(nx - 1, ny - 1, nx + nw + 1, ny + nh + 1, p)
            p.color = color; c.drawRect(nx, ny, nx + nw, ny + nh, p)
            p.color = 0xFF0C0814.toInt(); c.drawRect(nx + 2, ny + 2, nx + nw - 2, ny + nh - 2, p)
            p.color = color
            var i = nx + 4
            while (i < nx + nw - 4) { c.drawRect(i, ny + 4, i + 3, ny + nh - 4, p); i += 6 }
        }
        neon(40f, 78f, 18f, 34f, 0xFFFF3FA4.toInt())
        neon(150f, 70f, 40f, 14f, 0xFF3FE8FF.toInt())
        neon(232f, 84f, 16f, 30f, 0xFFFFE04A.toInt())
        neon(340f, 74f, 30f, 12f, 0xFFFF5A3A.toInt())

        // lantern strings
        p.color = 0xFF120A1E.toInt()
        for (xx in 0 until w) {
            val yy = 34f + 10f * sin(xx / w.toFloat() * Math.PI.toFloat() * 2f).let { it * it }
            c.drawRect(xx.toFloat(), yy, xx + 1f, yy + 1f, p)
        }
        var lx = 12f
        while (lx < w) {
            val yy = 36f + 10f * sin(lx / w * Math.PI.toFloat() * 2f).let { it * it }
            p.color = 0xFF120A1E.toInt(); c.drawRect(lx - 4, yy + 1, lx + 4, yy + 11, p)
            p.color = 0xFFE02828.toInt(); c.drawRect(lx - 3, yy + 2, lx + 3, yy + 10, p)
            p.color = 0xFFFF7A4A.toInt(); c.drawRect(lx - 1, yy + 3, lx + 1, yy + 9, p)
            p.color = 0xFFF0C040.toInt(); c.drawRect(lx - 3, yy + 1, lx + 3, yy + 2, p); c.drawRect(lx - 3, yy + 10, lx + 3, yy + 11, p)
            lx += 28f
        }

        // sidewalk + road
        p.color = 0xFF4A3A4A.toInt(); c.drawRect(0f, 150f, w.toFloat(), 162f, p)
        p.color = 0xFF5E4C5C.toInt()
        var sx = 0f
        while (sx < w) { c.drawRect(sx, 150f, sx + 1f, 162f, p); sx += 24f }
        p.color = 0xFF231A26.toInt(); c.drawRect(0f, 162f, w.toFloat(), 165f, p)
        p.color = 0xFF3A3040.toInt(); c.drawRect(0f, 165f, w.toFloat(), h.toFloat(), p)
        for (i in 0 until 700) {
            p.color = if (rnd.nextBoolean()) 0xFF332A38.toInt() else 0xFF443A4A.toInt()
            val px = rnd.nextInt(w).toFloat(); val py = 165f + rnd.nextInt(h - 165)
            c.drawRect(px, py, px + 1f, py + 1f, p)
        }
        p.color = 0xFFB89A50.toInt()
        var dx = 6f
        while (dx < w) { c.drawRect(dx, 208f, dx + 14f, 210f, p); dx += 30f }
        // warm reflections of the lanterns on the road
        p.color = 0x22FF7A4A
        c.drawRect(0f, 168f, w.toFloat(), 176f, p)
        return b
    }
}

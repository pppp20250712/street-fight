package com.example.myapplication20261102streetfighter.game

import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** Procedural textures for the 3D stage (same recipes as TexPaint in docs/play/render3d.js). */
object StageTex {
    private fun bmp(w: Int, h: Int) = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    private fun rgba(r: Int, g: Int, b: Int, a: Float) = Color.argb((a * 255).toInt().coerceIn(0, 255), r, g, b)

    fun asphalt(): Bitmap {
        val b = bmp(512, 512); val c = Canvas(b); val p = Paint(Paint.ANTI_ALIAS_FLAG); val r = Seeded(11)
        c.drawColor(0xFF2E2634.toInt())
        val oval = RectF()
        repeat(40) {
            p.color = if (r.next() < 0.5f) rgba(20, 14, 26, 0.18f) else rgba(90, 76, 96, 0.12f)
            val s = 30f + r.next() * 90f; val x = r.next() * 512f; val y = r.next() * 512f
            val e = 0.4f + r.next() * 0.6f; val rot = r.next() * 3f
            c.save(); c.rotate(Math.toDegrees(rot.toDouble()).toFloat(), x, y)
            oval.set(x - s, y - s * e, x + s, y + s * e); c.drawOval(oval, p); c.restore()
        }
        p.isAntiAlias = false
        repeat(9000) {
            val v = r.next()
            p.color = if (v < 0.5f) 0xFF2A2230.toInt() else if (v < 0.9f) 0xFF4D4252.toInt() else 0xFF6E6272.toInt()
            val x = (r.next() * 512).toInt().toFloat(); val y = (r.next() * 512).toInt().toFloat()
            c.drawRect(x, y, x + 1f + (if (r.next() < 0.2f) 1f else 0f), y + 1f, p)
        }
        p.isAntiAlias = true; p.style = Paint.Style.STROKE; p.strokeWidth = 1.5f; p.color = rgba(16, 10, 20, 0.75f)
        repeat(6) {
            var x = r.next() * 512f; var y = r.next() * 512f
            val path = android.graphics.Path(); path.moveTo(x, y)
            repeat(7) { x += (r.next() - 0.5f) * 60f; y += (r.next() - 0.5f) * 60f; path.lineTo(x, y) }
            c.drawPath(path, p)
        }
        return b
    }

    fun sidewalk(): Bitmap {
        val b = bmp(256, 256); val c = Canvas(b); val p = Paint(); val r = Seeded(5)
        for (ty in 0 until 2) for (tx in 0 until 2) {
            val v = 84 + (r.next() * 14).toInt()
            p.color = Color.rgb(v + 8, v - 8, v + 6); c.drawRect(tx * 128f, ty * 128f, tx * 128f + 128f, ty * 128f + 128f, p)
        }
        repeat(3000) {
            p.color = if (r.next() < 0.5f) rgba(40, 30, 44, 0.35f) else rgba(150, 130, 150, 0.25f)
            val x = r.next() * 256f; val y = r.next() * 256f; c.drawRect(x, y, x + 1f, y + 1f, p)
        }
        p.color = 0xFF3A2C3C.toInt()
        for (k in 0..2) { c.drawRect(k * 128f - 2f, 0f, k * 128f + 2f, 256f, p); c.drawRect(0f, k * 128f - 2f, 256f, k * 128f + 2f, p) }
        return b
    }

    /** Building facade: albedo (emissive=false) or the lit-window emission map (emissive=true). */
    fun facade(emissive: Boolean): Bitmap {
        val b = bmp(512, 1024); val c = Canvas(b); val p = Paint(); val r = Seeded(2026)
        c.drawColor(if (emissive) Color.BLACK else 0xFF5A4870.toInt())
        if (!emissive) repeat(4000) {
            p.color = if (r.next() < 0.5f) rgba(30, 20, 40, 0.25f) else rgba(120, 100, 140, 0.15f)
            val x = r.next() * 512f; val y = r.next() * 1024f; c.drawRect(x, y, x + 3f, y + 1f, p)
        }
        for (row in 0 until 16) {
            if (!emissive) { p.shader = null; p.color = 0xFF3C2E50.toInt(); c.drawRect(0f, row * 64f + 58f, 512f, row * 64f + 64f, p) }
            for (col in 0 until 8) {
                val x = col * 64f + 14f; val y = row * 64f + 12f
                val lit = r.next() < 0.4f; val warm = r.next() < 0.6f; val blind = r.next()
                if (emissive) {
                    if (lit) {
                        p.shader = LinearGradient(0f, y, 0f, y + 36f,
                            if (warm) 0xFFFFD27A.toInt() else 0xFFFF9A4A.toInt(), if (warm) 0xFFC87A30.toInt() else 0xFFA04A2A.toInt(), Shader.TileMode.CLAMP)
                        c.drawRect(x, y, x + 36f, y + 36f, p); p.shader = null
                        if (blind < 0.35f) { p.color = rgba(0, 0, 0, 0.55f); c.drawRect(x, y, x + 36f, y + 10f + blind * 40f, p) }
                    } else { p.color = Color.BLACK; c.drawRect(x, y, x + 36f, y + 36f, p) }
                } else {
                    p.color = 0xFF1C1428.toInt(); c.drawRect(x - 3f, y - 3f, x + 39f, y + 41f, p)
                    p.color = if (lit) Color.WHITE else 0xFF283048.toInt(); c.drawRect(x, y, x + 36f, y + 36f, p)
                    p.color = 0xFF1C1428.toInt(); c.drawRect(x + 17f, y, x + 19f, y + 36f, p)
                }
            }
        }
        return b
    }

    fun shop(): Bitmap {
        val b = bmp(256, 128); val c = Canvas(b); val p = Paint(Paint.ANTI_ALIAS_FLAG); val r = Seeded(3)
        p.shader = LinearGradient(0f, 0f, 0f, 128f, 0xFF7A4A24.toInt(), 0xFF3A2014.toInt(), Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, 256f, 128f, p); p.shader = null
        for (k in 0 until 3) { p.color = rgba(255, 200, 120, 0.55f); c.drawRect(0f, 26f + k * 34f, 256f, 29f + k * 34f, p) }
        val cols = intArrayOf(0xFFA05A30.toInt(), 0xFFC08040.toInt(), 0xFF5A7A5A.toInt(), 0xFF8A3A3A.toInt())
        repeat(40) {
            p.color = cols[(r.next() * 4).toInt().coerceAtMost(3)]
            val x = r.next() * 250f; val y = 10f + (r.next() * 3).toInt() * 34f; val w = 4f + r.next() * 8f
            c.drawRect(x, y, x + w, y + 14f, p)
        }
        p.color = rgba(20, 10, 8, 0.85f); c.drawRect(150f, 50f, 176f, 128f, p); c.drawCircle(163f, 44f, 10f, p)
        p.color = rgba(255, 230, 180, 0.35f); c.drawRect(0f, 0f, 256f, 6f, p)
        p.color = 0xFF0C0808.toInt(); c.drawRect(0f, 0f, 4f, 128f, p); c.drawRect(126f, 0f, 130f, 128f, p); c.drawRect(252f, 0f, 256f, 128f, p)
        return b
    }

    fun sky(): Bitmap {
        val w = 1024; val h = 512
        val b = bmp(w, h); val c = Canvas(b); val p = Paint(Paint.ANTI_ALIAS_FLAG); val r = Seeded(7)
        val stops = intArrayOf(0xFF140C2A.toInt(), 0xFF24124A.toInt(), 0xFF4A1C5C.toInt(), 0xFF7E2A60.toInt(), 0xFFBC4458.toInt(), 0xFFE4764C.toInt(), 0xFFF6B062.toInt())
        val pos = FloatArray(stops.size) { it / (stops.size - 1f) }
        p.shader = LinearGradient(0f, 0f, 0f, h.toFloat(), stops, pos, Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, w.toFloat(), h.toFloat(), p); p.shader = null
        p.isAntiAlias = false
        for (i in 0 until 160) {
            val a = 0.3f + r.next() * 0.7f
            p.color = rgba(255, 240, 255, a * (1f - i / 200f))
            val s = if (r.next() < 0.1f) 2f else 1f
            val x = r.next() * w; val y = r.next() * 200f; c.drawRect(x, y, x + s, y + s, p)
        }
        p.isAntiAlias = true
        val sx = 660f; val sy = 300f; val sr = 84f
        p.shader = RadialGradient(sx, sy, sr * 2.6f, intArrayOf(rgba(255, 190, 110, 0.55f), rgba(255, 190, 110, 0.55f), rgba(255, 120, 90, 0f)),
            floatArrayOf(0f, 0.6f / 2.6f, 1f), Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, w.toFloat(), h.toFloat(), p)
        p.shader = LinearGradient(0f, sy - sr, 0f, sy + sr, 0xFFFFF2A8.toInt(), 0xFFFF8A4A.toInt(), Shader.TileMode.CLAMP)
        c.drawCircle(sx, sy, sr, p); p.shader = null
        c.save()
        val clip = android.graphics.Path(); clip.addCircle(sx, sy, sr, android.graphics.Path.Direction.CW); c.clipPath(clip)
        p.color = 0xFFE88A58.toInt()
        for (i in 0 until 6) c.drawRect(sx - sr, sy + 10f + i * 15f, sx + sr, sy + 10f + i * 15f + 2f + i * 1.4f, p)
        c.restore()
        p.isAntiAlias = false
        var x = 0f
        while (x < w) {
            val bw = 26f + r.next() * 50f; val bh = 50f + r.next() * 110f
            p.color = 0xFF3A1E4E.toInt(); c.drawRect(x, h - bh, x + bw, h.toFloat(), p)
            if (r.next() < 0.3f) c.drawRect(x + bw * 0.45f, h - bh - 22f, x + bw * 0.45f + 3f, h - bh, p)
            p.color = rgba(255, 190, 110, 0.55f)
            var wy = h - bh + 8f
            while (wy < h - 6f) {
                var wxx = x + 4f
                while (wxx < x + bw - 4f) { if (r.next() < 0.14f) c.drawRect(wxx, wy, wxx + 3f, wy + 4f, p); wxx += 8f }
                wy += 10f
            }
            x += bw + r.next() * 6f
        }
        return b
    }

    fun sign(text: String, color: Int, vertical: Boolean): Bitmap {
        val w = if (vertical) 256 else 1024; val h = if (vertical) 1024 else 256
        val b = bmp(w, h); val c = Canvas(b)
        c.drawColor(0xFF06040A.toInt())
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.style = Paint.Style.STROKE; p.strokeWidth = 10f; p.color = color
        p.maskFilter = BlurMaskFilter(18f, BlurMaskFilter.Blur.NORMAL)
        c.drawRect(18f, 18f, w - 18f, h - 18f, p)
        p.maskFilter = null; c.drawRect(18f, 18f, w - 18f, h - 18f, p)
        p.style = Paint.Style.FILL
        p.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        p.textAlign = Paint.Align.CENTER
        p.textSize = if (vertical) 190f else 150f
        fun glyph(s: String, cx: Float, cy: Float) {
            val base = cy - (p.descent() + p.ascent()) / 2f
            p.color = color; p.maskFilter = BlurMaskFilter(22f, BlurMaskFilter.Blur.NORMAL); c.drawText(s, cx, base, p)
            p.maskFilter = null; c.drawText(s, cx, base, p)
            p.color = Color.WHITE; p.alpha = 140; c.drawText(s, cx, base, p); p.alpha = 255
        }
        if (vertical) { val n = text.length; for (i in 0 until n) glyph(text[i].toString(), w / 2f, h * (i + 0.5f) / n) }
        else glyph(text, w / 2f, h / 2f + 6f)
        return b
    }

    // ---- sprite masks: shape lives in the alpha channel (rgb = white, so premultiplied upload is harmless)
    private fun mask(size: Int, f: (Float, Float) -> Float): Bitmap {
        val px = IntArray(size * size); val half = size / 2f - 0.5f
        for (y in 0 until size) for (x in 0 until size) {
            val a = (f((x - half) / (size / 2f), (y - half) / (size / 2f)).coerceIn(0f, 1f) * 255f).toInt()
            px[y * size + x] = (a shl 24) or 0xFFFFFF
        }
        val b = bmp(size, size); b.setPixels(px, 0, size, 0, 0, size, size); return b
    }

    fun glow() = mask(128) { x, y -> val r = hypot(x, y); max(0f, exp(-r * r * 4.5f) - 0.012f) }
    fun star() = mask(128) { x, y ->
        val r = hypot(x, y); val an = atan2(y, x)
        val ray = abs(cos(an * 4f)).pow(24f) * max(0f, 1f - r); val core = exp(-r * r * 30f)
        min(1f, ray * 1.4f + core)
    }
    fun disc() = mask(64) { x, y -> ((1f - hypot(x, y)) * 3f).coerceIn(0f, 1f) }
    fun vignette() = mask(256) { x, y -> val r = hypot(x * 0.9f, y); val a = ((r - 0.55f) / 0.75f).coerceIn(0f, 1f); a * a * 200f / 255f }
}

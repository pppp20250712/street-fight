package com.example.myapplication20261102streetfighter.game

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.tan

/** World metres per game pixel, and game -> world conversion (y up, fight plane at z = 0). */
const val K = 1f / 30f
fun wx(x: Float) = (x - 192f) * K
fun wy(y: Float) = (G.FLOOR - y) * K

/** Column-major 4x4 matrix helpers (same layout as OpenGL / docs/play/render3d.js). */
object M4 {
    fun ident(o: FloatArray): FloatArray { o.fill(0f); o[0] = 1f; o[5] = 1f; o[10] = 1f; o[15] = 1f; return o }

    /** o = a * b (o must not alias a or b). */
    fun mul(o: FloatArray, a: FloatArray, b: FloatArray): FloatArray {
        for (c in 0 until 4) {
            val b0 = b[c * 4]; val b1 = b[c * 4 + 1]; val b2 = b[c * 4 + 2]; val b3 = b[c * 4 + 3]
            for (r in 0 until 4) o[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3
        }
        return o
    }

    fun persp(o: FloatArray, fovy: Float, asp: Float, n: Float, f: Float): FloatArray {
        val t = 1f / tan(fovy / 2f); o.fill(0f)
        o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1f; o[14] = 2f * f * n / (n - f)
        return o
    }

    fun ortho(o: FloatArray, l: Float, r: Float, b: Float, t: Float, n: Float, f: Float): FloatArray {
        o.fill(0f)
        o[0] = 2f / (r - l); o[5] = 2f / (t - b); o[10] = -2f / (f - n)
        o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1f
        return o
    }

    fun lookAt(o: FloatArray, ex: Float, ey: Float, ez: Float, cx: Float, cy: Float, cz: Float, ux: Float, uy: Float, uz: Float): FloatArray {
        var zx = ex - cx; var zy = ey - cy; var zz = ez - cz
        var l = len3(zx, zy, zz); zx /= l; zy /= l; zz /= l
        var xx = uy * zz - uz * zy; var xy = uz * zx - ux * zz; var xz = ux * zy - uy * zx
        l = len3(xx, xy, xz); xx /= l; xy /= l; xz /= l
        val yx = zy * xz - zz * xy; val yy = zz * xx - zx * xz; val yz = zx * xy - zy * xx
        o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0f
        o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0f
        o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0f
        o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1f
        return o
    }

    fun basis(o: FloatArray, ax: Float, ay: Float, az: Float, bx: Float, by: Float, bz: Float,
              cx: Float, cy: Float, cz: Float, tx: Float, ty: Float, tz: Float): FloatArray {
        o[0] = ax; o[1] = ay; o[2] = az; o[3] = 0f; o[4] = bx; o[5] = by; o[6] = bz; o[7] = 0f
        o[8] = cx; o[9] = cy; o[10] = cz; o[11] = 0f; o[12] = tx; o[13] = ty; o[14] = tz; o[15] = 1f
        return o
    }

    /** Normal matrix = inverse-transpose of the upper 3x3 = [c1×c2, c2×c0, c0×c1] / det. */
    fun normal(o: FloatArray, m: FloatArray): FloatArray {
        val ax = m[0]; val ay = m[1]; val az = m[2]; val bx = m[4]; val by = m[5]; val bz = m[6]; val cx = m[8]; val cy = m[9]; val cz = m[10]
        val x0 = by * cz - bz * cy; val y0 = bz * cx - bx * cz; val z0 = bx * cy - by * cx
        val x1 = cy * az - cz * ay; val y1 = cz * ax - cx * az; val z1 = cx * ay - cy * ax
        val x2 = ay * bz - az * by; val y2 = az * bx - ax * bz; val z2 = ax * by - ay * bx
        var det = ax * x0 + ay * y0 + az * z0
        det = if (det == 0f) 1f else 1f / det
        o[0] = x0 * det; o[1] = y0 * det; o[2] = z0 * det; o[3] = x1 * det; o[4] = y1 * det; o[5] = z1 * det
        o[6] = x2 * det; o[7] = y2 * det; o[8] = z2 * det
        return o
    }
}

fun len3(x: Float, y: Float, z: Float): Float = kotlin.math.sqrt(x * x + y * y + z * z)

/** sRGB 0xRRGGBB -> linear colour, optionally scaled. */
fun lin(hex: Int, mul: Float = 1f): FloatArray = floatArrayOf(
    (((hex shr 16) and 255) / 255f).pow(2.2f) * mul,
    (((hex shr 8) and 255) / 255f).pow(2.2f) * mul,
    ((hex and 255) / 255f).pow(2.2f) * mul
)

/** Deterministic LCG, identical to seededRandom() in render3d.js. */
class Seeded(seed: Int) {
    private var s: Long = seed.toLong() and 0xFFFFFFFFL
    fun next(): Float { s = (s * 1664525L + 1013904223L) and 0xFFFFFFFFL; return (s.toDouble() / 4294967296.0).toFloat() }
}

/** Raw geometry: interleaved later as pos(3) nor(3) uv(2). */
class Geo(val pos: FloatArray, val nor: FloatArray, val uv: FloatArray, val idx: ShortArray, var len: Float = 1f)

object Geom {
    /** Surface of revolution around +Y from a (radius, y) profile. Outward faces are counter-clockwise. */
    fun lathe(prof: List<FloatArray>, seg: Int, closed: Boolean): Geo {
        val n = prof.size
        val pos = FloatArray(n * (seg + 1) * 3); val nor = FloatArray(n * (seg + 1) * 3); val uv = FloatArray(n * (seg + 1) * 2)
        var pi = 0; var ui = 0
        for (i in 0 until n) {
            val ip = if (closed) (i - 1 + n) % n else max(i - 1, 0)
            val inx = if (closed) (i + 1) % n else min(i + 1, n - 1)
            val tr = prof[inx][0] - prof[ip][0]; val ty = prof[inx][1] - prof[ip][1]
            var nr = ty; var ny = -tr
            val l = hypot(nr, ny).let { if (it == 0f) 1f else it }; nr /= l; ny /= l
            for (j in 0..seg) {
                val a = j.toFloat() / seg * PI.toFloat() * 2f
                val c = cos(a); val s = sin(a)
                pos[pi] = prof[i][0] * c; pos[pi + 1] = prof[i][1]; pos[pi + 2] = prof[i][0] * s
                nor[pi] = nr * c; nor[pi + 1] = ny; nor[pi + 2] = nr * s
                pi += 3
                uv[ui] = j.toFloat() / seg; uv[ui + 1] = i.toFloat() / (n - 1); ui += 2
            }
        }
        val rows = if (closed) n else n - 1
        val idx = ShortArray(rows * seg * 6); var k = 0
        for (i in 0 until rows) {
            val i2 = (i + 1) % n
            for (j in 0 until seg) {
                val a = i * (seg + 1) + j; val b = a + 1; val c = i2 * (seg + 1) + j; val d = c + 1
                idx[k++] = a.toShort(); idx[k++] = c.toShort(); idx[k++] = d.toShort()
                idx[k++] = a.toShort(); idx[k++] = d.toShort(); idx[k++] = b.toShort()
            }
        }
        return Geo(pos, nor, uv, idx)
    }

    fun profSphere(n: Int): List<FloatArray> = (0..n).map { i ->
        val a = -PI.toFloat() / 2f + PI.toFloat() * i / n
        floatArrayOf(cos(a), sin(a))
    }

    /** Tapered capsule from y=0 (radius r1) to y=L (radius r2) with an optional mid bulge. */
    fun profCapsule(L: Float, r1: Float, r2: Float, bulge: Float): List<FloatArray> {
        val p = ArrayList<FloatArray>()
        val h = PI.toFloat() / 2f
        for (i in 0..6) { val a = -h + h * i / 6f; p.add(floatArrayOf(r1 * cos(a), r1 * sin(a))) }
        for (i in 1 until 8) { val t = i / 8f; p.add(floatArrayOf(r1 + (r2 - r1) * t + bulge * sin(PI.toFloat() * t), L * t)) }
        for (i in 0..6) { val a = h * i / 6f; p.add(floatArrayOf(r2 * cos(a), L + r2 * sin(a))) }
        return p
    }

    fun profTorus(r: Float, n: Int): List<FloatArray> = (0 until n).map { i ->
        val a = -PI.toFloat() + 2f * PI.toFloat() * i / n
        floatArrayOf(1f + r * cos(a), r * sin(a))
    }

    fun box(): Geo {
        val pos = ArrayList<Float>(); val nor = ArrayList<Float>(); val uv = ArrayList<Float>(); val idx = ArrayList<Short>()
        fun face(nx: Float, ny: Float, nz: Float, ux: Float, uy: Float, uz: Float, vx: Float, vy: Float, vz: Float) {
            val b = pos.size / 3
            val cs = arrayOf(floatArrayOf(-1f, -1f, 0f, 0f), floatArrayOf(1f, -1f, 1f, 0f), floatArrayOf(1f, 1f, 1f, 1f), floatArrayOf(-1f, 1f, 0f, 1f))
            for (c in cs) {
                pos.add(0.5f * (nx + c[0] * ux + c[1] * vx)); pos.add(0.5f * (ny + c[0] * uy + c[1] * vy)); pos.add(0.5f * (nz + c[0] * uz + c[1] * vz))
                nor.add(nx); nor.add(ny); nor.add(nz); uv.add(c[2]); uv.add(c[3])
            }
            for (o in intArrayOf(0, 1, 2, 0, 2, 3)) idx.add((b + o).toShort())
        }
        face(0f, 0f, 1f, 1f, 0f, 0f, 0f, 1f, 0f); face(0f, 0f, -1f, -1f, 0f, 0f, 0f, 1f, 0f)
        face(1f, 0f, 0f, 0f, 0f, -1f, 0f, 1f, 0f); face(-1f, 0f, 0f, 0f, 0f, 1f, 0f, 1f, 0f)
        face(0f, 1f, 0f, 1f, 0f, 0f, 0f, 0f, -1f); face(0f, -1f, 0f, 1f, 0f, 0f, 0f, 0f, 1f)
        return Geo(pos.toFloatArray(), nor.toFloatArray(), uv.toFloatArray(), idx.toShortArray())
    }

    fun quad() = Geo(
        floatArrayOf(-.5f, -.5f, 0f, .5f, -.5f, 0f, .5f, .5f, 0f, -.5f, .5f, 0f),
        floatArrayOf(0f, 0f, 1f, 0f, 0f, 1f, 0f, 0f, 1f, 0f, 0f, 1f),
        floatArrayOf(0f, 0f, 1f, 0f, 1f, 1f, 0f, 1f),
        shortArrayOf(0, 1, 2, 0, 2, 3)
    )

    fun ground() = Geo(
        floatArrayOf(-.5f, 0f, .5f, .5f, 0f, .5f, .5f, 0f, -.5f, -.5f, 0f, -.5f),
        floatArrayOf(0f, 1f, 0f, 0f, 1f, 0f, 0f, 1f, 0f, 0f, 1f, 0f),
        floatArrayOf(0f, 0f, 1f, 0f, 1f, 1f, 0f, 1f),
        shortArrayOf(0, 1, 2, 0, 2, 3)
    )
}

/** Follow camera, updated at the fixed 60 Hz game step (same rules as CamRig in render3d.js). */
class CamRig {
    var x = 0f; var y = 3.1f; var z = 13.4f; var tx = 0f; var ty = 2.93f; var d = 13.4f

    fun update(title: Boolean, frame: Long, x1: Float, x2: Float, ko: Boolean) {
        if (title) {
            val a = sin(frame * 0.006f) * 0.05f; val dd = 13.4f
            x = sin(a) * dd; z = cos(a) * dd; y = 3.1f; tx = 0f; ty = 2.93f; d = 9f
            return
        }
        val mid = (wx(x1) + wx(x2)) / 2f; val sep = kotlin.math.abs(wx(x1) - wx(x2))
        var dd = (5.2f + sep * 0.62f).coerceIn(7f, 11f)
        if (ko) dd *= 0.92f
        val t = mid.coerceIn(-3.4f, 3.4f)
        tx += (t - tx) * 0.12f; d += (dd - d) * 0.08f; ty += (1.05f - ty) * 0.1f
        x = tx; y = 1.55f + (ty - 1.05f) * 0.9f; z = d
    }
}

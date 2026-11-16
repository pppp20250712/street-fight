package com.example.myapplication20261102streetfighter.game

import android.graphics.Bitmap
import android.graphics.Matrix
import android.opengl.GLES30.*
import android.opengl.GLSurfaceView
import android.opengl.GLUtils
import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import javax.microedition.khronos.egl.EGL10
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.egl.EGLDisplay
import javax.microedition.khronos.opengles.GL10
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.sin

/** Everything the renderer needs from one game frame, copied across threads under a lock. */
class Snapshot {
    class F {
        var mei = false; var x = 0f; var y = 0f; var facing = 1; var flash = 0; var rot = 0f
        val j = FloatArray(26)   // skeleton joints, see Rig.* indices
    }
    var title = true; var frame = 0L; var shake = 0f; var ko = false
    var camX = 0f; var camY = 3.1f; var camZ = 13.4f; var camTX = 0f; var camTY = 2.93f
    val f = arrayOf(F(), F())
    var nProj = 0; val proj = FloatArray(4 * MAX_PROJ)            // x, y, vx, anim
    var nPart = 0; val part = FloatArray(6 * MAX_PART); val partCol = IntArray(MAX_PART)   // x, y, z, size, life, grav
    var nBurst = 0; val burst = FloatArray(4 * MAX_BURST)          // x, y, t, block

    fun setFighter(i: Int, ft: Fighter) {
        val o = f[i]; val s = ft.skel
        o.mei = ft.style.mei; o.x = ft.x; o.y = ft.y; o.facing = ft.facing; o.flash = ft.flash; o.rot = ft.pose.rot
        val j = o.j
        j[0] = s.hipX; j[1] = s.hipY; j[2] = s.shX; j[3] = s.shY; j[4] = s.headX; j[5] = s.headY
        j[6] = s.fsX; j[7] = s.fsY; j[8] = s.bsX; j[9] = s.bsY
        j[10] = s.fElX; j[11] = s.fElY; j[12] = s.fHX; j[13] = s.fHY; j[14] = s.bElX; j[15] = s.bElY; j[16] = s.bHX; j[17] = s.bHY
        j[18] = s.fKX; j[19] = s.fKY; j[20] = s.fFX; j[21] = s.fFY; j[22] = s.bKX; j[23] = s.bKY; j[24] = s.bFX; j[25] = s.bFY
    }

    fun copyFrom(o: Snapshot) {
        title = o.title; frame = o.frame; shake = o.shake; ko = o.ko
        camX = o.camX; camY = o.camY; camZ = o.camZ; camTX = o.camTX; camTY = o.camTY
        for (i in 0..1) {
            val a = f[i]; val b = o.f[i]
            a.mei = b.mei; a.x = b.x; a.y = b.y; a.facing = b.facing; a.flash = b.flash; a.rot = b.rot
            System.arraycopy(b.j, 0, a.j, 0, 26)
        }
        nProj = o.nProj; System.arraycopy(o.proj, 0, proj, 0, nProj * 4)
        nPart = o.nPart; System.arraycopy(o.part, 0, part, 0, nPart * 6); System.arraycopy(o.partCol, 0, partCol, 0, nPart)
        nBurst = o.nBurst; System.arraycopy(o.burst, 0, burst, 0, nBurst * 4)
    }

    companion object { const val MAX_PROJ = 8; const val MAX_PART = 400; const val MAX_BURST = 32 }
}

/** OpenGL ES 3.0 renderer: shadow-mapped, MSAA, tone-mapped 3D street stage with fully modelled fighters. */
class Renderer3D : GLSurfaceView.Renderer {

    class Mesh(val vao: Int, val count: Int, val len: Float)
    class Mat(val col: FloatArray, val rough: Float, val metal: Float, val emis: FloatArray = floatArrayOf(0f, 0f, 0f),
              val texMode: Int = 0, val tex: Int = 0, val tex2: Int = 0, val uv: FloatArray = floatArrayOf(1f, 1f, 0f, 0f))
    class Item { var mesh: Mesh? = null; var mat: Mat? = null; var flash = 0f; var cast = true; val m = FloatArray(16) }
    class Frame { val o = FloatArray(3); val a = FloatArray(3); val b = FloatArray(3); val c = FloatArray(3) }
    private class StyleMats(val skin: Mat, val top: Mat, val topDark: Mat, val pants: Mat, val glove: Mat, val hair: Mat,
                            val foot: Mat, val trim: Mat, val eye: Mat, val lips: Mat, val jade: Mat, val gold: Mat)

    private val lock = Any()
    private val pending = Snapshot()
    private val v = Snapshot()

    /** Called from the UI thread after each game update. */
    fun publish(fill: (Snapshot) -> Unit) { synchronized(lock) { fill(pending) } }

    // GL objects
    private var pLit = 0; private var pDepth = 0; private var pSpr = 0
    private val u = HashMap<String, Int>(); private var udLVP = 0; private var udModel = 0; private var usVP = 0; private var usTex = 0
    private val SHADOW = 2048
    private var shTex = 0; private var shFbo = 0
    private var sprVao = 0; private var sprVbo = 0
    private val MAX_SPR = 1200
    private val sprArr = FloatArray(6 * 9 * MAX_SPR)
    private val sprBuf: FloatBuffer = ByteBuffer.allocateDirect(sprArr.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer()
    private var width = 1; private var height = 1
    private var ready = false

    private val vp = FloatArray(16); private val view = FloatArray(16); private val proj = FloatArray(16); private val lvp = FloatArray(16)
    private val tmp = FloatArray(16); private val tmp2 = FloatArray(16); private val root = FloatArray(16); private val nrm = FloatArray(9)
    private val items = ArrayList<Item>(); private var nItems = 0
    private val staticItems = ArrayList<Item>()
    private val stageSprites = ArrayList<FloatArray>()
    private val stageLights = ArrayList<FloatArray>()
    private val plPos = FloatArray(20); private val plCol = FloatArray(15)

    private class Spr { var x = 0f; var y = 0f; var z = 0f; var size = 0f; var r = 0f; var g = 0f; var b = 0f; var a = 0f; var tex = 0; var add = true; var ground = false; var rot = 0f }
    private val spr = ArrayList<Spr>(); private var nSpr = 0

    private val M = HashMap<String, Mesh>()
    private val T = HashMap<String, Int>()
    private lateinit var mats: Array<StyleMats>
    private lateinit var projMat: Mat

    // ---------------------------------------------------------------- GLSurfaceView.Renderer
    override fun onSurfaceCreated(unused: GL10?, config: EGLConfig?) {
        try {
            items.clear(); staticItems.clear(); stageSprites.clear(); stageLights.clear(); M.clear(); T.clear()
            pLit = program(VS_LIT, FS_LIT); pDepth = program(VS_DEPTH, FS_DEPTH); pSpr = program(VS_SPR, FS_SPR)
            for (n in arrayOf("uVP", "uModel", "uNrm", "uLVP", "uCol", "uRough", "uMetal", "uEmis", "uTex", "uTex2", "uTexMode", "uUvXf", "uFlash",
                    "uCam", "uKeyDir", "uKeyCol", "uRimDir", "uRimCol", "uSky", "uGnd", "uPL", "uPC", "uShadow", "uTexel", "uFog", "uFogD", "uExpo"))
                u[n] = glGetUniformLocation(pLit, n)
            udLVP = glGetUniformLocation(pDepth, "uLVP"); udModel = glGetUniformLocation(pDepth, "uModel")
            usVP = glGetUniformLocation(pSpr, "uVP"); usTex = glGetUniformLocation(pSpr, "uTex")
            initShadow(); initSprites()
            buildMeshes(); buildTextures(); buildMaterials(); buildStage()
            ready = true
        } catch (e: Exception) {
            Log.e("StreetFight3D", "GL init failed", e); ready = false
        }
    }

    override fun onSurfaceChanged(unused: GL10?, w: Int, h: Int) { width = max(1, w); height = max(1, h) }

    override fun onDrawFrame(unused: GL10?) {
        synchronized(lock) { v.copyFrom(pending) }
        if (!ready) { glClearColor(0.07f, 0.04f, 0.12f, 1f); glClear(GL_COLOR_BUFFER_BIT); return }
        render()
    }

    // ---------------------------------------------------------------- setup
    private fun shader(type: Int, src: String): Int {
        val s = glCreateShader(type); glShaderSource(s, src); glCompileShader(s)
        val ok = IntArray(1); glGetShaderiv(s, GL_COMPILE_STATUS, ok, 0)
        if (ok[0] == 0) throw RuntimeException("shader: " + glGetShaderInfoLog(s))
        return s
    }

    private fun program(vs: String, fs: String): Int {
        val p = glCreateProgram(); glAttachShader(p, shader(GL_VERTEX_SHADER, vs)); glAttachShader(p, shader(GL_FRAGMENT_SHADER, fs)); glLinkProgram(p)
        val ok = IntArray(1); glGetProgramiv(p, GL_LINK_STATUS, ok, 0)
        if (ok[0] == 0) throw RuntimeException("link: " + glGetProgramInfoLog(p))
        return p
    }

    private fun gen(f: (Int, IntArray, Int) -> Unit): Int { val a = IntArray(1); f(1, a, 0); return a[0] }

    private fun initShadow() {
        shTex = gen(::glGenTextures); glBindTexture(GL_TEXTURE_2D, shTex)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_DEPTH_COMPONENT24, SHADOW, SHADOW, 0, GL_DEPTH_COMPONENT, GL_UNSIGNED_INT, null)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_COMPARE_MODE, GL_COMPARE_REF_TO_TEXTURE); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_COMPARE_FUNC, GL_LEQUAL)
        shFbo = gen(::glGenFramebuffers); glBindFramebuffer(GL_FRAMEBUFFER, shFbo)
        glFramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_TEXTURE_2D, shTex, 0)
        glDrawBuffers(1, intArrayOf(GL_NONE), 0); glReadBuffer(GL_NONE)
        glBindFramebuffer(GL_FRAMEBUFFER, 0)
    }

    private fun initSprites() {
        sprVao = gen(::glGenVertexArrays); sprVbo = gen(::glGenBuffers)
        glBindVertexArray(sprVao); glBindBuffer(GL_ARRAY_BUFFER, sprVbo)
        glBufferData(GL_ARRAY_BUFFER, sprArr.size * 4, null, GL_DYNAMIC_DRAW)
        glEnableVertexAttribArray(0); glVertexAttribPointer(0, 3, GL_FLOAT, false, 36, 0)
        glEnableVertexAttribArray(1); glVertexAttribPointer(1, 2, GL_FLOAT, false, 36, 12)
        glEnableVertexAttribArray(2); glVertexAttribPointer(2, 4, GL_FLOAT, false, 36, 20)
        glBindVertexArray(0)
    }

    private fun mesh(g: Geo): Mesh {
        val n = g.pos.size / 3
        val data = FloatArray(n * 8)
        for (i in 0 until n) {
            data[i * 8] = g.pos[i * 3]; data[i * 8 + 1] = g.pos[i * 3 + 1]; data[i * 8 + 2] = g.pos[i * 3 + 2]
            data[i * 8 + 3] = g.nor[i * 3]; data[i * 8 + 4] = g.nor[i * 3 + 1]; data[i * 8 + 5] = g.nor[i * 3 + 2]
            data[i * 8 + 6] = g.uv[i * 2]; data[i * 8 + 7] = g.uv[i * 2 + 1]
        }
        val vao = gen(::glGenVertexArrays); glBindVertexArray(vao)
        val vb = gen(::glGenBuffers); glBindBuffer(GL_ARRAY_BUFFER, vb)
        val fb = ByteBuffer.allocateDirect(data.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().put(data); fb.position(0)
        glBufferData(GL_ARRAY_BUFFER, data.size * 4, fb, GL_STATIC_DRAW)
        glEnableVertexAttribArray(0); glVertexAttribPointer(0, 3, GL_FLOAT, false, 32, 0)
        glEnableVertexAttribArray(1); glVertexAttribPointer(1, 3, GL_FLOAT, false, 32, 12)
        glEnableVertexAttribArray(2); glVertexAttribPointer(2, 2, GL_FLOAT, false, 32, 24)
        val ib = gen(::glGenBuffers); glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ib)
        val sb = ByteBuffer.allocateDirect(g.idx.size * 2).order(ByteOrder.nativeOrder()).asShortBuffer().put(g.idx); sb.position(0)
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, g.idx.size * 2, sb, GL_STATIC_DRAW)
        glBindVertexArray(0)
        return Mesh(vao, g.idx.size, g.len)
    }

    private fun cap(L: Float, r1: Float, r2: Float, b: Float): Mesh {
        val g = Geom.lathe(Geom.profCapsule(L * K, r1 * K, r2 * K, b * K), 24, false); g.len = L * K; return mesh(g)
    }

    private fun pf(vararg v: Float): List<FloatArray> = v.toList().chunked(2).map { floatArrayOf(it[0], it[1]) }

    private fun buildMeshes() {
        M["sphere"] = mesh(Geom.lathe(Geom.profSphere(18), 32, false))
        M["box"] = mesh(Geom.box()); M["quad"] = mesh(Geom.quad()); M["ground"] = mesh(Geom.ground())
        M["cyl"] = mesh(Geom.lathe(pf(0f, 0f, 1f, 0f, 1f, 0.001f, 1f, 0.999f, 1f, 1f, 0f, 1f), 24, false))
        M["cone"] = mesh(Geom.lathe(pf(0f, -0.04f, 0.9f, 0f, 1f, 0.08f, 0.78f, 0.35f, 0.42f, 0.72f, 0f, 1f), 16, false))
        M["frustum"] = mesh(Geom.lathe(pf(1f, 0f, 1.04f, 0.3f, 1.16f, 0.7f, 1.3f, 1f), 32, false))
        M["torus"] = mesh(Geom.lathe(Geom.profTorus(0.16f, 12), 32, true))
        M["barrel"] = mesh(Geom.lathe(pf(0f, 0f, 0.86f, 0f, 0.92f, 0.05f, 1f, 0.3f, 1.02f, 0.5f, 1f, 0.7f, 0.92f, 0.95f, 0.86f, 1f, 0f, 1f), 24, false))
        fun torso(p: List<FloatArray>): Mesh {
            val g = Geom.lathe(p.map { floatArrayOf(it[0] * K, it[1] * K) }, 28, false); g.len = Dim.TORSO * K; return mesh(g)
        }
        M["torsoR"] = torso(pf(0f, -4f, 4.6f, -3.2f, 6.3f, -1f, 6.6f, 1f, 6.1f, 5f, 5.9f, 8f, 6.9f, 12f, 7.5f, 15f, 7.3f, 17.5f, 6.2f, 19.6f, 4f, 21f, 0f, 21.6f))
        M["torsoM"] = torso(pf(0f, -3.5f, 4.4f, -2.6f, 5.9f, -0.5f, 5.6f, 2.5f, 4.6f, 6.5f, 4.5f, 9f, 5.6f, 12.5f, 6f, 15.5f, 5.6f, 18f, 4.2f, 20f, 0f, 20.8f))
        M["thighR"] = cap(Dim.T, 4.4f, 3.6f, 0.3f); M["shinR"] = cap(Dim.S, 3.7f, 3.0f, 0.2f)
        M["uaR"] = cap(Dim.UA, 3.6f, 3.2f, 0.2f); M["faR"] = cap(Dim.FA, 2.5f, 2.0f, 0.45f)
        M["neckR"] = cap(Dim.HR + 2.5f, 2.5f, 2.3f, 0f); M["neckM"] = cap(Dim.HR + 2.5f, 2.0f, 1.8f, 0f)
        M["thighM"] = cap(Dim.T, 3.2f, 2.4f, 0.25f); M["shortsM"] = cap(Dim.T * 0.5f, 3.7f, 3.3f, 0f)
        M["shinM"] = cap(Dim.S, 2.3f, 1.8f, 0.35f); M["bootM"] = cap(Dim.S * 0.62f, 2.6f, 2.35f, 0f)
        M["uaM"] = cap(Dim.UA, 2.1f, 1.8f, 0.15f); M["faM"] = cap(Dim.FA, 1.85f, 1.5f, 0.2f)
    }

    private fun tex(src: Bitmap, repeat: Boolean, mip: Boolean = true): Int {
        // flip vertically so v = 0 is the bottom row, as with UNPACK_FLIP_Y on the web
        val b = Bitmap.createBitmap(src, 0, 0, src.width, src.height, Matrix().apply { preScale(1f, -1f) }, false)
        val t = gen(::glGenTextures); glBindTexture(GL_TEXTURE_2D, t)
        GLUtils.texImage2D(GL_TEXTURE_2D, 0, b, 0)
        b.recycle(); src.recycle()
        val w = if (repeat) GL_REPEAT else GL_CLAMP_TO_EDGE
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, w); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, w)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
        if (mip) { glGenerateMipmap(GL_TEXTURE_2D); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR) }
        else glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
        if (repeat && (glGetString(GL_EXTENSIONS) ?: "").contains("GL_EXT_texture_filter_anisotropic"))
            glTexParameterf(GL_TEXTURE_2D, 0x84FE, 8f)   // TEXTURE_MAX_ANISOTROPY_EXT
        return t
    }

    private fun buildTextures() {
        T["asphalt"] = tex(StageTex.asphalt(), true); T["sidewalk"] = tex(StageTex.sidewalk(), true)
        T["facade"] = tex(StageTex.facade(false), true); T["facadeE"] = tex(StageTex.facade(true), true)
        T["sky"] = tex(StageTex.sky(), false); T["shop"] = tex(StageTex.shop(), true)
        T["signA"] = tex(StageTex.sign("拉麵", 0xFFFF3FA4.toInt(), true), false)
        T["signB"] = tex(StageTex.sign("STREET FIGHT", 0xFF3FE8FF.toInt(), false), false)
        T["signC"] = tex(StageTex.sign("酒場", 0xFFFFE04A.toInt(), true), false)
        T["signD"] = tex(StageTex.sign("格鬥館", 0xFFFF6A3A.toInt(), false), false)
        T["glow"] = tex(StageTex.glow(), false); T["star"] = tex(StageTex.star(), false)
        T["disc"] = tex(StageTex.disc(), false); T["vig"] = tex(StageTex.vignette(), false)
    }

    private fun mat(hex: Int, rough: Float, metal: Float, emis: FloatArray = floatArrayOf(0f, 0f, 0f), texMode: Int = 0,
                    tex: Int = 0, tex2: Int = 0, uv: FloatArray = floatArrayOf(1f, 1f, 0f, 0f), col: FloatArray? = null) =
        Mat(col ?: lin(hex), rough, metal, emis, texMode, tex, tex2, uv)

    private fun styleMats(st: Style): StyleMats {
        val dark = lin(st.top).map { it * 0.62f }.toFloatArray()
        return StyleMats(
            skin = mat(st.skin, 0.62f, 0f),
            top = mat(if (st.mei) st.top else 0xE6E4EC, if (st.mei) 0.38f else 0.85f, 0f),
            topDark = mat(st.top, 0.45f, 0f, col = dark),
            pants = mat(if (st.mei) st.pants else 0xDCDAE4, if (st.mei) 0.5f else 0.85f, 0f),
            glove = mat(st.glove, 0.3f, 0f), hair = mat(st.hair, 0.35f, 0f),
            foot = mat(st.foot, if (st.mei) 0.28f else 0.62f, 0f),
            trim = mat(st.trim, if (st.mei) 0.25f else 0.7f, if (st.mei) 0.9f else 0f),
            eye = mat(0x16101A, 0.15f, 0f), lips = mat(if (st.mei) 0xC8404A else 0x8A3A34, 0.4f, 0f),
            jade = mat(0x3CC08A, 0.15f, 0.2f), gold = mat(0xF0C040, 0.25f, 0.9f)
        )
    }

    private fun buildMaterials() {
        mats = arrayOf(styleMats(Styles.RYO), styleMats(Styles.MEI))
        projMat = mat(0x2A5BE0, 0.2f, 0f, emis = floatArrayOf(0.9f, 1.7f, 4.2f))
    }

    // ---------------------------------------------------------------- draw list
    private fun add(mesh: Mesh, mat: Mat, flash: Float = 0f, cast: Boolean = true): FloatArray {
        if (nItems >= items.size) items.add(Item())
        val it = items[nItems++]
        it.mesh = mesh; it.mat = mat; it.flash = flash; it.cast = cast
        return it.m
    }

    private fun addStatic(mesh: Mesh, mat: Mat, m: FloatArray, cast: Boolean = false) {
        val it = Item(); it.mesh = mesh; it.mat = mat; it.cast = cast; System.arraycopy(m, 0, it.m, 0, 16); staticItems.add(it)
    }

    private fun sprite(x: Float, y: Float, z: Float, size: Float, r: Float, g: Float, b: Float, a: Float, tex: Int,
                       additive: Boolean, ground: Boolean = false, rot: Float = 0f) {
        if (nSpr >= spr.size) spr.add(Spr())
        val s = spr[nSpr++]
        s.x = x; s.y = y; s.z = z; s.size = size; s.r = r; s.g = g; s.b = b; s.a = a; s.tex = tex; s.add = additive; s.ground = ground; s.rot = rot
    }

    // ---------------------------------------------------------------- stage
    private fun buildStage() {
        val m = FloatArray(16); val r = Seeded(2026)
        val box = M["box"]!!; val quad = M["quad"]!!; val cyl = M["cyl"]!!; val sphere = M["sphere"]!!; val torus = M["torus"]!!
        fun boxAt(cx: Float, cy: Float, cz: Float, sx: Float, sy: Float, sz: Float, mt: Mat, cast: Boolean = false) =
            addStatic(box, mt, M4.basis(m, sx, 0f, 0f, 0f, sy, 0f, 0f, 0f, sz, cx, cy, cz), cast)
        fun glowAt(x: Float, y: Float, z: Float, size: Float, hex: Int, a: Float) {
            val c = lin(hex); stageSprites.add(floatArrayOf(x, y, z, size, c[0].pow(0.45f), c[1].pow(0.45f), c[2].pow(0.45f), a))
        }
        // sky backdrop (must stay first: drawn without depth writes)
        addStatic(quad, mat(0xFFFFFF, 1f, 0f, texMode = 3, tex = T["sky"]!!, col = floatArrayOf(1f, 1f, 1f)), M4.basis(m, 190f, 0f, 0f, 0f, 72f, 0f, 0f, 0f, 1f, 0f, 26f, -70f))
        // road, curb, sidewalk, paint
        addStatic(M["ground"]!!, mat(0xFFFFFF, 0.8f, 0f, texMode = 1, tex = T["asphalt"]!!, uv = floatArrayOf(30f, 9f, 0f, 0f), col = floatArrayOf(1f, 1f, 1f)),
            M4.basis(m, 120f, 0f, 0f, 0f, 1f, 0f, 0f, 0f, 36f, 0f, 0f, 13.6f))
        boxAt(0f, 0.08f, -4.55f, 120f, 0.16f, 0.3f, mat(0x6A5A6C, 0.7f, 0f))
        addStatic(box, mat(0xFFFFFF, 0.75f, 0f, texMode = 1, tex = T["sidewalk"]!!, uv = floatArrayOf(50f, 2f, 0f, 0f), col = floatArrayOf(1f, 1f, 1f)),
            M4.basis(m, 120f, 0f, 0f, 0f, 0.15f, 0f, 0f, 0f, 5f, 0f, 0.075f, -7.2f))
        val paint = mat(0xC8A850, 0.55f, 0f); val white = mat(0xC8C0C8, 0.55f, 0f)
        var px = -42f
        while (px < 42f) { boxAt(px, 0.004f, 2.6f, 1.7f, 0.008f, 0.14f, paint); px += 3.4f }
        boxAt(0f, 0.004f, -3.9f, 120f, 0.008f, 0.1f, white)
        // buildings with lit windows, shopfronts and awnings
        var x = -46f
        val awnings = intArrayOf(0xC81E28, 0x2A5BB0, 0x2A8A5A, 0xD08A20)
        while (x < 46f) {
            val w = 3.6f + r.next() * 3.6f
            val centre = abs(x + w / 2f) < 11f
            val h = if (centre) 4.2f + r.next() * 3.2f else 8f + r.next() * 11f
            val d = 8f
            val uvx = floatArrayOf(w / 8f, h / 16f, r.next(), r.next())
            val wall = mat(if (r.next() < 0.5f) 0x6A5482 else 0x5A4A78, 0.85f, 0f, texMode = 2, tex = T["facade"]!!, tex2 = T["facadeE"]!!, uv = uvx)
            addStatic(box, wall, M4.basis(m, w, 0f, 0f, 0f, h, 0f, 0f, 0f, d, x + w / 2f, h / 2f, -9.6f - d / 2f), true)
            boxAt(x + w / 2f, h + 0.15f, -9.6f - d / 2f, w + 0.2f, 0.3f, d + 0.2f, mat(0x241A30, 0.9f, 0f))
            if (r.next() < 0.7f) {
                val sw = w * 0.62f
                boxAt(x + w / 2f, 1.3f, -9.62f, sw + 0.24f, 1.75f, 0.12f, mat(0x18101E, 0.6f, 0.2f))
                addStatic(quad, mat(0x080608, 0.15f, 0f, texMode = 4, tex = T["shop"]!!, uv = floatArrayOf(max(1f, Math.round(sw / 1.6f).toFloat()), 1f, 0f, 0f)),
                    M4.basis(m, sw, 0f, 0f, 0f, 1.5f, 0f, 0f, 0f, 1f, x + w / 2f, 1.3f, -9.54f))
                val aw = awnings[(r.next() * 4).toInt().coerceAtMost(3)]
                val c = cos(0.45f); val s = sin(0.45f)
                addStatic(box, mat(aw, 0.6f, 0f), M4.basis(m, sw + 0.4f, 0f, 0f, 0f, 0.06f * c, 0.06f * s, 0f, -1.1f * s, 1.1f * c, x + w / 2f, 2.9f, -9.1f), true)
            }
            x += w + 0.15f
        }
        // neon signs
        val neon = arrayOf(
            floatArrayOf(-7.6f, 4.4f, 1.3f, 2.8f), floatArrayOf(-0.9f, 4.1f, 5.0f, 1.15f),
            floatArrayOf(5.2f, 4.3f, 1.15f, 2.6f), floatArrayOf(11.4f, 6.2f, 3.6f, 1.2f))
        val neonTex = arrayOf("signA", "signB", "signC", "signD")
        val neonCol = intArrayOf(0xFF3FA4, 0x3FE8FF, 0xFFE04A, 0xFF6A3A)
        for (i in neon.indices) {
            val (sx, sy, sw, sh) = neon[i]
            boxAt(sx, sy, -9.45f, sw + 0.25f, sh + 0.25f, 0.18f, mat(0x0C0814, 0.5f, 0.3f))
            addStatic(quad, mat(0x050308, 0.3f, 0f, texMode = 4, tex = T[neonTex[i]]!!), M4.basis(m, sw, 0f, 0f, 0f, sh, 0f, 0f, 0f, 1f, sx, sy, -9.35f))
            glowAt(sx, sy, -9.2f, max(sw, sh) * 1.25f, neonCol[i], 0.33f)
        }
        // lantern string
        val gold = mat(0xF0C040, 0.3f, 0.9f); val rope = mat(0x120A1E, 0.8f, 0f); val lant = mat(0x8A1010, 0.5f, 0f, emis = floatArrayOf(2.4f, 0.42f, 0.16f))
        fun ropeY(xx: Float): Float { val s = sin((xx + 16f) / 16f * Math.PI.toFloat()); return 4.55f - 0.85f * s * s }
        var rx = -16f; var ry = ropeY(rx); var xx = -15.5f
        while (xx <= 16f) {
            val ny = ropeY(xx); val dx = xx - rx; val dy = ny - ry; val l = hypot(dx, dy)
            addStatic(cyl, rope, M4.basis(m, dy / l * 0.014f, -dx / l * 0.014f, 0f, dx, dy, 0f, 0f, 0f, 0.014f, rx, ry, -3.0f))
            rx = xx; ry = ny; xx += 0.5f
        }
        var lx = -15f
        while (lx <= 15f) {
            val ly = ropeY(lx) - 0.33f
            addStatic(sphere, lant, M4.basis(m, 0.17f, 0f, 0f, 0f, 0.22f, 0f, 0f, 0f, 0.17f, lx, ly, -3.0f), true)
            addStatic(cyl, gold, M4.basis(m, 0.1f, 0f, 0f, 0f, 0.05f, 0f, 0f, 0f, 0.1f, lx, ly + 0.19f, -3.0f))
            addStatic(cyl, gold, M4.basis(m, 0.1f, 0f, 0f, 0f, 0.05f, 0f, 0f, 0f, 0.1f, lx, ly - 0.24f, -3.0f))
            glowAt(lx, ly, -2.95f, 0.75f, 0xFF6A3A, 0.42f)
            lx += 1.6f
        }
        // street lamps
        val metal = mat(0x2A2430, 0.4f, 0.6f); val lampE = mat(0xFFFFFF, 0.2f, 0f, emis = floatArrayOf(6f, 5.2f, 3.6f))
        for (lxp in floatArrayOf(-9.2f, 9.2f)) {
            addStatic(cyl, metal, M4.basis(m, 0.08f, 0f, 0f, 0f, 5.3f, 0f, 0f, 0f, 0.08f, lxp, 0f, -4.2f), true)
            addStatic(cyl, metal, M4.basis(m, 0.14f, 0f, 0f, 0f, 0.5f, 0f, 0f, 0f, 0.14f, lxp, 0f, -4.2f), true)
            boxAt(lxp, 5.25f, -3.65f, 0.08f, 0.08f, 1.2f, metal, true)
            boxAt(lxp, 5.18f, -3.1f, 0.55f, 0.16f, 0.36f, metal, true)
            boxAt(lxp, 5.09f, -3.1f, 0.45f, 0.02f, 0.28f, lampE)
            glowAt(lxp, 5.0f, -3.05f, 1.3f, 0xFFD8A0, 0.55f)
            stageLights.add(floatArrayOf(lxp, 4.6f, -2.8f, 11f, 2.6f, 2.1f, 1.5f))
        }
        stageLights.add(floatArrayOf(-7.6f, 4.2f, -7.6f, 9f, 1.6f, 0.25f, 0.8f))
        stageLights.add(floatArrayOf(-0.9f, 4.0f, -7.6f, 9f, 0.2f, 1.2f, 1.7f))
        // props
        val rust = mat(0x8A3A2A, 0.55f, 0.35f); val wood = mat(0x7A5A3A, 0.8f, 0f); val bag = mat(0x1E2A24, 0.3f, 0f)
        for ((bx, bz) in listOf(-10.4f to -3.4f, -9.6f to -2.8f, -11.0f to -2.7f)) {
            addStatic(M["barrel"]!!, rust, M4.basis(m, 0.32f, 0f, 0f, 0f, 0.92f, 0f, 0f, 0f, 0.32f, bx, 0f, bz), true)
            addStatic(torus, metal, M4.basis(m, 0.33f, 0f, 0f, 0f, 0.12f, 0f, 0f, 0f, 0.33f, bx, 0.3f, bz), true)
            addStatic(torus, metal, M4.basis(m, 0.33f, 0f, 0f, 0f, 0.12f, 0f, 0f, 0f, 0.33f, bx, 0.62f, bz), true)
        }
        boxAt(10.2f, 0.4f, -3.3f, 0.8f, 0.8f, 0.8f, wood, true); boxAt(10.15f, 1.1f, -3.35f, 0.6f, 0.6f, 0.6f, wood, true)
        boxAt(11.1f, 0.35f, -3.0f, 0.7f, 0.7f, 0.7f, wood, true)
        addStatic(sphere, bag, M4.basis(m, 0.42f, 0f, 0f, 0f, 0.3f, 0f, 0f, 0f, 0.36f, 8.9f, 0.25f, -3.6f), true)
        addStatic(sphere, bag, M4.basis(m, 0.36f, 0f, 0f, 0f, 0.28f, 0f, 0f, 0f, 0.3f, 8.4f, 0.22f, -3.2f), true)
    }

    // ---------------------------------------------------------------- fighter rig
    private fun fEll(F: Frame, lx: Float, ly: Float, lz: Float, rx: Float, ry: Float, rz: Float, mt: Mat, fl: Float) {
        val m = add(M["sphere"]!!, mt, fl)
        M4.basis(m, F.a[0] * rx, F.a[1] * rx, F.a[2] * rx, F.b[0] * ry, F.b[1] * ry, F.b[2] * ry, F.c[0] * rz, F.c[1] * rz, F.c[2] * rz,
            F.o[0] + F.a[0] * lx + F.b[0] * ly + F.c[0] * lz, F.o[1] + F.a[1] * lx + F.b[1] * ly + F.c[1] * lz, F.o[2] + F.a[2] * lx + F.b[2] * ly + F.c[2] * lz)
    }

    private fun fSeg(F: Frame, mesh: Mesh, x0: Float, y0: Float, z0: Float, x1: Float, y1: Float, z1: Float, r: Float, mt: Mat, fl: Float) {
        segW(mesh,
            F.o[0] + F.a[0] * x0 + F.b[0] * y0 + F.c[0] * z0, F.o[1] + F.a[1] * x0 + F.b[1] * y0 + F.c[1] * z0, F.o[2] + F.a[2] * x0 + F.b[2] * y0 + F.c[2] * z0,
            F.o[0] + F.a[0] * x1 + F.b[0] * y1 + F.c[0] * z1, F.o[1] + F.a[1] * x1 + F.b[1] * y1 + F.c[1] * z1, F.o[2] + F.a[2] * x1 + F.b[2] * y1 + F.c[2] * z1,
            r * K, mt, fl)
    }

    private fun segW(mesh: Mesh, ox: Float, oy: Float, oz: Float, ex: Float, ey: Float, ez: Float, r: Float, mt: Mat, fl: Float) {
        val dx = ex - ox; val dy = ey - oy; val dz = ez - oz
        val l = len3(dx, dy, dz).let { if (it == 0f) 1e-5f else it }
        val ux = dx / l; val uy = dy / l; val uz = dz / l
        var px = uy; var py = -ux; var pz = 0f                          // u × (0,0,1)
        var pl = len3(px, py, pz)
        if (pl < 1e-3f) { px = 0f; py = uz; pz = -uy; pl = len3(px, py, pz) }   // u × (1,0,0)
        px /= pl; py /= pl; pz /= pl
        val qx = py * uz - pz * uy; val qy = pz * ux - px * uz; val qz = px * uy - py * ux
        val m = add(mesh, mt, fl)
        M4.basis(m, px * r, py * r, pz * r, dx, dy, dz, qx * r, qy * r, qz * r, ox, oy, oz)
    }

    private fun bone(mesh: Mesh, ax: Float, ay: Float, bx: Float, by: Float, z: Float, mt: Mat, fl: Float) {
        val x0 = wx(ax); val y0 = wy(ay); val x1 = wx(bx); val y1 = wy(by)
        var dx = x1 - x0; var dy = y1 - y0
        val l = hypot(dx, dy).let { if (it == 0f) 1e-5f else it }; dx /= l; dy /= l
        val s = l / mesh.len
        val m = add(mesh, mt, fl)
        M4.basis(m, dy, -dx, 0f, dx * s, dy * s, 0f, 0f, 0f, 1f, x0, y0, z * K)
    }

    private fun frame(F: Frame, ox: Float, oy: Float, oz: Float, ax: Float, ay: Float, az: Float, bx: Float, by: Float, bz: Float, cx: Float, cy: Float, cz: Float): Frame {
        F.o[0] = ox; F.o[1] = oy; F.o[2] = oz; F.a[0] = ax; F.a[1] = ay; F.a[2] = az
        F.b[0] = bx; F.b[1] = by; F.b[2] = bz; F.c[0] = cx; F.c[1] = cy; F.c[2] = cz
        return F
    }

    private val Ft = Frame(); private val Ff = Frame(); private val Fs = Frame(); private val Fa = Frame(); private val Fh = Frame()

    private val spikes = arrayOf(
        floatArrayOf(-1f, 5.2f, 0f, -0.3f, 1f, 0f, 5f, 2.3f), floatArrayOf(-3.6f, 4.2f, 1.6f, -0.8f, 0.6f, 0.3f, 5.5f, 2.1f),
        floatArrayOf(-3.6f, 4.2f, -1.6f, -0.8f, 0.6f, -0.3f, 5.5f, 2.1f), floatArrayOf(-5.2f, 1.6f, 0f, -1f, 0.15f, 0f, 5.2f, 2.3f),
        floatArrayOf(1.4f, 5.3f, 1.9f, 0.3f, 1f, 0.45f, 4.2f, 1.9f), floatArrayOf(1.4f, 5.3f, -1.9f, 0.3f, 1f, -0.45f, 4.2f, 1.9f),
        floatArrayOf(3.4f, 4.1f, 0.4f, 0.9f, 0.55f, 0.1f, 3.6f, 1.7f), floatArrayOf(-4.6f, -0.4f, 2.6f, -0.9f, -0.25f, 0.5f, 4.2f, 1.8f),
        floatArrayOf(-4.6f, -0.4f, -2.6f, -0.9f, -0.25f, -0.5f, 4.2f, 1.8f), floatArrayOf(-2.5f, 3.6f, 3.6f, -0.5f, 0.5f, 0.8f, 4f, 1.7f),
        floatArrayOf(-2.5f, 3.6f, -3.6f, -0.5f, 0.5f, -0.8f, 4f, 1.7f))

    private fun rigFighter(f: Snapshot.F) {
        val j = f.j; val fc = f.facing.toFloat(); val mei = f.mei; val A = mats[if (mei) 1 else 0]
        val fl = if (f.flash > 0 && f.flash % 2 == 1) 1f else 0f
        val start = nItems
        val hipX = j[0]; val hipY = j[1]; val shX = j[2]; val shY = j[3]; val headX = j[4]; val headY = j[5]
        // torso frame
        val hx = wx(hipX); val hy = wy(hipY); val sx = wx(shX); val sy = wy(shY)
        var ux = sx - hx; var uy = sy - hy
        val tl = hypot(ux, uy).let { if (it == 0f) 1e-5f else it }; ux /= tl; uy /= tl
        val a0x = fc * uy; val a0y = -fc * ux
        frame(Ft, hx, hy, 0f, a0x * K, a0y * K, 0f, ux * K, uy * K, 0f, 0f, 0f, fc * K)
        val depth = 0.62f
        val tm = add(M[if (mei) "torsoM" else "torsoR"]!!, A.top, fl)
        val ts = tl / (Dim.TORSO * K)
        M4.basis(tm, a0x * depth, a0y * depth, 0f, ux * ts, uy * ts, 0f, 0f, 0f, fc, hx, hy, 0f)
        val SZ = if (mei) 5.0f else 6.0f; val HZ = if (mei) 2.6f else 3.0f

        // legs (back, then front)
        for (side in 0..1) {
            val front = side == 1; val z = if (front) HZ else -HZ
            val kx = if (front) j[18] else j[22]; val ky = if (front) j[19] else j[23]
            val ftx = if (front) j[20] else j[24]; val fty = if (front) j[21] else j[25]
            if (!mei) {
                bone(M["thighR"]!!, hipX, hipY, kx, ky, z, A.pants, fl)
                bone(M["shinR"]!!, kx, ky, ftx, fty, z, A.pants, fl)
            } else {
                bone(M["thighM"]!!, hipX, hipY, kx, ky, z, A.skin, fl)
                bone(M["shortsM"]!!, hipX, hipY, hipX + (kx - hipX) * 0.5f, hipY + (ky - hipY) * 0.5f, z, A.pants, fl)
                bone(M["shinM"]!!, kx, ky, ftx, fty, z, A.skin, fl)
                bone(M["bootM"]!!, ftx, fty, ftx + (kx - ftx) * 0.62f, fty + (ky - fty) * 0.62f, z, A.foot, fl)
            }
            val gdx = ftx - kx; val gdy = fty - ky
            val gl = hypot(gdx, gdy).let { if (it == 0f) 1e-5f else it }
            val fwx = fc * gdy / gl; val fwy = fc * gdx / gl
            val upx = -gdx / gl; val upy = gdy / gl
            frame(Ff, wx(ftx), wy(fty), z * K, fwx * K, fwy * K, 0f, upx * K, upy * K, 0f, 0f, 0f, (fwx * upy - fwy * upx) * K)
            if (!mei) { fEll(Ff, 0f, 0.6f, 0f, 1.9f, 1.9f, 1.9f, A.skin, fl); fEll(Ff, 2.2f, -0.5f, 0f, 3.3f, 1.4f, 1.9f, A.skin, fl) }
            else fEll(Ff, 2.0f, -0.4f, 0f, 3.4f, 1.6f, 2.1f, A.foot, fl)
        }
        // pelvis / belt / skirt
        if (!mei) {
            fEll(Ft, 0f, 0.5f, 0f, 6.2f * depth, 4.6f, 6.4f, A.pants, fl)
            val rb = 6.35f
            val bm = add(M["torus"]!!, A.trim, fl)
            M4.basis(bm, Ft.a[0] * rb * depth, Ft.a[1] * rb * depth, 0f, Ft.b[0] * 1.15f / 0.16f, Ft.b[1] * 1.15f / 0.16f, 0f, 0f, 0f, Ft.c[2] * rb,
                hx + Ft.b[0] * 3.2f, hy + Ft.b[1] * 3.2f, 0f)
            fEll(Ft, rb * depth + 0.5f, 3.2f, 1.4f, 1.1f, 1.0f, 1.4f, A.trim, fl)
            fSeg(Ft, M["cyl"]!!, rb * depth + 0.6f, 2.8f, 1.0f, rb * depth + 1.6f, -4.0f, 2.2f, 0.55f, A.trim, fl)
            fSeg(Ft, M["cyl"]!!, rb * depth + 0.6f, 2.8f, 1.8f, rb * depth + 1.0f, -3.4f, 0.2f, 0.55f, A.trim, fl)
            fEll(Ft, 7.25f * depth - 0.2f, 15.2f, 0f, 0.9f, 4.0f, 2.2f, A.skin, fl)
        } else {
            fEll(Ft, 0f, 0.6f, 0f, 5.6f * depth, 4.2f, 5.8f, A.top, fl)
            val kmx = (j[18] + j[22]) / 2f; val kmy = (j[19] + j[23]) / 2f
            var dx = wx(kmx) - hx; var dy = wy(kmy) - hy
            val dl = hypot(dx, dy).let { if (it == 0f) 1e-5f else it }; dx /= dl; dy /= dl
            val len = dl * 0.82f; val rt = 5.6f * K
            val pxw = fc * dy; val pyw = -fc * dx
            val sk = add(M["frustum"]!!, A.topDark, fl)
            M4.basis(sk, pxw * rt * 0.72f, pyw * rt * 0.72f, 0f, dx * len, dy * len, 0f, 0f, 0f, fc * rt * 1.02f, hx, hy, 0f)
            val rh = rt * 1.3f
            val hm = add(M["torus"]!!, A.gold, fl)
            M4.basis(hm, pxw * rh * 0.72f, pyw * rh * 0.72f, 0f, dx * 0.6f * K / 0.16f, dy * 0.6f * K / 0.16f, 0f, 0f, 0f, fc * rh * 1.02f,
                hx + dx * len, hy + dy * len, 0f)
            fSeg(Ft, M["cyl"]!!, 0f, 18.6f, 0f, 0f, 22.4f, 0f, 2.7f, A.top, fl)
            val cm = add(M["torus"]!!, A.gold, fl)
            M4.basis(cm, Ft.a[0] * 2.75f, Ft.a[1] * 2.75f, 0f, Ft.b[0] * 0.35f / 0.16f, Ft.b[1] * 0.35f / 0.16f, 0f, 0f, 0f, Ft.c[2] * 2.75f,
                hx + Ft.b[0] * 22.4f, hy + Ft.b[1] * 22.4f, 0f)
            for (i in 0 until 3) fEll(Ft, 6.0f * depth - i * 0.25f + 0.15f, 17f - i * 2.6f, 1.2f + i * 1.3f, 0.65f, 0.65f, 0.65f, A.gold, fl)
            fSeg(Ft, M["cyl"]!!, 3.3f, 18.8f, -0.3f, 3.0f, 13.2f, 4.2f, 0.32f, A.gold, fl)
        }
        // arms (back, then front)
        for (side in 0..1) {
            val front = side == 1; val z = if (front) SZ else -SZ
            val ax = if (front) j[6] else j[8]; val ay = if (front) j[7] else j[9]
            val ex = if (front) j[10] else j[14]; val ey = if (front) j[11] else j[15]
            val hnx = if (front) j[12] else j[16]; val hny = if (front) j[13] else j[17]
            frame(Fs, wx(ax), wy(ay), z * K, K, 0f, 0f, 0f, K, 0f, 0f, 0f, K)
            var dx = wx(hnx) - wx(ex); var dy = wy(hny) - wy(ey)
            val dl = hypot(dx, dy).let { if (it == 0f) 1e-5f else it }; dx /= dl; dy /= dl
            frame(Fa, wx(hnx), wy(hny), z * K, dx * K, dy * K, 0f, -dy * K * fc, dx * K * fc, 0f, 0f, 0f, fc * K)
            if (!mei) {
                fEll(Fs, 0f, 0f, 0f, 4.1f, 4.1f, 4.1f, A.top, fl)
                bone(M["uaR"]!!, ax, ay, ex, ey, z, A.top, fl)
                bone(M["faR"]!!, ex, ey, hnx, hny, z, A.skin, fl)
                fSeg(Fa, M["cyl"]!!, -2.6f, 0f, 0f, -0.9f, 0f, 0f, 2.55f, A.glove, fl)
                fEll(Fa, 0.4f, 0f, 0f, 3.5f, 3.1f, 3.0f, A.glove, fl)
            } else {
                fEll(Fs, 0f, -0.2f, 0f, 2.9f, 2.9f, 2.9f, A.top, fl)
                bone(M["uaM"]!!, ax, ay, ex, ey, z, A.skin, fl)
                bone(M["faM"]!!, ex, ey, hnx, hny, z, A.skin, fl)
                fSeg(Fa, M["cyl"]!!, -3.4f, 0f, 0f, -0.8f, 0f, 0f, 2.05f, A.glove, fl)
                fSeg(Fa, M["cyl"]!!, -3.5f, 0f, 0f, -3.1f, 0f, 0f, 2.15f, A.gold, fl)
                fEll(Fa, 0.6f, 0f, 0f, 2.1f, 1.8f, 1.6f, A.skin, fl)
            }
        }
        // neck + head
        bone(M[if (mei) "neckM" else "neckR"]!!, shX, shY, headX, headY, 0f, A.skin, fl)
        val cx = wx(headX); val cy = wy(headY)
        var hux = cx - sx; var huy = cy - sy
        val hl = hypot(hux, huy).let { if (it == 0f) 1e-5f else it }; hux /= hl; huy /= hl
        var fx = fc * huy * 0.86f; var fy = -fc * hux * 0.86f; var fz = 0.46f
        val fln = len3(fx, fy, fz); fx /= fln; fy /= fln; fz /= fln
        val scx = -fz * huy; val scy = fz * hux; val scz = fx * huy - fy * hux
        frame(Fh, cx, cy, 0f, fx * K, fy * K, fz * K, hux * K, huy * K, 0f, scx * K, scy * K, scz * K)
        fEll(Fh, 0f, 0f, 0f, 5.3f, 5.7f, 5.1f, A.skin, fl)
        fEll(Fh, 1.8f, -3.0f, 0f, 3.3f, 2.7f, 3.7f, A.skin, fl)
        fEll(Fh, 5.35f, -0.5f, 0f, 0.95f, 1.15f, 0.8f, A.skin, fl)
        fEll(Fh, 0.2f, 0.2f, 5.0f, 1.0f, 1.5f, 0.7f, A.skin, fl)
        fEll(Fh, 0.2f, 0.2f, -5.0f, 1.0f, 1.5f, 0.7f, A.skin, fl)
        for (ez in floatArrayOf(2.05f, -2.05f)) {
            fEll(Fh, 4.75f, 0.7f, ez, 0.55f, 0.8f, 0.6f, A.eye, fl)
            fEll(Fh, 4.9f, 2.05f, ez, 0.5f, if (mei) 0.3f else 0.45f, if (mei) 1.2f else 1.45f, A.hair, fl)
        }
        fEll(Fh, 4.75f, -2.75f, 0f, 0.35f, if (mei) 0.38f else 0.28f, 1.15f, A.lips, fl)
        if (!mei) {
            fEll(Fh, -1.3f, 1.9f, 0f, 5.5f, 4.8f, 5.6f, A.hair, fl)
            for (sp in spikes) {
                val l = len3(sp[3], sp[4], sp[5])
                val dx = sp[3] / l; val dy = sp[4] / l; val dz = sp[5] / l
                val x1 = sp[0] + dx * sp[6]; val y1 = sp[1] + dy * sp[6]; val z1 = sp[2] + dz * sp[6]
                fSeg(Fh, M["cone"]!!, sp[0], sp[1], sp[2], x1, y1, z1, sp[7], A.hair, fl)
            }
        } else {
            fEll(Fh, -1.0f, 1.6f, 0f, 5.7f, 5.1f, 5.8f, A.hair, fl)
            fEll(Fh, -3.3f, 5.9f, 0f, 3.4f, 3.2f, 3.4f, A.hair, fl)
            fEll(Fh, 3.9f, 3.4f, 1.8f, 1.7f, 1.9f, 2.4f, A.hair, fl)
            fEll(Fh, 3.9f, 3.4f, -1.8f, 1.7f, 1.9f, 2.4f, A.hair, fl)
            fEll(Fh, 4.3f, 3.6f, 0f, 1.3f, 1.7f, 1.8f, A.hair, fl)
            fEll(Fh, 1.6f, -1.6f, 4.9f, 1.2f, 3.6f, 0.9f, A.hair, fl)
            fEll(Fh, 1.6f, -1.6f, -4.9f, 1.2f, 3.6f, 0.9f, A.hair, fl)
            fSeg(Fh, M["cyl"]!!, -6.8f, 4.4f, 1.2f, 0.4f, 8.0f, 1.2f, 0.42f, A.jade, fl)
            fEll(Fh, 0.6f, 8.1f, 1.2f, 0.95f, 0.95f, 0.95f, A.jade, fl)
            fEll(Fh, -0.8f, -3.8f, 4.7f, 0.6f, 0.6f, 0.6f, A.gold, fl)
        }
        // whole-body fall rotation around the feet (knockdown / KO)
        if (f.rot != 0f) {
            val th = rad(f.rot) * fc; val c = cos(th); val sn = sin(th)
            val pvx = wx(f.x); val pvy = wy(f.y); val lift = 3f * sin(rad(f.rot)) * K
            M4.basis(root, c, sn, 0f, -sn, c, 0f, 0f, 0f, 1f, pvx - c * pvx + sn * pvy, pvy - sn * pvx - c * pvy + lift, 0f)
            for (i in start until nItems) { val it = items[i]; System.arraycopy(it.m, 0, tmp, 0, 16); M4.mul(it.m, root, tmp) }
        }
    }

    // ---------------------------------------------------------------- frame
    private val kd = floatArrayOf(-0.36f, 0.84f, 0.42f).let { val l = len3(it[0], it[1], it[2]); floatArrayOf(it[0] / l, it[1] / l, it[2] / l) }
    private val rd = floatArrayOf(0.55f, 0.32f, -0.77f).let { val l = len3(it[0], it[1], it[2]); floatArrayOf(it[0] / l, it[1] / l, it[2] / l) }
    private val noLight = floatArrayOf(0f, -50f, 0f, 0.001f, 0f, 0f, 0f)
    private val rnd = java.util.Random()
    private val TEX_DISC = 0; private val TEX_GLOW = 1; private val TEX_STAR = 2

    private fun render() {
        nItems = 0; nSpr = 0
        val t = v.frame.toFloat()
        var shx = 0f; var shy = 0f
        if (v.shake > 0f) { shx = (rnd.nextFloat() - 0.5f) * 2f * v.shake * K * 0.7f; shy = (rnd.nextFloat() - 0.5f) * 2f * v.shake * K * 0.7f }
        val camX = v.camX + shx; val camY = v.camY + shy; val camZ = v.camZ
        M4.persp(proj, rad(30f), width.toFloat() / height, 0.1f, 200f)
        M4.lookAt(view, camX, camY, camZ, v.camTX + shx, v.camTY + shy, 0f, 0f, 1f, 0f)
        M4.mul(vp, proj, view)
        val lcx = v.camTX
        M4.lookAt(tmp, lcx + kd[0] * 25f, 1f + kd[1] * 25f, kd[2] * 25f, lcx, 1f, 0f, 0f, 1f, 0f)
        M4.ortho(tmp2, -11f, 11f, -8f, 8f, 1f, 60f)
        M4.mul(lvp, tmp2, tmp)

        // dynamic items
        rigFighter(v.f[0]); rigFighter(v.f[1])
        var projLight: FloatArray? = null
        for (i in 0 until v.nProj) {
            val prx = v.proj[i * 4]; val pry = v.proj[i * 4 + 1]; val pvx = v.proj[i * 4 + 2]; val anim = v.proj[i * 4 + 3]
            val wob = sin(anim * 0.6f)
            val px = wx(prx); val py = wy(pry); val r = (6f + wob) * K
            val m = add(M["sphere"]!!, projMat, 0f, false)
            M4.basis(m, r, 0f, 0f, 0f, r, 0f, 0f, 0f, r, px, py, 0.1f)
            sprite(px, py, 0.15f, 0.95f + wob * 0.06f, 0.35f, 0.6f, 1f, 0.75f, TEX_GLOW, true)
            sprite(px, py, 0.2f, 0.42f, 0.85f, 0.95f, 1f, 0.9f, TEX_GLOW, true)
            for (k in 1..4) sprite(px - pvx * K * 2.4f * k, py + sin((anim + k * 3) * 0.7f) * 1.5f * K, 0.1f, 0.5f - k * 0.08f, 0.25f, 0.45f, 1f, 0.5f - k * 0.09f, TEX_GLOW, true)
            sprite(px, py, 0.25f, 0.7f, 0.8f, 0.9f, 1f, 0.55f, TEX_STAR, true, false, anim * 0.15f)
            projLight = floatArrayOf(px, py, 0.6f, 4.5f, 0.6f, 1.2f, 3.2f)
        }
        for (i in 0 until 5) {
            val L = if (i < 4) (stageLights.getOrNull(i) ?: noLight) else (projLight ?: noLight)
            val flick = if (i == 2 || i == 3) 0.85f + 0.15f * sin(t * 0.21f + i * 2) else 1f
            plPos[i * 4] = L[0]; plPos[i * 4 + 1] = L[1]; plPos[i * 4 + 2] = L[2]; plPos[i * 4 + 3] = L[3]
            plCol[i * 3] = L[4] * flick; plCol[i * 3 + 1] = L[5] * flick; plCol[i * 3 + 2] = L[6] * flick
        }
        // contact shadows + effects
        for (i in 0..1) {
            val f = v.f[i]
            val air = (G.FLOOR - f.y).coerceIn(0f, 80f); val lying = f.rot > 45f
            val cxs = if (lying) f.x - f.facing * 22f else f.x
            sprite(wx(cxs), 0.012f, 0f, (if (lying) 1.0f else 0.62f) * (1f - air / 160f), 0f, 0f, 0f, 0.5f, TEX_DISC, false, true)
        }
        for (i in 0 until v.nBurst) {
            val bt = v.burst[i * 4 + 2]; val block = v.burst[i * 4 + 3] > 0.5f
            val sz = (4f + bt * 2.2f) * K * 2.4f; val x = wx(v.burst[i * 4]); val y = wy(v.burst[i * 4 + 1])
            if (block) {
                sprite(x, y, 0.4f, sz, 0.55f, 0.88f, 1f, 0.95f, TEX_STAR, true, false, 0.4f)
                sprite(x, y, 0.38f, sz * 1.4f, 0.3f, 0.6f, 1f, 0.5f, TEX_GLOW, true)
            } else {
                val wht = bt < 3f
                sprite(x, y, 0.4f, sz, 1f, if (wht) 1f else 0.88f, if (wht) 1f else 0.3f, 1f, TEX_STAR, true, false, 0.39f)
                sprite(x, y, 0.38f, sz * 1.6f, 1f, 0.6f, 0.2f, 0.6f, TEX_GLOW, true)
            }
        }
        for (i in 0 until v.nPart) {
            val o = i * 6; val c = v.partCol[i]
            val a = (v.part[o + 4] / 12f).coerceIn(0f, 1f)
            val dust = v.part[o + 5] < 0.05f
            sprite(wx(v.part[o]), wy(v.part[o + 1]), v.part[o + 2], v.part[o + 3] * K * (if (dust) 3.2f else 1.6f),
                ((c shr 16) and 255) / 255f, ((c shr 8) and 255) / 255f, (c and 255) / 255f, if (dust) a * 0.5f else a,
                if (dust) TEX_DISC else TEX_GLOW, !dust)
        }
        for (s in stageSprites) sprite(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7] * (0.9f + 0.1f * sin(t * 0.05f + s[0])), TEX_GLOW, true)

        // shadow pass
        glBindFramebuffer(GL_FRAMEBUFFER, shFbo)
        glViewport(0, 0, SHADOW, SHADOW)
        glEnable(GL_DEPTH_TEST); glDepthMask(true); glClear(GL_DEPTH_BUFFER_BIT)
        glEnable(GL_POLYGON_OFFSET_FILL); glPolygonOffset(1.5f, 3f)
        glUseProgram(pDepth); glUniformMatrix4fv(udLVP, 1, false, lvp, 0)
        for (it in staticItems) drawDepth(it)
        for (i in 0 until nItems) drawDepth(items[i])
        glDisable(GL_POLYGON_OFFSET_FILL)

        // main pass
        glBindFramebuffer(GL_FRAMEBUFFER, 0)
        glViewport(0, 0, width, height)
        glClearColor(0.10f, 0.05f, 0.12f, 1f); glClear(GL_COLOR_BUFFER_BIT or GL_DEPTH_BUFFER_BIT)
        glDisable(GL_CULL_FACE)
        glUseProgram(pLit)
        glUniformMatrix4fv(u["uVP"]!!, 1, false, vp, 0); glUniformMatrix4fv(u["uLVP"]!!, 1, false, lvp, 0)
        glUniform3f(u["uCam"]!!, camX, camY, camZ)
        glUniform3f(u["uKeyDir"]!!, kd[0], kd[1], kd[2]); glUniform3f(u["uKeyCol"]!!, 1.35f, 1.16f, 1.02f)
        glUniform3f(u["uRimDir"]!!, rd[0], rd[1], rd[2]); glUniform3f(u["uRimCol"]!!, 1.25f, 0.52f, 0.3f)
        glUniform3f(u["uSky"]!!, 0.2f, 0.13f, 0.32f); glUniform3f(u["uGnd"]!!, 0.08f, 0.05f, 0.05f)
        glUniform4fv(u["uPL"]!!, 5, plPos, 0); glUniform3fv(u["uPC"]!!, 5, plCol, 0)
        glUniform3f(u["uFog"]!!, 0.17f, 0.065f, 0.14f); glUniform1f(u["uFogD"]!!, 0.02f); glUniform1f(u["uExpo"]!!, 0.95f)
        glUniform1f(u["uTexel"]!!, 1f / SHADOW)
        glActiveTexture(GL_TEXTURE2); glBindTexture(GL_TEXTURE_2D, shTex); glUniform1i(u["uShadow"]!!, 2)
        glUniform1i(u["uTex"]!!, 0); glUniform1i(u["uTex2"]!!, 1)
        lastMat = null
        glDepthMask(false); draw(staticItems[0]); glDepthMask(true)   // sky backdrop
        for (i in 1 until staticItems.size) draw(staticItems[i])
        for (i in 0 until nItems) draw(items[i])

        drawSprites()
        glBindVertexArray(0)
    }

    private fun drawDepth(it: Item) {
        if (!it.cast) return
        val mesh = it.mesh ?: return
        glUniformMatrix4fv(udModel, 1, false, it.m, 0)
        glBindVertexArray(mesh.vao); glDrawElements(GL_TRIANGLES, mesh.count, GL_UNSIGNED_SHORT, 0)
    }

    private var lastMat: Mat? = null
    private fun draw(it: Item) {
        val mt = it.mat ?: return; val mesh = it.mesh ?: return
        if (mt !== lastMat) {
            lastMat = mt
            glUniform3fv(u["uCol"]!!, 1, mt.col, 0); glUniform1f(u["uRough"]!!, mt.rough); glUniform1f(u["uMetal"]!!, mt.metal)
            glUniform3fv(u["uEmis"]!!, 1, mt.emis, 0); glUniform1i(u["uTexMode"]!!, mt.texMode); glUniform4fv(u["uUvXf"]!!, 1, mt.uv, 0)
            if (mt.tex != 0) { glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D, mt.tex) }
            if (mt.tex2 != 0) { glActiveTexture(GL_TEXTURE1); glBindTexture(GL_TEXTURE_2D, mt.tex2) }
        }
        glUniform1f(u["uFlash"]!!, it.flash * 0.75f)
        glUniformMatrix4fv(u["uModel"]!!, 1, false, it.m, 0)
        glUniformMatrix3fv(u["uNrm"]!!, 1, false, M4.normal(nrm, it.m), 0)
        glBindVertexArray(mesh.vao); glDrawElements(GL_TRIANGLES, mesh.count, GL_UNSIGNED_SHORT, 0)
    }

    private val corners = arrayOf(
        floatArrayOf(-1f, -1f, 0f, 0f), floatArrayOf(1f, -1f, 1f, 0f), floatArrayOf(1f, 1f, 1f, 1f),
        floatArrayOf(-1f, -1f, 0f, 0f), floatArrayOf(1f, 1f, 1f, 1f), floatArrayOf(-1f, 1f, 0f, 1f))
    private val groups = arrayOf(TEX_DISC to false, TEX_GLOW to true, TEX_STAR to true, TEX_DISC to true)

    private fun upload(n: Int) {
        sprBuf.position(0); sprBuf.put(sprArr, 0, n * 9); sprBuf.position(0)
        glBufferSubData(GL_ARRAY_BUFFER, 0, n * 9 * 4, sprBuf)
    }

    private fun drawSprites() {
        val rx = view[0]; val ry = view[4]; val rz = view[8]; val ux = view[1]; val uy = view[5]; val uz = view[9]
        glUseProgram(pSpr); glUniformMatrix4fv(usVP, 1, false, vp, 0); glUniform1i(usTex, 0)
        glEnable(GL_BLEND); glDepthMask(false)
        glBindVertexArray(sprVao); glBindBuffer(GL_ARRAY_BUFFER, sprVbo)
        val texIds = intArrayOf(T["disc"]!!, T["glow"]!!, T["star"]!!)
        val B = sprArr
        for ((tex, add) in groups) {
            var n = 0
            for (i in 0 until nSpr) {
                if (n >= MAX_SPR * 6) break
                val s = spr[i]; if (s.tex != tex || s.add != add) continue
                val ax: Float; val ay: Float; val az: Float; val bx: Float; val by: Float; val bz: Float
                if (s.ground) { ax = s.size; ay = 0f; az = 0f; bx = 0f; by = 0f; bz = -s.size * 0.35f }
                else {
                    val c = cos(s.rot) * s.size; val sn = sin(s.rot) * s.size
                    ax = rx * c + ux * sn; ay = ry * c + uy * sn; az = rz * c + uz * sn
                    bx = -rx * sn + ux * c; by = -ry * sn + uy * c; bz = -rz * sn + uz * c
                }
                for (cn in corners) {
                    val o = n * 9; n++
                    B[o] = s.x + ax * cn[0] + bx * cn[1]; B[o + 1] = s.y + ay * cn[0] + by * cn[1]; B[o + 2] = s.z + az * cn[0] + bz * cn[1]
                    B[o + 3] = cn[2]; B[o + 4] = cn[3]; B[o + 5] = s.r; B[o + 6] = s.g; B[o + 7] = s.b; B[o + 8] = s.a
                }
            }
            if (n == 0) continue
            glBlendFunc(GL_SRC_ALPHA, if (add) GL_ONE else GL_ONE_MINUS_SRC_ALPHA)
            glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D, texIds[tex])
            upload(n)
            glDrawArrays(GL_TRIANGLES, 0, n)
        }
        // vignette in screen space
        glDisable(GL_DEPTH_TEST)
        M4.ident(tmp); glUniformMatrix4fv(usVP, 1, false, tmp, 0)
        var o = 0
        for (cn in corners) {
            B[o] = cn[0]; B[o + 1] = cn[1]; B[o + 2] = 0f; B[o + 3] = cn[2]; B[o + 4] = cn[3]
            B[o + 5] = 0.03f; B[o + 6] = 0f; B[o + 7] = 0.05f; B[o + 8] = 1f; o += 9
        }
        upload(6)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
        glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D, T["vig"]!!)
        glDrawArrays(GL_TRIANGLES, 0, 6)
        glEnable(GL_DEPTH_TEST); glDepthMask(true); glDisable(GL_BLEND)
    }

    companion object {
        /** EGL config: RGBA8888 + 24-bit depth + 4x MSAA, falling back to no MSAA, then 16-bit depth. */
        val configChooser = GLSurfaceView.EGLConfigChooser { egl, display -> chooseConfig(egl, display) }

        private fun chooseConfig(egl: EGL10, display: EGLDisplay): EGLConfig {
            val ES3 = 0x40   // EGL_OPENGL_ES3_BIT_KHR
            val attempts = arrayOf(
                intArrayOf(EGL10.EGL_RED_SIZE, 8, EGL10.EGL_GREEN_SIZE, 8, EGL10.EGL_BLUE_SIZE, 8, EGL10.EGL_DEPTH_SIZE, 24,
                    EGL10.EGL_RENDERABLE_TYPE, ES3, EGL10.EGL_SAMPLE_BUFFERS, 1, EGL10.EGL_SAMPLES, 4, EGL10.EGL_NONE),
                intArrayOf(EGL10.EGL_RED_SIZE, 8, EGL10.EGL_GREEN_SIZE, 8, EGL10.EGL_BLUE_SIZE, 8, EGL10.EGL_DEPTH_SIZE, 24,
                    EGL10.EGL_RENDERABLE_TYPE, ES3, EGL10.EGL_NONE),
                intArrayOf(EGL10.EGL_RED_SIZE, 8, EGL10.EGL_GREEN_SIZE, 8, EGL10.EGL_BLUE_SIZE, 8, EGL10.EGL_DEPTH_SIZE, 16,
                    EGL10.EGL_RENDERABLE_TYPE, ES3, EGL10.EGL_NONE))
            for (a in attempts) {
                val out = arrayOfNulls<EGLConfig>(1); val num = IntArray(1)
                if (egl.eglChooseConfig(display, a, out, 1, num) && num[0] > 0 && out[0] != null) return out[0]!!
            }
            throw IllegalStateException("No OpenGL ES 3 config available")
        }

        // ---- shaders: identical GLSL ES 3.00 source to docs/play/render3d.js
        const val VS_LIT = """#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec2 aUv;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat3 uNrm;
uniform mat4 uLVP;
out vec3 vPos;
out vec3 vNor;
out vec2 vUv;
out vec4 vLs;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vPos = w.xyz; vNor = uNrm * aNor; vUv = aUv; vLs = uLVP * w;
  gl_Position = uVP * w;
}"""

        const val FS_LIT = """#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vPos;
in vec3 vNor;
in vec2 vUv;
in vec4 vLs;
uniform vec3 uCol;
uniform float uRough;
uniform float uMetal;
uniform vec3 uEmis;
uniform sampler2D uTex;
uniform sampler2D uTex2;
uniform int uTexMode;
uniform vec4 uUvXf;
uniform float uFlash;
uniform vec3 uCam;
uniform vec3 uKeyDir;
uniform vec3 uKeyCol;
uniform vec3 uRimDir;
uniform vec3 uRimCol;
uniform vec3 uSky;
uniform vec3 uGnd;
uniform vec4 uPL[5];
uniform vec3 uPC[5];
uniform sampler2DShadow uShadow;
uniform float uTexel;
uniform vec3 uFog;
uniform float uFogD;
uniform float uExpo;
out vec4 oCol;
float shadowAt() {
  vec3 p = vLs.xyz / vLs.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
    s += texture(uShadow, vec3(p.xy + vec2(float(i), float(j)) * uTexel, p.z - 0.0012));
  return s / 9.0;
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 uv = vUv * uUvXf.xy + uUvXf.zw;
  if (uTexMode == 3) { oCol = vec4(texture(uTex, uv).rgb * uCol, 1.0); return; }
  vec3 N = normalize(vNor);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vPos);
  vec3 alb = uCol;
  vec3 emis = uEmis;
  if (uTexMode == 1 || uTexMode == 2) alb *= pow(texture(uTex, uv).rgb, vec3(2.2));
  if (uTexMode == 2) emis += pow(texture(uTex2, uv).rgb, vec3(2.2)) * 2.6;
  if (uTexMode == 4) emis += pow(texture(uTex, uv).rgb, vec3(2.2)) * 3.2;
  float shin = mix(96.0, 6.0, uRough);
  float norm = (shin + 8.0) / 25.0;
  vec3 spec0 = mix(vec3(0.04), alb, uMetal);
  vec3 dif = alb * (1.0 - uMetal);
  float nl = max(dot(N, uKeyDir), 0.0);
  vec3 H = normalize(uKeyDir + V);
  vec3 col = (dif + spec0 * pow(max(dot(N, H), 0.0), shin) * norm) * nl * uKeyCol * shadowAt();
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float rimW = max(dot(N, uRimDir) * 0.6 + 0.4, 0.0);
  col += uRimCol * (dif * max(dot(N, uRimDir), 0.0) + fres * rimW * (0.25 + (1.0 - uRough) * 0.7));
  col += dif * mix(uGnd, uSky, N.y * 0.5 + 0.5);
  for (int i = 0; i < 5; i++) {
    vec3 d = uPL[i].xyz - vPos;
    float dist = length(d);
    float a = clamp(1.0 - dist / max(uPL[i].w, 0.001), 0.0, 1.0);
    if (a > 0.0) {
      a *= a;
      vec3 l = d / dist;
      float n2 = max(dot(N, l), 0.0);
      vec3 h2 = normalize(l + V);
      col += uPC[i] * a * n2 * (dif + spec0 * pow(max(dot(N, h2), 0.0), shin) * norm);
    }
  }
  col += emis;
  col = mix(col, vec3(4.0, 4.0, 3.6), uFlash);
  float fd = length(vPos - uCam);
  float f = 1.0 - exp(-uFogD * uFogD * fd * fd);
  col = mix(col, uFog, clamp(f, 0.0, 1.0));
  col = aces(col * uExpo);
  oCol = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}"""

        const val VS_DEPTH = """#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uLVP;
uniform mat4 uModel;
void main() { gl_Position = uLVP * uModel * vec4(aPos, 1.0); }"""

        const val FS_DEPTH = """#version 300 es
precision mediump float;
out vec4 oCol;
void main() { oCol = vec4(1.0); }"""

        const val VS_SPR = """#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUv;
layout(location=2) in vec4 aCol;
uniform mat4 uVP;
out vec2 vUv;
out vec4 vCol;
void main() { vUv = aUv; vCol = aCol; gl_Position = uVP * vec4(aPos, 1.0); }"""

        const val FS_SPR = """#version 300 es
precision mediump float;
in vec2 vUv;
in vec4 vCol;
uniform sampler2D uTex;
out vec4 oCol;
void main() { oCol = vec4(vCol.rgb, vCol.a * texture(uTex, vUv).a); }"""
    }
}

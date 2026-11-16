package com.example.myapplication20261102streetfighter.game

import android.opengl.GLSurfaceView
import android.os.Bundle
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.activity.ComponentActivity

/** Launcher activity for Street Fight 3D: an OpenGL ES 3 scene with the game/HUD view layered on top. */
class FightActivity : ComponentActivity() {
    private lateinit var game: GameView
    private lateinit var glView: GLSurfaceView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val renderer = Renderer3D()
        glView = GLSurfaceView(this).apply {
            setEGLContextClientVersion(3)
            setEGLConfigChooser(Renderer3D.configChooser)
            preserveEGLContextOnPause = true
            setRenderer(renderer)
            renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY
        }
        game = GameView(this, renderer) { glView.requestRender() }
        val root = FrameLayout(this)
        val fill = ViewGroup.LayoutParams.MATCH_PARENT
        root.addView(glView, FrameLayout.LayoutParams(fill, fill))
        root.addView(game, FrameLayout.LayoutParams(fill, fill))
        setContentView(root)
        hideBars()
    }

    private fun hideBars() {
        window.insetsController?.let {
            it.hide(WindowInsets.Type.systemBars())
            it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    override fun onResume() {
        super.onResume()
        hideBars()
        glView.onResume()
        game.requestFocus()
        game.resume()
    }

    override fun onPause() {
        game.pause()
        glView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        game.release()
        super.onDestroy()
    }
}

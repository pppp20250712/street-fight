package com.example.myapplication20261102streetfighter.game

import android.os.Bundle
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.activity.ComponentActivity

/** Launcher activity for the Street Fight game. */
class FightActivity : ComponentActivity() {
    private lateinit var game: GameView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        game = GameView(this)
        setContentView(game)
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
        game.requestFocus()
        game.resume()
    }

    override fun onPause() {
        game.pause()
        super.onPause()
    }

    override fun onDestroy() {
        game.release()
        super.onDestroy()
    }
}

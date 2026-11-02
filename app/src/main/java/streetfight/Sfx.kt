package com.example.myapplication20261102streetfighter.game

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

/** Retro sound effects synthesized at startup (no audio files needed). */
class Sfx(private val ctx: Context) {
    private val pool: SoundPool = SoundPool.Builder()
        .setMaxStreams(10)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        ).build()
    private val ids = HashMap<String, Int>()
    private val rate = 22050
    private val rnd = java.util.Random(7)

    init {
        try {
            add("hit", hit(0.13f, 1f))
            add("heavy", hit(0.22f, 0.6f))
            add("thud", hit(0.16f, 0.3f))
            add("block", block())
            add("whoosh", whoosh())
            add("special", special())
            add("ko", ko())
            add("bell", tone(0.6f, 660f, 4f))
            add("fight", jingle())
            add("select", tone(0.09f, 990f, 25f))
        } catch (e: Exception) {
            // sound is optional
        }
    }

    fun play(name: String, vol: Float = 1f, speed: Float = 1f) {
        val id = ids[name] ?: return
        pool.play(id, vol, vol, 1, 0, speed.coerceIn(0.5f, 2f))
    }

    fun release() = pool.release()

    private fun add(name: String, data: ShortArray) {
        val f = File(ctx.cacheDir, "sfx_$name.wav")
        writeWav(f, data)
        ids[name] = pool.load(f.path, 1)
    }

    private fun n(sec: Float) = (sec * rate).toInt()
    private fun noise() = rnd.nextFloat() * 2f - 1f
    private fun clip(v: Float): Short = (v.coerceIn(-1f, 1f) * 32000f).toInt().toShort()

    private fun hit(dur: Float, bright: Float): ShortArray {
        val out = ShortArray(n(dur)); var lp = 0f; var ph = 0f
        for (i in out.indices) {
            val t = i / rate.toFloat()
            val env = exp(-t * 3.2f / dur)
            lp += (noise() - lp) * (0.15f + bright * 0.5f)
            ph += (2f * PI.toFloat() * (120f - 70f * t / dur)) / rate
            out[i] = clip((lp * 0.8f + sin(ph) * 0.7f) * env)
        }
        return out
    }

    private fun block(): ShortArray {
        val out = ShortArray(n(0.08f))
        for (i in out.indices) {
            val t = i / rate.toFloat()
            out[i] = clip(sin(2f * PI.toFloat() * 1700f * t) * exp(-t * 55f) * 0.5f + noise() * exp(-t * 90f) * 0.4f)
        }
        return out
    }

    private fun whoosh(): ShortArray {
        val dur = 0.15f
        val out = ShortArray(n(dur)); var lp = 0f
        for (i in out.indices) {
            val t = i / rate.toFloat()
            val cut = 0.05f + 0.25f * (t / dur)
            lp += (noise() - lp) * cut
            out[i] = clip(lp * sin(PI.toFloat() * t / dur) * 0.9f)
        }
        return out
    }

    private fun special(): ShortArray {
        val dur = 0.4f
        val out = ShortArray(n(dur)); var ph = 0f
        for (i in out.indices) {
            val t = i / rate.toFloat()
            ph += 2f * PI.toFloat() * (220f + 700f * t / dur) / rate
            val sq = if (sin(ph) > 0f) 1f else -1f
            out[i] = clip((sq * 0.25f + noise() * 0.08f) * (1f - t / dur))
        }
        return out
    }

    private fun ko(): ShortArray {
        val dur = 0.9f
        val out = ShortArray(n(dur)); var ph = 0f; var lp = 0f
        for (i in out.indices) {
            val t = i / rate.toFloat()
            ph += 2f * PI.toFloat() * (140f - 100f * t / dur) / rate
            lp += (noise() - lp) * 0.08f
            out[i] = clip((sin(ph) * 0.8f + lp * 0.9f) * exp(-t * 3f))
        }
        return out
    }

    private fun tone(dur: Float, f: Float, decay: Float): ShortArray {
        val out = ShortArray(n(dur))
        for (i in out.indices) {
            val t = i / rate.toFloat()
            val w = 2f * PI.toFloat() * f * t
            out[i] = clip((sin(w) * 0.5f + sin(w * 2.01f) * 0.2f + sin(w * 3.02f) * 0.1f) * exp(-t * decay))
        }
        return out
    }

    private fun jingle(): ShortArray {
        val notes = floatArrayOf(523f, 659f, 784f, 1046f)
        val each = n(0.08f)
        val out = ShortArray(each * notes.size + n(0.2f))
        for (i in out.indices) {
            val k = (i / each).coerceAtMost(notes.size - 1)
            val t = i / rate.toFloat()
            val local = (i - k * each) / rate.toFloat()
            val sq = if (sin(2f * PI.toFloat() * notes[k] * t) > 0f) 1f else -1f
            out[i] = clip(sq * 0.22f * exp(-local * (if (k == notes.size - 1) 6f else 12f)))
        }
        return out
    }

    private fun writeWav(f: File, data: ShortArray) {
        val bb = ByteBuffer.allocate(44 + data.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        bb.put("RIFF".toByteArray()); bb.putInt(36 + data.size * 2); bb.put("WAVE".toByteArray())
        bb.put("fmt ".toByteArray()); bb.putInt(16); bb.putShort(1); bb.putShort(1)
        bb.putInt(rate); bb.putInt(rate * 2); bb.putShort(2); bb.putShort(16)
        bb.put("data".toByteArray()); bb.putInt(data.size * 2)
        for (s in data) bb.putShort(s)
        f.writeBytes(bb.array())
    }
}

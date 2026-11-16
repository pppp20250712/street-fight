/**
 * Street Fight: Hyper Clash - Arcade Audio Synthesizer
 * Built with Web Audio API + SpeechSynthesis for announcer voice
 */
class FightAudio {
    constructor() {
        this.ctx = null;
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.masterVolume = 0.85;
        this.bgmPlaying = false;
        this.bgmInterval = null;
        this.bgmStep = 0;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            this.bgmGain.connect(this.masterGain);

            this.isInitialized = true;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        } catch (e) {
            console.warn("Web Audio not supported:", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    createNoiseBuffer(duration = 0.2) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Whoosh / Swing sound (for punch/kick misses)
    playWhoosh() {
        if (!this.soundEnabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        noise.buffer = this.createNoiseBuffer(0.18);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.linearRampToValueAtTime(1200, t + 0.08);
        filter.frequency.linearRampToValueAtTime(300, t + 0.18);
        filter.Q.value = 3.0;

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.18);
    }

    // Light Hit (Crisp slap / jab impact)
    playLightHit() {
        if (!this.soundEnabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.09);

        // Crack noise
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const nGain = this.ctx.createGain();
        noise.buffer = this.createNoiseBuffer(0.08);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1800, t);
        nGain.gain.setValueAtTime(0.4, t);
        nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.08);
    }

    // Heavy Hit (Deep bone-crushing impact)
    playHeavyHit() {
        if (!this.soundEnabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;

        // Sub bass thump
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);

        gain.gain.setValueAtTime(0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.28);

        // Heavy crunch noise
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const nGain = this.ctx.createGain();
        noise.buffer = this.createNoiseBuffer(0.2);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(150, t + 0.2);
        nGain.gain.setValueAtTime(0.7, t);
        nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.2);
    }

    // Block Sound (Metallic guard thud)
    playBlock() {
        if (!this.soundEnabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.07);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.07);
    }

    // Special Move: Hadouken Fireball Blast
    playHadouken() {
        if (!this.soundEnabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;

        // Energy charge swoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.35);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);

        // Electric noise sizzle
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const nGain = this.ctx.createGain();
        noise.buffer = this.createNoiseBuffer(0.35);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2500, t);
        filter.Q.value = 5.0;
        nGain.gain.setValueAtTime(0.4, t);
        nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.35);
    }

    // Special Move: Shoryuken Dragon Uppercut
    playShoryuken() {
        if (!this.soundEnabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(750, t + 0.25);

        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.25);
    }

    // Super Combo Flash
    playSuperFlash() {
        if (!this.soundEnabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;

        // Blinding glass shatter / energy flare
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.4);

        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.4);
    }

    // Arcade Announcer (using Web Speech API or vocal synth)
    speak(phrase) {
        if (!this.soundEnabled) return;
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(phrase);
                u.rate = 1.05;
                u.pitch = 0.85; // Deep arcade voice
                u.volume = 1.0;
                window.speechSynthesis.speak(u);
            } catch (e) {}
        }
    }

    // Fighting Game BGM (Arcade Rock/Techno Battle Theme)
    startBGM() {
        if (!this.musicEnabled || this.bgmPlaying || !this.ctx) return;
        this.bgmPlaying = true;
        this.bgmStep = 0;
        const tempo = 142; // Fast BPM
        const stepTime = (60 / tempo / 4) * 1000;

        // Driving Bass Riff (E minor arcade progression: E - G - A - C - B)
        const bassNotes = [
            82.41, 82.41, 164.81, 82.41,  82.41, 82.41, 164.81, 82.41,
            98.00, 98.00, 196.00, 98.00,  110.00, 110.00, 123.47, 123.47,
            82.41, 82.41, 164.81, 82.41,  82.41, 82.41, 164.81, 82.41,
            130.81, 130.81, 123.47, 123.47, 98.00, 98.00, 82.41, 82.41
        ];

        // Lead synth melody
        const leadNotes = [
            329.63, 0, 329.63, 392.00, 440.00, 0, 392.00, 0,
            329.63, 0, 293.66, 0, 329.63, 0, 0, 0,
            392.00, 0, 440.00, 0, 493.88, 0, 523.25, 0,
            493.88, 0, 440.00, 0, 392.00, 0, 0, 0
        ];

        this.bgmInterval = setInterval(() => {
            if (!this.musicEnabled || !this.ctx) return;
            const t = this.ctx.currentTime;
            const step = this.bgmStep % 32;

            // Bass note
            const bFreq = bassNotes[step];
            if (bFreq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(bFreq, t);

                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

                osc.connect(gain);
                gain.connect(this.bgmGain);
                osc.start(t);
                osc.stop(t + 0.11);
            }

            // Lead Synth
            const lFreq = leadNotes[step];
            if (lFreq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(lFreq, t);

                gain.gain.setValueAtTime(0.14, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

                osc.connect(gain);
                gain.connect(this.bgmGain);
                osc.start(t);
                osc.stop(t + 0.16);
            }

            // Kick & Snare rhythm
            if (step % 4 === 0) {
                // Kick Drum
                const kick = this.ctx.createOscillator();
                const kGain = this.ctx.createGain();
                kick.type = 'sine';
                kick.frequency.setValueAtTime(130, t);
                kick.frequency.exponentialRampToValueAtTime(30, t + 0.12);
                kGain.gain.setValueAtTime(0.4, t);
                kGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                kick.connect(kGain);
                kGain.connect(this.bgmGain);
                kick.start(t);
                kick.stop(t + 0.12);
            } else if (step % 4 === 2) {
                // Snare Drum
                const snare = this.ctx.createBufferSource();
                const sFilter = this.ctx.createBiquadFilter();
                const sGain = this.ctx.createGain();
                snare.buffer = this.createNoiseBuffer(0.12);
                sFilter.type = 'bandpass';
                sFilter.frequency.setValueAtTime(1400, t);
                sGain.gain.setValueAtTime(0.2, t);
                sGain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);
                snare.connect(sFilter);
                sFilter.connect(sGain);
                sGain.connect(this.bgmGain);
                snare.start(t);
                snare.stop(t + 0.11);
            }

            this.bgmStep++;
        }, stepTime);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.bgmPlaying = false;
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) this.stopBGM();
        else this.startBGM();
        return this.musicEnabled;
    }
}

window.fightAudio = new FightAudio();

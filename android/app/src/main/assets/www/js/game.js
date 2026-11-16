/**
 * Street Fight: Hyper Clash - Master Game Controller
 */

class FightGame {
    constructor() {
        this.canvas = document.getElementById('fightCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Internal resolution (16:9 arcade widescreen: 960x540)
        this.width = 960;
        this.height = 540;
        this.scale = 1;

        // Modes: 'ARCADE', 'VERSUS', 'TRAINING'
        this.gameMode = 'ARCADE';
        this.state = 'TITLE'; // 'TITLE', 'CHAR_SELECT', 'ROUND_INTRO', 'FIGHTING', 'ROUND_OVER', 'MATCH_OVER'

        this.player1Char = 'ryu';
        this.player2Char = 'chunli';

        this.p1 = null;
        this.p2 = null;
        this.ai = null;

        // Round management
        this.currentRound = 1;
        this.roundTimer = 99;
        this.roundIntroTimer = 0;
        this.roundIntroText = '';
        this.koTimer = 0;

        // Input tracking
        this.keys = {};
        this.virtualInput = {
            left: false, right: false, up: false, down: false
        };

        this.initCanvas();
        this.initInput();
        this.initUI();

        // Load Sprites
        window.spriteSheetManager.init(() => {
            const loadBanner = document.getElementById('loadingOverlay');
            if (loadBanner) loadBanner.style.display = 'none';
        });

        // Loop
        this.lastTime = 0;
        requestAnimationFrame(this.loop.bind(this));
    }

    initCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const scaleW = winW / this.width;
        const scaleH = winH / this.height;
        this.scale = Math.min(scaleW, scaleH);

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${Math.floor(this.width * this.scale)}px`;
        this.canvas.style.height = `${Math.floor(this.height * this.scale)}px`;
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            window.fightAudio.init();
            this.keys[e.code] = true;

            if (this.state === 'FIGHTING' && this.p1 && this.p1.state !== 'KO') {
                if (e.code === 'KeyJ') this.p1.startAttack('PUNCH_LIGHT');
                else if (e.code === 'KeyK') this.p1.startAttack('PUNCH_HEAVY');
                else if (e.code === 'KeyU') this.p1.startAttack('KICK');
                else if (e.code === 'KeyI') this.p1.startAttack('SPECIAL_1');
                else if (e.code === 'KeyO') this.p1.startAttack('SPECIAL_2');
                else if (e.code === 'Space') this.p1.startAttack('SUPER');
                else if (e.code === 'KeyW') this.p1.jump();
            }

            // Player 2 Controls (In Versus Mode)
            if (this.gameMode === 'VERSUS' && this.state === 'FIGHTING' && this.p2 && this.p2.state !== 'KO') {
                if (e.code === 'Numpad1' || e.code === 'Digit1') this.p2.startAttack('PUNCH_LIGHT');
                else if (e.code === 'Numpad2' || e.code === 'Digit2') this.p2.startAttack('PUNCH_HEAVY');
                else if (e.code === 'Numpad4' || e.code === 'Digit3') this.p2.startAttack('KICK');
                else if (e.code === 'Numpad5' || e.code === 'Digit4') this.p2.startAttack('SPECIAL_1');
                else if (e.code === 'Numpad6' || e.code === 'Digit5') this.p2.startAttack('SPECIAL_2');
                else if (e.code === 'Numpad0' || e.code === 'Enter') this.p2.startAttack('SUPER');
                else if (e.code === 'ArrowUp') this.p2.jump();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mobile Virtual Controls
        const bindTouch = (id, onStart, onEnd) => {
            const el = document.getElementById(id);
            if (!el) return;
            const start = (e) => {
                e.preventDefault();
                window.fightAudio.init();
                onStart();
            };
            const end = (e) => {
                e.preventDefault();
                if (onEnd) onEnd();
            };
            el.addEventListener('touchstart', start, { passive: false });
            el.addEventListener('touchend', end, { passive: false });
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', end);
        };

        bindTouch('vbtn_left', () => this.virtualInput.left = true, () => this.virtualInput.left = false);
        bindTouch('vbtn_right', () => this.virtualInput.right = true, () => this.virtualInput.right = false);
        bindTouch('vbtn_up', () => { if (this.p1) this.p1.jump(); });
        bindTouch('vbtn_down', () => this.virtualInput.down = true, () => this.virtualInput.down = false);

        bindTouch('vbtn_lp', () => { if (this.p1) this.p1.startAttack('PUNCH_LIGHT'); });
        bindTouch('vbtn_hp', () => { if (this.p1) this.p1.startAttack('PUNCH_HEAVY'); });
        bindTouch('vbtn_kick', () => { if (this.p1) this.p1.startAttack('KICK'); });
        bindTouch('vbtn_sp1', () => { if (this.p1) this.p1.startAttack('SPECIAL_1'); });
        bindTouch('vbtn_sp2', () => { if (this.p1) this.p1.startAttack('SPECIAL_2'); });
        bindTouch('vbtn_super', () => { if (this.p1) this.p1.startAttack('SUPER'); });
    }

    initUI() {
        document.getElementById('btnModeArcade').addEventListener('click', () => {
            this.gameMode = 'ARCADE';
            this.showCharSelect();
        });

        document.getElementById('btnModeVersus').addEventListener('click', () => {
            this.gameMode = 'VERSUS';
            this.showCharSelect();
        });

        document.getElementById('btnModeTraining').addEventListener('click', () => {
            this.gameMode = 'TRAINING';
            this.showCharSelect();
        });

        // Character Select Buttons
        document.querySelectorAll('.char-card').forEach(card => {
            card.addEventListener('click', () => {
                const charId = card.dataset.char;
                this.selectPlayerCharacter(charId);
            });
        });

        document.getElementById('btnStartMatch').addEventListener('click', () => {
            this.startMatch();
        });

        document.getElementById('btnRematch').addEventListener('click', () => {
            this.startMatch();
        });

        document.getElementById('btnQuitToTitle').addEventListener('click', () => {
            window.fightAudio.stopBGM();
            this.showScreen('title');
        });

        // Sound toggles
        document.getElementById('btnFightSound').addEventListener('click', () => {
            const on = window.fightAudio.toggleSound();
            document.getElementById('btnFightSound').textContent = on ? '🔊' : '🔇';
        });

        document.getElementById('btnFightMusic').addEventListener('click', () => {
            const on = window.fightAudio.toggleMusic();
            document.getElementById('btnFightMusic').textContent = on ? '🎵' : '🚫';
        });
    }

    showScreen(name) {
        document.querySelectorAll('.fight-screen').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`screen_${name}`);
        if (target) target.classList.add('active');

        const hud = document.getElementById('fightHUD');
        const touchCtrls = document.getElementById('virtualControls');

        if (name === 'game') {
            hud.style.display = 'block';
            touchCtrls.style.display = 'flex';
        } else {
            hud.style.display = 'none';
            touchCtrls.style.display = 'none';
        }
    }

    showCharSelect() {
        this.showScreen('charSelect');
        this.updateCharSelectUI();
    }

    selectPlayerCharacter(charId) {
        this.player1Char = charId;
        this.player2Char = charId === 'ryu' ? 'chunli' : 'ryu';
        this.updateCharSelectUI();
    }

    updateCharSelectUI() {
        document.querySelectorAll('.char-card').forEach(card => {
            if (card.dataset.char === this.player1Char) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        const p1Name = this.player1Char === 'ryu' ? 'JIN (神拳·晉)' : 'LI-HUA (飛鳳·麗華)';
        const p2Name = this.player2Char === 'ryu' ? 'JIN (神拳·晉)' : 'LI-HUA (飛鳳·麗華)';
        document.getElementById('p1SelectLabel').textContent = `P1: ${p1Name}`;
        document.getElementById('p2SelectLabel').textContent = `CPU / P2: ${p2Name}`;
    }

    startMatch() {
        this.p1 = new Fighter(this.player1Char, 280, false);
        this.p2 = new Fighter(this.player2Char, 680, true);

        if (this.gameMode === 'ARCADE' || this.gameMode === 'TRAINING') {
            this.ai = new FighterAI(this.p2, this.p1, this.gameMode === 'TRAINING' ? 'easy' : 'normal');
        } else {
            this.ai = null;
        }

        this.currentRound = 1;
        this.p1.roundsWon = 0;
        this.p2.roundsWon = 0;

        document.getElementById('p1NameTag').textContent = this.p1.name;
        document.getElementById('p2NameTag').textContent = this.p2.name;
        document.getElementById('p1HudAvatar').src = this.player1Char === 'ryu' ? 'assets/portrait_jin.png' : 'assets/portrait_lihua.png';
        document.getElementById('p2HudAvatar').src = this.player2Char === 'ryu' ? 'assets/portrait_jin.png' : 'assets/portrait_lihua.png';

        // Show VS Match Screen
        document.getElementById('vsP1Img').src = this.player1Char === 'ryu' ? 'assets/portrait_jin.png' : 'assets/portrait_lihua.png';
        document.getElementById('vsP2Img').src = this.player2Char === 'ryu' ? 'assets/portrait_jin.png' : 'assets/portrait_lihua.png';
        document.getElementById('vsP1Name').textContent = this.p1.name;
        document.getElementById('vsP2Name').textContent = this.p2.name;
        this.showScreen('vsIntro');
        window.fightAudio.speak(`${this.p1.charId === 'ryu' ? 'Jin' : 'Li Hua'} VERSUS ${this.p2.charId === 'ryu' ? 'Jin' : 'Li Hua'}`);

        setTimeout(() => {
            this.startRound(1);
        }, 1600);
    }

    startRound(roundNumber) {
        this.currentRound = roundNumber;
        this.roundTimer = 99;
        this.state = 'ROUND_INTRO';
        this.roundIntroTimer = 2.4;

        this.p1.x = 280;
        this.p1.y = 380;
        this.p1.vx = 0;
        this.p1.vy = 0;
        this.p1.hp = this.p1.maxHp;
        this.p1.displayHp = this.p1.maxHp;
        this.p1.state = 'IDLE';

        this.p2.x = 680;
        this.p2.y = 380;
        this.p2.vx = 0;
        this.p2.vy = 0;
        this.p2.hp = this.p2.maxHp;
        this.p2.displayHp = this.p2.maxHp;
        this.p2.state = 'IDLE';

        window.fxManager.clear();
        this.showScreen('game');

        const roundText = roundNumber === 3 ? 'FINAL ROUND' : `ROUND ${roundNumber}`;
        this.roundIntroText = roundText;
        window.fightAudio.speak(`${roundText}... FIGHT!`);
        window.fightAudio.startBGM();

        this.updateHUD();
    }

    onRoundEnd(winner) {
        this.state = 'ROUND_OVER';
        window.fightAudio.speak('K.O.!');
        window.fightAudio.playHeavyHit();
        window.fxManager.triggerSuperFlash();

        if (winner === 'p1') this.p1.roundsWon++;
        else if (winner === 'p2') this.p2.roundsWon++;

        this.updateHUD();

        setTimeout(() => {
            if (this.p1.roundsWon >= 2 || this.p2.roundsWon >= 2) {
                // Match Over
                this.state = 'MATCH_OVER';
                const matchWinner = this.p1.roundsWon >= 2 ? this.p1 : this.p2;
                window.fightAudio.speak(`${matchWinner.name} WINS!`);
                document.getElementById('winnerText').textContent = `${matchWinner.name} 獲勝 VICTORY!`;
                document.getElementById('winnerPortraitImg').src = matchWinner.charId === 'ryu' ? 'assets/portrait_jin.png' : 'assets/portrait_lihua.png';
                document.getElementById('screen_matchResult').classList.add('active');
                window.fightAudio.stopBGM();
            } else {
                // Next Round
                this.startRound(this.currentRound + 1);
            }
        }, 2500);
    }

    updateHUD() {
        if (!this.p1 || !this.p2) return;

        // P1 Health Bar
        const p1Pct = Math.max(0, (this.p1.hp / this.p1.maxHp) * 100);
        const p1DisplayPct = Math.max(0, (this.p1.displayHp / this.p1.maxHp) * 100);
        document.getElementById('p1HpFill').style.width = `${p1Pct}%`;
        document.getElementById('p1HpLag').style.width = `${p1DisplayPct}%`;

        // P2 Health Bar
        const p2Pct = Math.max(0, (this.p2.hp / this.p2.maxHp) * 100);
        const p2DisplayPct = Math.max(0, (this.p2.displayHp / this.p2.maxHp) * 100);
        document.getElementById('p2HpFill').style.width = `${p2Pct}%`;
        document.getElementById('p2HpLag').style.width = `${p2DisplayPct}%`;

        // Super Gauges
        document.getElementById('p1SuperFill').style.width = `${this.p1.superGauge}%`;
        document.getElementById('p2SuperFill').style.width = `${this.p2.superGauge}%`;

        // Round Icons
        document.getElementById('p1Rounds').textContent = '●'.repeat(this.p1.roundsWon);
        document.getElementById('p2Rounds').textContent = '●'.repeat(this.p2.roundsWon);

        // Timer
        document.getElementById('timerBox').textContent = Math.ceil(this.roundTimer).toString();
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        window.fxManager.update(dt);

        if (this.state === 'ROUND_INTRO') {
            this.roundIntroTimer -= dt;
            if (this.roundIntroTimer <= 0) {
                this.state = 'FIGHTING';
            }
        }

        if (this.state === 'FIGHTING') {
            // Round Timer countdown
            this.roundTimer -= dt;
            if (this.roundTimer <= 0) {
                this.roundTimer = 0;
                // Time Over decision
                const winner = this.p1.hp > this.p2.hp ? 'p1' : (this.p2.hp > this.p1.hp ? 'p2' : 'draw');
                this.onRoundEnd(winner);
                return;
            }

            // Player 1 Input Handling
            if (this.p1.state !== 'KO') {
                const moveLeft = this.keys['KeyA'] || this.virtualInput.left;
                const moveRight = this.keys['KeyD'] || this.virtualInput.right;
                const crouch = this.keys['KeyS'] || this.virtualInput.down;

                if (this.p1.isGrounded && this.p1.state !== 'PUNCH_LIGHT' && this.p1.state !== 'PUNCH_HEAVY' && this.p1.state !== 'KICK' && this.p1.state !== 'SPECIAL_1' && this.p1.state !== 'SPECIAL_2' && this.p1.state !== 'SUPER' && this.p1.state !== 'HIT') {
                    if (crouch) {
                        this.p1.state = 'CROUCH';
                        this.p1.vx = 0;
                    } else if (moveLeft) {
                        this.p1.state = this.p1.facing === 1 ? 'WALK_BACK' : 'WALK_FWD';
                        this.p1.vx = -this.p1.walkSpeed;
                        this.p1.isBlocking = this.p1.facing === 1 && this.p2.currentAttack !== null;
                    } else if (moveRight) {
                        this.p1.state = this.p1.facing === 1 ? 'WALK_FWD' : 'WALK_BACK';
                        this.p1.vx = this.p1.walkSpeed;
                        this.p1.isBlocking = this.p1.facing === -1 && this.p2.currentAttack !== null;
                    } else {
                        this.p1.state = 'IDLE';
                        this.p1.isBlocking = false;
                    }
                }
            }

            // AI Update
            if (this.ai) {
                this.ai.update(dt);
            }

            // Update Fighters
            this.p1.update(dt, this.p2, this.width);
            this.p2.update(dt, this.p1, this.width);

            // Projectile vs Fighter Collisions
            for (const proj of window.fxManager.projectiles) {
                if (!proj.active) continue;

                const target = proj.owner === 'p1' ? this.p2 : this.p1;
                if (target.state !== 'KO') {
                    if (Math.abs(proj.x - target.x) < proj.radius + 30 &&
                        Math.abs(proj.y - (target.y - 65)) < proj.radius + 50) {
                        proj.active = false;
                        target.takeDamage(proj.damage, true, proj.owner === 'p1' ? this.p1 : this.p2);
                    }
                }
            }

            // Check KO
            if (this.p1.hp <= 0 && this.state === 'FIGHTING') {
                this.onRoundEnd('p2');
            } else if (this.p2.hp <= 0 && this.state === 'FIGHTING') {
                this.onRoundEnd('p1');
            }

            this.updateHUD();
        }
    }

    draw() {
        // Draw Retro Fighting Stage: Dojo at Sunset
        this.drawStageBackground();

        // Draw Fighters
        if (this.p1) this.p1.draw(this.ctx);
        if (this.p2) this.p2.draw(this.ctx);

        // Draw Projectiles & FX Sparks
        window.fxManager.draw(this.ctx);

        // Round Announcement Overlay
        if (this.state === 'ROUND_INTRO') {
            this.ctx.save();
            this.ctx.font = '900 52px "Arial Black", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            if (this.roundIntroTimer > 0.9) {
                // ROUND X
                this.ctx.fillStyle = '#fef08a';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 6;
                this.ctx.strokeText(this.roundIntroText, this.width / 2, this.height / 2 - 30);
                this.ctx.fillText(this.roundIntroText, this.width / 2, this.height / 2 - 30);
            } else {
                // FIGHT!
                this.ctx.fillStyle = '#ef4444';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 6;
                this.ctx.strokeText('F I G H T !', this.width / 2, this.height / 2 - 30);
                this.ctx.fillText('F I G H T !', this.width / 2, this.height / 2 - 30);
            }
            this.ctx.restore();
        } else if (this.state === 'ROUND_OVER') {
            this.ctx.save();
            this.ctx.font = '900 64px "Arial Black", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#ef4444';
            this.ctx.strokeStyle = '#fef08a';
            this.ctx.lineWidth = 8;
            this.ctx.strokeText('K . O . !', this.width / 2, this.height / 2 - 30);
            this.ctx.fillText('K . O . !', this.width / 2, this.height / 2 - 30);
            this.ctx.restore();
        }
    }

    drawStageBackground() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Sunset Gradient Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 380);
        skyGrad.addColorStop(0, '#1e1b4b');
        skyGrad.addColorStop(0.35, '#831843');
        skyGrad.addColorStop(0.7, '#ea580c');
        skyGrad.addColorStop(1, '#fde047');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, 380);

        // Giant Blood-Red Sunset Sun
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.arc(w / 2, 230, 95, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
        ctx.beginPath();
        ctx.arc(w / 2, 230, 75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Distant Mountain Silhouettes & Pagoda
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, 320);
        ctx.lineTo(140, 260);
        ctx.lineTo(260, 310);
        ctx.lineTo(390, 240);
        ctx.lineTo(w / 2, 280);
        ctx.lineTo(600, 250);
        ctx.lineTo(750, 300);
        ctx.lineTo(890, 240);
        ctx.lineTo(w, 310);
        ctx.lineTo(w, 380);
        ctx.lineTo(0, 380);
        ctx.closePath();
        ctx.fill();

        // Pagoda Shrine Silhouette
        ctx.fillStyle = '#090d16';
        ctx.fillRect(180, 220, 40, 60);
        ctx.beginPath();
        ctx.moveTo(160, 225);
        ctx.lineTo(200, 195);
        ctx.lineTo(240, 225);
        ctx.closePath();
        ctx.fill();

        // Dojo Arena Wooden Stage Floor
        const floorGrad = ctx.createLinearGradient(0, 380, 0, h);
        floorGrad.addColorStop(0, '#78350f');
        floorGrad.addColorStop(0.3, '#451a03');
        floorGrad.addColorStop(1, '#1c1917');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 380, w, h - 380);

        // Floor Wood Planks & Perspective Lines
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2;
        for (let py = 390; py < h; py += 28) {
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(w, py);
            ctx.stroke();
        }

        // Japanese Torii Gate Pillars on left and right
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(40, 140, 24, 240);
        ctx.fillRect(w - 64, 140, 24, 240);

        // Torii Crossbeam
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(20, 130, w - 40, 18);
        ctx.fillRect(30, 160, w - 60, 12);

        // Paper Lanterns Glowing
        [100, 260, w - 260, w - 100].forEach(lx => {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(lx, 175, 14, 20, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
            ctx.beginPath();
            ctx.ellipse(lx, 175, 8, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.fightGame = new FightGame();
});

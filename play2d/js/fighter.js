/**
 * Street Fight: Hyper Clash - Fighter Entity & Combat Mechanics
 */

class Fighter {
    constructor(charId, x, isPlayer2 = false) {
        this.charId = charId; // 'ryu' or 'chunli'
        this.name = charId === 'ryu' ? 'JIN (神拳·晉)' : 'LI-HUA (飛鳳·麗華)';
        this.isPlayer2 = isPlayer2;

        this.x = x;
        this.y = 380; // Ground line
        this.vx = 0;
        this.vy = 0;
        this.groundY = 380;
        this.facing = isPlayer2 ? -1 : 1;

        // Health & Super
        this.maxHp = 1000;
        this.hp = this.maxHp;
        this.displayHp = this.maxHp; // For smooth decaying red/yellow bar
        this.superGauge = 0; // 0 to 100
        this.roundsWon = 0;

        // Physics constants
        this.walkSpeed = charId === 'chunli' ? 240 : 200;
        this.jumpForce = -620;
        this.gravity = 1500;

        // Combat state
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.animFrameIndex = 0;
        this.animTimer = 0;
        this.animSpeed = 0.12;

        this.hitStop = 0;
        this.isGrounded = true;
        this.isBlocking = false;
        this.flashTimer = 0;
        this.hasHit = false; // Prevent multi-hit during 1 attack phase
        this.comboCount = 0;
        this.comboResetTimer = 0;

        // Attack Data
        this.currentAttack = null;
    }

    takeDamage(amount, isHeavy = false, attacker = null) {
        if (this.state === 'KO') return;

        // Check Blocking
        if (this.isBlocking) {
            const chipDamage = Math.floor(amount * 0.15);
            this.hp = Math.max(0, this.hp - chipDamage);
            this.superGauge = Math.min(100, this.superGauge + 4);
            window.fightAudio.playBlock();
            window.fxManager.addSpark(this.x + this.facing * 20, this.y - 70, false, true);

            this.state = 'BLOCK';
            this.stateTimer = 0.18;
            this.vx = -this.facing * 90;
            return 'blocked';
        }

        // Full Hit
        this.hp = Math.max(0, this.hp - amount);
        this.superGauge = Math.min(100, this.superGauge + 8);
        this.flashTimer = 0.12;

        if (isHeavy) {
            window.fightAudio.playHeavyHit();
            window.fxManager.addSpark(this.x, this.y - 70, true, false);
            this.vx = -this.facing * 220;
            this.state = 'HIT';
            this.stateTimer = 0.42;
        } else {
            window.fightAudio.playLightHit();
            window.fxManager.addSpark(this.x, this.y - 70, false, false);
            this.vx = -this.facing * 120;
            this.state = 'HIT';
            this.stateTimer = 0.24;
        }

        // Increment attacker combo
        if (attacker) {
            attacker.comboCount++;
            attacker.comboResetTimer = 1.0;
            if (attacker.comboCount > 1) {
                window.fxManager.addComboText(this.x, this.y - 120, `${attacker.comboCount} HITS!`, '#f59e0b');
            }
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'KO';
            this.stateTimer = 999;
            this.vy = -300;
            this.vx = -this.facing * 180;
            this.isGrounded = false;
            return 'ko';
        }

        return 'hit';
    }

    startAttack(attackName) {
        // Can cancel normal attacks into special moves / super combo (Street Fighter Hit Cancel & Super Cancel)
        const isCancel = (this.state === 'PUNCH_LIGHT' || this.state === 'PUNCH_HEAVY' || this.state === 'KICK' || this.state === 'SPECIAL_1' || this.state === 'SPECIAL_2') &&
                         (attackName === 'SPECIAL_1' || attackName === 'SPECIAL_2' || attackName === 'SUPER');

        if (!isCancel && this.state !== 'IDLE' && this.state !== 'WALK_FWD' && this.state !== 'WALK_BACK' && this.state !== 'CROUCH') {
            return false;
        }

        this.state = attackName;
        this.stateTimer = 0;
        this.animFrameIndex = 0;
        this.animTimer = 0;
        this.hasHit = false;
        this.vx = 0;

        window.fightAudio.playWhoosh();

        if (attackName === 'PUNCH_LIGHT') {
            this.currentAttack = { duration: 0.22, damage: 45, heavy: false, range: 75, height: 70 };
        } else if (attackName === 'PUNCH_HEAVY') {
            this.currentAttack = { duration: 0.38, damage: 95, heavy: true, range: 90, height: 75 };
            this.vx = this.facing * 70;
        } else if (attackName === 'KICK') {
            this.currentAttack = { duration: 0.35, damage: 85, heavy: false, range: 95, height: 65 };
            this.vx = this.facing * 50;
        } else if (attackName === 'SPECIAL_1') {
            // Ryu: Hadouken / Chun-Li: Hyakuretsu
            if (this.charId === 'ryu') {
                this.currentAttack = { duration: 0.55, damage: 110, heavy: true, isHadouken: true };
                window.fightAudio.playHadouken();
                window.fxManager.addComboText(this.x, this.y - 120, '波動拳 HADOUKEN!', '#38bdf8');
                setTimeout(() => {
                    window.fxManager.addProjectile(this.x + this.facing * 55, this.y - 68, this.facing * 440, this.isPlayer2 ? 'p2' : 'p1', 110, false);
                }, 160);
            } else {
                this.currentAttack = { duration: 0.65, damage: 125, heavy: true, range: 105, height: 60, multiHit: 3 };
                window.fightAudio.playWhoosh();
                window.fxManager.addComboText(this.x, this.y - 120, '百裂腳 LIGHTNING KICKS!', '#f43f5e');
            }
        } else if (attackName === 'SPECIAL_2') {
            // Ryu: Shoryuken / Chun-Li: Spinning Bird Kick
            if (this.charId === 'ryu') {
                this.currentAttack = { duration: 0.6, damage: 140, heavy: true, range: 70, height: 90 };
                this.vy = -520;
                this.vx = this.facing * 160;
                this.isGrounded = false;
                window.fightAudio.playShoryuken();
                window.fxManager.addComboText(this.x, this.y - 120, '昇龍拳 SHORYUKEN!', '#f97316');
            } else {
                this.currentAttack = { duration: 0.7, damage: 135, heavy: true, range: 85, height: 70 };
                this.vy = -360;
                this.vx = this.facing * 220;
                this.isGrounded = false;
                window.fightAudio.playWhoosh();
                window.fxManager.addComboText(this.x, this.y - 120, '旋風飛腿 WHIRLWIND!', '#38bdf8');
            }
        } else if (attackName === 'SUPER') {
            if (this.superGauge < 100) return false;
            this.superGauge = 0;
            this.currentAttack = { duration: 0.85, damage: 280, heavy: true, range: 120, height: 75 };
            window.fightAudio.playSuperFlash();
            window.fxManager.triggerSuperFlash();
            window.fxManager.addComboText(this.x, this.y - 130, '★ SUPER COMBO! ★', '#eab308');

            if (this.charId === 'ryu') {
                setTimeout(() => {
                    window.fightAudio.playHadouken();
                    window.fxManager.addProjectile(this.x + this.facing * 60, this.y - 68, this.facing * 580, this.isPlayer2 ? 'p2' : 'p1', 280, true);
                }, 280);
            } else {
                this.vx = this.facing * 340;
            }
        }
        return true;
    }

    jump() {
        if (!this.isGrounded) return;
        this.vy = this.jumpForce;
        this.isGrounded = false;
        this.state = 'JUMP';
        this.stateTimer = 0;
        window.fxManager.addDust(this.x, this.y, -this.vx * 0.2);
    }

    update(dt, opponent, screenWidth) {
        // Smooth decaying health bar
        if (this.displayHp > this.hp) {
            this.displayHp -= (this.displayHp - this.hp) * 8 * dt;
            if (Math.abs(this.displayHp - this.hp) < 1) this.displayHp = this.hp;
        }

        // Combo reset timer
        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= dt;
            if (this.comboResetTimer <= 0) this.comboCount = 0;
        }

        // Flash timer
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Apply Gravity
        if (!this.isGrounded) {
            this.vy += this.gravity * dt;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Ground collision
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.vy = 0;
            if (!this.isGrounded) {
                this.isGrounded = true;
                window.fxManager.addDust(this.x, this.y, 0);
                if (this.state === 'JUMP') {
                    this.state = 'IDLE';
                }
            }
        }

        // Boundaries
        const pad = 40;
        this.x = Math.max(pad, Math.min(screenWidth - pad, this.x));

        // Auto-face opponent when idle / walking
        if (this.isGrounded && (this.state === 'IDLE' || this.state === 'WALK_FWD' || this.state === 'WALK_BACK' || this.state === 'CROUCH')) {
            this.facing = opponent.x > this.x ? 1 : -1;
        }

        // State Machine Timers
        this.stateTimer += dt;
        this.animTimer += dt;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer = 0;
            this.animFrameIndex++;
        }

        // Friction on ground
        if (this.isGrounded && this.state !== 'WALK_FWD' && this.state !== 'WALK_BACK') {
            this.vx *= 0.85;
        }

        // Handle Attack Expiration & Hitboxes
        if (this.currentAttack) {
            if (this.stateTimer >= this.currentAttack.duration) {
                this.state = 'IDLE';
                this.currentAttack = null;
                this.hasHit = false;
            } else if (!this.hasHit && !this.currentAttack.isHadouken) {
                // Check melee hit box collision with opponent hurtbox
                const attackBox = {
                    x: this.facing === 1 ? this.x : this.x - this.currentAttack.range,
                    y: this.y - this.currentAttack.height - 25,
                    w: this.currentAttack.range,
                    h: 50
                };

                const oppHurtbox = {
                    x: opponent.x - 30,
                    y: opponent.y - 110,
                    w: 60,
                    h: 110
                };

                // AABB Intersection
                if (attackBox.x < oppHurtbox.x + oppHurtbox.w &&
                    attackBox.x + attackBox.w > oppHurtbox.x &&
                    attackBox.y < oppHurtbox.y + oppHurtbox.h &&
                    attackBox.y + attackBox.h > oppHurtbox.y) {

                    this.hasHit = true;
                    this.superGauge = Math.min(100, this.superGauge + 10);
                    opponent.takeDamage(this.currentAttack.damage, this.currentAttack.heavy, this);
                }
            }
        }

        // Hit / Block recovery
        if (this.state === 'HIT' || this.state === 'BLOCK') {
            if (this.stateTimer >= (this.state === 'HIT' ? 0.28 : 0.18)) {
                this.state = 'IDLE';
            }
        }
    }

    draw(ctx) {
        if (!window.spriteSheetManager || !window.spriteSheetManager.loaded) return;

        let animName = 'idle';
        if (this.state === 'WALK_FWD') animName = 'walk_fwd';
        else if (this.state === 'WALK_BACK') animName = 'walk_back';
        else if (this.state === 'CROUCH') animName = 'crouch';
        else if (this.state === 'JUMP') animName = 'jump';
        else if (this.state === 'PUNCH_LIGHT') animName = 'punch_light';
        else if (this.state === 'PUNCH_HEAVY') animName = 'punch_heavy';
        else if (this.state === 'KICK') animName = 'kick';
        else if (this.state === 'SPECIAL_1') animName = this.charId === 'ryu' ? 'hadouken' : 'hyakuretsu';
        else if (this.state === 'SPECIAL_2') animName = this.charId === 'ryu' ? 'shoryuken' : 'spinning_kick';
        else if (this.state === 'SUPER') animName = this.charId === 'ryu' ? 'hadouken' : 'hyakuretsu';
        else if (this.state === 'HIT') animName = 'hit';
        else if (this.state === 'BLOCK') animName = 'block';
        else if (this.state === 'KO') animName = 'ko';

        window.spriteSheetManager.drawFrame(
            ctx,
            this.charId,
            animName,
            this.animFrameIndex,
            this.x,
            this.y,
            this.facing,
            1.8,
            this.flashTimer > 0
        );
    }
}

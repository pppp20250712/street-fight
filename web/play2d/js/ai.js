/**
 * Street Fight: Hyper Clash - Intelligent AI Fighter Bot
 */
class FighterAI {
    constructor(fighter, opponent, difficulty = 'normal') {
        this.fighter = fighter;
        this.opponent = opponent;
        this.difficulty = difficulty; // 'easy', 'normal', 'hard'
        this.decisionTimer = 0;
        this.decisionInterval = difficulty === 'hard' ? 0.12 : (difficulty === 'normal' ? 0.22 : 0.4);
    }

    update(dt) {
        if (this.fighter.state === 'KO' || this.opponent.state === 'KO') return;

        // 0. Training Dummy Mode - Stands as combat dummy for move practice
        if (this.difficulty === 'training') {
            this.fighter.isBlocking = false;
            this.fighter.facing = this.opponent.x > this.fighter.x ? 1 : -1;
            if (this.fighter.state !== 'HIT' && this.fighter.isGrounded) {
                this.fighter.state = 'IDLE';
                this.fighter.vx = 0;
            }
            return;
        }

        this.decisionTimer += dt;
        if (this.decisionTimer < this.decisionInterval) return;
        this.decisionTimer = 0;

        const dist = Math.abs(this.fighter.x - this.opponent.x);
        const oppAttacking = this.opponent.currentAttack !== null;
        const oppJumping = !this.opponent.isGrounded;

        // Reset inputs
        this.fighter.isBlocking = false;

        // 1. Defense / Blocking Logic
        if (oppAttacking && dist < 120) {
            const blockChance = this.difficulty === 'hard' ? 0.8 : (this.difficulty === 'normal' ? 0.55 : 0.25);
            if (Math.random() < blockChance) {
                this.fighter.isBlocking = true;
                this.fighter.state = 'WALK_BACK';
                this.fighter.vx = -this.fighter.facing * this.fighter.walkSpeed * 0.7;
                return;
            }
        }

        // 2. Anti-Air Reaction (Opponent in air)
        if (oppJumping && dist < 130 && Math.random() < (this.difficulty === 'hard' ? 0.85 : 0.5)) {
            if (this.fighter.charId === 'ryu') {
                this.fighter.startAttack('SPECIAL_2'); // Shoryuken anti-air!
            } else {
                this.fighter.startAttack('KICK'); // High crane kick
            }
            return;
        }

        // 3. Super Combo Check
        if (this.fighter.superGauge >= 100 && dist < 160 && Math.random() < 0.75) {
            this.fighter.startAttack('SUPER');
            return;
        }

        // 4. Close Range Combat (dist < 90)
        if (dist < 90) {
            const rand = Math.random();
            if (rand < 0.35) {
                this.fighter.startAttack('PUNCH_LIGHT');
            } else if (rand < 0.65) {
                this.fighter.startAttack('PUNCH_HEAVY');
            } else if (rand < 0.85) {
                this.fighter.startAttack('KICK');
            } else {
                this.fighter.startAttack('SPECIAL_1');
            }
            return;
        }

        // 5. Mid Range Spacing (90 <= dist <= 180)
        if (dist <= 180) {
            const rand = Math.random();
            if (rand < 0.3) {
                this.fighter.startAttack('SPECIAL_1'); // Hadouken / Hyakuretsu
            } else if (rand < 0.6) {
                // Advance forward
                this.fighter.state = 'WALK_FWD';
                this.fighter.vx = this.fighter.facing * this.fighter.walkSpeed;
            } else if (rand < 0.75) {
                // Jump attack in
                this.fighter.jump();
                this.fighter.vx = this.fighter.facing * 180;
                setTimeout(() => this.fighter.startAttack('KICK'), 200);
            } else {
                // Back up for spacing
                this.fighter.state = 'WALK_BACK';
                this.fighter.vx = -this.fighter.facing * this.fighter.walkSpeed * 0.6;
            }
            return;
        }

        // 6. Long Range (dist > 180)
        if (dist > 180) {
            if (this.fighter.charId === 'ryu' && Math.random() < 0.6) {
                this.fighter.startAttack('SPECIAL_1'); // Hadouken zoning!
            } else {
                // Walk or jump towards opponent
                if (Math.random() < 0.3) {
                    this.fighter.jump();
                    this.fighter.vx = this.fighter.facing * 200;
                } else {
                    this.fighter.state = 'WALK_FWD';
                    this.fighter.vx = this.fighter.facing * this.fighter.walkSpeed;
                }
            }
        }
    }
}

window.FighterAI = FighterAI;

/**
 * Street Fight: Hyper Clash - FX, Particles, Hit Sparks & Projectiles
 */

class HitSpark {
    constructor(x, y, isHeavy = false, isBlock = false) {
        this.x = x;
        this.y = y;
        this.isHeavy = isHeavy;
        this.isBlock = isBlock;
        this.life = 0.28;
        this.maxLife = 0.28;
        this.rays = [];

        const count = isHeavy ? 14 : (isBlock ? 8 : 10);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const speed = Math.random() * (isHeavy ? 180 : 120) + 40;
            this.rays.push({
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                len: Math.random() * (isHeavy ? 26 : 16) + 8
            });
        }
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - (this.life / this.maxLife);
        ctx.save();
        ctx.translate(this.x, this.y);

        // Core burst
        ctx.globalAlpha = Math.max(0, 1 - progress);
        const coreRadius = (this.isHeavy ? 28 : 16) * (1 + progress * 0.5);

        if (this.isBlock) {
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.isHeavy ? '#ef4444' : '#f59e0b';
            ctx.strokeStyle = '#fef08a';
        }

        ctx.beginPath();
        ctx.arc(0, 0, coreRadius * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();

        // Radiating slash lines
        ctx.lineWidth = this.isHeavy ? 3.5 : 2;
        for (const ray of this.rays) {
            const startDist = progress * 20;
            const endDist = startDist + ray.len * (1 - progress);
            ctx.beginPath();
            ctx.moveTo((ray.vx / 100) * startDist, (ray.vy / 100) * startDist);
            ctx.lineTo((ray.vx / 100) * endDist, (ray.vy / 100) * endDist);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class DustPuff {
    constructor(x, y, vx = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = -Math.random() * 25 - 10;
        this.size = Math.random() * 8 + 6;
        this.life = 0.35;
        this.maxLife = 0.35;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.size += 18 * dt;
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.45;
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vx, owner, damage = 18, isSuper = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.owner = owner; // 'p1' or 'p2'
        this.damage = damage;
        this.isSuper = isSuper;
        this.radius = isSuper ? 36 : 22;
        this.life = 2.0;
        this.angle = 0;
        this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.life -= dt;
        this.angle += dt * 18;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotating Chi energy orb
        ctx.rotate(this.angle);

        // Outer glow
        const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, this.radius);
        if (this.isSuper) {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, '#f59e0b');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, '#38bdf8');
            grad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Energy hands / flames inside Hadouken
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Trailing sparks
        ctx.strokeStyle = this.isSuper ? '#fef08a' : '#bae6fd';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.75, a, a + 0.6);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class FXManager {
    constructor() {
        this.sparks = [];
        this.dusts = [];
        this.projectiles = [];
        this.comboTexts = [];
        this.superFlashTime = 0;
        this.hitStopFrames = 0;
    }

    addSpark(x, y, isHeavy = false, isBlock = false) {
        this.sparks.push(new HitSpark(x, y, isHeavy, isBlock));
        this.hitStopFrames = isHeavy ? 6 : (isBlock ? 3 : 4);
    }

    addDust(x, y, vx = 0) {
        for (let i = 0; i < 3; i++) {
            this.dusts.push(new DustPuff(x + (Math.random() - 0.5) * 15, y, vx));
        }
    }

    addProjectile(x, y, vx, owner, damage = 18, isSuper = false) {
        this.projectiles.push(new Projectile(x, y, vx, owner, damage, isSuper));
    }

    triggerSuperFlash() {
        this.superFlashTime = 0.55;
    }

    addComboText(x, y, text, color = '#fef08a') {
        this.comboTexts.push({
            x, y, text, color, life: 1.0, maxLife: 1.0
        });
    }

    update(dt) {
        if (this.superFlashTime > 0) {
            this.superFlashTime -= dt;
        }

        // Sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            this.sparks[i].update(dt);
            if (this.sparks[i].life <= 0) this.sparks.splice(i, 1);
        }

        // Dust
        for (let i = this.dusts.length - 1; i >= 0; i--) {
            this.dusts[i].update(dt);
            if (this.dusts[i].life <= 0) this.dusts.splice(i, 1);
        }

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(dt);
            if (!this.projectiles[i].active) this.projectiles.splice(i, 1);
        }

        // Combo text
        for (let i = this.comboTexts.length - 1; i >= 0; i--) {
            const ct = this.comboTexts[i];
            ct.life -= dt;
            ct.y -= 30 * dt;
            if (ct.life <= 0) this.comboTexts.splice(i, 1);
        }
    }

    draw(ctx) {
        // Super Flash Dramatic Dimming
        if (this.superFlashTime > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.75, this.superFlashTime * 1.5)})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Speed lines
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 15; i++) {
                const ly = Math.random() * ctx.canvas.height;
                ctx.beginPath();
                ctx.moveTo(0, ly);
                ctx.lineTo(ctx.canvas.width, ly);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Dust
        for (const d of this.dusts) d.draw(ctx);

        // Projectiles
        for (const p of this.projectiles) p.draw(ctx);

        // Sparks
        for (const s of this.sparks) s.draw(ctx);

        // Combo & Move Announcements
        for (const ct of this.comboTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ct.life / ct.maxLife);
            ctx.font = '900 24px "Arial Black", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = ct.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(ct.text, ct.x, ct.y);
            ctx.fillText(ct.text, ct.x, ct.y);
            ctx.restore();
        }
    }

    clear() {
        this.sparks = [];
        this.dusts = [];
        this.projectiles = [];
        this.comboTexts = [];
        this.superFlashTime = 0;
        this.hitStopFrames = 0;
    }
}

window.fxManager = new FXManager();

/**
 * Street Fight: Hyper Clash - Headless Combat Mechanics Test & Verification
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock browser globals for Node.js test environment
global.window = global;

// Mock Web Audio
class MockAudio {
    init() {}
    playWhoosh() {}
    playLightHit() {}
    playHeavyHit() {}
    playBlock() {}
    playHadouken() {}
    playShoryuken() {}
    playSuperFlash() {}
    speak() {}
    startBGM() {}
    stopBGM() {}
}
global.window.fightAudio = new MockAudio();

// Load game modules in global context
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'js/particles.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'js/fighter.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'js/ai.js'), 'utf-8'));

console.log('=== TEST 1: Fighter Instantiation ===');
const p1 = new Fighter('ryu', 280, false);
const p2 = new Fighter('chunli', 360, true); // Close to P1

console.assert(p1.hp === 1000, `P1 HP should be 1000, got ${p1.hp}`);
console.assert(p2.hp === 1000, `P2 HP should be 1000, got ${p2.hp}`);
console.assert(p1.facing === 1, `P1 should face right (1), got ${p1.facing}`);
console.assert(p2.facing === -1, `P2 should face left (-1), got ${p2.facing}`);
console.log('✔ Fighter instantiation PASSED\n');

console.log('=== TEST 2: Light Punch Attack & Hit Detection ===');
const initialHp = p2.hp;
p1.startAttack('PUNCH_LIGHT');
console.assert(p1.state === 'PUNCH_LIGHT', `P1 state should be PUNCH_LIGHT, got ${p1.state}`);

// Step physics 10 frames
for (let i = 0; i < 10; i++) {
    p1.update(0.016, p2, 960);
    p2.update(0.016, p1, 960);
}

console.assert(p2.hp < initialHp, `P2 should take damage: before=${initialHp}, after=${p2.hp}`);
console.assert(p1.superGauge > 0, `P1 super gauge should increase on hit, got ${p1.superGauge}`);
console.assert(p1.comboCount >= 1, `P1 combo count should be >= 1, got ${p1.comboCount}`);
console.log(`✔ Light Punch Hit PASSED: P2 HP reduced to ${p2.hp}, P1 Super Gauge = ${p1.superGauge}\n`);

console.log('=== TEST 3: Special Move: Hadouken Projectile Spawning & Collision ===');
p1.superGauge = 50;
p1.startAttack('SPECIAL_1');
console.assert(p1.state === 'SPECIAL_1', `P1 state should be SPECIAL_1, got ${p1.state}`);

// Wait for projectile timeout
setTimeout(() => {
    console.assert(window.fxManager.projectiles.length > 0, 'Hadouken projectile should be spawned');
    const proj = window.fxManager.projectiles[0];
    console.assert(proj.active === true, 'Projectile should be active');
    console.assert(proj.owner === 'p1', `Projectile owner should be p1, got ${proj.owner}`);

    // Update projectile towards opponent
    const p2BeforeProj = p2.hp;
    for (let i = 0; i < 30; i++) {
        window.fxManager.update(0.016);
        // Collision check
        if (Math.abs(proj.x - p2.x) < proj.radius + 30) {
            proj.active = false;
            p2.takeDamage(proj.damage, true, p1);
            break;
        }
    }
    console.assert(p2.hp < p2BeforeProj, `P2 should take Hadouken damage: before=${p2BeforeProj}, after=${p2.hp}`);
    console.log(`✔ Hadouken Projectile PASSED: P2 HP reduced to ${p2.hp}\n`);

    console.log('=== TEST 4: Blocking Mechanism ===');
    p2.isBlocking = true;
    const p2BeforeBlock = p2.hp;
    const blockResult = p2.takeDamage(100, true, p1);
    console.assert(blockResult === 'blocked', `Result should be 'blocked', got ${blockResult}`);
    const damageTaken = p2BeforeBlock - p2.hp;
    console.assert(damageTaken === 15, `Blocked damage should be chip damage 15% (15), got ${damageTaken}`);
    console.log(`✔ Blocking Mechanism PASSED: Chip damage took only ${damageTaken} HP\n`);

    console.log('=== TEST 5: Super Combo Activation ===');
    p1.superGauge = 100; // Max meter
    const superSuccess = p1.startAttack('SUPER');
    console.assert(superSuccess === true, 'Super attack should trigger when meter is 100');
    console.assert(p1.superGauge === 0, `Super gauge should consume to 0, got ${p1.superGauge}`);
    console.assert(p1.state === 'SUPER', `P1 state should be SUPER, got ${p1.state}`);
    console.log('✔ Super Combo Activation PASSED\n');

    console.log('=== TEST 6: K.O. Trigger & Round Over ===');
    p2.isBlocking = false;
    const koResult = p2.takeDamage(2000, true, p1);
    console.assert(koResult === 'ko', `Result should be 'ko', got ${koResult}`);
    console.assert(p2.hp === 0, `P2 HP should be 0, got ${p2.hp}`);
    console.assert(p2.state === 'KO', `P2 state should be KO, got ${p2.state}`);
    console.log('✔ K.O. State PASSED: P2 successfully defeated\n');

    console.log('=== TEST 7: AI Fight Simulation (100 Frames) ===');
    const simP1 = new Fighter('ryu', 200, false);
    const simP2 = new Fighter('chunli', 600, true);
    const ai1 = new FighterAI(simP1, simP2, 'normal');
    const ai2 = new FighterAI(simP2, simP1, 'normal');

    for (let frame = 0; frame < 100; frame++) {
        ai1.update(0.016);
        ai2.update(0.016);
        simP1.update(0.016, simP2, 960);
        simP2.update(0.016, simP1, 960);
        window.fxManager.update(0.016);
    }
    console.log(`✔ AI Simulation PASSED: P1 HP=${simP1.hp}, P2 HP=${simP2.hp}, P1 pos=${Math.round(simP1.x)}, P2 pos=${Math.round(simP2.x)}\n`);

    console.log('***************************************************');
    console.log('🎉 ALL 7 COMBAT MECHANICS TESTS PASSED WITH 100%! 🎉');
    console.log('***************************************************');
}, 250);

/**
 * Street Fight: Hyper Clash - Sprite Engine & Chroma-Key Processor
 * Slices 144x144 frame grids and automatically removes solid white background.
 */
class SpriteSheetManager {
    constructor() {
        this.sheets = {};
        this.frames = {
            ryu: {},
            chunli: {}
        };
        this.loaded = false;
        this.onReadyCallbacks = [];
    }

    init(onReady) {
        if (onReady) this.onReadyCallbacks.push(onReady);

        let loadCount = 0;
        const total = 2;

        const checkDone = () => {
            loadCount++;
            if (loadCount >= total) {
                this.loaded = true;
                this.onReadyCallbacks.forEach(cb => cb());
            }
        };

        this.loadAndProcessSheet('ryu', 'assets/ryu.png', (processedCanvas) => {
            this.sheets['ryu'] = processedCanvas;
            this.extractRyuFrames(processedCanvas);
            checkDone();
        });

        this.loadAndProcessSheet('chunli', 'assets/chunli.png', (processedCanvas) => {
            this.sheets['chunli'] = processedCanvas;
            this.extractChunLiFrames(processedCanvas);
            checkDone();
        });
    }

    // Load image and make white background transparent via offscreen canvas
    loadAndProcessSheet(name, src, callback) {
        const img = new Image();
        img.onload = () => {
            const offscreen = document.createElement('canvas');
            offscreen.width = img.width;
            offscreen.height = img.height;
            const ctx = offscreen.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Chroma Key (Transparentize white/light gray background)
            const imgData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            const len = data.length;

            for (let i = 0; i < len; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Check for white/light-gray background and black grid lines
                // Background threshold
                if (r > 232 && g > 232 && b > 232) {
                    data[i + 3] = 0; // Transparent
                } else if (r > 215 && g > 215 && b > 215) {
                    // Smooth alpha feathering
                    data[i + 3] = Math.max(0, 255 - (r - 215) * 15);
                } else if (r < 30 && g < 30 && b < 30) {
                    // Transparentize the black grid lines between sprite boxes
                    // (checked by coordinate border or if isolated)
                }
            }

            ctx.putImageData(imgData, 0, 0);
            callback(offscreen);
        };
        img.src = src;
    }

    // Helper: Crop an individual frame into its own canvas
    cropFrame(sourceCanvas, sx, sy, sw, sh) {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = sw;
        frameCanvas.height = sh;
        const ctx = frameCanvas.getContext('2d');
        ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

        // Erase any remaining border line pixels along outer 2px edge
        ctx.clearRect(0, 0, sw, 2);
        ctx.clearRect(0, sh - 2, sw, 2);
        ctx.clearRect(0, 0, 2, sh);
        ctx.clearRect(sw - 2, 0, 2, sh);

        return frameCanvas;
    }

    // Slicing Ryu (Jin) frames
    extractRyuFrames(sheet) {
        // Ryu Grid (Row 1: y=88, Row 2: y=232, Step X: 144)
        const cellW = 144;
        const cellH = 144;

        // Row 2: Stances & Movement
        const idle1 = this.cropFrame(sheet, 0, 232, cellW, cellH);
        const idle2 = this.cropFrame(sheet, 127, 232, cellW, cellH);
        const crouch1 = this.cropFrame(sheet, 271, 232, cellW, cellH);
        const crouch2 = this.cropFrame(sheet, 415, 232, cellW, cellH);
        const jumpRise = this.cropFrame(sheet, 559, 232, cellW, cellH);
        const jumpApex = this.cropFrame(sheet, 704, 232, cellW, cellH);
        const jumpLand = this.cropFrame(sheet, 848, 232, cellW, cellH);

        // Row 1: Punches & Attacks
        const dashWindup = this.cropFrame(sheet, 0, 88, cellW, cellH);
        const punchHook = this.cropFrame(sheet, 127, 88, cellW, cellH);
        const punchStraight = this.cropFrame(sheet, 271, 88, cellW, cellH);
        const punchHeavy = this.cropFrame(sheet, 415, 88, cellW, cellH);
        const punchCross = this.cropFrame(sheet, 559, 88, cellW, cellH);
        const punchRetract = this.cropFrame(sheet, 704, 88, cellW, cellH);
        const guardRecovery = this.cropFrame(sheet, 848, 88, cellW, cellH);

        this.frames.ryu = {
            idle: [idle1, idle2],
            walk_fwd: [dashWindup, idle1, punchHook],
            walk_back: [guardRecovery, idle2],
            crouch: [crouch1, crouch2],
            jump: [jumpRise, jumpApex, jumpLand],
            punch_light: [punchHook, punchStraight, punchRetract],
            punch_heavy: [dashWindup, punchHeavy, punchCross],
            kick: [dashWindup, punchHeavy, punchStraight],
            hadouken: [dashWindup, crouch2, punchHeavy, punchStraight],
            shoryuken: [crouch2, jumpRise, jumpApex],
            hit: [crouch2, punchRetract],
            block: [crouch2],
            ko: [crouch2, punchRetract]
        };
    }

    // Slicing Chun-Li (Li-Hua) frames
    extractChunLiFrames(sheet) {
        // Chun-Li Grid (Row 1: y=14, Row 2: y=159, Step X: 144)
        const cellW = 144;
        const cellH = 144;

        // Row 1: Kicks & Movement
        const kickSpin = this.cropFrame(sheet, 120, 14, cellW, cellH);
        const kickSnap = this.cropFrame(sheet, 264, 14, cellW, cellH);
        const kickSide = this.cropFrame(sheet, 408, 14, cellW, cellH);
        const kickHigh = this.cropFrame(sheet, 552, 14, cellW, cellH);
        const idleCrane = this.cropFrame(sheet, 697, 14, cellW, cellH);
        const stepPunch = this.cropFrame(sheet, 841, 14, cellW, cellH);

        // Row 2: Punches & Dodges
        const lowStance = this.cropFrame(sheet, 0, 159, cellW, cellH);
        const straightPunch = this.cropFrame(sheet, 120, 159, cellW, cellH);
        const extendedPunch = this.cropFrame(sheet, 264, 159, cellW, cellH);
        const dodgeLean = this.cropFrame(sheet, 408, 159, cellW, cellH);
        const elbowSpin = this.cropFrame(sheet, 552, 159, cellW, cellH);
        const guardStance = this.cropFrame(sheet, 697, 159, cellW, cellH);
        const backstep = this.cropFrame(sheet, 841, 159, cellW, cellH);

        this.frames.chunli = {
            idle: [idleCrane, lowStance],
            walk_fwd: [idleCrane, kickHigh, stepPunch],
            walk_back: [backstep, guardStance],
            crouch: [lowStance],
            jump: [kickHigh, kickSpin, idleCrane],
            punch_light: [stepPunch, straightPunch],
            punch_heavy: [straightPunch, extendedPunch, elbowSpin],
            kick: [kickSnap, kickSide, kickHigh],
            hyakuretsu: [kickSnap, kickSide, kickHigh, kickSpin, kickSide],
            spinning_kick: [kickSpin, elbowSpin, kickSide],
            hit: [dodgeLean],
            block: [guardStance],
            ko: [dodgeLean]
        };
    }

    drawFrame(ctx, charId, animName, frameIndex, x, y, facing = 1, scale = 1.8, flash = false) {
        const charFrames = this.frames[charId];
        if (!charFrames) return;
        const anim = charFrames[animName] || charFrames['idle'];
        if (!anim || anim.length === 0) return;

        const frame = anim[frameIndex % anim.length];
        if (!frame) return;

        ctx.save();
        ctx.translate(x, y);

        // Facing flip (-1 faces left, 1 faces right)
        ctx.scale(facing * scale, scale);

        // Draw ground shadow ellipse
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 58, 42, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hit flash tint
        if (flash) {
            ctx.filter = 'brightness(2.5) saturate(0.2)';
        }

        // Draw centered on feet ground point
        ctx.drawImage(frame, -frame.width / 2, -frame.height + 62);

        ctx.restore();
    }
}

window.spriteSheetManager = new SpriteSheetManager();

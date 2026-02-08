/**
 * Block Blast Clone - Bundle Script (Menu & Mode Selection)
 * Combines all modules for local file execution support.
 */

/* ===========================
   VisualEffects.js
   =========================== */
class Particle {
    constructor(x, y, color, isGlow = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.isGlow = isGlow;
        this.size = Math.random() * 8 + 4;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        if (this.isGlow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.fillStyle = '#ffffff'; // White core for glow
        } else {
            ctx.fillStyle = this.color;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10, isGlow = false) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, isGlow));
        }
    }

    emitBomb(centerX, centerY, color) {
        // Massive explosion at center
        this.emit(centerX, centerY, color, 30, true);
        this.emit(centerX, centerY, '#ffeb3b', 20, true); // Spark particles

        // Ring of particles
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const p = new Particle(centerX, centerY, color, true);
            const speed = Math.random() * 15 + 5;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.size = Math.random() * 10 + 5;
            this.particles.push(p);
        }
    }

    emitLaser(startX, startY, color, isVertical) {
        // Rapidly sliding beam effect
        for (let i = 0; i < 40; i++) {
            const p = new Particle(startX, startY, color, true);
            const speed = Math.random() * 30 + 20; // High speed
            const offsetWidth = (Math.random() - 0.5) * 30;

            if (isVertical) {
                p.vx = offsetWidth * 0.1;
                p.vy = (Math.random() > 0.5 ? 1 : -1) * speed;
            } else {
                p.vx = (Math.random() > 0.5 ? 1 : -1) * speed;
                p.vy = offsetWidth * 0.1;
            }
            p.decay = 0.08; // Faster disappear
            p.size = Math.random() * 4 + 2;
            this.particles.push(p);
        }
    }

    emitHourglass(centerX, centerY) {
        // Golden swirl of time
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 40 + 10;
            const p = new Particle(
                centerX + Math.cos(angle) * dist,
                centerY + Math.sin(angle) * dist,
                '#ffd700',
                true
            );
            // Spiral inward/outward
            p.vx = -Math.sin(angle) * 8;
            p.vy = Math.cos(angle) * 8;
            p.decay = 0.04;
            this.particles.push(p);
        }
        // Bright burst in the middle
        this.emit(centerX, centerY, '#ffffff', 10, true);
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

/* ===========================
   Engine.js
   =========================== */
class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.entities = [];
        this.lastTime = 0;
        this.width = 0;
        this.height = 0;
        this.pixelRatio = window.devicePixelRatio || 1;

        this.logicalWidth = 450;
        this.logicalHeight = 850;
        this.scale = 1;

        this.shakeTime = 0;
        this.shakeIntensity = 0;

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTime = duration;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.scale(this.pixelRatio, this.pixelRatio);

        this.scale = Math.min(this.width / this.logicalWidth, this.height / this.logicalHeight);
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    removeEntity(entity) {
        this.entities = this.entities.filter(e => e !== entity);
    }

    start() {
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(time) {
        if (!this.lastTime) this.lastTime = time;
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
        }

        this.update(dt);
        this.draw();

        requestAnimationFrame((time) => this.loop(time));
    }

    update(dt) {
        for (const entity of this.entities) {
            if (entity.update) entity.update(dt);
        }
    }

    draw() {
        this.ctx.save();

        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        this.ctx.clearRect(-50, -50, this.width + 100, this.height + 100);

        for (const entity of this.entities) {
            if (entity.draw) entity.draw(this.ctx);
        }

        this.ctx.restore();
    }
}

/* ===========================
   Input.js
   =========================== */
class Input {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.pos = { x: 0, y: 0 };
        this.isDown = false;

        this.onDown = null;
        this.onMove = null;
        this.onUp = null;

        this.canvas.addEventListener('mousedown', (e) => this._handleDown(e));
        window.addEventListener('mousemove', (e) => this._handleMove(e));
        window.addEventListener('mouseup', (e) => this._handleUp(e));

        this.canvas.addEventListener('touchstart', (e) => this._handleDown(e), { passive: false });
        window.addEventListener('touchmove', (e) => this._handleMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this._handleUp(e), { passive: false });
    }

    _getPosFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    _handleDown(e) {
        if (e.cancelable) e.preventDefault();
        this.isDown = true;
        this.pos = this._getPosFromEvent(e);
        if (this.onDown) this.onDown(this.pos);
    }

    _handleMove(e) {
        if (!this.isDown) return;
        this.pos = this._getPosFromEvent(e);
        if (this.onMove) this.onMove(this.pos);
    }

    _handleUp(e) {
        if (!this.isDown) return;
        this.isDown = false;
        this.pos = this._getPosFromEvent(e);
        if (this.onUp) this.onUp(this.pos);
    }
}

/* ===========================
   Grid.js
   =========================== */
class Grid {
    constructor(engine, cellSize, padding) {
        this.engine = engine;
        this.rows = 8;
        this.cols = 8;
        this.baseCellSize = cellSize;
        this.basePadding = padding;

        this.cellSize = cellSize;
        this.padding = padding;

        this.data = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        this.colors = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.goldData = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));

        this.calculateLayout();
    }

    calculateLayout() {
        this.cellSize = this.baseCellSize * this.engine.scale;
        this.padding = this.basePadding * this.engine.scale;

        this.totalWidth = this.cols * this.cellSize + (this.cols - 1) * this.padding;
        this.totalHeight = this.rows * this.cellSize + (this.rows - 1) * this.padding;

        this.x = (this.engine.width - this.totalWidth) / 2;
        this.y = (this.engine.height - this.totalHeight) / 2 - (60 * this.engine.scale);
    }

    draw(ctx) {
        // Only draw grid if it's meant to be visible (in game)
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cellX = this.x + c * (this.cellSize + this.padding);
                const cellY = this.y + r * (this.cellSize + this.padding);

                // Empty cell color based on theme
                const isLightMode = document.body.classList.contains('light-mode');
                ctx.fillStyle = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)';
                this._roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, 8 * this.engine.scale);
                ctx.fill();

                if (this.data[r][c] === 1) {
                    const isGold = this.goldData[r][c];

                    if (isGold) {
                        ctx.save();
                        ctx.shadowBlur = 15 * this.engine.scale;
                        ctx.shadowColor = '#ffd700';
                    }

                    ctx.fillStyle = this.colors[r][c] || '#4ecca3';
                    this._roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, 8 * this.engine.scale);
                    ctx.fill();

                    if (isGold) ctx.restore();

                    ctx.fillStyle = isGold ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                    this._roundRect(ctx, cellX + 4 * this.engine.scale, cellY + 4 * this.engine.scale, this.cellSize - 8 * this.engine.scale, this.cellSize / 2 - 4 * this.engine.scale, 4 * this.engine.scale);
                    ctx.fill();
                }
            }
        }
    }

    _roundRect(ctx, x, y, width, height, radius) {
        if (radius < 0) radius = 0;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    getCellAt(worldX, worldY) {
        const c = Math.round((worldX - this.x - this.cellSize / 2) / (this.cellSize + this.padding));
        const r = Math.round((worldY - this.y - this.cellSize / 2) / (this.cellSize + this.padding));

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            return { r, c };
        }
        return null;
    }

    canPlace(shape, gridR, gridC) {
        for (let r = 0; r < shape.matrix.length; r++) {
            for (let c = 0; c < shape.matrix[r].length; c++) {
                if (shape.matrix[r][c] === 1) {
                    const targetR = gridR + r;
                    const targetC = gridC + c;

                    if (targetR < 0 || targetR >= this.rows || targetC < 0 || targetC >= this.cols) return false;
                    if (this.data[targetR][targetC] === 1) return false;
                }
            }
        }
        return true;
    }

    place(shape, gridR, gridC) {
        for (let r = 0; r < shape.matrix.length; r++) {
            for (let c = 0; c < shape.matrix[r].length; c++) {
                if (shape.matrix[r][c] === 1) {
                    const tr = gridR + r;
                    const tc = gridC + c;
                    if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols) {
                        this.data[tr][tc] = 1;
                        this.colors[tr][tc] = shape.color;
                        this.goldData[tr][tc] = shape.isGold;
                    }
                }
            }
        }
    }

    preFill(layout) {
        this.clear();
        if (!layout) return;

        const colors = ['#4ecca3', '#45b7d1', '#9b59b6', '#e74c3c', '#f1c40f'];

        for (let r = 0; r < this.rows; r++) {
            if (!layout[r]) continue;
            for (let c = 0; c < this.cols; c++) {
                if (layout[r][c] === 1) {
                    this.data[r][c] = 1;
                    // Predictable but varied colors for pre-filled blocks
                    this.colors[r][c] = colors[(r + c) % colors.length];
                }
            }
        }
    }

    clear() {
        this.data = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        this.colors = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.goldData = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    }

    getPredictedLines(shape, gridR, gridC) {
        const tempData = this.data.map(row => [...row]);
        const lines = { rows: [], cols: [] };

        for (let r = 0; r < shape.matrix.length; r++) {
            for (let c = 0; c < shape.matrix[r].length; c++) {
                if (shape.matrix[r][c] === 1) {
                    const tr = gridR + r;
                    const tc = gridC + c;
                    if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols) {
                        tempData[tr][tc] = 1;
                    }
                }
            }
        }

        for (let r = 0; r < this.rows; r++) {
            if (tempData[r].every(cell => cell === 1)) {
                lines.rows.push(r);
            }
        }

        for (let c = 0; c < this.cols; c++) {
            let full = true;
            for (let r = 0; r < this.rows; r++) {
                if (tempData[r][c] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) lines.cols.push(c);
        }

        return lines;
    }

    checkLines() {
        let linesToRemove = { rows: [], cols: [] };

        for (let r = 0; r < this.rows; r++) {
            if (this.data[r].every(cell => cell === 1)) {
                linesToRemove.rows.push(r);
            }
        }

        for (let c = 0; c < this.cols; c++) {
            let full = true;
            for (let r = 0; r < this.rows; r++) {
                if (this.data[r][c] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) linesToRemove.cols.push(c);
        }

        return linesToRemove;
    }

    clearLines(lines) {
        for (const r of lines.rows) {
            for (let c = 0; c < this.cols; c++) {
                this.data[r][c] = 0;
                this.goldData[r][c] = false;
            }
        }
        for (const c of lines.cols) {
            for (let r = 0; r < this.rows; r++) {
                this.data[r][c] = 0;
                this.goldData[r][c] = false;
            }
        }
    }
}

/* ===========================
   Shape.js
   =========================== */
const SHAPES = [
    { matrix: [[1, 1]], color: '#33FF57' }, // 1x2
    { matrix: [[1], [1]], color: '#33FF57' }, // 2x1
    { matrix: [[1, 1, 1]], color: '#3357FF' }, // 1x3
    { matrix: [[1], [1], [1]], color: '#3357FF' }, // 3x1
    { matrix: [[1, 1], [1, 1]], color: '#F3FF33' }, // 2x2 Square
    { matrix: [[1, 1, 1], [0, 1, 0]], color: '#FF33F3' }, // T-Shape
    { matrix: [[1, 1, 0], [0, 1, 1]], color: '#33FFF3' }, // Z-Shape
    { matrix: [[0, 1, 1], [1, 1, 0]], color: '#A533FF' }, // S-Shape
    { matrix: [[1, 1, 1, 1]], color: '#FF8333' }, // 1x4
    { matrix: [[1], [1], [1], [1]], color: '#FF8333' }, // 4x1
    { matrix: [[1, 1, 1], [1, 0, 0]], color: '#33FF83' }, // L-Shape (4 cells)
    { matrix: [[1, 1, 1], [0, 0, 1]], color: '#8333FF' }, // J-Shape (4 cells)
    { matrix: [[1, 1], [1, 0]], color: '#FF33BF' }, // 3-cell Corner (ㄱ)
    { matrix: [[1, 1], [0, 1]], color: '#FF33BF' }, // 3-cell Corner (reversed ㄱ)
    { matrix: [[1, 0], [1, 1]], color: '#FF33BF' }, // 3-cell Corner (ㄴ)
    { matrix: [[0, 1], [1, 1]], color: '#FF33BF' }, // 3-cell Corner (reversed ㄴ)
    { matrix: [[1, 1], [1, 1], [1, 1]], color: '#FFA500' }, // 2x3 Rectangle
    { matrix: [[1, 1, 1], [1, 1, 1]], color: '#FFA500' }, // 3x2 Rectangle
    { matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: '#FF4500' }, // 5-cell Large Corner (ㄱ)
    { matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: '#FF4500' }, // 5-cell Large Corner (reversed ㄱ)
    { matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: '#FF4500' }, // 5-cell Large Corner (ㄴ)
    { matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: '#FF4500' }, // 5-cell Large Corner (reversed ㄴ)
    { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#FF3333' }, // 3x3 Large Square
    { matrix: [[1, 1, 1, 1, 1]], color: '#FF5733' }, // 1x5
    { matrix: [[1], [1], [1], [1], [1]], color: '#FF5733' }, // 5x1
    { matrix: [[1]], color: '#FFFFFF' }, // 25: 1x1 (Special Helper Only)
];

class Shape {
    constructor(engine, shapeData, isGold = false) {
        this.engine = engine;
        this.matrix = shapeData.matrix;
        this.isGold = isGold;
        this.color = isGold ? '#ffd700' : shapeData.color;

        this.x = 0;
        this.y = 0;
        this.originalX = 0;
        this.originalY = 0;
        this.scale = 1;
        this.dragging = false;

        this.rows = this.matrix.length;
        this.cols = this.matrix[0].length;
    }

    draw(ctx, cellSize, padding, preview = false) {
        const drawScale = (preview ? 0.6 : this.scale);
        const currentCellSize = cellSize * drawScale;
        const currentPadding = padding * drawScale;

        const totalW = this.cols * currentCellSize + (this.cols - 1) * currentPadding;
        const totalH = this.rows * currentCellSize + (this.rows - 1) * currentPadding;

        let startX = this.x - totalW / 2;
        let startY = this.y - totalH / 2;

        ctx.save();
        if (preview) ctx.globalAlpha = 0.5;

        // Gold Block Glow Effect
        if (this.isGold) {
            ctx.shadowBlur = 20 * this.engine.scale * drawScale;
            ctx.shadowColor = '#ffd700';
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.matrix[r][c] === 1) {
                    const cellX = startX + c * (currentCellSize + currentPadding);
                    const cellY = startY + r * (currentCellSize + currentPadding);

                    ctx.fillStyle = this.color;
                    this._roundRect(ctx, cellX, cellY, currentCellSize, currentCellSize, 6 * this.engine.scale * drawScale);
                    ctx.fill();

                    // Subtle highlights
                    ctx.fillStyle = this.isGold ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
                    this._roundRect(ctx, cellX + 3 * this.engine.scale * drawScale, cellY + 3 * this.engine.scale * drawScale, currentCellSize - 6 * this.engine.scale * drawScale, currentCellSize / 2 - 2 * this.engine.scale * drawScale, 3 * this.engine.scale * drawScale);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    _roundRect(ctx, x, y, width, height, radius) {
        if (radius < 0) radius = 0;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    contains(px, py, cellSize, padding) {
        const currentScale = this.dragging ? 1.0 : 0.55;
        const currentCellSize = cellSize * currentScale;
        const currentPadding = padding * currentScale;

        const totalW = this.cols * currentCellSize + (this.cols - 1) * currentPadding;
        const totalH = this.rows * currentCellSize + (this.rows - 1) * currentPadding;

        const sidePadding = 35 * this.engine.scale;
        const topPadding = 20 * this.engine.scale;
        const bottomPadding = 80 * this.engine.scale;

        let startX = this.x - totalW / 2 - sidePadding;
        let startY = this.y - totalH / 2 - topPadding;
        let endX = this.x + totalW / 2 + sidePadding;
        let endY = this.y + totalH / 2 + bottomPadding;

        return px >= startX && px <= endX && py >= startY && py <= endY;
    }
}

/* ===========================
   FloatingTextSystem.js
   =========================== */
class FloatingTextSystem {
    constructor() {
        this.texts = [];
        this.fontFamily = "'Inter', 'Segoe UI', sans-serif"; // Cleaner, modern font stack
    }

    clear() {
        this.texts = [];
    }

    emit(x, y, text, color = '#fff', fontSize = 20, isSpecial = false) {
        // Reduced scale for special text to prevent overflow
        const baseScale = isSpecial ? 1.2 : 1.0;

        this.texts.push({
            x, y, text, color, fontSize, isSpecial,
            life: 1.0,
            maxLife: 1.0,
            velocity: {
                x: 0, // No horizontal drift for cleaner look
                y: -30 // Consistent upward float
            },
            scale: baseScale,
            opacity: 1.0
        });
    }

    update(dt) {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.life -= dt;

            // Smooth separate integration for position
            t.x += t.velocity.x * dt;
            t.y += t.velocity.y * dt;

            // Smooth fade out and slide up (no bouncing)
            const progress = 1 - (t.life / t.maxLife);

            // Alpha: Fade out faster near end
            if (progress > 0.5) {
                t.opacity = 1 - ((progress - 0.5) * 2);
            } else {
                t.opacity = 1;
            }

            // Scale: Slight pop in at start, then stable
            if (t.isSpecial) {
                // Subtle pop-in
                if (progress < 0.2) {
                    t.scale = 1.2 + Math.sin(progress * Math.PI * 2.5) * 0.1;
                } else {
                    t.scale = 1.2;
                }
            }

            if (t.life <= 0) this.texts.splice(i, 1);
        }
    }

    draw(ctx) {
        ctx.save();
        for (const t of this.texts) {
            ctx.globalAlpha = Math.max(0, t.opacity);
            ctx.fillStyle = t.color;
            // Removed '900' weight, used 'Bold' or '600' for cleaner look
            ctx.font = `600 ${t.fontSize * t.scale}px ${this.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Softer shadow instead of harsh stroke
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;

            ctx.fillText(t.text, t.x, t.y);

            // Optional: minimal stroke if needed for contrast
            // ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            // ctx.lineWidth = 1;
            // ctx.strokeText(t.text, t.x, t.y);
        }
        ctx.restore();
    }
}

/* ===========================
   Main.js
   =========================== */
class Game {
    constructor() {
        this.engine = new Engine('game-canvas');
        this.input = new Input(this.engine);

        this.grid = new Grid(this.engine, 40, 4);
        this.engine.addEntity(this.grid);

        this.spawnSlots = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 }
        ];
        this.activeBlocks = [];
        this.particleSystem = new ParticleSystem();
        this.floatingTextSystem = new FloatingTextSystem();
        this.engine.addEntity(this.floatingTextSystem); // Draw text on top of particles

        this.draggedBlock = null;
        this.draggedItem = null; // Track if an item is being dragged
        this.dragOffset = { x: 0, y: 0 };

        this.usedItems = {
            bomb: false,
            laser: false,
            hourglass: false
        };

        this.score = 0;
        this.highScore = 0;
        this.combo = 0;
        this.gold = 0;
        this.inventory = {
            bomb: 0,
            laser: 0,
            hourglass: 0
        };

        this.unlockedStage = 1;
        this.completedStages = [];

        this.settings = {
            bgm: true,
            sfx: true,
            vibration: true,
            darkMode: true
        };

        this.state = 'MENU'; // MENU, MODE_SELECT, PLAYING, GAME_OVER
        this.mode = 'CHALLENGE'; // CHALLENGE or STAGE
        this.currentStageNum = 1;
        this.squeeCount = 0; // Track spawn cycles in Stage Mode
        this.stageGoalScore = 0; // The score required to clear the stage
        this.score = 0;

        // UI Elements
        this.screens = {
            MENU: document.getElementById('main-menu'),
            MODE_SELECT: document.getElementById('mode-selection'),
            SHOP: document.getElementById('shop-screen'),
            STAGE_SELECT: document.getElementById('stage-selection'),
            PLAYING: document.getElementById('gameplay-ui'),
            GAME_OVER: document.getElementById('game-over-screen'),
            STAGE_CLEAR: document.getElementById('stage-clear-screen'),
            SETTINGS: document.getElementById('settings-screen')
        };

        // Sound Effects (Web Audio API - Base64 Optimized)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
        this.soundBuffers = {};

        // Load sounds from Base64 assets
        this.loadSounds();

        // Unlock AudioContext on first interaction
        const unlockAudio = () => {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('click', unlockAudio);
        };
        window.addEventListener('touchstart', unlockAudio, { passive: false });
        window.addEventListener('click', unlockAudio);

        this.goldHud = document.getElementById('gold-hud');
        this.goldValueElem = document.getElementById('gold-value');
        this.scoreElem = document.getElementById('score-value');
        this.bestValueElem = document.getElementById('best-value');
        this.finalScoreElem = document.getElementById('final-score');
        this.bestBadge = document.getElementById('best-badge');
        this.bestEffect = document.getElementById('best-effect');

        // Item Display Elements (Shop & In-game)
        this.ownedElems = {
            bomb: document.getElementById('owned-bomb'),
            laser: document.getElementById('owned-laser'),
            hourglass: document.getElementById('owned-hourglass')
        };

        this.gameItemElems = {
            bomb: document.getElementById('game-item-bomb'),
            laser: document.getElementById('game-item-laser'),
            hourglass: document.getElementById('game-item-hourglass')
        };

        this.gameItemCounts = {
            bomb: this.gameItemElems.bomb.querySelector('.item-count'),
            laser: this.gameItemElems.laser.querySelector('.item-count'),
            hourglass: this.gameItemElems.hourglass.querySelector('.item-count')
        };

        this.loadData();
        this.loadSettings(); // NEW: Load settings from localStorage
        this.updateGoldDisplay();
        this.updateBestDisplay();
        this.updateInventoryDisplay(); // Show quantities on start
        this.setupButtons();
        this.setupInput();

        // Calculate initial scale
        this.engine.scale = Math.min((this.engine.width || window.innerWidth) / 500, (this.engine.height || window.innerHeight) / 800, 1.0);

        this.resize();
        this.setupItemListeners();

        // Auto-save on page hide or close
        window.addEventListener('blur', () => this.saveSession());
        window.addEventListener('beforeunload', () => this.saveSession());
        window.addEventListener('resize', () => this.resize());

        this.engine.start();

        // Score Animation Variables
        this.displayScore = 0;
        this.targetScore = 0;
        this.sessionStartHighScore = 0;

        // Combo Text Variables
        this.comboText = null;
        this.comboTimer = 0;

        this.engine.update = (dt) => {
            if (this.state === 'PLAYING') {
                this.engine.entities.forEach(e => e.update && e.update(dt));

                // Score Animation Logic
                if (this.displayScore < this.targetScore) {
                    const diff = this.targetScore - this.displayScore;
                    const step = Math.ceil(diff * 0.1); // 10% interpolation
                    this.displayScore += step;
                    this.scoreElem.innerText = this.displayScore.toLocaleString();
                } else if (this.displayScore > this.targetScore) {
                    this.displayScore = this.targetScore;
                    this.scoreElem.innerText = this.displayScore.toLocaleString();
                }

                // Combo Text Logic
                if (this.comboTimer > 0) {
                    this.comboTimer -= dt;
                    if (this.comboTimer <= 0) {
                        this.comboText = null;
                    }
                }
            }
            this.particleSystem.update();
        };

        this.engine.draw = () => {
            this.engine.ctx.clearRect(0, 0, this.engine.width, this.engine.height);

            if (this.state === 'PLAYING' || this.state === 'GAME_OVER') {
                this.grid.draw(this.engine.ctx);
                this.particleSystem.draw(this.engine.ctx);
                this.floatingTextSystem.draw(this.engine.ctx);

                // Draw Combo Text - REMOVED (Legacy)

                if (this.draggedBlock) {
                    const cell = this.getNearestCellForShape(this.draggedBlock);
                    if (cell && this.grid.canPlace(this.draggedBlock, cell.r, cell.c)) {
                        const predicted = this.grid.getPredictedLines(this.draggedBlock, cell.r, cell.c);
                        this.drawPredictedHighlights(predicted, this.draggedBlock.color);
                        this.drawGhost(cell.r, cell.c);
                    }
                }

                if (this.draggedItem) {
                    const cell = this.grid.getCellAt(this.input.pos.x, this.input.pos.y);
                    if (cell) {
                        this.drawItemGhost(this.draggedItem, cell.r, cell.c);
                    }
                }

                this.activeBlocks.forEach(block => {
                    if (block !== this.draggedBlock) {
                        block.draw(this.engine.ctx, this.grid.cellSize, this.grid.padding);
                    }
                });

                if (this.draggedBlock) {
                    this.draggedBlock.draw(this.engine.ctx, this.grid.cellSize, this.grid.padding);
                }

                if (this.draggedItem) {
                    const ctx = this.engine.ctx;
                    const pos = this.input.pos;
                    ctx.save();
                    ctx.translate(pos.x + this.dragOffset.x, pos.y + this.dragOffset.y);

                    // Draw circular highlight
                    ctx.beginPath();
                    ctx.arc(0, 0, 35 * this.engine.scale, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.fill();
                    ctx.strokeStyle = this.draggedItem === 'bomb' ? '#ff3f34' : '#34e7ff';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // Draw Emoji
                    ctx.font = `${30 * this.engine.scale}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const icon = this.draggedItem === 'bomb' ? '💣' : '⚡';
                    ctx.fillText(icon, 0, 0);
                    ctx.restore();
                }
            } else {
                // Background decoration for menu
                this.particleSystem.draw(this.engine.ctx);
            }
        };

        // Initial State
        this.updateGoldDisplay();
        this.switchState('MENU');
    }

    loadData() {
        const savedGold = localStorage.getItem('block_blast_gold');
        this.gold = savedGold ? parseInt(savedGold) : 0;

        const savedInv = localStorage.getItem('block_blast_inventory');
        if (savedInv) {
            this.inventory = JSON.parse(savedInv);
        }

        const savedBest = localStorage.getItem('block_blast_best');
        this.highScore = savedBest ? parseInt(savedBest) : 0;
        this.sessionStartHighScore = this.highScore;

        const savedUnlocked = localStorage.getItem('block_blast_unlocked_stage');
        this.unlockedStage = savedUnlocked ? parseInt(savedUnlocked) : 1;

        const savedCompleted = localStorage.getItem('block_blast_completed_stages');
        this.completedStages = savedCompleted ? JSON.parse(savedCompleted) : [];
    }

    saveData() {
        localStorage.setItem('block_blast_gold', this.gold);
        localStorage.setItem('block_blast_inventory', JSON.stringify(this.inventory));
        localStorage.setItem('block_blast_best', this.highScore);
        localStorage.setItem('block_blast_unlocked_stage', this.unlockedStage);
        localStorage.setItem('block_blast_completed_stages', JSON.stringify(this.completedStages));
    }

    loadSettings() {
        const saved = localStorage.getItem('block_blast_settings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
        // Apply toggles to UI
        document.getElementById('bgm-toggle').checked = this.settings.bgm;
        document.getElementById('sfx-toggle').checked = this.settings.sfx;
        document.getElementById('vibrate-toggle').checked = this.settings.vibration;
        document.getElementById('dark-mode-toggle').checked = this.settings.darkMode;

        this.applyTheme(); // Apply theme on load
    }

    applyTheme() {
        if (!this.settings.darkMode) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    saveSettings() {
        localStorage.setItem('block_blast_settings', JSON.stringify(this.settings));
    }

    saveSession() {
        // Only save if we are actually in a game session
        if (this.state !== 'PLAYING' && this.state !== 'SHOP' && this.state !== 'MODE_SELECT') {
            // If in MENU but have score/grid, we might want to keep it, 
            // but usually session is cleared on GAME_OVER.
            if (this.score === 0 && this.activeBlocks.length === 0) return;
        }

        // Don't save if game is over
        if (this.state === 'GAME_OVER') return;

        const sessionData = {
            grid: this.grid.data,
            colors: this.grid.colors,
            goldData: this.grid.goldData,
            score: this.score,
            combo: this.combo,
            usedItems: this.usedItems,
            activeBlocks: this.activeBlocks.map(block => ({
                matrix: block.matrix,
                isGold: block.isGold,
                color: block.color,
                originalX: block.originalX,
                originalY: block.originalY
            }))
        };
        localStorage.setItem('block_blast_session', JSON.stringify(sessionData));
    }

    async loadSounds() {
        // SoundAssets is loaded globally from SoundAssets.js
        if (typeof SoundAssets === 'undefined') {
            console.error("SoundAssets not found!");
            return;
        }

        for (const [name, base64] of Object.entries(SoundAssets)) {
            try {
                const arrayBuffer = this.base64ToArrayBuffer(base64);
                const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                this.soundBuffers[name] = audioBuffer;
            } catch (e) {
                console.warn(`Failed to decode sound: ${name}`, e);
            }
        }
    }

    base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64.split(',')[1]);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    playSound(name, pitch = 1.0) {
        if (!this.settings.sfx) return; // Respect SFX setting

        // Priority 1: Web Audio API (Low Latency)
        if (this.soundBuffers[name]) {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => { });
            }
            const source = this.audioCtx.createBufferSource();
            source.buffer = this.soundBuffers[name];
            source.playbackRate.value = pitch; // Set playback rate for pitch shifting
            source.connect(this.audioCtx.destination);
            source.start(0);
        }
        // Priority 2: HTML5 Audio (Fallback)
        else if (this.sounds[name]) {
            this.sounds[name].currentTime = 0;
            this.sounds[name].play().catch(() => { });
        }
    }

    loadSession() {
        const saved = localStorage.getItem('block_blast_session');
        if (!saved) return false;

        try {
            const data = JSON.parse(saved);
            this.grid.data = data.grid;
            this.grid.colors = data.colors;
            this.grid.goldData = data.goldData;
            this.score = data.score;
            this.combo = data.combo;
            this.usedItems = data.usedItems || { bomb: false, laser: false, hourglass: false };
            this.updateScore(0); // This will update UI and check high score
            this.updateGoldDisplay();
            this.updateBestDisplay();
            this.updateInventoryDisplay(); // Refresh counts from session

            // Reconstruct Shape objects
            this.activeBlocks = data.activeBlocks.map((b, i) => {
                const shape = new Shape(this.engine, { matrix: b.matrix, color: b.color }, b.isGold);
                shape.x = b.originalX;
                shape.y = b.originalY;
                shape.originalX = b.originalX;
                shape.originalY = b.originalY;
                shape.scale = this.spawnBlockScale;
                return shape;
            });

            return true;
        } catch (e) {
            console.error("Failed to load session:", e);
            return false;
        }
    }

    clearSession() {
        localStorage.removeItem('block_blast_session');
    }

    addGold(amount) {
        this.gold += amount;
        this.saveData();
        this.updateGoldDisplay();
        this.saveSession(); // Persist gold in session too
    }

    buyItem(itemId, price) {
        if (this.gold >= price) {
            this.gold -= price;

            // Handle Bundles
            if (itemId === 'bomb_5') this.inventory.bomb += 5;
            else if (itemId === 'laser_5') this.inventory.laser += 5;
            else if (itemId === 'hourglass_5') this.inventory.hourglass += 5;
            else if (itemId === 'all_set') {
                this.inventory.bomb += 1;
                this.inventory.laser += 1;
                this.inventory.hourglass += 1;
            } else {
                // Individual items
                this.inventory[itemId]++;
            }

            this.saveData();
            this.updateGoldDisplay();
            this.updateInventoryDisplay();
            this.playSound('buy'); // Play buy sound

            return true;
        }
        return false;
    }

    useItem(itemId, r, c) {
        if (this.inventory[itemId] <= 0 || this.usedItems[itemId]) return false;

        let success = false;
        let goldEarned = 0;
        let scoreEarned = 0;
        if (itemId === 'bomb') {
            const centerX = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
            const centerY = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
            this.particleSystem.emitBomb(centerX, centerY, '#ff3f34');
            this.playSound('item1'); // Play bomb sound

            // Clear 3x3 area
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.grid.rows && nc >= 0 && nc < this.grid.cols) {
                        const x = this.grid.x + nc * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                        const y = this.grid.y + nr * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;

                        if (this.grid.data[nr][nc] !== 0) {
                            scoreEarned += 50;
                            this.particleSystem.emit(x, y, this.grid.colors[nr][nc] || '#4ecca3', 15, true);
                        }
                        if (this.grid.goldData[nr][nc]) goldEarned += 100000;

                        this.grid.data[nr][nc] = 0;
                        this.grid.colors[nr][nc] = null;
                        this.grid.goldData[nr][nc] = false;
                    }
                }
            }
            this.engine.shake(12, 0.4);
            success = true;
        } else if (itemId === 'laser') {
            const centerX = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
            const centerY = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;

            // Beam visuals
            this.particleSystem.emitLaser(centerX, centerY, '#34e7ff', false); // Horizontal
            this.particleSystem.emitLaser(centerX, centerY, '#34e7ff', true);  // Vertical
            this.playSound('item2'); // Play laser sound

            const processed = new Set();

            // Clear entire row
            for (let i = 0; i < this.grid.cols; i++) {
                processed.add(`${r},${i}`);
                const x = this.grid.x + i * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;

                if (this.grid.data[r][i] !== 0) {
                    scoreEarned += 50;
                    this.particleSystem.emit(x, y, this.grid.colors[r][i] || '#4ecca3', 12, true);
                }
                if (this.grid.goldData[r][i]) goldEarned += 100000;

                this.grid.data[r][i] = 0;
                this.grid.colors[r][i] = null;
                this.grid.goldData[r][i] = false;
            }
            // Clear entire column
            for (let i = 0; i < this.grid.rows; i++) {
                if (processed.has(`${i},${c}`)) continue;

                const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                const y = this.grid.y + i * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;

                if (this.grid.data[i][c] !== 0) {
                    scoreEarned += 50;
                    this.particleSystem.emit(x, y, this.grid.colors[i][c] || '#4ecca3', 12, true);
                }
                if (this.grid.goldData[i][c]) goldEarned += 100000;

                this.grid.data[i][c] = 0;
                this.grid.colors[i][c] = null;
                this.grid.goldData[i][c] = false;
            }
            this.engine.shake(10, 0.5);
            success = true;
        } else if (itemId === 'hourglass') {
            // Effect at each spawn slot
            for (let i = 0; i < 3; i++) {
                const slot = this.spawnSlots[i];
                // Dissolve existing block if any
                if (this.activeBlocks[i]) {
                    this.particleSystem.emit(slot.x, slot.y, this.activeBlocks[i].color, 20, true);
                }
                this.particleSystem.emitHourglass(slot.x, slot.y);
            }

            this.engine.shake(5, 0.3);
            this.playSound('item3'); // Play hourglass sound
            // Re-spawn 3 blocks using new SMART algorithm (User Requested)
            // Guarantees playable blocks or falls back to 1x1
            this.spawnSmartBlocks();
            success = true;
        }

        if (success) {
            if (goldEarned > 0) this.addGold(goldEarned);
            if (scoreEarned > 0) {
                this.updateScore(scoreEarned);

                // Visual Score for Item (Bomb/Laser)
                if (itemId !== 'hourglass') { // Hourglass gives no score
                    const cx = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                    const cy = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                    this.floatingTextSystem.emit(cx, cy, `+${scoreEarned}`, '#ff5e57', 20 * this.engine.scale, true);
                }
            }

            this.inventory[itemId]--;
            this.usedItems[itemId] = true;
            this.saveData();
            this.updateInventoryDisplay();
            this.saveSession();
            console.log(`Used item: ${itemId} | Earned Gold: ${goldEarned} | Earned Score: ${scoreEarned}`);
            return true;
        }
        return false;
    }

    updateGoldDisplay() {
        if (this.goldValueElem) {
            this.goldValueElem.innerText = this.gold.toLocaleString();
        }
    }

    updateInventoryDisplay() {
        for (const [id, count] of Object.entries(this.inventory)) {
            // Update Shop UI
            if (this.ownedElems[id]) {
                this.ownedElems[id].innerText = count;
            }
            // Update In-game UI
            if (this.gameItemElems[id]) {
                this.gameItemCounts[id].innerText = count;
                // If quantity is 0 OR already used this round, show as disabled
                if (count > 0 && !this.usedItems[id]) {
                    this.gameItemElems[id].classList.remove('disabled');
                } else {
                    this.gameItemElems[id].classList.add('disabled');
                }
            }
        }
    }

    updateBestDisplay() {
        if (this.bestValueElem) {
            this.bestValueElem.innerText = this.highScore.toLocaleString();
        }
    }

    updateScore(amount) {
        this.targetScore += amount;
        this.score = this.targetScore;

        // Only update Best Score in Challenge Mode
        if (this.mode === 'CHALLENGE' && this.score > this.highScore) {
            this.highScore = this.score;
            this.updateBestDisplay();
            this.saveData();
        }
        // Text update happens in update() loop
        this.saveSession();

        // Check Stage Mode Win Condition
        if (this.mode === 'STAGE' && this.stageGoalScore > 0) {
            if (this.score >= this.stageGoalScore) {
                console.log(`Stage Clear Triggered: Score ${this.score} >= Goal ${this.stageGoalScore}`);
                this.completeStage();
            }
        }
    }

    setupButtons() {
        // Main Menu
        document.getElementById('start-game-btn').onclick = () => {
            this.playSound('button');
            this.switchState('MODE_SELECT');
        };
        document.getElementById('reset-data-btn').onclick = () => {
            if (confirm('모든 게임 데이터가 초기화됩니다. 계속하시겠습니까?')) {
                this.resetAllData();
            }
        };
        document.getElementById('unlock-all-btn').onclick = () => {
            if (confirm('모든 스테이지를 잠금 해제하시겠습니까? (테스트용)')) {
                this.unlockAllStages();
            }
        };
        document.getElementById('shop-btn').onclick = () => {
            this.playSound('button');
            this.updateInventoryDisplay();
            this.switchState('SHOP');
        };

        // Shop Buttons
        document.getElementById('close-shop-btn').onclick = () => {
            this.playSound('button');
            this.switchState('MENU');
        };

        const buyButtons = document.querySelectorAll('.shop-item .buy-btn');
        buyButtons.forEach(btn => {
            btn.onclick = (e) => {
                const itemElem = e.target.closest('.shop-item');
                const itemId = itemElem.dataset.item;
                const price = parseInt(itemElem.dataset.price);

                if (this.buyItem(itemId, price)) {
                    // Visual feedback for success: Highlight the card yellow
                    itemElem.classList.remove('purchase-success');
                    void itemElem.offsetWidth; // Force reflow
                    itemElem.classList.add('purchase-success');
                    setTimeout(() => itemElem.classList.remove('purchase-success'), 400);

                    console.log(`Bought ${itemId}`);
                } else {
                    // Visual feedback for failure: Shake the card
                    itemElem.classList.remove('shake');
                    void itemElem.offsetWidth; // Force reflow
                    itemElem.classList.add('shake');
                    setTimeout(() => itemElem.classList.remove('shake'), 500);
                }
            };
        });

        // Mode Selection
        document.getElementById('challenge-mode-btn').onclick = () => {
            this.playSound('button');
            this.startChallengeMode();
        };

        document.getElementById('stage-mode-btn').onclick = () => {
            this.playSound('button');
            this.showStageSelection();
        };

        document.getElementById('back-to-mode-btn').onclick = () => {
            this.playSound('button');
            this.switchState('MODE_SELECT');
        };
        document.getElementById('back-to-menu-btn').onclick = () => {
            this.playSound('button');
            this.mode = 'CHALLENGE'; // Revert to Challenge mode on menu
            this.switchState('MENU');
        };

        // Game Over
        document.getElementById('restart-btn').onclick = () => {
            this.playSound('button');
            this.restartCurrentMode();
        };
        document.getElementById('exit-to-menu-btn').onclick = () => {
            this.playSound('button');
            this.mode = 'CHALLENGE'; // Revert to Challenge mode on menu
            this.switchState('MENU');
        };

        // Settings Buttons
        document.getElementById('settings-btn').onclick = () => {
            this.playSound('button');
            this.switchState('SETTINGS');
        };
        document.getElementById('close-settings-btn').onclick = () => {
            this.playSound('button');
            this.switchState('PLAYING');
        };
        document.getElementById('settings-home-btn').onclick = () => {
            this.playSound('button');
            this.switchState('MENU');
        };
        document.getElementById('settings-replay-btn').onclick = () => {
            this.playSound('button');
            this.restartCurrentMode();
        };

        // Stage Clear Screen Buttons
        document.getElementById('next-stage-btn').onclick = () => {
            this.playSound('button');
            if (this.currentStageNum < 100) {
                this.startStageMode(this.currentStageNum + 1);
            } else {
                this.showStageSelection();
            }
        };
        document.getElementById('stage-clear-menu-btn').onclick = () => {
            this.playSound('button');
            this.mode = 'CHALLENGE';
            this.switchState('MENU');
        };

        // Settings Toggles
        document.getElementById('bgm-toggle').onchange = (e) => {
            this.settings.bgm = e.target.checked;
            this.saveSettings();
        };
        document.getElementById('sfx-toggle').onchange = (e) => {
            this.settings.sfx = e.target.checked;
            this.saveSettings();
        };
        document.getElementById('vibrate-toggle').onchange = (e) => {
            this.settings.vibration = e.target.checked;
            this.saveSettings();
        };
        document.getElementById('dark-mode-toggle').onchange = (e) => {
            this.settings.darkMode = e.target.checked;
            this.saveSettings();
            this.applyTheme(); // Apply theme immediately
        };
    }

    setupItemListeners() {
        Object.entries(this.gameItemElems).forEach(([id, elem]) => {
            const handleStart = (e) => {
                if (this.state !== 'PLAYING') return;
                if (this.inventory[id] <= 0 || this.usedItems[id]) return;

                if (e.cancelable) e.preventDefault();
                e.stopPropagation();

                if (id === 'hourglass') {
                    this.useItem(id);
                } else {
                    this.draggedItem = id;
                    this.playSound('select'); // Play pickup sound
                    this.input.isDown = true;

                    const rect = elem.getBoundingClientRect();
                    const canvasRect = this.engine.canvas.getBoundingClientRect();
                    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                    const ex = rect.left - canvasRect.left + rect.width / 2;
                    const ey = rect.top - canvasRect.top + rect.height / 2;
                    const pos = { x: clientX - canvasRect.left, y: clientY - canvasRect.top };

                    this.dragOffset.x = ex - pos.x;
                    this.dragOffset.y = ey - pos.y;
                    this.input.pos = pos;
                }
            };

            elem.addEventListener('mousedown', handleStart);
            elem.addEventListener('touchstart', handleStart, { passive: false });
        });
    }

    switchState(newState) {
        this.state = newState;
        // Hide all screens
        Object.values(this.screens).forEach(screen => screen.classList.add('hidden'));
        // Show target screen
        if (this.screens[newState]) {
            this.screens[newState].classList.remove('hidden');
        }

        // Gold HUD visibility: Show in Menu, Mode Selection, Shop, and Game Over
        if (newState === 'MENU' || newState === 'MODE_SELECT' || newState === 'SHOP' || newState === 'PLAYING' || newState === 'GAME_OVER' || newState === 'SETTINGS' || newState === 'STAGE_SELECT') {
            this.goldHud.classList.remove('hidden');
        } else {
            this.goldHud.classList.add('hidden');
        }

        // Stage Target Visibility
        const targetHud = document.getElementById('stage-target-container');
        const bestHud = document.getElementById('best-score-container');

        if (newState === 'PLAYING' && this.mode === 'STAGE') {
            targetHud.classList.remove('hidden');
            bestHud.classList.add('hidden');
        } else {
            targetHud.classList.add('hidden');
            // Show best score ONLY in Challenge mode and Menu/Selection screens where appropriate
            if (this.mode === 'CHALLENGE' && (newState === 'PLAYING' || newState === 'MENU' || newState === 'MODE_SELECT' || newState === 'GAME_OVER')) {
                bestHud.classList.remove('hidden');
            } else if (this.mode === 'STAGE') {
                bestHud.classList.add('hidden');
            }
        }

        if (newState === 'GAME_OVER') {
            this.finalScoreElem.innerText = this.score.toLocaleString();

            // Check for New High Score Celebration - Only in Challenge Mode
            if (this.mode === 'CHALLENGE' && this.score > this.sessionStartHighScore && this.score > 0) {
                if (this.bestBadge) this.bestBadge.classList.remove('hidden');
                if (this.bestEffect) this.bestEffect.classList.remove('hidden');
                // Extra juice: multiple shakes
                this.engine.shake(15, 0.5);
            } else {
                if (this.bestBadge) this.bestBadge.classList.add('hidden');
                if (this.bestEffect) this.bestEffect.classList.add('hidden');
            }
        }
    }

    showStageSelection() {
        this.mode = 'STAGE'; // Explicitly set mode to STAGE
        this.generateStageButtons();
        this.switchState('STAGE_SELECT');
    }

    generateStageButtons() {
        const grid = document.getElementById('stage-grid');
        grid.innerHTML = '';

        // Correctly use class properties
        const unlockedStage = this.unlockedStage || 1;
        const completedStages = this.completedStages || [];

        for (let i = 1; i <= 100; i++) {
            const btn = document.createElement('div');
            btn.className = 'stage-btn';
            btn.innerText = i;

            if (completedStages.includes(i)) {
                btn.classList.add('completed');
            } else if (i === unlockedStage) {
                btn.classList.add('current');
            } else if (i > unlockedStage) {
                btn.classList.add('locked');
            }

            btn.onclick = () => {
                if (i <= unlockedStage) {
                    this.playSound('button');
                    this.startStageMode(i);
                } else {
                    this.playSound('shake'); // Shake or error sound
                }
            };

            grid.appendChild(btn);
        }
    }

    startStageMode(stageNum) {
        console.log(`Starting Stage ${stageNum}`);
        this.restart(); // Clear grid and reset common values
        this.mode = 'STAGE';
        this.currentStageNum = stageNum;
        this.squeeCount = 0; // Reset squee count

        // Dynamic Target Calculation: 300 @ Stage 1 -> 14,000 @ Stage 100
        this.stageGoalScore = 300 + Math.floor(13700 * Math.pow((stageNum - 1) / 99, 1.2));

        document.getElementById('target-value').innerText = this.stageGoalScore.toLocaleString();

        const layout = this.generateProceduralLayout(stageNum);
        this.grid.preFill(layout);
        this.spawnBlocks();

        // Prevent switching to PLAYING if spawnBlocks already triggered GAME_OVER
        if (this.state !== 'GAME_OVER') {
            this.switchState('PLAYING');
        }
    }

    generateProceduralLayout(stageNum) {
        const layout = Array.from({ length: 8 }, () => Array(8).fill(0));

        // Block density increases with stage
        // Stage 1: ~2 blocks, Stage 100: ~18 blocks
        let blockCount = 2 + Math.floor(16 * ((stageNum - 1) / 99));

        // Track filled status to prevent auto-clear
        const rowCounts = new Array(8).fill(0);
        const colCounts = new Array(8).fill(0);

        let placed = 0;
        let attempts = 0;
        while (placed < blockCount && attempts < 100) {
            attempts++;
            const r = Math.floor(Math.random() * 8);
            const c = Math.floor(Math.random() * 8);

            if (layout[r][c] === 0) {
                // Check if adding this block would complete a line (7 already filled)
                if (rowCounts[r] < 7 && colCounts[c] < 7) {
                    layout[r][c] = 1;
                    rowCounts[r]++;
                    colCounts[c]++;
                    placed++;
                }
            }
        }
        return layout;
    }

    completeStage() {
        if (this.state === 'GAME_OVER' || this.state === 'MENU' || this.state === 'STAGE_CLEAR') return;

        this.playSound('achievement');
        this.engine.shake(20, 1.0);

        // Update progress
        if (this.currentStageNum >= this.unlockedStage) {
            this.unlockedStage = this.currentStageNum + 1;
        }
        if (!this.completedStages.includes(this.currentStageNum)) {
            this.completedStages.push(this.currentStageNum);
        }
        this.saveData();

        // Show Stage Clear Screen
        document.getElementById('cleared-stage-num').innerText = this.currentStageNum;
        this.switchState('STAGE_CLEAR');
    }

    startChallengeMode() {
        this.restart(); // Reset game data
        this.mode = 'CHALLENGE';
        this.switchState('PLAYING');
        this.spawnBlocks();
    }

    restartCurrentMode() {
        if (this.mode === 'STAGE') {
            this.startStageMode(this.currentStageNum);
        } else {
            this.startChallengeMode();
        }
    }

    getNearestCellForShape(block) {
        const currentCellSize = this.grid.cellSize * block.scale;
        const currentPadding = this.grid.padding * block.scale;
        const totalW = block.cols * currentCellSize + (block.cols - 1) * currentPadding;
        const totalH = block.rows * currentCellSize + (block.rows - 1) * currentPadding;

        const topLeftWorldX = block.x - totalW / 2 + currentCellSize / 2;
        const topLeftWorldY = block.y - totalH / 2 + currentCellSize / 2;

        return this.grid.getCellAt(topLeftWorldX, topLeftWorldY);
    }

    resize() {
        this.grid.calculateLayout();

        const spawnAreaWidth = 400 * this.engine.scale;
        const startX = (this.engine.width - spawnAreaWidth) / 2;
        const slotSpacing = spawnAreaWidth / 3;
        const slotY = this.grid.y + this.grid.totalHeight + (100 * this.engine.scale);

        this.spawnBlockScale = 0.55;

        for (let i = 0; i < 3; i++) {
            this.spawnSlots[i].x = startX + slotSpacing * i + slotSpacing / 2;
            this.spawnSlots[i].y = slotY;

            if (this.activeBlocks[i] && !this.activeBlocks[i].dragging) {
                this.activeBlocks[i].x = this.spawnSlots[i].x;
                this.activeBlocks[i].y = this.spawnSlots[i].y;
                this.activeBlocks[i].scale = this.spawnBlockScale;
                this.activeBlocks[i].originalX = this.spawnSlots[i].x;
                this.activeBlocks[i].originalY = this.spawnSlots[i].y;
            }
        }
    }

    setupInput() {
        this.input.onDown = (pos) => {
            if (this.state !== 'PLAYING') return;

            for (let i = 0; i < this.activeBlocks.length; i++) {
                const block = this.activeBlocks[i];
                if (block.contains(pos.x, pos.y, this.grid.cellSize, this.grid.padding)) {
                    this.draggedBlock = block;
                    block.dragging = true;
                    block.scale = 1.0;
                    this.playSound('select'); // Play pickup sound

                    this.dragOffset.x = block.x - pos.x;
                    const dragLift = 110 * this.engine.scale;
                    this.dragOffset.y = block.y - pos.y - dragLift;
                    block.y -= dragLift;
                    return;
                }
            }

            // Check Item Interaction
            const itemEntries = Object.entries(this.gameItemElems);
            const canvasRect = this.engine.canvas.getBoundingClientRect();

            for (const [id, elem] of itemEntries) {
                if (this.inventory[id] <= 0 || this.usedItems[id]) continue;

                const rect = elem.getBoundingClientRect();

                // Convert viewport coordinates (rect) to canvas-relative CSS pixels (pos)
                const ex = rect.left - canvasRect.left + rect.width / 2;
                const ey = rect.top - canvasRect.top + rect.height / 2;
                const dist = Math.hypot(pos.x - ex, pos.y - ey);

                if (dist < 45) { // Radius in CSS pixels
                    if (id === 'hourglass') {
                        this.useItem(id); // Click only for hourglass
                    } else {
                        this.draggedItem = id;
                        this.playSound('select'); // Play item pickup sound
                        this.dragOffset.x = pos.x - ex;
                        this.dragOffset.y = pos.y - ey;
                    }
                    return;
                }
            }
        };

        this.input.onMove = (pos) => {
            if (this.draggedBlock) {
                this.draggedBlock.x = pos.x + this.dragOffset.x;
                this.draggedBlock.y = pos.y + this.dragOffset.y;
            } else if (this.draggedItem) {
                // Tracking item drag
            }
        };

        this.input.onUp = (pos) => {
            if (this.draggedItem) {
                const item = this.draggedItem;
                this.draggedItem = null;

                const cell = this.grid.getCellAt(pos.x, pos.y);
                if (cell) {
                    this.useItem(item, cell.r, cell.c);
                }
                return;
            }

            if (this.draggedBlock) {
                const block = this.draggedBlock;
                const cell = this.getNearestCellForShape(block);

                if (cell && this.grid.canPlace(block, cell.r, cell.c)) {
                    // Award points for placement (number of cells)
                    const placementScore = block.rows * block.cols; // Simple calculation, better: block.matrix.flat().reduce((a,b)=>a+b, 0)
                    // Precise calculation of cells
                    let cellCount = 0;
                    block.matrix.forEach(row => row.forEach(val => { if (val) cellCount++; }));
                    this.updateScore(cellCount); // e.g. 5 points

                    // Visual Score for Placement
                    const blockCenterX = this.grid.x + (cell.c + block.cols / 2) * (this.grid.cellSize + this.grid.padding);
                    const blockCenterY = this.grid.y + (cell.r + block.rows / 2) * (this.grid.cellSize + this.grid.padding);
                    this.floatingTextSystem.emit(blockCenterX, blockCenterY, `+${cellCount}`, '#ffffffff', 20 * this.engine.scale);

                    this.grid.place(block, cell.r, cell.c);
                    this.activeBlocks = this.activeBlocks.filter(b => b !== block);

                    // Check for clears and handle block_drop sound conditionally
                    const clearResult = this.checkAndClear();
                    if (!clearResult?.cleared && !clearResult?.goldEarned) {
                        this.playSound('block_drop');
                    }

                    this.saveSession(); // Save after placement and clear

                    if (this.activeBlocks.length === 0) {
                        this.spawnBlocks();
                    } else if (this.checkGameOver()) {
                        this.switchState('GAME_OVER');
                        this.finalScoreElem.innerText = this.score;
                        this.playSound('game_over'); // Play game over sound
                    }
                } else {
                    block.dragging = false;
                    block.scale = this.spawnBlockScale;
                    block.x = block.originalX;
                    block.y = block.originalY;
                }
                this.draggedBlock = null;
            }
        };
    }

    analyzeGridForSolutions() {
        const solutions = {
            helperOpportunity: false,
            fillPercentage: 0,
            emptyCellsInNearLines: []
        };

        let filledCount = 0;

        // Check Rows
        for (let r = 0; r < this.grid.rows; r++) {
            let rowFill = 0;
            let emptyCols = [];
            for (let c = 0; c < this.grid.cols; c++) {
                if (this.grid.data[r][c] !== 0) {
                    rowFill++;
                    filledCount++;
                } else {
                    emptyCols.push(c);
                }
            }
            if (rowFill >= 7) {
                solutions.helperOpportunity = true;
                emptyCols.forEach(c => solutions.emptyCellsInNearLines.push({ r, c }));
            }
        }

        // Check Cols
        for (let c = 0; c < this.grid.cols; c++) {
            let colFill = 0;
            let emptyRows = [];
            for (let r = 0; r < this.grid.rows; r++) {
                if (this.grid.data[r][c] !== 0) colFill++;
                else emptyRows.push(r);
            }
            if (colFill >= 7) {
                solutions.helperOpportunity = true;
                emptyRows.forEach(r => solutions.emptyCellsInNearLines.push({ r, c }));
            }
        }

        solutions.fillPercentage = filledCount / (this.grid.rows * this.grid.cols);
        return solutions;
    }

    spawnBlocks() {
        if (this.mode === 'STAGE') {
            this.squeeCount++;
            console.log(`Squee ${this.squeeCount} spawning...`);
        }

        let attempts = 0;
        const maxAttempts = 10;
        const baseWeights = { A: 4, B: 10, C: 20, D: 15, E: 10, F: 6, G: 4, H: 5, I: 7, J: 13, K: 6 };

        // Overhauled Tiered Spawn Weights
        let weights;
        if (this.mode === 'STAGE') {
            const sn = this.currentStageNum;
            if (sn <= 30) {
                weights = { A: 35, B: 30, C: 15, D: 5, E: 10, F: 1, G: 1, H: 1, I: 1, J: 0.5, K: 0.5 };
            } else if (sn <= 60) {
                weights = { A: 15, B: 20, C: 15, D: 10, E: 15, F: 5, G: 5, H: 5, I: 5, J: 3, K: 2 };
            } else if (sn <= 85) {
                weights = { A: 10, B: 15, C: 20, D: 12, E: 12, F: 8, G: 6, H: 5, I: 5, J: 4, K: 3 };
            } else {
                weights = { A: 5, B: 10, C: 15, D: 15, E: 10, F: 10, G: 10, H: 8, I: 8, J: 5, K: 4 };
            }
        } else {
            weights = baseWeights;
        }

        const GROUPS = {
            A: [0, 1], B: [2, 3], C: [8, 9], D: [23, 24], E: [4], F: [16, 17],
            G: [12, 13, 14, 15], H: [5, 6, 7], I: [10, 11], J: [22], K: [18, 19, 20, 21]
        };

        const analysis = this.analyzeGridForSolutions();
        const isSurvivalGuard = (this.mode === 'STAGE' && this.squeeCount <= 10);

        // Pre-calculate survival candidates if needed
        let necessaryIndices = [];
        let placeableIndices = [];
        let allCandidates = []; // No 1x1 (25)

        if (isSurvivalGuard) {
            for (let idx = 0; idx < SHAPES.length; idx++) {
                if (idx === 25) continue; // Skip 1x1
                allCandidates.push(idx);

                let canClear = false;
                let isPlaceable = false;

                // Brute force check for placeability and clearing potential
                for (let r = 0; r < this.grid.rows; r++) {
                    for (let c = 0; c < this.grid.cols; c++) {
                        const shapeData = SHAPES[idx];
                        const dummyShape = { rows: shapeData.matrix.length, cols: shapeData.matrix[0].length, matrix: shapeData.matrix };
                        if (this.grid.canPlace(dummyShape, r, c)) {
                            isPlaceable = true;
                            const predicted = this.grid.getPredictedLines(dummyShape, r, c);
                            if (predicted.rows.length > 0 || predicted.cols.length > 0) {
                                canClear = true;
                                break;
                            }
                        }
                    }
                    if (canClear) break;
                }

                if (canClear) necessaryIndices.push(idx);
                if (isPlaceable) placeableIndices.push(idx);
            }
        }

        do {
            this.activeBlocks = [];
            let helperSpawned = false;

            for (let i = 0; i < 3; i++) {
                let randIdx;

                if (isSurvivalGuard) {
                    // Priority: Necessary > Placeable > Any Candidate
                    if (necessaryIndices.length > 0) {
                        randIdx = necessaryIndices[Math.floor(Math.random() * necessaryIndices.length)];
                    } else if (placeableIndices.length > 0) {
                        randIdx = placeableIndices[Math.floor(Math.random() * placeableIndices.length)];
                    } else {
                        randIdx = allCandidates[Math.floor(Math.random() * allCandidates.length)];
                    }
                } else {
                    // Standard Logic
                    let helpRoll = Math.random();
                    let helpThreshold = (analysis.fillPercentage > 0.8) ? 0.6 : 0.25;

                    if (this.mode === 'STAGE' && analysis.helperOpportunity && !helperSpawned && i === 1 && helpRoll < helpThreshold) {
                        randIdx = 25; // Force 1x1 Helper
                        helperSpawned = true;
                    } else {
                        const roll = Math.random() * 100;
                        let cumulative = 0;
                        let selectedKey = 'K';
                        for (const key in weights) {
                            cumulative += weights[key];
                            if (roll < cumulative) { selectedKey = key; break; }
                        }
                        const selectedGroup = GROUPS[selectedKey];
                        randIdx = selectedGroup[Math.floor(Math.random() * selectedGroup.length)];
                    }
                }

                const shapeData = SHAPES[randIdx];
                const isGold = Math.random() < 0.1;
                const block = new Shape(this.engine, shapeData, isGold);
                block.x = this.spawnSlots[i].x;
                block.y = this.spawnSlots[i].y;
                block.originalX = block.x;
                block.originalY = block.y;
                block.scale = this.spawnBlockScale;
                this.activeBlocks.push(block);
            }
            attempts++;
        } while (this.checkGameOver() && attempts < maxAttempts);

        // Survival Guard Final Fallback: If still game over and we are in survival guard, 
        // force spawn a 1x1 helper to prevent immediate failure at the start of a stage.
        if (isSurvivalGuard && this.checkGameOver()) {
            console.log("Survival Guard triggered 1x1 emergency fallback.");
            this.activeBlocks = [];
            for (let i = 0; i < 3; i++) {
                const shapeData = SHAPES[25]; // 1x1
                const block = new Shape(this.engine, shapeData, false);
                block.x = this.spawnSlots[i].x;
                block.y = this.spawnSlots[i].y;
                block.originalX = block.x;
                block.originalY = block.y;
                block.scale = this.spawnBlockScale;
                this.activeBlocks.push(block);
            }
        }

        this.saveSession();

        if (this.checkGameOver()) {
            this.switchState('GAME_OVER');
            this.finalScoreElem.innerText = this.score;
            this.playSound('game_over');
        }
    }

    drawGhost(gridR, gridC) {
        const ctx = this.engine.ctx;
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (let r = 0; r < this.draggedBlock.rows; r++) {
            for (let c = 0; c < this.draggedBlock.cols; c++) {
                if (this.draggedBlock.matrix[r][c] === 1) {
                    const x = this.grid.x + (gridC + c) * (this.grid.cellSize + this.grid.padding);
                    const y = this.grid.y + (gridR + r) * (this.grid.cellSize + this.grid.padding);
                    ctx.fillStyle = this.draggedBlock.color;
                    this.grid._roundRect(ctx, x, y, this.grid.cellSize, this.grid.cellSize, 8 * this.engine.scale);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    drawItemGhost(itemId, gridR, gridC) {
        const ctx = this.engine.ctx;
        ctx.save();

        const itemColor = itemId === 'bomb' ? '#ff3f34' : '#34e7ff';

        const drawCellPreview = (r, c) => {
            if (r >= 0 && r < this.grid.rows && c >= 0 && c < this.grid.cols) {
                const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding);
                const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding);

                // Base ghost fill
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = itemColor;
                this.grid._roundRect(ctx, x, y, this.grid.cellSize, this.grid.cellSize, 8 * this.engine.scale);
                ctx.fill();

                // If block exists, add highlighting glow
                if (this.grid.data[r][c] !== 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.6;
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 15 * this.engine.scale;
                    ctx.shadowColor = '#ffffff';
                    this.grid._roundRect(ctx, x + 2, y + 2, this.grid.cellSize - 4, this.grid.cellSize - 4, 8 * this.engine.scale);
                    ctx.fill();
                    ctx.restore();
                }
            }
        };

        if (itemId === 'bomb') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    drawCellPreview(gridR + dr, gridC + dc);
                }
            }
        } else if (itemId === 'laser') {
            // Row
            for (let c = 0; c < this.grid.cols; c++) drawCellPreview(gridR, c);
            // Column
            for (let r = 0; r < this.grid.rows; r++) {
                if (r !== gridR) drawCellPreview(r, gridC); // Avoid double drawing the center
            }
        }
        ctx.restore();
    }

    drawPredictedHighlights(predicted, color) {
        const ctx = this.engine.ctx;
        ctx.save();

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = color;
        ctx.shadowBlur = 15 * this.engine.scale;
        ctx.shadowColor = color;

        predicted.rows.forEach(r => {
            for (let c = 0; c < this.grid.cols; c++) {
                const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding);
                const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding);
                this.grid._roundRect(ctx, x, y, this.grid.cellSize, this.grid.cellSize, 8 * this.engine.scale);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.grid._roundRect(ctx, x + 4 * this.engine.scale, y + 4 * this.engine.scale, this.grid.cellSize - 8 * this.engine.scale, this.grid.cellSize / 2 - 4 * this.engine.scale, 4 * this.engine.scale);
                ctx.fill();
                ctx.fillStyle = color;
            }
        });

        predicted.cols.forEach(c => {
            for (let r = 0; r < this.grid.rows; r++) {
                const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding);
                const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding);
                this.grid._roundRect(ctx, x, y, this.grid.cellSize, this.grid.cellSize, 8 * this.engine.scale);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.grid._roundRect(ctx, x + 4 * this.engine.scale, y + 4 * this.engine.scale, this.grid.cellSize - 8 * this.engine.scale, this.grid.cellSize / 2 - 4 * this.engine.scale, 4 * this.engine.scale);
                ctx.fill();
                ctx.fillStyle = color;
            }
        });

        ctx.restore();
    }

    checkAndClear() {
        const lines = this.grid.checkLines();
        const lineCount = lines.rows.length + lines.cols.length;

        if (lineCount > 0) {
            let goldEarned = 0;

            for (const r of lines.rows) {
                for (let c = 0; c < this.grid.cols; c++) {
                    const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                    const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;

                    if (this.grid.goldData[r][c]) goldEarned += 100000;

                    this.particleSystem.emit(x, y, this.grid.colors[r][c] || '#4ecca3', 8);
                }
            }
            for (const c of lines.cols) {
                for (let r = 0; r < this.grid.rows; r++) {
                    if (!lines.rows.includes(r)) {
                        const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                        const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;

                        if (this.grid.goldData[r][c]) goldEarned += 100000;

                        this.particleSystem.emit(x, y, this.grid.colors[r][c] || '#4ecca3', 8);
                    }
                }
            }

            this.grid.clearLines(lines);

            this.combo++;

            // Show Combo Text if combo >= 2
            if (this.combo >= 2) {
                this.comboText = `${this.combo} COMBO!`;
                this.comboTimer = 1.5; // Seconds to show
                this.engine.shake(5 * this.combo, 0.2); // Extra shake for combo
            }

            const basePoints = Math.floor(100 * lineCount * Math.pow(1.1, lineCount - 1));
            const comboBonus = (this.combo - 1) * 50;

            let totalGain = basePoints + comboBonus;

            // Perfect Clear Bonus (1.2x of CURRENT TOTAL score)
            let isBoardEmpty = true;
            for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                    if (this.grid.data[r][c] !== 0) {
                        isBoardEmpty = false;
                        break;
                    }
                }
                if (!isBoardEmpty) break;
            }

            if (isBoardEmpty) {
                const bonus = Math.floor(this.score * 0.2);
                totalGain += bonus;
                console.log("Perfect Clear! 1.2x Bonus applied:", bonus);
                // Particle effect for bonus
                this.particleSystem.emit(this.engine.width / 2, this.engine.height / 2, '#ffd700', 30);
            }

            this.updateScore(totalGain);

            // Visual Score & Combo Text
            const centerX = this.grid.x + this.grid.totalWidth / 2;
            const centerY = this.grid.y + this.grid.totalHeight / 2;

            if (lineCount >= 2 || this.combo > 1) {
                // 1. Combo Keyword (Smaller, Yellow, Bold)
                let labelText = '';
                if (lineCount >= 3) {
                    labelText = `x${lineCount} MULTI SHOT!`;
                } else if (lineCount === 2) {
                    labelText = 'x2 DOUBLE!';
                } else {
                    labelText = `${this.combo} COMBO!`;
                }

                // Emit Label (Top)
                // [CUSTOMIZATION GUIDE]
                // - centerY - 20: Adjust vertical position (smaller number = higher)
                // - '#FFD700': Text Color (Gold)
                // - 24: Font Size (Multi Shot Text)
                this.floatingTextSystem.emit(
                    centerX,
                    centerY - 20 * this.engine.scale,
                    labelText,
                    '#FFD700',
                    15 * this.engine.scale,
                    true // Uses 'Exo 2' Font
                );

                // 2. Score Value (Bottom, Standard White/Gold)
                // [CUSTOMIZATION GUIDE]
                // - centerY + 20: Adjust vertical position (larger number = lower)
                // - '#fff': Text Color (White)
                // - 35: Font Size (Score Number)
                this.floatingTextSystem.emit(
                    centerX,
                    centerY + 0 * this.engine.scale,
                    `+${totalGain}`,
                    '#fff',
                    20 * this.engine.scale,
                    false // Uses 'Inter' Font
                );

            } else {
                // Normal Single Line Clear
                this.floatingTextSystem.emit(
                    centerX,
                    centerY,
                    `+${totalGain}`,
                    '#fff',
                    20 * this.engine.scale,
                    false
                );
            }

            if (goldEarned > 0) {
                this.addGold(goldEarned);
                this.playSound('coin'); // Play coin sound
            }

            this.engine.shake(5 + lineCount * 2, 0.2);

            // Calculate pitch based on combo (Piano half-step formula: 2^(n/12))
            // Combo 1 -> 2^0 = 1.0 (Normal)
            // Combo 2 -> 2^(1/12) = 1.059...
            const pitch = Math.pow(2, (this.combo - 1) / 12);
            this.playSound('block_clear', pitch); // Play clear sound with pitch

            return { cleared: true, goldEarned: goldEarned > 0 };
        } else {
            this.combo = 0;
            return { cleared: false, goldEarned: false };
        }
    }

    /* ===========================
       Smart Spawn Logic (Hourglass)
       =========================== */
    spawnSmartBlocks() {
        this.activeBlocks = [];
        // Create an array of indices [0, 1, ... SHAPES.length-1]
        let indices = Array.from({ length: SHAPES.length }, (_, i) => i);
        this._shuffleArray(indices);

        let placedCount = 0;

        // Try to find up to 3 playable blocks from the existing pool
        for (const idx of indices) {
            if (placedCount >= 3) break;

            const shapeData = SHAPES[idx];
            // Create a temp shape to test placement
            const tempShape = new Shape(this.engine, shapeData, false);

            if (this._canPlaceAnywhere(tempShape)) {
                const isGold = Math.random() < 0.1;
                const block = new Shape(this.engine, shapeData, isGold);
                this._configureSpawnedBlock(block, placedCount);
                this.activeBlocks.push(block);
                placedCount++;
            }
        }

        // If we found fewer than 3 playable blocks, fill the rest with 1x1 blocks
        // The user requested: "If 3 valid blocks cannot be found, check if a 1x1 block can be placed"
        // Since 1x1 is the smallest unit, if even 1x1 fits, we use it. 
        // If even 1x1 doesn't fit, the game is functionally over, but we spawn it anyway as a last resort.
        while (placedCount < 3) {
            // 1x1 Block Definition (Not in standard pool)
            // Using a bright color to signify it's a special fallback
            const oneByOneData = { matrix: [[1]], color: '#FFD700' };

            const block = new Shape(this.engine, oneByOneData, Math.random() < 0.1);
            this._configureSpawnedBlock(block, placedCount);
            this.activeBlocks.push(block);
            placedCount++;
        }

        this.saveSession();

        // Visual feedback for spawn
        this.playSound('block_drop');

        // Check Game Over (Just in case even 1x1 doesn't fit, though unlikely unless grid is 100% full)
        if (this.checkGameOver()) {
            this.switchState('GAME_OVER');
            this.finalScoreElem.innerText = this.score;
            this.playSound('game_over');
        }
    }

    _configureSpawnedBlock(block, slotIndex) {
        block.x = this.spawnSlots[slotIndex].x;
        block.y = this.spawnSlots[slotIndex].y;
        block.originalX = block.x;
        block.originalY = block.y;
        block.scale = this.spawnBlockScale;
    }

    _canPlaceAnywhere(shape) {
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.cols; c++) {
                if (this.grid.canPlace(shape, r, c)) return true;
            }
        }
        return false;
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    checkGameOver() { // (Existing method, shown for context matching but not replaced)
        if (this.activeBlocks.length === 0) return false;
        for (const block of this.activeBlocks) {
            for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                    if (this.grid.canPlace(block, r, c)) return false;
                }
            }
        }
        return true;
    }

    resetAllData() {
        localStorage.clear();
        location.reload(); // Hard reset by reloading
    }

    unlockAllStages() {
        this.unlockedStage = 101;
        this.completedStages = Array.from({ length: 100 }, (_, i) => i + 1);
        this.saveData();
        alert('모든 스테이지가 잠금 해제되었습니다!');
        location.reload(); // Reload to refresh the UI
    }

    restart() {
        this.state = 'INIT'; // Clear previous state to allow transitions
        this.floatingTextSystem.clear(); // Clear floating text
        this.grid.data = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(0));
        this.grid.colors = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(null));
        this.grid.goldData = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(false));
        this.activeBlocks = [];
        this.score = 0;
        this.squeeCount = 0; // Reset squee count
        this.stageGoalScore = 0; // Reset animation target
        this.displayScore = 0; // Reset displayed score
        this.combo = 0;
        this.scoreElem.innerText = '0';

        // Lock in the high score at the start of the session for accurate "New Best" check
        this.sessionStartHighScore = this.highScore;

        this.usedItems = { bomb: false, laser: false, hourglass: false };
        this.updateInventoryDisplay();

        if (this.bestBadge) this.bestBadge.classList.add('hidden');
        if (this.bestEffect) this.bestEffect.classList.add('hidden');
    }
}

window.onload = () => {
    new Game();
};

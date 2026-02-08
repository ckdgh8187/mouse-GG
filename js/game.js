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

                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
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
        this.state = 'MENU'; // MENU, MODE_SELECT, PLAYING, GAME_OVER

        // UI Elements
        this.screens = {
            MENU: document.getElementById('main-menu'),
            MODE_SELECT: document.getElementById('mode-selection'),
            SHOP: document.getElementById('shop-screen'),
            PLAYING: document.getElementById('gameplay-ui'),
            GAME_OVER: document.getElementById('game-over-screen')
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
        this.bestBadge = document.getElementById('new-best-badge');
        this.bestEffect = document.getElementById('new-best-effect');

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

                // Draw Combo Text
                if (this.comboText && this.comboTimer > 0) {
                    const ctx = this.engine.ctx;
                    ctx.save();
                    ctx.font = `bold ${40 * this.engine.scale}px Arial`;
                    ctx.fillStyle = '#ffcc00';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const yOffset = (1 - (this.comboTimer / 1.5)) * 50; // Float up effect
                    ctx.fillText(this.comboText, this.engine.width / 2, this.engine.height / 2 - yOffset);
                    ctx.strokeText(this.comboText, this.engine.width / 2, this.engine.height / 2 - yOffset);
                    ctx.restore();
                }

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
    }

    saveData() {
        localStorage.setItem('block_blast_gold', this.gold);
        localStorage.setItem('block_blast_inventory', JSON.stringify(this.inventory));
        localStorage.setItem('block_blast_best', this.highScore);
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

    playSound(name) {
        // Priority 1: Web Audio API (Low Latency)
        if (this.soundBuffers[name]) {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => { });
            }
            const source = this.audioCtx.createBufferSource();
            source.buffer = this.soundBuffers[name];
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
            // Re-spawn 3 blocks
            this.spawnBlocks();
            success = true;
        }

        if (success) {
            if (goldEarned > 0) this.addGold(goldEarned);
            if (scoreEarned > 0) this.updateScore(scoreEarned);

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
        this.targetScore += amount; // Accumulate only target
        // this.score is now this.targetScore in logic
        this.score = this.targetScore;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateBestDisplay();
            this.saveData();
        }
        // Text update happens in update() loop
        this.saveSession(); // Persist session on score change
    }

    setupButtons() {
        // Main Menu
        document.getElementById('start-game-btn').onclick = () => this.switchState('MODE_SELECT');
        document.getElementById('shop-btn').onclick = () => {
            this.updateInventoryDisplay();
            this.switchState('SHOP');
        };

        // Shop Buttons
        document.getElementById('close-shop-btn').onclick = () => this.switchState('MENU');

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
        document.getElementById('challenge-mode-btn').onclick = () => this.startChallengeMode();
        document.getElementById('back-to-menu-btn').onclick = () => this.switchState('MENU');

        // Game Over
        document.getElementById('restart-btn').onclick = () => this.startChallengeMode();
        document.getElementById('exit-to-menu-btn').onclick = () => this.switchState('MENU');
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
        if (newState === 'MENU' || newState === 'MODE_SELECT' || newState === 'SHOP' || newState === 'PLAYING' || newState === 'GAME_OVER') {
            this.goldHud.classList.remove('hidden');
        } else {
            this.goldHud.classList.add('hidden');
        }

        if (newState === 'GAME_OVER') {
            this.finalScoreElem.innerText = this.score.toLocaleString();

            // Check for New High Score Celebration
            if (this.score >= this.highScore && this.score > 0) {
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

    startChallengeMode() {
        this.restart(); // Reset game data
        this.switchState('PLAYING');
        this.spawnBlocks();
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

                    this.grid.place(block, cell.r, cell.c);
                    this.playSound('block_drop'); // Play placement sound
                    this.activeBlocks = this.activeBlocks.filter(b => b !== block);
                    this.checkAndClear();
                    this.saveSession(); // Save after placement and clear

                    if (this.activeBlocks.length === 0) {
                        this.spawnBlocks();
                    } else if (this.checkGameOver()) {
                        this.switchState('GAME_OVER');
                        this.finalScoreElem.innerText = this.score;
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

    spawnBlocks() {
        let attempts = 0;
        const maxAttempts = 10; // Try up to 10 times to find a playable set

        do {
            this.activeBlocks = [];
            for (let i = 0; i < 3; i++) {
                const randIdx = Math.floor(Math.random() * SHAPES.length);
                const isGold = Math.random() < 0.1; // 10% Gold Block Spawn Probability
                const block = new Shape(this.engine, SHAPES[randIdx], isGold);
                block.x = this.spawnSlots[i].x;
                block.y = this.spawnSlots[i].y;
                block.originalX = block.x;
                block.originalY = block.y;
                block.scale = this.spawnBlockScale;
                this.activeBlocks.push(block);
            }
            attempts++;
        } while (this.checkGameOver() && attempts < maxAttempts);

        this.saveSession(); // Save new blocks

        if (this.checkGameOver()) {
            this.switchState('GAME_OVER');
            this.finalScoreElem.innerText = this.score;
            this.playSound('game_over'); // Play game over sound
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

            if (goldEarned > 0) {
                this.addGold(goldEarned);
                this.playSound('coin'); // Play coin sound
            }

            this.engine.shake(5 + lineCount * 2, 0.2);
            this.playSound('block_clear'); // Play clear sound
        } else {
            this.combo = 0;
        }
    }

    checkGameOver() {
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

    restart() {
        this.grid.data = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(0));
        this.grid.colors = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(null));
        this.grid.goldData = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(false));
        this.activeBlocks = [];
        this.score = 0;
        this.combo = 0;
        this.scoreElem.innerText = '0';

        this.usedItems = { bomb: false, laser: false, hourglass: false };
        this.updateInventoryDisplay();

        if (this.bestBadge) this.bestBadge.classList.add('hidden');
        if (this.bestEffect) this.bestEffect.classList.add('hidden');
    }
}

window.onload = () => {
    new Game();
};

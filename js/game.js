/**
 * Block Blast Clone - Bundle Script (Refined Placement Logic)
 * Combines all modules for local file execution support.
 */

/* ===========================
   VisualEffects.js
   =========================== */
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
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
        ctx.fillStyle = this.color;
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

    emit(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
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

        // Screen Shake variables
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

        // High DPI scaling
        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
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

        // Apply Screen Shake
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
    constructor(element) {
        this.element = element;
        this.pos = { x: 0, y: 0 };
        this.isDown = false;
        this.target = null;

        this.onDown = null;
        this.onMove = null;
        this.onUp = null;

        element.addEventListener('mousedown', (e) => this._handleDown(e));
        element.addEventListener('mousemove', (e) => this._handleMove(e));
        element.addEventListener('mouseup', (e) => this._handleUp(e));

        element.addEventListener('touchstart', (e) => this._handleDown(e), { passive: false });
        element.addEventListener('touchmove', (e) => this._handleMove(e), { passive: false });
        element.addEventListener('touchend', (e) => this._handleUp(e), { passive: false });
    }

    _getPos(e) {
        const rect = this.element.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    _handleDown(e) {
        if (e.cancelable) e.preventDefault();
        this.isDown = true;
        this.pos = this._getPos(e);
        if (this.onDown) this.onDown(this.pos);
    }

    _handleMove(e) {
        if (e.cancelable) e.preventDefault();
        this.pos = this._getPos(e);
        if (this.onMove) this.onMove(this.pos);
    }

    _handleUp(e) {
        if (e.cancelable) e.preventDefault();
        this.isDown = false;
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
        this.cellSize = cellSize;
        this.padding = padding;

        // 0: empty, 1: filled
        this.data = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        this.colors = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));

        this.calculateLayout();
    }

    calculateLayout() {
        this.totalWidth = this.cols * this.cellSize + (this.cols - 1) * this.padding;
        this.totalHeight = this.rows * this.cellSize + (this.rows - 1) * this.padding;
        this.x = (this.engine.width - this.totalWidth) / 2;
        this.y = (this.engine.height - this.totalHeight) / 2 - 80; // Offset for blocks at bottom
    }

    draw(ctx) {
        // Draw grid background slots
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cellX = this.x + c * (this.cellSize + this.padding);
                const cellY = this.y + r * (this.cellSize + this.padding);

                // Shadow/Empty slot style
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                this._roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, 8);
                ctx.fill();

                // Filled cell
                if (this.data[r][c] === 1) {
                    ctx.fillStyle = this.colors[r][c] || '#4ecca3';
                    this._roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, 8);
                    ctx.fill();

                    // Highlight/Gloss effect
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    this._roundRect(ctx, cellX + 4, cellY + 4, this.cellSize - 8, this.cellSize / 2 - 4, 4);
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
        // Find closest cell center to the given world point
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
                    }
                }
            }
        }
    }

    checkLines() {
        let linesToRemove = { rows: [], cols: [] };

        // Check rows
        for (let r = 0; r < this.rows; r++) {
            if (this.data[r].every(cell => cell === 1)) {
                linesToRemove.rows.push(r);
            }
        }

        // Check cols
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
            }
        }
        for (const c of lines.cols) {
            for (let r = 0; r < this.rows; r++) {
                this.data[r][c] = 0;
            }
        }
    }
}

/* ===========================
   Shape.js
   =========================== */
const SHAPES = [
    { matrix: [[1]], color: '#FF5733' }, // 1x1
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
    { matrix: [[1, 1, 1], [1, 0, 0]], color: '#33FF83' }, // L-Shape
    { matrix: [[1, 1, 1], [0, 0, 1]], color: '#8333FF' }, // J-Shape
    { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#FF3333' }, // 3x3 Large Square
];

class Shape {
    constructor(engine, shapeData, isUI = false) {
        this.engine = engine;
        this.matrix = shapeData.matrix;
        this.color = shapeData.color;
        this.isUI = isUI;

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
        const drawScale = preview ? 0.6 : this.scale;
        const currentCellSize = cellSize * drawScale;
        const currentPadding = padding * drawScale;

        const totalW = this.cols * currentCellSize + (this.cols - 1) * currentPadding;
        const totalH = this.rows * currentCellSize + (this.rows - 1) * currentPadding;

        // PIVOT FIXED: Consistent center-based drawing
        let startX = this.x - totalW / 2;
        let startY = this.y - totalH / 2;

        ctx.save();
        if (preview) ctx.globalAlpha = 0.5;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.matrix[r][c] === 1) {
                    const cellX = startX + c * (currentCellSize + currentPadding);
                    const cellY = startY + r * (currentCellSize + currentPadding);

                    ctx.fillStyle = this.color;
                    this._roundRect(ctx, cellX, cellY, currentCellSize, currentCellSize, 6 * drawScale);
                    ctx.fill();

                    // Inner highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    this._roundRect(ctx, cellX + 3 * drawScale, cellY + 3 * drawScale, currentCellSize - 6 * drawScale, currentCellSize / 2 - 2 * drawScale, 3 * drawScale);
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
        const currentScale = this.dragging ? (this.engine.width < 500 ? 0.8 : 1.0) : (this.engine.width < 500 ? 0.45 : 0.6);
        const currentCellSize = cellSize * currentScale;
        const currentPadding = padding * currentScale;

        const totalW = this.cols * currentCellSize + (this.cols - 1) * currentPadding;
        const totalH = this.rows * currentCellSize + (this.rows - 1) * currentPadding;

        // Consistent center check
        let startX = this.x - totalW / 2;
        let startY = this.y - totalH / 2;

        return px >= startX && px <= startX + totalW && py >= startY && py <= startY + totalH;
    }
}

/* ===========================
   Main.js
   =========================== */
class Game {
    constructor() {
        this.engine = new Engine('game-canvas');
        this.input = new Input(this.engine.canvas);

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
        this.dragOffset = { x: 0, y: 0 };

        this.score = 0;
        this.combo = 0;
        this.isGameOver = false;

        this.scoreElem = document.getElementById('score-value');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.finalScoreElem = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');

        this.restartBtn.onclick = () => this.restart();

        this.setupInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.spawnBlocks();
        this.engine.start();

        // Custom render loop extension for the game class
        this.engine.update = (dt) => {
            this.engine.entities.forEach(e => e.update && e.update(dt));
            this.particleSystem.update();
        };

        this.engine.draw = () => {
            this.engine.ctx.clearRect(0, 0, this.engine.width, this.engine.height);
            this.grid.draw(this.engine.ctx);

            this.particleSystem.draw(this.engine.ctx);

            // Draw ghost preview if dragging
            if (this.draggedBlock) {
                const cell = this.getNearestCellForShape(this.draggedBlock);
                if (cell && this.grid.canPlace(this.draggedBlock, cell.r, cell.c)) {
                    this.drawGhost(cell.r, cell.c);
                }
            }

            // Draw active spawning blocks
            this.activeBlocks.forEach(block => {
                if (block !== this.draggedBlock) {
                    block.draw(this.engine.ctx, this.grid.cellSize, this.grid.padding);
                }
            });

            // Draw dragged block last (on top)
            if (this.draggedBlock) {
                this.draggedBlock.draw(this.engine.ctx, this.grid.cellSize, this.grid.padding);
            }
        };
    }

    getNearestCellForShape(block) {
        const currentCellSize = this.grid.cellSize * block.scale;
        const currentPadding = this.grid.padding * block.scale;
        const totalW = block.cols * currentCellSize + (block.cols - 1) * currentPadding;
        const totalH = block.rows * currentCellSize + (block.rows - 1) * currentPadding;

        // Find top-left cell world position (center of the first cell)
        const topLeftWorldX = block.x - totalW / 2 + currentCellSize / 2;
        const topLeftWorldY = block.y - totalH / 2 + currentCellSize / 2;

        return this.grid.getCellAt(topLeftWorldX, topLeftWorldY);
    }

    resize() {
        this.grid.calculateLayout();

        const spawnAreaWidth = Math.min(this.engine.width * 0.9, 450);
        const startX = (this.engine.width - spawnAreaWidth) / 2;
        const slotSpacing = spawnAreaWidth / 3;
        const slotY = Math.min(this.grid.y + this.grid.totalHeight + 100, this.engine.height - 100);
        this.spawnBlockScale = this.engine.width < 500 ? 0.45 : 0.6;

        for (let i = 0; i < 3; i++) {
            this.spawnSlots[i].x = startX + slotSpacing * i + slotSpacing / 2;
            this.spawnSlots[i].y = slotY;

            if (this.activeBlocks[i] && !this.activeBlocks[i].dragging) {
                this.activeBlocks[i].x = this.spawnSlots[i].x;
                this.activeBlocks[i].y = this.spawnSlots[i].y;
                this.activeBlocks[i].scale = this.spawnBlockScale;
            }
        }
    }

    setupInput() {
        this.input.onDown = (pos) => {
            if (this.isGameOver) return;

            for (let i = 0; i < this.activeBlocks.length; i++) {
                const block = this.activeBlocks[i];
                if (block.contains(pos.x, pos.y, this.grid.cellSize, this.grid.padding)) {
                    this.draggedBlock = block;
                    block.dragging = true;
                    block.scale = this.engine.width < 500 ? 0.8 : 1.0;

                    // Maintain current position relative to pointer
                    this.dragOffset.x = block.x - pos.x;
                    const dragLift = this.engine.width < 500 ? 80 : 100;
                    // Apply lift relative to CURRENT position
                    this.dragOffset.y = block.y - pos.y - dragLift;

                    // Instant lift to avoid jump frames
                    block.y -= dragLift;
                    break;
                }
            }
        };

        this.input.onMove = (pos) => {
            if (this.draggedBlock) {
                this.draggedBlock.x = pos.x + this.dragOffset.x;
                this.draggedBlock.y = pos.y + this.dragOffset.y;
            }
        };

        this.input.onUp = (pos) => {
            if (this.draggedBlock) {
                const block = this.draggedBlock;
                const cell = this.getNearestCellForShape(block);

                if (cell && this.grid.canPlace(block, cell.r, cell.c)) {
                    this.grid.place(block, cell.r, cell.c);
                    this.activeBlocks = this.activeBlocks.filter(b => b !== block);
                    this.checkAndClear();

                    if (this.activeBlocks.length === 0) {
                        this.spawnBlocks();
                    } else if (this.checkGameOver()) {
                        this.showGameOver();
                    }
                } else {
                    block.dragging = false;
                    block.scale = this.spawnBlockScale || 0.6;
                    block.x = block.originalX;
                    block.y = block.originalY;
                }
                this.draggedBlock = null;
            }
        };
    }

    spawnBlocks() {
        for (let i = 0; i < 3; i++) {
            const randIdx = Math.floor(Math.random() * SHAPES.length);
            const block = new Shape(this.engine, SHAPES[randIdx], true);
            block.x = this.spawnSlots[i].x;
            block.y = this.spawnSlots[i].y;
            block.originalX = block.x;
            block.originalY = block.y;
            block.scale = this.spawnBlockScale || 0.6;
            this.activeBlocks.push(block);
        }

        if (this.checkGameOver()) {
            this.showGameOver();
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
                    this.grid._roundRect(ctx, x, y, this.grid.cellSize, this.grid.cellSize, 8);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    checkAndClear() {
        const lines = this.grid.checkLines();
        const lineCount = lines.rows.length + lines.cols.length;

        if (lineCount > 0) {
            for (const r of lines.rows) {
                for (let c = 0; c < this.grid.cols; c++) {
                    const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                    const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                    this.particleSystem.emit(x, y, this.grid.colors[r][c] || '#4ecca3', 8);
                }
            }
            for (const c of lines.cols) {
                for (let r = 0; r < this.grid.rows; r++) {
                    if (!lines.rows.includes(r)) {
                        const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                        const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                        this.particleSystem.emit(x, y, this.grid.colors[r][c] || '#4ecca3', 8);
                    }
                }
            }

            this.grid.clearLines(lines);

            this.combo++;
            this.score += lineCount * 100 + (this.combo - 1) * 50;
            this.scoreElem.innerText = this.score;
            this.engine.shake(5 + lineCount * 2, 0.2);
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

    showGameOver() {
        this.isGameOver = true;
        this.finalScoreElem.innerText = this.score;
        this.gameOverScreen.classList.remove('hidden');
    }

    restart() {
        this.grid.data = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(0));
        this.grid.colors = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(null));
        this.activeBlocks = [];
        this.score = 0;
        this.combo = 0;
        this.scoreElem.innerText = '0';
        this.isGameOver = false;
        this.gameOverScreen.classList.add('hidden');
        this.spawnBlocks();
    }
}

window.onload = () => {
    new Game();
};

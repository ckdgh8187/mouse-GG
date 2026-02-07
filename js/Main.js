import { Engine } from './Engine.js';
import { Input } from './Input.js';
import { Grid } from './Grid.js';
import { Shape, SHAPES } from './Shape.js';
import { ParticleSystem } from './VisualEffects.js';

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
                const cell = this.grid.getCellAt(this.input.pos.x, this.input.pos.y - 100); // Offset up for visibility
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

    resize() {
        this.grid.calculateLayout();

        // Position spawn slots
        const slotSpacing = this.engine.width / 3;
        const slotY = this.grid.y + this.grid.totalHeight + 120;

        for (let i = 0; i < 3; i++) {
            this.spawnSlots[i].x = slotSpacing * i + slotSpacing / 2;
            this.spawnSlots[i].y = slotY;

            if (this.activeBlocks[i] && !this.activeBlocks[i].dragging) {
                this.activeBlocks[i].x = this.spawnSlots[i].x;
                this.activeBlocks[i].y = this.spawnSlots[i].y;
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
                    block.scale = 1.0;
                    this.dragOffset.x = block.x - pos.x;
                    this.dragOffset.y = block.y - pos.y - 100; // Offset up so user can see it
                    block.y -= 100;
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
                const cell = this.grid.getCellAt(pos.x, pos.y - 100);

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
                    // Return to original slot
                    block.dragging = false;
                    block.scale = 0.6;
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
            block.scale = 0.6;
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
                    ctx.beginPath();
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
            // Trigger effects for each cleared cell
            for (const r of lines.rows) {
                for (let c = 0; c < this.grid.cols; c++) {
                    const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                    const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                    this.particleSystem.emit(x, y, this.grid.colors[r][c] || '#4ecca3', 8);
                }
            }
            for (const c of lines.cols) {
                for (let r = 0; r < this.grid.rows; r++) {
                    // Avoid double particles if both row and col cleared this cell
                    if (!lines.rows.includes(r)) {
                        const x = this.grid.x + c * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                        const y = this.grid.y + r * (this.grid.cellSize + this.grid.padding) + this.grid.cellSize / 2;
                        this.particleSystem.emit(x, y, this.grid.colors[r][c] || '#4ecca3', 8);
                    }
                }
            }

            this.grid.clearLines(lines);

            // Score calculation
            this.combo++;
            const basePoints = lineCount * 100;
            const comboBonus = (this.combo - 1) * 50;
            this.score += basePoints + comboBonus;

            this.scoreElem.innerText = this.score;

            // Screen Shake based on combo/lines
            this.engine.shake(5 + lineCount * 2, 0.2);
        } else {
            this.combo = 0;
        }
    }

    checkGameOver() {
        // Only check if none of the active blocks can fit ANYWHERE on the grid
        if (this.activeBlocks.length === 0) return false;

        for (const block of this.activeBlocks) {
            for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                    if (this.grid.canPlace(block, r, c)) {
                        return false; // Found at least one valid spot
                    }
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

new Game();

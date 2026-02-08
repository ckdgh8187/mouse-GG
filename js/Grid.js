/**
 * Grid Module
 * Manages the 8x8 game board state and rendering.
 */
export class Grid {
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
                ctx.beginPath();
                // Performance: Remove shadowBlur for grid slots
                this._roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, 8);
                ctx.fill();

                // Filled cell
                if (this.data[r][c] === 1) {
                    ctx.fillStyle = this.colors[r][c] || '#4ecca3';
                    ctx.beginPath();
                    this._roundRect(ctx, cellX, cellY, this.cellSize, this.cellSize, 8);
                    ctx.fill();

                    // Highlight/Gloss effect
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.beginPath();
                    this._roundRect(ctx, cellX + 4, cellY + 4, this.cellSize - 8, this.cellSize / 2 - 4, 4);
                    ctx.fill();
                }
            }
        }
    }

    _roundRect(ctx, x, y, width, height, radius) {
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    getCellAt(worldX, worldY) {
        const c = Math.floor((worldX - this.x) / (this.cellSize + this.padding));
        const r = Math.floor((worldY - this.y) / (this.cellSize + this.padding));

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
                    this.data[gridR + r][gridC + c] = 1;
                    this.colors[gridR + r][gridC + c] = shape.color;
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

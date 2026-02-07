/**
 * Shape Data and Class
 */
export const SHAPES = [
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

export class Shape {
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

        // Center alignment if not dragging
        let startX = this.x;
        let startY = this.y;

        if (this.isUI && !this.dragging) {
            startX -= totalW / 2;
            startY -= totalH / 2;
        }

        ctx.save();
        if (preview) ctx.globalAlpha = 0.5;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.matrix[r][c] === 1) {
                    const cellX = startX + c * (currentCellSize + currentPadding);
                    const cellY = startY + r * (currentCellSize + currentPadding);

                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    this._roundRect(ctx, cellX, cellY, currentCellSize, currentCellSize, 6 * drawScale);
                    ctx.fill();

                    // Inner highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.beginPath();
                    this._roundRect(ctx, cellX + 3 * drawScale, cellY + 3 * drawScale, currentCellSize - 6 * drawScale, currentCellSize / 2 - 2 * drawScale, 3 * drawScale);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    _roundRect(ctx, x, y, width, height, radius) {
        if (radius < 0) radius = 0;
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    contains(px, py, cellSize, padding) {
        const drawScale = this.dragging ? 1.0 : 0.6;
        const currentCellSize = cellSize * drawScale;
        const currentPadding = padding * drawScale;

        const totalW = this.cols * currentCellSize + (this.cols - 1) * currentPadding;
        const totalH = this.rows * currentCellSize + (this.rows - 1) * currentPadding;

        let startX = this.x - totalW / 2;
        let startY = this.y - totalH / 2;

        return px >= startX && px <= startX + totalW && py >= startY && py <= startY + totalH;
    }
}

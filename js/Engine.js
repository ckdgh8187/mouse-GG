/**
 * Anti-Gravity Engine Core
 * Handles the main game loop, resizing, and rendering stack.
 */
export class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.entities = [];
        this.lastTime = 0;
        this.width = 0;
        this.height = 0;
        this.pixelRatio = window.devicePixelRatio || 1;
        this.scale = 1; // Base scale for responsive calculations

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

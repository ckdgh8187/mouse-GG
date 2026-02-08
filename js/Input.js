/**
 * Anti-Gravity Input Manager
 * Normalizes Mouse and Touch events.
 */
export class Input {
    constructor(element) {
        this.element = element;
        this.pos = { x: 0, y: 0 };
        this.isDown = false;
        this.target = null;

        this.onDown = null;
        this.onMove = null;
        this.onUp = null;

        element.addEventListener('mousedown', (e) => this._handleDown(e));
        window.addEventListener('mousemove', (e) => this._handleMove(e));
        window.addEventListener('mouseup', (e) => this._handleUp(e));

        element.addEventListener('touchstart', (e) => this._handleDown(e), { passive: false });
        window.addEventListener('touchmove', (e) => this._handleMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this._handleUp(e), { passive: false });
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

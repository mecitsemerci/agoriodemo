const Entity = require('./entity');
const config = require('./config');

class Player extends Entity {
    constructor(id, x, y, radius, color, name) {
        super(x, y, radius, color);
        this.id = id;
        this.name = name;
        this.targetX = x;
        this.targetY = y;
        this.score = 0;
    }

    update() {
        // Basic movement logic moving towards targetX, targetY
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Speed decreases as size increases
        const speed = config.SPEED_MULTIPLIER / Math.pow(this.radius, 0.449); // using a standard agario formula approximation or simple inverse

        if (distance > speed) {
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * speed;
            this.y += Math.sin(angle) * speed;
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }

        // Boundary checks
        this.x = Math.max(0, Math.min(config.MAP_WIDTH, this.x));
        this.y = Math.max(0, Math.min(config.MAP_HEIGHT, this.y));
    }
}

module.exports = Player;

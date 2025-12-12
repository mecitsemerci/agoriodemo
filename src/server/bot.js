const Player = require('./player');
const config = require('./config');

class Bot extends Player {
    constructor(id, x, y, radius, color) {
        super(id, x, y, radius, color, 'Bot ' + id);
        this.decisionTimer = 0;
    }

    update(game) {
        this.decisionTimer++;
        if (this.decisionTimer > 20) { // Make a decision every 20 ticks
            this.makeDecision(game);
            this.decisionTimer = 0;
        }
        super.update();
    }

    makeDecision(game) {
        // Simple AI: Find nearest food or avoid bigger players
        let nearestFood = null;
        let minDist = Infinity;

        // Look for food
        for (const food of game.food) {
            const dx = food.x - this.x;
            const dy = food.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearestFood = food;
            }
        }

        // Look for threats (bigger players) - basic implementation
        // For now, just seek food
        if (nearestFood) {
            this.targetX = nearestFood.x;
            this.targetY = nearestFood.y;
        } else {
            // Random movement if no food close (rare)
            this.targetX = Math.random() * config.MAP_WIDTH;
            this.targetY = Math.random() * config.MAP_HEIGHT;
        }
    }
}

module.exports = Bot;

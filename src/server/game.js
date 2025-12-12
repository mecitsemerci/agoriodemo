const config = require('./config');
const Entity = require('./entity');
const Player = require('./player');
const Bot = require('./bot');
const Virus = require('./virus');

class Game {
    constructor() {
        this.players = {}; // Keyed by socket ID
        this.bots = [];
        this.food = [];
        this.viruses = [];

        // Initialize viruses
        for (let i = 0; i < config.VIRUS_COUNT; i++) {
            this.addVirus();
        }

        // Initialize bots
        for (let i = 0; i < config.BOT_COUNT; i++) {
            this.addBot(i);
        }

        // Initialize food
        for (let i = 0; i < config.FOOD_COUNT; i++) {
            this.addFood();
        }
    }

    addBot(id) {
        const x = Math.random() * config.MAP_WIDTH;
        const y = Math.random() * config.MAP_HEIGHT;
        const color = this.getRandomColor();
        this.bots.push(new Bot(id, x, y, config.INITIAL_RADIUS, color));
    }

    addVirus() {
        const x = Math.random() * config.MAP_WIDTH;
        const y = Math.random() * config.MAP_HEIGHT;
        this.viruses.push(new Virus(x, y, config.VIRUS_RADIUS, config.VIRUS_COLOR));
    }

    addFood() {
        const x = Math.random() * config.MAP_WIDTH;
        const y = Math.random() * config.MAP_HEIGHT;
        const color = this.getRandomColor();
        this.food.push(new Entity(x, y, config.FOOD_RADIUS, color));
    }

    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    addPlayer(id, name) {
        const x = Math.random() * config.MAP_WIDTH;
        const y = Math.random() * config.MAP_HEIGHT;
        const color = this.getRandomColor();
        this.players[id] = new Player(id, x, y, config.INITIAL_RADIUS, color, name);
    }

    removePlayer(id) {
        delete this.players[id];
    }

    handleInput(id, target) {
        const player = this.players[id];
        if (player) {
            player.targetX = target.x;
            player.targetY = target.y;
        }
    }

    update() {
        // Update players
        for (const id in this.players) {
            const player = this.players[id];
            player.update();
            this.checkCollisions(player);
        }

        // Update bots
        this.bots.forEach(bot => {
            bot.update(this);
            this.checkCollisions(bot);
        });

        // Respawn viruses
        while (this.viruses.length < config.VIRUS_COUNT) {
            this.addVirus();
        }

        // Respawn food
        while (this.food.length < config.FOOD_COUNT) {
            this.addFood();
        }

        // Respawn bots if eaten (simple mechanism)
        while (this.bots.length < config.BOT_COUNT) {
            this.addBot(Math.floor(Math.random() * 10000));
        }
    }

    checkCollisions(entity) {
        // Check food collisions
        for (let i = this.food.length - 1; i >= 0; i--) {
            if (entity.collidesWith(this.food[i])) {
                entity.radius += 0.5; // Grow slightly
                this.food.splice(i, 1);
            }
        }

        // Check virus collisions
        for (let i = 0; i < this.viruses.length; i++) {
            const virus = this.viruses[i];
            if (entity.collidesWith(virus)) {
                if (entity.radius < virus.radius) {
                    // Push mechanic (simple elastic collision approximation or just push)
                    const dx = virus.x - entity.x;
                    const dy = virus.y - entity.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const overlap = (entity.radius + virus.radius) - dist;

                    if (overlap > 0) {
                        const angle = Math.atan2(dy, dx);
                        virus.x += Math.cos(angle) * overlap;
                        virus.y += Math.sin(angle) * overlap;

                        // Bound check virus
                        virus.x = Math.max(0, Math.min(config.MAP_WIDTH, virus.x));
                        virus.y = Math.max(0, Math.min(config.MAP_HEIGHT, virus.y));
                    }
                } else {
                    // Consume/Explode
                    // For simplicity: Reduce mass significantly and spawn food
                    if (entity instanceof Player || entity instanceof Bot) {
                        // Only explode if significantly larger? Or just larger? 
                        // Usually larger players eat virus and explode.

                        // Reduce radius
                        const oldRadius = entity.radius;
                        entity.radius = Math.max(config.INITIAL_RADIUS, entity.radius * 0.7); // Lose 30% mass

                        // Spawn food from lost mass
                        const massLost = oldRadius - entity.radius; // Rough approximation
                        const foodCount = Math.floor(massLost * 2);

                        for (let j = 0; j < foodCount; j++) {
                            const angle = Math.random() * Math.PI * 2;
                            const fx = entity.x + Math.cos(angle) * (entity.radius + 50);
                            const fy = entity.y + Math.sin(angle) * (entity.radius + 50);
                            this.food.push(new Entity(
                                Math.max(0, Math.min(config.MAP_WIDTH, fx)),
                                Math.max(0, Math.min(config.MAP_HEIGHT, fy)),
                                config.FOOD_RADIUS,
                                this.getRandomColor()
                            ));
                        }

                        // Remove virus
                        this.viruses.splice(i, 1);
                        i--; // Adjust index
                    }
                }
            }
        }

        // Check collisions with other players/bots
        // A player can eat another if mass is > 1.2x
        const allEntities = [...Object.values(this.players), ...this.bots];

        for (const other of allEntities) {
            if (entity === other) continue;

            if (entity.collidesWith(other)) {
                if (entity.radius > other.radius * 1.1) {
                    // Eat other
                    entity.radius += other.radius * 0.1; // Gain some mass
                    this.removeEntity(other);
                }
            }
        }
    }

    removeEntity(entity) {
        if (entity instanceof Bot) {
            const index = this.bots.indexOf(entity);
            if (index !== -1) {
                // Bots just respawn elsewhere in the update loop
                this.bots.splice(index, 1);
            }
        } else if (entity instanceof Player) {
            // Reset player
            const player = this.players[entity.id];
            if (player) {
                player.x = Math.random() * config.MAP_WIDTH;
                player.y = Math.random() * config.MAP_HEIGHT;
                player.radius = config.INITIAL_RADIUS;
            }
        }
    }

    getState() {
        return {
            players: this.players,
            bots: this.bots,
            food: this.food,
            viruses: this.viruses
        };
    }
}

module.exports = Game;

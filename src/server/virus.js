const Entity = require('./entity');

class Virus extends Entity {
    constructor(x, y, radius, color) {
        super(x, y, radius, color);
    }
}

module.exports = Virus;

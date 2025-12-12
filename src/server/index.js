const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const Game = require('./game');

const game = new Game();

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    socket.on('join', (name) => {
        game.addPlayer(socket.id, name || 'Guest');
        socket.emit('gameConfig', {
            mapWidth: require('./config').MAP_WIDTH,
            mapHeight: require('./config').MAP_HEIGHT
        });
    });

    socket.on('input', (target) => {
        game.handleInput(socket.id, target);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
        game.removePlayer(socket.id);
    });
});

// Game loop (60 FPS)
setInterval(() => {
    game.update();
    io.emit('state', game.getState());
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

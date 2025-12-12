const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();
const virsImage = new Image(); // Optional: could load an image, but drawing spikes is better for now.

let gameState = { players: {}, food: [], bots: [], viruses: [] };
let mySocketId = null;
let cameraX = 0;
let cameraY = 0;
let mapWidth = 3000;
let mapHeight = 3000;

// Input State
let inputMode = 'mouse'; // 'mouse' or 'keyboard'
let mouseX = 0;
let mouseY = 0;
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, s: false, a: false, d: false,
    W: false, S: false, A: false, D: false
};

// Resize canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Login handling
const loginOverlay = document.getElementById('loginOverlay');
const usernameInput = document.getElementById('usernameInput');
const playBtn = document.getElementById('playBtn');

playBtn.addEventListener('click', () => {
    const name = usernameInput.value;
    if (name) {
        socket.emit('join', name);
        loginOverlay.style.display = 'none';
    }
});

// Socket events
socket.on('connect', () => {
    mySocketId = socket.id;
});

socket.on('gameConfig', (config) => {
    mapWidth = config.mapWidth;
    mapHeight = config.mapHeight;
});

socket.on('state', (state) => {
    gameState = state;
    render();
});

// Input handling
window.addEventListener('mousemove', (e) => {
    inputMode = 'mouse';
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        inputMode = 'keyboard';
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

function sendInput() {
    if (!mySocketId || !gameState.players[mySocketId]) return;
    const player = gameState.players[mySocketId];

    let dx = 0;
    let dy = 0;

    if (inputMode === 'mouse') {
        const screenCenterX = canvas.width / 2;
        const screenCenterY = canvas.height / 2;
        dx = mouseX - screenCenterX;
        dy = mouseY - screenCenterY;
    } else {
        // Keyboard mode
        if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
        if (keys.ArrowDown || keys.s || keys.S) dy += 1;
        if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
        if (keys.ArrowRight || keys.d || keys.D) dx += 1;

        // Normalize magnitude for consistent speed in diagonals (visual direction only)
        // The actual speed is determined by server logic (distance > speed)
        // so we just need to project a target far away in that direction.
        if (dx === 0 && dy === 0) return; // No input
    }

    // Project target far away
    // 1000 is arbitrary large number ensuring we move in that direction indefinitely until input changes
    const targetX = player.x + dx * 1000;
    const targetY = player.y + dy * 1000;

    socket.emit('input', {
        x: targetX,
        y: targetY
    });
}

// Send input periodically or inside render loop
setInterval(sendInput, 100);

function render() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find my player to center camera
    const myPlayer = gameState.players[mySocketId];
    if (myPlayer) {
        // Lerp camera for smoothness
        cameraX += (myPlayer.x - cameraX) * 0.1;
        cameraY += (myPlayer.y - cameraY) * 0.1;
    }

    ctx.save();
    // Translate to center camera on player
    ctx.translate(canvas.width / 2 - cameraX, canvas.height / 2 - cameraY);

    // Draw Map Background
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, mapWidth, mapHeight);

    // GRID LINES
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= mapWidth; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapHeight);
        ctx.stroke();
    }
    for (let y = 0; y <= mapHeight; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapWidth, y);
        ctx.stroke();
    }

    // Draw Food
    if (gameState.food) {
        gameState.food.forEach(f => {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx.fillStyle = f.color;
            ctx.fill();
        });
    }

    // Draw Viruses
    if (gameState.viruses) {
        gameState.viruses.forEach(v => {
            drawVirus(v);
        });
    }

    // Draw Bots
    if (gameState.bots) {
        gameState.bots.forEach(b => {
            drawEntity(b);
        });
    }

    // Draw Players
    for (const id in gameState.players) {
        const p = gameState.players[id];
        drawEntity(p);
    }

    ctx.restore();

    // Draw Leaderboard (Simple)
    drawLeaderboard();
}

function drawEntity(entity) {
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
    ctx.fillStyle = entity.color;
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Name
    if (entity.name) {
        ctx.fillStyle = 'white';
        // Font size scales with radius but clamped
        const fontSize = Math.max(10, entity.radius / 2);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeText(entity.name, entity.x, entity.y);
        ctx.fillText(entity.name, entity.x, entity.y);
    }
}

function drawVirus(virus) {
    ctx.beginPath();
    const spikes = 20;
    const outerRadius = virus.radius + 5;
    const innerRadius = virus.radius;

    for (let i = 0; i < spikes; i++) {
        const angle = (Math.PI * 2 * i) / spikes;
        const x = virus.x + Math.cos(angle) * outerRadius;
        const y = virus.y + Math.sin(angle) * outerRadius;
        ctx.lineTo(x, y);

        const angle2 = (Math.PI * 2 * (i + 0.5)) / spikes;
        const x2 = virus.x + Math.cos(angle2) * innerRadius;
        const y2 = virus.y + Math.sin(angle2) * innerRadius;
        ctx.lineTo(x2, y2);
    }

    ctx.closePath();
    ctx.fillStyle = virus.color || '#33ff33';
    ctx.fill();
    ctx.strokeStyle = '#22aa22';
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawLeaderboard() {
    const allEntities = [...Object.values(gameState.players), ...gameState.bots];
    allEntities.sort((a, b) => b.radius - a.radius);

    const top5 = allEntities.slice(0, 5);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 200, 10, 190, 150);

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Leaderboard', canvas.width - 105, 30);

    ctx.textAlign = 'left';
    ctx.font = '14px Arial';
    let y = 55;
    top5.forEach((e, i) => {
        let name = e.name || 'Bot';
        if (e.id === mySocketId) name = '(You) ' + name;
        ctx.fillText(`${i + 1}. ${name}`, canvas.width - 190, y);
        y += 20;
    });
}

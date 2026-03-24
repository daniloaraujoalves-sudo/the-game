const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimapCanvas');
const mCtx = miniCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- CONFIGURAÇÃO ---
const TILE_SIZE = 40;
const WORLD_WIDTH_PX = 600000;
const WORLD_COLS = Math.floor(WORLD_WIDTH_PX / TILE_SIZE);
const WORLD_ROWS = 90;
const REACH_DISTANCE = TILE_SIZE * 5;

// IDs: 1:Grama, 2:Terra, 3:Pedra, 4:Madeira, 5:Folha, 6:Areia, 7:Água
const DURABILITY = { 1: 15, 2: 15, 3: 40, 4: 25, 5: 10, 6: 12, 7: 999 };
const BLOCK_COLORS = { 1: "#4caf50", 2: "#795548", 3: "#9e9e9e", 4: "#5d4037", 5: "#2e7d32", 6: "#f4d03f", 7: "#3498db" };

let gameTime = 2000;
const DAY_LENGTH = 15000;

// --- ESTADO DO JOGO ---
let world = [], worldDamage = [], treeWorld = [];
const player = { x: 300000, y: 0, w: 20, h: 36, vx: 0, vy: 0, speed: 6, jump: -12, onGround: false };
let inventory = { 1: 50, 2: 50, 6: 50, 4: 50 };
let selectedSlot = 1;
const keys = {};
const camera = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 }, isMouseDown = false, isRightMouseDown = false;

// --- TEXTURAS ---
const tex = {};
function initTextures() {
    for (let id in BLOCK_COLORS) {
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 16; tCanvas.height = 16;
        const tCtx = tCanvas.getContext('2d');
        tCtx.fillStyle = BLOCK_COLORS[id];
        tCtx.fillRect(0, 0, 16, 16);
        // Detalhe visual simples
        tCtx.strokeStyle = "rgba(0,0,0,0.2)";
        tCtx.strokeRect(0, 0, 16, 16);
        tex[id] = tCanvas;
    }
}

// --- GERAÇÃO DE MUNDO ---
function getBiome(x) {
    if (x < 1500 || x > WORLD_COLS - 1500) return "OCEANO";
    let v = Math.sin(x * 0.01);
    if (v > 0.6) return "AMAZONIA";
    if (v < -0.6) return "DESERTO";
    return "FLORESTA";
}

function initWorld() {
    miniCanvas.width = WORLD_COLS;
    miniCanvas.height = WORLD_ROWS;

    for (let y = 0; y < WORLD_ROWS; y++) {
        world[y] = new Int8Array(WORLD_COLS);
        worldDamage[y] = new Int16Array(WORLD_COLS);
        treeWorld[y] = new Int8Array(WORLD_COLS);
    }

    for (let x = 0; x < WORLD_COLS; x++) {
        let biome = getBiome(x);
        let surfaceY = Math.floor(40 + Math.sin(x * 0.08) * 5);
        if (biome === "OCEANO") surfaceY = 60;

        for (let y = 0; y < WORLD_ROWS; y++) {
            if (y < surfaceY) {
                if(biome === "OCEANO" && y > 45) world[y][x] = 7;
                continue;
            }
            let type = (y === surfaceY) ? (biome === "DESERTO" ? 6 : 1) : (y < surfaceY + 8 ? 2 : 3);
            world[y][x] = type;
            worldDamage[y][x] = DURABILITY[type];
        }
    }
    drawFullMinimap();
}

// --- FUNÇÕES DE DESENHO ---
function drawFullMinimap() {
    mCtx.clearRect(0,0, miniCanvas.width, miniCanvas.height);
    for(let x=0; x<WORLD_COLS; x+=2) { // Pula alguns pra performance
        for(let y=0; y<WORLD_ROWS; y++) {
            if(world[y][x] !== 0) {
                mCtx.fillStyle = BLOCK_COLORS[world[y][x]];
                mCtx.fillRect(x, y, 2, 1);
            }
        }
    }
}

function isSolid(px, py) {
    const gx = Math.floor(px / TILE_SIZE), gy = Math.floor(py / TILE_SIZE);
    if (gx < 0 || gx >= WORLD_COLS || gy < 0) return false;
    if (gy >= WORLD_ROWS) return true;
    return world[gy][gx] !== 0 && world[gy][gx] !== 7;
}

// --- LOOP PRINCIPAL ---
function update() {
    gameTime = (gameTime + 1) % DAY_LENGTH;

    // Movimento
    player.vx = keys['KeyA'] ? -player.speed : keys['KeyD'] ? player.speed : 0;
    player.x += player.vx;
    
    // Colisão simples X
    if (isSolid(player.x, player.y + 5) || isSolid(player.x + player.w, player.y + 5)) player.x -= player.vx;

    player.vy += 0.6;
    player.y += player.vy;
    if (isSolid(player.x + 2, player.y + player.h)) {
        player.y = Math.floor((player.y + player.h) / TILE_SIZE) * TILE_SIZE - player.h;
        player.vy = 0; player.onGround = true;
    } else { player.onGround = false; }

    if (player.onGround && (keys['Space'] || keys['KeyW'])) player.vy = player.jump;

    // Câmera
    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;

    // Minimapa segue o player (efeito visual)
    let pGX = Math.floor(player.x / TILE_SIZE);
    miniCanvas.style.transform = `translateX(${(100 - pGX)}px)`;

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    const sC = Math.floor(camera.x / TILE_SIZE) - 1, eC = sC + Math.ceil(canvas.width / TILE_SIZE) + 2;
    for (let y = 0; y < WORLD_ROWS; y++) {
        for (let x = sC; x < eC; x++) {
            if (x >= 0 && x < WORLD_COLS && world[y][x] !== 0) {
                ctx.drawImage(tex[world[y][x]], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    ctx.fillStyle = "red";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.restore();
}

// --- INPUTS ---
window.onkeydown = (e) => { keys[e.code] = true; if (e.key >= '1' && e.key <= '5') { selectedSlot = parseInt(e.key); updateUI(); }};
window.onkeyup = (e) => keys[e.code] = false;

function updateUI() {
    for (let i = 1; i <= 5; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.querySelector('.count').innerText = inventory[i] || 0;
        slot.classList.toggle('selected', selectedSlot === i);
        if (!slot.querySelector('canvas') && tex[i]) {
            const icon = document.createElement('canvas'); icon.width = 16; icon.height = 16;
            icon.getContext('2d').drawImage(tex[i], 0, 0); slot.appendChild(icon);
        }
    }
}

// Iniciar
initTextures();
initWorld();
updateUI();
update();
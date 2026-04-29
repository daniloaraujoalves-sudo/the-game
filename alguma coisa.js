index.html name=index.html
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Mini Terraria - Biomas Colossais</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; font-family: 'Segoe UI', sans-serif; }
        canvas { display: block; cursor: crosshair; }
        .info { 
            position: absolute; top: 10px; left: 10px; 
            color: white; text-shadow: 1px 1px 2px black; 
            background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px;
            pointer-events: none; z-index: 10;
        }
        #inventory-ui {
            position: absolute; bottom: 20px; left: 50%;
            transform: translateX(-50%); display: flex; gap: 8px;
            background: rgba(0, 0, 0, 0.7); padding: 10px;
            border-radius: 12px; border: 2px solid #444; z-index: 100;
        }
        .slot {
            width: 45px; height: 45px; background: #333;
            border: 2px solid #666; border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
            position: relative;
        }
        .slot.selected { border-color: #fff; box-shadow: 0 0 10px #fff; background: #555; }
        .slot canvas { width: 30px; height: 30px; image-rendering: pixelated; }
        .count { position: absolute; bottom: 2px; right: 4px; color: white; font-size: 10px; font-weight: bold; }

        /* ===== MINIMAP ===== */
        #minimap-container {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 200px;
            height: 150px;
            border: 2px solid #888;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 5px;
            overflow: hidden;
            z-index: 100;
            box-shadow: 0 0 10px rgba(0,0,0,0.8);
        }
        #minimap {
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
        }
    </style>
</head>
<body>

<div class="info" id="debug-info">
    Carregando Biomas...
</div>

<!-- MINIMAP CONTAINER -->
<div id="minimap-container">
    <canvas id="minimap"></canvas>
</div>

<div id="inventory-ui">
    <div class="slot selected" id="slot-1"><div class="count">0</div></div>
    <div class="slot" id="slot-2"><div class="count">0</div></div>
    <div class="slot" id="slot-3"><div class="count">0</div></div>
    <div class="slot" id="slot-4"><div class="count">0</div></div>
    <div class="slot" id="slot-5"><div class="count">0</div></div>
</div>

<canvas id="gameCanvas"></canvas>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ====================== MINIMAP ======================
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_SCALE = 4; // 1 pixel = 4 blocos

minimapCanvas.width = MINIMAP_WIDTH;
minimapCanvas.height = MINIMAP_HEIGHT;

// ====================== CONFIGURAÇÃO ======================
const TILE_SIZE = 40;
const WORLD_WIDTH_PX = 600000;
const WORLD_COLS = Math.floor(WORLD_WIDTH_PX / TILE_SIZE);
const WORLD_ROWS = 90;
const REACH_DISTANCE = TILE_SIZE * 5;

// IDs de Blocos: 1: Grama, 2: Terra, 3: Pedra, 4: Madeira, 5: Folha, 6: Areia, 7: Água(Visual)
const DURABILITY = { 1: 15, 2: 15, 3: 40, 4: 25, 5: 10, 6: 12, 7: 999 };

let gameTime = 2000;
const DAY_LENGTH = 15000;

// --- TEXTURAS ---
const tex = {};
function initTextures() {
    const colors = {
        1: ["#4caf50", "#2e7d32", "grass"], // Grama
        2: ["#795548", "#5d4037", "block"], // Terra
        3: ["#9e9e9e", "#616161", "block"], // Pedra
        4: ["#5d4037", "#3e2723", "block"], // Madeira
        5: ["#2e7d32", "#1b5e20", "leaves"],// Folhas
        6: ["#f4d03f", "#d4ac0d", "block"], // Areia
        7: ["#3498db", "#2980b9", "water"]  // Água
    };
    for (let id in colors) {
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 16; tCanvas.height = 16;
        const tCtx = tCanvas.getContext('2d');
        tCtx.fillStyle = colors[id][0];
        tCtx.fillRect(0, 0, 16, 16);
        tCtx.fillStyle = colors[id][1];
        if(colors[id][2] === "grass") tCtx.fillRect(0, 0, 16, 5);
        if(colors[id][2] === "block") { tCtx.globalAlpha = 0.3; tCtx.fillRect(0, 13, 16, 3); tCtx.fillRect(13, 0, 3, 16); }
        if(colors[id][2] === "water") { tCtx.globalAlpha = 0.5; tCtx.fillRect(0, 0, 16, 8); }
        tex[id] = tCanvas;
    }
}

// ====================== GERAÇÃO DE MUNDO COM BIOMAS ======================
let world = [], worldDamage = [], treeWorld = [];

function getBiome(x) {
    if (x < 1500 || x > WORLD_COLS - 1500) return "OCEANO";
    
    const v = Math.sin(x * 0.01);
    if (v > 0.65) return "AMAZONIA";
    if (v < -0.65) return "DESERTO";
    return "FLORESTA";
}

function initWorld() {
    console.log("Gerando mundo com biomas...");
    
    // Inicializa arrays
    for (let y = 0; y < WORLD_ROWS; y++) {
        world[y] = new Int8Array(WORLD_COLS);
        worldDamage[y] = new Int16Array(WORLD_COLS);
        treeWorld[y] = new Int8Array(WORLD_COLS);
    }

    for (let x = 0; x < WORLD_COLS; x++) {
        const biome = getBiome(x);
        let surfaceY;

        switch (biome) {
            case "OCEANO":
                surfaceY = 58 + Math.floor(Math.sin(x * 0.04) * 4);
                break;

            case "DESERTO":
                surfaceY = 42 + Math.floor(Math.sin(x * 0.06) * 3);
                break;

            case "AMAZONIA":
                surfaceY = 28 + Math.floor(Math.sin(x * 0.09) * 11);
                break;

            case "FLORESTA":
            default:
                surfaceY = 35 + Math.floor(Math.sin(x * 0.08) * 6);
                break;
        }

        // Garante que surfaceY fique dentro dos limites razoáveis
        surfaceY = Math.max(15, Math.min(WORLD_ROWS - 30, surfaceY));

        for (let y = 0; y < WORLD_ROWS; y++) {
            if (y < surfaceY) {
                // Ar / Céu
                world[y][x] = 0;
                worldDamage[y][x] = 0;
                continue;
            }

            let type = 3; // pedra padrão

            if (y === surfaceY) {
                // Bloco de superfície
                if (biome === "OCEANO") {
                    type = 7; // água
                } else if (biome === "DESERTO") {
                    type = 6; // areia
                } else {
                    type = 1; // grama
                }
            } 
            else if (y < surfaceY + 8) {
                // Camada logo abaixo da superfície
                type = (biome === "DESERTO") ? 6 : 2; // areia ou terra
            } 
            else if (y < surfaceY + 25) {
                // Camada de transição - CORRIGIDO!
                type = 2; // terra
            }
            else if (y > surfaceY + 40 && Math.random() < 0.02) {
                // Minério de ferro
                type = 8;
            }
            else if (y > surfaceY + 70 && Math.random() < 0.015) {
                // Carvão
                type = 9;
            }
            // else → já é pedra (type = 3)

            world[y][x] = type;
            worldDamage[y][x] = DURABILITY[type] || 0;
        }
    }

    console.log("✅ Mundo gerado com sucesso!");

    // Gerar árvores
    generateTrees();
}

function generateTrees() {
    for (let x = 10; x < WORLD_COLS - 10; x += Math.floor(Math.random() * 12) + 8) {
        if (Math.random() > 0.4) {
            let groundY = -1;
            for (let y = 0; y < WORLD_ROWS; y++) {
                if (world[y][x] === 1) { groundY = y; break; }
            }
            if (groundY > 15 && groundY < WORLD_ROWS - 10) {
                let h = 4 + Math.floor(Math.random() * 4);
                // Tronco
                for (let i = 1; i <= h; i++) {
                    if (groundY - i >= 0) treeWorld[groundY - i][x] = 4;
                }
                // Copa
                let leafY = groundY - h;
                for (let ly = -3; ly <= 0; ly++) {
                    for (let lx = -2; lx <= 2; lx++) {
                        if (Math.abs(lx) + Math.abs(ly + 1) < 4) {
                            if (treeWorld[leafY + ly] && leafY + ly >= 0) {
                                treeWorld[leafY + ly][x + lx] = 5;
                            }
                        }
                    }
                }
            }
        }
    }
    console.log("✅ Árvores geradas!");
}

// --- JOGADOR ---
const player = { x: 80000, y: 0, w: 20, h: 36, vx: 0, vy: 0, speed: 6, jump: -12, onGround: false };
let inventory = { 1: 50, 2: 50, 6: 50, 4: 50 };
let selectedSlot = 1;
const keys = {};
const camera = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 }, isMouseDown = false, isRightMouseDown = false;

function isSolid(px, py) {
    const gx = Math.floor(px / TILE_SIZE), gy = Math.floor(py / TILE_SIZE);
    if (gx < 0 || gx >= WORLD_COLS || gy < 0) return false;
    if (gy >= WORLD_ROWS) return true;
    return world[gy][gx] !== 0 && world[gy][gx] !== 7; // Água não é sólida
}

window.onkeydown = (e) => { keys[e.code] = true; if (e.key >= '1' && e.key <= '5') { selectedSlot = parseInt(e.key); updateUI(); } };
window.onkeyup = (e) => keys[e.code] = false;
canvas.onmousedown = (e) => { if (e.button === 0) isMouseDown = true; if (e.button === 2) isRightMouseDown = true; };
window.onmouseup = () => { isMouseDown = false; isRightMouseDown = false; };
canvas.onmousemove = (e) => { mousePos.x = e.clientX + camera.x; mousePos.y = e.clientY + camera.y; };
canvas.oncontextmenu = (e) => e.preventDefault();

// ====================== FUNÇÃO MINIMAP ======================
function updateMinimap() {
    const ctx = minimapCtx;
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Calcula qual região do mundo mostrar no minimap (centralizado no jogador)
    const playerBlockX = Math.floor(player.x / TILE_SIZE);
    const playerBlockY = Math.floor(player.y / TILE_SIZE);
    
    const startBlockX = Math.max(0, playerBlockX - Math.floor(MINIMAP_WIDTH / (2 * MINIMAP_SCALE)));
    const startBlockY = Math.max(0, playerBlockY - Math.floor(MINIMAP_HEIGHT / (2 * MINIMAP_SCALE)));

    // Renderizar cada pixel do minimap
    for (let my = 0; my < MINIMAP_HEIGHT; my++) {
        for (let mx = 0; mx < MINIMAP_WIDTH; mx++) {
            const worldBlockX = startBlockX + Math.floor(mx / MINIMAP_SCALE);
            const worldBlockY = startBlockY + Math.floor(my / MINIMAP_SCALE);

            // Fora do mundo = preto
            if (worldBlockX < 0 || worldBlockX >= WORLD_COLS || worldBlockY < 0 || worldBlockY >= WORLD_ROWS) {
                ctx.fillStyle = "#000000";
            } else {
                const tile = world[worldBlockY][worldBlockX];
                const tree = treeWorld[worldBlockY][worldBlockX];

                // Prioridade: árvore > bloco > ar
                if (tree !== 0) {
                    switch (tree) {
                        case 4: ctx.fillStyle = "#8B4513"; break; // madeira
                        case 5: ctx.fillStyle = "#228B22"; break; // folhas
                        default: ctx.fillStyle = "#333333"; break;
                    }
                } else {
                    switch (tile) {
                        case 0: ctx.fillStyle = "#1a1a2e"; break; // ar (azul muito escuro)
                        case 1: ctx.fillStyle = "#4caf50"; break; // grama
                        case 2: ctx.fillStyle = "#795548"; break; // terra
                        case 3: ctx.fillStyle = "#9e9e9e"; break; // pedra
                        case 6: ctx.fillStyle = "#f4d03f"; break; // areia
                        case 7: ctx.fillStyle = "#3498db"; break; // água
                        default: ctx.fillStyle = "#333333"; break;
                    }
                }
            }

            ctx.fillRect(mx, my, 1, 1);
        }
    }

    // Desenhar o jogador no minimap (quadrado vermelho no centro)
    const playerScreenX = Math.floor(MINIMAP_WIDTH / 2);
    const playerScreenY = Math.floor(MINIMAP_HEIGHT / 2);
    
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(playerScreenX - 2, playerScreenY - 2, 5, 5);

    // Borda branca ao redor do jogador
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(playerScreenX - 3, playerScreenY - 3, 7, 7);
}

function update() {
    gameTime = (gameTime + 1) % DAY_LENGTH;
    
    // MOVIMENTO X
    player.vx = keys['KeyA'] ? -player.speed : keys['KeyD'] ? player.speed : 0;
    player.x = Math.max(0, Math.min(player.x + player.vx, WORLD_WIDTH_PX - player.w));

    // Colisão X
    if (isSolid(player.x, player.y + 5) || isSolid(player.x + player.w, player.y + 5) ||
        isSolid(player.x, player.y + player.h - 5) || isSolid(player.x + player.w, player.y + player.h - 5)) {
        if (player.vx > 0) player.x = Math.floor((player.x + player.w) / TILE_SIZE) * TILE_SIZE - player.w - 0.1;
        else if (player.vx < 0) player.x = Math.floor(player.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.1;
    }

    // Gravidade / Pulo
    player.vy += 0.6;
    player.y += player.vy;
    player.onGround = false;
    
    if (isSolid(player.x + 2, player.y + player.h) || isSolid(player.x + player.w - 2, player.y + player.h)) {
        player.y = Math.floor((player.y + player.h) / TILE_SIZE) * TILE_SIZE - player.h;
        player.vy = 0; 
        player.onGround = true;
    }
    
    if (player.onGround && (keys['Space'] || keys['KeyW'])) player.vy = player.jump;

    // Interação
    const gx = Math.floor(mousePos.x / TILE_SIZE), gy = Math.floor(mousePos.y / TILE_SIZE);
    if (Math.hypot(mousePos.x - (player.x + 10), mousePos.y - (player.y + 18)) <= REACH_DISTANCE && world[gy]) {
        if (isMouseDown && (world[gy][gx] !== 0 || treeWorld[gy][gx] !== 0)) {
            if (world[gy][gx] !== 0 && world[gy][gx] !== 7) {
                worldDamage[gy][gx]--;
                if(worldDamage[gy][gx] <= 0) { 
                    inventory[world[gy][gx]] = (inventory[world[gy][gx]] || 0) + 1; 
                    world[gy][gx] = 0; 
                    updateUI(); 
                }
            } else if (treeWorld[gy][gx] !== 0) {
                inventory[treeWorld[gy][gx]] = (inventory[treeWorld[gy][gx]] || 0) + 1; 
                treeWorld[gy][gx] = 0; 
                updateUI();
            }
        }
        if (isRightMouseDown && world[gy][gx] === 0 && treeWorld[gy][gx] === 0 && inventory[selectedSlot] > 0) {
            world[gy][gx] = selectedSlot; 
            worldDamage[gy][gx] = DURABILITY[selectedSlot]; 
            inventory[selectedSlot]--; 
            updateUI();
        }
    }

    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;
    camera.x = Math.max(0, Math.min(camera.x, WORLD_WIDTH_PX - canvas.width));

    document.getElementById('debug-info').innerText = 
        `X: ${Math.floor(player.x)} | Bioma: ${getBiome(Math.floor(player.x/TILE_SIZE))} | Blocos: ${Object.values(inventory).reduce((a,b)=>a+b,0)}`;
    
    // ✅ Atualizar minimap a cada frame
    updateMinimap();
    
    draw();
    requestAnimationFrame(update);
}

function draw() {
    let dayRatio = Math.sin((gameTime / DAY_LENGTH) * Math.PI * 2); 
    ctx.fillStyle = `rgb(0, ${Math.max(10, 60 + dayRatio * 100)}, ${Math.max(20, 100 + dayRatio * 155)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    const sC = Math.floor(camera.x / TILE_SIZE) - 1, eC = sC + Math.ceil(canvas.width / TILE_SIZE) + 2;
    for (let y = 0; y < WORLD_ROWS; y++) {
        for (let x = sC; x < eC; x++) {
            if (x < 0 || x >= WORLD_COLS) continue;
            if (treeWorld[y][x] !== 0) ctx.drawImage(tex[treeWorld[y][x]], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            if (world[y][x] !== 0) ctx.drawImage(tex[world[y][x]], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    ctx.fillStyle = "#ff5722";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.restore();

    let nightOpacity = Math.max(0, -dayRatio * 0.65);
    ctx.fillStyle = `rgba(0, 0, 30, ${nightOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function updateUI() {
    for (let i = 1; i <= 5; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.querySelector('.count').innerText = inventory[i] || 0;
        slot.classList.toggle('selected', selectedSlot === i);
        if (!slot.querySelector('canvas') && tex[i]) {
            const icon = document.createElement('canvas'); 
            icon.width = 16; 
            icon.height = 16;
            icon.getContext('2d').drawImage(tex[i], 0, 0); 
            slot.appendChild(icon);
        }
    }
}

// ====================== INICIALIZAÇÃO ======================
initTextures();
initWorld();
updateUI();
update();
</script>
</body>
</html>
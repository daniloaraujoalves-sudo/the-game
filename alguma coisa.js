function update() {
    // 1. Movimento Lateral e Colisão
    player.vx = keys['KeyA'] ? -player.speed : keys['KeyD'] ? player.speed : 0;
    player.x += player.vx;

    // Checa colisão horizontal (Direita e Esquerda)
    if (player.vx !== 0) {
        // Verifica pontos em diferentes alturas do personagem para não atravessar quinas
        if (isSolid(player.x, player.y + 5) || 
            isSolid(player.x, player.y + player.h - 5) ||
            isSolid(player.x + player.w, player.y + 5) || 
            isSolid(player.x + player.w, player.y + player.h - 5)) {
            
            // Se bateu andando para a direita, cola na esquerda do bloco
            if (player.vx > 0) player.x = Math.floor((player.x + player.w) / TILE_SIZE) * TILE_SIZE - player.w - 1;
            // Se bateu andando para a esquerda, cola na direita do bloco
            else if (player.vx < 0) player.x = Math.floor(player.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 1;
            
            player.vx = 0;
        }
    }

    // 2. Gravidade e Colisão Vertical
    player.vy += 0.6;
    player.y += player.vy;
    player.onGround = false;

    // Checa colisão vertical (Chão e Teto)
    if (isSolid(player.x + 4, player.y + player.h) || isSolid(player.x + player.w - 4, player.y + player.h)) {
        player.y = Math.floor((player.y + player.h) / TILE_SIZE) * TILE_SIZE - player.h;
        player.vy = 0;
        player.onGround = true;
    } else if (isSolid(player.x + 4, player.y) || isSolid(player.x + player.w - 4, player.y)) {
        player.y = Math.floor(player.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
        player.vy = 0;
    }

    // Pulo
    if (player.onGround && (keys['Space'] || keys['KeyW'])) {
        player.vy = player.jump;
    }

    // 3. Resto da lógica (Mineração/Câmera)
    const gx = Math.floor(mousePos.x / TILE_SIZE);
    const gy = Math.floor(mousePos.y / TILE_SIZE);
    const dist = Math.hypot(mousePos.x - (player.x + player.w/2), mousePos.y - (player.y + player.h/2));

    if (dist <= REACH_DISTANCE && world[gy]) {
        if (isMouseDown && world[gy][gx] !== 0) {
            worldDamage[gy][gx]--;
            if(worldDamage[gy][gx] <= 0) {
                inventory[world[gy][gx]]++;
                world[gy][gx] = 0;
                updateUI();
            }
        }
        if (isRightMouseDown && inventory[selectedSlot] > 0 && world[gy][gx] === 0) {
            // Verifica se não está tentando construir dentro do próprio corpo
            if (!(gx === Math.floor((player.x+5)/TILE_SIZE) && gy === Math.floor(player.y/TILE_SIZE)) &&
                !(gx === Math.floor((player.x+player.w-5)/TILE_SIZE) && gy === Math.floor((player.y+player.h-5)/TILE_SIZE))) {
                world[gy][gx] = selectedSlot;
                worldDamage[gy][gx] = DURABILITY[selectedSlot];
                inventory[selectedSlot]--;
                updateUI();
            }
        }
    }

    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;

    draw();
    requestAnimationFrame(update);
}
// ====================== MINI-MAPA ======================

const MINIMAP_SIZE = 200;           // tamanho em pixels do mini-mapa na tela
const MINIMAP_SCALE = 4;            // 1 pixel do mini-mapa = 4 blocos do mundo (quanto maior, mais zoom out)

let minimapCanvas, minimapCtx;

function createMinimap() {
    minimapCanvas = document.createElement("canvas");
    minimapCanvas.width = MINIMAP_SIZE;
    minimapCanvas.height = MINIMAP_SIZE;
    minimapCanvas.style.position = "absolute";
    minimapCanvas.style.top = "10px";
    minimapCanvas.style.right = "10px";
    minimapCanvas.style.border = "2px solid white";
    minimapCanvas.style.borderRadius = "4px";
    minimapCanvas.style.imageRendering = "pixelated"; // deixa nítido
    minimapCanvas.style.zIndex = "100";
    
    document.body.appendChild(minimapCanvas);
    minimapCtx = minimapCanvas.getContext("2d");
}

function updateMinimap(playerX, playerY) {
    const ctx = minimapCtx;
    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const startX = Math.floor(playerX / MINIMAP_SCALE) - MINIMAP_SIZE / 2;
    const startY = Math.floor(playerY / MINIMAP_SCALE) - MINIMAP_SIZE / 2;

    for (let mx = 0; mx < MINIMAP_SIZE; mx++) {
        for (let my = 0; my < MINIMAP_SIZE; my++) {
            const worldX = startX + mx;
            const worldY = startY + my;

            // fora do mundo = preto
            if (worldX < 0 || worldX >= WORLD_COLS || worldY < 0 || worldY >= WORLD_ROWS) {
                ctx.fillStyle = "#000000";
            } 
            else {
                const tile = world[worldY][worldX];

                switch (tile) {
                    case 0:  ctx.fillStyle = "#87CEEB"; break; // céu (azul claro)
                    case 1:  ctx.fillStyle = "#228B22"; break; // grama
                    case 2:  ctx.fillStyle = "#8B4513"; break; // terra
                    case 3:  ctx.fillStyle = "#555555"; break; // pedra
                    case 6:  ctx.fillStyle = "#F4A460"; break; // areia/deserto
                    case 7:  ctx.fillStyle = "#1E90FF"; break; // água
                    default: ctx.fillStyle = "#333333"; break;
                }
            }

            ctx.fillRect(mx, my, 1, 1);
        }
    }

    // Desenha o jogador no mini-mapa (um quadradinho vermelho)
    const playerScreenX = Math.floor(MINIMAP_SIZE / 2);
    const playerScreenY = Math.floor(MINIMAP_SIZE / 2);
    
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(playerScreenX - 2, playerScreenY - 2, 5, 5);

    // Borda branca ao redor do jogador
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(playerScreenX - 3, playerScreenY - 3, 7, 7);
}

// ====================== Como usar ======================

// 1. Chame isso uma vez depois de criar o canvas do jogo
// createMinimap();

// 2. Chame isso todo frame (dentro do game loop)
updateMinimap(player.x, player.y);
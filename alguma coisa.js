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
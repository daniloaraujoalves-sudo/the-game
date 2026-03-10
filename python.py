import pygame
import random

# --- Configurações ---
WIDTH, HEIGHT = 800, 600
TILE_SIZE = 40  # Tamanho de cada bloco
GRID_WIDTH = WIDTH // TILE_SIZE
GRID_HEIGHT = HEIGHT // TILE_SIZE

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
clock = pygame.time.Clock()

# Cores
SKY_BLUE = (135, 206, 235)
DIRT = (155, 118, 83)
GRASS = (34, 139, 34)
PLAYER_COLOR = (255, 100, 100)

# --- Gerador de Mundo Simples ---
world = []
for y in range(GRID_HEIGHT):
    row = []
    for x in range(GRID_WIDTH):
        if y > 10: # Define onde o chão começa
            row.append(1) # 1 = Bloco de terra
        else:
            row.append(0) # 0 = Ar
    world.append(row)

# --- Classe do Jogador ---
class Player:
    def __init__(self):
        self.rect = pygame.Rect(100, 100, 30, 50)
        self.vel_y = 0
        self.speed = 5
        self.jump_power = -12
        self.on_ground = False

    def update(self, tiles):
        # Gravidade
        self.vel_y += 0.8
        self.rect.y += self.vel_y
        self.on_ground = False

        # Colisão Vertical
        for tile in tiles:
            if self.rect.colliderect(tile):
                if self.vel_y > 0:
                    self.rect.bottom = tile.top
                    self.vel_y = 0
                    self.on_ground = True
                elif self.vel_y < 0:
                    self.rect.top = tile.bottom
                    self.vel_y = 0

        # Movimento Horizontal
        keys = pygame.key.get_pressed()
        dx = (keys[pygame.K_RIGHT] - keys[pygame.K_LEFT]) * self.speed
        self.rect.x += dx

        # Colisão Horizontal
        for tile in tiles:
            if self.rect.colliderect(tile):
                if dx > 0: self.rect.right = tile.left
                if dx < 0: self.rect.left = tile.right

        if keys[pygame.K_SPACE] and self.on_ground:
            self.vel_y = self.jump_power

player = Player()
running = True

while running:
    screen.fill(SKY_BLUE)
    tile_rects = []

    # 1. Eventos e Mineração
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        
        # Clique do mouse para "Minerar" (remover bloco)
        if event.type == pygame.MOUSEBUTTONDOWN:
            mx, my = pygame.mouse.get_pos()
            grid_x, grid_y = mx // TILE_SIZE, my // TILE_SIZE
            if 0 <= grid_x < GRID_WIDTH and 0 <= grid_y < GRID_HEIGHT:
                world[grid_y][grid_x] = 0 # Transforma em ar

    # 2. Desenhar o Mundo e coletar colisões
    for y, row in enumerate(world):
        for x, tile in enumerate(row):
            if tile == 1:
                color = GRASS if world[y-1][x] == 0 else DIRT
                rect = pygame.Rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                pygame.draw.rect(screen, color, rect)
                pygame.draw.rect(screen, (0,0,0), rect, 1) # Borda do bloco
                tile_rects.append(rect)

    # 3. Atualizar Jogador
    player.update(tile_rects)
    pygame.draw.rect(screen, PLAYER_COLOR, player.rect)

    pygame.display.flip()
    clock.tick(60)

pygame.quit()
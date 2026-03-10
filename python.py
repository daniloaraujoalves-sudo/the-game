import pygame

# 1. Configurações Iniciais
pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Meu Jogo 2D")
clock = pygame.time.Clock()
running = True

# Cores (RGB)
WHITE = (255, 255, 255)
BLUE = (0, 100, 255)

# 2. Definição de Objetos (Ex: Jogador)
player_pos = [WIDTH // 2, HEIGHT // 2]
player_speed = 5

# 3. Game Loop Principal
while running:
    # --- Gerenciamento de Eventos ---
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # --- Lógica de Movimentação ---
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:  player_pos[0] -= player_speed
    if keys[pygame.K_RIGHT]: player_pos[0] += player_speed
    if keys[pygame.K_UP]:    player_pos[1] -= player_speed
    if keys[pygame.K_DOWN]:  player_pos[1] += player_speed

    # --- Desenho e Renderização ---
    screen.fill(WHITE) # Limpa a tela
    
    # Desenha o "jogador" (um quadrado azul)
    pygame.draw.rect(screen, BLUE, (player_pos[0], player_pos[1], 50, 50))

    pygame.display.flip() # Atualiza a tela
    clock.tick(60) # Limita a 60 FPS

pygame.quit()
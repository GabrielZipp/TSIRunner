document.addEventListener('DOMContentLoaded', () => {


    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const scoreDisplay = document.getElementById('score');
    const backgroundScroll = document.getElementById('background-scroll');
    const victoryScene = document.getElementById('victory-scene');
    
    // Configuração baseada nas variáveis CSS (50px)
    const PLAYER_HEIGHT = 50; 
    const GROUND_Y = 20; 
    const GAME_WIDTH = 800; 
    const SCORE_INCREMENT = 6;
    const MAX_SCORE = 100; // ALTERAÇÃO 1: Aumentado de 50 para 100
    
    let isJumping = false;
    let isDucking = false;
    let isGameRunning = false;
    let verticalVelocity = 0;
    let gravity = 0.7;
    let jumpForce = 19;
    let gameSpeed = 6; 
    let score = 0;
    let obstacles = [];
    let lastObstacleTime = 0;
    const OBSTACLE_INTERVAL_MIN = 800;
    const OBSTACLE_INTERVAL_MAX = 1500;
    
    // --- FUNÇÕES DE LÓGICA DO JOGO ---

    /**
     * Atualiza a posição e a classe visual do jogador
     */
    function updatePlayerVisual(bottom, className) {
        player.style.bottom = `${bottom}px`;
        player.className = className;
    }

    // Gerencia PULO (W)
    function handleJump() {
        if (!isJumping &&!isDucking && isGameRunning) {
            isJumping = true;
            verticalVelocity = jumpForce;
            // Define a pose de pulo na sprite sheet
            updatePlayerVisual(GROUND_Y, 'player-jump'); 
        }
    }

    // Gerencia AGACHAR (S)
    function handleDuck(isDown) {
        if (isJumping || !isGameRunning) return;
        
        isDucking = isDown;
        if (isDucking) {
            updatePlayerVisual(GROUND_Y, 'player-duck'); 
        } else {
            // Volta para a pose de corrida após agachar
            updatePlayerVisual(GROUND_Y, 'player-run');
        }
    }

    // Aplica a física (Pulo e Gravidade)
    function applyPhysics() {
        if (isJumping) {
            const currentBottom = parseFloat(player.style.bottom);
            let newBottom = currentBottom + verticalVelocity;
            verticalVelocity -= gravity; 

            // Volta para o chão
            if (newBottom <= GROUND_Y) {
                newBottom = GROUND_Y;
                isJumping = false;
                verticalVelocity = 0;
                // Volta para a pose de corrida ao tocar o chão
                // Apenas volta a correr se não estiver agachado
                if (!isDucking) {
                    updatePlayerVisual(newBottom, 'player-run');
                }
            } else {
                player.style.bottom = `${newBottom}px`;
            }
        }
    }

    /**
     * Cria e insere um novo obstáculo na cena [1]
     */
    function createObstacle() {
        const obstacle = document.createElement('div');
        obstacle.classList.add('obstacle');
 
        // Decide aleatoriamente se o obstáculo será voador ou terrestre
        const isFlying = Math.random() > 0.5; // 50% de chance de ser voador

        if (isFlying && score > 6) { // Obstáculos voadores aparecem após 6 pontos
            obstacle.classList.add('obstacle-flying');
            obstacle.textContent = 'TCC!';
        } else {
            // Obstáculo terrestre padrão
            const code = Array(5).fill(0).map(() => 
                String.fromCharCode(65 + Math.floor(Math.random() * 26))
            ).join('');
            obstacle.textContent = code;
        }
        
        obstacle.style.left = `${GAME_WIDTH}px`; 
        gameContainer.appendChild(obstacle);
        obstacles.push(obstacle);
        
        lastObstacleTime = performance.now() + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN) + OBSTACLE_INTERVAL_MIN;
    }

    /**
     * Checa a colisão AABB (Axis-Aligned Bounding Box) [2, 3]
     */
    function checkCollision() {
        const pRect = player.getBoundingClientRect();
        const playerBox = {
            left: pRect.left,
            right: pRect.right,
            top: pRect.top,
            bottom: pRect.bottom
        };

        // Se o jogador está agachado, ajustamos a caixa de colisão manualmente.
        // A metade superior do personagem é considerada "vazia".
        if (isDucking) {
            playerBox.top = pRect.top + (pRect.height / 2);
        }

        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const oRect = obstacle.getBoundingClientRect();
            
            const collision =!(
                playerBox.right < oRect.left || // Player à esquerda
                playerBox.left > oRect.right || // Player à direita
                playerBox.bottom < oRect.top || // Player acima
                playerBox.top > oRect.bottom    // Player abaixo
            );
            
            if (collision) {
                gameOver();
                return true;
            }
        }
        return false;
    }

    /**
     * Move obstáculos, remove os passados e atualiza a pontuação
     */
    function updateObstacles(deltaTime) {
        
        obstacles.forEach(obstacle => {
            const currentX = parseFloat(obstacle.style.left); 
            const newX = currentX - gameSpeed * (deltaTime / 16.66);

            obstacle.style.left = `${newX}px`;

            // Verificação de Pontuação (Passou do jogador)
            if (currentX > 50 && newX <= 50) { 
                score += SCORE_INCREMENT;
                scoreDisplay.textContent = `Pontos: ${score} / ${MAX_SCORE}`;
                
                if (score >= MAX_SCORE) {
                    handleVictory();
                }
            }
        });
        
        // Remove obstáculos fora da tela
        obstacles = obstacles.filter(obstacle => {
            const currentX = parseFloat(obstacle.style.left);
            if (currentX < -50) {
                obstacle.remove();
                return false; 
            }
            return true;
        });
    }

    /**
     * Aumenta a velocidade do jogo gradativamente [4]
     */
   // ...
    function increaseDifficulty() {
        // Reduza a frequência (e.g., de 15 para 20) OU diminua o incremento
        if (score % 20 === 0 && score > 0 && score!== MAX_SCORE) { // Aumenta a cada 20 pontos

            // Reduza o incremento de velocidade, por exemplo, de 0.5 para 0.3
            gameSpeed += 0.3; 
            
            // Você também pode reduzir o aumento da força de pulo e da gravidade
            jumpForce += 0.1;  
            gravity += 0.01;

        }
    }

            // ... (restante da função)
// ...


    // --- GAME LOOP E CONTROLE ---

    let animationFrameId;
    let lastTime = 0;

    function gameLoop(time) {
        if (!isGameRunning || animationFrameId === null) return; 

        const deltaTime = time - lastTime;
        lastTime = time;

        applyPhysics();
        updateObstacles(deltaTime);
        
        if (checkCollision()) {
            return;
        }

        // Geração de Obstáculos: verifica se o tempo desde o último obstáculo é suficiente
        if (time > lastObstacleTime) {
            createObstacle();
        }

        increaseDifficulty();

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        // Redefine todas as variáveis de estado
        player.style.bottom = `${GROUND_Y}px`; 
        scoreDisplay.textContent = `Pontos: 0 / ${MAX_SCORE}`;
        player.className = 'player-run';
        gameSpeed = 6;
        score = 0;
        isJumping = false;
        isDucking = false;
        isGameRunning = true;

        // Restaura a física e a velocidade para os valores iniciais
        gravity = 0.7;
        jumpForce = 19;
        backgroundScroll.style.animationDuration = '5s';
        
        obstacles.forEach(o => o.remove());
        obstacles = []; // Redefinição correta
        
        gameContainer.classList.remove('fade-out');
        gameContainer.style.display = 'block';
        victoryScene.classList.add('hidden');
        
        // Inicializa o loop
        lastObstacleTime = performance.now() + 1000; // Delay inicial de 1s
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        
        // Remove a classe de animação CSS de 'paused' se houver (dependendo do styles.css)
        backgroundScroll.style.animationPlayState = 'running';
    }
    
    // Função para configurar o jogo antes do início (tela de espera)
    function setupGame() {
        isGameRunning = false;
        player.style.bottom = `${GROUND_Y}px`; 
        player.className = 'player-run';
        scoreDisplay.textContent = `Pressione W ou ESPAÇO para começar`;
        
        // Pausa a animação do fundo, esperando o input
        backgroundScroll.style.animationPlayState = 'paused';
    }


    function gameOver() {
        isGameRunning = false;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        gameContainer.style.borderColor = 'red';
        player.className = 'player-jump'; // Pose estática de colisão
        backgroundScroll.style.animationPlayState = 'paused';
    }
    
    /**
     * Gerencia a Transição para o Cenário de Vitória usando transitionend [7, 8]
     */
    function handleVictory() {
        isGameRunning = false;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        backgroundScroll.style.animationPlayState = 'paused';
        
        // Passo 1: Inicia o fade-out [8]
        gameContainer.classList.add('fade-out');

        // Passo 2: Ouve o evento 'transitionend' [7]
        gameContainer.addEventListener('transitionend', function transitionFinished(e) {
            
            if (e.propertyName === 'opacity') {
                // Passo 3: Troca a cena
                gameContainer.classList.add('hidden');
                victoryScene.classList.remove('hidden');

                gameContainer.removeEventListener('transitionend', transitionFinished);
            }
        });
    }


    // --- LISTENERS DE INPUT (W e S) [4] ---

    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        // Se o jogo não estiver rodando, qualquer input começa o jogo
        if (!isGameRunning) {
            if (key === 'w' || key === ' ' || key === 's') {
                startGame();
            }
            return;
        }

        // Se o jogo estiver rodando:
        if (animationFrameId!== null) { 
            if (key === 'w' || key === ' ') { 
                handleJump();
            } else if (key === 's') { 
                handleDuck(true);
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        
        if (isGameRunning && animationFrameId!== null) {
            // Soltar 'S' retorna ao estado de corrida
            if (key === 's') {
                handleDuck(false);
            }
        }
    });

    // Configura o jogo na tela de espera ao carregar
    setupGame();
});
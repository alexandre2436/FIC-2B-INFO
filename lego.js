const game = document.getElementById("game");
const ninja = document.getElementById("ninja");
const objects = document.getElementById("objects");

const scoreElement = document.getElementById("score");
const message = document.getElementById("message");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const jumpButton = document.getElementById("jumpButton");

// ==============================
// ESTADO DO JOGO
// ==============================

let running = false;
let paused = false;
let gameOver = false;

let score = 0;

let ninjaX = 0;
let ninjaY = 0;
let velocityY = 0;

let movingLeft = false;
let movingRight = false;
let jumping = false;

let obstacles = [];

let lastTime = 0;
let spawnTimer = 0;
let nextSpawn = 1.5;
let animationId = null;

const gravity = 1800;
const jumpForce = 650;
const moveSpeed = 350;

// ==============================
// CHÃO
// ==============================

function getGroundTop() {
    if (game.clientHeight <= 500) {
        return game.clientHeight - 65;
    }

    return game.clientHeight - 100;
}

// ==============================
// REINICIAR
// ==============================

function resetGame() {
    score = 0;

    ninjaX = game.clientWidth * 0.15;
    ninjaY = getGroundTop() - ninja.offsetHeight;
    velocityY = 0;

    movingLeft = false;
    movingRight = false;
    jumping = false;

    obstacles = [];
    spawnTimer = 0;
    nextSpawn = 1.5;

    objects.innerHTML = "";
    scoreElement.textContent = "00000";

    ninja.classList.remove("running", "jumping");

    ninja.style.left = ninjaX + "px";
    ninja.style.top = ninjaY + "px";

    pauseButton.textContent = "Ⅱ PAUSAR";
}

// ==============================
// INICIAR O JOGO
// ==============================

function startGame() {
    if (running && !gameOver) return;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    resetGame();

    running = true;
    paused = false;
    gameOver = false;

    message.style.display = "none";

    lastTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", startGame);

// ==============================
// MOVIMENTAR O NINJA
// ==============================

function moveNinja(deltaTime) {
    const maxX = game.clientWidth - ninja.offsetWidth;

    if (movingLeft) {
        ninjaX -= moveSpeed * deltaTime;
    }

    if (movingRight) {
        ninjaX += moveSpeed * deltaTime;
    }

    ninjaX = Math.max(0, Math.min(ninjaX, maxX));

    // Gravidade e pulo
    velocityY += gravity * deltaTime;
    ninjaY += velocityY * deltaTime;

    const groundY = getGroundTop() - ninja.offsetHeight;

    if (ninjaY >= groundY) {
        ninjaY = groundY;
        velocityY = 0;
        jumping = false;
    }

    ninja.style.left = ninjaX + "px";
    ninja.style.top = ninjaY + "px";

    ninja.classList.toggle(
        "running",
        (movingLeft || movingRight) && !jumping
    );

    ninja.classList.toggle("jumping", jumping);
}

// ==============================
// PULAR
// ==============================

function jump() {
    if (!running || paused || gameOver) return;

    if (!jumping) {
        jumping = true;
        velocityY = -jumpForce;
    }
}

// ==============================
// CONTROLES DO TECLADO
// ==============================

document.addEventListener("keydown", function(event) {
    const key = event.key.toLowerCase();

    if (
        ["arrowleft", "arrowright", "arrowup", " "].includes(key)
    ) {
        event.preventDefault();
    }

    if (key === "arrowleft" || key === "a") {
        movingLeft = true;
    }

    if (key === "arrowright" || key === "d") {
        movingRight = true;
    }

    if (
        key === "arrowup" ||
        key === "w" ||
        key === " "
    ) {
        jump();
    }

    if (key === "escape") {
        togglePause();
    }
});

document.addEventListener("keyup", function(event) {
    const key = event.key.toLowerCase();

    if (key === "arrowleft" || key === "a") {
        movingLeft = false;
    }

    if (key === "arrowright" || key === "d") {
        movingRight = false;
    }
});

// Evita movimento preso ao trocar de janela
window.addEventListener("blur", function() {
    movingLeft = false;
    movingRight = false;
});

// ==============================
// CONTROLES PARA CELULAR
// ==============================

function holdButton(button, onPress, onRelease) {
    button.addEventListener("pointerdown", function(event) {
        event.preventDefault();

        onPress();

        if (button.setPointerCapture) {
            button.setPointerCapture(event.pointerId);
        }
    });

    button.addEventListener("pointerup", onRelease);
    button.addEventListener("pointercancel", onRelease);
    button.addEventListener("lostpointercapture", onRelease);
}

holdButton(
    leftButton,
    function() {
        movingLeft = true;
    },
    function() {
        movingLeft = false;
    }
);

holdButton(
    rightButton,
    function() {
        movingRight = true;
    },
    function() {
        movingRight = false;
    }
);

jumpButton.addEventListener("pointerdown", function(event) {
    event.preventDefault();
    jump();
});

// ==============================
// PAUSAR E CONTINUAR
// ==============================

function togglePause() {
    if (!running || gameOver) return;

    paused = !paused;

    if (paused) {
        pauseButton.textContent = "▶ CONTINUAR";
        movingLeft = false;
        movingRight = false;
    } else {
        pauseButton.textContent = "Ⅱ PAUSAR";
        lastTime = performance.now();
    }
}

pauseButton.addEventListener("click", togglePause);

// ==============================
// CRIAR OBSTÁCULOS
// ==============================

function createObstacle() {
    const element = document.createElement("div");

    element.classList.add("obstacle");

    const x = game.clientWidth + 10;
    const y = getGroundTop() - 53;

    element.style.left = x + "px";
    element.style.top = y + "px";

    objects.appendChild(element);

    obstacles.push({
        element: element,
        x: x,
        y: y,
        width: 42,
        height: 53,
        speed: 260 + Math.min(score * 0.15, 180)
    });
}

// ==============================
// GERAR OBSTÁCULOS
// ==============================

function spawnObjects(deltaTime) {
    spawnTimer += deltaTime;

    if (spawnTimer >= nextSpawn) {
        createObstacle();

        spawnTimer = 0;
        nextSpawn = 1.4 + Math.random() * 0.8;
    }
}

// ==============================
// COLISÕES
// ==============================

function isColliding(a, b) {
    return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );
}

function checkCollisions() {
    const ninjaRect = ninja.getBoundingClientRect();

    for (const obj of obstacles) {
        const rect = obj.element.getBoundingClientRect();

        if (isColliding(ninjaRect, rect)) {
            endGame();
            return;
        }
    }
}

// ==============================
// MOVIMENTAR OBSTÁCULOS
// ==============================

function updateObjects(deltaTime) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];

        obj.x -= obj.speed * deltaTime;
        obj.element.style.left = obj.x + "px";

        if (obj.x + obj.width < 0) {
            obj.element.remove();
            obstacles.splice(i, 1);
        }
    }
}

// ==============================
// PONTUAÇÃO
// ==============================

function updateScore(deltaTime) {
    score += deltaTime * 10;

    scoreElement.textContent = String(
        Math.floor(score)
    ).padStart(5, "0");
}

// ==============================
// FIM DE JOGO
// ==============================

function endGame() {
    running = false;
    paused = false;
    gameOver = true;

    movingLeft = false;
    movingRight = false;

    ninja.classList.remove("running", "jumping");

    message.innerHTML = `
        <h1 class="game-over-title">FIM DE JOGO!</h1>
        <p>Sua pontuação: ${Math.floor(score)}</p>
        <p>Não desista, ninja! Tente novamente.</p>
        <button id="startButton">JOGAR NOVAMENTE</button>
    `;

    message.style.display = "flex";

    document.getElementById("startButton")
        .addEventListener("click", startGame);

    pauseButton.textContent = "Ⅱ PAUSAR";
}

// ==============================
// LOOP PRINCIPAL
// ==============================

function gameLoop(timestamp) {
    if (!running || gameOver) {
        animationId = null;
        return;
    }

    animationId = requestAnimationFrame(gameLoop);

    if (paused) {
        lastTime = timestamp;
        return;
    }

    const deltaTime = Math.min(
        (timestamp - lastTime) / 1000,
        0.035
    );

    lastTime = timestamp;

    moveNinja(deltaTime);
    spawnObjects(deltaTime);
    updateObjects(deltaTime);
    checkCollisions();

    if (!running) return;

    updateScore(deltaTime);
}

// ==============================
// AJUSTAR AO REDIMENSIONAR A TELA
// ==============================

window.addEventListener("resize", function() {
    const maxX = game.clientWidth - ninja.offsetWidth;

    ninjaX = Math.max(0, Math.min(ninjaX, maxX));

    if (running || gameOver) {
        ninja.style.left = ninjaX + "px";

        if (!jumping) {
            ninjaY = getGroundTop() - ninja.offsetHeight;
            ninja.style.top = ninjaY + "px";
        }
    }
});

// Posição inicial do ninja
ninjaX = game.clientWidth * 0.15;
ninjaY = getGroundTop() - ninja.offsetHeight;

ninja.style.left = ninjaX + "px";
ninja.style.top = ninjaY + "px";

// ==============================
// ELEMENTOS DO HTML
// ==============================

const game = document.getElementById("game");
const ninja = document.getElementById("ninja");
const objects = document.getElementById("objects");

const scoreElement = document.getElementById("score");
const coinsElement = document.getElementById("coins");
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
let coins = 0;

let ninjaX = 0;
let ninjaY = 0;
let velocityY = 0;

let movingLeft = false;
let movingRight = false;
let jumping = false;

let obstacles = [];
let lastTime = 0;
let spawnTimer = 0;
let coinTimer = 0;
let animationId = null;

const gravity = 1800;
const jumpForce = 650;
const moveSpeed = 350;
const groundHeight = 100;

// ==============================
// POSIÇÃO INICIAL
// ==============================

function resetGame() {
    score = 0;
    coins = 0;

    ninjaX = game.clientWidth * 0.15;
    ninjaY = 0;
    velocityY = 0;

    movingLeft = false;
    movingRight = false;
    jumping = false;

    obstacles = [];
    spawnTimer = 0;
    coinTimer = 0;

    objects.innerHTML = "";

    scoreElement.textContent = "00000";
    coinsElement.textContent = "0";

    ninja.classList.remove("running", "jumping");
    ninja.style.left = ninjaX + "px";
    ninja.style.top = getGroundTop() - ninja.offsetHeight + "px";

    pauseButton.textContent = "Ⅱ PAUSAR";
}

function getGroundTop() {
    const height = game.clientHeight;

    if (height <= 500) {
        return height - 65;
    }

    return height - groundHeight;
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
// MOVIMENTAÇÃO DO NINJA
// ==============================

function moveNinja(deltaTime) {
    const maxX = game.clientWidth - ninja.offsetWidth;

    if (movingLeft) {
        ninjaX -= moveSpeed * deltaTime;
    }

    if (movingRight) {
        ninjaX += moveSpeed * deltaTime;
    }

    // Impede o ninja de sair da tela
    ninjaX = Math.max(0, Math.min(ninjaX, maxX));

    // Movimento do pulo
    velocityY += gravity * deltaTime;
    ninjaY += velocityY * deltaTime;

    const groundTop = getGroundTop() - ninja.offsetHeight;

    if (ninjaY >= groundTop) {
        ninjaY = groundTop;
        velocityY = 0;
        jumping = false;
    }

    ninja.style.left = ninjaX + "px";
    ninja.style.top = ninjaY + "px";

    // Animação das pernas
    ninja.classList.toggle(
        "running",
        (movingLeft || movingRight) && !jumping
    );

    ninja.classList.toggle("jumping", jumping);
}

function jump() {
    if (!running || paused || gameOver) return;

    if (!jumping) {
        jumping = true;
        velocityY = -jumpForce;
    }
}

// ==============================
// TECLADO
// ==============================

document.addEventListener("keydown", function (event) {
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

    if (key === "escape" && running && !gameOver) {
        togglePause();
    }
});

document.addEventListener("keyup", function (event) {
    const key = event.key.toLowerCase();

    if (key === "arrowleft" || key === "a") {
        movingLeft = false;
    }

    if (key === "arrowright" || key === "d") {
        movingRight = false;
    }
});

// Evita que o ninja continue andando ao perder o foco
window.addEventListener("blur", function () {
    movingLeft = false;
    movingRight = false;
});

// ==============================
// CONTROLES PARA CELULAR
// ==============================

function holdButton(button, onPress, onRelease) {
    button.addEventListener("pointerdown", function (event) {
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
    function () {
        movingLeft = true;
    },
    function () {
        movingLeft = false;
    }
);

holdButton(
    rightButton,
    function () {
        movingRight = true;
    },
    function () {
        movingRight = false;
    }
);

jumpButton.addEventListener("pointerdown", function (event) {
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
// CRIAR OBSTÁCULOS E MOEDAS
// ==============================

function createObject(type) {
    const element = document.createElement("div");

    element.classList.add(type);

    const size = type === "coin" ? 26 : 42;
    const maxX = Math.max(0, game.clientWidth - size);

    const x = Math.random() * maxX;

    let y;

    if (type === "coin") {
        // Algumas moedas ficam no ar para incentivar o pulo
        y = getGroundTop() - 50 -
            Math.random() * Math.min(150, game.clientHeight * 0.3);
    } else {
        y = getGroundTop() - 53;
    }

    element.style.left = x + "px";
    element.style.top = y + "px";

    objects.appendChild(element);

    obstacles.push({
        element: element,
        x: x,
        y: y,
        type: type,
        width: size,
        height: type === "coin" ? 26 : 53,
        speed: 230 + Math.min(score * 0.025, 180)
    });
}

function spawnObjects(deltaTime) {
    spawnTimer += deltaTime;
    coinTimer += deltaTime;

    // Obstáculos surgem em intervalos aleatórios
    if (spawnTimer >= 1.3 + Math.random() * 0.6) {
        createObject("obstacle");
        spawnTimer = 0;
    }

    // Moedas aparecem com menos frequência
    if (coinTimer >= 1.8 + Math.random() * 1.2) {
        createObject("coin");
        coinTimer = 0;
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

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];
        const rect = obj.element.getBoundingClientRect();

        if (!isColliding(ninjaRect, rect)) {
            continue;
        }

        if (obj.type === "coin") {
            coins++;
            score += 100;

            coinsElement.textContent = coins;
            obj.element.remove();
            obstacles.splice(i, 1);
        } else {
            endGame();
            return;
        }
    }
}

// ==============================
// ATUALIZAR OBJETOS
// ==============================

function updateObjects(deltaTime) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];

        // Os objetos vêm da direita para a esquerda
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

    message.style.display = "flex";

    message.innerHTML = `
        <h1 class="game-over-title">FIM DE JOGO!</h1>
        <p>Sua pontuação: ${Math.floor(score)}</p>
        <p>Moedas coletadas: ${coins}</p>
        <p>Não desista, ninja! Tente novamente.</p>
        <button id="startButton">JOGAR NOVAMENTE</button>
    `;

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

    // Evita saltos grandes de movimento quando o navegador trava
    const deltaTime = Math.min(
        (timestamp - lastTime) / 1000,
        0.035
    );

    lastTime = timestamp;

    moveNinja(deltaTime);
    spawnObjects(deltaTime);
    updateObjects(deltaTime);
    checkCollisions();
    updateScore(deltaTime);
}

// ==============================
// AJUSTE AO REDIMENSIONAR A TELA
// ==============================

window.addEventListener("resize", function () {
    const maxX = game.clientWidth - ninja.offsetWidth;

    ninjaX = Math.max(0, Math.min(ninjaX, maxX));

    if (running || gameOver) {
        ninja.style.left = ninjaX + "px";
    }
});

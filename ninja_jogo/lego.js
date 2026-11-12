const game = document.getElementById("game");
const ninja = document.getElementById("ninja");
const objects = document.getElementById("objects");

const scoreElement = document.getElementById("score");
const message = document.getElementById("message");

const levelLabel = document.getElementById("levelLabel");
const pauseButton = document.getElementById("pauseButton");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const jumpButton = document.getElementById("jumpButton");
const attackButton = document.getElementById("attackButton");
const slash = document.getElementById("slash");

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

let attackTime = -1;      // -1 = sem ataque
let attackCooldown = 0;
let facingLeft = false;

const ATTACK_TOTAL = 0.3;
const ATTACK_COOLDOWN = 0.45;

let lastTime = 0;
let spawnTimer = 0;
let nextSpawn = 1.5;
let animationId = null;

// ==============================
// DIFICULDADES
// ==============================

const DIFFICULTIES = {
    facil: {
        label: "FÁCIL",
        baseSpeed: 220,
        speedGrowth: 0.08,
        maxExtraSpeed: 100,
        spawnMin: 1.8,
        spawnRange: 1.0,
        scoreRate: 8,
        killBonus: 50,       // pontos ao derrotar uma cobra
        snakeChance: 0.25,   // chance de nascer cobra (o resto é tronco)
        snakeBurst: 0        // chance de vir 2 cobras juntas
    },
    medio: {
        label: "MÉDIO",
        baseSpeed: 260,
        speedGrowth: 0.15,
        maxExtraSpeed: 180,
        spawnMin: 1.4,
        spawnRange: 0.8,
        scoreRate: 10,
        killBonus: 100,
        snakeChance: 0.35,
        snakeBurst: 0.1
    },
    dificil: {
        label: "DIFÍCIL",
        baseSpeed: 330,
        speedGrowth: 0.25,
        maxExtraSpeed: 260,
        spawnMin: 1.0,
        spawnRange: 0.6,
        scoreRate: 15,
        killBonus: 150,
        snakeChance: 0.5,
        snakeBurst: 0.2
    }
};

let difficultyKey = "medio";
let difficulty = DIFFICULTIES[difficultyKey];

function setDifficulty(key) {
    if (!DIFFICULTIES[key]) return;

    difficultyKey = key;
    difficulty = DIFFICULTIES[key];
    levelLabel.textContent = difficulty.label;

    message.querySelectorAll(".diff-btn").forEach(function(btn) {
        btn.classList.toggle("active", btn.dataset.diff === key);
    });
}

// ==============================
// ESCOLHA DO NINJA
// ==============================

const NINJAS = {
    vermelho: "VERMELHO",
    azul: "AZUL",
    verde: "VERDE",
    branco: "BRANCO",
    preto: "PRETO"
};

let ninjaKey = "vermelho";

try {
    const saved = localStorage.getItem("ninjaKey");
    if (NINJAS[saved]) ninjaKey = saved;
} catch (e) {}

function ninjaSelectHTML() {
    return Object.keys(NINJAS).map(function(key) {
        return `
            <button class="ninja-btn ${key === ninjaKey ? "active" : ""}"
                    data-ninja="${key}" aria-label="Ninja ${NINJAS[key]}">
                <span class="ninja-thumb"
                      style="background-image:url('ninja_${key}.png?v=3')"></span>
                <span>${NINJAS[key]}</span>
            </button>`;
    }).join("");
}

// Avisa na tela se a imagem do ninja for a versão antiga (frames cortados)
function checkNinjaSheet(key) {
    const img = new Image();

    img.onload = function() {
        let aviso = document.getElementById("avisoSprite");

        if (img.naturalWidth !== 352 || img.naturalHeight !== 48) {
            if (!aviso) {
                aviso = document.createElement("div");
                aviso.id = "avisoSprite";
                aviso.style.cssText =
                    "position:absolute;z-index:30;left:10px;right:10px;bottom:10px;" +
                    "padding:8px;background:#b00020;color:#fff;font-size:13px;" +
                    "text-align:center;border-radius:6px;";
                game.appendChild(aviso);
            }

            aviso.textContent = "ninja_" + key + ".png está desatualizado (" +
                img.naturalWidth + "×" + img.naturalHeight +
                "). Substitua pelo arquivo novo de 352×48 e aperte Ctrl+F5.";
        } else if (aviso) {
            aviso.remove();
        }
    };

    img.src = "ninja_" + key + ".png?v=3";
}

function setNinja(key) {
    if (!NINJAS[key]) return;
    checkNinjaSheet(key);

    ninjaKey = key;
    ninja.style.backgroundImage = `url("ninja_${key}.png?v=3")`;

    try { localStorage.setItem("ninjaKey", key); } catch (e) {}

    message.querySelectorAll(".ninja-btn").forEach(function(btn) {
        btn.classList.toggle("active", btn.dataset.ninja === key);
    });
}

const FOOT_GAP = 4; // pixels vazios embaixo do sprite
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
    ninjaY = getGroundTop() - ninja.offsetHeight + FOOT_GAP;
    velocityY = 0;

    movingLeft = false;
    movingRight = false;
    jumping = false;

    obstacles = [];
    spawnTimer = 0;
    nextSpawn = 1.5;

    objects.innerHTML = "";
    scoreElement.textContent = "00000";

    attackTime = -1;
    attackCooldown = 0;
    facingLeft = false;
    slash.classList.remove("play");

    ninja.classList.remove("running", "jumping", "flip", "attacking");

    ninja.style.left = Math.round(ninjaX) + "px";
    ninja.style.top = Math.round(ninjaY) + "px";

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

// Cliques no menu (inclui os botões recriados na tela de fim de jogo)
message.addEventListener("click", function(event) {
    const ninjaBtn = event.target.closest(".ninja-btn");

    if (ninjaBtn) {
        setNinja(ninjaBtn.dataset.ninja);
        return;
    }

    const diffBtn = event.target.closest(".diff-btn");

    if (diffBtn) {
        setDifficulty(diffBtn.dataset.diff);
        return;
    }

    if (event.target.closest("#startButton")) {
        startGame();
    }
});

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

    const groundY = getGroundTop() - ninja.offsetHeight + FOOT_GAP;

    if (ninjaY >= groundY) {
        ninjaY = groundY;
        velocityY = 0;
        jumping = false;
    }

    ninja.style.left = Math.round(ninjaX) + "px";
    ninja.style.top = Math.round(ninjaY) + "px";

    if (movingLeft && !movingRight) facingLeft = true;
    if (movingRight && !movingLeft) facingLeft = false;
    ninja.classList.toggle("flip", facingLeft);

    ninja.classList.toggle(
        "running",
        (movingLeft || movingRight) && !jumping
    );

    ninja.classList.toggle("jumping", jumping);

    const attacking = attackTime >= 0;
    ninja.classList.toggle("attacking", attacking);

    if (attacking) {
        ninja.dataset.phase = attackTime < 0.1 ? "1" : "2";
        positionSlash();
    }
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
// ATAQUE
// ==============================

function positionSlash() {
    const left = facingLeft
        ? ninjaX + ninja.offsetWidth - 44 - 80
        : ninjaX + 44;

    slash.style.left = Math.round(left) + "px";
    slash.style.top = Math.round(ninjaY + 12) + "px";
    slash.classList.toggle("flip", facingLeft);
}

function attack() {
    if (!running || paused || gameOver) return;
    if (attackTime >= 0 || attackCooldown > 0) return;

    attackTime = 0;
    attackCooldown = ATTACK_COOLDOWN;

    positionSlash();
    slash.classList.remove("play");
    void slash.offsetWidth; // reinicia a animação do golpe
    slash.classList.add("play");
}

function updateAttack(deltaTime) {
    if (attackCooldown > 0) attackCooldown -= deltaTime;

    if (attackTime >= 0) {
        attackTime += deltaTime;

        if (attackTime >= ATTACK_TOTAL) {
            attackTime = -1;
            slash.classList.remove("play");
            ninja.classList.remove("attacking");
        }
    }
}

function showPopup(x, y, text) {
    const el = document.createElement("div");

    el.className = "popup";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";

    game.appendChild(el);
    setTimeout(function() { el.remove(); }, 800);
}

function killSnake(obj, index) {
    obj.element.classList.add("dead");
    obstacles.splice(index, 1);

    score += difficulty.killBonus;
    scoreElement.textContent = String(Math.floor(score)).padStart(5, "0");

    showPopup(obj.x + 10, obj.y, "+" + difficulty.killBonus);

    setTimeout(function() { obj.element.remove(); }, 650);
}

function checkAttack() {
    // só acerta no meio da animação do golpe
    if (attackTime < 0.05 || attackTime > 0.22) return;

    const reachStart = 40;
    const reachEnd = 130;

    const area = facingLeft
        ? {
            left: ninjaX + ninja.offsetWidth - reachEnd,
            right: ninjaX + ninja.offsetWidth - reachStart
        }
        : {
            left: ninjaX + reachStart,
            right: ninjaX + reachEnd
        };

    area.top = ninjaY;
    area.bottom = ninjaY + ninja.offsetHeight;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obj = obstacles[i];

        if (obj.type !== "snake") continue;

        const box = {
            left: obj.x + obj.hit.x,
            right: obj.x + obj.hit.x + obj.hit.w,
            top: obj.y + obj.hit.y,
            bottom: obj.y + obj.hit.y + obj.hit.h
        };

        if (isColliding(area, box)) {
            killSnake(obj, i);
        }
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

    if (key === "j" || key === "k" || key === "f") {
        attack();
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

attackButton.addEventListener("pointerdown", function(event) {
    event.preventDefault();
    attack();
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

function createObstacle(type, extraX) {
    const element = document.createElement("div");

    element.classList.add("obstacle", type);

    const x = game.clientWidth + 10 + (extraX || 0);

    // velocidade com um pouco de sorte: cada obstáculo é diferente
    const baseSpeed = difficulty.baseSpeed +
        Math.min(score * difficulty.speedGrowth, difficulty.maxExtraSpeed);
    const variation = 0.9 + Math.random() * 0.25;

    let width, height, y, hit, speed;

    if (type === "snake") {
        width = 64;
        height = 64;
        y = getGroundTop() - 62;
        hit = { x: 8, y: 12, w: 48, h: 48 };
        speed = baseSpeed * variation + 40;   // cobras são mais rápidas
    } else {
        width = 96;
        height = 96;
        y = getGroundTop() - 70;
        hit = { x: 10, y: 28, w: 66, h: 40 };
        speed = baseSpeed * variation;
    }

    element.style.left = x + "px";
    element.style.top = y + "px";

    objects.appendChild(element);

    obstacles.push({
        type: type,
        element: element,
        x: x,
        y: y,
        width: width,
        height: height,
        hit: hit,
        speed: speed
    });
}

// ==============================
// GERAR OBSTÁCULOS
// ==============================

function spawnObjects(deltaTime) {
    spawnTimer += deltaTime;

    if (spawnTimer >= nextSpawn) {
        const isSnake = Math.random() < difficulty.snakeChance;

        createObstacle(isSnake ? "snake" : "log");

        // às vezes vem uma segunda cobra logo atrás
        if (isSnake && Math.random() < difficulty.snakeBurst) {
            createObstacle("snake", 220 + Math.random() * 120);
        }

        spawnTimer = 0;
        nextSpawn = difficulty.spawnMin + Math.random() * difficulty.spawnRange;
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
    const n = {
        left: ninjaX + 16,
        right: ninjaX + 48,
        top: ninjaY + 8,
        bottom: ninjaY + ninja.offsetHeight - FOOT_GAP
    };

    for (const obj of obstacles) {
        const h = obj.hit;

        const o = {
            left: obj.x + h.x,
            right: obj.x + h.x + h.w,
            top: obj.y + h.y,
            bottom: obj.y + h.y + h.h
        };

        if (isColliding(n, o)) {
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
        obj.element.style.left = Math.round(obj.x) + "px";

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
    score += deltaTime * difficulty.scoreRate;

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

    attackTime = -1;
    slash.classList.remove("play");
    ninja.classList.remove("running", "jumping", "attacking");

    message.innerHTML = `
        <h1 class="game-over-title">FIM DE JOGO!</h1>
        <p>Sua pontuação: ${Math.floor(score)}</p>
        <p>Dificuldade: ${difficulty.label}</p>
        <p>Não desista, ninja! Tente novamente.</p>
        <div class="difficulty">
            <button class="diff-btn ${difficultyKey === "facil" ? "active" : ""}" data-diff="facil">FÁCIL</button>
            <button class="diff-btn ${difficultyKey === "medio" ? "active" : ""}" data-diff="medio">MÉDIO</button>
            <button class="diff-btn ${difficultyKey === "dificil" ? "active" : ""}" data-diff="dificil">DIFÍCIL</button>
        </div>
        <p>Escolha o ninja:</p>
        <div class="ninja-select">${ninjaSelectHTML()}</div>
        <button id="startButton">JOGAR NOVAMENTE</button>
    `;

    message.style.display = "flex";

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

    updateAttack(deltaTime);
    moveNinja(deltaTime);
    spawnObjects(deltaTime);
    updateObjects(deltaTime);
    checkAttack();
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
        ninja.style.left = Math.round(ninjaX) + "px";

        if (!jumping) {
            ninjaY = getGroundTop() - ninja.offsetHeight + FOOT_GAP;
            ninja.style.top = Math.round(ninjaY) + "px";
        }
    }
});

// Posição inicial do ninja
ninjaX = game.clientWidth * 0.15;
ninjaY = getGroundTop() - ninja.offsetHeight + FOOT_GAP;

ninja.style.left = Math.round(ninjaX) + "px";
ninja.style.top = Math.round(ninjaY) + "px";

// Monta a escolha de ninja na tela inicial
document.getElementById("ninjaSelect").innerHTML = ninjaSelectHTML();
setNinja(ninjaKey);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const levelUpScreen = document.getElementById('level-up-screen');
const cardContainer = document.getElementById('card-container');
const restartBtn = document.getElementById('restart-btn');
const xpBarFill = document.getElementById('xp-bar-fill');
const levelIndicator = document.getElementById('level-indicator');

// Game State
let isPlaying = false;
let isPaused = false;
let startTime = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;

let enemies = [];
let particles = [];
let items = [];
let xpOrbs = [];

let frameCount = 0;
let mouse = { x: 0, y: 0 };
let score = 0;
let animationId;

// Game Config & Stats
let gameConfig = {
    xpSpawnInterval: 1000, // 1 sec
    minXpInterval: 500,
    itemSpawnInterval: 5000, // 5 sec
    minItemInterval: 2000,
    xpMultiplier: 1.0,
    maxXpMultiplier: 2.0,
    enemySpeedReduction: 0, // 0 to 0.5 (50%)
    maxEnemySpeedReduction: 0.5,
    extraLife: 0,
    maxExtraLife: 1
};

// Start default config
const defaultConfig = JSON.parse(JSON.stringify(gameConfig));

// Leveling System
let level = 1;
let currentXp = 0;
let requiredXp = 10;
const MAX_LEVEL = 20;

// Upgrades Library
const upgrades = [
    {
        id: 'xp_spawn',
        title: 'XP 생성 속도',
        desc: '경험치 공이 0.1초 더 빨리 나옵니다.병신들아',
        apply: () => {
            gameConfig.xpSpawnInterval = Math.max(gameConfig.minXpInterval, gameConfig.xpSpawnInterval - 100);
        },
        canAppear: () => gameConfig.xpSpawnInterval > gameConfig.minXpInterval
    },
    {
        id: 'item_spawn',
        title: '아이템 생성 속도',
        desc: '아이템이 0.5초 더 빨리 나옵니다.',
        apply: () => {
            gameConfig.itemSpawnInterval = Math.max(gameConfig.minItemInterval, gameConfig.itemSpawnInterval - 500);
        },
        canAppear: () => gameConfig.itemSpawnInterval > gameConfig.minItemInterval
    },
    {
        id: 'xp_gain',
        title: '경험치 획득량',
        desc: '경험치 획득량이 10% 증가합니다.',
        apply: () => {
            gameConfig.xpMultiplier = Math.min(gameConfig.maxXpMultiplier, gameConfig.xpMultiplier + 0.1);
        },
        canAppear: () => gameConfig.xpMultiplier < gameConfig.maxXpMultiplier
    },
    {
        id: 'enemy_slow',
        title: '적 속도 감소',
        desc: '적들의 속도가 5% 느려집니다.',
        apply: () => {
            gameConfig.enemySpeedReduction = Math.min(gameConfig.maxEnemySpeedReduction, gameConfig.enemySpeedReduction + 0.05);
        },
        canAppear: () => gameConfig.enemySpeedReduction < gameConfig.maxEnemySpeedReduction
    },
    {
        id: 'extra_life',
        title: '추가 생명',
        desc: '목숨이 1개 늘어납니다.',
        apply: () => {
            gameConfig.extraLife = 1;
        },
        canAppear: () => gameConfig.extraLife < gameConfig.maxExtraLife
    }
];

// Timers
let lastXpSpawnTime = 0;
let lastItemSpawnTime = 0;

// Temporary Effects
let enemySpeedMultiplier = 1; // From Ice item
let magnetActive = false;
let magnetEndTime = 0;

// Resize canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Mouse & Touch tracking
function handleInput(x, y) {
    mouse.x = x;
    mouse.y = y;
}

window.addEventListener('mousemove', (e) => {
    handleInput(e.clientX, e.clientY);
});

window.addEventListener('touchstart', (e) => {
    // e.preventDefault(); // Removed to allow click events on buttons
    handleInput(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    // e.preventDefault(); 
    handleInput(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

// Player config
const player = {
    x: -100,
    y: -100,
    radius: 12,
    color: '#38bdf8',
    trail: []
};

// XP Orb Class
class XpOrb {
    constructor() {
        this.creationTime = Date.now();
        this.lifespan = 5000;

        // Size logic
        const timePlayed = score; // score is seconds played
        let roll = Math.random();
        let sizeType = 'S'; // Default

        if (timePlayed < 20) {
            sizeType = 'S';
        } else if (timePlayed < 40) {
            sizeType = roll < 0.5 ? 'S' : 'M';
        } else if (timePlayed < 60) {
            if (roll < 0.33) sizeType = 'S';
            else if (roll < 0.66) sizeType = 'M';
            else sizeType = 'L';
        } else {
            sizeType = roll < 0.5 ? 'M' : 'L';
        }

        if (sizeType === 'S') {
            this.radius = 5;
            this.value = 1;
            this.color = '#86efac'; // Light green
        } else if (sizeType === 'M') {
            this.radius = 8;
            this.value = 5;
            this.color = '#4ade80'; // Green
        } else {
            this.radius = 12;
            this.value = 10;
            this.color = '#16a34a'; // Dark green
        }

        this.x = Math.random() * (canvas.width - 20) + 10;
        this.y = Math.random() * (canvas.height - 20) + 10;
    }

    draw() {
        const age = Date.now() - this.creationTime;
        const remaining = this.lifespan - age;

        if (remaining < 1500 && Math.floor(Date.now() / 150) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        } else {
            ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();
        ctx.globalAlpha = 1;
    }
}

// Item Class
class Item {
    constructor() {
        this.radius = 15;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 100) + 50;

        const roll = Math.random();
        if (roll < 0.33) this.type = 'ice';
        else if (roll < 0.66) this.type = 'bomb';
        else this.type = 'magnet';

        this.creationTime = Date.now();
        this.lifespan = 3000; // Despawn after 3s

        // Visuals
        if (this.type === 'ice') {
            this.color = '#00ffff';
            this.symbol = '❄️';
        } else if (this.type === 'bomb') {
            this.color = '#ff6b6b';
            this.symbol = '💣';
        } else {
            this.color = '#fbbf24'; // Amber/Gold
            this.symbol = '🧲';
        }
    }

    draw() {
        const age = Date.now() - this.creationTime;
        const remaining = this.lifespan - age;

        // Draw timer ring
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 5, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * (remaining / this.lifespan)));
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#0f172a';
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y + 1);
    }
}

// Enemy class
class Enemy {
    constructor() {
        this.radius = Math.random() * 15 + 10;

        // Spawn from edges
        if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
            this.y = Math.random() * canvas.height;
        } else {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
        }

        const angle = Math.atan2(
            (canvas.height / 2 + (Math.random() * 400 - 200)) - this.y,
            (canvas.width / 2 + (Math.random() * 400 - 200)) - this.x
        );

        const speed = Math.random() * 3 + 2 + (score * 0.1);
        this.baseVelocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        this.color = `hsl(${Math.random() * 60 + 330}, 80%, 60%)`;
    }

    update() {
        // Apply global speed reduction (stats) + temporary reduction (Ice)
        let speedFactor = (1 - gameConfig.enemySpeedReduction) * enemySpeedMultiplier;

        this.x += this.baseVelocity.x * speedFactor;
        this.y += this.baseVelocity.y * speedFactor;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

// Particle effect
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.alpha = 1;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

function initGame() {
    isPlaying = true;
    isPaused = false;
    score = 0;
    startTime = Date.now();
    totalPausedTime = 0;

    enemies = [];
    particles = [];
    items = [];
    xpOrbs = [];
    frameCount = 0;

    // Reset stats
    gameConfig = JSON.parse(JSON.stringify(defaultConfig));
    level = 1;
    currentXp = 0;
    requiredXp = 10;
    updateXpUI();

    enemySpeedMultiplier = 1;
    magnetActive = false;
    lastXpSpawnTime = Date.now();
    lastItemSpawnTime = Date.now();

    player.x = mouse.x;
    player.y = mouse.y;
    player.trail = [];

    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    levelUpScreen.classList.remove('active');

    animate();
}

function gameOver() {
    if (gameConfig.extraLife > 0) {
        gameConfig.extraLife--;
        activateBomb(); // Use bomb effect as a "shield"
        spawnExplosion(player.x, player.y, '#ffffff'); // White flash
        // Grant temporary immunity? For now just bomb clears immediate threat.
        return;
    }

    isPlaying = false;
    cancelAnimationFrame(animationId);
    gameOverScreen.classList.add('active');
    finalScoreEl.innerText = score.toFixed(2);

    spawnExplosion(player.x, player.y, player.color);
    drawParticles();
}

function spawnExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function drawParticles() {
    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            particle.update();
            particle.draw();
        }
    });
}

// Item Effects
function activateIce() {
    enemySpeedMultiplier = 0.2;
    spawnExplosion(player.x, player.y, '#00ffff');
    setTimeout(() => {
        enemySpeedMultiplier = 1;
    }, 2000); // 2s duration
}

function activateBomb() {
    const blastRadius = 300;
    spawnExplosion(player.x, player.y, '#ff6b6b');

    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, blastRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

        if (dist < blastRadius) {
            spawnExplosion(enemy.x, enemy.y, enemy.color);
            enemies.splice(i, 1);
        }
    }
}

function activateMagnet() {
    magnetActive = true;
    magnetEndTime = Date.now() + 3000; // 3s
}

// XP Logic
function addXp(amount) {
    currentXp += amount * gameConfig.xpMultiplier;
    checkLevelUp();
    updateXpUI();
}

function checkLevelUp() {
    if (currentXp >= requiredXp) {
        if (level < MAX_LEVEL) {
            levelUp();
        } else {
            currentXp = requiredXp; // Cap at max
        }
    }
}

function updateXpUI() {
    levelIndicator.innerText = `Lv.${level}`;
    const percent = Math.min(100, (currentXp / requiredXp) * 100);
    xpBarFill.style.width = `${percent}%`;
}

function levelUp() {
    isPaused = true;
    pauseStartTime = Date.now();
    cancelAnimationFrame(animationId);

    currentXp = 0;
    level++;
    requiredXp = Math.floor(requiredXp * 1.2);

    updateXpUI();
    showUpgradeOptions();
}

function showUpgradeOptions() {
    levelUpScreen.classList.add('active');
    cardContainer.innerHTML = '';

    // Pick 3 random eligible upgrades
    const eligible = upgrades.filter(u => u.canAppear());
    const choices = [];

    // Safety check if not enough unique upgrades
    for (let i = 0; i < 3; i++) {
        if (eligible.length === 0) break;
        const idx = Math.floor(Math.random() * eligible.length);
        choices.push(eligible[idx]);
        // Allow duplicates? Request implies "3 random stats", usually unique.
        // Let's allow duplicates to make it truly random as per "randomly select possible stats"
        // But usually unique options are better UX. Let's start with unique.
        // wait request said "3가지 랜덤 스탯중에 선택 가능". 
        // If I limit unique, I might run out if I max everything.
        // Let's just pick random.
    }

    // Actually, let's keep it simple: Pick 3 random from full list, calculate eligibility.
    // If fewer than 3 eligible, show distinct ones.

    // Better logic: shuffle eligible and pick 3.
    const shuffled = eligible.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    selected.forEach(upgrade => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <span class="card-title">${upgrade.title}</span>
            <span class="card-desc">${upgrade.desc}</span>
        `;
        card.onclick = (e) => {
            e.stopPropagation(); // Prevent click-through?
            applyUpgrade(upgrade);
        };
        cardContainer.appendChild(card);
    });
}

function applyUpgrade(upgrade) {
    upgrade.apply();
    levelUpScreen.classList.remove('active');

    isPaused = false;
    const pauseDuration = Date.now() - pauseStartTime;
    totalPausedTime += pauseDuration;

    // Adjust last spawn times so we don't spawn everything immediately after pause
    lastXpSpawnTime += pauseDuration;
    lastItemSpawnTime += pauseDuration;
    if (magnetActive) magnetEndTime += pauseDuration;

    animate();
}

function animate() {
    if (!isPlaying || isPaused) return;
    animationId = requestAnimationFrame(animate);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentTime = Date.now();

    // Update Score (Total Time - Paused Time)
    score = (currentTime - startTime - totalPausedTime) / 1000;
    scoreEl.innerText = score.toFixed(2);

    // Spawn XP
    if (currentTime - lastXpSpawnTime > gameConfig.xpSpawnInterval) {
        xpOrbs.push(new XpOrb());
        lastXpSpawnTime = currentTime;
    }

    // Spawn Items
    if (currentTime - lastItemSpawnTime > gameConfig.itemSpawnInterval) {
        items.push(new Item());
        lastItemSpawnTime = currentTime;
    }

    // Magnet Effect
    if (magnetActive && currentTime > magnetEndTime) {
        magnetActive = false;
    }

    // Player Update
    player.x = mouse.x;
    player.y = mouse.y;
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 20) player.trail.shift();

    // Draw Trail
    ctx.beginPath();
    ctx.moveTo(player.trail[0].x, player.trail[0].y);
    for (let point of player.trail) {
        ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = `rgba(56, 189, 248, 0.4)`;
    ctx.lineWidth = player.radius / 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw Player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();

    // XP Orbs
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
        const orb = xpOrbs[i];

        // Magnet Pull
        if (magnetActive) {
            const dx = player.x - orb.x;
            const dy = player.y - orb.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 300) { // Magnet radius
                orb.x += dx * 0.1;
                orb.y += dy * 0.1;
            }
        }

        orb.draw();

        if (currentTime - orb.creationTime > orb.lifespan) {
            xpOrbs.splice(i, 1);
            continue;
        }

        const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
        if (dist < player.radius + orb.radius) {
            addXp(orb.value);
            xpOrbs.splice(i, 1);
        }
    }

    // Items
    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.draw();

        if (currentTime - item.creationTime > item.lifespan) {
            items.splice(i, 1);
            continue;
        }

        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < player.radius + item.radius) {
            if (item.type === 'ice') activateIce();
            else if (item.type === 'bomb') activateBomb();
            else if (item.type === 'magnet') activateMagnet();

            items.splice(i, 1);
        }
    }

    // Enemies
    frameCount++;
    if (frameCount % Math.max(10, 60 - Math.floor(score)) === 0) {
        enemies.push(new Enemy());
    }

    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();

        if (enemy.x < -100 || enemy.x > canvas.width + 100 ||
            enemy.y < -100 || enemy.y > canvas.height + 100) {
            enemies.splice(index, 1);
        }

        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist - enemy.radius - player.radius < 1) {
            gameOver();
        }
    });

    drawParticles();

    // Overlays
    if (enemySpeedMultiplier < 1) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (magnetActive) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, 300, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Event Listeners
startScreen.addEventListener('click', () => {
    initGame();
});

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initGame();
});

// Initial Render
resize();

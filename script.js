/**
 * DZC Clicker - Core Game Logic
 */

// --- Game Constants ---
// --- Game Constants ---
const CONSTANTS = {
    DEFAULT_DZC_PRICE: 10,
    DEFAULT_CUSTOMER_TIME: 2000, // Reduced from 3000ms to 2000ms
    AREA_PER_STAFF: 5,
    SHOP_EXPAND_COST: 50000000,
    TOKYO_COST: 100000000,
    STAFF_HIRE_COSTS: [200, 5000, 80000, 250000, 1420000, 8500000],
};

// --- Game State ---
let gameState = {
    money: 0,
    dzcCount: 0,
    shopSize: 10, // Pyeong

    // Upgrades
    clickProduction: 1,
    clickUpgradeLevel: 1,

    customerSpeedLevel: 1,
    customerTime: CONSTANTS.DEFAULT_CUSTOMER_TIME,

    marketingLevel: 1,
    dzcPrice: CONSTANTS.DEFAULT_DZC_PRICE,

    snsMarketingLevel: 0,
    youtubeMarketingLevel: 0,

    isStoreOpen: true, // Default open

    // New Upgrades for Purchase Range
    packLevel: 1, // Minimum purchase amount
    giftLevel: 1, // Maximum purchase amount

    // Timers/Counters
    lastSaveTime: Date.now(),

    // Individual Staff Data
    staffData: [], // Each: { level: 1, timer: 0 }

    // Shop/Boosts
    autoClickTimeRemaining: 0 // ms
};

// --- Costs (Formulae) ---
// click: 10 * 1.1^level (Cost is in DZC now)
const getClickUpgradeCost = () => {
    let cost = 10;
    for (let i = 1; i < gameState.clickUpgradeLevel; i++) {
        let nextCost = Math.round(cost * 1.012);
        if (nextCost <= cost) nextCost = cost + 1;
        cost = nextCost;
    }
    return cost;
};

// speed: 30 * 1.3^level (was 100 * 1.5)
const getSpeedUpgradeCost = () => {
    let cost = 30;
    for (let i = 1; i < gameState.customerSpeedLevel; i++) {
        let nextCost = Math.round(cost * 1.068);
        if (nextCost <= cost) nextCost = cost + 1;
        cost = nextCost;
    }
    return cost;
};
// price: 100 * 1.6^level (was 500 * 2.0)
const getPriceUpgradeCost = () => {
    let cost = 15;
    for (let i = 1; i < gameState.marketingLevel; i++) {
        let nextCost = Math.round(cost * 1.041);
        if (nextCost <= cost) nextCost = cost + 1;
        cost = nextCost;
    }
    return cost;
};

// New Marketing
// sns: 50 * 1.018^level
const getSnsUpgradeCost = () => Math.floor(50 * Math.pow(1.018, gameState.snsMarketingLevel));
// youtube: 15000 * 1.0186^level
const getYoutubeUpgradeCost = () => Math.floor(15000 * Math.pow(1.0186, gameState.youtubeMarketingLevel));

// New Packaging Upgrades
// pack (min): 5000 * 1.817^level
const getPackUpgradeCost = () => Math.floor(5000 * Math.pow(1.817, gameState.packLevel - 1));
// gift (max): 1000 * 1.566^level
const getGiftUpgradeCost = () => Math.floor(1000 * Math.pow(1.566, gameState.giftLevel - 1));

// staff hiring costs are fixed
const getStaffHireCost = () => {
    const nextIdx = gameState.staffData.length;
    if (nextIdx >= CONSTANTS.STAFF_HIRE_COSTS.length) return Infinity;
    return CONSTANTS.STAFF_HIRE_COSTS[nextIdx];
};

const getStaffUpdateBaseStats = (level) => {
    // 알바 A의 초기 능력치 3초마다 두쫀쿠 5개 생산
    // 1 강화할 때마다 알바A의 두쫀쿠 생산이 +1씩 증가
    // 10강화 할때마다는 생산주기가 0.1초 감소
    // 25 강화할 때마다 알바A의 두쫀쿠 생산증가량(강화시추가되는생산량)이 +1씩 증가

    const prodIncrementFactor = Math.floor((level - 1) / 25) + 1;
    let production = 5 + (level - 1) * prodIncrementFactor;

    // Interval: 3000ms, -100ms every 10 levels
    let interval = 3000 - Math.floor((level - 1) / 10) * 100;
    if (interval < 100) interval = 100; // Cap

    return { production, interval };
};

const getStaffUpgradeCost = (level) => {
    // 최초 강화비용 100원 이후 +5.6%씩 증가
    return Math.floor(100 * Math.pow(1.056, level - 1));
};

// --- DOM Elements ---
const elMoney = document.getElementById('money-display');
const elDzcCount = document.getElementById('dzc-count-display');
const elShopSize = document.getElementById('shop-size-display');
// const elCustomerStatus = document.getElementById('customer-status'); // Removed

const btnDzc = document.getElementById('dzc-button');

// Menu Buttons
const btnUpgradeClick = document.getElementById('upgrade-click');
const btnUpgradeSpeed = document.getElementById('upgrade-speed');
const btnUpgradePrice = document.getElementById('upgrade-price');
const btnUpgradePack = document.getElementById('upgrade-pack');
const btnUpgradeGift = document.getElementById('upgrade-gift');
const btnHireStaff = document.getElementById('hire-staff');
const btnExpandShop = document.getElementById('expand-shop');
const btnMoveTokyo = document.getElementById('move-tokyo');

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// --- Initialization ---
// --- Initialization ---
function init() {
    loadGame();
    checkTokyoState();

    // Set toggle state from loaded game
    const toggle = document.getElementById('store-toggle');
    if (toggle) {
        if (gameState.isStoreOpen === undefined) gameState.isStoreOpen = true;
        toggle.checked = gameState.isStoreOpen;
    }

    setupEventListeners();
    setupTokyoListeners();
    updateExchangeRate();

    // Spawn existing Albas with a small delay for layout
    setTimeout(() => {
        const count = gameState.staffData ? gameState.staffData.length : 0;
        for (let i = 0; i < count; i++) {
            spawnAlba(true, i);
        }
    }, 500);

    gameLoop();
    updateUI();
}

function setupLongPress(element, action) {
    let intervalTimer;
    let delayTimer;
    let isPressing = false;

    const start = (e) => {
        if (e.button !== undefined && e.button !== 0) return; // Only left click
        stop(); // Safety: Clear any existing timers

        isPressing = true;
        action(); // Initial click

        // Start repeating after a short delay
        delayTimer = setTimeout(() => {
            if (isPressing) {
                intervalTimer = setInterval(() => {
                    if (isPressing && !element.disabled) {
                        action();
                    } else {
                        stop();
                    }
                }, 20); // Repeat every 20ms
            }
        }, 500); // 500ms delay to start repeating
    };

    const stop = () => {
        isPressing = false;
        if (delayTimer) {
            clearTimeout(delayTimer);
            delayTimer = null;
        }
        if (intervalTimer) {
            clearInterval(intervalTimer);
            intervalTimer = null;
        }
    };

    element.addEventListener('mousedown', start);
    element.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent ghost clicks
        start(e);
    });

    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    element.addEventListener('mouseleave', stop);
}

function setupEventListeners() {
    // Store Toggle
    document.getElementById('store-toggle').addEventListener('change', (e) => {
        gameState.isStoreOpen = e.target.checked;
    });

    // Clicker
    btnDzc.addEventListener('click', (e) => {
        const amount = gameState.clickProduction;
        addDzc(amount);
        showClickEffect(e.pageX, e.pageY, `+${formatKoreanNumber(amount, false)}`);
    });

    // Upgrades with Long Press
    setupLongPress(btnUpgradeClick, buyClickUpgrade);
    setupLongPress(btnUpgradeSpeed, buySpeedUpgrade);
    setupLongPress(btnUpgradePrice, buyPriceUpgrade);
    setupLongPress(btnUpgradePack, buyPackUpgrade);
    setupLongPress(btnUpgradeGift, buyGiftUpgrade);

    setupLongPress(document.getElementById('upgrade-sns'), buySnsUpgrade);
    setupLongPress(document.getElementById('upgrade-youtube'), buyYoutubeUpgrade);

    btnHireStaff.addEventListener('click', hireStaff);

    // Shop
    const btnActivateAutoClickDisplay = document.getElementById('activate-auto-click');
    if (btnActivateAutoClickDisplay) {
        btnActivateAutoClickDisplay.addEventListener('click', activateAutoClick);
    }

    // Expansion
    btnExpandShop.addEventListener('click', expandShop);
    // btnMoveTokyo.addEventListener('click', moveTokyo); // TODO

    // Reset Data
    document.getElementById('reset-data').addEventListener('click', () => {
        if (confirm("정말로 초기화하시겠습니까? 모든 데이터가 사라집니다.")) {
            localStorage.removeItem('dzcClickerSave');
            location.reload();
        }
    });

    // Tabs
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });
}

// --- Core Mechanics ---
function addDzc(amount) {
    gameState.dzcCount += amount;
    updateUI();
}

function showClickEffect(x, y, text) {
    const el = document.createElement('div');
    el.className = 'click-feedback';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function animateButton() {
    // CSS active state handles scaling, could add JS wobble if needed
}

// --- Customer Logic ---
let customerTimer = 0;
function gameLoop() {
    const now = Date.now();

    // Customer Arrival
    customerTimer += 20; // approx 50-60fps tick

    // Auto-Click Logic
    if (gameState.autoClickTimeRemaining > 0) {
        gameState.autoClickTimeRemaining -= 20;

        // Clicks occur every 200ms (5 clicks per second)
        if (Math.floor((gameState.autoClickTimeRemaining + 20) / 200) > Math.floor(gameState.autoClickTimeRemaining / 200)) {
            triggerAutoClick();
        }
    }

    // Only sell if store is OPEN
    // Only sell if store is OPEN
    if (gameState.isStoreOpen && customerTimer >= gameState.customerTime) {
        trySellDzc();
        customerTimer = 0;
    }

    // Auto Production (Staff) logic
    const deltaTime = 20; // tick step
    gameState.staffData.forEach((staff, index) => {
        if (staff.timer === undefined) staff.timer = 0;
        const stats = getStaffUpdateBaseStats(staff.level);
        staff.timer += deltaTime;
        if (staff.timer >= stats.interval) {
            addDzc(stats.production);
            staff.timer = 0;
        }
    });

    updateUI(); // Move UI update here for smooth animation (60fps)

    gameState.lastSaveTime = now;
    requestAnimationFrame(gameLoop);
}

// Separate interval for staff output (REMOVE this, handled in gameLoop now)
// setInterval(() => { ... }, 1000);

function triggerAutoClick() {
    const amount = gameState.clickProduction;
    addDzc(amount);

    // Position effect randomly around the button
    const btn = document.getElementById('dzc-button');
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 100;
    const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 100;

    showClickEffect(x, y, `+${formatKoreanNumber(amount, false)}`);
}

function activateAutoClick() {
    gameState.autoClickTimeRemaining = 10 * 60 * 1000; // 10 minutes
    updateUI();
}

function trySellDzc() {
    if (gameState.dzcCount > 0) {
        // 1. Primary Spawn
        spawnCustomer();

        // 2. SNS Marketing Roll (Additional Spawn)
        const snsChance = (gameState.snsMarketingLevel || 0) * 0.001; // 0.1% per level
        if (Math.random() < snsChance) {
            setTimeout(() => spawnCustomer(), 300); // Slight delay for visual separation
        }

        // 3. YouTube Marketing Roll (Additional Spawn)
        const youtubeChance = (gameState.youtubeMarketingLevel || 0) * 0.001; // 0.1% per level
        if (Math.random() < youtubeChance) {
            setTimeout(() => spawnCustomer(), 600);
        }
    }
}

function spawnCustomer() {
    const gameContainer = document.getElementById('game-container');
    const container = document.getElementById('clicker-area');
    const rect = container.getBoundingClientRect();
    const gameRect = gameContainer.getBoundingClientRect();

    // 1. Create Element
    const guest = document.createElement('div');
    guest.className = 'customer-guest';

    // Pick random guest image (01-05)
    const guestId = Math.floor(Math.random() * 5) + 1;
    guest.style.backgroundImage = `url('asset/image/guest0${guestId}.png')`;

    gameContainer.appendChild(guest); // Append to game-container

    // 2. Pick Start Position (Relative to game-container)
    const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
    let startX, startY;
    const offset = 60;

    if (side === 0) { startX = Math.random() * gameRect.width; startY = -offset; }
    else if (side === 1) { startX = gameRect.width + offset; startY = Math.random() * gameRect.height; }
    else if (side === 2) { startX = Math.random() * gameRect.width; startY = gameRect.height + offset; }
    else { startX = -offset; startY = Math.random() * gameRect.height; }

    guest.style.left = `${startX}px`;
    guest.style.top = `${startY}px`;

    // 3. Pick Target Position (Relative to game-container)
    const targetX = (rect.left - gameRect.left) + rect.width * (0.2 + Math.random() * 0.6);
    const targetY = (rect.top - gameRect.top) + rect.height * (0.3 + Math.random() * 0.4);

    // Flip if coming from right
    if (startX > targetX) guest.classList.add('flipped');

    // 4. Start Walking
    setTimeout(() => {
        guest.classList.add('walking');
        guest.style.left = `${targetX}px`;
        guest.style.top = `${targetY}px`;
    }, 50);

    // 5. Arrive & Sell
    setTimeout(() => {
        executeSale(gameRect.left + targetX, gameRect.top + targetY, guest);

        // Change to matching 'clear' image after purchase
        guest.style.backgroundImage = `url('asset/image/guest0${guestId}_clear.png')`;

        // 6. Exit
        const exitX = startX;
        const exitY = startY;
        guest.classList.remove('walking');
        if (exitX > targetX) guest.classList.add('flipped');
        else guest.classList.remove('flipped');

        setTimeout(() => {
            guest.classList.add('walking');
            guest.classList.add('exiting');
            guest.style.left = `${exitX}px`;
            guest.style.top = `${exitY}px`;
        }, 100);

        // 7. Cleanup
        setTimeout(() => guest.remove(), 2000);
    }, 1600); // Wait for transition (1.5s) + small pause
}

// --- Alba (Staff) Visuals ---
function spawnAlba(immediate = false, index = 0) {
    let container = document.getElementById('alba-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alba-container';
        container.className = 'alba-container';
        document.getElementById('clicker-area').appendChild(container);
    }

    const alba = document.createElement('div');
    alba.className = 'alba-character';
    alba.dataset.index = index;

    // Initial hidden state
    alba.style.opacity = '0';
    container.appendChild(alba);

    // Movement Logic
    function moveAlba() {
        const area = document.getElementById('clicker-area');
        const rect = area.getBoundingClientRect();

        // Ensure we have some area to move in
        const width = rect.width || 300;
        const height = rect.height || 300;

        const nextX = Math.random() * (width - 60);
        const nextY = Math.random() * (height - 60);

        const currentX = parseFloat(alba.style.left) || nextX;

        if (nextX > currentX) {
            alba.classList.remove('flipped');
        } else {
            alba.classList.add('flipped');
        }

        alba.classList.add('walking');
        alba.style.left = `${nextX}px`;
        alba.style.top = `${nextY}px`;
        alba.style.opacity = '1'; // Ensure visible

        setTimeout(() => {
            alba.classList.remove('walking');
            setTimeout(moveAlba, 1000 + Math.random() * 3000);
        }, 2000);
    }

    // Start moving
    if (immediate) {
        moveAlba();
    } else {
        alba.style.transform = 'scale(2)';
        setTimeout(() => {
            alba.style.transform = 'scale(1)';
            moveAlba();
        }, 100);
    }
}

function executeSale(x, y, guestEl) {
    if (gameState.dzcCount <= 0) return;

    // Minimum is packLevel, Maximum is giftLevel
    const min = gameState.packLevel;
    const max = Math.max(min, gameState.giftLevel);

    let sellAmount = Math.floor(Math.random() * (max - min + 1)) + min;

    // Additional Shop Bonus? (Optional, let's keep it as is or slightly modify)
    const shopExpandChance = gameState.shopSize > 10 ? 0.2 : 0;
    if (Math.random() < shopExpandChance) {
        sellAmount += 1; // Extra bonus for shop size
    }

    if (gameState.dzcCount < sellAmount) sellAmount = gameState.dzcCount;

    const earnings = sellAmount * gameState.dzcPrice;
    gameState.dzcCount -= sellAmount;
    gameState.money += earnings;

    // Format: +기본가격 (2개 이상 시 x개수)
    let msg = `+${formatKoreanNumber(gameState.dzcPrice)}원`;
    if (sellAmount > 1) {
        msg += ` x${sellAmount}`;
    }

    showFloatingText(x, y - 40, msg, '#27ae60');
    updateUI();
}

function showFloatingText(x, y, text, color = '#2c3e50') {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// --- Upgrade Functions ---
function buyClickUpgrade() {
    const cost = getClickUpgradeCost();
    if (gameState.dzcCount >= cost) {
        gameState.dzcCount -= cost;

        // Dynamic increment: +1 for Lv.1-50, +2 for Lv.51-100, etc.
        const increment = Math.floor(gameState.clickUpgradeLevel / 50) + 1;
        gameState.clickProduction += increment;

        gameState.clickUpgradeLevel++;

        // Milestone Bonus: 1.1x every 50 levels
        if (gameState.clickUpgradeLevel % 50 === 0) {
            // Extra Bonus: 2x every 500 levels
            if (gameState.clickUpgradeLevel % 500 === 0) {
                gameState.clickProduction = Math.floor(gameState.clickProduction * 2.0);
            } else {
                gameState.clickProduction = Math.floor(gameState.clickProduction * 1.1);
            }
            showMilestoneEffect(document.getElementById('upgrade-click'));
        }

        updateUI();
    }
}

function showMilestoneEffect(element) {
    if (!element) return;
    element.classList.add('milestone-active');
    setTimeout(() => {
        element.classList.remove('milestone-active');
    }, 800);
}

function buySpeedUpgrade() {
    const cost = getSpeedUpgradeCost();
    if (gameState.dzcCount >= cost && gameState.customerSpeedLevel < 350) {
        gameState.dzcCount -= cost;
        gameState.customerSpeedLevel++;
        gameState.customerTime *= 0.99; // 1% faster
        if (gameState.customerTime < 50) gameState.customerTime = 50; // Cap at 0.05s
        updateUI();
    }
}

function buyPriceUpgrade() {
    const cost = getPriceUpgradeCost();
    if (gameState.dzcCount >= cost) {
        gameState.dzcCount -= cost;
        gameState.marketingLevel++;

        // 기본 가격 상승
        gameState.dzcPrice += 1;

        // 마일스톤 보너스: 100레벨마다 가격 1.5배
        if (gameState.marketingLevel % 100 === 0) {
            gameState.dzcPrice = Math.floor(gameState.dzcPrice * 1.5);
            showMilestoneEffect(document.getElementById('upgrade-price'));
        }

        updateUI();
    }
}

function buyPackUpgrade() {
    const cost = getPackUpgradeCost();
    // Constraint: packLevel <= giftLevel
    if (gameState.packLevel >= gameState.giftLevel) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "🎁 '선물 패키징'을 먼저 더 강화해주세요!", "#e74c3c");
        return;
    }
    if (gameState.dzcCount >= cost) {
        gameState.dzcCount -= cost;
        gameState.packLevel++;
        updateUI();
    }
}

function buyGiftUpgrade() {
    const cost = getGiftUpgradeCost();
    if (gameState.dzcCount >= cost) {
        gameState.dzcCount -= cost;
        gameState.giftLevel++;
        updateUI();
    }
}

function buySnsUpgrade() {
    if (gameState.snsMarketingLevel >= 1000) {
        alert("SNS 마케팅이 최대 레벨(1000)에 도달했습니다!");
        return;
    }
    const cost = getSnsUpgradeCost();
    if (gameState.dzcCount >= cost) {
        gameState.dzcCount -= cost;
        gameState.snsMarketingLevel++;
        updateUI();
    }
}

function buyYoutubeUpgrade() {
    if (gameState.youtubeMarketingLevel >= 1000) {
        alert("유튜브 마케팅이 최대 레벨(1000)에 도달했습니다!");
        return;
    }
    const cost = getYoutubeUpgradeCost();
    if (gameState.dzcCount >= cost) {
        gameState.dzcCount -= cost;
        gameState.youtubeMarketingLevel++;
        updateUI();
    }
}

function hireStaff() {
    const currentCount = gameState.staffData.length;
    const maxStaffAllowed = 6;

    if (currentCount >= maxStaffAllowed) {
        alert("현재는 최대 6명까지만 고용 가능합니다.");
        return;
    }

    // 6th staff requires 20 pyeong
    if (currentCount === 5 && gameState.shopSize < 20) {
        alert("6번째 알바는 매장이 20평 이상이어야 고용 가능합니다!");
        return;
    }

    const cost = getStaffHireCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.staffData.push({ level: 1, timer: 0 });
        spawnAlba(false, currentCount); // Visual feedback
        updateUI();
    }
}

function upgradeStaff(index) {
    const staff = gameState.staffData[index];
    if (!staff) return;

    const cost = getStaffUpgradeCost(staff.level);
    if (gameState.money >= cost) {
        gameState.money -= cost;
        staff.level++;
        updateUI();
    }
}


function expandShop() {
    const cost = CONSTANTS.SHOP_EXPAND_COST;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.shopSize += 10;
        updateUI();
        alert(`가게를 확장했습니다! (${gameState.shopSize}평) 더 많은 알바를 고용할 수 있습니다.`);
    } else {
        alert("돈이 부족합니다!");
    }
}

// --- UI Updates ---
function formatKoreanNumber(num, useCommas = true) {
    const formatter = (n) => useCommas ? n.toLocaleString() : n.toString();
    if (num < 10000) return formatter(Math.floor(num));

    const units = ['', '만', '억', '조', '경', '해'];
    let result = [];
    let temp = Math.floor(num);

    for (let i = units.length - 1; i >= 0; i--) {
        const unitValue = Math.pow(10000, i);
        if (temp >= unitValue) {
            const count = Math.floor(temp / unitValue);
            if (count > 0) {
                result.push(`${formatter(count)}${units[i]}`);
            }
            temp %= unitValue;
        }
        if (result.length >= 2) break;
    }

    return result.join(' ').trim();
}

// Helper for smooth counting
const displayedState = {
    money: 0,
    dzcCount: 0
};

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const obj = document.getElementById(id);
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));

    // For large jumps, just update directly or use a faster interpolation
    // But for this game, since updates are frequent, let's use a simpler approach:
    // We update the 'displayed' value towards the 'target' value every frame/UI update
    // But since updateUI is called manually, let's just stick to CSS transitions or simple interpolation?

    // Actually, a simple lerp in the loop might be safer to avoid overlapping animations
    // Let's modify updateUI to just set the text content, but maybe use a custom updater loop for stats?
}

// Let's use a lerp approach in the game loop for smoother visual updates
// We'll update the 'displayed' values towards the real 'gameState' values
function updateUI() {
    // We update the 'displayed' values towards the real 'gameState' values
    const moneyDisplay = document.getElementById('money-display');
    const targetMoney = gameState.money;

    // Update displayed state towards target
    displayedState.money += (targetMoney - displayedState.money) * 0.2;
    displayedState.dzcCount += (gameState.dzcCount - displayedState.dzcCount) * 0.2;

    // Snap if close enough
    if (Math.abs(targetMoney - displayedState.money) < 1) displayedState.money = targetMoney;
    if (Math.abs(gameState.dzcCount - displayedState.dzcCount) < 0.1) displayedState.dzcCount = gameState.dzcCount;

    // Display formatted
    elMoney.textContent = formatKoreanNumber(displayedState.money);
    elDzcCount.textContent = formatKoreanNumber(displayedState.dzcCount);

    // Other static updates
    elShopSize.textContent = gameState.shopSize;

    // Upgrades UI
    const clickMilestoneBar = document.getElementById('click-milestone-bar');
    if (clickMilestoneBar) {
        const progress = ((gameState.clickUpgradeLevel % 50) / 50) * 100;
        clickMilestoneBar.style.width = `${progress}%`;
        // Change color when close to milestone?
        if (progress > 90) clickMilestoneBar.style.background = "#e74c3c";
        else clickMilestoneBar.style.background = "";
    }

    const clickMilestoneBar500 = document.getElementById('click-milestone-bar-500');
    if (clickMilestoneBar500) {
        const progress = ((gameState.clickUpgradeLevel % 500) / 500) * 100;
        clickMilestoneBar500.style.width = `${progress}%`;
        if (progress > 90) clickMilestoneBar500.style.background = "#e74c3c";
        else clickMilestoneBar500.style.background = "";
    }

    const priceMilestoneBar = document.getElementById('price-milestone-bar');
    if (priceMilestoneBar) {
        const progress = ((gameState.marketingLevel % 100) / 100) * 100;
        priceMilestoneBar.style.width = `${progress}%`;
        if (progress > 90) priceMilestoneBar.style.background = "#e74c3c";
        else priceMilestoneBar.style.background = "";
    }

    // Costs & Labels
    const clickUpgrade = document.getElementById('upgrade-click');
    if (clickUpgrade) {
        clickUpgrade.querySelector('.name').textContent = `두쫀쿠 생산량 증가 Lv.${gameState.clickUpgradeLevel}`;
        clickUpgrade.querySelector('.desc').textContent = `클릭당 두쫀쿠 생산 +${formatKoreanNumber(gameState.clickProduction)}`;
        clickUpgrade.querySelector('#cost-click').textContent = formatKoreanNumber(getClickUpgradeCost());
    }

    // Marketing Upgrades
    const speedUpgrade = document.getElementById('upgrade-speed');
    if (speedUpgrade) {
        const isMax = gameState.customerSpeedLevel >= 350;
        speedUpgrade.querySelector('.name').textContent = `광고 마케팅 Lv.${gameState.customerSpeedLevel}${isMax ? ' (MAX)' : ''}`;
        speedUpgrade.querySelector('#cost-speed').textContent = isMax ? '최고 단계' : formatKoreanNumber(getSpeedUpgradeCost());
        speedUpgrade.disabled = isMax || gameState.dzcCount < getSpeedUpgradeCost();
    }

    const priceUpgrade = document.getElementById('upgrade-price');
    if (priceUpgrade) {
        priceUpgrade.querySelector('.name').textContent = `고급 마케팅 Lv.${gameState.marketingLevel}`;
        priceUpgrade.querySelector('.desc').textContent = `두쫀쿠 가격 : ${formatKoreanNumber(gameState.dzcPrice)}원`;
        priceUpgrade.querySelector('#cost-price').textContent = formatKoreanNumber(getPriceUpgradeCost());
    }

    const packUpgrade = document.getElementById('upgrade-pack');
    if (packUpgrade) {
        const isRestricted = gameState.packLevel >= gameState.giftLevel;
        packUpgrade.querySelector('.name').textContent = `포장 개선 Lv.${gameState.packLevel}`;
        packUpgrade.querySelector('.desc').textContent = isRestricted ? `최대치 도달 (선물 패키징 필요)` : `최소 구매 개수 : ${gameState.packLevel}개`;
        packUpgrade.querySelector('#cost-pack').textContent = formatKoreanNumber(getPackUpgradeCost());
        packUpgrade.disabled = gameState.dzcCount < getPackUpgradeCost() || isRestricted;
    }

    const giftUpgrade = document.getElementById('upgrade-gift');
    if (giftUpgrade) {
        giftUpgrade.querySelector('.name').textContent = `선물 패키징 Lv.${gameState.giftLevel}`;
        giftUpgrade.querySelector('.desc').textContent = `최대 구매 개수 : ${gameState.giftLevel}개`;
        giftUpgrade.querySelector('#cost-gift').textContent = formatKoreanNumber(getGiftUpgradeCost());
        giftUpgrade.disabled = gameState.dzcCount < getGiftUpgradeCost();
    }

    const snsUpgrade = document.getElementById('upgrade-sns');
    if (snsUpgrade) {
        const isMax = gameState.snsMarketingLevel >= 1000;
        const snsProb = (gameState.snsMarketingLevel * 0.1).toFixed(1);
        snsUpgrade.querySelector('.name').textContent = `SNS 마케팅 Lv.${gameState.snsMarketingLevel}${isMax ? ' (MAX)' : ''}`;
        snsUpgrade.querySelector('.desc').textContent = isMax ? `최대 확률 도달! (+100%)` : `추가 손님 등장 확률 +${snsProb}%`;
        snsUpgrade.querySelector('#cost-sns').textContent = isMax ? '최고 단계' : formatKoreanNumber(getSnsUpgradeCost());
        snsUpgrade.disabled = isMax || gameState.dzcCount < getSnsUpgradeCost();
    }

    const youtubeUpgrade = document.getElementById('upgrade-youtube');
    if (youtubeUpgrade) {
        youtubeUpgrade.style.display = 'grid'; // Always show with grid layout
        if (gameState.snsMarketingLevel >= 300) {
            const isMax = gameState.youtubeMarketingLevel >= 1000;
            const ytProb = (gameState.youtubeMarketingLevel * 0.1).toFixed(1);
            youtubeUpgrade.querySelector('.name').textContent = `유튜브 마케팅 Lv.${gameState.youtubeMarketingLevel}${isMax ? ' (MAX)' : ''}`;
            youtubeUpgrade.querySelector('.desc').textContent = isMax ? `최대 확률 도달! (+100%)` : `추가 손님 등장 확률 +${ytProb}%`;
            youtubeUpgrade.querySelector('#cost-youtube').textContent = isMax ? '최고 단계' : formatKoreanNumber(getYoutubeUpgradeCost());
            youtubeUpgrade.disabled = isMax || gameState.dzcCount < getYoutubeUpgradeCost();
        } else {
            youtubeUpgrade.querySelector('.name').textContent = `유튜브 마케팅 (잠김)`;
            youtubeUpgrade.querySelector('.desc').textContent = `SNS 마케팅 Lv.300 달성 시 오픈`;
            youtubeUpgrade.querySelector('#cost-youtube').textContent = formatKoreanNumber(getYoutubeUpgradeCost());
            youtubeUpgrade.disabled = true;
        }
    }

    document.getElementById('cost-staff').textContent = getStaffHireCost() === Infinity ? "Max" : formatKoreanNumber(getStaffHireCost());
    document.getElementById('hire-staff-name').textContent = `알바 고용 Lv.${gameState.staffData.length}`;
    document.getElementById('staff-count').textContent = gameState.staffData.length;
    document.getElementById('max-staff').textContent = 6;

    renderStaffUpgrades();

    // Expansion Buttons
    if (btnExpandShop) {
        btnExpandShop.disabled = (gameState.money < CONSTANTS.SHOP_EXPAND_COST);
    }

    if (btnMoveTokyo) {
        btnMoveTokyo.disabled = (gameState.shopSize < 40);
    }

    // Auto Click UI
    const elAutoClickTimer = document.getElementById('auto-click-timer');
    const elAutoClickTimeDisplay = document.getElementById('auto-click-time-display');
    if (gameState.autoClickTimeRemaining > 0) {
        elAutoClickTimer.style.display = 'flex';
        const mins = Math.floor(gameState.autoClickTimeRemaining / 60000);
        const secs = Math.floor((gameState.autoClickTimeRemaining % 60000) / 1000);
        elAutoClickTimeDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        elAutoClickTimer.style.display = 'none';
    }

    const btnActivateAutoClick = document.getElementById('activate-auto-click');
    if (btnActivateAutoClick) {
        btnActivateAutoClick.disabled = gameState.autoClickTimeRemaining > 0;
    }
}

function renderStaffUpgrades() {
    const container = document.getElementById('individual-staff-list');
    if (!container) return;

    // We compare current length to rendered count to minimize re-renders
    const currentRendered = container.children.length;
    if (currentRendered !== gameState.staffData.length) {
        container.innerHTML = '';
        gameState.staffData.forEach((staff, index) => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.dataset.index = index;
            btn.onclick = () => upgradeStaff(index);
            container.appendChild(btn);
            setupLongPress(btn, () => upgradeStaff(index));
        });
    }

    // Update contents
    gameState.staffData.forEach((staff, index) => {
        const btn = container.children[index];
        if (btn) {
            const stats = getStaffUpdateBaseStats(staff.level);
            const cost = getStaffUpgradeCost(staff.level);
            const name = String.fromCharCode(65 + index); // A, B, C...

            btn.innerHTML = `
                <span class="name">알바${name} 강화 Lv.${staff.level}</span>
                <span class="desc">${(stats.interval / 1000).toFixed(1)}초마다 ${formatKoreanNumber(stats.production)}개 생산</span>
                <span class="cost">비용: ${formatKoreanNumber(cost)}원</span>
            `;
            btn.disabled = gameState.money < cost;
        }
    });
}

// --- Save/Load System ---
function saveGame() {
    localStorage.setItem('dzcClickerSave', JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem('dzcClickerSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Merge to ensure new fields are added if versions update
        gameState = { ...gameState, ...parsed };

        // Migration: Convert old staffCount to staffData
        if (parsed.staffCount !== undefined && (!gameState.staffData || gameState.staffData.length === 0)) {
            gameState.staffData = [];
            for (let i = 0; i < parsed.staffCount; i++) {
                gameState.staffData.push({ level: 1, timer: 0 });
            }
        }

    }

    // Safety: ensure no NaN values leaked into key stats
    if (isNaN(gameState.money)) gameState.money = 0;
    if (isNaN(gameState.dzcCount)) gameState.dzcCount = 0;
    if (isNaN(gameState.clickProduction)) gameState.clickProduction = 1;
    if (isNaN(gameState.dzcPrice)) gameState.dzcPrice = CONSTANTS.DEFAULT_DZC_PRICE;

    // Sync display state to avoid animation from 0
    displayedState.money = gameState.money;
    displayedState.dzcCount = gameState.dzcCount;
}

// Auto Save every 10s
setInterval(saveGame, 10000);

// Start
// --- Tokyo Logic ---

// Tokyo State Extensions (ensure these are in init/load)
function checkTokyoState() {
    if (gameState.yen === undefined) gameState.yen = 0;
    if (gameState.tokyoStaff === undefined) gameState.tokyoStaff = 0;
    if (gameState.tokyoSpeedLevel === undefined) gameState.tokyoSpeedLevel = 1;
    if (gameState.tokyoPriceLevel === undefined) gameState.tokyoPriceLevel = 1;
    if (gameState.tokyoMenuLevel === undefined) gameState.tokyoMenuLevel = 0; // 0: None, 1: Strawberry, 2: Mochi
    if (gameState.strawberryCount === undefined) gameState.strawberryCount = 0;
    if (gameState.mochiCount === undefined) gameState.mochiCount = 0;

    // Exchange Rate
    if (gameState.exchangeRate === undefined) gameState.exchangeRate = 1000; // Base rate
}

const elTokyoContainer = document.getElementById('tokyo-container');
const elYen = document.getElementById('yen-display');
const elExchangeRate = document.getElementById('exchange-rate-display');
const elStrawberry = document.getElementById('strawberry-count');
const elMochi = document.getElementById('mochi-count');

// Tokyo Buttons
const btnTokyoHire = document.getElementById('tokyo-hire-staff');
const btnTokyoSpeed = document.getElementById('tokyo-marketing-speed');
const btnTokyoPrice = document.getElementById('tokyo-marketing-price');
const btnTokyoMenu = document.getElementById('tokyo-new-menu');
const btnExchange = document.getElementById('exchange-btn');
const btnBackSeoul = document.getElementById('back-to-seoul');

// Tokyo Costs
const getTokyoStaffCost = () => Math.floor(1000 * Math.pow(1.2, gameState.tokyoStaff));
const getTokyoSpeedCost = () => Math.floor(100 * Math.pow(1.5, gameState.tokyoSpeedLevel));
const getTokyoPriceCost = () => Math.floor(500 * Math.pow(2.0, gameState.tokyoPriceLevel));
const getTokyoMenuCost = () => 2000 * (gameState.tokyoMenuLevel + 1);

function setupTokyoListeners() {
    btnMoveTokyo.addEventListener('click', () => {
        const cost = CONSTANTS.TOKYO_COST;
        if (gameState.money >= cost) {
            // Check if already unlocked or pay once?
            // "Tokyo Advance 100M"
            // Let's assume onetime purchase flag or pay every time?
            // Usually onetime. 
            if (!gameState.tokyoUnlocked) {
                gameState.money -= cost;
                gameState.tokyoUnlocked = true;
                alert("도쿄에 진출했습니다! (도쿄 10평)");
            }
            elTokyoContainer.style.display = 'flex';
            updateTokyoUI();
            updateUI();
        } else if (gameState.tokyoUnlocked) {
            elTokyoContainer.style.display = 'flex';
            updateTokyoUI();
        } else {
            alert("비용이 부족합니다!");
        }
    });

    btnBackSeoul.addEventListener('click', () => {
        elTokyoContainer.style.display = 'none';
        updateUI(); // Refresh main UI
    });

    setupLongPress(btnTokyoHire, buyTokyoStaff);
    setupLongPress(btnTokyoSpeed, buyTokyoSpeed);
    setupLongPress(btnTokyoPrice, buyTokyoPrice);

    btnTokyoMenu.addEventListener('click', buyTokyoMenu);
    btnExchange.addEventListener('click', exchangeCurrency);
}

// Tokyo Update Loop (piggyback on main interval)
setInterval(() => {
    if (gameState.tokyoUnlocked && gameState.tokyoStaff > 0) {
        // Tokyo production
        let produced = gameState.tokyoStaff;
        let revenue = 0;

        for (let i = 0; i < produced; i++) {
            let roll = Math.random();
            let types = 1 + gameState.tokyoMenuLevel;
            let price = 1 + (gameState.tokyoPriceLevel - 1);

            if (types >= 2 && roll < 0.3) {
                price *= 2;
                gameState.strawberryCount++;
            } else if (types >= 3 && roll < 0.1) {
                price *= 5;
                gameState.mochiCount++;
            }
            revenue += price;
        }
        gameState.yen += revenue;
    }

    // Update Rate
    if (Math.random() < 0.05) { // 5% chance every second to change rate
        updateExchangeRate();
    }

    if (elTokyoContainer && elTokyoContainer.style.display !== 'none') {
        updateTokyoUI();
    }
}, 1000);

function updateExchangeRate() {
    // 900 ~ 1200
    gameState.exchangeRate = Math.floor(Math.random() * (1200 - 900 + 1)) + 900;
}

function exchangeCurrency() {
    if (gameState.yen >= 100) {
        let amountYen = gameState.yen;
        let krw = Math.floor((amountYen / 100) * gameState.exchangeRate * 0.85); // 15% fee

        gameState.money += krw;
        gameState.yen = 0;

        alert(`${amountYen}엔을 환전하여 ${krw}원을 받았습니다! (수수료 제외)`);
        updateTokyoUI();
        updateUI();
    } else {
        alert("최소 100엔부터 환전 가능합니다.");
    }
}

// Tokyo Upgrades
function buyTokyoStaff() {
    const cost = getTokyoStaffCost();
    // Tokyo starts at 10 pyeong, max staff 5
    const maxStaff = 5;

    if (gameState.yen >= cost && gameState.tokyoStaff < maxStaff) {
        gameState.yen -= cost;
        gameState.tokyoStaff++;
        updateTokyoUI();
    }
}

function buyTokyoSpeed() {
    const cost = getTokyoSpeedCost();
    if (gameState.yen >= cost) {
        gameState.yen -= cost;
        gameState.tokyoSpeedLevel++;
        updateTokyoUI();
    }
}

function buyTokyoPrice() {
    const cost = getTokyoPriceCost();
    if (gameState.yen >= cost) {
        gameState.yen -= cost;
        gameState.tokyoPriceLevel++;
        updateTokyoUI();
    }
}

function buyTokyoMenu() {
    if (gameState.tokyoMenuLevel >= 2) return;

    const cost = getTokyoMenuCost();
    if (gameState.yen >= cost) {
        if (Math.random() < 0.5) {
            gameState.yen -= cost;
            gameState.tokyoMenuLevel++;
            alert("신메뉴 개발 성공!");
        } else {
            gameState.yen -= cost;
            alert("신메뉴 개발 실패... 돈만 날렸습니다.");
        }
        updateTokyoUI();
    }
}

function updateTokyoUI() {
    elYen.textContent = gameState.yen.toLocaleString();
    elExchangeRate.textContent = gameState.exchangeRate;
    elStrawberry.textContent = gameState.strawberryCount;
    elMochi.textContent = gameState.mochiCount;

    document.getElementById('tokyo-cost-staff').textContent = getTokyoStaffCost().toLocaleString();
    document.getElementById('tokyo-cost-speed').textContent = getTokyoSpeedCost().toLocaleString();
    document.getElementById('tokyo-cost-price').textContent = getTokyoPriceCost().toLocaleString();

    if (gameState.tokyoMenuLevel >= 2) {
        const btnMenu = document.getElementById('tokyo-new-menu');
        if (btnMenu) btnMenu.disabled = true;
        document.getElementById('tokyo-cost-menu').textContent = "Max";
    } else {
        const btnMenu = document.getElementById('tokyo-new-menu');
        if (btnMenu) btnMenu.disabled = false;
        document.getElementById('tokyo-cost-menu').textContent = getTokyoMenuCost().toLocaleString();
    }


    // Update button states
    btnTokyoHire.disabled = gameState.yen < getTokyoStaffCost();
    btnTokyoSpeed.disabled = gameState.yen < getTokyoSpeedCost();
    btnTokyoPrice.disabled = gameState.yen < getTokyoPriceCost();
}

// --- Developer Cheats ---
function cheatDzc() {
    gameState.dzcCount += 100000000000000000;
    updateUI();
}

function cheatMoney() {
    gameState.money += 199999000;
    updateUI();
}

// Start the game
init();

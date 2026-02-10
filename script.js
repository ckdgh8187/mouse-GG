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

    // New Staff Definitions (V2)
    STAFF_DEFS: [
        { name: 'A', baseProd: 5, baseInc: 1, milestoneMod: 1, milestoneType: 'add', initCost: 100, growth: 1.08 },
        { name: 'B', baseProd: 200, baseInc: 6, milestoneMod: 1.2, milestoneType: 'mul', initCost: 5000, growth: 1.08 },
        { name: 'C', baseProd: 1500, baseInc: 45, milestoneMod: 1.25, milestoneType: 'mul', initCost: 120000, growth: 1.08 },
        { name: 'D', baseProd: 2500, baseInc: 350, milestoneMod: 1.4, milestoneType: 'mul', initCost: 3500000, growth: 1.12 },
        { name: 'E', baseProd: 12000, baseInc: 850, milestoneMod: 1.4, milestoneType: 'mul', initCost: 15000000, growth: 1.11 },
        { name: 'F', baseProd: 50000, baseInc: 1750, milestoneMod: 1.4, milestoneType: 'mul', initCost: 45000000, growth: 1.09 }
    ]
};

// --- Audio System ---
const audioSystem = {
    bgm: new Audio('asset/sound/bgm.mp3'),
    click: new Audio('asset/sound/click.mp3'),
    shop: new Audio('asset/sound/shop.mp3')
};

// Configure BGM
audioSystem.bgm.loop = true;
audioSystem.bgm.volume = 0.5;

function playSound(type) {
    if (!audioSystem[type]) return;

    if (type === 'bgm') {
        audioSystem.bgm.play().catch(e => console.log("BGM Autoplay blocked:", e));
        return;
    }

    // For sfx, clone to allow overlapping sounds
    const sound = audioSystem[type].cloneNode();
    sound.volume = 0.6;
    sound.play().catch(() => { }); // Ignore play errors
}

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
    regularGuestMarketingLevel: 0,
    vvipMarketingLevel: 0,
    isStoreOpen: true, // Default open

    // New Upgrades for Purchase Range
    packLevel: 1, // Minimum purchase amount
    giftLevel: 1, // Maximum purchase amount

    // Timers/Counters
    lastSaveTime: Date.now(),

    // Individual Staff Data
    staffData: [], // Each: { level: 1, timer: 0 }

    // Shop/Boosts
    autoClickTimeRemaining: 0, // ms
    customerSurgeTimeRemaining: 0, // ms
    clickBoostRemaining: 0, // ms
    revenueBoostRemaining: 0, // ms

    // Diamonds (IAP Currency)
    diamonds: 0,
    isSpecialGuestActive: false,
    specialGuestCount: 0, // Track multiple special guests
    specialGuestTimer: 0, // Progress towards next special guest (ms)
    autoClickUpgradeLevel: 0,
    adRewardLastTime: 0,
    isAdsRemoved: false,
    isInfiniteAutoClick: false,
    staffGroup1Timer: 0,
    staffGroup2Timer: 0
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

// regular: 10 * 1.068^level
const getRegularMarketingCost = () => Math.floor(10 * Math.pow(1.068, gameState.regularGuestMarketingLevel));
// vvip: 2000 * 1.045^level
const getVvipMarketingCost = () => Math.floor(2000 * Math.pow(1.045, gameState.vvipMarketingLevel));

/**
 * Calculates Special Guest multiplier based on level
 * Base 100x. Increments: +1 (Lv 0-24), +2 (Lv 25-49), +3 (Lv 50-74)...
 */
const getVvipMultiplier = (level) => {
    const batch = Math.floor(level / 25);
    let extra = 0;
    // Sum of previous full batches: 25 * (1 + 2 + ... + batch)
    if (batch > 0) {
        extra += 25 * (batch * (batch + 1) / 2);
    }
    // Current batch remainder
    const remainder = level % 25;
    extra += remainder * (batch + 1);

    return 100 + extra;
};

// Auto-click upgrade: Start 3 diamonds, +2 per level
const getAutoClickUpgradeCost = () => 3 + (gameState.autoClickUpgradeLevel * 2);

// New Packaging Upgrades
// pack (min): 5000 * 1.817^level
const getPackUpgradeCost = () => Math.floor(500 * Math.pow(1.032, gameState.packLevel - 1));
// gift (max): 1000 * 1.566^level
const getGiftUpgradeCost = () => Math.floor(100 * Math.pow(1.024, gameState.giftLevel - 1));

// Shop expansion: 50,000 * 1.5^(current - 10)
const getShopExpandCost = () => Math.floor(50000 * Math.pow(1.5, gameState.shopSize - 10));

// Space Bonus: +5% per pyeong over 10
const getSpaceBonusMultiplier = () => 1 + (Math.max(0, gameState.shopSize - 10) * 0.05);

// staff hiring costs are fixed
const getStaffHireCost = () => {
    const nextIdx = gameState.staffData.length;
    if (nextIdx >= CONSTANTS.STAFF_HIRE_COSTS.length) return Infinity;
    return CONSTANTS.STAFF_HIRE_COSTS[nextIdx];
};

const getStaffUpdateBaseStats = (index, level) => {
    const def = CONSTANTS.STAFF_DEFS[index];
    if (!def) return { production: 0, interval: 1000 };

    let totalProduction = def.baseProd;
    let currentIncrement = def.baseInc;

    // Calculate production by iterating levels to handle compounding increments every 25 levels
    for (let l = 1; l < level; l++) {
        // Every 25 levels (at 25, 50, 75...), increase the increment for subsequent upgrades
        if (l % 25 === 0) {
            if (def.milestoneType === 'add') {
                currentIncrement += def.milestoneMod;
            } else {
                currentIncrement *= def.milestoneMod;
            }
        }
        totalProduction += currentIncrement;
    }

    return {
        production: Math.floor(totalProduction),
        interval: 1000 // All staff are now 1s
    };
};

const getStaffUpgradeCost = (index, level) => {
    const def = CONSTANTS.STAFF_DEFS[index];
    if (!def) return Infinity;
    return Math.floor(def.initCost * Math.pow(def.growth, level - 1));
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
    setupTokyoListeners();
    updateExchangeRate();

    // Try to start BGM
    playSound('bgm');

    // Add global interaction listener to ensure BGM starts if blocked
    document.body.addEventListener('click', () => {
        if (audioSystem.bgm.paused) {
            playSound('bgm');
        }
    }, { once: true });

    // Spawn existing Albas (Groups) with a small delay for layout
    // Spawn existing Albas (Groups) with a small delay
    setTimeout(() => {
        syncAlbaGroupVisuals();
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
        let amount = gameState.clickProduction;
        if (gameState.clickBoostRemaining > 0) amount *= 10;
        if (gameState.clickBoostRemaining > 0) amount *= 10;
        const finalAmount = addDzc(amount);
        showClickEffect(e.pageX, e.pageY, `+${formatKoreanNumber(finalAmount, false)}`);
        playSound('click');
    });

    // Upgrades with Long Press
    setupLongPress(btnUpgradeClick, buyClickUpgrade);
    setupLongPress(btnUpgradeSpeed, buySpeedUpgrade);
    setupLongPress(btnUpgradePrice, buyPriceUpgrade);
    setupLongPress(btnUpgradePack, buyPackUpgrade);
    setupLongPress(btnUpgradeGift, buyGiftUpgrade);

    setupLongPress(document.getElementById('upgrade-sns'), buySnsUpgrade);
    setupLongPress(document.getElementById('upgrade-youtube'), buyYoutubeUpgrade);
    setupLongPress(document.getElementById('upgrade-regular-marketing'), buyRegularMarketingUpgrade);
    setupLongPress(document.getElementById('upgrade-vvip-marketing'), buyVvipMarketingUpgrade);

    btnHireStaff.addEventListener('click', hireStaff);

    // Shop
    const btnActivateAutoClickDisplay = document.getElementById('activate-auto-click');
    if (btnActivateAutoClickDisplay) {
        btnActivateAutoClickDisplay.addEventListener('click', activateAutoClick);
    }
    const btnActivateCustomerSurgeDisplay = document.getElementById('activate-customer-surge');
    if (btnActivateCustomerSurgeDisplay) {
        btnActivateCustomerSurgeDisplay.addEventListener('click', activateCustomerSurge);
    }

    const btnActivateProductionBoost = document.getElementById('activate-production-boost');
    if (btnActivateProductionBoost) {
        btnActivateProductionBoost.addEventListener('click', activateProductionBoost);
    }

    const btnActivateRevenueBoost = document.getElementById('activate-revenue-boost');
    if (btnActivateRevenueBoost) {
        btnActivateRevenueBoost.addEventListener('click', activateRevenueBoost);
    }

    const btnCallSpecialGuest = document.getElementById('call-special-guest');
    if (btnCallSpecialGuest) {
        btnCallSpecialGuest.addEventListener('click', callSpecialGuest);
    }

    const btnUpgradeAutoClick = document.getElementById('upgrade-auto-click-speed');
    if (btnUpgradeAutoClick) {
        btnUpgradeAutoClick.addEventListener('click', buyAutoClickUpgrade);
    }

    // New Shop Items
    document.getElementById('claim-ad-reward').addEventListener('click', claimAdReward);
    document.getElementById('buy-remove-ads').addEventListener('click', buyRemoveAds);
    document.getElementById('buy-infinite-auto-click').addEventListener('click', buyInfiniteAutoClick);

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
    // Apply Space Bonus
    const bonusAmount = amount * getSpaceBonusMultiplier();
    gameState.dzcCount += bonusAmount;
    updateUI();
    return bonusAmount;
}

function showClickEffect(x, y, text, isSmall = false) {
    const el = document.createElement('div');
    el.className = 'click-feedback';
    if (isSmall) {
        el.style.fontSize = '1.3rem'; // 50% of 1.8rem
    }
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function animateButton() {
    const btn = document.getElementById('dzc-button');
    // Remove class to reset animation if it's already playing
    btn.classList.remove('auto-click-active');

    // Force reflow to allow re-triggering animation
    void btn.offsetWidth;

    btn.classList.add('auto-click-active');

    // Remove class after animation duration (matches CSS transition)
    setTimeout(() => {
        btn.classList.remove('auto-click-active');
    }, 100);
}

// --- Customer Logic ---
let customerTimer = 0;
function gameLoop() {
    const now = Date.now();

    // Customer Arrival
    let customerIncrement = 20; // approx 50-60fps tick
    if (gameState.customerSurgeTimeRemaining > 0) {
        customerIncrement *= 10;
        gameState.customerSurgeTimeRemaining -= 20;
    }
    customerTimer += customerIncrement;

    // Click/Revenue Boosts
    if (gameState.clickBoostRemaining > 0) {
        gameState.clickBoostRemaining = Math.max(0, gameState.clickBoostRemaining - 20);
    }
    if (gameState.revenueBoostRemaining > 0) {
        gameState.revenueBoostRemaining = Math.max(0, gameState.revenueBoostRemaining - 20);
    }

    // Auto Clicker
    // Infinite Auto Click or Timer-based
    if (gameState.isInfiniteAutoClick || gameState.autoClickTimeRemaining > 0) {
        if (gameState.autoClickTimeRemaining > 0) {
            gameState.autoClickTimeRemaining -= 20;
        }

        // Automatic click logic based on level (Base 5 + Level)
        const clicksPerSec = 5 + (gameState.autoClickUpgradeLevel || 0);
        const interval = 1000 / clicksPerSec;

        // Use a persistent accumulator for infinite or high precision
        if (!gameState.autoClickAccumulator) gameState.autoClickAccumulator = 0;
        gameState.autoClickAccumulator += 20;

        if (gameState.autoClickAccumulator >= interval) {
            triggerAutoClick();
            gameState.autoClickAccumulator -= interval;
        }
    }

    // Only sell if store is OPEN
    if (gameState.isStoreOpen) {
        if (customerTimer >= gameState.customerTime) {
            trySellDzc();
            customerTimer = 0;
        }

        // Special Guest Timer (60s minus Regular Marketing bonus)
        if (!gameState.isSpecialGuestActive) {
            gameState.specialGuestTimer += 20; // 20ms tick
            const cooldown = Math.max(20000, 60000 - (gameState.regularGuestMarketingLevel * 100));
            if (gameState.specialGuestTimer >= cooldown) {
                // Do NOT reset timer here; reset it when the guest disappears (spawnCustomer will handle)
                spawnCustomer(true, true); // forceSpecial=true, isNatural=true
            }
        }
    }
    // --- Staff Group Production ---
    // Group 1 (Staff A, B, C - indices 0, 1, 2)
    if (gameState.staffData && gameState.staffData.length > 0) {
        gameState.staffGroup1Timer = (gameState.staffGroup1Timer || 0) + 20;
        if (gameState.staffGroup1Timer >= 1000) {
            let group1Total = 0;
            const count = Math.min(3, gameState.staffData.length);
            for (let i = 0; i < count; i++) {
                group1Total += getStaffUpdateBaseStats(i, gameState.staffData[i].level).production;
            }
            if (group1Total > 0) {
                const finalAmount = addDzc(group1Total);
                // Show floating text above Group 1 character
                const char1 = document.querySelector('.alba-character[data-group="1"]');
                if (char1) {
                    const rect = char1.getBoundingClientRect();
                    showClickEffect(rect.left + rect.width / 2, rect.top, `+${formatKoreanNumber(finalAmount, false)}`, true);
                }
            }
            gameState.staffGroup1Timer = 0;
        }
    }

    // Group 2 (Staff D, E, F - indices 3, 4, 5)
    if (gameState.staffData && gameState.staffData.length > 3) {
        gameState.staffGroup2Timer = (gameState.staffGroup2Timer || 0) + 20;
        if (gameState.staffGroup2Timer >= 1000) {
            let group2Total = 0;
            for (let i = 3; i < gameState.staffData.length; i++) {
                group2Total += getStaffUpdateBaseStats(i, gameState.staffData[i].level).production;
            }
            if (group2Total > 0) {
                const finalAmount = addDzc(group2Total);
                // Show floating text above Group 2 character
                const char2 = document.querySelector('.alba-character[data-group="2"]');
                if (char2) {
                    const rect = char2.getBoundingClientRect();
                    showClickEffect(rect.left + rect.width / 2, rect.top, `+${formatKoreanNumber(finalAmount, false)}`, true);
                }
            }
            gameState.staffGroup2Timer = 0;
        }
    }

    updateUI(); // Move UI update here for smooth animation (60fps)

    gameState.lastSaveTime = now;
    requestAnimationFrame(gameLoop);
}

// Separate interval for staff output (REMOVE this, handled in gameLoop now)
// setInterval(() => { ... }, 1000);

function triggerAutoClick() {
    let amount = gameState.clickProduction;
    if (gameState.clickBoostRemaining > 0) amount *= 10;
    const finalAmount = addDzc(amount);

    // Position effect randomly around the button
    const btn = document.getElementById('dzc-button');
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 100;
    const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 100;

    showClickEffect(x, y, `+${formatKoreanNumber(finalAmount, false)}`);
    playSound('click');
    animateButton();
}

function activateAutoClick() {
    if (gameState.isInfiniteAutoClick) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "무한 자동 클릭이 이미 적용 중입니다!", "#e74c3c");
        return;
    }
    if (gameState.autoClickTimeRemaining > 0) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "이미 자동 클릭이 활성화되어 있습니다!", "#e74c3c");
        return;
    }
    if (gameState.diamonds >= 5) {
        adjustDiamonds(-5);
        gameState.autoClickTimeRemaining = 5 * 60 * 1000; // 5 minutes
        updateUI();
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "자동 클릭 활성화!", "#f1c40f");
    } else {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "다이아몬드가 부족합니다!", "#e74c3c");
    }
}

function activateCustomerSurge() {
    if (gameState.customerSurgeTimeRemaining > 0) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "이미 손님 폭주가 활성화되어 있습니다!", "#e74c3c");
        return;
    }
    if (gameState.diamonds >= 3) {
        adjustDiamonds(-3);
        gameState.customerSurgeTimeRemaining = 30 * 1000; // 30 seconds
        updateUI();
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "손님 폭주 시작!", "#e67e22");
    } else {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "다이아몬드가 부족합니다!", "#e74c3c");
    }
}

function activateProductionBoost() {
    if (gameState.clickBoostRemaining > 0) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "이미 생산량 10배가 활성화되어 있습니다!", "#e74c3c");
        return;
    }
    if (gameState.diamonds >= 3) {
        adjustDiamonds(-3);
        gameState.clickBoostRemaining = 30 * 1000; // 30 seconds
        updateUI();
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "생산량 10배 적용!", "#3498db");
    } else {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "다이아몬드가 부족합니다!", "#e74c3c");
    }
}

function activateRevenueBoost() {
    if (gameState.revenueBoostRemaining > 0) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "이미 판매수익 10배가 활성화되어 있습니다!", "#e74c3c");
        return;
    }
    if (gameState.diamonds >= 3) {
        adjustDiamonds(-3);
        gameState.revenueBoostRemaining = 30 * 1000; // 30 seconds
        updateUI();
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "판매수익 10배 적용!", "#2ecc71");
    } else {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "다이아몬드가 부족합니다!", "#e74c3c");
    }
}

function callSpecialGuest() {
    if (gameState.diamonds >= 10) {
        adjustDiamonds(-10);
        spawnCustomer(true); // Force special guest
        updateUI();
    }
}

function trySellDzc() {
    if (gameState.dzcCount > 0 && !gameState.isSpecialGuestActive) {
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

function spawnCustomer(forceSpecial = false, isNatural = false) {
    const gameContainer = document.getElementById('game-container');
    const container = document.getElementById('clicker-area');
    const rect = container.getBoundingClientRect();
    const gameRect = gameContainer.getBoundingClientRect();

    // 1. Create Element
    const guest = document.createElement('div');
    guest.className = 'customer-guest';

    // 0.05% chance for Special Guest (unless forced)
    // Potential random chance removed as per new logic (now deterministic 60s or forced)
    const isSpecial = forceSpecial;

    // CRITICAL: Block regular guests if a special guest is active
    if (!isSpecial && gameState.isSpecialGuestActive) return;

    let guestId = 0;

    if (isSpecial) {
        // Clear all regular guests AND their floating messages when special guest arrives
        // BUT keep other special guests if they are stacking
        document.querySelectorAll('.customer-guest').forEach(el => {
            if (el.dataset.special !== 'true') el.remove();
        });
        document.querySelectorAll('.floating-text').forEach(el => el.remove());

        gameState.isSpecialGuestActive = true;
        gameState.specialGuestCount = (gameState.specialGuestCount || 0) + 1;

        guest.dataset.special = 'true';
        if (isNatural) guest.dataset.natural = 'true';
        guest.classList.add('special');
        guest.style.backgroundImage = `url('asset/image/special_guest.png')`;
    } else {
        // Pick random guest image (01-05)
        guestId = Math.floor(Math.random() * 5) + 1;
        guest.style.backgroundImage = `url('asset/image/guest0${guestId}.png')`;
    }

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
        // CRITICAL: If a special guest arrives, cancel regular guest sales
        if (!isSpecial && gameState.isSpecialGuestActive) {
            guest.remove();
            return;
        }

        executeSale(gameRect.left + targetX, gameRect.top + targetY, guest);

        // Change to matching 'clear' image after purchase
        if (guest.dataset.special === 'true') {
            guest.style.backgroundImage = `url('asset/image/special_guest_clear.png')`;
        } else {
            guest.style.backgroundImage = `url('asset/image/guest0${guestId}_clear.png')`;
        }

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
        setTimeout(() => {
            if (guest.dataset.special === 'true') {
                gameState.specialGuestCount--;
                if (gameState.specialGuestCount <= 0) {
                    gameState.specialGuestCount = 0;
                    gameState.isSpecialGuestActive = false;

                    // Natural spawn case ONLY: Reset timer to 0 upon departure
                    if (guest.dataset.natural === 'true') {
                        gameState.specialGuestTimer = 0;
                    }

                    // Also reset customerTimer so regular customers don't spawn instantly
                    customerTimer = 0;
                }
            }
            guest.remove();
        }, 2100); // Slightly longer to ensure exit is complete
    }, 1600); // Wait for transition (1.5s) + small pause
}

// --- Alba (Staff) Visuals ---
function syncAlbaGroupVisuals() {
    let container = document.getElementById('alba-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alba-container';
        container.className = 'alba-container';
        document.getElementById('clicker-area').appendChild(container);
    }

    const staffCount = gameState.staffData.length;

    // Manage Group 1 (Staff 0, 1, 2)
    syncGroupChar(1, staffCount > 0);
    // Manage Group 2 (Staff 3, 4, 5)
    syncGroupChar(2, staffCount > 3);

    function syncGroupChar(groupId, shouldExist) {
        let char = container.querySelector(`.alba-character[data-group="${groupId}"]`);

        if (shouldExist && !char) {
            char = document.createElement('div');
            char.className = 'alba-character';
            char.dataset.group = groupId;
            // Optionally add different style/image for group 2
            if (groupId === 2) char.classList.add('group2');

            char.style.opacity = '0';
            container.appendChild(char);
            moveAlba(char);
        } else if (!shouldExist && char) {
            char.remove();
        }
    }

    function moveAlba(alba) {
        if (!alba.parentElement) return; // Character removed

        const area = document.getElementById('clicker-area');
        const rect = area.getBoundingClientRect();
        const width = rect.width || 300;
        const height = rect.height || 300;

        const nextX = Math.random() * (width - 60);
        const nextY = Math.random() * (height - 60);
        const currentX = parseFloat(alba.style.left) || nextX;

        if (nextX > currentX) alba.classList.remove('flipped');
        else alba.classList.add('flipped');

        alba.classList.add('walking');
        alba.style.left = `${nextX}px`;
        alba.style.top = `${nextY}px`;
        alba.style.opacity = '1';

        setTimeout(() => {
            if (!alba.parentElement) return;
            alba.classList.remove('walking');
            setTimeout(() => moveAlba(alba), 1000 + Math.random() * 3000);
        }, 2000);
    }
}

function executeSale(x, y, guestEl) {
    if (gameState.dzcCount <= 0) return;

    let sellAmount = 0;
    const isSpecial = guestEl.dataset.special === 'true';

    if (isSpecial) {
        // Special Guest buys Multiplier * (Random Regular Amount)
        // Regular amount range: [packLevel, max(packLevel, giftLevel)]
        const min = gameState.packLevel || 1;
        const max = Math.max(min, gameState.giftLevel || 1);
        const baseAmount = Math.floor(Math.random() * (max - min + 1)) + min;

        const multiplier = getVvipMultiplier(gameState.vvipMarketingLevel || 0);
        sellAmount = baseAmount * multiplier;

        // Ensure they don't buy more than we have
        if (sellAmount > gameState.dzcCount) sellAmount = gameState.dzcCount;
    } else {
        // Minimum is packLevel, Maximum is giftLevel
        const min = gameState.packLevel;
        const max = Math.max(min, gameState.giftLevel);
        sellAmount = Math.floor(Math.random() * (max - min + 1)) + min;

        // Additional Shop Bonus
        const shopExpandChance = gameState.shopSize > 10 ? 0.2 : 0;
        if (Math.random() < shopExpandChance) {
            sellAmount += 1;
        }
    }

    if (gameState.dzcCount < sellAmount) sellAmount = gameState.dzcCount;

    // Special guests do NOT benefit from Revenue Boost (x10)
    const boostMultiplier = (gameState.revenueBoostRemaining > 0 && !isSpecial) ? 10 : 1;

    // Apply Space Bonus to revenue
    const moneyEarned = Math.floor(sellAmount * gameState.dzcPrice * boostMultiplier * getSpaceBonusMultiplier());

    gameState.dzcCount -= sellAmount;
    gameState.money += moneyEarned;

    playSound('shop');
    showFloatingText(x, y - 40, `+${formatKoreanNumber(moneyEarned)}원`, isSpecial ? '#f1c40f' : '#2ecc71');
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
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.packLevel++;
        updateUI();
    }
}

function buyGiftUpgrade() {
    const cost = getGiftUpgradeCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.giftLevel++;
        updateUI();
    }
}

function buySnsUpgrade() {
    if (gameState.snsMarketingLevel >= 1000) {
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
        return;
    }
    const cost = getYoutubeUpgradeCost();
    if (gameState.dzcCount >= cost) {
        gameState.dzcCount -= cost;
        gameState.youtubeMarketingLevel++;
        updateUI();
    }
}

function buyRegularMarketingUpgrade() {
    if (gameState.regularGuestMarketingLevel >= 400) return;
    const cost = getRegularMarketingCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.regularGuestMarketingLevel++;
        updateUI();
    }
}

function buyVvipMarketingUpgrade() {
    if (gameState.vvipMarketingLevel >= 300) return;
    const cost = getVvipMarketingCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.vvipMarketingLevel++;
        updateUI();
    }
}

function buyAutoClickUpgrade() {
    if (gameState.autoClickUpgradeLevel >= 40) return;
    const cost = getAutoClickUpgradeCost();
    if (gameState.diamonds >= cost) {
        adjustDiamonds(-cost);
        gameState.autoClickUpgradeLevel++;
        updateUI();
    } else {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "💎 다이아가 부족합니다!", "#e74c3c");
    }
}

// Shop Functions
function claimAdReward() {
    const now = Date.now();
    const cooldown = 300000; // 5 minutes
    if (now - (gameState.adRewardLastTime || 0) < cooldown) {
        return;
    }

    // Mock ad playback (visual feedback only)
    showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "🎬 광고 재생 중...", "#3498db");

    setTimeout(() => {
        gameState.adRewardLastTime = Date.now();
        adjustDiamonds(5);
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "💎 다이아 5개 보상 완료!", "#f1c40f");
        updateUI();
    }, 1000); // 1 second mock delay
}

function buyRemoveAds() {
    if (gameState.isAdsRemoved) return;
    if (confirm("광고 제거를 구매하시겠습니까? (4,900원)")) {
        gameState.isAdsRemoved = true;
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "✨ 광고 제거 구매 완료!", "#3498db");
        updateUI();
    }
}

function buyInfiniteAutoClick() {
    if (gameState.isInfiniteAutoClick) return;
    if (confirm("무한 자동 클릭을 구매하시겠습니까? (2,900원)")) {
        gameState.isInfiniteAutoClick = true;
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "⚡ 무한 자동 클릭 구매 완료!", "#f1c40f");
        updateUI();
    }
}

function hireStaff() {
    const currentCount = gameState.staffData.length;

    // Shop size requirements
    if (currentCount < 3 && gameState.shopSize < 10) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "가게가 너무 좁습니다! (10평 필요)", "#e74c3c");
        return;
    }
    if (currentCount >= 3 && gameState.shopSize < 20) {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "더 큰 매장이 필요합니다! (20평 필요)", "#e74c3c");
        return;
    }

    const cost = getStaffHireCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.staffData.push({ level: 1 }); // No internal timer needed
        syncAlbaGroupVisuals(); // Visual feedback
        updateUI();
    }
}

function upgradeStaff(index) {
    const staff = gameState.staffData[index];
    if (!staff) return;

    const cost = getStaffUpgradeCost(index, staff.level);
    if (gameState.money >= cost) {
        gameState.money -= cost;
        staff.level++;
        updateUI();
    }
}



function expandShop() {
    const cost = getShopExpandCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.shopSize += 1; // +1 pyeong increment
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, `가게 증축 완료! (${gameState.shopSize}평)`, "#3498db");
        updateUI();
    } else {
        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "돈이 부족합니다!", "#e74c3c");
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
    const elDiamonds = document.getElementById('diamond-count-display');
    if (elDiamonds) elDiamonds.textContent = (gameState.diamonds || 0).toLocaleString();

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
        const nameEl = clickUpgrade.querySelector('.name');
        const descEl = clickUpgrade.querySelector('.desc');
        const costEl = clickUpgrade.querySelector('#cost-click');
        const cost = getClickUpgradeCost();
        if (nameEl) nameEl.textContent = `두쫀쿠 생산량 증가 Lv.${gameState.clickUpgradeLevel}`;
        if (descEl) descEl.textContent = `클릭당 두쫀쿠 생산 +${formatKoreanNumber(gameState.clickProduction)}`;
        if (costEl) costEl.textContent = formatKoreanNumber(cost);
        clickUpgrade.disabled = gameState.dzcCount < cost;
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
        const nameEl = priceUpgrade.querySelector('.name');
        const descEl = priceUpgrade.querySelector('.desc');
        const costEl = priceUpgrade.querySelector('#cost-price');
        const cost = getPriceUpgradeCost();
        if (nameEl) nameEl.textContent = `고급 마케팅 Lv.${gameState.marketingLevel}`;
        if (descEl) descEl.textContent = `두쫀쿠 가격 : ${formatKoreanNumber(gameState.dzcPrice)}원`;
        if (costEl) costEl.textContent = formatKoreanNumber(cost);
        priceUpgrade.disabled = gameState.dzcCount < cost;
    }

    const packUpgrade = document.getElementById('upgrade-pack');
    if (packUpgrade) {
        const isRestricted = gameState.packLevel >= gameState.giftLevel;
        packUpgrade.querySelector('.name').textContent = `포장 개선 Lv.${gameState.packLevel}`;
        packUpgrade.querySelector('.desc').textContent = isRestricted ? `최대치 도달 (선물 패키징 필요)` : `최소 구매 개수 : ${gameState.packLevel}개`;
        packUpgrade.querySelector('#cost-pack').textContent = formatKoreanNumber(getPackUpgradeCost());
        packUpgrade.disabled = gameState.money < getPackUpgradeCost() || isRestricted;
    }

    const giftUpgrade = document.getElementById('upgrade-gift');
    if (giftUpgrade) {
        giftUpgrade.querySelector('.name').textContent = `선물 패키징 Lv.${gameState.giftLevel}`;
        giftUpgrade.querySelector('.desc').textContent = `최대 구매 개수 : ${gameState.giftLevel}개`;
        giftUpgrade.querySelector('#cost-gift').textContent = formatKoreanNumber(getGiftUpgradeCost());
        giftUpgrade.disabled = gameState.money < getGiftUpgradeCost();
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

    // New Special Guest Marketing UI
    const regUpgrade = document.getElementById('upgrade-regular-marketing');
    if (regUpgrade) {
        const isMax = gameState.regularGuestMarketingLevel >= 400;
        const intervalSec = (60 - (gameState.regularGuestMarketingLevel * 0.1)).toFixed(1);
        regUpgrade.querySelector('.name').textContent = `단골 마케팅 Lv.${gameState.regularGuestMarketingLevel}${isMax ? ' (MAX)' : ''}`;
        regUpgrade.querySelector('.desc').textContent = isMax ? `최소 등장 주기 도달! (20초)` : `특별손님 등장 주기 : ${intervalSec}초`;
        regUpgrade.querySelector('#cost-regular-marketing').textContent = isMax ? '최고 단계' : formatKoreanNumber(getRegularMarketingCost());
        regUpgrade.disabled = isMax || gameState.money < getRegularMarketingCost();

        // Progress Bar
        const bar = document.getElementById('regular-milestone-bar');
        if (bar) {
            const cooldown = Math.max(20000, 60000 - (gameState.regularGuestMarketingLevel * 100));
            const progress = (gameState.specialGuestTimer / cooldown) * 100;
            bar.style.width = `${Math.min(100, progress)}%`;
            if (progress > 90) bar.style.background = "#e74c3c";
            else bar.style.background = "";
        }
    }

    const vvipUpgrade = document.getElementById('upgrade-vvip-marketing');
    if (vvipUpgrade) {
        const cost = getVvipMarketingCost();
        const level = gameState.vvipMarketingLevel || 0;
        const multiplier = getVvipMultiplier(level);

        vvipUpgrade.querySelector('.name').textContent = `큰손 마케팅 Lv.${level}`;
        vvipUpgrade.querySelector('.desc').textContent = `특별손님 구매량 : 일반의 ${multiplier}배`;
        vvipUpgrade.querySelector('#cost-vvip-marketing').textContent = formatKoreanNumber(cost);
        vvipUpgrade.disabled = gameState.money < cost;

        // Progress Bar (through the current 25-level batch)
        const bar = document.getElementById('vvip-milestone-bar');
        if (bar) {
            const progress = ((level % 25) / 25) * 100;
            // Handle 0% progress specifically if needed, but width 0 is fine
            bar.style.width = `${progress}%`;
            if (progress > 90) bar.style.background = "#e74c3c";
            else bar.style.background = "";
        }
    }

    document.getElementById('cost-staff').textContent = getStaffHireCost() === Infinity ? "Max" : formatKoreanNumber(getStaffHireCost());
    const elMaxStaff = document.getElementById('max-staff');
    if (elMaxStaff) elMaxStaff.textContent = 6;

    const btnHireStaffEl = document.getElementById('hire-staff');
    if (btnHireStaffEl) {
        const cost = getStaffHireCost();
        const currentCount = gameState.staffData.length;
        const isMax = currentCount >= 6;
        const isLockedByShop1 = currentCount < 3 && gameState.shopSize < 10;
        const isLockedByShop2 = currentCount >= 3 && gameState.shopSize < 20;
        const isLocked = isLockedByShop1 || isLockedByShop2;

        btnHireStaffEl.disabled = isMax || isLocked || gameState.money < cost;

        const nameEl = btnHireStaffEl.querySelector('.name');
        const descEl = btnHireStaffEl.querySelector('.desc');

        if (isMax) {
            if (nameEl) nameEl.textContent = `알바 고용 (최대)`;
            if (descEl) {
                descEl.textContent = `현재는 최대 6명까지만 고용 가능합니다.`;
                descEl.style.color = '';
            }
        } else if (isLocked) {
            if (nameEl) nameEl.textContent = `알바 고용 (잠김)`;
            if (descEl) {
                descEl.textContent = isLockedByShop1 ? `가게 확장(10평)이 필요합니다.` : `가게 증축(20평)이 필요합니다.`;
                descEl.style.color = '#e74c3c';
            }
        } else {
            if (nameEl) nameEl.textContent = `알바 고용 Lv.${currentCount}`;
            if (descEl) {
                descEl.textContent = `알바를 고용하여 자동생산을 합니다.`;
                descEl.style.color = '';
            }
        }
    }

    renderStaffUpgrades();

    // Expansion Buttons
    if (btnExpandShop) {
        const cost = getShopExpandCost();
        const bonusPercent = Math.round((getSpaceBonusMultiplier() - 1) * 100);
        btnExpandShop.querySelector('.name').textContent = `가게 증축 (+1평)`;
        btnExpandShop.querySelector('.desc').textContent = `매장 평수를 넓혀 생산&매출 보너스(+5%/평)를 받습니다. (현재: +${bonusPercent}%)`;
        btnExpandShop.querySelector('#cost-expand-shop').textContent = formatKoreanNumber(cost);
        btnExpandShop.disabled = (gameState.money < cost);
    }

    if (btnMoveTokyo) {
        btnMoveTokyo.disabled = (gameState.shopSize < 40);
    }

    // Auto Click UI
    const elAutoClickTimer = document.getElementById('auto-click-timer');
    if (elAutoClickTimer) {
        if (gameState.autoClickTimeRemaining > 0) {
            const mins = Math.floor(gameState.autoClickTimeRemaining / 60000);
            const secs = Math.floor((gameState.autoClickTimeRemaining % 60000) / 1000);
            elAutoClickTimer.textContent = `(${mins}:${secs.toString().padStart(2, '0')})`;
        } else {
            elAutoClickTimer.textContent = '';
        }
    }

    const btnActivateAutoClick = document.getElementById('activate-auto-click');
    if (btnActivateAutoClick) {
        const level = gameState.autoClickUpgradeLevel || 0;
        btnActivateAutoClick.querySelector('.desc').textContent = `초당 ${5 + level}회의 속도로 자동 클릭을 합니다.`;

        if (gameState.isInfiniteAutoClick) {
            btnActivateAutoClick.disabled = true;
            btnActivateAutoClick.querySelector('.name').textContent = "자동 클릭 활성화 (무한 적용 중)";
        } else {
            btnActivateAutoClick.disabled = gameState.autoClickTimeRemaining > 0 || (gameState.diamonds || 0) < 5;
            btnActivateAutoClick.querySelector('.name').textContent = "자동 클릭 활성화 (5분)";
        }
    }

    const upgradeAutoClick = document.getElementById('upgrade-auto-click-speed');
    if (upgradeAutoClick) {
        const isMax = (gameState.autoClickUpgradeLevel || 0) >= 40;
        const cost = getAutoClickUpgradeCost();
        const level = gameState.autoClickUpgradeLevel || 0;
        upgradeAutoClick.querySelector('.name').textContent = `자동 클릭 강화 Lv.${level}${isMax ? ' (MAX)' : ''}`;
        upgradeAutoClick.querySelector('.desc').textContent = `자동 클릭의 초당 횟수를 +1만큼 늘립니다.`;

        const costEl = upgradeAutoClick.querySelector('#cost-auto-click-speed');
        if (costEl) costEl.textContent = isMax ? '최고 단계' : cost;

        upgradeAutoClick.disabled = isMax || (gameState.diamonds || 0) < cost;
    }

    // Customer Surge UI
    const elCustomerSurgeTimer = document.getElementById('customer-surge-timer');
    if (elCustomerSurgeTimer) {
        if (gameState.customerSurgeTimeRemaining > 0) {
            const secs = Math.ceil(gameState.customerSurgeTimeRemaining / 1000);
            elCustomerSurgeTimer.textContent = `(00:${secs.toString().padStart(2, '0')})`;
        } else {
            elCustomerSurgeTimer.textContent = '';
        }
    }

    const btnActivateCustomerSurge = document.getElementById('activate-customer-surge');
    if (btnActivateCustomerSurge) {
        btnActivateCustomerSurge.disabled = gameState.customerSurgeTimeRemaining > 0 || (gameState.diamonds || 0) < 3;
    }

    // New Boost UI
    const elClickBoostTimer = document.getElementById('click-boost-timer');
    if (elClickBoostTimer) {
        if (gameState.clickBoostRemaining > 0) {
            const secs = Math.ceil(gameState.clickBoostRemaining / 1000);
            elClickBoostTimer.textContent = `(00:${secs.toString().padStart(2, '0')})`;
        } else {
            elClickBoostTimer.textContent = '';
        }
    }

    const elRevenueBoostTimer = document.getElementById('revenue-boost-timer');
    if (elRevenueBoostTimer) {
        if (gameState.revenueBoostRemaining > 0) {
            const secs = Math.ceil(gameState.revenueBoostRemaining / 1000);
            elRevenueBoostTimer.textContent = `(00:${secs.toString().padStart(2, '0')})`;
        } else {
            elRevenueBoostTimer.textContent = '';
        }
    }

    const btnActivateProductionBoost = document.getElementById('activate-production-boost');
    if (btnActivateProductionBoost) {
        btnActivateProductionBoost.disabled = gameState.clickBoostRemaining > 0 || (gameState.diamonds || 0) < 3;
    }

    const btnActivateRevenueBoost = document.getElementById('activate-revenue-boost');
    if (btnActivateRevenueBoost) {
        btnActivateRevenueBoost.disabled = gameState.revenueBoostRemaining > 0 || (gameState.diamonds || 0) < 3;
    }

    const btnCallSpecial = document.getElementById('call-special-guest');
    if (btnCallSpecial) {
        btnCallSpecial.disabled = (gameState.diamonds || 0) < 10;
    }

    // New Shop UI
    const elAdReward = document.getElementById('claim-ad-reward');
    if (elAdReward) {
        const now = Date.now();
        const diff = now - (gameState.adRewardLastTime || 0);
        const cooldown = 300000;
        const elTimer = document.getElementById('ad-reward-timer');
        if (diff < cooldown) {
            elAdReward.disabled = true;
            const remaining = cooldown - diff;
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            if (elTimer) elTimer.textContent = `(${mins}:${secs.toString().padStart(2, '0')})`;
        } else {
            elAdReward.disabled = false;
            if (elTimer) elTimer.textContent = '';
        }
    }

    const elRemoveAds = document.getElementById('buy-remove-ads');
    if (elRemoveAds) {
        if (gameState.isAdsRemoved) {
            elRemoveAds.disabled = true;
            elRemoveAds.querySelector('.name').textContent = "광고 제거 (구매 완료)";
        } else {
            elRemoveAds.disabled = false;
            elRemoveAds.querySelector('.name').textContent = "광고 제거";
        }
    }

    const elInfiniteAuto = document.getElementById('buy-infinite-auto-click');
    if (elInfiniteAuto) {
        if (gameState.isInfiniteAutoClick) {
            elInfiniteAuto.disabled = true;
            elInfiniteAuto.querySelector('.name').textContent = "무한 자동 클릭 (구매 완료)";
        } else {
            elInfiniteAuto.disabled = false;
            elInfiniteAuto.querySelector('.name').textContent = "무한 자동 클릭";
        }
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
            const stats = getStaffUpdateBaseStats(index, staff.level);
            const cost = getStaffUpgradeCost(index, staff.level);
            const def = CONSTANTS.STAFF_DEFS[index];
            const name = def.name;

            const progress = ((staff.level % 25) / 25) * 100;
            const isMilestoneAlmostReached = progress > 90;

            btn.innerHTML = `
                <span class="name">알바${name} 강화 Lv.${staff.level}</span>
                <span class="desc">1초마다 ${formatKoreanNumber(stats.production)}개 생산</span>
                <div class="milestone-gauge-container" style="margin: 4px 0;">
                    <div class="milestone-gauge-bar" style="width: ${progress}%; background: ${isMilestoneAlmostReached ? '#e74c3c' : ''}"></div>
                </div>
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
            if (!gameState.tokyoUnlocked) {
                gameState.money -= cost;
                gameState.tokyoUnlocked = true;
            }
            elTokyoContainer.style.display = 'flex';
            updateTokyoUI();
            updateUI();
        } else if (gameState.tokyoUnlocked) {
            elTokyoContainer.style.display = 'flex';
            updateTokyoUI();
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

        showFloatingText(window.innerWidth / 2, window.innerHeight / 2, `${amountYen}엔 환전: +${formatKoreanNumber(krw)}원`, '#27ae60');
        updateTokyoUI();
        updateUI();
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
        gameState.yen -= cost;
        if (Math.random() < 0.5) {
            gameState.tokyoMenuLevel++;
            showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "신메뉴 개발 성공! 🎉", '#27ae60');
        } else {
            showFloatingText(window.innerWidth / 2, window.innerHeight / 2, "신메뉴 개발 실패... 😢", '#e74c3c');
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

function cheatDiamond() {
    adjustDiamonds(1000);
}

function buyDiamonds(amount) {
    adjustDiamonds(amount);
}

/**
 * Centrally manages diamond changes to ensure automatic saving
 * @param {number} amount - Positive to add, negative to spend
 */
function adjustDiamonds(amount) {
    gameState.diamonds = (gameState.diamonds || 0) + amount;
    if (gameState.diamonds < 0) gameState.diamonds = 0; // Prevent negative
    saveGame();
    updateUI();
}

// Start the game
init();

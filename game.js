// game.js
// Здесь будет логика игры TG Farm 

// Проверка запуска в Telegram
let isTelegram = false;
let tg = null;

function initTelegram() {
    if (window.Telegram && Telegram.WebApp) {
        isTelegram = true;
        tg = Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Отправляем событие открытия игры в бота
        tg.sendData(JSON.stringify({
            type: "open_game",
            timestamp: Date.now()
        }));
        
        // Получение данных пользователя
        const user = tg.initDataUnsafe.user;
        if (user) {
            console.log(`Игрок: ${user.first_name} ${user.last_name || ''} (@${user.username})`);
        }
        
        // Изменение темы
        document.documentElement.style.setProperty('--bg-color', tg.themeParams.bg_color || '#e8f5e9');
        document.documentElement.style.setProperty('--text-color', tg.themeParams.text_color || '#000000');
        
        // Обработчик закрытия
        tg.onEvent('viewportChanged', () => {
            if (tg.isExpanded) tg.enableClosingConfirmation();
        });
    }
}

// Конфигурация растений
const PLANTS = {
    potato: { 
        name: "Картофель", 
        emoji: "🥔", 
        growthTime: 60, // в секундах
        cost: 5,
        reward: { min: 7, max: 10 }
    },
    carrot: { 
        name: "Морковь", 
        emoji: "🥕", 
        growthTime: 180, 
        cost: 10,
        reward: { min: 15, max: 20 }
    },
    sunflower: { 
        name: "Подсолнух", 
        emoji: "🌻", 
        growthTime: 600, 
        cost: 20,
        reward: { min: 35, max: 40 }
    },
    chicken: {
        name: "Курица",
        emoji: "🐔",
        growthTime: 300, // 5 минут
        cost: 30,
        reward: { min: 10, max: 15 },
        product: "🥚"
    }
};

// Состояние игры
let gameState = {
    coins: 50,
    level: 1,
    experience: 0,
    fields: [
        { id: 0, plant: null, plantedAt: null, growthTime: null, locked: false },
        { id: 1, plant: null, plantedAt: null, growthTime: null, locked: false },
        { id: 2, plant: null, plantedAt: null, growthTime: null, locked: true },
        { id: 3, plant: null, plantedAt: null, growthTime: null, locked: true }
    ],
    storage: {
        potato: 0,
        carrot: 0,
        sunflower: 0,
        chicken: 0,
        egg: 0
    }
};

// Конфигурация магазина
const SHOP_ITEMS = {
    seeds: [
        { id: 'pineapple', name: "Семена ананаса", emoji: "🍍", price: 100, type: 'seed', growthTime: 1800 },
        { id: 'avocado', name: "Семена авокадо", emoji: "🥑", price: 80, type: 'seed', growthTime: 1500 }
    ],
    animals: [
        { id: 'chicken', name: "Курица", emoji: "🐔", price: 150, type: 'animal', product: "🥚", productionTime: 600 },
        { id: 'cow', name: "Корова", emoji: "🐄", price: 500, type: 'animal', product: "🥛", productionTime: 1800 }
    ],
    buildings: [
        { id: 'barn', name: "Амбар", emoji: "🏚️", price: 1000, type: 'building', effect: "storage+50" },
        { id: 'mill', name: "Мельница", emoji: "🏭", price: 2000, type: 'building', effect: "process:wheat->flour" }
    ],
    decorations: [
        { id: 'gnome', name: "Садовый гном", emoji: "🪆", price: 200, type: 'decoration' },
        { id: 'fence', name: "Декоративный забор", emoji: "🪵", price: 50, type: 'decoration' }
    ],
    tools: [
        { id: 'golden_watering', name: "Золотая лейка", emoji: "💧", price: 300, type: 'tool', effect: "growth-20%" },
        { id: 'lucky_shovel', name: "Удачливая лопата", emoji: "🪣", price: 250, type: 'tool', effect: "rare+15%" }
    ]
};

// Инициализация игры
function initGame() {
    loadGame(); // СНАЧАЛА загружаем сохранённое состояние!
    initTelegram();
    renderFields();
    updateUI();
    setupEventListeners();
    setInterval(renderFields, 1000);
}

// Генерация полей
function renderFields() {
    const container = document.getElementById('fields-container');
    container.innerHTML = '';
    
    gameState.fields.forEach(field => {
        const fieldEl = document.createElement('div');
        fieldEl.className = 'field';
        fieldEl.id = `field-${field.id}`;
        
        if (field.locked) {
            fieldEl.innerHTML = `
                <div>🔒</div>
                <div>Открыть: 100₽</div>
            `;
            fieldEl.onclick = () => unlockField(field.id);
        } else if (field.plant) {
            const plant = PLANTS[field.plant];
            const timePassed = Math.floor((Date.now() - field.plantedAt) / 1000);
            const timeLeft = Math.max(0, field.growthTime - timePassed);
            if (timeLeft <= 0) {
                fieldEl.innerHTML = `
                    <div class="plant">${plant.emoji}</div>
                    <div class="timer">Готово!</div>
                `;
                fieldEl.onclick = () => harvestField(field.id);
            } else {
                fieldEl.innerHTML = `
                    <div class="plant">${plant.emoji}</div>
                    <div class="timer">${formatTime(timeLeft)}</div>
                `;
                fieldEl.onclick = null;
            }
        } else {
            fieldEl.innerHTML = '<div>Свободно</div>';
            fieldEl.onclick = () => openPlantModal(field.id);
        }
        
        container.appendChild(fieldEl);
    });
}

// Обновление UI
function updateUI() {
    document.getElementById('coins').textContent = gameState.coins;
    document.getElementById('level').textContent = gameState.level;
    // Показываем опыт (можно добавить отдельный элемент в HTML, если нужно)
    let expEl = document.getElementById('experience');
    if (!expEl) {
        expEl = document.createElement('div');
        expEl.id = 'experience';
        expEl.style.marginBottom = '10px';
        document.querySelector('.header').appendChild(expEl);
    }
    expEl.textContent = `Опыт: ${gameState.experience} / ${gameState.level * 100}`;
}

// Форматирование времени
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Открытие модального окна посадки
function openPlantModal(fieldId) {
    const container = document.getElementById('plants-container');
    container.innerHTML = '';
    
    Object.entries(PLANTS).forEach(([key, plant]) => {
        const btn = document.createElement('button');
        btn.innerHTML = `${plant.emoji} ${plant.name} (${plant.cost}₽)`;
        btn.onclick = () => plantSeed(fieldId, key);
        container.appendChild(btn);
    });
    
    document.getElementById('plant-modal').classList.remove('hidden');
}

// Посадка растения
function plantSeed(fieldId, plantType) {
    const field = gameState.fields.find(f => f.id === fieldId);
    const plant = PLANTS[plantType];
    
    if (gameState.coins >= plant.cost) {
        gameState.coins -= plant.cost;
        field.plant = plantType;
        field.plantedAt = Date.now();
        field.growthTime = plant.growthTime;
        
        closeModal('plant-modal');
        renderFields();
        updateUI();
        saveGame();
    } else {
        alert('Недостаточно монет!');
    }
}

// Сбор урожая
function harvestField(fieldId) {
    const field = gameState.fields.find(f => f.id === fieldId);
    const plant = PLANTS[field.plant];
    const timePassed = Math.floor((Date.now() - field.plantedAt) / 1000);
    if (field.plant && timePassed >= field.growthTime) {
        // Если это животное - добавляем продукт
        if (PLANTS[field.plant]?.product) {
            gameState.storage[field.plant]++; // Само животное
            gameState.storage.egg += 3; // 3 яйца
        } else {
            gameState.storage[field.plant]++;
        }
        field.plant = null;
        field.plantedAt = null;
        field.growthTime = null;
        renderFields();
        saveGame();
        alert('Урожай собран!');
    }
}

// Открытие склада
function openStorage() {
    const container = document.getElementById('storage-container');
    container.innerHTML = '';
    Object.entries(gameState.storage).forEach(([key, count]) => {
        if (count > 0) {
            let display;
            if (key === 'egg') {
                display = `🥚 Яйца: ${count}`;
            } else if (PLANTS[key]) {
                const plant = PLANTS[key];
                display = `${plant.emoji} ${plant.name}: ${count}`;
            } else {
                display = `${key}: ${count}`;
            }
            const item = document.createElement('div');
            item.className = 'storage-item';
            item.innerHTML = display;
            container.appendChild(item);
        }
    });
    if (container.innerHTML === '') {
        container.innerHTML = '<p>Склад пуст</p>';
    }
    document.getElementById('storage-modal').classList.remove('hidden');
}

// Проверка повышения уровня
function checkLevelUp() {
    const expNeeded = gameState.level * 100;
    if (gameState.experience >= expNeeded) {
        gameState.level++;
        gameState.experience -= expNeeded;
        alert(`Уровень повышен! Новый уровень: ${gameState.level}`);
        updateUI();
    }
}

// Продажа урожая
function sellAll() {
    let earnings = 0;
    Object.keys(gameState.storage).forEach(key => {
        if (gameState.storage[key] > 0) {
            const plant = PLANTS[key];
            const count = gameState.storage[key];
            // Для яиц и животных можно задать фиксированную цену или не учитывать
            let price = 0;
            if (plant) {
                price = randomInRange(plant.reward.min, plant.reward.max);
            } else if (key === 'egg') {
                price = 2; // цена за яйцо
            }
            const itemEarnings = count * price;
            earnings += itemEarnings;
            gameState.storage[key] = 0;
        }
    });
    gameState.coins += earnings;
    gameState.experience += earnings;
    checkLevelUp();
    updateUI();
    saveGame();
    closeModal('storage-modal');
    alert('Урожай продан!');
}

// Разблокировка поля
function unlockField(fieldId) {
    const field = gameState.fields.find(f => f.id === fieldId);
    
    if (gameState.coins >= 100) {
        gameState.coins -= 100;
        field.locked = false;
        renderFields();
        updateUI();
        saveGame();
    } else {
        alert('Недостаточно монет!');
    }
}

// Установка обработчиков событий
const oldSetupEventListeners = setupEventListeners;
setupEventListeners = function() {
    oldSetupEventListeners();
    document.getElementById('shop-btn').addEventListener('click', openShop);
    document.getElementById('close-shop-modal').addEventListener('click', () => closeModal('shop-modal'));
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderShopItems(category);
        });
    });
}

// Помощь другу
function sendHelp() {
    if (isTelegram && tg) {
        tg.sendData(JSON.stringify({
            type: "help_request",
            coins: gameState.coins
        }));
        tg.showAlert("Запрос помощи отправлен друзьям!");
    } else {
        alert("Запрос помощи отправлен друзьям!");
    }
}

// Вспомогательные функции
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Сохранение игры
function saveGame() {
    localStorage.setItem('tgFarmGame', JSON.stringify(gameState));
}

// Загрузка игры
function loadGame() {
    const saved = localStorage.getItem('tgFarmGame');
    if (saved) {
        const parsed = JSON.parse(saved);
        
        // Миграция старых полей (если есть)
        parsed.fields.forEach(field => {
            if (field.plant && (!field.plantedAt || !field.growthTime)) {
                field.plantedAt = Date.now();
                field.growthTime = PLANTS[field.plant].growthTime;
            }
        });
        
        gameState = parsed;
        renderFields();
        updateUI();
    }
}

// Запуск игры при загрузке
document.addEventListener('DOMContentLoaded', initGame); 

function openShop() {
    renderShopItems('seeds'); // По умолчанию открываем семена
    document.getElementById('shop-modal').classList.remove('hidden');
}

function renderShopItems(category) {
    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';
    const items = SHOP_ITEMS[category];
    if (items && items.length > 0) {
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            itemEl.innerHTML = `
                <div class="shop-item-emoji">${item.emoji}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-price">${item.price} ₽</div>
                </div>
                <button class="buy-btn" data-id="${item.id}" data-category="${category}">Купить</button>
            `;
            container.appendChild(itemEl);
        });
    }
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const category = e.target.dataset.category;
            buyShopItem(id, category);
        });
    });
}

function buyShopItem(id, category) {
    const item = SHOP_ITEMS[category].find(i => i.id === id);
    if (!item) return;
    if (gameState.coins >= item.price) {
        gameState.coins -= item.price;
        switch (item.type) {
            case 'seed':
                PLANTS[item.id] = {
                    name: item.name,
                    emoji: item.emoji,
                    growthTime: item.growthTime,
                    cost: item.price,
                    reward: { min: item.price * 2, max: item.price * 3 }
                };
                break;
            case 'animal':
                gameState.animals = gameState.animals || [];
                gameState.animals.push({
                    type: item.id,
                    emoji: item.emoji,
                    product: item.product,
                    timer: item.productionTime,
                    lastProduction: Date.now()
                });
                break;
            case 'building':
                applyBuildingEffect(item.effect);
                break;
            case 'tool':
                activateTool(item.effect);
                break;
            case 'decoration':
                gameState.decorations = gameState.decorations || [];
                gameState.decorations.push({
                    id: item.id,
                    emoji: item.emoji
                });
                break;
        }
        updateUI();
        saveGame();
        alert(`Вы купили: ${item.name}!`);
    } else {
        alert('Недостаточно монет!');
    }
}

function applyBuildingEffect(effect) {
    const [type, value] = effect.split(':');
    switch (type) {
        case 'storage+50':
            gameState.storageCapacity += 50;
            break;
        case 'process':
            const [from, to] = value.split('->');
            gameState.processingRecipes = gameState.processingRecipes || {};
            gameState.processingRecipes[from] = to;
            break;
    }
}

function activateTool(effect) {
    const [type, value] = effect.split(/(\+|\-)/);
    switch (type) {
        case 'growth':
            gameState.growthBoost = gameState.growthBoost || 0;
            if (value.includes('-')) gameState.growthBoost += parseFloat(value.replace('%', '')) / 100;
            break;
        case 'rare':
            gameState.rareFindChance = gameState.rareFindChance || 0;
            if (value.includes('+')) gameState.rareFindChance += parseFloat(value.replace('%', '')) / 100;
            break;
    }
} 
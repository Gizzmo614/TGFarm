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
    }
};

// Состояние игры
let gameState = {
    coins: 50,
    level: 1,
    fields: [
        { id: 0, plant: null, timer: null, intervalId: null },
        { id: 1, plant: null, timer: null, intervalId: null },
        { id: 2, plant: null, timer: null, intervalId: null, locked: true },
        { id: 3, plant: null, timer: null, intervalId: null, locked: true }
    ],
    storage: {
        potato: 0,
        carrot: 0,
        sunflower: 0
    }
};

// Инициализация игры
function initGame() {
    initTelegram(); // Инициализация Telegram
    renderFields();
    updateUI();
    setupEventListeners();
    loadGame();
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
            fieldEl.innerHTML = `
                <div class="plant">${plant.emoji}</div>
                <div class="timer">${formatTime(field.timer)}</div>
            `;
            fieldEl.onclick = () => harvestField(field.id);
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
        field.timer = plant.growthTime;
        
        // Запуск таймера
        field.intervalId = setInterval(() => {
            field.timer--;
            
            if (field.timer <= 0) {
                clearInterval(field.intervalId);
                field.intervalId = null;
            }
            
            renderFields();
        }, 1000);
        
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
    
    if (field.timer <= 0) {
        gameState.storage[field.plant]++;
        field.plant = null;
        field.timer = null;
        
        if (field.intervalId) {
            clearInterval(field.intervalId);
            field.intervalId = null;
        }
        
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
            const plant = PLANTS[key];
            const item = document.createElement('div');
            item.className = 'storage-item';
            item.innerHTML = `${plant.emoji} ${plant.name}: ${count}`;
            container.appendChild(item);
        }
    });
    
    if (container.innerHTML === '') {
        container.innerHTML = '<p>Склад пуст</p>';
    }
    
    document.getElementById('storage-modal').classList.remove('hidden');
}

// Продажа урожая
function sellAll() {
    Object.keys(gameState.storage).forEach(key => {
        if (gameState.storage[key] > 0) {
            const plant = PLANTS[key];
            const count = gameState.storage[key];
            const earnings = count * randomInRange(plant.reward.min, plant.reward.max);
            
            gameState.coins += earnings;
            gameState.storage[key] = 0;
        }
    });
    
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
function setupEventListeners() {
    // Кнопки
    document.getElementById('plant-btn').addEventListener('click', () => {
        const freeField = gameState.fields.find(f => !f.locked && !f.plant);
        if (freeField) openPlantModal(freeField.id);
        else alert('Нет свободных полей!');
    });
    
    document.getElementById('storage-btn').addEventListener('click', openStorage);
    document.getElementById('sell-btn').addEventListener('click', sellAll);
    document.getElementById('help-btn').addEventListener('click', sendHelp);
    
    // Закрытие модалок
    document.getElementById('close-plant-modal').addEventListener('click', () => closeModal('plant-modal'));
    document.getElementById('close-storage-modal').addEventListener('click', () => closeModal('storage-modal'));
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
        
        // Восстановление таймеров
        parsed.fields.forEach(field => {
            if (field.plant && field.timer > 0) {
                const plant = PLANTS[field.plant];
                const timePassed = plant.growthTime - field.timer;
                
                // Перезапуск таймера
                field.intervalId = setInterval(() => {
                    field.timer--;
                    
                    if (field.timer <= 0) {
                        clearInterval(field.intervalId);
                        field.intervalId = null;
                    }
                    
                    renderFields();
                }, 1000);
            }
        });
        
        gameState = parsed;
        renderFields();
        updateUI();
    }
}

// Запуск игры при загрузке
document.addEventListener('DOMContentLoaded', initGame); 
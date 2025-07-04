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

// --- ВОССТАНОВЛЕННАЯ МЕХАНИКА ---
const FIELD_COUNT = 6;
let fields = [];
let coins = 50;

// --- ХРАНИЛИЩЕ СОБРАННОГО УРОЖАЯ ---
let storage = {};

function saveGame() {
    localStorage.setItem('tgfarm_fields', JSON.stringify(fields));
    localStorage.setItem('tgfarm_coins', coins);
    localStorage.setItem('tgfarm_storage', JSON.stringify(storage));
}
function loadGame() {
    fields = JSON.parse(localStorage.getItem('tgfarm_fields')) || Array(FIELD_COUNT).fill(null);
    coins = Number(localStorage.getItem('tgfarm_coins')) || 50;
    storage = JSON.parse(localStorage.getItem('tgfarm_storage')) || {};
}

function renderFields() {
    const container = document.getElementById('fields-container');
    container.innerHTML = '';
    fields.forEach((plant, i) => {
        const div = document.createElement('div');
        div.className = 'field';
        if (plant) {
            const plantObj = PLANTS[plant.type];
            const timeLeft = Math.max(0, plant.plantedAt + plantObj.growthTime - Math.floor(Date.now()/1000));
            div.innerHTML = `<div class='plant'>${plantObj.emoji}</div>`;
            if (timeLeft > 0) {
                div.innerHTML += `<div class='timer'>${formatTime(timeLeft)}</div>`;
            } else {
                div.innerHTML += `<div class='timer' style='background:#ff9800;'>Готово!</div>`;
                div.classList.add('ready');
            }
        } else {
            div.innerHTML = '<span style="color:#bbb;">Пусто</span>';
        }
        div.onclick = () => onFieldClick(i);
        container.appendChild(div);
    });
}

function onFieldClick(i) {
    if (!fields[i]) {
        showPlantModal(i);
    } else {
        const plant = fields[i];
        const plantObj = PLANTS[plant.type];
        const timeLeft = plant.plantedAt + plantObj.growthTime - Math.floor(Date.now()/1000);
        if (timeLeft <= 0) {
            // Сбор урожая
            const reward = rand(plantObj.reward.min, plantObj.reward.max);
            if (!storage[plant.type]) storage[plant.type] = 0;
            storage[plant.type] += reward;
            fields[i] = null;
            // Сброс флага уведомления на сервере
            resetHarvestNotified();
            showNotification(`Урожай собран! +${reward} ${plantObj.emoji}`);
            saveGame();
            renderFields();
        }
    }
}

function resetHarvestNotified() {
    // Отправляем на сервер сброс флага notified_harvest_ready
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
        fetch('https://tgfarm-sqdm.onrender.com/reset_harvest_notified', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: Telegram.WebApp.initDataUnsafe.user.id })
        });
    }
}

function showPlantModal(fieldIndex) {
    const modal = document.getElementById('plant-modal');
    modal.classList.remove('hidden');
    const container = document.getElementById('plants-container');
    container.innerHTML = '';
    Object.entries(PLANTS).forEach(([type, plant]) => {
        const btn = document.createElement('button');
        btn.innerHTML = `${plant.emoji} ${plant.name} (${plant.cost}₽)`;
        btn.onclick = () => {
            if (coins >= plant.cost) {
                coins -= plant.cost;
                fields[fieldIndex] = { type, plantedAt: Math.floor(Date.now()/1000) };
                updateCoins();
                saveGame();
                renderFields();
                closePlantModal();
            } else {
                showNotification('Недостаточно монет!');
            }
        };
        container.appendChild(btn);
    });
}
function closePlantModal() {
    document.getElementById('plant-modal').classList.add('hidden');
}

document.getElementById('close-plant-modal').onclick = closePlantModal;

function updateCoins() {
    document.getElementById('coins').textContent = coins;
}

function formatTime(sec) {
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${m}:${s.toString().padStart(2,'0')}`;
}

function rand(a,b) {
    return Math.floor(Math.random()*(b-a+1))+a;
}

// --- УВЕДОМЛЕНИЯ ---
function showNotification(text) {
    let n = document.getElementById('notification');
    if (!n) {
        n = document.createElement('div');
        n.id = 'notification';
        n.style.position = 'fixed';
        n.style.bottom = '30px';
        n.style.left = '50%';
        n.style.transform = 'translateX(-50%)';
        n.style.background = '#4caf50';
        n.style.color = 'white';
        n.style.padding = '12px 24px';
        n.style.borderRadius = '12px';
        n.style.fontWeight = 'bold';
        n.style.zIndex = 9999;
        n.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        document.body.appendChild(n);
    }
    n.textContent = text;
    n.style.display = 'block';
    setTimeout(()=>{ n.style.display = 'none'; }, 2500);
}

// --- Telegram уведомление о готовности урожая ---
function notifyTelegramHarvestReady(telegramUserId) {
    fetch('https://tgfarm-sqdm.onrender.com/notify_harvest_ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: telegramUserId })
    });
}

// --- Проверка готовности урожая ---
function checkHarvestReady() {
    let ready = false;
    fields.forEach(plant => {
        if (plant) {
            const plantObj = PLANTS[plant.type];
            const timeLeft = plant.plantedAt + plantObj.growthTime - Math.floor(Date.now()/1000);
            if (timeLeft <= 0) ready = true;
        }
    });
    if (ready) {
        showNotification('Урожай готов к сбору!');
        if (!window._harvestNotified) {
            window._harvestNotified = true;
            // Получаем user_id из Telegram WebApp, если есть
            if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
                notifyTelegramHarvestReady(Telegram.WebApp.initDataUnsafe.user.id);
            }
        }
    } else {
        window._harvestNotified = false;
    }
}

// --- Инициализация ---
function gameLoop() {
    renderFields();
    checkHarvestReady();
    setTimeout(gameLoop, 1000);
}

window.addEventListener('DOMContentLoaded', () => {
    loadGame();
    updateCoins();
    renderFields();
    gameLoop();
    updateBackground();
});
window.addEventListener('resize', updateBackground);

// Адаптивная смена фонового изображения
function updateBackground() {
    const body = document.body;
    if (window.innerWidth < 600) {
        body.style.backgroundSize = 'contain';
    } else {
        body.style.backgroundSize = 'cover';
    }
}

// --- КНОПКИ И МОДАЛКИ ---
// Склад
const storageBtn = document.getElementById('storage-btn');
const storageModal = document.getElementById('storage-modal');
const closeStorageModal = document.getElementById('close-storage-modal');
storageBtn.onclick = () => {
    renderStorage();
    storageModal.classList.remove('hidden');
};
closeStorageModal.onclick = () => storageModal.classList.add('hidden');
function renderStorage() {
    const cont = document.getElementById('storage-container');
    let has = false;
    cont.innerHTML = Object.keys(PLANTS).map(type => {
        const count = storage[type] || 0;
        if (count > 0) {
            has = true;
            return `${PLANTS[type].emoji} ${PLANTS[type].name}: ${count}`;
        }
        return '';
    }).filter(Boolean).join('<br>') || 'Пусто';
    // Кнопка "Продать всё"
    document.getElementById('sell-btn').onclick = () => {
        let total = 0;
        Object.keys(PLANTS).forEach(type => {
            const count = storage[type] || 0;
            if (count > 0) {
                total += count * PLANTS[type].cost;
                storage[type] = 0;
            }
        });
        if (total > 0) {
            coins += total;
            showNotification(`Всё продано! +${total}₽`);
            saveGame();
            updateCoins();
            renderStorage();
        } else {
            showNotification('Нет урожая для продажи!');
        }
    };
}
// Магазин
const shopBtn = document.getElementById('shop-btn');
const shopModal = document.getElementById('shop-modal');
const closeShopModal = document.getElementById('close-shop-modal');
shopBtn.onclick = () => {
    renderShop();
    shopModal.classList.remove('hidden');
};
closeShopModal.onclick = () => shopModal.classList.add('hidden');
function renderShop() {
    const cont = document.getElementById('shop-items-container');
    cont.innerHTML = Object.entries(PLANTS).map(([type, plant]) => `<div class='shop-item'><div class='shop-item-emoji'>${plant.emoji}</div><div class='shop-item-name'>${plant.name}</div><div class='shop-item-info'>Цена: ${plant.cost}₽</div></div>`).join('');
}
// Животные (заглушка)
const animalBtn = document.getElementById('animal-btn');
const animalModal = document.getElementById('animal-modal');
const closeAnimalModal = document.getElementById('close-animal-modal');
animalBtn.onclick = () => {
    renderAnimals();
    animalModal.classList.remove('hidden');
};
closeAnimalModal.onclick = () => animalModal.classList.add('hidden');
function renderAnimals() {
    const cont = document.getElementById('animals-container');
    cont.innerHTML = '<div>Скоро появятся животные!</div>';
}
// Помощь
const helpBtn = document.getElementById('help-btn');
helpBtn.onclick = () => {
    showNotification('Посадите растение, дождитесь созревания и соберите урожай!');
}; 
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

// Адаптивная смена фонового изображения
function updateBackground() {
    const body = document.body;
    if (window.innerWidth < 600) {
        body.style.backgroundSize = 'contain';
    } else {
        body.style.backgroundSize = 'cover';
    }
}
window.addEventListener('resize', updateBackground);
window.addEventListener('DOMContentLoaded', updateBackground); 
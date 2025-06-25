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
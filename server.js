const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const { notifyAllUsers } = require('./bot');
const { Telegraf } = require('telegraf');
require('dotenv').config();
const bot = new Telegraf(process.env.TOKEN);

// Health check endpoint (обязательно для Render)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Хранилище состояния ферм (в продакшене используйте Redis или БД)
const farms = new Map();

// Функция для старта фоновых задач
function startBackgroundTasks() {
  setInterval(() => {
    const now = Date.now();
    farms.forEach((farm, farmId) => {
      if (farm.harvestReady && !farm.notified) {
        sendTelegramNotification(farmId, farm.chatId);
        farm.notified = true;
      }
    });
  }, 30000); // Проверка каждые 30 секунд
}

// Отправка уведомления в Telegram
async function sendTelegramNotification(farmId, chatId) {
  try {
    await bot.telegram.sendMessage(
      chatId,
      `🌱 Урожай готов к сбору на ферме ${farmId}!`,
      { reply_markup: { inline_keyboard: [[
        { text: "Собрать урожай", callback_data: `harvest_${farmId}` }
      ]] } }
    );
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
  }
}

app.post('/reset_harvest_notified', express.json(), (req, res) => {
  const { farmId } = req.body;
  
  if (!farms.has(farmId)) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  farms.get(farmId).notified = false;
  res.status(200).json({ status: 'success' });
});

app.post('/notify_harvest_ready', express.json(), async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  try {
    await notifyAllUsers('Урожай созрел у кого-то из игроков! Заберите урожай в игре 🌾');
    res.status(200).json({ status: 'notified_all' });
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Ошибка отправки уведомления' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startBackgroundTasks(); // Запускаем фоновые задачи
  // Пример: уведомление всех пользователей через 10 секунд после запуска сервера
  setTimeout(() => {
    notifyAllUsers('Ваш урожай созрел! Заберите его в игре 🌾');
  }, 10000);
}); 
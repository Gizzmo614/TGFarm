const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const { Telegraf } = require('telegraf');
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const TOKEN = process.env.TOKEN;
const SERVER_URL = process.env.SERVER_URL;
const USERS_FILE = './userIds.json';

if (!TOKEN) {
  throw new Error('Не указан токен Telegram-бота (TOKEN)');
}

const bot = new Telegraf(TOKEN);

function saveUserChatId(chatId) {
  let ids = [];
  if (fs.existsSync(USERS_FILE)) {
    ids = JSON.parse(fs.readFileSync(USERS_FILE));
  }
  if (!ids.includes(chatId)) {
    ids.push(chatId);
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(ids));
      console.log('Добавлен chat_id:', chatId, 'Текущий список:', ids);
    } catch (e) {
      console.error('Ошибка при записи userIds.json:', e);
    }
  } else {
    console.log('chat_id уже есть:', chatId);
  }
}

function getAllUserChatIds() {
  if (fs.existsSync(USERS_FILE)) {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  }
  return [];
}

async function notifyAllUsers(message) {
  const userChatIds = getAllUserChatIds();
  for (const chatId of userChatIds) {
    try {
      await bot.telegram.sendMessage(chatId, message);
    } catch (e) {
      console.error(`Ошибка при отправке пользователю ${chatId}:`, e);
    }
  }
}

bot.start((ctx) => {
  saveUserChatId(ctx.chat.id);
  ctx.reply('Добро пожаловать в TG Farm! 🌾\nИспользуйте WebApp или управляйте фермой через Telegram.', {
    reply_markup: {
      keyboard: [
        [
          {
            text: 'Открыть игру',
            web_app: { url: 'https://tgfarm-sqdm.onrender.com' }
          }
        ]
      ],
      resize_keyboard: true
    }
  });
});

bot.action(/harvest_(.+)/, async (ctx) => {
  const farmId = ctx.match[1];
  try {
    await fetch(`${SERVER_URL}/reset_harvest_notified`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmId })
    });
    await ctx.answerCbQuery('Урожай собран!');
    await ctx.editMessageText(`${ctx.update.callback_query.message.text}\n\n✅ Урожай собран!`);
  } catch (error) {
    await ctx.answerCbQuery('Ошибка при сборе урожая!');
  }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

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

app.get('/debug-chat-ids', (req, res) => {
  if (fs.existsSync('./userIds.json')) {
    const ids = JSON.parse(fs.readFileSync('./userIds.json'));
    res.json(ids);
  } else {
    res.json([]);
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
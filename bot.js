const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
require('dotenv').config();
const fs = require('fs');

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
    fs.writeFileSync(USERS_FILE, JSON.stringify(ids));
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

// /start команда
bot.start((ctx) => {
  saveUserChatId(ctx.chat.id);
  ctx.reply('Добро пожаловать в TG Farm! 🌾\nИспользуйте WebApp или управляйте фермой через Telegram.');
});

// Обработка сбора урожая по кнопке
bot.action(/harvest_(.+)/, async (ctx) => {
  const farmId = ctx.match[1];
  try {
    // Сброс флага notified на сервере
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

// Запуск бота
bot.launch();

// Грейсфул-шатдаун для Render
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { notifyAllUsers }; 
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const SERVER_URL = process.env.SERVER_URL;

if (!TOKEN) {
  throw new Error('Не указан токен Telegram-бота (TOKEN)');
}

const bot = new Telegraf(TOKEN);

// /start команда
bot.start((ctx) => {
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
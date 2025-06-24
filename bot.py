import telebot
from telebot.types import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup
import json

TOKEN = "8114672995:AAGaqCtpIXLTn4VxELJ3CiGXcO825fJuQSE"
bot = telebot.TeleBot(TOKEN)

WEBAPP_URL = "https://gizzmo614.github.io/TGFarm/"

markup = ReplyKeyboardMarkup(resize_keyboard=True)
markup.add(KeyboardButton("Открыть игру", web_app=WebAppInfo(WEBAPP_URL)))

@bot.message_handler(commands=['start'])
def start(message):
    bot.send_message(
        message.chat.id,
        "Привет! Добро пожаловать в TG Farm!\nНажми кнопку ниже, чтобы открыть игру 👇",
        reply_markup=markup
    )

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    data = message.web_app_data.data  # строка JSON
    with open("open_game_log.txt", "a", encoding="utf-8") as f:
        f.write(f"{message.from_user.id}: {data}\n")
    print(f"Пользователь {message.from_user.id} открыл игру. Данные: {data}")

# Бот работает всегда в автономном режиме (polling)
if __name__ == "__main__":
    print("TG Farm Bot запущен и работает в автономном режиме.")
    bot.polling(none_stop=True) 
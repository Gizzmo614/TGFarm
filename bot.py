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
        "Привет! Нажми кнопку ниже, чтобы открыть игру TG Farm 👇",
        reply_markup=markup
    )

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    data = message.web_app_data.data  # строка JSON
    with open("open_game_log.txt", "a", encoding="utf-8") as f:
        f.write(f"{message.from_user.id}: {data}\n")
    print(f"Пользователь {message.from_user.id} открыл игру. Данные: {data}")

bot.polling() 
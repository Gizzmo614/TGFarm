from flask import Flask, request, jsonify
import json
import os
import telebot
import threading
import time

app = Flask(__name__)
SAVE_FILE = "user_saves.json"

BOT_TOKEN = "8114672995:AAGaqCtpIXLTn4VxELJ3CiGXcO825fJuQSE"
bot = telebot.TeleBot(BOT_TOKEN)

def load_all_saves():
    if not os.path.exists(SAVE_FILE):
        return {}
    with open(SAVE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_all_saves(data):
    with open(SAVE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route("/save", methods=["POST"])
def save():
    user_id = request.json.get("user_id")
    game_state = request.json.get("game_state")
    if not user_id or not game_state:
        return jsonify({"ok": False, "error": "Missing data"}), 400
    saves = load_all_saves()
    saves[str(user_id)] = game_state
    save_all_saves(saves)
    return jsonify({"ok": True})

@app.route("/load", methods=["GET"])
def load():
    user_id = request.args.get("user_id")
    saves = load_all_saves()
    return jsonify({"ok": True, "game_state": saves.get(str(user_id))})

@app.route("/notify_harvest_ready", methods=["POST"])
def notify_harvest_ready():
    user_id = request.json.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "Missing user_id"}), 400
    try:
        bot.send_message(user_id, "🌾 Урожай на вашей ферме готов к сбору!")
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/reset_harvest_notified", methods=["POST"])
def reset_harvest_notified():
    user_id = request.json.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "Missing user_id"}), 400
    saves = load_all_saves()
    game_state = saves.get(str(user_id))
    if game_state:
        game_state['notified_harvest_ready'] = False
        save_all_saves(saves)
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "User not found"}), 404

def check_and_notify_all_users():
    saves = load_all_saves()
    for user_id, game_state in saves.items():
        fields = game_state.get('fields')
        if not fields:
            continue
        for plant in fields:
            if plant:
                plant_type = plant.get('type')
                planted_at = plant.get('plantedAt')
                if plant_type and planted_at is not None:
                    growth_time = 0
                    if plant_type == 'potato':
                        growth_time = 60
                    elif plant_type == 'carrot':
                        growth_time = 180
                    elif plant_type == 'sunflower':
                        growth_time = 600
                    if time.time() >= planted_at + growth_time:
                        if not game_state.get('notified_harvest_ready'):
                            try:
                                bot.send_message(user_id, "🌾 Урожай на вашей ферме готов к сбору!")
                                game_state['notified_harvest_ready'] = True
                                save_all_saves(saves)
                            except Exception as e:
                                print(f"Ошибка отправки уведомления {user_id}: {e}")
                        break
    threading.Timer(60, check_and_notify_all_users).start()

check_and_notify_all_users()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080) 
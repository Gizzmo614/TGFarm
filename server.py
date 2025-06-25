from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)
SAVE_FILE = "user_saves.json"

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080) 
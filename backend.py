from flask import Flask, request, jsonify
from dotenv import load_dotenv
import requests
import os
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = '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'
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

if not OPENROUTER_API_KEY:
    raise RuntimeError("Missing CHATBOTAPI in .env file")

HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost",
    "X-Title": "Ibicu AI"
}

# 🔵 System prompt – THIS IS VERY IMPORTANT
SYSTEM_PROMPT = """
You are FUNDA AI, a data analysis assistant.

RULES:
1. Wrap inline math using \\( ... \\)
2. Wrap display math using \\[ ... \\]
3. If numerical data exists, include a block like this:

DATA:
x = [1,2,3,4]
y = [10,15,20,25]
x_label = Time
y_label = Value
DECISION:

4. Keep explanations simple and clear.
"""

@app.route("/chat", methods=["POST"])
def chat():
    body = request.get_json()
    user_message = body.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Message required"}), 400

    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.3
    }

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers=HEADERS,
            json=payload,
            timeout=30
        )

        if response.status_code != 200:
            return jsonify({
                "error": "OpenRouter API error",
                "status": response.status_code,
                "details": response.text
            }), 500

        data = response.json()

        if "choices" not in data or len(data["choices"]) == 0:
            return jsonify({
                "error": "No choices returned",
                "raw": data
            }), 500

        reply = data["choices"][0]["message"]["content"]

        return jsonify({"reply": reply})

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)

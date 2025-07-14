# In ai_service/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

app = Flask(__name__)

# --- THIS IS THE FIX for CORS ---
# We now explicitly list the localhost for development AND your Netlify URL for production.
# The wildcard '*' is a fallback, but being specific is better.
CORS(app, resources={r"/predict": {"origins": ["http://localhost:5173", "https://vibank-voice-agent.netlify.app"]}})
# -----------------------------

# ... (The rest of your app.py file is correct and can remain the same)
# ... (load models, get_suggested_response, etc.)

try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    MODEL_PATH = os.path.join(base_dir, "data", "intent_model")
    LABEL_MAPPING_PATH = os.path.join(base_dir, "data", "label_mapping.csv")
    RESPONSES_PATH = os.path.join(base_dir, "data", "responses.csv")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH, local_files_only=True)
    model.eval()
    label_mapping_df = pd.read_csv(LABEL_MAPPING_PATH)
    response_df = pd.read_csv(RESPONSES_PATH)
    response_dict = dict(zip(response_df['label_name'], response_df['response']))
    print("✅ AI Models and data loaded successfully.")
except Exception as e:
    print(f"❌ FATAL ERROR loading AI models or data: {e}")

def get_suggested_response(text):
    try:
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
        with torch.no_grad():
            logits = model(**inputs).logits
        predicted_class_id = torch.argmax(logits, dim=1).item()
        matching_row = label_mapping_df[label_mapping_df["label"] == predicted_class_id]
        if not matching_row.empty:
            label_name = matching_row["label_name"].values[0]
            suggested_text = response_dict.get(label_name, "Response not found.")
        else:
            suggested_text = "Could not map prediction to a known intent."
        return suggested_text
    except Exception as e:
        print(f"❌ An exception occurred during prediction: {e}")
        return "Could not generate an AI suggestion due to a prediction error."

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400
    text_input = data["text"]
    suggested_response = get_suggested_response(text_input)
    return jsonify({"responseText": suggested_response})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# Load ensemble models + vectorizer (run train_ensemble.py first)
lr = joblib.load("lr_model.pkl")
rf = joblib.load("rf_model.pkl")
vectorizer = joblib.load("sqli_vectorizer.pkl")

def ensemble_predict(text):
    """
    OR-vote ensemble: flag as malicious if EITHER model says so.
    Minimises false negatives (missed real attacks).
    """
    vec = vectorizer.transform([text])
    lr_pred = lr.predict(vec)[0]
    rf_pred = rf.predict(vec)[0]
    return 1 if (lr_pred == 1 or rf_pred == 1) else 0

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No input provided"}), 400

    prediction = ensemble_predict(text)
    result = "malicious" if prediction == 1 else "safe"

    return jsonify({
        "input": text,
        "result": result,
        "model": "ensemble_lr_rf"
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "ensemble_lr_rf"})

if __name__ == "__main__":
    app.run(port=5000, debug=True)

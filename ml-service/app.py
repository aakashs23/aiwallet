from fastapi import FastAPI
import joblib

app = FastAPI()

model = joblib.load("model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

@app.post("/predict")
def predict(data: dict):
    merchant = data["merchant"].lower()

    X = vectorizer.transform([merchant])

    prediction = model.predict(X)[0]
    probs = model.predict_proba(X)[0]

    confidence = max(probs)

    # fallback logic
    if confidence < 0.5:
        return {
            "category": "Other",
            "confidence": float(confidence)
        }

    return {
        "category": prediction,
        "confidence": float(confidence)
    }
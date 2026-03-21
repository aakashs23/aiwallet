from fastapi import FastAPI
import joblib
import os

app = FastAPI()

model = None
vectorizer = None

# 📌 Load model function
def load_model():
    global model, vectorizer

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    model_path = os.path.join(BASE_DIR, "model.pkl")
    vectorizer_path = os.path.join(BASE_DIR, "vectorizer.pkl")

    model = joblib.load(model_path)
    vectorizer = joblib.load(vectorizer_path)

    print("✅ Model loaded/reloaded successfully")


# 📌 Load model at startup
load_model()


# 🔮 Prediction endpoint
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


# 🔄 Reload endpoint (NEW)
@app.post("/reload")
def reload_model():
    load_model()
    return {"message": "Model reloaded successfully"}
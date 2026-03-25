from fastapi import FastAPI
import joblib
import os
import numpy as np

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

    probs = model.predict_proba(X)[0]
    classes = model.classes_

    # top 2 predictions
    top_indices = np.argsort(probs)[-2:][::-1]

    top_predictions = [
        {
            "category": classes[i],
            "confidence": float(probs[i])
        }
        for i in top_indices
    ]

    best = top_predictions[0]

    return {
        "category": best["category"],
        "confidence": best["confidence"],
        "top_predictions": top_predictions
    }


# 🔄 Reload endpoint (NEW)
@app.post("/reload")
def reload_model():
    load_model()
    return {"message": "Model reloaded successfully"}
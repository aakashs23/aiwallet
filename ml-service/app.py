from fastapi import FastAPI
import joblib

app = FastAPI()

model = joblib.load("model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

@app.post("/predict")
def predict(data: dict):
    merchant = data["merchant"]

    X = vectorizer.transform([merchant.lower()])
    prediction = model.predict(X)[0]

    return {"category": prediction}
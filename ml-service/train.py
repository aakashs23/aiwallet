import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib

# load data
data = pd.read_csv("data.csv")

# features & labels
X = data["merchant"]
y = data["category"]

# convert text → numbers
vectorizer = CountVectorizer()
X_vec = vectorizer.fit_transform(X)

# train model
model = MultinomialNB()
model.fit(X_vec, y)

# save model
joblib.dump(model, "model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model trained ✅")
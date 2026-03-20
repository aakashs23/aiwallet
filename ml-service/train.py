import pandas as pd
import psycopg2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib

# load data
data = pd.read_csv("data.csv")

# connect to postgres
conn = psycopg2.connect(
    dbname="ai_wallet",
    user="postgres",
    password="aiwallet",
    host="localhost",
    port="5432"
)

query = "SELECT merchant, category FROM training_data;"
db_data = pd.read_sql(query, conn)

# combine datasets
full_data = pd.concat([data, db_data], ignore_index=True)

# features & labels
X = data["merchant"].str.lower()  # convert to lowercase
y = data["category"]

# convert text → numbers
vectorizer = TfidfVectorizer()
X_vec = vectorizer.fit_transform(X)

# train model
model = MultinomialNB()
model.fit(X_vec, y)

# save model
joblib.dump(model, "model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model trained with user data")
import os
import pandas as pd
from sqlalchemy import create_engine
from sklearn.pipeline import FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib
from sklearn.pipeline import Pipeline

word_vec = TfidfVectorizer(ngram_range=(1,2))
char_vec = TfidfVectorizer(analyzer='char_wb', ngram_range=(3,5))

# load data
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(BASE_DIR, "data.csv")

data = pd.read_csv(data_path)

# connect to postgres using SQLAlchemy
engine = create_engine(
    "postgresql://postgres:aiwallet@localhost:5432/ai_wallet"
)

query = "SELECT merchant, category FROM training_data;"
db_data = pd.read_sql(query, engine)

# combine datasets
full_data = pd.concat([data, db_data], ignore_index=True)

# features & labels
X = full_data["merchant"].str.lower()  # convert to lowercase
y = full_data["category"]

# convert text → numbers
vectorizer = TfidfVectorizer(
    ngram_range=(1,3),   # was (1,2)
    analyzer="char_wb",  # 🔥 character-level learning
    min_df=1
)
X_vec = vectorizer.fit_transform(X)

X = X.str.replace(r"[^a-zA-Z ]", "", regex=True)

# train model
model = LogisticRegression(
    max_iter=2000,
    class_weight="balanced"   # 🔥 handles uneven data
)
model.fit(X_vec, y)

# save model
joblib.dump(model, "model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model trained with user data")
print("Training samples:", len(X))
print("Categories:", set(y))
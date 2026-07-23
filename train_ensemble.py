import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt
import joblib
import numpy as np

# ── 1. Load & clean Kaggle dataset ───────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv("SQLiV3.csv", usecols=["Sentence", "Label"])

# Keep only rows where Label is strictly '0' or '1' (stored as strings)
df = df[df["Label"].isin(['0', '1', 0, 1])].copy()
df["Label"] = df["Label"].astype(int)
df = df.dropna(subset=["Sentence"])
df["Sentence"] = df["Sentence"].astype(str).str.strip()
df = df[df["Sentence"] != ""]

print(f"Clean dataset: {len(df)} rows")
print(df["Label"].value_counts().to_string())

X = df["Sentence"]
y = df["Label"]

# ── 2. Train/test split ───────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── 3. Vectorizer ─────────────────────────────────────────────────────────────
vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=10000)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec  = vectorizer.transform(X_test)

# ── 4. Train models ───────────────────────────────────────────────────────────
print("\nTraining models...")
lr = LogisticRegression(max_iter=1000, random_state=42)
rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)

lr.fit(X_train_vec, y_train)
rf.fit(X_train_vec, y_train)

# ── 5. Ensemble OR-vote on test set ──────────────────────────────────────────
lr_preds = lr.predict(X_test_vec)
rf_preds = rf.predict(X_test_vec)
ensemble_preds = [1 if (l == 1 or r == 1) else 0 for l, r in zip(lr_preds, rf_preds)]

print("\n" + "="*55)
print("ENSEMBLE RESULTS (LR + Random Forest, OR vote)")
print("="*55)
print(classification_report(y_test, ensemble_preds, target_names=["Benign", "SQLi"]))

# ── 6. 5-fold cross-validation (honest score) ────────────────────────────────
print("Running 5-fold cross-validation...")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

lr_pipeline = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1,2), max_features=10000)),
                         ("lr", LogisticRegression(max_iter=1000, random_state=42))])
rf_pipeline = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1,2), max_features=10000)),
                         ("rf", RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1))])

lr_cv = cross_val_score(lr_pipeline, X, y, cv=cv, scoring="f1")
rf_cv = cross_val_score(rf_pipeline, X, y, cv=cv, scoring="f1")

print(f"\nLR  5-fold F1: {lr_cv.mean():.4f} ± {lr_cv.std():.4f}")
print(f"RF  5-fold F1: {rf_cv.mean():.4f} ± {rf_cv.std():.4f}")
print(f"\n>>> Use these numbers on your resume, not the test-set numbers.")

# ── 7. Save models ────────────────────────────────────────────────────────────
joblib.dump(lr, "lr_model.pkl")
joblib.dump(rf, "rf_model.pkl")
joblib.dump(vectorizer, "sqli_vectorizer.pkl")
print("\nModels saved: lr_model.pkl, rf_model.pkl, sqli_vectorizer.pkl")

# ── 8. Confusion matrix ───────────────────────────────────────────────────────
cm = confusion_matrix(y_test, ensemble_preds)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Benign", "SQLi"])
disp.plot(cmap="Blues")
plt.title("Confusion Matrix — Ensemble (LR + RF, OR vote)")
plt.grid(False)
plt.tight_layout()
plt.savefig("confusion_matrix_ensemble.png", dpi=300)
plt.show()
print("Confusion matrix saved.")
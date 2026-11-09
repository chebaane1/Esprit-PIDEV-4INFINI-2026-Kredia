"""
Script d'entraînement du modèle de prédiction d'éligibilité à la demande de crédit.
Utilise UNIQUEMENT les colonnes disponibles lors de la soumission du formulaire:
  - amount, income, dependents, term_months, repayment_type, debt_ratio

status = 0 → peut rembourser (sain)
status = 1 → risque de défaut (ne peut pas rembourser)

Exécuter une seule fois : python train_application_model.py
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os

np.random.seed(42)
N = 8000  # Plus de données pour compenser les features manquantes

print("=== Génération du dataset d'entraînement ===")
print("Features: amount, income, dependents, term_months, repayment_type, debt_ratio")
print("Target:   status (0=peut rembourser, 1=risque de défaut)\n")

repayment_types = ["MENSUALITE_CONSTANTE", "AMORTISSEMENT_CONSTANT", "IN_FINE"]
rows = []

for _ in range(N):
    repayment = np.random.choice(repayment_types, p=[0.60, 0.25, 0.15])
    income = np.random.uniform(800, 15000)
    dependents = np.random.randint(0, 7)
    term_months = np.random.choice([6, 12, 24, 36, 48, 60, 84, 120])

    # Montant demandé — parfois irréaliste (pour générer des cas risqués)
    max_reasonable = income * term_months * 0.35
    if np.random.random() < 0.25:
        # Cas risqué: montant excessif
        amount = np.random.uniform(max_reasonable * 0.8, max_reasonable * 3)
    else:
        amount = np.random.uniform(500, max(501, max_reasonable))
    amount = min(amount, 200000)

    # Ratio dette / capacité de remboursement (clé du modèle)
    debt_ratio = amount / (income * term_months)
    debt_ratio = min(debt_ratio, 5.0)  # cap à 5x pour éviter les outliers extrêmes

    # Score de risque basé UNIQUEMENT sur les features disponibles à la demande
    # Logique métier réaliste pour un établissement bancaire
    risk_score = (
        0.40 * min(debt_ratio / 0.4, 1.0)          # ratio dette (poids le plus fort)
        + 0.20 * (dependents / 6)                   # personnes à charge
        + 0.15 * (1 if repayment == "IN_FINE" else 0)  # IN_FINE = plus risqué
        + 0.15 * (1 if income < 1500 else 0)        # revenus très faibles
        + 0.10 * (1 if term_months > 84 else 0)     # durée très longue = plus risqué
    )

    # Ajout de bruit réaliste
    noise = np.random.normal(0, 0.08)
    final_prob = np.clip(risk_score + noise, 0, 1)

    # Seuil à 0.35 → environ 40% défaut dans le dataset (ratio réaliste)
    status = 1 if final_prob > 0.35 else 0

    rows.append({
        "amount": round(amount, 2),
        "income": round(income, 2),
        "dependents": dependents,
        "term_months": term_months,
        "repayment_type": repayment,
        "debt_ratio": round(debt_ratio, 6),
        "status": status
    })

df = pd.DataFrame(rows)

print(f"Dataset généré: {len(df)} lignes")
print(f"  status=0 (peut rembourser): {(df['status']==0).sum()} ({(df['status']==0).mean()*100:.1f}%)")
print(f"  status=1 (risque de défaut): {(df['status']==1).sum()} ({(df['status']==1).mean()*100:.1f}%)")

# Encodage du type de remboursement
REPAYMENT_MAP = {
    "AMORTISSEMENT_CONSTANT": 0,
    "MENSUALITE_CONSTANTE": 1,
    "IN_FINE": 2,
}
df["repayment_encoded"] = df["repayment_type"].map(REPAYMENT_MAP)

FEATURES = ["amount", "income", "dependents", "term_months", "repayment_encoded", "debt_ratio"]
TARGET = "status"

X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# GradientBoosting → meilleure précision sur peu de features
model = GradientBoostingClassifier(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    min_samples_split=10,
    random_state=42
)
model.fit(X_train, y_train)

print("\n=== Rapport de classification (test set) ===")
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred, target_names=["Peut rembourser (0)", "Risque défaut (1)"]))

print("=== Matrice de confusion ===")
print(confusion_matrix(y_test, y_pred))

# Cross-validation
cv_scores = cross_val_score(model, X, y, cv=5, scoring="f1")
print(f"\nCross-validation F1 (5-fold): {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

# Feature importance
print("\n=== Importance des features ===")
for feat, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    print(f"  {feat:25s}: {imp:.4f}")

os.makedirs("model", exist_ok=True)
joblib.dump(model, "model/application_model.pkl")
print("\nModèle sauvegardé dans model/application_model.pkl")

# Sauvegarde du dataset pour référence
df.to_csv("dataset_application.csv", index=False)
print("Dataset sauvegardé dans dataset_application.csv")

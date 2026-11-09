"""
KREDIA - Application Prediction Microservice
Prédit si un demandeur peut rembourser un crédit (status=0) ou non (status=1)
UNIQUEMENT à partir des données de la demande de crédit (sans historique de paiement)

FastAPI + scikit-learn GradientBoosting
Port: 8002 (distinct du default-prediction-service sur 8001)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd
import os

app = FastAPI(
    title="KREDIA Application Prediction Service",
    description="Prédit l'éligibilité au crédit à la soumission de la demande (status=0/1)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "model/application_model.pkl"
model = None

REPAYMENT_MAP = {
    "AMORTISSEMENT_CONSTANT": 0,
    "MENSUALITE_CONSTANTE": 1,
    "IN_FINE": 2,
}


@app.on_event("startup")
def load_model():
    global model
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"Model not found: {MODEL_PATH}. "
            "Run first: python train_application_model.py"
        )
    model = joblib.load(MODEL_PATH)
    print(f"Application model loaded from {MODEL_PATH}")


# ─── Schemas ────────────────────────────────────────────────────────────────

class ApplicationPredictionRequest(BaseModel):
    """
    Champs disponibles lors de la soumission de la demande de crédit.
    Correspond exactement aux champs du formulaire frontend Angular.
    """
    amount: float = Field(..., gt=0, description="Montant du crédit demandé (DT)")
    income: float = Field(..., gt=0, description="Revenu mensuel du demandeur (DT)")
    dependents: int = Field(..., ge=0, le=20, description="Nombre de personnes à charge")
    term_months: int = Field(..., gt=0, description="Durée du crédit en mois")
    repayment_type: str = Field(
        ...,
        description="Type de remboursement: AMORTISSEMENT_CONSTANT | MENSUALITE_CONSTANTE | IN_FINE"
    )


class ApplicationPredictionResponse(BaseModel):
    demande_id: int | None = None
    status: int                    # 0 = peut rembourser, 1 = risque de défaut
    default_probability: float     # probabilité de défaut (0.0 → 1.0)
    eligibility_score: float       # score d'éligibilité = 1 - default_probability
    risk_level: str                # LOW | MEDIUM | HIGH
    recommendation: str
    details: dict


# ─── Helper functions ───────────────────────────────────────────────────────

def encode_repayment(repayment_type: str) -> int:
    val = REPAYMENT_MAP.get(repayment_type.upper())
    if val is None:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid repayment_type: '{repayment_type}'. "
                   f"Accepted values: {list(REPAYMENT_MAP.keys())}"
        )
    return val


def build_features(req: ApplicationPredictionRequest) -> pd.DataFrame:
    debt_ratio = min(req.amount / (req.income * req.term_months), 5.0)
    repayment_encoded = encode_repayment(req.repayment_type)
    return pd.DataFrame([{
        "amount": req.amount,
        "income": req.income,
        "dependents": req.dependents,
        "term_months": req.term_months,
        "repayment_encoded": repayment_encoded,
        "debt_ratio": debt_ratio,
    }])


def classify(prob: float, req: ApplicationPredictionRequest) -> tuple[int, str, str, dict]:
    debt_ratio = min(req.amount / (req.income * req.term_months), 5.0)
    monthly_burden = req.amount / req.term_months
    burden_ratio = monthly_burden / req.income  # part du revenu mensuel

    if prob < 0.30:
        status = 0
        risk_level = "LOW"
        recommendation = "Application eligible. Healthy financial profile."
    elif prob < 0.50:
        status = 0
        risk_level = "MEDIUM"
        recommendation = "Eligible with monitoring. Verify income stability."
    elif prob < 0.70:
        status = 1
        risk_level = "HIGH"
        recommendation = "High default risk. Recommend reducing amount or extending term."
    else:
        status = 1
        risk_level = "HIGH"
        recommendation = "Very high default risk. Application likely to be rejected."

    details = {
        "debt_ratio": round(debt_ratio, 4),
        "monthly_burden": round(monthly_burden, 2),
        "burden_ratio": round(burden_ratio, 4),
        "repayment_type": req.repayment_type,
        "dependents_impact": "high" if req.dependents >= 4 else ("medium" if req.dependents >= 2 else "low"),
    }

    return status, risk_level, recommendation, details


# ─── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "service": "application-prediction-service",
        "port": 8002
    }


@app.post("/predict-application", response_model=ApplicationPredictionResponse)
def predict_application(req: ApplicationPredictionRequest):
    """
    Prédit l'éligibilité au crédit à partir des données de la demande.
    Retourne status=0 (peut rembourser) ou status=1 (risque de défaut).
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    features = build_features(req)
    proba = model.predict_proba(features)[0]
    prob_default = float(proba[1])  # probabilité de status=1 (défaut)
    prob_ok = float(proba[0])       # probabilité de status=0 (sain)

    status, risk_level, recommendation, details = classify(prob_default, req)

    return ApplicationPredictionResponse(
        status=status,
        default_probability=round(prob_default, 4),
        eligibility_score=round(prob_ok, 4),
        risk_level=risk_level,
        recommendation=recommendation,
        details=details,
    )


@app.post("/predict-application/{demande_id}", response_model=ApplicationPredictionResponse)
def predict_application_with_id(demande_id: int, req: ApplicationPredictionRequest):
    """
    Même prédiction que /predict-application, mais inclut le demande_id dans la réponse.
    Utilisé par le backend Java lors de la création d'une demande.
    """
    response = predict_application(req)
    response.demande_id = demande_id
    return response

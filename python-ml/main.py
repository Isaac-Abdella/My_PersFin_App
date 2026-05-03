from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="PersFin ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ─────────────────────────────────────────────────────────────

class MonthlySpend(BaseModel):
    month: str      # "YYYY-MM"
    category: str
    amount: float

class Transaction(BaseModel):
    id: str
    amount: float
    category: str
    date: str       # "YYYY-MM-DD"
    description: str = ""

class ForecastReq(BaseModel):
    monthly_spending: List[MonthlySpend]
    forecast_months: int = 3

class AnomalyReq(BaseModel):
    transactions: List[Transaction]

class BudgetSuggestReq(BaseModel):
    monthly_spending: List[MonthlySpend]


# ── Helpers ─────────────────────────────────────────────────────────────────────

def _ets_forecast(series: pd.Series, n: int) -> pd.Series:
    """Holt exponential smoothing with moving-average fallback.

    statsmodels returns a RangeIndex on the forecast when it cannot infer the
    series frequency (common with pandas 2.2+ DatetimeIndex without explicit freq).
    We always build the future DatetimeIndex ourselves so the caller can safely
    call .strftime() on every index value.
    """
    last_date = pd.Timestamp(series.index[-1])
    future_idx = pd.date_range(last_date + pd.DateOffset(months=1), periods=n, freq="MS")
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        trend = "add" if len(series) >= 4 else None
        damped = trend is not None and len(series) >= 6
        model = ExponentialSmoothing(series, trend=trend, damped_trend=damped).fit(optimized=True)
        fc = model.forecast(n)
        # fc may have a RangeIndex — replace it with the correct future dates
        return pd.Series(fc.values, index=future_idx)
    except Exception:
        avg = float(series.mean())
        return pd.Series([avg] * n, index=future_idx)


# ── Endpoints ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "PersFin ML"}


@app.post("/forecast")
def forecast_spending(req: ForecastReq):
    if not req.monthly_spending:
        raise HTTPException(400, "No spending data provided")

    df = pd.DataFrame([s.model_dump() for s in req.monthly_spending])
    df["month"] = pd.to_datetime(df["month"] + "-01")

    results = {}
    for cat, group in df.groupby("category"):
        g = group.sort_values("month").set_index("month")["amount"]
        if len(g) < 2:
            continue

        fc = _ets_forecast(g, req.forecast_months).clip(lower=0)

        last_val = float(g.iloc[-1])
        fc_last = float(fc.iloc[-1])
        trend = "up" if fc_last > last_val * 1.03 else ("down" if fc_last < last_val * 0.97 else "stable")

        results[str(cat)] = {
            "historical": [
                {"month": m.strftime("%Y-%m"), "amount": round(float(a), 2)}
                for m, a in g.items()
            ],
            "forecast": [
                {"month": m.strftime("%Y-%m"), "amount": round(float(a), 2)}
                for m, a in fc.items()
            ],
            "trend": trend,
        }

    return {"forecasts": results, "months_forecast": req.forecast_months}


@app.post("/anomalies")
def detect_anomalies(req: AnomalyReq):
    if len(req.transactions) < 5:
        return {
            "anomalies": [],
            "totalScanned": len(req.transactions),
            "anomalyCount": 0,
            "message": f"Need at least 5 transactions (have {len(req.transactions)})",
        }

    df = pd.DataFrame([t.model_dump() for t in req.transactions])
    df["date"] = pd.to_datetime(df["date"])
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)

    # Per-category z-score
    cat_stats = df.groupby("category")["amount"].agg(["mean", "std"]).reset_index()
    cat_stats.columns = ["category", "cat_mean", "cat_std"]
    df = df.merge(cat_stats, on="category", how="left")
    df["cat_std"] = df["cat_std"].fillna(1).replace(0, 1)
    df["z_score"] = (df["amount"] - df["cat_mean"]) / df["cat_std"]

    features = df[["amount", "day_of_week", "day_of_month", "z_score"]].fillna(0)
    X = StandardScaler().fit_transform(features)

    clf = IsolationForest(contamination=0.07, random_state=42, n_estimators=100)
    df["is_anomaly"] = clf.fit_predict(X)
    df["score"] = clf.score_samples(X)

    out = []
    for _, row in df[df["is_anomaly"] == -1].sort_values("score").iterrows():
        parts = []
        if abs(row["z_score"]) > 2:
            ratio = round(abs(row["amount"]) / max(row["cat_mean"], 0.01), 1)
            parts.append(f"{ratio}× typical spend in {row['category']}")
        if row["day_of_week"] >= 5:
            parts.append("weekend transaction")
        if not parts:
            parts.append("unusual spending pattern")
        out.append({
            "id": str(row["id"]),
            "amount": float(row["amount"]),
            "category": str(row["category"]),
            "date": row["date"].strftime("%Y-%m-%d"),
            "description": str(row.get("description", "")),
            "anomalyScore": round(min(99.0, abs(float(row["score"])) * 120), 1),
            "zScore": round(float(row["z_score"]), 2),
            "reason": "; ".join(parts),
        })

    return {"anomalies": out, "totalScanned": len(df), "anomalyCount": len(out)}


@app.post("/suggest-budgets")
def suggest_budgets(req: BudgetSuggestReq):
    if not req.monthly_spending:
        raise HTTPException(400, "No spending data provided")

    df = pd.DataFrame([s.model_dump() for s in req.monthly_spending])
    suggestions = []

    for cat, group in df.groupby("category"):
        amounts = group["amount"].values.astype(float)
        mean_val = float(np.mean(amounts))
        median_val = float(np.median(amounts))
        std_val = float(np.std(amounts))
        p75 = float(np.percentile(amounts, 75))

        trend = "stable"
        if len(amounts) >= 3:
            x = np.arange(len(amounts))
            slope = np.polyfit(x, amounts, 1)[0]
            pct = (slope / mean_val * 100) if mean_val > 0 else 0
            if pct > 3:
                trend = "increasing"
            elif pct < -3:
                trend = "decreasing"

        buffer = 1.10 if trend == "increasing" else 1.05
        suggested = round(p75 * buffer, 2)
        n = len(amounts)

        suggestions.append({
            "category": str(cat),
            "suggestedBudget": suggested,
            "historicalMean": round(mean_val, 2),
            "historicalMedian": round(median_val, 2),
            "historicalStd": round(std_val, 2),
            "p75": round(p75, 2),
            "trend": trend,
            "monthsAnalyzed": n,
            "confidence": "high" if n >= 6 else "medium" if n >= 3 else "low",
        })

    suggestions.sort(key=lambda x: x["suggestedBudget"], reverse=True)
    months_count = int(df["month"].nunique()) if "month" in df.columns else 0
    return {"suggestions": suggestions, "monthsAnalyzed": months_count}

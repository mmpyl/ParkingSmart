#!/usr/bin/env python3
"""
Entrenamiento base de modelos de demanda/recaudo para ParkingSmart.

Uso:
  python scripts/ml/train_demand_models.py \
    --input data/parking_rows.csv \
    --outdir artifacts/ml
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


@dataclass
class PreparedData:
    features: pd.DataFrame
    y_entries: pd.Series
    y_revenue: pd.Series


def build_hourly_dataset(df: pd.DataFrame) -> PreparedData:
    frame = df.copy()
    frame["Entrada"] = pd.to_datetime(frame["Entrada"], errors="coerce")
    frame["Total"] = pd.to_numeric(frame["Total"], errors="coerce").fillna(0)
    frame = frame.dropna(subset=["Entrada"])

    frame["slot_start"] = frame["Entrada"].dt.floor("H")

    grouped = frame.groupby("slot_start", as_index=False).agg(
        y_entries=("id", "count"),
        y_revenue=("Total", "sum"),
        share_moto=("Tipo", lambda s: (s.str.lower().str.contains("moto")).mean()),
        share_sedan=("Tipo", lambda s: (s.str.lower().str.contains("sed") | s.str.lower().str.contains("sedán")).mean()),
        share_suv=("Tipo", lambda s: s.str.lower().str.contains("suv").mean()),
        share_camion=("Tipo", lambda s: (s.str.lower().str.contains("camion") | s.str.lower().str.contains("camión")).mean()),
    ).sort_values("slot_start")

    grouped["hour"] = grouped["slot_start"].dt.hour
    grouped["weekday"] = grouped["slot_start"].dt.weekday
    grouped["is_weekend"] = grouped["weekday"].isin([5, 6]).astype(int)
    grouped["month"] = grouped["slot_start"].dt.month

    for lag in [1, 24, 168]:
        grouped[f"entries_lag_{lag}"] = grouped["y_entries"].shift(lag)
        grouped[f"revenue_lag_{lag}"] = grouped["y_revenue"].shift(lag)

    grouped = grouped.dropna().reset_index(drop=True)

    feature_cols = [
        "hour",
        "weekday",
        "is_weekend",
        "month",
        "entries_lag_1",
        "entries_lag_24",
        "entries_lag_168",
        "revenue_lag_1",
        "revenue_lag_24",
        "revenue_lag_168",
        "share_moto",
        "share_sedan",
        "share_suv",
        "share_camion",
    ]

    return PreparedData(
        features=grouped[feature_cols],
        y_entries=grouped["y_entries"],
        y_revenue=grouped["y_revenue"],
    )


def temporal_split(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2):
    cut = int(len(X) * (1 - test_size))
    return X.iloc[:cut], X.iloc[cut:], y.iloc[:cut], y.iloc[cut:]


def rmse(y_true, y_pred) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def train_and_report(X: pd.DataFrame, y: pd.Series, name: str):
    X_train, X_test, y_train, y_test = temporal_split(X, y)

    model = GradientBoostingRegressor(random_state=42)
    model.fit(X_train, y_train)

    pred = model.predict(X_test)

    metrics = {
        "mae": float(mean_absolute_error(y_test, pred)),
        "rmse": rmse(y_test, pred),
    }

    return model, metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="CSV de registros tipo SheetRow")
    parser.add_argument("--outdir", default="artifacts/ml", help="Carpeta de salida")
    args = parser.parse_args()

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.input)
    prepared = build_hourly_dataset(df)

    entries_model, entries_metrics = train_and_report(prepared.features, prepared.y_entries, "entries")
    revenue_model, revenue_metrics = train_and_report(prepared.features, prepared.y_revenue, "revenue")

    joblib.dump(entries_model, outdir / "model_entries.joblib")
    joblib.dump(revenue_model, outdir / "model_revenue.joblib")

    report = {
        "rows": int(len(prepared.features)),
        "entries": entries_metrics,
        "revenue": revenue_metrics,
        "features": list(prepared.features.columns),
    }

    pd.Series(report, dtype="object").to_json(outdir / "metrics.json", indent=2, force_ascii=False)
    print("Training finished. Metrics saved to", outdir / "metrics.json")


if __name__ == "__main__":
    main()

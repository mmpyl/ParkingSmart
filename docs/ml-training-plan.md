# ML Plan para ParkingSmart (MVP → Producción)

## 1) Objetivo
Predecir para ventanas de tiempo futuras:

1. **Demanda**: número de ingresos.
2. **Recaudo**: suma de `Total`.

Esto habilita capacidad operativa, staffing y alertas de picos.

## 2) Fuente de datos actual
El modelo usa los registros existentes (`SheetRow`) y configuraciones sincronizadas desde Apps Script.

Campos principales de `SheetRow`:

- `Placa`
- `Tipo`
- `Entrada`
- `Salida`
- `Estado`
- `Total`

## 3) Esquema de dataset de entrenamiento (agregado)
Unidad base sugerida: **1 fila por hora** (`slot_start`).

Columnas de features:

- `slot_start` (timestamp)
- `hour` (0-23)
- `weekday` (0-6)
- `is_weekend` (0/1)
- `month` (1-12)
- `entries_count_lag_1`
- `entries_count_lag_24`
- `entries_count_lag_168`
- `revenue_sum_lag_1`
- `revenue_sum_lag_24`
- `revenue_sum_lag_168`
- `share_moto`
- `share_sedan`
- `share_suv`
- `share_camion`

Targets:

- `y_entries`: ingresos en el slot
- `y_revenue`: recaudo del slot

## 4) Modelo recomendado
- Recomendación principal: **LightGBM Regressor** (tabular, robusto, rápido).
- Fallback simple: `GradientBoostingRegressor`.

Entrenar dos modelos:

- `model_entries` para `y_entries`
- `model_revenue` para `y_revenue`

## 5) Split y evaluación
- Split temporal (sin shuffle): train histórico, test últimos N días.
- Métricas mínimas:
  - MAE
  - RMSE
  - MAPE (solo para `y_revenue` cuando target > 0)

## 6) Despliegue recomendado
1. Entrenamiento batch diario/semanal (script Python).
2. Guardar artefactos (`joblib`) versionados con timestamp.
3. Endpoint de inferencia (Cloud Run/Functions) para servir predicciones al dashboard.

## 7) Integración UI propuesta
Agregar bloque “Pronóstico” al dashboard con:

- próximos 7 slots (o 7 días)
- forecast de demanda y recaudo
- banda p10/p90 (opcional fase 2)

## 8) Script base
Se incluye script de ejemplo en:

- `scripts/ml/train_demand_models.py`

Entrena ambos modelos usando un CSV con columnas similares a `SheetRow`.

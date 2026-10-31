#!/usr/bin/env python3
"""
SANCHAY AI — Smart Inventory Management System
ML Engine: Demand Forecasting & Stock-Out Risk Assessment
Schema: smart_inventory → products, stock_transactions

Field mapping (matches exact MySQL schema):
  products:           id, name, sku, supplier_id, current_stock, min_stock_level, price
  stock_transactions: id, product_id, transaction_type ('IN'|'OUT'), quantity, transaction_date, notes

Integration:
  1. Child Process (default): Node.js spawns this script, passes JSON via stdin, reads JSON from stdout.
  2. FastAPI Microservice (optional): Run `uvicorn predictor_api:app --port 8000` and call /predict.

Install dependencies:
  pip install pandas numpy scikit-learn
"""

import sys
import json
import math
from datetime import datetime, timedelta

try:
    import numpy as np
    import pandas as pd
    from sklearn.linear_model import LinearRegression
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


# ─── Core Prediction Engine ───────────────────────────────────────────────────

def calculate_predictions(products: list, transactions: list, lead_time_days: int = 7) -> list:
    """
    Analyze stock_transactions (OUT events) to forecast demand, calculate
    safety stock, reorder points, and predicted stockout dates.

    Args:
        products:         List of product dicts matching smart_inventory.products schema.
        transactions:     List of transaction dicts matching smart_inventory.stock_transactions schema.
        lead_time_days:   Supplier lead time (days). Default=7.

    Returns:
        List of prediction dicts, one per product.
    """
    now = datetime.now()
    results = []

    # Index OUT transactions by product_id
    out_by_product: dict[int, list] = {}
    for txn in transactions:
        p_id = txn.get("product_id")
        t_type = (txn.get("transaction_type") or "").strip().upper()
        if t_type == "OUT" and p_id is not None:
            out_by_product.setdefault(p_id, []).append(txn)

    for product in products:
        p_id = product.get("id")
        name = product.get("name", "Unknown Product")
        sku = product.get("sku", "")
        current_stock = float(product.get("current_stock") or 0)
        min_stock_level = float(product.get("min_stock_level") or 10)
        price = float(product.get("price") or 0)

        out_txns = out_by_product.get(p_id, [])

        # ── Insufficient History ──────────────────────────────────────────────
        if len(out_txns) < 2:
            if current_stock <= 0:
                risk = "Critical"
            elif current_stock <= min_stock_level:
                risk = "Warning"
            else:
                risk = "Insufficient Data"

            results.append({
                "product_id": p_id,
                "name": name,
                "sku": sku,
                "current_stock": current_stock,
                "min_stock_level": min_stock_level,
                "avg_daily_demand": None,
                "safety_stock": round(min_stock_level, 1),
                "reorder_point": round(min_stock_level, 1),
                "suggested_reorder_qty": max(0, int(min_stock_level * 2 - current_stock)) if current_stock <= min_stock_level else 0,
                "days_of_stock_left": 0 if current_stock <= 0 else None,
                "stockout_date": now.strftime("%Y-%m-%d") if current_stock <= 0 else None,
                "risk_level": risk,
                "confidence_score": 0.35,
                "notes": "Insufficient historical OUT transactions (< 2 events).",
            })
            continue

        # ── Parse & Sort Consumption Events ──────────────────────────────────
        events: list[tuple[datetime, float]] = []
        for txn in out_txns:
            qty = float(txn.get("quantity") or 0)
            date_raw = txn.get("transaction_date") or txn.get("created_at")
            try:
                date_parsed = datetime.fromisoformat(str(date_raw)[:19])
            except Exception:
                date_parsed = now - timedelta(days=5)
            events.append((date_parsed, qty))

        events.sort(key=lambda x: x[0])
        total_consumed = sum(q for _, q in events)
        first_date = events[0][0]
        days_span = max(1, (now - first_date).days)

        # ── Average Daily Demand (with optional linear regression) ────────────
        avg_daily_demand = total_consumed / days_span

        if HAS_SKLEARN and len(events) >= 5:
            # Fit linear trend to cumulative consumption over time
            X = np.array([(e[0] - first_date).days for e in events]).reshape(-1, 1)
            y_cum = np.cumsum([q for _, q in events])
            model = LinearRegression().fit(X, y_cum)
            slope = float(model.coef_[0])  # units/day
            if slope > 0:
                avg_daily_demand = slope

        if avg_daily_demand <= 0:
            avg_daily_demand = 0.01

        # ── Safety Stock (95% service level, Z=1.645) ─────────────────────────
        quantities = [q for _, q in events]
        mean_qty = sum(quantities) / len(quantities)
        variance = sum((q - mean_qty) ** 2 for q in quantities) / max(1, len(quantities) - 1)
        std_dev = math.sqrt(variance)

        z_score = 1.645  # 95% service level
        safety_stock = z_score * math.sqrt(max(1, lead_time_days)) * max(std_dev, avg_daily_demand * 0.25)
        safety_stock = round(max(safety_stock, min_stock_level * 0.5), 1)

        # ── Reorder Point ────────────────────────────────────────────────────
        lead_demand = avg_daily_demand * lead_time_days
        reorder_point = round(lead_demand + safety_stock, 1)

        # ── Stockout Forecast ────────────────────────────────────────────────
        days_left = current_stock / avg_daily_demand
        stockout_dt = now + timedelta(days=days_left)
        stockout_str = stockout_dt.strftime("%Y-%m-%d")

        # ── Suggested Reorder Qty (covers lead time + 14-day buffer) ─────────
        target_coverage = avg_daily_demand * (lead_time_days + 14) + safety_stock
        suggested_reorder = max(0, int(round(target_coverage - current_stock)))

        # ── Risk Classification ───────────────────────────────────────────────
        if current_stock <= 0:
            risk = "Critical"
        elif days_left <= lead_time_days:
            risk = "Critical"
        elif days_left <= lead_time_days * 1.5 or current_stock <= reorder_point:
            risk = "Warning"
        else:
            risk = "Safe"

        # ── Confidence Score ─────────────────────────────────────────────────
        if HAS_SKLEARN and len(events) >= 5:
            confidence = round(min(0.96, 0.70 + len(events) * 0.02), 2)
        elif len(events) >= 3:
            confidence = 0.65
        else:
            confidence = 0.50

        results.append({
            "product_id": p_id,
            "name": name,
            "sku": sku,
            "current_stock": current_stock,
            "min_stock_level": min_stock_level,
            "avg_daily_demand": round(avg_daily_demand, 3),
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "suggested_reorder_qty": suggested_reorder,
            "days_of_stock_left": round(days_left, 1),
            "stockout_date": stockout_str,
            "risk_level": risk,
            "confidence_score": confidence,
            "notes": f"Demand curve fitted on {len(events)} OUT events over {days_span} days. "
                     f"{'LinearRegression trend used.' if HAS_SKLEARN and len(events) >= 5 else 'Simple average used.'}",
        })

    return results


# ─── Main (stdin → stdout child-process interface) ───────────────────────────

def main():
    lead_time = 7
    if len(sys.argv) > 1:
        try:
            lead_time = int(sys.argv[1])
        except ValueError:
            pass

    input_data = None
    if not sys.stdin.isatty():
        try:
            raw = sys.stdin.read().strip()
            if raw:
                input_data = json.loads(raw)
        except Exception as e:
            print(json.dumps({"success": False, "error": f"JSON parse error: {e}"}))
            sys.exit(1)

    if input_data:
        products = input_data.get("products", [])
        transactions = input_data.get("transactions", [])
        lead_time = int(input_data.get("lead_time", lead_time))
    else:
        # Standalone test data (mirrors schema exactly)
        products = [
            {"id": 1, "name": "Basmati Rice 5kg", "sku": "RIC-BAS-001", "current_stock": 18, "min_stock_level": 20, "price": 450},
            {"id": 2, "name": "Sunflower Oil 1L", "sku": "OIL-SUN-002", "current_stock": 35, "min_stock_level": 15, "price": 140},
            {"id": 3, "name": "Refined Sugar 1kg", "sku": "SUG-REF-003", "current_stock": 0, "min_stock_level": 10, "price": 45},
            {"id": 4, "name": "Wheat Flour (Atta) 10kg", "sku": "FLR-WHT-004", "current_stock": 24, "min_stock_level": 12, "price": 380},
            {"id": 5, "name": "Full Cream Milk 500ml", "sku": "DAI-MLK-005", "current_stock": 50, "min_stock_level": 25, "price": 32},
        ]
        transactions = [
            {"product_id": 1, "transaction_type": "OUT", "quantity": 4, "transaction_date": (datetime.now() - timedelta(days=6)).isoformat()},
            {"product_id": 1, "transaction_type": "OUT", "quantity": 5, "transaction_date": (datetime.now() - timedelta(days=3)).isoformat()},
            {"product_id": 1, "transaction_type": "OUT", "quantity": 3, "transaction_date": (datetime.now() - timedelta(days=1)).isoformat()},
            {"product_id": 2, "transaction_type": "OUT", "quantity": 2, "transaction_date": (datetime.now() - timedelta(days=4)).isoformat()},
            {"product_id": 4, "transaction_type": "OUT", "quantity": 3, "transaction_date": (datetime.now() - timedelta(days=5)).isoformat()},
            {"product_id": 4, "transaction_type": "OUT", "quantity": 2, "transaction_date": (datetime.now() - timedelta(days=2)).isoformat()},
        ]

    predictions = calculate_predictions(products, transactions, lead_time_days=lead_time)
    output = {
        "success": True,
        "brand": "SANCHAY AI",
        "lead_time_days": lead_time,
        "source": "sanchay_ml_engine_v2",
        "sklearn_available": HAS_SKLEARN,
        "generated_at": datetime.now().isoformat(),
        "predictions": predictions,
    }
    print(json.dumps(output, indent=2, default=str))


if __name__ == "__main__":
    main()

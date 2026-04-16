SEVERITY_MAP = {"LOW": 0.2, "MEDIUM": 0.5, "HIGH": 0.9, "CRITICAL": 1.0}
WEIGHTS = {
    "port": 0.31, "weather": 0.28,
    "news": 0.14, "history": 0.18, "customs": 0.09
}

def compute_risk_score(signals: dict) -> dict:
    raw = 0.0
    factors = []
    for key, weight in WEIGHTS.items():
        if key not in signals:
            continue
        sig = signals[key]
        sev = SEVERITY_MAP.get(sig.get("severity", "LOW"), 0.2)
        contribution = round(sev * weight * 100)
        raw += sev * weight
        factors.append({
            "factor": key,
            "contribution": contribution,
            "severity": sig.get("severity"),
            "details": _factor_details(key, sig)
        })
    score = min(100, int(raw * 100 * (1 + 0.3 * raw)))
    delay_prob = min(0.97, raw * 1.4)
    expected_delay = round(delay_prob * 4.5, 1)
    factors.sort(key=lambda x: x["contribution"], reverse=True)
    return {
        "risk_score": score,
        "delay_probability": round(delay_prob, 2),
        "expected_delay_days": expected_delay,
        "confidence_interval": [
            round(max(0, expected_delay - 1.8), 1),
            round(expected_delay + 2.0, 1)
        ],
        "shap_factors": factors
    }

def _factor_details(key, sig):
    if key == "port":
        return f"{sig.get('queue_vessels','?')} vessels queued, {sig.get('pct_vs_baseline','?')}% above baseline"
    if key == "weather":
        return f"{sig.get('description','?')}, {sig.get('wind_kts','?')} kts wind"
    if key == "news":
        return f"{sig.get('article_count',0)} relevant articles found"
    if key == "history":
        return f"Lane P(delay>2d)={sig.get('p_delay_2d','?')}"
    return sig.get("severity", "?")

def generate_recommendations(risk_data: dict, shipment: dict) -> list:
    score = risk_data["risk_score"]
    recos = []
    port_sig = next((f for f in risk_data["shap_factors"] if f["factor"]=="port"), None)
    weather_sig = next((f for f in risk_data["shap_factors"] if f["factor"]=="weather"), None)
    if port_sig and port_sig["severity"] == "HIGH":
        recos.append({"action": "REROUTE",
                      "priority": 1,
                      "title": "Divert to alternate port",
                      "detail": "Consider Salalah (Oman) — ETA +1 day, avoids ~3 days congestion",
                      "cost_delta": "+$8,200 fuel", "time_saved": "~2.5 days net"})
    if score >= 70:
        recos.append({"action": "EXPEDITE",
                      "priority": 2,
                      "title": "Request priority berth",
                      "detail": f"Pay priority fee at {shipment.get('dest_port','dest')}",
                      "cost_delta": "+$4,200", "time_saved": "~2 days"})
    if score >= 60:
        recos.append({"action": "NOTIFY",
                      "priority": 3,
                      "title": "Send customer delay notice",
                      "detail": f"Estimated {risk_data['expected_delay_days']:.1f}-day slip",
                      "cost_delta": "None", "time_saved": "Manages expectations"})
    recos.append({"action": "MONITOR",
                  "priority": 4,
                  "title": "Re-evaluate in 24 hours",
                  "detail": "Conditions may change — re-run analysis tomorrow",
                  "cost_delta": "None", "time_saved": "Ongoing"})
    return recos

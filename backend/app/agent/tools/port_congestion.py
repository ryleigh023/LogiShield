import random
from datetime import datetime

PORT_BASE = {
    "AEJEA": {"baseline_wait": 2.1, "baseline_queue": 22},
    "SGSIN": {"baseline_wait": 1.2, "baseline_queue": 15},
    "DEHAM": {"baseline_wait": 0.8, "baseline_queue": 10},
    "CNSHA": {"baseline_wait": 1.5, "baseline_queue": 18},
    "NLRTM": {"baseline_wait": 1.0, "baseline_queue": 12},
    "USLAX": {"baseline_wait": 3.2, "baseline_queue": 35},
    "MYPKG": {"baseline_wait": 1.8, "baseline_queue": 20},
}

def port_tool(port: str) -> dict:
    base = PORT_BASE.get(port, {"baseline_wait": 1.5, "baseline_queue": 18})
    seed = hash(port + str(datetime.utcnow().date())) % 1000
    random.seed(seed)
    multiplier = random.uniform(0.7, 2.5)
    wait = round(base["baseline_wait"] * multiplier, 1)
    queue = int(base["baseline_queue"] * multiplier)
    pct_above = (multiplier - 1) * 100
    if queue > 40 or wait > 4: severity = "HIGH"
    elif queue > 25 or wait > 2.5: severity = "MEDIUM"
    else: severity = "LOW"
    return {
        "queue_vessels": queue,
        "avg_wait_days": wait,
        "pct_vs_baseline": round(pct_above, 1),
        "severity": severity,
        "source": "SIMULATED"
    }

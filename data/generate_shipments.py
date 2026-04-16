import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

random.seed(42); np.random.seed(42)

LANES = [
    ("CNSHA","AEJEA"), ("DEHAM","SGSIN"), ("USLAX","JPYOK"),
    ("MYPKG","NLRTM"), ("SGSIN","DEHAM"), ("AEJEA","CNSHA"),
]
CARGOES = ["electronics","machinery","automotive","perishable","bulk","chemicals"]

def make_row():
    origin, dest = random.choice(LANES)
    eta_days = random.randint(5, 45)
    port_queue = np.random.exponential(20)
    wind_kts   = np.random.exponential(12)
    news_score = random.uniform(-1, 0.5)
    lane_base  = random.uniform(0.15, 0.55)
    features   = {
        "origin_port": origin, "dest_port": dest,
        "cargo_type": random.choice(CARGOES),
        "eta_days": eta_days,
        "port_queue_depth": round(port_queue, 1),
        "port_queue_percentile": round(min(99, port_queue / 50 * 100), 1),
        "wind_kts": round(wind_kts, 1),
        "visibility_km": round(random.uniform(2, 15), 1),
        "weather_advisory": 1 if wind_kts > 25 else 0,
        "news_sentiment": round(news_score, 3),
        "news_event_count_7d": random.randint(0, 5),
        "lane_p_delay_2d": round(lane_base, 3),
        "vessel_reliability": round(random.uniform(0.5, 1.0), 3),
        "season_index": random.randint(1, 4),
    }
    risk_raw = (
        (port_queue/50)*0.31 + (wind_kts/40)*0.28 +
        (max(0,-news_score)*0.14) + lane_base*0.18
    )
    delay_prob = min(0.95, risk_raw * 1.5 + random.gauss(0, 0.05))
    delay_days = max(0, np.random.exponential(delay_prob * 4)) if random.random() < delay_prob else 0
    features["delay_days"] = round(delay_days, 2)
    features["delay_binary"] = 1 if delay_days > 2 else 0
    return features

df = pd.DataFrame([make_row() for _ in range(10000)])
df.to_csv("shipments_train.csv", index=False)
print(f"Generated {len(df)} rows. Delay rate: {df['delay_binary'].mean():.1%}")
print(df.head(3))

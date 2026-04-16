import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import pickle, json

df = pd.read_csv("shipments_train.csv")
FEATURES = [
    "eta_days","port_queue_depth","port_queue_percentile",
    "wind_kts","visibility_km","weather_advisory",
    "news_sentiment","news_event_count_7d",
    "lane_p_delay_2d","vessel_reliability","season_index"
]
X = df[FEATURES]
y = df["delay_binary"]

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05,
                       use_label_encoder=False, eval_metric="logloss")
model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)

y_pred = model.predict(X_te)
print(classification_report(y_te, y_pred))
print("Feature importance:", dict(zip(FEATURES, model.feature_importances_.round(3))))

with open("model_xgb.pkl", "wb") as f: pickle.dump(model, f)
print("Model saved to model_xgb.pkl")
with open("feature_names.json","w") as f: json.dump(FEATURES, f)

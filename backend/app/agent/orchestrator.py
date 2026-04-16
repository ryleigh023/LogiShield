import asyncio
from datetime import datetime
from app.agent.tools.weather import weather_tool
from app.agent.tools.port_congestion import port_tool
from app.agent.tools.news import news_tool
from app.agent.tools.history import history_tool
from app.agent.risk_scorer import compute_risk_score, generate_recommendations

async def run_agent(shipment: dict) -> dict:
    trace = []
    signals = {}

    def log(step_type, content):
        trace.append({"type": step_type, "content": content,
                      "timestamp": datetime.utcnow().isoformat()})

    dest = shipment["dest_port"]
    origin = shipment["origin_port"]
    eta_days = (datetime.fromisoformat(shipment["eta"]) - datetime.utcnow()).days

    log("THOUGHT", f"Analyzing shipment to {dest}, ETA in {eta_days} days. Dispatching all tools in parallel.")

    # Parallel tool dispatch
    log("ACTION", f"Dispatching: weather_tool({dest}), port_tool({dest}), news_tool({dest}), history_tool({origin}→{dest})")

    weather_res, port_res, news_res, history_res = await asyncio.gather(
        weather_tool(dest),
        asyncio.to_thread(port_tool, dest),
        news_tool(f"{dest} port disruption strike delay", port=dest),
        asyncio.to_thread(history_tool, origin, dest),
    )

    signals = {
        "weather": weather_res,
        "port": port_res,
        "news": news_res,
        "history": history_res,
    }

    for key, val in signals.items():
        log("OBSERVATION", f"{key}: severity={val.get('severity','?')} | source={val.get('source','?')}")

    log("THOUGHT", f"All signals collected. Computing composite risk score.")
    log("ACTION", "risk_scorer(signals)")

    risk_data = compute_risk_score(signals)
    log("OBSERVATION", f"risk_score={risk_data['risk_score']}, delay_prob={risk_data['delay_probability']}, expected_delay={risk_data['expected_delay_days']}d")

    log("THOUGHT", "Score computed. Generating mitigation recommendations.")
    recos = generate_recommendations(risk_data, shipment)
    log("OBSERVATION", f"Generated {len(recos)} recommendations. Top action: {recos[0]['action'] if recos else 'NONE'}")
    log("FINAL", f"Analysis complete. Risk: {risk_data['risk_score']}/100 ({_risk_label(risk_data['risk_score'])})")

    return {
        **risk_data,
        "recommendations": recos,
        "signals": signals,
        "agent_trace": trace
    }

def _risk_label(score):
    if score >= 85: return "CRITICAL"
    if score >= 70: return "HIGH"
    if score >= 45: return "MEDIUM"
    return "LOW"

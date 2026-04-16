LANE_STATS = {
    "CNSHA→AEJEA": {"avg_delay": 1.8, "p_delay_2d": 0.42, "p_delay_5d": 0.18},
    "DEHAM→SGSIN": {"avg_delay": 0.9, "p_delay_2d": 0.21, "p_delay_5d": 0.07},
    "USLAX→JPYOK": {"avg_delay": 1.1, "p_delay_2d": 0.25, "p_delay_5d": 0.09},
    "MYPKG→NLRTM": {"avg_delay": 2.1, "p_delay_2d": 0.48, "p_delay_5d": 0.22},
}

def history_tool(origin_port: str, dest_port: str) -> dict:
    lane = f"{origin_port}→{dest_port}"
    stats = LANE_STATS.get(lane, {"avg_delay": 1.5,
                                   "p_delay_2d": 0.35,
                                   "p_delay_5d": 0.15})
    severity = ("HIGH" if stats["p_delay_2d"] > 0.4
                else "MEDIUM" if stats["p_delay_2d"] > 0.25
                else "LOW")
    return {**stats, "lane": lane, "severity": severity, "source": "HISTORICAL_DB"}


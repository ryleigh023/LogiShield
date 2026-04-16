import httpx
from app.config import settings

PORT_COORDS = {
    "AEJEA": (25.0657, 55.1416),  # Jebel Ali
    "SGSIN": (1.2644, 103.8222),   # Singapore
    "DEHAM": (53.5511, 9.9937),    # Hamburg
    "CNSHA": (31.2304, 121.4737),  # Shanghai
    "NLRTM": (51.9244, 4.4777),    # Rotterdam
    "USLAX": (33.7291, -118.2620), # Los Angeles
    "MYPKG": (3.1412, 101.6865),   # Port Klang
}

async def weather_tool(port: str) -> dict:
    coords = PORT_COORDS.get(port)
    if not coords:
        return {"severity": "MEDIUM", "source": "DEFAULT",
                "note": f"Unknown port {port}"}
    lat, lon = coords
    if not settings.openweather_api_key or settings.openweather_api_key == "your-key-here":
        return _simulated_weather(port)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"lat": lat, "lon": lon,
                        "appid": settings.openweather_api_key,
                        "units": "metric"}
            )
            d = r.json()
            wind_kts = d["wind"]["speed"] * 1.944
            visibility_km = d.get("visibility", 10000) / 1000
            severity = _weather_severity(wind_kts, visibility_km)
            return {"wind_kts": round(wind_kts, 1),
                    "visibility_km": round(visibility_km, 1),
                    "description": d["weather"][0]["description"],
                    "severity": severity, "source": "LIVE"}
    except Exception:
        return _simulated_weather(port)

def _weather_severity(wind_kts, vis_km):
    if wind_kts > 34 or vis_km < 1: return "HIGH"
    if wind_kts > 22 or vis_km < 3: return "MEDIUM"
    return "LOW"

def _simulated_weather(port):
    import random
    sims = {
        "AEJEA": {"wind_kts": 34.2, "visibility_km": 0.8,
                  "description": "Sandstorm", "severity": "HIGH"},
        "SGSIN": {"wind_kts": 12.1, "visibility_km": 8.0,
                  "description": "Haze", "severity": "LOW"},
    }
    return sims.get(port, {"wind_kts": round(random.uniform(5,20),1),
                            "visibility_km": round(random.uniform(5,15),1),
                            "description": "Clear", "severity": "LOW",
                            "source": "SIMULATED"})

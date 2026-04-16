import httpx
from app.config import settings

SIMULATED_NEWS = {
    "AEJEA": [{"title": "Port workers threaten strike at Jebel Ali",
               "age_hours": 48, "sentiment": -0.7}],
    "SGSIN": [],
    "DEHAM": [{"title": "Hamburg port traffic back to normal",
               "age_hours": 24, "sentiment": 0.2}],
}

async def news_tool(query: str, port: str = "", days_back: int = 7) -> dict:
    if not settings.news_api_key or settings.news_api_key == "your-key-here":
        return _simulated_news(port)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://newsapi.org/v2/everything",
                params={"q": query, "language": "en",
                        "sortBy": "publishedAt",
                        "pageSize": 5,
                        "apiKey": settings.news_api_key}
            )
            articles = r.json().get("articles", [])
            count = len(articles)
            severity = "HIGH" if count >= 3 else "MEDIUM" if count >= 1 else "LOW"
            return {"article_count": count,
                    "headlines": [a["title"] for a in articles[:3]],
                    "severity": severity, "source": "LIVE"}
    except Exception:
        return _simulated_news(port)

def _simulated_news(port: str) -> dict:
    articles = SIMULATED_NEWS.get(port, [])
    count = len(articles)
    severity = "HIGH" if count >= 2 else "MEDIUM" if count == 1 else "LOW"
    return {"article_count": count,
            "headlines": [a["title"] for a in articles],
            "severity": severity, "source": "SIMULATED"}

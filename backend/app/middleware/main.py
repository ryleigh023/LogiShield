from app.middleware.tracing import TracingMiddleware
app.add_middleware(TracingMiddleware)

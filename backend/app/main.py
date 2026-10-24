from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Air Quality Forecasting & Intelligence Platform for Mumbai, Maharashtra, India. "
                "Powered by official CPCB CAAQMS observations and machine learning models (ARIMA, Prophet, LSTM).",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/docs", include_in_schema=False)
def redirect_docs():
    """Redirect standard /docs to /api/v1/docs Swagger UI."""
    return RedirectResponse(url="/api/v1/docs")

@app.get("/redoc", include_in_schema=False)
def redirect_redoc():
    """Redirect standard /redoc to /api/v1/redoc ReDoc UI."""
    return RedirectResponse(url="/api/v1/redoc")

@app.get("/", tags=["Root"])
def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": f"{settings.API_V1_STR}/docs",
        "city": "Mumbai, Maharashtra, India"
    }

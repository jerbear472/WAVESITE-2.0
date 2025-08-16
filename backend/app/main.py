from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

# Import routers
from app.api.v1 import trends_supabase as trends
from app.api.v1 import auth
from app.api.v1 import metadata
from app.api.v1 import trend_tiles
from app.api.v1 import personas
from app.api.v1 import user_settings
from app.api.v1 import trend_umbrellas

# Create FastAPI instance
app = FastAPI(
    title="WaveSite API",
    description="Trend spotting and prediction platform",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:19006", "*"],  # Web and mobile dev servers + any origin for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1", tags=["authentication"])
app.include_router(trends.router, prefix="/api/v1/trends", tags=["trends"])
app.include_router(trend_umbrellas.router, prefix="/api/v1/trend-umbrellas", tags=["trend-umbrellas"])
app.include_router(metadata.router, prefix="/api/v1", tags=["metadata"])
app.include_router(trend_tiles.router, prefix="/api/v1", tags=["trend-tiles"])
app.include_router(personas.router, prefix="/api/v1", tags=["personas"])
app.include_router(user_settings.router, prefix="/api/v1", tags=["user-settings"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "WaveSite API v2.0",
        "status": "operational",
        "docs": "/docs"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "wavesite-api"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
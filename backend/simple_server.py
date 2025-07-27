from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create FastAPI instance
app = FastAPI(
    title="WaveSite API - Performance Mode",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import only the working router
from app.api.v1 import performance_trends_simple as performance_trends

# Include performance router
app.include_router(performance_trends.router, prefix="/api/v1/performance", tags=["performance"])

@app.get("/")
async def root():
    return {
        "message": "WaveSite Performance API",
        "status": "operational",
        "endpoints": {
            "performance_stats": "/api/v1/performance/stats",
            "earnings": "/api/v1/performance/earnings/breakdown",
            "achievements": "/api/v1/performance/achievements",
            "submit_trend": "/api/v1/performance/submit"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
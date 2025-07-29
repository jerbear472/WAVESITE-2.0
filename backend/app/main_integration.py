"""
Updated main.py with financial and marketing integrations
Add these imports and routes to your existing main.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.api.v1 import trends, hedge_fund, marketing
from app.core.config import settings
from app.core.database import engine, Base

# Import the extractors
from app.services.financial_extractor import FinancialIntelligenceExtractor
from app.services.cultural_extractor import CulturalIntelligenceExtractor

# Create tables
Base.metadata.create_all(bind=engine)

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting WAVESITE2 with Dual Dashboard System...")
    
    # Initialize extractors
    app.state.financial_extractor = FinancialIntelligenceExtractor()
    app.state.cultural_extractor = CulturalIntelligenceExtractor()
    
    yield
    
    # Shutdown
    print("Shutting down WAVESITE2...")

# Create FastAPI app
app = FastAPI(
    title="WAVESITE2 - Dual Intelligence Platform",
    description="Transform social trends into marketing insights and investment signals",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://wavesite2.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trends.router, prefix="/api/v1/trends", tags=["trends"])
app.include_router(hedge_fund.router, prefix="/api/v1/hedge-fund", tags=["hedge-fund"])
app.include_router(marketing.router, prefix="/api/v1/marketing", tags=["marketing"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "WAVESITE2 Dual Intelligence Platform",
        "version": "2.0.0",
        "dashboards": {
            "marketing": {
                "description": "Cultural insights for brand strategy",
                "endpoint": "/api/v1/marketing/trends",
                "pricing": "$500-$5,000/month"
            },
            "hedge_fund": {
                "description": "Investment signals from social trends",
                "endpoint": "/api/v1/hedge-fund/trending-stocks",
                "pricing": "$15,000-$150,000/month"
            }
        }
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "trends_api": "operational",
            "financial_extractor": "operational",
            "cultural_extractor": "operational",
            "marketing_dashboard": "operational",
            "hedge_fund_dashboard": "operational"
        }
    }

# Background task to process trends
async def process_trend_intelligence(trend_id: str):
    """Process trend through both extraction pipelines"""
    try:
        # Process financial signals
        await app.state.financial_extractor.process_financial_signals(trend_id)
        
        # Process cultural insights
        await app.state.cultural_extractor.process_cultural_insights(trend_id)
        
    except Exception as e:
        print(f"Error processing trend {trend_id}: {e}")

# Webhook endpoint for real-time trend processing
@app.post("/api/v1/webhooks/trend-submitted")
async def trend_submitted_webhook(trend_id: str):
    """Webhook called when new trend is submitted"""
    # Process in background
    asyncio.create_task(process_trend_intelligence(trend_id))
    
    return {"status": "processing", "trend_id": trend_id}

# API documentation customization
@app.get("/api/v1/docs/marketing")
async def marketing_api_docs():
    """Marketing-specific API documentation"""
    return {
        "title": "WAVESITE2 Marketing API",
        "endpoints": {
            "GET /api/v1/marketing/trends": "Get trends with cultural insights",
            "GET /api/v1/marketing/trends/{id}/detailed-insights": "Deep dive on specific trend",
            "GET /api/v1/marketing/mood-boards": "Visual mood board data",
            "GET /api/v1/marketing/campaign-calendar": "Campaign timing recommendations",
            "GET /api/v1/marketing/audience-insights": "Aggregated audience data"
        },
        "authentication": "Bearer token required",
        "rate_limits": "1000 requests/hour"
    }

@app.get("/api/v1/docs/hedge-fund")
async def hedge_fund_api_docs():
    """Hedge fund-specific API documentation"""
    return {
        "title": "WAVESITE2 Financial Intelligence API",
        "endpoints": {
            "GET /api/v1/hedge-fund/trending-stocks": "Real-time stock signals",
            "GET /api/v1/hedge-fund/live-alerts": "Critical market alerts",
            "GET /api/v1/hedge-fund/stocks/{ticker}/analysis": "Deep stock analysis",
            "GET /api/v1/hedge-fund/sectors/momentum": "Sector rotation data",
            "GET /api/v1/hedge-fund/trends/{id}/performance": "Historical signal performance"
        },
        "authentication": "X-API-Key header required",
        "rate_limits": "Based on subscription tier",
        "websocket": "wss://api.wavesite2.com/ws/hedge-fund/live"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
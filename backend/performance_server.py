from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import uvicorn

# Create FastAPI instance
app = FastAPI(
    title="WaveSight Performance API",
    version="2.0.0",
    docs_url="/docs"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock user authentication
async def get_current_user():
    return {"id": "user_123", "username": "TestUser"}

# Performance stats endpoint
@app.get("/api/v1/performance/stats")
async def get_performance_stats(current_user = Depends(get_current_user)):
    return {
        "trend_earnings": 127.50,
        "pending_payouts": 23.75,
        "viral_trends_spotted": 12,
        "validated_trends": 45,
        "quality_submissions": 67,
        "first_spotter_bonus_count": 8,
        "trend_accuracy_rate": 0.78,
        "streak_days": 15,
        "streak_multiplier": 1.5,
        "next_milestone": {
            "name": "Viral Hunter",
            "requirement": "Spot 38 more viral trends",
            "reward": "$50.00 bonus"
        }
    }

# Earnings breakdown endpoint
@app.get("/api/v1/performance/earnings/breakdown")
async def get_earnings_breakdown(
    time_period: str = "week",
    current_user = Depends(get_current_user)
):
    base_earnings = {
        "week": {
            "total": 45.75,
            "viral": 20.00,
            "validated": 15.00,
            "quality": 10.75
        },
        "month": {
            "total": 127.50,
            "viral": 60.00,
            "validated": 42.50,
            "quality": 25.00
        },
        "all": {
            "total": 523.25,
            "viral": 280.00,
            "validated": 143.25,
            "quality": 100.00
        }
    }
    
    period_data = base_earnings.get(time_period, base_earnings["week"])
    
    return {
        "total_earnings": period_data["total"],
        "pending_earnings": period_data["total"] * 0.2,
        "paid_earnings": period_data["total"] * 0.8,
        "viral_trend_earnings": period_data["viral"],
        "validated_trend_earnings": period_data["validated"],
        "quality_submission_earnings": period_data["quality"],
        "first_spotter_bonuses": period_data["total"] * 0.1,
        "streak_bonuses": 5.00,
        "achievement_bonuses": 10.00,
        "challenge_rewards": 15.00,
        "recent_payments": [
            {
                "id": "pay_001",
                "type": "trend_reward",
                "description": "Viral TikTok dance trend",
                "amount": 5.00,
                "date": "2024-03-01T10:30:00Z",
                "status": "paid"
            },
            {
                "id": "pay_002",
                "type": "quality_submission",
                "description": "Quality fashion trend submission",
                "amount": 0.25,
                "date": "2024-03-02T14:15:00Z",
                "status": "pending"
            }
        ],
        "next_payout_date": "2024-03-08T00:00:00Z",
        "next_payout_amount": period_data["total"] * 0.2
    }

# Achievements endpoint
@app.get("/api/v1/performance/achievements")
async def get_achievements(current_user = Depends(get_current_user)):
    return [
        {
            "id": "ach_001",
            "name": "Trend Scout",
            "description": "Spot 10 viral trends",
            "icon_emoji": "🔍",
            "requirement_type": "viral_count",
            "requirement_value": 10,
            "reward_amount": 10.00,
            "progress": 12,
            "earned": True,
            "earned_at": "2024-02-15T10:00:00Z"
        },
        {
            "id": "ach_002",
            "name": "Viral Hunter",
            "description": "Spot 50 viral trends",
            "icon_emoji": "🎯",
            "requirement_type": "viral_count",
            "requirement_value": 50,
            "reward_amount": 50.00,
            "progress": 12,
            "earned": False,
            "earned_at": None
        },
        {
            "id": "ach_003",
            "name": "Sharp Eye",
            "description": "Maintain 80% accuracy rate",
            "icon_emoji": "👁️",
            "requirement_type": "accuracy_rate",
            "requirement_value": 80,
            "reward_amount": 20.00,
            "progress": 78,
            "earned": False,
            "earned_at": None
        }
    ]

# Submit trend endpoint
@app.post("/api/v1/performance/submit")
async def submit_trend(
    trend_data: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    # Calculate quality score
    quality_score = 0.0
    if trend_data.get("title"):
        quality_score += 0.1
    if trend_data.get("description") and len(trend_data.get("description", "")) > 50:
        quality_score += 0.2
    if trend_data.get("category"):
        quality_score += 0.1
    if trend_data.get("platform"):
        quality_score += 0.1
    if trend_data.get("hashtags") and len(trend_data.get("hashtags", [])) >= 3:
        quality_score += 0.15
    if trend_data.get("media_preview_url"):
        quality_score += 0.1
    
    # Determine payment
    payment_amount = 0.0
    if quality_score >= 0.7:
        payment_amount = 0.25
    
    tips = []
    if not trend_data.get("description") or len(trend_data.get("description", "")) < 50:
        tips.append("Add a detailed description (50+ characters) for better quality score")
    if not trend_data.get("hashtags") or len(trend_data.get("hashtags", [])) < 3:
        tips.append("Include at least 3 relevant hashtags")
    
    return {
        "id": f"trend_{datetime.now().timestamp()}",
        "status": "submitted",
        "quality_score": quality_score,
        "payment_info": {
            "payment_amount": payment_amount,
            "is_first_spotter": True,
            "multiplier": 1.5,
            "final_amount": payment_amount * 1.5,
            "quality_metrics": {
                "overall_quality_score": quality_score
            }
        },
        "validation_required": 10,
        "estimated_earnings": payment_amount * 1.5,
        "tips_for_improvement": tips,
        "created_at": datetime.now().isoformat()
    }

# Trend radar endpoint
@app.get("/api/v1/performance/radar")
async def get_trend_radar(category: Optional[str] = None, time_window: int = 24):
    trends = [
        {
            "trend_id": "trend_001",
            "title": "Invisible Box Challenge Revival",
            "category": "creator_technique",
            "platform": "TikTok",
            "velocity_score": 8.5,
            "validation_count": 23,
            "hours_since_submission": 3.5,
            "potential_payout": 5.00,
            "spotter_username": "EarlyBird",
            "is_rising": True
        },
        {
            "trend_id": "trend_002",
            "title": "90s Fashion Comeback",
            "category": "visual_style",
            "platform": "Instagram",
            "velocity_score": 7.2,
            "validation_count": 18,
            "hours_since_submission": 5.0,
            "potential_payout": 3.00,
            "spotter_username": "FashionForward",
            "is_rising": True
        }
    ]
    
    if category:
        trends = [t for t in trends if t["category"] == category]
    
    return trends

@app.get("/")
async def root():
    return {
        "message": "WaveSight Performance API",
        "status": "operational",
        "endpoints": [
            "/api/v1/performance/stats",
            "/api/v1/performance/earnings/breakdown",
            "/api/v1/performance/achievements",
            "/api/v1/performance/submit",
            "/api/v1/performance/radar"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "performance-api"}

if __name__ == "__main__":
    print("🚀 Starting WaveSight Performance API on http://localhost:8001")
    print("📚 API Documentation: http://localhost:8001/docs")
    uvicorn.run(app, host="0.0.0.0", port=8001)
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime
from decimal import Decimal

from app.core.auth import get_current_user
from app.models.models import User

router = APIRouter()

# Simplified performance stats endpoint
@router.get("/stats")
async def get_performance_stats(current_user: User = Depends(get_current_user)):
    """Get user's performance statistics - simplified version"""
    
    # Mock data for now - in production this would query the database
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

@router.get("/earnings/breakdown")
async def get_earnings_breakdown(
    time_period: str = "week",
    current_user: User = Depends(get_current_user)
):
    """Get detailed breakdown of earnings - simplified version"""
    
    # Mock data for demonstration
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

@router.get("/achievements")
async def get_achievements(current_user: User = Depends(get_current_user)):
    """Get all achievements and user's progress - simplified version"""
    
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

@router.get("/challenges/weekly")
async def get_weekly_challenges(current_user: User = Depends(get_current_user)):
    """Get current weekly challenges - simplified version"""
    
    return [
        {
            "id": "ch_001",
            "title": "Music Maven",
            "description": "Spot 5 emerging music trends this week",
            "challenge_type": "category_specific",
            "requirement": {"category": "audio_music", "count": 5},
            "reward_amount": 15.00,
            "progress": 3,
            "target": 5,
            "completed": False,
            "days_remaining": 4
        },
        {
            "id": "ch_002",
            "title": "Quality First",
            "description": "Submit 10 trends with 80%+ quality score",
            "challenge_type": "quality_focused",
            "requirement": {"quality_score": 0.8, "count": 10},
            "reward_amount": 20.00,
            "progress": 7,
            "target": 10,
            "completed": False,
            "days_remaining": 4
        }
    ]

@router.get("/leaderboard")
async def get_leaderboard(metric: str = "viral_count", time_period: str = "week"):
    """Get leaderboard rankings - simplified version"""
    
    # Mock leaderboard data
    leaderboard_data = {
        "viral_count": [
            {"rank": 1, "user_id": "user_123", "username": "TrendMaster", "metric_value": 25.0, "metric_type": "viral_count", "trend": "up"},
            {"rank": 2, "user_id": "user_456", "username": "ViralHunter", "metric_value": 22.0, "metric_type": "viral_count", "trend": "stable"},
            {"rank": 3, "user_id": "user_789", "username": "SpotterPro", "metric_value": 20.0, "metric_type": "viral_count", "trend": "up"},
        ],
        "accuracy": [
            {"rank": 1, "user_id": "user_999", "username": "AccuracyKing", "metric_value": 0.92, "metric_type": "accuracy", "trend": "up"},
            {"rank": 2, "user_id": "user_888", "username": "PrecisionPro", "metric_value": 0.89, "metric_type": "accuracy", "trend": "stable"},
            {"rank": 3, "user_id": "user_777", "username": "SharpEye", "metric_value": 0.87, "metric_type": "accuracy", "trend": "down"},
        ],
        "earnings": [
            {"rank": 1, "user_id": "user_111", "username": "MoneyMaker", "metric_value": 523.25, "metric_type": "earnings", "trend": "up"},
            {"rank": 2, "user_id": "user_222", "username": "EarningsPro", "metric_value": 467.50, "metric_type": "earnings", "trend": "up"},
            {"rank": 3, "user_id": "user_333", "username": "CashFlow", "metric_value": 425.00, "metric_type": "earnings", "trend": "stable"},
        ]
    }
    
    return leaderboard_data.get(metric, leaderboard_data["viral_count"])

@router.get("/radar")
async def get_trend_radar(category: str = None, time_window: int = 24):
    """Get trending items with high velocity - simplified version"""
    
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

@router.post("/submit")
async def submit_trend_simple(
    trend_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Submit a new trend - simplified version"""
    
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
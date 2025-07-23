from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.models import User, TrendSubmission, TrendStatus, TrendCategory
from app.api.v1.auth import get_current_user

router = APIRouter()

@router.get("/")
async def get_trends(
    category: Optional[str] = Query(None, description="Filter by category"),
    timeframe: str = Query("week", description="Timeframe: day, week, month"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get trending discoveries"""
    
    # Base query for approved/viral trends
    query = db.query(TrendSubmission).filter(
        TrendSubmission.status.in_([TrendStatus.APPROVED, TrendStatus.VIRAL])
    )
    
    # Filter by category if specified
    if category and category != "all":
        try:
            category_enum = TrendCategory(category)
            query = query.filter(TrendSubmission.category == category_enum)
        except ValueError:
            pass  # Invalid category, ignore filter
    
    # Filter by timeframe
    now = datetime.utcnow()
    if timeframe == "day":
        since = now - timedelta(days=1)
    elif timeframe == "week":
        since = now - timedelta(weeks=1)
    elif timeframe == "month":
        since = now - timedelta(days=30)
    else:
        since = now - timedelta(weeks=1)  # Default to week
    
    query = query.filter(TrendSubmission.created_at >= since)
    
    # Order by validation count (popularity)
    query = query.order_by(TrendSubmission.validation_count.desc())
    
    # Execute query
    trends = query.offset(skip).limit(limit).all()
    
    # Transform to response format
    return [{
        "id": trend.id,
        "category": trend.category.value,
        "description": trend.description,
        "screenshot_url": trend.screenshot_url,
        "evidence": trend.evidence,
        "virality_prediction": trend.virality_prediction,
        "status": trend.status.value,
        "quality_score": trend.quality_score,
        "validation_count": trend.validation_count,
        "bounty_amount": trend.bounty_amount,
        "created_at": trend.created_at.isoformat() if trend.created_at else None,
        "waveScore": trend.quality_score * 10  # Convert to 0-10 scale
    } for trend in trends]

@router.get("/insights")
async def get_insights(
    timeframe: str = Query("week", description="Timeframe: day, week, month"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get trend insights"""
    
    # Get recent approved trends
    now = datetime.utcnow()
    if timeframe == "day":
        since = now - timedelta(days=1)
    elif timeframe == "week":
        since = now - timedelta(weeks=1)
    elif timeframe == "month":
        since = now - timedelta(days=30)
    else:
        since = now - timedelta(weeks=1)
    
    trends = db.query(TrendSubmission).filter(
        and_(
            TrendSubmission.status == TrendStatus.APPROVED,
            TrendSubmission.created_at >= since
        )
    ).order_by(TrendSubmission.created_at.desc()).limit(limit).all()
    
    # Transform trends into insights
    insights = []
    for trend in trends:
        impact = "high" if trend.quality_score > 0.7 else "medium" if trend.quality_score > 0.4 else "low"
        insights.append({
            "id": str(trend.id),
            "title": f"{trend.category.value.replace('_', ' ').title()} trend spotted",
            "description": trend.description,
            "category": trend.category.value,
            "impact": impact,
            "timestamp": trend.created_at.isoformat() if trend.created_at else None,
            "virality_score": trend.virality_prediction or 0,
            "validation_count": trend.validation_count
        })
    
    return insights

@router.get("/leaderboard")
async def get_leaderboard(
    timeframe: str = Query("week", description="Timeframe: week, month, all"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get top trend spotters"""
    
    # Build query based on timeframe
    query = db.query(
        User.id,
        User.username,
        User.total_earnings,
        User.trends_spotted,
        User.accuracy_score,
        func.count(TrendSubmission.id).label('recent_trends')
    ).join(
        TrendSubmission, User.id == TrendSubmission.spotter_id
    )
    
    # Filter by timeframe
    if timeframe != "all":
        now = datetime.utcnow()
        if timeframe == "week":
            since = now - timedelta(weeks=1)
        elif timeframe == "month":
            since = now - timedelta(days=30)
        else:
            since = now - timedelta(weeks=1)
        
        query = query.filter(TrendSubmission.created_at >= since)
    
    # Group and order
    leaderboard = query.group_by(
        User.id, User.username, User.total_earnings, 
        User.trends_spotted, User.accuracy_score
    ).order_by(
        User.total_earnings.desc()
    ).limit(limit).all()
    
    # Format response
    return [{
        "user_id": entry.id,
        "username": entry.username,
        "total_earnings": float(entry.total_earnings),
        "trends_spotted": entry.trends_spotted,
        "accuracy_score": float(entry.accuracy_score),
        "recent_trends": entry.recent_trends
    } for entry in leaderboard]

@router.get("/categories")
async def get_categories():
    """Get available trend categories"""
    return [{
        "value": category.value,
        "label": category.value.replace('_', ' ').title(),
        "emoji": get_category_emoji(category)
    } for category in TrendCategory]

def get_category_emoji(category: TrendCategory) -> str:
    """Get emoji for category"""
    emoji_map = {
        TrendCategory.VISUAL_STYLE: "🎨",
        TrendCategory.AUDIO_MUSIC: "🎵",
        TrendCategory.CREATOR_TECHNIQUE: "🎬",
        TrendCategory.MEME_FORMAT: "😂",
        TrendCategory.PRODUCT_BRAND: "🛍️",
        TrendCategory.BEHAVIOR_PATTERN: "📊"
    }
    return emoji_map.get(category, "🌊")

@router.post("/submit")
async def submit_trend(
    trend_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a new trend discovery"""
    
    try:
        # Create new trend submission
        new_trend = TrendSubmission(
            spotter_id=current_user.id,
            category=TrendCategory(trend_data.get("category")),
            description=trend_data.get("description"),
            screenshot_url=trend_data.get("screenshot_url"),
            evidence=trend_data.get("evidence", {}),
            virality_prediction=trend_data.get("virality_prediction"),
            quality_score=0.5,  # Default score
            bounty_amount=10.0  # Default bounty
        )
        
        db.add(new_trend)
        
        # Update user stats
        current_user.trends_spotted += 1
        
        db.commit()
        db.refresh(new_trend)
        
        return {
            "id": new_trend.id,
            "message": "Trend submitted successfully",
            "bounty_amount": new_trend.bounty_amount
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
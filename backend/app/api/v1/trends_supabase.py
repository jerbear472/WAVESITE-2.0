from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime, timedelta
from app.core.supabase_client import supabase

router = APIRouter()

@router.get("/")
async def get_trends(
    category: Optional[str] = Query(None, description="Filter by category"),
    timeframe: str = Query("week", description="Timeframe: day, week, month"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get trending discoveries from Supabase"""
    
    try:
        # Build query
        query = supabase.table('trend_submissions').select('*')
        
        # Filter by status
        query = query.in_('status', ['approved', 'viral'])
        
        # Filter by category if specified
        if category and category != "all":
            query = query.eq('category', category)
        
        # Filter by timeframe
        now = datetime.utcnow()
        if timeframe == "day":
            since = now - timedelta(days=1)
        elif timeframe == "week":
            since = now - timedelta(weeks=1)
        elif timeframe == "month":
            since = now - timedelta(days=30)
        else:
            since = now - timedelta(weeks=1)
        
        query = query.gte('created_at', since.isoformat())
        
        # Order and paginate
        query = query.order('validation_count', desc=True)
        query = query.range(skip, skip + limit - 1)
        
        # Execute query
        response = query.execute()
        
        # Return trends
        return response.data if response.data else []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insights")
async def get_insights(
    timeframe: str = Query("week", description="Timeframe: day, week, month"),
    limit: int = Query(10, ge=1, le=50),
):
    """Get trend insights from Supabase"""
    
    try:
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
        
        response = supabase.table('trend_submissions').select('*').eq(
            'status', 'approved'
        ).gte('created_at', since.isoformat()).order(
            'created_at', desc=True
        ).limit(limit).execute()
        
        trends = response.data if response.data else []
        
        # Transform trends into insights
        insights = []
        for trend in trends:
            quality_score = trend.get('quality_score', 0)
            impact = "high" if quality_score > 0.7 else "medium" if quality_score > 0.4 else "low"
            
            insights.append({
                "id": trend.get('id'),
                "category": trend.get('category'),
                "description": trend.get('description'),
                "impact": impact,
                "confidence": quality_score,
                "virality_prediction": trend.get('virality_prediction', 0),
                "validation_count": trend.get('validation_count', 0),
                "created_at": trend.get('created_at')
            })
        
        return insights
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories():
    """Get all available trend categories"""
    return [
        {"value": "visual_style", "label": "Visual Style", "emoji": "🎨"},
        {"value": "audio_music", "label": "Audio & Music", "emoji": "🎵"},
        {"value": "creator_technique", "label": "Creator Technique", "emoji": "🎬"},
        {"value": "meme_format", "label": "Meme Format", "emoji": "😂"},
        {"value": "product_brand", "label": "Product & Brand", "emoji": "🛍️"},
        {"value": "behavior_pattern", "label": "Behavior Pattern", "emoji": "👥"}
    ]
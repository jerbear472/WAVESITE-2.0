from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query
from typing import List, Optional
from datetime import datetime
import uuid

from app.core.supabase_client import get_supabase_client
from app.core.auth import get_current_user
from app.schemas.trends_updated import (
    TrendSubmissionCreate,
    TrendSubmissionResponse,
    TrendValidationCreate,
    TrendValidationResponse,
    PublicTrendResponse,
    UserTimelineResponse,
    TrendStatus,
    TrendCategory
)

router = APIRouter()

@router.post("/submit", response_model=TrendSubmissionResponse)
async def submit_trend(
    trend_data: TrendSubmissionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a new trend with social media metadata"""
    
    supabase = get_supabase_client()
    
    # Prepare trend data with new metadata fields
    trend_dict = {
        "id": str(uuid.uuid4()),
        "spotter_id": current_user["id"],
        "category": trend_data.category.value,
        "description": trend_data.description,
        "screenshot_url": trend_data.screenshot_url,
        "thumbnail_url": trend_data.thumbnail_url,
        "creator_handle": trend_data.creator_handle,
        "creator_name": trend_data.creator_name,
        "post_caption": trend_data.post_caption,
        "likes_count": trend_data.likes_count or 0,
        "comments_count": trend_data.comments_count or 0,
        "shares_count": trend_data.shares_count or 0,
        "views_count": trend_data.views_count or 0,
        "hashtags": trend_data.hashtags or [],
        "post_url": trend_data.post_url,
        "posted_at": trend_data.posted_at.isoformat() if trend_data.posted_at else None,
        "evidence": trend_data.evidence or {},
        "virality_prediction": trend_data.virality_prediction or 5,
        "wave_score": trend_data.wave_score if hasattr(trend_data, 'wave_score') else 50,
        "quality_score": 0.7,  # Default quality score
        "status": TrendStatus.SUBMITTED.value,
        "bounty_amount": 0,
        "bounty_paid": False,
        "validation_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Insert into database
    result = supabase.table("trend_submissions").insert(trend_dict).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to submit trend")
    
    # Calculate potential bounty (simplified)
    potential_bounty = 10.0  # Base amount
    if trend_dict["quality_score"] > 0.8:
        potential_bounty += 5.0
    
    response_data = result.data[0]
    response_data["potential_bounty"] = potential_bounty
    
    return TrendSubmissionResponse(**response_data)

@router.get("/public", response_model=List[PublicTrendResponse])
async def get_public_trends(
    category: Optional[TrendCategory] = None,
    limit: int = Query(50, le=100),
    offset: int = 0
):
    """Get all public trends with spotter usernames"""
    
    supabase = get_supabase_client()
    
    query = supabase.table("public_trends").select("*")
    
    if category:
        query = query.eq("category", category.value)
    
    query = query.order("created_at", desc=True).limit(limit).offset(offset)
    
    result = query.execute()
    
    if not result.data:
        return []
    
    return [PublicTrendResponse(**trend) for trend in result.data]

@router.get("/timeline", response_model=List[UserTimelineResponse])
async def get_user_timeline(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, le=100),
    offset: int = 0
):
    """Get user's personal timeline of submitted trends"""
    
    supabase = get_supabase_client()
    
    # Use the get_user_timeline function
    result = supabase.rpc(
        "get_user_timeline",
        {"user_id": current_user["id"]}
    ).execute()
    
    if not result.data:
        return []
    
    # Apply limit and offset
    data = result.data[offset:offset + limit]
    
    return [UserTimelineResponse(**trend) for trend in data]

@router.post("/validate", response_model=TrendValidationResponse)
async def validate_trend(
    validation_data: TrendValidationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Validate a trend submission"""
    
    supabase = get_supabase_client()
    
    # Check if user already validated this trend
    existing = supabase.table("trend_validations").select("*").eq(
        "trend_id", validation_data.trend_id
    ).eq("validator_id", current_user["id"]).execute()
    
    if existing.data:
        raise HTTPException(status_code=400, detail="You have already validated this trend")
    
    # Create validation
    validation_dict = {
        "id": str(uuid.uuid4()),
        "trend_id": validation_data.trend_id,
        "validator_id": current_user["id"],
        "confirmed": validation_data.confirmed,
        "evidence_url": validation_data.evidence_url,
        "notes": validation_data.notes,
        "reward_amount": 1.0 if validation_data.confirmed else 0.5,  # Simple reward logic
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("trend_validations").insert(validation_dict).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to submit validation")
    
    # Update trend validation count
    trend_result = supabase.table("trend_submissions").select("validation_count").eq(
        "id", validation_data.trend_id
    ).execute()
    
    if trend_result.data:
        new_count = trend_result.data[0]["validation_count"] + 1
        supabase.table("trend_submissions").update({
            "validation_count": new_count
        }).eq("id", validation_data.trend_id).execute()
    
    return TrendValidationResponse(**result.data[0])

@router.get("/trending/{trend_id}", response_model=PublicTrendResponse)
async def get_trend_details(trend_id: str):
    """Get detailed information about a specific trend"""
    
    supabase = get_supabase_client()
    
    result = supabase.table("public_trends").select("*").eq("id", trend_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Trend not found")
    
    return PublicTrendResponse(**result.data[0])

@router.get("/search")
async def search_trends(
    q: str = Query(..., min_length=2),
    category: Optional[TrendCategory] = None,
    limit: int = Query(20, le=50)
):
    """Search trends by keyword, hashtag, or creator"""
    
    supabase = get_supabase_client()
    
    # Search in multiple fields
    query = supabase.table("public_trends").select("*")
    
    # Add text search (would need full-text search setup in production)
    # For now, using simple ILIKE queries
    search_term = f"%{q}%"
    
    # This is a simplified search - in production you'd want proper full-text search
    results = []
    
    # Search in captions
    caption_results = query.ilike("post_caption", search_term).limit(limit).execute()
    if caption_results.data:
        results.extend(caption_results.data)
    
    # Search in creator handles
    creator_results = supabase.table("public_trends").select("*").ilike(
        "creator_handle", search_term
    ).limit(limit).execute()
    if creator_results.data:
        results.extend(creator_results.data)
    
    # Remove duplicates
    seen = set()
    unique_results = []
    for trend in results:
        if trend["id"] not in seen:
            seen.add(trend["id"])
            unique_results.append(PublicTrendResponse(**trend))
    
    return unique_results[:limit]
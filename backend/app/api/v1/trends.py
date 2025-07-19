from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import User, TrendSubmission, TrendValidation, TrendStatus, TrendCategory
from app.schemas.trends import (
    TrendSubmissionCreate, 
    TrendSubmissionResponse,
    TrendValidationCreate,
    TrendBountyCalculation
)
from app.ml.trend_analyzer import TrendAnalyzer
from app.services.bounty_service import BountyService
from app.services.storage_service import StorageService

router = APIRouter()
trend_analyzer = TrendAnalyzer()
bounty_service = BountyService()
storage_service = StorageService()


@router.post("/submit", response_model=TrendSubmissionResponse)
async def submit_trend(
    trend_data: TrendSubmissionCreate,
    screenshot: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a new trend discovery"""
    
    # Upload screenshot if provided
    screenshot_url = None
    if screenshot:
        screenshot_url = await storage_service.upload_file(
            screenshot.file,
            f"trends/{current_user.id}/{datetime.utcnow().isoformat()}"
        )
    
    # Check for duplicates
    duplicate = trend_analyzer.check_duplicate(
        trend_data.description,
        trend_data.category,
        db
    )
    
    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=f"Similar trend already submitted by user {duplicate.spotter_id}"
        )
    
    # Create trend submission
    trend = TrendSubmission(
        spotter_id=current_user.id,
        category=trend_data.category,
        description=trend_data.description,
        screenshot_url=screenshot_url,
        evidence=trend_data.evidence,
        virality_prediction=trend_data.virality_prediction,
        quality_score=trend_analyzer.calculate_quality_score(trend_data)
    )
    
    db.add(trend)
    db.commit()
    db.refresh(trend)
    
    # Queue for ML analysis
    trend_analyzer.queue_for_analysis(trend.id)
    
    # Calculate potential bounty
    potential_bounty = bounty_service.calculate_potential_bounty(trend)
    
    return TrendSubmissionResponse(
        **trend.__dict__,
        potential_bounty=potential_bounty
    )


@router.get("/validate/queue", response_model=List[TrendSubmissionResponse])
async def get_validation_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Get trends awaiting validation"""
    
    # Get trends not validated by current user
    validated_trend_ids = db.query(TrendValidation.trend_id).filter(
        TrendValidation.validator_id == current_user.id
    ).subquery()
    
    trends = db.query(TrendSubmission).filter(
        TrendSubmission.status == TrendStatus.VALIDATING,
        TrendSubmission.spotter_id != current_user.id,
        ~TrendSubmission.id.in_(validated_trend_ids)
    ).order_by(
        TrendSubmission.quality_score.desc()
    ).limit(limit).all()
    
    return trends


@router.post("/validate/{trend_id}")
async def validate_trend(
    trend_id: int,
    validation: TrendValidationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate a trend submission"""
    
    trend = db.query(TrendSubmission).filter(
        TrendSubmission.id == trend_id
    ).first()
    
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    
    if trend.spotter_id == current_user.id:
        raise HTTPException(
            status_code=400, 
            detail="Cannot validate your own trend"
        )
    
    # Check if already validated
    existing = db.query(TrendValidation).filter(
        TrendValidation.trend_id == trend_id,
        TrendValidation.validator_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already validated this trend"
        )
    
    # Create validation
    validation_record = TrendValidation(
        trend_id=trend_id,
        validator_id=current_user.id,
        confirmed=validation.confirmed,
        evidence_url=validation.evidence_url,
        notes=validation.notes,
        reward_amount=2.0 if validation.confirmed else 0.5
    )
    
    db.add(validation_record)
    
    # Update trend validation count
    trend.validation_count += 1
    
    # Check if enough validations to approve
    if trend.validation_count >= 10:
        positive_validations = db.query(TrendValidation).filter(
            TrendValidation.trend_id == trend_id,
            TrendValidation.confirmed == True
        ).count()
        
        if positive_validations >= 7:
            trend.status = TrendStatus.APPROVED
            trend.validated_at = datetime.utcnow()
            
            # Calculate and assign bounty
            bounty = bounty_service.calculate_final_bounty(trend, db)
            trend.bounty_amount = bounty
    
    # Update user stats
    current_user.validation_score = (
        current_user.validation_score * 0.95 + 
        (1.0 if validation.confirmed else 0.5) * 0.05
    )
    
    db.commit()
    
    return {
        "status": "success",
        "reward": validation_record.reward_amount,
        "trend_status": trend.status
    }


@router.get("/trending", response_model=List[TrendSubmissionResponse])
async def get_trending(
    category: Optional[str] = None,
    timeframe: str = "week",
    db: Session = Depends(get_db)
):
    """Get currently trending discoveries"""
    
    timeframe_map = {
        "day": timedelta(days=1),
        "week": timedelta(days=7),
        "month": timedelta(days=30)
    }
    
    since = datetime.utcnow() - timeframe_map.get(timeframe, timedelta(days=7))
    
    query = db.query(TrendSubmission).filter(
        TrendSubmission.status == TrendStatus.APPROVED,
        TrendSubmission.validated_at >= since
    )
    
    if category:
        query = query.filter(TrendSubmission.category == category)
    
    trends = query.order_by(
        TrendSubmission.validation_count.desc(),
        TrendSubmission.quality_score.desc()
    ).limit(50).all()
    
    return trends


@router.get("/leaderboard")
async def get_leaderboard(
    timeframe: str = "month",
    db: Session = Depends(get_db)
):
    """Get trend spotter leaderboard"""
    
    timeframe_map = {
        "week": timedelta(days=7),
        "month": timedelta(days=30),
        "all": timedelta(days=36500)  # ~100 years
    }
    
    since = datetime.utcnow() - timeframe_map.get(timeframe, timedelta(days=30))
    
    # Top earners
    top_earners = db.query(
        User.username,
        User.trends_spotted,
        User.accuracy_score,
        func.sum(TrendSubmission.bounty_amount).label("total_earnings")
    ).join(
        TrendSubmission
    ).filter(
        TrendSubmission.created_at >= since,
        TrendSubmission.bounty_paid == True
    ).group_by(
        User.id
    ).order_by(
        func.sum(TrendSubmission.bounty_amount).desc()
    ).limit(20).all()
    
    # Category specialists
    category_leaders = {}
    for category in TrendCategory:
        leaders = db.query(
            User.username,
            func.count(TrendSubmission.id).label("trends_count")
        ).join(
            TrendSubmission
        ).filter(
            TrendSubmission.category == category,
            TrendSubmission.status == TrendStatus.APPROVED,
            TrendSubmission.created_at >= since
        ).group_by(
            User.id
        ).order_by(
            func.count(TrendSubmission.id).desc()
        ).limit(5).all()
        
        category_leaders[category.value] = leaders
    
    return {
        "top_earners": top_earners,
        "category_leaders": category_leaders,
        "timeframe": timeframe
    }
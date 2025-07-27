from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.performance_trends import (
    TrendSubmissionRequest,
    TrendSubmissionResponse,
    UserPerformanceStats,
    EarningsBreakdown,
    TrendValidationUpdate,
    Achievement,
    WeeklyChallenge,
    LeaderboardEntry,
    TrendRadarItem,
    QualityFeedback,
    TrendQualityMetrics,
    TrendPaymentInfo,
    PaymentTier
)
from app.models.models import User, TrendSubmission
from app.services.quality_scorer import QualityScorer
from app.services.payment_calculator import PaymentCalculator

router = APIRouter()

# Initialize services
quality_scorer = QualityScorer()
payment_calculator = PaymentCalculator()

@router.post("/submit", response_model=TrendSubmissionResponse)
async def submit_trend(
    trend_data: TrendSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a new trend for validation and potential earnings.
    Quality is evaluated immediately and feedback is provided.
    """
    try:
        # Calculate quality metrics
        quality_metrics = quality_scorer.evaluate_submission(trend_data)
        
        # Check if this is a duplicate or first submission
        is_first_spotter = not db.query(TrendSubmission).filter(
            TrendSubmission.url == trend_data.url
        ).first()
        
        # Calculate potential payment
        payment_info = payment_calculator.calculate_potential_payment(
            quality_metrics=quality_metrics,
            is_first_spotter=is_first_spotter,
            user_streak_multiplier=current_user.streak_multiplier
        )
        
        # Create trend submission
        trend_submission = TrendSubmission(
            id=uuid.uuid4(),
            spotter_id=current_user.id,
            title=trend_data.title,
            description=trend_data.description,
            category=trend_data.category,
            platform=trend_data.platform,
            url=trend_data.url,
            creator_handle=trend_data.creator_handle,
            hashtags=trend_data.hashtags,
            engagement_metrics=trend_data.engagement_metrics,
            media_preview_url=trend_data.media_preview_url,
            quality_score_v2=quality_metrics.overall_quality_score,
            is_first_spotter=is_first_spotter,
            payment_status='pending'
        )
        
        db.add(trend_submission)
        
        # Add quality metrics record
        quality_record = TrendQualityMetric(
            trend_id=trend_submission.id,
            **quality_metrics.dict()
        )
        db.add(quality_record)
        
        # Update user stats
        if quality_metrics.overall_quality_score >= 0.70:
            current_user.quality_submissions += 1
            if is_first_spotter:
                current_user.first_spotter_bonus_count += 1
        
        db.commit()
        
        # Generate improvement tips
        tips = []
        if not quality_metrics.has_description or quality_metrics.description_length < 50:
            tips.append("Add a detailed description (50+ characters) explaining why this trend matters")
        if quality_metrics.hashtag_count < 3:
            tips.append("Include at least 3 relevant hashtags to improve discoverability")
        if not quality_metrics.has_engagement_metrics:
            tips.append("Add engagement metrics (likes, shares, views) for better validation")
        if not quality_metrics.has_creator_info:
            tips.append("Include the creator's handle for attribution")
        
        return TrendSubmissionResponse(
            id=trend_submission.id,
            status="submitted",
            quality_score=quality_metrics.overall_quality_score,
            payment_info=payment_info,
            validation_required=10,  # Minimum validations needed
            estimated_earnings=payment_info.final_amount,
            tips_for_improvement=tips,
            created_at=trend_submission.created_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance/stats", response_model=UserPerformanceStats)
async def get_performance_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's performance statistics and earnings potential"""
    
    # Calculate next milestone
    next_milestone = None
    if current_user.viral_trends_spotted < 10:
        next_milestone = {
            "name": "Trend Scout",
            "requirement": f"Spot {10 - current_user.viral_trends_spotted} more viral trends",
            "reward": "$10.00 bonus"
        }
    elif current_user.viral_trends_spotted < 50:
        next_milestone = {
            "name": "Viral Hunter", 
            "requirement": f"Spot {50 - current_user.viral_trends_spotted} more viral trends",
            "reward": "$50.00 bonus"
        }
    
    return UserPerformanceStats(
        trend_earnings=current_user.trend_earnings,
        pending_payouts=current_user.pending_payouts,
        viral_trends_spotted=current_user.viral_trends_spotted,
        validated_trends=current_user.validated_trends,
        quality_submissions=current_user.quality_submissions,
        first_spotter_bonus_count=current_user.first_spotter_bonus_count,
        trend_accuracy_rate=current_user.trend_accuracy_rate,
        streak_days=current_user.streak_days,
        streak_multiplier=current_user.streak_multiplier,
        next_milestone=next_milestone
    )

@router.get("/earnings/breakdown", response_model=EarningsBreakdown)
async def get_earnings_breakdown(
    time_period: str = Query("all", regex="^(week|month|all)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed breakdown of earnings by category and time period"""
    
    # Calculate date filter
    date_filter = None
    if time_period == "week":
        date_filter = datetime.utcnow() - timedelta(days=7)
    elif time_period == "month":
        date_filter = datetime.utcnow() - timedelta(days=30)
    
    # Query earnings ledger
    query = db.query(EarningsLedger).filter(EarningsLedger.user_id == current_user.id)
    if date_filter:
        query = query.filter(EarningsLedger.created_at >= date_filter)
    
    earnings = query.all()
    
    # Calculate breakdown
    breakdown = {
        "viral_trend_earnings": Decimal("0.00"),
        "validated_trend_earnings": Decimal("0.00"),
        "quality_submission_earnings": Decimal("0.00"),
        "first_spotter_bonuses": Decimal("0.00"),
        "streak_bonuses": Decimal("0.00"),
        "achievement_bonuses": Decimal("0.00"),
        "challenge_rewards": Decimal("0.00")
    }
    
    recent_payments = []
    total_earnings = Decimal("0.00")
    pending_earnings = Decimal("0.00")
    paid_earnings = Decimal("0.00")
    
    for earning in earnings:
        if earning.payment_type == "trend_reward":
            if "viral" in earning.description.lower():
                breakdown["viral_trend_earnings"] += earning.final_amount
            elif "validated" in earning.description.lower():
                breakdown["validated_trend_earnings"] += earning.final_amount
            elif "quality" in earning.description.lower():
                breakdown["quality_submission_earnings"] += earning.final_amount
            
            if earning.multiplier > 1:
                bonus_amount = earning.final_amount - earning.amount
                breakdown["first_spotter_bonuses"] += bonus_amount
        
        elif earning.payment_type == "streak_bonus":
            breakdown["streak_bonuses"] += earning.final_amount
        elif earning.payment_type == "achievement_bonus":
            breakdown["achievement_bonuses"] += earning.final_amount
        elif earning.payment_type == "challenge_reward":
            breakdown["challenge_rewards"] += earning.final_amount
        
        total_earnings += earning.final_amount
        
        if earning.status == "pending":
            pending_earnings += earning.final_amount
        elif earning.status == "paid":
            paid_earnings += earning.final_amount
        
        # Add to recent payments
        if len(recent_payments) < 10:
            recent_payments.append({
                "id": str(earning.id),
                "type": earning.payment_type,
                "description": earning.description,
                "amount": float(earning.final_amount),
                "date": earning.created_at.isoformat(),
                "status": earning.status
            })
    
    # Calculate next payout (weekly on Fridays)
    today = datetime.utcnow().date()
    days_until_friday = (4 - today.weekday()) % 7
    if days_until_friday == 0:
        days_until_friday = 7
    next_payout_date = today + timedelta(days=days_until_friday)
    
    return EarningsBreakdown(
        total_earnings=total_earnings,
        pending_earnings=pending_earnings,
        paid_earnings=paid_earnings,
        viral_trend_earnings=breakdown["viral_trend_earnings"],
        validated_trend_earnings=breakdown["validated_trend_earnings"],
        quality_submission_earnings=breakdown["quality_submission_earnings"],
        first_spotter_bonuses=breakdown["first_spotter_bonuses"],
        streak_bonuses=breakdown["streak_bonuses"],
        achievement_bonuses=breakdown["achievement_bonuses"],
        challenge_rewards=breakdown["challenge_rewards"],
        recent_payments=recent_payments,
        next_payout_date=datetime.combine(next_payout_date, datetime.min.time()),
        next_payout_amount=pending_earnings
    )

@router.get("/achievements", response_model=List[Achievement])
async def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all achievements and user's progress"""
    
    # Get all achievements
    achievements = db.query(AchievementModel).all()
    
    # Get user's earned achievements
    earned_achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id
    ).all()
    earned_ids = {ea.achievement_id for ea in earned_achievements}
    
    result = []
    for achievement in achievements:
        # Calculate progress based on requirement type
        progress = 0
        if achievement.requirement_type == "viral_count":
            progress = current_user.viral_trends_spotted
        elif achievement.requirement_type == "accuracy_rate":
            progress = int(current_user.trend_accuracy_rate * 100)
        elif achievement.requirement_type == "streak_days":
            progress = current_user.streak_days
        elif achievement.requirement_type == "first_spotter_count":
            progress = current_user.first_spotter_bonus_count
        
        earned = achievement.id in earned_ids
        earned_at = None
        if earned:
            earned_record = next(ea for ea in earned_achievements if ea.achievement_id == achievement.id)
            earned_at = earned_record.earned_at
        
        result.append(Achievement(
            id=achievement.id,
            name=achievement.name,
            description=achievement.description,
            icon_emoji=achievement.icon_emoji,
            requirement_type=achievement.requirement_type,
            requirement_value=achievement.requirement_value,
            reward_amount=achievement.reward_amount,
            progress=progress,
            earned=earned,
            earned_at=earned_at
        ))
    
    return result

@router.get("/challenges/weekly", response_model=List[WeeklyChallenge])
async def get_weekly_challenges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current weekly challenges and progress"""
    
    # Get active challenges
    today = datetime.utcnow().date()
    challenges = db.query(WeeklyChallengeModel).filter(
        WeeklyChallengeModel.is_active == True,
        WeeklyChallengeModel.week_start <= today,
        WeeklyChallengeModel.week_end >= today
    ).all()
    
    result = []
    for challenge in challenges:
        # Get user's progress
        progress_record = db.query(UserChallengeProgress).filter(
            UserChallengeProgress.user_id == current_user.id,
            UserChallengeProgress.challenge_id == challenge.id
        ).first()
        
        progress = progress_record.progress if progress_record else 0
        completed = progress_record.completed if progress_record else False
        
        # Extract target from requirement JSON
        target = challenge.requirement.get("target", 10)
        
        days_remaining = (challenge.week_end - today).days
        
        result.append(WeeklyChallenge(
            id=challenge.id,
            title=challenge.title,
            description=challenge.description,
            challenge_type=challenge.challenge_type,
            requirement=challenge.requirement,
            reward_amount=challenge.reward_amount,
            progress=progress,
            target=target,
            completed=completed,
            days_remaining=days_remaining
        ))
    
    return result

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    metric: str = Query("viral_count", regex="^(viral_count|accuracy|earnings|streak)$"),
    time_period: str = Query("week", regex="^(week|month|all)$"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get leaderboard rankings for different metrics"""
    
    # Calculate date filter
    date_filter = None
    if time_period == "week":
        date_filter = datetime.utcnow() - timedelta(days=7)
    elif time_period == "month":
        date_filter = datetime.utcnow() - timedelta(days=30)
    
    # Build query based on metric
    if metric == "viral_count":
        # Count viral trends in time period
        query = db.query(
            User.id,
            User.username,
            func.count(TrendSubmission.id).label("metric_value")
        ).join(
            TrendSubmission, User.id == TrendSubmission.spotter_id
        ).filter(
            TrendSubmission.payment_status == "paid",
            TrendSubmission.payment_tier_id.in_(
                db.query(PaymentTierModel.id).filter(
                    PaymentTierModel.tier_type == "viral"
                )
            )
        )
        
        if date_filter:
            query = query.filter(TrendSubmission.viral_date >= date_filter)
        
        query = query.group_by(User.id, User.username).order_by(
            func.count(TrendSubmission.id).desc()
        ).limit(limit)
        
    elif metric == "accuracy":
        query = db.query(
            User.id,
            User.username,
            User.trend_accuracy_rate.label("metric_value")
        ).filter(
            User.viral_trends_spotted > 0  # Only include users with at least one viral trend
        ).order_by(User.trend_accuracy_rate.desc()).limit(limit)
        
    elif metric == "earnings":
        query = db.query(
            User.id,
            User.username,
            func.sum(EarningsLedger.final_amount).label("metric_value")
        ).join(
            EarningsLedger, User.id == EarningsLedger.user_id
        ).filter(
            EarningsLedger.status.in_(["confirmed", "paid"])
        )
        
        if date_filter:
            query = query.filter(EarningsLedger.created_at >= date_filter)
        
        query = query.group_by(User.id, User.username).order_by(
            func.sum(EarningsLedger.final_amount).desc()
        ).limit(limit)
        
    elif metric == "streak":
        query = db.query(
            User.id,
            User.username,
            User.streak_days.label("metric_value")
        ).order_by(User.streak_days.desc()).limit(limit)
    
    results = query.all()
    
    # Build leaderboard entries
    entries = []
    prev_value = None
    for idx, result in enumerate(results):
        # Determine trend
        trend = "stable"
        if idx < len(results) - 1:
            if result.metric_value > prev_value:
                trend = "up"
            elif result.metric_value < prev_value:
                trend = "down"
        
        entries.append(LeaderboardEntry(
            rank=idx + 1,
            user_id=result.id,
            username=result.username,
            metric_value=float(result.metric_value),
            metric_type=metric,
            trend=trend,
            avatar_url=None  # TODO: Add avatar support
        ))
        
        prev_value = result.metric_value
    
    return entries

@router.get("/radar", response_model=List[TrendRadarItem])
async def get_trend_radar(
    category: Optional[str] = None,
    time_window: int = Query(24, ge=1, le=168),  # Hours
    db: Session = Depends(get_db)
):
    """Get trending items with high velocity and validation activity"""
    
    cutoff_time = datetime.utcnow() - timedelta(hours=time_window)
    
    query = db.query(TrendSubmission).filter(
        TrendSubmission.created_at >= cutoff_time,
        TrendSubmission.status == "validating"
    )
    
    if category:
        query = query.filter(TrendSubmission.category == category)
    
    trends = query.all()
    
    radar_items = []
    for trend in trends:
        # Calculate velocity score (validations per hour)
        hours_since = (datetime.utcnow() - trend.created_at).total_seconds() / 3600
        velocity_score = trend.validation_count / max(hours_since, 0.1)
        
        # Determine if rising (compare recent vs overall velocity)
        recent_validations = db.query(TrendValidation).filter(
            TrendValidation.trend_id == trend.id,
            TrendValidation.created_at >= datetime.utcnow() - timedelta(hours=1)
        ).count()
        
        recent_velocity = recent_validations / 1.0
        is_rising = recent_velocity > velocity_score
        
        # Calculate potential payout
        if trend.validation_count >= 10 and trend.validation_score >= 0.7:
            potential_payout = Decimal("0.50")  # Validated trend
            
            # Check viral potential
            if velocity_score > 10:  # High velocity
                potential_payout = Decimal("5.00")  # Likely to go viral
        else:
            potential_payout = Decimal("0.25")  # Quality submission
        
        radar_items.append(TrendRadarItem(
            trend_id=trend.id,
            title=trend.title,
            category=trend.category,
            platform=trend.platform,
            velocity_score=velocity_score,
            validation_count=trend.validation_count,
            hours_since_submission=hours_since,
            potential_payout=potential_payout,
            spotter_username=trend.spotter.username,
            is_rising=is_rising
        ))
    
    # Sort by velocity score
    radar_items.sort(key=lambda x: x.velocity_score, reverse=True)
    
    return radar_items[:20]  # Top 20 trends

@router.get("/feedback/{trend_id}", response_model=QualityFeedback)
async def get_quality_feedback(
    trend_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed quality feedback for a specific trend submission"""
    
    # Get trend and verify ownership
    trend = db.query(TrendSubmission).filter(
        TrendSubmission.id == trend_id,
        TrendSubmission.spotter_id == current_user.id
    ).first()
    
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    
    # Get quality metrics
    metrics = db.query(TrendQualityMetric).filter(
        TrendQualityMetric.trend_id == trend_id
    ).first()
    
    if not metrics:
        raise HTTPException(status_code=404, detail="Quality metrics not found")
    
    # Generate feedback
    missing_elements = []
    suggestions = []
    
    if not metrics.has_description or metrics.description_length < 50:
        missing_elements.append("Detailed description")
        suggestions.append("Write a compelling description (50+ characters) explaining why this trend is significant")
    
    if metrics.hashtag_count < 3:
        missing_elements.append("Sufficient hashtags")
        suggestions.append("Add 3-5 relevant hashtags to improve categorization and discovery")
    
    if not metrics.has_engagement_metrics:
        missing_elements.append("Engagement metrics")
        suggestions.append("Include view counts, likes, shares, or comments to validate trend momentum")
    
    if not metrics.has_creator_info:
        missing_elements.append("Creator attribution")
        suggestions.append("Add the creator's handle (@username) for proper attribution")
    
    if not metrics.has_media_preview:
        missing_elements.append("Media preview")
        suggestions.append("Include a screenshot or thumbnail for visual context")
    
    # Get examples of good submissions
    good_examples = db.query(TrendSubmission).filter(
        TrendSubmission.quality_score_v2 >= 0.90,
        TrendSubmission.category == trend.category
    ).limit(3).all()
    
    examples = []
    for example in good_examples:
        examples.append({
            "title": example.title,
            "description_preview": example.description[:100] + "...",
            "quality_score": float(example.quality_score_v2),
            "earnings": float(example.payment_amount)
        })
    
    # Calculate potential earnings if improved
    current_potential = payment_calculator.calculate_potential_payment(
        quality_metrics=metrics,
        is_first_spotter=trend.is_first_spotter,
        user_streak_multiplier=current_user.streak_multiplier
    ).final_amount
    
    perfect_metrics = TrendQualityMetrics(
        has_title=True,
        has_description=True,
        has_category=True,
        has_platform=True,
        has_creator_info=True,
        has_hashtags=True,
        has_engagement_metrics=True,
        has_media_preview=True,
        description_length=200,
        hashtag_count=5,
        media_quality_score=1.0,
        overall_quality_score=1.0
    )
    
    improved_potential = payment_calculator.calculate_potential_payment(
        quality_metrics=perfect_metrics,
        is_first_spotter=trend.is_first_spotter,
        user_streak_multiplier=current_user.streak_multiplier
    ).final_amount
    
    return QualityFeedback(
        trend_id=trend_id,
        quality_score=metrics.overall_quality_score,
        missing_elements=missing_elements,
        improvement_suggestions=suggestions,
        examples_of_good_submissions=examples,
        potential_earnings_if_improved=improved_potential - current_potential
    )
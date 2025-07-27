from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal
from uuid import UUID

# Payment tier enums
PaymentTierType = Literal["viral", "validated", "quality", "first_spotter"]
PaymentStatus = Literal["pending", "qualified", "paid", "rejected"]
PaymentType = Literal["trend_reward", "streak_bonus", "challenge_reward", "achievement_bonus"]

class TrendQualityMetrics(BaseModel):
    """Metrics for evaluating trend submission quality"""
    has_title: bool = False
    has_description: bool = False
    has_category: bool = False
    has_platform: bool = False
    has_creator_info: bool = False
    has_hashtags: bool = False
    has_engagement_metrics: bool = False
    has_media_preview: bool = False
    description_length: int = 0
    hashtag_count: int = 0
    media_quality_score: float = 0.0
    overall_quality_score: float = 0.0

class TrendSubmissionRequest(BaseModel):
    """Request model for submitting a new trend"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20, max_length=1000)
    category: str
    platform: str
    url: str
    creator_handle: Optional[str] = None
    hashtags: List[str] = []
    engagement_metrics: Optional[dict] = None
    media_preview_url: Optional[str] = None
    additional_context: Optional[str] = None

class PaymentTier(BaseModel):
    """Payment tier configuration"""
    id: UUID
    tier_name: str
    tier_type: PaymentTierType
    payout_amount: Decimal
    description: str
    requirements: dict

class TrendPaymentInfo(BaseModel):
    """Payment information for a trend"""
    payment_tier: Optional[PaymentTier] = None
    payment_status: PaymentStatus = "pending"
    payment_amount: Decimal = Decimal("0.00")
    is_first_spotter: bool = False
    multiplier: Decimal = Decimal("1.00")
    final_amount: Decimal = Decimal("0.00")
    quality_metrics: TrendQualityMetrics

class TrendSubmissionResponse(BaseModel):
    """Response after submitting a trend"""
    id: UUID
    status: str
    quality_score: float
    payment_info: TrendPaymentInfo
    validation_required: int
    estimated_earnings: Decimal
    tips_for_improvement: List[str]
    created_at: datetime

class UserPerformanceStats(BaseModel):
    """User's performance-based statistics"""
    trend_earnings: Decimal
    pending_payouts: Decimal
    viral_trends_spotted: int
    validated_trends: int
    quality_submissions: int
    first_spotter_bonus_count: int
    trend_accuracy_rate: float
    streak_days: int
    streak_multiplier: float
    next_milestone: Optional[dict] = None

class EarningsBreakdown(BaseModel):
    """Detailed earnings breakdown"""
    total_earnings: Decimal
    pending_earnings: Decimal
    paid_earnings: Decimal
    
    # Breakdown by type
    viral_trend_earnings: Decimal
    validated_trend_earnings: Decimal
    quality_submission_earnings: Decimal
    first_spotter_bonuses: Decimal
    streak_bonuses: Decimal
    achievement_bonuses: Decimal
    challenge_rewards: Decimal
    
    # Recent transactions
    recent_payments: List[dict]
    
    # Next payout info
    next_payout_date: Optional[datetime] = None
    next_payout_amount: Decimal

class TrendValidationUpdate(BaseModel):
    """Update when a trend's validation status changes"""
    trend_id: UUID
    new_status: str
    validation_count: int
    validation_score: float
    payment_qualified: bool
    estimated_payout: Decimal
    viral_probability: float

class Achievement(BaseModel):
    """Achievement definition"""
    id: UUID
    name: str
    description: str
    icon_emoji: str
    requirement_type: str
    requirement_value: int
    reward_amount: Decimal
    progress: Optional[int] = 0
    earned: bool = False
    earned_at: Optional[datetime] = None

class WeeklyChallenge(BaseModel):
    """Weekly challenge information"""
    id: UUID
    title: str
    description: str
    challenge_type: str
    requirement: dict
    reward_amount: Decimal
    progress: int = 0
    target: int
    completed: bool = False
    days_remaining: int

class LeaderboardEntry(BaseModel):
    """Leaderboard entry for competitive elements"""
    rank: int
    user_id: UUID
    username: str
    metric_value: float
    metric_type: str  # "accuracy", "viral_count", "earnings", etc.
    trend: str  # "up", "down", "stable"
    avatar_url: Optional[str] = None

class TrendRadarItem(BaseModel):
    """Trending item for the trend radar"""
    trend_id: UUID
    title: str
    category: str
    platform: str
    velocity_score: float
    validation_count: int
    hours_since_submission: float
    potential_payout: Decimal
    spotter_username: str
    is_rising: bool

class QualityFeedback(BaseModel):
    """Feedback for improving trend submissions"""
    trend_id: UUID
    quality_score: float
    missing_elements: List[str]
    improvement_suggestions: List[str]
    examples_of_good_submissions: List[dict]
    potential_earnings_if_improved: Decimal
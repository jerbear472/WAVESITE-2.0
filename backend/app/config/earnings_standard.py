"""
EARNINGS STANDARD - Python Implementation
Version: 1.0.0
Date: 2025-01-11

This file mirrors the TypeScript EARNINGS_STANDARD.ts configuration
to ensure consistency across frontend and backend systems.
"""

from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, TypedDict
from dataclasses import dataclass


# ============================================
# ENUMS AND TYPE DEFINITIONS
# ============================================

class SpotterTier(str, Enum):
    ELITE = "elite"
    VERIFIED = "verified"
    LEARNING = "learning"
    RESTRICTED = "restricted"


class EarningType(str, Enum):
    TREND_SUBMISSION = "trend_submission"
    TREND_VALIDATION = "trend_validation"
    APPROVAL_BONUS = "approval_bonus"
    SCROLL_SESSION = "scroll_session"
    CHALLENGE = "challenge"
    REFERRAL = "referral"


class EarningStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


@dataclass
class EarningBreakdown:
    base: Decimal
    quality_bonuses: Dict[str, Decimal]
    performance_bonuses: Dict[str, Decimal]
    tier_multiplier: Decimal
    streak_multiplier: Decimal
    total: Decimal
    capped: bool


@dataclass
class EarningCalculation:
    base_amount: Decimal
    bonus_amount: Decimal
    tier_multiplier: Decimal
    streak_multiplier: Decimal
    final_amount: Decimal
    applied_bonuses: List[str]
    breakdown: EarningBreakdown


# ============================================
# EARNINGS CONFIGURATION
# ============================================

class EarningsStandard:
    """Centralized earnings configuration matching EARNINGS_STANDARD.ts"""
    
    VERSION = "1.0.0"
    
    # Base earning rates (in USD)
    BASE_RATES = {
        "TREND_SUBMISSION": Decimal("1.00"),
        "VALIDATION_VOTE": Decimal("0.10"),
        "APPROVAL_BONUS": Decimal("0.50"),
        "SCROLL_SESSION": Decimal("0.00"),
    }
    
    # Quality bonuses
    QUALITY_BONUSES = {
        "SCREENSHOT": Decimal("0.15"),
        "COMPLETE_INFO": Decimal("0.10"),
        "DEMOGRAPHICS": Decimal("0.10"),
        "SUBCULTURES": Decimal("0.10"),
        "MULTI_PLATFORM": Decimal("0.10"),
        "CREATOR_INFO": Decimal("0.05"),
        "RICH_HASHTAGS": Decimal("0.05"),
        "CAPTION_PROVIDED": Decimal("0.05"),
    }
    
    # Performance bonuses
    PERFORMANCE_BONUSES = {
        "VIRAL_CONTENT": Decimal("0.50"),  # 1M+ views
        "HIGH_VIEWS": Decimal("0.25"),      # 100k-999k views
        "HIGH_ENGAGEMENT": Decimal("0.20"),  # >10% engagement
        "HIGH_WAVE_SCORE": Decimal("0.20"),  # Wave score > 70
        "FINANCE_TREND": Decimal("0.10"),
        "TRENDING_CATEGORY": Decimal("0.10"),
    }
    
    # Tier multipliers
    TIER_MULTIPLIERS = {
        SpotterTier.ELITE: Decimal("1.5"),
        SpotterTier.VERIFIED: Decimal("1.0"),
        SpotterTier.LEARNING: Decimal("0.7"),
        SpotterTier.RESTRICTED: Decimal("0.3"),
    }
    
    # Streak multipliers
    STREAK_MULTIPLIERS = {
        0: Decimal("1.0"),
        1: Decimal("1.0"),
        2: Decimal("1.2"),
        3: Decimal("1.5"),
        5: Decimal("2.0"),
        10: Decimal("2.5"),
        15: Decimal("3.0"),
    }
    
    # System limits
    LIMITS = {
        "MAX_SINGLE_SUBMISSION": Decimal("3.00"),
        "MAX_DAILY_EARNINGS": Decimal("50.00"),
        "MIN_CASHOUT_AMOUNT": Decimal("5.00"),
        "STREAK_WINDOW_MINUTES": 5,
    }
    
    # Validation requirements
    VALIDATION = {
        "VOTES_TO_APPROVE": 2,
        "VOTES_TO_REJECT": 2,
        "MAX_VOTE_EARNINGS_DAILY": Decimal("10.00"),
    }
    
    # Processing settings
    PROCESSING = {
        "CASHOUT_HOURS": "24-48",
        "PAYMENT_METHODS": ["venmo", "paypal", "bank_transfer"],
    }


# ============================================
# CALCULATION FUNCTIONS
# ============================================

def get_streak_multiplier(streak_count: int) -> Decimal:
    """Get the multiplier for a given streak count"""
    multipliers = EarningsStandard.STREAK_MULTIPLIERS
    
    # Find the highest applicable multiplier
    for streak_threshold in sorted(multipliers.keys(), reverse=True):
        if streak_count >= streak_threshold:
            return multipliers[streak_threshold]
    
    return Decimal("1.0")


def calculate_trend_submission_earnings(
    trend_data: dict,
    spotter_tier: SpotterTier = SpotterTier.LEARNING,
    streak_count: int = 0
) -> EarningCalculation:
    """
    Calculate earnings for a trend submission
    
    Args:
        trend_data: Dictionary containing trend submission data
        spotter_tier: The tier of the spotter
        streak_count: Current submission streak
    
    Returns:
        EarningCalculation with complete breakdown
    """
    
    # Initialize breakdown
    breakdown = EarningBreakdown(
        base=EarningsStandard.BASE_RATES["TREND_SUBMISSION"],
        quality_bonuses={},
        performance_bonuses={},
        tier_multiplier=EarningsStandard.TIER_MULTIPLIERS[spotter_tier],
        streak_multiplier=get_streak_multiplier(streak_count),
        total=Decimal("0"),
        capped=False
    )
    
    applied_bonuses = []
    
    # Apply quality bonuses
    if trend_data.get("screenshot_url"):
        breakdown.quality_bonuses["screenshot"] = EarningsStandard.QUALITY_BONUSES["SCREENSHOT"]
        applied_bonuses.append("📸 Screenshot")
    
    if (trend_data.get("trend_name") and 
        trend_data.get("description") and 
        len(trend_data.get("description", "")) > 20):
        breakdown.quality_bonuses["complete_info"] = EarningsStandard.QUALITY_BONUSES["COMPLETE_INFO"]
        applied_bonuses.append("📝 Complete Info")
    
    if trend_data.get("age_ranges") and len(trend_data.get("age_ranges", [])) > 0:
        breakdown.quality_bonuses["demographics"] = EarningsStandard.QUALITY_BONUSES["DEMOGRAPHICS"]
        applied_bonuses.append("👥 Demographics")
    
    if trend_data.get("subcultures") and len(trend_data.get("subcultures", [])) > 0:
        breakdown.quality_bonuses["subcultures"] = EarningsStandard.QUALITY_BONUSES["SUBCULTURES"]
        applied_bonuses.append("🎭 Subcultures")
    
    if trend_data.get("other_platforms") and len(trend_data.get("other_platforms", [])) > 0:
        breakdown.quality_bonuses["multi_platform"] = EarningsStandard.QUALITY_BONUSES["MULTI_PLATFORM"]
        applied_bonuses.append("🌐 Multi-Platform")
    
    if trend_data.get("creator_handle"):
        breakdown.quality_bonuses["creator_info"] = EarningsStandard.QUALITY_BONUSES["CREATOR_INFO"]
        applied_bonuses.append("👤 Creator Info")
    
    if trend_data.get("hashtags") and len(trend_data.get("hashtags", [])) >= 3:
        breakdown.quality_bonuses["rich_hashtags"] = EarningsStandard.QUALITY_BONUSES["RICH_HASHTAGS"]
        applied_bonuses.append("#️⃣ Hashtags")
    
    if trend_data.get("post_caption") and len(trend_data.get("post_caption", "")) > 10:
        breakdown.quality_bonuses["caption"] = EarningsStandard.QUALITY_BONUSES["CAPTION_PROVIDED"]
        applied_bonuses.append("💬 Caption")
    
    # Apply performance bonuses
    views_count = trend_data.get("views_count", 0)
    if views_count >= 1000000:
        breakdown.performance_bonuses["viral"] = EarningsStandard.PERFORMANCE_BONUSES["VIRAL_CONTENT"]
        applied_bonuses.append("🔥 Viral (1M+ views)")
    elif views_count >= 100000:
        breakdown.performance_bonuses["high_views"] = EarningsStandard.PERFORMANCE_BONUSES["HIGH_VIEWS"]
        applied_bonuses.append("👀 High Views (100k+)")
    
    # Engagement rate bonus
    if views_count > 0 and trend_data.get("likes_count", 0) > 0:
        engagement_rate = trend_data["likes_count"] / views_count
        if engagement_rate > 0.1:
            breakdown.performance_bonuses["high_engagement"] = EarningsStandard.PERFORMANCE_BONUSES["HIGH_ENGAGEMENT"]
            applied_bonuses.append("💯 High Engagement")
    
    # Wave score bonus
    if trend_data.get("wave_score", 0) > 70:
        breakdown.performance_bonuses["high_wave"] = EarningsStandard.PERFORMANCE_BONUSES["HIGH_WAVE_SCORE"]
        applied_bonuses.append("🌊 High Wave Score")
    
    # Finance trend bonus
    if (trend_data.get("is_finance_trend") or 
        (trend_data.get("tickers") and len(trend_data.get("tickers", [])) > 0) or
        trend_data.get("category") in ["finance", "crypto", "stocks", "trading"]):
        breakdown.performance_bonuses["finance"] = EarningsStandard.PERFORMANCE_BONUSES["FINANCE_TREND"]
        applied_bonuses.append("📈 Finance Trend")
    
    # Add tier description
    tier_descriptions = {
        SpotterTier.ELITE: "🏆 Elite Tier (1.5x)",
        SpotterTier.VERIFIED: "✅ Verified Tier (1.0x)",
        SpotterTier.LEARNING: "📚 Learning Tier (0.7x)",
        SpotterTier.RESTRICTED: "⚠️ Restricted Tier (0.3x)",
    }
    applied_bonuses.append(tier_descriptions[spotter_tier])
    
    # Add streak bonus if applicable
    if breakdown.streak_multiplier > Decimal("1"):
        applied_bonuses.append(f"🔥 {breakdown.streak_multiplier}x Streak Bonus")
    
    # Calculate totals
    quality_total = sum(breakdown.quality_bonuses.values())
    performance_total = sum(breakdown.performance_bonuses.values())
    
    base_amount = breakdown.base
    bonus_amount = quality_total + performance_total
    subtotal = base_amount + bonus_amount
    
    # Apply multipliers
    final_amount = subtotal * breakdown.tier_multiplier * breakdown.streak_multiplier
    
    # Apply cap
    max_submission = EarningsStandard.LIMITS["MAX_SINGLE_SUBMISSION"]
    if final_amount > max_submission:
        final_amount = max_submission
        breakdown.capped = True
        applied_bonuses.append("🔒 Capped at $3.00")
    
    breakdown.total = final_amount
    
    return EarningCalculation(
        base_amount=base_amount,
        bonus_amount=bonus_amount,
        tier_multiplier=breakdown.tier_multiplier,
        streak_multiplier=breakdown.streak_multiplier,
        final_amount=final_amount,
        applied_bonuses=applied_bonuses,
        breakdown=breakdown
    )


def calculate_validation_earnings(
    is_correct_vote: bool = True,
    validator_tier: SpotterTier = SpotterTier.LEARNING
) -> Decimal:
    """
    Calculate earnings for a validation vote
    
    Args:
        is_correct_vote: Whether the vote was correct
        validator_tier: The tier of the validator
    
    Returns:
        Earning amount
    """
    if not is_correct_vote:
        return Decimal("0")
    
    base_amount = EarningsStandard.BASE_RATES["VALIDATION_VOTE"]
    tier_multiplier = EarningsStandard.TIER_MULTIPLIERS[validator_tier]
    
    return base_amount * tier_multiplier


def calculate_approval_bonus(spotter_tier: SpotterTier = SpotterTier.LEARNING) -> Decimal:
    """
    Calculate approval bonus for trend spotter
    
    Args:
        spotter_tier: The tier of the spotter
    
    Returns:
        Bonus amount
    """
    base_bonus = EarningsStandard.BASE_RATES["APPROVAL_BONUS"]
    tier_multiplier = EarningsStandard.TIER_MULTIPLIERS[spotter_tier]
    
    return base_bonus * tier_multiplier


def can_cash_out(approved_balance: Decimal) -> bool:
    """Check if user can cash out their earnings"""
    return approved_balance >= EarningsStandard.LIMITS["MIN_CASHOUT_AMOUNT"]


def validate_earning_amount(amount: Decimal, earning_type: EarningType) -> bool:
    """Validate that an earning amount is within expected range"""
    
    if earning_type == EarningType.TREND_SUBMISSION:
        return Decimal("0") <= amount <= EarningsStandard.LIMITS["MAX_SINGLE_SUBMISSION"]
    elif earning_type == EarningType.TREND_VALIDATION:
        max_validation = EarningsStandard.BASE_RATES["VALIDATION_VOTE"] * Decimal("1.5")
        return Decimal("0") <= amount <= max_validation
    elif earning_type == EarningType.APPROVAL_BONUS:
        max_approval = EarningsStandard.BASE_RATES["APPROVAL_BONUS"] * Decimal("1.5")
        return Decimal("0") <= amount <= max_approval
    else:
        return amount >= Decimal("0")


def format_earnings(amount: Decimal) -> str:
    """Format earnings for display"""
    return f"${amount:.2f}"


# Export singleton instance
EARNINGS_STANDARD = EarningsStandard()
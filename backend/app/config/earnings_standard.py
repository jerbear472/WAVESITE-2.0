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
    MASTER = "master"
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
        "TREND_SUBMISSION": Decimal("0.25"),  # Base rate (PENDING until 2+ YES votes)
        "VALIDATION_VOTE": Decimal("0.02"),   # FIXED: Changed from 0.10 to 0.02
        "APPROVAL_BONUS": Decimal("0.50"),    # When trend gets 2+ YES votes
        "SCROLL_SESSION": Decimal("0.00"),
    }
    
    # Quality bonuses - REMOVED for simplicity
    # Earnings are now just: base × tier_multiplier × streak_multiplier
    QUALITY_BONUSES = {}
    
    # Performance bonuses - REMOVED for simplicity  
    # Earnings are now just: base × tier_multiplier × streak_multiplier
    PERFORMANCE_BONUSES = {}
    
    # Tier multipliers (matching database)
    TIER_MULTIPLIERS = {
        SpotterTier.MASTER: Decimal("3.0"),     # Master: 3x multiplier
        SpotterTier.ELITE: Decimal("2.0"),      # Elite: 2x multiplier
        SpotterTier.VERIFIED: Decimal("1.5"),   # Verified: 1.5x multiplier  
        SpotterTier.LEARNING: Decimal("1.0"),   # Learning: 1x multiplier (base)
        SpotterTier.RESTRICTED: Decimal("0.5"), # Restricted: 0.5x multiplier
    }
    
    # Session streak multipliers (rapid submissions within 5 minutes)
    SESSION_STREAK_MULTIPLIERS = {
        1: Decimal("1.0"),   # First submission
        2: Decimal("1.2"),   # 2nd submission within 5 min
        3: Decimal("1.5"),   # 3rd submission within 5 min
        4: Decimal("2.0"),   # 4th submission within 5 min
        5: Decimal("2.5"),   # 5+ submissions within 5 min (max)
    }
    
    # Daily streak multipliers (consecutive days with submissions)
    DAILY_STREAK_MULTIPLIERS = {
        0: Decimal("1.0"),   # 0-1 days: 1x
        2: Decimal("1.2"),   # 2-6 days: 1.2x
        7: Decimal("1.5"),   # 7-13 days: 1.5x
        14: Decimal("2.0"),  # 14-29 days: 2x
        30: Decimal("2.5"),  # 30+ days: 2.5x
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

def get_session_streak_multiplier(session_position: int) -> Decimal:
    """Get the multiplier for session streak (rapid submissions)"""
    if session_position >= 5:
        return Decimal("2.5")
    return EarningsStandard.SESSION_STREAK_MULTIPLIERS.get(session_position, Decimal("1.0"))


def get_daily_streak_multiplier(streak_days: int) -> Decimal:
    """Get the multiplier for daily streak (consecutive days)"""
    multipliers = EarningsStandard.DAILY_STREAK_MULTIPLIERS
    
    # Find the highest applicable multiplier
    for streak_threshold in sorted(multipliers.keys(), reverse=True):
        if streak_days >= streak_threshold:
            return multipliers[streak_threshold]
    
    return Decimal("1.0")


def calculate_trend_submission_earnings(
    trend_data: dict = None,
    spotter_tier: SpotterTier = SpotterTier.LEARNING,
    session_position: int = 1,
    daily_streak: int = 0
) -> EarningCalculation:
    """
    Calculate earnings for a trend submission
    Formula: $0.25 × tier_multiplier × session_streak × daily_streak
    
    Args:
        trend_data: Dictionary containing trend submission data (not used in simple calculation)
        spotter_tier: The tier of the spotter
        session_position: Position in current session (1-5+)
        daily_streak: Consecutive days with submissions
    
    Returns:
        EarningCalculation with complete breakdown
    """
    
    # Get base amount
    base_amount = EarningsStandard.BASE_RATES["TREND_SUBMISSION"]
    
    # Get multipliers
    tier_multiplier = EarningsStandard.TIER_MULTIPLIERS[spotter_tier]
    session_multiplier = get_session_streak_multiplier(session_position)
    daily_multiplier = get_daily_streak_multiplier(daily_streak)
    
    # Calculate final amount
    final_amount = base_amount * tier_multiplier * session_multiplier * daily_multiplier
    
    # Build description
    applied_bonuses = []
    
    # Add tier description
    tier_descriptions = {
        SpotterTier.MASTER: f"👑 Master Tier ({tier_multiplier}x)",
        SpotterTier.ELITE: f"🏆 Elite Tier ({tier_multiplier}x)",
        SpotterTier.VERIFIED: f"✅ Verified Tier ({tier_multiplier}x)",
        SpotterTier.LEARNING: f"📚 Learning Tier ({tier_multiplier}x)",
        SpotterTier.RESTRICTED: f"⚠️ Restricted Tier ({tier_multiplier}x)",
    }
    applied_bonuses.append(tier_descriptions[spotter_tier])
    
    # Add session streak bonus if applicable
    if session_multiplier > Decimal("1"):
        applied_bonuses.append(f"🔥 #{session_position} in session ({session_multiplier}x)")
    
    # Add daily streak bonus if applicable  
    if daily_multiplier > Decimal("1"):
        applied_bonuses.append(f"📅 {daily_streak} day streak ({daily_multiplier}x)")
    
    # Initialize breakdown (simplified)
    breakdown = EarningBreakdown(
        base=base_amount,
        quality_bonuses={},  # No quality bonuses in simple model
        performance_bonuses={},  # No performance bonuses in simple model
        tier_multiplier=tier_multiplier,
        streak_multiplier=session_multiplier * daily_multiplier,  # Combined streak effect
        total=final_amount,
        capped=False
    )
    
    return EarningCalculation(
        base_amount=base_amount,
        bonus_amount=Decimal("0"),  # No bonuses in simple model
        tier_multiplier=tier_multiplier,
        streak_multiplier=session_multiplier * daily_multiplier,  # Combined streak effect
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
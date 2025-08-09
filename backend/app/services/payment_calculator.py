from decimal import Decimal
from app.schemas.performance_trends import TrendQualityMetrics, TrendPaymentInfo, PaymentTier

class PaymentCalculator:
    """Service for calculating potential payments for trend submissions"""
    
    def __init__(self):
        # Default payment tiers
        self.payment_tiers = {
            "quality": PaymentTier(
                id="quality_tier",
                tier_name="Quality Submission",
                tier_type="quality",
                payout_amount=Decimal("0.25"),
                description="High-quality trend submission",
                requirements={"quality_score": 0.7}
            ),
            "validated": PaymentTier(
                id="validated_tier",
                tier_name="Validated Trend",
                tier_type="validated",
                payout_amount=Decimal("0.50"),
                description="Community validated trend",
                requirements={"min_validations": 10, "validation_score": 0.7}
            ),
            "viral": PaymentTier(
                id="viral_tier",
                tier_name="Viral Trend",
                tier_type="viral",
                payout_amount=Decimal("5.00"),
                description="Trend goes viral within 7 days",
                requirements={"viral_within_days": 7}
            )
        }
    
    def calculate_potential_payment(
        self,
        quality_metrics: TrendQualityMetrics,
        is_first_spotter: bool,
        user_streak_multiplier: float,
        spotter_tier: str = 'learning'
    ) -> TrendPaymentInfo:
        """
        Calculate potential payment based on quality and user status
        """
        # Get tier multiplier
        tier_multipliers = {
            'elite': Decimal('1.5'),
            'verified': Decimal('1.0'),
            'learning': Decimal('0.7'),
            'restricted': Decimal('0.3')
        }
        tier_multiplier = tier_multipliers.get(spotter_tier, Decimal('0.7'))
        
        # Combine tier multiplier with streak multiplier
        combined_multiplier = Decimal(str(user_streak_multiplier)) * tier_multiplier
        
        payment_info = TrendPaymentInfo(
            quality_metrics=quality_metrics,
            is_first_spotter=is_first_spotter,
            multiplier=combined_multiplier
        )
        
        # Determine payment tier based on quality
        if quality_metrics.overall_quality_score >= 0.7:
            payment_info.payment_tier = self.payment_tiers["quality"]
            payment_info.payment_amount = self.payment_tiers["quality"].payout_amount
        else:
            payment_info.payment_amount = Decimal("0.00")
        
        # Apply first spotter bonus
        if is_first_spotter and payment_info.payment_amount > 0:
            payment_info.multiplier = payment_info.multiplier * Decimal("2.0")
        
        # Calculate final amount
        payment_info.final_amount = payment_info.payment_amount * payment_info.multiplier
        
        return payment_info
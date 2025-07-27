from app.schemas.performance_trends import TrendQualityMetrics, TrendSubmissionRequest

class QualityScorer:
    """Service for evaluating trend submission quality"""
    
    def evaluate_submission(self, trend_data: TrendSubmissionRequest) -> TrendQualityMetrics:
        """
        Evaluate the quality of a trend submission based on completeness and metadata
        """
        metrics = TrendQualityMetrics()
        
        # Check basic fields
        metrics.has_title = bool(trend_data.title and len(trend_data.title) >= 5)
        metrics.has_description = bool(trend_data.description and len(trend_data.description) >= 20)
        metrics.has_category = bool(trend_data.category)
        metrics.has_platform = bool(trend_data.platform)
        metrics.has_creator_info = bool(trend_data.creator_handle)
        metrics.has_hashtags = bool(trend_data.hashtags and len(trend_data.hashtags) > 0)
        metrics.has_engagement_metrics = bool(trend_data.engagement_metrics)
        metrics.has_media_preview = bool(trend_data.media_preview_url)
        
        # Calculate additional metrics
        metrics.description_length = len(trend_data.description) if trend_data.description else 0
        metrics.hashtag_count = len(trend_data.hashtags) if trend_data.hashtags else 0
        
        # Media quality score (simplified - in production would analyze image quality)
        if metrics.has_media_preview:
            metrics.media_quality_score = 0.8
        
        # Calculate overall quality score
        score = 0.0
        if metrics.has_title:
            score += 0.10
        if metrics.has_description and metrics.description_length >= 50:
            score += 0.20
        elif metrics.has_description:
            score += 0.10
        if metrics.has_category:
            score += 0.10
        if metrics.has_platform:
            score += 0.10
        if metrics.has_creator_info:
            score += 0.10
        if metrics.has_hashtags and metrics.hashtag_count >= 3:
            score += 0.15
        elif metrics.has_hashtags:
            score += 0.08
        if metrics.has_engagement_metrics:
            score += 0.15
        if metrics.has_media_preview:
            score += 0.10
        
        metrics.overall_quality_score = min(score, 1.0)
        
        return metrics
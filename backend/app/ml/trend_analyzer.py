import torch
import numpy as np
from transformers import CLIPModel, CLIPProcessor
from sklearn.cluster import DBSCAN
from datetime import datetime, timedelta
import asyncio
from typing import List, Dict, Optional

# from app.core.redis_client import redis_client
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)
from app.ml.models import TrendPredictionModel, ViralityDetector
from app.models.models import TrendSubmission


class TrendAnalyzer:
    def __init__(self):
        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.trend_predictor = TrendPredictionModel()
        self.virality_detector = ViralityDetector()
        self.trend_cache = {}
        
    def check_duplicate(self, description: str, category: str, db) -> Optional[object]:
        """Check if similar trend already exists"""
        
        # Generate embedding for new trend
        inputs = self.clip_processor(text=description, return_tensors="pt")
        with torch.no_grad():
            new_embedding = self.clip_model.get_text_features(**inputs)
        
        # Get recent trends in same category
        recent_trends = db.query(TrendSubmission).filter(
            TrendSubmission.category == category,
            TrendSubmission.created_at >= datetime.utcnow() - timedelta(days=7)
        ).all()
        
        # Compare embeddings
        for trend in recent_trends:
            cached_embedding = self._get_cached_embedding(trend.id)
            if cached_embedding is None:
                trend_inputs = self.clip_processor(text=trend.description, return_tensors="pt")
                with torch.no_grad():
                    cached_embedding = self.clip_model.get_text_features(**trend_inputs)
                self._cache_embedding(trend.id, cached_embedding)
            
            similarity = torch.cosine_similarity(new_embedding, cached_embedding)
            if similarity > 0.85:  # High similarity threshold
                return trend
        
        return None
    
    def calculate_quality_score(self, trend_data: dict) -> float:
        """Calculate initial quality score for trend submission"""
        
        score = 0.0
        
        # Description quality
        desc_length = len(trend_data.description)
        if 50 <= desc_length <= 280:
            score += 0.2
        elif desc_length > 280:
            score += 0.1
            
        # Evidence provided
        if trend_data.evidence:
            score += min(len(trend_data.evidence) * 0.1, 0.3)
        
        # Screenshot included
        if trend_data.get('screenshot_url'):
            score += 0.2
        
        # Category specificity
        if trend_data.category != 'other':
            score += 0.1
        
        # Virality prediction confidence
        if 3 <= trend_data.virality_prediction <= 8:
            score += 0.2  # Not too extreme predictions
        
        return min(score, 1.0)
    
    async def analyze_trend_potential(self, trend_id: int) -> Dict:
        """Deep analysis of trend's viral potential"""
        
        trend = await self._get_trend_data(trend_id)
        
        # Visual analysis if screenshot provided
        visual_features = None
        if trend.screenshot_url:
            visual_features = await self._analyze_visual_content(trend.screenshot_url)
        
        # Text analysis
        text_features = self._analyze_text_content(trend.description, trend.evidence)
        
        # Historical pattern matching
        similar_trends = self._find_similar_historical_trends(
            text_features, 
            visual_features,
            trend.category
        )
        
        # Predict virality
        virality_score = self.virality_detector.predict(
            text_features=text_features,
            visual_features=visual_features,
            category=trend.category,
            historical_patterns=similar_trends
        )
        
        # Predict timeline
        timeline_prediction = self._predict_trend_timeline(
            virality_score,
            similar_trends
        )
        
        return {
            "virality_score": float(virality_score),
            "predicted_peak": timeline_prediction["peak_date"],
            "expected_duration": timeline_prediction["duration_days"],
            "confidence": timeline_prediction["confidence"],
            "similar_trends": [
                {
                    "id": t["id"],
                    "peak_reached": t["peak_metrics"],
                    "duration": t["duration"]
                }
                for t in similar_trends[:3]
            ]
        }
    
    async def _analyze_visual_content(self, image_url: str) -> np.ndarray:
        """Extract visual features from screenshot"""
        
        # Download image
        image = await self._download_image(image_url)
        
        # Process through CLIP
        inputs = self.clip_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            features = self.clip_model.get_image_features(**inputs)
        
        return features.numpy()
    
    def _analyze_text_content(self, description: str, evidence: List[str]) -> np.ndarray:
        """Extract text features"""
        
        combined_text = description
        if evidence:
            combined_text += " " + " ".join(evidence)
        
        inputs = self.clip_processor(text=combined_text, return_tensors="pt")
        with torch.no_grad():
            features = self.clip_model.get_text_features(**inputs)
        
        return features.numpy()
    
    def _find_similar_historical_trends(
        self, 
        text_features: np.ndarray,
        visual_features: Optional[np.ndarray],
        category: str
    ) -> List[Dict]:
        """Find historically similar trends that went viral"""
        
        # Query historical trend database
        historical_trends = self._query_trend_database(category, limit=1000)
        
        similarities = []
        for trend in historical_trends:
            # Calculate similarity
            text_sim = np.dot(text_features, trend["text_embedding"])
            
            visual_sim = 0
            if visual_features is not None and trend.get("visual_embedding"):
                visual_sim = np.dot(visual_features, trend["visual_embedding"])
            
            combined_sim = text_sim * 0.7 + visual_sim * 0.3
            
            if combined_sim > 0.7:  # Similarity threshold
                similarities.append({
                    "id": trend["id"],
                    "similarity": combined_sim,
                    "peak_metrics": trend["peak_metrics"],
                    "duration": trend["duration"],
                    "category": trend["category"]
                })
        
        # Sort by similarity
        similarities.sort(key=lambda x: x["similarity"], reverse=True)
        
        return similarities[:10]
    
    def _predict_trend_timeline(
        self, 
        virality_score: float,
        similar_trends: List[Dict]
    ) -> Dict:
        """Predict when trend will peak and how long it will last"""
        
        if not similar_trends:
            # Default prediction based on virality score
            days_to_peak = int(14 * (1 - virality_score) + 7)
            duration = int(30 * virality_score + 14)
            confidence = 0.3
        else:
            # Calculate based on similar trends
            peak_days = [t["peak_metrics"]["days_to_peak"] for t in similar_trends[:5]]
            durations = [t["duration"] for t in similar_trends[:5]]
            
            days_to_peak = int(np.median(peak_days))
            duration = int(np.median(durations))
            confidence = min(0.9, 0.3 + len(similar_trends) * 0.1)
        
        peak_date = datetime.utcnow() + timedelta(days=days_to_peak)
        
        return {
            "peak_date": peak_date.isoformat(),
            "duration_days": duration,
            "confidence": confidence
        }
    
    def queue_for_analysis(self, trend_id: int):
        """Queue trend for async ML analysis"""
        redis_client.lpush("trend_analysis_queue", trend_id)
    
    def _get_cached_embedding(self, trend_id: int) -> Optional[torch.Tensor]:
        """Get cached trend embedding"""
        cached = redis_client.get(f"trend_embedding:{trend_id}")
        if cached:
            return torch.tensor(np.frombuffer(cached, dtype=np.float32))
        return None
    
    def _cache_embedding(self, trend_id: int, embedding: torch.Tensor):
        """Cache trend embedding"""
        redis_client.setex(
            f"trend_embedding:{trend_id}",
            86400,  # 24 hours
            embedding.numpy().tobytes()
        )
    
    async def _get_trend_data(self, trend_id: int):
        """Placeholder for getting trend data"""
        # Implementation depends on your database setup
        pass
    
    async def _download_image(self, image_url: str):
        """Placeholder for downloading image"""
        # Implementation depends on your storage setup
        pass
    
    def _query_trend_database(self, category: str, limit: int):
        """Placeholder for querying historical trends"""
        # Implementation depends on your database setup
        return []
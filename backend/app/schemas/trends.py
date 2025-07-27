from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models.models import TrendCategory, TrendStatus

class TrendBase(BaseModel):
    category: TrendCategory
    description: str
    evidence: Optional[Dict[str, Any]] = None
    virality_prediction: Optional[int] = None
    predicted_peak_date: Optional[datetime] = None
    
    @validator('virality_prediction')
    def validate_virality_prediction(cls, v):
        if v is not None and (v < 1 or v > 10):
            raise ValueError('Virality prediction must be between 1 and 10')
        return v

class TrendCreate(TrendBase):
    screenshot_url: Optional[str] = None

class TrendResponse(TrendBase):
    id: int
    spotter_id: int
    status: TrendStatus
    quality_score: float
    validation_count: int
    bounty_amount: float
    bounty_paid: bool
    created_at: datetime
    validated_at: Optional[datetime]
    mainstream_at: Optional[datetime]
    
    class Config:
        orm_mode = True

class TrendSubmissionCreate(TrendBase):
    title: str
    url: Optional[str] = None
    platform: Optional[str] = None
    screenshot_url: Optional[str] = None

class TrendSubmissionResponse(TrendResponse):
    title: str
    url: Optional[str]
    platform: Optional[str]

class TrendValidation(BaseModel):
    confirmed: bool
    evidence_url: Optional[str] = None
    notes: Optional[str] = None

class ValidationResponse(BaseModel):
    id: int
    trend_id: int
    validator_id: int
    confirmed: bool
    evidence_url: Optional[str]
    notes: Optional[str]
    reward_amount: float
    created_at: datetime
    
    class Config:
        orm_mode = True

class TrendInsight(BaseModel):
    id: str
    category: str
    description: str
    virality_prediction: int
    status: str
    created_at: datetime
    quality_score: float
    validation_count: int
    bounty_amount: float
    spotter_username: str
    total_validations: int
    positive_validations: int

class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    total_earnings: float
    trends_spotted: int
    accuracy_score: float
    category_specialties: List[str]

# Trend Umbrella schemas
class TrendUmbrellaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    keywords: Optional[List[str]] = []
    submission_ids: Optional[List[str]] = []

class TrendUmbrellaResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    submission_count: int
    total_engagement: int
    avg_virality_score: float
    status: str
    common_hashtags: List[str]
    keywords: List[str]
    first_seen_at: Optional[datetime]
    last_updated_at: Optional[datetime]
    categories: Optional[str]

    class Config:
        orm_mode = True
from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class TrendCategory(str, Enum):
    VISUAL_STYLE = "visual_style"
    AUDIO_MUSIC = "audio_music"
    CREATOR_TECHNIQUE = "creator_technique"
    MEME_FORMAT = "meme_format"
    PRODUCT_BRAND = "product_brand"
    BEHAVIOR_PATTERN = "behavior_pattern"

class TrendStatus(str, Enum):
    SUBMITTED = "submitted"
    VALIDATING = "validating"
    APPROVED = "approved"
    REJECTED = "rejected"
    VIRAL = "viral"

class TrendSubmissionCreate(BaseModel):
    category: TrendCategory
    description: str
    screenshot_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    creator_handle: Optional[str] = None
    creator_name: Optional[str] = None
    post_caption: Optional[str] = None
    likes_count: Optional[int] = 0
    comments_count: Optional[int] = 0
    shares_count: Optional[int] = 0
    views_count: Optional[int] = 0
    hashtags: Optional[List[str]] = []
    post_url: Optional[str] = None
    posted_at: Optional[datetime] = None
    evidence: Optional[Dict[str, Any]] = None
    virality_prediction: Optional[int] = None
    predicted_peak_date: Optional[datetime] = None
    wave_score: Optional[int] = None
    
    @validator('virality_prediction')
    def validate_virality_prediction(cls, v):
        if v is not None and (v < 1 or v > 10):
            raise ValueError('Virality prediction must be between 1 and 10')
        return v
    
    @validator('wave_score')
    def validate_wave_score(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Wave score must be between 0 and 100')
        return v

class TrendSubmissionResponse(BaseModel):
    id: str
    spotter_id: str
    category: TrendCategory
    description: str
    screenshot_url: Optional[str]
    thumbnail_url: Optional[str]
    creator_handle: Optional[str]
    creator_name: Optional[str]
    post_caption: Optional[str]
    likes_count: int
    comments_count: int
    shares_count: int
    views_count: int
    hashtags: List[str]
    post_url: Optional[str]
    posted_at: Optional[datetime]
    status: TrendStatus
    quality_score: float
    validation_count: int
    bounty_amount: float
    bounty_paid: bool
    created_at: datetime
    validated_at: Optional[datetime]
    mainstream_at: Optional[datetime]
    wave_score: Optional[int] = None
    potential_bounty: Optional[float] = None
    
    class Config:
        orm_mode = True

class TrendValidationCreate(BaseModel):
    trend_id: str
    confirmed: bool
    evidence_url: Optional[str] = None
    notes: Optional[str] = None

class TrendValidationResponse(BaseModel):
    id: str
    trend_id: str
    validator_id: str
    confirmed: bool
    evidence_url: Optional[str]
    notes: Optional[str]
    reward_amount: float
    created_at: datetime
    
    class Config:
        orm_mode = True

class PublicTrendResponse(BaseModel):
    id: str
    category: TrendCategory
    description: str
    screenshot_url: Optional[str]
    thumbnail_url: Optional[str]
    creator_handle: Optional[str]
    creator_name: Optional[str]
    post_caption: Optional[str]
    likes_count: int
    comments_count: int
    shares_count: int
    views_count: int
    hashtags: List[str]
    post_url: Optional[str]
    virality_prediction: int
    quality_score: float
    created_at: datetime
    posted_at: Optional[datetime]
    spotter_username: str
    spotter_id: str
    wave_score: Optional[int] = None
    
    class Config:
        orm_mode = True

class TrendBountyCalculation(BaseModel):
    base_amount: float
    quality_bonus: float
    early_bird_bonus: float
    validation_bonus: float
    total_amount: float

class UserTimelineResponse(BaseModel):
    id: str
    category: TrendCategory
    description: str
    screenshot_url: Optional[str]
    thumbnail_url: Optional[str]
    creator_handle: Optional[str]
    creator_name: Optional[str]
    post_caption: Optional[str]
    likes_count: int
    comments_count: int
    shares_count: int
    views_count: int
    hashtags: List[str]
    post_url: Optional[str]
    virality_prediction: int
    quality_score: float
    status: TrendStatus
    created_at: datetime
    posted_at: Optional[datetime]
    wave_score: Optional[int] = None
    
    class Config:
        orm_mode = True
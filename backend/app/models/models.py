from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    PARTICIPANT = "participant"
    VALIDATOR = "validator"
    MANAGER = "manager"
    ADMIN = "admin"


class TrendCategory(str, enum.Enum):
    VISUAL_STYLE = "visual_style"
    AUDIO_MUSIC = "audio_music"
    CREATOR_TECHNIQUE = "creator_technique"
    MEME_FORMAT = "meme_format"
    PRODUCT_BRAND = "product_brand"
    BEHAVIOR_PATTERN = "behavior_pattern"


class TrendStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    VALIDATING = "validating"
    APPROVED = "approved"
    REJECTED = "rejected"
    VIRAL = "viral"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PARTICIPANT)
    
    # Profile
    demographics = Column(JSON)
    interests = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Earnings
    total_earnings = Column(Float, default=0.0)
    pending_earnings = Column(Float, default=0.0)
    
    # Performance metrics
    trends_spotted = Column(Integer, default=0)
    accuracy_score = Column(Float, default=0.0)
    validation_score = Column(Float, default=0.0)
    
    # Relationships
    recordings = relationship("Recording", back_populates="user")
    trend_submissions = relationship("TrendSubmission", back_populates="spotter")
    validations = relationship("TrendValidation", back_populates="validator")
    payments = relationship("Payment", back_populates="user")


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Recording data
    file_url = Column(String, nullable=False)
    duration = Column(Integer)  # seconds
    platform = Column(String)  # instagram, tiktok
    
    # Processing status
    processed = Column(Boolean, default=False)
    privacy_filtered = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session_metadata = Column(JSON)
    
    # Relationships
    user = relationship("User", back_populates="recordings")
    insights = relationship("RecordingInsight", back_populates="recording")


class TrendSubmission(Base):
    __tablename__ = "trend_submissions"

    id = Column(Integer, primary_key=True, index=True)
    spotter_id = Column(Integer, ForeignKey("users.id"))
    
    # Trend data
    category = Column(Enum(TrendCategory), nullable=False)
    description = Column(String, nullable=False)
    screenshot_url = Column(String)
    evidence = Column(JSON)
    
    # Predictions
    virality_prediction = Column(Integer)  # 1-10 scale
    predicted_peak_date = Column(DateTime(timezone=True))
    wave_score = Column(Integer)  # 0-100 scale - user's coolness rating
    
    # Status
    status = Column(Enum(TrendStatus), default=TrendStatus.SUBMITTED)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Grouping
    trend_umbrella_id = Column(String, nullable=True)  # UUID for trend umbrella grouping
    
    # Scoring
    quality_score = Column(Float, default=0.0)
    validation_count = Column(Integer, default=0)
    
    # Bounty
    bounty_amount = Column(Float, default=0.0)
    bounty_paid = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    validated_at = Column(DateTime(timezone=True))
    mainstream_at = Column(DateTime(timezone=True))
    
    # Relationships
    spotter = relationship("User", back_populates="trend_submissions", foreign_keys=[spotter_id])
    validations = relationship("TrendValidation", back_populates="trend")
    insights = relationship("TrendInsight", back_populates="trend")


class TrendValidation(Base):
    __tablename__ = "trend_validations"

    id = Column(Integer, primary_key=True, index=True)
    trend_id = Column(Integer, ForeignKey("trend_submissions.id"))
    validator_id = Column(Integer, ForeignKey("users.id"))
    
    # Validation data
    confirmed = Column(Boolean, nullable=False)
    evidence_url = Column(String)
    notes = Column(String)
    
    # Reward
    reward_amount = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trend = relationship("TrendSubmission", back_populates="validations")
    validator = relationship("User", back_populates="validations")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Payment data
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    payment_type = Column(String)  # base, bounty, validation
    
    # Status
    status = Column(String)  # pending, processing, completed, failed
    stripe_payment_id = Column(String)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="payments")
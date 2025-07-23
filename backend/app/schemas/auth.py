from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.models import UserRole

class UserBase(BaseModel):
    email: EmailStr
    username: str
    demographics: Optional[Dict[str, Any]] = None
    interests: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if not v.replace('_', '').isalnum():
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: UserRole
    demographics: Optional[Dict[str, Any]]
    interests: Optional[Dict[str, Any]]
    created_at: datetime
    is_active: bool
    total_earnings: float
    pending_earnings: float
    trends_spotted: int
    accuracy_score: float
    validation_score: float
    
    class Config:
        orm_mode = True
        
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
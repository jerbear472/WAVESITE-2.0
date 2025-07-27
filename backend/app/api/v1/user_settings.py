from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.auth import get_current_user
from app.core.supabase_client import get_supabase_client

router = APIRouter()

# Pydantic models for request/response validation
class UserSettingsData(BaseModel):
    # Notification preferences
    email_notifications: Optional[bool] = True
    push_notifications: Optional[bool] = True
    trend_alerts: Optional[bool] = True
    weekly_digest: Optional[bool] = True
    
    # Privacy settings
    profile_visibility: Optional[str] = 'public'
    data_sharing: Optional[bool] = False
    analytics_tracking: Optional[bool] = True
    
    # App preferences
    theme: Optional[str] = 'light'
    language: Optional[str] = 'en'
    timezone: Optional[str] = 'UTC'
    currency: Optional[str] = 'USD'
    
    # Feature preferences
    tutorial_completed: Optional[bool] = False
    onboarding_completed: Optional[bool] = False
    beta_features: Optional[bool] = False
    
    # Custom settings
    custom_settings: Optional[Dict[str, Any]] = {}

class UserSettingsResponse(BaseModel):
    id: str
    user_id: str
    
    # Notification preferences
    email_notifications: bool
    push_notifications: bool
    trend_alerts: bool
    weekly_digest: bool
    
    # Privacy settings
    profile_visibility: str
    data_sharing: bool
    analytics_tracking: bool
    
    # App preferences
    theme: str
    language: str
    timezone: str
    currency: str
    
    # Feature preferences
    tutorial_completed: bool
    onboarding_completed: bool
    beta_features: bool
    
    # Custom settings
    custom_settings: Dict[str, Any]
    
    # Metadata
    created_at: datetime
    updated_at: datetime

@router.get("/settings", response_model=UserSettingsResponse)
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    """Get the current user's settings"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        response = supabase.table('user_settings').select('*').eq('user_id', user_id).execute()
        
        if not response.data:
            # Create default settings if they don't exist
            default_settings = {
                'user_id': user_id,
                'email_notifications': True,
                'push_notifications': True,
                'trend_alerts': True,
                'weekly_digest': True,
                'profile_visibility': 'public',
                'data_sharing': False,
                'analytics_tracking': True,
                'theme': 'light',
                'language': 'en',
                'timezone': 'UTC',
                'currency': 'USD',
                'tutorial_completed': False,
                'onboarding_completed': False,
                'beta_features': False,
                'custom_settings': {}
            }
            
            create_response = supabase.table('user_settings').insert(default_settings).execute()
            
            if not create_response.data:
                raise HTTPException(status_code=500, detail="Failed to create default settings")
            
            settings_data = create_response.data[0]
        else:
            settings_data = response.data[0]
        
        return UserSettingsResponse(
            id=settings_data['id'],
            user_id=settings_data['user_id'],
            email_notifications=settings_data['email_notifications'],
            push_notifications=settings_data['push_notifications'],
            trend_alerts=settings_data['trend_alerts'],
            weekly_digest=settings_data['weekly_digest'],
            profile_visibility=settings_data['profile_visibility'],
            data_sharing=settings_data['data_sharing'],
            analytics_tracking=settings_data['analytics_tracking'],
            theme=settings_data['theme'],
            language=settings_data['language'],
            timezone=settings_data['timezone'],
            currency=settings_data['currency'],
            tutorial_completed=settings_data['tutorial_completed'],
            onboarding_completed=settings_data['onboarding_completed'],
            beta_features=settings_data['beta_features'],
            custom_settings=settings_data.get('custom_settings', {}),
            created_at=settings_data['created_at'],
            updated_at=settings_data['updated_at']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")

@router.post("/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_data: UserSettingsData,
    current_user: dict = Depends(get_current_user)
):
    """Update the current user's settings"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # Prepare update data (only include non-None values)
        update_data = {}
        for field, value in settings_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        # Check if settings exist
        existing_response = supabase.table('user_settings').select('id').eq('user_id', user_id).execute()
        
        if existing_response.data:
            # Update existing settings
            response = supabase.table('user_settings').update(update_data).eq('user_id', user_id).execute()
        else:
            # Create new settings with user_id
            update_data['user_id'] = user_id
            response = supabase.table('user_settings').insert(update_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update settings")
        
        # Return the updated settings
        return await get_user_settings(current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.patch("/settings", response_model=UserSettingsResponse)
async def update_settings_partial(
    settings_updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Partially update the current user's settings"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # Check if settings exist
        existing_response = supabase.table('user_settings').select('id').eq('user_id', user_id).execute()
        
        if not existing_response.data:
            # Create settings if they don't exist
            return await get_user_settings(current_user)
        
        # Update the settings with provided fields
        response = supabase.table('user_settings').update(settings_updates).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update settings")
        
        # Return the updated settings
        return await get_user_settings(current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.get("/settings/{setting_key}")
async def get_setting_value(
    setting_key: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific setting value"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        response = supabase.table('user_settings').select(setting_key).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        value = response.data[0].get(setting_key)
        return {"key": setting_key, "value": value}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch setting: {str(e)}")

@router.put("/settings/{setting_key}")
async def update_setting_value(
    setting_key: str,
    value: Any,
    current_user: dict = Depends(get_current_user)
):
    """Update a specific setting value"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        update_data = {setting_key: value}
        
        response = supabase.table('user_settings').update(update_data).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update setting")
        
        return {"key": setting_key, "value": value, "message": "Setting updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update setting: {str(e)}")

@router.delete("/settings")
async def reset_user_settings(current_user: dict = Depends(get_current_user)):
    """Reset user settings to defaults"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # Delete existing settings (will be recreated with defaults on next request)
        response = supabase.table('user_settings').delete().eq('user_id', user_id).execute()
        
        return {"message": "Settings reset to defaults"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset settings: {str(e)}")
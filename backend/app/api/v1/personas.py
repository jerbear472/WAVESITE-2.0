from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import json

from app.core.auth import get_current_user
from app.core.supabase_client import get_supabase_client

router = APIRouter()

# Pydantic models for request/response validation
class LocationData(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    urban_type: Optional[str] = None

class DemographicsData(BaseModel):
    age_range: Optional[str] = None
    gender: Optional[str] = None
    education_level: Optional[str] = None
    relationship_status: Optional[str] = None
    has_children: Optional[bool] = False

class ProfessionalData(BaseModel):
    employment_status: Optional[str] = None
    industry: Optional[str] = None
    income_range: Optional[str] = None
    work_style: Optional[str] = None

class LifestyleData(BaseModel):
    shopping_habits: Optional[List[str]] = []
    media_consumption: Optional[List[str]] = []
    values: Optional[List[str]] = []

class TechData(BaseModel):
    proficiency: Optional[str] = None
    primary_devices: Optional[List[str]] = []
    social_platforms: Optional[List[str]] = []

class PersonaData(BaseModel):
    location: Optional[LocationData] = None
    demographics: Optional[DemographicsData] = None
    professional: Optional[ProfessionalData] = None
    interests: Optional[List[str]] = []
    lifestyle: Optional[LifestyleData] = None
    tech: Optional[TechData] = None
    is_complete: Optional[bool] = False

class PersonaResponse(BaseModel):
    id: str
    user_id: str
    location: LocationData
    demographics: DemographicsData
    professional: ProfessionalData
    interests: List[str]
    lifestyle: LifestyleData
    tech: TechData
    is_complete: bool
    completion_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

@router.get("/persona", response_model=Optional[PersonaResponse])
async def get_user_persona(current_user: dict = Depends(get_current_user)):
    """Get the current user's persona data"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        response = supabase.table('user_personas').select('*').eq('user_id', user_id).execute()
        
        if not response.data:
            return None
            
        persona_data = response.data[0]
        
        # Transform database response to match frontend structure
        return PersonaResponse(
            id=persona_data['id'],
            user_id=persona_data['user_id'],
            location=LocationData(
                country=persona_data.get('location_country'),
                city=persona_data.get('location_city'),
                urban_type=persona_data.get('location_urban_type')
            ),
            demographics=DemographicsData(
                age_range=persona_data.get('age_range'),
                gender=persona_data.get('gender'),
                education_level=persona_data.get('education_level'),
                relationship_status=persona_data.get('relationship_status'),
                has_children=persona_data.get('has_children', False)
            ),
            professional=ProfessionalData(
                employment_status=persona_data.get('employment_status'),
                industry=persona_data.get('industry'),
                income_range=persona_data.get('income_range'),
                work_style=persona_data.get('work_style')
            ),
            interests=persona_data.get('interests', []),
            lifestyle=LifestyleData(
                shopping_habits=persona_data.get('shopping_habits', []),
                media_consumption=persona_data.get('media_consumption', []),
                values=persona_data.get('values', [])
            ),
            tech=TechData(
                proficiency=persona_data.get('tech_proficiency'),
                primary_devices=persona_data.get('primary_devices', []),
                social_platforms=persona_data.get('social_platforms', [])
            ),
            is_complete=persona_data.get('is_complete', False),
            completion_date=persona_data.get('completion_date'),
            created_at=persona_data['created_at'],
            updated_at=persona_data['updated_at']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch persona: {str(e)}")

@router.post("/persona", response_model=PersonaResponse)
async def create_or_update_persona(
    persona_data: PersonaData,
    current_user: dict = Depends(get_current_user)
):
    """Create or update the current user's persona"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # Check if persona already exists
        existing_response = supabase.table('user_personas').select('id').eq('user_id', user_id).execute()
        
        # Transform frontend data to database format
        db_data = {
            'user_id': user_id,
            'is_complete': persona_data.is_complete
        }
        
        # Location data
        if persona_data.location:
            db_data.update({
                'location_country': persona_data.location.country,
                'location_city': persona_data.location.city,
                'location_urban_type': persona_data.location.urban_type
            })
        
        # Demographics data
        if persona_data.demographics:
            db_data.update({
                'age_range': persona_data.demographics.age_range,
                'gender': persona_data.demographics.gender,
                'education_level': persona_data.demographics.education_level,
                'relationship_status': persona_data.demographics.relationship_status,
                'has_children': persona_data.demographics.has_children
            })
        
        # Professional data
        if persona_data.professional:
            db_data.update({
                'employment_status': persona_data.professional.employment_status,
                'industry': persona_data.professional.industry,
                'income_range': persona_data.professional.income_range,
                'work_style': persona_data.professional.work_style
            })
        
        # Interests
        if persona_data.interests is not None:
            db_data['interests'] = json.dumps(persona_data.interests)
        
        # Lifestyle data
        if persona_data.lifestyle:
            if persona_data.lifestyle.shopping_habits is not None:
                db_data['shopping_habits'] = json.dumps(persona_data.lifestyle.shopping_habits)
            if persona_data.lifestyle.media_consumption is not None:
                db_data['media_consumption'] = json.dumps(persona_data.lifestyle.media_consumption)
            if persona_data.lifestyle.values is not None:
                db_data['values'] = json.dumps(persona_data.lifestyle.values)
        
        # Tech data
        if persona_data.tech:
            db_data.update({
                'tech_proficiency': persona_data.tech.proficiency
            })
            if persona_data.tech.primary_devices is not None:
                db_data['primary_devices'] = json.dumps(persona_data.tech.primary_devices)
            if persona_data.tech.social_platforms is not None:
                db_data['social_platforms'] = json.dumps(persona_data.tech.social_platforms)
        
        # Set completion date if marking as complete
        if persona_data.is_complete:
            db_data['completion_date'] = datetime.utcnow().isoformat()
        
        if existing_response.data:
            # Update existing persona
            response = supabase.table('user_personas').update(db_data).eq('user_id', user_id).execute()
        else:
            # Create new persona
            response = supabase.table('user_personas').insert(db_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save persona data")
        
        # Return the created/updated persona
        return await get_user_persona(current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save persona: {str(e)}")

@router.patch("/persona", response_model=PersonaResponse)
async def update_persona_partial(
    persona_updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Partially update the current user's persona"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # Check if persona exists
        existing_response = supabase.table('user_personas').select('id').eq('user_id', user_id).execute()
        
        if not existing_response.data:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        # Update the persona with provided fields
        response = supabase.table('user_personas').update(persona_updates).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update persona")
        
        # Return the updated persona
        return await get_user_persona(current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update persona: {str(e)}")

@router.delete("/persona")
async def delete_persona(current_user: dict = Depends(get_current_user)):
    """Delete the current user's persona"""
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        response = supabase.table('user_personas').delete().eq('user_id', user_id).execute()
        
        return {"message": "Persona deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete persona: {str(e)}")
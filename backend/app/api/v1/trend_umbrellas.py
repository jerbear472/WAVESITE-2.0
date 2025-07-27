from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import User, TrendSubmission
from app.schemas.trends import TrendUmbrellaCreate, TrendUmbrellaResponse

router = APIRouter()

@router.get("/", response_model=List[TrendUmbrellaResponse])
async def get_trend_umbrellas(
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all trend umbrellas with their statistics"""
    
    # Since we don't have the actual trend_umbrellas table in models.py yet,
    # let's return grouped data from trend_submissions for now
    try:
        # Group trend submissions by trend_umbrella_id (when it exists)
        query = db.query(
            TrendSubmission.trend_umbrella_id,
            func.count(TrendSubmission.id).label('submission_count'),
            func.sum(TrendSubmission.bounty_amount).label('total_earnings'),
            func.avg(TrendSubmission.quality_score).label('avg_quality_score'),
            func.min(TrendSubmission.created_at).label('first_seen_at'),
            func.max(TrendSubmission.created_at).label('last_updated_at'),
            func.array_agg(TrendSubmission.hashtags).label('all_hashtags'),
            func.string_agg(TrendSubmission.category, ', ').label('categories')
        ).filter(
            TrendSubmission.trend_umbrella_id.isnot(None)
        ).group_by(
            TrendSubmission.trend_umbrella_id
        ).order_by(
            func.sum(TrendSubmission.bounty_amount).desc()
        ).limit(limit)
        
        if status:
            # Map status to validation count ranges
            if status == 'emerging':
                query = query.having(func.count(TrendSubmission.id) <= 5)
            elif status == 'trending':
                query = query.having(func.count(TrendSubmission.id).between(6, 20))
            elif status == 'viral':
                query = query.having(func.count(TrendSubmission.id) > 20)
        
        results = query.all()
        
        # Transform results into umbrella format
        umbrellas = []
        for result in results:
            # Determine status based on submission count
            submission_count = result.submission_count
            if submission_count > 20:
                umbrella_status = 'viral'
            elif submission_count > 5:
                umbrella_status = 'trending'
            else:
                umbrella_status = 'emerging'
            
            # Extract common hashtags
            all_hashtags = []
            if result.all_hashtags:
                for hashtag_list in result.all_hashtags:
                    if hashtag_list:
                        all_hashtags.extend(hashtag_list)
            
            common_hashtags = list(set(all_hashtags))[:10]  # Top 10 unique hashtags
            
            umbrellas.append({
                'id': str(result.trend_umbrella_id),
                'name': f"Trend Group {result.trend_umbrella_id}",
                'description': f"A collection of {submission_count} related trends",
                'submission_count': submission_count,
                'total_engagement': int(result.total_earnings or 0),
                'avg_virality_score': float(result.avg_quality_score or 0),
                'status': umbrella_status,
                'common_hashtags': common_hashtags,
                'keywords': [],
                'first_seen_at': result.first_seen_at,
                'last_updated_at': result.last_updated_at,
                'categories': result.categories
            })
        
        return umbrellas
    except Exception as e:
        print(f"Error fetching trend umbrellas: {e}")
        return []


@router.post("/", response_model=dict)
async def create_trend_umbrella(
    umbrella_data: TrendUmbrellaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new trend umbrella and link submissions to it"""
    
    try:
        # For now, we'll use a simple approach: generate a new umbrella ID
        # and update the selected submissions with this ID
        
        # Generate a new umbrella ID (in a real implementation, you'd insert into trend_umbrellas table)
        import uuid
        umbrella_id = str(uuid.uuid4())
        
        # Update selected submissions to link them to this umbrella
        if umbrella_data.submission_ids:
            db.query(TrendSubmission).filter(
                TrendSubmission.id.in_(umbrella_data.submission_ids)
            ).update(
                {'trend_umbrella_id': umbrella_id},
                synchronize_session=False
            )
            
            db.commit()
        
        return {
            'id': umbrella_id,
            'name': umbrella_data.name,
            'description': umbrella_data.description,
            'submission_count': len(umbrella_data.submission_ids or []),
            'status': 'success'
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create trend umbrella: {str(e)}")


@router.get("/{umbrella_id}/submissions")
async def get_umbrella_submissions(
    umbrella_id: str,
    db: Session = Depends(get_db)
):
    """Get all submissions belonging to a specific umbrella"""
    
    try:
        submissions = db.query(TrendSubmission).filter(
            TrendSubmission.trend_umbrella_id == umbrella_id
        ).order_by(
            TrendSubmission.created_at.desc()
        ).all()
        
        return submissions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch umbrella submissions: {str(e)}")


@router.put("/{umbrella_id}/add-submission/{submission_id}")
async def add_submission_to_umbrella(
    umbrella_id: str,
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a submission to an existing umbrella"""
    
    try:
        submission = db.query(TrendSubmission).filter(
            TrendSubmission.id == submission_id
        ).first()
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        submission.trend_umbrella_id = umbrella_id
        db.commit()
        
        return {'status': 'success', 'message': 'Submission added to umbrella'}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add submission to umbrella: {str(e)}")


@router.delete("/{umbrella_id}/remove-submission/{submission_id}")
async def remove_submission_from_umbrella(
    umbrella_id: str,
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a submission from an umbrella"""
    
    try:
        submission = db.query(TrendSubmission).filter(
            TrendSubmission.id == submission_id,
            TrendSubmission.trend_umbrella_id == umbrella_id
        ).first()
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found in this umbrella")
        
        submission.trend_umbrella_id = None
        db.commit()
        
        return {'status': 'success', 'message': 'Submission removed from umbrella'}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove submission from umbrella: {str(e)}")
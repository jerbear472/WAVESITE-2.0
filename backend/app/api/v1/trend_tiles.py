from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import User
from pydantic import BaseModel, Field
from typing import Dict

router = APIRouter()

# Pydantic models
class TrendTileCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    auto_cluster_id: Optional[str] = None

class TrendTileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None

class ContentItemAdd(BaseModel):
    content_id: UUID
    content_type: str = Field(..., pattern="^(video|post|story|reel)$")
    platform: str
    thumbnail_url: Optional[str] = None
    title: Optional[str] = None
    performance_score: Optional[int] = 0
    earnings: Optional[float] = 0.0

class TrendMerge(BaseModel):
    source_tile_id: UUID
    target_tile_id: UUID
    merge_reason: Optional[str] = None

class TrendSplit(BaseModel):
    tile_id: UUID
    new_tiles: List[Dict[str, Any]]  # Contains title, description, and content_ids for each new tile

class ClusteringSuggestionResponse(BaseModel):
    suggestion_id: UUID
    content_id: UUID
    suggested_tile_id: UUID
    confidence_score: float
    suggestion_reason: str
    status: str

@router.post("/trend-tiles", response_model=dict)
async def create_trend_tile(
    tile_data: TrendTileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new trend tile"""
    try:
        # Create trend tile in database
        query = """
        INSERT INTO trend_tiles (user_id, title, description, category, auto_cluster_id)
        VALUES (:user_id, :title, :description, :category, :auto_cluster_id)
        RETURNING *
        """
        
        result = db.execute(query, {
            "user_id": current_user.id,
            "title": tile_data.title,
            "description": tile_data.description,
            "category": tile_data.category,
            "auto_cluster_id": tile_data.auto_cluster_id
        })
        
        tile = result.fetchone()
        return {"success": True, "tile": dict(tile)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trend-tiles", response_model=dict)
async def get_trend_tiles(
    category: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "wave_score",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all trend tiles for the current user"""
    try:
        # Base query
        query = """
        SELECT 
            t.*,
            array_agg(DISTINCT ci.platform) as platforms,
            COUNT(DISTINCT ci.id) as actual_content_count,
            COALESCE(SUM(ci.earnings), 0) as calculated_earnings,
            calculate_wave_score(t.id) as calculated_wave_score
        FROM trend_tiles t
        LEFT JOIN trend_content_items ci ON t.id = ci.trend_tile_id
        WHERE t.user_id = :user_id OR t.is_collaborative = true
        """
        
        # Add filters
        params = {"user_id": current_user.id}
        
        if category:
            query += " AND t.category = :category"
            params["category"] = category
            
        if status:
            query += " AND t.status = :status"
            params["status"] = status
            
        query += " GROUP BY t.id"
        
        # Add sorting
        sort_columns = {
            "wave_score": "calculated_wave_score DESC",
            "earnings": "t.total_earnings DESC",
            "recent": "t.updated_at DESC",
            "content_count": "t.content_count DESC"
        }
        query += f" ORDER BY {sort_columns.get(sort_by, 'calculated_wave_score DESC')}"
        
        result = db.execute(query, params)
        tiles = [dict(row) for row in result.fetchall()]
        
        # Get content items for each tile
        for tile in tiles:
            content_query = """
            SELECT * FROM trend_content_items 
            WHERE trend_tile_id = :tile_id 
            ORDER BY is_top_performer DESC, performance_score DESC
            LIMIT 10
            """
            content_result = db.execute(content_query, {"tile_id": tile["id"]})
            tile["content_items"] = [dict(row) for row in content_result.fetchall()]
        
        return {"success": True, "tiles": tiles}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trend-tiles/{tile_id}/content", response_model=dict)
async def add_content_to_tile(
    tile_id: UUID,
    content_data: ContentItemAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add content to a trend tile"""
    try:
        # Verify ownership
        tile_check = db.execute(
            "SELECT user_id FROM trend_tiles WHERE id = :tile_id",
            {"tile_id": tile_id}
        ).fetchone()
        
        if not tile_check or tile_check.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this trend")
        
        # Add content item
        query = """
        INSERT INTO trend_content_items 
        (trend_tile_id, content_id, content_type, platform, performance_score, earnings, added_by)
        VALUES (:tile_id, :content_id, :content_type, :platform, :performance_score, :earnings, :added_by)
        RETURNING *
        """
        
        result = db.execute(query, {
            "tile_id": tile_id,
            "content_id": content_data.content_id,
            "content_type": content_data.content_type,
            "platform": content_data.platform,
            "performance_score": content_data.performance_score,
            "earnings": content_data.earnings,
            "added_by": current_user.id
        })
        
        content_item = result.fetchone()
        
        # Update tile's thumbnail if needed
        if content_data.thumbnail_url:
            db.execute(
                """
                UPDATE trend_tiles 
                SET thumbnail_urls = array_append(thumbnail_urls, :thumbnail)
                WHERE id = :tile_id AND array_length(thumbnail_urls, 1) < 3
                """,
                {"tile_id": tile_id, "thumbnail": content_data.thumbnail_url}
            )
        
        db.commit()
        return {"success": True, "content_item": dict(content_item)}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trend-tiles/merge", response_model=dict)
async def merge_trend_tiles(
    merge_data: TrendMerge,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Merge two trend tiles"""
    try:
        # Verify ownership of both tiles
        tiles = db.execute(
            """
            SELECT id, user_id FROM trend_tiles 
            WHERE id IN (:source_id, :target_id)
            """,
            {"source_id": merge_data.source_tile_id, "target_id": merge_data.target_tile_id}
        ).fetchall()
        
        if len(tiles) != 2 or any(t.user_id != current_user.id for t in tiles):
            raise HTTPException(status_code=403, detail="Not authorized to merge these trends")
        
        # Move all content from source to target
        db.execute(
            """
            UPDATE trend_content_items 
            SET trend_tile_id = :target_id
            WHERE trend_tile_id = :source_id
            """,
            {"source_id": merge_data.source_tile_id, "target_id": merge_data.target_tile_id}
        )
        
        # Record merge history
        db.execute(
            """
            INSERT INTO trend_merge_history (source_tile_id, target_tile_id, merged_by, merge_reason)
            VALUES (:source_id, :target_id, :user_id, :reason)
            """,
            {
                "source_id": merge_data.source_tile_id,
                "target_id": merge_data.target_tile_id,
                "user_id": current_user.id,
                "reason": merge_data.merge_reason
            }
        )
        
        # Update source tile to reference parent
        db.execute(
            """
            UPDATE trend_tiles 
            SET parent_tile_id = :target_id
            WHERE id = :source_id
            """,
            {"source_id": merge_data.source_tile_id, "target_id": merge_data.target_tile_id}
        )
        
        db.commit()
        return {"success": True, "message": "Trends merged successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trend-tiles/suggestions", response_model=dict)
async def get_clustering_suggestions(
    status: str = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI clustering suggestions for content"""
    try:
        query = """
        SELECT 
            cs.*,
            tt.title as suggested_tile_title,
            tt.category as suggested_tile_category
        FROM trend_clustering_suggestions cs
        JOIN trend_tiles tt ON cs.suggested_tile_id = tt.id
        WHERE tt.user_id = :user_id AND cs.status = :status
        ORDER BY cs.confidence_score DESC
        """
        
        result = db.execute(query, {"user_id": current_user.id, "status": status})
        suggestions = [dict(row) for row in result.fetchall()]
        
        return {"success": True, "suggestions": suggestions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/trend-tiles/{tile_id}", response_model=dict)
async def update_trend_tile(
    tile_id: UUID,
    update_data: TrendTileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a trend tile"""
    try:
        # Verify ownership
        tile_check = db.execute(
            "SELECT user_id FROM trend_tiles WHERE id = :tile_id",
            {"tile_id": tile_id}
        ).fetchone()
        
        if not tile_check or tile_check.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this trend")
        
        # Build update query
        update_fields = []
        params = {"tile_id": tile_id}
        
        if update_data.title is not None:
            update_fields.append("title = :title")
            params["title"] = update_data.title
            
        if update_data.description is not None:
            update_fields.append("description = :description")
            params["description"] = update_data.description
            
        if update_data.category is not None:
            update_fields.append("category = :category")
            params["category"] = update_data.category
            
        if update_data.status is not None:
            update_fields.append("status = :status")
            params["status"] = update_data.status
        
        if update_fields:
            update_fields.append("updated_at = timezone('utc', now())")
            query = f"""
            UPDATE trend_tiles 
            SET {', '.join(update_fields)}
            WHERE id = :tile_id
            RETURNING *
            """
            
            result = db.execute(query, params)
            tile = result.fetchone()
            db.commit()
            
            return {"success": True, "tile": dict(tile)}
        else:
            return {"success": True, "message": "No updates provided"}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/trend-tiles/{tile_id}/content/{content_id}", response_model=dict)
async def remove_content_from_tile(
    tile_id: UUID,
    content_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove content from a trend tile"""
    try:
        # Verify ownership
        tile_check = db.execute(
            "SELECT user_id FROM trend_tiles WHERE id = :tile_id",
            {"tile_id": tile_id}
        ).fetchone()
        
        if not tile_check or tile_check.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this trend")
        
        # Remove content item
        db.execute(
            """
            DELETE FROM trend_content_items 
            WHERE trend_tile_id = :tile_id AND content_id = :content_id
            """,
            {"tile_id": tile_id, "content_id": content_id}
        )
        
        db.commit()
        return {"success": True, "message": "Content removed from trend"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trends/unassigned", response_model=dict)
async def get_unassigned_trends(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trends that haven't been assigned to any trend tile yet"""
    try:
        # Query to get trends not in any trend tile
        query = text("""
        SELECT 
            ct.id,
            ct.title,
            ct.description,
            ct.platform,
            ct.thumbnail_url,
            ct.created_at,
            ct.earnings,
            ct.quality_score as performance_score,
            u.name as user_name
        FROM captured_trends ct
        LEFT JOIN users u ON ct.user_id = u.id
        WHERE ct.user_id = :user_id
        AND NOT EXISTS (
            SELECT 1 FROM trend_content_items tci 
            WHERE tci.content_id = ct.id::uuid
        )
        ORDER BY ct.created_at DESC
        LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {
            "user_id": current_user.id,
            "limit": limit,
            "offset": offset
        })
        
        trends = []
        for row in result:
            trend_dict = dict(row._mapping)
            # Convert any decimal values to float for JSON serialization
            if trend_dict.get('earnings'):
                trend_dict['earnings'] = float(trend_dict['earnings'])
            trends.append(trend_dict)
        
        # Get total count
        count_query = text("""
        SELECT COUNT(*) 
        FROM captured_trends ct
        WHERE ct.user_id = :user_id
        AND NOT EXISTS (
            SELECT 1 FROM trend_content_items tci 
            WHERE tci.content_id = ct.id::uuid
        )
        """)
        
        count_result = db.execute(count_query, {"user_id": current_user.id})
        total_count = count_result.scalar()
        
        return {
            "success": True,
            "trends": trends,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
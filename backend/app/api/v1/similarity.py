from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from app.core.auth import get_current_user
from app.ml.trend_similarity import trend_similarity_engine
from app.schemas.auth import User


router = APIRouter()


class TrendSubmissionRequest(BaseModel):
    text: str
    metadata: Optional[Dict] = None


class ClusterUpdateRequest(BaseModel):
    cluster_id: str
    new_label: str


class SimilarityCheckResponse(BaseModel):
    assigned_cluster: str
    score: float
    label: str
    new_cluster: bool
    all_scores: Dict[str, Dict]
    metadata: Optional[Dict] = None


class ClusterTrendsResponse(BaseModel):
    cluster_id: str
    label: str
    trends: List[Dict]


class TrendingClustersResponse(BaseModel):
    clusters: List[Dict]


class ClusterStatistics(BaseModel):
    cluster_id: str
    label: str
    size: int
    avg_intra_similarity: float
    centroid_norm: float


@router.post("/check-similarity", response_model=SimilarityCheckResponse)
async def check_trend_similarity(
    request: TrendSubmissionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Check similarity of a trend submission against existing clusters.
    Returns cluster assignment and similarity scores.
    """
    try:
        # Add user info to metadata
        metadata = request.metadata or {}
        metadata['user_id'] = current_user.id
        metadata['submitted_at'] = datetime.utcnow().isoformat()
        
        # Process trend submission
        result = trend_similarity_engine.process_trend_submission(
            text=request.text,
            metadata=metadata
        )
        
        return SimilarityCheckResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing trend similarity: {str(e)}"
        )


@router.get("/cluster/{cluster_id}/trends", response_model=ClusterTrendsResponse)
async def get_cluster_trends(
    cluster_id: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """
    Get recent trends from a specific cluster.
    """
    try:
        trends = trend_similarity_engine.get_cluster_trends(cluster_id, limit)
        label = trend_similarity_engine.cluster_labels.get(cluster_id, "Unknown Cluster")
        
        return ClusterTrendsResponse(
            cluster_id=cluster_id,
            label=label,
            trends=trends
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching cluster trends: {str(e)}"
        )


@router.get("/trending-clusters", response_model=TrendingClustersResponse)
async def get_trending_clusters(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """
    Get currently trending clusters based on recent activity.
    """
    try:
        clusters = trend_similarity_engine.get_trending_clusters(limit)
        return TrendingClustersResponse(clusters=clusters)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trending clusters: {str(e)}"
        )


@router.put("/cluster/update-label")
async def update_cluster_label(
    request: ClusterUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Update the human-readable label for a cluster.
    Admin only endpoint.
    """
    # Check if user is admin (implement your own admin check)
    # if not current_user.is_admin:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Only admins can update cluster labels"
    #     )
    
    try:
        success = trend_similarity_engine.update_cluster_label(
            request.cluster_id,
            request.new_label
        )
        
        if success:
            return {"message": "Cluster label updated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cluster not found"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating cluster label: {str(e)}"
        )


@router.get("/cluster/{cluster_id}/statistics", response_model=ClusterStatistics)
async def get_cluster_statistics(
    cluster_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics for a specific cluster.
    """
    try:
        stats = trend_similarity_engine.calculate_cluster_statistics(cluster_id)
        
        if "error" in stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=stats["error"]
            )
        
        return ClusterStatistics(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating cluster statistics: {str(e)}"
        )


@router.post("/reindex-clusters")
async def reindex_clusters(
    current_user: User = Depends(get_current_user)
):
    """
    Reindex all clusters from the database.
    Admin only endpoint.
    """
    # Check if user is admin
    # if not current_user.is_admin:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Only admins can reindex clusters"
    #     )
    
    try:
        trend_similarity_engine._initialize_vector_store()
        return {
            "message": "Clusters reindexed successfully",
            "cluster_count": len(trend_similarity_engine.vector_store)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reindexing clusters: {str(e)}"
        )
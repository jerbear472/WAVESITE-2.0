#!/usr/bin/env python3
"""
Test server for trend similarity module
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import uvicorn

# Import the similarity engine
from app.ml.trend_similarity import trend_similarity_engine

# Create app
app = FastAPI(title="Trend Similarity Test Server")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class TrendSubmissionRequest(BaseModel):
    text: str
    metadata: Optional[Dict] = None


class SimilarityCheckResponse(BaseModel):
    assigned_cluster: str
    score: float
    label: str
    new_cluster: bool
    all_scores: Dict[str, Dict]
    metadata: Optional[Dict] = None


# Endpoints
@app.get("/")
async def root():
    return {"message": "Trend Similarity Test Server", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/v1/similarity/check", response_model=SimilarityCheckResponse)
async def check_similarity(request: TrendSubmissionRequest):
    """Check trend similarity"""
    try:
        result = trend_similarity_engine.process_trend_submission(
            text=request.text,
            metadata=request.metadata
        )
        return SimilarityCheckResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/similarity/clusters")
async def get_clusters():
    """Get all clusters"""
    return {
        "clusters": [
            {
                "id": cluster_id,
                "label": label,
                "vector_count": len(vectors)
            }
            for cluster_id, label in trend_similarity_engine.cluster_labels.items()
            for vectors in [trend_similarity_engine.vector_store.get(cluster_id, [])]
        ]
    }


if __name__ == "__main__":
    print("Starting Trend Similarity Test Server...")
    print("Access at: http://localhost:8001")
    print("Docs at: http://localhost:8001/docs")
    uvicorn.run(app, host="0.0.0.0", port=8001)
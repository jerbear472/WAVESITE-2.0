# Trend Similarity Module Integration Guide

This document outlines the trend similarity module that has been integrated into WAVESITE2.

## Overview

The trend similarity module uses cosine similarity and clustering to group similar trend submissions. It leverages sentence transformers (all-MiniLM-L6-v2) to create embeddings and compares them against existing clusters.

## Files Created/Modified

### 1. Backend ML Module
- `/backend/app/ml/trend_similarity.py` - Core similarity engine implementation
- `/backend/app/ml/__init__.py` - Module exports

### 2. API Endpoints
- `/backend/app/api/v1/similarity.py` - REST API endpoints for similarity operations
- `/backend/app/api/v1/__init__.py` - Updated to include similarity module
- `/backend/app/main.py` - Added similarity router

### 3. Database Schema
- `/supabase/add_trend_similarity_tables.sql` - SQL schema for trend clusters and vectors

### 4. Tests
- `/backend/tests/test_trend_similarity.py` - Unit and integration tests

### 5. Dependencies
- `/backend/requirements.txt` - Added `sentence-transformers==2.2.2`

## API Endpoints

### POST `/api/v1/similarity/check-similarity`
Check similarity of a trend submission against existing clusters.

```json
{
  "text": "mob wife aesthetic tiktok outfits",
  "metadata": {
    "platform": "tiktok",
    "category": "fashion"
  }
}
```

Response:
```json
{
  "assigned_cluster": "cluster_mob_wife",
  "score": 0.83,
  "label": "Mob Wife Aesthetic",
  "new_cluster": false,
  "all_scores": {...},
  "metadata": {...}
}
```

### GET `/api/v1/similarity/cluster/{cluster_id}/trends`
Get recent trends from a specific cluster.

### GET `/api/v1/similarity/trending-clusters`
Get currently trending clusters based on recent activity.

### PUT `/api/v1/similarity/cluster/update-label`
Update the human-readable label for a cluster (admin only).

### GET `/api/v1/similarity/cluster/{cluster_id}/statistics`
Get statistics for a specific cluster.

### POST `/api/v1/similarity/reindex-clusters`
Reindex all clusters from the database (admin only).

## Database Schema

### `trend_clusters` table
- `id`: Unique cluster identifier
- `label`: Human-readable cluster name
- `metadata`: JSON metadata about the cluster
- `trend_count`: Number of trends in cluster
- `is_active`: Whether cluster is active

### `trend_vectors` table
- `id`: Unique vector ID
- `cluster_id`: Reference to cluster
- `embedding`: Vector embedding (384 dimensions)
- `text`: Original trend text
- `metadata`: JSON metadata
- `user_id`: Reference to user who submitted

## Setup Instructions

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run database migrations:**
   ```bash
   # Connect to your Supabase instance and run:
   psql -h your-supabase-url -U postgres -d postgres < supabase/add_trend_similarity_tables.sql
   ```

3. **Start the backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

4. **Run tests:**
   ```bash
   cd backend
   pytest tests/test_trend_similarity.py -v
   ```

## Usage Example

```python
# In your frontend or mobile app
import requests

# Submit a new trend
response = requests.post(
    "http://localhost:8000/api/v1/similarity/check-similarity",
    json={
        "text": "sopranos-core outfits on tiktok",
        "metadata": {
            "platform": "tiktok",
            "category": "fashion"
        }
    },
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

result = response.json()
print(f"Assigned to cluster: {result['label']} (similarity: {result['score']})")
```

## Future Enhancements

1. **pgvector Integration**: Replace float array with pgvector for better performance
2. **HDBSCAN Clustering**: Add dynamic clustering for automatic cluster discovery
3. **Real-time Updates**: WebSocket support for live cluster updates
4. **Visual Similarity**: Add image embedding support using CLIP
5. **Trend Prediction**: Integrate with existing trend prediction models

## Notes

- The similarity threshold is set to 0.75 by default (configurable)
- The model creates 384-dimensional embeddings
- Clusters are created automatically when no similar trends exist
- All endpoints require authentication except for read operations
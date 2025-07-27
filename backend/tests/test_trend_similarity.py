import pytest
import numpy as np
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.ml.trend_similarity import TrendSimilarityEngine
from app.main import app


class TestTrendSimilarityEngine:
    """Test cases for TrendSimilarityEngine"""
    
    @pytest.fixture
    def engine(self):
        """Create a test instance of TrendSimilarityEngine"""
        with patch.object(TrendSimilarityEngine, '_initialize_vector_store'):
            engine = TrendSimilarityEngine()
            engine.vector_store = {}
            engine.cluster_labels = {}
            return engine
    
    def test_embed_text(self, engine):
        """Test text embedding generation"""
        text = "mob wife aesthetic tiktok"
        embedding = engine.embed_text(text)
        
        assert isinstance(embedding, np.ndarray)
        assert len(embedding) == 384  # all-MiniLM-L6-v2 produces 384-dim embeddings
        assert embedding.dtype == np.float32
    
    def test_process_new_cluster(self, engine):
        """Test creating a new cluster for dissimilar trend"""
        # First submission should create new cluster
        result = engine.process_trend_submission("mob wife aesthetic tiktok")
        
        assert result['new_cluster'] is True
        assert result['label'] == "New Cluster"
        assert result['score'] == 0  # No existing clusters to compare
        assert len(engine.vector_store) == 1
    
    def test_assign_to_existing_cluster(self, engine):
        """Test assigning similar trend to existing cluster"""
        # Create initial cluster
        result1 = engine.process_trend_submission("mob wife aesthetic tiktok")
        cluster_id = result1['assigned_cluster']
        
        # Submit similar trend
        result2 = engine.process_trend_submission("sopranos-core fashion on tiktok")
        
        assert result2['new_cluster'] is False
        assert result2['assigned_cluster'] == cluster_id
        assert result2['score'] >= engine.similarity_threshold
        assert len(engine.vector_store[cluster_id]) == 2
    
    def test_create_different_clusters(self, engine):
        """Test creating different clusters for dissimilar trends"""
        # Create first cluster
        result1 = engine.process_trend_submission("mob wife aesthetic fur coats")
        
        # Create second cluster with different trend
        result2 = engine.process_trend_submission("clean girl aesthetic minimal makeup")
        
        assert result2['new_cluster'] is True
        assert result2['assigned_cluster'] != result1['assigned_cluster']
        assert len(engine.vector_store) == 2
    
    def test_calculate_cluster_statistics(self, engine):
        """Test cluster statistics calculation"""
        # Create cluster with multiple vectors
        result1 = engine.process_trend_submission("mob wife aesthetic")
        cluster_id = result1['assigned_cluster']
        engine.process_trend_submission("sopranos style fashion")
        engine.process_trend_submission("mob wife energy outfits")
        
        stats = engine.calculate_cluster_statistics(cluster_id)
        
        assert stats['cluster_id'] == cluster_id
        assert stats['size'] == 3
        assert 0 <= stats['avg_intra_similarity'] <= 1
        assert stats['centroid_norm'] > 0
    
    def test_metadata_handling(self, engine):
        """Test metadata is properly handled"""
        metadata = {
            "platform": "tiktok",
            "category": "fashion",
            "user_id": "test_user_123"
        }
        
        result = engine.process_trend_submission(
            "office siren aesthetic blazers",
            metadata=metadata
        )
        
        assert result['metadata'] == metadata


class TestSimilarityAPI:
    """Test cases for similarity API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def auth_headers(self, client):
        """Get authentication headers"""
        # Create test user and get token
        response = client.post(
            "/api/v1/register",
            json={
                "email": "test@example.com",
                "password": "testpassword123",
                "name": "Test User"
            }
        )
        
        if response.status_code != 200:
            # Try login if user already exists
            response = client.post(
                "/api/v1/login",
                data={
                    "username": "test@example.com",
                    "password": "testpassword123"
                }
            )
        
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @patch('app.ml.trend_similarity.trend_similarity_engine.process_trend_submission')
    def test_check_similarity_endpoint(self, mock_process, client, auth_headers):
        """Test POST /api/v1/similarity/check-similarity"""
        mock_process.return_value = {
            "assigned_cluster": "cluster_123",
            "score": 0.85,
            "label": "Test Cluster",
            "new_cluster": False,
            "all_scores": {},
            "metadata": {}
        }
        
        response = client.post(
            "/api/v1/similarity/check-similarity",
            json={
                "text": "test trend submission",
                "metadata": {"platform": "tiktok"}
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['assigned_cluster'] == "cluster_123"
        assert data['score'] == 0.85
        assert data['new_cluster'] is False
    
    @patch('app.ml.trend_similarity.trend_similarity_engine.get_cluster_trends')
    def test_get_cluster_trends_endpoint(self, mock_get_trends, client, auth_headers):
        """Test GET /api/v1/similarity/cluster/{cluster_id}/trends"""
        mock_get_trends.return_value = [
            {
                "id": "1",
                "text": "trend 1",
                "created_at": "2024-01-01T00:00:00"
            }
        ]
        
        response = client.get(
            "/api/v1/similarity/cluster/cluster_123/trends",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['cluster_id'] == "cluster_123"
        assert len(data['trends']) == 1
    
    @patch('app.ml.trend_similarity.trend_similarity_engine.get_trending_clusters')
    def test_get_trending_clusters_endpoint(self, mock_trending, client, auth_headers):
        """Test GET /api/v1/similarity/trending-clusters"""
        mock_trending.return_value = [
            {
                "cluster_id": "cluster_123",
                "label": "Test Cluster",
                "trend_count": 10
            }
        ]
        
        response = client.get(
            "/api/v1/similarity/trending-clusters",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data['clusters']) == 1
        assert data['clusters'][0]['cluster_id'] == "cluster_123"
    
    def test_unauthorized_access(self, client):
        """Test endpoints require authentication"""
        response = client.post(
            "/api/v1/similarity/check-similarity",
            json={"text": "test"}
        )
        
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
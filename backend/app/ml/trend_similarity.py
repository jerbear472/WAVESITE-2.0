from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json

from app.core.database import get_db
from app.core.supabase_client import supabase_client as supabase
from app.core.config import settings


class TrendSimilarityEngine:
    """
    Cosine similarity and clustering module for WaveSight.
    Uses sentence transformers to embed trend submissions and compare them against existing clusters.
    """
    
    def __init__(self):
        # Initialize model (lightweight for fast inference)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Similarity threshold for cluster assignment
        self.similarity_threshold = 0.75
        
        # Initialize vector store (will be replaced with pgvector in production)
        self._initialize_vector_store()
    
    def _initialize_vector_store(self):
        """Initialize vector store from database"""
        try:
            # Fetch existing clusters from Supabase
            response = supabase.table('trend_clusters').select('*').execute()
            
            self.vector_store = {}
            self.cluster_labels = {}
            
            if response.data:
                for cluster in response.data:
                    cluster_id = cluster['id']
                    self.cluster_labels[cluster_id] = cluster.get('label', 'Unnamed Cluster')
                    
                    # Fetch vectors for this cluster
                    vectors_response = supabase.table('trend_vectors').select('*').eq('cluster_id', cluster_id).execute()
                    
                    if vectors_response.data:
                        vectors = [np.array(v['embedding']) for v in vectors_response.data]
                        self.vector_store[cluster_id] = vectors
        except Exception as e:
            print(f"Error initializing vector store: {e}")
            # Fallback to empty store
            self.vector_store = {}
            self.cluster_labels = {}
    
    def embed_text(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        return self.model.encode(text)
    
    def compare_to_existing_clusters(self, new_vector: np.ndarray, metadata: Optional[Dict] = None) -> Dict:
        """
        Compare new vector to existing clusters and return assignment decision
        
        Args:
            new_vector: Embedding vector for new trend
            metadata: Optional metadata about the trend (category, user_id, etc.)
        
        Returns:
            Dictionary with cluster assignment info
        """
        top_score = 0
        top_cluster_id = None
        all_scores = {}
        
        # Compare against all existing clusters
        for cluster_id, vectors in self.vector_store.items():
            similarities = cosine_similarity([new_vector], vectors)
            avg_score = np.mean(similarities)
            max_score = np.max(similarities)
            
            all_scores[cluster_id] = {
                'avg_score': float(avg_score),
                'max_score': float(max_score),
                'label': self.cluster_labels.get(cluster_id, 'Unnamed Cluster')
            }
            
            if avg_score > top_score:
                top_score = avg_score
                top_cluster_id = cluster_id
        
        # Check if it belongs to existing cluster or needs new one
        if top_score >= self.similarity_threshold:
            # Add to existing cluster
            self.vector_store[top_cluster_id].append(new_vector)
            
            return {
                "assigned_cluster": top_cluster_id,
                "score": float(top_score),
                "label": self.cluster_labels.get(top_cluster_id, "Unnamed Cluster"),
                "new_cluster": False,
                "all_scores": all_scores,
                "metadata": metadata
            }
        else:
            # Create new cluster
            new_id = f"cluster_{uuid.uuid4().hex[:8]}"
            self.vector_store[new_id] = [new_vector]
            self.cluster_labels[new_id] = "Pending Label"
            
            # Save to database
            self._save_new_cluster(new_id, new_vector, metadata)
            
            return {
                "assigned_cluster": new_id,
                "score": float(top_score),
                "label": "New Cluster",
                "new_cluster": True,
                "all_scores": all_scores,
                "metadata": metadata
            }
    
    def process_trend_submission(self, text: str, metadata: Optional[Dict] = None) -> Dict:
        """
        Main entry point for processing a trend submission
        
        Args:
            text: Trend description text
            metadata: Optional metadata (category, user_id, platform, etc.)
        
        Returns:
            Cluster assignment result
        """
        # Generate embedding
        embedded = self.embed_text(text)
        
        # Compare to existing clusters
        result = self.compare_to_existing_clusters(embedded, metadata)
        
        # Save vector to database
        self._save_trend_vector(result['assigned_cluster'], embedded, text, metadata)
        
        return result
    
    def get_cluster_trends(self, cluster_id: str, limit: int = 10) -> List[Dict]:
        """Get recent trends from a specific cluster"""
        try:
            response = supabase.table('trend_vectors')\
                .select('*')\
                .eq('cluster_id', cluster_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching cluster trends: {e}")
            return []
    
    def get_trending_clusters(self, limit: int = 10) -> List[Dict]:
        """Get currently trending clusters based on recent activity"""
        try:
            # Get clusters with most recent activity
            response = supabase.rpc('get_trending_clusters', {'limit_count': limit}).execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching trending clusters: {e}")
            return []
    
    def update_cluster_label(self, cluster_id: str, new_label: str) -> bool:
        """Update the human-readable label for a cluster"""
        try:
            response = supabase.table('trend_clusters')\
                .update({'label': new_label, 'updated_at': datetime.utcnow().isoformat()})\
                .eq('id', cluster_id)\
                .execute()
            
            if response.data:
                self.cluster_labels[cluster_id] = new_label
                return True
            return False
        except Exception as e:
            print(f"Error updating cluster label: {e}")
            return False
    
    def _save_new_cluster(self, cluster_id: str, initial_vector: np.ndarray, metadata: Optional[Dict] = None):
        """Save new cluster to database"""
        try:
            cluster_data = {
                'id': cluster_id,
                'label': 'Pending Label',
                'created_at': datetime.utcnow().isoformat(),
                'metadata': metadata or {}
            }
            
            supabase.table('trend_clusters').insert(cluster_data).execute()
        except Exception as e:
            print(f"Error saving new cluster: {e}")
    
    def _save_trend_vector(self, cluster_id: str, vector: np.ndarray, text: str, metadata: Optional[Dict] = None):
        """Save trend vector to database"""
        try:
            vector_data = {
                'cluster_id': cluster_id,
                'embedding': vector.tolist(),
                'text': text,
                'metadata': metadata or {},
                'created_at': datetime.utcnow().isoformat()
            }
            
            supabase.table('trend_vectors').insert(vector_data).execute()
        except Exception as e:
            print(f"Error saving trend vector: {e}")
    
    def calculate_cluster_statistics(self, cluster_id: str) -> Dict:
        """Calculate statistics for a cluster"""
        if cluster_id not in self.vector_store:
            return {"error": "Cluster not found"}
        
        vectors = self.vector_store[cluster_id]
        
        # Calculate centroid
        centroid = np.mean(vectors, axis=0)
        
        # Calculate intra-cluster similarity
        similarities = []
        for i, v1 in enumerate(vectors):
            for j, v2 in enumerate(vectors[i+1:], i+1):
                sim = cosine_similarity([v1], [v2])[0][0]
                similarities.append(sim)
        
        avg_similarity = np.mean(similarities) if similarities else 0
        
        return {
            "cluster_id": cluster_id,
            "label": self.cluster_labels.get(cluster_id, "Unnamed Cluster"),
            "size": len(vectors),
            "avg_intra_similarity": float(avg_similarity),
            "centroid_norm": float(np.linalg.norm(centroid))
        }


# Singleton instance
trend_similarity_engine = TrendSimilarityEngine()


# Example usage and testing
if __name__ == "__main__":
    # Test the similarity engine
    engine = TrendSimilarityEngine()
    
    # Test submissions
    test_trends = [
        "mob wife aesthetic tiktok outfits",
        "sopranos-core fashion on tiktok", 
        "clean girl aesthetic gold hoops minimal makeup",
        "office siren aesthetic blazers and heels",
        "mob wife energy fur coats and sunglasses"
    ]
    
    for trend in test_trends:
        result = engine.process_trend_submission(
            trend,
            metadata={
                "platform": "tiktok",
                "category": "fashion",
                "user_id": "test_user"
            }
        )
        print(f"\nTrend: {trend}")
        print(f"Result: {json.dumps(result, indent=2)}")
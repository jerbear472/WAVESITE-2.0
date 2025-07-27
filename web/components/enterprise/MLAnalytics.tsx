import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  BarChart3,
  Network,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Clock,
  Users,
  Hash,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface TrendCluster {
  id: string;
  label: string;
  size: number;
  avg_intra_similarity: number;
  recent_activity: number;
}

interface SimilarityResult {
  assigned_cluster: string;
  score: number;
  label: string;
  new_cluster: boolean;
  all_scores: Record<string, any>;
}

interface TrendAnalysis {
  virality_score: number;
  predicted_peak: string;
  expected_duration: number;
  confidence: number;
  similar_trends: Array<{
    id: string;
    peak_reached: any;
    duration: number;
  }>;
}

export const MLAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState('similarity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Similarity Checker State
  const [trendText, setTrendText] = useState('');
  const [similarityResult, setSimilarityResult] = useState<SimilarityResult | null>(null);

  // Cluster Analytics State
  const [clusters, setClusters] = useState<TrendCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [clusterTrends, setClusterTrends] = useState<any[]>([]);

  // Trend Analysis State
  const [analysisResult, setAnalysisResult] = useState<TrendAnalysis | null>(null);

  useEffect(() => {
    if (activeTab === 'clusters') {
      fetchTrendingClusters();
    }
  }, [activeTab]);

  const checkSimilarity = async () => {
    if (!trendText.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/similarity/check-similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: trendText,
          metadata: {
            source: 'enterprise_dashboard',
            timestamp: new Date().toISOString()
          }
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to check similarity');
      }
      
      const data = await response.json();
      setSimilarityResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to check similarity');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingClusters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/similarity/trending-clusters`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch clusters');
      }
      
      const data = await response.json();
      setClusters(data.clusters || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch clusters');
    } finally {
      setLoading(false);
    }
  };

  const fetchClusterTrends = async (clusterId: string) => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/similarity/cluster/${clusterId}/trends`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch cluster trends');
      }
      
      const data = await response.json();
      setClusterTrends(data.trends || []);
      setSelectedCluster(clusterId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch cluster trends');
    } finally {
      setLoading(false);
    }
  };

  const analyzeTrend = async () => {
    if (!trendText.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Mock analysis - replace with actual endpoint when available
      const mockAnalysis: TrendAnalysis = {
        virality_score: Math.random() * 0.5 + 0.5,
        predicted_peak: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        expected_duration: Math.floor(Math.random() * 30) + 10,
        confidence: Math.random() * 0.4 + 0.6,
        similar_trends: []
      };
      
      setAnalysisResult(mockAnalysis);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze trend');
    } finally {
      setLoading(false);
    }
  };

  const reindexClusters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/similarity/reindex-clusters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reindex clusters');
      }
      
      fetchTrendingClusters();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reindex clusters');
    } finally {
      setLoading(false);
    }
  };

  const renderSimilarityChecker = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Trend Similarity Checker
        </h3>
        
        <div className="space-y-4">
          <textarea
            value={trendText}
            onChange={(e) => setTrendText(e.target.value)}
            placeholder="Enter trend description to check for similarity..."
            className="w-full h-32 px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          
          <button
            onClick={checkSimilarity}
            disabled={loading || !trendText.trim()}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Check Similarity
              </>
            )}
          </button>
        </div>
        
        {similarityResult && (
          <div className="mt-6 space-y-4">
            <div className={`p-4 rounded-lg ${similarityResult.new_cluster ? 'bg-green-900/50' : 'bg-blue-900/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {similarityResult.new_cluster ? 'New Cluster Created' : 'Assigned to Existing Cluster'}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${similarityResult.new_cluster ? 'bg-green-600' : 'bg-blue-600'}`}>
                  {(similarityResult.score * 100).toFixed(1)}% match
                </span>
              </div>
              <p className="text-sm text-gray-300">
                Cluster: {similarityResult.label} ({similarityResult.assigned_cluster})
              </p>
            </div>
            
            {Object.keys(similarityResult.all_scores).length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Similarity Scores</h4>
                <div className="space-y-2">
                  {Object.entries(similarityResult.all_scores).map(([clusterId, scores]: [string, any]) => (
                    <div key={clusterId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{scores.label}</span>
                      <div className="flex gap-4">
                        <span className="text-gray-400">Avg: {(scores.avg_score * 100).toFixed(1)}%</span>
                        <span className="text-gray-400">Max: {(scores.max_score * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderClusterAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Network className="w-5 h-5" />
            Trend Clusters
          </h3>
          <button
            onClick={reindexClusters}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Reindex
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              onClick={() => fetchClusterTrends(cluster.id)}
              className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
            >
              <h4 className="font-medium mb-2">{cluster.label}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Size:</span>
                  <span>{cluster.size} trends</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Similarity:</span>
                  <span>{(cluster.avg_intra_similarity * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Activity:</span>
                  <span>{cluster.recent_activity || 0} recent</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {selectedCluster && clusterTrends.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Cluster Trends</h3>
          <div className="space-y-3">
            {clusterTrends.map((trend, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm mb-2">{trend.text}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{format(new Date(trend.created_at), 'MMM d, yyyy')}</span>
                  {trend.metadata?.platform && (
                    <span className="px-2 py-1 bg-gray-600 rounded">
                      {trend.metadata.platform}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTrendAnalysis = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Trend Virality Analysis
        </h3>
        
        <div className="space-y-4">
          <textarea
            value={trendText}
            onChange={(e) => setTrendText(e.target.value)}
            placeholder="Enter trend description to analyze viral potential..."
            className="w-full h-32 px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          
          <button
            onClick={analyzeTrend}
            disabled={loading || !trendText.trim()}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Analyze Virality
              </>
            )}
          </button>
        </div>
        
        {analysisResult && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Virality Score</span>
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold">
                  {(analysisResult.virality_score * 100).toFixed(0)}%
                </div>
                <div className="h-2 bg-gray-600 rounded-full mt-2">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${analysisResult.virality_score * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Confidence</span>
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold">
                  {(analysisResult.confidence * 100).toFixed(0)}%
                </div>
                <div className="h-2 bg-gray-600 rounded-full mt-2">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                    style={{ width: `${analysisResult.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Predicted Peak</span>
                </div>
                <p className="font-medium">
                  {format(new Date(analysisResult.predicted_peak), 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  in {Math.ceil((new Date(analysisResult.predicted_peak).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">Expected Duration</span>
                </div>
                <p className="font-medium">
                  {analysisResult.expected_duration} days
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  trending period
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">ML Analytics</h1>
        <p className="text-gray-400">Analyze trends with machine learning</p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-900/50 border border-red-600 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="bg-gray-800 rounded-lg p-1 mb-6">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('similarity')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'similarity'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>Similarity</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('clusters')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'clusters'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Network className="w-4 h-4" />
              <span>Clusters</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'analysis'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Brain className="w-4 h-4" />
              <span>Analysis</span>
            </div>
          </button>
        </div>
      </div>
      
      {activeTab === 'similarity' && renderSimilarityChecker()}
      {activeTab === 'clusters' && renderClusterAnalytics()}
      {activeTab === 'analysis' && renderTrendAnalysis()}
    </div>
  );
};


'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain,
  Loader,
  Search,
  TrendingUp,
  Globe,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Users,
  Eye,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Share2,
  BookOpen,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface TrendData {
  id: string;
  title?: string;
  description: string;
  category: string;
  platform?: string;
  url?: string;
  creator_handle?: string;
  hashtags?: string[];
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  created_at: string;
}

interface AIAnalysis {
  summary: string;
  virality_prediction: {
    score: number;
    reasoning: string;
    peak_timeframe: string;
  };
  cultural_context: string;
  similar_trends: string[];
  target_demographics: string[];
  growth_trajectory: string;
  recommendations: string[];
  web_context: {
    related_articles: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
    social_mentions: number;
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  };
}

export default function TrendAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (params?.trendId && user) {
      loadTrendData();
    }
  }, [params?.trendId, user]);

  const loadTrendData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trend data
      const { data: trendData, error: trendError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('id', params?.trendId)
        .single();

      if (trendError) throw trendError;
      
      setTrend(trendData);

      // Check if we have cached analysis
      const { data: cachedAnalysis } = await supabase
        .from('trend_ai_analysis')
        .select('*')
        .eq('trend_id', params?.trendId)
        .single();

      if (cachedAnalysis) {
        setAnalysis(cachedAnalysis.analysis);
      } else {
        // Start AI analysis
        await performAIAnalysis(trendData);
      }
    } catch (err: any) {
      console.error('Error loading trend:', err);
      setError('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  const performAIAnalysis = async (trendData: TrendData) => {
    try {
      setAnalyzing(true);
      setError(null);

      // Call our API endpoint for full AI analysis
      const response = await fetch('/api/analyze-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullAnalysis: true, // Request full analysis
          trendId: trendData.id,
          title: trendData.title || trendData.description,
          description: trendData.description,
          category: trendData.category,
          platform: trendData.platform,
          url: trendData.url,
          hashtags: trendData.hashtags,
          metrics: {
            views: trendData.views_count,
            likes: trendData.likes_count,
            comments: trendData.comments_count
          }
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const analysisResult = await response.json();
      setAnalysis(analysisResult);

      // Cache the analysis
      await supabase
        .from('trend_ai_analysis')
        .upsert({
          trend_id: trendData.id,
          analysis: analysisResult,
          created_at: new Date().toISOString()
        });

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError('Failed to analyze trend. Please try again.');
      setRetryCount(prev => prev + 1);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetry = () => {
    if (trend) {
      performAIAnalysis(trend);
    }
  };

  const getViralityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      case 'mixed': return '🤔';
      default: return '😐';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading trend data...</p>
        </div>
      </div>
    );
  }

  if (error && !trend) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Trend</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                AI Trend Analysis
              </h1>
              <p className="text-gray-600">
                Powered by Claude with real-time web context
              </p>
            </div>
            
            {analysis && !analyzing && (
              <button
                onClick={handleRetry}
                className="p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Trend Overview */}
        {trend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-6 mb-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {trend.title || trend.description}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {trend.platform && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      {trend.platform}
                    </span>
                  )}
                  {trend.category && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                      {trend.category}
                    </span>
                  )}
                </div>
              </div>
              
              {trend.url && (
                <a
                  href={trend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-gray-500" />
                </a>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              {trend.views_count !== undefined && (
                <div className="text-center">
                  <Eye className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-2xl font-semibold">{trend.views_count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Views</p>
                </div>
              )}
              {trend.likes_count !== undefined && (
                <div className="text-center">
                  <TrendingUp className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-2xl font-semibold">{trend.likes_count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Likes</p>
                </div>
              )}
              {trend.comments_count !== undefined && (
                <div className="text-center">
                  <MessageSquare className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-2xl font-semibold">{trend.comments_count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* AI Analysis */}
        {analyzing ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analyzing Trend...
            </h3>
            <p className="text-gray-600 mb-4">
              Claude is searching the web and analyzing cultural signals
            </p>
            <div className="flex items-center justify-center gap-2">
              <Loader className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-500">This may take a moment</span>
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Virality Prediction */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">Virality Prediction</h3>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Viral Potential</span>
                  <span className={`text-2xl font-bold ${getViralityColor(analysis.virality_prediction.score)}`}>
                    {analysis.virality_prediction.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r ${
                      analysis.virality_prediction.score >= 80 ? 'from-green-400 to-green-600' :
                      analysis.virality_prediction.score >= 60 ? 'from-yellow-400 to-yellow-600' :
                      analysis.virality_prediction.score >= 40 ? 'from-orange-400 to-orange-600' :
                      'from-red-400 to-red-600'
                    }`}
                    style={{ width: `${analysis.virality_prediction.score}%` }}
                  />
                </div>
              </div>
              
              <p className="text-gray-700 mb-3">{analysis.virality_prediction.reasoning}</p>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Expected Peak:</span>
                <span className="font-medium text-gray-900">{analysis.virality_prediction.peak_timeframe}</span>
              </div>
            </motion.div>

            {/* Web Context */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">Web Context</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Social Mentions</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {analysis.web_context.social_mentions.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Sentiment</p>
                  <p className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    {getSentimentEmoji(analysis.web_context.sentiment)}
                    {analysis.web_context.sentiment}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Growth</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {analysis.growth_trajectory}
                  </p>
                </div>
              </div>

              {/* Related Articles */}
              {analysis.web_context.related_articles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Related Coverage</h4>
                  <div className="space-y-2">
                    {analysis.web_context.related_articles.slice(0, 3).map((article, index) => (
                      <a
                        key={index}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <p className="font-medium text-gray-900 text-sm mb-1">{article.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{article.snippet}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Cultural Context */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900">Cultural Context</h3>
              </div>
              <p className="text-gray-700 mb-4">{analysis.cultural_context}</p>
              
              {/* Demographics */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Target Demographics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.target_demographics.map((demo, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {demo}
                    </span>
                  ))}
                </div>
              </div>

              {/* Similar Trends */}
              {analysis.similar_trends.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Similar Trends</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.similar_trends.map((trend, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {trend}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">Strategic Recommendations</h3>
              </div>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <p className="text-gray-700 flex-1">{rec}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Back to Dashboard
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  // Share functionality
                  if (navigator.share && analysis) {
                    navigator.share({
                      title: `Trend Analysis: ${trend?.title || trend?.description}`,
                      text: `Viral potential: ${analysis.virality_prediction.score}% - ${analysis.summary}`,
                      url: window.location.href
                    });
                  }
                }}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Failed</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            {retryCount < 3 && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry Analysis
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
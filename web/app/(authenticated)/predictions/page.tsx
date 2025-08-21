'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { 
  Clock, 
  TrendingUp, 
  Globe, 
  Zap, 
  Trophy,
  Calendar,
  Users,
  BarChart3,
  Target,
  Flame,
  Star,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ValidatedTrend {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  url: string;
  thumbnail_url?: string;
  creator_handle?: string;
  validation_consensus: number;
  submitted_at: string;
  spotter_username: string;
  current_status?: string;
  existing_prediction?: TrendPrediction;
}

interface TrendPrediction {
  id?: string;
  trend_id: string;
  predictor_id: string;
  peak_time: string; // 24hrs, 48hrs, 1week, 2weeks, peaked
  scale: string; // niche, subculture, mainstream, global
  next_phase: string; // 1-3days, 4-7days, 1-2weeks, 2-4weeks
  confidence_level: number;
  predicted_at?: string;
  status?: string;
}

interface PredictorStats {
  total_predictions: number;
  accurate_predictions: number;
  accuracy_rate: number;
  current_streak: number;
  total_xp_earned: number;
}

export default function PredictionsPage() {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [activeTab, setActiveTab] = useState<'predict' | 'tracking' | 'history'>('predict');
  const [validatedTrends, setValidatedTrends] = useState<ValidatedTrend[]>([]);
  const [myStats, setMyStats] = useState<PredictorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<ValidatedTrend | null>(null);
  const [predictionForm, setPredictionForm] = useState<TrendPrediction>({
    trend_id: '',
    predictor_id: '',
    peak_time: '',
    scale: '',
    next_phase: '',
    confidence_level: 50
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadValidatedTrends();
      loadMyStats();
    }
  }, [user]);

  const loadValidatedTrends = async () => {
    try {
      // Get trends that have been validated (3+ positive validations)
      const { data: trends, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:users!trend_submissions_spotter_id_fkey(username),
          predictions:trend_predictions(*)
        `)
        .eq('status', 'validated')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedTrends = trends?.map(trend => ({
        id: trend.id,
        title: trend.title || trend.trend_headline || 'Untitled',
        description: trend.description || trend.why_trending || '',
        platform: trend.platform || 'unknown',
        category: trend.category || 'general',
        url: trend.url || trend.post_url || '',
        thumbnail_url: trend.thumbnail_url,
        creator_handle: trend.creator_handle,
        validation_consensus: 85, // Mock for now
        submitted_at: trend.created_at,
        spotter_username: trend.spotter?.username || 'Anonymous',
        current_status: trend.status,
        existing_prediction: trend.predictions?.find((p: any) => p.predictor_id === user?.id)
      })) || [];

      setValidatedTrends(formattedTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyStats = async () => {
    if (!user) return;
    
    try {
      const { data: predictions } = await supabase
        .from('trend_predictions')
        .select('*')
        .eq('predictor_id', user.id);

      const stats: PredictorStats = {
        total_predictions: predictions?.length || 0,
        accurate_predictions: predictions?.filter(p => p.status === 'correct').length || 0,
        accuracy_rate: 0,
        current_streak: 0,
        total_xp_earned: 0
      };

      if (stats.total_predictions > 0) {
        stats.accuracy_rate = Math.round((stats.accurate_predictions / stats.total_predictions) * 100);
      }

      setMyStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handlePredictionSubmit = async () => {
    if (!user || !selectedTrend) return;
    
    if (!predictionForm.peak_time || !predictionForm.scale || !predictionForm.next_phase) {
      alert('Please complete all prediction fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('trend_predictions')
        .insert({
          trend_id: selectedTrend.id,
          predictor_id: user.id,
          peak_time: predictionForm.peak_time,
          scale: predictionForm.scale,
          next_phase: predictionForm.next_phase,
          confidence_level: predictionForm.confidence_level,
          status: 'pending'
        });

      if (error) throw error;

      // Award XP for making a prediction using unified XP system
      const { error: xpError } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: 25,
        p_type: 'prediction',
        p_description: `Predicted trend: ${selectedTrend.title}`,
        p_reference_id: selectedTrend.id,
        p_reference_type: 'trend_submission'
      });

      // Show XP notification
      if (!xpError) {
        showXPNotification(25, 'Trend prediction submitted!', 'prediction');
      }

      setSuccessMessage('Prediction submitted! +25 XP');
      setTimeout(() => {
        setSuccessMessage('');
        setSelectedTrend(null);
        setPredictionForm({
          trend_id: '',
          predictor_id: '',
          peak_time: '',
          scale: '',
          next_phase: '',
          confidence_level: 50
        });
        loadValidatedTrends();
      }, 2000);

    } catch (error) {
      console.error('Error submitting prediction:', error);
      alert('Failed to submit prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      tiktok: '🎵',
      instagram: '📸',
      twitter: '𝕏',
      reddit: '🔥',
      youtube: '📺',
      default: '🌐'
    };
    return emojis[platform.toLowerCase()] || emojis.default;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-2"
          >
            Trend Predictions
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600"
          >
            Predict the trajectory of validated trends and earn XP
          </motion.p>
        </div>

        {/* Stats Summary */}
        {myStats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{myStats.total_predictions}</p>
              <p className="text-sm text-gray-600">Predictions</p>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-green-500" />
                <span className="text-xs text-gray-500">Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{myStats.accuracy_rate}%</p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-xs text-gray-500">Streak</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{myStats.current_streak}</p>
              <p className="text-sm text-gray-600">Current</p>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <span className="text-xs text-gray-500">Earned</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{myStats.total_xp_earned}</p>
              <p className="text-sm text-gray-600">Total XP</p>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
            {(['predict', 'tracking', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab === 'predict' && '🎯 Make Predictions'}
                {tab === 'tracking' && '📊 Track Active'}
                {tab === 'history' && '📜 History'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'predict' && (
            <motion.div
              key="predict"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {!selectedTrend ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {validatedTrends.filter(t => !t.existing_prediction).map((trend) => (
                    <motion.div
                      key={trend.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setSelectedTrend(trend)}
                    >
                      {trend.thumbnail_url ? (
                        <div className="h-40 bg-gray-100">
                          <img 
                            src={trend.thumbnail_url} 
                            alt={trend.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-40 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-6xl">{getPlatformEmoji(trend.platform)}</span>
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getPlatformEmoji(trend.platform)}</span>
                          <span className="text-sm text-gray-500">{trend.platform}</span>
                          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {trend.validation_consensus}% validated
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {trend.title}
                        </h3>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {trend.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>By @{trend.spotter_username}</span>
                          <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                            Predict <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    {/* Trend Info */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <button
                        onClick={() => setSelectedTrend(null)}
                        className="text-sm text-gray-600 hover:text-gray-900 mb-4"
                      >
                        ← Back to trends
                      </button>
                      
                      <div className="flex items-start gap-4">
                        {selectedTrend.thumbnail_url && (
                          <img 
                            src={selectedTrend.thumbnail_url} 
                            alt={selectedTrend.title}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {selectedTrend.title}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {selectedTrend.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{getPlatformEmoji(selectedTrend.platform)} {selectedTrend.platform}</span>
                            <span>Spotted by @{selectedTrend.spotter_username}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prediction Form */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          📅 When will this trend peak?
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {['48hrs', '1 week', '2-4 weeks', '2-3 months', '6 months'].map((option) => (
                            <button
                              key={option}
                              onClick={() => setPredictionForm({...predictionForm, peak_time: option})}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                predictionForm.peak_time === option
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          🌍 How big will it get?
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { value: 'niche', label: 'Niche', desc: '<100K' },
                            { value: 'subculture', label: 'Subculture', desc: '100K-1M' },
                            { value: 'mainstream', label: 'Mainstream', desc: '1M-10M' },
                            { value: 'global', label: 'Global', desc: '10M+' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setPredictionForm({...predictionForm, scale: option.value})}
                              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                predictionForm.scale === option.value
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <div>{option.label}</div>
                              <div className="text-xs opacity-75">{option.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          ⏭️ Next major phase in:
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {['1-3 days', '4-7 days', '1-2 weeks', '2-4 weeks'].map((option) => (
                            <button
                              key={option}
                              onClick={() => setPredictionForm({...predictionForm, next_phase: option})}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                predictionForm.next_phase === option
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          💪 Confidence Level: {predictionForm.confidence_level}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={predictionForm.confidence_level}
                          onChange={(e) => setPredictionForm({...predictionForm, confidence_level: parseInt(e.target.value)})}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Low</span>
                          <span>Medium</span>
                          <span>High</span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Potential Reward:</span>
                          <span className="ml-2 text-green-600 font-bold">50-500 XP</span>
                          <div className="text-xs text-gray-500 mt-1">Based on accuracy & timing</div>
                        </div>
                        
                        <button
                          onClick={handlePredictionSubmit}
                          disabled={submitting || !predictionForm.peak_time || !predictionForm.scale || !predictionForm.next_phase}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting...' : 'Submit Prediction'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Success Message */}
                  <AnimatePresence>
                    {successMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-center"
                      >
                        <CheckCircle className="inline-block h-5 w-5 mr-2" />
                        {successMessage}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'tracking' && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Active Predictions</h2>
              <p className="text-gray-600">Track your predictions as they play out in real-time.</p>
              {/* Add tracking content here */}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Prediction History</h2>
              <p className="text-gray-600">Review your past predictions and learn from your patterns.</p>
              {/* Add history content here */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
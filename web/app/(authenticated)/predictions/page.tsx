'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, TrendingUp, Link, CheckCircle, XCircle, AlertCircle, Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpikePrediction {
  id: string;
  predictor_id: string;
  trend_title: string;
  trend_description: string;
  original_link: string;
  prediction_type: string;
  predicted_at: string;
  prediction_due_at: string;
  confidence_level: number;
  status: string;
  predictor_name: string;
  predictor_avatar: string;
  predictor_title: string;
  accuracy_rate: number;
  seconds_remaining: number;
}

interface PredictorStats {
  successful_predictions: number;
  total_predictions: number;
  accuracy_rate: number;
  current_success_streak: number;
  reputation_score: number;
  predictor_title: string;
}

export default function PredictionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'make' | 'active' | 'validate'>('make');
  const [predictions, setPredictions] = useState<SpikePrediction[]>([]);
  const [myStats, setMyStats] = useState<PredictorStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  // New prediction form
  const [trendTitle, setTrendTitle] = useState('');
  const [originalLink, setOriginalLink] = useState('');
  const [predictionType, setPredictionType] = useState('48_hours');
  const [confidence, setConfidence] = useState(3);
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPredictions();
    fetchMyStats();
  }, [user]);

  const fetchPredictions = async () => {
    const { data, error } = await supabase
      .from('active_predictions_view')
      .select('*')
      .order('prediction_due_at', { ascending: true });
    
    if (data) setPredictions(data);
  };

  const fetchMyStats = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('predictor_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) setMyStats(data);
  };

  const handleMakePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    
    try {
      const { data, error } = await supabase.rpc('create_spike_prediction', {
        p_user_id: user.id,
        p_trend_title: trendTitle,
        p_original_link: originalLink,
        p_prediction_type: predictionType,
        p_confidence: confidence,
        p_reasoning: reasoning
      });
      
      if (error) throw error;
      
      // Reset form
      setTrendTitle('');
      setOriginalLink('');
      setReasoning('');
      setConfidence(3);
      
      // Refresh predictions
      fetchPredictions();
      fetchMyStats();
      
      // Switch to active tab
      setActiveTab('active');
      
      alert('Prediction submitted! You\'ll be notified when it\'s time to submit proof.');
    } catch (error) {
      console.error('Error making prediction:', error);
      alert('Failed to submit prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Ready for proof!';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getConfidenceColor = (level: number) => {
    const colors = ['bg-gray-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
    return colors[level - 1] || colors[2];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'awaiting_proof': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'proof_submitted': return <TrendingUp className="h-5 w-5 text-purple-500" />;
      case 'validated': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Stats */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🔮 Spike Predictions
          </h1>
          <p className="text-gray-300 mb-6">
            Predict which trends will spike and prove it with evidence!
          </p>
          
          {myStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">Success Rate</p>
                <p className="text-xl font-bold text-white">{myStats.accuracy_rate.toFixed(1)}%</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">Successful</p>
                <p className="text-xl font-bold text-green-400">{myStats.successful_predictions}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-xl font-bold text-white">{myStats.total_predictions}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">Streak</p>
                <p className="text-xl font-bold text-yellow-400">🔥 {myStats.current_success_streak}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">Title</p>
                <p className="text-sm font-bold text-purple-400">{myStats.predictor_title}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-white/10 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('make')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'make'
                ? 'bg-white text-purple-900'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Make Prediction
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-white text-purple-900'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Active Predictions
          </button>
          <button
            onClick={() => setActiveTab('validate')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'validate'
                ? 'bg-white text-purple-900'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Validate Proofs
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'make' && (
            <motion.div
              key="make"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Make a Spike Prediction</h2>
              
              <form onSubmit={handleMakePrediction} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trend Title
                  </label>
                  <input
                    type="text"
                    value={trendTitle}
                    onChange={(e) => setTrendTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Roman Empire trend"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Original Link (Current State)
                  </label>
                  <input
                    type="url"
                    value={originalLink}
                    onChange={(e) => setOriginalLink(e.target.value)}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://tiktok.com/@user/video/..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prediction Window
                  </label>
                  <select
                    value={predictionType}
                    onChange={(e) => setPredictionType(e.target.value)}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="48_hours">48 Hours</option>
                    <option value="1_week">1 Week</option>
                    <option value="2_weeks">2 Weeks</option>
                    <option value="1_month">1 Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confidence Level: {confidence}/5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidence}
                    onChange={(e) => setConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Why will this spike? (Optional)
                  </label>
                  <textarea
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Explain your prediction..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Prediction (+10 XP)'}
                </button>
              </form>

              {/* How it works */}
              <div className="mt-8 p-4 bg-purple-900/30 rounded-lg">
                <h3 className="font-bold text-white mb-3">🎯 How Spike Predictions Work:</h3>
                <ol className="space-y-2 text-sm text-gray-300">
                  <li>1. <strong>Predict:</strong> Find a trend you think will spike (10 XP)</li>
                  <li>2. <strong>Wait:</strong> Let your prediction window pass (48hrs - 1 month)</li>
                  <li>3. <strong>Prove:</strong> Submit links showing the trend spiked (50 XP)</li>
                  <li>4. <strong>Validate:</strong> Community votes if your proof is valid (100 XP if approved)</li>
                  <li>5. <strong>Earn:</strong> Build your reputation as a trend prophet!</li>
                </ol>
              </div>
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {predictions.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center">
                  <p className="text-gray-300">No active predictions yet. Be the first!</p>
                </div>
              ) : (
                predictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/15 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <img
                            src={prediction.predictor_avatar || '/default-avatar.png'}
                            alt={prediction.predictor_name}
                            className="h-10 w-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-white">{prediction.predictor_name}</p>
                            <p className="text-xs text-gray-400">
                              {prediction.predictor_title} • {prediction.accuracy_rate.toFixed(0)}% accuracy
                            </p>
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2">{prediction.trend_title}</h3>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(prediction.status)}
                            <span className="text-gray-300">{prediction.status}</span>
                          </span>
                          
                          <span className="text-gray-400">
                            Confidence: 
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(prediction.confidence_level)} text-white`}>
                              {prediction.confidence_level}/5
                            </span>
                          </span>
                        </div>
                        
                        <a
                          href={prediction.original_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 mt-2"
                        >
                          <Link className="h-4 w-4" />
                          <span className="text-sm">View original</span>
                        </a>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Time remaining:</p>
                        <p className={`text-lg font-bold ${
                          prediction.seconds_remaining <= 0 ? 'text-yellow-400 animate-pulse' : 'text-white'
                        }`}>
                          {formatTimeRemaining(prediction.seconds_remaining)}
                        </p>
                        
                        {prediction.seconds_remaining <= 0 && prediction.predictor_id === user?.id && (
                          <button className="mt-2 px-3 py-1 bg-yellow-500 text-black rounded-md text-sm font-medium hover:bg-yellow-400">
                            Submit Proof
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'validate' && (
            <motion.div
              key="validate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Validate Spike Proofs</h2>
              <p className="text-gray-300">
                Review proof submissions and vote whether they demonstrate a real spike.
                Earn XP for accurate validations!
              </p>
              <div className="mt-6 text-center text-gray-400">
                <p>Coming soon: Community validation interface</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* XP Rewards Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-lg p-4">
            <h3 className="font-bold text-green-400 mb-2">🎯 Prediction Rewards</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Make prediction: +10 XP</li>
              <li>• Submit proof: +50 XP</li>
              <li>• Validated by community: +100 XP</li>
              <li>• Perfect prediction: +200 XP</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-lg p-4">
            <h3 className="font-bold text-blue-400 mb-2">✅ Validation Rewards</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Vote on proof: +5 XP</li>
              <li>• Vote with majority: +5 XP</li>
              <li>• First to validate: +10 XP</li>
              <li>• Spot fake proof: +15 XP</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-lg p-4">
            <h3 className="font-bold text-purple-400 mb-2">🔥 Streak Bonuses</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 3 correct predictions: +50 XP</li>
              <li>• 5 correct predictions: +100 XP</li>
              <li>• 10 correct predictions: +500 XP</li>
              <li>• Prophet title unlocked!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
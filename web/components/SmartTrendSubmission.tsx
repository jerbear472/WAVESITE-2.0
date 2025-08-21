'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { 
  X,
  Coins,
  CheckIcon,
  LoaderIcon,
  Hash,
  Globe,
  Zap,
  TrendingUp,
  Sparkles,
  AlertCircle
} from 'lucide-react';

// Quality scoring functions
const calculateDescriptionQuality = (description: string): number => {
  if (!description) return 0;
  
  let score = 0;
  const wordCount = description.split(/\s+/).length;
  
  // Length bonus
  if (wordCount >= 10) score += 10;
  if (wordCount >= 20) score += 10;
  if (wordCount >= 30) score += 10;
  
  // Specificity checks
  const hasNumbers = /\d+/.test(description);
  const hasPlatform = /tiktok|instagram|youtube|twitter|reddit|threads|x\.com/i.test(description);
  if (hasNumbers) score += 10;
  if (hasPlatform) score += 10;
  
  // Action verbs
  const actionVerbs = ['pranking', 'dancing', 'creating', 'posting', 'sharing', 'remixing', 
                       'jumping', 'reacting', 'building', 'launching', 'going', 'making',
                       'flooding', 'exploding', 'surging', 'transforming', 'disrupting'];
  const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
  if (hasActionVerb) score += 20;
  
  // Humor/Personality
  const humorWords = ['hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'viral', 'broke the internet'];
  const hasHumor = humorWords.some(word => description.toLowerCase().includes(word));
  if (hasHumor) score += 10;
  
  // Explanation quality
  const hasWhy = /because|since|due to|thanks to|after/i.test(description);
  if (hasWhy) score += 10;
  
  return Math.min(score, 100);
};

// Quality Indicators Component
const QualityIndicators = ({ description }: { description: string }) => {
  const wordCount = description.split(/\s+/).length;
  const hasNumbers = /\d+/.test(description);
  const hasPlatform = /tiktok|instagram|youtube|twitter|reddit|threads|x\.com/i.test(description);
  const actionVerbs = ['pranking', 'dancing', 'creating', 'posting', 'sharing', 'remixing', 
                       'jumping', 'reacting', 'building', 'launching', 'going', 'making',
                       'flooding', 'exploding', 'surging', 'transforming', 'disrupting'];
  const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
  const humorWords = ['hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'viral', 'broke the internet'];
  const hasHumor = humorWords.some(word => description.toLowerCase().includes(word));
  const hasWhy = /because|since|due to|thanks to|after/i.test(description);
  
  const qualityScore = calculateDescriptionQuality(description);
  const xpBonus = Math.floor(qualityScore / 2);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/30">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-medium text-white">Quality Bonus XP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-yellow-400">+{xpBonus}</span>
          <span className="text-xs text-gray-400">/ 50 max</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <QualityCheck met={wordCount >= 20} label="20+ words" icon={<Hash className="w-3 h-3" />} />
        <QualityCheck met={hasPlatform} label="Platform mentioned" icon={<Globe className="w-3 h-3" />} />
        <QualityCheck met={hasActionVerb} label="Action verb" icon={<Zap className="w-3 h-3" />} />
        <QualityCheck met={hasNumbers} label="Specific numbers" icon={<TrendingUp className="w-3 h-3" />} />
        <QualityCheck met={hasHumor} label="Personality/Humor" icon={<Sparkles className="w-3 h-3" />} />
        <QualityCheck met={hasWhy} label="Explains why" icon={<AlertCircle className="w-3 h-3" />} />
      </div>
    </div>
  );
};

const QualityCheck = ({ met, label, icon }: { met: boolean; label: string; icon: React.ReactNode }) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
    met ? 'bg-green-900/20 border border-green-800/30' : 'bg-gray-800/30 border border-gray-700/30'
  }`}>
    <div className={`${met ? 'text-green-400' : 'text-gray-500'}`}>
      {met ? <CheckIcon className="w-4 h-4" /> : icon}
    </div>
    <span className={`text-xs ${met ? 'text-green-400' : 'text-gray-500'}`}>
      {label}
    </span>
  </div>
);

interface SmartTrendSubmissionNewProps {
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  initialUrl?: string;
}

export default function SmartTrendSubmissionNew({ onClose, onSubmit, initialUrl = '' }: SmartTrendSubmissionNewProps) {
  const { user } = useAuth();
  const { logTrendSubmission, isSessionActive } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{ show: boolean; xp: number } | null>(null);
  
  const [formData, setFormData] = useState({
    url: initialUrl || '',
    title: '',
    platform: '',
    trendVelocity: '',
    trendSize: '',
    predictedPeak: '',
    category: '',
    categoryAnswers: {} as Record<string, string>,
    audienceAge: [] as string[],
    aiAngle: '',
    sentiment: 50
  });

  const showEarnings = (xp: number) => {
    setNotification({ show: true, xp });
    setTimeout(() => setNotification(null), 3000);
  };

  const dismissNotification = () => setNotification(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Submitting trend:', formData);
      
      if (onSubmit) {
        await onSubmit(formData);
      }
      
      // Calculate XP
      const baseXP = 30;
      const qualityBonus = Math.floor(calculateDescriptionQuality(formData.title) / 2);
      const velocityBonus = formData.trendVelocity && formData.trendSize ? 20 : 0;
      const predictionBonus = formData.predictedPeak ? 15 : 0;
      const categoryBonus = Object.keys(formData.categoryAnswers).length >= 2 ? 15 : 0;
      const totalXP = baseXP + qualityBonus + velocityBonus + predictionBonus + categoryBonus;
      
      showEarnings(totalXP);
      
      if (isSessionActive()) {
        logTrendSubmission();
      }
      
      setLoading(false);
      onClose();
    } catch (error: any) {
      console.error('Submission error:', error);
      setError(error.message || 'Failed to submit trend');
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {notification?.show && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-4 left-4 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <Coins className="w-6 h-6" />
              <div>
                <p className="font-bold text-lg">+{notification.xp} XP Earned!</p>
                <p className="text-sm opacity-90">Great spot, Cultural Anthropologist!</p>
              </div>
              <button
                onClick={dismissNotification}
                className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-800 shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-5 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Spot Cultural Wave</h2>
                  <p className="text-xs text-gray-400">Earn up to 200 XP</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              {/* XP Potential Banner */}
              <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-4 rounded-lg border border-yellow-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-400">Total XP Available</h3>
                    <p className="text-xs text-gray-400 mt-1">Base + Quality + Accuracy Bonuses</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-yellow-400">200</div>
                    <div className="text-xs text-gray-400">max XP</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="text-yellow-400 font-semibold">30 XP</div>
                    <div className="text-gray-400">Base submission</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="text-blue-400 font-semibold">+50 XP</div>
                    <div className="text-gray-400">Quality bonus</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="text-purple-400 font-semibold">+120 XP</div>
                    <div className="text-gray-400">If validated</div>
                  </div>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Trend URL <span className="text-red-400">*</span>
                  <span className="ml-2 text-xs text-yellow-400">+30 base XP</span>
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="Paste TikTok, Instagram, YouTube, X link..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Quality Description Input */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Describe this trend <span className="text-red-400">*</span>
                  <span className="ml-2 text-xs text-blue-400">+50 XP for quality description</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Be specific! Use action verbs, mention the platform, explain why it's trending
                </p>
                <textarea
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, title: e.target.value }));
                    calculateDescriptionQuality(e.target.value);
                  }}
                  placeholder='e.g., "TikTok creators are pranking their pets with cucumber filters, causing millions of confused cat reactions that are going mega-viral because the cats genuinely think they are snakes"'
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none min-h-[100px] resize-y"
                  rows={3}
                />
                
                {/* Quality Indicators */}
                {formData.title && (
                  <div className="mt-3 space-y-2">
                    <QualityIndicators description={formData.title} />
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-800 bg-gray-900/50">
            <div className="flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-gray-300"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.url || !formData.title}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    Submit & Earn {(() => {
                      const qualityBonus = Math.floor(calculateDescriptionQuality(formData.title) / 2);
                      const velocityBonus = formData.trendVelocity && formData.trendSize ? 20 : 0;
                      const predictionBonus = formData.predictedPeak ? 15 : 0;
                      const categoryBonus = Object.keys(formData.categoryAnswers).length >= 2 ? 15 : 0;
                      return 30 + qualityBonus + velocityBonus + predictionBonus + categoryBonus;
                    })()} XP
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import SentimentSlider from './SentimentSlider';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { getUltraSimpleThumbnail } from '@/lib/ultraSimpleThumbnail';
import { calculateWaveScore } from '@/lib/calculateWaveScore';
import { 
  Link as LinkIcon,
  Send as SendIcon,
  X,
  Loader as LoaderIcon,
  ChevronRight as ChevronRightIcon,
  TrendingUp as TrendingUpIcon,
  Sparkles as SparklesIcon,
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon,
  User as UserIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as CommentIcon,
  Zap as ZapIcon,
  Hash as HashIcon,
  Clock as ClockIcon,
  Users as UsersIcon,
  Globe as GlobeIcon,
  Camera as CameraIcon,
  Music as MusicIcon,
  DollarSign as DollarSignIcon,
  Shirt as ShirtIcon,
  Utensils as UtensilsIcon,
  Gamepad2 as GamepadIcon,
  Palette as PaletteIcon,
  Scale as ScaleIcon,
  Trophy as TrophyIcon,
  Briefcase as BriefcaseIcon,
  Heart as HealthIcon,
  Trash2 as TrashIcon,
  Coins,
  Brain,
  Target,
  Rocket,
  Gauge,
  Smile,
  Frown,
  Meh
} from 'lucide-react';

// More lenient quality scoring
const calculateDescriptionQuality = (description: string): number => {
  if (!description) return 0;
  
  let score = 0;
  const wordCount = description.split(/\s+/).length;
  
  // Length bonus - more lenient
  if (wordCount >= 5) score += 20;   
  if (wordCount >= 15) score += 20;  
  if (wordCount >= 25) score += 10;  
  
  // Specificity checks - more patterns
  const hasNumbers = /\d+/.test(description);
  const hasPlatform = /tiktok|instagram|youtube|twitter|reddit|threads|x\.com|snapchat|discord|twitch|linkedin/i.test(description);
  if (hasNumbers) score += 10;
  if (hasPlatform) score += 10;
  
  // Action verbs - expanded list
  const actionVerbs = ['pranking', 'dancing', 'creating', 'posting', 'sharing', 'remixing', 
                       'jumping', 'reacting', 'building', 'launching', 'going', 'making',
                       'flooding', 'exploding', 'surging', 'transforming', 'disrupting',
                       'using', 'doing', 'trying', 'showing', 'getting', 'taking', 'becoming'];
  const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
  if (hasActionVerb) score += 15;
  
  // Trend language - more patterns
  const trendWords = ['viral', 'trending', 'popular', 'everyone', 'people', 'users', 'creators',
                      'hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'broke the internet', 'blowing up',
                      'massive', 'huge', 'everywhere', 'spreading', 'catching on'];
  const hasTrendLanguage = trendWords.some(word => description.toLowerCase().includes(word));
  if (hasTrendLanguage) score += 15;
  
  // Explanation quality - more patterns
  const hasWhy = /because|since|due to|thanks to|after|when|while|as|so|that|this|making|causing/i.test(description);
  if (hasWhy) score += 10;
  
  return Math.min(score, 100);
};

// Updated Quality Indicators with fun visual feedback
const QualityIndicators = ({ description }: { description: string }) => {
  const wordCount = description.split(/\s+/).length;
  const hasNumbers = /\d+/.test(description);
  const hasPlatform = /tiktok|instagram|youtube|twitter|reddit|threads|x\.com|snapchat|discord|twitch|linkedin/i.test(description);
  const actionVerbs = ['pranking', 'dancing', 'creating', 'posting', 'sharing', 'remixing', 
                       'jumping', 'reacting', 'building', 'launching', 'going', 'making',
                       'flooding', 'exploding', 'surging', 'transforming', 'disrupting',
                       'using', 'doing', 'trying', 'showing', 'getting', 'taking', 'becoming'];
  const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
  const trendWords = ['viral', 'trending', 'popular', 'everyone', 'people', 'users', 'creators',
                      'hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'broke the internet', 'blowing up',
                      'massive', 'huge', 'everywhere', 'spreading', 'catching on'];
  const hasTrendLanguage = trendWords.some(word => description.toLowerCase().includes(word));
  const hasWhy = /because|since|due to|thanks to|after|when|while|as|so|that|this|making|causing/i.test(description);
  
  const qualityScore = calculateDescriptionQuality(description);
  
  // Fun quality message based on score
  const getQualityMessage = () => {
    if (qualityScore >= 80) return { text: "🔥 Fire description!", color: "text-orange-500" };
    if (qualityScore >= 60) return { text: "💪 Strong submission!", color: "text-blue-500" };
    if (qualityScore >= 40) return { text: "👍 Good start!", color: "text-green-500" };
    if (qualityScore >= 20) return { text: "✍️ Keep adding details...", color: "text-yellow-500" };
    return { text: "📝 Tell us more!", color: "text-gray-500" };
  };
  
  const message = getQualityMessage();
  
  return (
    <div className="space-y-2">
      {/* Quality Score Display - Fun and Visual */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800/30">
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${message.color}`}>{message.text}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${qualityScore}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{qualityScore}%</span>
        </div>
      </div>
      
      {/* Quality Checklist - More Visual */}
      <div className="grid grid-cols-2 gap-2">
        <QualityCheck 
          met={wordCount >= 5} 
          label="📝 Descriptive" 
          icon="📝"
        />
        <QualityCheck 
          met={hasPlatform} 
          label="📱 Platform" 
          icon="📱"
        />
        <QualityCheck 
          met={hasActionVerb} 
          label="⚡ Action" 
          icon="⚡"
        />
        <QualityCheck 
          met={hasTrendLanguage} 
          label="🚀 Trending" 
          icon="🚀"
        />
        <QualityCheck 
          met={hasNumbers} 
          label="🔢 Specific" 
          icon="🔢"
        />
        <QualityCheck 
          met={hasWhy} 
          label="💡 Context" 
          icon="💡"
        />
      </div>
    </div>
  );
};

const QualityCheck = ({ met, label, icon }: { met: boolean; label: string; icon: string }) => (
  <motion.div 
    initial={{ scale: 0.95 }}
    animate={{ scale: met ? 1.05 : 1 }}
    className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
      met ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-300 dark:border-green-700' 
          : 'bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/30'
    }`}
  >
    <span className={`text-lg ${met ? '' : 'opacity-40'}`}>
      {met ? '✅' : icon}
    </span>
    <span className={`text-xs font-medium ${met ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
      {label}
    </span>
  </motion.div>
);

interface SmartTrendSubmissionProps {
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  initialUrl?: string;
}

interface TrendFormData {
  url: string;
  platform: string;
  title: string;
  creator_handle: string;
  creator_name: string;
  post_caption: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  hashtags: string[];
  thumbnail_url: string;
  posted_at: string;
  category: string;
  categoryAnswers: Record<string, string>;
  audienceAge: string[];
  predictedPeak: string;
  aiAngle: 'using_ai' | 'reacting_to_ai' | 'ai_tool_viral' | 'ai_technique' | 'anti_ai' | 'not_ai' | '';
  trendVelocity: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining' | '';
  sentiment: number;
  trendSize: 'micro' | 'niche' | 'viral' | 'mega' | 'global' | '';
  description: string;
  audience_demographic: string;
  behavior_insight: string;
  wave_score: number;
}

const TREND_CATEGORIES = [
  { id: 'meme_format', label: 'Meme/Format', emoji: '🎭', description: 'Memes, formats, templates' },
  { id: 'visual_style', label: 'Visual/Aesthetic', emoji: '📸', description: 'Photography, fashion, design' },
  { id: 'audio_music', label: 'Audio/Music', emoji: '🎵', description: 'Songs, sounds, audio trends' },
  { id: 'behavior_pattern', label: 'Behavior/Challenge', emoji: '🏃', description: 'Challenges, activities, behaviors' },
  { id: 'cultural_reference', label: 'Cultural/Social', emoji: '🌍', description: 'Politics, events, cultural moments' },
  { id: 'creator_technique', label: 'Creator/Tech', emoji: '🎬', description: 'Editing, techniques, tools' },
];

const AUDIENCE_DEMOGRAPHICS = [
  { id: 'gen_z_teen', label: 'Gen Z Teen', emoji: '🧑‍🎤', age: '13-17', color: 'from-purple-500 to-pink-500' },
  { id: 'gen_z_young', label: 'Gen Z Young', emoji: '🎮', age: '18-24', color: 'from-blue-500 to-cyan-500' },
  { id: 'millennial_young', label: 'Millennial', emoji: '💼', age: '25-30', color: 'from-green-500 to-emerald-500' },
  { id: 'millennial_older', label: 'Millennial+', emoji: '🏡', age: '31-40', color: 'from-orange-500 to-amber-500' },
  { id: 'gen_x', label: 'Gen X', emoji: '📺', age: '41-55', color: 'from-red-500 to-pink-500' },
  { id: 'all_ages', label: 'All Ages', emoji: '🌈', age: 'Everyone', color: 'from-indigo-500 to-purple-500' }
];

export default function SmartTrendSubmission({ onClose, onSubmit, initialUrl = '' }: SmartTrendSubmissionProps) {
  const { user } = useAuth();
  const { logTrendSubmission, isSessionActive } = useSession();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string } | null>(null);
  
  const [formData, setFormData] = useState<TrendFormData>({
    url: initialUrl || '',
    platform: '',
    title: '',
    creator_handle: '',
    creator_name: '',
    post_caption: '',
    likes_count: 0,
    comments_count: 0,
    views_count: 0,
    hashtags: [],
    thumbnail_url: '',
    posted_at: '',
    category: '',
    categoryAnswers: {},
    audienceAge: [],
    predictedPeak: '',
    aiAngle: '',
    trendVelocity: '',
    sentiment: 50,
    trendSize: '',
    description: '',
    audience_demographic: '',
    behavior_insight: '',
    wave_score: 0
  });

  const extractorRef = useRef<MetadataExtractor | null>(null);

  // Auto-extract when URL changes
  useEffect(() => {
    if (formData.url && currentStep === 1) {
      handleExtraction();
    }
  }, [formData.url]);

  const handleExtraction = async () => {
    if (!formData.url) return;
    
    setExtracting(true);
    setError('');
    
    try {
      // Extract metadata using static method
      const metadata = await MetadataExtractor.extractFromUrl(formData.url);
      
      // Get thumbnail
      let thumbnailResult: { thumbnail_url?: string; platform?: string; creator_handle?: string } = {};
      try {
        thumbnailResult = getUltraSimpleThumbnail(formData.url);
      } catch (thumbnailError) {
        console.warn('Thumbnail extraction failed:', thumbnailError);
      }
      
      // Detect platform
      const platform = formData.url.includes('tiktok.com') ? 'tiktok' :
                      formData.url.includes('instagram.com') ? 'instagram' :
                      formData.url.includes('youtube.com') || formData.url.includes('youtu.be') ? 'youtube' :
                      formData.url.includes('twitter.com') || formData.url.includes('x.com') ? 'twitter' :
                      formData.url.includes('reddit.com') ? 'reddit' : 'unknown';
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        platform: platform,
        creator_handle: metadata.creator_handle || '',
        creator_name: metadata.creator_name || '',
        post_caption: metadata.post_caption || '',
        likes_count: metadata.likes_count || 0,
        comments_count: metadata.comments_count || 0,
        views_count: metadata.views_count || 0,
        hashtags: metadata.hashtags || [],
        thumbnail_url: thumbnailResult.thumbnail_url || '',
        posted_at: metadata.posted_at || '',
        title: metadata.post_caption || metadata.title || ''
      }));
      
    } catch (error: any) {
      console.error('Extraction failed:', error);
      setError(`Extraction failed: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const dismissNotification = () => setNotification(null);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Calculate wave score based on available data
      const waveScore = calculateWaveScore({
        trendName: formData.title,
        explanation: formData.title,
        categories: [formData.category],
        views_count: formData.views_count,
        likes_count: formData.likes_count,
        comments_count: formData.comments_count,
        thumbnail_url: formData.thumbnail_url,
        creator_handle: formData.creator_handle,
        platform: formData.platform
      });
      
      const finalData = {
        ...formData,
        wave_score: waveScore,
        description: formData.title
      };
      
      console.log('Submitting trend:', finalData);
      
      if (onSubmit) {
        await onSubmit(finalData);
      }
      
      if (isSessionActive()) {
        logTrendSubmission();
      }
      
      showNotification('success', '🎉 Trend submitted successfully!');
      setLoading(false);
      onClose();
    } catch (error: any) {
      console.error('Submission error:', error);
      setError(error.message || 'Failed to submit trend');
      showNotification('error', error.message || 'Failed to submit trend');
      setLoading(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.url && !!formData.title;
      case 2:
        return !!formData.category && !!formData.trendVelocity && !!formData.trendSize;
      case 3:
        return formData.audienceAge.length > 0 && !!formData.predictedPeak;
      case 4:
        return !!formData.aiAngle;
      default:
        return false;
    }
  };

  // Step indicators with emojis
  const stepInfo = [
    { num: 1, label: "Describe", emoji: "✍️" },
    { num: 2, label: "Analyze", emoji: "📊" },
    { num: 3, label: "Audience", emoji: "👥" },
    { num: 4, label: "Context", emoji: "🤖" }
  ];

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
            <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
              notification.type === 'success' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
            }`}>
              {notification.type === 'success' ? '🎉' : '⚠️'}
              <div>
                <p className="font-medium">{notification.message}</p>
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
          className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🌊</div>
                <div>
                  <h2 className="text-lg font-bold text-white">Submit Cultural Wave</h2>
                  <p className="text-xs text-purple-100">Spot it early, earn rewards!</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Step Indicators */}
            <div className="flex items-center justify-between">
              {stepInfo.map((step, idx) => (
                <div key={step.num} className="flex items-center">
                  <div className={`flex flex-col items-center ${currentStep >= step.num ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      currentStep === step.num ? 'bg-white text-purple-600' : 
                      currentStep > step.num ? 'bg-purple-300 text-purple-800' : 'bg-purple-800 text-purple-300'
                    }`}>
                      {step.emoji}
                    </div>
                    <span className="text-xs text-white mt-1">{step.label}</span>
                  </div>
                  {idx < stepInfo.length - 1 && (
                    <div className={`w-8 md:w-16 h-1 mx-2 rounded ${
                      currentStep > step.num ? 'bg-purple-300' : 'bg-purple-800'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Step 1: URL and Description */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🔍</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">What did you spot?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share the trend and tell us what makes it special
                  </p>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    <span className="text-lg mr-2">🔗</span>
                    Trend URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="Paste TikTok, Instagram, YouTube, X link..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    autoFocus
                  />
                  {extracting && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Extracting trend data...
                    </div>
                  )}
                </div>

                {/* Extracted Thumbnail */}
                {formData.thumbnail_url && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl"
                  >
                    <img 
                      src={formData.thumbnail_url} 
                      alt="Trend preview" 
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formData.creator_handle && `@${formData.creator_handle}`}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>📱 {formData.platform}</span>
                        <span>👁️ {formData.views_count.toLocaleString()}</span>
                        <span>❤️ {formData.likes_count.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Description Input */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    <span className="text-lg mr-2">✨</span>
                    What's happening in this trend?
                  </label>
                  <textarea
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder='Example: "TikTok creators are using AI filters to transform into anime characters, getting millions of views because everyone wants to see their anime version"'
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none min-h-[120px] resize-y transition-colors"
                    rows={4}
                  />
                  
                  {/* Quality Indicators */}
                  {formData.title && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3"
                    >
                      <QualityIndicators description={formData.title} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Category, Trajectory, and Sentiment */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">📊</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Analyze the Wave</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Help us understand this trend's trajectory
                  </p>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    <span className="text-lg mr-2">🏷️</span>
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TREND_CATEGORIES.map(category => (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.category === category.id
                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{category.emoji}</span>
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {category.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {category.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Trend Stage with Emojis */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    <span className="text-lg mr-2">📈</span>
                    Current Stage
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'just_starting', emoji: '🌱', label: 'Just Starting', desc: 'Early signals, few creators' },
                      { value: 'picking_up', emoji: '🚀', label: 'Picking Up', desc: 'Growing momentum, more adoption' },
                      { value: 'viral', emoji: '🔥', label: 'Going Viral', desc: 'Explosive growth, mainstream attention' },
                      { value: 'saturated', emoji: '📉', label: 'Saturated', desc: 'Peak reached, everyone doing it' },
                      { value: 'declining', emoji: '💤', label: 'Declining', desc: 'Losing momentum, moving on' }
                    ].map(option => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setFormData(prev => ({ ...prev, trendVelocity: option.value as any }))}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                          formData.trendVelocity === option.value
                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{option.emoji}</span>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {option.desc}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sentiment Slider - Moved to Step 2 */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    <span className="text-lg mr-2">😊</span>
                    Overall Vibe
                  </label>
                  <div className="bg-gradient-to-r from-red-50 via-yellow-50 to-green-50 dark:from-red-900/20 dark:via-yellow-900/20 dark:to-green-900/20 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                    <SentimentSlider
                      value={formData.sentiment}
                      onChange={(value) => setFormData(prev => ({ ...prev, sentiment: value }))}
                    />
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="flex items-center gap-1">
                        <Frown className="w-4 h-4 text-red-500" />
                        Negative
                      </span>
                      <span className="flex items-center gap-1">
                        <Meh className="w-4 h-4 text-yellow-500" />
                        Neutral
                      </span>
                      <span className="flex items-center gap-1">
                        <Smile className="w-4 h-4 text-green-500" />
                        Positive
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trend Size */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    <span className="text-lg mr-2">🌍</span>
                    Estimated Reach
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'micro', emoji: '🐜', label: 'Micro', desc: '< 100K' },
                      { value: 'niche', emoji: '🎯', label: 'Niche', desc: '100K-1M' },
                      { value: 'viral', emoji: '🚀', label: 'Viral', desc: '1M-10M' },
                      { value: 'mega', emoji: '🌟', label: 'Mega', desc: '10M-100M' },
                      { value: 'global', emoji: '🌏', label: 'Global', desc: '> 100M' }
                    ].map(option => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData(prev => ({ ...prev, trendSize: option.value as any }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.trendSize === option.value
                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{option.emoji}</div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {option.desc}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Audience and Peak Prediction */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">👥</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Who's Riding This Wave?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tell us about the audience and timing
                  </p>
                </div>

                {/* Audience Demographics - More Visual */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    <span className="text-lg mr-2">🎯</span>
                    Primary Audience (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {AUDIENCE_DEMOGRAPHICS.map(demo => (
                      <motion.button
                        key={demo.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const newAudience = formData.audienceAge.includes(demo.id)
                            ? formData.audienceAge.filter(id => id !== demo.id)
                            : [...formData.audienceAge, demo.id];
                          setFormData(prev => ({ ...prev, audienceAge: newAudience }));
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.audienceAge.includes(demo.id)
                            ? `border-purple-500 bg-gradient-to-r ${demo.color} bg-opacity-20`
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{demo.emoji}</span>
                          <div className="text-left">
                            <div className={`font-medium text-sm ${
                              formData.audienceAge.includes(demo.id) ? 'text-white' : 'text-gray-900 dark:text-white'
                            }`}>
                              {demo.label}
                            </div>
                            <div className={`text-xs ${
                              formData.audienceAge.includes(demo.id) ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {demo.age}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Peak Prediction - More Visual */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    <span className="text-lg mr-2">⏰</span>
                    When will this trend peak?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: '1-3_days', emoji: '⚡', label: '1-3 days' },
                      { value: '1_week', emoji: '📅', label: '1 week' },
                      { value: '2_weeks', emoji: '📆', label: '2 weeks' },
                      { value: '1_month', emoji: '🗓️', label: '1 month' },
                      { value: 'longer', emoji: '🔮', label: '1+ month' },
                      { value: 'already_peaked', emoji: '📉', label: 'Already peaked' }
                    ].map(option => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData(prev => ({ ...prev, predictedPeak: option.value }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.predictedPeak === option.value
                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{option.emoji}</div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: AI Context - Simplified */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🤖</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI Check</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Is AI involved in this trend?
                  </p>
                </div>

                {/* Simplified AI Question */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    <span className="text-lg mr-2">🤔</span>
                    How is AI involved?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'not_ai', emoji: '🚫', label: 'No AI', desc: 'Traditional content' },
                      { value: 'using_ai', emoji: '🎨', label: 'Made with AI', desc: 'Using AI tools' },
                      { value: 'reacting_to_ai', emoji: '💬', label: 'About AI', desc: 'Discussing AI' },
                      { value: 'ai_technique', emoji: '✨', label: 'AI Feature', desc: 'New AI capability' }
                    ].map(option => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData(prev => ({ ...prev, aiAngle: option.value as any }))}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          formData.aiAngle === option.value
                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-3xl mb-2">{option.emoji}</div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {option.desc}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    Your Submission Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏷️</span>
                      <span className="text-gray-600 dark:text-gray-400">Category:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {TREND_CATEGORIES.find(c => c.id === formData.category)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📈</span>
                      <span className="text-gray-600 dark:text-gray-400">Stage:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.trendVelocity.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌍</span>
                      <span className="text-gray-600 dark:text-gray-400">Size:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.trendSize}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">😊</span>
                      <span className="text-gray-600 dark:text-gray-400">Sentiment:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.sentiment > 60 ? 'Positive' : formData.sentiment < 40 ? 'Negative' : 'Neutral'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👥</span>
                      <span className="text-gray-600 dark:text-gray-400">Audience:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.audienceAge.map(id => 
                          AUDIENCE_DEMOGRAPHICS.find(d => d.id === id)?.emoji
                        ).join(' ')}
                      </span>
                    </div>
                    {formData.predictedPeak && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⏰</span>
                        <span className="text-gray-600 dark:text-gray-400">Peak:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formData.predictedPeak.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/30 rounded-xl flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-gray-700 dark:text-gray-300 font-medium"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
              
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !isStepValid(currentStep)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {loading ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="text-lg">🚀</span>
                      Submit Wave
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
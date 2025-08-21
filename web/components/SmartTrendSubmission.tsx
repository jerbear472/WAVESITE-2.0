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
  Rocket
} from 'lucide-react';

// More lenient quality scoring
const calculateDescriptionQuality = (description: string): number => {
  if (!description) return 0;
  
  let score = 0;
  const wordCount = description.split(/\s+/).length;
  
  // Length bonus - more lenient
  if (wordCount >= 5) score += 20;   // Was 10
  if (wordCount >= 15) score += 20;  // Was 20
  if (wordCount >= 25) score += 10;  // Was 30
  
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
  if (hasActionVerb) score += 15; // Was 20
  
  // Trend language - more patterns
  const trendWords = ['viral', 'trending', 'popular', 'everyone', 'people', 'users', 'creators',
                      'hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'broke the internet', 'blowing up',
                      'massive', 'huge', 'everywhere', 'spreading', 'catching on'];
  const hasTrendLanguage = trendWords.some(word => description.toLowerCase().includes(word));
  if (hasTrendLanguage) score += 15; // New category
  
  // Explanation quality - more patterns
  const hasWhy = /because|since|due to|thanks to|after|when|while|as|so|that|this|making|causing/i.test(description);
  if (hasWhy) score += 10;
  
  return Math.min(score, 100);
};

// Updated Quality Indicators with less XP emphasis
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
  
  return (
    <div className="space-y-2">
      {/* Quality Score Display - Less Prominent */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Description Quality</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${qualityScore}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{qualityScore}%</span>
        </div>
      </div>
      
      {/* Quality Checklist */}
      <div className="grid grid-cols-2 gap-2">
        <QualityCheck 
          met={wordCount >= 5} 
          label="Descriptive" 
          icon={<HashIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasPlatform} 
          label="Platform context" 
          icon={<GlobeIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasActionVerb} 
          label="Clear action" 
          icon={<ZapIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasTrendLanguage} 
          label="Trend language" 
          icon={<TrendingUpIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasNumbers} 
          label="Specific details" 
          icon={<Target className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasWhy} 
          label="Explains context" 
          icon={<AlertCircleIcon className="w-3 h-3" />}
        />
      </div>
    </div>
  );
};

const QualityCheck = ({ met, label, icon }: { met: boolean; label: string; icon: React.ReactNode }) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
    met ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30' : 'bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/30'
  }`}>
    <div className={`${met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
      {met ? <CheckIcon className="w-4 h-4" /> : icon}
    </div>
    <span className={`text-xs ${met ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
      {label}
    </span>
  </div>
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
  { id: 'meme_format', label: 'Meme/Format', icon: <SparklesIcon className="w-4 h-4" />, description: 'Memes, formats, templates' },
  { id: 'visual_style', label: 'Visual/Aesthetic', icon: <CameraIcon className="w-4 h-4" />, description: 'Photography, fashion, design' },
  { id: 'audio_music', label: 'Audio/Music', icon: <MusicIcon className="w-4 h-4" />, description: 'Songs, sounds, audio trends' },
  { id: 'behavior_pattern', label: 'Behavior/Challenge', icon: <UserIcon className="w-4 h-4" />, description: 'Challenges, activities, behaviors' },
  { id: 'cultural_reference', label: 'Cultural/Social', icon: <UsersIcon className="w-4 h-4" />, description: 'Politics, events, cultural moments' },
  { id: 'creator_technique', label: 'Creator/Tech', icon: <ZapIcon className="w-4 h-4" />, description: 'Editing, techniques, tools' },
];

const AUDIENCE_DEMOGRAPHICS = [
  { id: 'gen_z_teen', label: 'Gen Z Teen (13-17)', color: 'bg-purple-100 text-purple-700' },
  { id: 'gen_z_young', label: 'Gen Z Young (18-24)', color: 'bg-blue-100 text-blue-700' },
  { id: 'millennial_young', label: 'Millennial Young (25-30)', color: 'bg-green-100 text-green-700' },
  { id: 'millennial_older', label: 'Millennial Older (31-40)', color: 'bg-orange-100 text-orange-700' },
  { id: 'gen_x', label: 'Gen X (41-55)', color: 'bg-red-100 text-red-700' },
  { id: 'all_ages', label: 'All Ages', color: 'bg-gray-100 text-gray-700' }
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
        title: metadata.post_caption || metadata.title || '' // Use caption or title as starting point
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
        description: formData.title // Use title as description for submission
      };
      
      console.log('Submitting trend:', finalData);
      
      if (onSubmit) {
        await onSubmit(finalData);
      }
      
      if (isSessionActive()) {
        logTrendSubmission();
      }
      
      showNotification('success', 'Trend submitted successfully!');
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
        return formData.audienceAge.length > 0 && !!formData.aiAngle;
      case 4:
        return true;
      default:
        return false;
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
            <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
              notification.type === 'success' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
            }`}>
              {notification.type === 'success' ? (
                <CheckIcon className="w-6 h-6" />
              ) : (
                <AlertCircleIcon className="w-6 h-6" />
              )}
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
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-5 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <TrendingUpIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Submit Cultural Trend</h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Step {currentStep} of 4</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Step 1: URL and Description */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Let's start with the URL and your description of what's happening.
                  </p>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    Trend URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="Paste TikTok, Instagram, YouTube, X link..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  {extracting && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Extracting metadata...
                    </div>
                  )}
                </div>

                {/* Extracted Thumbnail */}
                {formData.thumbnail_url && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <img 
                      src={formData.thumbnail_url} 
                      alt="Trend preview" 
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formData.creator_handle && `@${formData.creator_handle}`}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formData.platform} • {formData.views_count.toLocaleString()} views
                      </p>
                    </div>
                  </div>
                )}

                {/* Description Input */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    Describe this trend <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    What's happening? Why is it trending? Be specific and descriptive.
                  </p>
                  <textarea
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder='e.g., "TikTok users are creating videos where they pretend to be NPCs responding to donations, mimicking livestream gaming culture but making it mainstream social content"'
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none min-h-[100px] resize-y"
                    rows={4}
                  />
                  
                  {/* Quality Indicators */}
                  {formData.title && (
                    <div className="mt-3">
                      <QualityIndicators description={formData.title} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Category and Trajectory */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Trend Analysis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Help us categorize and understand the trajectory of this trend.
                  </p>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    Primary Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TREND_CATEGORIES.map(category => (
                      <button
                        key={category.id}
                        onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.category === category.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {category.icon}
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {category.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {category.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trend Velocity */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    Current Stage <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'just_starting', label: 'Just Starting', desc: 'Early signals, few creators' },
                      { value: 'picking_up', label: 'Picking Up', desc: 'Growing momentum, more adoption' },
                      { value: 'viral', label: 'Going Viral', desc: 'Explosive growth, mainstream attention' },
                      { value: 'saturated', label: 'Saturated', desc: 'Peak reached, everyone doing it' },
                      { value: 'declining', label: 'Declining', desc: 'Losing momentum, moving on' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFormData(prev => ({ ...prev, trendVelocity: option.value as any }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          formData.trendVelocity === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {option.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trend Size */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    Estimated Reach <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'micro', label: 'Micro', desc: '< 100K total views' },
                      { value: 'niche', label: 'Niche', desc: '100K - 1M total views' },
                      { value: 'viral', label: 'Viral', desc: '1M - 10M total views' },
                      { value: 'mega', label: 'Mega', desc: '10M - 100M total views' },
                      { value: 'global', label: 'Global Phenomenon', desc: '> 100M total views' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFormData(prev => ({ ...prev, trendSize: option.value as any }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          formData.trendSize === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {option.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Audience and AI Analysis */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Audience & Context</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Who's participating and what's the broader context?
                  </p>
                </div>

                {/* Audience Demographics */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    Primary Audience <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUDIENCE_DEMOGRAPHICS.map(demo => (
                      <button
                        key={demo.id}
                        onClick={() => {
                          const newAudience = formData.audienceAge.includes(demo.id)
                            ? formData.audienceAge.filter(id => id !== demo.id)
                            : [...formData.audienceAge, demo.id];
                          setFormData(prev => ({ ...prev, audienceAge: newAudience }));
                        }}
                        className={`p-2 rounded-lg text-xs font-medium transition-all ${
                          formData.audienceAge.includes(demo.id)
                            ? demo.color
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {demo.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Angle */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    AI Involvement <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'not_ai', label: 'Not AI Related', desc: 'No significant AI component' },
                      { value: 'using_ai', label: 'Using AI Tools', desc: 'Created with AI tools (ChatGPT, Midjourney, etc.)' },
                      { value: 'reacting_to_ai', label: 'Reacting to AI', desc: 'Response to AI news, developments, or culture' },
                      { value: 'ai_tool_viral', label: 'AI Tool Goes Viral', desc: 'An AI tool itself becomes trendy' },
                      { value: 'ai_technique', label: 'AI-Enhanced Technique', desc: 'New creative technique enabled by AI' },
                      { value: 'anti_ai', label: 'Anti-AI Movement', desc: 'Backlash or resistance to AI adoption' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFormData(prev => ({ ...prev, aiAngle: option.value as any }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          formData.aiAngle === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {option.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Peak Prediction */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    Peak Prediction (Optional)
                  </label>
                  <select
                    value={formData.predictedPeak}
                    onChange={(e) => setFormData(prev => ({ ...prev, predictedPeak: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">When will this trend peak?</option>
                    <option value="1-3_days">1-3 days</option>
                    <option value="1_week">1 week</option>
                    <option value="2_weeks">2 weeks</option>
                    <option value="1_month">1 month</option>
                    <option value="longer">Longer than 1 month</option>
                    <option value="already_peaked">Already peaked</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 4: Sentiment and Final Review */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Final Review</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Rate the sentiment and review your submission.
                  </p>
                </div>

                {/* Sentiment Slider */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3">
                    Overall Sentiment
                  </label>
                  <div className="mb-2">
                    <SentimentSlider
                      value={formData.sentiment}
                      onChange={(value) => setFormData(prev => ({ ...prev, sentiment: value }))}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    How do people generally feel about this trend?
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Submission Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600 dark:text-gray-400">Category:</span> {TREND_CATEGORIES.find(c => c.id === formData.category)?.label}</div>
                    <div><span className="text-gray-600 dark:text-gray-400">Stage:</span> {formData.trendVelocity.replace('_', ' ')}</div>
                    <div><span className="text-gray-600 dark:text-gray-400">Size:</span> {formData.trendSize}</div>
                    <div><span className="text-gray-600 dark:text-gray-400">Audience:</span> {formData.audienceAge.map(id => AUDIENCE_DEMOGRAPHICS.find(d => d.id === id)?.label).join(', ')}</div>
                    {formData.predictedPeak && (
                      <div><span className="text-gray-600 dark:text-gray-400">Peak:</span> {formData.predictedPeak.replace('_', ' ')}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg flex items-center gap-2">
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
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-gray-700 dark:text-gray-300"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
              
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep)}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !isStepValid(currentStep)}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Submit Trend
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
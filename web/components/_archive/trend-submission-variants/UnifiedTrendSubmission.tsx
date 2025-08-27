'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { getUltraSimpleThumbnail } from '@/lib/ultraSimpleThumbnail';
import { calculateWaveScore } from '@/lib/calculateWaveScore';
import { 
  Link as LinkIcon,
  Send as SendIcon,
  X as XIcon,
  Loader as LoaderIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  TrendingUp as TrendingUpIcon,
  Users as UsersIcon,
  Sparkles as SparklesIcon,
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon,
  Image as ImageIcon,
  User as UserIcon,
  Hash as HashIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as CommentIcon,
  Calendar as CalendarIcon,
  Zap as ZapIcon
} from 'lucide-react';

interface UnifiedTrendSubmissionProps {
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  initialUrl?: string;
  initialCategory?: string;
}

// Simplified, clear categories
const CATEGORIES = [
  { id: 'meme', label: '😂 Meme/Humor', description: 'Jokes, funny formats' },
  { id: 'fashion', label: '👗 Fashion/Beauty', description: 'Style, beauty trends' },
  { id: 'food', label: '🍔 Food/Drink', description: 'Recipes, food hacks' },
  { id: 'music', label: '🎵 Music/Dance', description: 'Songs, dance moves' },
  { id: 'lifestyle', label: '🏡 Lifestyle', description: 'Life hacks, wellness' },
  { id: 'tech', label: '🎮 Tech/Gaming', description: 'Tech, gaming content' },
  { id: 'political', label: '⚖️ Political/Social', description: 'Social movements' },
  { id: 'finance', label: '💰 Finance/Crypto', description: 'Money, investing' },
  { id: 'sports', label: '⚽ Sports/Fitness', description: 'Sports, workouts' },
  { id: 'art', label: '🎨 Art/Creative', description: 'Creative content' }
];

// Simplified velocity options
const VELOCITY_OPTIONS = [
  { id: 'emerging', label: '🌱 Emerging', description: '<10K views' },
  { id: 'growing', label: '📈 Growing', description: '10K-100K views' },
  { id: 'viral', label: '🚀 Viral', description: '100K-1M views' },
  { id: 'massive', label: '🌍 Massive', description: '1M+ views' }
];

// Simplified audience
const AUDIENCE_OPTIONS = [
  { id: 'gen_z', label: 'Gen Z (15-24)' },
  { id: 'millennials', label: 'Millennials (25-40)' },
  { id: 'gen_x_plus', label: 'Gen X+ (40+)' },
  { id: 'everyone', label: 'Everyone' }
];

export default function UnifiedTrendSubmission({ 
  onClose, 
  onSubmit: customSubmit, 
  initialUrl = '',
  initialCategory = ''
}: UnifiedTrendSubmissionProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1: URL & Auto-extracted data
    url: initialUrl,
    platform: '',
    title: '',
    creator_handle: '',
    creator_name: '',
    post_caption: '',
    likes_count: 0,
    comments_count: 0,
    views_count: 0,
    hashtags: [] as string[],
    thumbnail_url: '',
    posted_at: '',
    
    // Step 2: Category & Context
    category: initialCategory,
    velocity: '',
    audience: [] as string[],
    why_trending: '',
    
    // Step 3: Optional Enhancement
    other_platforms: [] as string[],
    brand_opportunity: false,
    prediction: '',
    
    // Calculated
    wave_score: 70
  });

  // Metadata state for display
  const [metadata, setMetadata] = useState<any>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const TOTAL_STEPS = 3;

  // Auto-extract metadata when URL changes
  useEffect(() => {
    if (formData.url && isValidUrl(formData.url) && !metadata) {
      extractMetadata(formData.url);
    }
  }, [formData.url]);

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('linkedin.com')) return 'linkedin';
    return 'other';
  };

  const extractMetadata = async (url: string) => {
    setExtracting(true);
    setError('');
    
    try {
      const extractedData = await MetadataExtractor.extractFromUrl(url);
      const platform = detectPlatform(url);
      
      // Update form data with extracted metadata
      setFormData(prev => ({
        ...prev,
        platform,
        title: extractedData.title || prev.title,
        creator_handle: extractedData.creator_handle || '',
        creator_name: extractedData.creator_name || '',
        post_caption: extractedData.post_caption || '',
        likes_count: extractedData.likes_count || 0,
        comments_count: extractedData.comments_count || 0,
        views_count: extractedData.views_count || 0,
        hashtags: extractedData.hashtags || [],
        thumbnail_url: extractedData.thumbnail_url || '',
        posted_at: extractedData.posted_at || new Date().toISOString()
      }));
      
      // Store metadata for display
      setMetadata(extractedData);
      
      // Calculate initial wave score
      const score = calculateWaveScore({
        trendName: extractedData.title || '',
        explanation: '',
        categories: [],
        views_count: extractedData.views_count || 0,
        likes_count: extractedData.likes_count || 0,
        comments_count: extractedData.comments_count || 0,
        thumbnail_url: extractedData.thumbnail_url || '',
        hashtags: extractedData.hashtags || [],
        creator_handle: extractedData.creator_handle || '',
        creator_name: extractedData.creator_name || ''
      });
      
      setFormData(prev => ({ ...prev, wave_score: score }));
      
    } catch (error) {
      console.error('Metadata extraction error:', error);
      // Don't show error - just continue without metadata
    } finally {
      setExtracting(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.url) {
          setError('Please paste a trend URL');
          return false;
        }
        if (!formData.title) {
          setError('Please add a title for this trend');
          return false;
        }
        break;
      case 2:
        if (!formData.category) {
          setError('Please select a category');
          return false;
        }
        if (!formData.velocity) {
          setError('Please select the trend size');
          return false;
        }
        if (formData.audience.length === 0) {
          setError('Please select at least one audience');
          return false;
        }
        if (!formData.why_trending || formData.why_trending.length < 10) {
          setError('Please explain why this is trending (at least 10 characters)');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const submissionData = {
        ...formData,
        url: formData.url.trim(),
        screenshot_url: formData.thumbnail_url || await getUltraSimpleThumbnail(formData.url),
        trendName: formData.title,
        explanation: formData.why_trending,
        categories: [formData.category],
        ageRanges: formData.audience,
        spreadSpeed: formData.velocity,
        otherPlatforms: formData.other_platforms,
        brandAdoption: formData.brand_opportunity,
        motivation: formData.prediction || '',
        firstSeen: formData.posted_at || new Date().toISOString(),
        moods: [],
        region: 'Global',
        audioOrCatchphrase: '',
        engagementRange: formData.velocity
      };

      if (customSubmit) {
        await customSubmit(submissionData);
      }

      // Success - close form
      setTimeout(onClose, 1500);
    } catch (error: any) {
      console.error('Submission error:', error);
      setError(error.message || 'Failed to submit trend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-800 shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Submit Trend</h2>
                <p className="text-xs text-gray-400">Step {currentStep} of {TOTAL_STEPS}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i < currentStep ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: URL & Basic Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Trend URL
                  </label>
                  <div className="relative">
                    <input
                      ref={urlInputRef}
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      onBlur={() => formData.url && extractMetadata(formData.url)}
                      placeholder="Paste TikTok, Instagram, YouTube, X link..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-10"
                      autoFocus
                    />
                    {extracting && (
                      <div className="absolute right-3 top-3.5">
                        <LoaderIcon className="w-5 h-5 text-blue-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-extracted Metadata Display */}
                {metadata && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckIcon className="w-4 h-4" />
                      <span>Metadata captured automatically</span>
                    </div>
                    
                    {/* Creator Info */}
                    {formData.creator_handle && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">@{formData.creator_handle}</span>
                      </div>
                    )}
                    
                    {/* Engagement Stats */}
                    <div className="flex gap-4 text-sm">
                      {formData.views_count > 0 && (
                        <div className="flex items-center gap-1">
                          <EyeIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{formatNumber(formData.views_count)}</span>
                        </div>
                      )}
                      {formData.likes_count > 0 && (
                        <div className="flex items-center gap-1">
                          <HeartIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{formatNumber(formData.likes_count)}</span>
                        </div>
                      )}
                      {formData.comments_count > 0 && (
                        <div className="flex items-center gap-1">
                          <CommentIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{formatNumber(formData.comments_count)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Hashtags */}
                    {formData.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.hashtags.slice(0, 5).map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-700 px-2 py-1 rounded text-blue-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Thumbnail */}
                    {formData.thumbnail_url && (
                      <div className="mt-3">
                        <img 
                          src={formData.thumbnail_url} 
                          alt="Trend thumbnail"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Title Input */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Give it a title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., 'Grimace Shake Challenge' or 'Mob Wife Aesthetic'"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Category & Context */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Category Selection */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.category === cat.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-white text-sm">{cat.label}</div>
                        <div className="text-xs text-gray-400">{cat.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Velocity/Size */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    How big is this trend?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {VELOCITY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setFormData(prev => ({ ...prev, velocity: option.id }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.velocity === option.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-white text-sm">{option.label}</div>
                        <div className="text-xs text-gray-400">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Who's into this? (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUDIENCE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            audience: prev.audience.includes(option.id)
                              ? prev.audience.filter(a => a !== option.id)
                              : [...prev.audience, option.id]
                          }));
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.audience.includes(option.id)
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-white text-sm">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Why Trending */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Why is this trending? (1-2 sentences)
                  </label>
                  <textarea
                    value={formData.why_trending}
                    onChange={(e) => setFormData(prev => ({ ...prev, why_trending: e.target.value }))}
                    rows={3}
                    placeholder="e.g., 'People are using this sound to show their morning routines in a funny way'"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Optional Enhancement */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-300">
                    Optional: Add more details for bonus earnings
                  </p>
                </div>

                {/* Other Platforms */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Seen on other platforms?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['TikTok', 'Instagram', 'YouTube', 'X/Twitter', 'Reddit'].map((platform) => (
                      <button
                        key={platform}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            other_platforms: prev.other_platforms.includes(platform)
                              ? prev.other_platforms.filter(p => p !== platform)
                              : [...prev.other_platforms, platform]
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                          formData.other_platforms.includes(platform)
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Opportunity */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Good for brands?
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, brand_opportunity: true }))}
                      className={`flex-1 p-3 rounded-lg border transition-all ${
                        formData.brand_opportunity
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-white">Yes, brands could use this</span>
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, brand_opportunity: false }))}
                      className={`flex-1 p-3 rounded-lg border transition-all ${
                        !formData.brand_opportunity
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-white">No, not brand-friendly</span>
                    </button>
                  </div>
                </div>

                {/* Prediction */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Where's this going? (optional)
                  </label>
                  <textarea
                    value={formData.prediction}
                    onChange={(e) => setFormData(prev => ({ ...prev, prediction: e.target.value }))}
                    rows={2}
                    placeholder="e.g., 'Will peak in 2 weeks when celebrities start doing it'"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Wave Score Display */}
                <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Wave Score</p>
                      <p className="text-3xl font-bold text-white">{formData.wave_score}</p>
                    </div>
                    <SparklesIcon className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 bg-gray-900/50">
          <div className="flex justify-between">
            <button
              onClick={currentStep === 1 ? onClose : handleBack}
              className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-gray-300"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>
            
            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all text-white font-medium flex items-center gap-2"
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <SendIcon className="w-4 h-4" />
                    Submit Trend
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import SentimentSlider from './SentimentSlider';
import AIAnalysis from './AIAnalysis';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
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
  Coins,
  Activity,
  Target,
  Gauge,
  MapPin,
  UserCheck,
  Dna,
  Brain,
  MessageSquare,
  Edit3,
  ExternalLink,
  PlayCircle,
  Image
} from 'lucide-react';

interface SmartTrendSubmissionProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Generate catchy title suggestions
const generateCatchyTitle = (metadata: any): string => {
  const templates = [
    `🔥 ${metadata.title || 'This Trend'} is Breaking the Internet`,
    `Everyone's Obsessed with ${metadata.title || 'This'}`,
    `The ${metadata.title || 'Trend'} Taking Over ${metadata.platform || 'Social Media'}`,
    `Why ${metadata.title || 'This'} is Going Viral Right Now`,
    `${metadata.title || 'This Trend'} Just Hit Different`,
    `You Won't Believe What's Happening with ${metadata.title || 'This'}`,
    `${metadata.title || 'This'} is the New Wave`,
    `The ${metadata.title || 'Viral Moment'} Everyone's Talking About`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

export default function SmartTrendSubmission({ onClose, onSuccess }: SmartTrendSubmissionProps) {
  const { user } = useAuth();
  const { session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catchyTitle, setCatchyTitle] = useState('');
  
  // Form answers
  const [formData, setFormData] = useState({
    // Page 1 - after URL
    catchyTitle: '',
    // Page 2
    lifecycleStage: '',
    spreadVelocity: '',
    sizePredict: '',
    origin: '',
    // Page 3
    demographic: '',
    evolution: '',
    sentiment: 50,
    context: '',
    // Metadata from URL
    title: '',
    platform: '',
    creator_handle: '',
    views_count: 0,
    likes_count: 0,
    comments_count: 0,
    hashtags: [] as string[]
  });

  // Detect platform from URL
  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('threads.net')) return 'threads';
    return 'other';
  };

  // Extract metadata from URL
  const extractMetadata = async () => {
    if (!url) return;
    
    setExtracting(true);
    setError('');
    
    try {
      // Use the static method directly
      const extractedData = await MetadataExtractor.extractFromUrl(url);
      const platform = detectPlatform(url);
      
      // Also try to get thumbnail via our API
      let thumbnailUrl = extractedData.thumbnail_url || '';
      if (!thumbnailUrl) {
        try {
          const response = await fetch('/api/extract-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          if (response.ok) {
            const data = await response.json();
            thumbnailUrl = data.thumbnail_url || '';
          }
        } catch (err) {
          console.log('Could not fetch thumbnail:', err);
        }
      }
      
      // Generate catchy title suggestion
      const suggestedTitle = generateCatchyTitle({
        title: extractedData.title || extractedData.post_caption || '',
        platform
      });
      
      setMetadata({
        ...extractedData,
        platform,
        title: extractedData.title || extractedData.post_caption || '',
        creator: extractedData.creator_handle || extractedData.creator_name || '',
        views: extractedData.views_count || 0,
        likes: extractedData.likes_count || 0,
        comments: extractedData.comments_count || 0,
        hashtags: extractedData.hashtags || []
      });
      
      setCatchyTitle(suggestedTitle);
      setFormData(prev => ({
        ...prev,
        catchyTitle: suggestedTitle,
        title: extractedData.title || extractedData.post_caption || '',
        platform,
        creator_handle: extractedData.creator_handle || '',
        views_count: extractedData.views_count || 0,
        likes_count: extractedData.likes_count || 0,
        comments_count: extractedData.comments_count || 0,
        hashtags: extractedData.hashtags || []
      }));
      
      // Set thumbnail if available
      if (thumbnailUrl) {
        setThumbnailUrl(thumbnailUrl);
      } else {
        // Try to generate thumbnail
        const thumb = await getUltraSimpleThumbnail(url, platform);
        if (thumb) {
          setThumbnailUrl(thumb);
        }
      }
    } catch (err) {
      console.error('Error extracting metadata:', err);
      // Don't show error - just continue without metadata
      // Set platform at least
      const platform = detectPlatform(url);
      setFormData(prev => ({ ...prev, platform }));
      
      // Generate basic metadata
      setMetadata({
        platform,
        title: 'Trend',
        creator: '',
        views: 0,
        likes: 0,
        comments: 0,
        hashtags: []
      });
      
      // Generate catchy title anyway
      const suggestedTitle = generateCatchyTitle({ title: 'This Trend', platform });
      setCatchyTitle(suggestedTitle);
      setFormData(prev => ({ ...prev, catchyTitle: suggestedTitle }));
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    if (url && url.includes('://')) {
      const timer = setTimeout(() => {
        extractMetadata();
      }, 300); // Faster response
      return () => clearTimeout(timer);
    }
  }, [url]);

  // Handle AI analysis completion
  const handleAIAnalysisContinue = (analysis?: string) => {
    if (analysis) {
      submitTrend(analysis);
    }
  };

  // Submit the trend
  const submitTrend = async (aiAnalysis: string) => {
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Calculate wave score
      const waveScore = calculateWaveScore({
        velocity: formData.spreadVelocity,
        sentiment: formData.sentiment,
        evolutionStatus: formData.evolution
      });

      // Prepare submission data
      const trendData = {
        url,
        title: formData.catchyTitle || formData.title || 'Untitled Trend',
        description: formData.context || formData.catchyTitle || 'No description',
        category: getCategoryFromOrigin(formData.origin),
        platform: formData.platform || 'unknown',
        trendVelocity: formData.spreadVelocity,
        trendSize: formData.sizePredict,
        sentiment: formData.sentiment,
        audienceAge: [formData.demographic],
        aiAngle: aiAnalysis,
        screenshot_url: screenshots[0] || '',
        thumbnail_url: thumbnailUrl,
        creator_handle: formData.creator_handle,
        views_count: formData.views_count,
        likes_count: formData.likes_count,
        comments_count: formData.comments_count,
        hashtags: formData.hashtags,
        wave_score: waveScore,
        // New fields
        lifecycle_stage: formData.lifecycleStage,
        origin_type: formData.origin,
        evolution_status: formData.evolution
      };

      const response = await fetch('/api/submit-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          trendData
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to submit trend');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit trend');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to map origin to category
  const getCategoryFromOrigin = (origin: string): string => {
    const mapping: Record<string, string> = {
      'organic': 'viral',
      'influencer': 'creator',
      'brand': 'product',
      'ai': 'tech'
    };
    return mapping[origin] || 'other';
  };

  // Calculate potential earnings - using base XP for now
  const potentialEarnings = 10; // Base XP for trend submission

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // URL Input and Title
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Spot a Trend</h2>
              <p className="text-gray-600">Drop the link and give it a catchy name</p>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Trend URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste the URL of the trend you spotted"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Metadata Preview */}
            {extracting && (
              <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
                <LoaderIcon className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-blue-700">Analyzing trend...</span>
              </div>
            )}

            {metadata && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Media Preview */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    {thumbnailUrl ? (
                      <div className="w-24 h-24 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        <img 
                          src={thumbnailUrl} 
                          alt="Trend preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                        {metadata.platform === 'youtube' ? <PlayCircle className="w-8 h-8 text-purple-600" /> :
                         metadata.platform === 'tiktok' ? <Music className="w-8 h-8 text-purple-600" /> :
                         metadata.platform === 'instagram' ? <Image className="w-8 h-8 text-purple-600" /> :
                         <ExternalLink className="w-8 h-8 text-purple-600" />}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                        <span className="capitalize">{metadata.platform}</span>
                        {metadata.creator && (
                          <>
                            <span>•</span>
                            <span>@{metadata.creator}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-800 line-clamp-2 mb-2">
                        {metadata.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {metadata.views > 0 && (
                          <span className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            {(metadata.views / 1000).toFixed(1)}K
                          </span>
                        )}
                        {metadata.likes > 0 && (
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-3 h-3" />
                            {(metadata.likes / 1000).toFixed(1)}K
                          </span>
                        )}
                        {metadata.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <CommentIcon className="w-3 h-3" />
                            {metadata.comments}
                          </span>
                        )}
                      </div>
                      {metadata.hashtags && metadata.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {metadata.hashtags.slice(0, 5).map((tag: string, i: number) => (
                            <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Catchy Title Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Give it a catchy title
                  </label>
                  <input
                    type="text"
                    value={formData.catchyTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, catchyTitle: e.target.value }))}
                    placeholder="e.g., 'The Dance Move Breaking TikTok Right Now'"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
                  />
                  <p className="text-xs text-gray-500">
                    💡 Tip: Make it exciting! This is what others will see
                  </p>
                </div>
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!url || !metadata || !formData.catchyTitle}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Continue
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 2:
        // First set of questions
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Trend Intelligence - Part 1</h2>
              <p className="text-gray-600">Tell us about "{formData.catchyTitle}"</p>
            </div>

            {/* Question 1: Lifecycle Stage */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Where is this trend right now? 📈
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'emerging', label: '🌱 Emerging', desc: 'just spotted' },
                  { value: 'rising', label: '📈 Rising', desc: 'gaining momentum' },
                  { value: 'peaking', label: '🔥 Peaking', desc: 'everywhere right now' },
                  { value: 'declining', label: '📉 Declining', desc: 'over the hill' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, lifecycleStage: option.value }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.lifecycleStage === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2: Spread Velocity */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                How fast is this moving? ⚡
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'slow', label: '🐌 Slow burn', desc: 'weeks/months' },
                  { value: 'steady', label: '🚶 Steady', desc: 'normal viral pace' },
                  { value: 'rapid', label: '🏃 Rapid', desc: 'days to peak' },
                  { value: 'lightning', label: '⚡ Lightning', desc: 'hours to peak' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, spreadVelocity: option.value }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.spreadVelocity === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question 3: Size Prediction */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Target className="w-4 h-4" />
                How big will this get? 🎯
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'niche', label: '🏘️ Stays niche', desc: 'small community' },
                  { value: 'subculture', label: '🌆 Subculture', desc: 'specific groups' },
                  { value: 'mainstream', label: '🌊 Mainstream', desc: 'wide adoption' },
                  { value: 'global', label: '🌍 Global', desc: 'worldwide phenomenon' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, sizePredict: option.value }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.sizePredict === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question 4: Origin/Authenticity */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Where did this come from? 🌍
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'organic', label: '🌱 Organic', desc: 'user generated' },
                  { value: 'influencer', label: '⭐ Influencer', desc: 'creator pushed' },
                  { value: 'brand', label: '💼 Brand', desc: 'marketing campaign' },
                  { value: 'ai', label: '🤖 AI/Bot', desc: 'artificially generated' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, origin: option.value }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.origin === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!formData.lifecycleStage || !formData.spreadVelocity || !formData.sizePredict || !formData.origin}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Continue
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 3:
        // Second set of questions
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Trend Intelligence - Part 2</h2>
              <p className="text-gray-600">Who's driving this and how it's evolving</p>
            </div>

            {/* Question 5: Demographic Reach */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Who's driving this? 👥
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'gen-alpha', label: '👶 Gen Alpha', desc: '<15 years' },
                  { value: 'gen-z', label: '🎮 Gen Z', desc: '15-25 years' },
                  { value: 'millennials', label: '💻 Millennials', desc: '26-40 years' },
                  { value: 'gen-x', label: '📺 Gen X+', desc: '40+ years' },
                  { value: 'cross-gen', label: '🌍 Cross-gen', desc: 'all ages' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, demographic: option.value }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.demographic === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question 6: Evolution Status */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Dna className="w-4 h-4" />
                What version is this? 🧬
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'original', label: '🧬 Original', desc: 'first of its kind' },
                  { value: 'variants', label: '🔄 Variants', desc: 'versions emerging' },
                  { value: 'parody', label: '😂 Parody', desc: 'meme phase' },
                  { value: 'meta', label: '🤯 Meta', desc: 'self-aware evolution' },
                  { value: 'final', label: '🧟 Final form', desc: 'peak evolution' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, evolution: option.value }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.evolution === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question 7: Sentiment */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <HeartIcon className="w-4 h-4" />
                Overall vibe? ❤️
              </label>
              <SentimentSlider 
                value={formData.sentiment} 
                onChange={(value) => setFormData(prev => ({ ...prev, sentiment: value }))}
              />
            </div>

            {/* Question 8: Context */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Why does this matter? 💭
                <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <textarea
                value={formData.context}
                onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
                placeholder="Add any context about why this trend is significant..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Potential Earnings Preview */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Potential Earnings</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {potentialEarnings} XP
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                disabled={!formData.demographic || !formData.evolution}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Review
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 4:
        // Review page
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Review Your Discovery</h2>
              <p className="text-gray-600">Everything look good?</p>
            </div>

            {/* Catchy Title Display */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-xl text-white">
              <div className="text-xs opacity-90 mb-1">Your Title</div>
              <div className="text-xl font-bold">{formData.catchyTitle}</div>
            </div>

            {/* URL and Metadata */}
            {metadata && (
              <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                <div className="text-sm text-gray-600">{url}</div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Platform: {metadata.platform}</span>
                  {metadata.creator && <span>@{metadata.creator}</span>}
                  {metadata.views > 0 && <span>{(metadata.views / 1000).toFixed(1)}K views</span>}
                </div>
              </div>
            )}

            {/* Answers Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Lifecycle Stage</div>
                  <div className="font-medium capitalize">{formData.lifecycleStage.replace('-', ' ')}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Spread Velocity</div>
                  <div className="font-medium capitalize">{formData.spreadVelocity}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Size Prediction</div>
                  <div className="font-medium capitalize">{formData.sizePredict}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Origin</div>
                  <div className="font-medium capitalize">{formData.origin}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Demographic</div>
                  <div className="font-medium capitalize">{formData.demographic.replace('-', ' ')}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Evolution Status</div>
                  <div className="font-medium capitalize">{formData.evolution}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                  <div className="font-medium">{formData.sentiment}% Positive</div>
                </div>
                {formData.context && (
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Context</div>
                    <div className="text-sm">{formData.context}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Earnings Highlight */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">You'll earn</div>
                  <div className="text-3xl font-bold">{potentialEarnings} XP</div>
                </div>
                <Coins className="w-12 h-12 opacity-50" />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Edit
              </button>
              <button
                onClick={() => setCurrentStep(5)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
              >
                Get AI Analysis
                <SparklesIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 5:
        // AI Analysis step
        return (
          <AIAnalysis
            trendData={{
              ...formData,
              url,
              category: getCategoryFromOrigin(formData.origin),
              trendVelocity: formData.spreadVelocity,
              trendSize: formData.sizePredict,
              audienceAge: [formData.demographic],
              platform: formData.platform || 'unknown'
            }}
            onContinue={handleAIAnalysisContinue}
            onBack={() => setCurrentStep(4)}
            visible={true}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header with progress */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-800">Submit New Trend</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  currentStep >= step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>URL & Title</span>
            <span>Questions 1</span>
            <span>Questions 2</span>
            <span>Review</span>
            <span>AI & Submit</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckIcon className="w-10 h-10 text-green-600" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Trend Submitted!</h3>
                <p className="text-gray-600">You earned {potentialEarnings} XP</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <LoaderIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Submitting your trend...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute bottom-6 left-6 right-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
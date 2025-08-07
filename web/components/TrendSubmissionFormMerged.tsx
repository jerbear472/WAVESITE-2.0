'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { TrendQualityIndicator } from '@/components/TrendQualityIndicator';
import { 
  TrendSpotterPerformanceService,
  TrendQualityMetrics 
} from '@/lib/trendSpotterPerformanceService';
import { 
  Link as LinkIcon,
  Upload as UploadIcon,
  Send as SendIcon,
  X as XIcon,
  Check as CheckIcon,
  Loader as LoaderIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as CommentIcon,
  User as UserIcon,
  Hash as HashIcon,
  Music as MusicIcon,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  Target as TargetIcon,
  Users as UsersIcon,
  Tag as TagIcon,
  Zap as ZapIcon,
  Globe as GlobeIcon,
  Sparkles as SparklesIcon,
  DollarSign as DollarSignIcon,
  Info as InfoIcon,
  Award as AwardIcon
} from 'lucide-react';

interface TrendData {
  // Basic Info
  url: string;
  trendName: string;
  platform: string;
  screenshot?: File | string;
  explanation: string;
  
  // Audience
  ageRanges: string[];
  subcultures: string[];
  region?: string;
  
  // Categorization
  categories: string[];
  moods: string[];
  
  // Trend Status
  spreadSpeed: string;
  engagementRange?: string;
  audioOrCatchphrase?: string;
  motivation: string;
  
  // Timing & Spread
  firstSeen: string;
  otherPlatforms: string[];
  brandAdoption: boolean;
  
  // Auto-captured metadata
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  hashtags?: string[];
  thumbnail_url?: string;
  
  // Wave Score
  wave_score?: number;
}

const platforms = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { id: 'reddit', label: 'Reddit', icon: '🔺' },
  { id: 'other', label: 'Other', icon: '🌐' }
];

const ageRangeOptions = [
  'Gen Alpha (9-14)',
  'Gen Z (15-24)', 
  'Millennials (25-40)',
  'Gen X (41-56)',
  'Boomers (57+)',
  'Cross-generational'
];

const categoryOptions = [
  'Fashion & Beauty',
  'Food & Drink',
  'Humor & Memes',
  'Lifestyle',
  'Politics & Social Issues',
  'Music & Dance',
  'Sports & Fitness',
  'Tech & Gaming',
  'Art & Creativity',
  'Education & Science',
  'Luxury',
  'Celebrity',
  'Meme Coin',
  'Meme Stock'
];

const moodOptions = [
  'Funny 😂',
  'Wholesome 🥰',
  'Cringe 😬',
  'Empowering 💪',
  'Sad 😢',
  'Sexy 🔥',
  'Nostalgic 🌟',
  'Rebellious 🤘',
  'Cozy 🧸',
  'Chaotic 🌪️',
  'Fancy 🍸',
  'Ironic 💀'
];

const spreadSpeedOptions = [
  { id: 'just_starting', label: '🌱 Just Starting', description: 'First few posts appearing' },
  { id: 'picking_up', label: '📈 Picking Up', description: 'Gaining momentum, more creators joining' },
  { id: 'viral', label: '🚀 Viral', description: 'Everywhere on the platform' },
  { id: 'saturated', label: '📊 Saturated', description: 'Peak reached, brands jumping in' },
  { id: 'declining', label: '📉 Declining', description: 'Losing steam, old news' }
];

const engagementRanges = [
  { id: 'micro', label: '🌱 Micro', range: '100-10K likes' },
  { id: 'small', label: '📈 Small', range: '10K-50K likes' },
  { id: 'medium', label: '🔥 Medium', range: '50K-200K likes' },
  { id: 'large', label: '🚀 Large', range: '200K-1M likes' },
  { id: 'mega', label: '💎 Mega', range: '1M+ likes' }
];

interface TrendSubmissionFormProps {
  onClose: () => void;
  onSubmit: (data: TrendData) => Promise<void>;
  initialUrl?: string;
}

export default function TrendSubmissionFormMerged({ onClose, onSubmit, initialUrl = '' }: TrendSubmissionFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Quality and payment tracking
  const [qualityMetrics, setQualityMetrics] = useState<TrendQualityMetrics | null>(null);
  const [estimatedPayment, setEstimatedPayment] = useState<any>(null);
  const [performanceService, setPerformanceService] = useState<any>(null);
  
  const [formData, setFormData] = useState<TrendData>({
    url: initialUrl || '',
    trendName: '',
    platform: '',
    explanation: '',
    ageRanges: [],
    subcultures: [],
    region: '',
    categories: [],
    moods: [],
    spreadSpeed: '',
    engagementRange: '',
    audioOrCatchphrase: '',
    motivation: '',
    firstSeen: 'today',
    otherPlatforms: [],
    brandAdoption: false,
    creator_handle: '',
    creator_name: '',
    post_caption: '',
    likes_count: 0,
    comments_count: 0,
    views_count: 0,
    hashtags: [],
    wave_score: 50
  });

  // Set mounted state and initialize performance service
  useEffect(() => {
    setMounted(true);
    try {
      setPerformanceService(TrendSpotterPerformanceService.getInstance());
    } catch (err) {
      console.error('Failed to initialize performance service:', err);
    }
    return () => setMounted(false);
  }, []);

  // Auto-extract metadata when component mounts with initialUrl
  useEffect(() => {
    if (mounted && initialUrl) {
      setFormData(prev => ({ ...prev, url: initialUrl }));
      extractMetadata(initialUrl);
    }
  }, [mounted, initialUrl]);

  // Update quality metrics in real-time
  useEffect(() => {
    if (!mounted) return;
    
    try {
      updateQualityMetrics();
    } catch (error) {
      console.error('Error updating quality metrics:', error);
    }
  }, [mounted, formData]);

  const updateQualityMetrics = async () => {
    try {
      if (!user) return;
      
      const metrics = performanceService?.calculateTrendQuality(formData);
      setQualityMetrics(metrics || null);
      
      // Update payment estimate
      if (performanceService) {
        const payment = await performanceService.calculateTrendPayment(
          user.id,
          formData,
          metrics
        );
        setEstimatedPayment(payment);
      } else {
        setEstimatedPayment(null);
      }
    } catch (error) {
      console.error('Quality metrics calculation error:', error);
      // Set default values on error
      setQualityMetrics(null);
      setEstimatedPayment(null);
    }
  };

  // Auto-detect platform from URL
  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    return 'other';
  };

  // Extract metadata when URL changes
  const extractMetadata = async (url: string) => {
    if (!url) return;
    
    setExtractingMetadata(true);
    setError('');
    try {
      const metadata = await MetadataExtractor.extractFromUrl(url);
      
      // Auto-detect platform immediately
      const detectedPlatform = detectPlatform(url);
      
      setFormData(prev => {
        const updates = {
          ...prev,
          platform: detectedPlatform,
          creator_handle: metadata.creator_handle || prev.creator_handle,
          creator_name: metadata.creator_name || prev.creator_name,
          post_caption: metadata.post_caption || prev.post_caption,
          likes_count: metadata.likes_count !== undefined ? metadata.likes_count : prev.likes_count,
          comments_count: metadata.comments_count !== undefined ? metadata.comments_count : prev.comments_count,
          views_count: metadata.views_count !== undefined ? metadata.views_count : prev.views_count,
          hashtags: metadata.hashtags || prev.hashtags || [],
          thumbnail_url: metadata.thumbnail_url || prev.thumbnail_url,
          
          // Don't auto-capture trend name - user must input this
          trendName: prev.trendName || '',
          
          // Auto-populate explanation if we have a caption
          explanation: prev.explanation || (metadata.post_caption ? `Trending ${detectedPlatform} content: "${metadata.post_caption.substring(0, 100)}${metadata.post_caption.length > 100 ? '...' : ''}"` : ''),
          
          // Smart category detection based on hashtags and content
          categories: prev.categories.length > 0 ? prev.categories : detectCategories(metadata.hashtags || [], metadata.post_caption || ''),
          
          // Smart age range detection based on platform
          ageRanges: prev.ageRanges.length > 0 ? prev.ageRanges : detectAgeRange(detectedPlatform),
          
          // Auto-populate moods based on content
          moods: prev.moods.length > 0 ? prev.moods : detectMoods(metadata.hashtags || [], metadata.post_caption || ''),
          
          // Auto-populate motivation based on platform and content
          motivation: prev.motivation || detectMotivation(detectedPlatform, metadata.post_caption || ''),
          
          // Auto-set platform-specific defaults
          firstSeen: prev.firstSeen || (metadata.posted_at ? formatDateForFirstSeen(metadata.posted_at) : 'today'),
          otherPlatforms: prev.otherPlatforms.length > 0 ? prev.otherPlatforms : suggestOtherPlatforms(detectedPlatform)
        };
        
        // If we got engagement data, pre-fill the required engagement counts
        if (metadata.likes_count !== undefined || metadata.views_count !== undefined) {
          updates.likes_count = metadata.likes_count || 0;
          updates.views_count = metadata.views_count || 0;
          updates.comments_count = metadata.comments_count || 0;
          
          // Auto-detect spread speed based on engagement
          if (!prev.spreadSpeed) {
            updates.spreadSpeed = detectSpreadSpeed(metadata.likes_count || 0, metadata.views_count || 0, detectedPlatform);
          }
        }
        
        return updates;
      });
      
      // Show success message with more detail
      const capturedItems = [];
      if (metadata.creator_handle || metadata.creator_name) capturedItems.push('creator');
      if (metadata.post_caption) capturedItems.push('caption');
      if (metadata.likes_count !== undefined) capturedItems.push('engagement');
      if (metadata.hashtags?.length) capturedItems.push('hashtags');
      
      if (capturedItems.length > 0) {
        setSuccess(`✨ Auto-captured: ${capturedItems.join(', ')} from ${detectedPlatform}`);
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (error: any) {
      console.error('Metadata extraction failed:', error);
      // Don't show error to user - just continue without metadata
      // The form still works without auto-extracted data
    } finally {
      setExtractingMetadata(false);
    }
  };

  // Helper functions for smart auto-population
  const detectCategories = (hashtags: string[], caption: string): string[] => {
    const content = (hashtags.join(' ') + ' ' + caption).toLowerCase();
    const detectedCategories: string[] = [];
    
    if (content.match(/fashion|beauty|makeup|style|outfit|skincare|hair/)) {
      detectedCategories.push('Fashion & Beauty');
    }
    
    if (content.match(/food|recipe|cooking|drink|restaurant|meal|taste/)) {
      detectedCategories.push('Food & Drink');
    }
    
    if (content.match(/funny|meme|lol|comedy|joke|humor|laugh/)) {
      detectedCategories.push('Humor & Memes');
    }
    
    if (content.match(/music|dance|song|beat|audio|sound|choreography/)) {
      detectedCategories.push('Music & Dance');
    }
    
    if (content.match(/tech|gaming|game|tech|ai|gadget|app|software/)) {
      detectedCategories.push('Tech & Gaming');
    }
    
    if (content.match(/sport|fitness|workout|gym|exercise|athlete|training/)) {
      detectedCategories.push('Sports & Fitness');
    }
    
    if (detectedCategories.length === 0) {
      detectedCategories.push('Lifestyle');
    }
    
    return detectedCategories.slice(0, 2);
  };

  const detectAgeRange = (platform: string): string[] => {
    switch (platform) {
      case 'tiktok':
        return ['Gen Z (15-24)', 'Gen Alpha (9-14)'];
      case 'instagram':
        return ['Gen Z (15-24)', 'Millennials (25-40)'];
      case 'youtube':
        return ['Millennials (25-40)', 'Gen Z (15-24)'];
      case 'twitter':
        return ['Millennials (25-40)', 'Gen X (41-56)'];
      default:
        return ['Gen Z (15-24)'];
    }
  };

  const suggestOtherPlatforms = (currentPlatform: string): string[] => {
    const allPlatforms = ['tiktok', 'instagram', 'youtube', 'twitter', 'reddit'];
    const suggested = allPlatforms.filter(p => p !== currentPlatform);
    return suggested.slice(0, 2);
  };

  const formatDateForFirstSeen = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays <= 7) return 'this_week';
    if (diffDays <= 30) return 'this_month';
    return 'older';
  };

  const detectSpreadSpeed = (likes: number, views: number, platform: string): string => {
    const viralThresholds = {
      tiktok: { likes: 100000, views: 1000000 },
      instagram: { likes: 50000, views: 500000 },
      youtube: { likes: 10000, views: 100000 },
      twitter: { likes: 1000, views: 10000 },
      other: { likes: 5000, views: 50000 }
    };
    
    const threshold = viralThresholds[platform as keyof typeof viralThresholds] || viralThresholds.other;
    
    if (likes >= threshold.likes || views >= threshold.views) {
      return 'viral';
    } else if (likes >= threshold.likes * 0.1 || views >= threshold.views * 0.1) {
      return 'picking_up';
    } else {
      return 'just_starting';
    }
  };

  const detectMoods = (hashtags: string[], caption: string): string[] => {
    const content = (hashtags.join(' ') + ' ' + caption).toLowerCase();
    const detectedMoods: string[] = [];
    
    if (content.match(/funny|lol|humor|hilarious|joke|comedy/)) {
      detectedMoods.push('Funny 😂');
    }
    
    if (content.match(/wholesome|cute|adorable|sweet|heartwarming/)) {
      detectedMoods.push('Wholesome 🥰');
    }
    
    if (content.match(/nostalgic|throwback|remember|childhood|back in the day|vintage|retro/)) {
      detectedMoods.push('Nostalgic 🌟');
    }
    
    if (content.match(/empower|strong|fierce|boss|queen|king/)) {
      detectedMoods.push('Empowering 💪');
    }
    
    return detectedMoods.slice(0, 2);
  };

  const detectMotivation = (platform: string, caption: string): string => {
    const content = caption.toLowerCase();
    
    if (content.match(/community|together|belong|share|connect/)) {
      return 'Community and belonging - people want to be part of something bigger';
    }
    
    if (content.match(/identity|express|who i am|represent|authentic/)) {
      return 'Self-expression and identity - showing who they are';
    }
    
    if (content.match(/funny|humor|laugh|joke|comedy|meme/)) {
      return 'Humor and entertainment - making people laugh and feel good';
    }
    
    if (content.match(/rebel|different|unique|against|break/)) {
      return 'Rebellion and individuality - standing out from the crowd';
    }
    
    if (content.match(/remember|nostalgia|throwback|childhood/)) {
      return 'Nostalgia and shared memories - connecting through past experiences';
    }
    
    switch (platform) {
      case 'tiktok':
        return 'Creative self-expression and viral participation in trending formats';
      case 'instagram':
        return 'Aesthetic appeal and lifestyle aspiration sharing';
      case 'youtube':
        return 'Knowledge sharing and entertainment value';
      case 'twitter':
        return 'Social commentary and community discourse';
      default:
        return 'Social connection and entertainment through shared cultural moments';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, screenshot: file }));
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(step)) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await onSubmit(formData);
      setSuccess('Trend submitted successfully! 🎉');
      setTimeout(() => onClose(), 3000);
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to submit trend');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.trendName || !formData.url || !formData.explanation) {
          setError('Please fill in trend name, URL/screenshot, and explanation');
          return false;
        }
        break;
      case 2:
        if (formData.ageRanges.length === 0 || formData.categories.length === 0 || formData.moods.length === 0) {
          setError('Please select at least one age range, category, and mood');
          return false;
        }
        break;
      case 3:
        if (!formData.spreadSpeed || !formData.motivation) {
          setError('Please select spread speed and describe the motivation');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-slate-800 rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-2xl lg:max-w-5xl max-h-[90vh] overflow-y-auto border border-slate-700"
      >
        {/* Fixed Close Button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600 shadow-lg"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5 text-slate-300" />
        </button>
        
        {/* Header with Quality Indicator */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Submit New Trend</h2>
            <p className="text-slate-400 text-sm mt-1">Help us spot the next cultural wave</p>
          </div>
          
          {/* Quality Indicator Preview */}
          {qualityMetrics && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-4"
            >
              <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">
                    Quality: {Math.round(qualityMetrics.totalScore * 100)}%
                  </span>
                </div>
                {estimatedPayment && (
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSignIcon className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">
                      Est. ${estimatedPayment.estimatedAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
            <span className={`${step >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>
              <span className="hidden sm:inline">🏷 Basic Info</span>
              <span className="sm:hidden">Basic</span>
            </span>
            <span className={`${step >= 2 ? 'text-blue-400' : 'text-slate-500'}`}>
              <span className="hidden sm:inline">👥 Audience & Vibe</span>
              <span className="sm:hidden">Audience</span>
            </span>
            <span className={`${step >= 3 ? 'text-blue-400' : 'text-slate-500'}`}>
              <span className="hidden sm:inline">🚀 Spread & Context</span>
              <span className="sm:hidden">Spread</span>
            </span>
            <span className={`${step >= 4 ? 'text-blue-400' : 'text-slate-500'}`}>
              <span className="hidden sm:inline">✅ Review</span>
              <span className="sm:hidden">Review</span>
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm"
          >
            {success}
          </motion.div>
        )}

        <div className="lg:flex lg:gap-6">
          {/* Main Form */}
          <div className="lg:flex-1">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Trend Name */}
                  <div>
                    <label className="block text-slate-200 mb-2 font-medium">
                      🏷 Trend Name *
                    </label>
                    <input
                      type="text"
                      value={formData.trendName}
                      onChange={(e) => setFormData(prev => ({ ...prev, trendName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      placeholder="Give this trend a catchy name (e.g., Mob Wife Aesthetic, Girl Dinner, Deinfluencing)"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">Create a memorable name that captures the essence of this trend</p>
                  </div>

                  {/* Platform & URL */}
                  <div>
                    <label className="block text-slate-200 mb-2 font-medium">
                      🔗 Platform + Link *
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => {
                          const url = e.target.value;
                          setFormData(prev => ({ ...prev, url }));
                          if (url) extractMetadata(url);
                        }}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none pr-32"
                        placeholder="Paste TikTok, Instagram, YouTube link..."
                        required
                      />
                      {extractingMetadata && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <LoaderIcon className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                      )}
                      {formData.platform && !extractingMetadata && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-slate-600 px-3 py-1 rounded">
                          <span className="text-sm">
                            {platforms.find(p => p.id === formData.platform)?.icon}
                          </span>
                          <span className="text-sm font-medium text-white capitalize">
                            {formData.platform}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Platform Pills */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {platforms.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, platform: platform.id }))}
                          className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all ${
                            formData.platform === platform.id
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          <span>{platform.icon}</span>
                          <span>{platform.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Screenshot Upload */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-2"
                      >
                        <UploadIcon className="w-4 h-4" />
                        {imagePreview ? 'Change screenshot' : 'Upload screenshot instead'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Auto-captured Data Display */}
                  {(formData.creator_handle || formData.creator_name || formData.post_caption || formData.likes_count > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4"
                    >
                      <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                        <CheckIcon className="w-4 h-4" />
                        Auto-Captured Post Data
                      </h4>
                      <div className="space-y-3 text-sm">
                        {(formData.creator_handle || formData.creator_name) && (
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            <div>
                              <span className="text-white font-medium">{formData.creator_handle || formData.creator_name}</span>
                              {formData.creator_name && formData.creator_handle && (
                                <span className="text-slate-400 ml-1">({formData.creator_name})</span>
                              )}
                            </div>
                          </div>
                        )}
                        {formData.post_caption && (
                          <div className="bg-slate-800/50 rounded p-2">
                            <p className="text-slate-300 italic line-clamp-2">"{formData.post_caption}"</p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          {formData.likes_count > 0 && (
                            <span className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded">
                              <HeartIcon className="w-4 h-4 text-red-400" />
                              <span className="text-white font-medium">{formatNumber(formData.likes_count)}</span>
                            </span>
                          )}
                          {formData.comments_count > 0 && (
                            <span className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded">
                              <CommentIcon className="w-4 h-4 text-blue-400" />
                              <span className="text-white font-medium">{formatNumber(formData.comments_count)}</span>
                            </span>
                          )}
                          {formData.views_count > 0 && (
                            <span className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded">
                              <EyeIcon className="w-4 h-4 text-green-400" />
                              <span className="text-white font-medium">{formatNumber(formData.views_count)}</span>
                            </span>
                          )}
                        </div>
                        {formData.hashtags && formData.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {formData.hashtags.slice(0, 5).map((tag, idx) => (
                              <span key={idx} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                #{tag}
                              </span>
                            ))}
                            {formData.hashtags.length > 5 && (
                              <span className="text-xs text-slate-400">+{formData.hashtags.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Trend Explanation */}
                  <div>
                    <label className="block text-slate-200 mb-2 font-medium">
                      🧠 What's the Trend About? *
                    </label>
                    <textarea
                      value={formData.explanation}
                      onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      placeholder="Brief 2-3 sentence explanation. What are people doing and why is it catching on?"
                      required
                    />
                  </div>

                  {/* Screenshot Preview */}
                  {imagePreview && (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData(prev => ({ ...prev, screenshot: undefined }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                      >
                        <XIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Audience & Vibe */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Age Ranges */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      👥 Who's Participating? *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {ageRangeOptions.map((age) => (
                        <button
                          key={age}
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            ageRanges: toggleArrayItem(prev.ageRanges, age)
                          }))}
                          className={`px-4 py-2.5 rounded-lg text-sm transition-all ${
                            formData.ageRanges.includes(age)
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subcultures */}
                  <div>
                    <label className="block text-slate-200 mb-2 font-medium">
                      🎯 Subcultures (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.subcultures.join(', ')}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        subcultures: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      placeholder="e.g., Skaters, Alt girls, Gym bros, Bookworms (comma-separated)"
                    />
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-slate-200 mb-2 font-medium">
                      🌍 Region (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      placeholder="e.g., US West Coast, UK, Brazil"
                    />
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      🏷️ Category Tags *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            categories: toggleArrayItem(prev.categories, category)
                          }))}
                          className={`px-4 py-2.5 rounded-lg text-sm text-left transition-all ${
                            formData.categories.includes(category)
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500'
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Moods with Emojis */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      💬 Mood / Emotional Tone *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood}
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            moods: toggleArrayItem(prev.moods, mood)
                          }))}
                          className={`px-4 py-2.5 rounded-lg text-sm transition-all ${
                            formData.moods.includes(mood)
                              ? 'bg-pink-500/20 text-pink-300 border-pink-500'
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          {mood}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Wave Score Slider */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      🌊 Wave Score - How cool is this trend?
                    </label>
                    <div className="bg-slate-700/50 rounded-xl p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-slate-300 text-sm mb-1">Rate the coolness factor</p>
                          <p className="text-slate-500 text-xs">0 = Not cool at all | 100 = Extremely cool</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            {formData.wave_score || 50}
                          </div>
                          <p className="text-slate-400 text-xs">Wave Score</p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.wave_score || 50}
                          onChange={(e) => setFormData(prev => ({ ...prev, wave_score: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-slate-600/50 rounded-lg appearance-none cursor-pointer slider-thumb"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 ${formData.wave_score || 50}%, #475569 ${formData.wave_score || 50}%, #475569 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                          <span>0</span>
                          <span>25</span>
                          <span>50</span>
                          <span>75</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">🥱 Meh</span>
                        <span className="text-slate-500">😐 OK</span>
                        <span className="text-slate-400">👍 Cool</span>
                        <span className="text-slate-300">🔥 Fire</span>
                        <span className="text-slate-200">🌊 Wave!</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Spread & Context */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* Spread Speed */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      🚀 Spread Speed *
                    </label>
                    <div className="space-y-2">
                      {spreadSpeedOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, spreadSpeed: option.id }))}
                          className={`w-full p-4 rounded-lg text-left transition-all ${
                            formData.spreadSpeed === option.id
                              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500'
                              : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          <div className="font-medium text-white">{option.label}</div>
                          <div className="text-sm text-slate-400 mt-1">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Engagement Range */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      💬 Typical Engagement Range
                    </label>
                    <p className="text-xs text-slate-400 mb-3">Quick way to spot engagement levels</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {engagementRanges.map((range) => (
                        <button
                          key={range.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, engagementRange: range.id }))}
                          className={`p-3 rounded-lg text-center transition-all ${
                            formData.engagementRange === range.id
                              ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500'
                              : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          <div className="font-medium text-white text-sm">{range.label}</div>
                          <div className="text-xs text-slate-400 mt-1">{range.range}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio/Catchphrase */}
                  <div>
                    <label className="block text-slate-200 mb-2 font-medium">
                      🎧 Audio or Catchphrase (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.audioOrCatchphrase}
                      onChange={(e) => setFormData(prev => ({ ...prev, audioOrCatchphrase: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      placeholder="Link to sound or describe the audio/phrase being used"
                    />
                  </div>

                  {/* Motivation */}
                  <div>
                    <label className="block text-slate-200 mb-2 font-medium">
                      🎯 Why Are People Doing This? *
                    </label>
                    <textarea
                      value={formData.motivation}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      placeholder="What's driving participation? Identity, humor, rebellion, nostalgia, community..."
                      required
                    />
                  </div>

                  {/* Timing */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      📆 When Did You First See This?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['today', 'this_week', 'last_week', 'this_month'].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, firstSeen: time }))}
                          className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                            formData.firstSeen === time
                              ? 'bg-green-500/20 text-green-300 border-green-500'
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          {time.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cross-Platform Presence */}
                  <div>
                    <label className="block text-slate-200 mb-3 font-medium">
                      🌐 Also Appearing On
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {platforms.filter(p => p.id !== formData.platform).map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            otherPlatforms: toggleArrayItem(prev.otherPlatforms, platform.id)
                          }))}
                          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
                            formData.otherPlatforms.includes(platform.id)
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                          } border`}
                        >
                          <span>{platform.icon}</span>
                          <span>{platform.label}</span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.brandAdoption}
                          onChange={(e) => setFormData(prev => ({ ...prev, brandAdoption: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-300">Brands are already jumping on this</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="bg-slate-700/50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Review Your Submission</h3>
                    
                    <div className="space-y-4">
                      {/* Basic Info */}
                      <div className="pb-4 border-b border-slate-600">
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Basic Info</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-500 text-sm">Trend Name:</span>
                            <p className="text-white font-medium">{formData.trendName}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-sm">Platform:</span>
                            <p className="text-white">{platforms.find(p => p.id === formData.platform)?.label}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-sm">Explanation:</span>
                            <p className="text-white italic">"{formData.explanation}"</p>
                          </div>
                        </div>
                      </div>

                      {/* Audience */}
                      <div className="pb-4 border-b border-slate-600">
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Audience</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-500 text-sm">Age Groups:</span>
                            <p className="text-white">{formData.ageRanges.join(', ')}</p>
                          </div>
                          {formData.subcultures.length > 0 && (
                            <div>
                              <span className="text-slate-500 text-sm">Subcultures:</span>
                              <p className="text-white">{formData.subcultures.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Categorization */}
                      <div className="pb-4 border-b border-slate-600">
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Categorization</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-500 text-sm">Categories:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {formData.categories.map((cat) => (
                                <span key={cat} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-sm">Moods:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {formData.moods.map((mood) => (
                                <span key={mood} className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded text-xs">
                                  {mood}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Wave Score */}
                      <div className="pb-4 border-b border-slate-600">
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Wave Score</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-slate-600/30 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                              style={{ width: `${formData.wave_score || 50}%` }}
                            />
                          </div>
                          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            {formData.wave_score || 50}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">Coolness rating: 0 = Meh, 100 = Wave! 🌊</p>
                      </div>
                    </div>

                    {/* Payment Preview */}
                    {estimatedPayment && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-green-400 text-sm flex items-center gap-2">
                            <CheckIcon className="w-4 h-4" />
                            Estimated Earnings:
                          </p>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-400">
                              ${estimatedPayment.estimatedAmount.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-400">
                              Quality Score: {Math.round(estimatedPayment.qualityScore * 100)}%
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => step > 1 && setStep(step - 1)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    step === 1 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                  disabled={step === 1}
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep(step)) {
                        setStep(step + 1);
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    Next
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </form>
          </div>

          {/* Quality Indicator Sidebar (Desktop Only) */}
          {qualityMetrics && (
            <div className="hidden lg:block lg:w-80">
              <div className="sticky top-0">
                {performanceService && (
                  <TrendQualityIndicator
                    qualityMetrics={qualityMetrics}
                    estimatedPayment={estimatedPayment}
                    userTier={estimatedPayment?.userTier || 'learning'}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
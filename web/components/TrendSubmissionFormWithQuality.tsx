'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractor';
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
  shares_count?: number;
  hashtags?: string[];
  thumbnail_url?: string;
  posted_at?: string;
  
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
  'Education & Science'
];

const moodOptions = [
  'Funny', 'Inspiring', 'Relatable', 'Controversial', 
  'Educational', 'Nostalgic', 'Shocking', 'Wholesome',
  'Aesthetic', 'Motivational', 'Corporate', 'Calm'
];

const motivationOptions = [
  'Entertainment',
  'Community Building', 
  'Self-Expression',
  'Social Commentary',
  'Educational Content',
  'Brand Promotion',
  'Activism',
  'Creative Challenge'
];

interface Props {
  onClose: () => void;
  onSubmit: (data: TrendData) => void;
  initialUrl?: string;
  qualityMetrics?: TrendQualityMetrics | null;
  estimatedPayment?: any;
}

export default function TrendSubmissionFormWithQuality({ 
  onClose, 
  onSubmit, 
  initialUrl = '',
  qualityMetrics: initialQualityMetrics,
  estimatedPayment: initialEstimatedPayment
}: Props) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qualityMetrics, setQualityMetrics] = useState<TrendQualityMetrics | null>(initialQualityMetrics || null);
  const [estimatedPayment, setEstimatedPayment] = useState<any>(initialEstimatedPayment);
  const performanceService = TrendSpotterPerformanceService.getInstance();
  
  const totalSteps = 4;
  
  const [formData, setFormData] = useState<TrendData>({
    url: initialUrl,
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
    firstSeen: '',
    otherPlatforms: [],
    brandAdoption: false,
    wave_score: 0
  });

  // Update quality metrics in real-time
  useEffect(() => {
    updateQualityMetrics();
  }, [formData]);

  const updateQualityMetrics = async () => {
    if (!user) return;
    
    const metrics = performanceService.calculateTrendQuality(formData);
    setQualityMetrics(metrics);
    
    // Update payment estimate
    const payment = await performanceService.calculateTrendPayment(
      user.id,
      formData,
      metrics
    );
    setEstimatedPayment(payment);
  };

  // Auto-extract metadata when URL is provided
  useEffect(() => {
    if (formData.url && !formData.creator_handle) {
      extractMetadata();
    }
  }, [formData.url]);

  const extractMetadata = async () => {
    if (!formData.url || isExtracting) return;
    
    setIsExtracting(true);
    setExtractError(null);
    
    try {
      const metadata = await MetadataExtractor.extractFromUrl(formData.url);
      
      // Detect platform from URL
      let platform = 'other';
      if (formData.url.includes('tiktok.com')) platform = 'tiktok';
      else if (formData.url.includes('instagram.com')) platform = 'instagram';
      else if (formData.url.includes('youtube.com') || formData.url.includes('youtu.be')) platform = 'youtube';
      else if (formData.url.includes('twitter.com') || formData.url.includes('x.com')) platform = 'twitter';
      
      if (metadata) {
        setFormData(prev => ({
          ...prev,
          platform: platform,
          creator_handle: metadata.creator_handle || prev.creator_handle,
          creator_name: metadata.creator_name || prev.creator_name,
          post_caption: metadata.post_caption || prev.post_caption,
          likes_count: metadata.likes_count || prev.likes_count,
          comments_count: metadata.comments_count || prev.comments_count,
          shares_count: metadata.shares_count || prev.shares_count,
          views_count: metadata.views_count || prev.views_count,
          hashtags: metadata.hashtags || prev.hashtags,
          thumbnail_url: metadata.thumbnail_url || prev.thumbnail_url,
          posted_at: metadata.posted_at || prev.posted_at,
          trendName: metadata.title || prev.trendName,
          explanation: prev.explanation || metadata.post_caption || ''
        }));
        
        // Set image preview if thumbnail exists
        if (metadata.thumbnail_url && !imagePreview) {
          setImagePreview(metadata.thumbnail_url);
        }
      }
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      setExtractError('Could not auto-extract data. Please fill manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, screenshot: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultiSelect = (field: keyof TrendData, value: string) => {
    const currentValues = formData[field] as string[];
    if (currentValues.includes(value)) {
      setFormData({
        ...formData,
        [field]: currentValues.filter(v => v !== value)
      });
    } else {
      setFormData({
        ...formData,
        [field]: [...currentValues, value]
      });
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.url && !!formData.platform && !!formData.trendName;
      case 2:
        return formData.ageRanges.length > 0 && formData.categories.length > 0;
      case 3:
        return !!formData.spreadSpeed && !!formData.motivation;
      case 4:
        return !!formData.explanation && formData.explanation.length >= 20;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Form will be closed by parent component
    } catch (error) {
      console.error('Error submitting trend:', error);
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Submit New Trend</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="relative">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white"
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`text-xs font-medium ${
                      step <= currentStep ? 'text-white' : 'text-white/50'
                    }`}
                  >
                    Step {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quality and Payment Preview */}
          {qualityMetrics && estimatedPayment && (
            <div className="bg-gray-800/50 border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <TrendQualityIndicator metrics={qualityMetrics} compact={true} />
                  <div className="text-sm text-gray-400">
                    Fill in more details to improve quality
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-lg">
                  <DollarSignIcon className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-semibold">
                    Est. ${estimatedPayment.totalAmount.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Trend URL *
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="https://..."
                      />
                      {isExtracting && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <LoaderIcon className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    {extractError && (
                      <p className="mt-1 text-sm text-yellow-400">{extractError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Platform *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {platforms.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, platform: platform.id })}
                          className={`p-3 rounded-lg border transition-all ${
                            formData.platform === platform.id
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          <span className="text-2xl mb-1">{platform.icon}</span>
                          <p className="text-sm">{platform.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Trend Name/Title *
                    </label>
                    <input
                      type="text"
                      value={formData.trendName}
                      onChange={(e) => setFormData({ ...formData, trendName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What's this trend called?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Screenshot/Media
                    </label>
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Trend preview" 
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setImagePreview(null);
                              setFormData({ ...formData, screenshot: undefined });
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <XIcon className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-400 mb-2">Upload screenshot or video thumbnail</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Choose File
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Auto-extracted metadata display */}
                  {(formData.creator_handle || formData.views_count) && (
                    <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/50">
                      <div className="flex items-center gap-2 mb-3">
                        <SparklesIcon className="w-4 h-4 text-blue-400" />
                        <p className="text-sm font-medium text-blue-400">Auto-captured Data</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {formData.creator_handle && (
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">{formData.creator_handle || '@unknown'}</span>
                          </div>
                        )}
                        {formData.views_count !== undefined && (
                          <div className="flex items-center gap-2">
                            <EyeIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">{formData.views_count.toLocaleString()} views</span>
                          </div>
                        )}
                        {formData.likes_count !== undefined && (
                          <div className="flex items-center gap-2">
                            <HeartIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">{formData.likes_count.toLocaleString()} likes</span>
                          </div>
                        )}
                        {formData.comments_count !== undefined && (
                          <div className="flex items-center gap-2">
                            <CommentIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">{formData.comments_count.toLocaleString()} comments</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 2: Audience & Categories */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Target Age Groups *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {ageRangeOptions.map((age) => (
                        <button
                          key={age}
                          type="button"
                          onClick={() => handleMultiSelect('ageRanges', age)}
                          className={`p-3 rounded-lg border transition-all text-sm ${
                            formData.ageRanges.includes(age)
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Categories * (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleMultiSelect('categories', category)}
                          className={`p-3 rounded-lg border transition-all text-sm ${
                            formData.categories.includes(category)
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Moods/Vibes
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood}
                          type="button"
                          onClick={() => handleMultiSelect('moods', mood)}
                          className={`p-2 rounded-lg border transition-all text-sm ${
                            formData.moods.includes(mood)
                              ? 'bg-green-600 border-green-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          {mood}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subcultures (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.subcultures.join(', ')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        subcultures: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Cottagecore, Dark Academia, Y2K (comma separated)"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Trend Status */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      How fast is it spreading? *
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: 'just_started', label: 'Just Started', desc: 'Seen it a few times' },
                        { value: 'picking_up', label: 'Picking Up', desc: 'Seeing it more frequently' },
                        { value: 'viral', label: 'Going Viral', desc: 'Everywhere right now' },
                        { value: 'peak', label: 'At Peak', desc: 'Maximum saturation' },
                        { value: 'declining', label: 'Declining', desc: 'Starting to fade' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, spreadSpeed: option.value })}
                          className={`p-4 rounded-lg border transition-all text-left ${
                            formData.spreadSpeed === option.value
                              ? 'bg-orange-600 border-orange-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm opacity-80">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      What's driving this trend? *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {motivationOptions.map((motivation) => (
                        <button
                          key={motivation}
                          type="button"
                          onClick={() => setFormData({ ...formData, motivation })}
                          className={`p-3 rounded-lg border transition-all text-sm ${
                            formData.motivation === motivation
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          {motivation}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Audio/Catchphrase (if applicable)
                    </label>
                    <input
                      type="text"
                      value={formData.audioOrCatchphrase}
                      onChange={(e) => setFormData({ ...formData, audioOrCatchphrase: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., specific song, sound, or phrase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      When did you first see this?
                    </label>
                    <select
                      value={formData.firstSeen}
                      onChange={(e) => setFormData({ ...formData, firstSeen: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select timeframe</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="this_week">This week</option>
                      <option value="last_week">Last week</option>
                      <option value="this_month">This month</option>
                      <option value="longer">More than a month ago</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Details & Submit */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Explain this trend * (min 20 characters)
                    </label>
                    <textarea
                      value={formData.explanation}
                      onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                      placeholder="What makes this trend interesting? Why is it catching on?"
                    />
                    <p className="mt-1 text-sm text-gray-400">
                      {formData.explanation.length}/20 characters minimum
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Seen on other platforms?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {platforms.filter(p => p.id !== formData.platform).map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => handleMultiSelect('otherPlatforms', platform.id)}
                          className={`p-2 rounded-lg border transition-all text-sm ${
                            formData.otherPlatforms.includes(platform.id)
                              ? 'bg-teal-600 border-teal-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          {platform.icon} {platform.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.brandAdoption}
                        onChange={(e) => setFormData({ ...formData, brandAdoption: e.target.checked })}
                        className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">Brands are already jumping on this trend</span>
                    </label>
                  </div>

                  {/* Quality Summary */}
                  {qualityMetrics && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Submission Quality</h3>
                      <TrendQualityIndicator metrics={qualityMetrics} showBreakdown={true} />
                    </div>
                  )}

                  {/* Payment Estimate */}
                  {estimatedPayment && (
                    <div className="bg-green-900/20 rounded-lg p-4 border border-green-800/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSignIcon className="w-5 h-5 text-green-400" />
                          <p className="font-medium text-green-400">Estimated Earnings</p>
                        </div>
                        <p className="text-2xl font-bold text-green-400">
                          ${estimatedPayment.totalAmount.toFixed(3)}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm">
                        {estimatedPayment.breakdown.map((item: string, index: number) => (
                          <p key={index} className="text-gray-400">{item}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="bg-gray-800 p-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            <div className="flex items-center gap-3">
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!isStepValid(currentStep)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                >
                  Next
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isStepValid(currentStep) || isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 transition-all"
                >
                  {isSubmitting ? (
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
      </motion.div>
    </AnimatePresence>
  );
}
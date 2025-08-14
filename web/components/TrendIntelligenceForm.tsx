'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { MetadataExtractor } from '@/lib/metadataExtractor';
import { 
  TrendIntelligenceData,
  CATEGORIES,
  PLATFORMS,
  CATEGORY_QUESTIONS,
  UNIVERSAL_INTELLIGENCE,
  DEMOGRAPHICS,
  SUBCULTURES
} from '@/lib/trendIntelligenceConfig';
import { 
  Link as LinkIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
  Tag as TagIcon,
  Send as SendIcon,
  X as XIcon,
  Clipboard as ClipboardIcon,
  AlertCircle as AlertCircleIcon,
  Check as CheckIcon,
  Loader as LoaderIcon,
  Trash2 as TrashIcon,
  TrendingUp as TrendingUpIcon,
  Brain as BrainIcon,
  Users as UsersIcon,
  Target as TargetIcon,
  MessageSquare as MessageSquareIcon,
  ChevronRight as ChevronRightIcon,
  Info as InfoIcon
} from 'lucide-react';

interface TrendIntelligenceFormProps {
  onClose: () => void;
  onSubmit: (data: TrendIntelligenceData) => Promise<void>;
  initialUrl?: string;
}

export default function TrendIntelligenceForm({ onClose, onSubmit, initialUrl = '' }: TrendIntelligenceFormProps) {
  const { user } = useAuth();
  const { showError, showWarning, showSuccess } = useToast();
  const DRAFT_KEY = 'wavesight_intelligence_draft';
  
  // Initialize form data with default values
  const loadDraft = (): Partial<TrendIntelligenceData> => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          return JSON.parse(draft);
        } catch (e) {
          showWarning('Could not load saved draft', 'Starting with a fresh form');
        }
      }
    }
    return {
      url: initialUrl,
      title: ''
      // Other fields will be set as user progresses through the form
      // Using Partial<TrendIntelligenceData> allows undefined values
    };
  };
  
  const [formData, setFormData] = useState<Partial<TrendIntelligenceData>>(loadDraft());
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedThumbnail, setExtractedThumbnail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Total steps: 1 (Basic) + 2 (Universal) + 3 (Category) + 4 (Context)
  const totalSteps = 4;
  
  // Save draft to localStorage when form data changes
  useEffect(() => {
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }
    
    draftSaveTimeoutRef.current = setTimeout(() => {
      if (formData.url || formData.title) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      }
    }, 1000);
    
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [formData]);

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return string.includes('tiktok.com') || 
             string.includes('instagram.com') || 
             string.includes('youtube.com') || 
             string.includes('twitter.com') || 
             string.includes('x.com') ||
             string.includes('reddit.com') ||
             string.includes('linkedin.com');
    } catch {
      return false;
    }
  };

  const detectPlatform = (url: string): TrendIntelligenceData['platform'] | undefined => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('linkedin.com')) return 'linkedin';
    return undefined;
  };

  const extractMetadataFromUrl = async (url: string) => {
    setExtractingMetadata(true);
    try {
      const extractedData = await MetadataExtractor.extractFromUrl(url);
      const platform = detectPlatform(url);
      
      setFormData(prev => ({
        ...prev,
        platform: platform || prev.platform,
        creatorHandle: extractedData.creator_handle || prev.creatorHandle,
        creatorName: extractedData.creator_name || prev.creatorName,
        postCaption: extractedData.post_caption || prev.postCaption,
        likesCount: extractedData.likes_count || prev.likesCount,
        commentsCount: extractedData.comments_count || prev.commentsCount,
        sharesCount: extractedData.shares_count || prev.sharesCount,
        viewsCount: extractedData.views_count || prev.viewsCount,
        hashtags: extractedData.hashtags || prev.hashtags,
        thumbnailUrl: extractedData.thumbnail_url || prev.thumbnailUrl,
        postedAt: extractedData.posted_at || prev.postedAt
      }));
      
      // Set extracted thumbnail for display
      if (extractedData.thumbnail_url) {
        setExtractedThumbnail(extractedData.thumbnail_url);
      }
    } catch (error) {
      showError('Failed to extract metadata', 'Please fill in the details manually');
    } finally {
      setExtractingMetadata(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (step === 1) {
      if (!formData.url) {
        errors.url = 'URL is required';
      } else if (!isValidUrl(formData.url)) {
        errors.url = 'Please enter a valid social media URL';
      }
      
      if (!formData.title || formData.title.trim().length < 3) {
        errors.title = 'Trend title must be at least 3 characters';
      }
      
      if (!formData.platform) {
        errors.platform = 'Please select a platform';
      }
      
      if (!formData.category) {
        errors.category = 'Please select a category';
      }
    }
    
    if (step === 2) {
      if (!formData.trendDynamics?.velocity) {
        errors.velocity = 'Please select trend velocity';
      }
      if (!formData.trendDynamics?.platformSpread) {
        errors.platformSpread = 'Please select platform spread';
      }
      if (!formData.trendDynamics?.size) {
        errors.size = 'Please select trend size';
      }
      if (!formData.aiDetection?.origin) {
        errors.aiOrigin = 'Please select AI origin assessment';
      }
      if (!formData.audienceIntelligence?.sentiment) {
        errors.sentiment = 'Please select audience sentiment';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      showError('Please complete all required fields');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData as TrendIntelligenceData);
      showSuccess('Trend intelligence submitted successfully!');
      localStorage.removeItem(DRAFT_KEY);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      showError('Failed to submit trend', err.message || 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  const clearDraft = () => {
    if (confirm('Are you sure you want to clear all form data?')) {
      setFormData(loadDraft());
      setImagePreview(null);
      setCurrentStep(1);
      setValidationErrors({});
      localStorage.removeItem(DRAFT_KEY);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Get category-specific questions
  const categoryQuestions = formData.category ? CATEGORY_QUESTIONS[formData.category] : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="wave-card p-6 max-w-4xl w-full my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BrainIcon className="w-6 h-6 text-wave-500" />
              WaveSight Trend Intelligence
            </h2>
            <p className="text-wave-400 text-sm mt-1">
              Step {currentStep} of {totalSteps} - {
                currentStep === 1 ? 'Basic Info' :
                currentStep === 2 ? 'Universal Intelligence' :
                currentStep === 3 ? 'Category Intelligence' :
                'Context & Prediction'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(formData.url || formData.title) && (
              <>
                <span className="text-xs text-wave-500">Draft saved</span>
                <button
                  onClick={clearDraft}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-all group"
                  title="Clear draft"
                >
                  <TrashIcon className="w-4 h-4 text-wave-400 group-hover:text-red-400" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-wave-800/50 transition-all"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-wave-400 mb-2">
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              Basic
            </span>
            <span className="flex items-center gap-1">
              <TrendingUpIcon className="w-3 h-3" />
              Universal
            </span>
            <span className="flex items-center gap-1">
              <TargetIcon className="w-3 h-3" />
              Category
            </span>
            <span className="flex items-center gap-1">
              <MessageSquareIcon className="w-3 h-3" />
              Context
            </span>
          </div>
          <div className="h-2 bg-wave-800/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-wave-500 to-wave-600"
              initial={{ width: '25%' }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Basic Trend Info */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-wave-800/20 border border-wave-700/30 rounded-xl p-4 mb-6">
                <h3 className="text-wave-200 font-medium mb-2">📍 Step 1: Basic Trend Information</h3>
                <p className="text-wave-400 text-sm">Capture the essential details about what's trending</p>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  Trend URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.url || ''}
                    onChange={async (e) => {
                      const newUrl = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        url: newUrl,
                        platform: detectPlatform(newUrl) || prev.platform
                      }));
                      
                      if (isValidUrl(newUrl)) {
                        extractMetadataFromUrl(newUrl);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white placeholder-wave-500 focus:outline-none focus:ring-2 ${
                      validationErrors.url 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-wave-700/30 focus:border-wave-500 focus:ring-wave-500/20'
                    }`}
                    placeholder="https://tiktok.com/@user/video/123..."
                    required
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipboardText = await navigator.clipboard.readText();
                        if (isValidUrl(clipboardText)) {
                          setFormData(prev => ({ 
                            ...prev, 
                            url: clipboardText,
                            platform: detectPlatform(clipboardText) || prev.platform
                          }));
                          extractMetadataFromUrl(clipboardText);
                        }
                      } catch (error) {
                        console.log('Clipboard access denied');
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-wave-700/50 transition-all"
                    disabled={extractingMetadata}
                  >
                    {extractingMetadata ? (
                      <LoaderIcon className="w-4 h-4 text-wave-400 animate-spin" />
                    ) : (
                      <ClipboardIcon className="w-4 h-4 text-wave-400" />
                    )}
                  </button>
                </div>
                {validationErrors.url && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.url}</p>
                )}
              </div>

              {/* Trend Title */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  Trend Name *
                  <span className="text-sm text-wave-400 font-normal ml-2">
                    (What would you call this trend?)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white placeholder-wave-500 focus:outline-none focus:ring-2 ${
                    validationErrors.title 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-wave-700/30 focus:border-wave-500 focus:ring-wave-500/20'
                  }`}
                  placeholder="e.g. 'Winter Arc Challenge', 'Girl Dinner', 'Deinfluencing'..."
                  required
                />
                {validationErrors.title && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.title}</p>
                )}
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  Platform * {validationErrors.platform && <span className="text-red-400 text-sm font-normal">({validationErrors.platform})</span>}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, platform: platform.id as any }))}
                      className={`
                        p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
                        ${formData.platform === platform.id
                          ? 'border-wave-500 bg-wave-600/20'
                          : 'border-wave-700/30 hover:border-wave-600/50'
                        }
                      `}
                    >
                      <span className="text-lg">{platform.icon}</span>
                      <span className="text-sm font-medium">{platform.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  <TagIcon className="w-4 h-4 inline mr-2" />
                  Category * {validationErrors.category && <span className="text-red-400 text-sm font-normal">({validationErrors.category})</span>}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: category.id as any }))}
                      className={`
                        p-4 rounded-xl border-2 transition-all text-left
                        ${formData.category === category.id
                          ? 'border-wave-500 bg-wave-600/20'
                          : 'border-wave-700/30 hover:border-wave-600/50'
                        }
                      `}
                    >
                      <div className="font-medium text-wave-200 mb-1">{category.label}</div>
                      <div className="text-xs text-wave-400">{category.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Show extracted thumbnail immediately in Step 1 */}
              {extractedThumbnail && (
                <div>
                  <label className="block text-wave-200 mb-2 font-medium">
                    <ImageIcon className="w-4 h-4 inline mr-2" />
                    Captured Thumbnail
                  </label>
                  <div className="relative w-32 h-32">
                    <img
                      src={extractedThumbnail}
                      alt="Trend thumbnail"
                      className="w-full h-full object-cover rounded-xl border border-wave-700/30"
                      onError={(e) => {
                        console.error('Thumbnail failed to load');
                        setExtractedThumbnail(null);
                      }}
                    />
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Universal Intelligence */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-wave-800/20 border border-wave-700/30 rounded-xl p-4 mb-6">
                <h3 className="text-wave-200 font-medium mb-2">🌍 Step 2: Universal Intelligence</h3>
                <p className="text-wave-400 text-sm">Assess dynamics that apply to all trends</p>
              </div>

              {/* Trend Dynamics */}
              <div className="space-y-4">
                <h4 className="text-wave-200 font-medium flex items-center gap-2">
                  <TrendingUpIcon className="w-4 h-4" />
                  Trend Dynamics
                </h4>
                
                {/* Velocity */}
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Velocity * {validationErrors.velocity && <span className="text-red-400">Required</span>}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {UNIVERSAL_INTELLIGENCE.velocity.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          trendDynamics: { 
                            ...prev.trendDynamics,
                            velocity: option.value
                          } as TrendIntelligenceData['trendDynamics']
                        }))}
                        className={`
                          p-3 rounded-lg border transition-all text-left
                          ${formData.trendDynamics?.velocity === option.value
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        <div className="text-xs text-wave-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Spread */}
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Platform Spread * {validationErrors.platformSpread && <span className="text-red-400">Required</span>}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {UNIVERSAL_INTELLIGENCE.platformSpread.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          trendDynamics: { 
                            ...prev.trendDynamics,
                            platformSpread: option.value
                          } as TrendIntelligenceData['trendDynamics']
                        }))}
                        className={`
                          p-3 rounded-lg border transition-all text-left
                          ${formData.trendDynamics?.platformSpread === option.value
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        <div className="text-xs text-wave-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Estimated Size * {validationErrors.size && <span className="text-red-400">Required</span>}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {UNIVERSAL_INTELLIGENCE.size.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          trendDynamics: { 
                            ...prev.trendDynamics,
                            size: option.value
                          } as TrendIntelligenceData['trendDynamics']
                        }))}
                        className={`
                          p-3 rounded-lg border transition-all text-left
                          ${formData.trendDynamics?.size === option.value
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        <div className="text-xs text-wave-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Detection */}
              <div className="space-y-4">
                <h4 className="text-wave-200 font-medium flex items-center gap-2">
                  <BrainIcon className="w-4 h-4" />
                  Human vs AI Detection
                </h4>
                
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Origin Assessment * {validationErrors.aiOrigin && <span className="text-red-400">Required</span>}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {UNIVERSAL_INTELLIGENCE.aiOrigin.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          aiDetection: { 
                            ...prev.aiDetection,
                            origin: option.value
                          } as TrendIntelligenceData['aiDetection']
                        }))}
                        className={`
                          p-3 rounded-lg border transition-all text-left
                          ${formData.aiDetection?.origin === option.value
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        <div className="text-xs text-wave-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Why do you think this? (Optional)
                  </label>
                  <textarea
                    value={formData.aiDetection?.reasoning || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aiDetection: { 
                        ...prev.aiDetection,
                        reasoning: e.target.value
                      } as TrendIntelligenceData['aiDetection']
                    }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm"
                    placeholder="What signals tipped you off? (e.g., unnatural language, perfect composition, AI watermarks...)"
                  />
                </div>
              </div>

              {/* Audience Intelligence */}
              <div className="space-y-4">
                <h4 className="text-wave-200 font-medium flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  Audience Intelligence
                </h4>
                
                {/* Sentiment */}
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Overall Sentiment * {validationErrors.sentiment && <span className="text-red-400">Required</span>}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {UNIVERSAL_INTELLIGENCE.sentiment.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          audienceIntelligence: { 
                            ...prev.audienceIntelligence, 
                            sentiment: option.value
                          } as TrendIntelligenceData['audienceIntelligence']
                        }))}
                        className={`
                          p-3 rounded-lg border transition-all text-left
                          ${formData.audienceIntelligence?.sentiment === option.value
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        <div className="text-xs text-wave-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Demographics */}
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Who's Engaging? (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {DEMOGRAPHICS.map((demo) => (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => {
                          const current = formData.audienceIntelligence?.demographics || [];
                          const updated = current.includes(demo.id as any)
                            ? current.filter(d => d !== demo.id)
                            : [...current, demo.id as any];
                          setFormData(prev => ({
                            ...prev,
                            audienceIntelligence: { 
                              ...prev.audienceIntelligence, 
                              demographics: updated 
                            } as TrendIntelligenceData['audienceIntelligence']
                          }));
                        }}
                        className={`
                          p-3 rounded-lg border transition-all text-left
                          ${formData.audienceIntelligence?.demographics?.includes(demo.id as any)
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <div className="font-medium text-wave-200 text-sm">{demo.label}</div>
                        <div className="text-xs text-wave-400 mt-1">{demo.age}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subcultures */}
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Subcultures (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SUBCULTURES.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          const current = formData.audienceIntelligence?.subcultures || [];
                          const updated = current.includes(sub.id as any)
                            ? current.filter(s => s !== sub.id)
                            : [...current, sub.id as any];
                          setFormData(prev => ({
                            ...prev,
                            audienceIntelligence: { 
                              ...prev.audienceIntelligence, 
                              subcultures: updated 
                            } as TrendIntelligenceData['audienceIntelligence']
                          }));
                        }}
                        className={`
                          p-3 rounded-lg border transition-all text-left flex items-center gap-2
                          ${formData.audienceIntelligence?.subcultures?.includes(sub.id as any)
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <span className="text-lg">{sub.icon}</span>
                        <span className="font-medium text-wave-200 text-sm">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Presence */}
                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Brand Presence
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {UNIVERSAL_INTELLIGENCE.brandPresence.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          audienceIntelligence: { 
                            ...prev.audienceIntelligence, 
                            brandPresence: option.value
                          } as TrendIntelligenceData['audienceIntelligence']
                        }))}
                        className={`
                          p-3 rounded-lg border transition-all text-left
                          ${formData.audienceIntelligence?.brandPresence === option.value
                            ? 'border-wave-500 bg-wave-600/20'
                            : 'border-wave-700/30 hover:border-wave-600/50'
                          }
                        `}
                      >
                        <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        <div className="text-xs text-wave-400 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Category-Specific Intelligence */}
          {currentStep === 3 && categoryQuestions && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-wave-800/20 border border-wave-700/30 rounded-xl p-4 mb-6">
                <h3 className="text-wave-200 font-medium mb-2">
                  <TargetIcon className="w-4 h-4 inline mr-2" />
                  {categoryQuestions.title}
                </h3>
                <p className="text-wave-400 text-sm">
                  Category-specific intelligence for {formData.category} trends
                </p>
              </div>

              {categoryQuestions.questions.map((question) => (
                <div key={question.id}>
                  <label className="block text-wave-300 text-sm mb-2">
                    {question.label}
                  </label>
                  
                  {question.type === 'select' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {question.options?.map((option) => (
                        <button
                          key={String(option.value)}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            categorySpecific: {
                              ...prev.categorySpecific,
                              [question.id]: option.value
                            } as TrendIntelligenceData['categorySpecific']
                          }))}
                          className={`
                            p-3 rounded-lg border transition-all text-left
                            ${(formData.categorySpecific as any)?.[question.id] === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                            }
                          `}
                        >
                          <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'text' && (
                    <input
                      type="text"
                      value={(formData.categorySpecific as any)?.[question.id] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        categorySpecific: {
                          ...prev.categorySpecific,
                          [question.id]: e.target.value
                        } as TrendIntelligenceData['categorySpecific']
                      }))}
                      className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm"
                      placeholder={(question as any).placeholder || ''}
                    />
                  )}
                  
                  {question.type === 'boolean' && (
                    <div className="grid grid-cols-2 gap-2">
                      {question.options?.map((option) => (
                        <button
                          key={String(option.value)}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            categorySpecific: {
                              ...prev.categorySpecific,
                              [question.id]: option.value
                            } as TrendIntelligenceData['categorySpecific']
                          }))}
                          className={`
                            p-3 rounded-lg border transition-all
                            ${(formData.categorySpecific as any)?.[question.id] === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                            }
                          `}
                        >
                          <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Step 4: Context & Prediction */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-wave-800/20 border border-wave-700/30 rounded-xl p-4 mb-6">
                <h3 className="text-wave-200 font-medium mb-2">
                  <MessageSquareIcon className="w-4 h-4 inline mr-2" />
                  Context & Prediction (Optional)
                </h3>
                <p className="text-wave-400 text-sm">
                  Add your analysis and predictions to make this intelligence more valuable
                </p>
              </div>

              <div>
                <label className="block text-wave-300 text-sm mb-2">
                  Why This Matters
                  <span className="text-wave-500 ml-2">(1-2 sentences on significance)</span>
                </label>
                <textarea
                  value={formData.context?.whyItMatters || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    context: { 
                      ...prev.context,
                      whyItMatters: e.target.value
                    } as TrendIntelligenceData['context']
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm"
                  placeholder="Why should brands/creators/investors care about this trend?"
                />
              </div>

              <div>
                <label className="block text-wave-300 text-sm mb-2">
                  30-Day Prediction
                  <span className="text-wave-500 ml-2">(Where does this go?)</span>
                </label>
                <textarea
                  value={formData.context?.prediction || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    context: { 
                      ...prev.context,
                      prediction: e.target.value
                    } as TrendIntelligenceData['context']
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm"
                  placeholder="Will it go mainstream? Die out? Transform into something else?"
                />
              </div>

              {/* Thumbnail Display */}
              {extractedThumbnail && (
                <div className="mb-6">
                  <label className="block text-wave-200 mb-3 font-medium">
                    <ImageIcon className="w-4 h-4 inline mr-2" />
                    Extracted Thumbnail
                  </label>
                  <div className="relative">
                    <img
                      src={extractedThumbnail}
                      alt="Extracted thumbnail"
                      className="w-full h-48 object-cover rounded-xl border-2 border-wave-600/50"
                      onError={(e) => {
                        console.error('Thumbnail failed to load:', extractedThumbnail);
                        setExtractedThumbnail(null);
                      }}
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/80 rounded text-xs text-white">
                      Auto-captured
                    </div>
                  </div>
                </div>
              )}
              
              {/* Manual Image Upload */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  {extractedThumbnail ? 'Replace with Custom Screenshot' : 'Add Screenshot'} (Optional)
                </label>
                
                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-wave-600/50 rounded-xl p-6 text-center cursor-pointer hover:border-wave-500/70 transition-all"
                  >
                    <UploadIcon className="w-8 h-8 text-wave-400 mx-auto mb-2" />
                    <p className="text-wave-300 mb-1">Click to upload custom image</p>
                    <p className="text-xs text-wave-500">PNG, JPG up to 10MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Custom preview"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-all"
                    >
                      <XIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Summary Review */}
              <div className="bg-wave-800/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Intelligence Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-wave-400">Trend:</span>
                    <span className="text-wave-200">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wave-400">Platform:</span>
                    <span className="text-wave-200">{formData.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wave-400">Category:</span>
                    <span className="text-wave-200">{formData.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wave-400">Velocity:</span>
                    <span className="text-wave-200">{formData.trendDynamics?.velocity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wave-400">AI Origin:</span>
                    <span className="text-wave-200">{formData.aiDetection?.origin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wave-400">Sentiment:</span>
                    <span className="text-wave-200">{formData.audienceIntelligence?.sentiment}</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-wave-600/20 rounded-lg">
                  <p className="text-xs text-wave-300">
                    <InfoIcon className="w-3 h-3 inline mr-1" />
                    This intelligence will help brands, creators, and investors understand trend dynamics better
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : prevStep}
              className="px-6 py-2 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all flex items-center gap-2"
            >
              {currentStep === 1 ? 'Cancel' : '← Previous'}
            </button>
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-wave-500 to-wave-600 hover:from-wave-400 hover:to-wave-500 transition-all flex items-center gap-2"
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                {loading ? 'Submitting...' : 'Submit Intelligence'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
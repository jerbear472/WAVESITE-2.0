'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { TrendDuplicateChecker } from '@/lib/trendDuplicateChecker';
import { useToast } from '@/contexts/ToastContext';
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
  ChevronLeft as ChevronLeftIcon,
  Info as InfoIcon,
  Sparkles as SparklesIcon,
  Zap as ZapIcon,
  Globe as GlobeIcon,
  BarChart as BarChartIcon
} from 'lucide-react';

type TrendData = Partial<TrendIntelligenceData> & {
  image?: File | string;
};

interface TrendSubmissionFormEnhancedProps {
  onClose: () => void;
  onSubmit?: (data: Partial<TrendIntelligenceData>) => Promise<void>;
  initialUrl?: string;
  initialCategory?: string;
}

export default function TrendSubmissionFormEnhanced({ 
  onClose, 
  onSubmit: customSubmit, 
  initialUrl = '',
  initialCategory = ''
}: TrendSubmissionFormEnhancedProps) {
  const { user } = useAuth();
  const { showError, showWarning, showSuccess } = useToast();
  const DRAFT_KEY = 'wavesight_trend_enhanced_draft';
  
  // Debug log to verify enhanced form is loaded
  console.log('🚀 TrendSubmissionFormEnhanced loaded - 5-step intelligence gathering active');
  
  // Load draft from localStorage
  const loadDraft = (): TrendData => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          return JSON.parse(draft);
        } catch (e) {
          console.log('Could not load draft');
        }
      }
    }
    return {
      url: initialUrl,
      title: '',
      category: initialCategory as TrendIntelligenceData['category'] || undefined,
    };
  };
  
  const [formData, setFormData] = useState<TrendData>(loadDraft());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // If category is pre-selected, start at step 2 (Universal Intelligence)
  const [step, setStep] = useState(initialCategory ? 2 : 1);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const totalSteps = 5; // Basic, Universal, Category-specific, Context, Review

  // Save draft to localStorage
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
      return true;
    } catch {
      return false;
    }
  };

  const extractMetadataFromUrl = async (url: string) => {
    if (!url || !isValidUrl(url)) return;
    
    setExtractingMetadata(true);
    try {
      const extractedData = await MetadataExtractor.extractFromUrl(url);
      
      // Detect platform
      let platform: TrendIntelligenceData['platform'] | undefined;
      if (url.includes('tiktok.com')) platform = 'tiktok';
      else if (url.includes('instagram.com')) platform = 'instagram';
      else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
      else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
      else if (url.includes('reddit.com')) platform = 'reddit';
      else if (url.includes('linkedin.com')) platform = 'linkedin';
      
      setFormData(prev => ({
        ...prev,
        platform: platform,
        title: prev.title || extractedData.title || '',
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
    } catch (error) {
      console.error('Metadata extraction error:', error);
    } finally {
      setExtractingMetadata(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare submission data
      const submissionData: Partial<TrendIntelligenceData> = {
        ...formData,
        // Ensure required fields are present
        url: formData.url || '',
        title: formData.title || '',
        platform: formData.platform,
        category: formData.category,
        trendDynamics: formData.trendDynamics || {
          velocity: 'just_starting',
          platformSpread: 'single_platform',
          size: 'under_10k'
        },
        aiDetection: formData.aiDetection || {
          origin: 'likely_human',
          reasoning: ''
        },
        audienceIntelligence: formData.audienceIntelligence || {
          sentiment: 'mixed_fighting',
          demographics: [],
          subcultures: [],
          brandPresence: 'no_brands'
        }
      };

      if (customSubmit) {
        await customSubmit(submissionData);
      } else {
        // Since we're using customSubmit from the parent, we don't need TrendIntelligenceService here
        // The parent component handles the submission
        console.log('Submission data ready:', submissionData);
      }

      showSuccess('Trend submitted successfully!', 'Your trend is now being reviewed');
      localStorage.removeItem(DRAFT_KEY);
      setTimeout(onClose, 2000);
    } catch (error: any) {
      console.error('Submission error:', error);
      setError(error.message || 'Failed to submit trend');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const errors: {[key: string]: string} = {};
    
    switch (stepNumber) {
      case 1:
        if (!formData.url) errors.url = 'URL is required';
        if (!formData.title) errors.title = 'Title is required';
        if (!formData.platform) errors.platform = 'Platform is required';
        // Only validate category if not pre-selected
        if (!initialCategory && !formData.category) errors.category = 'Category is required';
        break;
      case 2:
        // When starting from step 2 with pre-selected category, also validate basic info
        if (initialCategory && stepNumber === 2) {
          if (!formData.url) errors.url = 'URL is required';
          if (!formData.title) errors.title = 'Title is required';
          if (!formData.platform) errors.platform = 'Platform is required';
        }
        if (!formData.trendDynamics?.velocity) errors.velocity = 'Required';
        if (!formData.trendDynamics?.platformSpread) errors.platformSpread = 'Required';
        if (!formData.trendDynamics?.size) errors.size = 'Required';
        if (!formData.aiDetection?.origin) errors.aiOrigin = 'Required';
        if (!formData.audienceIntelligence?.sentiment) errors.sentiment = 'Required';
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps));
      setValidationErrors({});
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
    setValidationErrors({});
  };

  const getCategoryQuestions = () => {
    if (!formData.category) return null;
    return CATEGORY_QUESTIONS[formData.category as keyof typeof CATEGORY_QUESTIONS];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-wave-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-wave-700/50 shadow-2xl"
      >
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-wave-800 to-wave-700 p-6 border-b border-wave-600/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wave-500 to-wave-600 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">WaveSight Intelligence Capture</h2>
                <p className="text-sm text-wave-300">
                  {initialCategory ? 
                    `Category: ${CATEGORIES.find(c => c.id === initialCategory)?.label || initialCategory} - Step ${step} of ${totalSteps}` :
                    `Step ${step} of ${totalSteps} - Enhanced 5-Step Flow`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-wave-700/50 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-wave-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < step ? 'bg-wave-500' : 'bg-wave-700/50'
                }`}
              />
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex justify-between mt-2 text-xs text-wave-400">
            <span className={step >= 1 ? 'text-wave-200' : ''}>Basic Info</span>
            <span className={step >= 2 ? 'text-wave-200' : ''}>Intelligence</span>
            <span className={step >= 3 ? 'text-wave-200' : ''}>Category</span>
            <span className={step >= 4 ? 'text-wave-200' : ''}>Context</span>
            <span className={step >= 5 ? 'text-wave-200' : ''}>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Trend Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-wave-400" />
                    Basic Trend Information
                  </h3>
                  
                  {/* URL Input */}
                  <div className="mb-4">
                    <label className="block text-wave-300 text-sm mb-2">
                      Trend URL * {validationErrors.url && <span className="text-red-400">({validationErrors.url})</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formData.url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        onBlur={(e) => extractMetadataFromUrl(e.target.value)}
                        placeholder="https://www.tiktok.com/@user/video/..."
                        className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border ${
                          validationErrors.url ? 'border-red-500' : 'border-wave-700/30'
                        } text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none`}
                      />
                      {extractingMetadata && (
                        <div className="absolute right-3 top-3">
                          <LoaderIcon className="w-5 h-5 text-wave-400 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-wave-300 text-sm mb-2">
                      Title * {validationErrors.title && <span className="text-red-400">({validationErrors.title})</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Give this trend a catchy title"
                      className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border ${
                        validationErrors.title ? 'border-red-500' : 'border-wave-700/30'
                      } text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none`}
                    />
                  </div>

                  {/* Platform Selection */}
                  <div className="mb-4">
                    <label className="block text-wave-300 text-sm mb-2">
                      Platform * {validationErrors.platform && <span className="text-red-400">Required</span>}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLATFORMS.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            platform: platform.id as TrendIntelligenceData['platform'] 
                          }))}
                          className={`p-3 rounded-lg border transition-all ${
                            formData.platform === platform.id
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
                        >
                          <span className="text-xl mb-1">{platform.icon}</span>
                          <p className="text-xs text-wave-300">{platform.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Selection - Only show if not pre-selected */}
                  {!initialCategory && (
                    <div>
                      <label className="block text-wave-300 text-sm mb-2">
                        Category * {validationErrors.category && <span className="text-red-400">Required</span>}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              category: category.id as TrendIntelligenceData['category'],
                              categorySpecific: {} // Reset category-specific answers
                            }))}
                            className={`p-3 rounded-lg border transition-all text-left ${
                              formData.category === category.id
                                ? 'border-wave-500 bg-wave-600/20'
                                : 'border-wave-700/30 hover:border-wave-600/50'
                            }`}
                          >
                            <div className="font-medium text-wave-200 text-sm">{category.label}</div>
                            <div className="text-xs text-wave-400 mt-1">{category.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show selected category if pre-selected */}
                  {initialCategory && (
                    <div className="bg-wave-800/30 rounded-lg p-3">
                      <label className="block text-wave-300 text-sm mb-1">Selected Category</label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {CATEGORIES.find(c => c.id === initialCategory)?.label}
                        </span>
                        <span className="text-sm text-wave-400">
                          {CATEGORIES.find(c => c.id === initialCategory)?.description}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Universal Intelligence */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* If category was pre-selected, show basic info fields first */}
                {initialCategory && step === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-wave-400" />
                      Basic Trend Information
                    </h3>
                    
                    {/* URL Input */}
                    <div>
                      <label className="block text-wave-300 text-sm mb-2">
                        Trend URL * {validationErrors.url && <span className="text-red-400">({validationErrors.url})</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={formData.url || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                          onBlur={(e) => extractMetadataFromUrl(e.target.value)}
                          placeholder="https://www.tiktok.com/@user/video/..."
                          className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border ${
                            validationErrors.url ? 'border-red-500' : 'border-wave-700/30'
                          } text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none`}
                        />
                        {extractingMetadata && (
                          <div className="absolute right-3 top-3">
                            <LoaderIcon className="w-5 h-5 text-wave-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-wave-300 text-sm mb-2">
                        Title * {validationErrors.title && <span className="text-red-400">({validationErrors.title})</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Give this trend a catchy title"
                        className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border ${
                          validationErrors.title ? 'border-red-500' : 'border-wave-700/30'
                        } text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none`}
                      />
                    </div>

                    {/* Platform Selection */}
                    <div>
                      <label className="block text-wave-300 text-sm mb-2">
                        Platform * {validationErrors.platform && <span className="text-red-400">Required</span>}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {PLATFORMS.map((platform) => (
                          <button
                            key={platform.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              platform: platform.id as TrendIntelligenceData['platform'] 
                            }))}
                            className={`p-3 rounded-lg border transition-all ${
                              formData.platform === platform.id
                                ? 'border-wave-500 bg-wave-600/20'
                                : 'border-wave-700/30 hover:border-wave-600/50'
                            }`}
                          >
                            <span className="text-xl mb-1">{platform.icon}</span>
                            <p className="text-xs text-wave-300">{platform.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-wave-700/30 pt-4 mt-4"></div>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BrainIcon className="w-5 h-5 text-wave-400" />
                  Universal Intelligence Gathering
                </h3>

                {/* Trend Dynamics */}
                <div className="space-y-4">
                  <h4 className="text-wave-200 font-medium flex items-center gap-2">
                    <ZapIcon className="w-4 h-4" />
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
                          className={`p-3 rounded-lg border transition-all text-left ${
                            formData.trendDynamics?.velocity === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
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
                          className={`p-3 rounded-lg border transition-all text-left ${
                            formData.trendDynamics?.platformSpread === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
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
                          className={`p-3 rounded-lg border transition-all text-left ${
                            formData.trendDynamics?.size === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
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
                    AI Detection
                  </h4>
                  
                  <div>
                    <label className="block text-wave-300 text-sm mb-2">
                      Origin Assessment * {validationErrors.aiOrigin && <span className="text-red-400">Required</span>}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
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
                          className={`p-3 rounded-lg border transition-all text-left ${
                            formData.aiDetection?.origin === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
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
                      placeholder="What signals tipped you off?"
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
                          className={`p-3 rounded-lg border transition-all text-left ${
                            formData.audienceIntelligence?.sentiment === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
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
                    <div className="grid grid-cols-3 gap-2">
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
                          className={`p-3 rounded-lg border transition-all text-left ${
                            formData.audienceIntelligence?.demographics?.includes(demo.id as any)
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
                        >
                          <div className="font-medium text-wave-200 text-sm">{demo.label}</div>
                          <div className="text-xs text-wave-400 mt-1">{demo.age}</div>
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
                          className={`p-3 rounded-lg border transition-all text-left ${
                            formData.audienceIntelligence?.brandPresence === option.value
                              ? 'border-wave-500 bg-wave-600/20'
                              : 'border-wave-700/30 hover:border-wave-600/50'
                          }`}
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

            {/* Step 3: Category-Specific Questions */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {getCategoryQuestions() ? (
                  <>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <TargetIcon className="w-5 h-5 text-wave-400" />
                      {getCategoryQuestions()?.title}
                    </h3>

                    <div className="space-y-4">
                      {getCategoryQuestions()?.questions.map((question) => (
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
                                  className={`p-3 rounded-lg border transition-all text-left ${
                                    (formData.categorySpecific as any)?.[question.id] === option.value
                                      ? 'border-wave-500 bg-wave-600/20'
                                      : 'border-wave-700/30 hover:border-wave-600/50'
                                  }`}
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
                                  className={`p-3 rounded-lg border transition-all ${
                                    (formData.categorySpecific as any)?.[question.id] === option.value
                                      ? 'border-wave-500 bg-wave-600/20'
                                      : 'border-wave-700/30 hover:border-wave-600/50'
                                  }`}
                                >
                                  <div className="font-medium text-wave-200 text-sm">{option.label}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-wave-400">Please select a category first</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Context & Prediction */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageSquareIcon className="w-5 h-5 text-wave-400" />
                  Context & Predictions (Optional)
                </h3>

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

                <div>
                  <label className="block text-wave-300 text-sm mb-2">
                    Wave Score - How cool is this trend?
                  </label>
                  <div className="bg-wave-800/30 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-wave-500">Not cool</span>
                      <span className="text-2xl font-bold text-wave-300">{formData.waveScore || 50}</span>
                      <span className="text-xs text-wave-500">Extremely cool</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.waveScore || 50}
                      onChange={(e) => setFormData(prev => ({ ...prev, waveScore: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Review Your Intelligence Report</h3>
                
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-wave-800/30 rounded-lg p-4">
                    <h4 className="text-wave-300 font-medium mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-wave-500">URL:</span>
                        <span className="text-wave-200 truncate max-w-xs">{formData.url}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-wave-500">Title:</span>
                        <span className="text-wave-200">{formData.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-wave-500">Platform:</span>
                        <span className="text-wave-200">{formData.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-wave-500">Category:</span>
                        <span className="text-wave-200">
                          {CATEGORIES.find(c => c.id === formData.category)?.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Intelligence Summary */}
                  {formData.trendDynamics && (
                    <div className="bg-wave-800/30 rounded-lg p-4">
                      <h4 className="text-wave-300 font-medium mb-2">Intelligence Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-wave-500">Velocity:</span>
                          <span className="text-wave-200">{formData.trendDynamics.velocity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-wave-500">Size:</span>
                          <span className="text-wave-200">{formData.trendDynamics.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-wave-500">AI Origin:</span>
                          <span className="text-wave-200">{formData.aiDetection?.origin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-wave-500">Sentiment:</span>
                          <span className="text-wave-200">{formData.audienceIntelligence?.sentiment}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wave Score */}
                  <div className="bg-gradient-to-r from-wave-600/20 to-wave-500/20 rounded-lg p-4 text-center">
                    <p className="text-wave-400 text-sm mb-1">Wave Score</p>
                    <p className="text-4xl font-bold text-wave-200">{formData.waveScore || 50}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="p-6 border-t border-wave-700/50 bg-wave-800/50">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={step === 1 ? onClose : prevStep}
              className="px-6 py-2 rounded-xl bg-wave-700/50 hover:bg-wave-600/50 transition-all text-wave-200"
            >
              {step === 1 ? 'Cancel' : 'Previous'}
            </button>
            
            {step < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-wave-500 to-wave-600 hover:from-wave-600 hover:to-wave-700 transition-all text-white font-medium flex items-center gap-2"
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <SendIcon className="w-4 h-4" />
                    Submit Intelligence
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
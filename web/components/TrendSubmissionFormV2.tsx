'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { MetadataExtractor } from '@/lib/metadataExtractor';
import { 
  Link as LinkIcon,
  X as XIcon,
  Loader as LoaderIcon,
  ChevronRight as ChevronRightIcon,
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  Zap as ZapIcon,
  Search as SearchIcon,
  Calendar as CalendarIcon,
  Globe as GlobeIcon,
  Timer as TimerIcon,
  MessageSquare as MessageSquareIcon,
  Plus as PlusIcon,
  Check as CheckIcon
} from 'lucide-react';

// Lifecycle stages
const LIFECYCLE_STAGES = [
  { value: 'just_starting', label: 'Just Starting', description: 'First 24-48 hours' },
  { value: 'picking_up', label: 'Picking Up', description: 'Gaining momentum' },
  { value: 'going_viral', label: 'Going Viral', description: 'Peak growth phase' },
  { value: 'declining', label: 'Declining', description: 'Past peak, slowing down' },
  { value: 'dead', label: 'Dead', description: 'No longer trending' }
];

// Trend types
const TREND_TYPES = [
  { value: 'visual', label: 'Visual', icon: '👁️', description: 'Visual effects, filters, aesthetics' },
  { value: 'audio', label: 'Audio', icon: '🎵', description: 'Songs, sounds, audio trends' },
  { value: 'concept', label: 'Concept', icon: '💡', description: 'Ideas, challenges, behaviors' },
  { value: 'format', label: 'Format', icon: '📱', description: 'Content formats, templates' },
  { value: 'product', label: 'Product', icon: '🛍️', description: 'Products, brands, items' },
  { value: 'finance_crypto', label: 'Finance/Crypto', icon: '💰', description: 'Financial, crypto, stocks' },
  { value: 'gaming', label: 'Gaming', icon: '🎮', description: 'Games, gaming content' }
];

// Platforms for "next platform" prediction
const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'threads', label: 'Threads' }
];

// Lifespan options
const LIFESPAN_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' }
];

interface TrendSubmissionData {
  // Required fields
  url: string;
  lifecycleStage: string;
  trendType: string;
  
  // Auto-extracted
  title?: string;
  thumbnailUrl?: string;
  platform?: string;
  
  // Optional fields for bonus XP
  isEvolution?: boolean;
  parentTrends?: string[];
  peakDate?: string;
  nextPlatform?: string;
  lifespanValue?: number;
  lifespanUnit?: string;
  contextNote?: string;
  
  // Metadata
  creatorHandle?: string;
  viewsCount?: number;
  likesCount?: number;
}

interface Props {
  onClose: () => void;
  onSubmit: (data: TrendSubmissionData) => Promise<void>;
}

export default function TrendSubmissionFormV2({ onClose, onSubmit }: Props) {
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<Partial<TrendSubmissionData>>({});
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchingTrends, setSearchingTrends] = useState(false);
  const [trendSearchQuery, setTrendSearchQuery] = useState('');
  const [availableTrends, setAvailableTrends] = useState<Array<{id: string, title: string}>>([]);
  const [selectedParentTrends, setSelectedParentTrends] = useState<string[]>([]);
  const [showEvolutionSearch, setShowEvolutionSearch] = useState(false);
  const [currentXP, setCurrentXP] = useState(0);
  
  // Calculate potential XP based on filled fields
  useEffect(() => {
    let xp = 0;
    
    // Base submission
    if (formData.url && formData.lifecycleStage && formData.trendType) {
      xp += 25; // Base XP
    }
    
    // Evolution tracking
    if (formData.isEvolution) {
      xp += 50;
      if (selectedParentTrends.length > 0) {
        xp += Math.min(selectedParentTrends.length * 100, 500); // 100-500 XP for chains
      }
    }
    
    // Prediction section
    if (formData.peakDate || formData.nextPlatform || formData.lifespanValue) {
      xp += 20;
    }
    
    // Context note
    if (formData.contextNote && formData.contextNote.length > 10) {
      xp += 5;
    }
    
    setCurrentXP(xp);
  }, [formData, selectedParentTrends]);
  
  // Auto-detect platform from URL
  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    return 'unknown';
  };
  
  // Extract metadata from URL
  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, url }));
    
    if (url && url.includes('://')) {
      setExtracting(true);
      try {
        const platform = detectPlatform(url);
        
        // Use MetadataExtractor to fetch real data
        const metadata = await MetadataExtractor.extractFromUrl(url);
        
        setFormData(prev => ({
          ...prev,
          platform,
          title: metadata.title || `Trend from ${platform}`,
          thumbnailUrl: metadata.thumbnail_url,
          creatorHandle: metadata.creator_handle,
          viewsCount: metadata.views_count,
          likesCount: metadata.likes_count
        }));
        
        showSuccess('Metadata extracted', 'Preview loaded successfully');
      } catch (error) {
        console.error('Extraction error:', error);
        // Set basic info even if extraction fails
        setFormData(prev => ({
          ...prev,
          platform: detectPlatform(url),
          title: 'Unable to extract title'
        }));
      } finally {
        setExtracting(false);
      }
    }
  };
  
  // Search for existing trends (for evolution tracking)
  const searchTrends = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAvailableTrends([]);
      return;
    }
    
    setSearchingTrends(true);
    try {
      // In production, this would search the database
      // For now, return mock data
      const mockTrends = [
        { id: '1', title: 'Stanley Cup craze' },
        { id: '2', title: 'Girl dinner trend' },
        { id: '3', title: 'Roman Empire thoughts' },
        { id: '4', title: 'Grimace shake' },
        { id: '5', title: 'Wednesday dance' }
      ].filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
      
      setAvailableTrends(mockTrends);
    } finally {
      setSearchingTrends(false);
    }
  }, []);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (trendSearchQuery) {
        searchTrends(trendSearchQuery);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [trendSearchQuery, searchTrends]);
  
  // Toggle parent trend selection
  const toggleParentTrend = (trendId: string) => {
    setSelectedParentTrends(prev => 
      prev.includes(trendId) 
        ? prev.filter(id => id !== trendId)
        : [...prev, trendId]
    );
  };
  
  // Validate form
  const isFormValid = () => {
    return formData.url && 
           formData.lifecycleStage && 
           formData.trendType;
  };
  
  // Handle submission
  const handleSubmit = async () => {
    if (!isFormValid()) {
      showError('Missing required fields', 'Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        parentTrends: selectedParentTrends
      } as TrendSubmissionData);
      
      showSuccess(`Trend submitted! +${currentXP} XP`, 'Your trend is being processed');
      onClose();
    } catch (error) {
      showError('Submission failed', 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-wave-900 rounded-2xl shadow-2xl border border-wave-700"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-wave-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Submit New Trend</h2>
              <p className="text-sm text-wave-400 mt-1">
                Potential earnings: <span className="text-wave-300 font-semibold">+{currentXP} XP</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-wave-800 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-wave-400" />
            </button>
          </div>
          
          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* URL Input Section */}
            <div>
              <label className="block text-sm font-medium text-wave-200 mb-2">
                URL/Link <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wave-500" />
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Paste TikTok, Twitter/X, YouTube, Reddit, Instagram URL..."
                  className="w-full pl-10 pr-4 py-3 bg-wave-800 border border-wave-700 rounded-lg text-white placeholder-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500"
                />
                {extracting && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoaderIcon className="w-5 h-5 text-wave-400 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-wave-500 mt-1">
                Supports: TikTok, Twitter/X, YouTube, Reddit, Instagram
              </p>
            </div>
            
            {/* Preview Card */}
            {formData.title && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-wave-800/50 rounded-lg p-4 border border-wave-700"
              >
                <div className="flex gap-4">
                  {formData.thumbnailUrl && (
                    <img 
                      src={formData.thumbnailUrl} 
                      alt="Trend preview"
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium">{formData.title}</p>
                    <p className="text-sm text-wave-400 mt-1">
                      {formData.platform && (
                        <span className="capitalize">{formData.platform}</span>
                      )}
                      {formData.creatorHandle && (
                        <span> • @{formData.creatorHandle}</span>
                      )}
                    </p>
                    {(formData.viewsCount || formData.likesCount) && (
                      <p className="text-xs text-wave-500 mt-2">
                        {formData.viewsCount && `${formData.viewsCount.toLocaleString()} views`}
                        {formData.viewsCount && formData.likesCount && ' • '}
                        {formData.likesCount && `${formData.likesCount.toLocaleString()} likes`}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Lifecycle Stage */}
            <div>
              <label className="block text-sm font-medium text-wave-200 mb-2">
                Lifecycle Stage <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LIFECYCLE_STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => setFormData(prev => ({ ...prev, lifecycleStage: stage.value }))}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      formData.lifecycleStage === stage.value
                        ? 'bg-wave-700 border-wave-500 text-white'
                        : 'bg-wave-800/50 border-wave-700 text-wave-300 hover:bg-wave-800'
                    }`}
                  >
                    <p className="font-medium text-sm">{stage.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{stage.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Trend Type */}
            <div>
              <label className="block text-sm font-medium text-wave-200 mb-2">
                Trend Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TREND_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData(prev => ({ ...prev, trendType: type.value }))}
                    className={`p-3 rounded-lg border transition-all ${
                      formData.trendType === type.value
                        ? 'bg-wave-700 border-wave-500 text-white'
                        : 'bg-wave-800/50 border-wave-700 text-wave-300 hover:bg-wave-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{type.icon}</span>
                      <div className="text-left">
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs opacity-70">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Optional Fields Section */}
            <div className="border-t border-wave-800 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Optional Fields <span className="text-sm font-normal text-wave-400">(Bonus XP)</span>
              </h3>
              
              {/* Evolution/Mutation Tracking */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => {
                      setFormData(prev => ({ ...prev, isEvolution: !prev.isEvolution }));
                      setShowEvolutionSearch(!formData.isEvolution);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                      formData.isEvolution
                        ? 'bg-wave-700 border-wave-500 text-white'
                        : 'bg-wave-800/50 border-wave-700 text-wave-400 hover:bg-wave-800'
                    }`}
                  >
                    {formData.isEvolution ? <CheckIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                    Is this related to an existing trend?
                  </button>
                  <span className="text-sm text-wave-500">+50-500 XP</span>
                </div>
                
                {showEvolutionSearch && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="ml-8 space-y-3"
                  >
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wave-500" />
                      <input
                        type="text"
                        value={trendSearchQuery}
                        onChange={(e) => setTrendSearchQuery(e.target.value)}
                        placeholder="Search for parent trends..."
                        className="w-full pl-10 pr-4 py-2 bg-wave-800 border border-wave-700 rounded-lg text-white placeholder-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500 text-sm"
                      />
                      {searchingTrends && (
                        <LoaderIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wave-400 animate-spin" />
                      )}
                    </div>
                    
                    {availableTrends.length > 0 && (
                      <div className="bg-wave-800/50 rounded-lg p-2 space-y-1">
                        {availableTrends.map((trend) => (
                          <button
                            key={trend.id}
                            onClick={() => toggleParentTrend(trend.id)}
                            className={`w-full text-left px-3 py-2 rounded transition-all text-sm ${
                              selectedParentTrends.includes(trend.id)
                                ? 'bg-wave-700 text-white'
                                : 'hover:bg-wave-700/50 text-wave-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{trend.title}</span>
                              {selectedParentTrends.includes(trend.id) && (
                                <CheckIcon className="w-4 h-4 text-wave-400" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {selectedParentTrends.length > 0 && (
                      <p className="text-xs text-wave-400">
                        {selectedParentTrends.length} parent trend(s) selected
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
              
              {/* Prediction Section */}
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-wave-200">
                  Predictions <span className="text-wave-500">+20 XP</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Peak Date */}
                  <div>
                    <label className="block text-xs text-wave-400 mb-1">Will peak by...</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wave-500" />
                      <input
                        type="date"
                        value={formData.peakDate || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, peakDate: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 bg-wave-800 border border-wave-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wave-500 text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Next Platform */}
                  <div>
                    <label className="block text-xs text-wave-400 mb-1">Will spread to...</label>
                    <div className="relative">
                      <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wave-500" />
                      <select
                        value={formData.nextPlatform || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, nextPlatform: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 bg-wave-800 border border-wave-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wave-500 text-sm appearance-none"
                      >
                        <option value="">Select platform</option>
                        {PLATFORMS.map(platform => (
                          <option key={platform.value} value={platform.value}>
                            {platform.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Lifespan */}
                  <div>
                    <label className="block text-xs text-wave-400 mb-1">Lifespan</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={formData.lifespanValue || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, lifespanValue: parseInt(e.target.value) }))}
                        placeholder="5"
                        className="w-20 px-3 py-2 bg-wave-800 border border-wave-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wave-500 text-sm"
                      />
                      <select
                        value={formData.lifespanUnit || 'weeks'}
                        onChange={(e) => setFormData(prev => ({ ...prev, lifespanUnit: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-wave-800 border border-wave-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wave-500 text-sm appearance-none"
                      >
                        {LIFESPAN_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Context Note */}
              <div>
                <label className="block text-sm font-medium text-wave-200 mb-2">
                  Context Note <span className="text-wave-500">+5 XP</span>
                </label>
                <div className="relative">
                  <MessageSquareIcon className="absolute left-3 top-3 w-4 h-4 text-wave-500" />
                  <textarea
                    value={formData.contextNote || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, contextNote: e.target.value.slice(0, 280) }))}
                    placeholder="Add insight about this trend..."
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-wave-800 border border-wave-700 rounded-lg text-white placeholder-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500 text-sm resize-none"
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-wave-500">
                    {formData.contextNote?.length || 0}/280
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-wave-800 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-wave-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid() || submitting}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isFormValid() && !submitting
                  ? 'bg-gradient-to-r from-wave-500 to-wave-600 text-white hover:from-wave-400 hover:to-wave-500'
                  : 'bg-wave-800 text-wave-500 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <TrendingUpIcon className="w-4 h-4" />
                  Submit Trend
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
// import { TrendUmbrellaService } from '@/lib/trendUmbrellaService'; // Not needed
import { OCRApiService as OCRService } from '@/lib/ocrApiService';
import { 
  Upload as UploadIcon,
  Image as ImageIcon,
  X as XIcon,
  Check as CheckIcon,
  Loader as LoaderIcon,
  Camera as CameraIcon,
  Info as InfoIcon,
  Monitor as MonitorIcon,
  Command as CommandIcon,
  DollarSign as DollarSignIcon
} from 'lucide-react';

interface TrendScreenshotData {
  screenshot: File | null;
  platform: string;
  trendName: string;
  hashtags: string[];
  parsedData?: {
    handle?: string;
    likes?: number;
    caption?: string;
  };
}

interface TrendScreenshotUploadProps {
  onClose: () => void;
  onSubmit?: () => void;
}

const platforms = [
  { id: 'tiktok', label: 'TikTok', color: 'bg-black' },
  { id: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' }
];

export default function TrendScreenshotUpload({ onClose, onSubmit }: TrendScreenshotUploadProps) {
  const { user, updateUserEarnings } = useAuth();
  const [formData, setFormData] = useState<TrendScreenshotData>({
    screenshot: null,
    platform: '',
    trendName: '',
    hashtags: [],
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);
  const [showTips, setShowTips] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file selection
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setFormData(prev => ({ ...prev, screenshot: file }));
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process OCR
    setProcessingOCR(true);
    try {
      const { extractedData, platform } = await OCRService.analyzeScreenshot(file);
      
      setFormData(prev => ({
        ...prev,
        platform: platform !== 'unknown' ? platform : prev.platform,
        parsedData: {
          handle: extractedData.handle,
          likes: extractedData.likes,
          caption: extractedData.caption
        },
        hashtags: extractedData.hashtags || prev.hashtags
      }));
    } catch (error) {
      console.error('OCR processing error:', error);
    } finally {
      setProcessingOCR(false);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, screenshot: null, parsedData: undefined }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.screenshot) {
      errors.screenshot = 'Screenshot is required';
    }
    
    if (!formData.platform) {
      errors.platform = 'Please select a platform';
    }
    
    if (!formData.trendName || formData.trendName.trim().length < 3) {
      errors.trendName = 'Trend name must be at least 3 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }
    
    setLoading(true);

    try {
      // Upload screenshot
      const fileExt = formData.screenshot!.name.split('.').pop();
      const fileName = `screenshots/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trend-images')
        .upload(fileName, formData.screenshot!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('trend-images')
        .getPublicUrl(fileName);

      // Trend umbrella feature removed
      const umbrellaId = null;

      // Save trend to database
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: user?.id,
          category: 'screenshot_submission',
          description: `${formData.trendName}\n\nSubmitted via screenshot upload`,
          screenshot_url: publicUrl,
          evidence: {
            platform: formData.platform,
            submitted_by: user?.username || user?.email,
            ocr_data: formData.parsedData
          },
          virality_prediction: 5,
          status: 'submitted',
          // Parsed metadata
          creator_handle: formData.parsedData?.handle || null,
          post_caption: formData.parsedData?.caption || null,
          likes_count: formData.parsedData?.likes || 0,
          hashtags: formData.hashtags,
          thumbnail_url: publicUrl,
          posted_at: new Date().toISOString(),
          // trend_umbrella_id removed
        })
        .select()
        .single();

      if (error) throw error;

      // Update earnings
      const earnedAmount = 0.25;
      updateUserEarnings(earnedAmount);
      
      const { formatCurrency } = await import('@/lib/SUSTAINABLE_EARNINGS');
      setSuccess(`Trend submitted! You earned ${formatCurrency(earnedAmount)}`);
      
      // Clear form and close after success
      setTimeout(() => {
        onSubmit?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit trend. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.screenshot) {
      setValidationErrors({ screenshot: 'Please upload a screenshot' });
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="wave-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Trend Screenshot</h2>
            <p className="text-wave-400 text-sm">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-wave-800/50 transition-all"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-wave-800/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-wave-500 to-wave-600"
              initial={{ width: '33%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Screenshot Upload */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Screenshot Tips */}
              <div className="bg-wave-800/30 rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => setShowTips(!showTips)}
                  className="flex items-center gap-2 text-wave-300 hover:text-wave-200 transition-colors"
                >
                  <InfoIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">How to take a screenshot</span>
                </button>
                
                <AnimatePresence>
                  {showTips && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 space-y-3 overflow-hidden"
                    >
                      <div className="flex items-start gap-3">
                        <MonitorIcon className="w-5 h-5 text-wave-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-wave-200">Mac</p>
                          <p className="text-xs text-wave-400">
                            <CommandIcon className="w-3 h-3 inline" /> + Shift + 4 (select area)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MonitorIcon className="w-5 h-5 text-wave-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-wave-200">Windows</p>
                          <p className="text-xs text-wave-400">Win + Shift + S (select area)</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Upload Area */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  <CameraIcon className="w-4 h-4 inline mr-2" />
                  Screenshot * {validationErrors.screenshot && <span className="text-red-400 text-sm">({validationErrors.screenshot})</span>}
                </label>
                
                {!imagePreview ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${dragActive 
                        ? 'border-wave-400 bg-wave-600/20' 
                        : 'border-wave-600/50 hover:border-wave-500/70'
                      }
                    `}
                  >
                    <UploadIcon className="w-12 h-12 text-wave-400 mx-auto mb-3" />
                    <p className="text-wave-300 mb-2 font-medium">
                      Drop your screenshot here
                    </p>
                    <p className="text-sm text-wave-500">or click to browse</p>
                    <p className="text-xs text-wave-600 mt-2">PNG, JPG up to 10MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Screenshot preview"
                      className="w-full max-h-96 object-contain rounded-xl bg-wave-800/50"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-all"
                    >
                      <XIcon className="w-4 h-4 text-white" />
                    </button>
                    
                    {/* OCR Results */}
                    {processingOCR && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <LoaderIcon className="w-8 h-8 text-wave-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-wave-300">Analyzing screenshot...</p>
                        </div>
                      </div>
                    )}
                    
                    {formData.parsedData && !processingOCR && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-wave-600/20 border border-wave-600/40 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckIcon className="w-4 h-4 text-green-400" />
                          <p className="text-sm font-medium text-wave-200">OCR Results</p>
                        </div>
                        <div className="space-y-1 text-xs text-wave-300">
                          {formData.parsedData.handle && (
                            <p>Handle: <span className="text-wave-200">{formData.parsedData.handle}</span></p>
                          )}
                          {formData.parsedData.likes && (
                            <p>Likes: <span className="text-wave-200">{formData.parsedData.likes.toLocaleString()}</span></p>
                          )}
                          {formData.parsedData.caption && (
                            <p>Caption: <span className="text-wave-200 line-clamp-1">{formData.parsedData.caption}</span></p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Platform & Trend Info */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Platform Selection */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  Platform * {validationErrors.platform && <span className="text-red-400 text-sm">({validationErrors.platform})</span>}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, platform: platform.id }))}
                      className={`
                        p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2
                        ${formData.platform === platform.id
                          ? 'border-wave-500 bg-wave-600/20'
                          : 'border-wave-700/30 hover:border-wave-600/50'
                        }
                      `}
                    >
                      <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                      <span className="font-medium">{platform.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trend Name */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  Trend Name * {validationErrors.trendName && <span className="text-red-400 text-sm">({validationErrors.trendName})</span>}
                </label>
                <input
                  type="text"
                  value={formData.trendName}
                  onChange={(e) => setFormData(prev => ({ ...prev, trendName: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white placeholder-wave-500 focus:outline-none focus:ring-2 ${
                    validationErrors.trendName 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-wave-700/30 focus:border-wave-500 focus:ring-wave-500/20'
                  }`}
                  placeholder="e.g. 'Winter Arc Challenge', 'Get Ready With Me'"
                  required
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  Tags (Optional)
                </label>
                <select
                  multiple
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, hashtags: selected }));
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white focus:border-wave-500 focus:outline-none"
                  size={4}
                >
                  <option value="trending">trending</option>
                  <option value="viral">viral</option>
                  <option value="fyp">fyp</option>
                  <option value="challenge">challenge</option>
                  <option value="dance">dance</option>
                  <option value="comedy">comedy</option>
                  <option value="fashion">fashion</option>
                  <option value="food">food</option>
                </select>
                <p className="text-xs text-wave-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-wave-800/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Confirm & Submit</h3>
                
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Screenshot to submit"
                    className="w-full max-h-48 object-contain rounded-lg mb-4 bg-wave-800/50"
                  />
                )}
                
                <div className="space-y-3">
                  <div>
                    <span className="text-wave-400 text-sm">Platform:</span>
                    <p className="text-wave-200 capitalize">{formData.platform}</p>
                  </div>
                  
                  <div>
                    <span className="text-wave-400 text-sm">Trend Name:</span>
                    <p className="text-wave-200">{formData.trendName}</p>
                  </div>
                  
                  {formData.hashtags.length > 0 && (
                    <div>
                      <span className="text-wave-400 text-sm">Tags:</span>
                      <p className="text-wave-200">
                        {formData.hashtags.map(tag => `#${tag}`).join(' ')}
                      </p>
                    </div>
                  )}
                  
                  {formData.parsedData && (
                    <div className="pt-3 border-t border-wave-700/30">
                      <span className="text-wave-400 text-sm">Parsed Data:</span>
                      <div className="mt-1 space-y-1 text-sm">
                        {formData.parsedData.handle && (
                          <p className="text-wave-300">Creator: {formData.parsedData.handle}</p>
                        )}
                        {formData.parsedData.likes && (
                          <p className="text-wave-300">Likes: {formData.parsedData.likes.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSignIcon className="w-5 h-5 text-green-400" />
                    <p className="text-green-400 font-medium">You'll earn $0.25 for this submission</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error/Success Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
            
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={step === 1 ? onClose : prevStep}
              className="px-6 py-2 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all"
            >
              {step === 1 ? 'Cancel' : 'Previous'}
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-wave-500 to-wave-600 hover:from-wave-400 hover:to-wave-500 transition-all"
              >
                Next
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
                  <CheckIcon className="w-4 h-4" />
                )}
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { TrendIntelligenceService } from '@/services/TrendIntelligenceService';
import { 
  EnhancedTrendIntelligence,
  ENHANCED_QUESTIONS,
  calculateValueScore,
  getQuestionsForPhase,
  getValueTier,
  VALUE_TIERS
} from '@/lib/enhancedTrendIntelligence';
import { TrendIntelligenceData } from '@/lib/trendIntelligenceConfig';

interface Props {
  initialData: Partial<TrendIntelligenceData>;
  onClose: () => void;
  onSubmit?: (data: TrendIntelligenceData) => Promise<void>;
}

export default function TrendIntelligenceFormEnhanced({ 
  initialData, 
  onClose,
  onSubmit 
}: Props) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // Form state
  const [currentPhase, setCurrentPhase] = useState<'timing' | 'intent' | 'specific'>('timing');
  const [responses, setResponses] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Value tracking
  const [valueScore, setValueScore] = useState({
    overall: 0,
    pac: 0,
    hedgeFund: 0,
    brand: 0,
    creator: 0
  });
  const [valueTier, setValueTier] = useState(VALUE_TIERS.low);
  
  // Update value score when responses change
  useEffect(() => {
    const enhancedData: Partial<EnhancedTrendIntelligence> = {
      ...initialData,
      timingIntelligence: responses.discovery_stage ? {
        discoveryStage: responses.discovery_stage,
        exposureFrequency: responses.exposure_frequency || 'first_time',
        hoursFromStart: null
      } : undefined,
      commercialIntelligence: responses.purchase_intent ? {
        purchaseIntent: responses.purchase_intent,
        priceExpectation: responses.price_expectation || 'under_25',
        brandsInvolved: responses.brands_involved ? responses.brands_involved.split(',').map((b: string) => b.trim()) : []
      } : undefined,
      politicalIntelligence: responses.opinion_impact ? {
        opinionImpact: responses.opinion_impact,
        actionLikelihood: responses.action_likelihood || [],
        demographicReach: []
      } : undefined,
      marketIntelligence: responses.market_signal ? {
        marketSignal: responses.market_signal,
        investmentAction: responses.investment_action || 'research',
        tickersAffected: responses.tickers_affected ? responses.tickers_affected.split(',').map((t: string) => t.trim()) : []
      } : undefined
    };
    
    const scores = calculateValueScore(enhancedData, initialData.category || 'general');
    setValueScore(scores);
    setValueTier(getValueTier(scores.overall));
  }, [responses, initialData.category]);
  
  // Get questions for current phase
  const questions = getQuestionsForPhase(currentPhase, initialData.category || 'general', responses);
  
  // Handle response
  const handleResponse = useCallback((questionId: string, value: any) => {
    setResponses((prev: any) => ({ ...prev, [questionId]: value }));
  }, []);
  
  // Handle multiselect
  const handleMultiSelect = useCallback((questionId: string, value: string) => {
    setResponses((prev: any) => {
      const current = prev[questionId] || [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: updated };
    });
  }, []);
  
  // Navigate phases
  const nextPhase = () => {
    const phases: ('timing' | 'intent' | 'specific')[] = ['timing', 'intent', 'specific'];
    const currentIndex = phases.indexOf(currentPhase);
    
    if (currentIndex < phases.length - 1) {
      setCurrentPhase(phases[currentIndex + 1]);
    } else {
      handleSubmit();
    }
  };
  
  const prevPhase = () => {
    const phases: ('timing' | 'intent' | 'specific')[] = ['timing', 'intent', 'specific'];
    const currentIndex = phases.indexOf(currentPhase);
    
    if (currentIndex > 0) {
      setCurrentPhase(phases[currentIndex - 1]);
    }
  };
  
  // Submit enhanced intelligence
  const handleSubmit = async () => {
    if (!user?.id) {
      showError('Please log in to submit');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Merge enhanced responses with initial data
      const enhancedData: TrendIntelligenceData = {
        ...initialData as TrendIntelligenceData,
        
        // Add enhanced category-specific data (using type assertion for flexibility)
        categorySpecific: {
          ...initialData.categorySpecific,
          // Timing intelligence
          discovery_stage: responses.discovery_stage,
          exposure_frequency: responses.exposure_frequency,
          // Commercial intelligence
          purchase_intent: responses.purchase_intent,
          price_expectation: responses.price_expectation,
          brands_involved: responses.brands_involved,
          // Political intelligence
          opinion_impact: responses.opinion_impact,
          action_likelihood: responses.action_likelihood,
          // Market intelligence
          market_signal: responses.market_signal,
          investment_action: responses.investment_action,
          tickers_affected: responses.tickers_affected,
          // Creator intelligence
          content_angle: responses.content_angle,
          brand_authenticity: responses.brand_authenticity,
          // Value scores
          value_score_overall: valueScore.overall,
          value_score_pac: valueScore.pac,
          value_score_hedge: valueScore.hedgeFund,
          value_score_brand: valueScore.brand,
          value_score_creator: valueScore.creator
        } as any
      };
      
      // Use custom onSubmit if provided, otherwise use default service
      if (onSubmit) {
        await onSubmit(enhancedData);
      } else {
        const result = await TrendIntelligenceService.submitTrendIntelligence(user.id, enhancedData);
        
        if (result.success) {
          // Show reward based on value tier
          showSuccess(
            `${valueTier.label} Captured!`,
            `Earned ${valueTier.reward} • Value Score: ${valueScore.overall}/100`
          );
          
          setTimeout(onClose, 2000);
        } else {
          showError('Submission failed', result.error || 'Please try again');
        }
      }
    } catch (error) {
      console.error('Error submitting enhanced intelligence:', error);
      showError('Error', 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Check if phase is complete
  const isPhaseComplete = () => {
    const requiredQuestions = questions.filter(q => q.required !== false);
    return requiredQuestions.every(q => responses[q.id] !== undefined);
  };
  
  // Get phase progress
  const getPhaseProgress = () => {
    const phases = ['timing', 'intent', 'specific'];
    const currentIndex = phases.indexOf(currentPhase);
    return ((currentIndex + 1) / phases.length) * 100;
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-wave-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header with value score */}
        <div className="p-6 border-b border-wave-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Enhanced Intelligence</h2>
              <p className="text-wave-400 text-sm mt-1">
                {currentPhase === 'timing' && 'Timing is everything'}
                {currentPhase === 'intent' && 'Understanding intent'}
                {currentPhase === 'specific' && 'Category insights'}
              </p>
            </div>
            
            {/* Value score display */}
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: valueTier.color }}>
                {valueScore.overall}
              </div>
              <div className="text-xs text-wave-400">Value Score</div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-wave-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-wave-400" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-wave-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-wave-500 to-wave-400"
              initial={{ width: '0%' }}
              animate={{ width: `${getPhaseProgress()}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Value indicators */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-blue-500 rounded-full" 
                     style={{ opacity: valueScore.pac / 100 }} />
                <span className="text-wave-500">PAC</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-green-500 rounded-full"
                     style={{ opacity: valueScore.hedgeFund / 100 }} />
                <span className="text-wave-500">Hedge</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-purple-500 rounded-full"
                     style={{ opacity: valueScore.brand / 100 }} />
                <span className="text-wave-500">Brand</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-yellow-500 rounded-full"
                     style={{ opacity: valueScore.creator / 100 }} />
                <span className="text-wave-500">Creator</span>
              </div>
            </div>
            
            {valueTier.threshold >= 70 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-wave-400"
              >
                <AlertCircle className="w-3 h-3" />
                <span>{valueTier.label}</span>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Questions */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {questions.map((question) => (
                <div key={question.id} className="space-y-3">
                  <label className="block text-wave-200 font-medium">
                    {question.label}
                    {question.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  
                  {/* Select options */}
                  {question.options && question.type !== 'multiselect' && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {question.options.map((option: any) => (
                        <button
                          key={option.value}
                          onClick={() => handleResponse(question.id, option.value)}
                          className={`
                            p-3 rounded-xl border-2 text-left transition-all
                            ${responses[question.id] === option.value
                              ? 'border-wave-500 bg-wave-800/50'
                              : 'border-wave-700 hover:border-wave-600'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-wave-200 text-sm">{option.label}</span>
                            {option.score && (
                              <span className="text-xs text-wave-500">+{option.score}</span>
                            )}
                            {option.signal && (
                              <span className="text-xs text-wave-400 bg-wave-800 px-2 py-0.5 rounded">
                                {option.signal}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Multiselect options */}
                  {question.type === 'multiselect' && question.options && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {question.options.map((option: any) => {
                        const isSelected = responses[question.id]?.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleMultiSelect(question.id, option.value)}
                            className={`
                              p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2
                              ${isSelected
                                ? 'border-wave-500 bg-wave-800/50'
                                : 'border-wave-700 hover:border-wave-600'
                              }
                            `}
                          >
                            <div className={`
                              w-4 h-4 rounded border-2 flex items-center justify-center
                              ${isSelected ? 'border-wave-500 bg-wave-500' : 'border-wave-600'}
                            `}>
                              {isSelected && <Check className="w-3 h-3 text-black" />}
                            </div>
                            <span className="text-wave-200 text-sm">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Text input */}
                  {question.type === 'text' && (
                    <input
                      type="text"
                      placeholder={question.placeholder}
                      value={responses[question.id] || ''}
                      onChange={(e) => handleResponse(question.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Footer actions */}
        <div className="p-6 border-t border-wave-800 flex items-center justify-between">
          <button
            onClick={currentPhase === 'timing' ? onClose : prevPhase}
            className="px-6 py-2 rounded-xl bg-wave-800 hover:bg-wave-700 transition-colors text-wave-300"
          >
            {currentPhase === 'timing' ? 'Cancel' : 'Back'}
          </button>
          
          <button
            onClick={nextPhase}
            disabled={!isPhaseComplete() || submitting}
            className={`
              px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2
              ${isPhaseComplete()
                ? 'bg-gradient-to-r from-wave-500 to-wave-400 text-black hover:from-wave-400 hover:to-wave-300'
                : 'bg-wave-800 text-wave-500 cursor-not-allowed'
              }
            `}
          >
            {currentPhase === 'specific' ? (
              submitting ? 'Submitting...' : `Submit (${valueTier.reward})`
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
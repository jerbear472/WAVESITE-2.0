'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp as TrendingUpIcon,
  DollarSign as DollarSignIcon,
  Target as TargetIcon,
  Brain as BrainIcon,
  AlertTriangle as AlertIcon,
  Zap as ZapIcon,
  Users as UsersIcon,
  BarChart3 as ChartIcon,
  ShoppingCart as ShoppingIcon,
  Vote as VoteIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { 
  HighValueIntelligenceData,
  HIGH_VALUE_QUESTIONS,
  calculateIntelligenceValue,
  VALUE_INDICATORS,
  PoliticalIntel,
  FinanceIntel,
  BrandIntel,
  CreatorIntel
} from '@/lib/highValueIntelligenceConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  trendUrl: string;
  trendTitle: string;
  category: string;
  onComplete: (data: HighValueIntelligenceData) => void;
}

export default function EnhancedTrendIntelligenceForm({ 
  trendUrl, 
  trendTitle, 
  category, 
  onComplete 
}: Props) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [currentPhase, setCurrentPhase] = useState<'timing' | 'psychology' | 'market' | 'specific'>('timing');
  const [responses, setResponses] = useState<any>({});
  const [intelligenceValue, setIntelligenceValue] = useState(0);
  const [targetClient, setTargetClient] = useState<'pac' | 'hedge' | 'brand' | 'creator' | null>(null);
  
  // Real-time value calculation
  const [liveValueScore, setLiveValueScore] = useState({
    total: 0,
    pac: 0,
    hedge: 0,
    brand: 0,
    creator: 0
  });

  // Detect which client type would find this most valuable
  useEffect(() => {
    if (category === 'political' || category === 'social_cause') {
      setTargetClient('pac');
    } else if (category === 'finance') {
      setTargetClient('hedge');
    } else if (category === 'brand' || category === 'fashion') {
      setTargetClient('brand');
    } else if (category === 'meme' || category === 'music' || category === 'gaming') {
      setTargetClient('creator');
    }
  }, [category]);

  // Dynamic question selection based on responses
  const getRelevantQuestions = () => {
    const questions: any[] = [];
    
    // Phase 1: Timing questions (CRITICAL for all clients)
    if (currentPhase === 'timing') {
      questions.push({
        id: 'viral_stage',
        label: '🚨 CRITICAL: Viral Lifecycle Stage',
        description: 'Early detection = Higher value',
        type: 'select',
        options: [
          { value: 'never_seen', label: '👁️ Never seen before (HIGHEST VALUE)', points: 100 },
          { value: 'just_emerging', label: '🌱 Just starting to see it', points: 80 },
          { value: 'gaining_momentum', label: '📈 Gaining momentum', points: 60 },
          { value: 'everywhere', label: '🌊 It\'s everywhere now', points: 30 },
          { value: 'dying_out', label: '💀 Starting to die out', points: 10 }
        ]
      });
      
      questions.push({
        id: 'discovery_source',
        label: '🎯 Discovery Source',
        description: 'How trends spread matters',
        type: 'select',
        options: [
          { value: 'niche_community', label: '🔒 Niche community (before mainstream)', points: 90 },
          { value: 'influencer_early', label: '⭐ Influencer just posted', points: 70 },
          { value: 'algorithm_push', label: '🤖 Algorithm pushing it', points: 50 },
          { value: 'friend_share', label: '👥 Friends sharing', points: 40 },
          { value: 'news_media', label: '📰 News coverage', points: 20 }
        ]
      });
    }
    
    // Phase 2: Psychology questions (VALUE for targeting)
    if (currentPhase === 'psychology') {
      questions.push({
        id: 'emotional_response',
        label: '🧠 Your Emotional Response',
        description: 'Emotions drive viral spread',
        type: 'multiselect',
        options: [
          { value: 'anger', label: '😠 Angry/Outraged', signal: 'HIGH_ENGAGEMENT' },
          { value: 'fear', label: '😨 Fearful/Anxious', signal: 'URGENT_ACTION' },
          { value: 'joy', label: '😊 Happy/Excited', signal: 'POSITIVE_SHARE' },
          { value: 'disgust', label: '🤢 Disgusted', signal: 'CONTROVERSY' },
          { value: 'surprise', label: '😲 Surprised/Shocked', signal: 'VIRAL_POTENTIAL' },
          { value: 'sadness', label: '😢 Sad/Empathetic', signal: 'DONATION_DRIVER' }
        ]
      });
      
      questions.push({
        id: 'action_intent',
        label: '💰 Action You\'ll Take',
        description: 'Intent predicts monetization',
        type: 'multiselect',
        options: [
          { value: 'buy_now', label: '🛒 Buy immediately', value_signal: 'EXTREME' },
          { value: 'research', label: '🔍 Research more', value_signal: 'HIGH' },
          { value: 'share', label: '📤 Share with others', value_signal: 'MEDIUM' },
          { value: 'create_content', label: '🎥 Make content about it', value_signal: 'AMPLIFIER' },
          { value: 'invest', label: '📈 Consider investing', value_signal: 'FINANCIAL' },
          { value: 'donate', label: '💝 Donate/Support', value_signal: 'CAUSE' },
          { value: 'nothing', label: '🚫 Nothing', value_signal: 'LOW' }
        ]
      });
    }
    
    // Phase 3: Market Intelligence (CRITICAL for brands/hedge funds)
    if (currentPhase === 'market') {
      if (targetClient === 'hedge' || targetClient === 'brand') {
        questions.push({
          id: 'market_impact',
          label: '📊 Market Impact Assessment',
          description: 'How will markets react?',
          type: 'select',
          options: [
            { value: 'disruptive', label: '💥 Category disruption incoming', impact: 95 },
            { value: 'shift', label: '🔄 Major behavior shift', impact: 80 },
            { value: 'trend', label: '📈 Significant trend', impact: 60 },
            { value: 'fad', label: '⚡ Quick fad', impact: 40 },
            { value: 'nothing', label: '💤 No real impact', impact: 10 }
          ]
        });
        
        questions.push({
          id: 'competition',
          label: '🏁 Competitive Landscape',
          description: 'Who\'s already capitalizing?',
          type: 'text',
          placeholder: 'Name brands/companies you\'ve seen jumping on this...'
        });
      }
      
      if (targetClient === 'pac') {
        questions.push({
          id: 'political_lean',
          label: '🗳️ Political Implications',
          description: 'How does this affect politics?',
          type: 'select',
          options: [
            { value: 'mobilizes_left', label: '⬅️ Mobilizes progressives', impact: 'HIGH' },
            { value: 'mobilizes_right', label: '➡️ Mobilizes conservatives', impact: 'HIGH' },
            { value: 'divides', label: '⚔️ Divides both sides', impact: 'EXTREME' },
            { value: 'unifies', label: '🤝 Unifies across spectrum', impact: 'RARE' },
            { value: 'apolitical', label: '⭕ No political angle', impact: 'LOW' }
          ]
        });
        
        questions.push({
          id: 'demographic_reach',
          label: '👥 Who\'s Being Influenced?',
          description: 'Critical for voter targeting',
          type: 'multiselect',
          options: [
            { value: 'gen_z_voters', label: '🗳️ First-time voters (18-23)', importance: 'CRITICAL' },
            { value: 'swing_suburban', label: '🏘️ Suburban swing voters', importance: 'CRITICAL' },
            { value: 'minority_communities', label: '🌍 Minority communities', importance: 'HIGH' },
            { value: 'working_class', label: '👷 Working class', importance: 'HIGH' },
            { value: 'college_educated', label: '🎓 College educated', importance: 'MEDIUM' },
            { value: 'rural', label: '🌾 Rural voters', importance: 'MEDIUM' }
          ]
        });
      }
      
      if (targetClient === 'creator') {
        questions.push({
          id: 'content_angle',
          label: '🎬 Best Content Angle',
          description: 'How to capitalize as creator',
          type: 'select',
          options: [
            { value: 'first_mover', label: '🥇 Be first to explain/demo', opportunity: 95 },
            { value: 'contrarian', label: '🔄 Take contrarian view', opportunity: 80 },
            { value: 'deep_dive', label: '🔍 Deep dive analysis', opportunity: 70 },
            { value: 'comedy', label: '😂 Comedy/Parody angle', opportunity: 85 },
            { value: 'tutorial', label: '📚 How-to/Tutorial', opportunity: 75 }
          ]
        });
        
        questions.push({
          id: 'collaboration_potential',
          label: '🤝 Collaboration Opportunities',
          description: 'Who could you partner with?',
          type: 'text',
          placeholder: 'Creators/brands talking about this...'
        });
      }
    }
    
    // Phase 4: Category-Specific Deep Intelligence
    if (currentPhase === 'specific') {
      // Add killer questions based on category
      if (category === 'finance') {
        questions.push({
          id: 'ticker_impact',
          label: '📈 Stock/Crypto Impact',
          description: 'CRITICAL for hedge funds',
          type: 'text',
          placeholder: 'Tickers mentioned or affected (e.g., TSLA, BTC, GME)...'
        });
        
        questions.push({
          id: 'retail_sentiment',
          label: '💎🙌 Retail Investor Sentiment',
          type: 'select',
          options: [
            { value: 'euphoria', label: '🚀 Euphoria/FOMO', signal: 'SELL' },
            { value: 'accumulating', label: '💰 Quietly accumulating', signal: 'BUY' },
            { value: 'panic', label: '😱 Panic/Fear', signal: 'BUY' },
            { value: 'skeptical', label: '🤔 Skeptical/Waiting', signal: 'NEUTRAL' }
          ]
        });
      }
      
      if (category === 'brand' || category === 'fashion') {
        questions.push({
          id: 'purchase_timeline',
          label: '💳 Purchase Timeline',
          description: 'When will people buy?',
          type: 'select',
          options: [
            { value: 'buying_now', label: '🔥 Already buying', heat: 100 },
            { value: 'this_week', label: '📅 This week', heat: 80 },
            { value: 'this_month', label: '🗓️ This month', heat: 60 },
            { value: 'considering', label: '🤔 Still considering', heat: 40 },
            { value: 'just_browsing', label: '👀 Just browsing', heat: 20 }
          ]
        });
        
        questions.push({
          id: 'price_expectation',
          label: '💰 Price They\'ll Pay',
          type: 'select',
          options: [
            { value: 'premium', label: '💎 Premium (status symbol)', margin: 'HIGH' },
            { value: 'fair', label: '✅ Fair value', margin: 'MEDIUM' },
            { value: 'deal', label: '🏷️ Only on sale', margin: 'LOW' },
            { value: 'free', label: '🆓 Only if free', margin: 'NONE' }
          ]
        });
      }
    }
    
    return questions;
  };

  // Calculate real-time value as user responds
  const updateValueScore = (newResponses: any) => {
    // Simplified scoring for demo
    let baseScore = 50;
    
    // Timing bonus
    if (newResponses.viral_stage === 'never_seen') baseScore += 30;
    if (newResponses.viral_stage === 'just_emerging') baseScore += 20;
    
    // Action intent bonus
    if (newResponses.action_intent?.includes('buy_now')) baseScore += 25;
    if (newResponses.action_intent?.includes('invest')) baseScore += 20;
    
    // Market impact bonus
    if (newResponses.market_impact === 'disruptive') baseScore += 25;
    
    setLiveValueScore({
      total: Math.min(100, baseScore),
      pac: targetClient === 'pac' ? Math.min(100, baseScore + 10) : baseScore - 10,
      hedge: targetClient === 'hedge' ? Math.min(100, baseScore + 15) : baseScore - 5,
      brand: targetClient === 'brand' ? Math.min(100, baseScore + 10) : baseScore - 5,
      creator: targetClient === 'creator' ? Math.min(100, baseScore + 10) : baseScore - 5
    });
  };

  const handleResponse = (questionId: string, value: any) => {
    const newResponses = { ...responses, [questionId]: value };
    setResponses(newResponses);
    updateValueScore(newResponses);
  };

  const nextPhase = () => {
    const phases = ['timing', 'psychology', 'market', 'specific'];
    const currentIndex = phases.indexOf(currentPhase);
    if (currentIndex < phases.length - 1) {
      setCurrentPhase(phases[currentIndex + 1] as any);
    } else {
      submitIntelligence();
    }
  };

  const submitIntelligence = () => {
    // Compile high-value intelligence data
    const intelligenceData: HighValueIntelligenceData = {
      trendId: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
      spotterId: user?.id || '',
      
      monetizationWindow: {
        stage: responses.viral_stage === 'never_seen' ? 'pre_viral' : 
               responses.viral_stage === 'just_emerging' ? 'ascending' : 'peak',
        daysUntilPeak: responses.viral_stage === 'never_seen' ? 7 : null,
        exploitabilityScore: liveValueScore.total,
        firstMoverAdvantage: responses.viral_stage === 'never_seen'
      },
      
      audiencePsychology: {
        emotionalTriggers: responses.emotional_response || [],
        motivationalDrivers: [],
        purchaseReadiness: responses.action_intent?.includes('buy_now') ? 'immediate' : 'researching',
        influenceability: 'moderate',
        tribalAffiliation: []
      },
      
      marketIntelligence: {
        brandsAlreadyCapitalizing: responses.competition ? [responses.competition] : [],
        estimatedRevenueOpportunity: '100k_1m',
        whiteSpaceOpportunities: [],
        competitorBlindSpots: [],
        optimalEntryStrategy: responses.viral_stage === 'never_seen' ? 'first_mover' : 'fast_follower'
      },
      
      viralMechanics: {
        shareabilityTrigger: 'controversy',
        algorithmExploits: [],
        optimalPostTime: new Date().toISOString(),
        hashtagStrategy: {
          primary: [],
          secondary: [],
          avoid: []
        }
      },
      
      categoryIntelligence: {} as any // Would be populated based on category
    };
    
    // Calculate final value
    const valueScore = calculateIntelligenceValue(intelligenceData);
    
    // Show value to user
    if (valueScore.totalValue > 85) {
      showSuccess('🔥 CRITICAL VALUE INTELLIGENCE', 
        `This data is worth $${(valueScore.totalValue * 10).toLocaleString()} to our clients!`);
    } else if (valueScore.totalValue > 70) {
      showSuccess('💎 HIGH VALUE INTELLIGENCE', 
        `Excellent work! Value score: ${valueScore.totalValue}/100`);
    }
    
    onComplete(intelligenceData);
  };

  // Get value indicator color
  const getValueColor = () => {
    if (liveValueScore.total > 85) return '#FF0000';
    if (liveValueScore.total > 70) return '#FFA500';
    if (liveValueScore.total > 50) return '#FFFF00';
    return '#808080';
  };

  const questions = getRelevantQuestions();

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-4xl w-full bg-gradient-to-b from-wave-900 to-black rounded-2xl p-8 border border-wave-700/50 shadow-2xl"
      >
        {/* Value Score Display */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <BrainIcon className="w-8 h-8 text-wave-400" />
              High-Value Intelligence Capture
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-wave-400">LIVE VALUE SCORE</p>
                <p className="text-3xl font-bold" style={{ color: getValueColor() }}>
                  {liveValueScore.total}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <VoteIcon className="w-4 h-4 text-blue-400" />
                  <div className="w-20 h-2 bg-wave-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-400 transition-all duration-500"
                      style={{ width: `${liveValueScore.pac}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChartIcon className="w-4 h-4 text-green-400" />
                  <div className="w-20 h-2 bg-wave-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-400 transition-all duration-500"
                      style={{ width: `${liveValueScore.hedge}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingIcon className="w-4 h-4 text-purple-400" />
                  <div className="w-20 h-2 bg-wave-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-400 transition-all duration-500"
                      style={{ width: `${liveValueScore.brand}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-yellow-400" />
                  <div className="w-20 h-2 bg-wave-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${liveValueScore.creator}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Phase Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {['timing', 'psychology', 'market', 'specific'].map((phase, idx) => (
              <div
                key={phase}
                className={`flex-1 h-2 rounded-full transition-all ${
                  idx <= ['timing', 'psychology', 'market', 'specific'].indexOf(currentPhase)
                    ? 'bg-gradient-to-r from-wave-500 to-wave-400'
                    : 'bg-wave-800'
                }`}
              />
            ))}
          </div>
          
          {/* Value Alert */}
          {liveValueScore.total > 70 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mb-4 p-4 bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-orange-500/50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <AlertIcon className="w-6 h-6 text-orange-400" />
                <div>
                  <p className="text-orange-400 font-semibold">HIGH VALUE ALERT</p>
                  <p className="text-wave-300 text-sm">
                    {liveValueScore.total > 85 
                      ? 'This intelligence has exceptional commercial value!'
                      : 'Strong value potential detected. Complete all questions for maximum value.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6 mb-8 max-h-[50vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {questions.map((question, idx) => (
              <motion.div
                key={question.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-3"
              >
                <div>
                  <label className="text-wave-200 font-medium text-lg">
                    {question.label}
                  </label>
                  {question.description && (
                    <p className="text-wave-400 text-sm mt-1">{question.description}</p>
                  )}
                </div>
                
                {question.type === 'select' && (
                  <div className="grid grid-cols-1 gap-2">
                    {question.options.map((option: any) => (
                      <button
                        key={option.value}
                        onClick={() => handleResponse(question.id, option.value)}
                        className={`
                          p-4 rounded-xl border-2 text-left transition-all
                          ${responses[question.id] === option.value
                            ? 'border-wave-400 bg-wave-600/20'
                            : 'border-wave-700/50 hover:border-wave-600'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-wave-200">{option.label}</span>
                          {option.points && (
                            <span className="text-xs text-wave-500">+{option.points} pts</span>
                          )}
                          {option.signal && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              option.signal === 'HIGH_ENGAGEMENT' ? 'bg-red-900/50 text-red-400' :
                              option.signal === 'URGENT_ACTION' ? 'bg-orange-900/50 text-orange-400' :
                              'bg-wave-800 text-wave-400'
                            }`}>
                              {option.signal}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {question.type === 'multiselect' && (
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option: any) => {
                      const isSelected = responses[question.id]?.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            const current = responses[question.id] || [];
                            const updated = isSelected
                              ? current.filter((v: string) => v !== option.value)
                              : [...current, option.value];
                            handleResponse(question.id, updated);
                          }}
                          className={`
                            p-3 rounded-lg border text-left transition-all
                            ${isSelected
                              ? 'border-wave-400 bg-wave-600/20'
                              : 'border-wave-700/50 hover:border-wave-600'
                            }
                          `}
                        >
                          <span className="text-wave-200 text-sm">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {question.type === 'text' && (
                  <input
                    type="text"
                    placeholder={question.placeholder}
                    value={responses[question.id] || ''}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/50 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none"
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const phases = ['timing', 'psychology', 'market', 'specific'];
              const currentIndex = phases.indexOf(currentPhase);
              if (currentIndex > 0) {
                setCurrentPhase(phases[currentIndex - 1] as any);
              }
            }}
            className="px-6 py-3 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all text-wave-300"
          >
            Previous
          </button>
          
          <button
            onClick={nextPhase}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-wave-500 to-wave-400 hover:from-wave-400 hover:to-wave-300 transition-all text-black font-semibold flex items-center gap-2"
          >
            {currentPhase === 'specific' ? (
              <>
                <ZapIcon className="w-5 h-5" />
                Submit Intelligence (Value: ${(liveValueScore.total * 10).toLocaleString()})
              </>
            ) : (
              <>
                Next Phase
                <TrendingUpIcon className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
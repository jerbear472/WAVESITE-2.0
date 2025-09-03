'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Brain,
  Heart,
  Users,
  Zap,
  TrendingUp,
  AlertCircle,
  Eye,
  Clock,
  Target,
  Lightbulb,
  Shield,
  Activity,
  Globe,
  Layers,
  ChevronRight
} from 'lucide-react';

interface TrendResonanceAnalysisProps {
  formData: any;
  onAnalysisComplete?: (analysis: any) => void;
}

interface InsightCard {
  icon: React.ReactNode;
  title: string;
  insight: string;
  color: string;
}

export default function TrendResonanceAnalysis({ formData, onAnalysisComplete }: TrendResonanceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'psychology' | 'cultural' | 'timing' | 'mechanics'>('psychology');

  useEffect(() => {
    generateDeepAnalysis();
  }, []);

  const formatClaudeInsight = (apiData: any) => {
    // If we have a proper Claude response, format it nicely
    if (apiData.summary && !apiData.error) {
      let insight = "";
      
      // Add the summary
      insight += `📱 **What's Going On Here?** ${apiData.summary}\n\n`;
      
      // Add cultural context if available
      if (apiData.culturalContext) {
        insight += `🌍 **Cultural Moment:** ${apiData.culturalContext}\n\n`;
      }
      
      // Add why it's resonating if available
      if (apiData.whyResonating && apiData.whyResonating.length > 0) {
        insight += `💡 **Why It Clicks:** ${apiData.whyResonating[0]}\n\n`;
      }
      
      // Add competitor insights if available
      if (apiData.competitorInsights) {
        insight += `👥 **Who's In:** ${apiData.competitorInsights}\n\n`;
      }
      
      // Add monetization potential if available
      if (apiData.monetizationPotential) {
        insight += `💰 **Opportunity:** ${apiData.monetizationPotential}`;
      }
      
      return insight;
    }
    
    // Fallback to generic insight
    return generateKeyInsight();
  };

  const generateDeepAnalysis = async () => {
    setLoading(true);
    
    try {
      // Add timeout to API call to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      // Call the v2 API with Claude integration
      const response = await fetch('/api/analyze-trend-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title || 'Untitled Trend',
          description: formData.description || formData.post_caption || '',
          platform: formData.platform || 'tiktok',
          category: formData.category || 'general',
          url: formData.url || '',
          wave_votes: formData.wave_votes || 0,
          fire_votes: formData.fire_votes || 0,
          declining_votes: formData.declining_votes || 0,
          dead_votes: formData.dead_votes || 0
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const apiData = await response.json();
      
      // Log debug info if available
      if (apiData._debug) {
        console.log('API Debug Info:', apiData._debug);
      }
      
      // Generate the structured analysis using both API response and local calculations
      const analysis = {
        resonanceScore: apiData.viralityScore || calculateResonanceScore(),
        psychologicalDrivers: generatePsychologicalDrivers(),
        culturalContext: generateCulturalContext(),
        timingFactors: generateTimingFactors(),
        viralMechanics: generateViralMechanics(),
        keyInsight: formatClaudeInsight(apiData), // Format Claude's response properly
        predictions: apiData.predictions || generatePredictions(),
        apiAnalysis: apiData, // Store the full API response
        fromCache: apiData.cached || false,
        hasError: apiData.error || false,
        debugInfo: apiData._debug // Store debug info
      };
      
      setAnalysisData(analysis);
      setLoading(false);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
      }
    } catch (error: any) {
      console.error('Error fetching analysis:', error);
      
      // Check if it was a timeout
      if (error.name === 'AbortError') {
        console.log('API call timed out, using fallback');
      }
      
      // Fall back to local generation if API fails or times out
      const analysis = {
        resonanceScore: calculateResonanceScore(),
        psychologicalDrivers: generatePsychologicalDrivers(),
        culturalContext: generateCulturalContext(),
        timingFactors: generateTimingFactors(),
        viralMechanics: generateViralMechanics(),
        keyInsight: generateKeyInsight(),
        predictions: generatePredictions(),
        hasError: true
      };
      
      setAnalysisData(analysis);
      setLoading(false);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
      }
    }
  };

  const calculateResonanceScore = () => {
    let score = 50;
    
    // Velocity bonus
    if (formData.trendVelocity === 'viral' || formData.trendVelocity === 'picking_up') score += 15;
    if (formData.trendVelocity === 'just_starting') score += 20; // Early discovery bonus
    
    // Size and reach
    if (formData.trendSize === 'viral' || formData.trendSize === 'mega') score += 10;
    
    // Organic vs manufactured
    if (formData.trendOrigin === 'organic') score += 15;
    if (formData.trendOrigin === 'influencer') score += 5;
    
    // Evolution status
    if (formData.evolutionStatus === 'original') score += 10;
    if (formData.evolutionStatus === 'variants') score += 5;
    
    // Generation alignment
    if (formData.drivingGeneration === 'gen_z' || formData.drivingGeneration === 'gen_alpha') score += 10;
    
    return Math.min(score, 95);
  };

  const generatePsychologicalDrivers = () => {
    const drivers = [];
    
    // Core psychological needs being met
    const needs = [
      {
        need: "Identity & Self-Expression",
        explanation: "People use this trend to signal who they are and what they value",
        strength: formData.trendOrigin === 'organic' ? 95 : 70
      },
      {
        need: "Social Connection",
        explanation: "Creates instant community through shared reference points",
        strength: formData.evolutionStatus === 'variants' ? 90 : 75
      },
      {
        need: "Status & Recognition",
        explanation: "Early adopters gain social capital by being 'in the know'",
        strength: formData.trendVelocity === 'just_starting' ? 95 : 60
      },
      {
        need: "Entertainment & Escape",
        explanation: "Provides momentary relief from daily stressors",
        strength: 80
      }
    ];
    
    // Behavioral triggers
    const triggers = [];
    
    if (formData.sentiment > 70) {
      triggers.push({
        trigger: "Positive Emotional Contagion",
        description: "Joy and excitement spread faster than other emotions online"
      });
    }
    
    if (formData.evolutionStatus === 'variants' || formData.evolutionStatus === 'parody') {
      triggers.push({
        trigger: "Remixability Drive",
        description: "Humans love to iterate and personalize shared cultural objects"
      });
    }
    
    if (formData.trendOrigin === 'organic') {
      triggers.push({
        trigger: "Authenticity Hunger",
        description: "Craving for genuine, unmanufactured cultural moments"
      });
    }
    
    return { needs, triggers };
  };

  const generateCulturalContext = () => {
    const contexts = [];
    
    // Current cultural moment
    if (formData.drivingGeneration === 'gen_z' || formData.drivingGeneration === 'gen_alpha') {
      contexts.push({
        factor: "Digital Native Expression",
        insight: "This generation communicates through trends as a primary language",
        relevance: 90
      });
    }
    
    if (formData.trendOrigin === 'organic') {
      contexts.push({
        factor: "Grassroots Cultural Creation",
        insight: "Bottom-up culture creation as resistance to algorithmic feeds",
        relevance: 85
      });
    }
    
    if (formData.aiAngle && formData.aiAngle !== 'not_ai') {
      contexts.push({
        factor: "AI-Era Anxiety/Excitement",
        insight: "Processing technological change through cultural play",
        relevance: 80
      });
    }
    
    // Broader societal patterns
    contexts.push({
      factor: "Post-Ironic Sincerity",
      insight: "Being genuine through layers of self-aware humor",
      relevance: 75
    });
    
    contexts.push({
      factor: "Collective Creativity",
      insight: "Everyone becomes a creator by adding their own spin",
      relevance: 80
    });
    
    return contexts;
  };

  const generateTimingFactors = () => {
    const factors = [];
    
    // Day/time patterns
    factors.push({
      factor: "Optimal Discovery Window",
      status: formData.trendVelocity === 'just_starting' ? 'PERFECT' : 
              formData.trendVelocity === 'picking_up' ? 'GOOD' : 'LATE',
      window: formData.predictedPeak || '1-2 weeks'
    });
    
    // Seasonal/cyclical
    const month = new Date().getMonth();
    if (month >= 8 && month <= 11) {
      factors.push({
        factor: "Fall/Holiday Amplification",
        status: 'ACTIVE',
        window: 'Peak social media season'
      });
    }
    
    // Platform algorithms
    factors.push({
      factor: "Algorithm Favorability",
      status: formData.views_count > 100000 ? 'HIGH' : 'BUILDING',
      window: 'Currently being pushed'
    });
    
    return factors;
  };

  const generateViralMechanics = () => {
    const mechanics = [];
    
    // Core viral elements
    if (formData.evolutionStatus === 'variants' || formData.evolutionStatus === 'original') {
      mechanics.push({
        mechanic: "High Remix Potential",
        description: "Easy to adapt while maintaining core recognition",
        effectiveness: 90
      });
    }
    
    if (formData.trendSize === 'niche' || formData.trendSize === 'micro') {
      mechanics.push({
        mechanic: "Insider Knowledge Appeal",
        description: "Being 'in' on something before masses creates urgency to share",
        effectiveness: 85
      });
    }
    
    mechanics.push({
      mechanic: "Low Participation Barrier",
      description: "Anyone can join without special skills or resources",
      effectiveness: 80
    });
    
    mechanics.push({
      mechanic: "Social Proof Cascade",
      description: "Visible engagement creates FOMO and participation spiral",
      effectiveness: formData.likes_count > 10000 ? 95 : 70
    });
    
    return mechanics;
  };

  const generateKeyInsight = () => {
    // Generate the main "why this resonates" insight
    let insight = "This trend resonates because it ";
    
    // Primary driver
    if (formData.trendOrigin === 'organic' && formData.evolutionStatus === 'original') {
      insight += "captures a genuine cultural moment that people have been waiting to express. ";
    } else if (formData.evolutionStatus === 'variants') {
      insight += "provides a perfect template for personal creativity within a shared framework. ";
    } else if (formData.trendVelocity === 'viral') {
      insight += "hits the exact intersection of relatability and novelty that drives sharing. ";
    } else {
      insight += "fills an unmet need for this type of content in the current cultural landscape. ";
    }
    
    // Psychological hook
    if (formData.sentiment > 70) {
      insight += "The positive emotional core makes people want to be associated with it. ";
    } else if (formData.sentiment < 30) {
      insight += "The controversial nature drives engagement through strong reactions. ";
    }
    
    // Timing element
    if (formData.trendVelocity === 'just_starting') {
      insight += "You've caught this at the perfect moment - early enough to be a trendsetter, but with enough signal to know it's real.";
    } else if (formData.trendVelocity === 'viral') {
      insight += "This is at peak cultural relevance right now - maximum visibility window.";
    }
    
    return insight;
  };

  const generatePredictions = () => {
    return {
      peakTiming: formData.predictedPeak === '24_hours' ? 'Next 24-48 hours' : 
                  formData.predictedPeak === '1_week' ? 'Next 5-7 days' : 
                  'Next 2-3 weeks',
      longevity: formData.evolutionStatus === 'final' ? '3-6 months (evergreen potential)' :
                 formData.evolutionStatus === 'variants' ? '4-6 weeks with remix cycles' :
                 '2-3 weeks standard cycle',
      evolutionPath: formData.evolutionStatus === 'original' ? 'Expect remixes and variations soon' :
                     formData.evolutionStatus === 'variants' ? 'Meta-commentary phase incoming' :
                     'Saturation then nostalgia cycle',
      creativeWindow: formData.trendOrigin === 'organic' ? 'Perfect time to add your unique spin' :
                       formData.trendOrigin === 'influencer' ? 'Follow the format but make it yours' :
                       'Subvert expectations with creative twists'
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full animate-pulse" />
          <Brain className="w-8 h-8 text-white absolute top-4 left-4 animate-bounce" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-800">Analyzing Cultural Resonance</p>
          <p className="text-sm text-gray-600">Identifying psychological drivers and behavioral patterns...</p>
        </div>
      </div>
    );
  }

  const insights: InsightCard[] = [
    {
      icon: <Brain className="w-5 h-5" />,
      title: "Cognitive Hook",
      insight: analysisData.psychologicalDrivers.triggers[0]?.description || "Pattern recognition satisfied",
      color: "from-purple-500 to-indigo-600"
    },
    {
      icon: <Heart className="w-5 h-5" />,
      title: "Emotional Core",
      insight: formData.sentiment > 70 ? "Positive vibes amplify sharing" : "Controversy drives engagement",
      color: "from-pink-500 to-red-500"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Social Currency",
      insight: "Being early = social capital gains",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Viral DNA",
      insight: analysisData.viralMechanics[0]?.description || "Built for sharing",
      color: "from-yellow-500 to-orange-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Resonance Score */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-blue-200 to-pink-200 rounded-xl blur-xl opacity-50" />
        <div className="relative bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Cultural Resonance Analysis</h3>
              <p className="text-sm text-gray-600">Why this trend connects with people</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {analysisData.resonanceScore}%
              </div>
              <p className="text-xs text-gray-600">Resonance Score</p>
            </div>
          </div>

          {/* Key Insight Box - Now shows API response */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <strong className="text-blue-600 text-sm">AI Analysis</strong>
                  {analysisData.fromCache && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">Cached</span>
                  )}
                  {analysisData.hasError && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded-full">Fallback</span>
                  )}
                  {analysisData.debugInfo && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {analysisData.debugInfo.source}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none"
                     dangerouslySetInnerHTML={{ 
                       __html: analysisData.keyInsight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                      .replace(/💡/g, '<span class="inline-block ml-2">💡</span>')
                                                      .replace(/🎯/g, '<span class="inline-block ml-2">🎯</span>')
                                                      .replace(/📱/g, '<span class="inline-block ml-2">📱</span>')
                                                      .replace(/\n/g, '<br />')
                     }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insight Cards */}
      <div className="grid grid-cols-2 gap-3">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-gradient-to-br ${insight.color} rounded-lg p-3 text-white`}
          >
            <div className="flex items-center gap-2 mb-1">
              {insight.icon}
              <p className="text-xs font-medium opacity-90">{insight.title}</p>
            </div>
            <p className="text-xs leading-relaxed">{insight.insight}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabbed Deep Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'psychology', label: 'Psychology', icon: <Brain className="w-4 h-4" /> },
            { id: 'cultural', label: 'Cultural', icon: <Globe className="w-4 h-4" /> },
            { id: 'timing', label: 'Timing', icon: <Clock className="w-4 h-4" /> },
            { id: 'mechanics', label: 'Viral DNA', icon: <Activity className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'psychology' && (
              <motion.div
                key="psychology"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <h4 className="text-sm font-medium text-gray-800 mb-3">Psychological Needs Being Met</h4>
                {analysisData.psychologicalDrivers.needs.map((need: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">{need.need}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-600 rounded-full"
                            style={{ width: `${need.strength}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{need.strength}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{need.explanation}</p>
                  </div>
                ))}
                
                {analysisData.psychologicalDrivers.triggers.length > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-gray-800 mt-4 mb-2">Behavioral Triggers</h4>
                    {analysisData.psychologicalDrivers.triggers.map((trigger: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">{trigger.trigger}</p>
                          <p className="text-xs text-gray-600">{trigger.description}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'cultural' && (
              <motion.div
                key="cultural"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <h4 className="text-sm font-medium text-gray-800 mb-3">Cultural Context Factors</h4>
                {analysisData.culturalContext.map((context: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700">{context.factor}</p>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                        {context.relevance}% relevant
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{context.insight}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'timing' && (
              <motion.div
                key="timing"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <h4 className="text-sm font-medium text-gray-800 mb-3">Timing Analysis</h4>
                {analysisData.timingFactors.map((factor: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{factor.factor}</p>
                      <p className="text-xs text-gray-600">{factor.window}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      factor.status === 'PERFECT' ? 'bg-green-100 text-green-600' :
                      factor.status === 'GOOD' || factor.status === 'HIGH' || factor.status === 'ACTIVE' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {factor.status}
                    </span>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>Predictions:</strong><br/>
                    • Peak: {analysisData.predictions.peakTiming}<br/>
                    • Lifespan: {analysisData.predictions.longevity}<br/>
                    • Evolution: {analysisData.predictions.evolutionPath}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'mechanics' && (
              <motion.div
                key="mechanics"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <h4 className="text-sm font-medium text-gray-800 mb-3">Viral Mechanics at Play</h4>
                {analysisData.viralMechanics.map((mechanic: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">{mechanic.mechanic}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < Math.ceil(mechanic.effectiveness / 20)
                                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{mechanic.description}</p>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700">
                    <strong>Creative Opportunity:</strong> {analysisData.predictions.creativeWindow}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Action Insight */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1">Your Strategic Advantage</p>
            <p className="text-xs text-gray-700">
              {formData.trendVelocity === 'just_starting' ? 
                "You're in the first 5% to spot this. Perfect time to shape how this trend evolves!" :
               formData.trendVelocity === 'picking_up' ?
                "Perfect entry point - proven it works but still room for creativity. Make it yours!" :
               formData.trendVelocity === 'viral' ?
                "Peak visibility moment. Ride the wave but prepare for what's next." :
                "Late stage but remixing with fresh angle could work. Focus on next iteration."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Target,
  Users,
  Zap,
  BookOpen,
  ChevronRight,
  X,
  Copy,
  RefreshCw,
  Award
} from 'lucide-react';

interface TrendWritingHelperProps {
  value: string;
  onChange: (value: string) => void;
  onQualityChange?: (score: number) => void;
  category?: string;
  showInline?: boolean;
}

interface HeadlineTemplate {
  category: string;
  templates: string[];
  examples: string[];
  tips: string[];
}

const HEADLINE_TEMPLATES: HeadlineTemplate[] = [
  {
    category: 'Finance & Stocks',
    templates: [
      '[Group] are [action] on [subject]',
      '[Subject] [action] as [catalyst]',
      '[Metric] [movement] after [event]',
      '[Community] [sentiment] about [asset]'
    ],
    examples: [
      'Retail investors are piling into this overlooked biotech stock',
      'GameStop surges 50% as Reddit traders return',
      'Crypto whales accumulating this altcoin before major announcement',
      'Gen Z discovers dividend investing through TikTok',
      'Wall Street insiders quietly buying this EV stock',
      'This penny stock just got FDA approval - traders are noticing'
    ],
    tips: [
      'Use specific groups (retail investors, whales, Gen Z)',
      'Include action verbs (surging, accumulating, discovering)',
      'Mention catalysts when relevant (FDA approval, earnings)',
      'Highlight unusual activity or sentiment shifts'
    ]
  },
  {
    category: 'Gaming & Tech',
    templates: [
      '[Community] is [reaction] about [subject]',
      '[Platform] users are [action] with [trend]',
      '[Subject] becomes [status] overnight',
      '[Metric] [measurement] for [product/service]'
    ],
    examples: [
      'Gaming community going crazy over AI-generated RPG',
      'Streamers can\'t stop playing this indie horror game',
      'TikTok developers rushing to clone this viral app feature',
      'Discord servers exploding around new anime game beta',
      'Speed runners just discovered game-breaking exploit',
      'Mobile gamers spending thousands on new gacha character'
    ],
    tips: [
      'Focus on community reactions and behaviors',
      'Highlight viral moments or sudden popularity',
      'Use gaming/tech specific terminology appropriately',
      'Emphasize FOMO and discovery angles'
    ]
  },
  {
    category: 'Fashion & Lifestyle',
    templates: [
      '[Demographic] are [action] with [trend]',
      '[Item/Style] is [status] [timeframe]',
      '[Influencer/Brand] just [action] and [reaction]',
      'The [unexpected] [trend] taking over [platform]'
    ],
    examples: [
      'Gen Z bringing back 90s grunge in unexpected way',
      'Luxury brands panic as dupes go mainstream on TikTok',
      'Cottagecore aesthetic evolving into dark academia',
      'Minimalist wardrobe trend hits maximum overconsumption',
      'Thrift flips becoming six-figure businesses',
      'Office fashion completely reimagined post-remote work'
    ],
    tips: [
      'Identify specific demographics and subcultures',
      'Highlight contrasts and unexpected combinations',
      'Focus on cultural shifts, not just products',
      'Connect to broader social movements'
    ]
  },
  {
    category: 'Food & Health',
    templates: [
      '[Food/Diet] is [status] among [group]',
      '[Health trend] [action] after [catalyst]',
      '[Platform] users [discovering] [wellness practice]',
      '[Traditional practice] gets [modern twist]'
    ],
    examples: [
      'Carnivore diet influencers switching to plant-based overnight',
      'Ancient grain bread becoming luxury status symbol',
      'TikTok doctors debunking viral wellness trends',
      'Fermented foods creating underground trading economy',
      'Sleep optimization becoming competitive sport',
      'Biohackers combining ancient medicine with AI tracking'
    ],
    tips: [
      'Balance skepticism with genuine interest',
      'Highlight unexpected health discoveries',
      'Focus on community and cultural aspects',
      'Connect wellness to broader lifestyle changes'
    ]
  },
  {
    category: 'Entertainment & Culture',
    templates: [
      '[Fanbase] [reaction] to [event/release]',
      '[Content] becomes [phenomenon] on [platform]',
      '[Creator/Artist] [action] causing [reaction]',
      '[Niche interest] suddenly [mainstream status]'
    ],
    examples: [
      'K-pop stans organizing to crash ticketing sites',
      'Obscure 2000s TV show becomes Gen Z comfort watch',
      'BookTok making poetry books bestsellers again',
      'Underground music genre exploding on Spotify',
      'True crime podcasts influencing actual investigations',
      'Nostalgic millennials making Y2K fashion profitable'
    ],
    tips: [
      'Identify passionate communities and fandoms',
      'Highlight cultural moments and movements',
      'Focus on unexpected revivals and discoveries',
      'Connect entertainment to broader social trends'
    ]
  }
];

const QUALITY_INDICATORS = {
  good: [
    { pattern: /\b(exploding|surging|crashing|viral|breaking)\b/i, points: 2, reason: 'Strong action verb' },
    { pattern: /\b(overnight|suddenly|quietly|secretly)\b/i, points: 2, reason: 'Urgency/timing' },
    { pattern: /\b(Gen Z|millennials|boomers|retail investors|whales)\b/i, points: 2, reason: 'Specific demographic' },
    { pattern: /\b\d+[%xX]\b/, points: 2, reason: 'Specific metrics' },
    { pattern: /\b(Reddit|TikTok|Twitter|Discord|YouTube)\b/i, points: 1, reason: 'Platform specific' },
    { pattern: /\b(AI|crypto|NFT|metaverse|Web3)\b/i, points: 1, reason: 'Trending topic' }
  ],
  bad: [
    { pattern: /\b(thing|stuff|something|whatever)\b/i, points: -2, reason: 'Too vague' },
    { pattern: /\b(maybe|possibly|could be|might)\b/i, points: -2, reason: 'Lacks confidence' },
    { pattern: /^(the|a|an)\s/i, points: -1, reason: 'Weak opening' },
    { pattern: /\?$/, points: -1, reason: 'Questions less engaging' },
    { pattern: /\.{2,}/, points: -1, reason: 'Avoid ellipsis' },
    { pattern: /!{2,}/, points: -1, reason: 'Too many exclamations' }
  ]
};

export default function TrendWritingHelper({
  value,
  onChange,
  onQualityChange,
  category = 'General',
  showInline = true
}: TrendWritingHelperProps) {
  const [showHelper, setShowHelper] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  useEffect(() => {
    analyzeQuality(value);
  }, [value]);

  const analyzeQuality = (text: string) => {
    let score = 50; // Base score
    const feedbackItems: string[] = [];

    // Length check
    if (text.length < 20) {
      score -= 10;
      feedbackItems.push('Too short - add more detail');
    } else if (text.length > 100) {
      score -= 5;
      feedbackItems.push('Consider making it more concise');
    }

    // Check quality indicators
    QUALITY_INDICATORS.good.forEach(indicator => {
      if (indicator.pattern.test(text)) {
        score += indicator.points;
        feedbackItems.push(`✓ ${indicator.reason}`);
      }
    });

    QUALITY_INDICATORS.bad.forEach(indicator => {
      if (indicator.pattern.test(text)) {
        score += indicator.points;
        feedbackItems.push(`⚠ ${indicator.reason}`);
      }
    });

    // Bonus for headline style (no period at end)
    if (text.length > 0 && !text.endsWith('.')) {
      score += 5;
    }

    // Cap score between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    setQualityScore(score);
    setFeedback(feedbackItems);
    onQualityChange?.(score);
  };

  const copyExample = (example: string) => {
    onChange(example);
    setCopiedExample(example);
    setTimeout(() => setCopiedExample(null), 2000);
  };

  const generateSuggestion = () => {
    const templates = HEADLINE_TEMPLATES[activeCategory];
    const randomExample = templates.examples[Math.floor(Math.random() * templates.examples.length)];
    
    // Create a variation of the example
    const variations = [
      randomExample.replace(/this/gi, 'new'),
      randomExample.replace(/are/gi, 'start'),
      randomExample.replace(/ing/g, 'ing hard'),
    ];
    
    const suggestion = variations[Math.floor(Math.random() * variations.length)];
    onChange(suggestion);
  };

  const getQualityColor = () => {
    if (qualityScore >= 70) return 'text-green-500';
    if (qualityScore >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getQualityIcon = () => {
    if (qualityScore >= 70) return <CheckCircle className="w-5 h-5" />;
    if (qualityScore >= 40) return <AlertCircle className="w-5 h-5" />;
    return <X className="w-5 h-5" />;
  };

  return (
    <>
      {/* Inline Quality Indicator */}
      {showInline && value.length > 10 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mt-2 px-3 py-2 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 ${getQualityColor()}`}>
              {getQualityIcon()}
              <span className="text-sm font-medium">
                Quality: {qualityScore}%
              </span>
            </div>
            {qualityScore < 70 && (
              <button
                onClick={() => setShowHelper(true)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Lightbulb className="w-4 h-4" />
                Get help
              </button>
            )}
          </div>
          {feedback.length > 0 && (
            <div className="flex items-center gap-2">
              {feedback.slice(0, 2).map((item, idx) => (
                <span key={idx} className="text-xs text-gray-600">
                  {item}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Help Button */}
      <button
        onClick={() => setShowHelper(true)}
        className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        Get AI-Powered Headline Help
      </button>

      {/* Helper Modal */}
      <AnimatePresence>
        {showHelper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowHelper(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Trend Writing Guide</h2>
                    <p className="text-sm text-gray-500">Write headlines that get noticed and earn more</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelper(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Category Tabs */}
              <div className="px-6 py-3 border-b border-gray-200 overflow-x-auto">
                <div className="flex gap-2">
                  {HEADLINE_TEMPLATES.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveCategory(idx)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                        activeCategory === idx
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {template.category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  {/* Current Score */}
                  {value.length > 10 && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Your Current Headline</span>
                        <div className={`flex items-center gap-2 ${getQualityColor()}`}>
                          {getQualityIcon()}
                          <span className="font-bold">{qualityScore}%</span>
                        </div>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">{value}</p>
                      <div className="flex flex-wrap gap-2">
                        {feedback.map((item, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-white rounded-lg">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Templates */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Winning Formulas
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {HEADLINE_TEMPLATES[activeCategory].templates.map((template, idx) => (
                        <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                          <code className="text-sm text-purple-700 font-mono">{template}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Examples */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-600" />
                      High-Performing Examples
                    </h3>
                    <div className="space-y-2">
                      {HEADLINE_TEMPLATES[activeCategory].examples.map((example, idx) => (
                        <div
                          key={idx}
                          className="group p-3 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                          onClick={() => copyExample(example)}
                        >
                          <span className="text-gray-900">{example}</span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                            {copiedExample === example ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                      Pro Tips
                    </h3>
                    <div className="space-y-2">
                      {HEADLINE_TEMPLATES[activeCategory].tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={generateSuggestion}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Example
                </button>
                <button
                  onClick={() => setShowHelper(false)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
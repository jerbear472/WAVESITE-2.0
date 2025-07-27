'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, TrendingUp, Users, Target, Calendar, DollarSign,
  BarChart3, PieChart, LineChart, Hash, AtSign, Video,
  ShoppingBag, Palette, Brain, Activity, Gamepad2, Music
} from 'lucide-react';

interface IndustryDashboardProps {
  userPlan: string;
}

interface MarketingMetrics {
  campaignOpportunities: number;
  influencerMatches: number;
  contentIdeas: number;
  estimatedReach: string;
  viralPotential: number;
}

interface HedgeFundMetrics {
  tradingSignals: number;
  sectorCorrelations: Array<{ sector: string; correlation: number }>;
  riskScore: number;
  alphaOpportunities: number;
  sentimentIndicators: { bullish: number; bearish: number; neutral: number };
}

interface CreatorMetrics {
  trendingFormats: Array<{ format: string; engagement: string }>;
  optimalPostTimes: string[];
  collaborationMatches: number;
  monetizationPotential: string;
  contentGaps: string[];
}

export function IndustryDashboard({ userPlan }: IndustryDashboardProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<'marketing' | 'hedgefund' | 'creator'>('marketing');
  const [timeRange, setTimeRange] = useState('7d');

  const industries = [
    {
      id: 'marketing',
      name: 'Marketing Agency',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-500',
      description: 'Campaign planning and brand monitoring tools'
    },
    {
      id: 'hedgefund',
      name: 'Hedge Fund',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500',
      description: 'Financial signals and market sentiment analysis'
    },
    {
      id: 'creator',
      name: 'Content Creator',
      icon: <Video className="w-5 h-5" />,
      color: 'from-cyan-500 to-blue-500',
      description: 'Content optimization and collaboration tools'
    }
  ];

  const renderMarketingDashboard = () => (
    <div className="space-y-6">
      {/* Campaign Opportunities */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Campaign Opportunities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              trend: 'Sustainable Fashion',
              match: 92,
              category: 'Fashion',
              audience: 'Gen Z, Millennials',
              strategy: 'Partner with eco-brands for awareness campaign'
            },
            {
              trend: 'AI Productivity Tools',
              match: 87,
              category: 'Technology',
              audience: 'Professionals, Students',
              strategy: 'Create educational content series'
            },
            {
              trend: 'Wellness Routines',
              match: 78,
              category: 'Health',
              audience: 'Health-conscious adults',
              strategy: 'Influencer partnerships for morning routine content'
            }
          ].map((opp, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{opp.trend}</h4>
                <span className="text-sm bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                  {opp.match}% match
                </span>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div>Category: {opp.category}</div>
                <div>Audience: {opp.audience}</div>
                <div className="text-cyan-400 mt-2">{opp.strategy}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Influencer Discovery */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-pink-400" />
          Influencer Discovery
        </h3>
        <div className="space-y-3">
          {[
            { name: '@techsavvy', followers: '2.3M', engagement: '4.8%', niche: 'Tech Reviews', trending: true },
            { name: '@fashionforward', followers: '890K', engagement: '6.2%', niche: 'Sustainable Fashion', trending: true },
            { name: '@fitlifeguru', followers: '1.5M', engagement: '5.1%', niche: 'Fitness & Wellness', trending: false }
          ].map((influencer, idx) => (
            <div key={idx} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {influencer.name}
                    {influencer.trending && (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-400">{influencer.niche}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{influencer.followers}</div>
                <div className="text-sm text-cyan-400">{influencer.engagement} engagement</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Calendar Integration */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Content Calendar Integration
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 pb-2">{day}</div>
          ))}
          {[...Array(28)].map((_, idx) => {
            const hasTrend = Math.random() > 0.7;
            return (
              <div
                key={idx}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                  hasTrend
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'bg-gray-800/50'
                }`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderHedgeFundDashboard = () => (
    <div className="space-y-6">
      {/* Trading Signals */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Real-Time Trading Signals
        </h3>
        <div className="space-y-3">
          {[
            {
              signal: 'BUY',
              trend: 'Electric Vehicle Charging Infrastructure',
              confidence: 87,
              impact: 'High',
              sectors: ['Technology', 'Energy'],
              reasoning: 'Government subsidies announced, 340% trend velocity increase'
            },
            {
              signal: 'HOLD',
              trend: 'Metaverse Gaming Platforms',
              confidence: 65,
              impact: 'Medium',
              sectors: ['Gaming', 'Technology'],
              reasoning: 'Mixed sentiment, waiting for earnings reports'
            },
            {
              signal: 'SELL',
              trend: 'Fast Fashion Retailers',
              confidence: 78,
              impact: 'High',
              sectors: ['Retail', 'Fashion'],
              reasoning: 'Negative sentiment surge, sustainability concerns trending'
            }
          ].map((signal, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-gray-800/50 rounded-lg p-4 border ${
                signal.signal === 'BUY' ? 'border-green-500/50' :
                signal.signal === 'SELL' ? 'border-red-500/50' :
                'border-yellow-500/50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`text-lg font-bold ${
                    signal.signal === 'BUY' ? 'text-green-400' :
                    signal.signal === 'SELL' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {signal.signal}
                  </span>
                  <h4 className="font-semibold mt-1">{signal.trend}</h4>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Confidence</div>
                  <div className="text-lg font-bold">{signal.confidence}%</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                <div>Impact: <span className="text-white">{signal.impact}</span></div>
                <div>Sectors: {signal.sectors.join(', ')}</div>
                <div className="mt-2 text-cyan-400">{signal.reasoning}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sector Correlation Matrix */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-400" />
          Sector Correlation Analysis
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm">
                <th className="pb-2">Sector</th>
                <th className="pb-2">Tech</th>
                <th className="pb-2">Finance</th>
                <th className="pb-2">Health</th>
                <th className="pb-2">Energy</th>
                <th className="pb-2">Retail</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {['Technology', 'Finance', 'Healthcare', 'Energy', 'Retail'].map((sector, idx) => (
                <tr key={idx} className="border-t border-gray-800">
                  <td className="py-2 font-semibold">{sector}</td>
                  {[1.0, 0.72, 0.45, 0.38, -0.21].map((corr, corrIdx) => (
                    <td key={corrIdx} className="py-2">
                      <span className={`px-2 py-1 rounded ${
                        corr > 0.7 ? 'bg-green-500/20 text-green-400' :
                        corr > 0.3 ? 'bg-yellow-500/20 text-yellow-400' :
                        corr < 0 ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {corr.toFixed(2)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-green-400" />
          AI Risk Assessment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400 mb-2">6.8/10</div>
            <div className="text-sm text-gray-400">Overall Risk Score</div>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
              <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '68%' }} />
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400 mb-2">82%</div>
            <div className="text-sm text-gray-400">Prediction Accuracy</div>
            <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400 mb-2">4</div>
            <div className="text-sm text-gray-400">Alpha Opportunities</div>
            <div className="text-xs text-gray-500 mt-1">High confidence</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreatorDashboard = () => (
    <div className="space-y-6">
      {/* Trending Content Formats */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-cyan-400" />
          Trending Content Formats
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { format: 'Short-form Tutorials', platform: 'TikTok', engagement: '8.2%', trending: true },
            { format: 'Live Q&A Sessions', platform: 'Instagram', engagement: '6.5%', trending: true },
            { format: 'Behind-the-scenes', platform: 'YouTube Shorts', engagement: '7.1%', trending: false },
            { format: 'Challenges/Trends', platform: 'Multiple', engagement: '9.8%', trending: true },
            { format: 'Storytelling Series', platform: 'Instagram Stories', engagement: '5.9%', trending: false },
            { format: 'Educational Carousels', platform: 'LinkedIn', engagement: '4.2%', trending: true }
          ].map((format, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{format.format}</h4>
                {format.trending && (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-sm text-gray-400">
                <div>{format.platform}</div>
                <div className="text-cyan-400 font-semibold mt-1">{format.engagement} avg engagement</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Optimal Posting Times */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          Optimal Posting Schedule
        </h3>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-sm text-gray-400">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[
            { time: '7 AM', score: 65 },
            { time: '9 AM', score: 78 },
            { time: '12 PM', score: 92 },
            { time: '3 PM', score: 85 },
            { time: '6 PM', score: 95 },
            { time: '8 PM', score: 88 },
            { time: '10 PM', score: 72 }
          ].map((slot, dayIdx) => (
            [...Array(7)].map((_, timeIdx) => {
              const score = slot.score + (Math.random() * 20 - 10);
              return (
                <div
                  key={`${dayIdx}-${timeIdx}`}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
                    score > 85 ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50' :
                    score > 70 ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-gray-800/50 text-gray-500'
                  }`}
                >
                  <div>{slot.time}</div>
                  <div className="text-[10px]">{Math.round(score)}%</div>
                </div>
              );
            })
          )).flat()}
        </div>
      </div>

      {/* Collaboration Opportunities */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Collaboration Matches
        </h3>
        <div className="space-y-3">
          {[
            {
              creator: '@digitalartist',
              match: 94,
              audience: '85% overlap',
              niche: 'Digital Art & Design',
              proposal: 'Joint NFT collection launch'
            },
            {
              creator: '@techreviewer',
              match: 87,
              audience: '72% overlap',
              niche: 'Tech & Gadgets',
              proposal: 'Cross-promotion on latest tech trends'
            },
            {
              creator: '@lifestylecoach',
              match: 76,
              audience: '68% overlap',
              niche: 'Wellness & Productivity',
              proposal: 'Morning routine challenge series'
            }
          ].map((collab, idx) => (
            <div key={idx} className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full" />
                <div>
                  <div className="font-semibold">{collab.creator}</div>
                  <div className="text-sm text-gray-400">{collab.niche}</div>
                  <div className="text-sm text-cyan-400 mt-1">{collab.proposal}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-cyan-400">{collab.match}%</div>
                <div className="text-sm text-gray-400">{collab.audience}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monetization Insights */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-6 border border-cyan-500/50">
        <h3 className="text-xl font-semibold mb-4">Monetization Potential</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-3xl font-bold text-cyan-400">$12.5K</div>
            <div className="text-sm text-gray-400">Est. Monthly Revenue</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">+45%</div>
            <div className="text-sm text-gray-400">Growth Potential</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">8</div>
            <div className="text-sm text-gray-400">Brand Opportunities</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Industry Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {industries.map((industry) => (
          <motion.button
            key={industry.id}
            onClick={() => setSelectedIndustry(industry.id as any)}
            className={`relative overflow-hidden rounded-xl p-6 transition-all ${
              selectedIndustry === industry.id
                ? 'bg-gradient-to-r ' + industry.color + ' text-white'
                : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                {industry.icon}
                <h3 className="text-lg font-semibold">{industry.name}</h3>
              </div>
              <p className="text-sm opacity-90">{industry.description}</p>
            </div>
            {selectedIndustry === industry.id && (
              <motion.div
                layoutId="industrySelector"
                className="absolute inset-0 bg-gradient-to-r opacity-20"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 p-1 bg-gray-900/50 rounded-lg w-fit">
        {['1d', '7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-md transition-all ${
              timeRange === range
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {range === '1d' ? '24h' : range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
          </button>
        ))}
      </div>

      {/* Render Industry-Specific Dashboard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedIndustry}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {selectedIndustry === 'marketing' && renderMarketingDashboard()}
          {selectedIndustry === 'hedgefund' && renderHedgeFundDashboard()}
          {selectedIndustry === 'creator' && renderCreatorDashboard()}
        </motion.div>
      </AnimatePresence>

      {/* Upgrade CTA for lower tiers */}
      {userPlan === 'starter' && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/50">
          <h3 className="text-xl font-semibold mb-2">Unlock Full Industry Tools</h3>
          <p className="text-gray-400 mb-4">
            Upgrade to Professional or Enterprise to access all industry-specific features, 
            real-time data feeds, and advanced AI insights.
          </p>
          <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity">
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
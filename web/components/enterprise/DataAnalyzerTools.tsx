'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, TrendingUp, BarChart3, Globe2, Users, Shield,
  Zap, Target, Activity, Layers, Sparkles, ChevronRight,
  Play, Settings, FileText, Download, AlertCircle, Clock,
  Search, Filter, Hash, MessageSquare, Eye, PieChart
} from 'lucide-react';

interface AnalyzerTool {
  id: string;
  name: string;
  description: string;
  detailedDescription: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  status: 'active' | 'beta' | 'coming-soon';
  category: 'prediction' | 'analysis' | 'monitoring' | 'optimization';
  processingTime: string;
  accuracy: number;
}

export function DataAnalyzerTools() {
  const [selectedTool, setSelectedTool] = useState<AnalyzerTool | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isRunning, setIsRunning] = useState<string | null>(null);

  const analyzerTools: AnalyzerTool[] = [
    {
      id: 'trend-predictor',
      name: 'Trend Predictor AI',
      description: 'Predict future trends with 94% accuracy using advanced ML models',
      detailedDescription: 'Our flagship AI model analyzes millions of data points across social media, news, forums, and search trends to predict what will go viral next. It uses transformer-based neural networks trained on 5+ years of trend data.',
      icon: <Brain className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      features: [
        'Next 7-30 day trend predictions',
        'Viral probability scoring',
        'Peak timing estimation',
        'Geographic spread analysis',
        'Industry-specific predictions'
      ],
      status: 'active',
      category: 'prediction',
      processingTime: '2-3 seconds',
      accuracy: 94.2
    },
    {
      id: 'sentiment-analyzer',
      name: 'Sentiment Deep Dive',
      description: 'Understand public sentiment and emotional reactions at scale',
      detailedDescription: 'Analyze the emotional pulse of any trend, brand, or topic. Our sentiment analyzer goes beyond positive/negative to understand nuanced emotions like excitement, skepticism, anticipation, and controversy.',
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
      features: [
        '12 emotion categories',
        'Sarcasm & irony detection',
        'Demographic sentiment breakdown',
        'Real-time sentiment shifts',
        'Influencer sentiment tracking'
      ],
      status: 'active',
      category: 'analysis',
      processingTime: '1-2 seconds',
      accuracy: 91.8
    },
    {
      id: 'velocity-tracker',
      name: 'Velocity Tracker',
      description: 'Track trend acceleration and momentum in real-time',
      detailedDescription: 'Monitor how fast trends are spreading across platforms and demographics. Identify the exact moment a trend starts accelerating and predict its trajectory with precision.',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-500',
      features: [
        'Real-time velocity metrics',
        'Platform-specific tracking',
        'Acceleration alerts',
        'Comparative velocity analysis',
        'Historical velocity patterns'
      ],
      status: 'active',
      category: 'monitoring',
      processingTime: 'Real-time',
      accuracy: 96.5
    },
    {
      id: 'audience-segmenter',
      name: 'Audience Segmentation AI',
      description: 'Identify and analyze specific audience segments for any trend',
      detailedDescription: 'Discover exactly who is driving trends and how different demographics engage. Our AI creates detailed audience personas and tracks how trends spread through different communities.',
      icon: <Users className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
      features: [
        'Demographic profiling',
        'Psychographic analysis',
        'Behavioral patterns',
        'Community mapping',
        'Influencer identification'
      ],
      status: 'active',
      category: 'analysis',
      processingTime: '3-4 seconds',
      accuracy: 89.3
    },
    {
      id: 'competitor-intelligence',
      name: 'Competitor Intelligence',
      description: 'Track competitor trends and benchmark performance',
      detailedDescription: 'Stay ahead by monitoring competitor trend adoption, content performance, and audience engagement. Get alerts when competitors capitalize on trends you\'re missing.',
      icon: <Eye className="w-6 h-6" />,
      color: 'from-red-500 to-pink-500',
      features: [
        'Competitor trend tracking',
        'Performance benchmarking',
        'Gap analysis',
        'Strategy insights',
        'Alert notifications'
      ],
      status: 'active',
      category: 'monitoring',
      processingTime: '2-3 seconds',
      accuracy: 92.1
    },
    {
      id: 'content-optimizer',
      name: 'Content Optimization Engine',
      description: 'AI-powered recommendations to maximize content performance',
      detailedDescription: 'Get specific, actionable recommendations on how to optimize your content for maximum trend alignment and engagement. From hashtags to posting times to content formats.',
      icon: <Target className="w-6 h-6" />,
      color: 'from-indigo-500 to-purple-500',
      features: [
        'Content format suggestions',
        'Optimal timing analysis',
        'Hashtag recommendations',
        'Caption optimization',
        'Visual style guidance'
      ],
      status: 'active',
      category: 'optimization',
      processingTime: '2-3 seconds',
      accuracy: 88.7
    },
    {
      id: 'risk-assessor',
      name: 'Trend Risk Assessment',
      description: 'Evaluate risks and opportunities for trend participation',
      detailedDescription: 'Not all trends are worth pursuing. Our risk assessment tool evaluates brand safety, longevity, ROI potential, and reputational impact to help you make informed decisions.',
      icon: <Shield className="w-6 h-6" />,
      color: 'from-gray-600 to-gray-800',
      features: [
        'Brand safety scoring',
        'Longevity predictions',
        'ROI projections',
        'Controversy detection',
        'Legal compliance checks'
      ],
      status: 'active',
      category: 'analysis',
      processingTime: '3-4 seconds',
      accuracy: 90.5
    },
    {
      id: 'geographic-mapper',
      name: 'Geographic Trend Mapper',
      description: 'Visualize how trends spread across regions and cultures',
      detailedDescription: 'Track trend adoption across countries, cities, and cultural boundaries. Identify where trends start, how they spread, and which regions are most receptive.',
      icon: <Globe2 className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      features: [
        'Interactive heat maps',
        'Regional velocity tracking',
        'Cultural adaptation analysis',
        'Language-specific trends',
        'Local influencer mapping'
      ],
      status: 'beta',
      category: 'analysis',
      processingTime: '4-5 seconds',
      accuracy: 87.2
    },
    {
      id: 'pattern-recognizer',
      name: 'Pattern Recognition Engine',
      description: 'Identify recurring patterns and cycles in trend data',
      detailedDescription: 'Discover hidden patterns in how trends emerge, evolve, and fade. Our pattern recognition engine identifies seasonal trends, cyclical behaviors, and predictable trend lifecycles.',
      icon: <Layers className="w-6 h-6" />,
      color: 'from-purple-600 to-indigo-600',
      features: [
        'Seasonal pattern detection',
        'Lifecycle stage analysis',
        'Historical pattern matching',
        'Anomaly detection',
        'Predictive pattern modeling'
      ],
      status: 'beta',
      category: 'prediction',
      processingTime: '5-6 seconds',
      accuracy: 85.9
    },
    {
      id: 'influence-calculator',
      name: 'Influence Impact Calculator',
      description: 'Measure and predict influencer impact on trends',
      detailedDescription: 'Calculate the exact impact of influencers on trend velocity and reach. Identify which influencers to partner with for maximum trend amplification.',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'from-pink-500 to-rose-500',
      features: [
        'Influencer impact scoring',
        'Reach predictions',
        'Engagement forecasting',
        'Cost-benefit analysis',
        'Partnership recommendations'
      ],
      status: 'coming-soon',
      category: 'optimization',
      processingTime: '3-4 seconds',
      accuracy: 0
    }
  ];

  const categories = [
    { id: 'all', name: 'All Tools', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'prediction', name: 'Prediction', icon: <Brain className="w-4 h-4" /> },
    { id: 'analysis', name: 'Analysis', icon: <Search className="w-4 h-4" /> },
    { id: 'monitoring', name: 'Monitoring', icon: <Activity className="w-4 h-4" /> },
    { id: 'optimization', name: 'Optimization', icon: <Target className="w-4 h-4" /> }
  ];

  const filteredTools = activeCategory === 'all' 
    ? analyzerTools 
    : analyzerTools.filter(tool => tool.category === activeCategory);

  const handleRunTool = (toolId: string) => {
    setIsRunning(toolId);
    setTimeout(() => {
      setIsRunning(null);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-3">AI-Powered Data Analyzer Tools</h2>
        <p className="text-gray-400 text-lg">
          Advanced analysis tools powered by machine learning to extract insights from trend data
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeCategory === category.id
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-gray-900/50 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            {category.icon}
            <span>{category.name}</span>
          </motion.button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredTools.map((tool, idx) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              className="relative group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity`}></div>
              <div className="relative bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800/50 hover:border-gray-700 transition-all overflow-hidden">
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {tool.status === 'beta' && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg font-medium">
                      BETA
                    </span>
                  )}
                  {tool.status === 'coming-soon' && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-lg font-medium">
                      COMING SOON
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {/* Icon and Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${tool.color} flex-shrink-0`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{tool.name}</h3>
                      <p className="text-sm text-gray-400">{tool.description}</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        Processing Time
                      </div>
                      <div className="font-medium">{tool.processingTime}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Target className="w-3 h-3" />
                        Accuracy
                      </div>
                      <div className="font-medium">
                        {tool.accuracy > 0 ? `${tool.accuracy}%` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Features Preview */}
                  <div className="space-y-1 mb-4">
                    {tool.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                        <ChevronRight className="w-3 h-3 text-gray-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {tool.features.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{tool.features.length - 3} more features
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedTool(tool)}
                      className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium"
                    >
                      View Details
                    </motion.button>
                    {tool.status === 'active' && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRunTool(tool.id)}
                        disabled={isRunning === tool.id}
                        className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${
                          isRunning === tool.id
                            ? 'bg-gray-800 text-gray-500'
                            : `bg-gradient-to-r ${tool.color} text-white hover:shadow-lg`
                        }`}
                      >
                        {isRunning === tool.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Run Tool</span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tool Detail Modal */}
      <AnimatePresence>
        {selectedTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTool(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${selectedTool.color}`}>
                      {selectedTool.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedTool.name}</h2>
                      <p className="text-gray-400">{selectedTool.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTool(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 rotate-90" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Detailed Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">How it works</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {selectedTool.detailedDescription}
                  </p>
                </div>

                {/* Key Features */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedTool.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className={`p-1 rounded bg-gradient-to-br ${selectedTool.color} flex-shrink-0`}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Specs */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Technical Specifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Processing Time</div>
                      <div className="font-medium">{selectedTool.processingTime}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Accuracy Rate</div>
                      <div className="font-medium">
                        {selectedTool.accuracy > 0 ? `${selectedTool.accuracy}%` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Category</div>
                      <div className="font-medium capitalize">{selectedTool.category}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      <div className="font-medium capitalize">{selectedTool.status}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {selectedTool.status === 'active' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        handleRunTool(selectedTool.id);
                        setSelectedTool(null);
                      }}
                      className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 bg-gradient-to-r ${selectedTool.color} text-white`}
                    >
                      <Play className="w-5 h-5" />
                      <span>Run {selectedTool.name}</span>
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Configure</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>View Docs</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20">
        <h3 className="text-xl font-semibold mb-4">Platform Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-3xl font-bold text-cyan-400">12.8M</div>
            <div className="text-sm text-gray-400">Analyses Run Today</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">92.3%</div>
            <div className="text-sm text-gray-400">Average Accuracy</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400">2.1s</div>
            <div className="text-sm text-gray-400">Avg Processing Time</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">99.9%</div>
            <div className="text-sm text-gray-400">Uptime</div>
          </div>
        </div>
      </div>
    </div>
  );
}
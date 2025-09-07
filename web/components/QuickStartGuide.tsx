'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X,
  TrendingUp,
  Target,
  ChevronRight,
  ChevronLeft,
  Eye,
  Zap,
  CheckCircle,
  Brain
} from 'lucide-react';
import Link from 'next/link';

interface QuickStartGuideProps {
  onDismiss?: () => void;
}

export default function QuickStartGuide({ onDismiss }: QuickStartGuideProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hasSeenQuickStart', 'true');
    onDismiss?.();
  };

  const steps = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Spot & Submit Trends",
      description: "Screenshot what's next. Get AI analysis instantly. Beat everyone to the punch.",
      points: [
        "📸 Submit screenshots from any platform",
        "🤖 Claude analyzes viral potential",
        "🎯 Get strategic recommendations"
      ],
      action: { label: "Start spotting", href: "/spot" }
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Analysis",
      description: "Every trend you submit gets deep analysis from Claude with web search context.",
      points: [
        "📊 Virality score (0-100)",
        "🌐 Real-time web context",
        "💡 Strategic recommendations"
      ],
      action: { label: "See example", href: "/spot" }
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Your Timeline vs Headlines",
      description: "Track your submissions in Timeline. Discover validated trends in Headlines.",
      points: [
        "📅 Timeline = Your personal trends",
        "🌍 Headlines = Community's best finds",
        "✅ Get validated = Earn more XP"
      ],
      action: { label: "View Headlines", href: "/predictions" }
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Level Up & Earn",
      description: "15 levels from Observer to Oracle. Top spotters split monthly prizes.",
      points: [
        "💰 Real money prizes monthly",
        "🔥 Streak bonuses multiply XP",
        "🏆 Leaderboard tracks the best"
      ],
      action: { label: "Check your stats", href: "/dashboard" }
    }
  ];

  const currentStepData = steps[currentStep];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(currentStep - 1);
      } else if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, steps.length]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "tween", duration: 0.2 }}
          className="relative bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-800"
        >
          {/* Header */}
          <div className="relative bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 rounded-full transition-all ${
                        index === currentStep 
                          ? 'w-6 bg-blue-500' 
                          : index < currentStep 
                          ? 'w-1 bg-blue-500/40' 
                          : 'w-1 bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ type: "tween", duration: 0.2 }}
                className="space-y-6"
              >
                {/* Icon */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    {currentStepData.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {currentStepData.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Points */}
                <div className="space-y-2">
                  {currentStepData.points.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Action Button */}
                {currentStepData.action && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Link href={currentStepData.action.href}>
                      <button
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        onClick={handleDismiss}
                      >
                        {currentStepData.action.label}
                      </button>
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-all ${
                  currentStep === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-600'
                    : 'hover:bg-gray-800 text-gray-400 rounded-lg'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Skip
                </button>
                {currentStep === steps.length - 1 ? (
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Get started
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Mini version for returning users
export function MiniQuickStart() {
  const tips = [
    "🤖 Every trend gets AI analysis with viral potential scoring",
    "📸 Screenshot → Submit → Get Claude's analysis in seconds",
    "🌍 Headlines shows community's validated trends",
    "📅 Timeline tracks your personal submission history",
    "🔥 Daily streaks multiply your XP earnings",
    "💰 Top 10 spotters split the monthly prize pool",
    "⏰ Submit early morning for maximum visibility",
    "🎯 Focus on emerging platforms for hidden gems"
  ];

  const [currentTip] = useState(() => Math.floor(Math.random() * tips.length));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 rounded-lg p-3 border border-gray-800"
    >
      <div className="flex items-start gap-2">
        <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-400">{tips[currentTip]}</p>
      </div>
    </motion.div>
  );
}
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
  Sparkles,
  Rocket,
  Trophy,
  Brain,
  Crown,
  Flame,
  Globe
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
      icon: <Rocket className="w-8 h-8" />,
      emoji: "🌊",
      title: "You're About to See the Future",
      subtitle: "Before everyone else does 👀",
      description: "Welcome to the inner circle. While others scroll mindlessly, you're about to predict what they'll be obsessed with next week.",
      features: [
        "🔮 Spot trends 2-3 weeks early",
        "💎 Join the top 1% of cultural predictors",
        "🏆 Turn your instincts into credibility"
      ],
      vibe: "Every cultural revolution starts with someone who saw it coming. That's you now.",
      action: null
    },
    {
      icon: <Eye className="w-8 h-8" />,
      emoji: "🎯",
      title: "Become a Cultural Prophet",
      subtitle: "They'll ask how you always know",
      description: "Drop trends into our system. Watch them explode. Say \"called it\" with receipts. It's that simple.",
      features: [
        "📸 Capture trends in seconds",
        "⚡ Instant validation from the community",
        "📈 Watch your predictions go viral"
      ],
      vibe: "That TikTok sound that's everywhere now? You could've called it 3 weeks ago. Next time, you will.",
      action: { label: "Start Hunting Trends →", href: "/spot" }
    },
    {
      icon: <Brain className="w-8 h-8" />,
      emoji: "🔥",
      title: "Predict the Next Main Character",
      subtitle: "Your feed is tomorrow's timeline",
      description: "Vote on what's about to blow up. Get it right, stack XP. Get it REALLY right? Welcome to the leaderboard.",
      features: [
        "🌊 Wave = Next viral sensation",
        "🔥 Fire = It's heating up",
        "💀 Dead = Already over (you knew first)"
      ],
      vibe: "While they're catching on, you're already onto the next thing. That's the power move.",
      action: { label: "Make Your First Prediction →", href: "/predictions" }
    },
    {
      icon: <Crown className="w-8 h-8" />,
      emoji: "👑",
      title: "Rise Through the Ranks",
      subtitle: "From Observer to Oracle",
      description: "15 levels of cultural mastery. Each level proves you see what others miss. At the top? You're literally shaping culture.",
      features: [
        "🎖️ Unlock elite predictor status",
        "💰 Monthly prize pools for top spotters",
        "🌟 Verified badges that actually mean something"
      ],
      vibe: "Imagine having \"Called Winter Arc trend 3 weeks early\" on your profile. That's currency.",
      action: { label: "Check Your Stats →", href: "/dashboard" }
    },
    {
      icon: <Flame className="w-8 h-8" />,
      emoji: "⚡",
      title: "Ready to Change the Game?",
      subtitle: "The wave starts with you",
      description: "This isn't about following trends. It's about knowing them before they exist. It's about being the one who says \"first\" and means it.",
      features: [
        "🚀 Daily challenges to test your instincts",
        "🏅 Compete with culture's sharpest minds",
        "📱 Real influence, not just followers"
      ],
      vibe: "Your friends will wonder how you always know what's next. Let them wonder.",
      action: { label: "Let's Go →", href: "/predictions" }
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-purple-500/20"
        >
          {/* Animated background effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-blue-600/20 animate-pulse" />
          </div>

          {/* Header */}
          <div className="relative bg-black/40 backdrop-blur-sm border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {steps.map((_, index) => (
                    <motion.div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentStep 
                          ? 'w-8 bg-gradient-to-r from-purple-400 to-blue-400' 
                          : index < currentStep 
                          ? 'w-1.5 bg-purple-400/60' 
                          : 'w-1.5 bg-white/20'
                      }`}
                      animate={{
                        scale: index === currentStep ? [1, 1.2, 1] : 1
                      }}
                      transition={{
                        duration: 2,
                        repeat: index === currentStep ? Infinity : 0
                      }}
                    />
                  ))}
                </div>
                <div className="text-sm font-medium text-purple-300">
                  {currentStep + 1} / {steps.length}
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/10 rounded-lg transition-all hover:rotate-90 duration-300"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 25 }}
                className="space-y-6"
              >
                {/* Icon and Emoji */}
                <div className="flex items-center justify-center">
                  <motion.div 
                    className="relative"
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-50" />
                    <div className="relative bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-4 rounded-full border border-purple-400/30">
                      {currentStepData.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 text-2xl animate-bounce">
                      {currentStepData.emoji}
                    </span>
                  </motion.div>
                </div>

                {/* Title and Subtitle */}
                <div className="text-center space-y-2">
                  <motion.h2 
                    className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent"
                    animate={{ 
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                    }}
                    transition={{ 
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{ backgroundSize: "200% 200%" }}
                  >
                    {currentStepData.title}
                  </motion.h2>
                  <p className="text-purple-300 font-medium text-lg">
                    {currentStepData.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-white/80 text-center leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Features */}
                <div className="space-y-3">
                  {currentStepData.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 text-white/70"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ 
                          delay: index * 0.2,
                          duration: 0.5
                        }}
                      >
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </motion.div>
                      <span className="text-sm">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Vibe text */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-xl" />
                  <div className="relative bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-400/20">
                    <p className="text-sm text-purple-200 italic leading-relaxed">
                      "{currentStepData.vibe}"
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                {currentStepData.action && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center"
                  >
                    <Link href={currentStepData.action.href}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-full shadow-lg hover:shadow-purple-500/25 transition-all"
                        onClick={handleDismiss}
                      >
                        {currentStepData.action.label}
                      </motion.button>
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="relative px-8 pb-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  currentStep === 0
                    ? 'opacity-30 cursor-not-allowed text-white/50'
                    : 'hover:bg-white/10 text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </button>

              <div className="flex gap-4">
                {currentStep === steps.length - 1 ? (
                  <motion.button
                    onClick={handleDismiss}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all"
                  >
                    Start Predicting 🚀
                  </motion.button>
                ) : (
                  <>
                    <button
                      onClick={handleDismiss}
                      className="px-4 py-2 text-white/60 hover:text-white/80 transition-colors text-sm"
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                      className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20"
                    >
                      <span className="text-sm font-medium">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
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
    "🔥 Hot tip: Trends peak 2-3 weeks after discovery. Time your predictions!",
    "💎 Pro move: Check what's trending in Asia - it hits the West 10-14 days later",
    "🎯 Accuracy hack: If Gen Z loves it ironically, it's about to go mainstream",
    "⚡ Quick wins: Morning submissions get 3x more validations",
    "🌊 Wave spotting: Look for sounds with <1000 uses but growing 100% daily"
  ];

  const [currentTip] = useState(() => Math.floor(Math.random() * tips.length));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-purple-500/20 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
          <Zap className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/80">{tips[currentTip]}</p>
        </div>
      </div>
    </motion.div>
  );
}
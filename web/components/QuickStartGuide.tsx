'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X,
  TrendingUp,
  Target,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Eye,
  Zap,
  Rocket,
  Star,
  Award,
  ArrowRight,
  MousePointer
} from 'lucide-react';
import Link from 'next/link';

interface QuickStartGuideProps {
  onDismiss?: () => void;
}

export default function QuickStartGuide({ onDismiss }: QuickStartGuideProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const handleDismiss = () => {
    setIsVisible(false);
    // Save to localStorage that user has seen the guide
    localStorage.setItem('hasSeenQuickStart', 'true');
    onDismiss?.();
  };

  const steps = [
    {
      icon: <Rocket className="w-10 h-10" />,
      emoji: "🚀",
      title: "Welcome to WaveSight!",
      subtitle: "Your radar for what's next",
      description: "Discover trends before they explode. Be ahead of the curve. Get rewarded for your insights.",
      highlights: [
        "Spot emerging trends",
        "Make predictions",
        "Earn XP & level up"
      ],
      action: null,
      color: "from-indigo-600 via-purple-600 to-pink-600",
      bgPattern: "bg-gradient-to-br",
      animation: "bounce"
    },
    {
      icon: <Eye className="w-10 h-10" />,
      emoji: "👁️",
      title: "Become a Trend Spotter",
      subtitle: "Your eyes on the internet",
      description: "Found something catching fire? Share it with the community and earn instant rewards.",
      highlights: [
        "Share trending content",
        "Get 10+ XP per submission",
        "Build your reputation"
      ],
      action: { label: "Start Spotting", href: "/spot", icon: <MousePointer className="w-4 h-4" /> },
      color: "from-blue-600 via-cyan-600 to-teal-600",
      bgPattern: "bg-gradient-to-tr",
      animation: "pulse"
    },
    {
      icon: <Target className="w-10 h-10" />,
      emoji: "🎯",
      title: "Predict the Future",
      subtitle: "Test your trend intuition",
      description: "Vote on which trends will explode and which will flop. Accurate predictions = bigger rewards.",
      highlights: [
        "Vote on community trends",
        "20+ XP for correct predictions",
        "Climb the leaderboard"
      ],
      action: { label: "Make Predictions", href: "/predictions", icon: <ArrowRight className="w-4 h-4" /> },
      color: "from-emerald-600 via-green-600 to-teal-600",
      bgPattern: "bg-gradient-to-bl",
      animation: "spin"
    },
    {
      icon: <Award className="w-10 h-10" />,
      emoji: "🏆",
      title: "Rise Through the Ranks",
      subtitle: "From Observer to Legend",
      description: "Progress through 15 unique levels. Unlock exclusive perks, multipliers, and recognition.",
      highlights: [
        "15 progression levels",
        "XP multipliers up to 3x",
        "Exclusive badges & perks"
      ],
      action: { label: "View Your Progress", href: "/dashboard", icon: <Star className="w-4 h-4" /> },
      color: "from-amber-600 via-orange-600 to-red-600",
      bgPattern: "bg-gradient-to-tl",
      animation: "bounce"
    }
  ];

  const currentStepData = steps[currentStep];

  // Auto-advance timer
  useEffect(() => {
    if (isAutoPlaying && currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 5000);
      return () => clearTimeout(timer);
    } else if (isAutoPlaying && currentStep === steps.length - 1) {
      setIsAutoPlaying(false);
    }
  }, [currentStep, isAutoPlaying, steps.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        setIsAutoPlaying(false);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(currentStep - 1);
        setIsAutoPlaying(false);
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Background gradient animation */}
          <div className={`absolute inset-0 ${currentStepData.bgPattern} ${currentStepData.color} opacity-90`}>
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* Animated background shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ 
                x: [0, 100, 0],
                y: [0, -100, 0],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                x: [0, -100, 0],
                y: [0, 100, 0],
                rotate: [360, 180, 0]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl"
            />
          </div>

          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all group"
          >
            <X className="w-5 h-5 text-white/80 group-hover:text-white" />
          </motion.button>

          {/* Step indicator */}
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-xs font-medium text-white/80">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
            <motion.div
              className="h-full bg-white/80"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>

          {/* Progress dots */}
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
            {steps.map((_, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCurrentStep(index);
                  setIsAutoPlaying(false);
                }}
                className="relative group"
              >
                <motion.div
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? 'w-8 bg-white' 
                      : index < currentStep 
                      ? 'bg-white/60 hover:bg-white/80' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {index === 0 ? 'Welcome' : index === 1 ? 'Spot' : index === 2 ? 'Predict' : 'Level Up'}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 p-8 pt-24 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center"
              >
                {/* Icon with animation */}
                <motion.div 
                  className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl mb-6"
                  animate={
                    currentStepData.animation === 'bounce' ? { y: [0, -10, 0] } :
                    currentStepData.animation === 'pulse' ? { scale: [1, 1.1, 1] } :
                    currentStepData.animation === 'spin' ? { rotate: [0, 360] } :
                    {}
                  }
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="text-4xl">{currentStepData.emoji}</span>
                </motion.div>
                
                {/* Title and subtitle */}
                <motion.h2 
                  className="text-3xl font-bold text-white mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {currentStepData.title}
                </motion.h2>
                
                <motion.p 
                  className="text-lg text-white/80 mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentStepData.subtitle}
                </motion.p>
                
                <motion.p 
                  className="text-white/70 mb-6 leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {currentStepData.description}
                </motion.p>

                {/* Highlights */}
                <motion.div 
                  className="space-y-2 mb-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {currentStepData.highlights.map((highlight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="flex items-center justify-center gap-2 text-white/80"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm">{highlight}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center mt-8">
              {currentStep > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setCurrentStep(currentStep - 1);
                    setIsAutoPlaying(false);
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all text-white font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </motion.button>
              )}

              {currentStep < steps.length - 1 ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <>
                  {currentStepData.action && (
                    <Link
                      href={currentStepData.action.href}
                      onClick={handleDismiss}
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
                      >
                        {currentStepData.action.icon}
                        {currentStepData.action.label}
                      </motion.button>
                    </Link>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDismiss}
                    className="px-6 py-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all text-white font-medium"
                  >
                    Let's Go!
                  </motion.button>
                </>
              )}
            </div>
          </div>

          {/* Bottom tips */}
          <div className="relative z-10 px-8 pb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3">
              <p className="text-xs text-white/60 text-center">
                {currentStep === 0 && "💡 Press arrow keys to navigate • ESC to close"}
                {currentStep === 1 && "💡 The best spotters find trends with < 1000 views"}
                {currentStep === 2 && "💡 Prediction accuracy unlocks higher XP multipliers"}
                {currentStep === 3 && "💡 Top rankers get exclusive access to beta features"}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Minimal version removed - no longer showing banner to returning users
export function MiniQuickStart() {
  return null;
}
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X,
  TrendingUp,
  Target,
  Sparkles,
  ChevronRight,
  Eye,
  Zap
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
    // Save to localStorage that user has seen the guide
    localStorage.setItem('hasSeenQuickStart', 'true');
    onDismiss?.();
  };

  const steps = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Welcome to WaveSight! 🌊",
      description: "Spot trends early. Predict what's next. Earn rewards.",
      action: null,
      color: "from-blue-500 to-purple-500"
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "Spot Trends",
      description: "See something trending? Drop a link or describe it. Earn 10 XP instantly.",
      action: { label: "Start Spotting", href: "/spot" },
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Make Predictions",
      description: "Vote on community trends. Will they blow up or flop? Earn 20 XP when you're right.",
      action: { label: "Predict Now", href: "/predictions" },
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Level Up",
      description: "Progress through 15 levels from Observer to Legend. Unlock multipliers and perks.",
      action: { label: "View Dashboard", href: "/dashboard" },
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const currentStepData = steps[currentStep];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          layoutId="quickstart"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/80 hover:bg-white/90 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* Progress dots */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-8 bg-white' 
                    : index < currentStep 
                    ? 'bg-white/60' 
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className={`bg-gradient-to-br ${currentStepData.color} p-8 pt-16 text-white`}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                {currentStepData.icon}
              </div>
              
              <h2 className="text-2xl font-bold mb-3">
                {currentStepData.title}
              </h2>
              
              <p className="text-white/90 mb-6">
                {currentStepData.description}
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                )}

                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-white/90 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-3">
                    {currentStepData.action && (
                      <Link
                        href={currentStepData.action.href}
                        onClick={handleDismiss}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-white/90 transition-colors"
                      >
                        {currentStepData.action.label}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={handleDismiss}
                      className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      Got it!
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Quick tips at bottom */}
          {currentStep === 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-600 text-center">
                💡 <strong>Pro tip:</strong> The earlier you spot a trend, the more you earn!
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Minimal version for returning users
export function MiniQuickStart() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show mini guide if user hasn't submitted a trend yet
    const hasSubmitted = localStorage.getItem('hasSubmittedTrend');
    if (!hasSubmitted) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">Ready to spot your first trend?</p>
            <p className="text-sm text-white/80">Drop a link or describe what you're seeing</p>
          </div>
        </div>
        <Link
          href="/spot"
          className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
        >
          Start Spotting
        </Link>
      </div>
    </motion.div>
  );
}
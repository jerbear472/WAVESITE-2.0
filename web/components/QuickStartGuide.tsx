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
  CheckCircle
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
      title: "Welcome to WaveSight",
      subtitle: "Your professional trend intelligence platform",
      description: "Identify emerging trends before they reach mainstream awareness. Build your reputation as an early adopter and trend analyst.",
      features: [
        "Real-time trend discovery",
        "Data-driven predictions",
        "Performance tracking"
      ],
      action: null
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Trend Discovery",
      subtitle: "Identify what's next",
      description: "Submit emerging trends from across the internet. Our algorithm validates authenticity and tracks growth patterns.",
      features: [
        "Submit trending content",
        "Earn 10+ XP per validated submission",
        "Build credibility score"
      ],
      action: { label: "Start Discovering", href: "/spot" }
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Predictive Analytics",
      subtitle: "Test your market intuition",
      description: "Analyze community-submitted trends and predict their trajectory. Accurate predictions increase your influence score.",
      features: [
        "Vote on trend trajectories",
        "20+ XP for accurate predictions",
        "Performance analytics"
      ],
      action: { label: "View Predictions", href: "/predictions" }
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Professional Growth",
      subtitle: "Advance your expertise",
      description: "Progress through 15 professional levels. Each tier unlocks enhanced capabilities and recognition.",
      features: [
        "15-tier progression system",
        "Performance multipliers",
        "Professional badges"
      ],
      action: { label: "View Dashboard", href: "/dashboard" }
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
          className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200">
              <motion.div
                className="h-full bg-gray-900"
                initial={{ width: "0%" }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ type: "tween", duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon and titles */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-700">
                      {currentStepData.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {currentStepData.title}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {currentStepData.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {currentStepData.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-gray-600"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentStep 
                        ? 'w-6 bg-gray-900' 
                        : index < currentStep 
                        ? 'bg-gray-400' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                )}

                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    {currentStepData.action && (
                      <Link
                        href={currentStepData.action.href}
                        onClick={handleDismiss}
                      >
                        <button className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                          {currentStepData.action.label}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                    )}
                    <button
                      onClick={handleDismiss}
                      className="px-5 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer tip */}
          <div className="px-8 pb-6">
            <div className="text-xs text-gray-500 text-center">
              Use arrow keys to navigate • Press ESC to close
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
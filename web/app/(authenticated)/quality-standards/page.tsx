'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Star, TrendingUp, 
  DollarSign, AlertTriangle, Users, Car, Trophy, Shield, 
  CheckCircle, XCircle, Brain, Target, Award
} from 'lucide-react';

const slides = [
  {
    id: '1',
    title: 'WaveSight',
    subtitle: 'Digital Intelligence Standards',
    description: 'We\'re building a network of digital journalists who can identify trends that move markets.',
    details: [
      { icon: '📰', text: 'Digital journalism meets business intelligence' },
      { icon: '🎯', text: 'Your insights inform Fortune 500 decisions' },
      { icon: '💰', text: 'Top analysts earn $500-1000 monthly' },
      { icon: '🏆', text: 'Merit-based compensation structure' }
    ],
    gradient: ['#1a1a2e', '#16213e'],
    icon: '📊',
    category: 'Mission'
  },
  {
    id: '2',
    title: 'Performance Metrics',
    subtitle: 'Quality Over Quantity',
    description: 'Your accuracy score reflects the business value of your intelligence.',
    details: [
      { icon: '📈', text: '90%+ accuracy: Enterprise-grade analyst', color: 'text-green-400' },
      { icon: '✓', text: '80-90%: Verified intelligence contributor', color: 'text-blue-400' },
      { icon: '📝', text: '70-80%: Development needed', color: 'text-yellow-400' },
      { icon: '⚡', text: 'Below 70%: Training required', color: 'text-orange-400' }
    ],
    gradient: ['#0f3460', '#16213e'],
    icon: '📊',
    category: 'Standards'
  },
  {
    id: '3',
    title: 'Intelligence Writing',
    subtitle: 'Business Journalism Standards',
    description: 'Write intelligence that C-suite executives will act on.',
    details: [
      { icon: '❌', text: 'Amateur: "funny video trending"', color: 'text-red-400' },
      { icon: '✅', text: 'Professional: "Gen Z workforce exodus from fast fashion"', color: 'text-green-400' },
      { icon: '🎯', text: 'Specify WHO, WHAT, WHERE, WHY, and IMPACT' },
      { icon: '💡', text: 'Think like a business journalist, not a social media user' }
    ],
    gradient: ['#1a1a2e', '#0f3460'],
    icon: '✍️',
    category: 'Writing'
  },
  {
    id: '4',
    title: 'Editorial Review',
    subtitle: 'Peer Validation System',
    description: 'Three fellow analysts review each submission for business relevance.',
    details: [
      { icon: '📝', text: '3 approvals: Publication-ready intelligence', color: 'text-green-400' },
      { icon: '✅', text: '2 approvals: Solid analysis', color: 'text-blue-400' },
      { icon: '🔍', text: '1 approval: Needs refinement', color: 'text-yellow-400' },
      { icon: '🚫', text: '0 approvals: Does not meet standards', color: 'text-red-400' }
    ],
    gradient: ['#16213e', '#0f3460'],
    icon: '🔍',
    category: 'Review'
  },
  {
    id: '5',
    title: 'Analyst Agreement',
    subtitle: 'Professional Standards',
    description: 'You\'re joining a network of serious digital intelligence professionals.',
    details: [
      { icon: '💼', text: 'Provide actionable business intelligence' },
      { icon: '🎯', text: 'Maintain journalistic integrity' },
      { icon: '📊', text: 'Accept merit-based compensation' },
      { icon: '🔒', text: 'Protect platform credibility' }
    ],
    gradient: ['#0f3460', '#16213e'],
    icon: '🤝',
    category: 'Agreement'
  },
  {
    id: '6',
    title: 'Compensation Structure',
    subtitle: 'Merit-Based Earnings',
    description: 'Top digital journalists earn professional rates.',
    details: [
      { icon: '📝', text: 'Entry: $0.25/insight (building portfolio)' },
      { icon: '📈', text: 'Verified: $0.37+/insight (proven analyst)' },
      { icon: '🎯', text: 'Elite: $0.50+ base (trusted intelligence)' },
      { icon: '🏆', text: 'Master: $0.75+ base (industry expert)' }
    ],
    gradient: ['#1a1a2e', '#16213e'],
    icon: '💵',
    category: 'Compensation'
  },
  {
    id: '7',
    title: 'Quality Assurance',
    subtitle: 'Editorial Standards',
    description: 'We maintain publication-quality standards through peer review.',
    details: [
      { icon: '📝', text: '75%: Editorial guidance provided' },
      { icon: '🔍', text: '70%: Additional training resources' },
      { icon: '📚', text: '65%: Mentorship program required' },
      { icon: '🚫', text: '60%: Not meeting publication standards' }
    ],
    gradient: ['#16213e', '#0f3460'],
    icon: '📋',
    category: 'Quality'
  },
  {
    id: '8',
    title: 'Join Our Network',
    subtitle: 'Digital Intelligence Professionals',
    description: 'Become a trusted source of business intelligence.',
    details: [
      { icon: '💼', text: 'Professional digital journalists earn $500-1000/month' },
      { icon: '🌐', text: 'Your insights reach Fortune 500 decision-makers' },
      { icon: '📈', text: 'Build a portfolio of business intelligence' },
      { icon: '🏆', text: 'Join an elite network of digital analysts' }
    ],
    gradient: ['#1a1a2e', '#0f3460'],
    icon: '🌐',
    category: 'Network'
  },
];

export default function QualityStandardsPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Training</span>
            </button>
            
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold text-white">WaveSight Quality Control</h1>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-white/60 mb-2">
              <span>Slide {currentSlide + 1} of {slides.length}</span>
              <span>{Math.round(((currentSlide + 1) / slides.length) * 100)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6"
          >
            <div className="w-full max-w-5xl">
              {/* Category Badge */}
              <motion.div 
                className="text-center mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-semibold text-white/80 border border-white/20">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></span>
                  {currentSlideData.category}
                </span>
              </motion.div>

              {/* Main Card */}
              <motion.div 
                className="relative bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${currentSlideData.gradient[0]}15, ${currentSlideData.gradient[1]}15)`,
                  boxShadow: `0 25px 50px -12px ${currentSlideData.gradient[0]}25`
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <div 
                    className="w-full h-full rounded-full blur-xl"
                    style={{ background: `linear-gradient(135deg, ${currentSlideData.gradient[0]}, ${currentSlideData.gradient[1]})` }}
                  />
                </div>
                
                <div className="relative p-8 md:p-12">
                  {/* Header Section */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      {/* Icon */}
                      <motion.div 
                        className="relative"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div 
                          className="w-16 h-16 rounded-xl flex items-center justify-center border border-white/20"
                          style={{
                            background: `linear-gradient(135deg, ${currentSlideData.gradient[0]}, ${currentSlideData.gradient[1]})`
                          }}
                        >
                          <span className="text-3xl">{currentSlideData.icon}</span>
                        </div>
                      </motion.div>
                      
                      {/* Title Section */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <h2 className="text-2xl md:text-3xl font-light text-white/90 mb-1 tracking-wide">
                          {currentSlideData.title}
                        </h2>
                        <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                          {currentSlideData.subtitle}
                        </h3>
                      </motion.div>
                    </div>
                    
                    {/* Slide Counter */}
                    <motion.div 
                      className="text-right text-white/60"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="text-sm font-semibold">{currentSlide + 1}</div>
                      <div className="text-xs">of {slides.length}</div>
                    </motion.div>
                  </div>

                  {/* Description */}
                  <motion.div 
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <p className="text-lg text-white/90 leading-relaxed">
                        {currentSlideData.description}
                      </p>
                    </div>
                  </motion.div>

                  {/* Details/Features */}
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {currentSlideData.details?.map((detail, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <span className="text-xl">
                          {detail.icon}
                        </span>
                        <span className={`text-sm font-medium ${detail.color || 'text-white/80'}`}>
                          {detail.text}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Enhanced Navigation Buttons */}
        <div className="absolute inset-y-0 left-4 flex items-center">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`p-3 rounded-xl transition-all duration-200 backdrop-blur-sm border ${
              currentSlide === 0
                ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/10'
                : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 hover:scale-110'
            }`}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="absolute inset-y-0 right-4 flex items-center">
          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className={`p-3 rounded-xl transition-all duration-200 backdrop-blur-sm border ${
              currentSlide === slides.length - 1
                ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/10'
                : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 hover:scale-110'
            }`}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Enhanced Bottom Navigation */}
      <div className="sticky bottom-0 bg-gradient-to-t from-gray-900/95 via-gray-900/80 to-transparent backdrop-blur-2xl border-t border-white/10 p-6 shadow-2xl">
        <div className="max-w-5xl mx-auto">
          {/* Enhanced Slide Indicators */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-200 ${
                    index === currentSlide
                      ? 'w-8 h-3 bg-cyan-400 rounded-full'
                      : 'w-3 h-3 bg-white/30 rounded-full hover:bg-white/50'
                  }`}
                  title={slide.category}
                />
              ))}
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex justify-center items-center gap-4">
            {/* Previous Button */}
            {currentSlide > 0 && (
              <motion.button
                onClick={prevSlide}
                className="group flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold backdrop-blur-sm border border-white/20 hover:border-white/30 transition-all duration-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                Previous
              </motion.button>
            )}

            {/* Main Action Button */}
            {currentSlide === slides.length - 1 ? (
              <motion.button
                onClick={() => router.push('/cultural-analyst-training')}
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold text-lg shadow-2xl hover:shadow-green-500/25 transition-all duration-300"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <CheckCircle className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                Back to Training
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
            ) : (
              <motion.button
                onClick={nextSlide}
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-lg shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Continue
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
            )}
          </div>

          {/* Progress Text */}
          <motion.div 
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-sm text-white/60 font-medium">
              Quality Standard {currentSlide + 1} of {slides.length} • 
              <span className="text-cyan-400 ml-1">
                {Math.round(((currentSlide + 1) / slides.length) * 100)}% Complete
              </span>
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
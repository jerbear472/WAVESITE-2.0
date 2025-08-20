'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, DollarSign, Target, CheckCircle, XCircle, Award,
  ChevronRight, Brain, Clock, Zap, AlertCircle, Users, BarChart3,
  Sparkles, Trophy, ArrowRight, Info, BookOpen, Timer, Star,
  TrendingDown, Building2, ShieldCheck, Rocket, Coins, Check, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "Your multipliers come from:",
    options: [
      "Just submitting lots of trends",
      "Tier level + daily streak + session streak"
    ],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "To reach Elite tier you need:",
    options: [
      "Just time on platform",
      "High accuracy + 200 quality trends"
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "Bounties pay:",
    options: [
      "Based on your multipliers",
      "Flat $3 regardless of tier"
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    question: "Daily streak requires:",
    options: [
      "10 trends per day",
      "At least 1 trend per day"
    ],
    correctAnswer: 1
  },
  {
    id: 5,
    question: "Maximum possible per trend:",
    options: [
      "$4.69 with all multipliers",
      "$10 if it goes viral"
    ],
    correctAnswer: 0
  }
];

export default function CulturalAnalystTraining() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentModule, setCurrentModule] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: number}>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [hasPassedTraining, setHasPassedTraining] = useState(false);

  // Check if user has already completed training
  useEffect(() => {
    checkTrainingStatus();
  }, [user]);

  const checkTrainingStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('has_completed_training')
      .eq('id', user.id)
      .single();
    
    if (data?.has_completed_training) {
      setHasPassedTraining(true);
    }
  };

  const handleQuizSubmit = async () => {
    let score = 0;
    quizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correctAnswer) {
        score++;
      }
    });
    
    setQuizScore(score);
    setShowResults(true);
    
    // If passed (4/5 or better), mark training as complete
    if (score >= 4 && user) {
      await supabase
        .from('profiles')
        .update({ 
          has_completed_training: true,
          training_completed_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      setHasPassedTraining(true);
    }
  };

  const handleStartEarning = () => {
    router.push('/spot');
  };

  const handleSkipToQuiz = () => {
    setCurrentModule(8);
    setShowQuiz(true);
  };

  // Welcome Screen
  if (currentModule === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
            >
              <Brain className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
              Become a Cultural Analyst
            </h1>
            
            <p className="text-xl text-blue-200 text-center mb-8">
              Learn to spot trends that matter. Start at <span className="font-bold text-green-400">$0.25</span>, 
              earn up to <span className="font-bold text-green-400">$4.69</span> per insight.
            </p>
            
            <div className="bg-white/5 rounded-xl p-4 mb-8">
              <p className="text-cyan-300 text-center text-lg">
                ⏱️ Training takes 5 minutes
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setCurrentModule(1)}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Start Training
                </button>
                
                <button
                  onClick={handleSkipToQuiz}
                  className="flex-1 bg-white/10 backdrop-blur text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" />
                  Skip to Quiz
                </button>
              </div>
              
              {/* Link to Quality Control Guide */}
              <div className="mt-2 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">WaveSight Quality Control</h3>
                    <p className="text-blue-200 text-sm">Professional standards and earning requirements</p>
                  </div>
                  <button
                    onClick={() => router.push('/quality-standards')}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2 px-4 rounded-lg font-semibold text-sm hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    View Standards
                  </button>
                </div>
              </div>
            </div>
            
            {hasPassedTraining && (
              <div className="mt-6 p-4 bg-green-500/20 rounded-xl border border-green-400/30">
                <p className="text-green-300 text-center">
                  ✅ You've already completed training! Feel free to review or start earning.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Module 1: Think Like a Brand
  if (currentModule === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 1 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Think Like a Brand</h2>
            </div>
            
            <div className="mb-8">
              <div className="text-xl font-semibold text-blue-600 mb-4">
                Would a company pay to know this?
              </div>
              <p className="text-gray-700 text-lg">
                Every trend you spot should reveal money, opportunity, or danger.
              </p>
            </div>
            
            <div className="space-y-6">
              {[
                {
                  bad: "Funny TikTok",
                  good: "Gen Z destroying Stanley cups to protest lead concerns",
                  why: "Brand crisis alert, $750M business at risk"
                },
                {
                  bad: "New makeup style",
                  good: "Sephora employees filming customers stealing testers",
                  why: "Retail security issue, policy change needed"
                },
                {
                  bad: "People posting food",
                  good: "Millennials boycotting Starbucks, posting Dunkin receipts instead",
                  why: "Market share shift, competitor gaining"
                },
                {
                  bad: "Dance challenge",
                  good: "Hospital workers doing 'I quit' dances in scrubs",
                  why: "Healthcare crisis, recruitment emergency"
                },
                {
                  bad: "Cute pet videos",
                  good: "Pet owners canceling Chewy subscriptions for local stores",
                  why: "E-commerce disruption, retention crisis"
                }
              ].map((example, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gray-50 rounded-xl p-4"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <div className="flex items-center gap-2 mb-1">
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-red-600 font-semibold text-sm">BAD</span>
                      </div>
                      <p className="text-gray-700">{example.bad}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-semibold text-sm">GOOD</span>
                      </div>
                      <p className="text-gray-700">{example.good}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 bg-blue-50 rounded-lg p-3">
                    <span className="text-blue-600 font-semibold text-sm">Why valuable: </span>
                    <span className="text-gray-700">{example.why}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
              <p className="text-xl font-bold text-purple-900 text-center">
                The Test: Would a CEO call an emergency meeting about this?
              </p>
            </div>
            
            <button
              onClick={() => setCurrentModule(2)}
              className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Module 2: Write Headlines That Sell
  if (currentModule === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 2 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full ${i <= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Write Headlines That Sell</h2>
            </div>
            
            <div className="mb-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-gray-800 text-lg">
                Your headline appears on <span className="font-bold">live dashboards</span> watched by Fortune 500 companies.
              </p>
            </div>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Formula: [Who] + [Action] + [Specific Trend]
              </h3>
              
              <div className="space-y-3">
                {[
                  "Gen Z abandoning Instagram for BeReal",
                  "Moms turning Costco hauls into aesthetic content",
                  "Gamers using work laptops for streaming",
                  "Teachers creating TikTok lectures during class",
                  "Doctors warning about DIY skincare trends"
                ].map((headline, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-l-4 border-blue-500"
                  >
                    <p className="text-gray-800 font-medium">{headline}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-green-600" />
                <h4 className="text-lg font-bold text-gray-900">10-Second Rule</h4>
              </div>
              <p className="text-gray-700">
                If it takes longer than 10 seconds to write, you're overthinking.
              </p>
            </div>
            
            <button
              onClick={() => setCurrentModule(3)}
              className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Module 3: How You Earn More
  if (currentModule === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 3 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full ${i <= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">How You Earn More</h2>
            </div>
            
            <div className="mb-8">
              <div className="text-center p-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl mb-6">
                <p className="text-3xl font-bold text-green-800 mb-2">Start at $0.25</p>
                <p className="text-xl text-green-700">Multiply your way up to $4.69!</p>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Multipliers Stack:</h3>
              
              <div className="space-y-4">
                {/* Tier Level */}
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-purple-600" />
                    <h4 className="font-bold text-gray-900">Tier Level (up to 3x)</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Learning</p>
                      <p className="font-bold text-gray-900">1x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Verified</p>
                      <p className="font-bold text-purple-600">1.5x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Elite</p>
                      <p className="font-bold text-purple-600">2x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Master</p>
                      <p className="font-bold text-purple-600">3x</p>
                    </div>
                  </div>
                </div>
                
                {/* Daily Streak */}
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-orange-600" />
                    <h4 className="font-bold text-gray-900">Daily Streak (up to 2.5x)</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">3 days</p>
                      <p className="font-bold text-orange-600">1.25x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">7 days</p>
                      <p className="font-bold text-orange-600">1.5x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">14 days</p>
                      <p className="font-bold text-orange-600">2x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">30+ days</p>
                      <p className="font-bold text-orange-600">2.5x</p>
                    </div>
                  </div>
                </div>
                
                {/* Session Streak */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-gray-900">Session Streak (up to 2.5x)</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">5 trends</p>
                      <p className="font-bold text-blue-600">1.25x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">10 trends</p>
                      <p className="font-bold text-blue-600">1.5x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">20 trends</p>
                      <p className="font-bold text-blue-600">2x</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">30+ trends</p>
                      <p className="font-bold text-blue-600">2.5x</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl text-center">
                <p className="text-2xl font-bold text-gray-900">
                  Maximum per trend: <span className="text-green-600">$4.69</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ($0.25 × 3 × 2.5 × 2.5)
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setCurrentModule(4)}
              className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Module 4: Build Your Multipliers
  if (currentModule === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 4 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full ${i <= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Build Your Multipliers</h2>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-6">How to Level Up Fast:</h3>
            
            <div className="space-y-6">
              {/* Tier Progression */}
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  Tier Progression
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-700">
                      <span className="font-semibold">Learning → Verified (1.5x):</span> Submit 50 quality trends
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-700">
                      <span className="font-semibold">Verified → Elite (2x):</span> 90% accuracy + 200 trends
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-700">
                      <span className="font-semibold">Elite → Master (3x):</span> Top 5% of analysts
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Daily Streak Tips */}
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  Daily Streak Tips
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-gray-700">Submit at least 1 trend daily</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-gray-700">Set a reminder for same time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-gray-700">Even 1 trend keeps streak alive</p>
                  </div>
                </div>
              </div>
              
              {/* Session Streak Strategy */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-blue-600" />
                  Session Streak Strategy
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="text-gray-700">Don't stop at 4 trends (no bonus)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-gray-700">Push to 10 for 1.5x multiplier</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <p className="text-gray-700">20+ trends = maximum session bonus</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setCurrentModule(5)}
              className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Module 5: Bounty Hunting
  if (currentModule === 5) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 5 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full ${i <= 4 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Bounty Hunting = Guaranteed $3</h2>
            </div>
            
            <div className="mb-6 p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 text-center">
                Bounties pay flat $3 (no multipliers needed)
              </p>
            </div>
            
            <div className="mb-8">
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Example Bounty:</h3>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-800 font-medium mb-2">
                    "Find reactions to our Super Bowl ad"
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Fixed $3 per valid find
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Must match exactly what they want
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Include link as proof
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      First come, first served
                    </li>
                  </ul>
                </div>
              </div>
              
              <h3 className="font-bold text-gray-900 mb-4">Why bounties are valuable:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <Coins className="w-5 h-5 text-green-600 mb-2" />
                  <p className="font-semibold text-gray-900 mb-1">Guaranteed high pay</p>
                  <p className="text-sm text-gray-600">$3 per submission, no matter your tier</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <Sparkles className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="font-semibold text-gray-900 mb-1">No multipliers needed</p>
                  <p className="text-sm text-gray-600">Same pay for everyone</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <Target className="w-5 h-5 text-purple-600 mb-2" />
                  <p className="font-semibold text-gray-900 mb-1">Clear requirements</p>
                  <p className="text-sm text-gray-600">Know exactly what to look for</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <Zap className="w-5 h-5 text-orange-600 mb-2" />
                  <p className="font-semibold text-gray-900 mb-1">Instant approval</p>
                  <p className="text-sm text-gray-600">Get paid right away</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-xl">
                <p className="text-center text-gray-900">
                  <span className="font-bold text-lg">Pro Tip:</span> A 5-minute bounty paying $15 = <span className="font-bold text-green-600">$180/hour rate</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setCurrentModule(6)}
              className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Module 6: Quality Trends
  if (currentModule === 6) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 6 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full ${i <= 5 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">What Makes Quality Trends</h2>
            </div>
            
            <p className="text-lg text-gray-700 mb-6">Submit trends that matter:</p>
            
            <div className="space-y-6">
              {/* It's Spreading */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">It's Spreading</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Seeing it multiple times
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Different groups doing it
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Jumping platforms
                  </li>
                </ul>
              </div>
              
              {/* Business Impact */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Business Impact</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Affects buying behavior
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Changes brand perception
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Creates new opportunities
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Reveals problems
                  </li>
                </ul>
              </div>
              
              {/* Specific Details */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Specific Details</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    WHO exactly (demographics)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    WHAT platform
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    WHY it's happening now
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl text-center">
              <p className="text-gray-900 font-semibold">
                Quality trends = higher tier = bigger multiplier
              </p>
            </div>
            
            <button
              onClick={() => setCurrentModule(7)}
              className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Module 7: Validation Earns Extra
  if (currentModule === 7) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 7 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full ${i <= 6 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Validation Earns Extra</h2>
            </div>
            
            <div className="mb-6 p-6 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 text-center mb-2">
                Validate other trends for $0.10 each
              </p>
              <p className="text-gray-700 text-center">
                (3x bonus for bounty validations = $0.30)
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-gray-900">Approve if real and valuable</p>
                </div>
                <p className="text-gray-600 text-sm">The trend exists and would interest brands</p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="font-semibold text-gray-900">Reject if fake, old, or useless</p>
                </div>
                <p className="text-gray-600 text-sm">Not happening or no business value</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-5 h-5 text-blue-600" />
                  <p className="font-semibold text-gray-900">Takes 5 seconds per validation</p>
                </div>
                <p className="text-gray-600 text-sm">Quick decisions, fast earnings</p>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-bold text-gray-900 mb-3">Quick math:</h3>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span>20 validations</span>
                  <span className="font-bold text-green-600">= $2</span>
                </div>
                <div className="flex justify-between">
                  <span>100 validations</span>
                  <span className="font-bold text-green-600">= $10</span>
                </div>
                <div className="flex justify-between">
                  <span>Do while watching TV</span>
                  <span className="font-bold">✓</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-amber-800">
                <span className="font-bold">Important:</span> Vote honestly. Your accuracy affects your tier level.
              </p>
            </div>
            
            <button
              onClick={() => setCurrentModule(8)}
              className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Module 8: Your Earning Path
  if (currentModule === 8 && !showQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Module 8 of 8</span>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full bg-blue-600`} />
                ))}
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Your Earning Path</h2>
            </div>
            
            <div className="space-y-6">
              {/* Week 1 */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Week 1: Learning Tier</h3>
                <div className="space-y-2 text-gray-700">
                  <p>• $0.25 per trend</p>
                  <p>• Build good habits</p>
                  <p className="font-semibold text-green-600">• ~$50/week possible</p>
                </div>
              </div>
              
              {/* Week 2-4 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3">Week 2-4: Verified Tier (1.5x)</h3>
                <div className="space-y-2 text-gray-700">
                  <p>• $0.37 per trend base</p>
                  <p>• With streaks: up to $1.40</p>
                  <p className="font-semibold text-green-600">• ~$150/week possible</p>
                </div>
              </div>
              
              {/* Month 2+ */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h3 className="font-bold text-gray-900 mb-3">Month 2+: Elite Tier (2x)</h3>
                <div className="space-y-2 text-gray-700">
                  <p>• $0.50 per trend base</p>
                  <p>• With streaks: up to $3.13</p>
                  <p className="font-semibold text-green-600">• ~$300/week possible</p>
                </div>
              </div>
              
              {/* Top 5% */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                <h3 className="font-bold text-gray-900 mb-3">Top 5%: Master Tier (3x)</h3>
                <div className="space-y-2 text-gray-700">
                  <p>• $0.75 per trend base</p>
                  <p>• With max streaks: $4.69</p>
                  <p className="font-semibold text-green-600">• $500+ weekly achievable</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowQuiz(true)}
              className="mt-8 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Start Quiz
              <Trophy className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Quiz
  if (showQuiz && !showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Final Quiz</h2>
            
            <div className="space-y-6">
              {quizQuestions.map((q, index) => (
                <div key={q.id} className="bg-gray-50 rounded-xl p-6">
                  <p className="font-semibold text-gray-900 mb-4">
                    {index + 1}. {q.question}
                  </p>
                  <div className="space-y-3">
                    {q.options.map((option, optionIndex) => (
                      <button
                        key={optionIndex}
                        onClick={() => setQuizAnswers({...quizAnswers, [q.id]: optionIndex})}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          quizAnswers[q.id] === optionIndex
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            quizAnswers[q.id] === optionIndex
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {quizAnswers[q.id] === optionIndex && (
                              <Check className="w-3 h-3 text-white mx-auto" />
                            )}
                          </div>
                          <span className="text-gray-700">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleQuizSubmit}
              disabled={Object.keys(quizAnswers).length < 5}
              className={`mt-8 w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                Object.keys(quizAnswers).length >= 5
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl transform hover:scale-[1.02]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Quiz
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Results Screen
  if (showResults) {
    const passed = quizScore >= 4;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20">
            {passed ? (
              <>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Trophy className="w-12 h-12 text-white" />
                </motion.div>
                
                <h1 className="text-4xl font-bold text-white text-center mb-4">
                  🎉 You're a Certified Cultural Analyst!
                </h1>
                
                <div className="bg-white/5 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Starting Position:</h3>
                  <div className="space-y-2 text-blue-200">
                    <p>📚 Tier: Learning (1x)</p>
                    <p>🔥 Daily Streak: Day 0</p>
                    <p>📱 Session Streak: 0</p>
                    <p>💰 Current Rate: $0.25</p>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-6 mb-8">
                  <h3 className="text-xl font-bold text-white mb-4">Your First Goals:</h3>
                  <ul className="space-y-2 text-green-300">
                    <li>✓ Submit 3 quality trends today (start session streak)</li>
                    <li>✓ Come back tomorrow (start daily streak)</li>
                    <li>✓ Reach 50 trends for Verified tier</li>
                  </ul>
                </div>
                
                <p className="text-cyan-300 text-center mb-8 text-lg">
                  Remember: Consistency + Quality = Higher Earnings
                </p>
                
                <button
                  onClick={handleStartEarning}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  Start Earning
                  <Rocket className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white text-center mb-4">
                  Almost There!
                </h2>
                <p className="text-blue-200 text-center mb-6">
                  You scored {quizScore}/5. You need 4/5 to pass.
                </p>
                <button
                  onClick={() => {
                    setShowQuiz(false);
                    setShowResults(false);
                    setCurrentModule(1);
                    setQuizAnswers({});
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                >
                  Review Training & Try Again
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
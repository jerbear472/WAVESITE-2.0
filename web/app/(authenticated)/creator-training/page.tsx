'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle, 
  Award,
  ChevronRight,
  AlertTriangle,
  Zap,
  Brain,
  Users,
  DollarSign,
  ArrowRight,
  Sparkles,
  Timer,
  BarChart,
  MessageCircle,
  Music,
  Camera,
  Hash
} from 'lucide-react';

interface Module {
  id: number;
  title: string;
  icon: any;
  description: string;
  completed?: boolean;
}

const modules: Module[] = [
  { id: 1, title: "Think Like a Creator", icon: Brain, description: "Shift from viewer to creator mindset" },
  { id: 2, title: "The Creator Value Timeline", icon: Clock, description: "When trends are valuable vs worthless" },
  { id: 3, title: "5 Types of Creator Gold", icon: DollarSign, description: "What creators will pay for" },
  { id: 4, title: "The Submission Formula", icon: Target, description: "Structure that gets approved" },
  { id: 5, title: "Patterns vs One-Offs", icon: BarChart, description: "Spot scalable opportunities" },
  { id: 6, title: "Creator's Cheat Sheet", icon: Zap, description: "Daily spotting routine" },
  { id: 7, title: "Quality Signals", icon: CheckCircle, description: "High vs low value indicators" },
  { id: 8, title: "Proving Your Value", icon: Award, description: "Track and showcase wins" },
  { id: 9, title: "Platform Intelligence", icon: Hash, description: "Platform-specific signals" },
  { id: 10, title: "Final Test", icon: Target, description: "Prove you're ready" }
];

export default function CreatorTrainingPage() {
  const [currentModule, setCurrentModule] = useState(1);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: string}>({});

  const markModuleComplete = () => {
    if (!completedModules.includes(currentModule)) {
      setCompletedModules([...completedModules, currentModule]);
    }
    if (currentModule < 10) {
      setCurrentModule(currentModule + 1);
    }
  };

  const ModuleContent = ({ moduleId }: { moduleId: number }) => {
    switch (moduleId) {
      case 1:
        return <Module1 />;
      case 2:
        return <Module2 />;
      case 3:
        return <Module3 />;
      case 4:
        return <Module4 />;
      case 5:
        return <Module5 />;
      case 6:
        return <Module6 />;
      case 7:
        return <Module7 />;
      case 8:
        return <Module8 />;
      case 9:
        return <Module9 />;
      case 10:
        return <Module10 onComplete={() => setShowQuiz(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-4"
          >
            <TrendingUp className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Creator-Focused Spotter Training
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn to spot trends that creators will actually use. Think like a creator, not a viewer.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {completedModules.length}/10 Modules Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(completedModules.length / 10) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Module Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4">
              <h2 className="font-semibold text-gray-900 mb-4">Modules</h2>
              <div className="space-y-2">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const isCompleted = completedModules.includes(module.id);
                  const isCurrent = currentModule === module.id;
                  
                  return (
                    <button
                      key={module.id}
                      onClick={() => setCurrentModule(module.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isCurrent 
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md' 
                          : isCompleted
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${
                          isCurrent 
                            ? 'bg-white/20' 
                            : isCompleted 
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${
                            isCurrent ? 'text-white' : ''
                          }`}>
                            {module.title}
                          </p>
                          <p className={`text-xs ${
                            isCurrent ? 'text-white/80' : 'text-gray-500'
                          }`}>
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Module Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentModule}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ModuleContent moduleId={currentModule} />
                
                {/* Navigation Buttons */}
                {currentModule < 10 && (
                  <div className="flex justify-between mt-8">
                    <button
                      onClick={() => currentModule > 1 && setCurrentModule(currentModule - 1)}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        currentModule === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={currentModule === 1}
                    >
                      Previous Module
                    </button>
                    <button
                      onClick={markModuleComplete}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                    >
                      Complete & Continue
                      <ChevronRight className="inline-block w-5 h-5 ml-2" />
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Module 1: Think Like a Creator
function Module1() {
  const [selectedExamples, setSelectedExamples] = useState<{[key: number]: boolean}>({});
  
  const examples = [
    { id: 1, text: '"Bernie Sanders meme"', actionable: false, reason: 'Too specific, can\'t recreate' },
    { id: 2, text: '"POV format with text overlay"', actionable: true, reason: 'Format template, can copy' },
    { id: 3, text: '"Specific dance to specific song"', actionable: true, reason: 'Actionable, time-sensitive' },
    { id: 4, text: '"Climate change awareness"', actionable: false, reason: 'Too vague, no format' },
    { id: 5, text: '"Whispering introductions getting 5x engagement"', actionable: true, reason: 'Specific technique' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Brain className="w-7 h-7 text-purple-600" />
          Module 1: Think Like a Creator (Not a Viewer)
        </h2>
        <p className="text-gray-600 mb-6">
          The fundamental shift: Creators don't care what's popular NOW. They care what will be popular in 48-72 hours when their video goes live.
        </p>
      </div>

      {/* Mindset Comparison */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Viewer Mindset (Wrong)
          </h3>
          <ul className="space-y-3 text-sm text-red-700">
            <li>"This video is funny"</li>
            <li>"Everyone's talking about this"</li>
            <li>"I've seen this everywhere"</li>
            <li>"This creator is amazing"</li>
          </ul>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Creator Mindset (Right)
          </h3>
          <ul className="space-y-3 text-sm text-green-700">
            <li>"This format is getting 10x more views than usual"</li>
            <li>"Small creators using this sound are hitting 1M+ views"</li>
            <li>"This hook makes people watch 3x longer"</li>
            <li>"This technique works across niches"</li>
          </ul>
        </div>
      </div>

      {/* Interactive Exercise */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Exercise: Which trends can a creator ACT on today?
        </h3>
        <div className="space-y-3">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setSelectedExamples({...selectedExamples, [example.id]: !selectedExamples[example.id]})}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedExamples[example.id] 
                  ? example.actionable 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="font-medium">{example.text}</span>
                {selectedExamples[example.id] && (
                  <span className={`text-sm ${example.actionable ? 'text-green-600' : 'text-red-600'}`}>
                    {example.actionable ? '✓ Actionable' : '✗ Not Actionable'}
                  </span>
                )}
              </div>
              {selectedExamples[example.id] && (
                <p className="text-sm text-gray-600 mt-2">{example.reason}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Key Takeaway */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
        <h4 className="font-semibold text-yellow-900 mb-2">🎯 Core Principle</h4>
        <p className="text-yellow-800">
          Your job is to find patterns that creators can replicate, not one-time viral moments. 
          If a creator can't use it tomorrow, it's not valuable.
        </p>
      </div>
    </div>
  );
}

// Module 2: The Creator Value Timeline
function Module2() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const timeline = [
    { 
      day: -14, 
      label: 'Too Early', 
      status: 'early',
      details: ['Only 3 videos exist', 'No pattern yet', 'Creators who try look weird', "Don't submit yet"],
      color: 'gray'
    },
    { 
      day: -7, 
      label: 'Sweet Spot 🎯', 
      status: 'perfect',
      details: ['10-50 videos working', 'Pattern is clear', 'Still feels fresh', 'THIS IS WHEN TO SUBMIT'],
      color: 'green'
    },
    { 
      day: 0, 
      label: 'Mainstream', 
      status: 'late',
      details: ['Biggest creators jumping on', '1000+ videos', 'Too late for most creators', 'You missed it'],
      color: 'yellow'
    },
    { 
      day: 7, 
      label: 'Dead', 
      status: 'dead',
      details: ['Viewers sick of it', 'Algorithm deprioritizing', 'Brands trying to use it', 'Definitely too late'],
      color: 'red'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Clock className="w-7 h-7 text-purple-600" />
          Module 2: The Creator Value Timeline
        </h2>
        <p className="text-gray-600 mb-6">
          Understanding WHEN a trend is valuable is crucial. Too early and it won't work. Too late and it's worthless.
        </p>
      </div>

      {/* Interactive Timeline */}
      <div className="relative mb-8">
        <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 -translate-y-1/2"></div>
        <div className="relative flex justify-between">
          {timeline.map((point) => (
            <button
              key={point.day}
              onClick={() => setSelectedDay(point.day)}
              className="relative group"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                point.status === 'perfect' 
                  ? 'bg-green-500 text-white shadow-lg scale-110' 
                  : point.status === 'early'
                  ? 'bg-gray-400 text-white'
                  : point.status === 'late'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-red-500 text-white'
              } ${selectedDay === point.day ? 'ring-4 ring-blue-500' : ''}`}>
                <span className="font-bold">D{point.day > 0 ? '+' : ''}{point.day}</span>
              </div>
              <p className="absolute top-20 left-1/2 -translate-x-1/2 text-sm font-medium whitespace-nowrap">
                {point.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-6 mb-6 ${
            timeline.find(t => t.day === selectedDay)?.status === 'perfect'
              ? 'bg-green-50 border-2 border-green-500'
              : timeline.find(t => t.day === selectedDay)?.status === 'early'
              ? 'bg-gray-50 border-2 border-gray-400'
              : timeline.find(t => t.day === selectedDay)?.status === 'late'
              ? 'bg-yellow-50 border-2 border-yellow-500'
              : 'bg-red-50 border-2 border-red-500'
          }`}
        >
          <h3 className="font-semibold text-gray-900 mb-3">
            Day {selectedDay > 0 ? '+' : ''}{selectedDay}: {timeline.find(t => t.day === selectedDay)?.label}
          </h3>
          <ul className="space-y-2">
            {timeline.find(t => t.day === selectedDay)?.details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span className={`text-sm ${
                  timeline.find(t => t.day === selectedDay)?.status === 'perfect'
                    ? 'text-green-700 font-medium'
                    : 'text-gray-700'
                }`}>{detail}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Real Example */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Real Example: Camera Flip Transition</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-500">Day -10:</span>
            <span>One person does "camera flip transition"</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-green-600">Day -5:</span>
            <span className="font-medium">YOU SPOT IT - 20 people doing it, all getting views</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-blue-600">Day -2:</span>
            <span>Creators using WaveSight jump on it</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-yellow-600">Day 0:</span>
            <span>Goes viral everywhere</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-red-600">Day +3:</span>
            <span>Everyone's doing it, engagement drops</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Module 3: 5 Types of Creator Gold
function Module3() {
  const [expandedType, setExpandedType] = useState<number | null>(null);
  
  const creatorGold = [
    {
      id: 1,
      title: 'Format Hacks',
      value: 'Most Valuable',
      icon: Camera,
      examples: [
        'Starting videos with "nobody talks about..."',
        'Using green screen to show receipts',
        'Cutting every 0.5 seconds for retention'
      ],
      why: 'Any creator can apply to their content'
    },
    {
      id: 2,
      title: 'Audio Opportunities',
      value: 'High Value',
      icon: Music,
      examples: [
        'Song at 20K uses growing 500% daily',
        'Sound effect making videos blow up',
        'Remix that\'s outperforming original'
      ],
      why: 'First 1000 to use audio get pushed'
    },
    {
      id: 3,
      title: 'Engagement Triggers',
      value: 'High Value',
      icon: MessageCircle,
      examples: [
        'Comment your birth month and I\'ll tell you...',
        'Stitch this with your unpopular opinion',
        'Show your room and I\'ll guess your age'
      ],
      why: 'Comments = algorithm boost'
    },
    {
      id: 4,
      title: 'Platform Behaviors',
      value: 'Time-Sensitive',
      icon: Zap,
      examples: [
        'Instagram pushing 90-second Reels hard this week',
        'TikTok giving 10x reach to carousel posts',
        'YouTube Shorts with polls getting promoted'
      ],
      why: 'Algorithm advantages are temporary'
    },
    {
      id: 5,
      title: 'Niche Explosions',
      value: 'Strategic Value',
      icon: Users,
      examples: [
        'BookTok shifting from romance to horror',
        'GymTok embracing "cozy cardio"',
        'FinTok moving from crypto to budgeting'
      ],
      why: 'Creators can pivot content strategy'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-purple-600" />
          Module 3: The 5 Types of Creator Gold
        </h2>
        <p className="text-gray-600 mb-6">
          Not all trends are equal. These are the 5 types that creators will actually pay for.
        </p>
      </div>

      {/* Gold Types Grid */}
      <div className="space-y-4">
        {creatorGold.map((type) => {
          const Icon = type.icon;
          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: type.id * 0.1 }}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                expandedType === type.id 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setExpandedType(expandedType === type.id ? null : type.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    expandedType === type.id ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <Icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{type.title}</h3>
                    <p className="text-sm text-purple-600 font-medium">{type.value}</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedType === type.id ? 'rotate-90' : ''
                }`} />
              </div>
              
              {expandedType === type.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-purple-200"
                >
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Examples:</h4>
                    <ul className="space-y-2">
                      {type.examples.map((example, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-purple-500 mt-0.5" />
                          <span className="text-sm text-gray-700">{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-900">
                      Why it's valuable: <span className="text-purple-700 font-normal">{type.why}</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Module 4: The Submission Formula
function Module4() {
  const [showExample, setShowExample] = useState(false);
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Target className="w-7 h-7 text-purple-600" />
          Module 4: The Submission Formula
        </h2>
        <p className="text-gray-600 mb-6">
          Every submission needs to answer these 5 questions to provide value to creators.
        </p>
      </div>

      {/* The 5 W's */}
      <div className="space-y-4 mb-8">
        {[
          { 
            question: 'WHAT', 
            answer: 'is the trend?',
            detail: 'Be specific: "Whispering the first 3 seconds" not "ASMR content"',
            color: 'blue'
          },
          { 
            question: 'WHERE', 
            answer: 'is it working?',
            detail: 'Platform + niche: "TikTok fitness creators" not "social media"',
            color: 'green'
          },
          { 
            question: 'WHO', 
            answer: 'can use it?',
            detail: '"Any creator" vs "Only dancers" vs "Need professional equipment"',
            color: 'purple'
          },
          { 
            question: 'WHEN', 
            answer: 'will it peak?',
            detail: '"24-48 hours" vs "Building for a week" vs "Might die today"',
            color: 'yellow'
          },
          { 
            question: 'WHY', 
            answer: 'is it working?',
            detail: '"Breaks scroll pattern" or "Algorithm pushing" or "Emotional trigger"',
            color: 'red'
          }
        ].map((item, idx) => (
          <div key={idx} className={`border-l-4 border-${item.color}-500 pl-6 py-3`}>
            <h3 className="font-bold text-gray-900 text-lg">
              <span className={`text-${item.color}-600`}>{item.question}</span> {item.answer}
            </h3>
            <p className="text-gray-600 text-sm mt-1">{item.detail}</p>
          </div>
        ))}
      </div>

      {/* Example Submission */}
      <button
        onClick={() => setShowExample(!showExample)}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all mb-4"
      >
        {showExample ? 'Hide' : 'Show'} Perfect Submission Example
      </button>

      {showExample && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-500"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Perfect Submission Example:</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-bold text-blue-600">WHAT:</span>
              <span className="ml-2">Starting videos with "Things I'm gatekeeping from my boyfriend"</span>
            </div>
            <div>
              <span className="font-bold text-green-600">WHERE:</span>
              <span className="ml-2">TikTok lifestyle/relationship creators (seen 12 examples)</span>
            </div>
            <div>
              <span className="font-bold text-purple-600">WHO:</span>
              <span className="ml-2">Any creator who can do POV content</span>
            </div>
            <div>
              <span className="font-bold text-yellow-600">WHEN:</span>
              <span className="ml-2">Just starting, expect viral in 48hrs</span>
            </div>
            <div>
              <span className="font-bold text-red-600">WHY:</span>
              <span className="ml-2">Comments explode with "mine doesn't know about..."</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-300">
            <p className="text-green-700 font-medium">
              This submission would get approved instantly because it gives creators everything they need to act.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Module 5: Patterns vs One-Offs
function Module5() {
  const [selectedItems, setSelectedItems] = useState<{[key: number]: 'pattern' | 'oneoff' | null}>({});
  const [showResults, setShowResults] = useState(false);
  
  const scenarios = [
    { id: 1, text: "MrBeast's new $1M video", type: 'oneoff', reason: 'Requires massive budget' },
    { id: 2, text: 'The hook MrBeast uses in first 3 seconds', type: 'pattern', reason: 'Technique anyone can copy' },
    { id: 3, text: "Specific creator's life story", type: 'oneoff', reason: 'Personal, not replicable' },
    { id: 4, text: 'Format of telling stories in 3 parts', type: 'pattern', reason: 'Structure works for anyone' },
    { id: 5, text: 'Celebrity scandal reaction', type: 'oneoff', reason: 'News event, not trend' },
    { id: 6, text: 'Split-screen reaction format', type: 'pattern', reason: 'Format others can use' }
  ];

  const checkAnswers = () => {
    setShowResults(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <BarChart className="w-7 h-7 text-purple-600" />
          Module 5: Spotting Patterns vs One-Offs
        </h2>
        <p className="text-gray-600 mb-6">
          The difference between valuable trends and viral moments that can't be replicated.
        </p>
      </div>

      {/* Pattern vs One-Off Indicators */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-green-50 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Pattern Signs (Submit These!)
          </h3>
          <ul className="space-y-2 text-sm text-green-700">
            <li>• Multiple creators trying same thing</li>
            <li>• Working across different niches</li>
            <li>• Variation attempts appearing</li>
            <li>• Comments saying "everyone's doing this"</li>
            <li>• Can be adapted to any content</li>
          </ul>
        </div>
        <div className="bg-red-50 rounded-xl p-6">
          <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            One-Off Signs (Don't Submit)
          </h3>
          <ul className="space-y-2 text-sm text-red-700">
            <li>• Only works for one creator's personality</li>
            <li>• Requires specific backstory/context</li>
            <li>• Too expensive/complex to recreate</li>
            <li>• Already featured by platform officially</li>
            <li>• Depends on specific event or news</li>
          </ul>
        </div>
      </div>

      {/* Interactive Test */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Test: Pattern or One-Off?</h3>
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-white rounded-lg p-4">
              <p className="font-medium text-gray-900 mb-3">{scenario.text}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedItems({...selectedItems, [scenario.id]: 'pattern'})}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedItems[scenario.id] === 'pattern'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pattern ✓
                </button>
                <button
                  onClick={() => setSelectedItems({...selectedItems, [scenario.id]: 'oneoff'})}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedItems[scenario.id] === 'oneoff'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  One-Off ✗
                </button>
              </div>
              {showResults && selectedItems[scenario.id] && (
                <div className={`mt-3 p-3 rounded-lg ${
                  selectedItems[scenario.id] === scenario.type
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  <p className="text-sm">
                    {selectedItems[scenario.id] === scenario.type ? '✓ Correct! ' : '✗ Incorrect. '}
                    {scenario.reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        {!showResults && Object.keys(selectedItems).length === scenarios.length && (
          <button
            onClick={checkAnswers}
            className="w-full mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Check Answers
          </button>
        )}
      </div>
    </div>
  );
}

// Module 6: Creator's Cheat Sheet
function Module6() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Zap className="w-7 h-7 text-purple-600" />
          Module 6: The Creator's Cheat Sheet
        </h2>
        <p className="text-gray-600 mb-6">
          Your daily routine for spotting valuable trends in just 15 minutes a day.
        </p>
      </div>

      {/* Daily Routine */}
      <div className="space-y-6">
        {[
          {
            time: 'Morning Check',
            duration: '5 mins',
            icon: '☀️',
            tasks: [
              'What got 10x normal views yesterday?',
              'Any new sounds breaking out?',
              'Format changes in top videos?',
              'Check your niche\'s rising creators'
            ],
            color: 'yellow'
          },
          {
            time: 'Afternoon Check',
            duration: '5 mins',
            icon: '🌤️',
            tasks: [
              'Small creators beating big creators?',
              'Comments sections going crazy about something?',
              'Platform featuring certain content types?',
              'New effects or features being used?'
            ],
            color: 'blue'
          },
          {
            time: 'Evening Check',
            duration: '5 mins',
            icon: '🌙',
            tasks: [
              'What\'s crossing from one platform to another?',
              'International trends coming to US?',
              'Brands killing any trends? (sign it\'s over)',
              'Tomorrow\'s potential breakouts?'
            ],
            color: 'purple'
          }
        ].map((check, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
            className={`border-2 border-${check.color}-200 rounded-xl p-6 bg-${check.color}-50`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{check.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{check.time}</h3>
                  <p className="text-sm text-gray-600">{check.duration}</p>
                </div>
              </div>
              <Timer className="w-5 h-5 text-gray-400" />
            </div>
            <ul className="space-y-2">
              {check.tasks.map((task, tidx) => (
                <li key={tidx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-sm text-gray-700">{task}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Pro Tip */}
      <div className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-2">💡 Pro Tip</h3>
        <p className="text-sm">
          Set phone alarms for these checks. 15 minutes daily = expert spotter in 30 days. 
          The best trends appear and disappear in 48-72 hours, so consistency is key.
        </p>
      </div>
    </div>
  );
}

// Module 7: Quality Signals
function Module7() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <CheckCircle className="w-7 h-7 text-purple-600" />
          Module 7: Quality Signals for Creator Value
        </h2>
        <p className="text-gray-600 mb-6">
          Learn to instantly recognize high-value vs low-value trends for creators.
        </p>
      </div>

      {/* Value Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-500">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            High Value to Creators
          </h3>
          <ul className="space-y-3">
            {[
              { text: 'Takes <60 seconds to implement', icon: '⚡' },
              { text: 'Works across multiple niches', icon: '🎯' },
              { text: 'No special equipment needed', icon: '📱' },
              { text: 'Improves average view duration', icon: '📈' },
              { text: 'Triggers comments/shares', icon: '💬' },
              { text: 'Clear before/after metrics', icon: '📊' },
              { text: 'Can be adapted to brand', icon: '🎨' }
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 text-green-700">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-500">
          <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Low Value to Creators
          </h3>
          <ul className="space-y-3">
            {[
              { text: 'Requires specific props/locations', icon: '🏠' },
              { text: 'Only works in one language', icon: '🗣️' },
              { text: 'Needs existing audience', icon: '👥' },
              { text: 'Complex editing required', icon: '🎬' },
              { text: 'Already done by top creators', icon: '👑' },
              { text: 'Platform-specific features', icon: '🔒' },
              { text: 'Seasonal or event-based', icon: '📅' }
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 text-red-700">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Value Calculator */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Value Calculator</h3>
        <p className="text-sm text-gray-600 mb-4">
          If a trend checks 4+ of these boxes, it's HIGH VALUE:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            'Can be done in under 1 minute',
            'Works for 3+ different niches',
            'Only needs a phone',
            'Gets 2x+ more comments',
            'Has a clear hook/format',
            'Growing 100%+ daily',
            'Small creators succeeding',
            'Not language dependent'
          ].map((criteria, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-purple-600" />
              <span className="text-sm text-gray-700">{criteria}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Module 8: Proving Your Value
function Module8() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Award className="w-7 h-7 text-purple-600" />
          Module 8: The Money Shot - Proving Your Value
        </h2>
        <p className="text-gray-600 mb-6">
          Track your wins and build a reputation as a top spotter.
        </p>
      </div>

      {/* Success Tracking */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Track Your Wins</h3>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Step 1: Document Discovery</h4>
            <p className="text-sm text-gray-600">
              Screenshot the trend when you first spot it. Note view counts, creator names, and timestamp.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Step 2: Track Adoption</h4>
            <p className="text-sm text-gray-600">
              Watch which creators use your spotted trends. Document their before/after metrics.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Step 3: Calculate Impact</h4>
            <p className="text-sm text-gray-600">
              Compare: Normal views vs Trend views. This is your value proof.
            </p>
          </div>
        </div>
      </div>

      {/* Example Success Story */}
      <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-300">
        <h3 className="font-semibold text-purple-900 mb-4">Example Success Story</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="font-medium text-purple-600">Tuesday:</span>
            <span>Spotted "silent walking tour" format - 5 videos, all outperforming</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-medium text-purple-600">Thursday:</span>
            <span>@creator1 used it - got 2M views (normally gets 50K) = 40x increase</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-medium text-purple-600">Friday:</span>
            <span>@creator2 used it - got 800K views (normally gets 30K) = 26x increase</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-medium text-purple-600">Sunday:</span>
            <span>Trend peaked. Total impact: 15+ creators, 10M+ additional views</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-medium text-green-600">Earnings:</span>
            <span className="font-bold">Spotters who caught it earned $45 in validation rewards</span>
          </div>
        </div>
      </div>

      {/* Your Value Metrics */}
      <div className="mt-6 bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Value Metrics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">0</div>
            <p className="text-sm text-gray-600">Trends Spotted</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">0%</div>
            <p className="text-sm text-gray-600">Hit Rate</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">0x</div>
            <p className="text-sm text-gray-600">Avg. Creator Boost</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Module 9: Platform Intelligence
function Module9() {
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'instagram' | 'youtube' | null>(null);
  
  const platformSignals = {
    tiktok: {
      name: 'TikTok',
      icon: '🎵',
      signals: [
        'Sound use growing exponentially (check sound page)',
        'Effect/filter spreading beyond beauty niche',
        'New posting time working (check when top videos posted)',
        'Caption format driving views (questions, lists, warnings)',
        'Duet/Stitch chains forming',
        'Specific hashtag combinations exploding'
      ]
    },
    instagram: {
      name: 'Instagram',
      icon: '📸',
      signals: [
        'Reels length sweet spot changing (30s vs 60s vs 90s)',
        'Story features driving to Reels',
        'Hashtag strategy shifts (5 vs 10 vs 30)',
        'Grid post comeback patterns',
        'Carousel posts outperforming',
        'Music trending before TikTok'
      ]
    },
    youtube: {
      name: 'YouTube Shorts',
      icon: '📺',
      signals: [
        'Thumbnail styles winning (face vs text vs object)',
        'Title formats working (questions vs statements)',
        'Loop techniques evolving',
        'Comments driving subscribes',
        'Playlist inclusion boosting views',
        'Desktop vs mobile performance differences'
      ]
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Hash className="w-7 h-7 text-purple-600" />
          Module 9: Platform-Specific Intelligence
        </h2>
        <p className="text-gray-600 mb-6">
          Each platform has unique signals. Master these to spot trends before they cross platforms.
        </p>
      </div>

      {/* Platform Selector */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(platformSignals).map(([key, platform]) => (
          <button
            key={key}
            onClick={() => setSelectedPlatform(key as 'tiktok' | 'instagram' | 'youtube')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedPlatform === key
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">{platform.icon}</div>
            <p className="font-semibold">{platform.name}</p>
          </button>
        ))}
      </div>

      {/* Selected Platform Signals */}
      {selectedPlatform && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">{platformSignals[selectedPlatform].icon}</span>
            {platformSignals[selectedPlatform].name} Signals to Watch
          </h3>
          <ul className="space-y-3">
            {platformSignals[selectedPlatform].signals.map((signal, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-purple-600 mt-0.5" />
                <span className="text-sm text-gray-700">{signal}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Cross-Platform Opportunities */}
      <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
        <h3 className="font-semibold text-yellow-900 mb-3">🌟 Golden Opportunity</h3>
        <p className="text-sm text-yellow-800">
          Trends that work on one platform often explode when adapted to another. 
          If you see something working on TikTok, check if anyone's tried it on Instagram Reels yet. 
          First movers on new platforms get massive reach.
        </p>
      </div>
    </div>
  );
}

// Module 10: Final Test
function Module10({ onComplete }: { onComplete: () => void }) {
  const [answers, setAnswers] = useState<{[key: string]: boolean | null}>({});
  const [showResults, setShowResults] = useState(false);
  
  const scenarios = [
    {
      id: 'q1',
      question: 'You see 5 small creators doing a "morning routine but make it horror" format. All getting 10x views. Submit?',
      correct: true,
      reason: 'YES - It\'s a format template that any creator can adapt'
    },
    {
      id: 'q2',
      question: 'Drake releases new song. Submit?',
      correct: false,
      reason: 'NO - Everyone already knows, not a trend opportunity'
    },
    {
      id: 'q3',
      question: 'You notice videos starting with questions getting 3x more comments. Submit?',
      correct: true,
      reason: 'YES - It\'s an engagement hack any creator can use'
    },
    {
      id: 'q4',
      question: 'A creator\'s cat does something funny. Goes viral. Submit?',
      correct: false,
      reason: 'NO - One-off viral moment, not replicable'
    },
    {
      id: 'q5',
      question: 'Green screen + news headlines format spreading. Submit?',
      correct: true,
      reason: 'YES - Replicable format that works across niches'
    }
  ];

  const checkResults = () => {
    setShowResults(true);
    const correctCount = scenarios.filter(s => answers[s.id] === s.correct).length;
    if (correctCount >= 4) {
      onComplete();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Target className="w-7 h-7 text-purple-600" />
          Module 10: Final Test - You're Ready When...
        </h2>
        <p className="text-gray-600 mb-6">
          Test your understanding with real scenarios. Score 4/5 to graduate!
        </p>
      </div>

      {/* Test Scenarios */}
      <div className="space-y-4 mb-6">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="bg-gray-50 rounded-xl p-6">
            <p className="font-medium text-gray-900 mb-4">{scenario.question}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setAnswers({...answers, [scenario.id]: true})}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  answers[scenario.id] === true
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                }`}
              >
                YES - Submit
              </button>
              <button
                onClick={() => setAnswers({...answers, [scenario.id]: false})}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  answers[scenario.id] === false
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                }`}
              >
                NO - Don't Submit
              </button>
            </div>
            {showResults && answers[scenario.id] !== null && (
              <div className={`mt-4 p-3 rounded-lg ${
                answers[scenario.id] === scenario.correct
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <p className="text-sm font-medium">
                  {answers[scenario.id] === scenario.correct ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                <p className="text-sm">{scenario.reason}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      {!showResults && Object.keys(answers).length === scenarios.length && (
        <button
          onClick={checkResults}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
        >
          Submit Final Test
        </button>
      )}

      {/* Results */}
      {showResults && (
        <div className={`mt-6 p-6 rounded-xl ${
          scenarios.filter(s => answers[s.id] === s.correct).length >= 4
            ? 'bg-green-50 border-2 border-green-500'
            : 'bg-yellow-50 border-2 border-yellow-500'
        }`}>
          <h3 className="font-semibold text-gray-900 mb-2">
            Your Score: {scenarios.filter(s => answers[s.id] === s.correct).length}/5
          </h3>
          {scenarios.filter(s => answers[s.id] === s.correct).length >= 4 ? (
            <div>
              <p className="text-green-700 mb-4">
                🎉 Congratulations! You understand creator-focused trend spotting!
              </p>
              <Link
                href="/scroll"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Start Spotting & Earning
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          ) : (
            <p className="text-yellow-700">
              Review the modules and try again. You need 4/5 to pass.
            </p>
          )}
        </div>
      )}

      {/* Graduation Criteria */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Graduation Requirements</h3>
        <ul className="space-y-2">
          {[
            'Score 4/5 on test scenarios',
            'Understand creator POV vs viewer POV',
            'Can spot pattern vs one-off',
            'Know the value timeline',
            'Ready to help creators succeed'
          ].map((req, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-700">{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
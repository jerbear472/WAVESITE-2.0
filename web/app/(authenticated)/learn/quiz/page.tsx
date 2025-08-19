'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, TrendingUp, Award, ChevronRight, RotateCcw } from 'lucide-react';
// Dynamic import to avoid build issues
let confetti: any;
if (typeof window !== 'undefined') {
  import('canvas-confetti').then(module => {
    confetti = module.default;
  });
}

interface TrendOption {
  id: string;
  title: string;
  platform: string;
  description: string;
  category: string;
  quality: 'excellent' | 'good' | 'poor' | 'terrible';
  feedback: string;
  tips: string[];
}

interface Question {
  id: number;
  instruction: string;
  options: TrendOption[];
  correctId: string;
}

const questions: Question[] = [
  {
    id: 1,
    instruction: "Which trend submission would get APPROVED and earn you $0.25?",
    options: [
      {
        id: 'q1_a',
        title: "Stanley Cup craze hits schools",
        platform: "TikTok",
        description: "Stanley tumblers becoming status symbols in middle schools. Videos of collections getting 10M+ views. Target selling out weekly. Parents spending $200+ on limited editions. #StanleyTumbler at 2.3B views.",
        category: "Consumer Goods",
        quality: 'excellent',
        feedback: "Perfect! This would get approved. It has specific metrics, clear demographic, viral evidence, and business impact.",
        tips: ["Specific brand and product", "Measurable engagement (2.3B views)", "Clear trend behavior", "Business opportunity identified"]
      },
      {
        id: 'q1_b',
        title: "Water bottles are popular",
        platform: "Social Media",
        description: "People are buying water bottles. They're trendy now. Everyone wants one.",
        category: "Products",
        quality: 'terrible',
        feedback: "This would get rejected! Too vague with no specific brand, metrics, or unique insight.",
        tips: ["Missing specific brands", "No engagement metrics", "Too generic", "Not actionable"]
      },
      {
        id: 'q1_c',
        title: "Hydration is important",
        platform: "Instagram",
        description: "Influencers talking about drinking more water. Health coaches promoting hydration. Wellness trend growing.",
        category: "Health",
        quality: 'poor',
        feedback: "This would get rejected. It's evergreen content, not a trending topic. Too broad and not time-sensitive.",
        tips: ["Not a new trend", "No specific angle", "Missing metrics", "Too general"]
      },
      {
        id: 'q1_d',
        title: "Cute cups on my FYP",
        platform: "TikTok",
        description: "Seeing lots of aesthetic cup videos. They look nice. Might buy one.",
        category: "Lifestyle",
        quality: 'poor',
        feedback: "This would get rejected. Personal observation without data that validators can't verify.",
        tips: ["No objective data", "Personal opinion only", "Missing specifics", "Not verifiable"]
      }
    ],
    correctId: 'q1_a'
  },
  {
    id: 2,
    instruction: "Which trend would validators APPROVE for having the best evidence?",
    options: [
      {
        id: 'q2_a',
        title: "Fashion trending on TikTok",
        platform: "TikTok",
        description: "Fashion videos are getting views. Lots of outfit posts. Fashion is big right now.",
        category: "Fashion",
        quality: 'terrible',
        feedback: "This would get rejected. Fashion is always on TikTok - no unique or timely insight.",
        tips: ["Too broad", "No specific trend", "Missing data", "Not newsworthy"]
      },
      {
        id: 'q2_b',
        title: "Mob wife aesthetic replacing clean girl",
        platform: "TikTok",
        description: "Mob wife aesthetic exploding with 89M views in 2 weeks. Vintage fur coats selling out on Depop. Searches for 'leopard print coat' up 340%. Major brands launching collections.",
        category: "Fashion",
        quality: 'excellent',
        feedback: "Excellent! This would get approved. Specific trend with growth metrics, platform data, and market impact.",
        tips: ["Clear trend name", "Specific metrics (89M views)", "Search data included", "Market validation"]
      },
      {
        id: 'q2_c',
        title: "New style alert",
        platform: "Instagram",
        description: "There's a new style everyone's wearing. It's really cool. You should check it out.",
        category: "Fashion",
        quality: 'terrible',
        feedback: "This would get rejected. No specific information that validators can verify.",
        tips: ["No specifics", "No data", "Not descriptive", "Can't verify"]
      },
      {
        id: 'q2_d',
        title: "Vintage is back",
        platform: "Multiple",
        description: "People are shopping vintage again. Thrift stores are busier. Sustainable fashion growing.",
        category: "Fashion",
        quality: 'poor',
        feedback: "This would get rejected. Too general and not a new trend.",
        tips: ["Not new", "Too broad", "Missing metrics", "No unique insight"]
      }
    ],
    correctId: 'q2_b'
  },
  {
    id: 3,
    instruction: "Which trend would get APPROVED for being most valuable to businesses?",
    options: [
      {
        id: 'q3_a',
        title: "Funny meme going viral",
        platform: "Twitter",
        description: "This meme is hilarious. Everyone's sharing it. It's about cats. Really funny stuff.",
        category: "Memes",
        quality: 'terrible',
        feedback: "This would get rejected. Memes are fleeting and not actionable for businesses.",
        tips: ["Not business relevant", "Too vague", "Short lifespan", "No metrics"]
      },
      {
        id: 'q3_b',
        title: "Celebrity drama unfolding",
        platform: "Twitter",
        description: "Major celebrity feud happening right now. Fans are taking sides. Lots of tweets about it.",
        category: "Celebrity",
        quality: 'poor',
        feedback: "This would get rejected. Celebrity gossip isn't a trend validators approve.",
        tips: ["Not a trend", "Not actionable", "Temporary news", "No business value"]
      },
      {
        id: 'q3_c',
        title: "De-influencing movement grows",
        platform: "TikTok",
        description: "De-influencing videos getting 50M+ views weekly. Creators telling followers NOT to buy products. Amazon returns up 12% in beauty category. Brands pivoting to 'honest marketing' campaigns.",
        category: "Marketing",
        quality: 'excellent',
        feedback: "Perfect! This would get approved. Clear consumer behavior shift with measurable business impact.",
        tips: ["Clear trend behavior", "Business impact shown", "Metrics provided", "Strategic insight"]
      },
      {
        id: 'q3_d',
        title: "People don't like ads",
        platform: "General",
        description: "Users are skipping ads more. Ad blockers are popular. People prefer organic content.",
        category: "Marketing",
        quality: 'poor',
        feedback: "This would get rejected. Known for years, not a new trend.",
        tips: ["Not new information", "Too general", "No recent data", "Not actionable"]
      }
    ],
    correctId: 'q3_c'
  },
  {
    id: 4,
    instruction: "Which trend would get APPROVED as a fresh, emerging trend?",
    options: [
      {
        id: 'q4_a',
        title: "AI chatbots are useful",
        platform: "Tech News",
        description: "ChatGPT and AI assistants are being used by many people. AI is changing how we work.",
        category: "Technology",
        quality: 'poor',
        feedback: "This would get rejected. Already mainstream, not emerging.",
        tips: ["Already mainstream", "Not emerging", "Too general", "Old news"]
      },
      {
        id: 'q4_b',
        title: "TikTok is popular with Gen Z",
        platform: "TikTok",
        description: "Young people love TikTok. They spend hours on the app. It's their favorite platform.",
        category: "Social Media",
        quality: 'terrible',
        feedback: "This would get rejected. Common knowledge for years.",
        tips: ["Years old", "Common knowledge", "Not newsworthy", "No new angle"]
      },
      {
        id: 'q4_c',
        title: "Loud budgeting goes viral",
        platform: "TikTok",
        description: "Loud budgeting trend at 4M views in 5 days. Gen Z openly declining plans due to budget. Brands creating 'budget-friendly' campaign responses. Financial apps seeing 30% signup increase.",
        category: "Finance",
        quality: 'excellent',
        feedback: "Great! This would get approved. Early-stage trend with clear growth trajectory and market response.",
        tips: ["Early stage (5 days)", "Clear metrics", "Market responding", "Behavioral shift"]
      },
      {
        id: 'q4_d',
        title: "Online shopping increasing",
        platform: "E-commerce",
        description: "More people shopping online. E-commerce growing. Retail stores struggling.",
        category: "Retail",
        quality: 'poor',
        feedback: "This would get rejected. Multi-year trend, not emerging.",
        tips: ["Years-old trend", "Not emerging", "Too broad", "No new insight"]
      }
    ],
    correctId: 'q4_c'
  },
  {
    id: 5,
    instruction: "Which trend would validators APPROVE for best specificity and detail?",
    options: [
      {
        id: 'q5_a',
        title: "Food content popular",
        platform: "Instagram",
        description: "Food videos getting lots of views. People like watching cooking content. Food influencers growing.",
        category: "Food",
        quality: 'terrible',
        feedback: "This would get rejected. Too generic - food content is always popular.",
        tips: ["Too broad", "Always true", "No specifics", "Not unique"]
      },
      {
        id: 'q5_b',
        title: "Cucumber salad recipes viral",
        platform: "TikTok",
        description: "Logan the cucumber guy's recipes at 500M+ views. Grocery stores reporting 400% increase in cucumber sales. 'Cucumber salad' searches up 2000%. Influencers creating variations daily.",
        category: "Food",
        quality: 'excellent',
        feedback: "Perfect! This would get approved. Named creator, exact metrics, market impact, search data.",
        tips: ["Named influencer", "Specific product", "Sales data", "Search trends"]
      },
      {
        id: 'q5_c',
        title: "Healthy eating trending",
        platform: "Social Media",
        description: "People want to eat healthier. Lots of healthy recipes online. Wellness is important to people.",
        category: "Health",
        quality: 'poor',
        feedback: "This would get rejected. Evergreen topic, not a specific trend.",
        tips: ["Always relevant", "Not specific", "No data", "Not timely"]
      },
      {
        id: 'q5_d',
        title: "New recipe going viral",
        platform: "TikTok",
        description: "There's this recipe everyone's making. It looks good. People seem to like it.",
        category: "Food",
        quality: 'poor',
        feedback: "This would get rejected. No specifics that validators can verify.",
        tips: ["No recipe name", "No metrics", "Too vague", "Can't verify"]
      }
    ],
    correctId: 'q5_b'
  }
];

export default function TrendQuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [answers, setAnswers] = useState<{[key: number]: boolean}>({});

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctId;
  const selectedOption = question.options.find(opt => opt.id === selectedAnswer);

  const handleAnswerSelect = (optionId: string) => {
    if (showFeedback) return;
    setSelectedAnswer(optionId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;
    
    setShowFeedback(true);
    const correct = selectedAnswer === question.correctId;
    setAnswers({...answers, [currentQuestion]: correct});
    
    if (correct) {
      setScore(score + 1);
      // Small confetti for correct answer
      if (confetti) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setQuizComplete(true);
      if (score >= 4 && confetti) {
        // Big confetti for good score
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setQuizComplete(false);
    setAnswers({});
  };

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPassing = score >= 4;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className={`inline-flex items-center justify-center p-4 rounded-full mb-6 ${
              isPassing ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <Award className={`w-12 h-12 ${isPassing ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Quiz Complete!
            </h1>
            
            <div className="text-5xl font-bold my-6">
              <span className={isPassing ? 'text-green-600' : 'text-yellow-600'}>
                {score}/{questions.length}
              </span>
            </div>
            
            <p className="text-xl text-gray-600 mb-8">
              You scored {percentage}%
            </p>

            {isPassing ? (
              <div className="bg-green-50 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-green-900 mb-2">
                  🎉 Excellent Work!
                </h2>
                <p className="text-green-700">
                  You understand what gets trends approved by validators. You're ready to start earning $0.25 per approved trend!
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-yellow-900 mb-2">
                  📚 Keep Learning!
                </h2>
                <p className="text-yellow-700">
                  Review the examples again to better understand what validators approve. You've got this!
                </p>
              </div>
            )}

            {/* Answer Summary */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Your Answers:</h3>
              <div className="flex justify-center gap-2">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                      answers[idx] 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRestartQuiz}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Try Again
              </button>
              <Link
                href="/learn"
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
              >
                Review Examples
              </Link>
              {isPassing && (
                <Link
                  href="/scroll"
                  className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Start Earning
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              Score: {score}/{currentQuestion}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {question.instruction}
          </h2>

          {/* Options Grid */}
          <div className="grid gap-4 mb-6">
            {question.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                disabled={showFeedback}
                className={`text-left p-6 rounded-xl border-2 transition-all ${
                  showFeedback
                    ? option.id === question.correctId
                      ? 'border-green-500 bg-green-50'
                      : option.id === selectedAnswer && !isCorrect
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-gray-50 opacity-50'
                    : selectedAnswer === option.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                } ${!showFeedback ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-white rounded-md text-xs font-medium text-gray-700">
                      {option.platform}
                    </span>
                    <span className="px-2 py-1 bg-white rounded-md text-xs font-medium text-gray-700">
                      {option.category}
                    </span>
                  </div>
                  {showFeedback && (
                    <div>
                      {option.id === question.correctId ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : option.id === selectedAnswer ? (
                        <XCircle className="w-6 h-6 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{option.title}</h3>
                <p className="text-gray-700 text-sm">{option.description}</p>
              </button>
            ))}
          </div>

          {/* Feedback Section */}
          {showFeedback && selectedOption && (
            <div className={`rounded-xl p-6 mb-6 ${
              isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="flex items-start mb-3">
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
                )}
                <div>
                  <h3 className={`font-semibold mb-2 ${
                    isCorrect ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {isCorrect ? 'Correct!' : 'Not quite right'}
                  </h3>
                  <p className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                    {selectedOption.feedback}
                  </p>
                </div>
              </div>
              
              <div className="ml-9">
                <h4 className="font-medium text-gray-900 mb-2">
                  {isCorrect ? 'Why this works:' : 'Issues with this choice:'}
                </h4>
                <ul className="space-y-1">
                  {selectedOption.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className={`mr-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <span className="text-sm text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {!isCorrect && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>The correct answer was:</strong> {question.options.find(o => o.id === question.correctId)?.title}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Link
              href="/learn"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back to Learning
            </Link>
            
            {!showFeedback ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className={`px-6 py-3 font-semibold rounded-xl transition-colors ${
                  selectedAnswer
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin as MapPinIcon,
  User as UserIcon,
  Heart as HeartIcon,
  Sparkles as SparklesIcon,
  Coffee as CoffeeIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Check as CheckIcon,
  Star as StarIcon
} from 'lucide-react';

import { PersonaData } from '@/hooks/usePersona';

// Fun, simplified steps
const steps = [
  { id: 'basic', title: 'The Basics', icon: UserIcon, subtitle: 'Tell us a bit about yourself' },
  { id: 'location', title: 'Where You\'re At', icon: MapPinIcon, subtitle: 'Your corner of the world' },
  { id: 'interests', title: 'What You Love', icon: HeartIcon, subtitle: 'The things that spark joy' },
  { id: 'vibe', title: 'Your Vibe', icon: SparklesIcon, subtitle: 'Your unique style & energy' },
  { id: 'fun', title: 'Fun Facts', icon: StarIcon, subtitle: 'What makes you, you!' }
];

// Age ranges (more casual)
const ageRanges = [
  { value: 'gen-z', label: 'Gen Z (16-26)', emoji: '🎮' },
  { value: 'millennial', label: 'Millennial (27-42)', emoji: '📱' },
  { value: 'gen-x', label: 'Gen X (43-58)', emoji: '💿' },
  { value: 'boomer', label: 'Boomer (59+)', emoji: '📺' }
];

// Fun interests
const interestCategories = [
  { 
    name: 'Creative', 
    emoji: '🎨',
    options: ['Art & Design', 'Photography', 'Music', 'Writing', 'Crafting', 'Fashion', 'Interior Design']
  },
  { 
    name: 'Tech & Digital', 
    emoji: '💻',
    options: ['Gaming', 'Social Media', 'Coding', 'Gadgets', 'AI & Future Tech', 'Streaming', 'Apps']
  },
  { 
    name: 'Lifestyle', 
    emoji: '✨',
    options: ['Fitness', 'Food & Cooking', 'Travel', 'Wellness', 'Beauty', 'Home & Garden', 'Sustainability']
  },
  { 
    name: 'Entertainment', 
    emoji: '🎬',
    options: ['Movies & TV', 'Books', 'Podcasts', 'Live Events', 'Comedy', 'Sports', 'Music Festivals']
  },
  { 
    name: 'Social & Culture', 
    emoji: '🌍',
    options: ['Community', 'Learning', 'Volunteering', 'Politics', 'Philosophy', 'History', 'Languages']
  }
];

// Personality vibes
const personalityVibes = [
  { value: 'trendsetter', label: 'Trendsetter', emoji: '🚀', desc: 'Always first to try new things' },
  { value: 'curator', label: 'Curator', emoji: '🎯', desc: 'Love finding and sharing quality content' },
  { value: 'explorer', label: 'Explorer', emoji: '🗺️', desc: 'Always discovering new places & experiences' },
  { value: 'creator', label: 'Creator', emoji: '🎨', desc: 'Make things, build things, express yourself' },
  { value: 'connector', label: 'Connector', emoji: '🤝', desc: 'Bring people together, love community' },
  { value: 'learner', label: 'Learner', emoji: '📚', desc: 'Always curious, always growing' },
  { value: 'chill', label: 'Chill Vibes', emoji: '😌', desc: 'Take life as it comes, go with the flow' },
  { value: 'energetic', label: 'High Energy', emoji: '⚡', desc: 'Always on the go, full of enthusiasm' }
];

// Fun facts categories
const funFactCategories = [
  { 
    id: 'quirks',
    question: 'What\'s your quirky habit?',
    options: ['Collect vintage things', 'Always have snacks', 'Talk to plants', 'Midnight shower thoughts', 'Dance while cooking', 'Organize everything', 'Make weird food combos', 'Binge documentaries']
  },
  {
    id: 'superpower',
    question: 'If you had a superpower, it would be...',
    options: ['Reading minds', 'Time travel', 'Never needing sleep', 'Perfect timing', 'Instant language learning', 'Always knowing the best food spots', 'Making anyone laugh', 'Finding lost things']
  },
  {
    id: 'weekend',
    question: 'Perfect weekend includes...',
    options: ['Adventure somewhere new', 'Cozy home vibes', 'Friends & good food', 'Creative projects', 'Nature & fresh air', 'City exploration', 'Learning something cool', 'Total relaxation']
  }
];

export default function PersonaBuilderSimple({ onComplete }: { onComplete: (data: PersonaData) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [persona, setPersona] = useState<PersonaData>({
    location: { country: '', city: '', urbanType: 'urban' },
    demographics: { ageRange: '', gender: '', educationLevel: '', relationshipStatus: '', hasChildren: false },
    professional: { employmentStatus: '', industry: '', incomeRange: '', workStyle: 'office' },
    interests: [],
    lifestyle: { shoppingHabits: [], mediaConsumption: [], values: [] },
    tech: { proficiency: 'intermediate', primaryDevices: [], socialPlatforms: [] }
  });

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string>('');
  const [funFacts, setFunFacts] = useState<{ [key: string]: string }>({});
  const [cityInput, setCityInput] = useState('');

  const updatePersona = (section: keyof PersonaData, data: any) => {
    setPersona(prev => ({
      ...prev,
      [section]: { ...prev[section as keyof PersonaData], ...data }
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Compile final persona data with required fields and defaults
      const finalPersona: PersonaData = {
        location: {
          country: persona.location.country || 'United States', // Default country if not set
          city: cityInput || persona.location.city || 'Unknown',
          urbanType: persona.location.urbanType || 'urban'
        },
        demographics: {
          ageRange: persona.demographics.ageRange,
          gender: persona.demographics.gender,
          educationLevel: 'Some College', // Default education level
          relationshipStatus: 'prefer-not-to-say', // Default relationship status
          hasChildren: false
        },
        professional: {
          employmentStatus: 'employed', // Default employment status
          industry: 'Other', // Default industry
          incomeRange: 'prefer-not-to-say', // Default income (not asked)
          workStyle: 'hybrid' // Default work style
        },
        interests: selectedInterests,
        lifestyle: {
          shoppingHabits: [],
          mediaConsumption: [],
          values: selectedVibe ? [selectedVibe, ...Object.values(funFacts).filter(Boolean)] : []
        },
        tech: {
          proficiency: 'intermediate',
          primaryDevices: [],
          socialPlatforms: []
        }
      };
      onComplete(finalPersona);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Build Your Persona ✨
          </h1>
          <p className="text-gray-600">Let's get to know the awesome person behind the trends!</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className={`w-3 h-3 rounded-full ${
                  index <= currentStep 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                    : 'bg-gray-200'
                }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: index === currentStep ? 1.2 : 1 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          
          {/* Step Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl mb-4">
              <currentStepData.icon className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentStepData.title}</h2>
            <p className="text-gray-600">{currentStepData.subtitle}</p>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            
            {/* Step 1: Basic Info */}
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What generation are you? 🎯
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ageRanges.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => updatePersona('demographics', { ageRange: range.value })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          persona.demographics.ageRange === range.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                        }`}
                      >
                        <div className="text-2xl mb-1">{range.emoji}</div>
                        <div className="font-medium">{range.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How do you identify? (optional) 🌈
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((gender) => (
                      <button
                        key={gender}
                        onClick={() => updatePersona('demographics', { gender })}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          persona.demographics.gender === gender
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Location */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What city are you in? 🏙️
                  </label>
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => {
                      setCityInput(e.target.value);
                      updatePersona('location', { city: e.target.value });
                    }}
                    placeholder="e.g., New York, London, Tokyo..."
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What's your area like? 🌆
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: 'urban', label: 'Big City Vibes', emoji: '🏙️' },
                      { value: 'suburban', label: 'Suburban Life', emoji: '🏘️' },
                      { value: 'rural', label: 'Country Living', emoji: '🌾' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updatePersona('location', { urbanType: type.value })}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          persona.location.urbanType === type.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">{type.emoji}</div>
                        <div className="font-medium">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Interests */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <p className="text-gray-600">Pick anything that gets you excited! (Choose as many as you want)</p>
                  <p className="text-sm text-purple-600 mt-1">Selected: {selectedInterests.length}</p>
                </div>

                {interestCategories.map((category) => (
                  <div key={category.name} className="space-y-3">
                    <h3 className="font-medium text-gray-800 flex items-center gap-2">
                      <span className="text-xl">{category.emoji}</span>
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {category.options.map((interest) => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`p-3 rounded-lg border-2 transition-all text-sm ${
                            selectedInterests.includes(interest)
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Step 4: Personality Vibe */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <p className="text-gray-600">Which vibe resonates with you most?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {personalityVibes.map((vibe) => (
                    <button
                      key={vibe.value}
                      onClick={() => setSelectedVibe(vibe.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedVibe === vibe.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{vibe.emoji}</span>
                        <span className="font-medium">{vibe.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">{vibe.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 5: Fun Facts */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="text-center mb-6">
                  <p className="text-gray-600">Let's add some personality! (All optional, just for fun)</p>
                </div>

                {funFactCategories.map((category) => (
                  <div key={category.id} className="space-y-3">
                    <h3 className="font-medium text-gray-800">{category.question}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {category.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => setFunFacts(prev => ({ ...prev, [category.id]: option }))}
                          className={`p-3 rounded-lg border-2 transition-all text-sm text-left ${
                            funFacts[category.id] === option
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              {isLastStep ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Complete Profile
                </>
              ) : (
                <>
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
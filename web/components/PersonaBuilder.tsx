'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin as MapPinIcon,
  DollarSign as DollarSignIcon,
  Calendar as CalendarIcon,
  Heart as HeartIcon,
  Briefcase as BriefcaseIcon,
  Home as HomeIcon,
  Users as UsersIcon,
  Sparkles as SparklesIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Check as CheckIcon
} from 'lucide-react';

import { PersonaData } from '@/hooks/usePersona';

const steps = [
  { id: 'location', title: 'Location', icon: MapPinIcon },
  { id: 'demographics', title: 'About You', icon: UsersIcon },
  { id: 'professional', title: 'Work & Income', icon: BriefcaseIcon },
  { id: 'interests', title: 'Interests', icon: HeartIcon },
  { id: 'lifestyle', title: 'Lifestyle', icon: HomeIcon },
  { id: 'tech', title: 'Tech & Social', icon: SparklesIcon }
];

export default function PersonaBuilder({ onComplete }: { onComplete: (data: PersonaData) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [persona, setPersona] = useState<PersonaData>({
    location: { country: '', city: '', urbanType: 'urban' },
    demographics: { ageRange: '', gender: '', educationLevel: '', relationshipStatus: '', hasChildren: false },
    professional: { employmentStatus: '', industry: '', incomeRange: '', workStyle: 'office' },
    interests: [],
    lifestyle: { shoppingHabits: [], mediaConsumption: [], values: [] },
    tech: { proficiency: 'intermediate', primaryDevices: [], socialPlatforms: [] }
  });

  const updatePersona = (section: keyof PersonaData, data: any) => {
    setPersona(prev => {
      // Handle arrays (interests) differently from objects
      if (section === 'interests') {
        return {
          ...prev,
          interests: data
        };
      }
      
      // For objects, merge the data
      return {
        ...prev,
        [section]: { ...prev[section as keyof PersonaData], ...data }
      };
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(persona);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'location':
        return <LocationStep persona={persona} updatePersona={updatePersona} />;
      case 'demographics':
        return <DemographicsStep persona={persona} updatePersona={updatePersona} />;
      case 'professional':
        return <ProfessionalStep persona={persona} updatePersona={updatePersona} />;
      case 'interests':
        return <InterestsStep persona={persona} updatePersona={updatePersona} />;
      case 'lifestyle':
        return <LifestyleStep persona={persona} updatePersona={updatePersona} />;
      case 'tech':
        return <TechStep persona={persona} updatePersona={updatePersona} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-wave-300 bg-clip-text text-transparent mb-4">
            Build Your Persona
          </h1>
          <p className="text-wave-300 text-lg">
            Help us understand you better to deliver personalized trend insights
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${index <= currentStep 
                      ? 'bg-gradient-to-br from-wave-500 to-wave-600 text-white' 
                      : 'bg-wave-800/50 text-wave-400'
                    }
                  `}
                >
                  {index < currentStep ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <div className={`
                    h-1 w-full mx-2
                    ${index < currentStep 
                      ? 'bg-gradient-to-r from-wave-500 to-wave-600' 
                      : 'bg-wave-800/50'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-wave-200 font-medium">{steps[currentStep].title}</p>
            <p className="text-wave-400 text-sm">Step {currentStep + 1} of {steps.length}</p>
          </div>
        </div>

        {/* Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="wave-card p-8 mb-8"
        >
          {renderStepContent()}
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`
              px-6 py-3 rounded-xl flex items-center gap-2 transition-all
              ${currentStep === 0 
                ? 'bg-wave-800/30 text-wave-600 cursor-not-allowed' 
                : 'bg-wave-800/50 text-white hover:bg-wave-700/50'
              }
            `}
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Previous
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-wave-500 to-wave-600 text-white hover:from-wave-400 hover:to-wave-500 flex items-center gap-2 transition-all"
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Step Components
function LocationStep({ persona, updatePersona }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Where are you based?</h2>
      
      <div>
        <label className="block text-wave-200 mb-2">Country</label>
        <input
          type="text"
          value={persona.location.country}
          onChange={(e) => updatePersona('location', { country: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
          placeholder="e.g., United States"
        />
      </div>

      <div>
        <label className="block text-wave-200 mb-2">City</label>
        <input
          type="text"
          value={persona.location.city}
          onChange={(e) => updatePersona('location', { city: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
          placeholder="e.g., San Francisco"
        />
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Area Type</label>
        <div className="grid grid-cols-3 gap-4">
          {['urban', 'suburban', 'rural'].map((type) => (
            <button
              key={type}
              onClick={() => updatePersona('location', { urbanType: type })}
              className={`
                px-4 py-3 rounded-xl capitalize transition-all
                ${persona.location.urbanType === type
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemographicsStep({ persona, updatePersona }: any) {
  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const educationLevels = ['High School', 'Some College', 'Bachelor\'s', 'Master\'s', 'Doctorate'];
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Tell us about yourself</h2>
      
      <div>
        <label className="block text-wave-200 mb-2">Age Range</label>
        <div className="grid grid-cols-3 gap-3">
          {ageRanges.map((range) => (
            <button
              key={range}
              onClick={() => updatePersona('demographics', { ageRange: range })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.demographics.ageRange === range
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Gender</label>
        <select
          value={persona.demographics.gender}
          onChange={(e) => updatePersona('demographics', { gender: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
        >
          <option value="">Select...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non-binary">Non-binary</option>
          <option value="prefer-not-to-say">Prefer not to say</option>
        </select>
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Education Level</label>
        <div className="grid grid-cols-2 gap-3">
          {educationLevels.map((level) => (
            <button
              key={level}
              onClick={() => updatePersona('demographics', { educationLevel: level })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.demographics.educationLevel === level
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfessionalStep({ persona, updatePersona }: any) {
  const incomeRanges = [
    'Under $25k', '$25k-$50k', '$50k-$75k', 
    '$75k-$100k', '$100k-$150k', '$150k+'
  ];
  
  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education',
    'Retail', 'Entertainment', 'Manufacturing', 'Other'
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Work & Income</h2>
      
      <div>
        <label className="block text-wave-200 mb-2">Employment Status</label>
        <select
          value={persona.professional.employmentStatus}
          onChange={(e) => updatePersona('professional', { employmentStatus: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
        >
          <option value="">Select...</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="self-employed">Self-employed</option>
          <option value="student">Student</option>
          <option value="retired">Retired</option>
          <option value="unemployed">Unemployed</option>
        </select>
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Industry</label>
        <div className="grid grid-cols-2 gap-3">
          {industries.map((industry) => (
            <button
              key={industry}
              onClick={() => updatePersona('professional', { industry })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.professional.industry === industry
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {industry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Annual Income Range</label>
        <div className="grid grid-cols-2 gap-3">
          {incomeRanges.map((range) => (
            <button
              key={range}
              onClick={() => updatePersona('professional', { incomeRange: range })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.professional.incomeRange === range
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InterestsStep({ persona, updatePersona }: any) {
  const interestCategories = [
    'Technology', 'Fashion', 'Gaming', 'Sports', 'Music',
    'Art & Design', 'Food & Cooking', 'Travel', 'Fitness',
    'Photography', 'Finance', 'Entertainment', 'Education',
    'Politics', 'Science', 'Nature', 'DIY & Crafts', 'Cars'
  ];

  const toggleInterest = (interest: string) => {
    const current = persona.interests || [];
    if (current.includes(interest)) {
      updatePersona('interests', current.filter((i: string) => i !== interest));
    } else {
      updatePersona('interests', [...current, interest]);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">What are you interested in?</h2>
      <p className="text-wave-300 mb-4">Select all that apply</p>
      
      <div className="grid grid-cols-3 gap-3">
        {interestCategories.map((interest) => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={`
              px-4 py-3 rounded-xl transition-all
              ${persona.interests?.includes(interest)
                ? 'bg-wave-600 text-white'
                : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
              }
            `}
          >
            {interest}
          </button>
        ))}
      </div>
    </div>
  );
}

function LifestyleStep({ persona, updatePersona }: any) {
  const shoppingHabits = [
    'Online-first', 'In-store preference', 'Research extensively',
    'Impulse buyer', 'Brand loyal', 'Deal hunter'
  ];
  
  const values = [
    'Sustainability', 'Innovation', 'Community', 'Privacy',
    'Quality', 'Value', 'Convenience', 'Authenticity'
  ];

  const toggleItem = (category: 'shoppingHabits' | 'values', item: string) => {
    const current = persona.lifestyle[category] || [];
    if (current.includes(item)) {
      updatePersona('lifestyle', { 
        [category]: current.filter((i: string) => i !== item) 
      });
    } else {
      updatePersona('lifestyle', { 
        [category]: [...current, item] 
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Lifestyle & Values</h2>
      
      <div>
        <label className="block text-wave-200 mb-3">Shopping Habits</label>
        <div className="grid grid-cols-2 gap-3">
          {shoppingHabits.map((habit) => (
            <button
              key={habit}
              onClick={() => toggleItem('shoppingHabits', habit)}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.lifestyle.shoppingHabits?.includes(habit)
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {habit}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3">Core Values</label>
        <div className="grid grid-cols-2 gap-3">
          {values.map((value) => (
            <button
              key={value}
              onClick={() => toggleItem('values', value)}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.lifestyle.values?.includes(value)
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TechStep({ persona, updatePersona }: any) {
  const devices = ['Smartphone', 'Laptop', 'Desktop', 'Tablet', 'Smart TV', 'Wearables'];
  const platforms = [
    'Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook',
    'LinkedIn', 'Reddit', 'Discord', 'Snapchat', 'Pinterest'
  ];

  const toggleItem = (category: 'primaryDevices' | 'socialPlatforms', item: string) => {
    const current = persona.tech[category] || [];
    if (current.includes(item)) {
      updatePersona('tech', { 
        [category]: current.filter((i: string) => i !== item) 
      });
    } else {
      updatePersona('tech', { 
        [category]: [...current, item] 
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Tech & Social Media</h2>
      
      <div>
        <label className="block text-wave-200 mb-2">Tech Proficiency</label>
        <div className="grid grid-cols-2 gap-3">
          {['basic', 'intermediate', 'advanced', 'expert'].map((level) => (
            <button
              key={level}
              onClick={() => updatePersona('tech', { proficiency: level })}
              className={`
                px-4 py-3 rounded-xl capitalize transition-all
                ${persona.tech.proficiency === level
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3">Primary Devices</label>
        <div className="grid grid-cols-3 gap-3">
          {devices.map((device) => (
            <button
              key={device}
              onClick={() => toggleItem('primaryDevices', device)}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.tech.primaryDevices?.includes(device)
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {device}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3">Active Social Platforms</label>
        <div className="grid grid-cols-2 gap-3">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => toggleItem('socialPlatforms', platform)}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.tech.socialPlatforms?.includes(platform)
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
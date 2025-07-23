'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PersonaData } from '@/hooks/usePersona';
import { 
  MapPin as MapPinIcon,
  User as UserIcon,
  Briefcase as BriefcaseIcon,
  Heart as HeartIcon,
  Smartphone as SmartphoneIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Check as CheckIcon,
  X as XIcon
} from 'lucide-react';

const steps = [
  { id: 'location', title: 'Location', icon: MapPinIcon, color: 'bg-blue-500' },
  { id: 'demographics', title: 'About You', icon: UserIcon, color: 'bg-green-500' },
  { id: 'professional', title: 'Work', icon: BriefcaseIcon, color: 'bg-purple-500' },
  { id: 'interests', title: 'Interests', icon: HeartIcon, color: 'bg-pink-500' },
  { id: 'tech', title: 'Tech & Social', icon: SmartphoneIcon, color: 'bg-orange-500' }
];

interface MobilePersonaBuilderProps {
  onComplete: (data: PersonaData) => void;
  onClose: () => void;
  initialData?: PersonaData;
}

export default function MobilePersonaBuilder({ onComplete, onClose, initialData }: MobilePersonaBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [persona, setPersona] = useState<PersonaData>(initialData || {
    location: { country: '', city: '', urbanType: 'urban' },
    demographics: { ageRange: '', gender: '', educationLevel: '', relationshipStatus: '', hasChildren: false },
    professional: { employmentStatus: '', industry: '', incomeRange: '', workStyle: 'office' },
    interests: [],
    lifestyle: { shoppingHabits: [], mediaConsumption: [], values: [] },
    tech: { proficiency: 'intermediate', primaryDevices: [], socialPlatforms: [] }
  });

  const updatePersona = (section: keyof PersonaData, data: any) => {
    setPersona(prev => {
      if (section === 'interests') {
        return { ...prev, interests: data };
      }
      return { ...prev, [section]: { ...prev[section as keyof PersonaData], ...data } };
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
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'location':
        return <MobileLocationStep persona={persona} updatePersona={updatePersona} />;
      case 'demographics':
        return <MobileDemographicsStep persona={persona} updatePersona={updatePersona} />;
      case 'professional':
        return <MobileProfessionalStep persona={persona} updatePersona={updatePersona} />;
      case 'interests':
        return <MobileInterestsStep persona={persona} updatePersona={updatePersona} />;
      case 'tech':
        return <MobileTechStep persona={persona} updatePersona={updatePersona} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 z-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="safe-area-top bg-wave-900/90 backdrop-blur-lg border-b border-wave-700/30">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-wave-800/50">
            <XIcon className="w-6 h-6 text-white" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">Build Persona</h1>
            <p className="text-xs text-wave-400">Step {currentStep + 1} of {steps.length}</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Mobile Progress Dots */}
        <div className="flex justify-center space-x-2 pb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'bg-wave-500' : 'bg-wave-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-24">
          {/* Step Header */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className={`w-16 h-16 ${steps[currentStep].color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {React.createElement(steps[currentStep].icon, { className: "w-8 h-8 text-white" })}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
          </motion.div>

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderStepContent()}
          </motion.div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-wave-900/95 backdrop-blur-lg border-t border-wave-700/30 safe-area-bottom">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl transition-all
              ${currentStep === 0 
                ? 'bg-wave-800/30 text-wave-600 cursor-not-allowed' 
                : 'bg-wave-800/70 text-white hover:bg-wave-700/70'
              }
            `}
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-wave-500 to-wave-600 text-white hover:from-wave-400 hover:to-wave-500 transition-all"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <CheckIcon className="w-5 h-5" />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRightIcon className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized step components
function MobileLocationStep({ persona, updatePersona }: any) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-wave-200 mb-3 font-medium">Country</label>
        <input
          type="text"
          value={persona.location.country}
          onChange={(e) => updatePersona('location', { country: e.target.value })}
          className="w-full px-4 py-4 text-lg rounded-2xl bg-wave-800/50 border border-wave-700/30 text-white focus:border-wave-500 focus:outline-none"
          placeholder="United States"
        />
      </div>

      <div>
        <label className="block text-wave-200 mb-3 font-medium">City</label>
        <input
          type="text"
          value={persona.location.city}
          onChange={(e) => updatePersona('location', { city: e.target.value })}
          className="w-full px-4 py-4 text-lg rounded-2xl bg-wave-800/50 border border-wave-700/30 text-white focus:border-wave-500 focus:outline-none"
          placeholder="San Francisco"
        />
      </div>

      <div>
        <label className="block text-wave-200 mb-3 font-medium">Area Type</label>
        <div className="space-y-3">
          {['urban', 'suburban', 'rural'].map((type) => (
            <button
              key={type}
              onClick={() => updatePersona('location', { urbanType: type })}
              className={`
                w-full px-4 py-4 rounded-2xl capitalize text-lg font-medium transition-all
                ${persona.location.urbanType === type
                  ? 'bg-wave-600 text-white border-2 border-wave-500'
                  : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
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

function MobileDemographicsStep({ persona, updatePersona }: any) {
  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const educationLevels = ['High School', 'Some College', 'Bachelor\'s', 'Master\'s', 'Doctorate'];
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-wave-200 mb-3 font-medium">Age Range</label>
        <div className="grid grid-cols-2 gap-3">
          {ageRanges.map((range) => (
            <button
              key={range}
              onClick={() => updatePersona('demographics', { ageRange: range })}
              className={`
                px-4 py-4 rounded-xl text-lg font-medium transition-all
                ${persona.demographics.ageRange === range
                  ? 'bg-wave-600 text-white border-2 border-wave-500'
                  : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3 font-medium">Education Level</label>
        <div className="space-y-3">
          {educationLevels.map((level) => (
            <button
              key={level}
              onClick={() => updatePersona('demographics', { educationLevel: level })}
              className={`
                w-full px-4 py-4 rounded-2xl text-lg font-medium transition-all text-left
                ${persona.demographics.educationLevel === level
                  ? 'bg-wave-600 text-white border-2 border-wave-500'
                  : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
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

function MobileProfessionalStep({ persona, updatePersona }: any) {
  const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Entertainment', 'Other'];
  const incomeRanges = ['Under $25k', '$25k-$50k', '$50k-$75k', '$75k-$100k', '$100k-$150k', '$150k+'];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-wave-200 mb-3 font-medium">Industry</label>
        <div className="grid grid-cols-2 gap-3">
          {industries.map((industry) => (
            <button
              key={industry}
              onClick={() => updatePersona('professional', { industry })}
              className={`
                px-4 py-4 rounded-xl text-lg font-medium transition-all
                ${persona.professional.industry === industry
                  ? 'bg-wave-600 text-white border-2 border-wave-500'
                  : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
                }
              `}
            >
              {industry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3 font-medium">Income Range</label>
        <div className="space-y-3">
          {incomeRanges.map((range) => (
            <button
              key={range}
              onClick={() => updatePersona('professional', { incomeRange: range })}
              className={`
                w-full px-4 py-4 rounded-2xl text-lg font-medium transition-all text-left
                ${persona.professional.incomeRange === range
                  ? 'bg-wave-600 text-white border-2 border-wave-500'
                  : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
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

function MobileInterestsStep({ persona, updatePersona }: any) {
  const interestCategories = [
    'Technology', 'Fashion', 'Gaming', 'Sports', 'Music',
    'Art & Design', 'Food & Cooking', 'Travel', 'Fitness',
    'Photography', 'Finance', 'Entertainment'
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
      <p className="text-wave-300 text-center">Select all that interest you</p>
      
      <div className="grid grid-cols-2 gap-3">
        {interestCategories.map((interest) => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={`
              px-4 py-4 rounded-xl text-lg font-medium transition-all
              ${persona.interests?.includes(interest)
                ? 'bg-wave-600 text-white border-2 border-wave-500'
                : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
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

function MobileTechStep({ persona, updatePersona }: any) {
  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'Reddit', 'Discord', 'Snapchat'];
  const devices = ['Smartphone', 'Laptop', 'Desktop', 'Tablet', 'Smart TV'];

  const toggleItem = (category: 'socialPlatforms' | 'primaryDevices', item: string) => {
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
      <div>
        <label className="block text-wave-200 mb-3 font-medium">Social Platforms</label>
        <div className="grid grid-cols-2 gap-3">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => toggleItem('socialPlatforms', platform)}
              className={`
                px-4 py-4 rounded-xl text-lg font-medium transition-all
                ${persona.tech.socialPlatforms?.includes(platform)
                  ? 'bg-wave-600 text-white border-2 border-wave-500'
                  : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
                }
              `}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3 font-medium">Primary Devices</label>
        <div className="grid grid-cols-2 gap-3">
          {devices.map((device) => (
            <button
              key={device}
              onClick={() => toggleItem('primaryDevices', device)}
              className={`
                px-4 py-4 rounded-xl text-lg font-medium transition-all
                ${persona.tech.primaryDevices?.includes(device)
                  ? 'bg-wave-600 text-white border-2 border-wave-500'
                  : 'bg-wave-800/50 text-wave-300 border-2 border-transparent hover:border-wave-600/50'
                }
              `}
            >
              {device}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
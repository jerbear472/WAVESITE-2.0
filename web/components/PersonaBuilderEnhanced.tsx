'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Heart as HeartIcon,
  Briefcase as BriefcaseIcon,
  Home as HomeIcon,
  Users as UsersIcon,
  Sparkles as SparklesIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon,
  Search as SearchIcon,
  X as XIcon
} from 'lucide-react';

import { PersonaData } from '@/hooks/usePersona';

// Data constants for consistency
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'KR', name: 'South Korea' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IL', name: 'Israel' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'ZA', name: 'South Africa' }
].sort((a, b) => a.name.localeCompare(b.name));

// Major cities by country (top 5-10 per country)
const CITIES_BY_COUNTRY: { [key: string]: string[] } = {
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Francisco', 'Austin', 'Seattle', 'Denver', 'Boston', 'Miami'],
  'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton'],
  'United Kingdom': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol', 'Leeds', 'Sheffield'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra'],
  'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund'],
  'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux'],
  'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Bilbao'],
  'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Venice'],
  'Japan': ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Yokohama'],
  'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Wuhan', 'Hangzhou', 'Nanjing', 'Xian'],
  'India': ['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Ahmedabad', 'Pune', 'Surat'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba'],
  'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan'],
};

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance & Banking', 'Education',
  'Retail & E-commerce', 'Entertainment & Media', 'Manufacturing', 
  'Real Estate', 'Hospitality & Tourism', 'Transportation & Logistics',
  'Consulting', 'Marketing & Advertising', 'Non-profit', 'Government',
  'Energy & Utilities', 'Agriculture', 'Construction', 'Legal',
  'Arts & Creative', 'Other'
];

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const EDUCATION_LEVELS = ['High School', 'Some College', 'Associate\'s', 'Bachelor\'s', 'Master\'s', 'Doctorate', 'Trade/Technical'];
const INCOME_RANGES = [
  'Under $25k', '$25k-$50k', '$50k-$75k', 
  '$75k-$100k', '$100k-$150k', '$150k-$200k', '$200k+'
];

const INTEREST_CATEGORIES = [
  { name: 'Technology', icon: '💻' },
  { name: 'Fashion', icon: '👗' },
  { name: 'Gaming', icon: '🎮' },
  { name: 'Sports', icon: '⚽' },
  { name: 'Music', icon: '🎵' },
  { name: 'Art & Design', icon: '🎨' },
  { name: 'Food & Cooking', icon: '🍳' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Fitness', icon: '💪' },
  { name: 'Photography', icon: '📸' },
  { name: 'Finance', icon: '💰' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Education', icon: '📚' },
  { name: 'Politics', icon: '🏛️' },
  { name: 'Science', icon: '🔬' },
  { name: 'Nature', icon: '🌿' },
  { name: 'DIY & Crafts', icon: '🔨' },
  { name: 'Cars', icon: '🚗' },
  { name: 'Beauty', icon: '💄' },
  { name: 'Pets', icon: '🐾' },
  { name: 'Parenting', icon: '👶' },
  { name: 'Health & Wellness', icon: '🧘' }
];

const steps = [
  { id: 'location', title: 'Location', icon: MapPinIcon, required: ['country', 'city'] },
  { id: 'demographics', title: 'About You', icon: UsersIcon, required: ['ageRange', 'educationLevel'] },
  { id: 'professional', title: 'Work & Income', icon: BriefcaseIcon, required: ['employmentStatus', 'industry'] },
  { id: 'interests', title: 'Interests', icon: HeartIcon, required: ['interests'] },
  { id: 'lifestyle', title: 'Lifestyle', icon: HomeIcon, required: [] },
  { id: 'tech', title: 'Tech & Social', icon: SparklesIcon, required: ['proficiency'] }
];

export default function PersonaBuilderEnhanced({ onComplete }: { onComplete: (data: PersonaData) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
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
      if (section === 'interests') {
        return { ...prev, interests: data };
      }
      return {
        ...prev,
        [section]: { ...prev[section as keyof PersonaData], ...data }
      };
    });
    // Clear errors when user makes changes
    setErrors({});
  };

  const validateStep = () => {
    const currentStepData = steps[currentStep];
    const newErrors: { [key: string]: string } = {};

    if (currentStepData.id === 'location') {
      if (!persona.location.country) newErrors.country = 'Please select a country';
      if (!persona.location.city) newErrors.city = 'Please enter a city';
    } else if (currentStepData.id === 'demographics') {
      if (!persona.demographics.ageRange) newErrors.ageRange = 'Please select your age range';
      if (!persona.demographics.educationLevel) newErrors.educationLevel = 'Please select your education level';
    } else if (currentStepData.id === 'professional') {
      if (!persona.professional.employmentStatus) newErrors.employmentStatus = 'Please select your employment status';
      if (!persona.professional.industry) newErrors.industry = 'Please select your industry';
    } else if (currentStepData.id === 'interests') {
      if (persona.interests.length === 0) newErrors.interests = 'Please select at least one interest';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete(persona);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const getStepProgress = () => {
    const progress = ((currentStep + 1) / steps.length) * 100;
    return progress;
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'location':
        return <LocationStepEnhanced persona={persona} updatePersona={updatePersona} errors={errors} />;
      case 'demographics':
        return <DemographicsStepEnhanced persona={persona} updatePersona={updatePersona} errors={errors} />;
      case 'professional':
        return <ProfessionalStepEnhanced persona={persona} updatePersona={updatePersona} errors={errors} />;
      case 'interests':
        return <InterestsStepEnhanced persona={persona} updatePersona={updatePersona} errors={errors} />;
      case 'lifestyle':
        return <LifestyleStepEnhanced persona={persona} updatePersona={updatePersona} errors={errors} />;
      case 'tech':
        return <TechStepEnhanced persona={persona} updatePersona={updatePersona} errors={errors} />;
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
          <div className="bg-wave-800/30 rounded-full h-2 mb-4 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-wave-500 to-wave-600 h-2"
              initial={{ width: 0 }}
              animate={{ width: `${getStepProgress()}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center cursor-pointer
                    ${index <= currentStep 
                      ? 'bg-gradient-to-br from-wave-500 to-wave-600 text-white' 
                      : 'bg-wave-800/50 text-wave-400'
                    }
                  `}
                  onClick={() => index < currentStep && setCurrentStep(index)}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="wave-card p-8 mb-8"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

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
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-wave-500 to-wave-600 text-white hover:from-wave-400 hover:to-wave-500 flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Step Components
function LocationStepEnhanced({ persona, updatePersona, errors }: any) {
  const [citySearch, setCitySearch] = useState(persona.location.city || '');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);

  useEffect(() => {
    if (persona.location.country && citySearch.length >= 2) {
      const cities = CITIES_BY_COUNTRY[persona.location.country] || [];
      const filtered = cities.filter(city => 
        city.toLowerCase().includes(citySearch.toLowerCase())
      );
      setFilteredCities(filtered);
      setShowCitySuggestions(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowCitySuggestions(false);
    }
  }, [citySearch, persona.location.country]);

  const handleCountryChange = (countryName: string) => {
    updatePersona('location', { country: countryName });
    // Reset city when country changes
    setCitySearch('');
    updatePersona('location', { city: '' });
  };

  const handleCitySelect = (city: string) => {
    setCitySearch(city);
    updatePersona('location', { city });
    setShowCitySuggestions(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Where are you based?</h2>
      
      <div>
        <label className="block text-wave-200 mb-2">
          Country <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <select
            value={persona.location.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={`
              w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white 
              focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20
              ${errors.country ? 'border-red-500' : 'border-wave-700/30'}
            `}
          >
            <option value="">Select a country...</option>
            {COUNTRIES.map(country => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
              <AlertCircleIcon className="w-4 h-4" />
              {errors.country}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-2">
          City <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              updatePersona('location', { city: e.target.value });
            }}
            onFocus={() => persona.location.country && setShowCitySuggestions(true)}
            placeholder={persona.location.country ? "Type to search cities..." : "Select a country first"}
            disabled={!persona.location.country}
            className={`
              w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white 
              focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20
              ${errors.city ? 'border-red-500' : 'border-wave-700/30'}
              ${!persona.location.country ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
          {persona.location.country && citySearch && (
            <button
              onClick={() => {
                setCitySearch('');
                updatePersona('location', { city: '' });
              }}
              className="absolute right-3 top-3.5 text-wave-400 hover:text-white"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
          
          {/* City suggestions dropdown */}
          {showCitySuggestions && filteredCities.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-wave-800 border border-wave-700/30 rounded-xl shadow-lg max-h-60 overflow-auto">
              {filteredCities.map(city => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className="w-full px-4 py-3 text-left hover:bg-wave-700/50 text-white transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          )}
          
          {errors.city && (
            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
              <AlertCircleIcon className="w-4 h-4" />
              {errors.city}
            </p>
          )}
        </div>
        {persona.location.country && !CITIES_BY_COUNTRY[persona.location.country] && (
          <p className="text-wave-400 text-sm mt-1">
            Type your city name manually
          </p>
        )}
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Area Type</label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'urban', label: 'Urban', description: 'City center' },
            { value: 'suburban', label: 'Suburban', description: 'Near city' },
            { value: 'rural', label: 'Rural', description: 'Countryside' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => updatePersona('location', { urbanType: type.value })}
              className={`
                px-4 py-3 rounded-xl transition-all text-center
                ${persona.location.urbanType === type.value
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              <div className="font-medium">{type.label}</div>
              <div className="text-xs opacity-75 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemographicsStepEnhanced({ persona, updatePersona, errors }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Tell us about yourself</h2>
      
      <div>
        <label className="block text-wave-200 mb-2">
          Age Range <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {AGE_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => updatePersona('demographics', { ageRange: range })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.demographics.ageRange === range
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
        {errors.ageRange && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircleIcon className="w-4 h-4" />
            {errors.ageRange}
          </p>
        )}
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
        <label className="block text-wave-200 mb-2">
          Education Level <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {EDUCATION_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => updatePersona('demographics', { educationLevel: level })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.demographics.educationLevel === level
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {level}
            </button>
          ))}
        </div>
        {errors.educationLevel && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircleIcon className="w-4 h-4" />
            {errors.educationLevel}
          </p>
        )}
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Relationship Status</label>
        <div className="grid grid-cols-2 gap-3">
          {['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'].map((status) => (
            <button
              key={status}
              onClick={() => updatePersona('demographics', { relationshipStatus: status })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.demographics.relationshipStatus === status
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Do you have children?</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' }
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => updatePersona('demographics', { hasChildren: option.value })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.demographics.hasChildren === option.value
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfessionalStepEnhanced({ persona, updatePersona, errors }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Work & Income</h2>
      
      <div>
        <label className="block text-wave-200 mb-2">
          Employment Status <span className="text-red-400">*</span>
        </label>
        <select
          value={persona.professional.employmentStatus}
          onChange={(e) => updatePersona('professional', { employmentStatus: e.target.value })}
          className={`
            w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white 
            focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20
            ${errors.employmentStatus ? 'border-red-500' : 'border-wave-700/30'}
          `}
        >
          <option value="">Select...</option>
          <option value="full-time">Full-time Employee</option>
          <option value="part-time">Part-time Employee</option>
          <option value="self-employed">Self-employed / Freelance</option>
          <option value="business-owner">Business Owner</option>
          <option value="student">Student</option>
          <option value="retired">Retired</option>
          <option value="unemployed">Currently Unemployed</option>
          <option value="homemaker">Homemaker</option>
        </select>
        {errors.employmentStatus && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircleIcon className="w-4 h-4" />
            {errors.employmentStatus}
          </p>
        )}
      </div>

      <div>
        <label className="block text-wave-200 mb-2">
          Industry <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry}
              onClick={() => updatePersona('professional', { industry })}
              className={`
                px-4 py-3 rounded-xl transition-all text-left
                ${persona.professional.industry === industry
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {industry}
            </button>
          ))}
        </div>
        {errors.industry && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircleIcon className="w-4 h-4" />
            {errors.industry}
          </p>
        )}
      </div>

      <div>
        <label className="block text-wave-200 mb-2">Annual Income Range</label>
        <div className="grid grid-cols-2 gap-3">
          {INCOME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => updatePersona('professional', { incomeRange: range })}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.professional.incomeRange === range
                  ? 'bg-wave-600 text-white shadow-lg'
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
        <label className="block text-wave-200 mb-2">Work Style</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'remote', label: 'Remote', icon: '🏠' },
            { value: 'hybrid', label: 'Hybrid', icon: '🔄' },
            { value: 'office', label: 'Office', icon: '🏢' }
          ].map((style) => (
            <button
              key={style.value}
              onClick={() => updatePersona('professional', { workStyle: style.value })}
              className={`
                px-4 py-3 rounded-xl transition-all flex flex-col items-center
                ${persona.professional.workStyle === style.value
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              <span className="text-2xl mb-1">{style.icon}</span>
              {style.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InterestsStepEnhanced({ persona, updatePersona, errors }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredInterests = INTEREST_CATEGORIES.filter(interest =>
    interest.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleInterest = (interest: string) => {
    const current = persona.interests || [];
    if (current.includes(interest)) {
      updatePersona('interests', current.filter((i: string) => i !== interest));
    } else {
      if (current.length < 10) { // Limit to 10 interests
        updatePersona('interests', [...current, interest]);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-2">What are you interested in?</h2>
      <p className="text-wave-300 mb-4">
        Select up to 10 interests (Selected: {persona.interests?.length || 0}/10) <span className="text-red-400">*</span>
      </p>
      
      <div className="relative">
        <SearchIcon className="absolute left-3 top-3.5 w-5 h-5 text-wave-400" />
        <input
          type="text"
          placeholder="Search interests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-400 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
        />
      </div>

      {errors.interests && (
        <p className="text-red-400 text-sm flex items-center gap-1">
          <AlertCircleIcon className="w-4 h-4" />
          {errors.interests}
        </p>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
        {filteredInterests.map((interest) => {
          const isSelected = persona.interests?.includes(interest.name);
          const isDisabled = !isSelected && persona.interests?.length >= 10;
          
          return (
            <button
              key={interest.name}
              onClick={() => !isDisabled && toggleInterest(interest.name)}
              disabled={isDisabled}
              className={`
                px-4 py-3 rounded-xl transition-all flex items-center gap-2
                ${isSelected
                  ? 'bg-wave-600 text-white shadow-lg'
                  : isDisabled
                  ? 'bg-wave-800/30 text-wave-600 cursor-not-allowed'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              <span className="text-xl">{interest.icon}</span>
              <span className="text-sm">{interest.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LifestyleStepEnhanced({ persona, updatePersona, errors }: any) {
  const shoppingHabits = [
    { value: 'Online-first', description: 'Prefer shopping online' },
    { value: 'In-store preference', description: 'Prefer physical stores' },
    { value: 'Research extensively', description: 'Compare before buying' },
    { value: 'Impulse buyer', description: 'Buy on the spot' },
    { value: 'Brand loyal', description: 'Stick to favorite brands' },
    { value: 'Deal hunter', description: 'Always look for discounts' },
    { value: 'Eco-conscious', description: 'Prefer sustainable options' },
    { value: 'Premium seeker', description: 'Quality over price' }
  ];
  
  const values = [
    'Sustainability', 'Innovation', 'Community', 'Privacy',
    'Quality', 'Value for Money', 'Convenience', 'Authenticity',
    'Social Impact', 'Personal Growth', 'Work-Life Balance', 'Family First'
  ];

  const mediaConsumption = [
    'Streaming Services', 'Social Media', 'Podcasts', 'YouTube',
    'Traditional TV', 'News Apps', 'Gaming', 'Books/E-books',
    'Radio', 'Newsletters', 'Blogs', 'Forums'
  ];

  const toggleItem = (category: 'shoppingHabits' | 'values' | 'mediaConsumption', item: string) => {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shoppingHabits.map((habit) => (
            <button
              key={habit.value}
              onClick={() => toggleItem('shoppingHabits', habit.value)}
              className={`
                px-4 py-3 rounded-xl transition-all text-left
                ${persona.lifestyle.shoppingHabits?.includes(habit.value)
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              <div className="font-medium">{habit.value}</div>
              <div className="text-xs opacity-75 mt-1">{habit.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3">Media Consumption</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mediaConsumption.map((media) => (
            <button
              key={media}
              onClick={() => toggleItem('mediaConsumption', media)}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${persona.lifestyle.mediaConsumption?.includes(media)
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {media}
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
                  ? 'bg-wave-600 text-white shadow-lg'
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

function TechStepEnhanced({ persona, updatePersona, errors }: any) {
  const devices = [
    { name: 'Smartphone', icon: '📱' },
    { name: 'Laptop', icon: '💻' },
    { name: 'Desktop', icon: '🖥️' },
    { name: 'Tablet', icon: '📱' },
    { name: 'Smart TV', icon: '📺' },
    { name: 'Smartwatch', icon: '⌚' },
    { name: 'Gaming Console', icon: '🎮' },
    { name: 'Smart Speaker', icon: '🔊' }
  ];
  
  const platforms = [
    { name: 'Instagram', color: 'from-purple-500 to-pink-500' },
    { name: 'TikTok', color: 'from-gray-900 to-gray-700' },
    { name: 'YouTube', color: 'from-red-600 to-red-700' },
    { name: 'Twitter/X', color: 'from-blue-500 to-blue-600' },
    { name: 'Facebook', color: 'from-blue-600 to-blue-700' },
    { name: 'LinkedIn', color: 'from-blue-700 to-blue-800' },
    { name: 'Reddit', color: 'from-orange-500 to-orange-600' },
    { name: 'Discord', color: 'from-purple-600 to-purple-700' },
    { name: 'Snapchat', color: 'from-yellow-400 to-yellow-500' },
    { name: 'Pinterest', color: 'from-red-500 to-red-600' },
    { name: 'WhatsApp', color: 'from-green-500 to-green-600' },
    { name: 'Telegram', color: 'from-blue-400 to-blue-500' }
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
        <label className="block text-wave-200 mb-2">
          Tech Proficiency <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'basic', label: 'Basic', description: 'Essential use only' },
            { value: 'intermediate', label: 'Intermediate', description: 'Comfortable user' },
            { value: 'advanced', label: 'Advanced', description: 'Power user' },
            { value: 'expert', label: 'Expert', description: 'Tech professional' }
          ].map((level) => (
            <button
              key={level.value}
              onClick={() => updatePersona('tech', { proficiency: level.value })}
              className={`
                px-4 py-3 rounded-xl transition-all text-left
                ${persona.tech.proficiency === level.value
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              <div className="font-medium capitalize">{level.label}</div>
              <div className="text-xs opacity-75 mt-1">{level.description}</div>
            </button>
          ))}
        </div>
        {errors.proficiency && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircleIcon className="w-4 h-4" />
            {errors.proficiency}
          </p>
        )}
      </div>

      <div>
        <label className="block text-wave-200 mb-3">Primary Devices</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {devices.map((device) => (
            <button
              key={device.name}
              onClick={() => toggleItem('primaryDevices', device.name)}
              className={`
                px-4 py-3 rounded-xl transition-all flex flex-col items-center
                ${persona.tech.primaryDevices?.includes(device.name)
                  ? 'bg-wave-600 text-white shadow-lg'
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              <span className="text-2xl mb-1">{device.icon}</span>
              <span className="text-sm">{device.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-wave-200 mb-3">Active Social Platforms</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => toggleItem('socialPlatforms', platform.name)}
              className={`
                px-4 py-3 rounded-xl transition-all relative overflow-hidden
                ${persona.tech.socialPlatforms?.includes(platform.name)
                  ? 'text-white shadow-lg' 
                  : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                }
              `}
            >
              {persona.tech.socialPlatforms?.includes(platform.name) && (
                <div className={`absolute inset-0 bg-gradient-to-br ${platform.color}`} />
              )}
              <span className="relative z-10">{platform.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
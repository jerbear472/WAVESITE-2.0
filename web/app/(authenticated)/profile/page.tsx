'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import { usePersona } from '@/hooks/usePersona';
import WaveLogo from '@/components/WaveLogo';
import { 
  User as UserIcon,
  MapPin as MapPinIcon,
  Briefcase as BriefcaseIcon,
  Heart as HeartIcon,
  Smartphone as SmartphoneIcon,
  Edit as EditIcon,
  ArrowLeft as ArrowLeftIcon,
  TrendingUp as TrendingUpIcon,
  Award as AwardIcon,
  Target as TargetIcon,
  Clock as ClockIcon,
  Zap as ZapIcon,
  Globe as GlobeIcon,
  ShoppingBag as ShoppingBagIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { personaData, loading: personaLoading, hasPersona } = usePersona();
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('Profile Page Debug:', {
      user: user?.id,
      hasPersona,
      personaLoading,
      personaData: personaData
    });
  }, [user, hasPersona, personaLoading, personaData]);

  const ProfileSection = ({ title, icon: Icon, children, className = "" }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 ${className}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </motion.div>
  );

  const DataGrid = ({ data }: { data: Array<{label: string, value: string, icon?: any}> }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.map((item, index) => (
        <motion.div 
          key={index} 
          whileHover={{ scale: 1.02 }}
          className="bg-gray-50/60 rounded-xl p-4 hover:bg-blue-50/30 transition-all duration-200 border border-gray-200/50 hover:border-blue-200/50"
        >
          <div className="flex items-start gap-3">
            {item.icon && (
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200/50">
                <item.icon className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium mb-1">{item.label}</p>
              <p className="text-gray-800 font-semibold">{item.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const getTagColor = (type: string) => {
    const colorMap: {[key: string]: string} = {
      'interest': 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      'tech': 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      'social': 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      'shopping': 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
      'value': 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
      'wave': 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
    };
    return colorMap[type] || colorMap['wave'];
  };

  const TagList = ({ items, type = 'wave' }: { items: string[], type?: string }) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <motion.span
          key={index}
          whileHover={{ scale: 1.05 }}
          className={`px-4 py-2 border rounded-full text-sm font-medium transition-all cursor-default ${getTagColor(type)}`}
        >
          {item}
        </motion.span>
      ))}
    </div>
  );

  if (!user || personaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Remove the persona check - show profile regardless
  // Users can still click "Build My Persona" button if they want to create one

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 sm:px-6 py-8 pt-12 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white transition-all shadow-sm border border-gray-200/50"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </motion.button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Profile
              </h1>
              <p className="text-gray-600">Personal information and preferences</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/persona')}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
          >
            <EditIcon className="w-4 h-4" />
            {hasPersona ? 'Edit Persona' : 'Build Persona'}
          </motion.button>
        </motion.div>

        {/* Persona Notice */}
        {!hasPersona && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium">
                  Build your persona to unlock personalized insights and complete your profile
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/persona')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Build Persona
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* User Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-lg border border-gray-200/50"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-3xl text-white shadow-lg">
              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{user.username || 'User'}</h2>
              <p className="text-gray-600 mb-6">{user.email}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  onHoverStart={() => setHoveredStat('trends')}
                  onHoverEnd={() => setHoveredStat(null)}
                  className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <TrendingUpIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{user.trends_spotted || 0}</p>
                      <p className="text-sm text-gray-600">Trends Spotted</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  onHoverStart={() => setHoveredStat('accuracy')}
                  onHoverEnd={() => setHoveredStat(null)}
                  className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <AwardIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{user.accuracy_score || 0}%</p>
                      <p className="text-sm text-gray-600">Accuracy</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  onHoverStart={() => setHoveredStat('validation')}
                  onHoverEnd={() => setHoveredStat(null)}
                  className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <TargetIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{user.validation_score || 0}</p>
                      <p className="text-sm text-gray-600">Validation Score</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location & Demographics */}
          {hasPersona && personaData.location?.city ? (
            <ProfileSection title="Location & Demographics" icon={MapPinIcon}>
              <DataGrid
                data={[
                  { 
                    label: 'Location', 
                    value: `${personaData.location.city}, ${personaData.location.country}`,
                    icon: GlobeIcon
                  },
                  { 
                    label: 'Area Type', 
                    value: personaData.location.urbanType ? personaData.location.urbanType.charAt(0).toUpperCase() + personaData.location.urbanType.slice(1) : 'Not specified',
                    icon: MapPinIcon
                  },
                  { 
                    label: 'Age Range', 
                    value: personaData.demographics?.ageRange || 'Not specified',
                    icon: ClockIcon
                  },
                  { 
                    label: 'Education', 
                    value: personaData.demographics?.educationLevel || 'Not specified',
                    icon: SparklesIcon
                  }
                ]}
              />
            </ProfileSection>
          ) : (
            <ProfileSection title="Location & Demographics" icon={MapPinIcon}>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPinIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No persona data available</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/persona')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Build Your Persona
                </motion.button>
              </div>
            </ProfileSection>
          )}

          {/* Professional Information */}
          {hasPersona && personaData.professional?.employmentStatus ? (
            <ProfileSection title="Professional Information" icon={BriefcaseIcon}>
              <DataGrid
                data={[
                  { 
                    label: 'Employment', 
                    value: personaData.professional.employmentStatus ? personaData.professional.employmentStatus.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified',
                    icon: BriefcaseIcon
                  },
                  { 
                    label: 'Industry', 
                    value: personaData.professional?.industry || 'Not specified',
                    icon: ZapIcon
                  },
                  { 
                    label: 'Income Range', 
                    value: personaData.professional?.incomeRange || 'Not specified',
                    icon: TrendingUpIcon
                  },
                  { 
                    label: 'Work Style', 
                    value: personaData.professional?.workStyle ? personaData.professional.workStyle.charAt(0).toUpperCase() + personaData.professional.workStyle.slice(1) : 'Not specified',
                    icon: ClockIcon
                  }
                ]}
              />
            </ProfileSection>
          ) : (
            <ProfileSection title="Professional Information" icon={BriefcaseIcon}>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BriefcaseIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No professional data available</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/persona')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Add Professional Info
                </motion.button>
              </div>
            </ProfileSection>
          )}

          {/* Interests */}
          <ProfileSection title="Interests & Hobbies" icon={HeartIcon}>
            {hasPersona && personaData.interests?.length > 0 ? (
              <TagList items={personaData.interests} type="interest" />
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HeartIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No interests added yet</p>
              </div>
            )}
          </ProfileSection>

          {/* Technology & Social Media */}
          <ProfileSection title="Technology & Social Media" icon={SmartphoneIcon}>
            {hasPersona && personaData.tech ? (
              <div className="space-y-6">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-3">Tech Proficiency</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: personaData.tech?.proficiency === 'basic' ? '25%' : 
                                 personaData.tech?.proficiency === 'intermediate' ? '50%' : 
                                 personaData.tech?.proficiency === 'advanced' ? '75%' : '100%' 
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-4"
                      />
                    </div>
                    <span className="text-gray-800 capitalize font-medium bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                      {personaData.tech?.proficiency || 'intermediate'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-3">Primary Devices</p>
                  <TagList items={personaData.tech?.primaryDevices || []} type="tech" />
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-3">Active Social Platforms</p>
                  <TagList items={personaData.tech?.socialPlatforms || []} type="social" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SmartphoneIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No technology preferences added yet</p>
              </div>
            )}
          </ProfileSection>
        </div>

        {/* Full Width Section */}
        {hasPersona && personaData.lifestyle ? (
          <ProfileSection title="Lifestyle & Values" icon={SparklesIcon} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-3 flex items-center gap-2">
                  <ShoppingBagIcon className="w-4 h-4 text-blue-600" />
                  Shopping Habits
                </p>
                <TagList items={personaData.lifestyle?.shoppingHabits || []} type="shopping" />
              </div>
              
              <div>
                <p className="text-gray-600 text-sm font-medium mb-3 flex items-center gap-2">
                  <HeartIcon className="w-4 h-4 text-blue-600" />
                  Core Values
                </p>
                <TagList items={personaData.lifestyle?.values || []} type="value" />
              </div>
            </div>
          </ProfileSection>
        ) : (
          <ProfileSection title="Lifestyle & Values" icon={SparklesIcon} className="mt-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No lifestyle preferences added yet</p>
            </div>
          </ProfileSection>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/persona')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl"
          >
            <EditIcon className="w-5 h-5" />
            {hasPersona ? 'Update My Persona' : 'Build My Persona'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium border border-gray-200 shadow-sm hover:shadow-md"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
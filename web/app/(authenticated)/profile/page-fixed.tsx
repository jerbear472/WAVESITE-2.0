'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePersona } from '@/hooks/usePersona';
import { useUserStats } from '@/hooks/useUserStats';
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
  Sparkles as SparklesIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  DollarSign as DollarSignIcon
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { personaData, loading: personaLoading, hasPersona } = usePersona();
  const { stats, loading: statsLoading, error: statsError } = useUserStats();

  // Debug logging
  useEffect(() => {
    console.log('Profile Page Debug:', {
      user: user?.id,
      hasPersona,
      personaLoading,
      personaData: personaData,
      stats,
      statsLoading,
      statsError
    });
  }, [user, hasPersona, personaLoading, personaData, stats, statsLoading, statsError]);

  const ProfileSection = ({ title, icon: Icon, children, className = "" }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-neutral-800 ${className}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-wave-500/10 to-wave-600/10 rounded-xl">
          <Icon className="w-6 h-6 text-wave-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );

  const DataGrid = ({ data }: { data: Array<{label: string, value: string, icon?: any}> }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.map((item, index) => (
        <div key={index} className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
          <div className="flex items-start gap-3">
            {item.icon && (
              <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
                <item.icon className="w-4 h-4 text-wave-500" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{item.label}</p>
              <p className="text-gray-900 dark:text-white font-semibold">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const getTagColor = (type: string) => {
    const colorMap: {[key: string]: string} = {
      'interest': 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
      'tech': 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
      'social': 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
      'shopping': 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
      'value': 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400',
      'wave': 'bg-wave-500/10 border-wave-500/20 text-wave-600 dark:text-wave-400'
    };
    return colorMap[type] || colorMap['wave'];
  };

  const TagList = ({ items, type = 'wave' }: { items: string[], type?: string }) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={index}
          className={`px-4 py-2 border rounded-full text-sm font-medium transition-all hover:scale-105 ${getTagColor(type)}`}
        >
          {item}
        </span>
      ))}
    </div>
  );

  if (!user || personaLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all shadow-sm"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                My Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Personal information and performance</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/persona')}
            className="px-5 py-2.5 bg-gradient-to-r from-wave-500 to-wave-600 text-white rounded-xl hover:from-wave-600 hover:to-wave-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <EditIcon className="w-4 h-4" />
            {hasPersona ? 'Edit Persona' : 'Build Persona'}
          </button>
        </motion.div>

        {/* Persona Notice */}
        {!hasPersona && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  Build your persona to unlock personalized insights and complete your profile
                </p>
              </div>
              <button
                onClick={() => router.push('/persona')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Build Persona
              </button>
            </div>
          </motion.div>
        )}

        {/* User Overview Card with REAL STATS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-wave-500 to-wave-600 rounded-2xl p-8 mb-8 shadow-lg text-white"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-3xl">
              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold mb-1">{user.username || 'User'}</h2>
              <p className="text-wave-100 mb-6">{user.email}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="flex flex-col items-center">
                    <TrendingUpIcon className="w-6 h-6 mb-2" />
                    <p className="text-2xl font-bold">{stats?.trends_submitted || 0}</p>
                    <p className="text-xs text-wave-100">Trends Spotted</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="flex flex-col items-center">
                    <AwardIcon className="w-6 h-6 mb-2" />
                    <p className="text-2xl font-bold">{stats?.accuracy_score || 0}%</p>
                    <p className="text-xs text-wave-100">Accuracy</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="flex flex-col items-center">
                    <TargetIcon className="w-6 h-6 mb-2" />
                    <p className="text-2xl font-bold">{stats?.validations_completed || 0}</p>
                    <p className="text-xs text-wave-100">Validations</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="flex flex-col items-center">
                    <DollarSignIcon className="w-6 h-6 mb-2" />
                    <p className="text-2xl font-bold">${(stats?.total_earned || 0).toFixed(2)}</p>
                    <p className="text-xs text-wave-100">Total Earned</p>
                  </div>
                </div>
              </div>

              {/* Additional Stats Row */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white/5 backdrop-blur rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-lg font-bold">{stats?.trends_approved || 0}</p>
                      <p className="text-xs text-wave-200">Approved</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircleIcon className="w-4 h-4 text-yellow-400" />
                    <div>
                      <p className="text-lg font-bold">{stats?.trends_pending || 0}</p>
                      <p className="text-xs text-wave-200">Pending</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-lg font-bold">{stats?.trends_rejected || 0}</p>
                      <p className="text-xs text-wave-200">Rejected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Performance Stats Section */}
        <ProfileSection title="Performance Metrics" icon={AwardIcon} className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.approval_rate || 0}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Approval Rate</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.accuracy_score || 0}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Validation Accuracy</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">${(stats?.pending_earnings || 0).toFixed(2)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pending Earnings</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl">
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">${(stats?.approved_earnings || 0).toFixed(2)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Approved Earnings</p>
            </div>
          </div>
        </ProfileSection>

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
                <p className="text-gray-500 dark:text-gray-400 mb-4">No persona data available</p>
                <button
                  onClick={() => router.push('/persona')}
                  className="px-4 py-2 bg-wave-500 text-white rounded-lg hover:bg-wave-600 transition-colors text-sm"
                >
                  Build Your Persona
                </button>
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
                <p className="text-gray-500 dark:text-gray-400 mb-4">No professional data available</p>
                <button
                  onClick={() => router.push('/persona')}
                  className="px-4 py-2 bg-wave-500 text-white rounded-lg hover:bg-wave-600 transition-colors text-sm"
                >
                  Add Professional Info
                </button>
              </div>
            </ProfileSection>
          )}

          {/* Interests */}
          <ProfileSection title="Interests & Hobbies" icon={HeartIcon}>
            {hasPersona && personaData.interests?.length > 0 ? (
              <TagList items={personaData.interests} type="interest" />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No interests added yet</p>
              </div>
            )}
          </ProfileSection>

          {/* Technology & Social Media */}
          <ProfileSection title="Technology & Social Media" icon={SmartphoneIcon}>
            {hasPersona && personaData.tech ? (
              <div className="space-y-6">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3">Tech Proficiency</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 dark:bg-neutral-800 rounded-full h-4 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: personaData.tech?.proficiency === 'basic' ? '25%' : 
                                 personaData.tech?.proficiency === 'intermediate' ? '50%' : 
                                 personaData.tech?.proficiency === 'advanced' ? '75%' : '100%' 
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="bg-gradient-to-r from-wave-500 to-wave-600 h-4"
                      />
                    </div>
                    <span className="text-gray-900 dark:text-white capitalize font-medium bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded-lg">
                      {personaData.tech?.proficiency || 'intermediate'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3">Primary Devices</p>
                  <TagList items={personaData.tech?.primaryDevices || []} type="tech" />
                </div>
                
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3">Active Social Platforms</p>
                  <TagList items={personaData.tech?.socialPlatforms || []} type="social" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No technology preferences added yet</p>
              </div>
            )}
          </ProfileSection>
        </div>

        {/* Full Width Section */}
        {hasPersona && personaData.lifestyle ? (
          <ProfileSection title="Lifestyle & Values" icon={SparklesIcon} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                  <ShoppingBagIcon className="w-4 h-4" />
                  Shopping Habits
                </p>
                <TagList items={personaData.lifestyle?.shoppingHabits || []} type="shopping" />
              </div>
              
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                  <HeartIcon className="w-4 h-4" />
                  Core Values
                </p>
                <TagList items={personaData.lifestyle?.values || []} type="value" />
              </div>
            </div>
          </ProfileSection>
        ) : (
          <ProfileSection title="Lifestyle & Values" icon={SparklesIcon} className="mt-6">
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No lifestyle preferences added yet</p>
            </div>
          </ProfileSection>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
        >
          <button
            onClick={() => router.push('/persona')}
            className="px-6 py-3 bg-gradient-to-r from-wave-500 to-wave-600 text-white rounded-xl hover:from-wave-600 hover:to-wave-700 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <EditIcon className="w-5 h-5" />
            {hasPersona ? 'Update My Persona' : 'Build My Persona'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all font-medium border border-gray-200 dark:border-neutral-800"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
}
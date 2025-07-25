'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
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
  Target as TargetIcon
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { personaData, loading: personaLoading, hasPersona } = usePersona();

  const ProfileSection = ({ title, icon: Icon, children }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="wave-card p-6 mb-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-wave-600/20 rounded-lg">
          <Icon className="w-5 h-5 text-wave-400" />
        </div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );

  const DataGrid = ({ data, columns = 2 }: { data: Array<{label: string, value: string}>, columns?: number }) => (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
      {data.map((item, index) => (
        <div key={index} className="bg-wave-800/30 rounded-lg p-4">
          <p className="text-wave-400 text-sm mb-1">{item.label}</p>
          <p className="text-wave-200 font-medium">{item.value}</p>
        </div>
      ))}
    </div>
  );

  const TagList = ({ items, color = 'wave' }: { items: string[], color?: string }) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={index}
          className={`px-3 py-1 bg-${color}-600/20 border border-${color}-600/30 rounded-full text-${color}-200 text-sm`}
        >
          {item}
        </span>
      ))}
    </div>
  );

  if (!user || personaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4"></div>
          <p className="text-wave-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!hasPersona) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <UserIcon className="w-16 h-16 text-wave-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Complete Your Persona</h2>
            <p className="text-wave-400">
              You haven't built your persona yet. Complete the persona builder to see your profile information.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/persona')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all"
            >
              Build My Persona
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-wave-800/50 text-white rounded-xl hover:bg-wave-700/50 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-wave-200 bg-clip-text text-transparent">
                My Profile
              </h1>
              <p className="text-wave-400">Personal information and preferences</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/persona')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all flex items-center gap-2"
          >
            <EditIcon className="w-4 h-4" />
            Edit Persona
          </button>
        </motion.div>

        {/* User Overview */}
        <ProfileSection title="Account Overview" icon={UserIcon}>
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-wave-400 to-wave-600 flex items-center justify-center font-bold text-2xl text-white">
              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-white mb-2">{user.username || 'User'}</h2>
              <p className="text-wave-300 mb-4">{user.email}</p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-wave-800/30 rounded-lg p-3">
                  <TrendingUpIcon className="w-6 h-6 text-wave-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-wave-200">{user.trends_spotted || 0}</p>
                  <p className="text-xs text-wave-500">Trends Spotted</p>
                </div>
                <div className="text-center bg-wave-800/30 rounded-lg p-3">
                  <AwardIcon className="w-6 h-6 text-wave-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-wave-200">{user.accuracy_score || 0}%</p>
                  <p className="text-xs text-wave-500">Accuracy Score</p>
                </div>
                <div className="text-center bg-wave-800/30 rounded-lg p-3">
                  <TargetIcon className="w-6 h-6 text-wave-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-wave-200">{user.validation_score || 0}</p>
                  <p className="text-xs text-wave-500">Validation Score</p>
                </div>
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* Location & Demographics */}
        <ProfileSection title="Location & Demographics" icon={MapPinIcon}>
          <DataGrid
            data={[
              { label: 'Location', value: `${personaData.location.city}, ${personaData.location.country}` },
              { label: 'Area Type', value: personaData.location.urbanType.charAt(0).toUpperCase() + personaData.location.urbanType.slice(1) },
              { label: 'Age Range', value: personaData.demographics.ageRange },
              { label: 'Education', value: personaData.demographics.educationLevel }
            ]}
          />
        </ProfileSection>

        {/* Professional Information */}
        <ProfileSection title="Professional Information" icon={BriefcaseIcon}>
          <DataGrid
            data={[
              { label: 'Employment', value: personaData.professional.employmentStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) },
              { label: 'Industry', value: personaData.professional.industry },
              { label: 'Income Range', value: personaData.professional.incomeRange },
              { label: 'Work Style', value: personaData.professional.workStyle.charAt(0).toUpperCase() + personaData.professional.workStyle.slice(1) }
            ]}
          />
        </ProfileSection>

        {/* Interests */}
        <ProfileSection title="Interests & Hobbies" icon={HeartIcon}>
          <TagList items={personaData.interests} color="green" />
        </ProfileSection>

        {/* Technology & Social Media */}
        <ProfileSection title="Technology & Social Media" icon={SmartphoneIcon}>
          <div className="space-y-4">
            <div>
              <p className="text-wave-400 mb-2">Tech Proficiency</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-wave-800/30 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-wave-500 to-wave-600 h-3 rounded-full"
                    style={{ 
                      width: personaData.tech.proficiency === 'basic' ? '25%' : 
                             personaData.tech.proficiency === 'intermediate' ? '50%' : 
                             personaData.tech.proficiency === 'advanced' ? '75%' : '100%' 
                    }}
                  ></div>
                </div>
                <span className="text-wave-200 capitalize">{personaData.tech.proficiency}</span>
              </div>
            </div>
            
            <div>
              <p className="text-wave-400 mb-2">Primary Devices</p>
              <TagList items={personaData.tech.primaryDevices} color="blue" />
            </div>
            
            <div>
              <p className="text-wave-400 mb-2">Active Social Platforms</p>
              <TagList items={personaData.tech.socialPlatforms} color="purple" />
            </div>
          </div>
        </ProfileSection>

        {/* Lifestyle & Values */}
        <ProfileSection title="Lifestyle & Values" icon={HeartIcon}>
          <div className="space-y-4">
            <div>
              <p className="text-wave-400 mb-2">Shopping Habits</p>
              <TagList items={personaData.lifestyle.shoppingHabits} color="orange" />
            </div>
            
            <div>
              <p className="text-wave-400 mb-2">Core Values</p>
              <TagList items={personaData.lifestyle.values} color="teal" />
            </div>
          </div>
        </ProfileSection>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 justify-center"
        >
          <button
            onClick={() => router.push('/persona')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all flex items-center gap-2"
          >
            <EditIcon className="w-5 h-5" />
            Update My Persona
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-wave-800/50 text-white rounded-xl hover:bg-wave-700/50 transition-all"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
}
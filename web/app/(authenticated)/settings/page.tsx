'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  User as UserIcon,
  Mail as MailIcon,
  Lock as LockIcon,
  Bell as BellIcon,
  Shield as ShieldIcon,
  Save as SaveIcon,
  Camera as CameraIcon,
  Upload as UploadIcon,
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon,
  Trash2 as TrashIcon,
  Loader2 as LoaderIcon,
  X as XIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Globe as GlobeIcon,
  Palette as PaletteIcon,
  Users as UsersIcon
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  notifications: {
    email: boolean;
    push: boolean;
    trends: boolean;
    earnings: boolean;
  };
  privacy: {
    profile_public: boolean;
    show_earnings: boolean;
    show_trends: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export default function ImprovedSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy' | 'admin'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    username: '',
    email: '',
    avatar_url: '',
    bio: '',
    website: '',
    notifications: {
      email: true,
      push: true,
      trends: true,
      earnings: true
    },
    privacy: {
      profile_public: true,
      show_earnings: false,
      show_trends: true
    },
    theme: 'system',
    language: 'en'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }
    if (user) {
      fetchProfile();
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      // First try user_profiles table
      let { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      // If user_profiles doesn't exist, try profiles table
      if (error?.code === '42P01') {
        const profilesResult = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (!profilesResult.error && profilesResult.data) {
          setIsAdmin(profilesResult.data.is_admin === true);
          return;
        }
      }
        
      if (!error && data) {
        setIsAdmin(data.role === 'admin' || data.role === 'manager');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // First try user_profiles table
      let { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // If user_profiles doesn't exist, try profiles table
      if (error?.code === '42P01') {
        const profilesResult = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        data = profilesResult.data;
        error = profilesResult.error;
      }
      
      if (error) throw error;
      
      if (data) {
        // Get the email from auth.user if not in profile
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        setProfile({
          id: data.id,
          username: data.username || authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || '',
          email: data.email || authUser?.email || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          website: data.website || '',
          notifications: data.notification_preferences || {
            email: true,
            push: true,
            trends: true,
            earnings: true
          },
          privacy: data.privacy_settings || {
            profile_public: true,
            show_earnings: false,
            show_trends: true
          },
          theme: data.theme || 'system',
          language: data.language || 'en'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setErrors({ fetch: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!profile.username || profile.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (profile.website && !/^https?:\/\/.+/.test(profile.website)) {
      newErrors.website = 'Please enter a valid URL starting with http:// or https://';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      setErrors({});
      
      // Update profile data - try user_profiles first, then profiles
      let { error } = await supabase
        .from('user_profiles')
        .update({
          username: profile.username,
          email: profile.email,
          bio: profile.bio,
          website: profile.website,
          avatar_url: profile.avatar_url,
          notification_preferences: profile.notifications,
          privacy_settings: profile.privacy,
          theme: profile.theme,
          // language: profile.language, // Removed - column doesn't exist in database
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
      
      // If user_profiles doesn't exist, try profiles table
      if (error?.code === '42P01') {
        const profilesResult = await supabase
          .from('profiles')
          .update({
            username: profile.username,
            email: profile.email,
            bio: profile.bio,
            website: profile.website,
            avatar_url: profile.avatar_url,
            notification_preferences: profile.notifications,
            privacy_settings: profile.privacy,
            theme: profile.theme,
            // language: profile.language, // Removed - column doesn't exist in database
            updated_at: new Date().toISOString()
          })
          .eq('id', user?.id);
        error = profilesResult.error;
      }
      
      if (error) throw error;
      
      // Also update auth metadata if email changed
      if (profile.email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profile.email
        });
        if (authError) throw authError;
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setErrors({ save: error.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      setErrors({});
      
      const file = event.target.files?.[0];
      if (!file) return;
      
      // Validate file
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      if (!fileExt || !validExtensions.includes(fileExt)) {
        throw new Error('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload to Supabase Storage with user-specific folder
      const fileName = `${user?.id}/avatar-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          throw new Error('Avatar storage is not configured. Please contact support.');
        }
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      // Update profile
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Save to database - try user_profiles first, then profiles
      let { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);
      
      if (updateError?.code === '42P01') {
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user?.id);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setErrors({ avatar: error.message || 'Failed to upload image' });
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploadingAvatar(true);
      
      // Try user_profiles first, then profiles
      let { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', user?.id);
      
      if (error?.code === '42P01') {
        await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user?.id);
      }
      
      setProfile(prev => ({ ...prev, avatar_url: '' }));
      setAvatarPreview(null);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error removing avatar:', error);
      setErrors({ avatar: 'Failed to remove avatar' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'account', label: 'Account', icon: LockIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'privacy', label: 'Privacy', icon: ShieldIcon },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: UsersIcon }] : [])
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <LoaderIcon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account preferences and privacy settings</p>
        </div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg flex items-center gap-3"
            >
              <CheckIcon className="w-5 h-5 text-green-500" />
              <span className="text-green-400">Changes saved successfully!</span>
            </motion.div>
          )}
          
          {errors.save && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-3"
            >
              <AlertCircleIcon className="w-5 h-5 text-red-500" />
              <span className="text-red-400">{errors.save}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs Navigation */}
        <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-2 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
              
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="flex flex-col items-center gap-4">
                    {/* Avatar */}
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl">
                        {avatarPreview || profile.avatar_url ? (
                          <Image
                            src={avatarPreview || profile.avatar_url || ''}
                            alt="Profile"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                            {profile.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Upload Overlay */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        {uploadingAvatar ? (
                          <LoaderIcon className="w-8 h-8 text-white animate-spin" />
                        ) : (
                          <CameraIcon className="w-8 h-8 text-white" />
                        )}
                      </button>
                    </div>
                    
                    {/* Upload/Remove Buttons */}
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                      >
                        <UploadIcon className="w-4 h-4" />
                        Upload New
                      </button>
                      {profile.avatar_url && (
                        <button
                          onClick={removeAvatar}
                          disabled={uploadingAvatar}
                          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    {errors.avatar && (
                      <p className="text-red-400 text-sm">{errors.avatar}</p>
                    )}
                  </div>
                  
                  {/* Form Fields */}
                  <div className="flex-1 space-y-4 w-full">
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                        className={`w-full px-4 py-2 bg-gray-700/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.username ? 'border-red-500' : 'border-gray-600'
                        }`}
                        placeholder="Enter your username"
                      />
                      {errors.username && (
                        <p className="text-red-400 text-sm mt-1">{errors.username}</p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-4 py-2 bg-gray-700/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.email ? 'border-red-500' : 'border-gray-600'
                        }`}
                        placeholder="your@email.com"
                      />
                      {errors.email && (
                        <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>
                    
                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    
                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={profile.website}
                        onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                        className={`w-full px-4 py-2 bg-gray-700/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.website ? 'border-red-500' : 'border-gray-600'
                        }`}
                        placeholder="https://yourwebsite.com"
                      />
                      {errors.website && (
                        <p className="text-red-400 text-sm mt-1">{errors.website}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Account Settings</h2>
              
              <div className="space-y-6">
                {/* Password Change */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="w-full px-4 py-2 pr-10 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter current password"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter new password"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                    
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Update Password
                    </button>
                  </div>
                </div>
                
                {/* Theme Settings */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-4">Appearance</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['light', 'dark', 'system'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setProfile(prev => ({ ...prev, theme: theme as any }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          profile.theme === theme
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <PaletteIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-300 capitalize">{theme}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Language Settings */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-4">Language</h3>
                  <select
                    value={profile.language}
                    onChange={(e) => setProfile(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Email Notifications</h3>
                      <p className="text-sm text-gray-400">Receive updates via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.notifications.email}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, email: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Push Notifications */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Push Notifications</h3>
                      <p className="text-sm text-gray-400">Get instant alerts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.notifications.push}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, push: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Trend Alerts */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Trend Alerts</h3>
                      <p className="text-sm text-gray-400">Notifications about trend updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.notifications.trends}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, trends: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Earnings Updates */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Earnings Updates</h3>
                      <p className="text-sm text-gray-400">Get notified about your earnings</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.notifications.earnings}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, earnings: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Privacy Settings</h2>
              
              <div className="space-y-4">
                {/* Public Profile */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Public Profile</h3>
                      <p className="text-sm text-gray-400">Allow others to view your profile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.privacy.profile_public}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, profile_public: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Show Earnings */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Show Earnings</h3>
                      <p className="text-sm text-gray-400">Display your earnings on your profile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.privacy.show_earnings}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, show_earnings: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Show Trends */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Show Trends</h3>
                      <p className="text-sm text-gray-400">Display trends you've spotted</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.privacy.show_trends}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, show_trends: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Danger Zone */}
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h3 className="text-lg font-medium text-red-400 mb-4">Danger Zone</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500 rounded-lg hover:bg-red-500/30 transition-colors">
                    Delete Account
                  </button>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
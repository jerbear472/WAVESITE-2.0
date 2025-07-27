'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  User as UserIcon,
  Mail as MailIcon,
  Lock as LockIcon,
  Bell as BellIcon,
  Palette as PaletteIcon,
  Globe as GlobeIcon,
  Shield as ShieldIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Camera as CameraIcon,
  Users as UsersIcon,
  UserCheck as UserCheckIcon,
  Building as BuildingIcon,
  Edit as EditIcon,
  X as XIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  Download as DownloadIcon,
  RefreshCw as RefreshCwIcon,
  ChevronDown as ChevronDownIcon
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

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'participant' | 'validator' | 'manager' | 'client' | 'admin';
  account_type: 'user' | 'client';
  organization?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  subscription_tier: string;
  trends_spotted: number;
  accuracy_score: number;
  total_earnings: number;
  permissions?: Record<string, boolean>;
  view_mode?: 'user' | 'professional';
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy' | 'admin'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    username: '',
    email: '',
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

  // Admin state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAccountType, setFilterAccountType] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<AdminUser>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdmin = user?.email === 'jeremyuys@gmail.com' || user?.email === 'enterprise@test.com' || user?.role === 'admin' || user?.is_admin;

  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile();
      if (isAdmin) {
        fetchAdminUsers();
      }
    }
  }, [user, authLoading, isAdmin]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // In a real app, fetch from user_profiles table
      setProfile({
        id: user?.id || '',
        username: user?.username || user?.email?.split('@')[0] || '',
        email: user?.email || '',
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
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      setAdminLoading(true);
      
      // Try both table names since they seem to be inconsistent
      let profiles, error;
      
      // Try 'profiles' first (as used in AuthContext)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (profilesError) {
        // Fallback to 'user_profiles'
        const { data: userProfilesData, error: userProfilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });
          
        profiles = userProfilesData;
        error = userProfilesError;
      } else {
        profiles = profilesData;
        error = profilesError;
      }

      if (error) throw error;

      // For missing users, we'll need to ensure profiles are created on signup
      // For now, map the profiles we have
      const mappedUsers = profiles?.map(profile => ({
        id: profile.id,
        username: profile.username || profile.email?.split('@')[0] || 'Unknown',
        email: profile.email || '',
        role: profile.role || 'participant',
        account_type: profile.account_type || 'user',
        organization: profile.organization,
        is_active: profile.is_active !== false,
        created_at: profile.created_at || new Date().toISOString(),
        last_login: profile.last_login,
        subscription_tier: profile.subscription_tier || 'free',
        trends_spotted: profile.trends_spotted || 0,
        accuracy_score: profile.accuracy_score || 0,
        total_earnings: profile.total_earnings || 0,
        permissions: profile.permissions || {},
        view_mode: profile.view_mode || 'user'
      })) || [];
      
      // Add hardcoded known users if they're missing
      const knownEmails = ['jeremyuys@gmail.com', 'mindmattermarket@gmail.com', 'test@enterprise.com', 'jeremyuys98@gmail.com'];
      const existingEmails = new Set(mappedUsers.map(u => u.email));
      
      for (const email of knownEmails) {
        if (!existingEmails.has(email)) {
          // Add a placeholder entry for missing users
          mappedUsers.push({
            id: email, // Use email as temporary ID
            username: email.split('@')[0],
            email: email,
            role: email === 'jeremyuys@gmail.com' ? 'admin' : 'participant',
            account_type: email.includes('enterprise') ? 'client' : 'user',
            organization: email.includes('enterprise') ? 'Enterprise Corp' : undefined,
            is_active: true,
            created_at: new Date().toISOString(),
            last_login: undefined,
            subscription_tier: 'free',
            trends_spotted: 0,
            accuracy_score: 0,
            total_earnings: 0,
            permissions: {},
            view_mode: 'user'
          });
        }
      }
      
      setAdminUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setSaving(true);
      // In a real app, update user_profiles table
      setProfile({ ...profile, ...updates });
      // Show success message
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateUserRole = async (userId: string, updates: Partial<AdminUser>) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: updates.role,
          account_type: updates.account_type,
          organization: updates.organization,
          is_active: updates.is_active,
          subscription_tier: updates.subscription_tier,
          permissions: updates.permissions,
          view_mode: updates.view_mode
        })
        .eq('id', userId);

      if (error) throw error;

      // Refresh users
      fetchAdminUsers();
      setEditingUser(null);
      setEditedData({});
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesAccountType = filterAccountType === 'all' || user.account_type === filterAccountType;

    return matchesSearch && matchesRole && matchesAccountType;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl safe-area-top safe-area-bottom">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-responsive-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-responsive-sm text-gray-400">Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 sm:mb-8 bg-gray-800/50 p-1 rounded-lg overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-responsive-xs transition-all whitespace-nowrap touch-target ${
              activeTab === 'profile' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-responsive-xs transition-all whitespace-nowrap touch-target ${
              activeTab === 'account' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <LockIcon className="w-4 h-4" />
            Account
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-responsive-xs transition-all whitespace-nowrap touch-target ${
              activeTab === 'notifications' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <BellIcon className="w-4 h-4" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-responsive-xs transition-all whitespace-nowrap touch-target ${
              activeTab === 'privacy' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <ShieldIcon className="w-4 h-4" />
            Privacy
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-responsive-xs transition-all whitespace-nowrap touch-target ${
                activeTab === 'admin' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'text-red-400 hover:text-white hover:bg-red-900/50'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              Admin
            </button>
          )}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-4 sm:p-6"
          >
            <h2 className="text-responsive-lg font-semibold text-white mb-4 sm:mb-6">Profile Information</h2>
            
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors">
                    <CameraIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{profile.username}</h3>
                  <p className="text-gray-400">{profile.email}</p>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-responsive-xs font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-responsive-xs font-medium text-gray-300 mb-2">Bio</label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-responsive-xs font-medium text-gray-300 mb-2">Website</label>
                <input
                  type="url"
                  value={profile.website || ''}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder="https://example.com"
                />
              </div>

              <button
                onClick={() => updateProfile(profile)}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium text-white transition-colors flex items-center gap-2"
              >
                <SaveIcon className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-4 sm:p-6"
          >
            <h2 className="text-responsive-lg font-semibold text-white mb-4 sm:mb-6">Account Settings</h2>
            
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-responsive-xs font-medium text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700/30 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-responsive-xs font-medium text-gray-300 mb-2">Password</label>
                <button className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-white transition-colors">
                  Change Password
                </button>
              </div>

              {/* Enterprise Access */}
              <div className="p-4 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-lg border border-cyan-700/50">
                <h3 className="text-lg font-medium text-white mb-2 flex items-center">
                  <BuildingIcon className="w-5 h-5 mr-2 text-cyan-400" />
                  Enterprise Dashboard Access
                </h3>
                {user?.is_admin || (user?.subscription_tier && ['professional', 'enterprise', 'hedge_fund'].includes(user.subscription_tier)) ? (
                  <div>
                    <p className="text-green-400 text-sm mb-3">✓ You have enterprise access</p>
                    <p className="text-gray-400 text-sm">
                      You can switch between User Mode (earn money) and Enterprise Dashboard (analytics) using the mode switcher in the navigation bar.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-400 text-sm mb-3">
                      Enterprise Dashboard provides advanced analytics, trend insights, and business intelligence tools.
                    </p>
                    <p className="text-yellow-400 text-sm">
                      Contact your administrator to request enterprise access.
                    </p>
                  </div>
                )}
              </div>

              {/* Theme */}
              <div>
                <label className="block text-responsive-xs font-medium text-gray-300 mb-2">Theme Preference</label>
                <select
                  value={profile.theme}
                  onChange={(e) => setProfile({ ...profile, theme: e.target.value as 'light' | 'dark' | 'system' })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-responsive-xs font-medium text-gray-300 mb-2">Language</label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              {/* Delete Account */}
              <div className="pt-6 border-t border-gray-700">
                <h3 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h3>
                <p className="text-gray-400 text-sm mb-4">Once you delete your account, there is no going back.</p>
                <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600 rounded-lg text-red-400 hover:text-red-300 transition-all">
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-4 sm:p-6"
          >
            <h2 className="text-responsive-lg font-semibold text-white mb-4 sm:mb-6">Notification Preferences</h2>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                <div>
                  <span className="text-white font-medium">Email Notifications</span>
                  <p className="text-responsive-xs text-gray-400 mt-1">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.notifications.email}
                  onChange={(e) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, email: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                <div>
                  <span className="text-white font-medium">Push Notifications</span>
                  <p className="text-responsive-xs text-gray-400 mt-1">Get push notifications in your browser</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.notifications.push}
                  onChange={(e) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, push: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                <div>
                  <span className="text-white font-medium">Trend Updates</span>
                  <p className="text-responsive-xs text-gray-400 mt-1">Notifications about your trend submissions</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.notifications.trends}
                  onChange={(e) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, trends: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                <div>
                  <span className="text-white font-medium">Earnings Updates</span>
                  <p className="text-responsive-xs text-gray-400 mt-1">Get notified about your earnings</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.notifications.earnings}
                  onChange={(e) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, earnings: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </motion.div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-4 sm:p-6"
          >
            <h2 className="text-responsive-lg font-semibold text-white mb-4 sm:mb-6">Privacy Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                <div>
                  <span className="text-white font-medium">Public Profile</span>
                  <p className="text-responsive-xs text-gray-400 mt-1">Allow others to see your profile</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.privacy.profile_public}
                  onChange={(e) => setProfile({
                    ...profile,
                    privacy: { ...profile.privacy, profile_public: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                <div>
                  <span className="text-white font-medium">Show Earnings</span>
                  <p className="text-responsive-xs text-gray-400 mt-1">Display your earnings on your profile</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.privacy.show_earnings}
                  onChange={(e) => setProfile({
                    ...profile,
                    privacy: { ...profile.privacy, show_earnings: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                <div>
                  <span className="text-white font-medium">Show Trends</span>
                  <p className="text-responsive-xs text-gray-400 mt-1">Let others see your submitted trends</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.privacy.show_trends}
                  onChange={(e) => setProfile({
                    ...profile,
                    privacy: { ...profile.privacy, show_trends: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </motion.div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Admin Users Section - Prominently display system administrators */}
            <div className="bg-gradient-to-r from-red-900/20 to-purple-900/20 backdrop-blur-md rounded-2xl border border-red-800/50 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldIcon className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-bold text-white">System Administrators</h2>
              </div>
              <p className="text-gray-300 mb-4">These users have full administrative access to the system</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Jeremy Uys - Primary Admin */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-semibold">Jeremy Uys</p>
                      <p className="text-gray-400 text-sm">jeremyuys@gmail.com</p>
                    </div>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                      Primary Admin
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Enterprise access enabled</p>
                    <p>• Full system permissions</p>
                    <p>• Mode switching enabled</p>
                  </div>
                </div>
                
                {/* Enterprise Test - Secondary Admin */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-semibold">Enterprise Test</p>
                      <p className="text-gray-400 text-sm">enterprise@test.com</p>
                    </div>
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
                      System Admin
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Enterprise dashboard access</p>
                    <p>• User management rights</p>
                    <p>• Full administrative control</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white mt-1">{adminUsers.length}</p>
                  </div>
                  <UsersIcon className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Users</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {adminUsers.filter(u => u.is_active).length}
                    </p>
                  </div>
                  <UserCheckIcon className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Client Accounts</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {adminUsers.filter(u => u.account_type === 'client').length}
                    </p>
                  </div>
                  <BuildingIcon className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Admins</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {adminUsers.filter(u => u.role === 'admin').length}
                    </p>
                  </div>
                  <ShieldIcon className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-white"
                >
                  <FilterIcon className="w-4 h-4" />
                  Filters
                </button>
                
                <button
                  onClick={fetchAdminUsers}
                  className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-white"
                >
                  <RefreshCwIcon className="w-5 h-5" />
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Filter by Role</label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="all">All Roles</option>
                      <option value="participant">Participant</option>
                      <option value="validator">Validator</option>
                      <option value="manager">Manager</option>
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Filter by Account Type</label>
                    <select
                      value={filterAccountType}
                      onChange={(e) => setFilterAccountType(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="user">User</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden">
              {adminLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading users...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Role & Type</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Organization</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Permissions</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{user.username}</p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editingUser === user.id ? (
                            <div className="space-y-2">
                              <select
                                value={editedData.role || user.role}
                                onChange={(e) => setEditedData({ ...editedData, role: e.target.value as AdminUser['role'] })}
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                              >
                                <option value="participant">Participant</option>
                                <option value="validator">Validator</option>
                                <option value="manager">Manager</option>
                                <option value="client">Client</option>
                                <option value="admin">Admin</option>
                              </select>
                              <select
                                value={editedData.account_type || user.account_type}
                                onChange={(e) => setEditedData({ ...editedData, account_type: e.target.value as AdminUser['account_type'] })}
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                              >
                                <option value="user">User</option>
                                <option value="client">Client</option>
                              </select>
                            </div>
                          ) : (
                            <div>
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                user.role === 'manager' ? 'bg-yellow-500/20 text-yellow-400' :
                                user.role === 'client' ? 'bg-purple-500/20 text-purple-400' :
                                user.role === 'validator' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {user.role}
                              </span>
                              <p className="text-gray-500 text-xs mt-1">{user.account_type}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUser === user.id ? (
                            <input
                              type="text"
                              value={editedData.organization || user.organization || ''}
                              onChange={(e) => setEditedData({ ...editedData, organization: e.target.value })}
                              placeholder="Organization name"
                              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white w-full"
                            />
                          ) : (
                            <p className="text-gray-300 text-sm">{user.organization || '-'}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUser === user.id ? (
                            <div className="space-y-1">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editedData.permissions?.can_switch_views ?? user.permissions?.can_switch_views ?? false}
                                  onChange={(e) => setEditedData({ 
                                    ...editedData, 
                                    permissions: { 
                                      ...user.permissions,
                                      ...editedData.permissions,
                                      can_switch_views: e.target.checked 
                                    }
                                  })}
                                  className="rounded border-gray-600 mr-2"
                                />
                                <span className="text-xs text-gray-300">Switch views</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editedData.permissions?.can_manage_users ?? user.permissions?.can_manage_users ?? false}
                                  onChange={(e) => setEditedData({ 
                                    ...editedData, 
                                    permissions: { 
                                      ...user.permissions,
                                      ...editedData.permissions,
                                      can_manage_users: e.target.checked 
                                    }
                                  })}
                                  className="rounded border-gray-600 mr-2"
                                />
                                <span className="text-xs text-gray-300">Manage users</span>
                              </label>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              {user.permissions?.can_switch_views && <p>• Switch views</p>}
                              {user.permissions?.can_manage_users && <p>• Manage users</p>}
                              {!user.permissions?.can_switch_views && !user.permissions?.can_manage_users && <p>-</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUser === user.id ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editedData.is_active ?? user.is_active}
                                onChange={(e) => setEditedData({ ...editedData, is_active: e.target.checked })}
                                className="rounded border-gray-600"
                              />
                              <span className="text-sm text-gray-300">Active</span>
                            </label>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {editingUser === user.id ? (
                              <>
                                <button
                                  onClick={() => updateUserRole(user.id, editedData)}
                                  className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-all"
                                >
                                  <SaveIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditedData({});
                                  }}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingUser(user.id);
                                  setEditedData({
                                    role: user.role,
                                    account_type: user.account_type,
                                    organization: user.organization,
                                    is_active: user.is_active,
                                    permissions: user.permissions
                                  });
                                }}
                                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded transition-all"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
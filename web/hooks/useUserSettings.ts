import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface UserSettings {
  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  trendAlerts: boolean;
  weeklyDigest: boolean;
  
  // Privacy settings
  profileVisibility: 'public' | 'private' | 'friends';
  dataSharing: boolean;
  analyticsTracking: boolean;
  
  // App preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  currency: string;
  
  // Feature preferences
  tutorialCompleted: boolean;
  onboardingCompleted: boolean;
  betaFeatures: boolean;
  
  // Custom settings
  customSettings: Record<string, any>;
}

const defaultSettings: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  trendAlerts: true,
  weeklyDigest: true,
  profileVisibility: 'public',
  dataSharing: false,
  analyticsTracking: true,
  theme: 'light',
  language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  tutorialCompleted: false,
  onboardingCompleted: false,
  betaFeatures: false,
  customSettings: {}
};

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        
        // Fetch from API with authentication
        const response = await fetch('/api/v1/settings', {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Transform API response to match frontend structure
          const transformedSettings: UserSettings = {
            emailNotifications: data.email_notifications,
            pushNotifications: data.push_notifications,
            trendAlerts: data.trend_alerts,
            weeklyDigest: data.weekly_digest,
            profileVisibility: data.profile_visibility,
            dataSharing: data.data_sharing,
            analyticsTracking: data.analytics_tracking,
            theme: data.theme,
            language: data.language,
            timezone: data.timezone,
            currency: data.currency,
            tutorialCompleted: data.tutorial_completed,
            onboardingCompleted: data.onboarding_completed,
            betaFeatures: data.beta_features,
            customSettings: data.custom_settings
          };
          
          setSettings(transformedSettings);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setError('Failed to load settings');
        
        // Fallback to localStorage for backward compatibility
        try {
          const savedSettings = localStorage.getItem(`settings_${user.id}`);
          if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            setSettings({ ...defaultSettings, ...parsedSettings });
          } else {
            setSettings(defaultSettings);
          }
        } catch (localError) {
          console.error('Error loading from localStorage:', localError);
          setSettings(defaultSettings);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    try {
      setError(null);
      
      // Transform frontend structure to API format
      const apiData = {
        email_notifications: newSettings.emailNotifications,
        push_notifications: newSettings.pushNotifications,
        trend_alerts: newSettings.trendAlerts,
        weekly_digest: newSettings.weeklyDigest,
        profile_visibility: newSettings.profileVisibility,
        data_sharing: newSettings.dataSharing,
        analytics_tracking: newSettings.analyticsTracking,
        theme: newSettings.theme,
        language: newSettings.language,
        timezone: newSettings.timezone,
        currency: newSettings.currency,
        tutorial_completed: newSettings.tutorialCompleted,
        onboarding_completed: newSettings.onboardingCompleted,
        beta_features: newSettings.betaFeatures,
        custom_settings: newSettings.customSettings
      };

      // Remove undefined values
      const cleanApiData = Object.fromEntries(
        Object.entries(apiData).filter(([_, value]) => value !== undefined)
      );

      // Save to API with authentication
      const response = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanApiData)
      });

      if (response.ok) {
        const savedData = await response.json();
        
        // Transform API response back to frontend structure
        const transformedSettings: UserSettings = {
          emailNotifications: savedData.email_notifications,
          pushNotifications: savedData.push_notifications,
          trendAlerts: savedData.trend_alerts,
          weeklyDigest: savedData.weekly_digest,
          profileVisibility: savedData.profile_visibility,
          dataSharing: savedData.data_sharing,
          analyticsTracking: savedData.analytics_tracking,
          theme: savedData.theme,
          language: savedData.language,
          timezone: savedData.timezone,
          currency: savedData.currency,
          tutorialCompleted: savedData.tutorial_completed,
          onboardingCompleted: savedData.onboarding_completed,
          betaFeatures: savedData.beta_features,
          customSettings: savedData.custom_settings
        };
        
        setSettings(transformedSettings);
        
        // Also save to localStorage as backup
        localStorage.setItem(`settings_${user.id}`, JSON.stringify(transformedSettings));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
      
      // Fallback to localStorage only
      try {
        const updatedSettings = { ...settings, ...newSettings };
        localStorage.setItem(`settings_${user.id}`, JSON.stringify(updatedSettings));
        setSettings(updatedSettings);
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
        throw error;
      }
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    await updateSettings({ [key]: value });
  };

  const resetSettings = async () => {
    if (!user) return;

    try {
      setError(null);
      
      const response = await fetch('/api/v1/settings', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSettings(defaultSettings);
        localStorage.removeItem(`settings_${user.id}`);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      setError('Failed to reset settings');
      throw error;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    updateSetting,
    resetSettings,
    setSettings
  };
}
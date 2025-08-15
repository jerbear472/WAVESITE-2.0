import { supabase } from '../config/supabase';
import { storage } from '../../App';

export interface UserPersona {
  username?: string;
  interests: string[];
  platforms: string[];
  persona_data?: {
    age_range?: string;
    content_preferences?: string[];
    engagement_style?: string;
    discovery_mode?: string;
    [key: string]: any;
  };
}

export interface UserProfile {
  id?: string;
  user_id: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  interests?: string[];
  platforms?: string[];
  persona_data?: any;
  personalization_completed?: boolean;
  onboarding_completed?: boolean;
}

class PersonaService {
  /**
   * Save persona data to both local storage and Supabase
   */
  async savePersona(userId: string, persona: UserPersona): Promise<void> {
    try {
      // Save to local storage for offline access
      storage.set('user_username', persona.username || '');
      storage.set('user_interests', JSON.stringify(persona.interests));
      storage.set('user_platforms', JSON.stringify(persona.platforms));
      storage.set('persona_data', JSON.stringify(persona.persona_data || {}));
      storage.set('personalization_completed', 'true');

      // Save to Supabase
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const profileData: Partial<UserProfile> = {
        username: persona.username,
        interests: persona.interests,
        platforms: persona.platforms,
        persona_data: persona.persona_data,
        personalization_completed: true,
      };

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
      } else {
        // Create new profile
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            ...profileData,
            user_id: userId,
          });

        if (error) {
          console.error('Error creating profile:', error);
          throw error;
        }
      }

      console.log('Persona saved successfully');
    } catch (error) {
      console.error('Failed to save persona:', error);
      throw error;
    }
  }

  /**
   * Load persona data from Supabase, falling back to local storage
   */
  async loadPersona(userId: string): Promise<UserPersona | null> {
    try {
      // Try to load from Supabase first
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('username, interests, platforms, persona_data')
        .eq('user_id', userId)
        .single();

      if (!error && profile) {
        // Update local storage with server data
        if (profile.username) storage.set('user_username', profile.username);
        if (profile.interests) storage.set('user_interests', JSON.stringify(profile.interests));
        if (profile.platforms) storage.set('user_platforms', JSON.stringify(profile.platforms));
        if (profile.persona_data) storage.set('persona_data', JSON.stringify(profile.persona_data));

        return {
          username: profile.username,
          interests: profile.interests || [],
          platforms: profile.platforms || [],
          persona_data: profile.persona_data,
        };
      }

      // Fallback to local storage if no server data
      const localUsername = storage.getString('user_username');
      const localInterests = storage.getString('user_interests');
      const localPlatforms = storage.getString('user_platforms');
      const localPersonaData = storage.getString('persona_data');

      if (localInterests || localPlatforms) {
        return {
          username: localUsername,
          interests: localInterests ? JSON.parse(localInterests) : [],
          platforms: localPlatforms ? JSON.parse(localPlatforms) : [],
          persona_data: localPersonaData ? JSON.parse(localPersonaData) : undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to load persona:', error);
      
      // Fallback to local storage on error
      const localUsername = storage.getString('user_username');
      const localInterests = storage.getString('user_interests');
      const localPlatforms = storage.getString('user_platforms');
      const localPersonaData = storage.getString('persona_data');

      if (localInterests || localPlatforms) {
        return {
          username: localUsername,
          interests: localInterests ? JSON.parse(localInterests) : [],
          platforms: localPlatforms ? JSON.parse(localPlatforms) : [],
          persona_data: localPersonaData ? JSON.parse(localPersonaData) : undefined,
        };
      }

      return null;
    }
  }

  /**
   * Update specific persona fields
   */
  async updatePersona(userId: string, updates: Partial<UserPersona>): Promise<void> {
    try {
      const currentPersona = await this.loadPersona(userId);
      const updatedPersona: UserPersona = {
        ...currentPersona,
        ...updates,
        interests: updates.interests || currentPersona?.interests || [],
        platforms: updates.platforms || currentPersona?.platforms || [],
      };

      await this.savePersona(userId, updatedPersona);
    } catch (error) {
      console.error('Failed to update persona:', error);
      throw error;
    }
  }

  /**
   * Check if personalization is completed
   */
  async isPersonalizationCompleted(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('personalization_completed')
        .eq('user_id', userId)
        .single();

      if (profile?.personalization_completed) {
        return true;
      }

      // Check local storage as fallback
      return storage.getString('personalization_completed') === 'true';
    } catch (error) {
      // Fallback to local storage
      return storage.getString('personalization_completed') === 'true';
    }
  }

  /**
   * Get full user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Clear local persona data (for logout)
   */
  clearLocalPersona(): void {
    storage.delete('user_username');
    storage.delete('user_interests');
    storage.delete('user_platforms');
    storage.delete('persona_data');
    storage.delete('personalization_completed');
  }
}

export const personaService = new PersonaService();
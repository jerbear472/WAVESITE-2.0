import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface PersonaData {
  location: {
    country: string;
    city: string;
    urbanType: 'urban' | 'suburban' | 'rural';
  };
  demographics: {
    ageRange: string;
    gender: string;
    educationLevel: string;
    relationshipStatus: string;
    hasChildren: boolean;
  };
  professional: {
    employmentStatus: string;
    industry: string;
    incomeRange: string;
    workStyle: 'remote' | 'hybrid' | 'office';
  };
  interests: string[];
  lifestyle: {
    shoppingHabits: string[];
    mediaConsumption: string[];
    values: string[];
  };
  tech: {
    proficiency: 'basic' | 'intermediate' | 'advanced' | 'expert';
    primaryDevices: string[];
    socialPlatforms: string[];
  };
}

const defaultPersonaData: PersonaData = {
  location: { country: '', city: '', urbanType: 'urban' },
  demographics: { ageRange: '', gender: '', educationLevel: '', relationshipStatus: '', hasChildren: false },
  professional: { employmentStatus: '', industry: '', incomeRange: '', workStyle: 'office' },
  interests: [],
  lifestyle: { shoppingHabits: [], mediaConsumption: [], values: [] },
  tech: { proficiency: 'intermediate', primaryDevices: [], socialPlatforms: [] }
};

export function usePersonaFixed() {
  const { user } = useAuth();
  const [personaData, setPersonaData] = useState<PersonaData>(defaultPersonaData);
  const [loading, setLoading] = useState(true);
  const [hasPersona, setHasPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persona data
  const loadPersonaData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Loading persona for user:', user.id);
      
      // Try to load from database directly using Supabase client
      const { data, error: dbError } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dbError) {
        console.error('Database error loading persona:', dbError);
        setError(dbError.message);
        
        // Fall back to localStorage
        const localData = localStorage.getItem(`persona_${user.id}`);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            setPersonaData(parsed);
            setHasPersona(true);
            console.log('Loaded persona from localStorage');
          } catch (e) {
            console.error('Error parsing localStorage data:', e);
          }
        }
      } else if (data) {
        // Transform database format to frontend format
        const transformed: PersonaData = {
          location: {
            country: data.location_country || '',
            city: data.location_city || '',
            urbanType: data.location_urban_type || 'urban'
          },
          demographics: {
            ageRange: data.age_range || '',
            gender: data.gender || '',
            educationLevel: data.education_level || '',
            relationshipStatus: data.relationship_status || '',
            hasChildren: data.has_children || false
          },
          professional: {
            employmentStatus: data.employment_status || '',
            industry: data.industry || '',
            incomeRange: data.income_range || '',
            workStyle: data.work_style || 'office'
          },
          interests: data.interests || [],
          lifestyle: {
            shoppingHabits: data.shopping_habits || [],
            mediaConsumption: data.media_consumption || [],
            values: data.values || []
          },
          tech: {
            proficiency: data.tech_proficiency || 'intermediate',
            primaryDevices: data.primary_devices || [],
            socialPlatforms: data.social_platforms || []
          }
        };
        
        setPersonaData(transformed);
        setHasPersona(true);
        console.log('Loaded persona from database');
        
        // Also save to localStorage as backup
        localStorage.setItem(`persona_${user.id}`, JSON.stringify(transformed));
      } else {
        console.log('No persona found in database');
        
        // Check localStorage
        const localData = localStorage.getItem(`persona_${user.id}`);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            setPersonaData(parsed);
            setHasPersona(true);
            console.log('Loaded persona from localStorage');
          } catch (e) {
            console.error('Error parsing localStorage data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading persona:', error);
      setError('Failed to load persona');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Save persona data
  const savePersonaData = useCallback(async (data: PersonaData) => {
    if (!user?.id) {
      console.error('No user ID available');
      return false;
    }

    setError(null);
    
    try {
      console.log('Saving persona for user:', user.id);
      
      // Transform frontend format to database format
      const dbData = {
        user_id: user.id,
        location_country: data.location.country,
        location_city: data.location.city,
        location_urban_type: data.location.urbanType,
        age_range: data.demographics.ageRange,
        gender: data.demographics.gender,
        education_level: data.demographics.educationLevel,
        relationship_status: data.demographics.relationshipStatus,
        has_children: data.demographics.hasChildren,
        employment_status: data.professional.employmentStatus,
        industry: data.professional.industry,
        income_range: data.professional.incomeRange,
        work_style: data.professional.workStyle,
        interests: data.interests,
        shopping_habits: data.lifestyle.shoppingHabits,
        media_consumption: data.lifestyle.mediaConsumption,
        values: data.lifestyle.values,
        tech_proficiency: data.tech.proficiency,
        primary_devices: data.tech.primaryDevices,
        social_platforms: data.tech.socialPlatforms,
        is_complete: true,
        completion_date: new Date().toISOString()
      };

      // Save directly to database using Supabase client
      const { data: savedData, error: saveError } = await supabase
        .from('user_personas')
        .upsert(dbData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (saveError) {
        console.error('Database error saving persona:', saveError);
        setError(saveError.message);
        
        // Still save to localStorage as fallback
        localStorage.setItem(`persona_${user.id}`, JSON.stringify(data));
        setPersonaData(data);
        setHasPersona(true);
        console.log('Saved to localStorage as fallback');
        
        return false;
      }

      console.log('Persona saved to database successfully');
      
      // Also save to localStorage as backup
      localStorage.setItem(`persona_${user.id}`, JSON.stringify(data));
      setPersonaData(data);
      setHasPersona(true);
      
      return true;
    } catch (error) {
      console.error('Error saving persona:', error);
      setError('Failed to save persona');
      
      // Try to at least save to localStorage
      try {
        localStorage.setItem(`persona_${user.id}`, JSON.stringify(data));
        setPersonaData(data);
        setHasPersona(true);
        console.log('Saved to localStorage as fallback');
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
      
      return false;
    }
  }, [user?.id]);

  // Load persona when user changes
  useEffect(() => {
    loadPersonaData();
  }, [loadPersonaData]);

  const updatePersonaData = (updates: Partial<PersonaData>) => {
    setPersonaData(prev => ({ ...prev, ...updates }));
  };

  return {
    personaData,
    setPersonaData,
    savePersonaData,
    updatePersonaData,
    loading,
    hasPersona,
    error,
    reload: loadPersonaData
  };
}
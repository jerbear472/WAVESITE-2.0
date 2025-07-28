import { useState, useEffect } from 'react';
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

// Mock data for demonstration - in real app this would come from API
const mockPersonaData: PersonaData = {
  location: {
    country: 'United States',
    city: 'San Francisco',
    urbanType: 'urban'
  },
  demographics: {
    ageRange: '25-34',
    gender: 'prefer-not-to-say',
    educationLevel: 'Bachelor\'s',
    relationshipStatus: 'single',
    hasChildren: false
  },
  professional: {
    employmentStatus: 'full-time',
    industry: 'Technology',
    incomeRange: '$75k-$100k',
    workStyle: 'remote'
  },
  interests: ['Technology', 'Gaming', 'Music', 'Art & Design', 'Finance'],
  lifestyle: {
    shoppingHabits: ['Online-first', 'Research extensively'],
    mediaConsumption: ['Streaming', 'Social Media', 'Podcasts'],
    values: ['Innovation', 'Privacy', 'Quality']
  },
  tech: {
    proficiency: 'advanced' as const,
    primaryDevices: ['Smartphone', 'Laptop', 'Desktop'],
    socialPlatforms: ['Twitter/X', 'Reddit', 'YouTube', 'LinkedIn']
  }
};

// Helper function to validate persona data
const isValidPersona = (data: PersonaData): boolean => {
  // Check if all required fields are filled
  return !!(
    data &&
    data.location?.country &&
    data.location?.city &&
    data.demographics?.ageRange &&
    data.demographics?.educationLevel &&
    data.professional?.employmentStatus &&
    data.professional?.industry &&
    data.interests?.length > 0
  );
};

export function usePersona() {
  const { user } = useAuth();
  const [personaData, setPersonaData] = useState<PersonaData>(defaultPersonaData);
  const [loading, setLoading] = useState(true);
  const [hasPersona, setHasPersona] = useState(false);

  useEffect(() => {
    const loadPersonaData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First check localStorage since API endpoint doesn't exist yet
        const savedPersona = localStorage.getItem(`persona_${user.id}`);
        if (savedPersona) {
          try {
            const parsedPersona = JSON.parse(savedPersona);
            // Validate the persona data before considering it valid
            if (isValidPersona(parsedPersona)) {
              setPersonaData(parsedPersona);
              setHasPersona(true);
              setLoading(false);
              return;
            } else {
              // Invalid persona data, clear it
              console.log('Invalid persona data found in localStorage, clearing...');
              localStorage.removeItem(`persona_${user.id}`);
            }
          } catch (parseError) {
            console.error('Error parsing persona from localStorage:', parseError);
            localStorage.removeItem(`persona_${user.id}`);
          }
        }

        // Try API as fallback (for future implementation)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('No session available for API call');
            setPersonaData(defaultPersonaData);
            setHasPersona(false);
            return;
          }

          const response = await fetch('/api/v1/persona', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data) {
              // Transform API response to match frontend structure
              const transformedData: PersonaData = {
                location: data.location,
                demographics: data.demographics,
                professional: data.professional,
                interests: data.interests,
                lifestyle: data.lifestyle,
                tech: data.tech
              };
              
              // Validate the transformed data
              if (isValidPersona(transformedData)) {
                setPersonaData(transformedData);
                setHasPersona(true);
                // Save to localStorage
                localStorage.setItem(`persona_${user.id}`, JSON.stringify(transformedData));
              } else {
                // Invalid persona data from API
                setPersonaData(defaultPersonaData);
                setHasPersona(false);
              }
            } else {
              // No persona found, use defaults
              setPersonaData(defaultPersonaData);
              setHasPersona(false);
            }
          } else {
            // No persona found, use defaults
            setPersonaData(defaultPersonaData);
            setHasPersona(false);
          }
        } catch (apiError) {
          // API call failed, persona doesn't exist
          console.log('Persona API not available, using localStorage only');
          setPersonaData(defaultPersonaData);
          setHasPersona(false);
        }
      } catch (error) {
        console.error('Error loading persona data:', error);
        setPersonaData(defaultPersonaData);
        setHasPersona(false);
      } finally {
        setLoading(false);
      }
    };

    loadPersonaData();
  }, [user]);

  const savePersonaData = async (data: PersonaData) => {
    if (!user) {
      console.error('No user found when trying to save persona');
      return;
    }

    console.log('Saving persona data:', data);
    console.log('User ID:', user.id);
    
    // Get the current session to access the token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No session found:', sessionError);
      // Still save to localStorage
      if (isValidPersona(data)) {
        localStorage.setItem(`persona_${user.id}`, JSON.stringify(data));
        setPersonaData(data);
        setHasPersona(true);
        console.log('Saved to localStorage only (no session)');
      }
      return;
    }

    console.log('Has access token:', !!session.access_token);

    try {
      // Save to API with authentication
      const response = await fetch('/api/v1/persona', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      console.log('API Response status:', response.status);

      if (response.ok) {
        const savedData = await response.json();
        console.log('API Response data:', savedData);
        // Transform API response to match frontend structure
        const transformedData: PersonaData = {
          location: savedData.location || data.location,
          demographics: savedData.demographics || data.demographics,
          professional: savedData.professional || data.professional,
          interests: savedData.interests || data.interests,
          lifestyle: savedData.lifestyle || data.lifestyle,
          tech: savedData.tech || data.tech
        };
        setPersonaData(transformedData);
        setHasPersona(true);
        
        // Also save to localStorage as backup
        localStorage.setItem(`persona_${user.id}`, JSON.stringify(transformedData));
        console.log('Persona saved successfully to API and localStorage');
      } else {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving persona data:', error);
      // Always save to localStorage if data is valid
      try {
        if (isValidPersona(data)) {
          localStorage.setItem(`persona_${user.id}`, JSON.stringify(data));
          setPersonaData(data);
          setHasPersona(true);
          console.log('Persona saved to localStorage as fallback');
        } else {
          console.error('Invalid persona data, not saving');
          console.log('Validation failed for:', data);
          throw new Error('Invalid persona data');
        }
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
        throw error;
      }
    }
  };

  const updatePersonaData = (updates: Partial<PersonaData>) => {
    setPersonaData(prev => ({ ...prev, ...updates }));
  };

  return {
    personaData,
    setPersonaData,
    savePersonaData,
    updatePersonaData,
    loading,
    hasPersona
  };
}
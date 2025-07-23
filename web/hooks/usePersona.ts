import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
        // In a real app, you would fetch from your API:
        // const response = await fetch(`/api/personas/${user.id}`);
        // const data = await response.json();
        
        // For now, use mock data or check localStorage
        const savedPersona = localStorage.getItem(`persona_${user.id}`);
        
        if (savedPersona) {
          const parsedPersona = JSON.parse(savedPersona);
          setPersonaData(parsedPersona);
          setHasPersona(true);
        } else {
          // Use mock data for demonstration
          setPersonaData(mockPersonaData);
          setHasPersona(true);
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
    if (!user) return;

    try {
      // In a real app, you would save to your API:
      // await fetch(`/api/personas/${user.id}`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });

      // For now, save to localStorage
      localStorage.setItem(`persona_${user.id}`, JSON.stringify(data));
      setPersonaData(data);
      setHasPersona(true);
    } catch (error) {
      console.error('Error saving persona data:', error);
      throw error;
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
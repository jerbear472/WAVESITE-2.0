import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersonaData } from '../types/persona';
import { useAuth } from '../contexts/AuthContext';

const defaultPersonaData: PersonaData = {
  location: { country: '', city: '', urbanType: 'urban' },
  demographics: { ageRange: '', gender: '', educationLevel: '', relationshipStatus: '', hasChildren: false },
  professional: { employmentStatus: '', industry: '', incomeRange: '', workStyle: 'office' },
  interests: [],
  lifestyle: { shoppingHabits: [], mediaConsumption: [], values: [] },
  tech: { proficiency: 'intermediate', primaryDevices: [], socialPlatforms: [] }
};

export function usePersona() {
  const { user } = useAuth();
  const [personaData, setPersonaData] = useState<PersonaData>(defaultPersonaData);
  const [loading, setLoading] = useState(true);
  const [hasPersona, setHasPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPersonaData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        
        // Try to fetch from API first
        const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/v1/persona`, {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            // Transform API response to match mobile structure
            const transformedData: PersonaData = {
              location: data.location,
              demographics: data.demographics,
              professional: data.professional,
              interests: data.interests,
              lifestyle: data.lifestyle,
              tech: data.tech
            };
            setPersonaData(transformedData);
            setHasPersona(true);
            
            // Save to AsyncStorage as backup
            await AsyncStorage.setItem(`persona_${user.id}`, JSON.stringify(transformedData));
          } else {
            setPersonaData(defaultPersonaData);
            setHasPersona(false);
          }
        } else if (response.status === 404) {
          // No persona found, use defaults
          setPersonaData(defaultPersonaData);
          setHasPersona(false);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.warn('Error loading persona from API, falling back to local storage:', error);
        setError('Failed to sync with server');
        
        // Fallback to AsyncStorage
        try {
          const savedPersona = await AsyncStorage.getItem(`persona_${user.id}`);
          if (savedPersona) {
            const parsedPersona = JSON.parse(savedPersona);
            setPersonaData(parsedPersona);
            setHasPersona(true);
          } else {
            setPersonaData(defaultPersonaData);
            setHasPersona(false);
          }
        } catch (localError) {
          console.error('Error loading from AsyncStorage:', localError);
          setPersonaData(defaultPersonaData);
          setHasPersona(false);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPersonaData();
  }, [user]);

  const savePersonaData = async (data: PersonaData) => {
    if (!user) return;

    try {
      setError(null);
      
      // Save to API first
      const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/v1/persona`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const savedData = await response.json();
        // Transform API response to match mobile structure
        const transformedData: PersonaData = {
          location: savedData.location,
          demographics: savedData.demographics,
          professional: savedData.professional,
          interests: savedData.interests,
          lifestyle: savedData.lifestyle,
          tech: savedData.tech
        };
        setPersonaData(transformedData);
        setHasPersona(true);
        
        // Also save to AsyncStorage as backup
        await AsyncStorage.setItem(`persona_${user.id}`, JSON.stringify(transformedData));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Error saving persona to API, saving locally:', error);
      setError('Failed to sync with server');
      
      // Fallback to AsyncStorage only
      try {
        await AsyncStorage.setItem(`persona_${user.id}`, JSON.stringify(data));
        setPersonaData(data);
        setHasPersona(true);
      } catch (localError) {
        console.error('Error saving to AsyncStorage:', localError);
        throw error;
      }
    }
  };

  const updatePersonaData = (updates: Partial<PersonaData>) => {
    const updatedData = { ...personaData, ...updates };
    setPersonaData(updatedData);
    
    // Auto-save to AsyncStorage for immediate persistence
    if (user) {
      AsyncStorage.setItem(`persona_${user.id}`, JSON.stringify(updatedData)).catch(console.error);
    }
  };

  const syncWithServer = async () => {
    if (!user || !hasPersona) return;

    try {
      setError(null);
      await savePersonaData(personaData);
    } catch (error) {
      console.error('Error syncing with server:', error);
      setError('Failed to sync with server');
    }
  };

  const clearPersona = async () => {
    if (!user) return;

    try {
      setError(null);
      
      // Delete from API
      const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/v1/persona`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      // Always clear local data regardless of API success
      await AsyncStorage.removeItem(`persona_${user.id}`);
      setPersonaData(defaultPersonaData);
      setHasPersona(false);
      
      if (!response.ok) {
        console.warn('Error deleting persona from API, but cleared locally');
        setError('Failed to sync deletion with server');
      }
    } catch (error) {
      console.error('Error clearing persona:', error);
      setError('Failed to clear persona');
      throw error;
    }
  };

  return {
    personaData,
    setPersonaData,
    savePersonaData,
    updatePersonaData,
    syncWithServer,
    clearPersona,
    loading,
    hasPersona,
    error
  };
}
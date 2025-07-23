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
    workStyle: 'office' | 'remote' | 'hybrid';
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
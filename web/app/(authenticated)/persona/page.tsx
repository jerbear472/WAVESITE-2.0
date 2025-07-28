'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PersonaBuilderEnhanced from '@/components/PersonaBuilderEnhanced';
import MobilePersonaBuilder from '@/components/MobilePersonaBuilder';
import { motion } from 'framer-motion';
import { usePersona } from '@/hooks/usePersona';

export default function PersonaPage() {
  const router = useRouter();
  const { savePersonaData, personaData } = usePersona();
  const [isComplete, setIsComplete] = useState(false);
  const [personaSummary, setPersonaSummary] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePersonaComplete = async (newPersonaData: any) => {
    console.log('Persona complete, attempting to save:', newPersonaData);
    
    try {
      const success = await savePersonaData(newPersonaData);
      
      if (success) {
        console.log('Persona saved successfully, redirecting to profile');
        // Small delay to ensure save completes
        setTimeout(() => {
          router.push('/profile');
        }, 100);
      } else {
        console.error('Persona save returned false');
        // Show completion screen but warn user
        alert('Your persona was saved locally but may not have synced to the server. Please check your internet connection.');
        setPersonaSummary(newPersonaData);
        setIsComplete(true);
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      // Still show completion screen if there's an error but data was saved locally
      alert('There was an error saving your persona. It has been saved locally and will sync when you reconnect.');
      setPersonaSummary(newPersonaData);
      setIsComplete(true);
    }
  };

  if (isComplete && personaSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="wave-card p-8 text-center"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-wave-300 bg-clip-text text-transparent mb-4">
              Persona Complete! 🎉
            </h1>
            <p className="text-wave-300 text-lg mb-8">
              We've built your personalized trend profile
            </p>

            <div className="bg-wave-800/30 rounded-2xl p-6 mb-8 text-left">
              <h2 className="text-xl font-semibold text-white mb-4">Your Profile Summary</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-wave-400 mb-1">Location</p>
                  <p className="text-wave-200">{personaSummary.location.city}, {personaSummary.location.country}</p>
                </div>
                <div>
                  <p className="text-wave-400 mb-1">Age Range</p>
                  <p className="text-wave-200">{personaSummary.demographics.ageRange}</p>
                </div>
                <div>
                  <p className="text-wave-400 mb-1">Industry</p>
                  <p className="text-wave-200">{personaSummary.professional.industry}</p>
                </div>
                <div>
                  <p className="text-wave-400 mb-1">Income Range</p>
                  <p className="text-wave-200">{personaSummary.professional.incomeRange}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-wave-400 mb-2">Top Interests</p>
                <div className="flex flex-wrap gap-2">
                  {(personaSummary.interests || []).slice(0, 5).map((interest: string) => (
                    <span key={interest} className="px-3 py-1 bg-wave-700/50 rounded-full text-wave-200 text-xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-wave-400 mb-2">Active Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {(personaSummary.tech?.socialPlatforms || []).slice(0, 5).map((platform: string) => (
                    <span key={platform} className="px-3 py-1 bg-wave-700/50 rounded-full text-wave-200 text-xs">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-gradient-to-r from-wave-500 to-wave-600 text-white rounded-xl hover:from-wave-400 hover:to-wave-500 transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setIsComplete(false);
                  setPersonaSummary(null);
                }}
                className="px-6 py-3 bg-wave-800/50 text-white rounded-xl hover:bg-wave-700/50 transition-all"
              >
                Edit Persona
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return isMobile ? (
    <MobilePersonaBuilder 
      onComplete={handlePersonaComplete} 
      onClose={() => router.push('/dashboard')}
      initialData={personaData}
    />
  ) : (
    <PersonaBuilderEnhanced onComplete={handlePersonaComplete} />
  );
}
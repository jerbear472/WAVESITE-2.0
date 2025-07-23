import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  interpolate,
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { SafeScreen } from '../SafeScreen';
import { Button } from '../Button';
import { theme } from '../../styles/theme';
import { PersonaData } from '../../types/persona';
import LocationStep from './steps/LocationStep';
import DemographicsStep from './steps/DemographicsStep';
import ProfessionalStep from './steps/ProfessionalStep';
import InterestsStep from './steps/InterestsStep';
import LifestyleStep from './steps/LifestyleStep';
import TechStep from './steps/TechStep';

const { width } = Dimensions.get('window');

const steps = [
  { id: 'location', title: 'Location', icon: '📍' },
  { id: 'demographics', title: 'About You', icon: '👥' },
  { id: 'professional', title: 'Work & Income', icon: '💼' },
  { id: 'interests', title: 'Interests', icon: '❤️' },
  { id: 'lifestyle', title: 'Lifestyle', icon: '🏠' },
  { id: 'tech', title: 'Tech & Social', icon: '✨' },
];

interface PersonaBuilderProps {
  onComplete: (data: PersonaData) => void;
}

export default function PersonaBuilder({ onComplete }: PersonaBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [persona, setPersona] = useState<PersonaData>({
    location: { country: '', city: '', urbanType: 'urban' },
    demographics: { ageRange: '', gender: '', educationLevel: '', relationshipStatus: '', hasChildren: false },
    professional: { employmentStatus: '', industry: '', incomeRange: '', workStyle: 'office' },
    interests: [],
    lifestyle: { shoppingHabits: [], mediaConsumption: [], values: [] },
    tech: { proficiency: 'intermediate', primaryDevices: [], socialPlatforms: [] },
  });

  const updatePersona = (section: keyof PersonaData, data: any) => {
    setPersona(prev => {
      if (section === 'interests') {
        return {
          ...prev,
          interests: data,
        };
      }
      
      return {
        ...prev,
        [section]: { ...prev[section as keyof PersonaData], ...data },
      };
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(persona);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'location':
        return <LocationStep persona={persona} updatePersona={updatePersona} />;
      case 'demographics':
        return <DemographicsStep persona={persona} updatePersona={updatePersona} />;
      case 'professional':
        return <ProfessionalStep persona={persona} updatePersona={updatePersona} />;
      case 'interests':
        return <InterestsStep persona={persona} updatePersona={updatePersona} />;
      case 'lifestyle':
        return <LifestyleStep persona={persona} updatePersona={updatePersona} />;
      case 'tech':
        return <TechStep persona={persona} updatePersona={updatePersona} />;
      default:
        return null;
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(((currentStep + 1) / steps.length) * width * 0.9),
    };
  });

  return (
    <SafeScreen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <Text style={styles.title}>Build Your Persona</Text>
          <Text style={styles.subtitle}>
            Help us understand you better to deliver personalized trend insights
          </Text>
        </Animated.View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
          <View style={styles.stepIndicators}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepIndicatorWrapper}>
                <TouchableOpacity
                  style={[
                    styles.stepIndicator,
                    index <= currentStep && styles.stepIndicatorActive,
                    index < currentStep && styles.stepIndicatorComplete,
                  ]}
                  disabled={index > currentStep}
                  onPress={() => index < currentStep && setCurrentStep(index)}
                >
                  <Text style={styles.stepIcon}>
                    {index < currentStep ? '✓' : step.icon}
                  </Text>
                </TouchableOpacity>
                {index === currentStep && (
                  <Text style={styles.stepLabel}>{step.title}</Text>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Content */}
        <Animated.View
          key={currentStep}
          entering={FadeIn.delay(200)}
          exiting={FadeOut}
          style={styles.content}
        >
          {renderStepContent()}
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            onPress={prevStep}
            disabled={currentStep === 0}
            style={[
              styles.navButton,
              styles.navButtonSecondary,
              currentStep === 0 && styles.navButtonDisabled,
            ]}
          >
            <Text style={styles.navButtonText}>← Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={nextStep}
            style={[styles.navButton, styles.navButtonPrimary]}
          >
            <Text style={styles.navButtonTextPrimary}>
              {currentStep === steps.length - 1 ? 'Complete' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  stepIndicatorWrapper: {
    alignItems: 'center',
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: theme.colors.primary,
  },
  stepIndicatorComplete: {
    backgroundColor: theme.colors.success,
  },
  stepIcon: {
    fontSize: 18,
  },
  stepLabel: {
    position: 'absolute',
    top: 48,
    fontSize: 12,
    color: theme.colors.textSecondary,
    width: 80,
    textAlign: 'center',
  },
  stepCounter: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  navButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  navButtonSecondary: {
    backgroundColor: theme.colors.surface,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  navButtonTextPrimary: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
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
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { SafeScreen } from '../SafeScreen';
import { theme } from '../../styles/theme';
import { PersonaData } from '../../types/persona';
import LocationStep from './steps/LocationStep';
import DemographicsStep from './steps/DemographicsStep';
import ProfessionalStep from './steps/ProfessionalStep';
import InterestsStep from './steps/InterestsStep';
import LifestyleStep from './steps/LifestyleStep';
import TechStep from './steps/TechStep';

const { width, height } = Dimensions.get('window');

const steps = [
  { id: 'location', title: 'Location', icon: '📍', color: '#FF6B6B' },
  { id: 'demographics', title: 'About You', icon: '👥', color: '#4ECDC4' },
  { id: 'professional', title: 'Work & Income', icon: '💼', color: '#45B7D1' },
  { id: 'interests', title: 'Interests', icon: '❤️', color: '#F7B731' },
  { id: 'lifestyle', title: 'Lifestyle', icon: '🏠', color: '#5F27CD' },
  { id: 'tech', title: 'Tech & Social', icon: '✨', color: '#00D2D3' },
];

interface PersonaBuilderProps {
  onComplete: (data: PersonaData) => void;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function PersonaBuilderEnhanced({ onComplete }: PersonaBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [persona, setPersona] = useState<PersonaData>({
    location: { country: '', city: '', urbanType: 'urban' },
    demographics: { ageRange: '', gender: '', educationLevel: '', relationshipStatus: '', hasChildren: false },
    professional: { employmentStatus: '', industry: '', incomeRange: '', workStyle: 'office' },
    interests: [],
    lifestyle: { shoppingHabits: [], mediaConsumption: [], values: [] },
    tech: { proficiency: 'intermediate', primaryDevices: [], socialPlatforms: [] },
  });

  const scrollY = useSharedValue(0);
  const stepProgress = useSharedValue(0);
  const backgroundRotation = useSharedValue(0);

  useEffect(() => {
    stepProgress.value = withSpring(currentStep / (steps.length - 1));
  }, [currentStep]);

  useEffect(() => {
    // Continuous background animation
    backgroundRotation.value = withSequence(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      withTiming(0, { duration: 0 })
    );
    const interval = setInterval(() => {
      backgroundRotation.value = withSequence(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      );
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
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

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${backgroundRotation.value}deg`,
        },
      ],
    };
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -50],
      'clamp'
    );
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0],
      'clamp'
    );
    
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const progressBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(stepProgress.value * width * 0.9),
    };
  });

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <Animated.View style={[styles.backgroundGradient, backgroundAnimatedStyle]}>
        <LinearGradient
          colors={['#0F2027', '#203A43', '#2C5364']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <Text style={styles.title}>Build Your Persona</Text>
          <Text style={styles.subtitle}>
            Help us understand you better to deliver personalized trend insights
          </Text>
        </Animated.View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressBarAnimatedStyle]}>
              <LinearGradient
                colors={[steps[currentStep].color, steps[Math.min(currentStep + 1, steps.length - 1)].color]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
          
          <View style={styles.stepIndicators}>
            {steps.map((step, index) => {
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <Animated.View
                  key={step.id}
                  entering={FadeIn.delay(index * 100)}
                  style={styles.stepIndicatorWrapper}
                >
                  <TouchableOpacity
                    style={[
                      styles.stepIndicator,
                      isActive && styles.stepIndicatorActive,
                      isCurrent && styles.stepIndicatorCurrent,
                    ]}
                    disabled={index > currentStep}
                    onPress={() => index < currentStep && setCurrentStep(index)}
                  >
                    <Animated.Text
                      style={[
                        styles.stepIcon,
                        isActive && styles.stepIconActive,
                      ]}
                    >
                      {index < currentStep ? '✓' : step.icon}
                    </Animated.Text>
                  </TouchableOpacity>
                  {isCurrent && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      exiting={FadeOut.duration(300)}
                      style={styles.stepLabelContainer}
                    >
                      <Text style={styles.stepLabel}>{step.title}</Text>
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })}
          </View>
          
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Content Card */}
        <Animated.View
          key={currentStep}
          entering={SlideInRight.springify().damping(15)}
          exiting={SlideOutLeft.springify().damping(15)}
          style={styles.contentCard}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.cardGradient}
          >
            {renderStepContent()}
          </LinearGradient>
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
            <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
              ← Previous
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={nextStep}
            style={styles.navButton}
          >
            <LinearGradient
              colors={[steps[currentStep].color, steps[Math.min(currentStep + 1, steps.length - 1)].color]}
              style={styles.navButtonGradient}
            >
              <Text style={styles.navButtonTextPrimary}>
                {currentStep === steps.length - 1 ? 'Complete' : 'Next →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2027',
  },
  backgroundGradient: {
    position: 'absolute',
    width: width * 2,
    height: height * 2,
    left: -width / 2,
    top: -height / 2,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepIndicatorWrapper: {
    alignItems: 'center',
  },
  stepIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepIndicatorActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  stepIndicatorCurrent: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  stepIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
  },
  stepIconActive: {
    color: '#FFFFFF',
  },
  stepLabelContainer: {
    position: 'absolute',
    top: 52,
  },
  stepLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  stepCounter: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  contentCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardGradient: {
    padding: 24,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    gap: 16,
  },
  navButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  navButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  navButtonTextPrimary: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
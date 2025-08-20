import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { storage } from '../../../App';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string[];
  icon: string;
  warning?: boolean;
  commitment?: boolean;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'WaveSight',
    subtitle: 'Digital Intelligence Standards',
    description: 'We\'re building a network of digital journalists who can identify trends that move markets.\n\nYour insights inform Fortune 500 decisions.\n\nTop analysts earn $500-1000 monthly through merit-based compensation.',
    gradient: ['#1a1a2e', '#16213e'],
    icon: '📊',
  },
  {
    id: '2',
    title: 'Performance Metrics',
    subtitle: 'Quality Over Quantity',
    description: 'Your accuracy score reflects the business value of your intelligence:\n\n90%+ accuracy = Enterprise-grade analyst\n80-90% = Verified intelligence contributor\n70-80% = Development needed\nBelow 70% = Training required\n\nMaintain journalistic integrity to maximize earnings.',
    gradient: ['#0f3460', '#16213e'],
    icon: '📊',
  },
  {
    id: '3',
    title: 'Intelligence Writing',
    subtitle: 'Business Journalism Standards',
    description: 'Write intelligence that C-suite executives will act on:\n\n❌ Amateur: "funny video trending"\n✅ Professional: "Gen Z workforce exodus from fast fashion"\n\nSpecify WHO, WHAT, WHERE, WHY, and IMPACT.\n\nThink like a business journalist, not a social media user.',
    gradient: ['#1a1a2e', '#0f3460'],
    icon: '✍️',
  },
  {
    id: '4',
    title: 'Editorial Review',
    subtitle: 'Peer Validation System',
    description: 'Three fellow analysts review each submission for business relevance:\n\n3 approvals = Publication-ready intelligence\n2 approvals = Solid analysis\n1 approval = Needs refinement\n0 approvals = Does not meet standards\n\nYour last 50 submissions determine your accuracy score.',
    gradient: ['#16213e', '#0f3460'],
    icon: '🔍',
  },
  {
    id: '5',
    title: 'Analyst Agreement',
    subtitle: 'Professional Standards',
    description: 'You\'re joining a network of serious digital intelligence professionals:\n\n✓ Provide actionable business intelligence\n✓ Maintain journalistic integrity\n✓ Accept merit-based compensation\n✓ Protect platform credibility\n\nYour insights reach Fortune 500 decision-makers.',
    gradient: ['#0f3460', '#16213e'],
    icon: '🤝',
    commitment: true,
  },
  {
    id: '6',
    title: 'Compensation Structure',
    subtitle: 'Merit-Based Earnings',
    description: 'Top digital journalists earn professional rates:\n\nEntry: $0.25/insight (building portfolio)\nVerified: $0.37+/insight (proven analyst)\nElite: $0.50+ base (trusted intelligence)\nMaster: $0.75+ base (industry expert)\n\nProfessional analysts earn $500-1000/month.',
    gradient: ['#1a1a2e', '#16213e'],
    icon: '💵',
  },
  {
    id: '7',
    title: 'Quality Assurance',
    subtitle: 'Editorial Standards',
    description: 'We maintain publication-quality standards through peer review:\n\n75% accuracy: Editorial guidance provided\n70% accuracy: Additional training resources\n65% accuracy: Mentorship program required\n60% accuracy: Not meeting publication standards\n\nWe support your growth as a digital journalist.',
    gradient: ['#16213e', '#0f3460'],
    icon: '📋',
    warning: true,
  },
  {
    id: '8',
    title: 'Join Our Network',
    subtitle: 'Digital Intelligence Professionals',
    description: 'Become a trusted source of business intelligence:\n\n• Professional digital journalists earn $500-1000/month\n• Your insights reach Fortune 500 decision-makers\n• Build a portfolio of business intelligence\n• Join an elite network of digital analysts\n\nReady to write intelligence that moves markets?',
    gradient: ['#1a1a2e', '#0f3460'],
    icon: '🌐',
    commitment: true,
  },
];

const CulturalAnalystOnboarding: React.FC = () => {
  const navigation = useNavigation();
  const { completeCulturalAnalystOnboarding } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAgreed, setUserAgreed] = useState(false);
  const translateX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const progressAnimation = useSharedValue(0);

  React.useEffect(() => {
    progressAnimation.value = withTiming((currentIndex + 1) / slides.length, {
      duration: 300,
    });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      ReactNativeHapticFeedback.trigger('impactLight');
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: SCREEN_WIDTH * nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      if (userAgreed) {
        completeOnboarding();
      } else {
        Alert.alert(
          'Agreement Required',
          'You must agree to maintain professional standards to continue.'
        );
      }
    }
  };

  const handleNotReady = () => {
    Alert.alert(
      'That\'s Okay',
      'WaveSight isn\'t for everyone. We respect your honesty.',
      [
        { text: 'Take Me Back', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: () => {
            // Go back to auth screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' as never }],
            });
          }
        }
      ]
    );
  };

  const completeOnboarding = () => {
    storage.set('cultural_analyst_onboarding_completed', 'true');
    storage.set('onboarding_completed', 'true');
    storage.set('onboarding_date', new Date().toISOString());
    storage.set('user_agreed_to_quality_standards', 'true');
    
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    
    // Update auth context
    completeCulturalAnalystOnboarding();
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
      ReactNativeHapticFeedback.trigger('selection');
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(
      progressAnimation.value,
      [0, 1],
      [0, 100],
      Extrapolate.CLAMP
    )}%`,
  }));

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    const titleTranslateY = useSharedValue(0);
    const titleOpacity = useSharedValue(0);

    React.useEffect(() => {
      if (index === currentIndex) {
        titleTranslateY.value = withTiming(0, { duration: 300 });
        titleOpacity.value = withTiming(1, { duration: 300 });
      }
    }, [currentIndex]);

    const titleStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: titleTranslateY.value }],
      opacity: titleOpacity.value,
    }));

    return (
      <View key={slide.id} style={styles.slide}>
        <LinearGradient
          colors={slide.gradient}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.slideContent}>
            {/* Icon */}
            <View style={styles.animationContainer}>
              <Animated.Text style={[styles.emoji, titleStyle]}>
                {slide.icon}
              </Animated.Text>
            </View>

            {/* Title Section */}
            <Animated.View style={[styles.textContainer, titleStyle]}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Text style={[
                styles.description,
                slide.warning && styles.warningText
              ]}>
                {slide.description}
              </Text>
              
              {slide.commitment && index === currentIndex && (
                <Animated.View 
                  entering={FadeIn.delay(1000)}
                  style={styles.agreementContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.agreementButton,
                      userAgreed && styles.agreementButtonSelected
                    ]}
                    onPress={() => {
                      setUserAgreed(!userAgreed);
                      ReactNativeHapticFeedback.trigger('impactMedium');
                    }}
                  >
                    <Text style={[
                      styles.agreementButtonText,
                      userAgreed && styles.agreementButtonTextSelected
                    ]}>
                      {userAgreed ? '✓' : '○'} I agree to maintain professional standards
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const dotWidth = useSharedValue(8);
          const dotOpacity = useSharedValue(0.3);

          React.useEffect(() => {
            dotWidth.value = withTiming(index === currentIndex ? 24 : 8, { duration: 200 });
            dotOpacity.value = withTiming(index === currentIndex ? 1 : 0.3, { duration: 200 });
          }, [currentIndex]);

          const dotStyle = useAnimatedStyle(() => ({
            width: dotWidth.value,
            opacity: dotOpacity.value,
          }));

          return (
            <Animated.View
              key={index}
              style={[styles.paginationDot, dotStyle]}
            />
          );
        })}
      </View>
    );
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        {renderPagination()}
        
        <View style={styles.buttonContainer}>
          {isLastSlide && (
            <TouchableOpacity
              style={styles.notReadyButton}
              onPress={handleNotReady}
            >
              <Text style={styles.notReadyButtonText}>This Isn't For Me</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={handleNext}
            onPressIn={() => {
              buttonScale.value = withTiming(0.95, { duration: 100 });
            }}
            onPressOut={() => {
              buttonScale.value = withTiming(1, { duration: 100 });
            }}
            activeOpacity={0.8}
            disabled={isLastSlide && !userAgreed}
            style={[
              styles.nextButtonContainer,
              isLastSlide && !userAgreed && styles.nextButtonDisabled
            ]}
          >
            <Animated.View style={[styles.nextButton, buttonAnimatedStyle]}>
              <LinearGradient
                colors={slides[currentIndex].gradient}
                style={styles.nextButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.nextButtonText}>
                  {isLastSlide ? "Join Digital Intelligence Network" : 'Next'}
                </Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  animationContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: -1,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  warningText: {
    fontSize: 15,
    lineHeight: 22,
  },
  agreementContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  agreementButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  agreementButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  agreementButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  agreementButtonTextSelected: {
    color: '#333',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  paginationDot: {
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  nextButtonContainer: {
    overflow: 'hidden',
    borderRadius: 30,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButton: {
    overflow: 'hidden',
    borderRadius: 30,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  notReadyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  notReadyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CulturalAnalystOnboarding;
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../../../App';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  type: 'hero' | 'question' | 'science' | 'howto' | 'xp' | 'competition' | 'recognition' | 'cta';
  title: string;
  subtitle?: string;
  description?: string;
  gradient: string[];
  icon?: string;
  points?: { label: string; value: string }[];
  steps?: { icon: string; title: string; description: string }[];
}

const slides: OnboardingSlide[] = [
  {
    id: 'hero',
    type: 'hero',
    title: 'See The Wave\nBefore It Breaks',
    subtitle: 'The app for people who spot trends first.',
    description: 'Do you have WaveSight?',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    id: 'question',
    type: 'question',
    title: 'The Question That\nChanges Everything',
    description: 'Every trend that moves markets, shapes culture, or breaks the internet follows predictable patterns.\n\nThe Roman Empire memes. Stanley Cups. Girl Dinner. GameStop.\n\nThey all started as whispers before becoming roars.',
    subtitle: 'What if you could see them coming?',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    id: 'science',
    type: 'science',
    title: 'Based on Actual Science,\nNot Guesswork',
    description: 'In 1976, Richard Dawkins discovered that ideas evolve like genes — replicating, mutating, and competing for survival. He called them memes.\n\nToday, we track cultural evolution in real-time.',
    subtitle: 'You\'re not just spotting trends.\nYou\'re mapping cultural DNA.',
    gradient: ['#4facfe', '#00f2fe'],
  },
  {
    id: 'howto',
    type: 'howto',
    title: 'How It Works',
    gradient: ['#43e97b', '#38f9d7'],
    steps: [
      {
        icon: '👁️',
        title: 'Spot the Signal',
        description: 'Find emerging trends before the algorithm does.',
      },
      {
        icon: '🔗',
        title: 'Track Evolution',
        description: 'Link mutations across platforms. Earn massive XP.',
      },
      {
        icon: '📈',
        title: 'Predict the Peak',
        description: 'Call 48-hour spikes. Stake your reputation.',
      },
      {
        icon: '✅',
        title: 'Prove Your Call',
        description: 'Submit evidence. Get validated. Build accuracy.',
      },
    ],
  },
  {
    id: 'xp',
    type: 'xp',
    title: 'The XP System',
    subtitle: 'Every action builds your WaveSight score',
    gradient: ['#fa709a', '#fee140'],
    points: [
      { label: 'Spot a trend', value: '+10 XP' },
      { label: 'Link evolution', value: '+50 XP' },
      { label: 'Predict correctly', value: '+100 XP' },
      { label: 'Map complete chain', value: '+500 XP' },
      { label: 'Win weekly challenge', value: '+1000 XP' },
    ],
  },
  {
    id: 'competition',
    type: 'competition',
    title: 'This Isn\'t Work.\nIt\'s Intellectual Sport.',
    gradient: ['#a8edea', '#fed6e3'],
    points: [
      { label: '🏆 Monthly Tournaments', value: 'Top 10 split prizes' },
      { label: '📈 Live Leaderboards', value: 'Watch your rank rise' },
      { label: '🎯 48-Hour Challenges', value: 'Predict explosive growth' },
      { label: '🔗 Evolution Mapping', value: 'Document the genome' },
    ],
  },
  {
    id: 'recognition',
    type: 'recognition',
    title: 'Your WaveSight Score\nMeans Something',
    description: 'Build a public portfolio of every correct prediction. Every evolution mapped. Every trend you called early.\n\nAll verified and on record.',
    subtitle: 'Join the founding analysts shaping how humanity tracks culture.',
    gradient: ['#ffecd2', '#fcb69f'],
  },
  {
    id: 'cta',
    type: 'cta',
    title: 'Ready to Develop\nYour WaveSight?',
    description: 'Join 1,000+ cultural analysts already calling the future.',
    gradient: ['#667eea', '#764ba2'],
  },
];

const WaveSightOnboarding: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    animateProgress();
  }, [currentIndex]);

  const animateProgress = () => {
    Animated.timing(progressAnimation, {
      toValue: (currentIndex + 1) / slides.length,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      ReactNativeHapticFeedback.trigger('impactLight');
      
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkip = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    completeOnboarding();
  };

  const handleGetStarted = () => {
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      completeOnboarding();
    });
  };

  const completeOnboarding = () => {
    storage.set('wavesight_onboarding_completed', 'true');
    storage.set('onboarding_completed', 'true');
    storage.set('onboarding_date', new Date().toISOString());
    
    // Navigate to main app
    // Note: Navigation will be handled by the parent navigator
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    return (
      <View key={slide.id} style={styles.slide}>
        <LinearGradient
          colors={slide.gradient}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View 
            style={[
              styles.slideContent,
              { opacity: fadeAnim }
            ]}
          >
            {slide.type === 'hero' && (
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{slide.title}</Text>
                <Text style={styles.heroSubtitle}>{slide.subtitle}</Text>
                <Text style={styles.heroDescription}>{slide.description}</Text>
              </View>
            )}

            {slide.type === 'question' && (
              <View style={styles.questionContent}>
                <Text style={styles.sectionTitle}>{slide.title}</Text>
                <Text style={styles.questionText}>{slide.description}</Text>
                <View style={styles.highlightBox}>
                  <Text style={styles.questionHighlight}>{slide.subtitle}</Text>
                </View>
              </View>
            )}

            {slide.type === 'science' && (
              <View style={styles.scienceContent}>
                <Text style={styles.sectionTitle}>{slide.title}</Text>
                <Text style={styles.scienceText}>{slide.description}</Text>
                <View style={styles.quoteBox}>
                  <Text style={styles.scienceQuote}>{slide.subtitle}</Text>
                </View>
              </View>
            )}

            {slide.type === 'howto' && (
              <View style={styles.howtoContent}>
                <Text style={styles.sectionTitle}>{slide.title}</Text>
                <View style={styles.stepsContainer}>
                  {slide.steps?.map((step, idx) => (
                    <Animated.View 
                      key={idx} 
                      style={[
                        styles.stepCard,
                        {
                          opacity: fadeAnim,
                          transform: [{
                            translateY: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0],
                            })
                          }]
                        }
                      ]}
                    >
                      <Text style={styles.stepIcon}>{step.icon}</Text>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}

            {slide.type === 'xp' && (
              <View style={styles.xpContent}>
                <Text style={styles.sectionTitle}>{slide.title}</Text>
                <Text style={styles.xpSubtitle}>{slide.subtitle}</Text>
                <View style={styles.xpGrid}>
                  {slide.points?.map((point, idx) => (
                    <View key={idx} style={styles.xpRow}>
                      <Text style={styles.xpLabel}>{point.label}</Text>
                      <Text style={styles.xpValue}>{point.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {slide.type === 'competition' && (
              <View style={styles.competitionContent}>
                <Text style={styles.sectionTitle}>{slide.title}</Text>
                <View style={styles.competitionGrid}>
                  {slide.points?.map((point, idx) => (
                    <View key={idx} style={styles.competitionCard}>
                      <Text style={styles.competitionLabel}>{point.label}</Text>
                      <Text style={styles.competitionValue}>{point.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {slide.type === 'recognition' && (
              <View style={styles.recognitionContent}>
                <Text style={styles.sectionTitle}>{slide.title}</Text>
                <Text style={styles.recognitionText}>{slide.description}</Text>
                <View style={styles.recognitionHighlight}>
                  <Text style={styles.recognitionSubtitle}>{slide.subtitle}</Text>
                </View>
              </View>
            )}

            {slide.type === 'cta' && (
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>{slide.title}</Text>
                <Text style={styles.ctaDescription}>{slide.description}</Text>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={handleGetStarted}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ctaButtonText}>Get Started</Text>
                    <Icon name="arrow-right" size={20} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                transform: [{
                  scaleX: progressAnimation
                }]
              }
            ]} 
          />
        </View>
      </View>

      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      {/* Navigation */}
      {currentIndex < slides.length - 1 && slides[currentIndex].type !== 'cta' && (
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradientBackground: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 56,
  },
  heroSubtitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
  },
  heroDescription: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  questionContent: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 40,
  },
  questionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
    opacity: 0.9,
  },
  highlightBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionHighlight: {
    fontSize: 22,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  scienceContent: {
    alignItems: 'center',
  },
  scienceText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
    opacity: 0.9,
  },
  quoteBox: {
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
    paddingLeft: 20,
    paddingVertical: 16,
  },
  scienceQuote: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    lineHeight: 26,
  },
  howtoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepsContainer: {
    marginTop: 20,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  stepIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    lineHeight: 20,
  },
  xpContent: {
    alignItems: 'center',
  },
  xpSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.9,
  },
  xpGrid: {
    width: '100%',
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  xpLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  competitionContent: {
    alignItems: 'center',
  },
  competitionGrid: {
    width: '100%',
  },
  competitionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  competitionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  competitionValue: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  recognitionContent: {
    alignItems: 'center',
  },
  recognitionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
    opacity: 0.9,
  },
  recognitionHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recognitionSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 48,
  },
  ctaDescription: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.9,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 10,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 100,
    left: 30,
    right: 30,
  },
  nextButton: {
    overflow: 'hidden',
    borderRadius: 30,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  pagination: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#fff',
  },
});

export default WaveSightOnboarding;
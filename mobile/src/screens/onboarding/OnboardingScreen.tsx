import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
// import LottieView from 'lottie-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../../../App';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  animation?: any;
  image?: any;
  gradient: string[];
  icon: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to',
    subtitle: 'WaveSight',
    description: 'Discover trending content and earn rewards for your insights',
    gradient: ['#667eea', '#764ba2'],
    icon: '🌊',
    // animation: require('../../assets/animations/welcome.json'),
  },
  {
    id: '2',
    title: 'Capture Trends',
    subtitle: 'Be First',
    description: 'Spot emerging trends from your favorite social platforms',
    gradient: ['#f093fb', '#f5576c'],
    icon: '📸',
    // animation: require('../../assets/animations/capture.json'),
  },
  {
    id: '3',
    title: 'Validate & Earn',
    subtitle: 'Get Rewarded',
    description: 'Validate trends and earn points for accurate predictions',
    gradient: ['#4facfe', '#00f2fe'],
    icon: '💎',
    // animation: require('../../assets/animations/rewards.json'),
  },
  {
    id: '4',
    title: 'Join Community',
    subtitle: 'Connect',
    description: 'Share insights with trend spotters worldwide',
    gradient: ['#43e97b', '#38f9d7'],
    icon: '🌍',
    // animation: require('../../assets/animations/community.json'),
  },
];

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const progressAnimation = useSharedValue(0);

  useEffect(() => {
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
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    completeOnboarding();
  };

  const completeOnboarding = () => {
    storage.set('onboarding_completed', 'true');
    storage.set('onboarding_date', new Date().toISOString());
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' as never }],
    });
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
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const titleTranslateY = useSharedValue(0);
    const titleOpacity = useSharedValue(0);

    useEffect(() => {
      if (index === currentIndex) {
        titleTranslateY.value = withSpring(0, {
          damping: 15,
          stiffness: 100,
        });
        titleOpacity.value = withTiming(1, { duration: 800 });
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
            {/* Icon or Animation */}
            <View style={styles.animationContainer}>
              <Animated.Text style={[styles.emoji, titleStyle]}>
                {slide.icon}
              </Animated.Text>
            </View>

            {/* Title Section */}
            <Animated.View style={[styles.textContainer, titleStyle]}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Text style={styles.description}>{slide.description}</Text>
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
          const inputRange = [index - 1, index, index + 1];
          const dotWidth = useSharedValue(8);
          const dotOpacity = useSharedValue(0.3);

          useEffect(() => {
            dotWidth.value = withSpring(index === currentIndex ? 24 : 8);
            dotOpacity.value = withTiming(index === currentIndex ? 1 : 0.3);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>
      </View>

      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

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
        
        <TouchableOpacity
          onPress={handleNext}
          onPressIn={() => {
            buttonScale.value = withSpring(0.95);
          }}
          onPressOut={() => {
            buttonScale.value = withSpring(1);
          }}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.nextButton, buttonAnimatedStyle]}>
            <LinearGradient
              colors={slides[currentIndex].gradient}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? "Let's Start" : 'Next'}
              </Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
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
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    paddingHorizontal: 40,
  },
  animationContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 120,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: -1,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
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
  nextButton: {
    overflow: 'hidden',
    borderRadius: 30,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default OnboardingScreen;
import React from 'react';
import { View, Image, Text, StyleSheet, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

let Animated: any;
let FadeIn: any;

try {
  const reanimated = require('react-native-reanimated');
  Animated = reanimated.default;
  FadeIn = reanimated.FadeIn;
} catch (error) {
  console.log('React Native Reanimated not available, using fallback');
  // Fallback to regular View
  Animated = {
    View: View
  };
  FadeIn = null;
}

interface LogoProps {
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ showText = true, size = 'medium', animated = true }) => {
  const logoSizes = {
    small: 60,
    medium: 100,
    large: 150,
  };

  const textSizes = {
    small: 24,
    medium: 36,
    large: 48,
  };

  const logoSize = logoSizes[size];
  const fontSize = textSizes[size];
  const borderRadius = logoSize * 0.3; // 30% of size for sleek rounded corners

  const LogoContent = (
    <View style={styles.container}>
      <View style={[styles.logoWrapper]}>
        <LinearGradient
          colors={['#0080ff20', '#00d4ff20', '#0080ff20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBorder, { 
            width: logoSize + 4, 
            height: logoSize + 4,
            borderRadius: borderRadius + 2,
          }]}
        >
          <View style={[styles.logoContainer, { 
            width: logoSize, 
            height: logoSize,
            borderRadius: borderRadius,
          }]}>
            <Image
              source={require('../assets/images/logo2.png')}
              style={[styles.logo, { 
                width: logoSize, 
                height: logoSize,
                borderRadius: borderRadius,
              }]}
              resizeMode="cover"
            />
          </View>
        </LinearGradient>
      </View>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize }]}>WAVESIGHT</Text>
          <Text style={[styles.tagline, { fontSize: fontSize * 0.35 }]}>Catch the Wave</Text>
        </View>
      )}
    </View>
  );

  if (animated && FadeIn) {
    return (
      <Animated.View entering={FadeIn.duration(1000).springify()}>
        {LogoContent}
      </Animated.View>
    );
  }

  // If animation is disabled or FadeIn is not available, wrap in Animated.View without animation
  if (animated && Animated.View !== View) {
    return (
      <Animated.View>
        {LogoContent}
      </Animated.View>
    );
  }

  return LogoContent;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 24,
  },
  gradientBorder: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    overflow: 'hidden',
    backgroundColor: '#000d1a',
    shadowColor: '#0080ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: Platform.select({
      ios: 'AvenirNext-Bold',
      android: 'sans-serif-condensed',
    }),
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: '#0080ff',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
    }),
    fontWeight: '400',
    color: '#4da8ff',
    letterSpacing: 1.5,
    marginTop: 4,
    textShadowColor: '#0080ff',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
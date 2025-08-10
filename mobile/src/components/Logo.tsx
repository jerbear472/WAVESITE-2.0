import React from 'react';
import { View, Image, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../styles/theme';

interface LogoProps {
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'light';
}

export const Logo: React.FC<LogoProps> = ({ 
  showText = true, 
  size = 'medium',
  variant = 'default'
}) => {
  const logoSizes = {
    small: 32,
    medium: 40,
    large: 48,
  };

  const textSizes = {
    small: 20,
    medium: 24,
    large: 32,
  };

  const logoSize = logoSizes[size];
  const fontSize = textSizes[size];

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image
          source={require('../assets/images/logo2.png')}
          style={[styles.logo, { 
            width: logoSize, 
            height: logoSize,
          }]}
          resizeMode="contain"
        />
        {showText && (
          <View style={styles.textContainer}>
            <Text style={[styles.title, { fontSize }]}>
              <Text style={[styles.titleWave, variant === 'light' && styles.titleLight]}>
                Wave
              </Text>
              <Text style={[styles.titleSight, variant === 'light' && styles.titleSightLight]}>
                Sight
              </Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    borderRadius: theme.borderRadius.md,
  },
  textContainer: {
    flexDirection: 'row',
  },
  title: {
    flexDirection: 'row',
  },
  titleWave: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
    fontWeight: '300',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  titleSight: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
    fontWeight: '400',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  titleLight: {
    color: theme.colors.dark.text,
  },
  titleSightLight: {
    color: theme.colors.primaryLight,
  },
});
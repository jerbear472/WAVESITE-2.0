import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { designSystem } from '../styles/designSystem';

const { colors, spacing, typography } = designSystem;

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/app-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>WaveSight</Text>
      <Text style={styles.subtitle}>Enterprise Signal Intelligence</Text>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.tertiary,
    marginBottom: spacing.xxl,
  },
  loader: {
    marginTop: spacing.xl,
  },
});

import React, { useEffect } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationService } from './services/NotificationService';
import { RootNavigator } from './navigation/RootNavigator';
import { PrivacyOverlay } from './components/PrivacyOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { enhancedTheme } from './styles/theme.enhanced';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function AppEnhanced() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    NotificationService.initialize();
    
    // Animated background
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 30000,
        easing: Easing.linear,
      }),
      -1
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <ErrorBoundary>
      <StatusBar barStyle="light-content" backgroundColor={enhancedTheme.colors.background} />
      <View style={styles.container}>
        <AnimatedLinearGradient
          colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, animatedStyle]}
        />
        <View style={styles.overlay} />
        
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AuthProvider>
              <NavigationContainer
                theme={{
                  dark: true,
                  colors: {
                    primary: enhancedTheme.colors.accent,
                    background: 'transparent',
                    card: enhancedTheme.colors.backgroundSecondary,
                    text: enhancedTheme.colors.text,
                    border: enhancedTheme.colors.border,
                    notification: enhancedTheme.colors.accent,
                  },
                }}
              >
                <PrivacyOverlay>
                  <RootNavigator />
                </PrivacyOverlay>
              </NavigationContainer>
            </AuthProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});
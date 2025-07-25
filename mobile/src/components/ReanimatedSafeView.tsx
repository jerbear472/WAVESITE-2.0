import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface ReanimatedSafeViewProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ReanimatedSafeView = ({ 
  children, 
  fallback 
}: ReanimatedSafeViewProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure Reanimated is initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return fallback || (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0080ff" />
      </View>
    );
  }

  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
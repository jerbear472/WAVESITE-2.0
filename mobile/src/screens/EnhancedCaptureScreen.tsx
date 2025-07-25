import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollSessionEnhancedForwardRef as ScrollSession, ScrollSessionRef } from '../components/ScrollSession/ScrollSessionEnhancedForwardRef';
import { FloatingTrendLogger } from '../components/TrendLogger/FloatingTrendLogger';
import CaptureTrendsScreenEnhanced from './CaptureTrendsScreenEnhanced';
import { enhancedTheme } from '../styles/theme.enhanced';

export const EnhancedCaptureScreen: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const scrollSessionRef = useRef<ScrollSessionRef>(null);

  const handleSessionStateChange = useCallback((active: boolean) => {
    setIsSessionActive(active);
  }, []);

  const handleTrendLogged = useCallback(() => {
    // Increment trend count in session
    scrollSessionRef.current?.incrementTrendCount();
  }, []);

  return (
    <View style={styles.container}>
      {/* Scroll Session Timer at the top */}
      <View style={styles.sessionWrapper}>
        <ScrollSession
          ref={scrollSessionRef}
          onSessionStateChange={handleSessionStateChange}
        />
      </View>

      {/* Original Capture Trends Screen */}
      <View style={styles.captureContainer}>
        <CaptureTrendsScreenEnhanced />
      </View>

      {/* Floating Trend Logger */}
      <FloatingTrendLogger
        isSessionActive={isSessionActive}
        onTrendLogged={handleTrendLogged}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  sessionWrapper: {
    backgroundColor: '#001a33',
    borderBottomWidth: 1,
    borderBottomColor: '#0080ff20',
    shadowColor: '#0080ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingVertical: 4,
  },
  captureContainer: {
    flex: 1,
  },
});
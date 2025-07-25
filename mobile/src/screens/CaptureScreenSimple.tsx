import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ScrollSession, ScrollSessionRef } from '../components/ScrollSession/ScrollSessionSimple';
import { FloatingTrendLogger } from '../components/TrendLogger/FloatingTrendLoggerSimple';
import CaptureTrendsScreen from './CaptureTrendsScreen';

export const CaptureScreenSimple: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const scrollSessionRef = useRef<ScrollSessionRef>(null);

  const handleSessionStateChange = useCallback((active: boolean) => {
    setIsSessionActive(active);
  }, []);

  const handleTrendLogged = useCallback(() => {
    scrollSessionRef.current?.incrementTrendCount();
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Scroll Session at the top */}
        <ScrollSession
          ref={scrollSessionRef}
          onSessionStateChange={handleSessionStateChange}
        />

        {/* Main Capture Screen Content */}
        <View style={styles.content}>
          <CaptureTrendsScreen />
        </View>
      </SafeAreaView>

      {/* Floating Trend Logger */}
      {isSessionActive && (
        <FloatingTrendLogger
          isSessionActive={isSessionActive}
          onTrendLogged={handleTrendLogged}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default CaptureScreenSimple;
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScrollSession, ScrollSessionRef } from '../components/ScrollSession/ScrollSessionForwardRef';
import { FloatingTrendLogger } from '../components/TrendLogger/FloatingTrendLogger';
import CaptureTrendsScreen from './CaptureTrendsScreen';
// import { useTheme } from '../contexts/ThemeContext';

export const CaptureScreenWithSession: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const scrollSessionRef = useRef<ScrollSessionRef>(null);
  // const { theme } = useTheme();

  const handleSessionStateChange = useCallback((active: boolean) => {
    setIsSessionActive(active);
  }, []);

  const handleTrendLogged = useCallback(() => {
    // Increment trend count in session
    scrollSessionRef.current?.incrementTrendCount();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Scroll Session at the top */}
      <ScrollSession
        ref={scrollSessionRef}
        onSessionStateChange={handleSessionStateChange}
      />

      {/* Main Capture Screen Content */}
      <View style={styles.content}>
        <CaptureTrendsScreen />
      </View>

      {/* Floating Trend Logger */}
      <FloatingTrendLogger
        isSessionActive={isSessionActive}
        onTrendLogged={handleTrendLogged}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
});

export default CaptureScreenWithSession;
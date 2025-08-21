import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { SmartTrendSubmission } from '../components/SmartTrendSubmission';

export const TrendCaptureScreenPolished: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#000d1a', '#001a33']}
        style={StyleSheet.absoluteFillObject}
      />
      <SmartTrendSubmission />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
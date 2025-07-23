import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Logo } from '../components/Logo';

export const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Logo size="medium" showText={true} />
      <ActivityIndicator size="large" color="#0080ff" style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000d1a',
  },
  spinner: {
    marginTop: 40,
  },
});
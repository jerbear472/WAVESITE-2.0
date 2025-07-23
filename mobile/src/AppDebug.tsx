import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function AppDebug() {
  console.log('AppDebug rendered');
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>WAVESITE2 Debug</Text>
            <Text style={styles.subtitle}>App is running!</Text>
            <Text style={styles.info}>Navigation Container: OK</Text>
            <Text style={styles.info}>SafeAreaProvider: OK</Text>
          </View>
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2027',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#0080ff',
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: '#4da8ff',
    marginVertical: 4,
  },
});
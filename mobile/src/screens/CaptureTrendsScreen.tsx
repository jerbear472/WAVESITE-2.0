import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import TrendStorageService from '../services/TrendStorageService';
import TrendExtractorService from '../services/TrendExtractorService';

const CaptureTrendsScreen: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCaptureTrend = () => {
    Alert.alert(
      'Capture Trend',
      'Share content directly from TikTok or Instagram',
      [
        { text: 'Open TikTok', onPress: () => console.log('Opening TikTok...') },
        { text: 'Open Instagram', onPress: () => console.log('Opening Instagram...') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePasteLink = async () => {
    try {
      const content = await Clipboard.getString();
      if (content && content.trim()) {
        // Check if it's a valid URL
        const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
        if (!urlPattern.test(content)) {
          Alert.alert('Invalid URL', 'Please copy a valid link from TikTok or Instagram');
          return;
        }

        setIsProcessing(true);
        
        // Extract data from URL
        const extractedData = await TrendExtractorService.extractDataFromUrl(content);
        
        // Save the trend
        const savedTrend = await TrendStorageService.saveTrend({
          url: content,
          title: extractedData.title,
          description: extractedData.description,
        });

        setIsProcessing(false);
        
        Alert.alert(
          'Trend Captured! 🎉',
          `"${savedTrend.title}" has been saved to your collection.`,
          [
            {
              text: 'View Trends',
              onPress: () => {
                // Navigation handled by bottom nav
              },
            },
            { text: 'Capture Another', style: 'default' },
          ]
        );
      } else {
        Alert.alert('No Link', 'No link found in clipboard');
      }
    } catch (error) {
      setIsProcessing(false);
      console.error('Error pasting link:', error);
      Alert.alert('Error', 'Failed to capture trend. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Text style={styles.brandName}>〰️  WAVESIGHT</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Main Icon */}
        <View style={styles.mainIconContainer}>
          <View style={styles.mainIcon}>
            <Text style={styles.mainIconText}>〰️</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Capture Trends</Text>
        <Text style={styles.subtitle}>Share viral content from social media</Text>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleCaptureTrend}
            activeOpacity={0.8}>
            <Text style={styles.buttonIcon}>▶️</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Capture Trend</Text>
              <Text style={styles.buttonSubtitle}>Share from any app</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, isProcessing && styles.disabledButton]} 
            onPress={handlePasteLink}
            activeOpacity={0.8}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>📋</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Paste Link</Text>
                  <Text style={styles.buttonSubtitle}>From clipboard</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to capture trends:</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumberContainer}>
                <Text style={styles.instructionNumber}>1</Text>
              </View>
              <Text style={styles.instructionText}>Browse TikTok, Instagram, or other platforms</Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumberContainer}>
                <Text style={styles.instructionNumber}>2</Text>
              </View>
              <Text style={styles.instructionText}>Copy link or share to WAVESIGHT</Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumberContainer}>
                <Text style={styles.instructionNumber}>3</Text>
              </View>
              <Text style={styles.instructionText}>Track trends you've spotted early</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  mainIconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  mainIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIconText: {
    fontSize: 50,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: {
    backgroundColor: '#0066ff',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  secondaryButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonIcon: {
    fontSize: 40,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  instructionsCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  instructionsList: {
    gap: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  instructionNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0066ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    paddingTop: 5,
  },
  disabledCard: {
    opacity: 0.7,
  },
});

export default CaptureTrendsScreen;
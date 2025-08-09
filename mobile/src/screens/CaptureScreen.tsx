import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  TextInput,
  Clipboard,
  ActivityIndicator,
} from 'react-native';

const CaptureScreen: React.FC = () => {
  const [linkInput, setLinkInput] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCaptureTrend = async () => {
    setIsCapturing(true);
    try {
      Alert.alert(
        'How to Capture',
        'To capture trending content:\n\n1. Open TikTok or Instagram\n2. Find the content you want to save\n3. Tap the Share button\n4. Select "WaveSight" from the share menu\n\nThe trend will be automatically added to your timeline!',
        [
          {
            text: 'Got it',
            onPress: () => setIsCapturing(false),
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleCaptureTrend:', error);
      setIsCapturing(false);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePasteLink = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        setLinkInput(clipboardContent);
        Alert.alert(
          'Link Pasted',
          `Link: ${clipboardContent.substring(0, 50)}...`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('No Link', 'No link found in clipboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste link from clipboard');
    }
  };

  const handleAnalyzeLink = async () => {
    if (!linkInput.trim()) {
      Alert.alert('No Link', 'Please paste or enter a link first');
      return;
    }

    try {
      // Validate the link format
      const urlPattern = /^(https?:\/\/)?(www\.)?(tiktok\.com|instagram\.com|instagr\.am)/i;
      if (!urlPattern.test(linkInput)) {
        Alert.alert(
          'Invalid Link',
          'Please enter a valid TikTok or Instagram link',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Analyze Link',
        `Analyzing: ${linkInput.substring(0, 50)}...`,
        [
          {
            text: 'OK',
            onPress: () => {
              // TODO: Implement actual link analysis
              console.log('Analyzing link:', linkInput);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleAnalyzeLink:', error);
      Alert.alert(
        'Analysis Error',
        'Failed to analyze the link. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Capture Content</Text>
          <Text style={styles.subtitle}>Share trends or analyze links</Text>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share Extension</Text>
            <Text style={styles.sectionDescription}>
              Share trending content directly from TikTok or Instagram
            </Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleCaptureTrend}
              disabled={isCapturing}>
              {isCapturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText} numberOfLines={1}>How to Share</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Link Analysis</Text>
            <Text style={styles.sectionDescription}>
              Paste a TikTok or Instagram link to analyze the content
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Paste your link here..."
                placeholderTextColor="#666"
                value={linkInput}
                onChangeText={setLinkInput}
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton, styles.halfButton]} 
                onPress={handlePasteLink}>
                <Text style={styles.buttonText} numberOfLines={1}>Paste Link</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.primaryButton, styles.halfButton, !linkInput.trim() && styles.disabledButton]} 
                onPress={handleAnalyzeLink}
                disabled={!linkInput.trim()}>
                <Text style={styles.buttonText} numberOfLines={1}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Supported Platforms</Text>
            <View style={styles.platformList}>
              <Text style={styles.platformItem}>• TikTok videos and profiles</Text>
              <Text style={styles.platformItem}>• Instagram posts and reels</Text>
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
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  halfButton: {
    width: '48%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgb(26, 26, 26)',
    borderRadius: 12,
    padding: 15,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333333',
    opacity: 1,
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  platformList: {
    gap: 8,
  },
  platformItem: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
});

export default CaptureScreen;
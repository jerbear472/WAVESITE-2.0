import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { WebView } from 'react-native-webview';
import { supabase } from '../config/supabase';
import { storage } from '../../App';

interface TrendMetadata {
  url: string;
  platform: string;
  title?: string;
  description?: string;
  author?: string;
  authorHandle?: string;
  thumbnail?: string;
  videoUrl?: string;
  likes?: number;
  views?: number;
  shares?: number;
  comments?: number;
  hashtags?: string[];
  extractedAt: string;
}

interface TrendCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

const categories: TrendCategory[] = [
  { id: 'viral', label: 'Viral', icon: 'trending-up', color: '#f5576c' },
  { id: 'emerging', label: 'Emerging', icon: 'sunrise', color: '#667eea' },
  { id: 'niche', label: 'Niche', icon: 'target', color: '#4facfe' },
  { id: 'comeback', label: 'Comeback', icon: 'refresh-cw', color: '#43e97b' },
];

const SubmitTrendScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [metadata, setMetadata] = useState<TrendMetadata | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState(50);
  const webViewRef = useRef<WebView>(null);
  const [webViewHtml, setWebViewHtml] = useState('');

  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    checkClipboard();
  }, []);

  const checkClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (isValidSocialUrl(clipboardContent)) {
        Alert.alert(
          'URL Detected',
          'We found a social media URL in your clipboard. Would you like to use it?',
          [
            { text: 'No', style: 'cancel' },
            { 
              text: 'Yes', 
              onPress: () => {
                setUrl(clipboardContent);
                handleExtractMetadata(clipboardContent);
              }
            },
          ]
        );
      }
    } catch (error) {
      console.error('Clipboard error:', error);
    }
  };

  const isValidSocialUrl = (text: string): boolean => {
    const socialDomains = [
      'tiktok.com',
      'instagram.com',
      'twitter.com',
      'x.com',
      'youtube.com',
      'youtu.be',
      'reddit.com',
      'pinterest.com',
      'facebook.com',
      'fb.com',
      'threads.net',
    ];
    
    try {
      const urlObj = new URL(text);
      return socialDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  };

  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('pinterest.com')) return 'pinterest';
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.includes('threads.net')) return 'threads';
    return 'unknown';
  };

  const handleExtractMetadata = async (inputUrl?: string) => {
    const urlToProcess = inputUrl || url;
    
    if (!isValidSocialUrl(urlToProcess)) {
      Alert.alert('Invalid URL', 'Please enter a valid social media URL');
      return;
    }

    setExtracting(true);
    ReactNativeHapticFeedback.trigger('impactLight');

    try {
      // Start progress animation
      progressWidth.value = withTiming(100, { duration: 3000 });

      // Create extraction script based on platform
      const platform = detectPlatform(urlToProcess);
      const extractionScript = getExtractionScript(platform);

      // Use WebView to extract metadata
      setWebViewHtml(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <iframe src="${urlToProcess}" style="width:100%;height:100%;border:none;"></iframe>
          <script>
            ${extractionScript}
          </script>
        </body>
        </html>
      `);

      // Simulate extraction (in production, this would use the WebView)
      setTimeout(() => {
        const mockMetadata: TrendMetadata = {
          url: urlToProcess,
          platform: detectPlatform(urlToProcess),
          title: 'Extracted Trend Title',
          description: 'This trend is gaining traction across social media',
          author: 'Content Creator',
          authorHandle: '@creator',
          thumbnail: 'https://via.placeholder.com/400x300',
          likes: Math.floor(Math.random() * 100000),
          views: Math.floor(Math.random() * 1000000),
          shares: Math.floor(Math.random() * 10000),
          comments: Math.floor(Math.random() * 5000),
          hashtags: ['#trending', '#viral', '#fyp'],
          extractedAt: new Date().toISOString(),
        };
        
        setMetadata(mockMetadata);
        setExtracting(false);
        progressWidth.value = 0;
        ReactNativeHapticFeedback.trigger('notificationSuccess');
      }, 2000);

    } catch (error) {
      console.error('Extraction error:', error);
      setExtracting(false);
      progressWidth.value = 0;
      Alert.alert('Extraction Failed', 'Could not extract metadata from this URL');
    }
  };

  const getExtractionScript = (platform: string): string => {
    // Platform-specific extraction scripts
    const scripts: Record<string, string> = {
      tiktok: `
        // TikTok extraction
        const data = {
          title: document.querySelector('[data-e2e="browse-video-desc"]')?.innerText,
          author: document.querySelector('[data-e2e="browse-username"]')?.innerText,
          likes: document.querySelector('[data-e2e="browse-like-count"]')?.innerText,
          comments: document.querySelector('[data-e2e="browse-comment-count"]')?.innerText,
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      `,
      instagram: `
        // Instagram extraction
        const data = {
          description: document.querySelector('meta[property="og:description"]')?.content,
          image: document.querySelector('meta[property="og:image"]')?.content,
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      `,
      twitter: `
        // Twitter extraction
        const data = {
          text: document.querySelector('[data-testid="tweetText"]')?.innerText,
          author: document.querySelector('[data-testid="User-Names"]')?.innerText,
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      `,
      default: `
        // Generic extraction
        const data = {
          title: document.querySelector('title')?.innerText,
          description: document.querySelector('meta[name="description"]')?.content,
          image: document.querySelector('meta[property="og:image"]')?.content,
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      `,
    };
    
    return scripts[platform] || scripts.default;
  };

  const handleSubmit = async () => {
    if (!metadata || !selectedCategory) {
      Alert.alert('Missing Information', 'Please extract metadata and select a category');
      return;
    }

    setLoading(true);
    buttonScale.value = withSpring(0.95);
    ReactNativeHapticFeedback.trigger('impactMedium');

    try {
      const username = storage.getString('user_username') || 'anonymous';
      
      const { data, error } = await supabase
        .from('captured_trends')
        .insert({
          url: metadata.url,
          platform: metadata.platform,
          title: metadata.title,
          description: metadata.description,
          author_name: metadata.author,
          author_handle: metadata.authorHandle,
          thumbnail_url: metadata.thumbnail,
          category: selectedCategory,
          confidence_score: confidence,
          notes: notes,
          metadata: {
            likes: metadata.likes,
            views: metadata.views,
            shares: metadata.shares,
            comments: metadata.comments,
            hashtags: metadata.hashtags,
          },
          submitted_by: username,
          status: 'pending_validation',
        })
        .select()
        .single();

      if (error) throw error;

      ReactNativeHapticFeedback.trigger('notificationSuccess');
      
      Alert.alert(
        'Success! 🎉',
        'Your trend has been submitted for validation. You\'ll earn points once it\'s verified!',
        [
          {
            text: 'Submit Another',
            onPress: resetForm,
          },
          {
            text: 'View Trends',
            onPress: () => {
              // Navigate to trends screen
            },
          },
        ]
      );

    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Submission Failed', 'Please try again later');
    } finally {
      setLoading(false);
      buttonScale.value = withSpring(1);
    }
  };

  const resetForm = () => {
    setUrl('');
    setMetadata(null);
    setSelectedCategory('');
    setNotes('');
    setConfidence(50);
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.title}>Submit a Trend</Text>
            <Text style={styles.subtitle}>
              Share trending content from social media
            </Text>
          </Animated.View>

          {/* URL Input */}
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.inputSection}
          >
            <Text style={styles.sectionTitle}>Social Media URL</Text>
            <View style={styles.inputContainer}>
              <Icon name="link" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Paste TikTok, Instagram, Twitter URL..."
                placeholderTextColor="#999"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {url.length > 0 && (
                <TouchableOpacity
                  onPress={() => setUrl('')}
                  style={styles.clearButton}
                >
                  <Icon name="x-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleExtractMetadata()}
              disabled={!url || extracting}
              style={styles.extractButton}
            >
              <LinearGradient
                colors={url ? ['#667eea', '#764ba2'] : ['#ccc', '#aaa']}
                style={styles.extractButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {extracting ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.extractButtonText}>Extracting...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="download-cloud" size={18} color="#fff" />
                    <Text style={styles.extractButtonText}>Extract Metadata</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Progress Bar */}
            {extracting && (
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressStyle]} />
              </View>
            )}
          </Animated.View>

          {/* Extracted Metadata Preview */}
          {metadata && (
            <Animated.View 
              entering={FadeIn.springify()}
              style={styles.metadataSection}
            >
              <Text style={styles.sectionTitle}>Extracted Content</Text>
              
              <View style={styles.metadataCard}>
                {metadata.thumbnail && (
                  <Image 
                    source={{ uri: metadata.thumbnail }}
                    style={styles.thumbnail}
                  />
                )}
                
                <View style={styles.metadataContent}>
                  <View style={styles.platformBadge}>
                    <Icon 
                      name={
                        metadata.platform === 'tiktok' ? 'video' :
                        metadata.platform === 'instagram' ? 'instagram' :
                        metadata.platform === 'twitter' ? 'twitter' :
                        'globe'
                      }
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.platformText}>
                      {metadata.platform.toUpperCase()}
                    </Text>
                  </View>

                  {metadata.title && (
                    <Text style={styles.metadataTitle}>{metadata.title}</Text>
                  )}
                  
                  {metadata.author && (
                    <Text style={styles.metadataAuthor}>
                      by {metadata.author} {metadata.authorHandle}
                    </Text>
                  )}

                  <View style={styles.statsRow}>
                    {metadata.views && (
                      <View style={styles.stat}>
                        <Icon name="eye" size={14} color="#666" />
                        <Text style={styles.statText}>
                          {formatNumber(metadata.views)}
                        </Text>
                      </View>
                    )}
                    {metadata.likes && (
                      <View style={styles.stat}>
                        <Icon name="heart" size={14} color="#666" />
                        <Text style={styles.statText}>
                          {formatNumber(metadata.likes)}
                        </Text>
                      </View>
                    )}
                    {metadata.comments && (
                      <View style={styles.stat}>
                        <Icon name="message-circle" size={14} color="#666" />
                        <Text style={styles.statText}>
                          {formatNumber(metadata.comments)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {metadata.hashtags && metadata.hashtags.length > 0 && (
                    <View style={styles.hashtagsContainer}>
                      {metadata.hashtags.map((tag, index) => (
                        <Text key={index} style={styles.hashtag}>{tag}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Category Selection */}
          {metadata && (
            <Animated.View 
              entering={FadeInDown.delay(200).springify()}
              style={styles.categorySection}
            >
              <Text style={styles.sectionTitle}>Trend Category</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((category) => {
                  const isSelected = selectedCategory === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => {
                        setSelectedCategory(category.id);
                        ReactNativeHapticFeedback.trigger('selection');
                      }}
                      style={[
                        styles.categoryCard,
                        isSelected && { borderColor: category.color },
                      ]}
                    >
                      <Icon 
                        name={category.icon} 
                        size={24} 
                        color={isSelected ? category.color : '#999'}
                      />
                      <Text style={[
                        styles.categoryLabel,
                        isSelected && { color: category.color },
                      ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Confidence Slider */}
          {metadata && (
            <Animated.View 
              entering={FadeInDown.delay(300).springify()}
              style={styles.confidenceSection}
            >
              <Text style={styles.sectionTitle}>
                Trend Confidence: {confidence}%
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Low</Text>
                <View style={styles.slider}>
                  <View 
                    style={[
                      styles.sliderFill,
                      { width: `${confidence}%` }
                    ]}
                  />
                </View>
                <Text style={styles.sliderLabel}>High</Text>
              </View>
            </Animated.View>
          )}

          {/* Notes */}
          {metadata && (
            <Animated.View 
              entering={FadeInDown.delay(400).springify()}
              style={styles.notesSection}
            >
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Why do you think this will trend?"
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Animated.View>
          )}

          {/* Submit Button */}
          {metadata && selectedCategory && (
            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Animated.View style={buttonAnimatedStyle}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.submitButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Icon name="send" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>Submit Trend</Text>
                      </>
                    )}
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Hidden WebView for extraction */}
      {webViewHtml && (
        <WebView
          ref={webViewRef}
          source={{ html: webViewHtml }}
          style={{ width: 0, height: 0 }}
          onMessage={(event) => {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Extracted data:', data);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 14,
  },
  clearButton: {
    padding: 4,
  },
  extractButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  extractButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 1.5,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  metadataSection: {
    marginBottom: 24,
  },
  metadataCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  metadataContent: {
    gap: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#667eea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  platformText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  metadataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  metadataAuthor: {
    fontSize: 14,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtag: {
    fontSize: 13,
    color: '#667eea',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  confidenceSection: {
    marginBottom: 24,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
  },
  slider: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    fontSize: 15,
    color: '#1a1a1a',
    minHeight: 80,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default SubmitTrendScreen;
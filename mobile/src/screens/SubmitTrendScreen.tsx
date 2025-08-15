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
  // Original categories
  { id: 'visual_style', label: 'Visual Style', icon: 'eye', color: '#f5576c' },
  { id: 'audio_music', label: 'Audio/Music', icon: 'music', color: '#667eea' },
  { id: 'creator_technique', label: 'Creator Tech', icon: 'video', color: '#4facfe' },
  { id: 'meme_format', label: 'Meme/Comedy', icon: 'smile', color: '#43e97b' },
  { id: 'product_brand', label: 'Product/Brand', icon: 'shopping-bag', color: '#ffa726' },
  { id: 'behavior_pattern', label: 'Behavior', icon: 'trending-up', color: '#ab47bc' },
  
  // New categories
  { id: 'automotive', label: 'Cars/Machines', icon: 'truck', color: '#e74c3c' },
  { id: 'food_drink', label: 'Food/Drink', icon: 'coffee', color: '#f39c12' },
  { id: 'technology', label: 'Technology', icon: 'smartphone', color: '#3498db' },
  { id: 'sports', label: 'Sports/Fitness', icon: 'activity', color: '#27ae60' },
  { id: 'dance', label: 'Dance', icon: 'users', color: '#9b59b6' },
  { id: 'travel', label: 'Travel', icon: 'map-pin', color: '#1abc9c' },
  { id: 'fashion', label: 'Fashion', icon: 'shopping-bag', color: '#e91e63' },
  { id: 'gaming', label: 'Gaming', icon: 'monitor', color: '#673ab7' },
  { id: 'health', label: 'Health/Wellness', icon: 'heart', color: '#ff5722' },
  { id: 'diy_crafts', label: 'DIY/Crafts', icon: 'tool', color: '#795548' },
];

// Follow-up questions for each category
const categoryQuestions: Record<string, Array<{label: string, key: string, type: 'text' | 'select' | 'number', options?: string[]}>> = {
  automotive: [
    { label: 'Vehicle Type', key: 'vehicle_type', type: 'select', options: ['Car', 'Truck', 'Motorcycle', 'EV', 'Classic', 'Modified', 'Other'] },
    { label: 'Brand/Model', key: 'brand_model', type: 'text' },
    { label: 'Trend Type', key: 'trend_type', type: 'select', options: ['Modification', 'Review', 'Comparison', 'Tutorial', 'Showcase', 'Racing'] },
  ],
  food_drink: [
    { label: 'Type', key: 'food_type', type: 'select', options: ['Recipe', 'Restaurant', 'Cocktail/Drink', 'Food Hack', 'Challenge', 'Review'] },
    { label: 'Cuisine/Style', key: 'cuisine', type: 'text' },
    { label: 'Difficulty', key: 'difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard', 'Professional'] },
  ],
  technology: [
    { label: 'Tech Category', key: 'tech_category', type: 'select', options: ['Gadget', 'App', 'AI/ML', 'Software', 'Hardware', 'Review', 'Tutorial'] },
    { label: 'Product/Service', key: 'product_name', type: 'text' },
    { label: 'Price Range', key: 'price_range', type: 'select', options: ['Free', 'Under $50', '$50-200', '$200-500', 'Over $500'] },
  ],
  sports: [
    { label: 'Sport Type', key: 'sport_type', type: 'text' },
    { label: 'Content Type', key: 'content_type', type: 'select', options: ['Tutorial', 'Highlights', 'Training', 'Challenge', 'Equipment Review'] },
    { label: 'Skill Level', key: 'skill_level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Professional'] },
  ],
  dance: [
    { label: 'Dance Style', key: 'dance_style', type: 'text' },
    { label: 'Difficulty', key: 'difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard', 'Expert'] },
    { label: 'Song/Audio', key: 'song_name', type: 'text' },
  ],
  fashion: [
    { label: 'Fashion Type', key: 'fashion_type', type: 'select', options: ['Outfit', 'Accessory', 'Makeup', 'Hair', 'Trend', 'Brand Review'] },
    { label: 'Style', key: 'style', type: 'text' },
    { label: 'Price Point', key: 'price_point', type: 'select', options: ['Budget', 'Mid-range', 'Luxury', 'Mixed'] },
  ],
  travel: [
    { label: 'Destination Type', key: 'destination_type', type: 'select', options: ['City', 'Beach', 'Mountain', 'Rural', 'Adventure', 'Cultural'] },
    { label: 'Location', key: 'location', type: 'text' },
    { label: 'Budget Level', key: 'budget_level', type: 'select', options: ['Budget', 'Mid-range', 'Luxury', 'Backpacker'] },
  ],
  gaming: [
    { label: 'Game Genre', key: 'game_genre', type: 'select', options: ['FPS', 'RPG', 'Strategy', 'Sports', 'Puzzle', 'Mobile', 'Indie'] },
    { label: 'Game Title', key: 'game_title', type: 'text' },
    { label: 'Content Type', key: 'content_type', type: 'select', options: ['Gameplay', 'Tutorial', 'Review', 'Trick/Glitch', 'Funny Moments'] },
  ],
  health: [
    { label: 'Health Category', key: 'health_category', type: 'select', options: ['Workout', 'Nutrition', 'Mental Health', 'Medical', 'Wellness Tips', 'Transformation'] },
    { label: 'Difficulty/Impact', key: 'difficulty', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Medical Professional'] },
    { label: 'Duration/Timeframe', key: 'timeframe', type: 'text' },
  ],
  diy_crafts: [
    { label: 'Project Type', key: 'project_type', type: 'select', options: ['Home Decor', 'Art', 'Furniture', 'Electronics', 'Crafts', 'Repairs'] },
    { label: 'Skill Level', key: 'skill_level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
    { label: 'Estimated Cost', key: 'cost', type: 'select', options: ['Under $20', '$20-50', '$50-100', 'Over $100'] },
  ],
  visual_style: [
    { label: 'Visual Effect', key: 'visual_effect', type: 'select', options: ['Filter', 'Transition', 'Animation', 'Color Grading', 'AR Effect', 'Text Style'] },
    { label: 'Platform Origin', key: 'platform_origin', type: 'select', options: ['TikTok', 'Instagram', 'YouTube', 'Cross-platform'] },
  ],
  audio_music: [
    { label: 'Audio Type', key: 'audio_type', type: 'select', options: ['Original Song', 'Remix', 'Sound Effect', 'Voiceover', 'Mashup'] },
    { label: 'Artist/Creator', key: 'artist', type: 'text' },
    { label: 'Mood/Genre', key: 'mood', type: 'select', options: ['Upbeat', 'Chill', 'Dramatic', 'Funny', 'Emotional'] },
  ],
  creator_technique: [
    { label: 'Technique Type', key: 'technique_type', type: 'select', options: ['Editing', 'Filming', 'Storytelling', 'Engagement', 'Growth Hack'] },
    { label: 'Difficulty', key: 'difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard', 'Pro'] },
  ],
  meme_format: [
    { label: 'Meme Type', key: 'meme_type', type: 'select', options: ['Template', 'Format', 'Challenge', 'Reaction', 'Parody', 'Original'] },
    { label: 'Target Audience', key: 'audience', type: 'select', options: ['Gen Z', 'Millennials', 'General', 'Niche Community'] },
  ],
  product_brand: [
    { label: 'Product Category', key: 'product_category', type: 'select', options: ['Tech', 'Fashion', 'Beauty', 'Food', 'Home', 'Service'] },
    { label: 'Brand Name', key: 'brand_name', type: 'text' },
    { label: 'Content Type', key: 'content_type', type: 'select', options: ['Review', 'Unboxing', 'Tutorial', 'Comparison', 'Sponsored'] },
  ],
  behavior_pattern: [
    { label: 'Behavior Type', key: 'behavior_type', type: 'select', options: ['Social', 'Lifestyle', 'Work/School', 'Dating', 'Family', 'Internet Culture'] },
    { label: 'Relatability', key: 'relatability', type: 'select', options: ['Very Relatable', 'Somewhat Relatable', 'Niche', 'Controversial'] },
  ],
};

const SubmitTrendScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [metadata, setMetadata] = useState<TrendMetadata | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, any>>({});
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: user.id,
          post_url: metadata.url,
          platform: metadata.platform,
          trend_name: metadata.title || 'Untitled Trend',
          description: metadata.description || notes || 'No description',
          creator_handle: metadata.authorHandle,
          creator_name: metadata.author,
          thumbnail_url: metadata.thumbnail,
          screenshot_url: metadata.thumbnail,
          category: selectedCategory,
          virality_prediction: Math.round(confidence / 10), // Convert 0-100 to 1-10
          views_count: metadata.views || 0,
          likes_count: metadata.likes || 0,
          shares_count: metadata.shares || 0,
          comments_count: metadata.comments || 0,
          hashtags: metadata.hashtags || [],
          status: 'submitted',
          wave_score: Math.round(confidence),
          quality_score: confidence / 100,
          base_amount: 0.25, // $0.25 pending earnings per submission
          follow_up_data: followUpAnswers, // Store category-specific answers
        })
        .select()
        .single();

      if (error) {
        console.error('Submission error details:', error);
        throw error;
      }

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

    } catch (error: any) {
      console.error('Submission error:', error);
      let errorMessage = 'Please try again later';
      
      if (error.message?.includes('authenticated')) {
        errorMessage = 'Please log in to submit trends';
      } else if (error.message?.includes('category')) {
        errorMessage = 'Invalid category selected';
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Submission Failed', errorMessage);
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
    setFollowUpAnswers({});
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

          {/* Follow-up Questions */}
          {metadata && selectedCategory && categoryQuestions[selectedCategory] && (
            <Animated.View 
              entering={FadeInDown.delay(250).springify()}
              style={styles.followUpSection}
            >
              <Text style={styles.sectionTitle}>Additional Details</Text>
              {categoryQuestions[selectedCategory].map((question) => (
                <View key={question.key} style={styles.questionContainer}>
                  <Text style={styles.questionLabel}>{question.label}</Text>
                  {question.type === 'select' ? (
                    <View style={styles.selectContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.optionsRow}>
                          {question.options?.map((option) => {
                            const isSelected = followUpAnswers[question.key] === option;
                            return (
                              <TouchableOpacity
                                key={option}
                                onPress={() => {
                                  setFollowUpAnswers(prev => ({
                                    ...prev,
                                    [question.key]: option
                                  }));
                                  ReactNativeHapticFeedback.trigger('selection');
                                }}
                                style={[
                                  styles.optionButton,
                                  isSelected && styles.optionButtonSelected
                                ]}
                              >
                                <Text style={[
                                  styles.optionText,
                                  isSelected && styles.optionTextSelected
                                ]}>
                                  {option}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  ) : (
                    <TextInput
                      style={styles.questionInput}
                      placeholder={`Enter ${question.label.toLowerCase()}`}
                      placeholderTextColor="#999"
                      value={followUpAnswers[question.key] || ''}
                      onChangeText={(text) => {
                        setFollowUpAnswers(prev => ({
                          ...prev,
                          [question.key]: text
                        }));
                      }}
                      keyboardType={question.type === 'number' ? 'numeric' : 'default'}
                    />
                  )}
                </View>
              ))}
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
  followUpSection: {
    marginBottom: 24,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  questionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  selectContainer: {
    flexDirection: 'row',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
  },
});

export default SubmitTrendScreen;
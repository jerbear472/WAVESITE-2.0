import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';
import { calculateTrendXP, formatXP } from '../config/xpConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SmartTrendSubmissionProps {
  visible?: boolean;
  onClose?: () => void;
  onSubmit?: (data: TrendFormData) => Promise<void>;
  initialUrl?: string;
}

interface TrendFormData {
  url: string;
  platform: string;
  title: string;
  creator_handle: string;
  creator_name: string;
  post_caption: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  hashtags: string[];
  thumbnail_url: string;
  posted_at: string;
  category: string;
  categoryAnswers: Record<string, string>;
  audienceAge: string[];
  predictedPeak: string;
  aiAngle: 'using_ai' | 'reacting_to_ai' | 'ai_tool_viral' | 'ai_technique' | 'anti_ai' | 'not_ai' | '';
  trendVelocity: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining' | '';
  sentiment: number;
  trendSize: 'micro' | 'niche' | 'viral' | 'mega' | 'global' | '';
  description: string;
  audience_demographic: string;
  behavior_insight: string;
  wave_score: number;
}

// Category configuration
const CATEGORIES = [
  { 
    id: 'meme', 
    label: 'Meme/Humor', 
    icon: '😂',
    color: theme.colors.warning,
    questions: {
      format: {
        label: 'What type of meme is this?',
        options: ['Image meme', 'Video meme', 'Text joke', 'Sound/Audio', 'Challenge']
      },
      remixability: {
        label: 'How remixable is it?',
        options: ['Everyone\'s doing their version', 'Some variations', 'One-off joke']
      }
    }
  },
  { 
    id: 'fashion', 
    label: 'Fashion/Beauty', 
    icon: '👗',
    color: theme.colors.primary,
    questions: {
      style: {
        label: 'What aesthetic is this?',
        options: ['Y2K', 'Clean girl', 'Mob wife', 'Coquette', 'Dark academia', 'Streetwear', 'Other']
      },
      pricePoint: {
        label: 'What\'s the price vibe?',
        options: ['Thrifted/DIY', 'Fast fashion', 'Mid-range', 'Luxury', 'Mix high-low']
      }
    }
  },
  { 
    id: 'food', 
    label: 'Food/Drink', 
    icon: '🍔',
    color: theme.colors.success,
    questions: {
      type: {
        label: 'What kind of food trend?',
        options: ['Recipe hack', 'Restaurant trend', 'Cooking technique', 'Food challenge', 'Drink/cocktail']
      },
      appeal: {
        label: 'Why are people into it?',
        options: ['Looks amazing', 'Tastes incredible', 'Health benefits', 'Just weird/fun', 'Nostalgic']
      }
    }
  },
  { 
    id: 'music', 
    label: 'Music/Dance', 
    icon: '🎵',
    color: '#8B5CF6',
    questions: {
      type: {
        label: 'What\'s trending?',
        options: ['Song/Sound', 'Dance move', 'Remix/Mashup', 'Artist', 'Music challenge']
      },
      usage: {
        label: 'How are people using it?',
        options: ['Background for videos', 'Dance videos', 'Lip sync', 'Emotional videos', 'Comedy']
      }
    }
  },
  { 
    id: 'tech', 
    label: 'Tech/Gaming', 
    icon: '🎮',
    color: '#EF4444',
    questions: {
      type: {
        label: 'What kind of tech trend?',
        options: ['New app/tool', 'Gaming meta', 'Tech hack', 'AI thing', 'Gadget']
      },
      accessibility: {
        label: 'Who can do this?',
        options: ['Anyone', 'Need the app/game', 'Need expensive stuff', 'Tech savvy only']
      }
    }
  },
  { 
    id: 'lifestyle', 
    label: 'Lifestyle', 
    icon: '🏡',
    color: '#06B6D4',
    questions: {
      category: {
        label: 'What lifestyle area?',
        options: ['Morning routine', 'Productivity', 'Home decor', 'Wellness', 'Relationships', 'Money']
      },
      authenticity: {
        label: 'How real is this?',
        options: ['Actually helpful', 'Looks good on camera', 'Bit unrealistic', 'Total fantasy']
      }
    }
  }
];

// Quality scoring function
const calculateDescriptionQuality = (description: string): number => {
  let score = 0;
  
  const wordCount = description.split(/\s+/).length;
  if (wordCount >= 10) score += 10;
  if (wordCount >= 20) score += 10;
  if (wordCount >= 30) score += 10;
  
  const hasNumbers = /\d+/.test(description);
  const hasPlatform = /tiktok|instagram|youtube|twitter|reddit|threads|x\.com/i.test(description);
  if (hasNumbers) score += 10;
  if (hasPlatform) score += 10;
  
  const actionVerbs = ['pranking', 'dancing', 'creating', 'posting', 'sharing', 'remixing', 
                       'jumping', 'reacting', 'building', 'launching', 'going', 'making',
                       'flooding', 'exploding', 'surging', 'transforming', 'disrupting'];
  const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
  if (hasActionVerb) score += 20;
  
  const humorWords = ['hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'viral', 'broke the internet'];
  const hasHumor = humorWords.some(word => description.toLowerCase().includes(word));
  if (hasHumor) score += 10;
  
  const hasWhy = /because|since|due to|thanks to|after/i.test(description);
  if (hasWhy) score += 10;
  
  return Math.min(score, 100);
};

export const SmartTrendSubmission: React.FC<SmartTrendSubmissionProps> = ({
  visible,
  onClose,
  onSubmit,
  initialUrl = ''
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  
  const [currentStep, setCurrentStep] = useState<'url' | 'velocity' | 'category' | 'details' | 'review'>('url');
  
  const [formData, setFormData] = useState<TrendFormData>({
    url: initialUrl || '',
    platform: '',
    title: '',
    creator_handle: '',
    creator_name: '',
    post_caption: '',
    likes_count: 0,
    comments_count: 0,
    views_count: 0,
    hashtags: [],
    thumbnail_url: '',
    posted_at: '',
    category: '',
    categoryAnswers: {},
    audienceAge: [],
    predictedPeak: '',
    aiAngle: '',
    trendVelocity: '',
    sentiment: 50,
    trendSize: '',
    description: '',
    audience_demographic: '',
    behavior_insight: '',
    wave_score: 50
  });

  const [metadata, setMetadata] = useState<any>(null);

  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'X/Twitter';
    if (url.includes('reddit.com')) return 'Reddit';
    if (url.includes('threads.net')) return 'Threads';
    return 'Other';
  };

  const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getSelectedCategory = () => {
    return CATEGORIES.find(c => c.id === formData.category);
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'url':
        if (!formData.url) {
          setError('Please paste a trend URL');
          return false;
        }
        if (!isValidUrl(formData.url)) {
          setError('Please enter a valid URL');
          return false;
        }
        if (!formData.title || formData.title.trim().length < 10) {
          setError('Please add a quality description (at least 10 characters)');
          return false;
        }
        break;
      case 'velocity':
        if (!formData.trendVelocity) {
          setError('Please select the trend velocity');
          return false;
        }
        if (!formData.trendSize) {
          setError('Please select the trend size');
          return false;
        }
        break;
      case 'category':
        if (!formData.category) {
          setError('Please select a category');
          return false;
        }
        break;
      case 'details':
        const category = getSelectedCategory();
        if (category) {
          const unanswered = Object.keys(category.questions).filter(
            key => !formData.categoryAnswers[key]
          );
          if (unanswered.length > 0) {
            setError('Please answer all category questions');
            return false;
          }
        }
        if (formData.audienceAge.length === 0) {
          setError('Please select at least one age group');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    switch (currentStep) {
      case 'url':
        setCurrentStep('velocity');
        break;
      case 'velocity':
        setCurrentStep('category');
        break;
      case 'category':
        setCurrentStep('details');
        break;
      case 'details':
        setCurrentStep('review');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'velocity':
        setCurrentStep('url');
        break;
      case 'category':
        setCurrentStep('velocity');
        break;
      case 'details':
        setCurrentStep('category');
        break;
      case 'review':
        setCurrentStep('details');
        break;
    }
    setError('');
  };

  const calculateXP = () => {
    const qualityBonus = Math.floor(calculateDescriptionQuality(formData.title) / 2);
    const velocityBonus = formData.trendVelocity && formData.trendSize ? 20 : 0;
    const predictionBonus = formData.predictedPeak ? 15 : 0;
    const categoryBonus = Object.keys(formData.categoryAnswers).length >= 2 ? 15 : 0;
    return 30 + qualityBonus + velocityBonus + predictionBonus + categoryBonus;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      setLoading(false);
      onClose?.();
    } catch (error: any) {
      console.error('Error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to submit trend');
    }
  };

  // Auto-detect platform when URL changes
  useEffect(() => {
    if (formData.url && isValidUrl(formData.url)) {
      const platform = detectPlatform(formData.url);
      setFormData(prev => ({ ...prev, platform }));
      
      // Mock metadata extraction
      setMetadata({
        creator_handle: '@creator',
        views_count: 125000,
        likes_count: 15000,
        comments_count: 850,
        hashtags: ['trending', 'viral', 'fyp']
      });
    }
  }, [formData.url]);


  const renderContent = () => (
    <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="lightning-bolt" size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Spot Cultural Wave</Text>
                <Text style={styles.headerSubtitle}>
                  {currentStep === 'url' && 'Earn up to 200 XP'}
                  {currentStep === 'velocity' && 'Predict trajectory'}
                  {currentStep === 'category' && 'Categorize for bonus XP'}
                  {currentStep === 'details' && `${getSelectedCategory()?.label} expertise`}
                  {currentStep === 'review' && 'Finalize submission'}
                </Text>
              </View>
            </View>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={theme.colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${
                      currentStep === 'url' ? 20 :
                      currentStep === 'velocity' ? 40 :
                      currentStep === 'category' ? 60 :
                      currentStep === 'details' ? 80 : 100
                    }%` 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Step 1: URL & Title */}
            {currentStep === 'url' && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.step}>
                {/* XP Potential Banner */}
                <View style={styles.xpBanner}>
                  <View style={styles.xpBannerContent}>
                    <Text style={styles.xpBannerTitle}>Total XP Available</Text>
                    <Text style={styles.xpBannerSubtitle}>Base + Quality + Accuracy Bonuses</Text>
                  </View>
                  <View style={styles.xpBannerValue}>
                    <Text style={styles.xpNumber}>200</Text>
                    <Text style={styles.xpLabel}>max XP</Text>
                  </View>
                </View>

                <View style={styles.xpBreakdown}>
                  <View style={styles.xpBreakdownItem}>
                    <Text style={styles.xpBreakdownValue}>30 XP</Text>
                    <Text style={styles.xpBreakdownLabel}>Base submission</Text>
                  </View>
                  <View style={styles.xpBreakdownItem}>
                    <Text style={[styles.xpBreakdownValue, { color: theme.colors.primary }]}>+50 XP</Text>
                    <Text style={styles.xpBreakdownLabel}>Quality bonus</Text>
                  </View>
                  <View style={styles.xpBreakdownItem}>
                    <Text style={[styles.xpBreakdownValue, { color: '#8B5CF6' }]}>+120 XP</Text>
                    <Text style={styles.xpBreakdownLabel}>If validated</Text>
                  </View>
                </View>

                {/* URL Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Trend URL <Text style={styles.required}>*</Text>
                    <Text style={styles.xpNote}> +30 base XP</Text>
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.url}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, url: text }))}
                      placeholder="Paste TikTok, Instagram, YouTube, X link..."
                      placeholderTextColor={theme.colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                    {extracting && (
                      <ActivityIndicator 
                        size="small" 
                        color={theme.colors.primary} 
                        style={styles.inputLoader}
                      />
                    )}
                  </View>
                </View>

                {/* Platform indicator */}
                {formData.platform && (
                  <View style={styles.platformIndicator}>
                    <Icon name="web" size={16} color={theme.colors.textLight} />
                    <Text style={styles.platformText}>Detected platform: {formData.platform}</Text>
                  </View>
                )}

                {/* Auto-extracted Metadata */}
                {metadata && (
                  <Animated.View entering={FadeIn} style={styles.metadataCard}>
                    <View style={styles.metadataHeader}>
                      <Icon name="check-circle" size={16} color={theme.colors.success} />
                      <Text style={styles.metadataTitle}>Metadata captured automatically</Text>
                    </View>
                    
                    <View style={styles.metadataContent}>
                      <View style={styles.metadataStats}>
                        <View style={styles.statItem}>
                          <Icon name="eye" size={16} color={theme.colors.textLight} />
                          <Text style={styles.statValue}>{formatNumber(metadata.views_count)}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Icon name="heart" size={16} color={theme.colors.textLight} />
                          <Text style={styles.statValue}>{formatNumber(metadata.likes_count)}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Icon name="comment" size={16} color={theme.colors.textLight} />
                          <Text style={styles.statValue}>{formatNumber(metadata.comments_count)}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.hashtagContainer}>
                        {metadata.hashtags.slice(0, 3).map((tag: string, i: number) => (
                          <View key={i} style={styles.hashtag}>
                            <Text style={styles.hashtagText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* Description Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Describe this trend <Text style={styles.required}>*</Text>
                    <Text style={styles.xpNote}> +50 XP for quality</Text>
                  </Text>
                  <Text style={styles.inputHint}>
                    Be specific! Use action verbs, mention platform, explain why it's trending
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.title}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                    placeholder="e.g., TikTok creators are pranking their pets with cucumber filters, causing millions of confused cat reactions..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  
                  {/* Quality Indicators */}
                  {formData.title && (
                    <View style={styles.qualityCard}>
                      <View style={styles.qualityHeader}>
                        <Icon name="star" size={16} color="#F59E0B" />
                        <Text style={styles.qualityTitle}>Quality Bonus XP</Text>
                        <Text style={styles.qualityScore}>
                          +{Math.floor(calculateDescriptionQuality(formData.title) / 2)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Step 2: Velocity & Size */}
            {currentStep === 'velocity' && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.step}>
                <Text style={styles.stepTitle}>How fast is this trend moving?</Text>
                <Text style={styles.stepSubtitle}>This helps us identify market opportunities</Text>
                
                <View style={styles.optionsContainer}>
                  {[
                    { value: 'just_starting', label: 'Just Starting', icon: '🌱', desc: 'Brand new, very few people know' },
                    { value: 'picking_up', label: 'Picking Up', icon: '📈', desc: 'Gaining traction, growing steadily' },
                    { value: 'viral', label: 'Going Viral', icon: '🚀', desc: 'Explosive growth, spreading everywhere' },
                    { value: 'saturated', label: 'Saturated', icon: '⚡', desc: 'Peak reached, maximum visibility' },
                    { value: 'declining', label: 'Declining', icon: '📉', desc: 'Losing momentum, past its prime' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setFormData(prev => ({ ...prev, trendVelocity: option.value as any }))}
                      style={[
                        styles.optionButton,
                        formData.trendVelocity === option.value && styles.optionButtonSelected
                      ]}
                    >
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                      <View style={styles.optionContent}>
                        <Text style={styles.optionLabel}>{option.label}</Text>
                        <Text style={styles.optionDesc}>{option.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Trend Size */}
                <Text style={[styles.stepTitle, { marginTop: 32 }]}>How big is this trend?</Text>
                <Text style={styles.stepSubtitle}>Based on engagement and reach</Text>
                
                <View style={styles.sizeGrid}>
                  {[
                    { value: 'micro', label: 'Micro', icon: '🔬', desc: '<10K views/likes' },
                    { value: 'niche', label: 'Niche', icon: '🎯', desc: '10K-100K engagement' },
                    { value: 'viral', label: 'Viral', icon: '🔥', desc: '100K-1M engagement' },
                    { value: 'mega', label: 'Mega', icon: '💥', desc: '1M-10M engagement' },
                    { value: 'global', label: 'Global', icon: '🌍', desc: '10M+ engagement' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setFormData(prev => ({ ...prev, trendSize: option.value as any }))}
                      style={[
                        styles.sizeButton,
                        formData.trendSize === option.value && styles.sizeButtonSelected
                      ]}
                    >
                      <Text style={styles.sizeIcon}>{option.icon}</Text>
                      <Text style={styles.sizeLabel}>{option.label}</Text>
                      <Text style={styles.sizeDesc}>{option.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Step 3: Category Selection */}
            {currentStep === 'category' && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.step}>
                <Text style={styles.stepTitle}>What type of trend is this?</Text>
                <Text style={styles.stepSubtitle}>This helps us ask the right follow-up questions</Text>
                
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, category: cat.id, categoryAnswers: {} }));
                        setCurrentStep('details');
                      }}
                      style={styles.categoryButton}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Step 4: Category Details */}
            {currentStep === 'details' && getSelectedCategory() && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.step}>
                {/* Category header */}
                <View style={[styles.categoryHeader, { backgroundColor: getSelectedCategory()?.color + '20' }]}>
                  <Text style={styles.categoryHeaderIcon}>{getSelectedCategory()?.icon}</Text>
                  <View>
                    <Text style={styles.categoryHeaderTitle}>{getSelectedCategory()?.label}</Text>
                    <Text style={styles.categoryHeaderSubtitle}>Answer a few specific questions</Text>
                  </View>
                </View>

                {/* Category Questions */}
                {Object.entries(getSelectedCategory()!.questions).map(([key, question]) => (
                  <View key={key} style={styles.questionGroup}>
                    <Text style={styles.questionLabel}>{question.label}</Text>
                    <View style={styles.questionOptions}>
                      {question.options.map((option: string) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => setFormData(prev => ({
                            ...prev,
                            categoryAnswers: { ...prev.categoryAnswers, [key]: option }
                          }))}
                          style={[
                            styles.questionOption,
                            formData.categoryAnswers[key] === option && styles.questionOptionSelected
                          ]}
                        >
                          <Text style={[
                            styles.questionOptionText,
                            formData.categoryAnswers[key] === option && styles.questionOptionTextSelected
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                {/* Age Groups */}
                <View style={styles.questionGroup}>
                  <Text style={styles.questionLabel}>Who's into this? (select all that apply)</Text>
                  <View style={styles.ageGrid}>
                    {['Gen Alpha (9-14)', 'Gen Z (15-24)', 'Millennials (25-40)', 'Gen X+ (40+)'].map((age) => (
                      <TouchableOpacity
                        key={age}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            audienceAge: prev.audienceAge.includes(age)
                              ? prev.audienceAge.filter(a => a !== age)
                              : [...prev.audienceAge, age]
                          }));
                        }}
                        style={[
                          styles.ageButton,
                          formData.audienceAge.includes(age) && styles.ageButtonSelected
                        ]}
                      >
                        <Text style={[
                          styles.ageButtonText,
                          formData.audienceAge.includes(age) && styles.ageButtonTextSelected
                        ]}>
                          {age}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Step 5: Review */}
            {currentStep === 'review' && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.step}>
                <Text style={styles.stepTitle}>Review & Earn XP</Text>
                
                {/* XP Summary */}
                <View style={styles.xpSummaryCard}>
                  <View style={styles.xpSummaryHeader}>
                    <Text style={styles.xpSummaryTitle}>Your XP Breakdown</Text>
                    <Text style={styles.xpSummaryTotal}>{calculateXP()} XP</Text>
                  </View>
                  <View style={styles.xpSummaryBreakdown}>
                    <View style={styles.xpSummaryItem}>
                      <Text style={styles.xpSummaryLabel}>Base submission</Text>
                      <Text style={styles.xpSummaryValue}>30 XP</Text>
                    </View>
                    <View style={styles.xpSummaryItem}>
                      <Text style={styles.xpSummaryLabel}>Description quality</Text>
                      <Text style={[styles.xpSummaryValue, { color: theme.colors.primary }]}>
                        +{Math.floor(calculateDescriptionQuality(formData.title) / 2)} XP
                      </Text>
                    </View>
                    {formData.trendVelocity && formData.trendSize && (
                      <View style={styles.xpSummaryItem}>
                        <Text style={styles.xpSummaryLabel}>Velocity data</Text>
                        <Text style={[styles.xpSummaryValue, { color: theme.colors.success }]}>+20 XP</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.xpSummaryFooter}>
                    <Text style={styles.xpSummaryFooterText}>
                      <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>+120 XP bonus</Text> if validated by the community!
                    </Text>
                  </View>
                </View>

                {/* Trend Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>Trend Info</Text>
                  <Text style={styles.summaryDescription}>{formData.title}</Text>
                  <Text style={styles.summaryUrl}>{formData.url}</Text>
                  {formData.creator_handle && (
                    <Text style={styles.summaryCreator}>by {formData.creator_handle}</Text>
                  )}
                </View>

                {/* Category Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>Category Analysis</Text>
                  <View style={styles.summaryCategory}>
                    <Text style={styles.summaryCategoryIcon}>{getSelectedCategory()?.icon}</Text>
                    <Text style={styles.summaryCategoryLabel}>{getSelectedCategory()?.label}</Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <View style={styles.footerButtons}>
              {currentStep !== 'url' ? (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              
              {currentStep === 'review' ? (
                <TouchableOpacity 
                  onPress={handleSubmit} 
                  disabled={loading}
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Icon name="lightning-bolt" size={16} color="#ffffff" />
                      <Text style={styles.submitButtonText}>Submit & Earn {calculateXP()} XP</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : currentStep === 'category' ? (
                <Text style={styles.nextButtonDisabled}>Select a category to continue</Text>
              ) : (
                <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Icon name="chevron-right" size={16} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );

  return visible !== undefined ? (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {renderContent()}
    </Modal>
  ) : (
    renderContent()
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  step: {
    paddingVertical: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.lg,
  },
  xpBanner: {
    backgroundColor: '#F59E0B20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#F59E0B30',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpBannerContent: {
    flex: 1,
  },
  xpBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  xpBannerSubtitle: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  xpBannerValue: {
    alignItems: 'flex-end',
  },
  xpNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F59E0B',
  },
  xpLabel: {
    fontSize: 10,
    color: theme.colors.textLight,
  },
  xpBreakdown: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  xpBreakdownItem: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  xpBreakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  xpBreakdownLabel: {
    fontSize: 10,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  xpNote: {
    fontSize: 12,
    color: '#F59E0B',
  },
  inputHint: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputLoader: {
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md,
  },
  platformIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  platformText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  metadataCard: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  metadataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  metadataContent: {
    gap: theme.spacing.sm,
  },
  metadataStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: 12,
    color: theme.colors.text,
  },
  hashtagContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  hashtag: {
    backgroundColor: theme.colors.primary + '30',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  hashtagText: {
    fontSize: 10,
    color: theme.colors.primary,
  },
  qualityCard: {
    backgroundColor: '#F59E0B20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qualityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    flex: 1,
    marginLeft: theme.spacing.xs,
  },
  qualityScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  optionsContainer: {
    gap: theme.spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sizeButton: {
    width: '48%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  sizeButtonSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  sizeIcon: {
    fontSize: 20,
    marginBottom: theme.spacing.xs,
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  sizeDesc: {
    fontSize: 10,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryButton: {
    width: '48%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  categoryHeaderIcon: {
    fontSize: 32,
  },
  categoryHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  categoryHeaderSubtitle: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  questionGroup: {
    marginBottom: theme.spacing.lg,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  questionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  questionOption: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: '48%',
  },
  questionOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  questionOptionText: {
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
  },
  questionOptionTextSelected: {
    color: theme.colors.primary,
  },
  ageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  ageButton: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: '48%',
  },
  ageButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  ageButtonText: {
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
  },
  ageButtonTextSelected: {
    color: theme.colors.primary,
  },
  xpSummaryCard: {
    backgroundColor: '#F59E0B20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  xpSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  xpSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  xpSummaryTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
  },
  xpSummaryBreakdown: {
    gap: theme.spacing.xs,
  },
  xpSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpSummaryLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  xpSummaryValue: {
    fontSize: 12,
    color: theme.colors.text,
  },
  xpSummaryFooter: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  xpSummaryFooterText: {
    fontSize: 10,
    color: theme.colors.textLight,
  },
  summaryCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  summaryDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  summaryUrl: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  summaryCreator: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  summaryCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  summaryCategoryIcon: {
    fontSize: 20,
  },
  summaryCategoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.error + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    flex: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundCard,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  nextButtonDisabled: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#F59E0B',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
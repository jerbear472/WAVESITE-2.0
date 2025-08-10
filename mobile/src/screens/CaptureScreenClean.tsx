import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabaseService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';

interface SocialPlatform {
  name: string;
  icon: string;
  color: string;
  url: string;
  appUrl: string;
}

const socialPlatforms: SocialPlatform[] = [
  {
    name: 'TikTok',
    icon: '🎵',
    color: '#000000',
    url: 'https://www.tiktok.com',
    appUrl: 'tiktok://',
  },
  {
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    url: 'https://www.instagram.com',
    appUrl: 'instagram://',
  },
  {
    name: 'X (Twitter)',
    icon: '𝕏',
    color: '#000000',
    url: 'https://www.x.com',
    appUrl: 'twitter://',
  },
  {
    name: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    url: 'https://www.youtube.com',
    appUrl: 'youtube://',
  },
  {
    name: 'Reddit',
    icon: '🤖',
    color: '#FF4500',
    url: 'https://www.reddit.com',
    appUrl: 'reddit://',
  },
  {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0077B5',
    url: 'https://www.linkedin.com',
    appUrl: 'linkedin://',
  },
];

const categories = [
  { id: 'fashion', label: 'Fashion', icon: '👗' },
  { id: 'food', label: 'Food', icon: '🍔' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'other', label: 'Other', icon: '🌟' },
];

export const CaptureScreenClean: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [description, setDescription] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openSocialApp = async (platform: SocialPlatform) => {
    try {
      const canOpen = await Linking.canOpenURL(platform.appUrl);
      if (canOpen) {
        await Linking.openURL(platform.appUrl);
      } else {
        await Linking.openURL(platform.url);
      }
    } catch (error) {
      Alert.alert('Error', `Could not open ${platform.name}`);
    }
  };

  const selectImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.assets && response.assets[0]) {
          setSelectedImage(response.assets[0].uri || null);
        }
      }
    );
  };

  const submitTrend = async () => {
    if (!description || !selectedCategory) {
      Alert.alert('Missing Information', 'Please add a description and select a category');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to submit trends');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabaseService.submitTrend(user.id, {
        title: description.split('\n')[0].substring(0, 100),
        description,
        category: selectedCategory as any,
        imageUri: selectedImage || undefined,
        socialUrl: socialUrl || undefined,
      });

      if (error) throw error;

      Alert.alert(
        'Success!',
        'Your trend has been submitted. You earned 10 Wave Points!',
        [
          {
            text: 'OK',
            onPress: () => {
              setDescription('');
              setSocialUrl('');
              setSelectedCategory('');
              setSelectedImage(null);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit trend');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Capture Trends</Text>
          <Text style={styles.subtitle}>Spot what's trending on social media</Text>
        </View>

        {/* Social Media Apps Section */}
        <Card style={styles.socialCard} variant="elevated">
          <Text style={styles.sectionTitle}>Browse Social Media</Text>
          <Text style={styles.sectionSubtitle}>
            Open your favorite apps to find trending content
          </Text>
          <View style={styles.socialGrid}>
            {socialPlatforms.map((platform) => (
              <TouchableOpacity
                key={platform.name}
                style={[styles.socialButton, { borderColor: platform.color }]}
                onPress={() => openSocialApp(platform)}
              >
                <Text style={styles.socialIcon}>{platform.icon}</Text>
                <Text style={styles.socialName}>{platform.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Trend Submission Form */}
        <Card style={styles.formCard} variant="elevated">
          <Text style={styles.sectionTitle}>Submit a Trend</Text>
          
          {/* Description Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>What's trending?</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the trend you spotted..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Social URL Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Link (optional)</Text>
            <TextInput
              style={styles.input}
              value={socialUrl}
              onChangeText={setSocialUrl}
              placeholder="Paste the social media link"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Category Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelSelected,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Image Upload */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Screenshot (optional)</Text>
            <TouchableOpacity style={styles.imageButton} onPress={selectImage}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              ) : (
                <>
                  <Text style={styles.imageIcon}>📸</Text>
                  <Text style={styles.imageText}>Add Screenshot</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <Button
            title="Submit Trend"
            onPress={submitTrend}
            loading={submitting}
            fullWidth
            size="large"
            style={styles.submitButton}
          />

          <View style={styles.rewardInfo}>
            <Text style={styles.rewardIcon}>🌊</Text>
            <Text style={styles.rewardText}>Earn 10 Wave Points per submission!</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  socialCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.lg,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  socialButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
  },
  socialIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.xs,
  },
  socialName: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    minHeight: 100,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryButton: {
    width: '23%',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: theme.colors.wave[50],
    borderColor: theme.colors.primary,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 11,
    color: theme.colors.textLight,
  },
  categoryLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  imageButton: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundDark,
  },
  imageIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  imageText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  selectedImage: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.sm,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
  },
});
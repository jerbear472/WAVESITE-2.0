import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TrendCaptureService from '../../services/TrendCaptureService';

interface FloatingTrendLoggerProps {
  onClose: () => void;
  onTrendLogged: () => void;
}

const categories = [
  { id: 'visual_style', label: 'Visual Style', emoji: '🎨' },
  { id: 'audio_music', label: 'Audio/Music', emoji: '🎵' },
  { id: 'creator_technique', label: 'Creator Technique', emoji: '🎬' },
  { id: 'meme_format', label: 'Meme Format', emoji: '😂' },
  { id: 'product_brand', label: 'Product/Brand', emoji: '🛍️' },
  { id: 'behavior_pattern', label: 'Behavior Pattern', emoji: '🤳' },
];

const platforms = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'youtube', label: 'YouTube' },
];

const FloatingTrendLogger: React.FC<FloatingTrendLoggerProps> = ({ onClose, onTrendLogged }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [creatorHandle, setCreatorHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description || !selectedCategory || !selectedPlatform) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const trendData = {
        title,
        description,
        category: selectedCategory,
        platform: selectedPlatform,
        url,
        creator_handle: creatorHandle,
        hashtags: hashtags.split(',').map(tag => tag.trim()).filter(tag => tag),
        additional_context: `Submitted via mobile app`,
      };

      const response = await TrendCaptureService.submitTrend(trendData);
      
      if (response.quality_score >= 0.7) {
        Alert.alert(
          'Great Job! 🎉',
          `Quality Score: ${(response.quality_score * 100).toFixed(0)}%\nEstimated Earnings: $${response.estimated_earnings.toFixed(2)}`,
          [{ text: 'OK', onPress: onTrendLogged }]
        );
      } else {
        Alert.alert(
          'Submission Received',
          `Quality Score: ${(response.quality_score * 100).toFixed(0)}%\n\nTips to improve:\n${response.tips_for_improvement.join('\n')}`,
          [{ text: 'OK', onPress: onTrendLogged }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit trend. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Log New Trend</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="Trend Title *"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (50+ characters for quality bonus) *"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <Text style={styles.sectionTitle}>Category *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat.id && styles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    selectedCategory === cat.id && styles.categoryLabelActive,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Platform *</Text>
            <View style={styles.platformRow}>
              {platforms.map((platform) => (
                <TouchableOpacity
                  key={platform.id}
                  style={[
                    styles.platformButton,
                    selectedPlatform === platform.id && styles.platformButtonActive,
                  ]}
                  onPress={() => setSelectedPlatform(platform.id)}
                >
                  <Text style={[
                    styles.platformText,
                    selectedPlatform === platform.id && styles.platformTextActive,
                  ]}>
                    {platform.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="URL (optional)"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Creator Handle (e.g., @username)"
              value={creatorHandle}
              onChangeText={setCreatorHandle}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Hashtags (comma separated)"
              value={hashtags}
              onChangeText={setHashtags}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <View style={styles.qualityTips}>
              <Text style={styles.tipsTitle}>💡 Quality Tips:</Text>
              <Text style={styles.tipText}>• Add 50+ character description</Text>
              <Text style={styles.tipText}>• Include 3+ relevant hashtags</Text>
              <Text style={styles.tipText}>• Add creator handle for attribution</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Trend'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  categoryButton: {
    width: '31%',
    alignItems: 'center',
    padding: 12,
    margin: '1.16%',
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  platformRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  platformButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  platformButtonActive: {
    backgroundColor: '#667eea',
  },
  platformText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  platformTextActive: {
    color: '#fff',
  },
  qualityTips: {
    backgroundColor: '#f0f7ff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: '#667eea',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default FloatingTrendLogger;
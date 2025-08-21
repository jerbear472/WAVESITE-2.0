import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { enhancedTheme } from '../styles/theme.enhanced';

interface TrendSubmission {
  title: string;
  description: string;
  url: string;
  category: string;
}

export const ValidationScreenClean: React.FC = () => {
  const navigation = useNavigation();
  const [submission, setSubmission] = useState<TrendSubmission>({
    title: '',
    description: '',
    url: '',
    category: 'technology',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'technology', label: 'Technology', icon: 'laptop' },
    { id: 'fashion', label: 'Fashion', icon: 'tshirt-crew' },
    { id: 'food', label: 'Food', icon: 'food' },
    { id: 'entertainment', label: 'Entertainment', icon: 'movie' },
    { id: 'sports', label: 'Sports', icon: 'basketball' },
    { id: 'other', label: 'Other', icon: 'dots-horizontal' },
  ];

  const handleSubmit = async () => {
    if (!submission.title || !submission.url) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Success!',
        'Your trend has been submitted for validation.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSubmission({
                title: '',
                description: '',
                url: '',
                category: 'technology',
              });
            },
          },
        ]
      );
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Submit Trend</Text>
            <Text style={styles.subtitle}>Share what's trending</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter trend title"
                placeholderTextColor={enhancedTheme.colors.textTertiary}
                value={submission.title}
                onChangeText={(text) =>
                  setSubmission({ ...submission, title: text })
                }
              />
            </View>

            {/* URL Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor={enhancedTheme.colors.textTertiary}
                value={submission.url}
                onChangeText={(text) =>
                  setSubmission({ ...submission, url: text })
                }
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe this trend (optional)"
                placeholderTextColor={enhancedTheme.colors.textTertiary}
                value={submission.description}
                onChangeText={(text) =>
                  setSubmission({ ...submission, description: text })
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      submission.category === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() =>
                      setSubmission({ ...submission, category: cat.id })
                    }
                  >
                    <Icon
                      name={cat.icon}
                      size={20}
                      color={
                        submission.category === cat.id
                          ? '#ffffff'
                          : enhancedTheme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        submission.category === cat.id && styles.categoryLabelActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Submit Trend</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Icon name="information" size={20} color={enhancedTheme.colors.primary} />
              <Text style={styles.infoText}>
                Submitted trends are validated by the community. High-quality submissions
                earn more XP and boost your WaveSight score!
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: enhancedTheme.colors.text,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.border,
    gap: 8,
  },
  categoryChipActive: {
    backgroundColor: enhancedTheme.colors.primary,
    borderColor: enhancedTheme.colors.primary,
  },
  categoryLabel: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: enhancedTheme.colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    lineHeight: 20,
  },
});
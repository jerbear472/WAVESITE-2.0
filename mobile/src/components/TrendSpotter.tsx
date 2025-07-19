import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { TrendCategory, TrendSubmission } from '../types';

interface TrendSpotterProps {
  onClose: () => void;
  onSubmit: (trend: TrendSubmission) => Promise<void>;
}

export const TrendSpotter: React.FC<TrendSpotterProps> = ({
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState(1);
  const [trendData, setTrendData] = useState<Partial<TrendSubmission>>({
    category: undefined,
    description: '',
    virality_prediction: 5,
    evidence: [],
  });

  const categories: TrendCategory[] = [
    'visual_style',
    'audio_music',
    'creator_technique',
    'meme_format',
    'product_brand',
    'behavior_pattern',
  ];

  const handleScreenshot = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets && result.assets[0]) {
      setTrendData({
        ...trendData,
        screenshot_url: result.assets[0].uri,
      });
    }
  };

  const handleSubmit = async () => {
    await onSubmit(trendData as TrendSubmission);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Capture the Trend</Text>
            <TouchableOpacity
              style={styles.screenshotButton}
              onPress={handleScreenshot}
            >
              {trendData.screenshot_url ? (
                <Image
                  source={{ uri: trendData.screenshot_url }}
                  style={styles.screenshot}
                />
              ) : (
                <Text style={styles.screenshotButtonText}>
                  📸 Add Screenshot
                </Text>
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="What makes this special?"
              placeholderTextColor="#666"
              value={trendData.description}
              onChangeText={(text) =>
                setTrendData({ ...trendData, description: text })
              }
              multiline
              maxLength={280}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Categorize</Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  trendData.category === category && styles.categorySelected,
                ]}
                onPress={() => setTrendData({ ...trendData, category })}
              >
                <Text
                  style={[
                    styles.categoryText,
                    trendData.category === category &&
                      styles.categoryTextSelected,
                  ]}
                >
                  {category.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Predict Virality</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Niche Community</Text>
              <Text style={styles.sliderValue}>{trendData.virality_prediction}/10</Text>
              <Text style={styles.sliderLabel}>Global Phenomenon</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Why will this spread?"
              placeholderTextColor="#666"
              value={trendData.evidence.join('\n')}
              onChangeText={(text) =>
                setTrendData({ ...trendData, evidence: text.split('\n') })
              }
              multiline
            />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spot a Trend 🔥</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>{renderStep()}</ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setStep(step + 1)}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit Trend</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  screenshotButton: {
    width: '100%',
    height: 200,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  screenshot: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  screenshotButtonText: {
    fontSize: 18,
    color: '#666',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 100,
  },
  categoryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
  },
  categorySelected: {
    backgroundColor: '#8B5CF6',
  },
  categoryText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sliderLabel: {
    color: '#666',
    fontSize: 14,
  },
  sliderValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
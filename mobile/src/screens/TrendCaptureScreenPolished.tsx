import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { SmartTrendSubmission } from '../components/SmartTrendSubmission';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES: Array<{ id: TrendCategory; label: string; icon: string; color: string }> = [
  { id: 'tech', label: 'Technology', icon: 'laptop', color: '#0080ff' },
  { id: 'fashion', label: 'Fashion', icon: 'tshirt-crew', color: '#ff0080' },
  { id: 'food', label: 'Food & Dining', icon: 'food', color: '#ff8000' },
  { id: 'health', label: 'Health & Wellness', icon: 'heart-pulse', color: '#00ff80' },
  { id: 'entertainment', label: 'Entertainment', icon: 'movie', color: '#8000ff' },
  { id: 'sports', label: 'Sports', icon: 'basketball', color: '#ff0000' },
  { id: 'travel', label: 'Travel', icon: 'airplane', color: '#00ffff' },
  { id: 'business', label: 'Business', icon: 'briefcase', color: '#ffff00' },
];

interface TrendData {
  title: string;
  description: string;
  category: TrendCategory | '';
  imageUri: string | null;
  socialUrl: string;
  confidence: number;
}

export const TrendCaptureScreenPolished: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const cameraRef = useRef<Camera>(null);
  const viewShotRef = useRef<ViewShot>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  const [trendData, setTrendData] = useState<TrendData>({
    title: '',
    description: '',
    category: '',
    imageUri: null,
    socialUrl: '',
    confidence: 0,
  });
  
  const devices = useCameraDevices();
  const device = devices.back;
  
  const stepProgress = useSharedValue(25);

  React.useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'authorized');
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        HapticFeedback.trigger('impactMedium');
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          qualityPrioritization: 'quality',
        });
        
        setTrendData({ ...trendData, imageUri: `file://${photo.path}` });
        setCameraActive(false);
        nextStep();
      } catch (error) {
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const handlePickImage = () => {
    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.assets && response.assets[0]) {
        setTrendData({ ...trendData, imageUri: response.assets[0].uri || null });
        HapticFeedback.trigger('impactLight');
      }
    });
  };

  const handleCategorySelect = (categoryId: TrendCategory) => {
    setTrendData({ ...trendData, category: categoryId });
    HapticFeedback.trigger('impactLight');
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      stepProgress.value = withSpring((currentStep + 1) * 25);
      HapticFeedback.trigger('impactLight');
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      stepProgress.value = withSpring((currentStep - 1) * 25);
      HapticFeedback.trigger('impactLight');
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !trendData.category) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabaseService.submitTrend(user.id, {
        title: trendData.title,
        description: trendData.description,
        category: trendData.category as TrendCategory,
        imageUri: trendData.imageUri || undefined,
        socialUrl: trendData.socialUrl || undefined,
      });
      
      if (error) {
        throw error;
      }
      
      HapticFeedback.trigger('notificationSuccess');
      Alert.alert(
        'Success!',
        'Your trend has been submitted for validation. You earned 10 Wave Points!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form and navigate
              setTrendData({
                title: '',
                description: '',
                category: '',
                imageUri: null,
                socialUrl: '',
                confidence: 0,
              });
              setCurrentStep(1);
              navigation.navigate('Home');
            },
          },
        ]
      );
    } catch (error: any) {
      HapticFeedback.trigger('notificationError');
      Alert.alert('Error', error.message || 'Failed to submit trend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${stepProgress.value}%`,
  }));

  const renderStepIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View style={[styles.progressBar, progressAnimatedStyle]}>
          <LinearGradient
            colors={enhancedTheme.colors.primaryGradient}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
      <View style={styles.stepsRow}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}>
              {currentStep > step ? (
                <Icon name="check" size={16} color="#ffffff" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  currentStep >= step && styles.stepNumberActive,
                ]}>
                  {step}
                </Text>
              )}
            </View>
            <Text style={styles.stepLabel}>
              {step === 1 && 'Capture'}
              {step === 2 && 'Details'}
              {step === 3 && 'Category'}
              {step === 4 && 'Review'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeInUp.springify()} style={styles.stepContent}>
      <Text style={styles.stepTitle}>Capture Your Trend</Text>
      <Text style={styles.stepSubtitle}>
        Take a photo or screenshot of the trend you've spotted
      </Text>

      {trendData.imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: trendData.imageUri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setTrendData({ ...trendData, imageUri: null })}
          >
            <Icon name="close-circle" size={30} color={enhancedTheme.colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {cameraActive && device ? (
            <View style={styles.cameraContainer}>
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                device={device}
                isActive={cameraActive}
                photo={true}
              />
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleCapture}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeCameraButton}
                  onPress={() => setCameraActive(false)}
                >
                  <Icon name="close" size={30} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.captureOptions}>
              <TouchableOpacity
                style={styles.captureOption}
                onPress={() => setCameraActive(true)}
              >
                <LinearGradient
                  colors={enhancedTheme.colors.primaryGradient}
                  style={styles.captureOptionGradient}
                >
                  <Icon name="camera" size={32} color="#ffffff" />
                </LinearGradient>
                <Text style={styles.captureOptionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureOption}
                onPress={handlePickImage}
              >
                <View style={styles.captureOptionSecondary}>
                  <Icon name="image" size={32} color={enhancedTheme.colors.primary} />
                </View>
                <Text style={styles.captureOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {trendData.imageUri && (
        <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
          <LinearGradient
            colors={enhancedTheme.colors.primaryGradient}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Icon name="arrow-right" size={20} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInUp.springify()} style={styles.stepContent}>
      <Text style={styles.stepTitle}>Describe Your Trend</Text>
      <Text style={styles.stepSubtitle}>
        Help others understand what you've discovered
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Trend Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Give your trend a catchy title"
          placeholderTextColor={enhancedTheme.colors.textTertiary}
          value={trendData.title}
          onChangeText={(text) => setTrendData({ ...trendData, title: text })}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Explain why this is trending and what makes it interesting"
          placeholderTextColor={enhancedTheme.colors.textTertiary}
          value={trendData.description}
          onChangeText={(text) => setTrendData({ ...trendData, description: text })}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Source URL (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Link to social media post or website"
          placeholderTextColor={enhancedTheme.colors.textTertiary}
          value={trendData.socialUrl}
          onChangeText={(text) => setTrendData({ ...trendData, socialUrl: text })}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={previousStep}>
          <Icon name="arrow-left" size={20} color={enhancedTheme.colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.nextButton, { flex: 1 }]} 
          onPress={nextStep}
          disabled={!trendData.title || !trendData.description}
        >
          <LinearGradient
            colors={enhancedTheme.colors.primaryGradient}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Icon name="arrow-right" size={20} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInUp.springify()} style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Category</Text>
      <Text style={styles.stepSubtitle}>
        Choose the category that best fits your trend
      </Text>

      <View style={styles.categoriesGrid}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              trendData.category === category.id && styles.categoryCardActive,
            ]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <Icon 
              name={category.icon} 
              size={28} 
              color={trendData.category === category.id ? '#ffffff' : category.color}
            />
            <Text style={[
              styles.categoryLabel,
              trendData.category === category.id && styles.categoryLabelActive,
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={previousStep}>
          <Icon name="arrow-left" size={20} color={enhancedTheme.colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.nextButton, { flex: 1 }]} 
          onPress={nextStep}
          disabled={!trendData.category}
        >
          <LinearGradient
            colors={enhancedTheme.colors.primaryGradient}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Icon name="arrow-right" size={20} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderStep4 = () => {
    const selectedCategory = CATEGORIES.find(c => c.id === trendData.category);
    
    return (
      <Animated.View entering={FadeInUp.springify()} style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.stepSubtitle}>
          Make sure everything looks good before submitting
        </Text>

        <View style={styles.reviewContainer}>
          {trendData.imageUri && (
            <Image source={{ uri: trendData.imageUri }} style={styles.reviewImage} />
          )}
          
          <View style={styles.reviewDetails}>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Title</Text>
              <Text style={styles.reviewValue}>{trendData.title}</Text>
            </View>

            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Description</Text>
              <Text style={styles.reviewValue}>{trendData.description}</Text>
            </View>

            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Category</Text>
              <View style={styles.reviewCategory}>
                <Icon name={selectedCategory?.icon || ''} size={20} color={selectedCategory?.color} />
                <Text style={styles.reviewValue}>{selectedCategory?.label}</Text>
              </View>
            </View>

            {trendData.socialUrl ? (
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Source</Text>
                <Text style={[styles.reviewValue, styles.reviewUrl]}>{trendData.socialUrl}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={previousStep}>
            <Icon name="arrow-left" size={20} color={enhancedTheme.colors.text} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitButton, { flex: 1 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={['#00d4ff', '#00ffff']}
              style={styles.submitButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Submit Trend</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#000d1a', '#001a33']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepIndicator()}
          
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: enhancedTheme.colors.primary,
  },
  stepNumber: {
    color: enhancedTheme.colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    color: enhancedTheme.colors.textTertiary,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 30,
  },
  cameraContainer: {
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 30,
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  closeCameraButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  captureOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  captureOption: {
    alignItems: 'center',
  },
  captureOptionGradient: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  captureOptionSecondary: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: enhancedTheme.colors.primary,
  },
  captureOptionText: {
    color: enhancedTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 20,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: enhancedTheme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 30,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    margin: 8,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryCardActive: {
    backgroundColor: enhancedTheme.colors.primary,
    borderColor: enhancedTheme.colors.primary,
  },
  categoryLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#ffffff',
  },
  reviewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  reviewDetails: {
    gap: 16,
  },
  reviewItem: {
    gap: 4,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: enhancedTheme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  reviewValue: {
    fontSize: 16,
    color: enhancedTheme.colors.text,
  },
  reviewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewUrl: {
    color: enhancedTheme.colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    gap: 8,
  },
  backButtonText: {
    color: enhancedTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    height: 56,
  },
  nextButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitButton: {
    height: 56,
  },
  submitButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
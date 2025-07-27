// Enhanced extractMetadata function for TrendSubmissionFormEnhanced.tsx
// Replace the extractMetadata function (around line 181) with this enhanced version

const extractMetadata = async (url: string) => {
  if (!url) return;
  
  console.log('🔄 Form: Starting metadata extraction for:', url);
  setExtractingMetadata(true);
  setError('');
  
  try {
    console.log('📊 Form: Calling MetadataExtractor...');
    const metadata = await MetadataExtractor.extractFromUrl(url);
    console.log('✅ Form: Metadata received:', metadata);
    
    // Auto-detect platform immediately
    const detectedPlatform = detectPlatform(url);
    console.log('📱 Form: Platform detected:', detectedPlatform);
    
    setFormData(prev => {
      const updates = {
        ...prev,
        platform: detectedPlatform,
        creator_handle: metadata.creator_handle || prev.creator_handle,
        creator_name: metadata.creator_name || prev.creator_name,
        post_caption: metadata.post_caption || prev.post_caption,
        likes_count: metadata.likes_count !== undefined ? metadata.likes_count : prev.likes_count,
        comments_count: metadata.comments_count !== undefined ? metadata.comments_count : prev.comments_count,
        views_count: metadata.views_count !== undefined ? metadata.views_count : prev.views_count,
        hashtags: metadata.hashtags || prev.hashtags || [],
        thumbnail_url: metadata.thumbnail_url || prev.thumbnail_url,
        
        // Smart trend name extraction
        trendName: prev.trendName || metadata.title || metadata.post_caption?.split(' ').slice(0, 5).join(' ') || '',
        
        // Auto-populate explanation if we have a caption
        explanation: prev.explanation || (metadata.post_caption ? `Trending ${detectedPlatform} content: "${metadata.post_caption.substring(0, 100)}${metadata.post_caption.length > 100 ? '...' : ''}"` : ''),
        
        // Smart category detection based on hashtags and content
        categories: prev.categories.length > 0 ? prev.categories : detectCategories(metadata.hashtags || [], metadata.post_caption || ''),
        
        // Smart age range detection based on platform
        ageRanges: prev.ageRanges.length > 0 ? prev.ageRanges : detectAgeRange(detectedPlatform),
        
        // Auto-populate moods based on content
        moods: prev.moods.length > 0 ? prev.moods : detectMoods(metadata.hashtags || [], metadata.post_caption || ''),
        
        // Auto-populate motivation based on platform and content
        motivation: prev.motivation || detectMotivation(detectedPlatform, metadata.post_caption || ''),
        
        // Auto-set platform-specific defaults
        firstSeen: prev.firstSeen || (metadata.posted_at ? formatDateForFirstSeen(metadata.posted_at) : 'today'),
        otherPlatforms: prev.otherPlatforms.length > 0 ? prev.otherPlatforms : suggestOtherPlatforms(detectedPlatform)
      };
      
      console.log('📝 Form: Updated form data:', updates);
      
      // If we got engagement data, pre-fill the required engagement counts
      if (metadata.likes_count !== undefined || metadata.views_count !== undefined) {
        updates.likes_count = metadata.likes_count || 0;
        updates.views_count = metadata.views_count || 0;
        updates.comments_count = metadata.comments_count || 0;
        
        // Auto-detect spread speed based on engagement
        if (!prev.spreadSpeed) {
          updates.spreadSpeed = detectSpreadSpeed(metadata.likes_count || 0, metadata.views_count || 0, detectedPlatform);
          console.log('📈 Form: Auto-detected spread speed:', updates.spreadSpeed);
        }
      }
      
      return updates;
    });
    
    // Show success message with more detail
    const capturedItems = [];
    if (metadata.creator_handle || metadata.creator_name) capturedItems.push('creator');
    if (metadata.post_caption) capturedItems.push('caption');
    if (metadata.likes_count !== undefined) capturedItems.push('engagement');
    if (metadata.hashtags?.length) capturedItems.push('hashtags');
    if (metadata.thumbnail_url) capturedItems.push('thumbnail');
    
    if (capturedItems.length > 0) {
      const successMsg = `✨ Auto-captured: ${capturedItems.join(', ')} from ${detectedPlatform}`;
      console.log('🎉 Form:', successMsg);
      setSuccess(successMsg);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      console.log('⚠️ Form: Basic data extracted, but no enhanced metadata captured');
      setSuccess(`📱 Platform detected: ${detectedPlatform}`);
      setTimeout(() => setSuccess(''), 2000);
    }
    
  } catch (error) {
    console.error('❌ Form: Metadata extraction failed:', error);
    setError('Unable to extract metadata. You can still fill the form manually.');
    
    // Still set basic platform info even if extraction fails
    const detectedPlatform = detectPlatform(url);
    setFormData(prev => ({
      ...prev,
      platform: detectedPlatform,
      trendName: prev.trendName || `${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} trend`,
      explanation: prev.explanation || `Trending content from ${detectedPlatform}`
    }));
  } finally {
    setExtractingMetadata(false);
  }
};

// Also enhance the handleSubmit function with better logging
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  console.log('🚀 Form: Starting submission process...');
  console.log('📝 Form: Current form data:', formData);
  
  // Validate current step before submission
  if (!validateStep(step)) {
    console.log('❌ Form: Validation failed for step:', step);
    return;
  }
  
  setLoading(true);
  setError('');
  
  try {
    console.log('📤 Form: Calling onSubmit with form data...');
    await onSubmit(formData);
    console.log('✅ Form: Submission completed successfully!');
    setSuccess('Trend submitted successfully! 🎉');
    setTimeout(() => onClose(), 1500);
  } catch (err: any) {
    console.error('❌ Form: Submission error:', err);
    setError(err.message || 'Failed to submit trend');
  } finally {
    setLoading(false);
  }
};
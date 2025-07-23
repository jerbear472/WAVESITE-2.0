// Test utility for verifying ShareExtension integration
import { Linking, Alert } from 'react-native';
import ShareExtensionService from '../services/ShareExtensionService';

export const testShareExtension = {
  // Test URLs from different platforms
  testUrls: {
    tiktok: 'https://www.tiktok.com/@username/video/1234567890',
    instagram: 'https://www.instagram.com/reel/ABC123/',
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },

  // Verify ShareExtension is receiving data
  async verifyShareExtension() {
    console.log('🔍 Verifying ShareExtension setup...');
    
    const shareService = ShareExtensionService.getInstance();
    
    // Check if we can retrieve shared content
    try {
      const sharedContent = await shareService.getSharedContent();
      console.log('📱 Shared content found:', sharedContent);
      
      if (sharedContent.length > 0) {
        Alert.alert(
          '✅ ShareExtension Working',
          `Found ${sharedContent.length} shared items. Latest: ${sharedContent[0].url}`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert(
          '⚠️ No Shared Content',
          'ShareExtension is set up but no content has been shared yet.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('❌ ShareExtension error:', error);
      Alert.alert(
        '❌ ShareExtension Error',
        'Could not retrieve shared content. Check App Groups configuration.',
        [{ text: 'OK' }]
      );
      return false;
    }
  },

  // Test opening different platform URLs
  async testPlatformUrls() {
    const results = [];
    
    for (const [platform, url] of Object.entries(this.testUrls)) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        results.push({
          platform,
          url,
          canOpen,
          status: canOpen ? '✅' : '❌',
        });
      } catch (error) {
        results.push({
          platform,
          url,
          canOpen: false,
          status: '❌',
          error: error.message,
        });
      }
    }
    
    console.log('🔗 URL Test Results:', results);
    return results;
  },

  // Simulate sharing a URL (for testing)
  async simulateShare(url: string) {
    console.log('🚀 Simulating share for:', url);
    
    const shareService = ShareExtensionService.getInstance();
    
    // Detect platform
    const platform = url.includes('tiktok') ? 'tiktok' : 
                    url.includes('instagram') ? 'instagram' : 
                    url.includes('youtube') ? 'youtube' : 'unknown';
    
    // This would normally come from the ShareExtension
    // For testing, we'll manually trigger the listener
    const mockSharedContent = {
      url,
      title: 'Test Share',
      platform,
      timestamp: Date.now(),
    };
    
    // Save the content
    await shareService.saveSharedContent(mockSharedContent);
    
    // Manually call the private notifyListeners method using a workaround
    // In production, this happens via deep linking
    (shareService as any).notifyListeners(mockSharedContent);
    
    Alert.alert(
      '📤 Share Simulated',
      `Simulated sharing from ${mockSharedContent.platform || 'unknown platform'}`,
      [{ text: 'OK' }]
    );
  },

  // Full diagnostic test
  async runDiagnostics() {
    console.log('🏥 Running ShareExtension diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      shareExtensionWorking: false,
      platformUrlTests: [],
      recommendations: [],
    };
    
    // Test 1: Verify ShareExtension
    diagnostics.shareExtensionWorking = await this.verifyShareExtension();
    
    // Test 2: Test platform URLs
    diagnostics.platformUrlTests = await this.testPlatformUrls();
    
    // Generate recommendations
    if (!diagnostics.shareExtensionWorking) {
      diagnostics.recommendations.push(
        '1. Add ShareExtension target in Xcode',
        '2. Configure App Groups for both targets',
        '3. Ensure bundle IDs are correct',
        '4. Clean build and reinstall app'
      );
    }
    
    diagnostics.platformUrlTests.forEach(test => {
      if (!test.canOpen) {
        diagnostics.recommendations.push(
          `Configure URL scheme for ${test.platform} in Info.plist`
        );
      }
    });
    
    console.log('📊 Diagnostic Results:', diagnostics);
    
    // Show results
    Alert.alert(
      'ShareExtension Diagnostics',
      `Status: ${diagnostics.shareExtensionWorking ? '✅ Working' : '❌ Not Working'}\n\n` +
      `Recommendations:\n${diagnostics.recommendations.join('\n')}`,
      [{ text: 'OK' }]
    );
    
    return diagnostics;
  },
};

// Add to React Native __DEV__ tools
if (__DEV__) {
  global.testShareExtension = testShareExtension;
}
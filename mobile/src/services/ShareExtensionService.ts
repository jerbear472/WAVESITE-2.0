import { Linking, NativeModules, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendCaptureService from './TrendCaptureService';

interface SharedContent {
  url: string;
  platform: string;
  timestamp: number;
  title?: string;
  text?: string;
  captureMethod?: 'manual' | 'share_extension';
}

class ShareExtensionService {
  private static instance: ShareExtensionService;
  private listeners: ((content: SharedContent) => void)[] = [];

  private constructor() {
    this.setupDeepLinking();
  }

  static getInstance(): ShareExtensionService {
    if (!ShareExtensionService.instance) {
      ShareExtensionService.instance = new ShareExtensionService();
    }
    return ShareExtensionService.instance;
  }

  private setupDeepLinking() {
    // Handle URLs when app is already open
    Linking.addEventListener('url', this.handleDeepLink);

    // Check if app was launched with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleDeepLink({ url });
      }
    });

    // Check for pending shares from share extension
    this.checkPendingShares();
  }

  private handleDeepLink = async (event: { url: string }) => {
    try {
      const url = event.url;
      if (url.startsWith('wavesight://capture')) {
        const urlParams = new URL(url);
        const sharedUrl = urlParams.searchParams.get('url');
        const title = urlParams.searchParams.get('title');
        
        if (sharedUrl) {
          const decodedUrl = decodeURIComponent(sharedUrl);
          const content: SharedContent = {
            url: decodedUrl,
            platform: this.detectPlatform(decodedUrl),
            timestamp: Date.now(),
            title: title ? decodeURIComponent(title) : undefined,
            captureMethod: 'share_extension',
          };
          
          // Save to history
          await this.saveSharedContent(content);
          
          // Notify listeners
          this.notifyListeners(content);
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      Alert.alert('Error', 'Failed to process shared content');
    }
  };

  private async checkPendingShares() {
    if (Platform.OS === 'ios') {
      try {
        // Check shared user defaults for iOS
        const { SharedGroupPreferences } = NativeModules;
        if (SharedGroupPreferences) {
          const pendingShare = await SharedGroupPreferences.getItem(
            'pendingShare',
            'group.com.jeremyuys.wavesite'
          );
          if (pendingShare) {
            const content = JSON.parse(pendingShare) as SharedContent;
            content.captureMethod = 'share_extension';
            
            // Save to history
            await this.saveSharedContent(content);
            
            // Notify listeners
            this.notifyListeners(content);
            
            // Clear the pending share
            await SharedGroupPreferences.setItem(
              'pendingShare',
              null,
              'group.com.jeremyuys.wavesite'
            );
          }
        }
      } catch (error) {
        console.error('Error checking pending shares:', error);
      }
    }
  }

  private detectPlatform(url: string): string {
    const platform = TrendCaptureService.detectPlatform(url);
    return platform || 'unknown';
  }

  private notifyListeners(content: SharedContent) {
    this.listeners.forEach((listener) => listener(content));
  }

  addListener(listener: (content: SharedContent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async saveSharedContent(content: SharedContent) {
    try {
      const existingShares = await AsyncStorage.getItem('sharedContent');
      const shares = existingShares ? JSON.parse(existingShares) : [];
      shares.unshift(content);
      // Keep only last 50 shares
      const trimmedShares = shares.slice(0, 50);
      await AsyncStorage.setItem('sharedContent', JSON.stringify(trimmedShares));
    } catch (error) {
      console.error('Error saving shared content:', error);
    }
  }

  async getSharedContent(): Promise<SharedContent[]> {
    try {
      const existingShares = await AsyncStorage.getItem('sharedContent');
      return existingShares ? JSON.parse(existingShares) : [];
    } catch (error) {
      console.error('Error getting shared content:', error);
      return [];
    }
  }

  /**
   * Process and capture shared content directly
   */
  async captureSharedContent(content: SharedContent, userId: string, additionalData?: any) {
    try {
      const captured = await TrendCaptureService.captureTrend(
        content.url,
        userId,
        {
          title: additionalData?.title || content.title,
          description: additionalData?.description,
          hashtags: additionalData?.hashtags,
        },
        content.captureMethod || 'share_extension'
      );
      
      return captured;
    } catch (error) {
      console.error('Error capturing shared content:', error);
      throw error;
    }
  }

  /**
   * Clear all shared content history
   */
  async clearSharedHistory() {
    try {
      await AsyncStorage.removeItem('sharedContent');
    } catch (error) {
      console.error('Error clearing shared history:', error);
    }
  }

  cleanup() {
    Linking.removeAllListeners('url');
  }
}

export default ShareExtensionService;
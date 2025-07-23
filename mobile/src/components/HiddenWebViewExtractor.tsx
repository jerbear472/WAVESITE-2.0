import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';
import WebViewExtractorService from '../services/WebViewExtractorService';

interface ExtractedData {
  creator?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

interface HiddenWebViewExtractorRef {
  extractData: (url: string) => Promise<ExtractedData>;
}

const HiddenWebViewExtractor = forwardRef<HiddenWebViewExtractorRef>((props, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const extractionPromiseRef = useRef<{
    resolve: (data: ExtractedData) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    extractData: async (url: string): Promise<ExtractedData> => {
      return new Promise((resolve, reject) => {
        extractionPromiseRef.current = { resolve, reject };
        
        // Set a timeout
        const timeout = setTimeout(() => {
          if (extractionPromiseRef.current) {
            extractionPromiseRef.current.reject(new Error('Extraction timeout'));
            extractionPromiseRef.current = null;
          }
        }, 10000); // 10 second timeout
        
        // Load the URL by updating state
        setCurrentUrl(url);
        
        // Clean up timeout on success
        const originalResolve = resolve;
        resolve = (data: ExtractedData) => {
          clearTimeout(timeout);
          originalResolve(data);
        };
      });
    },
  }));

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'extraction-complete' && extractionPromiseRef.current) {
        const data = message.data;
        const processedData: ExtractedData = {
          creator: data.creator,
          caption: data.caption,
          likes: data.likes ? WebViewExtractorService.parseEngagementNumber(data.likes) : undefined,
          comments: data.comments ? WebViewExtractorService.parseEngagementNumber(data.comments) : undefined,
          shares: data.shares ? WebViewExtractorService.parseEngagementNumber(data.shares) : undefined,
          views: data.views ? WebViewExtractorService.parseEngagementNumber(data.views) : undefined,
        };
        
        extractionPromiseRef.current.resolve(processedData);
        extractionPromiseRef.current = null;
      } else if (message.type === 'extraction-error' && extractionPromiseRef.current) {
        extractionPromiseRef.current.reject(new Error(message.error));
        extractionPromiseRef.current = null;
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const handleLoadEnd = (event: any) => {
    const { url } = event.nativeEvent;
    if (url && url !== 'about:blank') {
      // Inject the extraction script after page loads
      const script = WebViewExtractorService.getExtractionScript(url);
      webViewRef.current?.injectJavaScript(script);
    }
  };

  // Don't render WebView until we have a URL to load
  if (!currentUrl) {
    return null;
  }

  return (
    <View style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={{ width: 0, height: 0 }}
        // Pretend to be a mobile browser
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
      />
    </View>
  );
});

HiddenWebViewExtractor.displayName = 'HiddenWebViewExtractor';

export default HiddenWebViewExtractor;
export type { HiddenWebViewExtractorRef, ExtractedData };
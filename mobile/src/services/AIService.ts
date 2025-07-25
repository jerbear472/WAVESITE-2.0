import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { Platform } from 'react-native';
import Voice from 'react-native-voice';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

interface TrendPrediction {
  viralProbability: number;
  engagementScore: number;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  insights: string[];
  recommendedActions: string[];
}

interface ContentAnalysis {
  keywords: string[];
  entities: string[];
  topics: string[];
  emotions: Record<string, number>;
}

export class AIService {
  private static instance: AIService;
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;
  private voiceRecognitionActive = false;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  constructor() {
    this.initializeModels();
    this.setupVoiceRecognition();
  }

  async initializeModels(): Promise<void> {
    try {
      // Wait for TensorFlow.js to be ready
      await tf.ready();
      
      // Load a lightweight trend prediction model
      // In production, this would load from a CDN or bundled model
      this.model = await this.createSimpleTrendModel();
      this.isModelLoaded = true;
      
      console.log('AI models initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI models:', error);
    }
  }

  private async createSimpleTrendModel(): Promise<tf.LayersModel> {
    // Create a simple neural network for trend prediction
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async enhanceTrendData(trendData: any): Promise<any> {
    const prediction = await this.predictTrendSuccess(trendData);
    const analysis = await this.analyzeContent(trendData.description || '');
    
    return {
      ...trendData,
      title: this.generateSmartTitle(trendData.title, analysis.keywords),
      description: this.enhanceDescription(trendData.description, analysis),
      insights: prediction.insights,
      predictedEngagement: prediction.engagementScore,
      viralProbability: prediction.viralProbability,
      category: prediction.category,
      sentiment: prediction.sentiment,
      keywords: analysis.keywords,
      recommendedActions: prediction.recommendedActions,
    };
  }

  async predictTrendSuccess(trendData: any): Promise<TrendPrediction> {
    try {
      // Extract features from trend data
      const features = this.extractFeatures(trendData);
      
      // Make prediction using the model
      let viralProbability = 0.5; // Default
      
      if (this.isModelLoaded && this.model) {
        const input = tf.tensor2d([features]);
        const prediction = this.model.predict(input) as tf.Tensor;
        const result = await prediction.data();
        viralProbability = result[0];
        
        // Clean up tensors
        input.dispose();
        prediction.dispose();
      }

      // Generate insights based on features
      const insights = this.generateInsights(trendData, viralProbability);
      const category = this.detectCategory(trendData);
      const sentiment = this.analyzeSentiment(trendData.description || '');
      const recommendedActions = this.generateRecommendations(viralProbability, category);

      return {
        viralProbability,
        engagementScore: this.calculateEngagementScore(trendData),
        category,
        sentiment,
        insights,
        recommendedActions,
      };
    } catch (error) {
      console.error('Error predicting trend success:', error);
      return this.getDefaultPrediction();
    }
  }

  private extractFeatures(trendData: any): number[] {
    // Extract numerical features for ML model
    const features = [
      trendData.like_count || 0,
      trendData.comment_count || 0,
      trendData.share_count || 0,
      trendData.view_count || 0,
      this.getTimeOfDayScore(),
      this.getPlatformScore(trendData.platform),
      this.getHashtagScore(trendData.hashtags),
      this.getTextLengthScore(trendData.description),
      this.getMediaTypeScore(trendData.media_type),
      this.getTrendingTopicScore(trendData.description),
    ];

    // Normalize features
    return this.normalizeFeatures(features);
  }

  private normalizeFeatures(features: number[]): number[] {
    const maxValues = [1000000, 100000, 50000, 10000000, 1, 1, 1, 1, 1, 1];
    return features.map((value, index) => Math.min(value / maxValues[index], 1));
  }

  private generateInsights(trendData: any, viralProbability: number): string[] {
    const insights: string[] = [];

    if (viralProbability > 0.8) {
      insights.push('🚀 High viral potential detected!');
    } else if (viralProbability > 0.6) {
      insights.push('📈 Good engagement potential');
    }

    if (trendData.hashtags?.length > 5) {
      insights.push('Consider reducing hashtags for better reach');
    }

    const hour = new Date().getHours();
    if (hour >= 19 && hour <= 22) {
      insights.push('Posted during peak engagement hours');
    }

    if (trendData.comment_count > trendData.like_count * 0.1) {
      insights.push('High comment ratio indicates strong audience engagement');
    }

    return insights;
  }

  private detectCategory(trendData: any): string {
    const description = (trendData.description || '').toLowerCase();
    const title = (trendData.title || '').toLowerCase();
    const combined = `${title} ${description}`;

    const categories = {
      'Entertainment': ['funny', 'comedy', 'dance', 'music', 'sing', 'perform'],
      'Education': ['learn', 'how to', 'tutorial', 'explain', 'teach', 'tip'],
      'Lifestyle': ['morning', 'routine', 'day in', 'life', 'vlog', 'daily'],
      'Fashion': ['outfit', 'ootd', 'style', 'fashion', 'wear', 'clothes'],
      'Food': ['recipe', 'cook', 'eat', 'food', 'meal', 'restaurant'],
      'Fitness': ['workout', 'exercise', 'gym', 'fitness', 'health', 'yoga'],
      'Tech': ['tech', 'app', 'gadget', 'review', 'software', 'device'],
      'Beauty': ['makeup', 'skincare', 'beauty', 'cosmetic', 'glow', 'skin'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['love', 'amazing', 'great', 'awesome', 'fantastic', 'excellent', 'best', 'perfect', 'beautiful', 'wonderful'];
    const negativeWords = ['hate', 'terrible', 'awful', 'worst', 'bad', 'horrible', 'disgusting', 'fail', 'disappointed', 'poor'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    // Extract keywords using simple frequency analysis
    const words = content.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const keywords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    // Simple entity detection
    const entities = this.extractEntities(content);
    
    // Topic detection
    const topics = this.detectTopics(content);
    
    // Emotion analysis
    const emotions = this.analyzeEmotions(content);

    return {
      keywords,
      entities,
      topics,
      emotions,
    };
  }

  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Extract @mentions
    const mentions = text.match(/@\w+/g) || [];
    entities.push(...mentions);
    
    // Extract #hashtags
    const hashtags = text.match(/#\w+/g) || [];
    entities.push(...hashtags);
    
    // Extract URLs
    const urls = text.match(/https?:\/\/\S+/g) || [];
    entities.push(...urls.map(() => '[URL]'));

    return [...new Set(entities)];
  }

  private detectTopics(text: string): string[] {
    const topicPatterns = {
      'Technology': /\b(ai|tech|app|software|digital|innovation|startup)\b/gi,
      'Health': /\b(health|fitness|wellness|mental|medical|exercise)\b/gi,
      'Business': /\b(business|entrepreneur|startup|company|market|invest)\b/gi,
      'Entertainment': /\b(movie|music|game|show|series|concert|festival)\b/gi,
      'Travel': /\b(travel|trip|vacation|destination|explore|adventure)\b/gi,
    };

    const detectedTopics: string[] = [];
    
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(text)) {
        detectedTopics.push(topic);
      }
    }

    return detectedTopics;
  }

  private analyzeEmotions(text: string): Record<string, number> {
    const emotionWords = {
      joy: ['happy', 'joy', 'excited', 'delighted', 'cheerful', 'elated'],
      sadness: ['sad', 'unhappy', 'depressed', 'down', 'blue', 'melancholy'],
      anger: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'outraged'],
      fear: ['scared', 'afraid', 'terrified', 'anxious', 'worried', 'nervous'],
      surprise: ['surprised', 'amazed', 'astonished', 'shocked', 'stunned'],
    };

    const emotions: Record<string, number> = {};
    const lowerText = text.toLowerCase();

    for (const [emotion, words] of Object.entries(emotionWords)) {
      const count = words.filter(word => lowerText.includes(word)).length;
      if (count > 0) {
        emotions[emotion] = count / words.length;
      }
    }

    return emotions;
  }

  async analyzeSharedContent(sharedContent: any): Promise<any> {
    const analysis = await this.analyzeContent(sharedContent.text || '');
    const sentiment = this.analyzeSentiment(sharedContent.text || '');
    const category = this.detectCategory(sharedContent);
    
    return {
      category,
      sentiment,
      viralProbability: Math.random() * 0.4 + 0.4, // Mock for now
      keywords: analysis.keywords,
      topics: analysis.topics,
      emotions: analysis.emotions,
    };
  }

  // Voice-to-trend capture functionality
  private setupVoiceRecognition(): void {
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
  }

  async startVoiceCapture(): Promise<void> {
    try {
      this.voiceRecognitionActive = true;
      await Voice.start('en-US');
    } catch (error) {
      console.error('Voice recognition error:', error);
      this.voiceRecognitionActive = false;
    }
  }

  async stopVoiceCapture(): Promise<void> {
    try {
      await Voice.stop();
      this.voiceRecognitionActive = false;
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  private onSpeechResults(e: any): void {
    if (e.value && e.value.length > 0) {
      const spokenText = e.value[0];
      this.processSpeechToTrend(spokenText);
    }
  }

  private onSpeechError(e: any): void {
    console.error('Speech recognition error:', e.error);
    this.voiceRecognitionActive = false;
  }

  private async processSpeechToTrend(spokenText: string): Promise<void> {
    // Extract trend information from spoken text
    const trendInfo = this.parseSpokenTrend(spokenText);
    
    // Store for later processing
    storage.set('pendingVoiceTrend', JSON.stringify(trendInfo));
  }

  private parseSpokenTrend(text: string): any {
    // Simple parsing logic - could be enhanced with NLP
    const lowerText = text.toLowerCase();
    
    let platform = 'unknown';
    if (lowerText.includes('tiktok')) platform = 'tiktok';
    else if (lowerText.includes('instagram')) platform = 'instagram';
    else if (lowerText.includes('youtube')) platform = 'youtube';
    
    return {
      title: text.slice(0, 50),
      description: text,
      platform,
      capturedVia: 'voice',
      timestamp: Date.now(),
    };
  }

  // Helper methods
  private getTimeOfDayScore(): number {
    const hour = new Date().getHours();
    // Peak hours: 7-9 AM, 12-1 PM, 7-10 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 13) || (hour >= 19 && hour <= 22)) {
      return 1;
    }
    return 0.5;
  }

  private getPlatformScore(platform: string): number {
    const scores: Record<string, number> = {
      'tiktok': 0.9,
      'instagram': 0.8,
      'youtube': 0.7,
      'twitter': 0.6,
      'default': 0.5,
    };
    return scores[platform?.toLowerCase()] || scores.default;
  }

  private getHashtagScore(hashtags: string[]): number {
    if (!hashtags) return 0;
    const optimalCount = 5;
    const diff = Math.abs(hashtags.length - optimalCount);
    return Math.max(0, 1 - (diff * 0.1));
  }

  private getTextLengthScore(text: string): number {
    if (!text) return 0;
    const length = text.length;
    if (length >= 50 && length <= 150) return 1;
    if (length < 50) return length / 50;
    return Math.max(0, 1 - ((length - 150) / 500));
  }

  private getMediaTypeScore(mediaType: string): number {
    const scores: Record<string, number> = {
      'video': 1,
      'image': 0.7,
      'text': 0.4,
    };
    return scores[mediaType] || 0.5;
  }

  private getTrendingTopicScore(text: string): number {
    // Check against current trending topics (mock implementation)
    const trendingTopics = ['ai', 'sustainability', 'wellness', 'crypto', 'metaverse'];
    const lowerText = text.toLowerCase();
    const matchCount = trendingTopics.filter(topic => lowerText.includes(topic)).length;
    return Math.min(1, matchCount * 0.3);
  }

  private calculateEngagementScore(trendData: any): number {
    const likes = trendData.like_count || 0;
    const comments = trendData.comment_count || 0;
    const shares = trendData.share_count || 0;
    const views = trendData.view_count || 1;

    return ((likes * 1.0) + (comments * 2.0) + (shares * 3.0)) / views * 1000;
  }

  private generateSmartTitle(originalTitle: string, keywords: string[]): string {
    if (originalTitle && originalTitle.length > 10) return originalTitle;
    
    // Generate title from keywords
    if (keywords.length > 0) {
      return keywords.slice(0, 3).join(' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return originalTitle || 'Trending Content';
  }

  private enhanceDescription(description: string, analysis: ContentAnalysis): string {
    if (!description) return '';
    
    // Add relevant hashtags if missing
    let enhanced = description;
    if (!description.includes('#') && analysis.keywords.length > 0) {
      const hashtags = analysis.keywords.slice(0, 3).map(k => `#${k}`).join(' ');
      enhanced += `\n\n${hashtags}`;
    }
    
    return enhanced;
  }

  private generateRecommendations(viralProbability: number, category: string): string[] {
    const recommendations: string[] = [];

    if (viralProbability < 0.5) {
      recommendations.push('Consider adding trending audio or music');
      recommendations.push('Optimize posting time for your audience');
    }

    if (category === 'Entertainment') {
      recommendations.push('Keep videos under 30 seconds for maximum engagement');
    } else if (category === 'Education') {
      recommendations.push('Add clear value proposition in the first 3 seconds');
    }

    recommendations.push('Engage with comments in the first hour');

    return recommendations;
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'many', 'much', 'more', 'most', 'other', 'another', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once'];
    
    return stopWords.includes(word.toLowerCase());
  }

  private getDefaultPrediction(): TrendPrediction {
    return {
      viralProbability: 0.5,
      engagementScore: 50,
      category: 'General',
      sentiment: 'neutral',
      insights: ['Unable to generate AI insights at this time'],
      recommendedActions: ['Try capturing trends during peak hours'],
    };
  }
}

export default AIService.getInstance();
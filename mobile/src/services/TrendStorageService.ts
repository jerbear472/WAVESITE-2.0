import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrendData } from '../types/trend.types';

export interface Trend {
  id: string;
  url: string;
  title: string;
  description?: string;
  platform?: string;
  timestamp: number;
  userId?: string;
  metadata?: any;
}

class TrendStorageService {
  private static STORAGE_KEY = '@wavesite_trends';

  static async saveTrend(trend: Omit<Trend, 'id' | 'timestamp'>): Promise<Trend> {
    try {
      const trends = await this.getTrends();
      const newTrend: Trend = {
        ...trend,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      
      trends.unshift(newTrend);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(trends));
      return newTrend;
    } catch (error) {
      console.error('Error saving trend:', error);
      throw error;
    }
  }

  static async getTrends(): Promise<Trend[]> {
    try {
      const trendsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return trendsJson ? JSON.parse(trendsJson) : [];
    } catch (error) {
      console.error('Error getting trends:', error);
      return [];
    }
  }

  static async getAllTrends(): Promise<TrendData[]> {
    try {
      const trends = await this.getTrends();
      // Convert Trend format to TrendData format
      return trends.map(trend => ({
        id: trend.id,
        url: trend.url,
        title: trend.title,
        description: trend.description,
        platform: trend.platform || 'other',
        createdAt: new Date(trend.timestamp).toISOString(),
        metadata: {
          hashtags: [],
          ...trend.metadata,
        },
      }));
    } catch (error) {
      console.error('Error getting all trends:', error);
      return [];
    }
  }

  static async deleteTrend(id: string): Promise<void> {
    try {
      const trends = await this.getTrends();
      const filteredTrends = trends.filter(trend => trend.id !== id);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTrends));
    } catch (error) {
      console.error('Error deleting trend:', error);
      throw error;
    }
  }

  static async clearAllTrends(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing trends:', error);
      throw error;
    }
  }
}

export default TrendStorageService;
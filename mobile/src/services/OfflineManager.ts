import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const storage = new MMKV();

interface PendingAction {
  id: string;
  type: 'CREATE_TREND' | 'UPDATE_TREND' | 'DELETE_TREND' | 'VALIDATE_TREND' | 'CREATE_SESSION';
  data: any;
  timestamp: number;
  retryCount: number;
  priority: number;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number;
  failedCount: number;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private pendingQueue: Map<string, PendingAction>;
  private syncListeners: Set<(status: SyncStatus) => void>;
  private netInfoUnsubscribe: (() => void) | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private conflictResolver: ConflictResolver;

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  constructor() {
    this.pendingQueue = new Map();
    this.syncListeners = new Set();
    this.conflictResolver = new ConflictResolver();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load pending actions from storage
    await this.loadPendingActions();

    // Set up network monitoring
    this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleConnectivityChange.bind(this));

    // Check initial connection state
    const state = await NetInfo.fetch();
    this.handleConnectivityChange(state);

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingData();
      }
    }, 30000); // Every 30 seconds

    console.log('Offline manager initialized');
  }

  private handleConnectivityChange(state: NetInfoState): void {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected && state.isInternetReachable !== false;

    if (wasOffline && this.isOnline) {
      console.log('Connection restored, starting sync...');
      this.syncPendingData();
    }

    this.notifyListeners();
  }

  // Public API
  async saveTrendWithSync(trendData: any): Promise<any> {
    const trend = {
      ...trendData,
      id: this.generateId(),
      local_id: this.generateId(),
      created_at: new Date().toISOString(),
      sync_status: this.isOnline ? 'syncing' : 'pending',
    };

    // Save locally first
    await this.saveToLocalStorage('trends', trend);

    if (this.isOnline) {
      // Try to sync immediately
      try {
        const syncedTrend = await this.syncTrend(trend);
        trend.id = syncedTrend.id;
        trend.sync_status = 'synced';
        await this.updateLocalStorage('trends', trend);
        return trend;
      } catch (error) {
        console.error('Failed to sync trend immediately:', error);
        // Fall back to queuing
      }
    }

    // Queue for later sync
    await this.queueAction({
      id: trend.local_id,
      type: 'CREATE_TREND',
      data: trend,
      timestamp: Date.now(),
      retryCount: 0,
      priority: 1,
    });

    return trend;
  }

  async queueAction(action: PendingAction): Promise<void> {
    this.pendingQueue.set(action.id, action);
    await this.savePendingActions();
    this.notifyListeners();
  }

  async syncPendingData(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    console.log('Starting sync process...');

    try {
      const actions = Array.from(this.pendingQueue.values())
        .sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

      for (const action of actions) {
        try {
          await this.processAction(action);
          this.pendingQueue.delete(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          action.retryCount++;
          
          if (action.retryCount >= 3) {
            // Move to failed queue after 3 retries
            await this.moveToFailedQueue(action);
            this.pendingQueue.delete(action.id);
          }
        }
      }

      await this.savePendingActions();
      storage.set('last_sync_time', Date.now().toString());
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async processAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'CREATE_TREND':
        await this.syncTrend(action.data);
        break;
      case 'UPDATE_TREND':
        await this.updateTrend(action.data);
        break;
      case 'DELETE_TREND':
        await this.deleteTrend(action.data.id);
        break;
      case 'VALIDATE_TREND':
        await this.syncValidation(action.data);
        break;
      case 'CREATE_SESSION':
        await this.syncSession(action.data);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  private async syncTrend(trend: any): Promise<any> {
    const { data, error } = await supabase
      .from('captured_trends')
      .insert({
        url: trend.url,
        title: trend.title,
        description: trend.description,
        platform: trend.platform,
        user_id: trend.user_id,
        metadata: trend.metadata,
        ai_insights: trend.aiInsights,
        predicted_engagement: trend.predictedEngagement,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async updateTrend(trend: any): Promise<void> {
    // Check for conflicts
    const serverVersion = await this.fetchServerVersion('captured_trends', trend.id);
    if (serverVersion && serverVersion.updated_at > trend.updated_at) {
      // Conflict detected
      const resolved = await this.conflictResolver.resolve(trend, serverVersion);
      trend = resolved;
    }

    const { error } = await supabase
      .from('captured_trends')
      .update({
        title: trend.title,
        description: trend.description,
        metadata: trend.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trend.id);

    if (error) throw error;
  }

  private async deleteTrend(trendId: string): Promise<void> {
    const { error } = await supabase
      .from('captured_trends')
      .delete()
      .eq('id', trendId);

    if (error) throw error;
  }

  private async syncValidation(validation: any): Promise<void> {
    const { error } = await supabase
      .from('trend_validations')
      .insert({
        trend_id: validation.trend_id,
        user_id: validation.user_id,
        vote: validation.vote,
        created_at: validation.created_at,
      });

    if (error) throw error;
  }

  private async syncSession(session: any): Promise<void> {
    const { error } = await supabase
      .from('scroll_sessions')
      .insert({
        user_id: session.user_id,
        start_time: session.start_time,
        end_time: session.end_time,
        duration: session.duration,
        earnings: session.earnings,
        trends_logged: session.trends_logged,
      });

    if (error) throw error;
  }

  // Local storage operations
  private async saveToLocalStorage(table: string, data: any): Promise<void> {
    const key = `${table}_${data.id || data.local_id}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
    
    // Update index
    const indexKey = `${table}_index`;
    const index = await this.getIndex(indexKey);
    if (!index.includes(key)) {
      index.push(key);
      await AsyncStorage.setItem(indexKey, JSON.stringify(index));
    }
  }

  private async updateLocalStorage(table: string, data: any): Promise<void> {
    const key = `${table}_${data.id || data.local_id}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  private async getIndex(indexKey: string): Promise<string[]> {
    try {
      const indexData = await AsyncStorage.getItem(indexKey);
      return indexData ? JSON.parse(indexData) : [];
    } catch {
      return [];
    }
  }

  async getLocalData(table: string): Promise<any[]> {
    const indexKey = `${table}_index`;
    const index = await this.getIndex(indexKey);
    
    const items = await Promise.all(
      index.map(async (key) => {
        try {
          const data = await AsyncStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        } catch {
          return null;
        }
      })
    );

    return items.filter(item => item !== null);
  }

  // Pending actions management
  private async loadPendingActions(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('@pending_actions');
      if (data) {
        const actions = JSON.parse(data);
        actions.forEach((action: PendingAction) => {
          this.pendingQueue.set(action.id, action);
        });
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }

  private async savePendingActions(): Promise<void> {
    try {
      const actions = Array.from(this.pendingQueue.values());
      await AsyncStorage.setItem('@pending_actions', JSON.stringify(actions));
    } catch (error) {
      console.error('Failed to save pending actions:', error);
    }
  }

  private async moveToFailedQueue(action: PendingAction): Promise<void> {
    const failedKey = '@failed_actions';
    try {
      const existing = await AsyncStorage.getItem(failedKey);
      const failed = existing ? JSON.parse(existing) : [];
      failed.push({
        ...action,
        failedAt: Date.now(),
      });
      await AsyncStorage.setItem(failedKey, JSON.stringify(failed));
    } catch (error) {
      console.error('Failed to save to failed queue:', error);
    }
  }

  // Conflict resolution
  private async fetchServerVersion(table: string, id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch {
      return null;
    }
  }

  // Cache management
  async cacheServerData(table: string, data: any[]): Promise<void> {
    const cacheKey = `@cache_${table}`;
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  }

  async getCachedData(table: string, maxAge: number = 3600000): Promise<any[] | null> {
    try {
      const cacheKey = `@cache_${table}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      if (age < maxAge) {
        return cacheData.data;
      }
    } catch (error) {
      console.error('Failed to get cached data:', error);
    }
    return null;
  }

  // Utilities
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event management
  addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifyListeners(): void {
    const status = this.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  getSyncStatus(): SyncStatus {
    const lastSyncTime = parseInt(storage.getString('last_sync_time') || '0', 10);
    const failedCount = this.getFailedCount();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingQueue.size,
      lastSyncTime,
      failedCount,
    };
  }

  private getFailedCount(): number {
    // This would query the failed queue
    return 0; // Simplified for now
  }

  // Cleanup
  destroy(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Conflict resolver helper class
class ConflictResolver {
  async resolve(localData: any, serverData: any): Promise<any> {
    // Simple last-write-wins strategy
    // In a real app, you might want more sophisticated conflict resolution
    
    if (serverData.updated_at > localData.updated_at) {
      // Server wins, but preserve local-only fields
      return {
        ...serverData,
        local_id: localData.local_id,
        sync_status: 'synced',
      };
    }
    
    // Local wins
    return localData;
  }
}

export default OfflineManager.getInstance();
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import FastImage from 'react-native-fast-image';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const storage = new MMKV();

interface CacheConfig {
  maxSize: number; // in MB
  maxAge: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
}

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cacheDir: string;
  private memoryCache: Map<string, CacheEntry>;
  private cacheStats: {
    hits: number;
    misses: number;
    evictions: number;
  };
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
    this.config = {
      maxSize: 100, // 100 MB
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      cleanupInterval: 60 * 60 * 1000, // 1 hour
    };
    
    this.cacheDir = Platform.OS === 'ios' 
      ? `${RNFS.CachesDirectoryPath}/wavesight`
      : `${RNFS.CachesDirectoryPath}/wavesight`;
    
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const dirExists = await RNFS.exists(this.cacheDir);
      if (!dirExists) {
        await RNFS.mkdir(this.cacheDir);
      }

      // Load cache metadata
      await this.loadCacheMetadata();

      // Start cleanup timer
      this.startCleanupTimer();

      console.log('Cache manager initialized');
    } catch (error) {
      console.error('Failed to initialize cache:', error);
    }
  }

  // Memory cache operations
  async get(key: string): Promise<any> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      // Check if entry is still valid
      if (this.isEntryValid(memEntry)) {
        this.cacheStats.hits++;
        memEntry.accessCount++;
        memEntry.lastAccessed = Date.now();
        return memEntry.data;
      } else {
        // Remove expired entry
        this.memoryCache.delete(key);
      }
    }

    // Check persistent cache
    try {
      const data = await this.getFromDisk(key);
      if (data) {
        this.cacheStats.hits++;
        // Add to memory cache for faster access
        this.memoryCache.set(key, {
          key,
          data,
          timestamp: Date.now(),
          size: JSON.stringify(data).length,
          accessCount: 1,
          lastAccessed: Date.now(),
        });
        return data;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
    }

    this.cacheStats.misses++;
    return null;
  }

  async set(key: string, data: any, options?: { maxAge?: number }): Promise<void> {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      size: JSON.stringify(data).length,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Add to memory cache
    this.memoryCache.set(key, entry);

    // Check memory pressure and evict if necessary
    await this.checkMemoryPressure();

    // Persist to disk asynchronously
    this.saveToDisk(key, data, options?.maxAge).catch(error => {
      console.error(`Failed to save cache entry ${key}:`, error);
    });
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.deleteFromDisk(key);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      const files = await RNFS.readDir(this.cacheDir);
      await Promise.all(files.map(file => RNFS.unlink(file.path)));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Image caching
  async preloadImages(urls: any[]): Promise<void> {
    const imagePromises = urls.map(url => {
      if (typeof url === 'string') {
        return FastImage.preload([{ uri: url }]);
      } else if (typeof url === 'number') {
        // Local image resource
        return Promise.resolve();
      }
      return Promise.resolve();
    });

    await Promise.all(imagePromises);
  }

  async cacheImage(url: string): Promise<string> {
    const filename = this.generateCacheKey(url);
    const filepath = `${this.cacheDir}/${filename}`;

    try {
      const exists = await RNFS.exists(filepath);
      if (exists) {
        return filepath;
      }

      // Download and cache the image
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: filepath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Update cache metadata
        await this.updateCacheMetadata(filename, downloadResult.bytesWritten);
        return filepath;
      }
    } catch (error) {
      console.error(`Failed to cache image ${url}:`, error);
    }

    return url; // Return original URL if caching fails
  }

  // Trend data caching
  async cacheTrendData(trendId: string, data: any): Promise<void> {
    const key = `trend_${trendId}`;
    await this.set(key, data, { maxAge: 24 * 60 * 60 * 1000 }); // 24 hours
  }

  async getCachedTrend(trendId: string): Promise<any> {
    const key = `trend_${trendId}`;
    return this.get(key);
  }

  // API response caching
  async cacheApiResponse(endpoint: string, params: any, response: any): Promise<void> {
    const key = this.generateApiCacheKey(endpoint, params);
    await this.set(key, response, { maxAge: 5 * 60 * 1000 }); // 5 minutes
  }

  async getCachedApiResponse(endpoint: string, params: any): Promise<any> {
    const key = this.generateApiCacheKey(endpoint, params);
    return this.get(key);
  }

  // Performance optimization
  async persistCache(): Promise<void> {
    try {
      // Save memory cache metadata to disk
      const metadata: Record<string, any> = {};
      this.memoryCache.forEach((entry, key) => {
        metadata[key] = {
          timestamp: entry.timestamp,
          size: entry.size,
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed,
        };
      });

      await AsyncStorage.setItem('@cache_metadata', JSON.stringify(metadata));
      await AsyncStorage.setItem('@cache_stats', JSON.stringify(this.cacheStats));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  // Private methods
  private isEntryValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.config.maxAge;
  }

  private async checkMemoryPressure(): Promise<void> {
    // Calculate total memory usage
    let totalSize = 0;
    this.memoryCache.forEach(entry => {
      totalSize += entry.size;
    });

    // If exceeding max size, evict least recently used entries
    if (totalSize > this.config.maxSize * 1024 * 1024) {
      const entries = Array.from(this.memoryCache.values());
      entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

      let evicted = 0;
      while (totalSize > this.config.maxSize * 1024 * 1024 * 0.8 && evicted < entries.length) {
        const entry = entries[evicted];
        this.memoryCache.delete(entry.key);
        totalSize -= entry.size;
        evicted++;
        this.cacheStats.evictions++;
      }
    }
  }

  private async saveToDisk(key: string, data: any, maxAge?: number): Promise<void> {
    const filename = this.generateCacheKey(key);
    const filepath = `${this.cacheDir}/${filename}`;
    
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        maxAge: maxAge || this.config.maxAge,
      };
      
      await RNFS.writeFile(filepath, JSON.stringify(cacheData), 'utf8');
    } catch (error) {
      console.error(`Failed to save to disk ${key}:`, error);
    }
  }

  private async getFromDisk(key: string): Promise<any> {
    const filename = this.generateCacheKey(key);
    const filepath = `${this.cacheDir}/${filename}`;
    
    try {
      const exists = await RNFS.exists(filepath);
      if (!exists) return null;

      const content = await RNFS.readFile(filepath, 'utf8');
      const cacheData = JSON.parse(content);
      
      // Check if data is still valid
      const age = Date.now() - cacheData.timestamp;
      if (age < cacheData.maxAge) {
        return cacheData.data;
      } else {
        // Delete expired file
        await RNFS.unlink(filepath);
        return null;
      }
    } catch (error) {
      console.error(`Failed to read from disk ${key}:`, error);
      return null;
    }
  }

  private async deleteFromDisk(key: string): Promise<void> {
    const filename = this.generateCacheKey(key);
    const filepath = `${this.cacheDir}/${filename}`;
    
    try {
      const exists = await RNFS.exists(filepath);
      if (exists) {
        await RNFS.unlink(filepath);
      }
    } catch (error) {
      console.error(`Failed to delete from disk ${key}:`, error);
    }
  }

  private generateCacheKey(key: string): string {
    // Create a safe filename from the key
    return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  }

  private generateApiCacheKey(endpoint: string, params: any): string {
    const paramString = JSON.stringify(params || {});
    return `api_${endpoint}_${this.hashString(paramString)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async loadCacheMetadata(): Promise<void> {
    try {
      const metadata = await AsyncStorage.getItem('@cache_metadata');
      const stats = await AsyncStorage.getItem('@cache_stats');
      
      if (metadata) {
        // We could restore some metadata here if needed
        console.log('Cache metadata loaded');
      }
      
      if (stats) {
        this.cacheStats = JSON.parse(stats);
      }
    } catch (error) {
      console.error('Failed to load cache metadata:', error);
    }
  }

  private async updateCacheMetadata(filename: string, size: number): Promise<void> {
    storage.set(`cache_${filename}_size`, size.toString());
    storage.set(`cache_${filename}_timestamp`, Date.now().toString());
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('Cache cleanup error:', error);
      });
    }, this.config.cleanupInterval);
  }

  private async performCleanup(): Promise<void> {
    try {
      const files = await RNFS.readDir(this.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        const stat = await RNFS.stat(file.path);
        const age = now - stat.mtime.getTime();
        
        if (age > this.config.maxAge) {
          await RNFS.unlink(file.path);
        }
      }
      
      // Also cleanup memory cache
      const entriesToDelete: string[] = [];
      this.memoryCache.forEach((entry, key) => {
        if (!this.isEntryValid(entry)) {
          entriesToDelete.push(key);
        }
      });
      
      entriesToDelete.forEach(key => this.memoryCache.delete(key));
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Public methods for cache statistics
  getCacheStats(): { hits: number; misses: number; evictions: number; hitRate: number } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? this.cacheStats.hits / total : 0;
    
    return {
      ...this.cacheStats,
      hitRate,
    };
  }

  async getCacheSize(): Promise<{ memorySize: number; diskSize: number }> {
    let memorySize = 0;
    this.memoryCache.forEach(entry => {
      memorySize += entry.size;
    });

    let diskSize = 0;
    try {
      const files = await RNFS.readDir(this.cacheDir);
      for (const file of files) {
        const stat = await RNFS.stat(file.path);
        diskSize += stat.size;
      }
    } catch (error) {
      console.error('Failed to calculate disk size:', error);
    }

    return {
      memorySize: memorySize / (1024 * 1024), // MB
      diskSize: diskSize / (1024 * 1024), // MB
    };
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.persistCache();
  }
}

export default CacheManager.getInstance();
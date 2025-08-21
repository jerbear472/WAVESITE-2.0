/**
 * Supabase cache management utilities
 * Helps prevent stale data issues during navigation
 */

const CACHE_VERSION = '1.0.0';
const CACHE_KEY_PREFIX = 'wavesight_cache_';

interface CacheEntry {
  data: any;
  timestamp: number;
  version: string;
}

class SupabaseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxAge: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    // Also clear localStorage cache if exists
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Clear cache for specific table
   */
  clearTable(tableName: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(tableName)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate cache on navigation
   */
  invalidateOnNavigation(): void {
    // Clear all volatile cache
    this.cache.clear();
    console.log('[Cache] Cleared on navigation');
  }

  /**
   * Get cached data if valid
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge || entry.version !== CACHE_VERSION) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache data
   */
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    });
  }
}

export const supabaseCache = new SupabaseCache();

// Auto-clear cache on navigation events
if (typeof window !== 'undefined') {
  window.addEventListener('navigation-change', () => {
    supabaseCache.invalidateOnNavigation();
  });

  // Clear cache on visibility change (tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Clear old cache when tab becomes visible
      supabaseCache.clear();
    }
  });
}
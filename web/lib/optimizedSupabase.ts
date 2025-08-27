import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton instance with optimized configuration
let supabaseInstance: SupabaseClient | null = null;

export function getOptimizedSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // Optimize auth settings
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storageKey: 'wavesight-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        
        // Session configuration
        flowType: 'pkce',
        
        // Debug mode in development
        debug: process.env.NODE_ENV === 'development',
      },
      
      // Connection pooling and retry settings
      db: {
        schema: 'public',
      },
      
      // Global request settings
      global: {
        headers: {
          'x-client-info': 'wavesight-web',
        },
        
        // Fetch configuration with timeout and retries
        fetch: (url: string | URL | Request, init?: RequestInit) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const fetchWithRetry = async (
            attemptNum: number = 0,
            maxAttempts: number = 3
          ): Promise<Response> => {
            try {
              const response = await fetch(url, {
                ...init,
                signal: controller.signal,
                // Keep alive connections
                keepalive: true,
              });
              
              clearTimeout(timeoutId);
              
              // Retry on 5xx errors
              if (response.status >= 500 && attemptNum < maxAttempts - 1) {
                const delay = Math.min(1000 * Math.pow(2, attemptNum), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(attemptNum + 1, maxAttempts);
              }
              
              return response;
            } catch (error: any) {
              clearTimeout(timeoutId);
              
              // Retry on network errors
              if (
                (error.name === 'TypeError' || error.name === 'AbortError') && 
                attemptNum < maxAttempts - 1
              ) {
                const delay = Math.min(1000 * Math.pow(2, attemptNum), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(attemptNum + 1, maxAttempts);
              }
              
              throw error;
            }
          };
          
          return fetchWithRetry();
        },
      },
      
      // Realtime settings (disabled for performance unless needed)
      realtime: {
        params: {
          eventsPerSecond: 2, // Rate limit realtime events
        },
      },
    });
    
    // Preload the auth session on client
    if (typeof window !== 'undefined') {
      supabaseInstance.auth.getSession().catch(console.error);
    }
  }
  
  return supabaseInstance;
}

// Export the optimized client
export const supabase = getOptimizedSupabase();

// Helper for batch operations
export async function batchSupabaseQueries<T extends readonly Promise<any>[]>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const results = await Promise.allSettled(queries);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Query ${index} failed:`, result.reason);
      return null;
    }
  }) as any;
}

// Helper for retrying failed queries
export async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors or client errors
      if (error.code && (error.code.startsWith('4') || error.code === 'PGRST301')) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

// Optimized auth helpers
export const authHelpers = {
  async signIn(email: string, password: string) {
    return retryQuery(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) throw error;
      return data;
    });
  },
  
  async signUp(email: string, password: string, metadata?: any) {
    return retryQuery(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      return data;
    });
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },
  
  async refreshSession() {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return session;
  },
};

// Connection health check
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    return !error || error.code === 'PGRST116'; // PGRST116 = no rows, which is fine
  } catch {
    return false;
  }
}
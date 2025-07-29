import { createClient } from '@/utils/supabase/client';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (!error.status) return true; // Network error
    if (error.status >= 500 && error.status < 600) return true;
    if (error.status === 429) return true; // Rate limited
    return false;
  }
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.retryDelay!;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === opts.maxRetries || !opts.shouldRetry!(error)) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= opts.backoffMultiplier!;
    }
  }

  throw lastError;
}

// Supabase-specific wrapper with better error handling
export async function supabaseQuery<T>(
  queryFn: (client: ReturnType<typeof createClient>) => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const supabase = createClient();
  
  const { data, error } = await queryFn(supabase);
  
  if (error) {
    // Enhance error with more context
    const enhancedError = new Error(error.message || 'Database query failed');
    (enhancedError as any).code = error.code;
    (enhancedError as any).status = error.status;
    (enhancedError as any).details = error.details;
    throw enhancedError;
  }
  
  if (!data) {
    throw new Error('No data returned from query');
  }
  
  return data;
}

// Wrapper for mutations (insert, update, delete)
export async function supabaseMutation<T>(
  mutationFn: (client: ReturnType<typeof createClient>) => Promise<{ data: T | null; error: any }>,
  options?: RetryOptions
): Promise<T> {
  return withRetry(
    () => supabaseQuery(mutationFn),
    options
  );
}

// Helper to handle common Supabase patterns
export const supabaseHelpers = {
  // Fetch with automatic error handling
  async fetch<T>(
    table: string,
    query?: {
      select?: string;
      filter?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<T[]> {
    return supabaseQuery(async (supabase) => {
      let q = supabase.from(table).select(query?.select || '*');
      
      if (query?.filter) {
        Object.entries(query.filter).forEach(([key, value]) => {
          q = q.eq(key, value);
        });
      }
      
      if (query?.order) {
        q = q.order(query.order.column, { ascending: query.order.ascending ?? false });
      }
      
      if (query?.limit) {
        q = q.limit(query.limit);
      }
      
      return q;
    });
  },

  // Insert with retry
  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options?: { returning?: boolean }
  ): Promise<T | T[] | null> {
    return supabaseMutation(async (supabase) => {
      const q = supabase.from(table).insert(data);
      return options?.returning ? q.select() : q;
    });
  },

  // Update with retry
  async update<T>(
    table: string,
    data: Partial<T>,
    filter: Record<string, any>
  ): Promise<T[]> {
    return supabaseMutation(async (supabase) => {
      let q = supabase.from(table).update(data);
      
      Object.entries(filter).forEach(([key, value]) => {
        q = q.eq(key, value);
      });
      
      return q.select();
    });
  },

  // Delete with retry
  async delete(
    table: string,
    filter: Record<string, any>
  ): Promise<void> {
    await supabaseMutation(async (supabase) => {
      let q = supabase.from(table).delete();
      
      Object.entries(filter).forEach(([key, value]) => {
        q = q.eq(key, value);
      });
      
      return q;
    });
  }
};

// Rate limiting helper
export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  
  constructor(
    private maxRequestsPerSecond: number,
    private maxBurst: number = maxRequestsPerSecond
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const batch = this.queue.splice(0, this.maxBurst);
    
    // Process batch
    await Promise.all(batch.map(fn => fn()));
    
    // Wait before processing next batch
    setTimeout(() => {
      this.processQueue();
    }, 1000 / this.maxRequestsPerSecond);
  }
}
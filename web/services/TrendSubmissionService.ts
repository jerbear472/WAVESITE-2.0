import { supabase } from '@/lib/supabase';
import { TrendDuplicateChecker } from '@/lib/trendDuplicateChecker';
import { MetadataExtractor } from '@/lib/metadataExtractor';
import { mapCategoryToEnum } from '@/lib/categoryMapper';

// Circuit breaker pattern for external services
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold = 3,
    private readonly timeout = 60000, // 1 minute
    private readonly name: string
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log(`Circuit breaker ${this.name}: Attempting recovery`);
      } else {
        throw new Error(`Service ${this.name} is temporarily unavailable`);
      }
    }

    try {
      const result = await operation();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        console.log(`Circuit breaker ${this.name}: Recovered`);
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        console.log(`Circuit breaker ${this.name}: OPEN after ${this.failures} failures`);
      }
      
      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}

// Resource pool for Supabase clients - simplified to use single instance
class SupabasePool {
  async getClient(): Promise<{ client: typeof supabase, release: () => void }> {
    return {
      client: supabase,
      release: () => {
        // No-op since we're using a single instance
      }
    };
  }
}

// Submission state manager
class SubmissionState {
  private submissions = new Map<string, {
    timestamp: number;
    status: 'pending' | 'completed' | 'failed';
    retries: number;
  }>();

  canSubmit(userId: string): boolean {
    const userSubmissions = Array.from(this.submissions.entries())
      .filter(([key]) => key.startsWith(userId))
      .map(([, value]) => value);

    // Check for recent pending submissions
    const recentPending = userSubmissions.filter(
      sub => sub.status === 'pending' && 
      Date.now() - sub.timestamp < 30000 // 30 seconds
    );

    return recentPending.length === 0;
  }

  startSubmission(userId: string, submissionId: string) {
    const key = `${userId}:${submissionId}`;
    this.submissions.set(key, {
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    });
  }

  completeSubmission(userId: string, submissionId: string) {
    const key = `${userId}:${submissionId}`;
    const submission = this.submissions.get(key);
    if (submission) {
      submission.status = 'completed';
    }
  }

  failSubmission(userId: string, submissionId: string) {
    const key = `${userId}:${submissionId}`;
    const submission = this.submissions.get(key);
    if (submission) {
      submission.status = 'failed';
      submission.retries++;
    }
  }

  cleanup() {
    // Remove old submissions
    const cutoff = Date.now() - 300000; // 5 minutes
    for (const [key, value] of this.submissions.entries()) {
      if (value.timestamp < cutoff) {
        this.submissions.delete(key);
      }
    }
  }
}

// Main submission service
export class TrendSubmissionService {
  private static instance: TrendSubmissionService;
  private readonly metadataBreaker = new CircuitBreaker(3, 60000, 'metadata');
  private readonly storageBreaker = new CircuitBreaker(3, 60000, 'storage');
  private readonly duplicateBreaker = new CircuitBreaker(5, 30000, 'duplicate-check');
  private readonly supabasePool = new SupabasePool();
  private readonly submissionState = new SubmissionState();
  private bucketChecked = false;

  private constructor() {
    // Cleanup old submissions periodically
    setInterval(() => this.submissionState.cleanup(), 60000);
  }

  static getInstance(): TrendSubmissionService {
    if (!this.instance) {
      this.instance = new TrendSubmissionService();
    }
    return this.instance;
  }

  async submitTrend(trendData: any, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 Starting submission ${submissionId}`);

    // Check if user can submit
    if (!this.submissionState.canSubmit(userId)) {
      return { 
        success: false, 
        error: 'Please wait for your previous submission to complete' 
      };
    }

    this.submissionState.startSubmission(userId, submissionId);

    try {
      // Step 1: Parallel duplicate check and metadata extraction
      const [duplicateResult, metadataResult] = await Promise.allSettled([
        this.checkDuplicate(trendData.url, userId),
        this.extractMetadata(trendData.url)
      ]);

      // Handle duplicate check result
      if (duplicateResult.status === 'fulfilled' && duplicateResult.value.isDuplicate) {
        this.submissionState.failSubmission(userId, submissionId);
        return { 
          success: false, 
          error: duplicateResult.value.message || 'This trend has already been submitted' 
        };
      }

      // Handle metadata (optional - don't fail if metadata extraction fails)
      let metadata = {};
      if (metadataResult.status === 'fulfilled') {
        metadata = metadataResult.value;
        console.log('✅ Metadata extracted successfully');
      } else {
        console.log('⚠️ Metadata extraction failed, continuing without it');
      }

      // Step 2: Handle image upload if present
      let imageUrl = null;
      if (trendData.screenshot && trendData.screenshot instanceof File) {
        const uploadResult = await this.uploadImage(trendData.screenshot);
        if (uploadResult.success) {
          imageUrl = uploadResult.url;
        } else {
          console.log('⚠️ Image upload failed, continuing without it');
        }
      }

      // Step 3: Prepare and submit to database
      const insertData = this.prepareInsertData(trendData, userId, metadata, imageUrl);
      
      const { client, release } = await this.supabasePool.getClient();
      try {
        const { data, error } = await client
          .from('trend_submissions')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        this.submissionState.completeSubmission(userId, submissionId);
        console.log(`✅ Submission ${submissionId} completed successfully`);
        return { success: true, data };

      } finally {
        release();
      }

    } catch (error: any) {
      this.submissionState.failSubmission(userId, submissionId);
      console.error(`❌ Submission ${submissionId} failed:`, error);
      
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  private async checkDuplicate(url: string, userId: string): Promise<{ isDuplicate: boolean; message?: string }> {
    return this.duplicateBreaker.execute(async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Duplicate check timeout')), 5000)
      );

      const result = await Promise.race([
        TrendDuplicateChecker.checkDuplicateUrl(url, userId),
        timeout
      ]) as any;

      return result;
    });
  }

  private async extractMetadata(url: string): Promise<any> {
    return this.metadataBreaker.execute(async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Metadata extraction timeout')), 8000)
      );

      const metadata = await Promise.race([
        MetadataExtractor.extractFromUrl(url),
        timeout
      ]);

      return metadata;
    });
  }

  private async uploadImage(file: File): Promise<{ success: boolean; url?: string }> {
    return this.storageBreaker.execute(async () => {
      const { client, release } = await this.supabasePool.getClient();
      
      try {
        // Check/create bucket only once per session
        if (!this.bucketChecked) {
          try {
            await client.storage.createBucket('trend-images', {
              public: true,
              allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
            });
          } catch (e) {
            // Bucket exists or other error - continue
          }
          this.bucketChecked = true;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data, error } = await client.storage
          .from('trend-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = client.storage
          .from('trend-images')
          .getPublicUrl(fileName);

        return { success: true, url: publicUrl };

      } finally {
        release();
      }
    }).catch(error => {
      console.error('Image upload failed:', error);
      return { success: false };
    });
  }

  private prepareInsertData(trendData: any, userId: string, metadata: any, imageUrl: string | null): any {
    // Handle both old format (single category) and new format (categories array)
    const category = trendData.categories?.[0] 
      ? mapCategoryToEnum(trendData.categories[0]) 
      : mapCategoryToEnum(trendData.category || 'meme_format');
    
    const insertData: any = {
      spotter_id: userId,
      category: category,
      description: trendData.explanation || trendData.description || trendData.trendName || 'Untitled Trend',
      platform: trendData.platform || metadata.platform || 'other',
      screenshot_url: imageUrl || trendData.screenshot_url || metadata.thumbnail_url || null,
      thumbnail_url: metadata.thumbnail_url || trendData.thumbnail_url || imageUrl || null,
      evidence: {
        url: trendData.url || '',
        title: trendData.trendName || trendData.title || metadata.title || 'Untitled Trend',
        platform: trendData.platform || 'other',
        // Store all the rich data from enhanced form
        ageRanges: trendData.ageRanges,
        subcultures: trendData.subcultures,
        region: trendData.region,
        categories: trendData.categories,
        moods: trendData.moods,
        spreadSpeed: trendData.spreadSpeed,
        audioOrCatchphrase: trendData.audioOrCatchphrase,
        motivation: trendData.motivation,
        firstSeen: trendData.firstSeen,
        otherPlatforms: trendData.otherPlatforms,
        brandAdoption: trendData.brandAdoption,
        notes: trendData.notes || null,
        hashtags: metadata.hashtags || trendData.hashtags || [],
        metadata_captured: true
      },
      // Calculate virality prediction based on spread speed
      virality_prediction: trendData.spreadSpeed === 'viral' ? 8 : 
                          trendData.spreadSpeed === 'picking_up' ? 6 : 5,
      status: 'submitted',
      quality_score: 0.5,
      validation_count: 0,
      created_at: new Date().toISOString(),
      // Social media metadata
      creator_handle: metadata.creator_handle || trendData.creator_handle || null,
      creator_name: metadata.creator_name || trendData.creator_name || null,
      post_caption: metadata.post_caption || trendData.post_caption || null,
      likes_count: metadata.likes_count || trendData.likes_count || 0,
      comments_count: metadata.comments_count || trendData.comments_count || 0,
      shares_count: metadata.shares_count || trendData.shares_count || 0,
      views_count: metadata.views_count || trendData.views_count || 0,
      posted_at: metadata.posted_at || trendData.posted_at || new Date().toISOString(),
      post_url: trendData.url
    };

    // Add hashtags if available
    if (trendData.hashtags && trendData.hashtags.length > 0) {
      insertData.hashtags = trendData.hashtags;
    }

    return insertData;
  }

  private getErrorMessage(error: any): string {
    if (error.message?.includes('user_id')) {
      return 'Authentication error. Please log in again.';
    } else if (error.message?.includes('category')) {
      return 'Please select a valid category.';
    } else if (error.message?.includes('url')) {
      return 'Please provide a valid URL.';
    } else if (error.message?.includes('duplicate')) {
      return 'This trend has already been submitted.';
    } else if (error.message?.includes('timeout')) {
      return 'The submission is taking too long. Please try again.';
    } else if (error.message?.includes('temporarily unavailable')) {
      return error.message;
    }
    
    return error.message || 'Failed to submit trend. Please try again.';
  }

  // Reset circuit breakers if needed
  resetCircuits() {
    this.metadataBreaker.reset();
    this.storageBreaker.reset();
    this.duplicateBreaker.reset();
    console.log('🔧 Circuit breakers reset');
  }
}
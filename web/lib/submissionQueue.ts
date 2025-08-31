/**
 * Submission Queue System
 * Handles instant submission with background processing and retry logic
 */

import { supabase } from './supabase';

export interface QueuedSubmission {
  id: string;
  userId: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}

class SubmissionQueue {
  private queue: Map<string, QueuedSubmission> = new Map();
  private processing = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 3000, 5000]; // Exponential backoff
  
  constructor() {
    // Load any pending submissions from localStorage
    this.loadFromStorage();
    // Start processing immediately
    this.startProcessing();
  }

  /**
   * Add a submission to the queue and return immediately
   */
  async addSubmission(userId: string, data: any): Promise<{ id: string; status: 'queued' }> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const submission: QueuedSubmission = {
      id,
      userId,
      data,
      status: 'pending',
      attempts: 0,
      createdAt: new Date()
    };
    
    this.queue.set(id, submission);
    this.saveToStorage();
    
    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }
    
    return { id, status: 'queued' };
  }

  /**
   * Get submission status
   */
  getStatus(id: string): QueuedSubmission | undefined {
    return this.queue.get(id);
  }

  /**
   * Process the queue
   */
  private async startProcessing() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.size > 0) {
      const pending = Array.from(this.queue.values())
        .filter(s => s.status === 'pending' || (s.status === 'failed' && s.attempts < this.MAX_RETRIES));
      
      if (pending.length === 0) {
        break;
      }
      
      for (const submission of pending) {
        await this.processSubmission(submission);
      }
      
      // Small delay between processing cycles
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.processing = false;
  }

  /**
   * Process a single submission
   */
  private async processSubmission(submission: QueuedSubmission) {
    try {
      submission.status = 'processing';
      submission.lastAttempt = new Date();
      submission.attempts++;
      this.saveToStorage();
      
      // Simple submission - single database call
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: submission.userId,
          title: submission.data.title || 'Untitled Trend',
          description: submission.data.description || submission.data.title || 'No description',
          category: submission.data.category || 'lifestyle',
          platform: submission.data.platform || 'unknown',
          post_url: submission.data.url,
          status: 'submitted',
          quality_score: 75,
          wave_score: submission.data.wave_score || 50,
          payment_amount: 10 // Base XP, calculate multipliers later
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Mark as completed
      submission.status = 'completed';
      this.queue.delete(submission.id);
      this.saveToStorage();
      
      // Fire completion event
      window.dispatchEvent(new CustomEvent('submissionComplete', { 
        detail: { id: submission.id, data } 
      }));
      
    } catch (error: any) {
      console.error('Submission error:', error);
      submission.status = 'failed';
      submission.error = error.message;
      
      // Retry logic
      if (submission.attempts < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[submission.attempts - 1] || 5000;
        
        setTimeout(() => {
          submission.status = 'pending';
          this.saveToStorage();
          if (!this.processing) {
            this.startProcessing();
          }
        }, delay);
      } else {
        // Final failure - keep in storage for manual retry
        this.saveToStorage();
        
        // Fire failure event
        window.dispatchEvent(new CustomEvent('submissionFailed', { 
          detail: { id: submission.id, error: submission.error } 
        }));
      }
    }
  }

  /**
   * Save queue to localStorage for persistence
   */
  private saveToStorage() {
    try {
      const data = Array.from(this.queue.entries());
      localStorage.setItem('submissionQueue', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save queue to storage:', e);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('submissionQueue');
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach(([id, submission]: [string, any]) => {
          // Restore Date objects
          submission.createdAt = new Date(submission.createdAt);
          if (submission.lastAttempt) {
            submission.lastAttempt = new Date(submission.lastAttempt);
          }
          // Reset processing status to pending
          if (submission.status === 'processing') {
            submission.status = 'pending';
          }
          this.queue.set(id, submission);
        });
      }
    } catch (e) {
      console.warn('Failed to load queue from storage:', e);
    }
  }

  /**
   * Retry a failed submission
   */
  retrySubmission(id: string) {
    const submission = this.queue.get(id);
    if (submission && submission.status === 'failed') {
      submission.status = 'pending';
      submission.attempts = 0;
      this.saveToStorage();
      
      if (!this.processing) {
        this.startProcessing();
      }
    }
  }

  /**
   * Clear completed submissions
   */
  clearCompleted() {
    Array.from(this.queue.entries()).forEach(([id, submission]) => {
      if (submission.status === 'completed') {
        this.queue.delete(id);
      }
    });
    this.saveToStorage();
  }

  /**
   * Get all submissions
   */
  getAllSubmissions(): QueuedSubmission[] {
    return Array.from(this.queue.values());
  }
}

// Create singleton instance
export const submissionQueue = new SubmissionQueue();
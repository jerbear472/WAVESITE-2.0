import { backgroundJobs } from './backgroundJobs';

/**
 * Cron Job Scheduler for AI Background Tasks
 * Deploy this as a separate service or use a service like Vercel Cron Jobs
 */

export class CronScheduler {
  private static instance: CronScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): CronScheduler {
    if (!CronScheduler.instance) {
      CronScheduler.instance = new CronScheduler();
    }
    return CronScheduler.instance;
  }

  /**
   * Start all scheduled jobs
   */
  startAll(): void {
    console.log('Starting AI background job scheduler...');

    // Cluster trends - every 5 minutes
    this.scheduleJob('cluster_trends', 5 * 60 * 1000, async () => {
      console.log('[CRON] Running cluster_trends job...');
      try {
        await backgroundJobs.clusterTrends();
        console.log('[CRON] cluster_trends completed');
      } catch (error) {
        console.error('[CRON] cluster_trends failed:', error);
      }
    });

    // Score trends - every hour
    this.scheduleJob('score_trends', 60 * 60 * 1000, async () => {
      console.log('[CRON] Running score_trends job...');
      try {
        await backgroundJobs.scoreTrends();
        console.log('[CRON] score_trends completed');
      } catch (error) {
        console.error('[CRON] score_trends failed:', error);
      }
    });

    // Predict trends - every 24 hours at 2 AM
    this.scheduleDailyJob('predict_trends', 2, async () => {
      console.log('[CRON] Running predict_trends job...');
      try {
        await backgroundJobs.predictTrends();
        console.log('[CRON] predict_trends completed');
      } catch (error) {
        console.error('[CRON] predict_trends failed:', error);
      }
    });

    console.log('AI background job scheduler started successfully');
  }

  /**
   * Schedule a recurring job
   */
  private scheduleJob(name: string, intervalMs: number, handler: () => Promise<void>): void {
    // Run immediately on start
    handler().catch(console.error);

    // Then schedule recurring
    const interval = setInterval(handler, intervalMs);
    this.intervals.set(name, interval);
  }

  /**
   * Schedule a daily job at specific hour
   */
  private scheduleDailyJob(name: string, hour: number, handler: () => Promise<void>): void {
    const runDaily = () => {
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, 0, 0, 0);

      // If scheduled time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const msUntilRun = scheduledTime.getTime() - now.getTime();

      setTimeout(async () => {
        await handler();
        runDaily(); // Schedule next run
      }, msUntilRun);
    };

    runDaily();
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    console.log('Stopping AI background job scheduler...');
    
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`[CRON] Stopped job: ${name}`);
    }
    
    this.intervals.clear();
    console.log('AI background job scheduler stopped');
  }

  /**
   * Get status of all jobs
   */
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const name of this.intervals.keys()) {
      status[name] = true;
    }
    
    return status;
  }
}

// Export singleton instance
export const cronScheduler = CronScheduler.getInstance();

// For Vercel Cron Jobs (if using Vercel)
export async function runClusterTrends() {
  await backgroundJobs.clusterTrends();
}

export async function runScoreTrends() {
  await backgroundJobs.scoreTrends();
}

export async function runPredictTrends() {
  await backgroundJobs.predictTrends();
}
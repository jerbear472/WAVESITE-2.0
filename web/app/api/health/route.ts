import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { createClient } from '@supabase/supabase-js';
import { errorMonitor } from '@/lib/errorMonitoring';

export async function GET(request: NextRequest) {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.app.environment,
    version: config.app.version,
    checks: {
      database: false,
      api: true,
      configuration: false,
    },
    errors: [] as string[],
  };

  try {
    // Check database connection
    const supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );

    const { error: dbError } = await supabase
      .from('trends')
      .select('id')
      .limit(1);

    if (!dbError) {
      checks.checks.database = true;
    } else {
      checks.errors.push(`Database check failed: ${dbError.message}`);
    }

    // Check configuration
    if (config.supabase.url && config.supabase.anonKey) {
      checks.checks.configuration = true;
    } else {
      checks.errors.push('Missing critical configuration');
    }

    // Get error statistics
    const errorStats = errorMonitor.getErrorStats();
    
    // Determine overall health status
    if (checks.errors.length > 0 || errorStats.errorRate > 1) {
      checks.status = 'degraded';
    }
    
    if (!checks.checks.database || errorStats.errorRate > 5) {
      checks.status = 'unhealthy';
    }

    return NextResponse.json({
      ...checks,
      errorStats: {
        ...errorStats,
        recentErrors: config.app.environment === 'development' 
          ? errorMonitor.getRecentErrors(5)
          : undefined
      }
    }, {
      status: checks.status === 'unhealthy' ? 503 : 200
    });

  } catch (error) {
    errorMonitor.logError(error as Error, { context: 'health-check' });
    
    return NextResponse.json({
      ...checks,
      status: 'unhealthy',
      errors: [...checks.errors, 'Health check failed']
    }, { status: 503 });
  }
}
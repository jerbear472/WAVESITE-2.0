// Comprehensive monitoring script for the submission system
// Run this in the browser console to monitor submission health

(function() {
  console.log('🔍 Submission System Health Monitor v2.0');
  console.log('=====================================');
  
  // Create monitoring dashboard
  const monitor = {
    submissions: [],
    errors: [],
    performance: {
      averageTime: 0,
      slowestTime: 0,
      fastestTime: Infinity,
      successRate: 0
    },
    circuitBreakers: {
      metadata: 'UNKNOWN',
      storage: 'UNKNOWN',
      duplicate: 'UNKNOWN'
    }
  };

  // Override console methods to capture logs
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = function(...args) {
    originalLog.apply(console, args);
    
    const message = args.join(' ');
    if (message.includes('submission')) {
      monitor.submissions.push({
        time: new Date().toISOString(),
        message: message,
        type: 'log'
      });
    }
    
    // Check for circuit breaker status
    if (message.includes('Circuit breaker')) {
      if (message.includes('metadata')) {
        monitor.circuitBreakers.metadata = message.includes('OPEN') ? 'OPEN' : 
          message.includes('Recovered') ? 'CLOSED' : 'HALF_OPEN';
      } else if (message.includes('storage')) {
        monitor.circuitBreakers.storage = message.includes('OPEN') ? 'OPEN' : 
          message.includes('Recovered') ? 'CLOSED' : 'HALF_OPEN';
      } else if (message.includes('duplicate')) {
        monitor.circuitBreakers.duplicate = message.includes('OPEN') ? 'OPEN' : 
          message.includes('Recovered') ? 'CLOSED' : 'HALF_OPEN';
      }
    }
  };
  
  console.error = function(...args) {
    originalError.apply(console, args);
    
    const message = args.join(' ');
    monitor.errors.push({
      time: new Date().toISOString(),
      message: message,
      type: 'error'
    });
  };

  // Monitor network requests
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];
    const startTime = Date.now();
    
    try {
      const response = await originalFetch.apply(this, args);
      const duration = Date.now() - startTime;
      
      // Log slow requests
      if (duration > 3000) {
        console.warn(`⚠️ Slow request detected: ${url} took ${duration}ms`);
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Request failed: ${url} after ${duration}ms`, error);
      throw error;
    }
  };

  // Display dashboard
  window.showSubmissionHealth = function() {
    console.clear();
    console.log('📊 Submission System Health Report');
    console.log('==================================');
    
    // Circuit Breaker Status
    console.log('\n🔌 Circuit Breakers:');
    Object.entries(monitor.circuitBreakers).forEach(([name, status]) => {
      const icon = status === 'CLOSED' ? '✅' : status === 'OPEN' ? '❌' : '⚠️';
      console.log(`  ${icon} ${name}: ${status}`);
    });
    
    // Recent Submissions
    console.log('\n📝 Recent Submissions:');
    const recentSubmissions = monitor.submissions.slice(-5);
    recentSubmissions.forEach(sub => {
      console.log(`  [${sub.time}] ${sub.message}`);
    });
    
    // Recent Errors
    console.log('\n❌ Recent Errors:');
    const recentErrors = monitor.errors.slice(-5);
    if (recentErrors.length === 0) {
      console.log('  ✅ No recent errors');
    } else {
      recentErrors.forEach(err => {
        console.log(`  [${err.time}] ${err.message}`);
      });
    }
    
    // Performance Metrics
    console.log('\n⚡ Performance:');
    console.log(`  Success Rate: ${monitor.performance.successRate}%`);
    console.log(`  Average Time: ${monitor.performance.averageTime}ms`);
    console.log(`  Fastest: ${monitor.performance.fastestTime}ms`);
    console.log(`  Slowest: ${monitor.performance.slowestTime}ms`);
    
    console.log('\n💡 Use showSubmissionHealth() to refresh this report');
  };

  // Test submission service health
  window.testSubmissionService = async function() {
    console.log('\n🧪 Testing Submission Service...');
    
    try {
      // Import the service
      const { TrendSubmissionService } = await import('/services/TrendSubmissionService.js');
      const service = TrendSubmissionService.getInstance();
      
      console.log('✅ Service loaded successfully');
      
      // Check if we can create a test submission
      const { createClient } = await import('/utils/supabase/client.js');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ Not authenticated');
        return;
      }
      
      console.log('✅ Authenticated as:', user.email);
      
      // Test with minimal data
      const testData = {
        url: 'https://example.com/test-' + Date.now(),
        trendName: 'Health Check Test',
        categories: ['meme_format'],
        explanation: 'This is a health check test submission',
        platform: 'other'
      };
      
      console.log('📤 Attempting test submission...');
      const startTime = Date.now();
      
      const result = await service.submitTrend(testData, user.id);
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ Test submission successful in ${duration}ms`);
        console.log('📋 Result:', result.data);
        
        // Update performance metrics
        monitor.performance.successRate = 100;
        monitor.performance.averageTime = duration;
        monitor.performance.fastestTime = Math.min(monitor.performance.fastestTime, duration);
        monitor.performance.slowestTime = Math.max(monitor.performance.slowestTime, duration);
        
        // Clean up test submission
        if (result.data?.id) {
          await supabase
            .from('trend_submissions')
            .delete()
            .eq('id', result.data.id);
          console.log('🧹 Test submission cleaned up');
        }
      } else {
        console.error('❌ Test submission failed:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Service test failed:', error);
    }
  };

  // Reset circuit breakers
  window.resetCircuitBreakers = async function() {
    try {
      const { TrendSubmissionService } = await import('/services/TrendSubmissionService.js');
      const service = TrendSubmissionService.getInstance();
      service.resetCircuits();
      console.log('✅ Circuit breakers reset');
    } catch (error) {
      console.error('❌ Failed to reset circuit breakers:', error);
    }
  };

  // Auto-refresh dashboard every 5 seconds
  let dashboardInterval = null;
  window.startMonitoring = function() {
    if (dashboardInterval) {
      clearInterval(dashboardInterval);
    }
    dashboardInterval = setInterval(() => {
      showSubmissionHealth();
    }, 5000);
    console.log('📊 Monitoring started (updates every 5 seconds)');
    console.log('Use stopMonitoring() to stop');
  };

  window.stopMonitoring = function() {
    if (dashboardInterval) {
      clearInterval(dashboardInterval);
      dashboardInterval = null;
      console.log('📊 Monitoring stopped');
    }
  };

  console.log('\n📋 Available Commands:');
  console.log('  showSubmissionHealth() - Show current health status');
  console.log('  testSubmissionService() - Run a test submission');
  console.log('  resetCircuitBreakers() - Reset all circuit breakers');
  console.log('  startMonitoring() - Start auto-refresh dashboard');
  console.log('  stopMonitoring() - Stop auto-refresh');
  
  // Show initial health report
  showSubmissionHealth();
})();
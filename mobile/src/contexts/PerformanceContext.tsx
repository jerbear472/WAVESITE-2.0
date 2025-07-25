import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import performanceNow from 'react-native-performance';
import { MMKV } from 'react-native-mmkv';
import { AppState, AppStateStatus } from 'react-native';

const storage = new MMKV();

interface PerformanceMetrics {
  screenLoadTime: Record<string, number>;
  apiCallDuration: Record<string, number[]>;
  jsFrameRate: number[];
  memoryUsage: number[];
  bundleLoadTime: number;
  navigationTime: Record<string, number>;
}

interface PerformanceTrace {
  name: string;
  startTime: number;
  endTime?: number;
  metadata?: Record<string, any>;
}

interface PerformanceContextType {
  startTrace: (name: string, metadata?: Record<string, any>) => void;
  endTrace: (name: string) => void;
  measureAsync: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  logMetric: (category: string, name: string, value: number) => void;
  getMetrics: () => PerformanceMetrics;
  clearMetrics: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

interface PerformanceProviderProps {
  children: ReactNode;
  enableMonitoring?: boolean;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({ 
  children, 
  enableMonitoring = __DEV__ 
}) => {
  const traces = useRef<Map<string, PerformanceTrace>>(new Map());
  const metrics = useRef<PerformanceMetrics>({
    screenLoadTime: {},
    apiCallDuration: {},
    jsFrameRate: [],
    memoryUsage: [],
    bundleLoadTime: 0,
    navigationTime: {},
  });
  const frameRateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enableMonitoring) return;

    // Record bundle load time
    const bundleLoadTime = performanceNow.now();
    metrics.current.bundleLoadTime = bundleLoadTime;

    // Start monitoring JS frame rate
    startFrameRateMonitoring();

    // Monitor app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Load previous metrics
    loadStoredMetrics();

    return () => {
      if (frameRateInterval.current) {
        clearInterval(frameRateInterval.current);
      }
      subscription.remove();
      saveMetrics();
    };
  }, [enableMonitoring]);

  const startFrameRateMonitoring = () => {
    if (!enableMonitoring) return;

    let lastTime = performanceNow.now();
    let frameCount = 0;

    frameRateInterval.current = setInterval(() => {
      const currentTime = performanceNow.now();
      const delta = currentTime - lastTime;
      const fps = Math.round((frameCount * 1000) / delta);
      
      metrics.current.jsFrameRate.push(fps);
      
      // Keep only last 100 measurements
      if (metrics.current.jsFrameRate.length > 100) {
        metrics.current.jsFrameRate.shift();
      }

      frameCount = 0;
      lastTime = currentTime;
    }, 1000);

    // Count frames
    const countFrame = () => {
      frameCount++;
      requestAnimationFrame(countFrame);
    };
    requestAnimationFrame(countFrame);
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background') {
      saveMetrics();
    }
  };

  const startTrace = (name: string, metadata?: Record<string, any>) => {
    if (!enableMonitoring) return;

    traces.current.set(name, {
      name,
      startTime: performanceNow.now(),
      metadata,
    });
  };

  const endTrace = (name: string) => {
    if (!enableMonitoring) return;

    const trace = traces.current.get(name);
    if (!trace) {
      console.warn(`No trace found for: ${name}`);
      return;
    }

    trace.endTime = performanceNow.now();
    const duration = trace.endTime - trace.startTime;

    // Log the trace
    logTraceMetric(trace, duration);

    // Remove the trace
    traces.current.delete(name);
  };

  const measureAsync = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    if (!enableMonitoring) return fn();

    startTrace(name);
    try {
      const result = await fn();
      endTrace(name);
      return result;
    } catch (error) {
      endTrace(name);
      throw error;
    }
  };

  const logMetric = (category: string, name: string, value: number) => {
    if (!enableMonitoring) return;

    const key = `${category}:${name}`;
    
    switch (category) {
      case 'screen':
        metrics.current.screenLoadTime[name] = value;
        break;
      case 'api':
        if (!metrics.current.apiCallDuration[name]) {
          metrics.current.apiCallDuration[name] = [];
        }
        metrics.current.apiCallDuration[name].push(value);
        // Keep only last 50 measurements
        if (metrics.current.apiCallDuration[name].length > 50) {
          metrics.current.apiCallDuration[name].shift();
        }
        break;
      case 'navigation':
        metrics.current.navigationTime[name] = value;
        break;
      case 'memory':
        metrics.current.memoryUsage.push(value);
        if (metrics.current.memoryUsage.length > 100) {
          metrics.current.memoryUsage.shift();
        }
        break;
    }

    // Log to console in dev mode
    if (__DEV__) {
      console.log(`[Performance] ${key}: ${value.toFixed(2)}ms`);
    }
  };

  const logTraceMetric = (trace: PerformanceTrace, duration: number) => {
    const { name, metadata } = trace;

    // Categorize the trace
    if (name.startsWith('screen_')) {
      logMetric('screen', name.replace('screen_', ''), duration);
    } else if (name.startsWith('api_')) {
      logMetric('api', name.replace('api_', ''), duration);
    } else if (name.startsWith('nav_')) {
      logMetric('navigation', name.replace('nav_', ''), duration);
    }

    // Log warning for slow operations
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  };

  const getMetrics = (): PerformanceMetrics => {
    return {
      ...metrics.current,
      // Calculate averages
      apiCallDuration: Object.entries(metrics.current.apiCallDuration).reduce((acc, [key, values]) => {
        acc[key] = values.length > 0 ? values : [0];
        return acc;
      }, {} as Record<string, number[]>),
    };
  };

  const clearMetrics = () => {
    metrics.current = {
      screenLoadTime: {},
      apiCallDuration: {},
      jsFrameRate: [],
      memoryUsage: [],
      bundleLoadTime: metrics.current.bundleLoadTime,
      navigationTime: {},
    };
    storage.delete('performance_metrics');
  };

  const saveMetrics = () => {
    if (!enableMonitoring) return;

    try {
      storage.set('performance_metrics', JSON.stringify(metrics.current));
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  };

  const loadStoredMetrics = () => {
    if (!enableMonitoring) return;

    try {
      const stored = storage.getString('performance_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with current metrics
        metrics.current = {
          ...metrics.current,
          ...parsed,
          bundleLoadTime: metrics.current.bundleLoadTime, // Keep current bundle load time
        };
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  };

  const value: PerformanceContextType = {
    startTrace,
    endTrace,
    measureAsync,
    logMetric,
    getMetrics,
    clearMetrics,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (!context) {
    // Return no-op functions if provider is not available
    return {
      startTrace: () => {},
      endTrace: () => {},
      measureAsync: async (name, fn) => fn(),
      logMetric: () => {},
      getMetrics: () => ({
        screenLoadTime: {},
        apiCallDuration: {},
        jsFrameRate: [],
        memoryUsage: [],
        bundleLoadTime: 0,
        navigationTime: {},
      }),
      clearMetrics: () => {},
    };
  }
  return context;
};

// Performance HOC for screens
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  screenName: string
) => {
  return (props: P) => {
    const performance = usePerformance();

    useEffect(() => {
      performance.startTrace(`screen_${screenName}`);
      
      return () => {
        performance.endTrace(`screen_${screenName}`);
      };
    }, []);

    return <Component {...props} />;
  };
};
import React, { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { ScrollSessionEnhanced } from './ScrollSessionEnhanced';

export interface ScrollSessionRef {
  incrementTrendCount: () => void;
}

export const ScrollSessionEnhancedForwardRef = forwardRef<ScrollSessionRef, {
  onSessionStateChange?: (active: boolean) => void;
}>((props, ref) => {
  const [trendCount, setTrendCount] = useState(0);

  useImperativeHandle(ref, () => ({
    incrementTrendCount: () => {
      setTrendCount(prev => prev + 1);
    }
  }));

  const handleTrendCountChange = useCallback((count: number) => {
    setTrendCount(count);
  }, []);

  return (
    <ScrollSessionEnhanced 
      {...props}
      onTrendCountChange={handleTrendCountChange}
    />
  );
});

ScrollSessionEnhancedForwardRef.displayName = 'ScrollSessionEnhancedForwardRef';
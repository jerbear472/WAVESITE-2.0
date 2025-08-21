'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook that triggers a callback when navigation occurs
 * Helps ensure fresh data loads on route changes
 */
export function useNavigationRefresh(callback: () => void, deps: any[] = []) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Skip the first mount
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Call callback on first mount too
      callback();
      return;
    }

    // If pathname changed, trigger callback
    if (previousPathname.current !== pathname) {
      console.log('[Navigation] Route changed from', previousPathname.current, 'to', pathname);
      previousPathname.current = pathname;
      callback();
    }
  }, [pathname, ...deps]);

  // Also provide a manual refresh function
  return { refresh: callback };
}

/**
 * Hook that provides navigation with automatic cache invalidation
 */
export function useEnhancedNavigation() {
  const pathname = usePathname();
  
  // Clear stale data from memory when navigating
  useEffect(() => {
    // Clear any cached query results
    if (typeof window !== 'undefined') {
      // Force garbage collection of old data
      const event = new Event('navigation-change');
      window.dispatchEvent(event);
    }
  }, [pathname]);
}
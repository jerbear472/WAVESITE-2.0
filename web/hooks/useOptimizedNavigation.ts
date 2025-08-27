import { useRouter, usePathname } from 'next/navigation';
import { useTransition, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useOptimizedNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Prefetch common routes on mount
  useEffect(() => {
    const routes = [
      '/dashboard',
      '/spot',
      '/predictions', 
      '/timeline',
      '/validate',
      '/leaderboard',
      '/profile'
    ];
    
    routes.forEach(route => {
      if (route !== pathname) {
        router.prefetch(route);
      }
    });
  }, [pathname, router]);

  const navigate = useCallback((href: string, options?: { 
    shallow?: boolean;
    scroll?: boolean;
    replace?: boolean;
  }) => {
    const { shallow = false, scroll = true, replace = false } = options || {};
    
    // Don't navigate if we're already on the page
    if (pathname === href && !shallow) return;

    // Use transition for smoother navigation
    startTransition(() => {
      if (replace) {
        router.replace(href, { scroll });
      } else {
        router.push(href, { scroll });
      }
    });
  }, [pathname, router]);

  const prefetch = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const back = useCallback(() => {
    router.back();
  }, [router]);

  const forward = useCallback(() => {
    router.forward();
  }, [router]);

  return {
    navigate,
    prefetch,
    refresh,
    back,
    forward,
    isPending,
    pathname
  };
}
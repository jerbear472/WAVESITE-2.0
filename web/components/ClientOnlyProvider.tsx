'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientOnlyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Intercept all clicks on links to use client-side navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href) return;
      
      // Only intercept internal links
      if (href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        router.push(href);
      }
    };

    // Add event listener
    document.addEventListener('click', handleClick);
    
    // Prefetch visible links
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement;
          const href = link.getAttribute('href');
          if (href && href.startsWith('/')) {
            router.prefetch(href);
          }
        }
      });
    });

    // Observe all links
    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach(link => observer.observe(link));

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick);
      observer.disconnect();
    };
  }, [router]);

  return <>{children}</>;
}
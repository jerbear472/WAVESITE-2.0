'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstantLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);

  useEffect(() => {
    if (pathname !== prevPath) {
      setIsLoading(true);
      setPrevPath(pathname);
      
      // Hide loader after a brief moment
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [pathname, prevPath]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none"
        >
          <div className="absolute top-0 left-0 right-0">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-shimmer" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
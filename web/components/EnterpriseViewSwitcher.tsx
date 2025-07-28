'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, ChevronDown, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';

interface EnterpriseViewSwitcherProps {
  className?: string;
  mobile?: boolean;
}

export default function EnterpriseViewSwitcher({ className = '', mobile = false }: EnterpriseViewSwitcherProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Check if user has enterprise access
  const hasEnterpriseAccess = (user?.subscription_tier && 
    ['professional', 'enterprise', 'hedge_fund'].includes(user.subscription_tier)) || 
    user?.is_admin;

  // Don't show if user doesn't have enterprise access
  if (!hasEnterpriseAccess) {
    return null;
  }

  const pathname = usePathname();
  const isEnterpriseView = pathname.startsWith('/enterprise');

  const handleViewSwitch = (toEnterprise: boolean) => {
    setIsOpen(false);
    if (toEnterprise) {
      router.push('/enterprise/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  if (mobile) {
    return (
      <div className={className}>
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Application Mode
        </div>
        <button
          onClick={() => handleViewSwitch(false)}
          className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
            !isEnterpriseView 
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          User Mode
          <span className="block text-xs text-gray-500 ml-6 mt-1">Earn money by spotting trends</span>
        </button>
        <button
          onClick={() => handleViewSwitch(true)}
          className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
            isEnterpriseView 
              ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300' 
              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Enterprise Dashboard
          <Sparkles className="w-3 h-3 inline ml-1 text-cyan-500" />
          <span className="block text-xs text-gray-500 ml-6 mt-1">Analytics & insights platform</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
          isEnterpriseView
            ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
            : 'bg-gradient-to-r from-green-500/10 to-blue-500/10 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
        }`}
      >
        {isEnterpriseView ? (
          <>
            <Building2 className="w-3 h-3 mr-1.5" />
            <span className="hidden lg:inline">Enterprise</span>
            <span className="lg:hidden">Ent</span>
          </>
        ) : (
          <>
            <Users className="w-3 h-3 mr-1.5" />
            <span className="hidden lg:inline">User Mode</span>
            <span className="lg:hidden">User</span>
            <span className="text-xs ml-1">(Earn)</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {mounted && isOpen && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-[999]" 
                onClick={() => setIsOpen(false)}
              />
              
              {/* Dropdown */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="fixed w-64 rounded-xl shadow-2xl bg-white dark:bg-gray-900 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-[1000] overflow-hidden border border-gray-200 dark:border-gray-700"
                style={{ 
                  top: `${dropdownPosition.top}px`,
                  right: `${dropdownPosition.right}px`,
                  transformOrigin: 'top right'
                }}
              >
              <div className="py-1">
                <button
                  onClick={() => handleViewSwitch(false)}
                  className={`group flex w-full items-start px-4 py-3 text-sm transition-colors ${
                    !isEnterpriseView 
                      ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Users className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-medium">User Mode</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Earn money by spotting & validating trends
                    </div>
                  </div>
                  {!isEnterpriseView && (
                    <div className="ml-auto text-green-500">✓</div>
                  )}
                </button>
                
                <button
                  onClick={() => handleViewSwitch(true)}
                  className={`group flex w-full items-start px-4 py-3 text-sm transition-colors ${
                    isEnterpriseView 
                      ? 'bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-cyan-900/30 dark:to-purple-900/30 text-cyan-700 dark:text-cyan-300' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Building2 className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-medium flex items-center">
                      Enterprise Dashboard
                      <Sparkles className="w-3 h-3 ml-1 text-cyan-500" />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Business analytics & trend insights platform
                    </div>
                  </div>
                  {isEnterpriseView && (
                    <div className="ml-auto text-cyan-500">✓</div>
                  )}
                </button>
              </div>
              
              {/* Access info */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <div className="font-medium text-cyan-600 dark:text-cyan-400 capitalize mb-1">
                    {user?.subscription_tier} Plan
                  </div>
                  <div>Enterprise access granted via account settings</div>
                </div>
              </div>
            </motion.div>
          </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
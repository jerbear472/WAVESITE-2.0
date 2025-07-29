'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import WaveSightLogo from '@/components/WaveSightLogo';
import EnterpriseViewSwitcher from '@/components/EnterpriseViewSwitcher';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, switchViewMode } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  // Fetch correct total earnings
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('earnings_pending, earnings_approved, earnings_paid')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          // Calculate total earnings (all earnings ever earned)
          const total = (profile.earnings_pending || 0) + 
                       (profile.earnings_approved || 0) + 
                       (profile.earnings_paid || 0);
          console.log('Navigation earnings calculation:', {
            pending: profile.earnings_pending || 0,
            approved: profile.earnings_approved || 0,
            paid: profile.earnings_paid || 0,
            total
          });
          setTotalEarnings(total);
        }
      } catch (error) {
        console.error('Error fetching earnings:', error);
      }
    };

    fetchEarnings();

    // Subscribe to earnings changes
    const subscription = supabase
      .channel('nav-earnings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        },
        (payload) => {
          // Re-fetch earnings when profile changes
          fetchEarnings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (result.success) {
        router.push('/');
      } else {
        console.error('Logout failed:', result.error);
        alert('Failed to logout. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('An error occurred during logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleViewSwitch = async (mode: 'user' | 'professional') => {
    await switchViewMode(mode);
    setViewSwitcherOpen(false);
    router.refresh();
  };

  // Different navigation items based on user type and view mode
  const isBusinessUser = user?.is_business;
  const isProfessionalView = user?.view_mode === 'professional';
  const isAdmin = user?.role === 'admin' || user?.is_admin || user?.email === 'jeremyuys@gmail.com';

  const userNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/scroll', label: 'Scroll & Earn', icon: '📱' },
    { href: '/timeline', label: 'My Timeline', icon: '📈' },
    { href: '/verify', label: 'Verify', icon: '✅' },
    { href: '/earnings', label: 'Earnings', icon: '💰' },
    { href: '/profile', label: 'Profile', icon: '👤' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const professionalNavItems = [
    { href: '/professional/dashboard', label: 'Analytics', icon: '📊' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/timeline', label: 'Timeline', icon: '📈' },
    { href: '/verify', label: 'Verify', icon: '✅' },
    { href: '/earnings', label: 'Earnings', icon: '💰' },
    { href: '/profile', label: 'Profile', icon: '👤' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const businessNavItems = [
    { href: '/business/dashboard', label: 'Analytics', icon: '📊' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/timeline', label: 'Timeline', icon: '📈' },
    { href: '/verify', label: 'Verify', icon: '✅' },
    { href: '/earnings', label: 'Earnings', icon: '💰' },
    { href: '/profile', label: 'Profile', icon: '👤' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  let navItems = userNavItems;
  if (isProfessionalView) {
    navItems = professionalNavItems;
  } else if (isBusinessUser) {
    navItems = businessNavItems;
  }

  const isActive = (href: string) => pathname === href;

  if (!user) return null;

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-14 sm:min-h-16 py-2">
          <div className="flex flex-1 min-w-0">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <WaveSightLogo 
                size="sm" 
                linkTo={isBusinessUser ? '/business/dashboard' : '/dashboard'}
                className="mr-2 sm:mr-4"
              />
              {isBusinessUser && <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-2">Business</span>}
            </div>

            {/* Desktop Navigation - Responsive with horizontal scroll */}
            <div className="hidden sm:ml-2 md:ml-8 sm:flex flex-1 min-w-0 overflow-x-auto overflow-y-visible scrollbar-hide">
              <div className="flex space-x-1 md:space-x-2 pr-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center justify-center px-2 md:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 relative z-10 ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    title={item.label}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="hidden xl:inline ml-2 text-sm">{item.label}</span>
                    <span className="hidden lg:inline xl:hidden ml-1 text-xs font-medium">
                      {item.label.split(' ')[0]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* User info - visible on larger screens */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-800">
              <span className="max-w-[120px] xl:max-w-[200px] truncate">{user.email}</span>
              {!isBusinessUser && totalEarnings > 0 && (
                <span className="font-medium text-green-600">
                  {formatCurrency(totalEarnings)}
                </span>
              )}
            </div>
            
            {/* Enterprise View Switcher */}
            <EnterpriseViewSwitcher className="hidden lg:block relative" />
            
            {/* Logout button - always visible */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center justify-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target min-w-[44px] min-h-[44px]"
              title="Logout"
            >
              <span className="block sm:hidden text-lg">🚪</span>
              <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-800 hover:text-gray-900 hover:bg-gray-100 touch-target min-w-[44px] min-h-[44px]"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 pt-3 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors touch-target ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            
            {/* Enterprise View Switcher Mobile */}
            <EnterpriseViewSwitcher mobile className="border-t border-gray-200 pt-2" />
            
            {/* Mobile user info */}
            <div className="border-t border-gray-200 pt-2">
              <div className="px-3 py-2 text-sm text-gray-600">
                <p className="truncate">{user.email}</p>
                {!isBusinessUser && totalEarnings > 0 && (
                  <p className="font-medium text-green-600 mt-1">
                    {formatCurrency(totalEarnings)}
                  </p>
                )}
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed touch-target border-t border-gray-200 mt-2 pt-3"
              >
                🚪 {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
          <div className="safe-area-bottom"></div>
        </div>
      )}
    </nav>
  );
}
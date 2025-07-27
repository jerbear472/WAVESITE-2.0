'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import WaveSightLogo from '@/components/WaveSightLogo';
import EnterpriseViewSwitcher from '@/components/EnterpriseViewSwitcher';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, switchViewMode } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const adminNavItems = userNavItems; // Admins see the same navigation as regular users

  let navItems = userNavItems;
  if (isAdmin) {
    navItems = adminNavItems;
  } else if (isProfessionalView) {
    navItems = professionalNavItems;
  } else if (isBusinessUser) {
    navItems = businessNavItems;
  }

  const isActive = (href: string) => pathname === href;

  if (!user) return null;

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-14 sm:min-h-16 py-2">
          <div className="flex">
            {/* Logo */}
            <div className="flex items-center">
              <WaveSightLogo 
                size="sm" 
                linkTo={isBusinessUser ? '/business/dashboard' : '/dashboard'}
                className="mr-2 sm:mr-4"
              />
              {isBusinessUser && <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-2">Business</span>}
            </div>

            {/* Desktop Navigation - Responsive */}
            <div className="hidden sm:ml-2 md:ml-16 sm:flex sm:space-x-0.5 md:space-x-2 overflow-x-auto hide-scrollbar flex-1 max-w-none">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center justify-center px-1.5 sm:px-2 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 min-w-0 ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={item.label}
                >
                  {/* Progressive text display based on screen size */}
                  <span className="text-base">{item.icon}</span>
                  <span className="hidden lg:inline ml-2 text-sm">{item.label}</span>
                  <span className="hidden sm:inline lg:hidden ml-1 text-xs font-medium">
                    {item.label.split(' ')[0]}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Enterprise View Switcher */}
            <EnterpriseViewSwitcher className="hidden md:block" />
            
            {/* User info - visible on larger screens */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-800">
              <span className="max-w-[120px] xl:max-w-[200px] truncate">{user.email}</span>
              {!isBusinessUser && user.total_earnings !== undefined && (
                <span className="font-medium text-green-600">
                  {formatCurrency(user.total_earnings)}
                </span>
              )}
            </div>
            
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
          <div className="px-4 pt-3 pb-3 space-y-1 max-h-[calc(100vh-56px)] overflow-y-auto hide-scrollbar">
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
                {!isBusinessUser && user.total_earnings !== undefined && (
                  <p className="font-medium text-green-600 mt-1">
                    Total: {formatCurrency(user.total_earnings)}
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
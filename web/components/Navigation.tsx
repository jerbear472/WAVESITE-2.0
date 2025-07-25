'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

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
  const isAdmin = user?.role === 'admin';

  const userNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/scroll', label: 'Scroll & Earn', icon: '📱' },
    { href: '/timeline', label: 'My Timeline', icon: '📈' },
    { href: '/verify', label: 'Verify', icon: '✅' },
    { href: '/earnings', label: 'Earnings', icon: '💰' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const professionalNavItems = [
    { href: '/professional/dashboard', label: 'Analytics', icon: '📊' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/timeline', label: 'Timeline', icon: '📈' },
    { href: '/verify', label: 'Verify', icon: '✅' },
    { href: '/earnings', label: 'Earnings', icon: '💰' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const businessNavItems = [
    { href: '/business/dashboard', label: 'Analytics', icon: '📊' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/timeline', label: 'Timeline', icon: '📈' },
    { href: '/verify', label: 'Verify', icon: '✅' },
    { href: '/earnings', label: 'Earnings', icon: '💰' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const adminNavItems = [
    ...userNavItems,
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
  ];

  let navItems = userNavItems;
  if (isAdmin && pathname.startsWith('/admin')) {
    navItems = adminNavItems;
  } else if (isProfessionalView) {
    navItems = professionalNavItems;
  } else if (isBusinessUser) {
    navItems = businessNavItems;
  }

  const isActive = (href: string) => pathname === href;

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <Link href={isBusinessUser ? '/business/dashboard' : '/dashboard'} className="flex items-center space-x-3">
              <img 
                src="/logo2.png" 
                alt="WAVESIGHT Logo" 
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                WaveSight{isBusinessUser && <span className="text-sm text-gray-500 ml-2">Business</span>}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-16 md:flex md:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap min-w-fit ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* View Switcher for Admins */}
            {isAdmin && user.permissions?.can_switch_views && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setViewSwitcherOpen(!viewSwitcherOpen)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span className="mr-2">👁️</span>
                  {isProfessionalView ? 'Professional' : 'User'} View
                  <span className="ml-2">▼</span>
                </button>
                {viewSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={() => handleViewSwitch('user')}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          !isProfessionalView ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        User View
                      </button>
                      <button
                        onClick={() => handleViewSwitch('professional')}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          isProfessionalView ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Professional View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Admin Settings Link */}
            {isAdmin && (
              <Link
                href="/admin/settings"
                className="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <span className="mr-2">⚙️</span>
                Admin
              </Link>
            )}
            
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-700">
              <span>{user.email}</span>
              {!isBusinessUser && user.total_earnings !== undefined && (
                <span className="font-medium text-green-600">
                  ${user.total_earnings.toFixed(2)}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {/* Admin View Switcher Mobile */}
            {isAdmin && user.permissions?.can_switch_views && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  View Mode
                </div>
                <button
                  onClick={() => handleViewSwitch('user')}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    !isProfessionalView ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  User View
                </button>
                <button
                  onClick={() => handleViewSwitch('professional')}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    isProfessionalView ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Professional View
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
          <div className="px-4 pb-3 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              <p>{user.email}</p>
              {!isBusinessUser && user.total_earnings !== undefined && (
                <p className="font-medium text-green-600">
                  Total: ${user.total_earnings.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
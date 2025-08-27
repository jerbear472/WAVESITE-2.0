'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useTransition, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import WaveSightLogo from '@/components/WaveSightLogo';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchDashboard, prefetchValidation, prefetchLeaderboard } from '@/lib/hooks/useApi';

// Prefetch all routes on component mount for instant navigation
const ROUTES = [
  '/dashboard',
  '/spot', 
  '/predictions',
  '/timeline',
  '/validate',
  '/leaderboard',
  '/profile'
];

export default function SPANavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userXP, setUserXP] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<string>('Observer');
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Prefetch all routes on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ROUTES.forEach(route => {
        router.prefetch(route);
      });
    }
  }, [router]);

  // Prefetch data for routes
  useEffect(() => {
    if (user) {
      // Prefetch common data
      prefetchDashboard(queryClient, user.id);
      prefetchValidation(queryClient);
      prefetchLeaderboard(queryClient);
    }
  }, [user, queryClient]);

  const fetchXPData = async () => {
    if (!user) return;
    
    try {
      const { data: xpData } = await supabase
        .from('user_xp_summary')
        .select('total_xp, level, level_title')
        .eq('user_id', user.id)
        .single();

      if (xpData) {
        setUserXP(xpData.total_xp || 0);
        setUserLevel(xpData.level_title || 'Observer');
      }

      const { data: leaderboard } = await supabase
        .from('xp_leaderboard')
        .select('global_rank')
        .eq('user_id', user.id)
        .single();
        
      if (leaderboard) {
        setGlobalRank(leaderboard.global_rank);
      }
    } catch (error) {
      console.error('Error fetching XP data:', error);
    }
  };

  useEffect(() => {
    fetchXPData();
  }, [user, pathname]);

  // Listen for XP events
  useEffect(() => {
    const handleXPEarned = () => {
      if (user) {
        fetchXPData();
      }
    };

    window.addEventListener('xp-earned', handleXPEarned);
    window.addEventListener('navigation-refresh', fetchXPData);
    
    return () => {
      window.removeEventListener('xp-earned', handleXPEarned);
      window.removeEventListener('navigation-refresh', fetchXPData);
    };
  }, [user]);

  // Optimized navigation handler
  const handleNavigation = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    if (pathname === href) return;
    
    setIsNavigating(true);
    startTransition(() => {
      router.push(href);
      setTimeout(() => setIsNavigating(false), 300);
    });
  }, [pathname, router]);

  const handleLogout = async () => {
    await logout();
    queryClient.clear(); // Clear all cached data
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/spot', label: 'Spot', icon: '👁️' },
    { href: '/predictions', label: 'Predictions', icon: '🔮' },
    { href: '/timeline', label: 'My Timeline', icon: '📈' },
    { href: '/validate', label: 'Validate', icon: '✅' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 transition-opacity duration-200 ${isNavigating ? 'opacity-90' : 'opacity-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-8">
              <Link 
                href="/dashboard" 
                className="flex items-center"
                onClick={(e) => handleNavigation(e, '/dashboard')}
              >
                <WaveSightLogo className="h-8 w-auto" />
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:block flex-1 max-w-2xl">
                <div className="flex items-center space-x-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleNavigation(e, item.href)}
                      onMouseEnter={() => router.prefetch(item.href)}
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        pathname === item.href
                          ? 'bg-blue-50 text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* XP Display */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-3 text-sm">
                {globalRank && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-700">#{globalRank}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-700">{userXP} XP</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-700">{userLevel}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="md:hidden border-t border-gray-100">
            <div className="px-4 pt-2 pb-3 space-y-1">
              {/* Mobile XP Display */}
              <div className="flex items-center justify-between py-3 px-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-2">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{userLevel}</p>
                    <p className="text-xs text-gray-600">{userXP} XP • Rank #{globalRank || '?'}</p>
                  </div>
                </div>
              </div>

              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    handleNavigation(e, item.href);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}

              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* Loading bar during navigation */}
      {(isPending || isNavigating) && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
        </div>
      )}
    </>
  );
}
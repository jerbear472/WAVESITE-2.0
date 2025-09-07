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
import { getLevelTitle } from '@/lib/xpLevels';

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
  const [isXPLoading, setIsXPLoading] = useState(true);
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
      // First try to get XP from user_xp_summary view
      const { data: xpData, error: xpError } = await supabase
        .from('user_xp_summary')
        .select('total_xp, level, level_title')
        .eq('user_id', user.id)
        .single();

      if (xpData && !xpError) {
        console.log('SPANavigation XP Data:', xpData);
        setUserXP(xpData.total_xp || 0);
        // Use unified level system instead of database value
        const levelTitle = getLevelTitle(xpData.level || 1);
        setUserLevel(levelTitle);
      } else {
        // Fallback to user_xp table
        const { data: directXP } = await supabase
          .from('user_xp')
          .select('total_xp, current_level')
          .eq('user_id', user.id)
          .single();
        
        if (directXP) {
          console.log('Direct XP Data:', directXP);
          setUserXP(directXP.total_xp || 0);
          
          // Use unified level system
          const levelTitle = getLevelTitle(directXP.current_level || 1);
          setUserLevel(levelTitle);
        }
      }

      // Get leaderboard rank
      const { data: leaderboard } = await supabase
        .from('xp_leaderboard')
        .select('global_rank')
        .eq('user_id', user.id)
        .single();
        
      if (leaderboard) {
        setGlobalRank(leaderboard.global_rank);
      } else {
        // Calculate rank if not in leaderboard view
        const { data: rankData } = await supabase
          .from('user_xp')
          .select('user_id, total_xp')
          .order('total_xp', { ascending: false });
          
        if (rankData) {
          const userRank = rankData.findIndex(u => u.user_id === user.id) + 1;
          if (userRank > 0) {
            setGlobalRank(userRank);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching XP data:', error);
    }
  };

  useEffect(() => {
    setIsXPLoading(true);
    fetchXPData().finally(() => setIsXPLoading(false));
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
    { href: '/daily', label: 'Daily', icon: '📸' },
    { href: '/spot', label: 'Spot', icon: '➕' },
    { href: '/predictions', label: 'Headlines', icon: '🌍' },
    { href: '/timeline', label: 'My Timeline', icon: '📅' },
    { href: '/notifications', label: 'Notifications', icon: '🔔' },
    // Hidden: { href: '/validate', label: 'Validate', icon: '✅' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 transition-opacity duration-200 ${isNavigating ? 'opacity-90' : 'opacity-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-8">
              <Link 
                href="/dashboard" 
                className="flex items-center"
                onClick={(e) => handleNavigation(e, '/dashboard')}
              >
                <WaveSightLogo className="h-7 w-auto" />
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
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        pathname === item.href
                          ? 'bg-blue-50 text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* XP Display - More Compact */}
            <div className="hidden md:flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm">
                {globalRank && globalRank <= 100 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-md border border-yellow-200">
                    <Trophy className="w-3 h-3 text-yellow-600" />
                    <span className="font-semibold text-xs text-yellow-700">#{globalRank}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md border border-purple-200">
                  {isXPLoading ? (
                    <span className="text-xs text-purple-600">...</span>
                  ) : (
                    <>
                      <span className="font-semibold text-xs text-purple-700">{userXP.toLocaleString()}</span>
                      <span className="text-xs text-purple-600">XP</span>
                    </>
                  )}
                </div>
                
                {userLevel !== 'Observer' && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-md border border-blue-200">
                    <TrendingUp className="w-3 h-3 text-blue-600" />
                    <span className="font-semibold text-xs text-blue-700">{userLevel}</span>
                  </div>
                )}
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
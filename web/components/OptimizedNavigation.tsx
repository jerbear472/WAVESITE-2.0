'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import WaveSightLogo from '@/components/WaveSightLogo';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { prefetchDashboard, prefetchValidation, prefetchLeaderboard } from '@/lib/hooks/useApi';

// Optimized XP data fetching with React Query
function useUserXPData(userId: string | undefined) {
  return useQuery({
    queryKey: ['userXP', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // Fetch XP and level from user_xp_summary view
      const { data: xpData } = await supabase
        .from('user_xp_summary')
        .select('total_xp, level, level_title')
        .eq('user_id', userId)
        .single();

      // Fetch leaderboard rank
      const { data: leaderboard } = await supabase
        .from('xp_leaderboard')
        .select('global_rank')
        .eq('user_id', userId)
        .single();
      
      return {
        xp: xpData?.total_xp || 0,
        level: xpData?.level_title || 'Observer',
        rank: leaderboard?.global_rank || null
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export default function OptimizedNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use React Query for XP data
  const { data: xpData, refetch: refetchXP } = useUserXPData(user?.id);

  // Prefetch data on hover for instant navigation
  const handleNavHover = useCallback((href: string) => {
    if (!user) return;
    
    // Prefetch based on the destination
    switch(href) {
      case '/dashboard':
        prefetchDashboard(queryClient, user.id);
        break;
      case '/validate':
        prefetchValidation(queryClient);
        break;
      case '/leaderboard':
        prefetchLeaderboard(queryClient);
        break;
    }
  }, [queryClient, user]);

  // Listen for XP events to update navigation in real-time
  useEffect(() => {
    const handleXPEarned = () => {
      if (user) {
        refetchXP();
      }
    };

    window.addEventListener('xp-earned', handleXPEarned);
    return () => window.removeEventListener('xp-earned', handleXPEarned);
  }, [user, refetchXP]);

  // Refetch XP when pathname changes
  useEffect(() => {
    if (user) {
      refetchXP();
    }
  }, [pathname, user, refetchXP]);

  const handleLogout = async () => {
    await logout();
    // Clear all cached data on logout
    queryClient.clear();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊', prefetch: true },
    { href: '/spot', label: 'Spot', icon: '👁️', prefetch: true },
    { href: '/predictions', label: 'Predictions', icon: '🔮', prefetch: true },
    { href: '/timeline', label: 'My Timeline', icon: '📈', prefetch: true },
    // Hidden: { href: '/validate', label: 'Validate', icon: '✅', prefetch: true },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆', prefetch: true },
    { href: '/profile', label: 'Profile', icon: '👤', prefetch: false },
  ];

  return (
    <>
      <style jsx>{`
        .nav-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .nav-scroll::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        .nav-scroll::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .nav-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <nav className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center space-x-8">
            <Link 
              href="/dashboard" 
              className="flex items-center"
              prefetch
            >
              <WaveSightLogo className="h-8 w-auto" />
            </Link>

            {/* Desktop Navigation with Horizontal Scroll */}
            <div className="hidden md:block flex-1 max-w-2xl">
              <div 
                className="nav-scroll flex items-center space-x-1 overflow-x-auto pb-1"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db #f3f4f6',
                }}
              >
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={item.prefetch}
                    onMouseEnter={() => handleNavHover(item.href)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
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

          {/* XP Display */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-3 text-sm">
              {xpData?.rank && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-700">#{xpData.rank}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-700">{xpData?.xp || 0} XP</span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-700">{xpData?.level || 'Observer'}</span>
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
                  <p className="text-sm font-medium text-gray-800">{xpData?.level || 'Observer'}</p>
                  <p className="text-xs text-gray-600">{xpData?.xp || 0} XP • Rank #{xpData?.rank || '?'}</p>
                </div>
              </div>
            </div>

            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.prefetch}
                onClick={() => setMobileMenuOpen(false)}
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
    </>
  );
}
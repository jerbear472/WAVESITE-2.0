'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import WaveSightLogo from '@/components/WaveSightLogo';
import { Trophy, TrendingUp, Award } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userXP, setUserXP] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<string>('Observer');
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  const fetchXPData = async () => {
    if (!user) return;
    
    try {
        // Fetch XP and level from user_xp_summary view (same as dashboard)
        const { data: xpData } = await supabase
          .from('user_xp_summary')
          .select('total_xp, level, level_title')
          .eq('user_id', user.id)
          .single();

        if (xpData) {
          console.log('Navigation XP data:', xpData);
          setUserXP(xpData.total_xp || 0);
          setUserLevel(xpData.level_title || 'Observer');
        } else {
          console.log('No XP data found for user:', user.id);
          
          // Fallback: Try to get XP directly from user_xp table
          const { data: directXP } = await supabase
            .from('user_xp')
            .select('total_xp, current_level')
            .eq('user_id', user.id)
            .single();
            
          if (directXP) {
            console.log('Found direct XP data:', directXP);
            setUserXP(directXP.total_xp || 0);
          } else {
            console.log('No XP data in user_xp table either for user:', user.id);
          }
        }

        // Fetch leaderboard rank
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

  // Refresh XP data on navigation changes
  useNavigationRefresh(() => {
    fetchXPData();
  }, [user]);

  useEffect(() => {
    fetchXPData();
  }, [user, pathname]); // Also refresh when pathname changes

  // Listen for XP events to update navigation in real-time
  useEffect(() => {
    const handleXPEarned = () => {
      if (user) {
        fetchXPData();
      }
    };

    window.addEventListener('xp-earned', handleXPEarned);
    return () => window.removeEventListener('xp-earned', handleXPEarned);
  }, [user]);

  const handleLogout = async () => {
    await logout();
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
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4 flex-1">
            <Link href="/dashboard" className="flex items-center flex-shrink-0">
              <WaveSightLogo className="h-7 w-auto" />
            </Link>

            {/* Desktop Navigation with Horizontal Scroll */}
            <div className="hidden md:block flex-1 overflow-hidden">
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
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Stats & Logout - More Compact */}
          <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
            {/* XP Display */}
            <div className="flex items-center bg-gradient-to-r from-yellow-50 to-orange-50 px-2.5 py-1 rounded-md border border-yellow-200 whitespace-nowrap">
              <span className="text-yellow-500 text-xs mr-1">⚡</span>
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{userXP.toLocaleString()}</span>
              <span className="text-xs text-gray-500 ml-0.5 whitespace-nowrap">XP</span>
            </div>
            
            {/* Rank Display - Only if in top 100 */}
            {globalRank && globalRank <= 100 && (
              <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 px-2.5 py-1 rounded-md border border-green-200">
                <span className="text-xs font-bold text-green-700">#{globalRank}</span>
              </div>
            )}
            
            {/* Level Display - Only if not Observer */}
            {userLevel && userLevel !== 'Observer' && (
              <div className="hidden lg:flex items-center bg-gradient-to-r from-purple-50 to-pink-50 px-2.5 py-1 rounded-md border border-purple-200">
                <span className="text-xs font-bold text-purple-700">{userLevel}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors ml-1"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Mobile menu button + XP display */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile XP - Very Compact */}
            <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded-md whitespace-nowrap">
              <span className="text-yellow-500 text-xs">⚡</span>
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{userXP > 999 ? `${Math.floor(userXP/1000)}k` : userXP}</span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-2">
            {/* Mobile User Stats */}
            <div className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 whitespace-nowrap">
                  <span className="text-yellow-500">⚡</span>
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{userXP.toLocaleString()} XP</span>
                </div>
                {userLevel !== 'Observer' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <div className="text-sm font-medium text-purple-600">
                      {userLevel}
                    </div>
                  </>
                )}
                {globalRank && globalRank <= 100 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">🏅</span>
                      <span className="text-sm font-medium text-green-600">#{globalRank}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Navigation Items */}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">{item.icon}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              </Link>
            ))}

            {/* Mobile Logout */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                <span className="text-lg">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
    </>
  );
}

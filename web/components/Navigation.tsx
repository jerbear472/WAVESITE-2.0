'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import WaveSightLogo from '@/components/WaveSightLogo';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import { getLevelByXP } from '@/lib/xpLevels';

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
        // First, get XP directly from user_xp table for most accurate data
        const { data: directXP } = await supabase
          .from('user_xp')
          .select('total_xp')
          .eq('user_id', user.id)
          .single();

        if (directXP) {
          const totalXP = parseInt(String(directXP.total_xp)) || 0;
          console.log('Navigation - Direct XP from user_xp table:', totalXP, 'raw value:', directXP.total_xp, 'type:', typeof directXP.total_xp);
          setUserXP(totalXP);
          
          // Calculate level from XP
          const calculatedLevel = getLevelByXP(totalXP);
          console.log('Navigation - Setting level to:', calculatedLevel.title);
          setUserLevel(calculatedLevel.title);
          
          // Debug comparison
          console.log('Debug: Is', totalXP, '>= 2100?', totalXP >= 2100);
          console.log('Debug: Is', totalXP, '>= 1000?', totalXP >= 1000);
          console.log('Final level set to:', calculatedLevel.title);
        } else {
          console.log('No XP data found for user:', user.id);
          // Try the view as fallback
          const { data: xpData } = await supabase
            .from('user_xp_summary')
            .select('total_xp')
            .eq('user_id', user.id)
            .single();
            
          if (xpData) {
            const totalXP = parseInt(String(xpData.total_xp)) || 0;
            console.log('Navigation - Fallback XP from view:', totalXP, 'raw:', xpData.total_xp);
            setUserXP(totalXP);
            const calculatedLevel = getLevelByXP(totalXP);
            console.log('Navigation - Fallback calculated level:', calculatedLevel.title);
            setUserLevel(calculatedLevel.title);
          } else {
            console.log('No XP data in either table for user:', user.id);
            setUserXP(0);
            setUserLevel('Observer');
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
    console.log('Navigation refresh triggered');
    fetchXPData();
  }, [user]);

  useEffect(() => {
    console.log('Navigation useEffect triggered - user or pathname changed');
    fetchXPData();
  }, [user, pathname]); // Also refresh when pathname changes
  
  // Force refresh on mount and every few seconds to ensure fresh data
  useEffect(() => {
    if (user) {
      // Initial fetch
      fetchXPData();
      
      // Refresh every 5 seconds for debugging
      const interval = setInterval(() => {
        console.log('Navigation periodic refresh');
        fetchXPData();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id]); // Depend on user.id to ensure refresh on user change

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

  // Navigation items with updated Headlines
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/spot', label: 'Spot', icon: '➕' },
    { href: '/predictions', label: 'Headlines', icon: '🌍' },
    { href: '/timeline', label: 'My Timeline', icon: '📅' },
    // Hidden from nav but still accessible at /validate
    // { href: '/validate', label: 'Validate', icon: '✅' },
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

          {/* Desktop Stats & Profile - More Compact */}
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
            
            {/* Level Display - Show current rank */}
            {userLevel && (
              <div key={`level-${userXP}`} className="flex items-center bg-gradient-to-r from-purple-50 to-pink-50 px-2.5 py-1 rounded-md border border-purple-200">
                <span className="text-xs font-bold text-purple-700">
                  {getLevelByXP(userXP).emoji} {getLevelByXP(userXP).title}
                </span>
              </div>
            )}

            {/* Profile Dropdown */}
            <div className="relative group">
              <Link
                href="/profile"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-sm hover:shadow-lg transition-all duration-200"
                title="Profile"
              >
                {user?.username ? user.username.charAt(0).toUpperCase() : '👤'}
              </Link>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                >
                  <span className="mr-2">👤</span> Profile
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className="mr-2">⚙️</span> Settings
                </Link>
                <Link
                  href="/leaderboard"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className="mr-2">🏆</span> Leaderboard
                </Link>
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                >
                  <span className="mr-2">🚪</span> Logout
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu button + XP display */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile XP and Level - Very Compact */}
            <div className="flex items-center space-x-1">
              <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                <span className="text-yellow-500 text-xs">⚡</span>
                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{userXP > 999 ? `${Math.floor(userXP/1000)}k` : userXP}</span>
              </div>
              {userLevel && userLevel !== 'Observer' && (
                <div className="flex items-center bg-purple-50 px-2 py-0.5 rounded-md">
                  <span className="text-xs font-bold text-purple-700">{userLevel}</span>
                </div>
              )}
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

            {/* Additional Menu Items */}
            <div className="pt-2 border-t border-gray-200">
              <Link
                href="/profile"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">👤</span>
                <span>Profile</span>
              </Link>
              
              <Link
                href="/leaderboard"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">🏆</span>
                <span>Leaderboard</span>
              </Link>
              
              <Link
                href="/settings"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">⚙️</span>
                <span>Settings</span>
              </Link>
            </div>

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

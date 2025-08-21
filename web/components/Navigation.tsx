'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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

  useEffect(() => {
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

    fetchXPData();
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
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center">
              <WaveSightLogo className="h-8 w-auto" />
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* XP Display */}
            <div className="flex items-center space-x-1">
              <span className="text-yellow-500">⚡</span>
              <span className="text-sm font-medium text-gray-700">{userXP.toLocaleString()}</span>
              <span className="text-sm text-gray-500">XP</span>
            </div>

            {/* Level Badge */}
            {userLevel !== 'Observer' && (
              <div className="text-sm font-medium text-purple-600">
                {userLevel}
              </div>
            )}

            {/* Rank Display */}
            {globalRank && globalRank <= 100 && (
              <div className="flex items-center space-x-1">
                <span className="text-sm">🏅</span>
                <span className="text-sm font-medium text-green-600">#{globalRank}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-white/10"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium transition-all ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

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
        // Fetch XP and level
        const { data: xpData } = await supabase
          .from('user_xp')
          .select('total_xp, current_level')
          .eq('user_id', user.id)
          .single();

        if (xpData) {
          setUserXP(xpData.total_xp || 0);
          
          // Fetch level title
          const { data: levelData } = await supabase
            .from('xp_levels')
            .select('title')
            .eq('level', xpData.current_level)
            .single();
            
          if (levelData) {
            setUserLevel(levelData.title);
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
    { href: '/timeline', label: 'My Timeline', icon: '📅' },
    { href: '/validate', label: 'Validate', icon: '✅' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* XP Display */}
            <div className="text-sm font-medium text-gray-700">
              {userXP.toLocaleString()} XP
            </div>

            {/* Level Badge */}
            {userLevel !== 'Observer' && (
              <div className="text-sm font-medium text-gray-700">
                {userLevel}
              </div>
            )}

            {/* Rank Display */}
            {globalRank && globalRank <= 100 && (
              <div className="text-sm font-medium text-green-600">
                #{globalRank}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
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
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

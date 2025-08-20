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
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/spot', label: 'Spot' },
    { href: '/predictions', label: 'Predictions' },
    { href: '/timeline', label: 'My Timeline' },
    { href: '/validate', label: 'Validate' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <WaveSightLogo className="h-8 w-auto" />
              <span className="ml-2 text-xl font-bold">Cultural Wave Tracker</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-white/20 text-white'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {/* XP Display */}
            <div className="bg-white/10 rounded-lg px-3 py-1 flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-bold">{userXP.toLocaleString()} XP</span>
            </div>

            {/* Level Display */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg px-3 py-1">
              <span className="text-sm font-bold text-gray-900">{userLevel}</span>
            </div>

            {/* Rank Display */}
            {globalRank && globalRank <= 100 && (
              <div className="bg-green-500 rounded-lg px-3 py-1 flex items-center space-x-1">
                <Award className="h-4 w-4" />
                <span className="text-sm font-bold">#{globalRank}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
        <div className="md:hidden bg-purple-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-white/10"
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

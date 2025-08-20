#!/bin/bash

# =========================================
# Transform FreeWaveSight to Cultural XP System
# =========================================

echo "==========================================="
echo "Transforming to Cultural Anthropology XP Platform"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Apply database transformation
echo -e "${YELLOW}Step 1: Applying database transformation...${NC}"
if command -v supabase &> /dev/null; then
    supabase db push --db-url "$DATABASE_URL" < COMPLETE_XP_TRANSFORMATION.sql
    echo -e "${GREEN}✓ Database transformed${NC}"
else
    echo -e "${RED}Warning: Supabase CLI not found. Please run the SQL manually.${NC}"
fi

# Step 2: Update Navigation component
echo -e "${YELLOW}Step 2: Updating Navigation component...${NC}"
cat > web/components/Navigation.tsx << 'EOF'
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
    { href: '/submit-trend', label: 'Spot Wave' },
    { href: '/validate', label: 'Validate' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/competitions', label: 'Competitions' },
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
EOF
echo -e "${GREEN}✓ Navigation updated${NC}"

# Step 3: Create new Leaderboard page
echo -e "${YELLOW}Step 3: Creating Leaderboard page...${NC}"
mkdir -p web/app/\(authenticated\)/leaderboard
cat > web/app/\(authenticated\)/leaderboard/page.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Award, TrendingUp, Target, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string;
  anthropologist_title: string;
  total_xp: number;
  current_level: number;
  level_title: string;
  wave_accuracy: number;
  waves_spotted: number;
  achievement_count: number;
  global_rank: number;
  prize_tier: string;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('xp_leaderboard')
        .select('*')
        .order('global_rank', { ascending: true })
        .limit(100);

      const { data, error } = await query;
      
      if (error) throw error;
      
      setLeaderboard(data || []);

      // Get current user's rank
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userEntry = data?.find(entry => entry.user_id === user.id);
        setUserRank(userEntry?.global_rank || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    if (rank <= 10) return <Trophy className="h-5 w-5 text-purple-400" />;
    if (rank <= 50) return <Award className="h-5 w-5 text-blue-400" />;
    return <Target className="h-4 w-4 text-gray-400" />;
  };

  const getPrizeTierColor = (tier: string) => {
    switch(tier) {
      case 'prize_tier_1': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'prize_tier_2': return 'bg-gradient-to-r from-purple-400 to-pink-500';
      case 'prize_tier_3': return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Cultural Anthropologist Leaderboard
          </h1>
          <p className="text-gray-400">
            Top wave spotters compete for exclusive prizes and recognition
          </p>
        </div>

        {/* Prize Pool Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Monthly Competition Active
              </h2>
              <p className="text-gray-200">
                Top 10 anthropologists win exclusive prizes!
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-200">Time remaining:</p>
              <p className="text-2xl font-bold text-white">7 days</p>
            </div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800 rounded-lg p-1 flex space-x-1">
            {(['all', 'monthly', 'weekly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeframe === period
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Your Rank Card */}
        {userRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getRankIcon(userRank)}
                <div>
                  <p className="text-sm text-gray-300">Your Rank</p>
                  <p className="text-2xl font-bold text-white">#{userRank}</p>
                </div>
              </div>
              {userRank <= 100 && (
                <div className="bg-green-500 px-3 py-1 rounded-full">
                  <span className="text-sm font-bold text-white">Prize Eligible!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Anthropologist</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Level</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Total XP</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Waves</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Accuracy</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Achievements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leaderboard.map((entry, index) => (
                  <motion.tr
                    key={entry.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`hover:bg-gray-700 transition-colors ${
                      entry.global_rank <= 3 ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        {getRankIcon(entry.global_rank)}
                        <span className="font-bold text-white">#{entry.global_rank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={entry.avatar_url || '/default-avatar.png'}
                          alt={entry.username}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-white">{entry.username}</p>
                          {entry.anthropologist_title && (
                            <p className="text-xs text-gray-400">{entry.anthropologist_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPrizeTierColor(entry.prize_tier)}`}>
                        {entry.level_title}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-lg font-bold text-white">{entry.total_xp.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-300">{entry.waves_spotted}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-300">{entry.wave_accuracy}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center items-center space-x-1">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <span className="text-gray-300">{entry.achievement_count}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prize Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">🥇 Top 10 Prizes</h3>
            <ul className="text-sm text-gray-100 space-y-1">
              <li>• Custom title & badge</li>
              <li>• Exclusive features</li>
              <li>• Hall of Fame entry</li>
            </ul>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">🥈 Top 50 Prizes</h3>
            <ul className="text-sm text-gray-100 space-y-1">
              <li>• Special recognition</li>
              <li>• XP multiplier boost</li>
              <li>• Priority features</li>
            </ul>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">🥉 Top 100 Prizes</h3>
            <ul className="text-sm text-gray-100 space-y-1">
              <li>• Achievement badge</li>
              <li>• Bonus XP rewards</li>
              <li>• Community recognition</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
echo -e "${GREEN}✓ Leaderboard page created${NC}"

# Step 4: Create Competitions page
echo -e "${YELLOW}Step 4: Creating Competitions page...${NC}"
mkdir -p web/app/\(authenticated\)/competitions
cat > web/app/\(authenticated\)/competitions/page.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Calendar, Users, Target, Clock, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface Competition {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  total_prize: string;
  distribution: any;
  eligibility_criteria: any;
  status: string;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('prize_pools')
        .select('*')
        .in('status', ['active', 'upcoming'])
        .order('start_date', { ascending: true });

      if (error) throw error;
      setCompetitions(data || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Cultural Wave Competitions
          </h1>
          <p className="text-gray-400">
            Compete with fellow anthropologists for exclusive prizes
          </p>
        </div>

        <div className="grid gap-6">
          {competitions.map((competition, index) => (
            <motion.div
              key={competition.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gray-800 rounded-lg overflow-hidden ${
                competition.status === 'active' ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {competition.name}
                    </h2>
                    <p className="text-gray-400">{competition.description}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    competition.status === 'active' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-yellow-500 text-gray-900'
                  }`}>
                    {competition.status === 'active' ? 'Active' : 'Upcoming'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="h-5 w-5 text-purple-400" />
                    <span>Ends: {new Date(competition.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <span>{getDaysRemaining(competition.end_date)} days remaining</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Users className="h-5 w-5 text-green-400" />
                    <span>Min Level: {competition.eligibility_criteria?.min_level || 1}</span>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-bold text-white mb-2">Prize Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(competition.distribution).map(([place, prize]) => (
                      <div key={place} className="flex justify-between items-center">
                        <span className="text-gray-300 capitalize">{place.replace('_', ' ')}</span>
                        <span className="text-white font-medium">{prize as string}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    View Leaderboard
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* How it Works */}
        <div className="mt-12 bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            How Competitions Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-purple-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-white mb-2">Spot Waves</h3>
              <p className="text-gray-400 text-sm">
                Identify cultural trends early and accurately to earn XP
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-white mb-2">Climb Rankings</h3>
              <p className="text-gray-400 text-sm">
                Earn more XP to climb the leaderboard and reach prize tiers
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-white mb-2">Win Prizes</h3>
              <p className="text-gray-400 text-sm">
                Top performers win exclusive badges, features, and recognition
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
echo -e "${GREEN}✓ Competitions page created${NC}"

# Step 5: Update package.json to remove Stripe dependencies
echo -e "${YELLOW}Step 5: Cleaning up package dependencies...${NC}"
cd web
npm uninstall stripe @stripe/stripe-js 2>/dev/null || true
cd ..
echo -e "${GREEN}✓ Dependencies cleaned${NC}"

# Step 6: Create migration completion marker
echo -e "${YELLOW}Step 6: Creating migration marker...${NC}"
touch .xp-migration-complete
echo "Migration completed on $(date)" > .xp-migration-complete
echo -e "${GREEN}✓ Migration marked complete${NC}"

echo ""
echo "==========================================="
echo -e "${GREEN}Transformation Complete!${NC}"
echo "==========================================="
echo ""
echo "✅ Database transformed to XP system"
echo "✅ Navigation updated with XP display"
echo "✅ Leaderboard page created"
echo "✅ Competitions page created"
echo "✅ Removed monetary dependencies"
echo ""
echo "Next steps:"
echo "1. Test the new XP system thoroughly"
echo "2. Announce the transformation to users"
echo "3. Set up your first competition prizes"
echo "4. Monitor user engagement with the new system"
echo ""
echo "Users are now Cultural Anthropologists earning XP!"
echo "Top performers compete for prizes based on rankings."
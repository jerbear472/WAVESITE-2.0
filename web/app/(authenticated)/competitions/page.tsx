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

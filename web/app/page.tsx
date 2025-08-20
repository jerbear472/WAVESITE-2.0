'use client';

import Link from 'next/link'
import WaveSightLogo from '@/components/WaveSightLogo'
import Header from '@/components/Header'
import { useState, useEffect } from 'react'

export default function Home() {
  const [liveActivity, setLiveActivity] = useState([
    { type: 'spike', text: '"Y2K digital camera trend" - predicted spike by @culturehunter', time: '2h ago', icon: '🔥' },
    { type: 'chain', text: 'Evolution chain completed: "NPC streaming → Robot GF → AI dating" (+500 XP to @memetic_mike)', time: '3h ago', icon: '🔗' },
    { type: 'leader', text: 'Current tournament leader: @sarah_sees (14,329 XP this month)', time: 'Live', icon: '🏆' },
    { type: 'trending', text: 'Trending prediction: "Loud budgeting" peaks by Friday (73% community agreement)', time: '5h ago', icon: '📈' }
  ])

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      
      {/* Hero Section */}
      <section className="relative flex items-center justify-center px-4 py-20 pt-32 min-h-[90vh]">
        <div className="text-center max-w-5xl mx-auto animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            See The Wave Before It Breaks
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-4 max-w-3xl mx-auto">
            The cultural intelligence platform where digital anthropologists track, predict, and map the evolution of human trends in real-time.
          </p>
          
          <p className="text-lg text-gray-500 dark:text-gray-500 mb-8 italic">
            Do you have WaveSight?
          </p>
          
          <Link 
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:scale-105 transition-transform shadow-xl"
          >
            Develop Your WaveSight
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          
          <p className="mt-4 text-sm text-gray-500">
            Join 1,000+ cultural analysts already calling the future
          </p>
        </div>
      </section>

      {/* Live Activity Bar */}
      <section className="bg-gray-900 text-white py-4 overflow-hidden">
        <div className="flex items-center gap-8 animate-scroll">
          <span className="text-yellow-400 font-semibold whitespace-nowrap">HAPPENING NOW:</span>
          {liveActivity.map((activity, i) => (
            <div key={i} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-2xl">{activity.icon}</span>
              <span className="text-sm">{activity.text}</span>
              <span className="text-xs text-gray-400">({activity.time})</span>
            </div>
          ))}
        </div>
      </section>

      {/* Opening Hook Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center">
            The Question That Changes Everything
          </h2>
          
          <div className="prose prose-lg mx-auto text-gray-600 dark:text-gray-400">
            <p className="text-xl mb-6">
              Every trend that moves markets, shapes culture, or breaks the internet follows predictable patterns.
            </p>
            
            <p className="text-lg mb-6">
              The Roman Empire memes. Stanley Cups. Girl Dinner. GameStop.<br/>
              They all started as whispers before becoming roars.
            </p>
            
            <p className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              What if you could see them coming?
            </p>
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Based on Actual Science, Not Guesswork
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
            <p className="text-lg mb-6 text-gray-600 dark:text-gray-400">
              In 1976, evolutionary biologist Richard Dawkins discovered that ideas evolve like genes — replicating, mutating, and competing for survival. He called them memes.
            </p>
            
            <p className="text-lg mb-6 text-gray-600 dark:text-gray-400">
              Today, we can track cultural evolution in real-time. Every TikTok trend, every viral moment, every market-moving sentiment is a meme fighting for survival.
            </p>
            
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              WaveSight is where digital anthropologists document these mutations in the wild.
            </p>
            
            <p className="text-lg mt-4 text-purple-600 dark:text-purple-400 font-medium">
              You're not just spotting trends. You're mapping cultural DNA.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Your Cultural Intelligence Workflow
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-t-4 border-blue-500">
              <div className="text-3xl mb-4">👁️</div>
              <h3 className="text-xl font-bold mb-3">1. Spot the Signal</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Find emerging trends before the algorithm does. If it's starting to replicate, document it.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-t-4 border-purple-500">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-xl font-bold mb-3">2. Track the Evolution</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Link mutations and variations. Show how trends spread from TikTok to Twitter to CNN. Earn massive XP for mapping evolution chains.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-t-4 border-green-500">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-xl font-bold mb-3">3. Predict the Peak</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Call when trends will explode or die. Stake your reputation on 48-hour spikes. Build a portfolio of accurate predictions.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-t-4 border-yellow-500">
              <div className="text-3xl mb-4">✅</div>
              <h3 className="text-xl font-bold mb-3">4. Prove Your Call</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Submit evidence of spikes. Let the community validate your predictions. Watch your accuracy score become your credential.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Competition Section */}
      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            This Isn't Work. It's Intellectual Sport.
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="text-xl font-bold mb-2 text-yellow-400">Monthly Tournaments</h3>
              <p className="text-gray-300">
                Top 10 analysts split the prize pool every month. Current pot: $1,000.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="text-xl font-bold mb-2 text-green-400">Live Leaderboards</h3>
              <p className="text-gray-300">
                Watch your rank rise with every accurate prediction. See who really has WaveSight.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">XP System</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Spot a trend: +10 XP</li>
                <li>• Link evolution: +50 XP</li>
                <li>• Predict correctly: +100 XP</li>
                <li>• Map complete chain: +500 XP</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-xl font-bold mb-2 text-red-400">48-Hour Spike Challenges</h3>
              <p className="text-gray-300">
                Predict explosive growth. Prove it with evidence. Build your reputation on accurate calls.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="text-xl font-bold mb-2 text-blue-400">Evolution Mapping</h3>
              <p className="text-gray-300">
                Be the first to show how trends mutate. Document the cultural genome. Earn massive recognition.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-white mb-2">Live Now:</p>
                <p className="text-lg text-gray-400">47 trends being tracked</p>
                <p className="text-lg text-gray-400">12 evolution chains forming</p>
                <p className="text-lg text-gray-400">239 predictions pending</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Proof Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            The First Wave of Analysts
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <p className="text-lg italic text-gray-700 dark:text-gray-300 mb-2">
                "Called the Roman Empire meme 3 weeks early. My WaveSight score is now part of my LinkedIn."
              </p>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                — Sarah K., Level 23 Analyst
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <p className="text-lg italic text-gray-700 dark:text-gray-300 mb-2">
                "Mapped 12 evolution chains last month. Won $300 in the tournament. This is addictively fun."
              </p>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                — Marcus T., August Champion
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
              <p className="text-lg italic text-gray-700 dark:text-gray-300 mb-2">
                "Finally, a place where overanalyzing TikTok is a valuable skill."
              </p>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                — Alex P., 87% Accuracy Rate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Your WaveSight Score Means Something
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4">Build a Public Portfolio</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Every correct prediction. Every evolution mapped. Every trend you called early. All verified and on record.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4">Earn Real Recognition</h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-2">
                <li>• Monthly champion titles</li>
                <li>• Accuracy percentages that matter</li>
                <li>• First-spotter credits on major trends</li>
                <li>• A reputation in the cultural intelligence community</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Join the Founding Analysts</h3>
            <p className="text-lg">
              The first 1,000 members are building something special. Your early contributions shape how humanity tracks culture.
            </p>
          </div>
        </div>
      </section>

      {/* Game Mechanics Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            How to Win at WaveSight
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-bold mb-2">Submit Quality Trends</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Find signals others miss. The community upvotes quality, downvotes noise.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-bold mb-2">Make Bold Predictions</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                "Peaks in 48 hours" | "Dies by Friday" | "Spreads to Twitter tomorrow"
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-bold mb-2">Prove Your Calls</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Submit evidence when trends spike. Link proof. Get validated.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-lg font-bold mb-2">Map Evolutions</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Connect the dots between mutations. Show how TikTok dances become Twitter memes become CNN segments.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-bold mb-2">Climb the Ranks</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Every accurate call increases your score. Every month, top performers split the prize pool.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-bold mb-2">Win Tournaments</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Monthly competitions. Real prizes. Eternal glory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            The Next Big Trend Is Forming Right Now
          </h2>
          
          <p className="text-lg text-center text-gray-600 dark:text-gray-400 mb-4">
            While you're reading this:
          </p>
          
          <div className="text-center mb-12">
            <p className="text-gray-700 dark:text-gray-300">• Someone is documenting tomorrow's viral moment</p>
            <p className="text-gray-700 dark:text-gray-300">• Someone is connecting evolution chains worth 500 XP</p>
            <p className="text-gray-700 dark:text-gray-300">• Someone is building an 80% accuracy rate</p>
            <p className="text-xl font-bold mt-4 text-gray-900 dark:text-white">That someone should be you.</p>
          </div>
          
          <h3 className="text-2xl font-bold mb-8 text-center">Start Free. Stay Free.</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border-2 border-blue-500">
              <h4 className="text-2xl font-bold mb-2">Analyst Account</h4>
              <p className="text-3xl font-bold text-blue-600 mb-4">Free Forever</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Submit unlimited trends</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Make predictions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Compete in tournaments</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Build your reputation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Access community feed</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Track your accuracy</span>
                </li>
              </ul>
              <Link href="/register" className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                Start Free
              </Link>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white rounded-2xl p-8 shadow-xl">
              <h4 className="text-2xl font-bold mb-2">Pro Analyst</h4>
              <p className="text-3xl font-bold mb-4">$29/month</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 mt-1">✓</span>
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 mt-1">✓</span>
                  <span>Advanced prediction windows</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 mt-1">✓</span>
                  <span>Personal API access</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 mt-1">✓</span>
                  <span>Priority validation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 mt-1">✓</span>
                  <span>Exclusive Pro tournaments</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 mt-1">✓</span>
                  <span>Enhanced analytics dashboard</span>
                </li>
              </ul>
              <Link href="/register?pro=true" className="block w-full text-center px-6 py-3 bg-white text-purple-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                Go Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Develop Your WaveSight
          </h2>
          
          <p className="text-xl mb-2">
            No payment required. No credit card needed.
          </p>
          <p className="text-xl mb-8">
            Just your ability to see patterns others miss.
          </p>
          
          <Link 
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-blue-600 rounded-xl font-bold text-xl hover:scale-105 transition-transform shadow-2xl"
          >
            Start Tracking Trends
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          
          <p className="mt-6 text-lg">
            Join 1,247 analysts already mapping the evolution of human culture.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">WaveSight</h3>
            <p className="text-gray-400">The Cultural Intelligence Platform</p>
            <p className="text-sm text-gray-500 mt-2">Track • Predict • Prove • Win</p>
            <p className="text-xs text-gray-600 mt-4 italic">Based on Richard Dawkins' theory of memetic evolution</p>
          </div>
          
          <div className="flex justify-center gap-8 mb-8">
            <Link href="/about" className="hover:text-blue-400 transition-colors">About</Link>
            <Link href="/how-it-works" className="hover:text-blue-400 transition-colors">How It Works</Link>
            <Link href="/leaderboard" className="hover:text-blue-400 transition-colors">Leaderboard</Link>
            <Link href="/blog" className="hover:text-blue-400 transition-colors">Blog</Link>
            <Link href="/api" className="hover:text-blue-400 transition-colors">API Docs</Link>
          </div>
          
          <div className="text-center pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-500 mb-2">
              For marketing teams and enterprises: 
              <Link href="/business" className="text-blue-400 hover:text-blue-300 ml-2">
                Learn about WaveSight for Business →
              </Link>
            </p>
            <p className="text-xs text-gray-600">
              © 2024 WaveSight. Seeing waves before they break.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
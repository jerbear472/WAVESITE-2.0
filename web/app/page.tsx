import Link from 'next/link'
import WaveSightLogo from '@/components/WaveSightLogo'
import Header from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-20 pt-32">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8">
            Wave<span className="text-gradient font-normal">Sight</span>
          </h1>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-4">
            The Community of Cultural Spotters
          </p>
          
          <p className="text-lg text-gray-500 dark:text-gray-500 mb-8 max-w-2xl mx-auto">
            Spot trends before they explode. Earn XP. Build your reputation.
          </p>
          
          {/* Community Highlight Box */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 mb-10 max-w-2xl mx-auto border border-purple-200 dark:border-purple-800">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-4xl">🌊</div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Join the Wave Spotters
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Track cultural movements • Predict viral content • Level up your spotting skills
                </p>
              </div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
            >
              Join the Community
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            
            <Link 
              href="/login"
              className="btn-secondary px-8 py-4 text-lg"
            >
              Sign In
            </Link>
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap justify-center items-center gap-8 mt-20 text-sm text-gray-500 dark:text-gray-500">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">1,000+</div>
              <div>Active Spotters</div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">5,000+</div>
              <div>Trends Spotted</div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">100K+</div>
              <div>XP Earned</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            How Wave<span className="text-gradient font-normal">Sight</span> Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="card card-hover">
              <div className="p-6 text-center">
                <div className="text-4xl mb-4">👁️</div>
                <h3 className="text-xl font-semibold mb-3">Spot Trends</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Find emerging content across social platforms
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-0.5">•</span>
                    <span>Identify viral potential early</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-0.5">•</span>
                    <span>Track lifecycle stages</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-0.5">•</span>
                    <span>Predict peak timing</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="p-6 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-semibold mb-3">Validate Together</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Community validates trend predictions
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">•</span>
                    <span>Vote on trend potential</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">•</span>
                    <span>Build sentiment scores</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">•</span>
                    <span>Track trend evolution</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="p-6 text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold mb-3">Earn Recognition</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Build your reputation as a spotter
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
                  <li className="flex items-start">
                    <span className="text-yellow-500 mr-2 mt-0.5">•</span>
                    <span>Earn XP for accuracy</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-500 mr-2 mt-0.5">•</span>
                    <span>Unlock achievement levels</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-500 mr-2 mt-0.5">•</span>
                    <span>Climb the leaderboard</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            Built for Cultural Intelligence
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="font-semibold mb-2">Trend Life Tracking</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor trends from emergence to peak
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold mb-2">Peak Predictions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Forecast when trends will reach maximum viral potential
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="font-semibold mb-2">Evolution Chains</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track how trends mutate and spread across platforms
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">💫</div>
              <h3 className="font-semibold mb-2">XP & Achievements</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Earn experience points and unlock spotter titles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            Ready to ride the wave?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Join the community catching tomorrow's trends today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
            >
              Start Spotting
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link 
              href="/about"
              className="btn-secondary px-8 py-4 text-lg"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-neutral-800">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <WaveSightLogo size="sm" showIcon={true} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 All rights reserved.
              </span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-gray-100 wave-accent">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-gray-100 wave-accent">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-gray-900 dark:hover:text-gray-100 wave-accent">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
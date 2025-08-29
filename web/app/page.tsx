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
          {/* Main Message */}
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6 leading-tight">
            See the wave before it breaks
          </h1>
          
          {/* Subtitle */}
          <p className="text-2xl md:text-3xl font-normal text-gray-600 dark:text-gray-400 mb-12">
            The App for people who spot trends first
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
            >
              Start Competing Now
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
          
          <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
            Join 1,000+ cultural analysts already calling the future
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            <span className="text-gradient font-normal">How to Win at WaveSight</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-4">👁️</div>
              <h3 className="text-lg font-semibold mb-3">SPOT</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See something catching on? Drop it here first.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-3">PREDICT</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Call when it peaks. 24 hours? 1 week? Place your bet.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-3">PROVE</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Time proves you right. Accuracy score goes up.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold mb-3">WIN</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Climb the leaderboard. Become a cultural oracle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Section */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            <span className="text-gradient font-normal">What You're Playing For</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="font-semibold mb-2">Monthly Prizes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Top spotters split $1,000 every month
              </p>
            </div>
            
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">⭐</div>
              <h3 className="font-semibold mb-2">Social Proof</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                "Called Winter Arc 3 weeks early" - verified on your profile
              </p>
            </div>
            
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">Accuracy Score</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your prediction track record, public and permanent
              </p>
            </div>
            
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold mb-2">Bragging Rights</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Proof you're culturally ahead of everyone else
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-12">
            <span className="text-gradient font-normal">Start Free Forever</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card p-8">
              <h3 className="text-xl font-semibold mb-2">FREE ACCOUNT</h3>
              <p className="text-3xl font-light mb-6">$0</p>
              
              <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Spot unlimited trends
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Make predictions
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Compete for prizes
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Build your reputation
                </li>
              </ul>
              
              <Link href="/register" className="btn-primary w-full text-center">
                Start Free
              </Link>
            </div>
            
            <div className="card p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-semibold mb-2">PRO</h3>
              <p className="text-3xl font-light mb-6">$29<span className="text-sm text-gray-500">/month</span></p>
              
              <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  API access
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Pro-only competitions
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Priority validation
                </li>
              </ul>
              
              <Link href="/register?pro=true" className="btn-secondary w-full text-center">
                Go Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            The future has a leaderboard.
          </h2>
          <p className="text-2xl md:text-3xl font-normal text-gray-800 dark:text-gray-200 mb-8">
            <span className="text-gradient">Where do you rank?</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
            >
              Start Competing Now
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
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-neutral-800">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <WaveSightLogo size="sm" showIcon={true} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 WaveSight. Seeing waves before they break.
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
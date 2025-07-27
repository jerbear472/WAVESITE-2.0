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
            Wave<span className="text-blue-600 font-normal">Sight</span>
          </h1>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-4">
            Spot trends before they break
          </p>
          
          <p className="text-lg text-gray-500 dark:text-gray-500 mb-12 max-w-2xl mx-auto">
            AI-powered analytics to identify viral content across social media platforms
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/dashboard"
              className="btn-primary px-8 py-4 text-lg hover-lift"
            >
              Get Started
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
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">500K+</div>
              <div>Active Users</div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">10M+</div>
              <div>Trends Tracked</div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">99.9%</div>
              <div>Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Modes Section */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            Two Ways to Use Wave<span className="text-gradient font-normal">Sight</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card card-hover">
              <div className="p-6">
                <div className="text-4xl mb-4 text-center">💰</div>
                <h3 className="text-xl font-semibold mb-3 text-center">User Mode</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-4">Earn money by spotting trends</p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Submit trending content you discover
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Validate other users' submissions
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Get paid for accurate predictions
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Track your earnings & performance
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="p-6">
                <div className="text-4xl mb-4 text-center">📊</div>
                <h3 className="text-xl font-semibold mb-3 text-center">Enterprise Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-4">Business analytics & insights</p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <span className="text-cyan-500 mr-2">✓</span>
                    View validated trend analytics
                  </li>
                  <li className="flex items-center">
                    <span className="text-cyan-500 mr-2">✓</span>
                    Access industry-specific insights
                  </li>
                  <li className="flex items-center">
                    <span className="text-cyan-500 mr-2">✓</span>
                    Export data & generate reports
                  </li>
                  <li className="flex items-center">
                    <span className="text-cyan-500 mr-2">✓</span>
                    API access for integration
                  </li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">
                  *Requires enterprise access via account settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA Section */}
      <section className="py-20">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            Ready to ride the wave?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of creators and brands using WaveSight
          </p>
          <Link 
            href="/register"
            className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
          >
            Start Free Trial
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
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
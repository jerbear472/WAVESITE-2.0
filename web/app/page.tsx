import Link from 'next/link'
import WaveLogo from '@/components/WaveLogo'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          {/* Logo and Title */}
          <div className="flex justify-center items-center gap-4 mb-8">
            <WaveLogo size={80} showTitle={false} />
            <h1 className="text-5xl md:text-7xl font-light tracking-tight">
              Wave<span className="text-gradient font-normal">Sight</span>
            </h1>
          </div>
          
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

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            Why Wave<span className="text-gradient font-normal">Sight</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card card-hover text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track engagement metrics across all major social platforms instantly
              </p>
            </div>
            
            <div className="card card-hover text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">AI Predictions</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our Wave Score™ algorithm predicts content virality with high accuracy
              </p>
            </div>
            
            <div className="card card-hover text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Early Detection</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Spot emerging trends hours or days before mainstream adoption
              </p>
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
              <WaveLogo size={24} showTitle={false} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 WaveSight. All rights reserved.
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
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
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6">
            See The Wave<br/>
            <span className="text-gradient font-normal">Before It Breaks</span>
          </h1>
          
          {/* Sub-hero */}
          <p className="text-2xl md:text-3xl font-normal text-gray-800 dark:text-gray-200 mb-8">
            The app for people who spot trends first.
          </p>
          
          <p className="text-lg text-gray-500 dark:text-gray-500 mb-8 max-w-2xl mx-auto italic">
            Do you have WaveSight?
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
            >
              Develop Your WaveSight
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

      {/* Science Section */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-12">
            Based on <span className="text-gradient font-normal">Actual Science</span>, Not Guesswork
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="card p-8">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                In 1976, evolutionary biologist Richard Dawkins discovered that ideas evolve like genes — replicating, mutating, and competing for survival. He called them memes.
              </p>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Today, we can track cultural evolution in real-time. Every TikTok trend, every viral moment, every market-moving sentiment is a meme fighting for survival.
              </p>
              
              <div className="border-l-4 border-gradient pl-6">
                <p className="text-lg font-normal text-gray-900 dark:text-gray-100 mb-2">
                  WaveSight is where digital anthropologists document these mutations in the wild.
                </p>
                <p className="text-gray-500 dark:text-gray-500 italic">
                  You're not just spotting trends. You're mapping cultural DNA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            <span className="text-gradient font-normal">How It Works</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-4">👁️</div>
              <h3 className="text-lg font-semibold mb-3">Spot the Signal</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Find emerging trends before the algorithm does. If it's starting to replicate, document it.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-lg font-semibold mb-3">Track the Evolution</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Link mutations and variations. Show how trends spread across platforms. Earn massive XP.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-3">Predict the Peak</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Call when trends will explode. Stake your reputation on 48-hour spikes.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-3">Prove Your Call</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Submit evidence. Get validated. Watch your accuracy score grow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Competition Section */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-16">
            The Future Has a <span className="text-wave-500 font-normal">Leaderboard</span>.
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="font-semibold mb-2">Monthly Tournaments</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Top 10 analysts split the prize pool every month. Current pot: $1,000.
              </p>
            </div>
            
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="font-semibold mb-2">Live Leaderboards</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Watch your rank rise with every accurate prediction.
              </p>
            </div>
            
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold mb-2">XP System</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Spot a trend</span>
                  <span className="font-mono">+10 XP</span>
                </div>
                <div className="flex justify-between">
                  <span>Link evolution</span>
                  <span className="font-mono">+50 XP</span>
                </div>
                <div className="flex justify-between">
                  <span>Predict correctly</span>
                  <span className="font-mono">+100 XP</span>
                </div>
                <div className="flex justify-between">
                  <span>Map complete chain</span>
                  <span className="font-mono">+500 XP</span>
                </div>
              </div>
            </div>
            
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold mb-2">48-Hour Spike Challenges</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Predict explosive growth. Prove it with evidence. Build your reputation.
              </p>
            </div>
            
            <div className="card card-hover p-6">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="font-semibold mb-2">Evolution Mapping</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Be the first to show how trends mutate. Document the cultural genome.
              </p>
            </div>
            
            <div className="card card-hover p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <h3 className="font-semibold mb-3">Live Now</h3>
              <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                <p>47 trends being tracked</p>
                <p>12 evolution chains forming</p>
                <p>239 predictions pending</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition Section */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-12">
            Your WaveSight Score <span className="text-gradient font-normal">Means Something</span>
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="card p-6">
                <h3 className="font-semibold mb-3">Build a Public Portfolio</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Every correct prediction. Every evolution mapped. Every trend you called early. All verified and on record.
                </p>
              </div>
              
              <div className="card p-6">
                <h3 className="font-semibold mb-3">Earn Real Recognition</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li>• Monthly champion titles</li>
                  <li>• Accuracy percentages that matter</li>
                  <li>• First-spotter credits on major trends</li>
                  <li>• A reputation in the cultural intelligence community</li>
                </ul>
              </div>
            </div>
            
            <div className="card bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-8 text-center">
              <h3 className="text-xl font-semibold mb-3">Join the Founding Analysts</h3>
              <p className="text-gray-600 dark:text-gray-400">
                The first 1,000 members are building something special.<br/>
                Your early contributions shape how humanity tracks culture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-12">
            Start Free. <span className="text-gradient font-normal">Stay Free.</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card p-8">
              <h3 className="text-xl font-semibold mb-2">Analyst Account</h3>
              <p className="text-3xl font-light mb-6">Free <span className="text-sm text-gray-500">forever</span></p>
              
              <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Submit unlimited trends
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Make predictions
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Compete in tournaments
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Build your reputation
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Access community feed
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Track your accuracy
                </li>
              </ul>
              
              <Link href="/register" className="btn-primary w-full text-center">
                Start Free
              </Link>
            </div>
            
            <div className="card p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-semibold mb-2">Pro Analyst</h3>
              <p className="text-3xl font-light mb-6">$29 <span className="text-sm text-gray-500">/month</span></p>
              
              <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Everything in Free
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Advanced prediction windows
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Personal API access
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Priority validation
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Exclusive Pro tournaments
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">✓</span>
                  Enhanced analytics dashboard
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
            Ready to develop your <span className="text-gradient font-normal">WaveSight</span>?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            No payment required. No credit card needed.<br/>
            Just your ability to see patterns others miss.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register"
              className="btn-primary px-8 py-4 text-lg hover-lift inline-flex items-center gap-2"
            >
              Start Tracking Trends
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
          <p className="mt-8 text-sm text-gray-500">
            Join 1,247 analysts already mapping the evolution of human culture.
          </p>
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
            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
              <span className="text-gray-500 dark:text-gray-500 italic">
                Based on Richard Dawkins' theory of memetic evolution
              </span>
              <div className="flex gap-6 text-gray-600 dark:text-gray-400">
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
        </div>
      </footer>
    </div>
  )
}
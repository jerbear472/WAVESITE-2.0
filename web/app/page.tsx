import Link from 'next/link'
import WaveLogo from '@/components/WaveLogo'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background waves */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full">
          <svg className="w-full h-full" viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="url(#gradient1)"
              fillOpacity="0.3"
              d="M0,256L48,240C96,224,192,192,288,197.3C384,203,480,245,576,250.7C672,256,768,224,864,224C960,224,1056,256,1152,261.3C1248,267,1344,245,1392,234.7L1440,224L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
              className="animate-wave"
            />
            <path
              fill="url(#gradient2)"
              fillOpacity="0.2"
              d="M0,320L48,309.3C96,299,192,277,288,277.3C384,277,480,299,576,304C672,309,768,299,864,282.7C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
              className="animate-wave animation-delay-2000"
            />
            <path
              fill="url(#gradient3)"
              fillOpacity="0.1"
              d="M0,160L48,181.3C96,203,192,245,288,234.7C384,224,480,160,576,154.7C672,149,768,203,864,213.3C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
              className="animate-wave animation-delay-4000"
            />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0080ff" />
                <stop offset="100%" stopColor="#0066cc" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4da8ff" />
                <stop offset="100%" stopColor="#0080ff" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00a6ff" />
                <stop offset="100%" stopColor="#4da8ff" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-2 h-2 bg-wave-400 rounded-full animate-float top-1/4 left-1/4 opacity-30"></div>
        <div className="absolute w-3 h-3 bg-wave-300 rounded-full animate-float animation-delay-2000 top-1/3 right-1/3 opacity-20"></div>
        <div className="absolute w-2 h-2 bg-wave-500 rounded-full animate-float animation-delay-4000 bottom-1/4 left-1/3 opacity-25"></div>
        <div className="absolute w-4 h-4 bg-wave-400 rounded-full animate-float top-3/4 right-1/4 opacity-15"></div>
      </div>

      <div className="text-center z-10 px-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center gap-6 mb-16 relative">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-wave-500/20 rounded-full animate-pulse"></div>
            <WaveLogo size={140} animated={true} className="wave-glow relative z-10" showTitle={false} />
          </div>
          <h1 className="text-5xl md:text-6xl font-light tracking-[0.3em] bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent uppercase futuristic-title">
            WAVESITE
          </h1>
        </div>
        
        <p className="text-2xl md:text-3xl text-wave-200 mb-4 max-w-2xl mx-auto font-light">
          Ride the wave of trends before they break
        </p>
        
        <p className="text-lg text-wave-300/70 mb-10 max-w-xl mx-auto">
          Harness AI-powered insights to spot viral trends across social media platforms
        </p>
        
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              href="/dashboard"
              className="inline-block wave-button text-lg px-10 py-4 wave-glow"
            >
              <span className="relative z-10">Launch Dashboard →</span>
            </Link>
            
            <Link 
              href="/login"
              className="inline-block px-10 py-4 text-lg font-medium text-wave-300 hover:text-wave-100 border border-wave-600/40 hover:border-wave-500/60 rounded-xl transition-all hover:bg-wave-800/20"
            >
              Sign In
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-wave-400 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Live Tracking
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              AI Analytics
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
              Smart Alerts
            </span>
          </div>
        </div>
        
        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-4xl mx-auto">
          <div className="wave-card p-6 group hover:scale-[1.02] transition-all duration-300">
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📊</div>
            <h3 className="text-lg text-wave-200 font-semibold mb-2">Real-Time Analytics</h3>
            <p className="text-wave-400 text-sm">Track engagement metrics across platforms</p>
          </div>
          
          <div className="wave-card p-6 group hover:scale-[1.02] transition-all duration-300">
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🌊</div>
            <h3 className="text-lg text-wave-200 font-semibold mb-2">Wave Score™</h3>
            <p className="text-wave-400 text-sm">AI algorithm predicts content virality</p>
          </div>
          
          <div className="wave-card p-6 group hover:scale-[1.02] transition-all duration-300">
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🚀</div>
            <h3 className="text-lg text-wave-200 font-semibold mb-2">Early Detection</h3>
            <p className="text-wave-400 text-sm">Spot trends before mainstream adoption</p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-20 py-6 border-t border-wave-700/10">
          <p className="text-wave-500/60 text-xs mb-4">Trusted by leading brands and content creators worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-6 text-wave-500/50">
            <div className="text-sm font-medium">500K+ Users</div>
            <div className="w-1 h-4 bg-wave-600/20 hidden sm:block"></div>
            <div className="text-sm font-medium">10M+ Trends Tracked</div>
            <div className="w-1 h-4 bg-wave-600/20 hidden sm:block"></div>
            <div className="text-sm font-medium">99.9% Uptime</div>
          </div>
        </div>
      </div>
    </div>
  )
}
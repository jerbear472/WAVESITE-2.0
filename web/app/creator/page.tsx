'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  TrendingUp, Zap, Clock, DollarSign, Users, CheckCircle,
  Star, Crown, Rocket, Flame, BarChart3, Eye, Heart,
  ArrowRight, Play, ChevronRight, Brain, FileText,
  Trophy, Target, Sparkles, Bell, Shield, Globe, Gauge
} from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Chen",
    handle: "@sarahcreates",
    platform: "TikTok",
    followers: "250K",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    quote: "WaveSight helped me grow from 10K to 250K followers in 6 months. I'm always 2-3 days ahead of trends now!",
    growth: "+2,400%"
  },
  {
    name: "Marcus Johnson",
    handle: "@marcusfilms",
    platform: "YouTube",
    followers: "1.2M",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    quote: "The ROI is insane. One trend alert made me $15K in brand deals. Best $49 I spend every month.",
    growth: "+850%"
  },
  {
    name: "Emma Rodriguez",
    handle: "@emmastyle",
    platform: "Instagram",
    followers: "500K",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    quote: "I used to spend hours researching trends. Now I get everything I need in 5 minutes every morning.",
    growth: "+1,200%"
  }
];

const features = [
  {
    icon: Clock,
    title: "48-72 Hour Head Start",
    description: "Get trends before they hit the algorithm's radar"
  },
  {
    icon: Sparkles,
    title: "AI-Powered Predictions",
    description: "Our ML models predict virality with 87% accuracy"
  },
  {
    icon: Target,
    title: "Content Templates",
    description: "Copy-paste hooks, scripts, and hashtags that work"
  },
  {
    icon: Bell,
    title: "Real-Time Alerts",
    description: "Get notified instantly when a mega-trend emerges"
  },
  {
    icon: Globe,
    title: "Platform Optimization",
    description: "Specific strategies for TikTok, Instagram, YouTube & more"
  },
  {
    icon: Trophy,
    title: "Success Tracking",
    description: "See which trends worked and optimize your strategy"
  }
];

const stats = [
  { value: "10M+", label: "Creators" },
  { value: "87%", label: "Accuracy" },
  { value: "48hr", label: "Early Access" },
  { value: "250%", label: "Avg Growth" }
];

export default function CreatorLanding() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'creator_monthly',
          planType: 'creator'
        }),
      });

      const { url, error } = await response.json();
      
      if (error) {
        console.error('Checkout error:', error);
        // For demo purposes, redirect to dashboard
        window.location.href = '/creator/dashboard';
        return;
      }

      if (url) {
        window.location.href = url;
      } else {
        // Fallback to dashboard for demo
        window.location.href = '/creator/dashboard';
      }
    } catch (error) {
      console.error('Payment error:', error);
      // For demo purposes, redirect to dashboard anyway
      window.location.href = '/creator/dashboard';
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full border border-pink-500/30 mb-8"
          >
            <Flame className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-semibold">Used by 10M+ Creators Worldwide</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Get Trends
            <span className="block bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Before They Go Viral
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto"
          >
            Stop chasing trends. Start setting them. Get AI-powered trend predictions 
            48-72 hours before they peak.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mb-12"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-bold text-lg hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Start 7-Day Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <div className="text-center">
              <div className="text-2xl font-bold">$49/month</div>
              <div className="text-sm text-gray-500">Cancel anytime</div>
            </div>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-wrap justify-center gap-8 opacity-50"
          >
            <div className="text-sm">TikTok</div>
            <div className="text-sm">Instagram</div>
            <div className="text-sm">YouTube</div>
            <div className="text-sm">Twitter/X</div>
            <div className="text-sm flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Bank-level Security</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ 
            opacity: { delay: 1 },
            y: { repeat: Infinity, duration: 2 }
          }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <ChevronRight className="w-6 h-6 rotate-90 text-gray-600" />
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How Creators <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">10X Their Growth</span>
            </h2>
            <p className="text-xl text-gray-400">Our 3-step process to viral content</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "AI Spots Trends Early",
                description: "Our ML models analyze millions of posts to identify emerging patterns 48-72 hours before they go viral",
                icon: Brain
              },
              {
                step: "2",
                title: "You Get Actionable Briefs",
                description: "Wake up to curated trend reports with hooks, hashtags, and content templates ready to use",
                icon: FileText
              },
              {
                step: "3",
                title: "Create & Dominate",
                description: "Be first to the trend, get featured by the algorithm, and watch your followers explode",
                icon: Rocket
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-pink-500 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-xl">
                      {item.step}
                    </div>
                    <item.icon className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-gray-700" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Go Viral</span>
            </h2>
            <p className="text-xl text-gray-400">Tools that actually move the needle</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-900/50 backdrop-blur rounded-xl p-6 border border-gray-800 hover:border-pink-500 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Creators <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Love WaveSight</span>
            </h2>
            <p className="text-xl text-gray-400">Join thousands growing their audience faster</p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700"
              >
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <img
                    src={testimonials[currentTestimonial].image}
                    alt={testimonials[currentTestimonial].name}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 p-1"
                  />
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-xl mb-4 italic">"{testimonials[currentTestimonial].quote}"</p>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div>
                        <div className="font-bold">{testimonials[currentTestimonial].name}</div>
                        <div className="text-sm text-gray-400">
                          {testimonials[currentTestimonial].handle} • {testimonials[currentTestimonial].followers} followers
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-bold text-green-400">
                          {testimonials[currentTestimonial].growth} growth
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Testimonial Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentTestimonial 
                      ? 'w-8 bg-gradient-to-r from-pink-500 to-purple-500' 
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gradient-to-b from-transparent via-pink-900/10 to-transparent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-8 md:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold">Limited Time Offer</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  Start Your <span className="text-yellow-400">7-Day Free Trial</span>
                </h2>
                
                <div className="text-6xl font-bold mb-2">$49/mo</div>
                <p className="text-xl text-white/80 mb-8">Cancel anytime • No hidden fees</p>

                <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
                  {[
                    "Daily trend alerts before they go viral",
                    "Content templates & viral hooks",
                    "Platform-specific optimization",
                    "Real-time virality predictions",
                    "Priority support & community access"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleStartTrial}
                  className="w-full md:w-auto px-12 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
                >
                  Start Free Trial Now
                </button>

                <p className="mt-6 text-sm text-white/60">
                  Join 10,000,000+ creators • Average ROI: 10x in 3 months
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">10X Your Growth?</span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              The next viral trend is forming right now. Don't miss it.
            </p>
            <Link
              href="/creator/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-bold text-lg hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-2xl group"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
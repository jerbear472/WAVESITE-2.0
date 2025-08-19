'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, TrendingUp, AlertCircle, Star, Target, Zap, Award } from 'lucide-react';

interface TrendExample {
  title: string;
  platform: string;
  description: string;
  category: string;
  isGood: boolean;
  reasons: string[];
  earnings: string;
}

const goodExamples: TrendExample[] = [
  {
    title: "Dupe perfume brands going viral",
    platform: "TikTok",
    description: "Alt fragrance, Dossier, and other dupe perfume brands are exploding on TikTok. Creators comparing $30 dupes to $300 designer perfumes. #DupePerfume has 89M views and growing 50% weekly.",
    category: "Consumer Goods",
    isGood: true,
    reasons: [
      "Specific trend with clear metrics (89M views)",
      "Includes growth rate (50% weekly)",
      "Names specific brands and products",
      "Clear value proposition (price comparison)",
      "Actionable for businesses"
    ],
    earnings: "$0.10"
  },
  {
    title: "Silent walking trend replacing podcast walks",
    platform: "Instagram",
    description: "Gen Z embracing 'silent walking' - walking without music/podcasts for mental health. Major influencers promoting it. 12M+ posts in past week. Searches for 'mindful walking' up 300%.",
    category: "Wellness",
    isGood: true,
    reasons: [
      "Emerging behavioral shift",
      "Specific metrics and search data",
      "Clear demographic (Gen Z)",
      "Cross-platform validation",
      "Timely and measurable"
    ],
    earnings: "$0.10"
  },
  {
    title: "AI yearbook photos trending",
    platform: "Multiple",
    description: "Epik app's AI yearbook feature viral across platforms. 5M+ downloads this week. Users paying $5.99 for retro AI photos. Competing apps rushing to launch similar features.",
    category: "Technology",
    isGood: true,
    reasons: [
      "Specific app and feature identified",
      "Download metrics provided",
      "Revenue model clear ($5.99)",
      "Market impact noted (competitors reacting)",
      "Time-sensitive opportunity"
    ],
    earnings: "$0.10"
  }
];

const badExamples: TrendExample[] = [
  {
    title: "Fashion is trending",
    platform: "TikTok",
    description: "Fashion videos are popular on TikTok right now. Lots of people posting outfits.",
    category: "Fashion",
    isGood: false,
    reasons: [
      "Too vague and generic",
      "No specific metrics or data",
      "Fashion is always 'trending'",
      "No actionable insights",
      "Missing specific brands or styles"
    ],
    earnings: "$0.00"
  },
  {
    title: "New meme format",
    platform: "Twitter",
    description: "Saw a funny meme. It might go viral. People seem to like it.",
    category: "Memes",
    isGood: false,
    reasons: [
      "No specific meme identified",
      "No engagement metrics",
      "Speculation without evidence",
      "Too early/uncertain",
      "Not useful for businesses"
    ],
    earnings: "$0.00"
  },
  {
    title: "Taylor Swift",
    platform: "Instagram",
    description: "Taylor Swift posted something and fans are talking about it.",
    category: "Celebrity",
    isGood: false,
    reasons: [
      "Celebrity news, not a trend",
      "No specific trend or behavior",
      "Expected fan reaction",
      "No business application",
      "Missing context and metrics"
    ],
    earnings: "$0.00"
  }
];

export default function LearnPage() {
  const [selectedTab, setSelectedTab] = useState<'good' | 'bad'>('good');
  const [expandedExample, setExpandedExample] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
            <Award className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Learn to Spot Quality Trends
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Master the art of trend spotting and earn more with high-quality submissions
          </p>
        </div>

        {/* Key Principles */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-600" />
            The 5 Pillars of Quality Trends
          </h2>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { icon: "📊", title: "Specific Metrics", desc: "Include views, growth rates, engagement" },
              { icon: "⏰", title: "Timeliness", desc: "Catch trends early, not when everyone knows" },
              { icon: "🎯", title: "Actionable", desc: "Useful for businesses and creators" },
              { icon: "📈", title: "Evidence", desc: "Back claims with data and examples" },
              { icon: "🔍", title: "Context", desc: "Explain why it matters and who cares" }
            ].map((pillar, idx) => (
              <div key={idx} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl mb-2">{pillar.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{pillar.title}</h3>
                <p className="text-sm text-gray-600">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Examples Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Study Real Examples
            </h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedTab('good')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  selectedTab === 'good'
                    ? 'bg-green-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Good Examples
              </button>
              <button
                onClick={() => setSelectedTab('bad')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  selectedTab === 'bad'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <XCircle className="w-4 h-4 inline mr-2" />
                Bad Examples
              </button>
            </div>
          </div>

          {/* Examples Grid */}
          <div className="space-y-4">
            {(selectedTab === 'good' ? goodExamples : badExamples).map((example, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-xl p-6 transition-all cursor-pointer ${
                  example.isGood 
                    ? 'border-green-200 bg-green-50/50 hover:border-green-300' 
                    : 'border-red-200 bg-red-50/50 hover:border-red-300'
                } ${expandedExample === idx ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setExpandedExample(expandedExample === idx ? null : idx)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-white rounded-md text-xs font-medium text-gray-700">
                        {example.platform}
                      </span>
                      <span className="px-2 py-1 bg-white rounded-md text-xs font-medium text-gray-700">
                        {example.category}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        example.isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        Potential: {example.earnings}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {example.title}
                    </h3>
                    <p className="text-gray-700">{example.description}</p>
                  </div>
                  <div className={`ml-4 ${example.isGood ? 'text-green-500' : 'text-red-500'}`}>
                    {example.isGood ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : (
                      <XCircle className="w-8 h-8" />
                    )}
                  </div>
                </div>

                {/* Expanded Reasons */}
                {expandedExample === idx && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {example.isGood ? 'Why this is good:' : 'Why this needs improvement:'}
                    </h4>
                    <ul className="space-y-1">
                      {example.reasons.map((reason, ridx) => (
                        <li key={ridx} className="flex items-start">
                          <span className={`mr-2 mt-1 ${
                            example.isGood ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {example.isGood ? '✓' : '✗'}
                          </span>
                          <span className="text-sm text-gray-700">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-sm p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Zap className="w-6 h-6 mr-2" />
            Pro Tips for Maximum Earnings
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-blue-100">DO Submit:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <Star className="w-4 h-4 mr-2 mt-0.5 text-yellow-300" />
                  <span>Trends with less than 2 weeks of momentum</span>
                </li>
                <li className="flex items-start">
                  <Star className="w-4 h-4 mr-2 mt-0.5 text-yellow-300" />
                  <span>Specific products, brands, or behaviors going viral</span>
                </li>
                <li className="flex items-start">
                  <Star className="w-4 h-4 mr-2 mt-0.5 text-yellow-300" />
                  <span>Cross-platform trends with growing metrics</span>
                </li>
                <li className="flex items-start">
                  <Star className="w-4 h-4 mr-2 mt-0.5 text-yellow-300" />
                  <span>Niche trends in specific communities</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-blue-100">DON'T Submit:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 text-red-300" />
                  <span>Old news everyone already knows</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 text-red-300" />
                  <span>Vague observations without data</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 text-red-300" />
                  <span>Celebrity gossip or one-time events</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 text-red-300" />
                  <span>Personal opinions without evidence</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/learn/quiz"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <Award className="w-5 h-5 mr-2" />
            Take the Trend Quiz
          </Link>
          <Link
            href="/scroll"
            className="inline-flex items-center justify-center px-8 py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            Start Spotting Trends
          </Link>
        </div>
      </div>
    </div>
  );
}
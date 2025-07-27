'use client';

import { useState } from 'react';
import Timeline from '@/components/Timeline';
import { motion } from 'framer-motion';
import { 
  Calendar,
  Shuffle,
  Settings,
  Code2,
  Palette,
  Layers
} from 'lucide-react';

// Sample data for demonstration
const sampleTimelineData = [
  {
    id: '1',
    date: new Date().toISOString(),
    title: 'AI-Generated Fashion Trends Taking Over TikTok',
    description: 'Users are using AI to create unique fashion combinations that are going viral',
    category: 'visual_style',
    status: 'viral' as const,
    thumbnail: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=300&fit=crop',
    url: 'https://tiktok.com',
    creator: {
      handle: '@fashionai',
      name: 'Fashion AI Creator',
      platform: 'tiktok'
    },
    engagement: {
      likes: 125000,
      comments: 8400,
      shares: 3200,
      views: 890000
    },
    hashtags: ['AIFashion', 'TechStyle', 'FutureFashion'],
    earnings: 0.10,
    viralityScore: 9,
    validations: 42
  },
  {
    id: '2',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    title: 'Lo-fi Study Beats with Rain Sounds',
    description: 'A new wave of study music combining lo-fi beats with natural rain sounds',
    category: 'audio_music',
    status: 'approved' as const,
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    url: 'https://youtube.com',
    creator: {
      handle: '@lofibeats',
      name: 'Lofi Beats Channel',
      platform: 'youtube'
    },
    engagement: {
      likes: 45000,
      comments: 2100,
      shares: 890,
      views: 230000
    },
    hashtags: ['LofiBeats', 'StudyMusic', 'RainSounds'],
    earnings: 0.10,
    viralityScore: 7,
    validations: 28
  },
  {
    id: '3',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Vertical Split-Screen Storytelling',
    description: 'Creators using split screens to tell parallel stories simultaneously',
    category: 'creator_technique',
    status: 'validating' as const,
    thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=300&fit=crop',
    url: 'https://instagram.com',
    creator: {
      handle: '@storyteller',
      name: 'Visual Storyteller',
      platform: 'instagram'
    },
    engagement: {
      likes: 12000,
      comments: 450,
      shares: 230,
      views: 67000
    },
    hashtags: ['SplitScreen', 'VisualStorytelling', 'CreativeEdit'],
    earnings: 0.10,
    viralityScore: 6,
    validations: 15
  },
  {
    id: '4',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'The "Wrong Answers Only" Meme Format',
    description: 'People posting obviously wrong answers to simple questions for comedic effect',
    category: 'meme_format',
    status: 'approved' as const,
    thumbnail: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=400&h=300&fit=crop',
    url: 'https://twitter.com',
    creator: {
      handle: '@memecreator',
      name: 'Meme Master',
      platform: 'twitter'
    },
    engagement: {
      likes: 89000,
      comments: 12000,
      shares: 4500,
      views: 450000
    },
    hashtags: ['WrongAnswersOnly', 'MemeTrend', 'Comedy'],
    earnings: 0.10,
    viralityScore: 8,
    validations: 36
  },
  {
    id: '5',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Sustainable Fashion Haul Reviews',
    description: 'Influencers reviewing eco-friendly fashion brands and thrift finds',
    category: 'product_brand',
    status: 'submitted' as const,
    thumbnail: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop',
    url: 'https://youtube.com',
    creator: {
      handle: '@ecofashion',
      name: 'Eco Fashion Guru',
      platform: 'youtube'
    },
    engagement: {
      likes: 5600,
      comments: 340,
      shares: 120,
      views: 28000
    },
    hashtags: ['SustainableFashion', 'ThriftHaul', 'EcoStyle'],
    earnings: 0.10,
    viralityScore: 5,
    validations: 8
  }
];

export default function TimelineDemoPage() {
  const [variant, setVariant] = useState<'default' | 'compact' | 'detailed'>('default');
  const [showConnector, setShowConnector] = useState(true);
  const [animated, setAnimated] = useState(true);
  const [data, setData] = useState(sampleTimelineData);

  const shuffleData = () => {
    setData([...data].sort(() => Math.random() - 0.5));
  };

  const randomizeStatus = () => {
    const statuses = ['submitted', 'validating', 'approved', 'viral', 'rejected'] as const;
    setData(data.map(item => ({
      ...item,
      status: statuses[Math.floor(Math.random() * statuses.length)]
    })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
                  Timeline Component Demo
                </h1>
                <p className="text-gray-400 mt-1">Explore different timeline variants and options</p>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={shuffleData}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 border border-white/10"
                  title="Shuffle order"
                >
                  <Shuffle className="w-5 h-5 text-white" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={randomizeStatus}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 border border-white/10"
                  title="Randomize status"
                >
                  <Palette className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Variant Selector */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Timeline Variant</label>
                <div className="flex bg-white/5 backdrop-blur-md rounded-lg p-1 border border-white/10">
                  <button
                    onClick={() => setVariant('compact')}
                    className={`flex-1 p-2 rounded-md transition-all text-sm ${
                      variant === 'compact' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    onClick={() => setVariant('default')}
                    className={`flex-1 p-2 rounded-md transition-all text-sm ${
                      variant === 'default' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Default
                  </button>
                  <button
                    onClick={() => setVariant('detailed')}
                    className={`flex-1 p-2 rounded-md transition-all text-sm ${
                      variant === 'detailed' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Detailed
                  </button>
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Options</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                    <input
                      type="checkbox"
                      checked={showConnector}
                      onChange={(e) => setShowConnector(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">Connector</span>
                  </label>
                  
                  <label className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                    <input
                      type="checkbox"
                      checked={animated}
                      onChange={(e) => setAnimated(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">Animated</span>
                  </label>
                </div>
              </div>

              {/* Info */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Component Info</label>
                <div className="flex items-center gap-3 px-3 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
                  <Code2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">{data.length} items</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-300">{variant} variant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Timeline 
          items={data}
          variant={variant}
          showConnector={showConnector && variant !== 'compact'}
          animated={animated}
        />
      </div>

      {/* Code Example */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            Usage Example
          </h3>
          <pre className="text-sm text-gray-300 overflow-x-auto">
            <code>{`import Timeline from '@/components/Timeline';

// Your timeline data
const timelineItems = [
  {
    id: '1',
    date: '2024-01-15T10:30:00Z',
    title: 'Trend Title',
    description: 'Optional description',
    category: 'visual_style',
    status: 'viral',
    thumbnail: 'image-url.jpg',
    creator: {
      handle: '@username',
      platform: 'tiktok'
    },
    engagement: {
      likes: 125000,
      comments: 8400,
      shares: 3200,
      views: 890000
    },
    hashtags: ['trending', 'viral'],
    earnings: 0.10,
    viralityScore: 9
  }
  // ... more items
];

// Using the Timeline component
<Timeline 
  items={timelineItems}
  variant="${variant}" // 'default' | 'compact' | 'detailed'
  showConnector={${showConnector}}
  animated={${animated}}
/>`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
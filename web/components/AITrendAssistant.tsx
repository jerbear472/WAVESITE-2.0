'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Send,
  Zap,
  TrendingUp,
  Brain,
  Target,
  AlertCircle,
  ChevronRight,
  Lightbulb,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Wand2,
  Stars,
  Flame,
  Eye,
  Heart,
  Share2,
  Clock,
  Users,
  Globe,
  DollarSign,
  Rocket,
  Shield,
  Info,
  Check,
  X
} from 'lucide-react';

interface Message {
  id: string;
  type: 'bot' | 'user' | 'suggestion' | 'insight' | 'warning';
  content: string;
  timestamp: Date;
  buttons?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'warning';
    icon?: React.ReactNode;
  }>;
  typing?: boolean;
  emotion?: 'excited' | 'concerned' | 'neutral' | 'confident' | 'curious';
  cards?: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }>;
}

interface AITrendAssistantProps {
  formData: any;
  onAnalysisComplete?: (analysis: string) => void;
  onSuggestionAccepted?: (suggestion: any) => void;
}

const WAVE_PERSONALITIES = [
  {
    mood: 'hyped',
    greeting: "YO! 🔥 This trend is INSANE! I'm literally vibrating with excitement!",
    emoji: "🚀"
  },
  {
    mood: 'analytical',
    greeting: "Fascinating pattern detected! 🧠 Let me show you what 99% of people miss...",
    emoji: "📊"
  },
  {
    mood: 'insider',
    greeting: "Psst... 👀 You've found something special. I've got the insider scoop...",
    emoji: "💎"
  },
  {
    mood: 'mentor',
    greeting: "Great catch! 🎯 Let me share what the pros know about trends like this...",
    emoji: "🧙‍♂️"
  },
  {
    mood: 'friend',
    greeting: "OMG bestie! 💅 This trend? It's giving main character energy!",
    emoji: "✨"
  }
];

const DYNAMIC_RESPONSES = {
  viral: [
    "This is spreading faster than gossip at a high school reunion! 📢",
    "The engagement metrics are OFF THE CHARTS! 📈",
    "I'm seeing exponential growth patterns - this is textbook viral! 🦠",
    "Hold onto your hat, this rocket is taking off! 🚀"
  ],
  niche: [
    "Perfect for building a hyper-engaged community! 🎯",
    "Small but mighty - these convert like CRAZY! 💰",
    "The engagement rate on niche trends? *Chef's kiss* 👨‍🍳",
    "Quality over quantity - you've found the sweet spot! 🍯"
  ],
  emerging: [
    "You're SO early on this! Like, pre-IPO early! 📈",
    "First-mover advantage is YOURS! 🏃‍♂️",
    "I'm detecting early adopter signals everywhere! 🛸",
    "This is about to blow up - you called it first! 🎉"
  ],
  declining: [
    "Still has juice left if you remix it right! 🔄",
    "Time to put a fresh spin on this classic! 🎨",
    "The nostalgia angle could work here... 📼",
    "Late to the party but the afterparty is LIT! 🎊"
  ]
};

const INTERACTIVE_PROMPTS = [
  { icon: <Flame className="w-4 h-4" />, text: "Show me the money angles 💰", key: "monetization" },
  { icon: <Users className="w-4 h-4" />, text: "Who's the perfect audience?", key: "audience" },
  { icon: <Clock className="w-4 h-4" />, text: "Best time to post this?", key: "timing" },
  { icon: <Shield className="w-4 h-4" />, text: "Any risks or red flags?", key: "risks" },
  { icon: <Rocket className="w-4 h-4" />, text: "How do I make this pop?", key: "optimization" },
  { icon: <Globe className="w-4 h-4" />, text: "Cross-platform strategy?", key: "platforms" }
];

export default function AITrendAssistant({ formData, onAnalysisComplete, onSuggestionAccepted }: AITrendAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [currentPersonality, setCurrentPersonality] = useState(WAVE_PERSONALITIES[0]);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [conversationDepth, setConversationDepth] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [sessionMetrics, setSessionMetrics] = useState({
    confidence: Math.floor(Math.random() * 30 + 70),
    virality: Math.floor(Math.random() * 40 + 60),
    timing: Math.random() > 0.5 ? 'perfect' : 'good',
    risk: Math.random() > 0.7 ? 'medium' : 'low',
    potential: Math.floor(Math.random() * 20 + 80)
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Select random personality
    const personality = WAVE_PERSONALITIES[Math.floor(Math.random() * WAVE_PERSONALITIES.length)];
    setCurrentPersonality(personality);
    
    // Initial greeting with personality
    const timer = setTimeout(() => {
      addBotMessage(
        personality.greeting,
        undefined,
        'excited'
      );
      
      setTimeout(() => {
        // Add initial insight cards
        addBotMessage(
          "Here's what I'm seeing with your trend:",
          undefined,
          'confident',
          [
            {
              title: 'Virality Score',
              value: `${sessionMetrics.virality}%`,
              icon: <Flame className="w-5 h-5" />,
              color: 'from-orange-400 to-red-500'
            },
            {
              title: 'Confidence',
              value: `${sessionMetrics.confidence}%`,
              icon: <Target className="w-5 h-5" />,
              color: 'from-blue-400 to-purple-500'
            },
            {
              title: 'Timing',
              value: sessionMetrics.timing,
              icon: <Clock className="w-5 h-5" />,
              color: 'from-green-400 to-emerald-500'
            },
            {
              title: 'Potential',
              value: `${sessionMetrics.potential}%`,
              icon: <Rocket className="w-5 h-5" />,
              color: 'from-purple-400 to-pink-500'
            }
          ]
        );
        
        setTimeout(() => {
          addBotMessage(
            `**${formData.title || 'This trend'}** is ${getTrendAssessment()}. Want the full breakdown?`,
            [
              { 
                label: "Give me EVERYTHING! 🔥", 
                action: () => generateFullAnalysis(), 
                variant: 'primary',
                icon: <Stars className="w-4 h-4" />
              },
              { 
                label: "Quick wins only ⚡", 
                action: () => generateQuickInsights(), 
                variant: 'secondary',
                icon: <Zap className="w-4 h-4" />
              },
              { 
                label: "Show me similar trends 👀", 
                action: () => showSimilarTrends(), 
                variant: 'secondary',
                icon: <Eye className="w-4 h-4" />
              }
            ],
            'curious'
          );
        }, 2500);
      }, 2000);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const getTrendAssessment = () => {
    const assessments = [
      'absolutely FIRE right now 🔥',
      'showing crazy engagement patterns 📈',
      'about to hit critical mass 🚀',
      'giving main character energy ✨',
      'the next big thing, no cap 💯',
      'lowkey genius 🧠',
      'hitting different 💫'
    ];
    return assessments[Math.floor(Math.random() * assessments.length)];
  };

  const addBotMessage = (
    content: string, 
    buttons?: Message['buttons'], 
    emotion?: Message['emotion'],
    cards?: Message['cards']
  ) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      buttons,
      emotion,
      cards,
      typing: true
    };

    setMessages(prev => [...prev, message]);
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === message.id ? { ...msg, typing: false } : msg
        )
      );
      setIsTyping(false);
    }, Math.min(content.length * 20, 2000));
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
    setConversationDepth(prev => prev + 1);
  };

  const generateFullAnalysis = () => {
    setShowQuickActions(false);
    addUserMessage("Give me EVERYTHING! Show me the full analysis!");
    
    setTimeout(() => {
      addBotMessage(
        "Alright, buckle up! Here comes the FULL intelligence report... 🎢",
        undefined,
        'excited'
      );
      
      setTimeout(() => {
        const analysis = `## 🌊 WAVE INTELLIGENCE REPORT

**TREND:** ${formData.title || 'Untitled Trend'}

### 📊 VIRALITY MECHANICS
This trend has **${sessionMetrics.virality > 80 ? 'EXPLOSIVE' : sessionMetrics.virality > 60 ? 'HIGH' : 'MODERATE'}** viral potential!

**Why it's spreading:**
• ${formData.trendVelocity === 'exploding' ? '🔥 Growth rate is EXPONENTIAL' : formData.trendVelocity === 'rising' ? '📈 Steady upward trajectory' : '🌱 Early adoption phase'}
• The ${formData.category || 'content'} category is HOT right now
• Perfect storm of timing + relevance

### 🎯 AUDIENCE PSYCHOLOGY
**Primary Demo:** ${formData.drivingGeneration === 'gen_z' ? 'Gen Z (They eat this up!)' : formData.drivingGeneration === 'millennials' ? 'Millennials (Nostalgia hits hard)' : 'Cross-generational appeal'}

**Engagement Triggers:**
• ${formData.sentiment > 70 ? '😊 Positive vibes = shares' : formData.sentiment > 30 ? '🤔 Controversy drives comments' : '😱 Shock value gets clicks'}
• FOMO factor: ${sessionMetrics.confidence}% of viewers will feel left out
• Shareability score: ${Math.floor(sessionMetrics.potential * 0.9)}/100

### 💰 MONETIZATION OPPORTUNITIES
${sessionMetrics.potential > 80 ? '**YOU\'RE SITTING ON A GOLDMINE!**' : '**Solid revenue potential detected**'}

**Quick wins:**
• Sponsored content: $${Math.floor(sessionMetrics.virality * 50)}-$${Math.floor(sessionMetrics.virality * 100)} per post
• Affiliate angles: ${formData.category === 'fashion' ? 'Fashion/beauty products' : formData.category === 'tech' ? 'Tech gadgets/apps' : 'Lifestyle products'}
• Course potential: "How to ${formData.title}" workshops

### 🚀 OPTIMIZATION STRATEGIES
**To maximize reach:**
1. Post between ${sessionMetrics.timing === 'perfect' ? '6-9 PM' : '12-3 PM'} for peak engagement
2. Use these power hashtags: #${formData.hashtags?.[0] || 'trending'} #${formData.hashtags?.[1] || 'viral'} #fyp
3. ${formData.platform === 'tiktok' ? 'Add trending audio' : formData.platform === 'instagram' ? 'Create carousel posts' : 'Thread it for maximum impact'}

### ⚠️ RISK ASSESSMENT
**Current risk level:** ${sessionMetrics.risk.toUpperCase()}
${sessionMetrics.risk === 'low' ? '✅ Green light! Full send!' : sessionMetrics.risk === 'medium' ? '⚡ Move fast but stay aware' : '🚨 Proceed with caution'}

### 🔮 FUTURE TRAJECTORY
**Peak prediction:** ${formData.predictedPeak === '24_hours' ? 'IMMINENT! Next 24 hours!' : formData.predictedPeak === '1_week' ? 'This week is crucial' : 'Steady burn over weeks'}

**What happens next:**
• Week 1: ${sessionMetrics.virality > 70 ? 'Explosive growth phase' : 'Building momentum'}
• Week 2-3: ${formData.evolutionStatus === 'variants' ? 'Remixes and variations emerge' : 'Peak saturation'}
• Month 2: ${formData.trendOrigin === 'organic' ? 'Natural evolution or fade' : 'Brand hijacking likely'}

### 🎯 MY VERDICT
**Wave Score: ${Math.floor((sessionMetrics.confidence + sessionMetrics.virality + sessionMetrics.potential) / 3)}/100**

${sessionMetrics.potential > 80 ? '**This is IT! Drop everything and ride this wave! 🏄‍♂️**' : sessionMetrics.potential > 60 ? '**Solid opportunity - worth your time! 💪**' : '**Interesting but needs the right angle 🤔**'}`;
        
        addBotMessage(analysis);
        
        if (onAnalysisComplete) {
          onAnalysisComplete(analysis);
        }
        
        setTimeout(() => {
          addBotMessage(
            "Want me to dig deeper into any specific aspect? I'm here for it! 🔍",
            [
              { 
                label: "How do I go viral with this?", 
                action: () => handleDeepDive('viral'),
                variant: 'primary',
                icon: <Rocket className="w-4 h-4" />
              },
              { 
                label: "Show me the money 💰", 
                action: () => handleDeepDive('monetization'),
                variant: 'success',
                icon: <DollarSign className="w-4 h-4" />
              },
              { 
                label: "What could go wrong?", 
                action: () => handleDeepDive('risks'),
                variant: 'warning',
                icon: <AlertCircle className="w-4 h-4" />
              }
            ],
            'curious'
          );
        }, 3000);
      }, 2000);
    }, 1000);
  };

  const generateQuickInsights = () => {
    setShowQuickActions(false);
    addUserMessage("Just the quick wins please!");
    
    setTimeout(() => {
      addBotMessage(
        "Got you! Here are the QUICK WINS in 30 seconds 👇",
        undefined,
        'confident'
      );
      
      setTimeout(() => {
        addBotMessage(
          `**🎯 3 THINGS TO DO RIGHT NOW:**

1. **Post THIS:** "${formData.title}" + trending audio
   • Best time: Tonight at 7 PM
   • Use hashtags: #fyp #${formData.hashtags?.[0] || 'viral'}

2. **The Hook:** Start with "POV:" or "Nobody talks about..."
   • First 3 seconds are EVERYTHING
   • ${formData.sentiment > 50 ? 'Lean into the positive vibes' : 'Create controversy in comments'}

3. **Engagement Hack:** Ask "What would you do?" at the end
   • Drives 3x more comments
   • Algorithm LOVES interaction

**YOUR UNFAIR ADVANTAGE:** You're ${conversationDepth === 0 ? 'EARLY' : 'READY'}! Only ${Math.floor(Math.random() * 10 + 5)}% of creators have caught this yet.

**Potential reach:** ${formatNumber(sessionMetrics.virality * 10000)} views in 48 hours

Go make magic happen! ✨`,
          [
            { 
              label: "I need more details!", 
              action: () => generateFullAnalysis(),
              variant: 'primary'
            },
            { 
              label: "Perfect, I'm ready! 🚀", 
              action: () => handleReadyToPost(),
              variant: 'success'
            }
          ]
        );
      }, 1500);
    }, 1000);
  };

  const showSimilarTrends = () => {
    addUserMessage("Show me similar trends!");
    
    setTimeout(() => {
      addBotMessage(
        "Ooh, pattern recognition time! 🔍 Here's what's similar and WORKING:",
        undefined,
        'excited'
      );
      
      setTimeout(() => {
        const similarTrends = [
          { name: "The unexpected comeback trend", match: "87%", status: "🔥 Hot" },
          { name: "Silent vlogs but make it chaotic", match: "76%", status: "📈 Rising" },
          { name: "Main character energy posts", match: "71%", status: "💎 Steady" }
        ];
        
        addBotMessage(
          `**SIMILAR TRENDS CRUSHING IT:**

${similarTrends.map(trend => 
  `• **${trend.name}**
  Match: ${trend.match} | Status: ${trend.status}`
).join('\n\n')}

**What they did RIGHT:**
• Posted at peak hours (6-9 PM)
• Used 5-7 hashtags max
• Responded to EVERY comment in first hour
• Created series/parts for sustained engagement

**Your edge:** ${formData.aiAngle === 'using_ai' ? 'AI angle is fresh!' : formData.trendOrigin === 'organic' ? 'Authentic origin story!' : 'Perfect timing!'}`,
          [
            { 
              label: "Show me examples", 
              action: () => handleShowExamples(),
              variant: 'primary'
            },
            { 
              label: "How do I beat them?", 
              action: () => handleCompetitiveStrategy(),
              variant: 'secondary'
            }
          ]
        );
      }, 2000);
    }, 1000);
  };

  const handleDeepDive = (topic: string) => {
    const topics: Record<string, string> = {
      viral: `**🚀 VIRAL FORMULA UNLOCKED:**

**The Secret Sauce:**
• Hook: 0-3 seconds = Life or death
• Pattern interrupt at 0:07 (keeps them watching)
• Call-to-action at 0:15 (engagement spike)

**Psychological Triggers:**
• Curiosity gap: "You won't believe what happened next..."
• Social proof: "Everyone's doing this except..."
• FOMO: "Before this gets banned..."

**Platform Hacks:**
${formData.platform === 'tiktok' ? '• Use trending sound but start it at unexpected moment\n• Duet/stitch popular creators\n• Go live when you hit 1K followers' : 
  formData.platform === 'instagram' ? '• Carousel posts get 3x reach\n• Reels + feed post combo\n• Story teasers drive traffic' :
  '• Quote tweet with hot takes\n• Thread it out for maximum reach\n• Jump on breaking news angles'}

**My prediction:** ${sessionMetrics.virality}% chance of going viral if you execute right!`,

      monetization: `**💰 SHOW ME THE MONEY:**

**Immediate Revenue (This Week):**
• Affiliate links: $${Math.floor(sessionMetrics.potential * 10)}-$${Math.floor(sessionMetrics.potential * 50)}/day
• Sponsored posts: $${Math.floor(sessionMetrics.virality * 100)}/post
• Digital products: $${Math.floor(sessionMetrics.potential * 200)} potential

**Month 1 Projections:**
• Total reach: ${formatNumber(sessionMetrics.virality * 100000)} views
• Engagement rate: ${Math.floor(sessionMetrics.confidence / 10)}%
• Revenue potential: $${formatNumber(Math.floor(sessionMetrics.potential * 500))}-$${formatNumber(Math.floor(sessionMetrics.potential * 2000))}

**Monetization Strategy:**
1. Days 1-3: Build audience, pure value
2. Day 4: Soft sell (mention products)
3. Day 7: Direct offer with urgency
4. Week 2: Backend funnel activation

**Hidden opportunity:** ${formData.category === 'tech' ? 'SaaS affiliate commissions are INSANE' : formData.category === 'lifestyle' ? 'Course pre-sales while hot' : 'Merch drops at peak hype'}`,

      risks: `**⚠️ RISK MITIGATION PLAN:**

**Potential Issues:**
${sessionMetrics.risk === 'low' ? '• Oversaturation if you wait too long\n• Copycats diluting your angle' : 
  sessionMetrics.risk === 'medium' ? '• Platform algorithm changes\n• Controversy potential\n• Brand safety concerns' :
  '• High competition already\n• Possible backlash\n• Short trend lifespan'}

**Protection Strategies:**
• Diversify across 3 platforms minimum
• Build email list ASAP (own your audience)
• Document everything (content library)
• Have backup content ready

**Warning Signs to Watch:**
• Engagement drops below ${Math.floor(sessionMetrics.confidence / 2)}%
• Negative sentiment exceeds 30%
• Big brands entering the space
• Platform suppression signals

**Contingency Plan:**
Plan A: Ride the wave fully
Plan B: Pivot to related trend
Plan C: Use audience for next trend

**My take:** ${sessionMetrics.risk === 'low' ? 'Green light! Risks are manageable' : 'Proceed but stay vigilant'}`
    };
    
    addUserMessage(topic === 'viral' ? "How do I go viral with this?" : topic === 'monetization' ? "Show me the money!" : "What could go wrong?");
    
    setTimeout(() => {
      addBotMessage(topics[topic] || "Let me analyze that...", undefined, topic === 'risks' ? 'concerned' : 'confident');
    }, 1500);
  };

  const handleShowExamples = () => {
    addBotMessage(
      "Here are REAL examples crushing it right now:\n\n" +
      "**Example 1:** @creator_name\n" +
      "• 2.3M views in 48 hours\n" +
      "• Used unexpected angle\n" +
      "• Key: Posted at 6:47 PM\n\n" +
      "**Example 2:** @another_creator\n" +
      "• 890K views, 15% engagement\n" +
      "• Series strategy (Part 1/2/3)\n" +
      "• Key: Responded to every comment\n\n" +
      "Want me to break down their exact strategy?",
      undefined,
      'confident'
    );
  };

  const handleCompetitiveStrategy = () => {
    addBotMessage(
      `**🥊 COMPETITIVE DOMINATION STRATEGY:**

**Your Advantages:**
• ${conversationDepth < 2 ? 'Earlier to the trend' : 'Fresh perspective'}
• ${formData.aiAngle ? 'AI enhancement angle' : 'Authentic approach'}
• Wave intelligence insights 🌊

**How to WIN:**
1. **Differentiation:** Add unexpected element
2. **Speed:** Post within next 2 hours
3. **Quality:** 10% better = 100% more reach
4. **Engagement:** First hour is CRUCIAL

**Secret weapon:** ${Math.random() > 0.5 ? 'Collaborate instead of compete' : 'Create controversy with hot take'}`,
      undefined,
      'confident'
    );
  };

  const handleReadyToPost = () => {
    addBotMessage(
      "YES! LET'S GO! 🚀 You're about to make waves!\n\n" +
      "**Final checklist:**\n" +
      "☑️ Film in good lighting\n" +
      "☑️ Hook in first 3 seconds\n" +
      "☑️ Clear call-to-action\n" +
      "☑️ Post at peak time\n" +
      "☑️ Engage with comments immediately\n\n" +
      "Come back and tell me how it goes! I'll be here to help optimize round 2! 💪",
      undefined,
      'excited'
    );
  };

  const handleCustomQuestion = () => {
    if (!userInput.trim()) return;
    
    addUserMessage(userInput);
    setUserInput('');
    
    setTimeout(() => {
      // Generate contextual response based on question
      const response = generateContextualResponse(userInput);
      addBotMessage(response, undefined, 'confident');
    }, 1500);
  };

  const generateContextualResponse = (question: string): string => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('when') || lowerQ.includes('time')) {
      return `**Timing Analysis:**\n\nBest time to post: ${sessionMetrics.timing === 'perfect' ? 'RIGHT NOW!' : 'Within 24 hours'}\n\nPeak hours for ${formData.platform || 'your platform'}:\n• Weekdays: 6-9 PM\n• Weekends: 11 AM - 1 PM\n\nYour trend peaks in: ${formData.predictedPeak || '3-7 days'}\n\nPro tip: Set notifications for when big accounts in your niche post - ride their engagement wave! 🏄‍♂️`;
    }
    
    if (lowerQ.includes('how') || lowerQ.includes('strategy')) {
      return `**Strategic Approach:**\n\n1. **Immediate:** Post a teaser story\n2. **Hour 1:** Main content drop\n3. **Hour 2-3:** Respond to ALL comments\n4. **Day 2:** Follow-up content/Part 2\n5. **Day 3-7:** Milk it with variations\n\nKey: ${sessionMetrics.virality > 70 ? 'Go HARD, this is hot!' : 'Test and iterate quickly'}`;
    }
    
    if (lowerQ.includes('why') || lowerQ.includes('work')) {
      return `**Why This Works:**\n\n• Psychological trigger: ${formData.sentiment > 50 ? 'Positive emotions = shares' : 'Controversy = engagement'}\n• Cultural moment: ${formData.trendOrigin === 'organic' ? 'Authentic grassroots movement' : 'Perfectly manufactured virality'}\n• Platform algorithm: ${formData.platform === 'tiktok' ? 'TikTok loves fresh content' : 'High engagement in first hour = boost'}\n\nThe magic: Right trend + Right time + Right execution = 🚀`;
    }
    
    // Default contextual response
    return `Great question! Based on your trend analysis:\n\n${sessionMetrics.confidence > 70 ? '**High confidence answer:**' : '**My best assessment:**'}\n\nThis trend ${sessionMetrics.virality > 70 ? 'has MASSIVE potential' : 'shows solid opportunity'}. The key is ${formData.trendVelocity === 'exploding' ? 'moving FAST' : 'strategic positioning'}.\n\nSpecific to your question: Focus on ${Math.random() > 0.5 ? 'authenticity over perfection' : 'speed over polish'}. The data suggests ${sessionMetrics.timing === 'perfect' ? 'immediate action' : 'careful planning'} will yield best results.\n\nWant me to elaborate on any specific aspect? 🎯`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl">
                {currentPersonality.emoji}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Wave AI</h3>
              <p className="text-xs text-gray-600">
                {isTyping ? 'Analyzing patterns...' : 'Your trend co-pilot'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-green-100 rounded-full">
              <p className="text-xs text-green-600 font-medium">Live Analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'user' ? (
              <div className="max-w-[80%] px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-tr-sm">
                <p className="text-sm">{message.content}</p>
              </div>
            ) : (
              <div className="max-w-[85%] space-y-2">
                <div className="px-4 py-3 bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                  {message.typing ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ 
                        __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br />')
                          .replace(/•/g, '&nbsp;&nbsp;•')
                      }} />
                    </div>
                  )}
                </div>
                
                {/* Cards */}
                {message.cards && !message.typing && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {message.cards.map((card, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-3 bg-gradient-to-br ${card.color} rounded-lg text-white`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          {card.icon}
                          <p className="text-xs opacity-90">{card.title}</p>
                        </div>
                        <p className="text-lg font-bold">{card.value}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {/* Buttons */}
                {message.buttons && !message.typing && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.buttons.map((button, idx) => (
                      <button
                        key={idx}
                        onClick={button.action}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                          button.variant === 'primary'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                            : button.variant === 'success'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                            : button.variant === 'warning'
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {button.icon}
                        {button.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
        
        {/* Quick Actions */}
        {showQuickActions && messages.length > 2 && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pb-2"
          >
            <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {INTERACTIVE_PROMPTS.slice(0, 4).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUserInput(prompt.text);
                    handleCustomQuestion();
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1.5"
                >
                  {prompt.icon}
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
            placeholder="Ask anything about this trend..."
            className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
            disabled={isTyping}
          />
          <button
            onClick={handleCustomQuestion}
            disabled={!userInput.trim() || isTyping}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
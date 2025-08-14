export interface TrendIntelligenceData {
  // Step 1: Basic Trend Info
  title: string;
  platform: 'tiktok' | 'instagram' | 'twitter' | 'youtube' | 'reddit' | 'linkedin';
  url: string;
  category: 'political' | 'finance' | 'fashion' | 'meme' | 'gaming' | 'lifestyle' | 'health' | 'music' | 'brand' | 'social_cause';
  
  // Step 2: Universal Intelligence
  trendDynamics: {
    velocity: 'just_starting' | 'accelerating' | 'peaking' | 'declining' | 'dead';
    platformSpread: 'single_platform' | 'cross_platform' | 'platform_wars';
    size: 'under_10k' | '10k_100k' | '100k_1m' | '1m_10m' | 'over_10m';
  };
  
  aiDetection: {
    origin: 'definitely_human' | 'likely_human' | 'mixed' | 'likely_ai' | 'definitely_ai' | 'deceptive_ai';
    reasoning: string;
  };
  
  audienceIntelligence: {
    sentiment: 'love_it' | 'mixed_fighting' | 'hate_it';
    demographics: ('gen_alpha' | 'gen_z' | 'millennials' | 'gen_x' | 'boomers')[];
    subcultures: ('tech_bros' | 'finance' | 'creators' | 'parents' | 'students' | 'activists')[];
    brandPresence: 'no_brands' | 'indies_testing' | 'majors_arriving' | 'oversaturated';
  };
  
  // Step 3: Category-specific questions (dynamic based on category)
  categorySpecific?: {
    // Political
    ideologicalLeaning?: 'far_left' | 'left' | 'center_left' | 'center' | 'center_right' | 'right' | 'far_right' | 'non_partisan';
    pushers?: string[];
    geographicPatterns?: string[];
    
    // Finance
    sophisticationLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    scamProbability?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    targetAudience?: string;
    
    // Fashion
    aestheticType?: string;
    pricePoint?: 'budget' | 'affordable' | 'mid_range' | 'premium' | 'luxury';
    longevityPrediction?: 'flash_trend' | 'seasonal' | 'annual' | 'multi_year' | 'timeless';
    
    // Meme
    lifecycleStage?: 'birth' | 'growth' | 'peak' | 'ironic' | 'dead';
    remixPotential?: 'low' | 'medium' | 'high' | 'viral';
    monetizationVisible?: boolean;
    
    // Gaming
    communityType?: 'casual' | 'competitive' | 'creative' | 'speedrun' | 'modding';
    developerAwareness?: 'unaware' | 'monitoring' | 'acknowledged' | 'embraced' | 'partnered';
    competitiveImpact?: 'none' | 'minor' | 'moderate' | 'major' | 'meta_defining';
    
    // Lifestyle
    adoptionBarrier?: 'none' | 'low' | 'medium' | 'high' | 'extreme';
    sustainabilityFactor?: 'harmful' | 'neutral' | 'somewhat_sustainable' | 'very_sustainable';
    healthImpact?: 'harmful' | 'neutral' | 'somewhat_beneficial' | 'very_beneficial';
    
    // Health
    scientificBacking?: 'debunked' | 'no_evidence' | 'anecdotal' | 'preliminary' | 'strong';
    medicalCommunityStance?: 'opposed' | 'skeptical' | 'neutral' | 'cautiously_supportive' | 'endorsed';
    riskLevel?: 'dangerous' | 'risky' | 'moderate' | 'low_risk' | 'safe';
    
    // Music
    genreBlend?: string[];
    artistType?: 'unsigned' | 'indie' | 'mid_tier' | 'mainstream' | 'superstar';
    viralMechanism?: 'dance' | 'sound' | 'lyrics' | 'challenge' | 'meme';
    
    // Brand
    brandStrategy?: 'organic' | 'influencer_led' | 'paid_campaign' | 'ugc_driven' | 'guerrilla';
    authenticityScore?: 'fake' | 'forced' | 'trying' | 'genuine' | 'native';
    backfirePotential?: 'none' | 'low' | 'medium' | 'high' | 'guaranteed';
    
    // Social Cause
    movementStage?: 'awareness' | 'education' | 'mobilization' | 'action' | 'institutionalization';
    oppositionLevel?: 'none' | 'minimal' | 'moderate' | 'significant' | 'intense';
    mainstreamPotential?: 'fringe' | 'niche' | 'growing' | 'mainstream_ready' | 'mainstream';
  };
  
  // Step 4: Context (Optional)
  context?: {
    whyItMatters?: string;
    prediction?: string;
  };
  
  // Existing fields from current system
  creatorHandle?: string;
  creatorName?: string;
  postCaption?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  hashtags?: string[];
  thumbnailUrl?: string;
  postedAt?: string;
  waveScore?: number;
}

// Category-specific question configurations
export const CATEGORY_QUESTIONS = {
  political: {
    title: "Political Trend Intelligence",
    questions: [
      {
        id: 'ideologicalLeaning',
        label: 'Ideological Leaning',
        type: 'select',
        options: [
          { value: 'far_left', label: 'Far Left' },
          { value: 'left', label: 'Left' },
          { value: 'center_left', label: 'Center-Left' },
          { value: 'center', label: 'Center' },
          { value: 'center_right', label: 'Center-Right' },
          { value: 'right', label: 'Right' },
          { value: 'far_right', label: 'Far Right' },
          { value: 'non_partisan', label: 'Non-Partisan' }
        ]
      },
      {
        id: 'pushers',
        label: "Who's Pushing This?",
        type: 'text',
        placeholder: 'Politicians, influencers, organizations...'
      },
      {
        id: 'geographicPatterns',
        label: 'Geographic Patterns',
        type: 'text',
        placeholder: 'Urban/rural, specific regions, countries...'
      }
    ]
  },
  finance: {
    title: "Finance Trend Intelligence",
    questions: [
      {
        id: 'sophisticationLevel',
        label: 'Sophistication Level',
        type: 'select',
        options: [
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
          { value: 'expert', label: 'Expert' }
        ]
      },
      {
        id: 'scamProbability',
        label: 'Scam Probability',
        type: 'select',
        options: [
          { value: 'very_low', label: 'Very Low' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'very_high', label: 'Very High' }
        ]
      },
      {
        id: 'targetAudience',
        label: 'Target Audience',
        type: 'text',
        placeholder: 'Retail investors, day traders, crypto enthusiasts...'
      }
    ]
  },
  fashion: {
    title: "Fashion Trend Intelligence",
    questions: [
      {
        id: 'aestheticType',
        label: 'Aesthetic Type',
        type: 'text',
        placeholder: 'Y2K, minimalist, cottagecore, dark academia...'
      },
      {
        id: 'pricePoint',
        label: 'Price Point',
        type: 'select',
        options: [
          { value: 'budget', label: 'Budget (<$50)' },
          { value: 'affordable', label: 'Affordable ($50-150)' },
          { value: 'mid_range', label: 'Mid-Range ($150-500)' },
          { value: 'premium', label: 'Premium ($500-2000)' },
          { value: 'luxury', label: 'Luxury (>$2000)' }
        ]
      },
      {
        id: 'longevityPrediction',
        label: 'Longevity Prediction',
        type: 'select',
        options: [
          { value: 'flash_trend', label: 'Flash Trend (weeks)' },
          { value: 'seasonal', label: 'Seasonal (3-4 months)' },
          { value: 'annual', label: 'Annual (1 year)' },
          { value: 'multi_year', label: 'Multi-Year (2-5 years)' },
          { value: 'timeless', label: 'Timeless (5+ years)' }
        ]
      }
    ]
  },
  meme: {
    title: "Meme Trend Intelligence",
    questions: [
      {
        id: 'lifecycleStage',
        label: 'Lifecycle Stage',
        type: 'select',
        options: [
          { value: 'birth', label: 'Birth (just created)' },
          { value: 'growth', label: 'Growth (spreading)' },
          { value: 'peak', label: 'Peak (everywhere)' },
          { value: 'ironic', label: 'Ironic (self-aware)' },
          { value: 'dead', label: 'Dead (cringe)' }
        ]
      },
      {
        id: 'remixPotential',
        label: 'Remix Potential',
        type: 'select',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'viral', label: 'Viral' }
        ]
      },
      {
        id: 'monetizationVisible',
        label: 'Monetization Visible?',
        type: 'boolean',
        options: [
          { value: true, label: 'Yes' },
          { value: false, label: 'No' }
        ]
      }
    ]
  },
  gaming: {
    title: "Gaming Trend Intelligence",
    questions: [
      {
        id: 'communityType',
        label: 'Community Type',
        type: 'select',
        options: [
          { value: 'casual', label: 'Casual' },
          { value: 'competitive', label: 'Competitive' },
          { value: 'creative', label: 'Creative' },
          { value: 'speedrun', label: 'Speedrun' },
          { value: 'modding', label: 'Modding' }
        ]
      },
      {
        id: 'developerAwareness',
        label: 'Developer Awareness',
        type: 'select',
        options: [
          { value: 'unaware', label: 'Unaware' },
          { value: 'monitoring', label: 'Monitoring' },
          { value: 'acknowledged', label: 'Acknowledged' },
          { value: 'embraced', label: 'Embraced' },
          { value: 'partnered', label: 'Partnered' }
        ]
      },
      {
        id: 'competitiveImpact',
        label: 'Competitive Impact',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'minor', label: 'Minor' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'major', label: 'Major' },
          { value: 'meta_defining', label: 'Meta-Defining' }
        ]
      }
    ]
  },
  lifestyle: {
    title: "Lifestyle Trend Intelligence",
    questions: [
      {
        id: 'adoptionBarrier',
        label: 'Adoption Barrier',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'extreme', label: 'Extreme' }
        ]
      },
      {
        id: 'sustainabilityFactor',
        label: 'Sustainability Factor',
        type: 'select',
        options: [
          { value: 'harmful', label: 'Harmful' },
          { value: 'neutral', label: 'Neutral' },
          { value: 'somewhat_sustainable', label: 'Somewhat Sustainable' },
          { value: 'very_sustainable', label: 'Very Sustainable' }
        ]
      },
      {
        id: 'healthImpact',
        label: 'Health Impact',
        type: 'select',
        options: [
          { value: 'harmful', label: 'Harmful' },
          { value: 'neutral', label: 'Neutral' },
          { value: 'somewhat_beneficial', label: 'Somewhat Beneficial' },
          { value: 'very_beneficial', label: 'Very Beneficial' }
        ]
      }
    ]
  },
  health: {
    title: "Health Trend Intelligence",
    questions: [
      {
        id: 'scientificBacking',
        label: 'Scientific Backing',
        type: 'select',
        options: [
          { value: 'debunked', label: 'Debunked' },
          { value: 'no_evidence', label: 'No Evidence' },
          { value: 'anecdotal', label: 'Anecdotal' },
          { value: 'preliminary', label: 'Preliminary Studies' },
          { value: 'strong', label: 'Strong Evidence' }
        ]
      },
      {
        id: 'medicalCommunityStance',
        label: 'Medical Community Stance',
        type: 'select',
        options: [
          { value: 'opposed', label: 'Opposed' },
          { value: 'skeptical', label: 'Skeptical' },
          { value: 'neutral', label: 'Neutral' },
          { value: 'cautiously_supportive', label: 'Cautiously Supportive' },
          { value: 'endorsed', label: 'Endorsed' }
        ]
      },
      {
        id: 'riskLevel',
        label: 'Risk Level',
        type: 'select',
        options: [
          { value: 'dangerous', label: 'Dangerous' },
          { value: 'risky', label: 'Risky' },
          { value: 'moderate', label: 'Moderate Risk' },
          { value: 'low_risk', label: 'Low Risk' },
          { value: 'safe', label: 'Safe' }
        ]
      }
    ]
  },
  music: {
    title: "Music Trend Intelligence",
    questions: [
      {
        id: 'genreBlend',
        label: 'Genre Blend',
        type: 'text',
        placeholder: 'Pop, hip-hop, EDM, indie, K-pop...'
      },
      {
        id: 'artistType',
        label: 'Artist Type',
        type: 'select',
        options: [
          { value: 'unsigned', label: 'Unsigned' },
          { value: 'indie', label: 'Indie' },
          { value: 'mid_tier', label: 'Mid-Tier' },
          { value: 'mainstream', label: 'Mainstream' },
          { value: 'superstar', label: 'Superstar' }
        ]
      },
      {
        id: 'viralMechanism',
        label: 'Viral Mechanism',
        type: 'select',
        options: [
          { value: 'dance', label: 'Dance' },
          { value: 'sound', label: 'Sound/Audio' },
          { value: 'lyrics', label: 'Lyrics' },
          { value: 'challenge', label: 'Challenge' },
          { value: 'meme', label: 'Meme' }
        ]
      }
    ]
  },
  brand: {
    title: "Brand Trend Intelligence",
    questions: [
      {
        id: 'brandStrategy',
        label: 'Brand Strategy',
        type: 'select',
        options: [
          { value: 'organic', label: 'Organic' },
          { value: 'influencer_led', label: 'Influencer-Led' },
          { value: 'paid_campaign', label: 'Paid Campaign' },
          { value: 'ugc_driven', label: 'UGC-Driven' },
          { value: 'guerrilla', label: 'Guerrilla' }
        ]
      },
      {
        id: 'authenticityScore',
        label: 'Authenticity Score',
        type: 'select',
        options: [
          { value: 'fake', label: 'Fake' },
          { value: 'forced', label: 'Forced' },
          { value: 'trying', label: 'Trying' },
          { value: 'genuine', label: 'Genuine' },
          { value: 'native', label: 'Native' }
        ]
      },
      {
        id: 'backfirePotential',
        label: 'Backfire Potential',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'guaranteed', label: 'Guaranteed' }
        ]
      }
    ]
  },
  social_cause: {
    title: "Social Cause Intelligence",
    questions: [
      {
        id: 'movementStage',
        label: 'Movement Stage',
        type: 'select',
        options: [
          { value: 'awareness', label: 'Awareness' },
          { value: 'education', label: 'Education' },
          { value: 'mobilization', label: 'Mobilization' },
          { value: 'action', label: 'Action' },
          { value: 'institutionalization', label: 'Institutionalization' }
        ]
      },
      {
        id: 'oppositionLevel',
        label: 'Opposition Level',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'minimal', label: 'Minimal' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'significant', label: 'Significant' },
          { value: 'intense', label: 'Intense' }
        ]
      },
      {
        id: 'mainstreamPotential',
        label: 'Mainstream Potential',
        type: 'select',
        options: [
          { value: 'fringe', label: 'Fringe' },
          { value: 'niche', label: 'Niche' },
          { value: 'growing', label: 'Growing' },
          { value: 'mainstream_ready', label: 'Mainstream-Ready' },
          { value: 'mainstream', label: 'Already Mainstream' }
        ]
      }
    ]
  }
};

// Platform configurations
export const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', color: 'bg-black', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '📷' },
  { id: 'twitter', label: 'X (Twitter)', color: 'bg-black', icon: '𝕏' },
  { id: 'youtube', label: 'YouTube', color: 'bg-red-600', icon: '▶️' },
  { id: 'reddit', label: 'Reddit', color: 'bg-orange-600', icon: '🤖' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700', icon: '💼' }
];

// Categories with icons and descriptions
export const CATEGORIES = [
  { id: 'political', label: '⚖️ Political', description: 'Political movements, discourse, campaigns' },
  { id: 'finance', label: '💰 Finance', description: 'Crypto, stocks, financial advice, fintech' },
  { id: 'fashion', label: '👗 Fashion', description: 'Style trends, aesthetics, fashion movements' },
  { id: 'meme', label: '😂 Meme', description: 'Viral formats, jokes, internet culture' },
  { id: 'gaming', label: '🎮 Gaming', description: 'Game trends, strategies, community movements' },
  { id: 'lifestyle', label: '🏡 Lifestyle', description: 'Life hacks, routines, wellness trends' },
  { id: 'health', label: '💪 Health', description: 'Fitness, diets, medical trends' },
  { id: 'music', label: '🎵 Music', description: 'Songs, artists, music movements' },
  { id: 'brand', label: '🛍️ Brand', description: 'Product launches, brand campaigns' },
  { id: 'social_cause', label: '✊ Social Cause', description: 'Activism, awareness campaigns, movements' }
];

// Universal Intelligence Options
export const UNIVERSAL_INTELLIGENCE = {
  velocity: [
    { value: 'just_starting', label: '🌱 Just Starting', description: 'Very early, minimal spread' },
    { value: 'accelerating', label: '🚀 Accelerating', description: 'Gaining momentum rapidly' },
    { value: 'peaking', label: '📈 Peaking', description: 'At maximum velocity' },
    { value: 'declining', label: '📉 Declining', description: 'Losing steam' },
    { value: 'dead', label: '💀 Dead', description: 'No longer spreading' }
  ],
  platformSpread: [
    { value: 'single_platform', label: 'Single Platform', description: 'Only on one platform' },
    { value: 'cross_platform', label: 'Cross-Platform', description: 'Spreading across platforms' },
    { value: 'platform_wars', label: 'Platform Wars', description: 'Different versions competing' }
  ],
  size: [
    { value: 'under_10k', label: 'Under 10K', description: 'Niche/emerging' },
    { value: '10k_100k', label: '10K-100K', description: 'Growing community' },
    { value: '100k_1m', label: '100K-1M', description: 'Significant reach' },
    { value: '1m_10m', label: '1M-10M', description: 'Mass awareness' },
    { value: 'over_10m', label: 'Over 10M', description: 'Global phenomenon' }
  ],
  aiOrigin: [
    { value: 'definitely_human', label: '👤 Definitely Human', description: 'Clear human origin' },
    { value: 'likely_human', label: '🧑 Likely Human', description: 'Probably human-created' },
    { value: 'mixed', label: '🤝 Mixed', description: 'Human and AI collaboration' },
    { value: 'likely_ai', label: '🤖 Likely AI', description: 'Probably AI-generated' },
    { value: 'definitely_ai', label: '🦾 Definitely AI', description: 'Clear AI generation' },
    { value: 'deceptive_ai', label: '🎭 Deceptive AI', description: 'AI pretending to be human' }
  ],
  sentiment: [
    { value: 'love_it', label: '❤️ Love It', description: 'Overwhelmingly positive' },
    { value: 'mixed_fighting', label: '⚔️ Mixed/Fighting', description: 'Controversial, debates' },
    { value: 'hate_it', label: '😡 Hate It', description: 'Overwhelmingly negative' }
  ],
  brandPresence: [
    { value: 'no_brands', label: 'No Brands Yet', description: 'Pure organic, no commercialization' },
    { value: 'indies_testing', label: 'Indies Testing', description: 'Small brands experimenting' },
    { value: 'majors_arriving', label: 'Majors Arriving', description: 'Big brands entering' },
    { value: 'oversaturated', label: 'Oversaturated', description: 'Too many brands, losing authenticity' }
  ]
};

// Demographics options
export const DEMOGRAPHICS = [
  { id: 'gen_alpha', label: 'Gen Alpha', age: '0-14' },
  { id: 'gen_z', label: 'Gen Z', age: '15-27' },
  { id: 'millennials', label: 'Millennials', age: '28-43' },
  { id: 'gen_x', label: 'Gen X', age: '44-59' },
  { id: 'boomers', label: 'Boomers', age: '60+' }
];

// Subcultures options
export const SUBCULTURES = [
  { id: 'tech_bros', label: 'Tech Bros', icon: '💻' },
  { id: 'finance', label: 'Finance', icon: '📊' },
  { id: 'creators', label: 'Creators', icon: '🎨' },
  { id: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
  { id: 'students', label: 'Students', icon: '🎓' },
  { id: 'activists', label: 'Activists', icon: '✊' }
];
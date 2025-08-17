/**
 * Dynamic WaveSight greetings system
 */

interface GreetingConfig {
  isFirstTime?: boolean;
  userName?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  currentStreak?: number;
  performance_tier?: string;
}

// WaveSight-themed greetings
const WAVESIGHT_GREETINGS = [
  "Ready to catch the next wave",
  "Riding the trends",
  "Surfing the zeitgeist", 
  "Spotting what's next",
  "Making waves",
  "On the pulse",
  "Trend hunter mode activated",
  "Wave rider",
  "Catching viral currents",
  "Trend spotter extraordinaire",
  "Riding high",
  "Making a splash",
  "In the flow",
  "Wavelength synced",
  "Trend radar active",
  "Wave maker",
  "Current navigator",
  "Viral voyager",
  "Trend tracker",
  "Wave warrior"
];

const TIME_GREETINGS = {
  morning: [
    "Good morning",
    "Rise and spot",
    "Morning wave rider",
    "Early bird gets the trend"
  ],
  afternoon: [
    "Good afternoon", 
    "Afternoon surge",
    "Peak hours",
    "Midday momentum"
  ],
  evening: [
    "Good evening",
    "Evening explorer",
    "Sunset spotter",
    "Prime time"
  ],
  night: [
    "Night owl",
    "Late night hunter",
    "Midnight tracker",
    "After hours"
  ]
};

const TIER_GREETINGS: Record<string, string[]> = {
  master: [
    "Master spotter",
    "Trend master",
    "Wave commander",
    "Elite navigator"
  ],
  elite: [
    "Elite tracker",
    "Pro spotter",
    "Wave expert",
    "Trend authority"
  ],
  verified: [
    "Verified spotter",
    "Rising star",
    "Wave rider",
    "Trend scout"
  ],
  learning: [
    "Welcome aboard",
    "New wave",
    "Rising spotter",
    "Trend explorer"
  ]
};

const STREAK_GREETINGS = [
  { min: 30, greetings: ["Legendary streak", "Unstoppable", "On fire"] },
  { min: 14, greetings: ["Impressive streak", "Keep surfing", "Wave master"] },
  { min: 7, greetings: ["Week warrior", "Consistent spotter", "Building momentum"] },
  { min: 3, greetings: ["Building a streak", "Getting warmed up", "Finding your flow"] },
  { min: 1, greetings: ["Back in action", "Let's go", "Ready to spot"] }
];

export function getDynamicGreeting(config: GreetingConfig = {}): string {
  const { isFirstTime, userName, timeOfDay, currentStreak, performance_tier } = config;
  
  // First time user
  if (isFirstTime) {
    return `Welcome to WaveSight${userName ? `, ${userName}` : ''}! 🌊`;
  }
  
  // Build greeting parts
  const parts: string[] = [];
  
  // Time-based greeting
  if (timeOfDay) {
    const timeGreetings = TIME_GREETINGS[timeOfDay];
    parts.push(timeGreetings[Math.floor(Math.random() * timeGreetings.length)]);
  }
  
  // Tier-based addition
  if (performance_tier && TIER_GREETINGS[performance_tier]) {
    const tierGreetings = TIER_GREETINGS[performance_tier];
    if (Math.random() > 0.5) { // 50% chance to include tier greeting
      parts.push(tierGreetings[Math.floor(Math.random() * tierGreetings.length)].toLowerCase());
    }
  }
  
  // Streak-based addition
  if (currentStreak && currentStreak > 0) {
    const streakGreeting = STREAK_GREETINGS.find(s => currentStreak >= s.min);
    if (streakGreeting && Math.random() > 0.6) { // 40% chance to mention streak
      parts.push(`(${streakGreeting.greetings[Math.floor(Math.random() * streakGreeting.greetings.length)]}!)`);
    }
  }
  
  // Add user name with special marker for styling
  if (userName) {
    if (parts.length === 0) {
      // If no other parts, use a WaveSight greeting
      const waveGreeting = WAVESIGHT_GREETINGS[Math.floor(Math.random() * WAVESIGHT_GREETINGS.length)];
      parts.push(waveGreeting);
    }
    // Add special marker for the username so it can be styled
    parts.splice(1, 0, `[[${userName}]]`); // Insert name after first part with markers
  }
  
  // Join parts
  let greeting = parts.join(', ');
  
  // Ensure we have something
  if (!greeting || greeting.length < 5) {
    const fallback = WAVESIGHT_GREETINGS[Math.floor(Math.random() * WAVESIGHT_GREETINGS.length)];
    greeting = `${fallback}${userName ? `, ${userName}` : ''}`;
  }
  
  // Add wave emoji occasionally
  if (Math.random() > 0.7) {
    greeting += ' 🌊';
  }
  
  return greeting;
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
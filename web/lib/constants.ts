/**
 * Centralized constants for earnings and rewards
 */

export const EARNINGS = {
  // Reward amounts
  SUBMISSION_REWARD: 1.00,      // Amount earned for submitting a trend (when approved)
  VERIFICATION_REWARD: 0.01,    // Amount earned for participating in verification
  
  // Cash out requirements
  MINIMUM_CASHOUT: 5.00,        // Minimum approved earnings required to cash out
  
  // Verification requirements
  MIN_VOTES_REQUIRED: 3,        // Minimum votes needed for trend verification (3 yes or 3 no)
  
  // Multipliers and bonuses
  STREAK_MULTIPLIER: 1.5,       // Multiplier for streak bonuses
  
  // Processing times
  CASHOUT_PROCESSING_HOURS: '24-48', // Time to process cash out requests
} as const;

// Type for earnings status
export type EarningsStatus = 'pending' | 'approved' | 'paid';

// Earnings status labels and colors
export const EARNINGS_STATUS = {
  pending: {
    label: 'Pending Verification',
    color: 'yellow',
    icon: '🟡',
    description: 'Awaiting verification votes'
  },
  approved: {
    label: 'Approved',
    color: 'green', 
    icon: '🟢',
    description: 'Verified and ready to cash out'
  },
  paid: {
    label: 'Paid Out',
    color: 'blue',
    icon: '🔵',
    description: 'Successfully cashed out'
  }
} as const;
# 💰 WaveSight Earnings System Documentation

## Overview
The WaveSight earnings system rewards users for spotting trends and validating submissions. Earnings start as "pending" and become "approved" based on community validation.

---

## 🎯 Core Mechanics

### **2-Vote Decision System**
- **2 approve votes** → Trend approved, earnings become real
- **2 reject votes** → Trend rejected, earnings removed
- **First to 2 wins** - whichever threshold is reached first determines outcome

---

## 💵 Earnings Structure

### **1. Trend Submission**
**Base Payment:** $1.00 (goes to PENDING)

**Quality Bonuses:**
- Screenshot included: +$0.15
- Complete info (title + description): +$0.10
- Demographics data: +$0.10
- Multiple platforms: +$0.10
- Creator info: +$0.05
- Rich hashtags (3+): +$0.05
- Caption provided: +$0.05

**Performance Bonuses:**
- Viral content (1M+ views): +$0.50
- High views (100k+): +$0.25
- High engagement (>10% rate): +$0.20
- High wave score (>70): +$0.20
- Finance/crypto trend: +$0.10

**Tier Multipliers (applied to total):**
- Elite: 1.5x
- Verified: 1.0x
- Learning: 0.7x
- Restricted: 0.3x

**Maximum:** $3.00 per submission

### **2. Trend Validation**
**Payment:** $0.10 per validation vote (goes directly to APPROVED)
- No approval needed for validation earnings
- Cannot validate your own trends
- Cannot change vote once cast
- "Skip" doesn't count as a vote

---

## 📊 Earnings Flow

```
SUBMISSION
    ↓
[PENDING EARNINGS]
    ↓
2 VOTES CAST
    ↓
┌─────────────┬──────────────┐
│ 2 APPROVES  │  2 REJECTS   │
│      ↓      │      ↓       │
│  APPROVED   │  REJECTED    │
│      ↓      │      ↓       │
│  EARNINGS   │  EARNINGS    │
│   BECOME    │   REMOVED    │
│    REAL     │              │
└─────────────┴──────────────┘
```

---

## 💳 Earnings States

### **Pending Earnings**
- New trend submissions
- Waiting for validation
- Not yet guaranteed
- Shown in yellow/orange in UI

### **Approved Earnings**
- Trends with 2+ approve votes
- Validation rewards
- Ready for cashout
- Shown in green in UI

### **Paid Earnings**
- Successfully cashed out
- Transaction completed
- Historical record

---

## 🔄 Status Transitions

| From | To | Trigger | Earnings Impact |
|------|-----|---------|-----------------|
| submitted | validating | First vote | None |
| validating | approved | 2 approve votes | Pending → Approved |
| validating | rejected | 2 reject votes | Pending removed |
| submitted | approved | 2 approve votes | Pending → Approved |
| submitted | rejected | 2 reject votes | Pending removed |

---

## 🎮 User Actions & Rewards

### **For Trend Spotters:**
1. Submit trend with quality content
2. Earn $1.00 + bonuses (pending)
3. Wait for 2 validation votes
4. If approved: earnings become real
5. If rejected: earnings removed

### **For Validators:**
1. Review submitted trends
2. Vote: Verify, Reject, or Skip
3. Earn $0.10 instantly per vote
4. Build validation score
5. Help maintain quality

---

## 📈 Score Impacts

### **Accuracy Score (Spotters)**
- Trend approved: +5 points
- Trend rejected: -5 points
- Max: 100 points

### **Validation Score (Validators)**
- Each validation: +1 point
- Max: 100 points

---

## 🚫 Restrictions

1. **Cannot validate own trends** - Prevents self-approval
2. **Cannot change votes** - Once cast, votes are final
3. **Cannot vote on decided trends** - Already approved/rejected
4. **Daily earnings cap** - $50.00 maximum per day
5. **Single submission cap** - $3.00 maximum per trend

---

## 💡 Tips for Maximizing Earnings

### **For Spotters:**
- Include screenshots (+$0.15)
- Add complete descriptions (+$0.10)
- Track viral content (+$0.50)
- Focus on finance trends (+$0.10)
- Improve tier status (up to 1.5x)

### **For Validators:**
- Vote on many trends ($0.10 each)
- Be active daily
- Vote accurately to help community

---

## 🔧 Technical Implementation

### **Database Tables:**
- `user_profiles`: earnings_pending, earnings_approved, earnings_paid
- `trend_submissions`: bounty_amount, bonus_amount, total_earned
- `trend_validations`: reward_amount, vote, confirmed

### **Key Functions:**
- `calculate_submission_earnings()`: Calculates bonuses and tier multipliers
- `calculate_validation_earnings()`: Awards $0.10 per validation
- `handle_trend_status_change()`: Moves earnings pending→approved or removes
- `cast_trend_vote()`: Handles voting logic and 2-vote decision

### **Configuration:**
- `web/lib/earningsConfig.ts`: Central configuration for all amounts
- `SIMPLIFIED_EARNINGS_SYSTEM.sql`: Database implementation

---

## 📝 Example Scenarios

### **Scenario 1: Successful Trend**
1. User submits trend with screenshot
2. Base $1.00 + Screenshot $0.15 = $1.15 (PENDING)
3. User has "learning" tier: $1.15 × 0.7 = $0.805 (PENDING)
4. Trend gets 2 approve votes
5. $0.805 moves to APPROVED
6. User can cash out

### **Scenario 2: Rejected Trend**
1. User submits basic trend
2. Base $1.00 × 0.7 (learning) = $0.70 (PENDING)
3. Trend gets 2 reject votes
4. $0.70 removed from PENDING
5. No earnings received

### **Scenario 3: Active Validator**
1. User validates 10 trends in a day
2. Each validation: $0.10 (APPROVED)
3. Total earned: $1.00 (APPROVED)
4. Instantly available for cashout
5. Validation score increases by 10
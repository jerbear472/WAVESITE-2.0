# 🏆 WaveSight Tier Progression Guide

## Quick Reference - The Ladder
```
🆕 LEARNING (1.0x) 
    ↓ 10 trends + 60% approval
✅ VERIFIED (1.5x)
    ↓ 50 trends + 70% approval
🏆 ELITE (2.0x)
    ↓ 100 trends + 80% approval
👑 MASTER (3.0x)

⚠️ RESTRICTED (0.5x) - Poor performance penalty
```

---

## 📊 Detailed Tier Requirements

### 🆕 **LEARNING TIER** (Default)
- **Multiplier**: 1.0x
- **Requirements**: None (starting tier)
- **Earnings**: $0.25 base per trend
- **Description**: New trend spotter
- **How to advance**: Submit 10+ quality trends

### ✅ **VERIFIED TIER** 
- **Multiplier**: 1.5x (+50% earnings)
- **Requirements**: 
  - ✅ 10+ trends submitted
  - ✅ 60%+ approval rate
  - ✅ 60%+ quality score
- **Earnings**: $0.38 base per trend
- **Description**: Proven trend spotter
- **How to advance**: Keep submitting quality trends, reach 50 total

### 🏆 **ELITE TIER**
- **Multiplier**: 2.0x (+100% earnings)
- **Requirements**:
  - ✅ 50+ trends submitted
  - ✅ 70%+ approval rate
  - ✅ 70%+ quality score
- **Earnings**: $0.50 base per trend
- **Description**: Top 5% of trend spotters
- **How to advance**: Maintain quality, reach 100 total trends

### 👑 **MASTER TIER**
- **Multiplier**: 3.0x (+200% earnings)
- **Requirements**:
  - ✅ 100+ trends submitted
  - ✅ 80%+ approval rate
  - ✅ 80%+ quality score
- **Earnings**: $0.75 base per trend
- **Description**: Top 1% of trend spotters
- **How to maintain**: Keep approval rate above 80%

### ⚠️ **RESTRICTED TIER** (Penalty)
- **Multiplier**: 0.5x (-50% earnings)
- **Triggers**:
  - ❌ Approval rate drops below 30%
  - ❌ Quality score drops below 30%
- **Earnings**: $0.13 base per trend
- **Description**: Low quality submissions
- **How to recover**: Improve quality to get back to Learning tier

---

## 📈 Promotion Logic

### **Automatic Promotion** ✅
Tiers are calculated automatically based on your stats:

```sql
IF approval_rate < 30% OR quality_score < 30% → RESTRICTED
ELSE IF trends >= 100 AND approval >= 80% AND quality >= 80% → MASTER
ELSE IF trends >= 50 AND approval >= 70% AND quality >= 70% → ELITE
ELSE IF trends >= 10 AND approval >= 60% AND quality >= 60% → VERIFIED
ELSE → LEARNING
```

### **Real-Time Updates**
- Tier updates happen automatically when your stats change
- No manual approval needed
- Check happens after each trend submission/validation

---

## 💰 Earnings Impact by Tier

### Base Trend ($0.25) at Each Tier:
| Tier | Multiplier | Per Trend | 10 Trends | 100 Trends |
|------|------------|-----------|-----------|------------|
| Restricted | 0.5x | $0.13 | $1.25 | $12.50 |
| Learning | 1.0x | $0.25 | $2.50 | $25.00 |
| Verified | 1.5x | $0.38 | $3.75 | $37.50 |
| Elite | 2.0x | $0.50 | $5.00 | $50.00 |
| Master | 3.0x | $0.75 | $7.50 | $75.00 |

### With Max Streaks (2.5x session × 2.5x daily = 6.25x):
| Tier | Base | With Streaks | Max Possible |
|------|------|--------------|--------------|
| Restricted | $0.13 | $0.78 | $0.78 |
| Learning | $0.25 | $1.56 | $1.56 |
| Verified | $0.38 | $2.34 | $2.34 |
| Elite | $0.50 | $3.13 | $3.13 |
| Master | $0.75 | $4.69 | $4.69 |

*Note: Capped at $5.00 per submission*

---

## 📊 Key Metrics Explained

### **Trends Submitted**
- Total number of trends you've submitted
- Includes both approved and rejected

### **Approval Rate**
- Percentage of your trends that get approved (2+ YES votes)
- Formula: `approved_trends / total_trends`
- Example: 70 approved out of 100 = 70% rate

### **Quality Score**
- Composite score based on:
  - Completeness (title, description, screenshot)
  - Accuracy of predictions
  - Engagement metrics of trends
  - Community feedback
- Calculated automatically

---

## 🎯 Tips for Tier Progression

### **To Reach Verified (1.5x)**
1. Submit at least 10 trends
2. Focus on quality over quantity
3. Include screenshots and descriptions
4. Aim for 6 out of 10 to be approved

### **To Reach Elite (2.0x)**
1. Build consistency - submit regularly
2. Study what gets approved
3. Focus on emerging trends, not established ones
4. Maintain 70% approval (7 out of 10)

### **To Reach Master (3.0x)**
1. Become an expert in specific categories
2. Submit early-stage trends before they peak
3. Provide detailed evidence and context
4. Maintain 80% approval (8 out of 10)

### **To Avoid Restricted (0.5x)**
- Don't spam low-quality submissions
- Don't submit old/established trends
- Don't copy others' submissions
- If restricted, focus on quality to recover

---

## 🔄 Recovery from Restricted

If you fall to Restricted tier:

1. **Stop and analyze** why trends were rejected
2. **Study approved trends** from other users
3. **Start fresh** with higher quality submissions
4. **Focus on completeness**:
   - Always include screenshots
   - Write clear descriptions
   - Add relevant hashtags
   - Include creator info
5. **Goal**: Get approval rate back above 30%

Once above 30% approval → Back to Learning tier
Then follow normal progression path

---

## ❓ FAQ

**Q: How often are tiers updated?**
A: Automatically after each trend submission or validation

**Q: Can I lose my tier?**
A: Yes, if your approval rate or quality score drops below the threshold

**Q: What's the fastest way to Elite?**
A: Submit 50 high-quality trends with 70%+ approval rate

**Q: Do rejected trends hurt my tier?**
A: Yes, they lower your approval rate. Quality > Quantity

**Q: Can I skip tiers?**
A: Yes! If you meet Master requirements, you jump straight to Master

---

## 📱 Check Your Current Tier

In the app:
- Profile → Performance Tier
- Dashboard → Earnings Calculator

Your current tier, requirements for next tier, and progress are all displayed.
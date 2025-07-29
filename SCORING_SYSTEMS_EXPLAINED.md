# Understanding the Two Scoring Systems

WaveSight uses two distinct scoring systems that serve different purposes:

## 1. 🌊 Wave Score (User-Defined Coolness Rating)
**Scale:** 1-100  
**Purpose:** Subjective measure of how "cool" or culturally significant a trend is  
**Who sets it:** Users manually rate trends based on their perception  

### What it measures:
- Cultural impact
- Coolness factor
- Trend appeal
- Personal opinion on trend quality

### Examples:
- A viral dance might get 95/100 (extremely cool)
- A niche meme might get 45/100 (moderately cool)
- A corporate trend might get 20/100 (not very cool)

### Where it's used:
- User ratings/reviews
- Cultural trend analysis
- Subjective trend quality

---

## 2. 📈 Momentum Score (Automated Virality Indicator)
**Scale:** 1-10  
**Purpose:** Objective measure of a trend's viral potential and current velocity  
**Who sets it:** Automatically calculated by the system  

### What it measures:
- **Viral velocity** - How fast it's spreading
- **Community validation** - Yes/No vote ratio
- **Engagement metrics** - Likes, shares, comments
- **Lifecycle stage** - Where the trend is in its journey

### Calculation breakdown:
```
Momentum = (
  AI Prediction (30%) +
  Vote Score (60%) +
  Engagement (40%)
) × Stage Multiplier
```

### Stage Multipliers:
- 🌱 Just Starting: 0.5x
- 📈 Gaining Traction: 0.7x
- 🔥 Trending: 1.0x
- 🚀 Going Viral: 1.3x
- ⭐ At Peak: 0.9x
- 📉 Declining: 0.6x

### Examples:
- New trend with few votes: 3/10 momentum
- Trending with good engagement: 7/10 momentum
- Viral with massive shares: 9/10 momentum

### Where it's used:
- Timeline trend cards
- Trend discovery/filtering
- Automated trend ranking

---

## Key Differences

| Aspect | Wave Score | Momentum Score |
|--------|-----------|----------------|
| **Scale** | 1-100 | 1-10 |
| **Set by** | Users manually | System automatically |
| **Measures** | Coolness/Cultural value | Viral potential/Velocity |
| **Updates** | When users rate | Real-time as data changes |
| **Purpose** | Subjective quality | Objective performance |

## Visual Display

### Timeline Card Example:
```
[Trend Title]
Momentum: 8/10 📈
Votes: 45👍 5👎
[🚀 Going Viral!]
```

### Future User Rating Display:
```
[Trend Title]
Wave Score: 85/100 🌊
"This trend is super cool!"
- Rated by @username
```

## Why Two Systems?

1. **Momentum Score** helps identify trends that are **spreading fast** regardless of quality
2. **Wave Score** helps identify trends that are **culturally significant** regardless of virality

A trend could have:
- High momentum (9/10) but low wave score (30/100) - "It's viral but not cool"
- Low momentum (3/10) but high wave score (90/100) - "It's cool but not spreading"

This dual system provides a complete picture of both trend performance and trend quality.
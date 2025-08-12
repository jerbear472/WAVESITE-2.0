# Earnings Display Standard

## Overview
This document defines the standard for displaying earnings consistently throughout the WaveSite application.

## Standard Format
All earnings should be displayed using one of these two approved formatting functions:

### 1. Primary: `formatEarnings()` from `@/lib/EARNINGS_STANDARD`
```typescript
import { formatEarnings } from '@/lib/EARNINGS_STANDARD';

// Usage
const display = formatEarnings(amount); // Returns "$1.23"
```

### 2. Alternative: `formatCurrency()` from `@/lib/formatters`
```typescript
import { formatCurrency } from '@/lib/formatters';

// Usage
const display = formatCurrency(amount); // Returns "$1.23"
```

## Formatting Rules
- Always display with dollar sign ($)
- Always show 2 decimal places (.00)
- Use comma separators for thousands ($1,234.56)
- Handle null/undefined as $0.00

## ❌ DO NOT USE
- Manual formatting: `$${amount.toFixed(2)}`
- Hard-coded amounts: `"You earned $1.00"`
- Inconsistent decimal places: `$1.2` or `$1.234`

## Common Earnings Display Locations

### 1. Dashboard (`/dashboard`)
- Total Earnings
- Available Balance
- Pending Earnings
- Today's Earnings

### 2. Timeline (`/timeline`)
- Total Earnings counter
- Individual trend earnings
- Bonus earnings display

### 3. Submit Page (`/submit`)
- Success message after submission
- Estimated earnings preview

### 4. Earnings Page (`/earnings`)
- Available balance
- Earnings history
- Cashout amounts

### 5. Validation Page (`/validate`)
- Validation rewards
- Accumulated earnings

## Dynamic Earnings Calculation
When displaying earnings after actions:

```typescript
// Calculate using EARNINGS_STANDARD
const { calculateTrendSubmissionEarnings, formatEarnings } = await import('@/lib/EARNINGS_STANDARD');

const earningResult = calculateTrendSubmissionEarnings(data, tier, streak);
const displayAmount = formatEarnings(earningResult.finalAmount);

// Display to user
setMessage(`You earned ${displayAmount}!`);
```

## Consistency Checklist
- [ ] All earnings use approved formatting functions
- [ ] No hard-coded dollar amounts
- [ ] Consistent 2 decimal places
- [ ] Dynamic calculation based on user tier/bonuses
- [ ] Null/undefined handled gracefully

## Implementation Status
- ✅ Dashboard - Uses `formatCurrency()`
- ✅ Timeline - Updated to use `formatEarnings()`
- ✅ Submit Page - Updated to use dynamic `formatEarnings()`
- ✅ TrendScreenshotUpload - Updated to use `formatEarnings()`
- ⚠️ Mobile app - Needs review and standardization

## Future Improvements
1. Create a single `useEarnings()` hook for consistent earnings management
2. Add unit tests for earnings formatting
3. Add TypeScript strict typing for all earnings amounts
4. Consider internationalization for currency display
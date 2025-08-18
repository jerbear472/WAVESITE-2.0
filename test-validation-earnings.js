// Quick test to verify validation earnings
const { SUSTAINABLE_EARNINGS, calculateValidationEarnings } = require('./web/lib/SUSTAINABLE_EARNINGS.ts');

console.log('🔍 Testing validation earnings...\n');

// Test base validation vote amount
console.log('📋 Base validation vote amount:', SUSTAINABLE_EARNINGS.base.validationVote);
console.log('📋 Expected: 0.02 (2 cents)');
console.log('📋 Match:', SUSTAINABLE_EARNINGS.base.validationVote === 0.02 ? '✅ CORRECT' : '❌ WRONG');

console.log('\n📊 Testing calculateValidationEarnings function:');

// Test for different tiers
const tiers = ['learning', 'verified', 'elite', 'master'];
tiers.forEach(tier => {
  const earnings = calculateValidationEarnings(1, tier);
  console.log(`   ${tier}: ${earnings} (should be 0.02)`);
});

console.log('\n📊 Testing multiple validations:');
for (let i = 1; i <= 5; i++) {
  const earnings = calculateValidationEarnings(i, 'learning');
  console.log(`   ${i} validation(s): $${earnings} (should be $${(0.02 * i).toFixed(2)})`);
}
// Quick check of the validation configuration
const fs = require('fs');

console.log('🔍 Checking validation earnings configuration...\n');

// Read the file content
const content = fs.readFileSync('./web/lib/SUSTAINABLE_EARNINGS.ts', 'utf8');

// Look for the validation vote amount
const validationVoteMatch = content.match(/validationVote:\s*([\d.]+)/);
if (validationVoteMatch) {
  const amount = parseFloat(validationVoteMatch[1]);
  console.log('📋 Found validationVote amount:', amount);
  console.log('📋 Expected: 0.02 (2 cents)');
  console.log('📋 Status:', amount === 0.02 ? '✅ CORRECT' : '❌ WRONG - NEEDS FIX');
  
  if (amount !== 0.02) {
    console.log('\n🚨 PROBLEM FOUND!');
    console.log('The validationVote is set to:', amount);
    console.log('It should be: 0.02');
  }
} else {
  console.log('❌ Could not find validationVote in the file');
}

// Check if there are any hardcoded 0.10 values
const hardcodedTen = content.match(/0\.10?[^0-9]/g);
if (hardcodedTen && hardcodedTen.length > 0) {
  console.log('\n⚠️  Found potential hardcoded 0.10 values:');
  hardcodedTen.forEach(match => console.log('   ', match));
}
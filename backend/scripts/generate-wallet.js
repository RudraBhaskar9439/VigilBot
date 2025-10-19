const { ethers } = require('ethers');

console.log('🔑 Generating Test Wallet...\n');

// Generate a random wallet
const wallet = ethers.Wallet.createRandom();

console.log('═══════════════════════════════════════════════════════════');
console.log('⚠️  TEST WALLET GENERATED (DO NOT USE FOR REAL FUNDS!)');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Address:');
console.log(wallet.address);
console.log('');

console.log('Private Key:');
console.log(wallet.privateKey);
console.log('');

console.log('Mnemonic (Seed Phrase):');
console.log(wallet.mnemonic.phrase);
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('⚠️  IMPORTANT WARNINGS:');
console.log('═══════════════════════════════════════════════════════════');
console.log('1. This is a TEST wallet - Only use on testnets!');
console.log('2. Never send real ETH or tokens to this address');
console.log('3. Never use this private key on mainnet');
console.log('4. Save this info for your .env file');
console.log('═══════════════════════════════════════════════════════════\n');

// Create .env template
const envTemplate = `
# Copy these to your .env file:

# Blockchain
PRIVATE_KEY=${wallet.privateKey}

# This is your bot analyzer address:
# ${wallet.address}
`;

console.log('📝 .env Template:');
console.log(envTemplate);
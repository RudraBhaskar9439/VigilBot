const { ethers } = require('ethers');
const contractData = require('../src/config/contract.json');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractData.address, contractData.abi, wallet);

async function simulateBotTrade() {
    console.log('🤖 Simulating BOT trade (fast, precise, consistent)...\n');
    
    // Bot characteristics:
    // 1. Very precise amount (not rounded)
    const amount = ethers.parseEther('1.547329'); // 6 decimals = bot-like
    
    console.log(`Trader: ${wallet.address}`);
    console.log(`Amount: ${ethers.formatEther(amount)} ETH`);
    console.log(`Time: ${new Date().toISOString()}`);
    
    try {
        const tx = await contract.executeTrade(amount, {
            gasLimit: 200000
        });
        
        console.log(`\n📤 Transaction sent: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        console.log('\n🔍 Check your backend logs for bot detection analysis!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function simulateHumanTrade() {
    console.log('👤 Simulating HUMAN trade (slower, rounded amount)...\n');
    
    // Human characteristics:
    // 1. Rounded amount
    const amount = ethers.parseEther('1.0'); // Rounded = human-like
    
    console.log(`Trader: ${wallet.address}`);
    console.log(`Amount: ${ethers.formatEther(amount)} ETH`);
    console.log(`Time: ${new Date().toISOString()}`);
    
    try {
        const tx = await contract.executeTrade(amount, {
            gasLimit: 200000
        });
        
        console.log(`\n📤 Transaction sent: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        console.log('\n🔍 Check your backend logs for bot detection analysis!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function simulateConsistentBotTrading() {
    console.log('🤖 Simulating CONSISTENT bot trading pattern...\n');
    console.log('Making 5 trades with exact 10-second intervals\n');
    
    for (let i = 1; i <= 5; i++) {
        console.log(`\n═══ Trade ${i}/5 ═══`);
        
        const amount = ethers.parseEther(`${i}.${547329 + i}`); // Precise amounts
        
        try {
            const tx = await contract.executeTrade(amount, {
                gasLimit: 200000
            });
            
            console.log(`✅ Trade ${i} sent: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Trade ${i} confirmed`);
            
            if (i < 5) {
                console.log('⏳ Waiting exactly 10 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            
        } catch (error) {
            console.error(`❌ Trade ${i} failed:`, error.message);
        }
    }
    
    console.log('\n🎉 Consistent trading pattern complete!');
    console.log('🔍 This should trigger BOT detection!');
}

// Menu
async function main() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 BOT BEHAVIOR SIMULATOR');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Choose a scenario:');
    console.log('1. Single bot-like trade (precise amount)');
    console.log('2. Single human-like trade (rounded amount)');
    console.log('3. Consistent bot trading pattern (5 trades, 10s intervals)');
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    const scenario = process.argv[2];
    
    switch(scenario) {
        case '1':
            await simulateBotTrade();
            break;
        case '2':
            await simulateHumanTrade();
            break;
        case '3':
            await simulateConsistentBotTrading();
            break;
        default:
            console.log('Usage: node simulate-bot-trades.js [1|2|3]');
            console.log('Example: node scripts/simulate-bot-trades.js 1');
    }
}

main().then(() => process.exit(0));
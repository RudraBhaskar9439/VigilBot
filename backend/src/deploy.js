const pythClient = require('./services/pythHermesClient');
const blockchainListener = require('./services/blockchainListener');
const botDetector = require('./services/botDetector');
const logger = require('./utils/logger');

console.log('🚀 DEPLOYING BOT DETECTION SYSTEM');
console.log('==================================\n');

async function deploy() {
    try {
        console.log('1️⃣ Initializing Pyth Network connection...');
        await pythClient.startPriceStream();
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Pyth Network connected\n');

        console.log('2️⃣ Initializing blockchain connection...');
        const blockNumber = await blockchainListener.provider.getBlockNumber();
        console.log(`✅ Connected to blockchain (Block: ${blockNumber})\n`);

        console.log('3️⃣ Starting bot detection system...');
        await botDetector.initialize();
        console.log('✅ Bot detection system ready\n');

        console.log('4️⃣ Starting event listeners...');
        blockchainListener.startListening(async (tradeData) => {
            console.log(`📊 Trade detected: ${tradeData.user.slice(0, 8)} - $${tradeData.amount}`);
            
            const analysis = await botDetector.analyzeTrade(tradeData);
            if (analysis.score > 60) {
                console.log(`🤖 Potential bot detected! Score: ${analysis.score}`);
                console.log(`   Signals: ${analysis.signals.join(', ')}`);
            }
        });
        console.log('✅ Event listeners active\n');

        console.log('🎉 BOT DETECTION SYSTEM DEPLOYED SUCCESSFULLY!');
        console.log('==============================================');
        console.log('✅ Pyth Network: Connected');
        console.log('✅ Blockchain: Connected');
        console.log('✅ Bot Detection: Active');
        console.log('✅ Event Listeners: Running');
        console.log('\n📊 System is monitoring for bot activity...');
        console.log('🛑 Press Ctrl+C to stop\n');

        // Keep the system running
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot detection system...');
    pythClient.stop();
    blockchainListener.stopListening();
    console.log('✅ System stopped gracefully');
    process.exit(0);
});

deploy();

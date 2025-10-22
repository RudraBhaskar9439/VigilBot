import mainnetBotDetector from './mainnet-bot-detector.js';
import logger from './utils/logger.js';
import blockchainListener from './services/blockchainListener.js';
import pythHermesClient from './services/pythHermesClient.js';

console.log('🌐 MAINNET BOT DETECTION TEST');
console.log('==============================\n');

async function runMainnetBotTest() {
    try {
        // Start the Pyth price feed
        console.log('1️⃣ Starting Pyth Price Feed...');
        await pythHermesClient.startPriceStream();
        console.log('✅ Connected to Pyth Network price feeds\n');

        // Start the bot detection system
        console.log('2️⃣ Starting Mainnet Bot Detection System...');
        await mainnetBotDetector.start();
        console.log('✅ Bot detection system is running\n');

        // Listen for real trades and analyze them
        console.log('3️⃣ Listening for real trades and detecting bots...');
        blockchainListener.startListening(async (tradeData) => {
            // Analyze each trade for bot behavior
            const result = await mainnetBotDetector.analyzeTrade(tradeData);
            let detectedBots = mainnetBotDetector.getDetectedBots();
            let badBots = detectedBots.filter(bot => bot.score >= mainnetBotDetector.BOT_DETECTION_THRESHOLD);
            let goodBots = detectedBots.filter(bot => bot.score >= 40 && bot.score < mainnetBotDetector.BOT_DETECTION_THRESHOLD);

            // Log trade event details
            console.log(`\n📢 TradeExecuted event received:`);
            console.log(`   User: ${tradeData.user}`);
            console.log(`   Amount: $${tradeData.amount}`);
            console.log(`   BTC Price: $${tradeData.btcPrice}`);
            console.log(`   Block: ${tradeData.blockNumber}`);
            console.log(`   Timestamp: ${tradeData.timestamp}`);

            // Log bot detection result for this trade
            if (result.isBot) {
                if (result.score >= mainnetBotDetector.BOT_DETECTION_THRESHOLD) {
                    console.log(`🚨 BAD BOT DETECTED! Score: ${result.score}/100 | Signals: ${result.signals.join(', ')}`);
                } else {
                    console.log(`🟢 GOOD BOT DETECTED! Score: ${result.score}/100 | Signals: ${result.signals.join(', ')}`);
                }
            } else {
                console.log(`✅ No bot detected for this trade.`);
            }

            // Log bot counts and categorization after every price feed/trade
            console.log('\n🔎 Bot Detection Summary After Trade:');
            console.log(`   Total Bots Detected: ${detectedBots.length}`);
            console.log(`   Bad Bots: ${badBots.length}`);
            if (badBots.length > 0) {
                console.log(`      Bad Bots: ${badBots.map(bot => bot.user).join(', ')}`);
            }
            console.log(`   Good Bots: ${goodBots.length}`);
            if (goodBots.length > 0) {
                console.log(`      Good Bots: ${goodBots.map(bot => bot.user).join(', ')}`);
            }
            // Add clear working status
            if (detectedBots.length > 0) {
                console.log('⚡ Bot detection system is ACTIVE and flagging bots.');
            } else {
                console.log('🟢 Bot detection system is running, no bots flagged yet.');
            }
            console.log('');
        });
        console.log('✅ Listening for live trades\n');

        // Show system status periodically
        const statusInterval = setInterval(() => {
            const status = mainnetBotDetector.getStatus();
            console.log('\n📈 System Status Update:');
            console.log(`   Running: ${status.isRunning}`);
            console.log(`   Detected Bots: ${status.detectedBots}`);
            console.log(`   Active Users: ${status.activeUsers}`);
            console.log(`   Latest BTC Price: $${pythHermesClient.getLatestPrice('BTC/USD')?.price || 'N/A'}`);
        }, 30000); // Update every 30 seconds

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down mainnet bot detection test...');
            clearInterval(statusInterval);
            mainnetBotDetector.stop();
            if (typeof pythHermesClient.stopPriceStream === 'function') {
                pythHermesClient.stopPriceStream();
            }
            process.exit(0);
        });

        // Keep the system running indefinitely
        console.log('\n🎯 Mainnet Bot Detection Test is LIVE!');
        console.log('Press Ctrl+C to stop\n');

    } catch (error) {
        console.error('❌ Mainnet bot test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the mainnet bot test
runMainnetBotTest();

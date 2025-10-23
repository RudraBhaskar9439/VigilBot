import mainnetBotDetector from './mainnet-bot-detector.js';
import logger from './utils/logger.js';
import blockchainListener from './services/blockchainListener.js';
import pythHermesClient from './services/pythHermesClient.js';

console.log('🌐 MAINNET BOT DETECTION SYSTEM');
console.log('==============================\n');

async function runMainnetTest() {
    try {
        // Start the Pyth price feed
        console.log('1️⃣ Starting Pyth Price Feed...');
        await pythHermesClient.startPriceStream();
        
        // Wait for initial prices
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Connected to Pyth Network price feeds\n');

        // Start the bot detection system
        console.log('2️⃣ Starting Mainnet Bot Detection System...');
        await mainnetBotDetector.start();
        console.log('✅ Bot detection system is running\n');

        // Start listening for real trades
        console.log('3️⃣ Starting blockchain listener for live trades...');
        
        // Get initial bot counts
        const goodBotsCount = await blockchainListener.getGoodBotsCount();
        const badBotsCount = await blockchainListener.getBadBotsCount();
        console.log(`📊 Initial Bot Statistics:`);
        console.log(`   Good Bots: ${goodBotsCount}`);
        console.log(`   Bad Bots: ${badBotsCount}\n`);
        
        // Start listening for real-time trades
        blockchainListener.startListening(async (tradeData) => {
            console.log(`\n📢 Trade Event Received:`);
            console.log(`   User: ${tradeData.user}`);
            console.log(`   Amount: $${tradeData.amount}`);
            console.log(`   Block: ${tradeData.blockNumber}`);
            console.log(`   Timestamp: ${new Date(tradeData.timestamp * 1000).toISOString()}`);
            
            // Add price data if available
            if (tradeData.btcPrice) {
                console.log(`   BTC Price: $${tradeData.btcPrice}`);
            }
            
            // Analyze for bot behavior
            const result = await mainnetBotDetector.analyzeTrade(tradeData);
            
            console.log(`\n📊 Analysis Result:`);
            console.log(`   Bot Score: ${result.score}/100`);
            console.log(`   Is Bot: ${result.isBot ? 'YES' : 'NO'}`);
            
            if (result.isBot) {
                logger.warn(`\n🚨 BOT DETECTED IN LIVE TRADE!`);
                logger.warn(`   User: ${tradeData.user}`);
                logger.warn(`   Score: ${result.score}/100`);
                logger.warn(`   Signals: ${result.signals.join(', ')}`);
                
                // Get detailed bot info from contract
                const botInfo = await blockchainListener.getBotInfo(tradeData.user);
                if (botInfo && botInfo.isFlagged) {
                    logger.warn(`   Category: ${botInfo.category === 1 ? 'GOOD_BOT' : botInfo.category === 2 ? 'BAD_BOT' : 'HUMAN'}`);
                    logger.warn(`   Bot Type: ${botInfo.botType}`);
                    if (botInfo.liquidityProvided) {
                        logger.warn(`   Liquidity Provided: $${botInfo.liquidityProvided}`);
                    }
                }
            } else {
                console.log(`   ✅ Human trader detected`);
            }
            
            // Show current detection stats
            const detectedBots = mainnetBotDetector.getDetectedBots();
            console.log(`\n📈 Current Detection Stats:`);
            console.log(`   Total Detected: ${detectedBots.length}`);
            console.log(`   Active Users: ${mainnetBotDetector.userAnalytics.size}`);
        });
        
        console.log('✅ Listening for live trades\n');
        
        // Fetch existing bot lists from contract
        console.log('4️⃣ Fetching existing bot data from contract...');
        const goodBots = await blockchainListener.getGoodBots();
        const badBots = await blockchainListener.getBadBots();
        
        if (goodBots.length > 0) {
            console.log('\n🟢 Known Good Bots on Contract:');
            for (const bot of goodBots.slice(0, 5)) { // Show first 5
                console.log(`   Address: ${bot.address}`);
                console.log(`   Type: ${bot.botType || 'Unknown'}`);
                console.log(`   Score: ${bot.score}`);
                console.log('');
            }
            if (goodBots.length > 5) {
                console.log(`   ... and ${goodBots.length - 5} more`);
            }
        } else {
            console.log('\n🟢 No good bots found on contract yet');
        }
        
        if (badBots.length > 0) {
            console.log('\n🔴 Known Bad Bots on Contract:');
            for (const bot of badBots.slice(0, 5)) { // Show first 5
                console.log(`   Address: ${bot.address}`);
                console.log(`   Score: ${bot.score}`);
                console.log(`   Flagged At: ${new Date(bot.flaggedAt * 1000).toLocaleString()}`);
                console.log('');
            }
            if (badBots.length > 5) {
                console.log(`   ... and ${badBots.length - 5} more`);
            }
        } else {
            console.log('\n🔴 No bad bots found on contract yet');
        }

        // Show system status periodically
        const statusInterval = setInterval(() => {
            const status = mainnetBotDetector.getStatus();
            const latestBtcPrice = pythHermesClient.getLatestPrice('0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43');
            
            console.log('\n📈 System Status Update:');
            console.log(`   Running: ${status.isRunning}`);
            console.log(`   Detected Bots (Last Hour): ${status.detectedBots}`);
            console.log(`   Active Users (Last 24h): ${status.activeUsers}`);
            console.log(`   Latest BTC Price: ${latestBtcPrice ? '$' + latestBtcPrice.price.toFixed(2) : 'N/A'}`);
            console.log(`   Timestamp: ${new Date().toLocaleString()}`);
        }, 30000); // Update every 30 seconds

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down mainnet bot detection system...');
            clearInterval(statusInterval);
            mainnetBotDetector.stop();
            blockchainListener.stopListening();
            
            // Final stats
            const finalStatus = mainnetBotDetector.getStatus();
            console.log('\n📊 Final Statistics:');
            console.log(`   Total Bots Detected: ${mainnetBotDetector.getDetectedBots().length}`);
            console.log(`   Active Users Tracked: ${finalStatus.activeUsers}`);
            
            logger.info('Shutdown complete');
            process.exit(0);
        });

        // Keep the system running indefinitely
        console.log('\n🎯 Bot Detection System is LIVE!');
        console.log('Monitoring Ethereum Mainnet for trading activity...');
        console.log('Press Ctrl+C to stop\n');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Mainnet system failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the mainnet system
runMainnetTest();
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
            console.log(`\n🔍 Analyzing trade from ${tradeData.user}:`);
            console.log(`   Amount: $${tradeData.amount}`);
            console.log(`   BTC Price: $${tradeData.btcPrice}`);
            console.log(`   Reaction Time: ${tradeData.reactionTime}ms`);
            console.log(`   Trade Precision: ${tradeData.precision} decimals`);
            
            // Analyze for bot behavior
            const result = await mainnetBotDetector.analyzeTrade(tradeData);
            
            if (result.isBot) {
                logger.warn(`\n🚨 BOT DETECTED IN LIVE TRADE!`);
                logger.warn(`   User: ${tradeData.user}`);
                logger.warn(`   Score: ${result.score}/100`);
                logger.warn(`   Signals: ${result.signals.join(', ')}`);
                
                // Get detailed bot info
                const botInfo = await blockchainListener.getBotInfo(tradeData.user);
                if (botInfo) {
                    logger.warn(`   Category: ${botInfo.category === 1 ? 'GOOD_BOT' : 'BAD_BOT'}`);
                    logger.warn(`   Bot Type: ${botInfo.botType}`);
                    logger.warn(`   Liquidity Provided: $${botInfo.liquidityProvided}`);
                }
                
                // Get evidence with Pyth proof
                const evidence = await blockchainListener.getBotEvidence(tradeData.user);
                if (evidence) {
                    logger.warn(`   Price at Trade: $${evidence.priceAtTrade}`);
                    logger.warn(`   Reaction Time: ${evidence.reactionTimeMs}ms`);
                }
            }
        });
        console.log('✅ Listening for live trades\n');
        
        // Fetch existing bot lists
        console.log('4️⃣ Fetching existing bot data...');
        const goodBots = await blockchainListener.getGoodBots();
        const badBots = await blockchainListener.getBadBots();
        
        if (goodBots.length > 0) {
            console.log('\n🟢 Known Good Bots:');
            for (const bot of goodBots) {
                console.log(`   Address: ${bot.address}`);
                console.log(`   Type: ${bot.botType}`);
                console.log(`   Liquidity: $${bot.liquidityProvided}`);
                console.log('');
            }
        }
        
        if (badBots.length > 0) {
            console.log('\n🔴 Known Bad Bots:');
            for (const bot of badBots) {
                console.log(`   Address: ${bot.address}`);
                console.log(`   Score: ${bot.score}`);
                console.log(`   Flagged At: ${new Date(bot.flaggedAt * 1000).toLocaleString()}`);
                console.log('');
            }
        }
        // No simulated trades - only real mainnet monitoring

        // Show system status periodically
        const statusInterval = setInterval(() => {
            const status = mainnetBotDetector.getStatus();
            console.log('\n📈 System Status Update:');
            console.log(`   Running: ${status.isRunning}`);
            console.log(`   Detected Bots: ${status.detectedBots}`);
            console.log(`   Active Users: ${status.activeUsers}`);
            console.log(`   Latest BTC Price: $${pythHermesClient.getLatestPrice('BTC/USD')?.price || 'N/A'}`);
        }, 10000); // Update every 10 seconds

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down mainnet bot detection system...');
            clearInterval(statusInterval);
            mainnetBotDetector.stop();
            
            // Clean shutdown - just log and exit
            logger.info('Shutting down price feeds and event listeners...');
            process.exit(0);
        });

        // Keep the system running indefinitely
        console.log('\n🎯 Bot Detection System is LIVE!');
        console.log('Press Ctrl+C to stop\n');

    } catch (error) {
        console.error('❌ Mainnet system failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the mainnet system
runMainnetTest();
const mainnetBotDetector = require('./mainnet-bot-detector');
const logger = require('./utils/logger');

console.log('🌐 MAINNET BOT DETECTION TEST');
console.log('==============================\n');

async function runMainnetTest() {
    try {
        console.log('1️⃣ Starting Mainnet Bot Detection System...');
        await mainnetBotDetector.start();
        console.log('✅ Mainnet bot detector is running\n');

        console.log('2️⃣ Testing Bot Detection with Sample Trades...\n');

        // Test Case 1: Clear Bot
        console.log('📊 Test Case 1: Rapid Trading Bot');
        const botTrade = {
            user: '0x9999999999999999999999999999999999999999',
            amount: 25.50,
            reactionTime: 45, // Very fast
            tradeFrequency: 150, // High frequency
            precision: 8, // High precision
            timeOfDay: 3, // Off-hours
            marketTiming: 'immediate'
        };
        
        const botResult = await mainnetBotDetector.analyzeTrade(botTrade);
        console.log(`   Result: ${botResult.isBot ? '🤖 BOT DETECTED' : '👤 Human'}`);
        console.log(`   Score: ${botResult.score}/100`);
        console.log(`   Signals: ${botResult.signals.join(', ')}\n`);

        // Test Case 2: Human Trader
        console.log('📊 Test Case 2: Normal Human Trader');
        const humanTrade = {
            user: '0x1234567890123456789012345678901234567890',
            amount: 150.75,
            reactionTime: 2500, // Normal human reaction
            tradeFrequency: 5, // Normal frequency
            precision: 2, // Normal precision
            timeOfDay: 14, // Business hours
            marketTiming: 'normal'
        };
        
        const humanResult = await mainnetBotDetector.analyzeTrade(humanTrade);
        console.log(`   Result: ${humanResult.isBot ? '🤖 BOT DETECTED' : '👤 Human'}`);
        console.log(`   Score: ${humanResult.score}/100`);
        console.log(`   Signals: ${humanResult.signals.join(', ')}\n`);

        // Test Case 3: Suspicious Trader
        console.log('📊 Test Case 3: Suspicious Trader');
        const suspiciousTrade = {
            user: '0x7777777777777777777777777777777777777777',
            amount: 75.25,
            reactionTime: 250, // Fast but not superhuman
            tradeFrequency: 60, // High but not extreme
            precision: 5, // Elevated precision
            timeOfDay: 15, // Business hours
            marketTiming: 'fast'
        };
        
        const suspiciousResult = await mainnetBotDetector.analyzeTrade(suspiciousTrade);
        console.log(`   Result: ${suspiciousResult.isBot ? '🤖 BOT DETECTED' : '👤 Human'}`);
        console.log(`   Score: ${suspiciousResult.score}/100`);
        console.log(`   Signals: ${suspiciousResult.signals.join(', ')}\n`);

        // Show system status
        console.log('📈 System Status:');
        const status = mainnetBotDetector.getStatus();
        console.log(`   Running: ${status.isRunning}`);
        console.log(`   Detected Bots: ${status.detectedBots}`);
        console.log(`   Active Users: ${status.activeUsers}`);
        console.log(`   Detection Threshold: ${status.threshold}\n`);

        // Show detected bots
        const detectedBots = mainnetBotDetector.getDetectedBots();
        if (detectedBots.length > 0) {
            console.log('🚨 DETECTED BOTS:');
            detectedBots.forEach((bot, index) => {
                console.log(`   ${index + 1}. ${bot.user} (Score: ${bot.score})`);
                console.log(`      Signals: ${bot.signals.join(', ')}`);
            });
            console.log('');
        }

        console.log('✅ Mainnet Bot Detection Test Complete!');
        console.log('🎉 Your bot detection system is ready for mainnet deployment!');
        
        // Keep the system running for a few more seconds to show monitoring
        console.log('\n⏳ Monitoring for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('\n🛑 Stopping mainnet bot detector...');
        mainnetBotDetector.stop();

    } catch (error) {
        console.error('❌ Mainnet test failed:', error.message);
        console.error(error);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Mainnet test interrupted by user');
    mainnetBotDetector.stop();
    process.exit(0);
});

// Run the mainnet test
runMainnetTest();

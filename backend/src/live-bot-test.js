const botDetector = require('./standalone-bot-detector');
const logger = require('./utils/logger');

console.log('🔥 LIVE BOT DETECTION TEST');
console.log('==========================\n');

async function runLiveBotTest() {
    try {
        console.log('1️⃣ Initializing Bot Detection System...');
        await botDetector.initialize();
        console.log('✅ Bot detection system ready\n');

        console.log('2️⃣ Starting Live Bot Detection Test...');
        console.log('   Simulating real trading activity for 60 seconds...\n');

        let totalTrades = 0;
        let botsDetected = 0;
        let humansDetected = 0;

        // Simulate trading activity for 60 seconds
        const testDuration = 60000; // 60 seconds
        const startTime = Date.now();

        const simulateTrading = () => {
            const now = Date.now();
            if (now - startTime > testDuration) {
                // Test completed
                console.log('\n📊 LIVE TEST RESULTS');
                console.log('====================');
                console.log(`Total trades analyzed: ${totalTrades}`);
                console.log(`Bots detected: ${botsDetected}`);
                console.log(`Humans detected: ${humansDetected}`);
                console.log(`Detection rate: ${totalTrades > 0 ? ((botsDetected / totalTrades) * 100).toFixed(1) : 0}%`);
                console.log('\n✅ Live bot detection test completed!');
                return;
            }

            // Generate random trade data
            const isBot = Math.random() < 0.3; // 30% chance of bot
            const tradeData = generateTradeData(isBot);
            
            // Analyze the trade
            botDetector.analyzeTrade(tradeData).then(result => {
                totalTrades++;
                
                if (result.isBot) {
                    botsDetected++;
                    console.log(`🤖 BOT DETECTED! Score: ${result.score}/100`);
                    console.log(`   User: ${tradeData.user.slice(0, 8)}...`);
                    console.log(`   Amount: $${tradeData.amount}`);
                    console.log(`   Signals: ${result.signals.join(', ')}`);
                    console.log('');
                } else {
                    humansDetected++;
                    console.log(`👤 Human trade: ${tradeData.user.slice(0, 8)}... - $${tradeData.amount} (Score: ${result.score})`);
                }
            }).catch(error => {
                console.error(`Error analyzing trade: ${error.message}`);
            });

            // Schedule next trade
            const nextTradeDelay = isBot ? 
                Math.random() * 1000 : // Bots trade every 0-1 second
                Math.random() * 10000; // Humans trade every 0-10 seconds
            
            setTimeout(simulateTrading, nextTradeDelay);
        };

        // Start the simulation
        simulateTrading();

        // Display periodic stats
        const statsInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.floor((testDuration - (Date.now() - startTime)) / 1000);
            
            console.log(`\n📈 Progress: ${elapsed}s elapsed, ${remaining}s remaining`);
            console.log(`   Trades: ${totalTrades} | Bots: ${botsDetected} | Humans: ${humansDetected}`);
            
            if (remaining <= 0) {
                clearInterval(statsInterval);
            }
        }, 15000); // Every 15 seconds

    } catch (error) {
        console.error('❌ Live test failed:', error.message);
        console.error(error);
    }
}

function generateTradeData(isBot) {
    const users = [
        '0x1234567890123456789012345678901234567890',
        '0x9999999999999999999999999999999999999999',
        '0x8888888888888888888888888888888888888888',
        '0x7777777777777777777777777777777777777777',
        '0x6666666666666666666666666666666666666666',
        '0x5555555555555555555555555555555555555555'
    ];

    if (isBot) {
        // Generate bot-like trading patterns
        return {
            user: users[Math.floor(Math.random() * users.length)],
            amount: Math.random() * 100 + 0.01, // $0.01 - $100
            timestamp: Date.now(),
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
            reactionTime: Math.random() * 200, // 0-200ms (very fast)
            tradeFrequency: Math.random() * 200 + 50, // 50-250 trades/hour
            precision: Math.floor(Math.random() * 5) + 6, // 6-10 decimal places
            timeOfDay: Math.floor(Math.random() * 24), // Any time
            marketTiming: Math.random() > 0.5 ? 'immediate' : 'fast'
        };
    } else {
        // Generate human-like trading patterns
        return {
            user: users[Math.floor(Math.random() * users.length)],
            amount: Math.random() * 1000 + 10, // $10 - $1010
            timestamp: Date.now(),
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
            reactionTime: Math.random() * 5000 + 1000, // 1-6 seconds
            tradeFrequency: Math.random() * 10 + 1, // 1-11 trades/hour
            precision: Math.floor(Math.random() * 3) + 2, // 2-4 decimal places
            timeOfDay: Math.floor(Math.random() * 12) + 8, // 8 AM - 8 PM
            marketTiming: 'normal'
        };
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Live test interrupted by user');
    process.exit(0);
});

// Run the live test
runLiveBotTest();

const botDetector = require('./services/botDetector');
const logger = require('./utils/logger');

console.log('🤖 BOT DETECTION SYSTEM TEST');
console.log('============================\n');

async function testBotDetection() {
    try {
        console.log('1️⃣ Initializing Bot Detection System...');
        await botDetector.initialize();
        console.log('✅ Bot detection system initialized\n');

        console.log('2️⃣ Testing Bot Detection Algorithms...\n');

        // Test 1: Normal Human Trading Pattern
        console.log('📊 Test 1: Normal Human Trading Pattern');
        const humanTrade = {
            user: '0x1234567890123456789012345678901234567890',
            amount: 100.50,
            timestamp: Date.now(),
            transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            blockNumber: 12345,
            reactionTime: 5000, // 5 seconds - normal human reaction
            tradeFrequency: 2, // 2 trades per hour
            precision: 2, // Normal precision
            timeOfDay: 14, // 2 PM - normal trading hours
            marketTiming: 'normal'
        };

        const humanResult = await botDetector.analyzeTrade(humanTrade);
        console.log(`   Result: Score ${humanResult.score}/100`);
        console.log(`   Signals: ${humanResult.signals.join(', ') || 'None'}`);
        console.log(`   Verdict: ${humanResult.score > 60 ? '🤖 BOT DETECTED' : '👤 HUMAN TRADER'}\n`);

        // Test 2: Obvious Bot Pattern - Rapid Trading
        console.log('📊 Test 2: Rapid Trading Bot Pattern');
        const botTrade1 = {
            user: '0x9999999999999999999999999999999999999999',
            amount: 50.00,
            timestamp: Date.now(),
            transactionHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
            blockNumber: 12346,
            reactionTime: 50, // 50ms - superhuman reaction
            tradeFrequency: 120, // 120 trades per hour
            precision: 8, // High precision
            timeOfDay: 3, // 3 AM - unusual hours
            marketTiming: 'immediate'
        };

        const botResult1 = await botDetector.analyzeTrade(botTrade1);
        console.log(`   Result: Score ${botResult1.score}/100`);
        console.log(`   Signals: ${botResult1.signals.join(', ')}`);
        console.log(`   Verdict: ${botResult1.score > 60 ? '🤖 BOT DETECTED' : '👤 HUMAN TRADER'}\n`);

        // Test 3: Bot Pattern - Small Amounts
        console.log('📊 Test 3: Small Amount Bot Pattern');
        const botTrade2 = {
            user: '0x8888888888888888888888888888888888888888',
            amount: 0.01,
            timestamp: Date.now(),
            transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
            blockNumber: 12347,
            reactionTime: 100, // 100ms - very fast
            tradeFrequency: 200, // 200 trades per hour
            precision: 10, // Maximum precision
            timeOfDay: 23, // 11 PM - late night
            marketTiming: 'immediate'
        };

        const botResult2 = await botDetector.analyzeTrade(botTrade2);
        console.log(`   Result: Score ${botResult2.score}/100`);
        console.log(`   Signals: ${botResult2.signals.join(', ')}`);
        console.log(`   Verdict: ${botResult2.score > 60 ? '🤖 BOT DETECTED' : '👤 HUMAN TRADER'}\n`);

        // Test 4: Suspicious Pattern - High Frequency
        console.log('📊 Test 4: High Frequency Trading Pattern');
        const suspiciousTrade = {
            user: '0x7777777777777777777777777777777777777777',
            amount: 25.75,
            timestamp: Date.now(),
            transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
            blockNumber: 12348,
            reactionTime: 200, // 200ms - fast but possible
            tradeFrequency: 60, // 60 trades per hour
            precision: 4, // High precision
            timeOfDay: 9, // 9 AM - normal hours
            marketTiming: 'fast'
        };

        const suspiciousResult = await botDetector.analyzeTrade(suspiciousTrade);
        console.log(`   Result: Score ${suspiciousResult.score}/100`);
        console.log(`   Signals: ${suspiciousResult.signals.join(', ')}`);
        console.log(`   Verdict: ${suspiciousResult.score > 60 ? '🤖 BOT DETECTED' : '👤 HUMAN TRADER'}\n`);

        // Test 5: Edge Case - Very Large Trade
        console.log('📊 Test 5: Large Trade Pattern');
        const largeTrade = {
            user: '0x6666666666666666666666666666666666666666',
            amount: 1000000.00,
            timestamp: Date.now(),
            transactionHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
            blockNumber: 12349,
            reactionTime: 3000, // 3 seconds - normal
            tradeFrequency: 1, // 1 trade per hour
            precision: 2, // Normal precision
            timeOfDay: 15, // 3 PM - normal hours
            marketTiming: 'normal'
        };

        const largeResult = await botDetector.analyzeTrade(largeTrade);
        console.log(`   Result: Score ${largeResult.score}/100`);
        console.log(`   Signals: ${largeResult.signals.join(', ') || 'None'}`);
        console.log(`   Verdict: ${largeResult.score > 60 ? '🤖 BOT DETECTED' : '👤 HUMAN TRADER'}\n`);

        // Summary
        console.log('📋 TEST SUMMARY');
        console.log('================');
        console.log(`👤 Human Trader: ${humanResult.score}/100 (Expected: < 60)`);
        console.log(`🤖 Bot Pattern 1: ${botResult1.score}/100 (Expected: > 60)`);
        console.log(`🤖 Bot Pattern 2: ${botResult2.score}/100 (Expected: > 60)`);
        console.log(`⚠️  Suspicious: ${suspiciousResult.score}/100 (Expected: 40-70)`);
        console.log(`💰 Large Trade: ${largeResult.score}/100 (Expected: < 60)`);

        // Calculate accuracy
        const correctDetections = [
            humanResult.score < 60,
            botResult1.score > 60,
            botResult2.score > 60,
            largeResult.score < 60
        ].filter(Boolean).length;

        const accuracy = (correctDetections / 4) * 100;
        console.log(`\n🎯 Detection Accuracy: ${accuracy}% (${correctDetections}/4 correct)`);

        if (accuracy >= 75) {
            console.log('✅ Bot detection system is working properly!');
        } else if (accuracy >= 50) {
            console.log('⚠️  Bot detection system needs tuning');
        } else {
            console.log('❌ Bot detection system needs debugging');
        }

        console.log('\n3️⃣ Testing Bot Detection Features...\n');

        // Test pending bots functionality
        const pendingBots = botDetector.getPendingBots();
        console.log(`📊 Pending bots: ${pendingBots.length}`);
        
        // Test flagged users functionality
        const flaggedUsers = botDetector.getFlaggedUsers();
        console.log(`🚩 Flagged users: ${flaggedUsers.length}`);

        console.log('\n🎉 Bot Detection System Test Complete!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

// Run the test
testBotDetection();

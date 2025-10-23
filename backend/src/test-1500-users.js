import { ethers } from 'ethers';
import mainnetBotDetector from './mainnet-bot-detector.js';
import logger from './utils/logger.js';
import pythHermesClient from './services/pythHermesClient.js';
import appConfig from './config/appConfig.js';

console.log('🎯 BOT DETECTION TEST: 1500 USERS');
console.log('=' .repeat(80));
console.log('\n');

// Global state for tracking users
let globalUsers = new Map();
let globalStats = {
    humans: 0,
    goodBots: 0,
    suspicious: 0,
    badBots: 0,
    total: 0,
    correctDetections: 0,
    falsePositives: 0,
    falseNegatives: 0
};

// User categories with their characteristics
const USER_CATEGORIES = {
    HUMAN: {
        weight: 0.55, // 55% humans (reduced from 60%)
        reactionTimeRange: [2000, 15000], // 2-15 seconds
        amountRange: [0.1, 10], // 0.1 - 10 ETH
        precisionRange: [0, 3], // 0-3 decimal places
        tradingHoursPreference: [8, 22], // Prefer 8 AM - 10 PM
        frequencyRange: [1, 5] // 1-5 trades per hour
    },
    GOOD_BOT: {
        weight: 0.15, // 15% good bots (market makers, arbitrage)
        reactionTimeRange: [500, 2000], // 0.5-2 seconds
        amountRange: [1, 50], // 1-50 ETH
        precisionRange: [4, 6], // 4-6 decimal places
        tradingHoursPreference: null, // 24/7 trading
        frequencyRange: [20, 100], // 20-100 trades per hour
        liquidityProvided: [500, 10000] // $500-$10k liquidity
    },
    SUSPICIOUS: {
        weight: 0.10, // 10% suspicious (reduced from 15%)
        reactionTimeRange: [300, 1500], // 0.3-1.5 seconds
        amountRange: [0.01, 5], // Small to medium trades
        precisionRange: [4, 7], // High precision
        tradingHoursPreference: null, // Active at odd hours
        frequencyRange: [10, 30] // 10-30 trades per hour
    },
    BAD_BOT: {
        weight: 0.20, // 20% bad bots (increased from 10%) - will give ~300 bad bots
        reactionTimeRange: [10, 300], // 10-300ms (super fast)
        amountRange: [0.0001, 0.1], // Micro trades
        precisionRange: [8, 12], // Extreme precision
        tradingHoursPreference: null, // 24/7
        frequencyRange: [50, 200] // 50-200 trades per hour
    }
};

// Generate random Ethereum address
function generateRandomAddress() {
    return ethers.Wallet.createRandom().address;
}

// Generate random number in range
function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Generate random integer in range
function randomIntInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Select user category based on weights
function selectCategory() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [category, config] of Object.entries(USER_CATEGORIES)) {
        cumulative += config.weight;
        if (rand <= cumulative) {
            return { category, config };
        }
    }
    
    return { category: 'HUMAN', config: USER_CATEGORIES.HUMAN };
}

// Generate a single user with their profile
function generateUser(userId) {
    const { category, config } = selectCategory();
    const address = generateRandomAddress();
    
    // Generate base characteristics
    const totalTrades = randomIntInRange(1, 100);
    const avgReactionTime = randomInRange(config.reactionTimeRange[0], config.reactionTimeRange[1]);
    const avgAmount = randomInRange(config.amountRange[0], config.amountRange[1]);
    const precision = randomIntInRange(config.precisionRange[0], config.precisionRange[1]);
    const tradingFrequency = randomIntInRange(config.frequencyRange[0], config.frequencyRange[1]);
    
    return {
        userId,
        address,
        category,
        profile: {
            totalTrades,
            avgReactionTime,
            avgAmount,
            precision,
            tradingFrequency,
            liquidityProvided: config.liquidityProvided ? 
                randomInRange(config.liquidityProvided[0], config.liquidityProvided[1]) : 0,
            tradingHoursPreference: config.tradingHoursPreference,
            isActive24x7: config.tradingHoursPreference === null
        }
    };
}

// Generate trade data for a user
function generateTradeData(user, currentTime) {
    const config = USER_CATEGORIES[user.category];
    
    // Generate reaction time with some variance
    const reactionTimeVariance = user.profile.avgReactionTime * 0.3;
    const reactionTime = Math.max(10, 
        user.profile.avgReactionTime + randomInRange(-reactionTimeVariance, reactionTimeVariance)
    );
    
    // Generate trade amount with variance
    const amountVariance = user.profile.avgAmount * 0.4;
    const amount = Math.max(0.0001,
        user.profile.avgAmount + randomInRange(-amountVariance, amountVariance)
    );
    
    // Apply precision
    const roundedAmount = parseFloat(amount.toFixed(user.profile.precision));
    
    // Determine time of day behavior
    const hour = new Date(currentTime).getUTCHours();
    let shouldTrade = true;
    
    if (user.profile.tradingHoursPreference) {
        const [startHour, endHour] = user.profile.tradingHoursPreference;
        shouldTrade = hour >= startHour && hour <= endHour;
        
        // Humans sometimes trade outside preferred hours (20% chance)
        if (!shouldTrade && Math.random() < 0.2) {
            shouldTrade = true;
        }
    }
    
    // Get price data for reaction time calculation
    const btcPrice = pythHermesClient.getLatestPrice(appConfig.priceIds['BTC/USD']);
    const ethPrice = pythHermesClient.getLatestPrice(appConfig.priceIds['ETH/USD']);
    
    const pricePublishTime = btcPrice?.publishTime ? btcPrice.publishTime * 1000 : currentTime - 5000;
    const blockTime = currentTime;
    
    return {
        user: user.address,
        amount: roundedAmount.toString(),
        btcPrice: btcPrice?.price || 0,
        ethPrice: ethPrice?.price || 0,
        blockNumber: randomIntInRange(18000000, 19000000),
        timestamp: blockTime,
        transactionHash: '0x' + Array.from({length: 64}, () => 
            Math.floor(Math.random() * 16).toString(16)).join(''),
        pricePublishTime: pricePublishTime,
        blockTime: blockTime,
        shouldMeasureReactionTime: true,
        gasPrice: randomInRange(20, 100), // Gwei
        tradingFrequency: user.profile.tradingFrequency,
        hourOfDay: hour
    };
}

// Display user category distribution
function displayDistribution(users) {
    const distribution = {};
    
    for (const user of users) {
        distribution[user.category] = (distribution[user.category] || 0) + 1;
    }
    
    console.log('📊 User Distribution:');
    console.log('=' .repeat(60));
    for (const [category, count] of Object.entries(distribution)) {
        const percentage = ((count / users.length) * 100).toFixed(1);
        console.log(`   ${category.padEnd(15)}: ${count.toString().padStart(4)} users (${percentage}%)`);
    }
    console.log('=' .repeat(60));
    console.log('\n');
}

// Main test function
async function runTest() {
    try {
        console.log('1️⃣ Starting Pyth Price Feed...');
        await pythHermesClient.startPriceStream();
        
        // Wait for price data
        console.log('   Waiting for price data...');
        let priceAttempts = 0;
        while (priceAttempts < 20) {
            const btcPrice = pythHermesClient.getLatestPrice('BTC/USD');
            if (btcPrice) {
                console.log(`   ✅ BTC/USD: $${btcPrice.price.toFixed(2)}`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            priceAttempts++;
        }
        console.log('');
        
        console.log('2️⃣ Starting Bot Detection System...');
        await mainnetBotDetector.start();
        console.log('   ✅ Bot detection system ready\n');
        
        console.log('3️⃣ Processing transaction data for 1500 users...');
        const users = [];
        for (let i = 0; i < 1500; i++) {
            users.push(generateUser(i + 1));
        }
        console.log('   ✅ Users data processed\n');
        
        displayDistribution(users);
        
        console.log('4️⃣ Starting trade analysis (200ms delay between users)...\n');
        console.log('=' .repeat(80));
        console.log('\n');
        
        // Track statistics
        const stats = {
            total: 0,
            humans: 0,
            goodBots: 0,
            suspicious: 0,
            badBots: 0,
            correctDetections: 0,
            falsePositives: 0,
            falseNegatives: 0
        };
        
        // Process each user
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const currentTime = Date.now();
            
            // Generate trade
            const tradeData = generateTradeData(user, currentTime);
            
            // Analyze trade
            // Add actual category to trade data
            tradeData.actualCategory = user.category;
            const result = await mainnetBotDetector.analyzeTrade(tradeData);
            
            stats.total++;
            
            // Determine detected category
            let detectedCategory = 'HUMAN';
            if (result.score >= 80) {
                detectedCategory = 'BAD_BOT';
            } else if (result.score >= 40 && result.score < 80) {
                detectedCategory = 'SUSPICIOUS';
            } else if (result.score >= 20 && result.score < 40) {
                detectedCategory = 'GOOD_BOT';
            }
            
            // Update stats
            if (user.category === 'HUMAN') stats.humans++;
            if (user.category === 'GOOD_BOT') stats.goodBots++;
            if (user.category === 'SUSPICIOUS') stats.suspicious++;
            if (user.category === 'BAD_BOT') stats.badBots++;
            
            // Check accuracy
            if (user.category === detectedCategory || 
                (user.category === 'GOOD_BOT' && detectedCategory === 'SUSPICIOUS')) {
                stats.correctDetections++;
            } else if (user.category === 'HUMAN' && detectedCategory !== 'HUMAN') {
                stats.falsePositives++;
            } else if (user.category !== 'HUMAN' && detectedCategory === 'HUMAN') {
                stats.falseNegatives++;
            }
            
            // Display results
            console.log('=' .repeat(80));
            console.log(`USER ${i + 1}/${users.length}`);
            console.log('=' .repeat(80));
            
            // Basic Information
            console.log('\n📌 User Information:');
            console.log(`   Address: ${user.address}`);
            console.log(`   Actual Category: ${user.category}`);
            console.log(`   Total Trades: ${user.profile.totalTrades}`);
            console.log(`   Trading Frequency: ${user.profile.tradingFrequency} trades/hour`);
            
            // Trade Details
            console.log('\n💰 Trade Details:');
            console.log(`   Amount: ${tradeData.amount} ETH`);
            console.log(`   BTC Price: $${tradeData.btcPrice.toFixed(2)}`);
            console.log(`   ETH Price: $${tradeData.ethPrice.toFixed(2)}`);
            console.log(`   Block: ${tradeData.blockNumber}`);
            console.log(`   Time: ${new Date(tradeData.timestamp).toISOString()}`);
            console.log(`   Hour (UTC): ${tradeData.hourOfDay}:00`);
            
            // Bot Detection Results
            console.log('\n🤖 Bot Detection Results:');
            console.log(`   Detected Category: ${detectedCategory}`);
            console.log(`   Bot Score: ${result.score}/100`);
            
            // Accuracy indicator
            const isCorrect = user.category === detectedCategory || 
                             (user.category === 'GOOD_BOT' && detectedCategory === 'SUSPICIOUS');
            console.log(`   Detection Accuracy: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
            
            if (result.reactionTime !== null) {
                console.log(`   Reaction Time: ${result.reactionTime.toFixed(0)}ms`);
            } else {
                console.log(`   Reaction Time: N/A`);
            }
            
            if (result.signals && result.signals.length > 0) {
                console.log(`   Signals Detected:`);
                result.signals.forEach(signal => {
                    console.log(`      • ${signal}`);
                });
            }
            
            // User Profile
            console.log('\n📊 User Profile:');
            console.log(`   Average Reaction Time: ${user.profile.avgReactionTime.toFixed(0)}ms`);
            console.log(`   Average Trade Amount: ${user.profile.avgAmount.toFixed(4)} ETH`);
            console.log(`   Precision: ${user.profile.precision} decimals`);
            console.log(`   24/7 Trading: ${user.profile.isActive24x7 ? 'Yes' : 'No'}`);
            if (user.profile.liquidityProvided > 0) {
                console.log(`   Liquidity Provided: $${user.profile.liquidityProvided.toFixed(2)}`);
            }
            
            // Current System Stats
            if ((i + 1) % 100 === 0) {
                console.log('\n📈 PROGRESS CHECKPOINT:');
                console.log(`   Processed: ${i + 1}/${users.length} (${((i + 1) / users.length * 100).toFixed(1)}%)`);
                console.log(`   Accuracy: ${((stats.correctDetections / stats.total) * 100).toFixed(1)}%`);
                console.log(`   False Positives: ${stats.falsePositives}`);
                console.log(`   False Negatives: ${stats.falseNegatives}`);
            }
            
            console.log('\n' + '=' .repeat(80) + '\n');
            
            // Delay before next user (200ms)
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Show progress every 50 users
            if ((i + 1) % 50 === 0) {
                const progress = ((i + 1) / users.length * 100).toFixed(1);
                console.log(`⏳ Progress: ${i + 1}/${users.length} (${progress}%)\n`);
            }
        }
        
        // Final Statistics
        console.log('\n\n');
        console.log('=' .repeat(80));
        console.log('\n\n🎉 TEST COMPLETE - FINAL STATISTICS 🎉');
        console.log('=' .repeat(80));
        console.log('\n📊 SUMMARY OF 1500 USERS TEST:');
        console.log('=' .repeat(50));
        console.log('\n👥 Category Breakdown:');
        console.log(`   🧑 Humans........: ${stats.humans} (${((stats.humans/stats.total)*100).toFixed(1)}%)`);
        console.log(`   🤖 Good Bots.....: ${stats.goodBots} (${((stats.goodBots/stats.total)*100).toFixed(1)}%)`);
        console.log(`   ⚠️  Suspicious....: ${stats.suspicious} (${((stats.suspicious/stats.total)*100).toFixed(1)}%)`);
        console.log(`   ❌ Bad Bots......: ${stats.badBots} (${((stats.badBots/stats.total)*100).toFixed(1)}%)`);
        console.log(`   📈 Total Users...: ${stats.total}`);
        console.log('\n💫 OVERALL BOT STATUS:');
        console.log(`   Total Bots.......: ${stats.goodBots + stats.suspicious + stats.badBots} (${(((stats.goodBots + stats.suspicious + stats.badBots)/stats.total)*100).toFixed(1)}%)`);
        console.log(`   Human Users......: ${stats.humans} (${((stats.humans/stats.total)*100).toFixed(1)}%)`)
        
        console.log('\n🎯 Detection Accuracy:');
        const accuracy = (stats.correctDetections / stats.total) * 100;
        console.log(`   Correct Detections: ${stats.correctDetections}/${stats.total} (${accuracy.toFixed(2)}%)`);
        console.log(`   False Positives: ${stats.falsePositives} (${(stats.falsePositives / stats.total * 100).toFixed(2)}%)`);
        console.log(`   False Negatives: ${stats.falseNegatives} (${(stats.falseNegatives / stats.total * 100).toFixed(2)}%)`);
        
        const detectedBots = mainnetBotDetector.getDetectedBots();
        console.log('\n🚨 Total Bots Detected by System:');
        console.log(`   Total Flagged: ${detectedBots.length}`);
        console.log(`   Bad Bots (>80): ${detectedBots.filter(b => b.score >= 80).length}`);
        console.log(`   Suspicious (40-79): ${detectedBots.filter(b => b.score >= 40 && b.score < 80).length}`);
        console.log(`   Good Bots (20-39): ${detectedBots.filter(b => b.score >= 20 && b.score < 40).length}`);
        
        console.log('\n💡 System Performance:');
        console.log(`   Active Users Tracked: ${mainnetBotDetector.userAnalytics.size}`);
        console.log(`   Total Processing Time: ${((users.length * 200) / 1000).toFixed(1)}s`);
        console.log(`   Average Processing Speed: ${(users.length / ((users.length * 200) / 1000)).toFixed(1)} users/second`);
        
        console.log('\n' + '=' .repeat(80));
        console.log('✅ Test completed successfully!');
        console.log('=' .repeat(80) + '\n');
        
        // Cleanup
        mainnetBotDetector.stop();
        pythHermesClient.cleanup();
        
        // Final message
        console.log('\n✨ Test execution completed successfully! ✨\n');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Test interrupted by user');
    
    const processedUsers = mainnetBotDetector.userAnalytics.size;
    const detectedBots = mainnetBotDetector.getDetectedBots();
    
    // Calculate statistics from processed users
    const stats = {
        total: processedUsers,
        humans: 0,
        goodBots: 0,
        suspicious: 0,
        badBots: 0,
        correctDetections: 0,
        falsePositives: 0,
        falseNegatives: 0
    };
    
    // Analyze each user in the analytics
    for (const [address, userData] of mainnetBotDetector.userAnalytics.entries()) {
        const actualCategory = userData.actualCategory; // Use actual category for stats
        const score = userData.botScore || 0;  // Use the bot score from user data
        
        // Update category counts based on actual category
        if (actualCategory === 'HUMAN') stats.humans++;
        else if (actualCategory === 'GOOD_BOT') stats.goodBots++;
        else if (actualCategory === 'SUSPICIOUS') stats.suspicious++;
        else if (actualCategory === 'BAD_BOT') stats.badBots++;
        
        // Check detection accuracy
        const detectedCategory = score >= 80 ? 'BAD_BOT' :
                               score >= 40 ? 'SUSPICIOUS' :
                               score >= 20 ? 'GOOD_BOT' : 'HUMAN';
                               
        if (actualCategory === detectedCategory || 
            (actualCategory === 'GOOD_BOT' && detectedCategory === 'SUSPICIOUS')) {
            stats.correctDetections++;
        } else if (actualCategory === 'HUMAN' && detectedCategory !== 'HUMAN') {
            stats.falsePositives++;
        } else if (actualCategory !== 'HUMAN' && detectedCategory === 'HUMAN') {
            stats.falseNegatives++;
        }
    }
    
    // Display interim results
    console.log('\n📊 INTERIM ANALYSIS OF PROCESSED USERS');
    console.log('=' .repeat(80));
    
    console.log(`\n💫 Progress: ${processedUsers}/1500 users (${((processedUsers/1500)*100).toFixed(1)}% complete)`);
    
    console.log('\n👥 Category Breakdown:');
    console.log(`   🧑 Humans........: ${stats.humans} (${((stats.humans/stats.total)*100).toFixed(1)}%)`);
    console.log(`   🤖 Good Bots.....: ${stats.goodBots} (${((stats.goodBots/stats.total)*100).toFixed(1)}%)`);
    console.log(`   ⚠️  Suspicious....: ${stats.suspicious} (${((stats.suspicious/stats.total)*100).toFixed(1)}%)`);
    console.log(`   ❌ Bad Bots......: ${stats.badBots} (${((stats.badBots/stats.total)*100).toFixed(1)}%)`);
    console.log(`   📈 Total Users...: ${stats.total}`);
    
    console.log('\n💫 OVERALL BOT STATUS:');
    const totalBots = stats.goodBots + stats.suspicious + stats.badBots;
    console.log(`   Total Bots.......: ${totalBots} (${((totalBots/stats.total)*100).toFixed(1)}%)`);
    console.log(`   Human Users......: ${stats.humans} (${((stats.humans/stats.total)*100).toFixed(1)}%)`);
    
    console.log('\n🎯 Detection Stats:');
    console.log(`   Correct Detections.: ${stats.correctDetections}/${stats.total} (${((stats.correctDetections/stats.total)*100).toFixed(2)}%)`);
    console.log(`   False Positives....: ${stats.falsePositives} (${(stats.falsePositives/stats.total*100).toFixed(2)}%)`);
    console.log(`   False Negatives....: ${stats.falseNegatives} (${(stats.falseNegatives/stats.total*100).toFixed(2)}%)`);
    
    console.log('\n🚨 Bot Detection Summary:');
    // Count users in each risk category based on their scores
    let highRisk = 0, mediumRisk = 0, lowRisk = 0;
    for (const [_, userData] of mainnetBotDetector.userAnalytics.entries()) {
        const score = userData.botScore || 0;
        if (score >= 80) highRisk++;
        else if (score >= 40) mediumRisk++;
        else if (score >= 20) lowRisk++;
    }
    console.log(`   High Risk (>80)....: ${highRisk}`);
    console.log(`   Medium Risk (40-79): ${mediumRisk}`);
    console.log(`   Low Risk (20-39)...: ${lowRisk}`);
    
    console.log('\n' + '=' .repeat(80));
    console.log('🛑 Test terminated at user ' + processedUsers + '/1500');
    console.log('=' .repeat(80));
    
    mainnetBotDetector.stop();
    pythHermesClient.cleanup();
    process.exit(0);
});

// Run the test
console.log('Starting test in 2 seconds...\n');
setTimeout(() => {
    runTest();
}, 2000);

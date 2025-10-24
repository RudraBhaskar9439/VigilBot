import mainnetBotDetector from './mainnet-bot-detector.js';
import logger from './utils/logger.js';

// Simulate a human trader
const simulateHumanTrade = () => {
    const humanTrade = {
        user: '0x1234567890123456789012345678901234567890',
        timestamp: Date.now(),
        amount: '1.5',
        reactionTime: 5000, // 5 seconds reaction time (human-like)
        precision: 2,
        timeOfDay: new Date().getHours(),
        marketTiming: 'normal'
    };
    mainnetBotDetector.analyzeTrade(humanTrade);
};

// Simulate a bot trader
const simulateBotTrade = () => {
    const botTrade = {
        user: '0x9876543210987654321098765432109876543210',
        timestamp: Date.now(),
        amount: '0.00001',
        reactionTime: 50, // 50ms reaction time (bot-like)
        precision: 8,
        timeOfDay: new Date().getHours(),
        marketTiming: 'immediate'
    };
    mainnetBotDetector.analyzeTrade(botTrade);
};

// Start the test
const runTest = async () => {
    // Start the bot detector
    await mainnetBotDetector.start();

    // Simulate trades every few seconds
    setInterval(() => {
        simulateHumanTrade();
        simulateBotTrade();
    }, 5000); // Every 5 seconds

    // Run for 2 minutes then stop
    setTimeout(() => {
        mainnetBotDetector.stop();
        process.exit(0);
    }, 120000);
};

runTest().catch(console.error);
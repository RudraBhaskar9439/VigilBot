import express from 'express';
import { ethers } from 'ethers';
import mainnetBotDetector from '../mainnet-bot-detector.js';
import pythHermesClient from '../services/pythHermesClient.js';
import appConfig from '../config/appConfig.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Store scan results - simple in-memory storage, cleared on refresh
let currentScanResults = {
    isRunning: false,
    progress: 0,
    totalUsers: 0,
    processedUsers: 0,
    users: [],
    stats: {
        humans: 0,
        goodBots: 0,
        suspicious: 0,
        badBots: 0,
        total: 0
    }
};

// User categories with their characteristics (same as test-1500-users.js)
const USER_CATEGORIES = {
    HUMAN: {
        weight: 0.60,
        reactionTimeRange: [2000, 15000],
        amountRange: [0.1, 10],
        precisionRange: [0, 3],
        tradingHoursPreference: [8, 22],
        frequencyRange: [1, 5]
    },
    GOOD_BOT: {
        weight: 0.15,
        reactionTimeRange: [500, 2000],
        amountRange: [1, 50],
        precisionRange: [4, 6],
        tradingHoursPreference: null,
        frequencyRange: [20, 100],
        liquidityProvided: [500, 10000]
    },
    SUSPICIOUS: {
        weight: 0.15,
        reactionTimeRange: [300, 1500],
        amountRange: [0.01, 5],
        precisionRange: [4, 7],
        tradingHoursPreference: null,
        frequencyRange: [10, 30]
    },
    BAD_BOT: {
        weight: 0.10,
        reactionTimeRange: [10, 300],
        amountRange: [0.0001, 0.1],
        precisionRange: [8, 12],
        tradingHoursPreference: null,
        frequencyRange: [50, 200]
    }
};

// Helper functions
function generateRandomAddress() {
    return ethers.Wallet.createRandom().address;
}

function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomIntInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

function generateUser(userId) {
    const { category, config } = selectCategory();
    const address = generateRandomAddress();
    
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

function generateTradeData(user, currentTime) {
    const config = USER_CATEGORIES[user.category];
    
    const reactionTimeVariance = user.profile.avgReactionTime * 0.3;
    const reactionTime = Math.max(10, 
        user.profile.avgReactionTime + randomInRange(-reactionTimeVariance, reactionTimeVariance)
    );
    
    const amountVariance = user.profile.avgAmount * 0.4;
    const amount = Math.max(0.0001,
        user.profile.avgAmount + randomInRange(-amountVariance, amountVariance)
    );
    
    const roundedAmount = parseFloat(amount.toFixed(user.profile.precision));
    
    const hour = new Date(currentTime).getUTCHours();
    
    // Try to get prices, use fallback if not available
    let btcPrice, ethPrice;
    try {
        btcPrice = pythHermesClient.getLatestPrice(appConfig.priceIds['BTC/USD']);
        ethPrice = pythHermesClient.getLatestPrice(appConfig.priceIds['ETH/USD']);
    } catch (error) {
        logger.warn('Could not fetch Pyth prices, using fallback values');
    }
    
    const pricePublishTime = btcPrice?.publishTime ? btcPrice.publishTime * 1000 : currentTime - 5000;
    const blockTime = currentTime;
    
    return {
        user: user.address,
        amount: roundedAmount.toString(),
        btcPrice: btcPrice?.price || 45000,  // Fallback BTC price
        ethPrice: ethPrice?.price || 2500,   // Fallback ETH price
        blockNumber: randomIntInRange(18000000, 19000000),
        timestamp: blockTime,
        transactionHash: '0x' + Array.from({length: 64}, () => 
            Math.floor(Math.random() * 16).toString(16)).join(''),
        pricePublishTime: pricePublishTime,
        blockTime: blockTime,
        shouldMeasureReactionTime: true,
        gasPrice: randomInRange(20, 100),
        tradingFrequency: user.profile.tradingFrequency,
        hourOfDay: hour,
        actualCategory: user.category
    };
}

/**
 * POST /api/scan/start
 * Start the bot detection scan
 */
router.post('/start', async (req, res) => {
    try {
        logger.info('📡 Received scan start request');
        
        if (currentScanResults.isRunning) {
            logger.warn('Scan already running, rejecting new request');
            return res.status(400).json({ error: 'Scan is already running' });
        }

        const { userCount = 1500 } = req.body;
        logger.info(`🚀 Starting scan for ${userCount} users`);

        // Reset results
        currentScanResults = {
            isRunning: true,
            progress: 0,
            totalUsers: userCount,
            processedUsers: 0,
            users: [],
            stats: {
                humans: 0,
                goodBots: 0,
                suspicious: 0,
                badBots: 0,
                total: 0
            }
        };

        res.json({ message: 'Scan started', totalUsers: userCount });
        logger.info('✅ Scan start response sent to client');

        // Run scan in background
        runScan(userCount).catch(error => {
            logger.error(`❌ Scan error: ${error.message}`);
            logger.error(error.stack);
            currentScanResults.isRunning = false;
        });
    } catch (error) {
        logger.error(`❌ Error in scan start endpoint: ${error.message}`);
        res.status(500).json({ error: 'Failed to start scan', details: error.message });
    }
});

/**
 * GET /api/scan/status
 * Get current scan status and results - all users
 */
router.get('/status', (req, res) => {
    // Send all users during and after scan
    res.json(currentScanResults);
});

/**
 * GET /api/scan/results
 * Get detailed scan results
 */
router.get('/results', (req, res) => {
    const { category } = req.query;
    
    let filteredUsers = currentScanResults.users;
    
    if (category) {
        filteredUsers = currentScanResults.users.filter(u => u.detectedCategory === category);
    }
    
    res.json({
        users: filteredUsers,
        stats: currentScanResults.stats,
        totalUsers: currentScanResults.totalUsers,
        processedUsers: currentScanResults.processedUsers,
        isRunning: currentScanResults.isRunning
    });
});

/**
 * POST /api/scan/stop
 * Stop the current scan
 */
router.post('/stop', (req, res) => {
    if (!currentScanResults.isRunning) {
        return res.status(400).json({ error: 'No scan is running' });
    }
    
    currentScanResults.isRunning = false;
    res.json({ message: 'Scan stopped', processedUsers: currentScanResults.processedUsers });
});

// Background scan function
async function runScan(userCount) {
    try {
        logger.info(`Starting bot detection scan for ${userCount} users`);
        
        // Ensure bot detector is started
        if (!mainnetBotDetector.isRunning) {
            await mainnetBotDetector.start();
        }
        
        // Generate users
        const users = [];
        for (let i = 0; i < userCount; i++) {
            users.push(generateUser(i + 1));
        }
        
        // Process each user
        for (let i = 0; i < users.length && currentScanResults.isRunning; i++) {
            const user = users[i];
            const currentTime = Date.now();
            
            // Generate and analyze trade
            const tradeData = generateTradeData(user, currentTime);
            const result = await mainnetBotDetector.analyzeTrade(tradeData);
            
            // Determine detected category
            let detectedCategory = 'HUMAN';
            const score = Number(result.score); // Ensure it's a number
            
            if (score >= 80) {
                detectedCategory = 'BAD_BOT';
            } else if (score >= 40) {
                detectedCategory = 'SUSPICIOUS';
            } else if (score >= 20) {
                detectedCategory = 'GOOD_BOT';
            }
            
            // Debug logging for scores near threshold
            if (score >= 75 && score < 85) {
                logger.info(`Score ${score} → Category: ${detectedCategory}`);
            }
            
            // Update stats based on DETECTED category (not actual category)
            currentScanResults.stats.total++;
            if (detectedCategory === 'HUMAN') currentScanResults.stats.humans++;
            if (detectedCategory === 'GOOD_BOT') currentScanResults.stats.goodBots++;
            if (detectedCategory === 'SUSPICIOUS') currentScanResults.stats.suspicious++;
            if (detectedCategory === 'BAD_BOT') currentScanResults.stats.badBots++;
            
            // Add to detected bots list if not human
            if (detectedCategory !== 'HUMAN') {
                const botEntry = {
                    user: user.address,
                    score: result.score,
                    signals: result.signals || [],
                    reactionTime: result.reactionTime,
                    category: detectedCategory,
                    detectedAt: Date.now(),
                    timestamp: Date.now(),
                    userStats: {
                        totalTrades: user.profile.totalTrades,
                        totalVolume: user.profile.avgAmount * user.profile.totalTrades,
                        tradesLastHour: user.profile.tradingFrequency,
                        avgReactionTime: user.profile.avgReactionTime
                    }
                };
                
                // Add category-specific fields
                if (detectedCategory === 'GOOD_BOT') {
                    botEntry.liquidityProvided = user.profile.liquidityProvided;
                    botEntry.botType = user.profile.liquidityProvided > 5000 ? 'Market Maker' : 'Arbitrage Bot';
                } else if (detectedCategory === 'BAD_BOT') {
                    botEntry.riskLevel = result.score >= 90 ? 'CRITICAL' : result.score >= 80 ? 'HIGH' : 'MEDIUM';
                }
                
                mainnetBotDetector.detectedBots.push(botEntry);
            }
            
            // Store all users directly - simple approach
            currentScanResults.users.push({
                userId: user.userId,
                address: user.address,
                actualCategory: user.category,
                detectedCategory: detectedCategory,
                botScore: score, // Use the converted number
                reactionTime: result.reactionTime,
                signals: result.signals && result.signals.length > 0 ? result.signals.slice(0, 2) : [],
                profile: {
                    totalTrades: user.profile.totalTrades,
                    avgAmount: user.profile.avgAmount,
                    tradingFrequency: user.profile.tradingFrequency,
                    liquidityProvided: user.profile.liquidityProvided
                },
                tradeDetails: {
                    amount: tradeData.amount,
                    timestamp: tradeData.timestamp
                }
            });
            
            // Update progress
            currentScanResults.processedUsers = i + 1;
            currentScanResults.progress = Math.round((i + 1) / userCount * 100);
            
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        currentScanResults.isRunning = false;
        logger.info(`Scan completed: ${currentScanResults.processedUsers}/${userCount} users processed`);
        logger.info(`Stored ${currentScanResults.users.length} users in results`);
        
    } catch (error) {
        logger.error(`Scan failed: ${error.message}`);
        currentScanResults.isRunning = false;
        throw error;
    }
}

export default router;

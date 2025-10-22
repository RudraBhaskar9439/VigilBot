import config from '../config/appConfig.js';
import pythClient from './pythHermesClient.js';
import blockchainListener from './blockchainListener.js';
import contractInteractor from './contractInteractor.js';
import logger from '../utils/logger.js';

class BotDetector {
    constructor() {
        this.detectedGoodBots = []; // Scores 40-59: Market makers, arbitrage bots
        this.detectedBadBots = [];  // Scores >= 60: Manipulative bots
        this.userAnalytics = new Map();
        this.flagWithProof = true;
        
        // Bot classification thresholds with adjusted scores
        this.GOOD_BOT_MIN_SCORE = 35;  // Lowered threshold for automated trading detection
        this.BAD_BOT_MIN_SCORE = 55;   // Lowered threshold for malicious bot detection
        
        // Liquidity threshold for good bot classification
        this.LIQUIDITY_THRESHOLD = 500; // Lowered to $500 for more sensitive detection
        this.MIN_TRADES_FOR_LIQUIDITY_CHECK = 5; // Reduced minimum trades requirement
    }
    
    /**
     * Initialize the bot detector
     */
    async initialize() {
        logger.info('🤖 Bot Detector initialized with Good/Bad bot classification');
        logger.info(`   Good Bot Range: ${this.GOOD_BOT_MIN_SCORE}-${this.BAD_BOT_MIN_SCORE - 1} (Market Makers & Arbitrage)`);
        logger.info(`   Bad Bot Range: ${this.BAD_BOT_MIN_SCORE}+ (Manipulative & Front-running)`);
        logger.info(`   Liquidity Threshold: $${this.LIQUIDITY_THRESHOLD}`);
    }
    
    /**
     * Analyze a trade and calculate bot score with good/bad classification
     */
    async analyzeTrade(tradeData) {
        let botScore = 0;
        const signals = [];
        let botCategory = 'HUMAN'; // HUMAN, GOOD_BOT, or BAD_BOT
        
        // Get user's trade history
        const userTrades = await blockchainListener.getUserTrades(tradeData.user);
        
        // Check 1: Reaction Time Analysis
        const reactionScore = this.checkReactionTime(tradeData);
        botScore += reactionScore.score;
        if (reactionScore.signal) signals.push(reactionScore.signal);
        
        // Check 2: Trading Pattern Consistency
        if (userTrades.length >= 3) { // Reduced minimum trades requirement
            const patternScore = this.checkTradingPattern(userTrades);
            botScore += patternScore.score;
            if (patternScore.signal) signals.push(patternScore.signal);
        }
        
        // Check 3: Precision Analysis
        const precisionScore = this.checkPrecision(tradeData);
        botScore += precisionScore.score;
        if (precisionScore.signal) signals.push(precisionScore.signal);
        
        // Check 4: 24/7 Trading Pattern
        if (userTrades.length >= 10) {
            const activityScore = this.check24x7Activity(userTrades);
            botScore += activityScore.score;
            if (activityScore.signal) signals.push(activityScore.signal);
        }
        
        // Check 5: Multi-Pool Monitoring
        const multiPoolScore = this.checkMultiPoolActivity(tradeData.user);
        botScore += multiPoolScore.score;
        if (multiPoolScore.signal) signals.push(multiPoolScore.signal);
        
        // Check 6: Liquidity Provision Analysis (determines good vs bad bot)
        const liquidityAnalysis = await this.analyzeLiquidityProvision(tradeData.user, userTrades);
        
        // Classify the bot
        if (botScore >= this.BAD_BOT_MIN_SCORE) {
            // High score = potentially malicious
            if (liquidityAnalysis.isLiquidityProvider) {
                // Even with high score, if providing liquidity, classify as GOOD_BOT
                botCategory = 'GOOD_BOT';
                botScore = Math.min(botScore, 59); // Cap at 59 for good bots
                signals.push(`Liquidity Provider: $${liquidityAnalysis.totalLiquidity.toFixed(2)}`);
                logger.info(`✅ High-frequency trader providing liquidity: ${tradeData.user}`);
            } else {
                // High score + no liquidity provision = BAD_BOT
                botCategory = 'BAD_BOT';
                signals.push('No significant liquidity provision');
                logger.warn(`🚨 Manipulative bot detected: ${tradeData.user}`);
            }
        } else if (botScore >= this.GOOD_BOT_MIN_SCORE) {
            // Medium score = likely legitimate bot
            botCategory = 'GOOD_BOT';
            signals.push('Legitimate automated trading pattern');
            logger.info(`🟢 Good bot detected (Market Maker/Arbitrage): ${tradeData.user}`);
        } else {
            // Low score = human trader
            botCategory = 'HUMAN';
        }
        
        // Store in appropriate array
        if (botCategory === 'GOOD_BOT') {
            this.detectedGoodBots.push({
                user: tradeData.user,
                score: botScore,
                signals: signals,
                detectedAt: Date.now(),
                liquidityProvided: liquidityAnalysis.totalLiquidity,
                category: 'GOOD_BOT',
                type: liquidityAnalysis.botType
            });
            
            logger.info(`🟢 Good Bot Added: ${tradeData.user} (Score: ${botScore})`);
            logger.info(`   Type: ${liquidityAnalysis.botType}`);
            logger.info(`   Liquidity: $${liquidityAnalysis.totalLiquidity.toFixed(2)}`);
        } else if (botCategory === 'BAD_BOT') {
            this.detectedBadBots.push({
                user: tradeData.user,
                score: botScore,
                signals: signals,
                detectedAt: Date.now(),
                category: 'BAD_BOT',
                riskLevel: this.calculateRiskLevel(botScore, signals)
            });
            
            logger.warn(`🔴 Bad Bot Added: ${tradeData.user} (Score: ${botScore})`);
            logger.warn(`   Risk Level: ${this.calculateRiskLevel(botScore, signals)}`);
        }
        
        // Batch flag when we have enough bots
        if (this.detectedGoodBots.length + this.detectedBadBots.length >= config.batchSize) {
            await this.batchFlagBots();
        }
        
        // Trigger immediate flagging for testing
        await this.batchFlagBots();
        
        return { 
            isBot: botCategory !== 'HUMAN',
            botScore, 
            signals,
            category: botCategory,
            liquidityAnalysis
        };
    }
    
    /**
     * NEW: Analyze if the bot is providing liquidity (Market Maker/Arbitrage)
     */
    async analyzeLiquidityProvision(userAddress, userTrades) {
        if (userTrades.length < this.MIN_TRADES_FOR_LIQUIDITY_CHECK) {
            return {
                isLiquidityProvider: false,
                totalLiquidity: 0,
                botType: 'Unknown'
            };
        }
        
        // Calculate total volume traded
        const totalVolume = userTrades.reduce((sum, trade) => {
            return sum + parseFloat(trade.amount || 0);
        }, 0);
        
        // Check for market maker patterns
        const isMarketMaker = this.detectMarketMakerPattern(userTrades);
        
        // Check for arbitrage patterns
        const isArbitrageBot = this.detectArbitragePattern(userTrades);
        
        // Determine if this bot is beneficial
        const isLiquidityProvider = (
            (isMarketMaker || isArbitrageBot) && 
            totalVolume >= this.LIQUIDITY_THRESHOLD
        );
        
        let botType = 'Unknown';
        if (isMarketMaker) botType = 'Market Maker';
        else if (isArbitrageBot) botType = 'Arbitrage Bot';
        
        return {
            isLiquidityProvider,
            totalLiquidity: totalVolume,
            botType,
            isMarketMaker,
            isArbitrageBot
        };
    }
    
    /**
     * Detect Market Maker pattern: Frequent buy/sell orders with consistent spreads
     */
    detectMarketMakerPattern(userTrades) {
        if (userTrades.length < 10) return false;
        
        // Market makers typically:
        // 1. Trade frequently (multiple times per hour)
        // 2. Have consistent trade sizes
        // 3. Trade on both sides (buy and sell)
        
        // Convert timestamps to hours and calculate trading frequency
        const startTime = userTrades[0].timestamp; // Already in seconds
        const endTime = userTrades[userTrades.length - 1].timestamp;
        const hoursDiff = Math.max((endTime - startTime) / 3600, 1); // Convert seconds to hours with 1 hour minimum
        const tradingFrequency = userTrades.length / hoursDiff;

        // Check if trading frequency is high (>50 trades per hour)
        const hasHighFrequency = tradingFrequency > 50;
        logger.info(`Trading frequency for ${userTrades[0].user}: ${tradingFrequency.toFixed(2)} trades/hour`);
        
        // Check for consistent trade sizes (market makers use similar sizes)
        const amounts = userTrades.map(t => parseFloat(t.amount || 0));
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, amount) => {
            return sum + Math.pow(amount - avgAmount, 2);
        }, 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const hasConsistentSizes = (stdDev / avgAmount) < 0.5; // Low variance
        
        return hasHighFrequency && hasConsistentSizes;
    }
    
    /**
     * Detect Arbitrage pattern: Quick trades exploiting price differences
     */
    detectArbitragePattern(userTrades) {
        if (userTrades.length < 5) return false;
        
        // Arbitrage bots typically:
        // 1. Execute trades very quickly (within seconds)
        // 2. Trade in bursts
        // 3. Have precise trade amounts
        
        let burstCount = 0;
        for (let i = 1; i < userTrades.length; i++) {
            // Compare timestamps (already in seconds)
            const timeDiff = Math.abs(userTrades[i].timestamp - userTrades[i - 1].timestamp);
            if (timeDiff < 2) { // Within 2 seconds
                burstCount++;
            }
        }
        
        const burstRatio = burstCount / userTrades.length;
        logger.info(`Burst ratio for ${userTrades[0].user}: ${(burstRatio * 100).toFixed(1)}%`);
        return burstRatio > 0.4; // More than 40% of trades are in bursts
    }
    
    /**
     * Calculate risk level for bad bots
     */
    calculateRiskLevel(score, signals) {
        if (score >= 80) return 'CRITICAL';
        if (score >= 70) return 'HIGH';
        return 'MEDIUM';
    }
    
    /**
     * Check 1: Reaction Time (using FREE Pyth data)
     */
    checkReactionTime(tradeData) {
        const btcPrice = pythClient.getLatestPrice(config.priceIds['BTC/USD']);
        const ethPrice = pythClient.getLatestPrice(config.priceIds['ETH/USD']);
        const solPrice = pythClient.getLatestPrice(config.priceIds['SOL/USD']);
        
        // Use any available price feed for reaction time
        const latestPrice = btcPrice || ethPrice || solPrice;
        
        if (!latestPrice) {
            logger.warn('No price data available from Pyth');
            return { score: 15, signal: 'Price feed check skipped' }; // Give partial score when price unavailable
        }
        
        const reactionTime = Math.abs(tradeData.timestamp - latestPrice.publishTime);
        
        if (reactionTime < 10000) {
            return {
                score: 35,
                signal: `Superhuman reaction: ${reactionTime}ms`
            };
        } else if (reactionTime < 20000) {
            return {
                score: 25,
                signal: `Very fast reaction: ${reactionTime}ms`
            };
        } else if (reactionTime < 50000) {
            return {
                score: 15,
                signal: `Fast reaction: ${reactionTime}ms`
            };
        }
        
        return { score: 0, signal: null };
    }
    
    /**
     * Check 2: Trading Pattern Consistency
     */
    checkTradingPattern(userTrades) {
        if (userTrades.length < 2) {
            return { score: 0, signal: null };
        }
        
        const intervals = [];
        for (let i = 1; i < userTrades.length; i++) {
            intervals.push(userTrades[i].timestamp - userTrades[i - 1].timestamp);
        }
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - mean, 2);
        }, 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        const consistency = stdDev === 0 ? 100 : (1 - Math.min(stdDev / mean, 1)) * 100;
        
        if (consistency > 90) {
            return {
                score: 35,
                signal: `Very consistent trading pattern: ${consistency.toFixed(1)}%`
            };
        } else if (consistency > 80) {
            return {
                score: 25,
                signal: `Consistent trading pattern: ${consistency.toFixed(1)}%`
            };
        } else if (consistency > 70) {
            return {
                score: 15,
                signal: `Somewhat consistent pattern: ${consistency.toFixed(1)}%`
            };
        }
        
        return { score: 0, signal: null };
    }
    
    /**
     * Check 3: Precision Analysis
     */
    checkPrecision(tradeData) {
        const amount = parseFloat(tradeData.amount);
        const isRounded = amount % 1000 === 0 || amount % 100 === 0 || amount % 10 === 0;
        
        if (!isRounded) {
            const amountStr = amount.toString();
            const decimalPlaces = amountStr.includes('.') 
                ? amountStr.split('.')[1].length 
                : 0;
            
            if (decimalPlaces > 6) {
                return {
                    score: 30,
                    signal: `Extreme precision: ${decimalPlaces} decimal places`
                };
            } else if (decimalPlaces > 4) {
                return {
                    score: 20,
                    signal: `High precision: ${decimalPlaces} decimal places`
                };
            } else if (decimalPlaces > 2) {
                return {
                    score: 5,
                    signal: `Moderate precision: ${decimalPlaces} decimal places`
                };
            }
        }
        
        return { score: 0, signal: null };
    }
    
    /**
     * Check 4: 24/7 Trading Activity
     */
    check24x7Activity(userTrades) {
        const hours = userTrades.map(trade => {
            // Timestamps are in seconds, convert to milliseconds for Date
            const date = new Date(trade.timestamp * 1000);
            return date.getUTCHours();
        });
        
        const uniqueHours = new Set(hours);
        const hourCoverage = (uniqueHours.size / 24) * 100;
        
        if (hourCoverage > 70) {
            return {
                score: 25,
                signal: `24/7 trading: ${uniqueHours.size} different hours`
            };
        } else if (hourCoverage > 50) {
            return {
                score: 15,
                signal: `Extensive trading: ${uniqueHours.size} different hours`
            };
        }
        
        return { score: 0, signal: null };
    }
    
    /**
     * Check 5: Multi-Pool Monitoring
     */
    checkMultiPoolActivity(userAddress) {
        const analytics = this.userAnalytics.get(userAddress) || { priceFeeds: new Set() };
        
        if (analytics.priceFeeds.size > 5) {
            return {
                score: 15,
                signal: `Monitoring ${analytics.priceFeeds.size} price feeds`
            };
        } else if (analytics.priceFeeds.size > 3) {
            return {
                score: 5,
                signal: `Monitoring ${analytics.priceFeeds.size} price feeds`
            };
        }
        
        return { score: 0, signal: null };
    }
    
    /**
     * Batch flag bots - NOW HANDLES GOOD AND BAD BOTS SEPARATELY
     */
    async batchFlagBots() {
        if (this.detectedGoodBots.length === 0 && this.detectedBadBots.length === 0) {
            return;
        }
        
        logger.info(`\n${'='.repeat(60)}`);
        logger.info(`🎯 BATCH FLAGGING BOTS`);
        logger.info(`${'='.repeat(60)}`);
        logger.info(`🟢 Good Bots to flag: ${this.detectedGoodBots.length}`);
        logger.info(`🔴 Bad Bots to flag: ${this.detectedBadBots.length}`);
        logger.info(`${'='.repeat(60)}\n`);
        
        let result;
        
        if (this.flagWithProof) {
            // Use Pyth proof for both good and bad bots separately
            logger.info('🎯 Using Pyth price proof (separate good/bad bot arrays)');
            result = await contractInteractor.flagAllBotsWithPythProof(
                this.detectedGoodBots,
                this.detectedBadBots
            );
        } else {
            // Regular flagging for both categories
            logger.info('💰 Using regular flagging (cost-efficient mode)');
            const goodResult = await contractInteractor.flagGoodBots(this.detectedGoodBots);
            const badResult = await contractInteractor.flagBadBots(this.detectedBadBots);
            result = {
                goodBots: goodResult,
                badBots: badResult,
                summary: {
                    totalGoodBots: this.detectedGoodBots.length,
                    totalBadBots: this.detectedBadBots.length,
                    successfulFlags: (goodResult.success ? goodResult.count : 0) + 
                                   (badResult.success ? badResult.count : 0),
                    failedFlags: (!goodResult.success ? this.detectedGoodBots.length : 0) +
                               (!badResult.success ? this.detectedBadBots.length : 0)
                }
            };
        }
        
        if (result.summary.successfulFlags > 0) {
            logger.info(`✅ Successfully flagged ${result.summary.successfulFlags} bots`);
            logger.info(`   🟢 Good Bots: ${result.summary.totalGoodBots}`);
            logger.info(`   🔴 Bad Bots: ${result.summary.totalBadBots}`);
            
            // Clear both arrays
            this.detectedGoodBots = [];
            this.detectedBadBots = [];
        } else {
            logger.error(`❌ Failed to flag bots`);
        }
    }
    
    /**
     * Toggle between Pyth proof mode and regular mode
     */
    setProofMode(useProof) {
        this.flagWithProof = useProof;
        logger.info(`🔧 Proof mode: ${useProof ? 'ON (Pyth integration)' : 'OFF (cost-efficient)'}`);
    }
    
    /**
     * Get analytics for a user
     */
    async getUserAnalytics(userAddress) {
        const trades = await blockchainListener.getUserTrades(userAddress);
        const botStatus = await blockchainListener.isBot(userAddress);
        
        if (trades.length === 0) {
            return {
                user: userAddress,
                totalTrades: 0,
                isFlagged: botStatus.isFlagged,
                botScore: botStatus.score,
                category: 'UNKNOWN'
            };
        }
        
        const intervals = [];
        for (let i = 1; i < trades.length; i++) {
            intervals.push(trades[i].timestamp - trades[i - 1].timestamp);
        }
        
        const avgInterval = intervals.length > 0 
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
            : 0;
        
        const hours = trades.map(trade => new Date(trade.timestamp * 1000).getUTCHours());
        const uniqueHours = new Set(hours).size;
        
        // Determine category based on score
        let category = 'HUMAN';
        if (botStatus.score >= this.BAD_BOT_MIN_SCORE) {
            category = 'BAD_BOT';
        } else if (botStatus.score >= this.GOOD_BOT_MIN_SCORE) {
            category = 'GOOD_BOT';
        }
        
        return {
            user: userAddress,
            totalTrades: trades.length,
            isFlagged: botStatus.isFlagged,
            botScore: botStatus.score,
            category: category,
            avgInterval: avgInterval,
            uniqueHoursTraded: uniqueHours,
            firstTrade: trades[0].timestamp,
            lastTrade: trades[trades.length - 1].timestamp
        };
    }
    
    /**
     * Get all detected good bots
     */
    getGoodBots() {
        return this.detectedGoodBots;
    }
    
    /**
     * Get all detected bad bots
     */
    getBadBots() {
        return this.detectedBadBots;
    }
    
    /**
     * Get all pending bots (combined for backward compatibility)
     */
    getPendingBots() {
        return [...this.detectedGoodBots, ...this.detectedBadBots];
    }
    
    /**
     * Get flagged users (backward compatibility)
     */
    getFlaggedUsers() {
        return this.getPendingBots();
    }
}

export default new BotDetector();
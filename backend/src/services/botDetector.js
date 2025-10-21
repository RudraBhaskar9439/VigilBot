import config from '../config/config.js';
import pythClient from './pythHermesClient.js';
import blockchainListener from './blockchainListener.js';
import contractInteractor from './contractInteractor.js';
import logger from '../utils/logger.js';

class BotDetector {
    constructor() {
        this.detectedBots = [];
        this.userAnalytics = new Map();
        this.flagWithProof = true; // Toggle: Use Pyth proof or not
    }
    
    /**
     * Analyze a trade and calculate bot score
     */
    async analyzeTrade(tradeData) {
        let botScore = 0;
        const signals = [];
        
        // Get user's trade history
        const userTrades = await blockchainListener.getUserTrades(tradeData.user);
        
        // Check 1: Reaction Time Analysis
        const reactionScore = this.checkReactionTime(tradeData);
        botScore += reactionScore.score;
        if (reactionScore.signal) signals.push(reactionScore.signal);
        
        // Check 2: Trading Pattern Consistency
        if (userTrades.length >= 5) {
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
        
        const isBot = botScore >= config.botScoreThreshold;
        
        logger.info(`🔍 Analysis for ${tradeData.user}: Score ${botScore}/100 - ${isBot ? 'BOT' : 'HUMAN'}`);
        
        if (isBot) {
            this.detectedBots.push({
                user: tradeData.user,
                score: botScore,
                signals: signals,
                detectedAt: Date.now()
            });
            
            // Batch flag when we have enough
            if (this.detectedBots.length >= config.batchSize) {
                await this.batchFlagBots();
            }
        }
        
        return { isBot, botScore, signals };
    }
    
    /**
     * Check 1: Reaction Time (using FREE Pyth data)
     */
    checkReactionTime(tradeData) {
        const btcPrice = pythClient.getLatestPrice(config.priceIds['BTC/USD']);
        
        if (!btcPrice) {
            return { score: 0, signal: null };
        }
        
        const reactionTime = tradeData.timestamp - btcPrice.publishTime;
        
        if (reactionTime < 1) {
            return {
                score: 30,
                signal: `Sub-second reaction: ${reactionTime.toFixed(3)}s`
            };
        } else if (reactionTime < 3) {
            return {
                score: 15,
                signal: `Very fast reaction: ${reactionTime.toFixed(2)}s`
            };
        } else if (reactionTime < 5) {
            return {
                score: 5,
                signal: `Fast reaction: ${reactionTime.toFixed(2)}s`
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
        
        // Calculate intervals between trades
        const intervals = [];
        for (let i = 1; i < userTrades.length; i++) {
            intervals.push(userTrades[i].timestamp - userTrades[i - 1].timestamp);
        }
        
        // Calculate standard deviation
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - mean, 2);
        }, 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate consistency (lower stdDev = more consistent = more bot-like)
        const consistency = stdDev === 0 ? 100 : (1 - Math.min(stdDev / mean, 1)) * 100;
        
        if (consistency > 90) {
            return {
                score: 25,
                signal: `Very consistent trading pattern: ${consistency.toFixed(1)}%`
            };
        } else if (consistency > 80) {
            return {
                score: 15,
                signal: `Consistent trading pattern: ${consistency.toFixed(1)}%`
            };
        } else if (consistency > 70) {
            return {
                score: 5,
                signal: `Somewhat consistent pattern: ${consistency.toFixed(1)}%`
            };
        }
        
        return { score: 0, signal: null };
    }
    
    /**
     * Check 3: Precision Analysis (exact calculations vs rounded)
     */
    checkPrecision(tradeData) {
        const amount = parseFloat(tradeData.amount);
        
        // Check if amount is rounded (humans typically use round numbers)
        const isRounded = amount % 1000 === 0 || amount % 100 === 0 || amount % 10 === 0;
        
        if (!isRounded) {
            // Count decimal places
            const amountStr = amount.toString();
            const decimalPlaces = amountStr.includes('.') 
                ? amountStr.split('.')[1].length 
                : 0;
            
            if (decimalPlaces > 6) {
                return {
                    score: 25,
                    signal: `Extreme precision: ${decimalPlaces} decimal places`
                };
            } else if (decimalPlaces > 4) {
                return {
                    score: 15,
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
        // Get unique hours of trading
        const hours = userTrades.map(trade => {
            const date = new Date(trade.timestamp * 1000);
            return date.getUTCHours();
        });
        
        const uniqueHours = new Set(hours);
        const hourCoverage = (uniqueHours.size / 24) * 100;
        
        if (hourCoverage > 80) {
            return {
                score: 20,
                signal: `24/7 trading: ${uniqueHours.size} different hours`
            };
        } else if (hourCoverage > 60) {
            return {
                score: 10,
                signal: `Extensive trading: ${uniqueHours.size} different hours`
            };
        }
        
        return { score: 0, signal: null };
    }
    
    /**
     * Check 5: Multi-Pool Monitoring
     */
    checkMultiPoolActivity(userAddress) {
        // Track which price feeds this user's trades correlate with
        const analytics = this.userAnalytics.get(userAddress) || { priceFeeds: new Set() };
        
        // For demo, assume user queries multiple feeds if they trade frequently
        // In production, you'd track actual price feed queries
        
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
     * Batch flag bots (choose method based on setting)
     */
    async batchFlagBots() {
        if (this.detectedBots.length === 0) return;
        
        logger.info(`🔨 Batch flagging ${this.detectedBots.length} bots...`);
        
        const users = this.detectedBots.map(bot => bot.user);
        const scores = this.detectedBots.map(bot => bot.score);
        const reasons = this.detectedBots.map(bot => bot.signals.slice(0, 3).join('; '));
        
        let result;
        
        if (this.flagWithProof) {
            // Use Pyth proof (demonstrates integration - for hackathon!)
            logger.info('🎯 Using Pyth price proof (hackathon demo mode)');
            result = await contractInteractor.flagBotsWithPythProof(users, scores, reasons);
        } else {
            // Regular flagging (cheaper)
            logger.info('💰 Using regular flagging (cost-efficient mode)');
            result = await contractInteractor.flagBots(users, scores, reasons);
        }
        
        if (result.success) {
            logger.info(`✅ Successfully flagged ${this.detectedBots.length} bots`);
            this.detectedBots = []; // Clear the batch
        } else {
            logger.error(`❌ Failed to flag bots: ${result.error}`);
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
                botScore: botStatus.score
            };
        }
        
        // Calculate trading statistics
        const intervals = [];
        for (let i = 1; i < trades.length; i++) {
            intervals.push(trades[i].timestamp - trades[i - 1].timestamp);
        }
        
        const avgInterval = intervals.length > 0 
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
            : 0;
        
        const hours = trades.map(trade => new Date(trade.timestamp * 1000).getUTCHours());
        const uniqueHours = new Set(hours).size;
        
        return {
            user: userAddress,
            totalTrades: trades.length,
            isFlagged: botStatus.isFlagged,
            botScore: botStatus.score,
            avgInterval: avgInterval,
            uniqueHoursTraded: uniqueHours,
            firstTrade: trades[0].timestamp,
            lastTrade: trades[trades.length - 1].timestamp
        };
    }
    
    /**
     * Get all detected bots (pending flagging)
     */
    getPendingBots() {
        return this.detectedBots;
    }
}

export default new BotDetector();
const logger = require('./utils/logger');

class StandaloneBotDetector {
    constructor() {
        this.detectedBots = [];
        this.userAnalytics = new Map();
        this.BOT_DETECTION_THRESHOLD = 60; // Threshold for bot detection
    }
    
    /**
     * Initialize the bot detector (standalone version)
     */
    async initialize() {
        logger.info('🤖 Standalone Bot Detector initialized');
        return true;
    }
    
    /**
     * Analyze a trade and calculate bot score
     */
    async analyzeTrade(tradeData) {
        let botScore = 0;
        const signals = [];
        
        try {
            // Check 1: Reaction Time Analysis
            if (tradeData.reactionTime !== undefined) {
                if (tradeData.reactionTime < 100) {
                    botScore += 25;
                    signals.push('Superhuman reaction time (<100ms)');
                } else if (tradeData.reactionTime < 200) {
                    botScore += 15;
                    signals.push('Very fast reaction time (<200ms)');
                } else if (tradeData.reactionTime < 500) {
                    botScore += 5;
                    signals.push('Fast reaction time (<500ms)');
                }
            }
            
            // Check 2: Trading Frequency Analysis
            if (tradeData.tradeFrequency !== undefined) {
                if (tradeData.tradeFrequency > 100) {
                    botScore += 25;
                    signals.push('Extremely high trading frequency (>100/hour)');
                } else if (tradeData.tradeFrequency > 50) {
                    botScore += 15;
                    signals.push('High trading frequency (>50/hour)');
                } else if (tradeData.tradeFrequency > 20) {
                    botScore += 5;
                    signals.push('Elevated trading frequency (>20/hour)');
                }
            }
            
            // Check 3: Trade Amount Precision
            if (tradeData.precision !== undefined) {
                if (tradeData.precision > 6) {
                    botScore += 15;
                    signals.push('High precision trading (>6 decimals)');
                } else if (tradeData.precision > 4) {
                    botScore += 8;
                    signals.push('Elevated precision trading (>4 decimals)');
                }
            }
            
            // Check 4: Trade Amount Analysis
            if (tradeData.amount !== undefined) {
                if (tradeData.amount < 1) {
                    botScore += 20;
                    signals.push('Very small trade amounts (<$1)');
                } else if (tradeData.amount < 10) {
                    botScore += 10;
                    signals.push('Small trade amounts (<$10)');
                }
            }
            
            // Check 5: Time of Day Analysis
            if (tradeData.timeOfDay !== undefined) {
                const hour = tradeData.timeOfDay;
                if (hour >= 0 && hour <= 6) {
                    botScore += 15;
                    signals.push('Off-hours trading (12AM-6AM)');
                } else if (hour >= 22 || hour <= 2) {
                    botScore += 8;
                    signals.push('Late night/early morning trading');
                }
            }
            
            // Check 6: Market Timing Analysis
            if (tradeData.marketTiming !== undefined) {
                if (tradeData.marketTiming === 'immediate') {
                    botScore += 15;
                    signals.push('Immediate market response');
                } else if (tradeData.marketTiming === 'fast') {
                    botScore += 8;
                    signals.push('Fast market response');
                }
            }
            
            // Check 7: User Analytics (if available)
            const userAddress = tradeData.user;
            if (!this.userAnalytics.has(userAddress)) {
                this.userAnalytics.set(userAddress, {
                    totalTrades: 0,
                    totalVolume: 0,
                    avgReactionTime: 0,
                    suspiciousPatterns: 0
                });
            }
            
            const userStats = this.userAnalytics.get(userAddress);
            userStats.totalTrades++;
            userStats.totalVolume += tradeData.amount || 0;
            
            // Update average reaction time
            if (tradeData.reactionTime !== undefined) {
                userStats.avgReactionTime = 
                    (userStats.avgReactionTime * (userStats.totalTrades - 1) + tradeData.reactionTime) / userStats.totalTrades;
            }
            
            // Check for suspicious patterns in user history
            if (userStats.totalTrades > 10) {
                if (userStats.avgReactionTime < 200) {
                    botScore += 10;
                    signals.push('Consistently fast reaction times');
                }
                
                if (userStats.totalTrades > 50) {
                    botScore += 10;
                    signals.push('High volume trading activity');
                }
            }
            
            const isBot = botScore >= this.BOT_DETECTION_THRESHOLD;
            
            if (isBot) {
                this.detectedBots.push({
                    user: userAddress,
                    score: botScore,
                    signals: signals,
                    timestamp: Date.now(),
                    tradeData: tradeData
                });
                
                logger.warn(`🚨 Bot detected: ${userAddress} (Score: ${botScore})`);
            }
            
            return {
                isBot: isBot,
                score: botScore,
                signals: signals,
                userStats: userStats
            };
            
        } catch (error) {
            logger.error(`Error analyzing trade: ${error.message}`);
            return {
                isBot: false,
                score: 0,
                signals: [],
                error: error.message
            };
        }
    }
    
    /**
     * Get detected bots list
     */
    getDetectedBots() {
        return this.detectedBots;
    }
    
    /**
     * Get user analytics
     */
    getUserAnalytics(userAddress) {
        return this.userAnalytics.get(userAddress);
    }
    
    /**
     * Clear detected bots list
     */
    clearDetectedBots() {
        this.detectedBots = [];
    }
}

module.exports = new StandaloneBotDetector();

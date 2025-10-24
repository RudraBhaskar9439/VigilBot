import logger from './utils/logger.js';

class MainnetBotDetector {
    constructor() {
        this.detectedBots = [];
        this.userAnalytics = new Map();
        this.BOT_DETECTION_THRESHOLD = 80;
        this.REACTION_TIME_THRESHOLD = 1000; // 1 second in milliseconds
        this.PRECISION_THRESHOLD = 4;
        this.HIGH_FREQUENCY_THRESHOLD = 10;
        this.isRunning = false;
        this.monitoringInterval = null;
        this.lastPrices = {
            btc: null,
            eth: null
        };
    }
    
    async start() {
        if (this.isRunning) {
            logger.warn('Mainnet bot detector is already running');
            return;
        }
        
        this.isRunning = true;
        logger.info('🚀 Starting Mainnet Bot Detection System...');
        logger.info('✅ Bot detection algorithms ready');
        logger.info('✅ Monitoring for suspicious trading patterns...');
        
        this.startMonitoring();
        
        logger.info('🎉 Mainnet Bot Detection System is now active!');
    }
    
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            // Clean up old user analytics (older than 24 hours)
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            let removedCount = 0;
            
            for (const [user, stats] of this.userAnalytics.entries()) {
                if (stats.lastSeen < twentyFourHoursAgo) {
                    this.userAnalytics.delete(user);
                    removedCount++;
                }
            }
            
            if (removedCount > 0) {
                logger.info(`🧹 Cleaned up ${removedCount} inactive users from analytics`);
            }
            
            // Clean up old bot detections (older than 1 hour)
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const activeBots = this.detectedBots.filter(bot => bot.timestamp > oneHourAgo);
            const removedBots = this.detectedBots.length - activeBots.length;
            
            if (removedBots > 0) {
                logger.info(`🧹 Archived ${removedBots} old bot detections`);
                this.detectedBots = activeBots;
            }
            
        }, 60000); // Run cleanup every minute
    }
    
    getLatestPrices() {
        return this.lastPrices;
    }
    
    async analyzeTrade(tradeData) {
        let botScore = 0;
        let signals = [];
        
        try {
            // Get or create user stats
            let userStats = this.userAnalytics.get(tradeData.user);
            
            if (!userStats) {
                // New user - initialize their stats
                userStats = {
                    firstSeen: Date.now(),
                    lastSeen: Date.now(),
                    totalTrades: 0,
                    totalVolume: 0,
                    trades: [],
                    avgReactionTime: 0,
                    suspiciousPatterns: 0,
                    actualCategory: tradeData.actualCategory || 'UNKNOWN' // Store the actual category for later analysis
                };
                
                logger.info(`👤 New user detected: ${tradeData.user}`);
            }
            
            // Update user's stats
            userStats.lastSeen = Date.now();
            userStats.totalTrades += 1;
            userStats.totalVolume += parseFloat(tradeData.amount) || 0;
            
            // Add trade to history
            userStats.trades.push({
                timestamp: Date.now(),
                amount: parseFloat(tradeData.amount) || 0,
                btcPrice: tradeData.btcPrice,
                blockNumber: tradeData.blockNumber
            });
            
            // Keep only last hour of trades
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            userStats.trades = userStats.trades.filter(trade => trade.timestamp > oneHourAgo);
            
            // Store the bot score in user stats
            userStats.botScore = botScore;  // This remains the same, but we need to store it AFTER we calculate it

            // Save updated stats back to Map
            this.userAnalytics.set(tradeData.user, userStats);            logger.info(`📊 User stats updated: ${tradeData.user} - Total trades: ${userStats.totalTrades}, Volume: $${userStats.totalVolume.toFixed(2)}`);
            
            // Calculate trade frequency
            const tradesLastHour = userStats.trades.length;
            const tradesPerMinute = tradesLastHour / 60;
            
            // Bot Detection Analysis
            
            // Initialize reaction time
            let reactionTime = null;

            // 1. Reaction Time Analysis (only if valid price data is available)
            if (tradeData.shouldMeasureReactionTime && tradeData.pricePublishTime > 0 && tradeData.blockTime > 0) {
                // Calculate actual reaction time
                const timeSincePrice = tradeData.blockTime - tradeData.pricePublishTime;
                
                // Validate timestamps are reasonable (allow small negative values due to potential clock sync issues)
                if (timeSincePrice < -5000 || timeSincePrice > 300000) { // Reject if more than 5 seconds before price or 5 minutes after
                    logger.warn(`Invalid reaction time: Price time (${new Date(tradeData.pricePublishTime).toISOString()}) differs too much from block time (${new Date(tradeData.blockTime).toISOString()})`);
                    reactionTime = null;
                } else {
                    // Use absolute value to handle small clock sync differences
                    reactionTime = Math.min(Math.abs(timeSincePrice), 60000); // Cap at 60 seconds
                    
                    logger.info(`Reaction time calculation:
                        Block time: ${new Date(tradeData.blockTime).toISOString()}
                        Price time: ${new Date(tradeData.pricePublishTime).toISOString()}
                        Raw diff: ${timeSincePrice}ms
                        Adjusted reaction time: ${reactionTime}ms`);
                    
                    // Only add to bot score if we have a valid reaction time
                    if (reactionTime < 100) {
                        botScore += 50;
                        signals.push(`Bot-level reaction time (${reactionTime}ms)`);
                    } else if (reactionTime < 300) {
                        botScore += 35;
                        signals.push(`Superhuman reaction time (${reactionTime}ms)`);
                    } else if (reactionTime < this.REACTION_TIME_THRESHOLD) {
                        botScore += 25;
                        signals.push(`Very fast reaction time (${reactionTime}ms)`);
                    }
                }
            } else {
                logger.debug('Skipping reaction time analysis - No valid price data available');
                reactionTime = null;
            }

            // Update average reaction time with the actual reaction time
            if (reactionTime !== null) {
                userStats.avgReactionTime = reactionTime;
            }
            
            // 2. Trading Frequency Analysis
            if (tradesPerMinute > this.HIGH_FREQUENCY_THRESHOLD) {
                botScore += 35;
                signals.push(`High frequency trading (${tradesPerMinute.toFixed(1)} trades/min)`);
            } else if (tradesPerMinute > this.HIGH_FREQUENCY_THRESHOLD / 2) {
                botScore += 25;
                signals.push(`Elevated trading frequency (${tradesPerMinute.toFixed(1)} trades/min)`);
            }
            
            // 3. Trade Amount Analysis
            const amount = parseFloat(tradeData.amount) || 0;
            if (amount < 0.01) {
                botScore += 30;
                signals.push('Micro-trading (<$0.01)');
            } else if (amount < 0.1) {
                botScore += 20;
                signals.push('Very small trades (<$0.1)');
            } else if (amount < 1.0) {
                botScore += 10;
                signals.push('Small trades (<$1)');
            }
            
            // 4. Precision Analysis
            const amountStr = amount.toString();
            const decimalPlaces = amountStr.includes('.') ? amountStr.split('.')[1].length : 0;
            
            if (decimalPlaces > 8) {
                botScore += 40;
                signals.push(`Bot-level precision (${decimalPlaces} decimals)`);
            } else if (decimalPlaces > this.PRECISION_THRESHOLD) {
                botScore += 25;
                signals.push(`High precision (${decimalPlaces} decimals)`);
            }
            
            // 5. Time of Day Analysis
            const hour = new Date().getUTCHours();
            if (hour >= 0 && hour <= 6) {
                botScore += 15;
                signals.push('Off-hours trading (12AM-6AM UTC)');
            }
            
            // 6. Historical Pattern Analysis
            if (userStats.totalTrades > 10) {
                if (userStats.avgReactionTime < 500) {
                    botScore += 15;
                    signals.push(`Consistently fast reactions (avg ${userStats.avgReactionTime.toFixed(0)}ms)`);
                }
                
                if (userStats.totalTrades > 50) {
                    botScore += 10;
                    signals.push('High volume trading activity');
                }
            }
            
            // Store final bot score in user stats
            userStats.botScore = botScore;
            
            // Update the Map with the complete user stats including botScore
            this.userAnalytics.set(tradeData.user, userStats);

            // Determine if bot
            const isBot = botScore >= this.BOT_DETECTION_THRESHOLD;
            
            if (isBot) {
                // Add to detected bots
                this.detectedBots.push({
                    user: tradeData.user,
                    score: botScore,
                    signals: signals,
                    timestamp: Date.now(),
                    tradeData: tradeData,
                    userStats: {
                        totalTrades: userStats.totalTrades,
                        totalVolume: userStats.totalVolume,
                        avgReactionTime: userStats.avgReactionTime,
                        botScore: botScore // Add botScore to the stats
                    }
                });
                
                logger.warn(`🚨 BOT DETECTED ON MAINNET!`);
                logger.warn(`   User: ${tradeData.user}`);
                logger.warn(`   Score: ${botScore}/100`);
                logger.warn(`   Signals: ${signals.join(', ')}`);
                logger.warn(`   Total Trades: ${userStats.totalTrades}`);
            } else {
                logger.info(`✅ Human trader: ${tradeData.user} (Score: ${botScore}/100)`);
            }
            
            return {
                isBot: isBot,
                score: botScore,
                signals: signals,
                reactionTime: reactionTime,
                userStats: {
                    totalTrades: userStats.totalTrades,
                    totalVolume: userStats.totalVolume,
                    tradesLastHour: tradesLastHour,
                    avgReactionTime: userStats.avgReactionTime
                },
                timestamp: Date.now()
            };
            
        } catch (error) {
            logger.error(`Error analyzing trade on mainnet: ${error.message}`);
            logger.error(error.stack);
            return {
                isBot: false,
                score: 0,
                signals: [`Error: ${error.message}`],
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
    
    getDetectedBots() {
        return this.detectedBots;
    }
    
    getUserAnalytics(userAddress) {
        return this.userAnalytics.get(userAddress);
    }
    
    getStatus() {
        // Filter for active bots (detected in the last hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentBots = this.detectedBots.filter(bot => bot.timestamp > oneHourAgo);
        
        return {
            isRunning: this.isRunning,
            detectedBots: recentBots.length,
            activeUsers: this.userAnalytics.size,
            threshold: this.BOT_DETECTION_THRESHOLD,
            totalBotsAllTime: this.detectedBots.length
        };
    }
    
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isRunning = false;
        logger.info('🛑 Mainnet Bot Detection System stopped');
    }
}

export default new MainnetBotDetector();

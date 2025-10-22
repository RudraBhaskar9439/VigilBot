import logger from './utils/logger.js';

class MainnetBotDetector {
    constructor() {
        this.detectedBots = [];
        this.userAnalytics = new Map();
        this.BOT_DETECTION_THRESHOLD = 20; // More aggressive detection for mainnet
        this.REACTION_TIME_THRESHOLD = 10000; // 1 second
        this.PRECISION_THRESHOLD = 4; // More than 4 decimal places is suspicious
        this.HIGH_FREQUENCY_THRESHOLD = 10; // Trades per minute
        this.isRunning = false;
        this.monitoringInterval = null;
        this.lastPrices = {
            btc: null,
            eth: null
        };
    }
    
    /**
     * Start monitoring for bot activity on mainnet
     */
    async start() {
        if (this.isRunning) {
            logger.warn('Mainnet bot detector is already running');
            return;
        }
        
        this.isRunning = true;
        logger.info('🚀 Starting Mainnet Bot Detection System...');
        logger.info('✅ Bot detection algorithms ready');
        logger.info('✅ Monitoring for suspicious trading patterns...');
        
        // Start monitoring loop
        this.startMonitoring();
        
        logger.info('🎉 Mainnet Bot Detection System is now active!');
    }
    
    /**
     * Start the monitoring loop
     */
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            // Keep analytics for the last 24 hours
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            for (const [user, stats] of this.userAnalytics.entries()) {
                if (stats.lastSeen < twentyFourHoursAgo) {
                    this.userAnalytics.delete(user);
                }
            }
            
            // Calculate active users (traded in last 24 hours)
            const activeUsers = this.userAnalytics.size;
            
            // Calculate all detected bots (not just recent ones)
            const detectedBotCount = this.detectedBots.filter(bot => 
                bot.score >= this.BOT_DETECTION_THRESHOLD
            ).length;
            
            logger.info('📊 Monitoring blockchain for trading activity...');
            logger.info(`   Detected bots: ${detectedBotCount}`);
            logger.info(`   Active users: ${activeUsers}`);
            
            console.log('\n📈 System Status Update:');
            console.log(`   Running: ${this.isRunning}`);
            console.log(`   Detected Bots: ${detectedBotCount}`);
            console.log(`   Active Users: ${activeUsers}`);
            const latestPrices = this.getLatestPrices();
            console.log(`   Latest BTC Price: ${latestPrices.btc ? '$' + latestPrices.btc.toFixed(2) : 'N/A'}`);
            
        }, 30000); // Check every 30 seconds
    }
    
    getLatestPrices() {
        return this.lastPrices;
    }
    
    /**
     * Analyze a trade (can be called from external sources)
     */
    async analyzeTrade(tradeData) {
        let botScore = 0;
        let signals = [];
        
        try {
            // Initialize or update user analytics
            const userStats = this.userAnalytics.get(tradeData.user) || {
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                totalTrades: 0,
                totalVolume: 0,
                trades: [],
                avgReactionTime: 0,
                suspiciousPatterns: 0
            };
            
            // Update user's stats with this trade
            userStats.lastSeen = Date.now();
            userStats.totalTrades += 1;
            userStats.totalVolume += parseFloat(tradeData.amount);
            userStats.trades.push({
                timestamp: Date.now(),
                amount: parseFloat(tradeData.amount)
            });
            
            // Save updated stats
            this.userAnalytics.set(tradeData.user, userStats);
            userStats.lastSeen = Date.now();
            userStats.totalTrades++;
            userStats.totalVolume += parseFloat(tradeData.amount) || 0;
            userStats.trades.push({
                timestamp: Date.now(),
                amount: parseFloat(tradeData.amount) || 0,
                btcPrice: tradeData.btcPrice
            });
            
            // Maintain only last hour of trades
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            userStats.trades = userStats.trades.filter(trade => trade.timestamp > oneHourAgo);
            
            // Calculate trade frequency (trades per hour)
            const tradesLastHour = userStats.trades.length;
            tradeData.tradeFrequency = tradesLastHour;
            
            // Update average reaction time if available
            if (tradeData.reactionTime !== undefined) {
                userStats.avgReactionTime = 
                    (userStats.avgReactionTime * (userStats.totalTrades - 1) + tradeData.reactionTime) / userStats.totalTrades;
            }
            
            // Reaction Time Analysis (in milliseconds)
            if (tradeData.reactionTime !== undefined) {
                if (tradeData.reactionTime < 1000) { // Sub 1000ms is definitely a bot
                    botScore += 50;
                    signals.push('Bot-level reaction time (<100ms)');
                } else if (tradeData.reactionTime < 3000) {
                    botScore += 35;
                    signals.push('Superhuman reaction time (<300ms)');
                } else if (tradeData.reactionTime < this.REACTION_TIME_THRESHOLD) {
                    botScore += 25;
                    signals.push('Very fast reaction time (<1s)');
                }
            }
            
            // Trading Frequency Analysis (per minute)
            const tradesPerMinute = tradesLastHour / 60;
            if (tradesPerMinute > this.HIGH_FREQUENCY_THRESHOLD) {
                botScore += 35;
                signals.push(`High frequency trading (>${this.HIGH_FREQUENCY_THRESHOLD} trades/min)`);
            } else if (tradesPerMinute > this.HIGH_FREQUENCY_THRESHOLD / 2) {
                botScore += 25;
                signals.push('Elevated trading frequency');
            }
            
            // Trade Amount Analysis (looking for micro-trades)
            if (tradeData.amount !== undefined) {
                const amount = parseFloat(tradeData.amount);
                if (amount < 0.1) {
                    botScore += 30;
                    signals.push('Micro-trading (<$0.1)');
                } else if (amount < 1.0) {
                    botScore += 20;
                    signals.push('Very small trades (<$1)');
                }
            }
            
            // Precision Analysis
            if (tradeData.precision !== undefined) {
                if (tradeData.precision > 8) {
                    botScore += 40;
                    signals.push('Bot-level precision (>8 decimals)');
                } else if (tradeData.precision > this.PRECISION_THRESHOLD) {
                    botScore += 25;
                    signals.push(`High precision (>${this.PRECISION_THRESHOLD} decimals)`);
                }
            }
            
            // Time of Day Analysis
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
            
            // Market Timing Analysis
            if (tradeData.marketTiming !== undefined) {
                if (tradeData.marketTiming === 'immediate') {
                    botScore += 15;
                    signals.push('Immediate market response');
                } else if (tradeData.marketTiming === 'fast') {
                    botScore += 8;
                    signals.push('Fast market response');
                }
            }
            
            // Check for suspicious patterns based on historical data
            if (userStats.totalTrades > 10) {
                if (userStats.avgReactionTime < 2000) {
                    botScore += 10;
                    signals.push('Consistently fast reaction times');
                }
                
                if (userStats.totalTrades > 50) {
                    botScore += 10;
                    signals.push('High volume trading activity');
                }
            }
            
            // Final bot detection check
            const isBot = botScore >= this.BOT_DETECTION_THRESHOLD;
            
            if (isBot) {
                this.detectedBots.push({
                    user: tradeData.user,
                    score: botScore,
                    signals: signals,
                    timestamp: Date.now(),
                    tradeData: tradeData
                });
                
                logger.warn(`🚨 BOT DETECTED ON MAINNET!`);
                logger.warn(`   User: ${tradeData.user}`);
                logger.warn(`   Score: ${botScore}/100`);
                logger.warn(`   Signals: ${signals.join(', ')}`);
                logger.warn(`   Trade Amount: $${tradeData.amount}`);
            }
            
            return {
                isBot: isBot,
                score: botScore,
                signals: signals,
                userStats: userStats,
                timestamp: Date.now()
            };
            
        } catch (error) {
            logger.error(`Error analyzing trade on mainnet: ${error.message}`);
            return {
                isBot: false,
                score: 0,
                signals: [],
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
    
    /**
     * Get detected bots
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
     * Get system status
     */
    getStatus() {
        // Filter for active bots (detected in the last hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentBots = this.detectedBots.filter(bot => bot.timestamp > oneHourAgo);
        
        return {
            isRunning: this.isRunning,
            detectedBots: recentBots.length,
            activeUsers: this.userAnalytics.size,
            threshold: this.BOT_DETECTION_THRESHOLD
        };
    }
    
    /**
     * Stop monitoring
     */
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
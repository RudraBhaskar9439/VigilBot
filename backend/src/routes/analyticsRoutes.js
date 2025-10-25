import express from 'express';
import pythClient from '../services/pythHermesClient.js';
import botDetector from '../services/botDetector.js';
import mainnetBotDetector from '../mainnet-bot-detector.js';
import logger from '../utils/logger.js';
import appConfig from '../config/appConfig.js';


const router = express.Router();

/**
 * GET /api/analytics/prices
 * Get all latest prices from Pyth (with HTTP fallback)
 */
router.get('/prices', async (req, res) => {
    try {
        let pricesByName = pythClient.getAllLatestPrices();
        
        // If WebSocket prices are empty, fetch from HTTP API as fallback
        if (Object.keys(pricesByName).length === 0) {
            logger.warn('No WebSocket prices available, using HTTP fallback');
            pricesByName = await pythClient.fetchLatestPricesHTTP();
        }
        
        // Convert to price ID format for frontend compatibility
        const prices = {};
        for (const [assetName, priceData] of Object.entries(pricesByName)) {
            // assetName is like 'BTC/USD', we need to get the priceId
            const priceId = appConfig.priceIds[assetName];
            if (priceId) {
                // Remove '0x' prefix if present for consistency
                const cleanPriceId = priceId.startsWith('0x') ? priceId.slice(2) : priceId;
                prices[cleanPriceId] = priceData;
            }
        }
        
        logger.info(`Returning prices for ${Object.keys(prices).length} assets`);
        res.json({ prices });
    } catch (error) {
        logger.error(`Error fetching prices: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/prices/:asset
 * Get specific asset price
 */
router.get('/prices/:asset', (req, res) => {
    try {
        const { asset } = req.params;
        const assetUpper = asset.toUpperCase();
        
        const priceId = appConfig.priceIds[assetUpper];
        
        if (!priceId) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        const price = pythClient.getLatestPrice(priceId);
        
        if (!price) {
            return res.status(404).json({ error: 'Price data not available yet' });
        }
        
        res.json({
            asset: assetUpper,
            price: price.price,
            confidence: price.confidence,
            publishTime: price.publishTime,
            timestamp: price.timestamp
        });
    } catch (error) {
        logger.error(`Error fetching asset price: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/bots/pending
 * Get all pending bots (combined)
 */
router.get('/bots/pending', (req, res) => {
    try {
        const pendingBots = botDetector.getPendingBots();
        res.json({
            count: pendingBots.length,
            bots: pendingBots
        });
    } catch (error) {
        logger.error(`Error fetching pending bots: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/bots/good
 * Get detected good bots (Market Makers & Arbitrage)
 */
router.get('/bots/good', (req, res) => {
    try {
        const goodBots = botDetector.getGoodBots();
        res.json({
            count: goodBots.length,
            category: 'GOOD_BOT',
            description: 'Market Makers & Arbitrage Bots providing liquidity',
            bots: goodBots.map(bot => ({
                user: bot.user,
                score: bot.score,
                signals: bot.signals,
                liquidityProvided: bot.liquidityProvided,
                botType: bot.botType,
                detectedAt: bot.detectedAt
            }))
        });
    } catch (error) {
        logger.error(`Error fetching good bots: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/bots/bad
 * Get detected bad bots (Manipulative & Front-running)
 */
router.get('/bots/bad', (req, res) => {
    try {
        const badBots = botDetector.getBadBots();
        res.json({
            count: badBots.length,
            category: 'BAD_BOT',
            description: 'Manipulative & Front-running Bots',
            bots: badBots.map(bot => ({
                user: bot.user,
                score: bot.score,
                signals: bot.signals,
                riskLevel: bot.riskLevel,
                detectedAt: bot.detectedAt
            }))
        });
    } catch (error) {
        logger.error(`Error fetching bad bots: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/bots/summary
 * Get bot detection summary statistics
 */
router.get('/bots/summary', (req, res) => {
    try {
        const goodBots = botDetector.getGoodBots();
        const badBots = botDetector.getBadBots();
        
        // Calculate statistics
        const goodBotLiquidity = goodBots.reduce((sum, bot) => 
            sum + (bot.liquidityProvided || 0), 0
        );
        
        const riskDistribution = {
            CRITICAL: badBots.filter(b => b.riskLevel === 'CRITICAL').length,
            HIGH: badBots.filter(b => b.riskLevel === 'HIGH').length,
            MEDIUM: badBots.filter(b => b.riskLevel === 'MEDIUM').length
        };
        
        const botTypeDistribution = {};
        goodBots.forEach(bot => {
            const type = bot.botType || 'Unknown';
            botTypeDistribution[type] = (botTypeDistribution[type] || 0) + 1;
        });
        
        res.json({
            summary: {
                totalBots: goodBots.length + badBots.length,
                goodBots: {
                    count: goodBots.length,
                    totalLiquidity: goodBotLiquidity,
                    typeDistribution: botTypeDistribution
                },
                badBots: {
                    count: badBots.length,
                    riskDistribution: riskDistribution
                }
            },
            timestamp: Date.now()
        });
    } catch (error) {
        logger.error(`Error fetching bot summary: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/bots
 * Get all detected bots (good and bad) - supports filtering by type
 */
router.get('/bots', (req, res) => {
    try {
        const { type } = req.query;
        
        // Get all bots from mainnetBotDetector
        const allBots = mainnetBotDetector.getDetectedBots();
        
        // Filter by category
        const goodBots = allBots.filter(bot => bot.category === 'GOOD_BOT');
        const badBots = allBots.filter(bot => bot.category === 'BAD_BOT' || bot.category === 'SUSPICIOUS');
        
        // If type parameter is provided, return only that type
        if (type === 'good') {
            return res.json({ bots: goodBots, count: goodBots.length });
        } else if (type === 'bad') {
            return res.json({ bots: badBots, count: badBots.length });
        }
        
        // Otherwise return both
        res.json({
            goodBots,
            badBots,
            total: goodBots.length + badBots.length
        });
    } catch (error) {
        logger.error(`Error fetching bots: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/analytics/bots/flag-now
 * Manually trigger batch flagging (admin only)
 */
router.post('/bots/flag-now', async (req, res) => {
    try {
        const goodBots = botDetector.getGoodBots();
        const badBots = botDetector.getBadBots();
        
        if (goodBots.length === 0 && badBots.length === 0) {
            return res.json({ message: 'No pending bots to flag' });
        }
        
        await botDetector.batchFlagBots();
        
        res.json({
            message: `Flagged ${goodBots.length + badBots.length} bots`,
            goodBots: goodBots.length,
            badBots: badBots.length
        });
    } catch (error) {
        logger.error(`Error manually flagging bots: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/bots/statistics
 * Get detailed bot statistics for dashboard
 */
router.get('/bots/statistics', (req, res) => {
    try {
        const goodBots = botDetector.getGoodBots();
        const badBots = botDetector.getBadBots();
        
        res.json({
            statistics: {
                total: {
                    bots: goodBots.length + badBots.length,
                    good: goodBots.length,
                    bad: badBots.length
                },
                goodBots: {
                    marketMakers: goodBots.filter(b => b.botType === 'Market Maker').length,
                    arbitrageBots: goodBots.filter(b => b.botType === 'Arbitrage Bot').length,
                    totalLiquidity: goodBots.reduce((sum, b) => sum + (b.liquidityProvided || 0), 0)
                },
                badBots: {
                    critical: badBots.filter(b => b.riskLevel === 'CRITICAL').length,
                    high: badBots.filter(b => b.riskLevel === 'HIGH').length,
                    medium: badBots.filter(b => b.riskLevel === 'MEDIUM').length
                },
                recentDetections: {
                    last24h: [...goodBots, ...badBots].filter(b => 
                        Date.now() - b.detectedAt < 24 * 60 * 60 * 1000
                    ).length
                }
            },
            timestamp: Date.now()
        });
    } catch (error) {
        logger.error(`Error fetching bot statistics: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
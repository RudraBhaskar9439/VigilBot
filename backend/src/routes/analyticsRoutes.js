const express = require('express');
const router = express.Router();
const pythClient = require('../services/pythHermesClient');
const botDetector = require('../services/botDetector');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/prices
 * Get all latest prices from Pyth
 */
router.get('/prices', (req, res) => {
    try {
        const pricesRaw = pythClient.getAllLatestPrices();
        // Transform prices to include change and history for frontend
        const prices = {};
        for (const [asset, info] of Object.entries(pricesRaw)) {
            if (!info) continue;
            // Get price history
            const priceId = require('../config/appConfig').priceIds[asset];
            const historyRaw = pythClient.getPriceHistory(priceId, 30);
            const history = historyRaw.map(h => ({
                time: new Date(h.timestamp).toLocaleTimeString(),
                price: h.price
            }));
            // Calculate change (last vs previous)
            let change = 0;
            if (history.length > 1) {
                change = ((history[history.length-1].price - history[0].price) / history[0].price) * 100;
            }
            prices[asset] = {
                price: info.price,
                change,
                history
            };
        }
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
        
        const priceId = require('../config/config').priceIds[assetUpper];
        
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
 * Get pending bots (not yet flagged on-chain)
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
 * POST /api/analytics/bots/flag-now
 * Manually trigger batch flagging (admin only)
 */
router.post('/bots/flag-now', async (req, res) => {
    try {
        const pendingBots = botDetector.getPendingBots();
        
        if (pendingBots.length === 0) {
            return res.json({ message: 'No pending bots to flag' });
        }
        
        await botDetector.batchFlagBots();
        
        res.json({
            message: `Flagged ${pendingBots.length} bots`,
            count: pendingBots.length
        });
    } catch (error) {
        logger.error(`Error manually flagging bots: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/bots
 * Get bot summary and bot lists for dashboard
 */
router.get('/bots', async (req, res) => {
    try {
        // Optionally filter by type
        const type = req.query.type;
        let bots = botDetector.getPendingBots();
        if (type === 'good') {
            bots = bots.filter(bot => bot.score < config.botScoreThreshold);
        } else if (type === 'bad') {
            bots = bots.filter(bot => bot.score >= config.botScoreThreshold);
        }
        // Compose summary
        const totalBots = bots.length;
        const goodBots = bots.filter(bot => bot.score < config.botScoreThreshold).length;
        const badBots = bots.filter(bot => bot.score >= config.botScoreThreshold).length;
        // Risk/type distribution (demo)
        const riskDistribution = [
            { name: 'Critical', value: badBots, color: '#ef4444' },
            { name: 'Low', value: goodBots, color: '#22c55e' }
        ];
        const typeDistribution = [
            { name: 'Sniper', value: Math.floor(badBots/2), color: '#f59e42' },
            { name: 'Arbitrage', value: Math.ceil(badBots/2), color: '#6366f1' }
        ];
        res.json({
            totalBots,
            goodBots,
            badBots,
            riskDistribution,
            typeDistribution,
            bots
        });
    } catch (error) {
        logger.error(`Error fetching bot stats: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
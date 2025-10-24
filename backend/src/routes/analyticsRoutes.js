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
        const prices = pythClient.getAllLatestPrices();
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

module.exports = router;
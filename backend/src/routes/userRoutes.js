import express from 'express';
import botDetector from '../services/botDetector.js';
import blockchainListener from '../services/blockchainListener.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/user/:address/status
 * Check if a user is flagged as bot
 */
router.get('/:address/status', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        
        const botStatus = await blockchainListener.isBot(address);
        
        res.json({
            address,
            isFlagged: botStatus.isFlagged,
            botScore: botStatus.score,
            status: botStatus.isFlagged ? 'BOT' : 'HUMAN'
        });
    } catch (error) {
        logger.error(`Error checking user status: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/user/:address/trades
 * Get user's trade history
 */
router.get('/:address/trades', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        
        const trades = await blockchainListener.getUserTrades(address);
        
        res.json({
            address,
            totalTrades: trades.length,
            trades
        });
    } catch (error) {
        logger.error(`Error fetching user trades: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/user/:address/analytics
 * Get detailed analytics for a user
 */
router.get('/:address/analytics', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        
        const analytics = await botDetector.getUserAnalytics(address);
        
        res.json(analytics);
    } catch (error) {
        logger.error(`Error fetching user analytics: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
const { HermesClient } = require('@pythnetwork/hermes-client');
const config = require('../config/config');
const logger = require('../utils/logger');

class PythHermesClient {
    constructor() {
        this.client = new HermesClient(config.hermesUrl);
        this.latestPrices = new Map();
        this.priceHistory = new Map();
        this.isStreaming = false;
    }


    /**
     * Start streaming live pricess for free
     */
    async startPriceStream() {
        if(this.isStreaming) {
            logger.warn('Price stream already running');
            return;
        }
        this.isStreaming = true;
        const priceIds = Object.values(config.priceIds);

        logger.info(` LIVE: Starting Pyth price stream for ${priceIds.length} feeds (FREE!)`);
        
        try {
            // Subscribe to price updates
            const priceFeeds = this.client.getPriceUpdatesStream(priceIds);
            
            // Handle the stream properly
            if (priceFeeds && typeof priceFeeds[Symbol.asyncIterator] === 'function') {
                for await (const priceUpdate of priceFeeds) {
                    if (priceUpdate && priceUpdate.parsed) {
                        for (const priceFeed of priceUpdate.parsed) {
                            this.processPriceUpdate(priceFeed);
                        }
                    }
                }
            } else {
                // Fallback: use polling if streaming is not available
                logger.warn('Streaming not available, falling back to polling');
                this.startPolling();
            }
        } catch (error) {
            logger.error(`Error in price stream: ${error.message}`);
            this.isStreaming = false;
            
            // Retry after 5 seconds
            setTimeout(() => this.startPriceStream(), 5000);
        }
    }
    
    /**
     * Fallback polling method when streaming is not available
     */
    async startPolling() {
        const priceIds = Object.values(config.priceIds);
        logger.info('Starting price polling as fallback');
        
        const pollInterval = setInterval(async () => {
            if (!this.isStreaming) {
                clearInterval(pollInterval);
                return;
            }
            
            try {
                for (const priceId of priceIds) {
                    await this.fetchLatestPrice(priceId);
                }
            } catch (error) {
                logger.error(`Error in polling: ${error.message}`);
            }
        }, 5000); // Poll every 5 seconds
    }
    
    /**
     * Process incoming price update
     */
    processPriceUpdate(priceFeed) {
        const price = parseFloat(priceFeed.price.price) / Math.pow(10, Math.abs(priceFeed.price.expo));
        const confidence = parseFloat(priceFeed.price.conf) / Math.pow(10, Math.abs(priceFeed.price.expo));
        
        const priceData = {
            id: priceFeed.id,
            price: price,
            confidence: confidence,
            publishTime: priceFeed.price.publish_time,
            prevPublishTime: priceFeed.prev_publish_time,
            expo: priceFeed.price.expo,
            timestamp: Date.now()
        };
        
        // Store latest price
        this.latestPrices.set(priceFeed.id, priceData);
        
        // Store in history (keep last 100)
        if (!this.priceHistory.has(priceFeed.id)) {
            this.priceHistory.set(priceFeed.id, []);
        }
        
        const history = this.priceHistory.get(priceFeed.id);
        history.push(priceData);
        
        if (history.length > 100) {
            history.shift();
        }
        
        // Find asset name
        const assetName = Object.keys(config.priceIds).find(
            key => config.priceIds[key] === priceFeed.id
        );
        
        logger.info(` ${assetName || priceFeed.id.slice(0, 8)}: $${price.toFixed(2)} (±$${confidence.toFixed(2)})`);
    }
    
    /**
     * Get latest price for a specific feed (from memory - FREE!)
     */
    getLatestPrice(priceId) {
        return this.latestPrices.get(priceId) || null;
    }
    
    /**
     * Get price history for analysis
     */
    getPriceHistory(priceId, limit = 100) {
        const history = this.priceHistory.get(priceId) || [];
        return history.slice(-limit);
    }
    
    /**
     * Get all latest prices
     */
    getAllLatestPrices() {
        const prices = {};
        for (const [assetName, priceId] of Object.entries(config.priceIds)) {
            prices[assetName] = this.latestPrices.get(priceId);
        }
        return prices;
    }
    
    /**
     * Fetch single price update (fallback method)
     */
    async fetchLatestPrice(priceId) {
        try {
            const priceFeeds = await this.client.getLatestPriceUpdates([priceId]);
            
            if (priceFeeds && priceFeeds.parsed && priceFeeds.parsed.length > 0) {
                const priceFeed = priceFeeds.parsed[0];
                this.processPriceUpdate(priceFeed);
                return this.latestPrices.get(priceId);
            }
        } catch (error) {
            logger.error(`Error fetching price for ${priceId}: ${error.message}`);
        }
        return null;
    }
}

module.exports = new PythHermesClient();

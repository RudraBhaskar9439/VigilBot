import WebSocket from 'ws';
import config from '../config/appConfig.js';
import logger from '../utils/logger.js';
import https from 'https';
import http from 'http';

// Create custom agent for better connection handling
const agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 3000,
    maxSockets: 10,
    timeout: 10000
});

class PythHermesClient {
    constructor() {
        if (!config.hermesWsUrl) {
            logger.error('Hermes WebSocket URL not configured');
            this.isConfigured = false;
            return;
        }
        
        logger.info('Initializing Pyth Hermes client');
        this.latestPrices = new Map();
        this.priceHistory = new Map();
        this.isStreaming = false;
        this.isConfigured = true;
        this.lastUpdateTime = Date.now();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnecting = false;
        this.subscribedFeeds = new Set();
    }

    /**
     * Start streaming live prices
     */
    async startPriceStream() {
        if (!this.isConfigured) {
            logger.error('Cannot start price stream: Pyth client not properly configured');
            return;
        }
        
        if(this.isStreaming) {
            logger.warn('Price stream already running');
            return;
        }

        // Attempt HTTP fetch first to ensure service is accessible
        try {
            const prices = await this.fetchLatestPricesHTTP();
            if (Object.keys(prices).length > 0) {
                logger.info('Successfully fetched initial prices via HTTP');
            }
        } catch (error) {
            logger.warn(`HTTP fetch failed: ${error.message}. Continuing with WebSocket...`);
        }
        
        this.isStreaming = true;
        this.reconnectAttempts = 0;
        this.subscribedFeeds.clear();
        const priceIds = Object.values(config.priceIds).filter(id => id);

        if (priceIds.length === 0) {
            logger.error('No valid price IDs configured');
            this.isStreaming = false;
            return;
        }

        logger.info(`Starting Pyth price stream for ${priceIds.length} feeds`);
        
        // Set up health check to monitor connection and subscriptions
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(() => {
            if (!this.isStreaming || this.reconnecting) return;
            
            // Check for missing subscriptions
            const missingSubscriptions = priceIds.filter(id => !this.subscribedFeeds.has(id));
            if (missingSubscriptions.length > 0) {
                logger.warn(`Re-subscribing to ${missingSubscriptions.length} missing feeds`);
                this.subscribe(missingSubscriptions);
            }

            // Check for stale data
            const timeSinceLastUpdate = (Date.now() - this.lastUpdateTime) / 1000;
            if (timeSinceLastUpdate > 10) {
                logger.warn(`No price updates for ${timeSinceLastUpdate.toFixed(1)}s, reconnecting...`);
                this.reconnect(priceIds);
            }
        }, 5000);
        
        try {
            await this.connect(priceIds);
        } catch (error) {
            logger.error(`Failed to start price stream: ${error.message}`);
            this.cleanup();
        }
    }

    /**
     * Connect to WebSocket and set up handlers
     */
    async connect(priceIds) {
        if (this.ws) {
            this.ws.terminate();
            this.ws = null;
        }

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        return new Promise((resolve, reject) => {
            try {
                logger.info(`Connecting to Pyth WebSocket at ${config.hermesWsUrl}`);
                // Configure WebSocket with proper options
                this.ws = new WebSocket(config.hermesWsUrl, {
                    handshakeTimeout: 10000,
                    perMessageDeflate: false, // Disable compression for better performance
                    followRedirects: true,
                    headers: {
                        'User-Agent': 'TradingBotDetection/1.0.0'
                    },
                    timeout: 10000,
                    agent: agent
                });
                
                // Set connection timeout
                const connectionTimeout = setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        this.ws.terminate();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000); // 10 second timeout
                
                // Setup ping-pong for connection keepalive
                this.lastPong = Date.now();
                this.pingInterval = setInterval(() => {
                    if (this.ws.readyState === WebSocket.OPEN) {
                        // Check if we haven't received a pong response
                        if (Date.now() - this.lastPong > 10000) {
                            logger.warn('No pong response, reconnecting...');
                            this.ws.terminate();
                            return;
                        }
                        this.ws.ping(() => {});
                    }
                }, 5000);

                this.ws.on('open', () => {
                    logger.info('WebSocket connection established');
                    this.reconnecting = false;
                    this.reconnectAttempts = 0;
                    this.subscribe(priceIds);
                    resolve();
                });

                this.ws.on('pong', () => {
                    this.lastPong = Date.now();
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        
                        if (message.type === 'error') {
                            logger.error(`WebSocket error message: ${message.message}`);
                            return;
                        }
                        
                        if (message.type === 'subscribe_success') {
                            logger.info(`Successfully subscribed to ${message.id}`);
                            this.subscribedFeeds.add(message.id);
                            return;
                        }
                        
                        if (message.type === 'price_update' || message.type === 'price') {
                            if (!message.price_feed) {
                                logger.error('Received price update without price_feed data', message);
                                return;
                            }

                            const priceFeed = message.price_feed;
                            this.lastUpdateTime = Date.now();
                            
                            this.processPriceUpdate({
                                id: priceFeed.id,
                                price: {
                                    price: priceFeed.price?.price || '0',
                                    conf: priceFeed.price?.conf || '0',
                                    expo: priceFeed.price?.expo || 0,
                                    publish_time: priceFeed.price?.publish_time || Date.now()
                                }
                            });
                        }
                    } catch (error) {
                        logger.error(`Error processing WebSocket message: ${error.message}`);
                    }
                });

                this.ws.on('error', (error) => {
                    logger.error(`WebSocket error: ${error.message}`);
                    if (!this.reconnecting) {
                        this.reconnect(priceIds);
                    }
                });

                this.ws.on('close', () => {
                    logger.warn('WebSocket connection closed');
                    if (this.isStreaming && !this.reconnecting) {
                        this.reconnect(priceIds);
                    }
                });

                // Set initial connection timeout
                const connectTimeout = setTimeout(() => {
                    if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                        logger.error('WebSocket connection timeout');
                        this.ws.terminate();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);

                this.ws.on('open', () => {
                    clearTimeout(connectTimeout);
                });

            } catch (error) {
                logger.error(`Failed to establish WebSocket connection: ${error.message}`);
                reject(error);
            }
        });
    }

    /**
     * Subscribe to price feeds
     */
    subscribe(priceIds) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            logger.error('Cannot subscribe: WebSocket not connected');
            return;
        }

        // Group price IDs into batches of 10 to avoid message size limits
        const batchSize = 10;
        for (let i = 0; i < priceIds.length; i += batchSize) {
            const batch = priceIds.slice(i, i + batchSize);
            const subscribeMessage = {
                type: 'subscribe',
                ids: batch
            };
            
            try {
                this.ws.send(JSON.stringify(subscribeMessage));
                const batchSummary = batch[0].slice(0, 20) + (batch.length > 1 ? '...' : '');
                logger.info(`Subscribing to feeds batch ${i/batchSize + 1}: ${batchSummary}`);
            } catch (error) {
                logger.error(`Error subscribing to feeds batch ${i/batchSize + 1}: ${error.message}`);
            }
        }
    }

    /**
     * Reconnect logic with backoff
     */
    async reconnect(priceIds) {
        if (this.reconnecting) return;
        this.reconnecting = true;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
            this.cleanup();
            return;
        }

        this.reconnectAttempts++;
        const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffTime/1000}s...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        try {
            await this.connect(priceIds);
            logger.info('Reconnection successful');
        } catch (error) {
            logger.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error.message}`);
            this.reconnecting = false;
            await this.reconnect(priceIds);
        }
    }
    
    /**
     * Process incoming price update
     */
    processPriceUpdate(priceFeed) {
        // Ensure we have valid numeric values
        const priceValue = priceFeed.price.price || '0';
        const confValue = priceFeed.price.conf || '0';
        const expoValue = priceFeed.price.expo || 0;
        
        // Convert scientific notation to decimal string
        const price = parseFloat(priceValue) / Math.pow(10, Math.abs(expoValue));
        const confidence = parseFloat(confValue) / Math.pow(10, Math.abs(expoValue));
        
        const priceData = {
            id: priceFeed.id,
            price: price,
            confidence: confidence,
            // Convert publish_time to milliseconds if it's in seconds
            publishTime: parseInt(priceFeed.price.publish_time || 0) * 1000,
            prevPublishTime: priceFeed.prev_publish_time ? parseInt(priceFeed.prev_publish_time) * 1000 : 0,
            expo: expoValue,
            timestamp: Date.now()
        };
        
        this.latestPrices.set(priceFeed.id, priceData);
        
        if (!this.priceHistory.has(priceFeed.id)) {
            this.priceHistory.set(priceFeed.id, []);
        }
        
        const history = this.priceHistory.get(priceFeed.id);
        history.push(priceData);
        
        if (history.length > 100) {
            history.shift();
        }
        
        const assetName = Object.keys(config.priceIds).find(
            key => config.priceIds[key] === priceFeed.id
        );
        
        if (price && !isNaN(price)) {
            logger.info(`${assetName || (priceFeed.id || '').slice(0, 8)}: $${price.toFixed(2)} (±$${confidence.toFixed(2)})`);
        } else {
            logger.warn(`Invalid price update for ${assetName || (priceFeed.id || '').slice(0, 8)}`);
        }
    }

    /**
     * Get latest price for a specific feed
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
     * Get all latest prices with validation
     */
    getAllLatestPrices() {
        const now = Date.now();
        const prices = {};
        let staleCount = 0;
        let missingCount = 0;

        for (const [assetName, priceId] of Object.entries(config.priceIds)) {
            const priceData = this.latestPrices.get(priceId);
            // Increased staleness threshold to 2 minutes
            if (priceData && now - priceData.timestamp <= 120000) {
                prices[assetName] = priceData;
                if (now - priceData.timestamp > 30000) {
                    logger.warn(`Using older price for ${assetName}: ${(now - priceData.timestamp) / 1000}s old`);
                }
            } else if (priceData) {
                staleCount++;
                logger.warn(`Stale price for ${assetName}: ${(now - priceData.timestamp) / 1000}s old`);
            } else {
                missingCount++;
                logger.warn(`Missing price data for ${assetName}`);
            }
        }

        if (staleCount > 0 || missingCount > 0) {
            logger.warn(`Price data status: ${staleCount} stale, ${missingCount} missing`);
            if (staleCount + missingCount > Object.keys(config.priceIds).length / 2) {
                logger.error('Too many stale/missing prices, attempting to recover connection...');
                this.isStreaming = false;
                this.startPriceStream();
            }
        }

        return prices;
    }

    /**
     * Clean up resources
     */
    /**
     * Fetch latest prices via HTTP REST API (fallback when WebSocket fails)
     */
    async fetchLatestPricesHTTP() {
        const prices = {};
        
        try {
            // Get all price IDs
            const priceIds = Object.values(config.priceIds);
            const idsParam = priceIds.map(id => `ids[]=${id}`).join('&');
            
            // Fetch from Pyth HTTP API
            const url = `${config.hermesUrl}/v2/updates/price/latest?${idsParam}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Parse the response
            if (data.parsed) {
                for (const priceUpdate of data.parsed) {
                    const priceId = priceUpdate.id;
                    const assetName = Object.keys(config.priceIds).find(
                        key => config.priceIds[key] === priceId || config.priceIds[key] === `0x${priceId}`
                    );
                    
                    if (assetName && priceUpdate.price) {
                        const price = parseFloat(priceUpdate.price.price) * Math.pow(10, priceUpdate.price.expo);
                        const confidence = parseFloat(priceUpdate.price.conf) * Math.pow(10, priceUpdate.price.expo);
                        
                        prices[assetName] = {
                            price: price,
                            confidence: confidence,
                            publishTime: priceUpdate.price.publish_time,
                            timestamp: Date.now()
                        };
                        
                        // Also store in latestPrices cache
                        this.latestPrices.set(priceId, prices[assetName]);
                        
                        logger.info(`HTTP: ${assetName} = $${price.toFixed(2)} (±$${confidence.toFixed(2)})`);
                    }
                }
            }
            
            return prices;
        } catch (error) {
            logger.error(`HTTP price fetch failed: ${error.message}`);
            return {};
        }
    }

    cleanup() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        if (this.ws) {
            this.ws.terminate();
            this.ws = null;
        }
        this.isStreaming = false;
        this.reconnecting = false;
        this.subscribedFeeds.clear();
    }
}

export default new PythHermesClient();

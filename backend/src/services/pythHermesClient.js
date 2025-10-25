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
        this.maxReconnectAttempts = 15;  // Increased max attempts
        this.baseReconnectDelay = 1000;  // Base delay of 1 second
        this.maxReconnectDelay = 30000;  // Max delay of 30 seconds
        this.reconnecting = false;
        this.subscribedFeeds = new Set();
        this.connectionState = 'disconnected';
        this.activeSubscriptions = new Set();
        this.lastSubscriptionAttempt = 0;
        this.subscriptionRetryDelay = 5000; // 5 seconds between subscription retries
        this.connectPromise = null; // Track ongoing connection attempts
        this.lastError = null;
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.circuitBreakerTimeout = 60000; // 1 minute timeout for circuit breaker
        this.maxErrorsBeforeBreaker = 5; // Number of errors before circuit breaker trips
        this.useHttpFallback = false; // Whether to use HTTP fallback mode
        this.httpFallbackInterval = null;
        this.httpFallbackDelay = 2000; // 2 seconds between HTTP requests
        
        // Bind the cleanup method to preserve context
        this.cleanup = this.cleanup.bind(this);
        
        // Handle process termination gracefully
        process.on('SIGINT', () => this.cleanup());
        process.on('SIGTERM', () => this.cleanup());
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

        // Clear any existing state
        this.cleanup();
        
        // Reset circuit breaker state
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.useHttpFallback = false;

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
            try {
                this.ws.terminate();
            } catch (error) {
                logger.warn(`Error terminating existing connection: ${error.message}`);
            }
            this.ws = null;
        }

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        return new Promise((resolve, reject) => {
            try {
                if (this.connectionState === 'connecting') {
                    logger.warn('Connection attempt already in progress');
                    return reject(new Error('Connection already in progress'));
                }

                this.connectionState = 'connecting';
                logger.info(`Connecting to Pyth WebSocket at ${config.hermesWsUrl}`);
                
                // Check circuit breaker before connecting
                if (this.errorCount >= this.maxErrors && 
                    (Date.now() - this.lastErrorTime) < this.circuitBreakerTimeout) {
                    logger.warn('Circuit breaker active, switching to HTTP fallback');
                    this.useHttpFallback = true;
                    return reject(new Error('Circuit breaker active'));
                }

                // Configure WebSocket with proper options
                this.ws = new WebSocket(config.hermesWsUrl, {
                    handshakeTimeout: 15000,
                    perMessageDeflate: false,
                    followRedirects: true,
                    headers: {
                        'User-Agent': 'TradingBotDetection/1.0.0',
                        'X-Client-Version': '1.0.0'
                    },
                    timeout: 15000,
                    agent: agent,
                    maxPayload: 1024 * 1024 // 1MB max payload
                });
                
                // Connection management with enhanced error handling
                const connectionTimeout = setTimeout(() => {
                    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                        logger.error('Connection timeout - terminating connection');
                        this.connectionState = 'disconnected';
                        
                        // Update circuit breaker state
                        this.errorCount++;
                        this.lastErrorTime = Date.now();
                        
                        if (this.ws) {
                            try {
                                this.ws.terminate();
                            } catch (error) {
                                logger.error(`Error during terminate: ${error.message}`);
                            }
                        }
                        this.ws = null;
                        reject(new Error('Connection timeout'));
                        
                        // Check if we should switch to HTTP fallback
                        if (this.errorCount >= this.maxErrors) {
                            logger.warn('Max errors reached, switching to HTTP fallback');
                            this.useHttpFallback = true;
                            
                            // Schedule circuit breaker reset
                            this.circuitBreakerTimer = setTimeout(() => {
                                this.errorCount = 0;
                                this.useHttpFallback = false;
                                logger.info('Circuit breaker reset');
                            }, this.circuitBreakerTimeout);
                        }
                    }
                }, 15000);

                // Setup heartbeat mechanism
                this.lastPong = Date.now();
                this.pingInterval = setInterval(() => {
                    if (!this.ws) {
                        logger.warn('No WebSocket connection available, clearing ping interval');
                        if (this.pingInterval) {
                            clearInterval(this.pingInterval);
                            this.pingInterval = null;
                        }
                        return;
                    }
                    
                    if (this.ws.readyState === WebSocket.OPEN) {
                        const pongTimeout = Date.now() - this.lastPong;
                        if (pongTimeout > 15000) {
                            logger.warn(`No pong response for ${(pongTimeout/1000).toFixed(1)}s, reconnecting...`);
                            this.connectionState = 'disconnected';
                            
                            // Update circuit breaker state
                            this.errorCount++;
                            this.lastErrorTime = Date.now();
                            
                            try {
                                this.ws.terminate();
                            } catch (error) {
                                logger.error(`Error during terminate: ${error.message}`);
                            }

                            // Check if we should switch to HTTP fallback
                            if (this.errorCount >= this.maxErrors) {
                                logger.warn('Max errors reached, switching to HTTP fallback');
                                this.useHttpFallback = true;
                                
                                // Schedule circuit breaker reset
                                this.circuitBreakerTimer = setTimeout(() => {
                                    this.errorCount = 0;
                                    this.useHttpFallback = false;
                                    logger.info('Circuit breaker reset');
                                }, this.circuitBreakerTimeout);
                            } else {
                                this.reconnect(priceIds);
                            }
                            return;
                        }
                        
                        try {
                            this.ws.ping();
                        } catch (error) {
                            logger.error(`Error sending ping: ${error.message}`);
                            
                            // Update circuit breaker state
                            this.errorCount++;
                            this.lastErrorTime = Date.now();
                            
                            if (this.errorCount >= this.maxErrors) {
                                logger.warn('Max errors reached, switching to HTTP fallback');
                                this.useHttpFallback = true;
                                
                                // Schedule circuit breaker reset
                                this.circuitBreakerTimer = setTimeout(() => {
                                    this.errorCount = 0;
                                    this.useHttpFallback = false;
                                    logger.info('Circuit breaker reset');
                                }, this.circuitBreakerTimeout);
                            } else if (!this.reconnecting) {
                                this.reconnect(priceIds);
                            }
                        }
                    }
                }, 5000);

                // Set initial connection timeout
                const connectTimeout = setTimeout(() => {
                    if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                        logger.error('WebSocket connection timeout');
                        this.connectionState = 'disconnected';
                        this.ws.terminate();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);

                this.ws.on('open', () => {
                    clearTimeout(connectTimeout);
                    clearTimeout(connectionTimeout);
                    logger.info('WebSocket connection established');
                    this.connectionState = 'connected';
                    this.reconnecting = false;
                    this.reconnectAttempts = 0;
                    this.lastPong = Date.now();
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
                            // Attempt to resubscribe if it's a subscription-related error
                            if (message.message.includes('subscription')) {
                                setTimeout(() => {
                                    if (this.ws.readyState === WebSocket.OPEN) {
                                        this.subscribe(Array.from(this.subscribedFeeds));
                                    }
                                }, this.subscriptionRetryDelay);
                            }
                            return;
                        }
                        
                        if (message.type === 'response' && message.status === 'success') {
                            logger.info('Successfully subscribed to price feeds');
                            for (const priceId of priceIds) {
                                this.subscribedFeeds.add(priceId);
                            }
                            this.lastSubscriptionAttempt = Date.now();
                            return;
                        }

                        if (message.type === 'price_update' || message.type === 'price') {
                            if (!message.price_feed) {
                                logger.error('Received price update without price_feed data', message);
                                return;
                            }

                            const priceFeed = message.price_feed;
                            this.lastUpdateTime = Date.now();
                            
                            // Track active subscriptions based on received data
                            this.activeSubscriptions.add(priceFeed.id);
                            
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
                        logger.error(`Error processing WebSocket message: ${error.message}, data: ${data.toString().substring(0, 200)}`);
                    }
                });

                this.ws.on('error', (error) => {
                    logger.error(`WebSocket error: ${error.message}`);
                    this.connectionState = 'error';
                    
                    // Update circuit breaker state
                    this.errorCount++;
                    this.lastErrorTime = Date.now();
                    
                    // Check if we should switch to HTTP fallback
                    if (this.errorCount >= this.maxErrors) {
                        logger.warn('Max errors reached, switching to HTTP fallback');
                        this.useHttpFallback = true;
                        
                        // Schedule circuit breaker reset
                        this.circuitBreakerTimer = setTimeout(() => {
                            this.errorCount = 0;
                            this.useHttpFallback = false;
                            logger.info('Circuit breaker reset');
                        }, this.circuitBreakerTimeout);
                        
                        // Try to get data via HTTP immediately
                        this.fetchLatestPricesHTTP()
                            .then(prices => {
                                if (Object.keys(prices).length > 0) {
                                    logger.info('Successfully fetched prices via HTTP fallback');
                                }
                            })
                            .catch(err => {
                                logger.error(`HTTP fallback failed: ${err.message}`);
                            });
                    } else if (!this.reconnecting) {
                        this.reconnect(priceIds);
                    }
                });

                this.ws.on('close', (code, reason) => {
                    logger.warn(`WebSocket connection closed: ${code} - ${reason || 'No reason provided'}`);
                    this.connectionState = 'disconnected';
                    this.subscribedFeeds.clear();
                    this.activeSubscriptions.clear();
                    
                    if (this.isStreaming && !this.reconnecting) {
                        this.reconnect(priceIds);
                    }
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

        const subscribeMessage = {
            type: 'subscribe',
            ids: priceIds
        };
            
            try {
                this.ws.send(JSON.stringify(subscribeMessage));
                logger.info(`Subscribing to ${priceIds.length} price feeds`);
            } catch (error) {
                logger.error(`Error subscribing to price feeds: ${error.message}`);
            }
    }

    /**
     * Reconnect logic with backoff
     */
    async reconnect(priceIds) {
        if (this.reconnecting) {
            logger.warn('Reconnection already in progress');
            return;
        }

        this.reconnecting = true;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
            this.cleanup();
            return;
        }

        // Clear any existing intervals before reconnecting
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        // Clear any existing connection
        if (this.ws) {
            try {
                this.ws.terminate();
            } catch (error) {
                logger.warn(`Error terminating WebSocket during reconnect: ${error.message}`);
            }
            this.ws = null;
        }

        this.reconnectAttempts++;
        const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffTime/1000}s...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        try {
            await this.connect(priceIds);
            logger.info('Reconnection successful');
            this.reconnecting = false;
            this.reconnectAttempts = 0; // Reset attempts on successful connection
        } catch (error) {
            logger.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error.message}`);
            this.reconnecting = false;
            
            // If it's a network error or abnormal closure, add extra delay before retry
            if (error.message.includes('WebSocket was closed') || 
                error.message.includes('1006') || 
                error.message.includes('timeout')) {
                const networkRetryDelay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 30000);
                logger.info(`Network error detected, waiting ${networkRetryDelay/1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, networkRetryDelay));
            }
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                await this.reconnect(priceIds);
            } else {
                logger.error('Max reconnection attempts reached, cleaning up');
                this.cleanup();
            }
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
            // Consider data stale after 10 seconds
            if (priceData && now - priceData.timestamp <= 10000) {
                prices[assetName] = priceData;
            } else if (priceData && now - priceData.timestamp <= 120000) {
                prices[assetName] = priceData;
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
        logger.info('Cleaning up WebSocket resources...');
        this.isStreaming = false;
        this.connectionState = 'disconnected';
        
        // Clear all intervals and timers
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.circuitBreakerTimer) {
            clearTimeout(this.circuitBreakerTimer);
            this.circuitBreakerTimer = null;
        }
        
        // Clear all data structures
        this.subscribedFeeds.clear();
        this.activeSubscriptions.clear();
        this.connectionQueue = [];
        
        // Close WebSocket connection
        if (this.ws) {
            try {
                this.ws.terminate();
                this.ws = null;
            } catch (error) {
                logger.error(`Error during WebSocket cleanup: ${error.message}`);
            }
        }
        
        // Reset all state variables
        this.reconnecting = false;
        this.reconnectAttempts = 0;
        this.lastUpdateTime = 0;
        this.lastPong = 0;
        this.lastSubscriptionAttempt = 0;
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.useHttpFallback = false;
    }
}

export default new PythHermesClient();

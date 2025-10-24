const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./utils/logger');

// Services
const pythClient = require('./services/pythHermesClient');
const blockchainListener = require('./services/blockchainListener');
const botDetector = require('./services/botDetector');

// Routes
const userRoutes = require('./routes/userRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            pythStream: pythClient.isStreaming,
            blockchainListener: true
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Trading Bot Detection System',
        version: '1.0.0',
        description: 'Detects trading bots using Pyth Network price feeds',
        endpoints: {
            health: '/health',
            userStatus: '/api/user/:address/status',
            userTrades: '/api/user/:address/trades',
            userAnalytics: '/api/user/:address/analytics',
            prices: '/api/analytics/prices',
            pendingBots: '/api/analytics/bots/pending'
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
});

// Start services
async function startServices() {
    try {
        logger.info('🚀 Starting Bot Detection System...');
        
        // 1. Start Pyth price streaming (FREE!)
        logger.info('📡 Starting Pyth Hermes price stream...');
        pythClient.startPriceStream();
        
        // Wait for initial prices
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 2. Start blockchain event listener
        logger.info('👂 Starting blockchain event listener...');
        blockchainListener.startListening(async (tradeData) => {
            logger.info(`\n${'='.repeat(60)}`);
            logger.info(`📊 NEW TRADE DETECTED`);
            logger.info(`User: ${tradeData.user}`);
            logger.info(`Amount: ${tradeData.amount} ETH`);
            logger.info(`Time: ${new Date(tradeData.timestamp * 1000).toISOString()}`);
            logger.info(`${'='.repeat(60)}\n`);
            
            // Analyze the trade
            const analysis = await botDetector.analyzeTrade(tradeData);
            
            if (analysis.isBot) {
                logger.warn(`\n${'!'.repeat(60)}`);
                logger.warn(`🚨 BOT DETECTED: ${tradeData.user}`);
                logger.warn(`Score: ${analysis.botScore}/100`);
                logger.warn(`Signals: ${analysis.signals.join(', ')}`);
                logger.warn(`${'!'.repeat(60)}\n`);
            } else {
                logger.info(`✅ Human trader: ${tradeData.user} (Score: ${analysis.botScore}/100)`);
            }
        });
        
        logger.info('✅ All services started successfully!');
        
    } catch (error) {
        logger.error(`Failed to start services: ${error.message}`);
        process.exit(1);
    }
}

// Start Express server
app.listen(config.port, () => {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🛡️  BOT DETECTION SYSTEM RUNNING`);
    logger.info(`${'='.repeat(60)}`);
    logger.info(`Server: http://localhost:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Contract: ${config.contractAddress}`);
    logger.info(`${'='.repeat(60)}\n`);
    
    // Start all services
    startServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
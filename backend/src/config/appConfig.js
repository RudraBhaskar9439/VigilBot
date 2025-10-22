require('dotenv').config();

module.exports = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Blockchain (Polygon Network)
    rpcUrl: process.env.RPC_URL || 'https://polygon-rpc.com',
    chainId: parseInt(process.env.CHAIN_ID || 137),
    privateKey: process.env.PRIVATE_KEY,

    // Pyth Network
    hermesUrl: process.env.HERMES_URL || 'https://hermes.pyth.network',
    priceIds: {
        'BTC/USD': process.env.BTC_PRICE_ID || '0xe62df6c8b4d85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
        'ETH/USD': process.env.ETH_PRICE_ID || '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
        'SOL/USD': process.env.SOL_PRICE_ID || '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'
    },

    // Polymarket API
    polymarketApiKey: process.env.POLYMARKET_API_KEY,
    polymarketApiSecret: process.env.POLYMARKET_API_SECRET,
    polymarketPassphrase: process.env.POLYMARKET_PASSPHRASE,
    
    // Bot Detection
    botScoreThreshold: parseInt(process.env.BOT_SCORE_THRESHOLD || 60),
    reactionTimeThreshold: parseInt(process.env.REACTION_TIME_THRESHOLD || 1),
    batchSize: parseInt(process.env.BATCH_SIZE || 10),
    checkInterval: parseInt(process.env.CHECK_INTERVAL || 5000),

    // Polymarket Specific
    polymarketMinTradeAmount: parseFloat(process.env.POLYMARKET_MIN_TRADE_AMOUNT || 1.0),
    polymarketMaxTradeAmount: parseFloat(process.env.POLYMARKET_MAX_TRADE_AMOUNT || 10000.0),
    polymarketRiskLimit: parseFloat(process.env.POLYMARKET_RISK_LIMIT || 0.1)
};

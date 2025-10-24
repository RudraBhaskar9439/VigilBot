import 'dotenv/config';
import contractData from './contract.json' with { type: 'json' };

const appConfig = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
rpcUrl: process.env.SEPOLIA_WSS_URL || 'wss://sepolia.infura.io/ws/v3/2758fd4e9f4640e2b22cddb3d671ba2e',
chainId: parseInt(process.env.CHAIN_ID || 11155111),
    contractAddress: contractData.address,
    contractABI: contractData.abi,
    privateKey: process.env.PRIVATE_KEY,

    // Pyth Network
    hermesUrl: process.env.HERMES_URL || 'https://hermes.pyth.network',  // Changed to HTTPS by default
    hermesWsUrl: process.env.HERMES_WS_URL || 'wss://hermes.pyth.network/ws', // Separate WebSocket URL
    priceIds: {
        'BTC/USD': process.env.BTC_PRICE_ID || '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
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

export default appConfig;
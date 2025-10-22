import 'dotenv/config';
import contractData from './contract.json' with { type: 'json' };

const config = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Blockchain
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    chainId: parseInt(process.env.CHAIN_ID),
    privateKey: process.env.PRIVATE_KEY,

    // Contract
    contractAddress: contractData.address,
    contractABI: contractData.abi,

    // Pyth Network
    hermesUrl: process.env.HERMES_URL || 'https://hermes.pyth.network',
    priceIds: {
        'BTC/USD': process.env.BTC_PRICE_ID,
        'ETH/USD': process.env.ETH_PRICE_ID,
    },
    
    // Bot Detection
    botScoreThreshold: parseInt(process.env.BOT_SCORE_THRESHOLD || 60),
    reactionTimeThreshold: parseInt(process.env.REACTION_TIME_THRESHOLD || 1),
    batchSize: parseInt(process.env.BATCH_SIZE || 10),
    checkInterval: parseInt(process.env.CHECK_INTERVAL || 5000)
};

export default config;
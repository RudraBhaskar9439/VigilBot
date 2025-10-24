const contractData = require('./contract.json');

module.exports = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Blockchain
    rpcUrl: process.env.RPC_URL,
    chainId: parseInt(process.env.CHAIN_ID),
    privateKey: process.env.PRIVATE_KEY,

    // Contract
    contractAddress: contractData.address,
    contractABI: contractData.abi,

    // Pyth Network
    hermesUrl: process.env.HERMES_URL,
    priceIds: {
        'BTC/USD': process.env.BTC_PRICE_ID,
        'ETH/USD': process.env.ETH_PRICE_ID,
        // 'USDC/USD': process.env.USDC_PRICE_ID // To match the .env file
    },
    
    // Bot Detection
    botScoreThreshold: parseInt(process.env.BOT_SCORE_THRESHOLD || 60),
    reactionTimeThreshold: parseInt(process.env.REACTION_TIME_THRESHOLD || 1),
    batchSize: parseInt(process.env.BATCH_SIZE || 10),
    checkInterval: parseInt(process.env.CHECK_INTERVAL || 5000)
};
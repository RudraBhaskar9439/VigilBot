import dotenv from 'dotenv';
dotenv.config();

export default {
    // Infura endpoints
    rpcUrl: process.env.INFURA_HTTP_URL || 'https://sepolia.infura.io/v3/2758fd4e9f4640e2b22cddb3d671ba2e',
    wsUrl: process.env.INFURA_WS_URL,
    
    // Network configuration
    network: {
        name: 'sepolia',
        chainId: 11155111
    },
    
    // API keys
    infuraKey: process.env.INFURA_API_KEY || '2758fd4e9f4640e2b22cddb3d671ba2e',
    etherscanKey: process.env.ETHERSCAN_API_KEY
};
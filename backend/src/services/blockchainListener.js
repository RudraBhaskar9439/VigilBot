const { ethers } = require('ethers');
const config = require('../config/config');
const logger = require('../utils/logger');

class BlockchainListener {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        
        // Check if we have a valid private key
        this.isReadOnly = !config.privateKey || 
                         config.privateKey === 'your_private_key_here' || 
                         config.privateKey.length < 64;
        
        if (this.isReadOnly) {
            logger.warn('⚠️  No valid private key found. Running in READ-ONLY mode.');
            logger.warn('   Event listening will work, but write operations will be disabled.');
            this.wallet = null;
            this.contract = new ethers.Contract(
                config.contractAddress,
                config.contractABI,
                this.provider
            );
        } else {
            this.wallet = new ethers.Wallet(config.privateKey, this.provider);
            this.contract = new ethers.Contract(
                config.contractAddress,
                config.contractABI,
                this.wallet
            );
        }
        
        this.eventHandlers = [];
    }
    
    /**
     * Start listening to TradeExecuted events
     */
    startListening(onTradeExecuted) {
        logger.info(' Listening for TradeExecuted events...');
        
        // Listen to new events
        this.contract.on('TradeExecuted', async (user, timestamp, amount, blockNumber, event) => {
            logger.info(` New trade detected from ${user}`);
            
            const tradeData = {
                user,
                timestamp: Number(timestamp),
                amount: ethers.formatEther(amount),
                blockNumber: Number(blockNumber),
                transactionHash: event.log.transactionHash
            };
            
            if (onTradeExecuted) {
                await onTradeExecuted(tradeData);
            }
        });
        
        // Also listen to BotFlagged events
        this.contract.on('BotFlagged', (user, score, reason, event) => {
            logger.warn(` Bot flagged: ${user} (Score: ${score}) - ${reason}`);
        });
    }
    
    /**
     * Get user's trade history
     */
    async getUserTrades(userAddress) {
        try {
            const trades = await this.contract.getUserTrades(userAddress);
            return trades.map(trade => ({
                user: trade.user,
                timestamp: Number(trade.timestamp),
                amount: ethers.formatEther(trade.amount),
                blockNumber: Number(trade.blockNumber)
            }));
        } catch (error) {
            logger.error(`Error fetching trades for ${userAddress}: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Check if user is flagged as bot
     */
    async isBot(userAddress) {
        try {
            const [isFlagged, score] = await this.contract.isBot(userAddress);
            return { isFlagged, score: Number(score) };
        } catch (error) {
            logger.error(`Error checking bot status for ${userAddress}: ${error.message}`);
            return { isFlagged: false, score: 0 };
        }
    }
    
    /**
     * Flag bots on-chain (batch operation)
     */
    async flagBots(users, scores, reasons) {
        if (this.isReadOnly) {
            logger.warn('❌ Cannot flag bots: Running in read-only mode. Set a valid PRIVATE_KEY to enable write operations.');
            return { success: false, error: 'Read-only mode: No private key configured' };
        }
        
        try {
            logger.info(`🔨 Flagging ${users.length} bots on-chain...`);
            
            const tx = await this.contract.flagBots(users, scores, reasons, {
                gasLimit: 500000
            });
            
            logger.info(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            
            logger.info(` Bots flagged! Gas used: ${receipt.gasUsed.toString()}`);
            return { success: true, txHash: tx.hash, receipt };
        } catch (error) {
            logger.error(`Error flagging bots: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Unflag a user
     */
    async unflagBot(userAddress) {
        if (this.isReadOnly) {
            logger.warn('❌ Cannot unflag user: Running in read-only mode. Set a valid PRIVATE_KEY to enable write operations.');
            return { success: false, error: 'Read-only mode: No private key configured' };
        }
        
        try {
            const tx = await this.contract.unflagBot(userAddress);
            await tx.wait();
            logger.info(` User ${userAddress} unflagged`);
            return { success: true };
        } catch (error) {
            logger.error(`Error unflagging user: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new BlockchainListener();
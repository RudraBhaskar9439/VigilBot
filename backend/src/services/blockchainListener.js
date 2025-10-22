import { ethers } from 'ethers';
import config from '../config/appConfig.js';
import logger from '../utils/logger.js';
import pythHermesClient from './pythHermesClient.js';

class BlockchainListener {
    constructor() {
        try {
            const { WebSocketProvider, JsonRpcProvider } = ethers.providers;
            // Use WebSocketProvider if RPC URL starts with wss://, else fallback to JsonRpcProvider
            if (config.rpcUrl && config.rpcUrl.startsWith('wss://')) {
                this.provider = new WebSocketProvider(config.rpcUrl);
                logger.info('Using WebSocketProvider for event listening');
            } else {
                this.provider = new JsonRpcProvider(config.rpcUrl);
                logger.info('Using JsonRpcProvider for event listening');
            }
        } catch (error) {
            logger.error('Failed to initialize provider:', error);
            throw error;
        }
        
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
        logger.info('👂 Listening for TradeExecuted events...');
        
        // Listen to new events
        this.contract.on('TradeExecuted', async (user, timestamp, amount, blockNumber, event) => {
            logger.info(`TradeExecuted event received: user=${user}, amount=${amount}`);
            logger.info(`📊 New trade detected from ${user}`);
            
            const tradeData = {
                user,
                timestamp: Number(timestamp),
                amount: ethers.utils.formatEther(amount),
                blockNumber: Number(blockNumber),
                transactionHash: event.transactionHash
            };
            
            // Always fetch real market price from Pyth live price feeds
            try {
                const btcPriceId = config.priceIds['BTC/USD'];
                // Use the live price stream if available, else fallback to latest fetch
                let priceData = pythHermesClient.getLatestPrice(btcPriceId);
                if (!priceData || !priceData.price) {
                    priceData = await pythHermesClient.fetchLatestPrice(btcPriceId);
                }
                logger.info(`📈 Real BTC/USD price from Pyth: $${priceData.price} (publishTime: ${priceData.publishTime})`);
                tradeData.btcPrice = priceData.price;
            } catch (err) {
                logger.warn(`⚠️ Could not fetch real BTC/USD price from Pyth: ${err.message}`);
            }
            
            // Activate bot detection system for each trade
            if (onTradeExecuted) {
                await onTradeExecuted(tradeData);
            }
        });
        
        // Listen to GoodBotFlagged events
        this.contract.on('GoodBotFlagged', (user, score, botType, liquidityProvided, reason, priceUsed, reactionTimeMs, event) => {
            logger.info(`🟢 Good Bot flagged: ${user}`);
            logger.info(`   Score: ${score} | Type: ${botType}`);
            logger.info(`   Liquidity: $${ethers.utils.formatEther(liquidityProvided)}`);
            logger.info(`   Reason: ${reason}`);
        });
        
        // Listen to BadBotFlagged events
        this.contract.on('BadBotFlagged', (user, score, riskLevel, reason, priceUsed, reactionTimeMs, event) => {
            logger.warn(`🔴 Bad Bot flagged: ${user}`);
            logger.warn(`   Score: ${score} | Risk: ${riskLevel}`);
            logger.warn(`   Reason: ${reason}`);
        });
        
        // Listen to BotUnflagged events
        this.contract.on('BotUnflagged', (user, previousCategory, event) => {
            logger.info(`✅ Bot unflagged: ${user} (Was: ${previousCategory})`);
        });
    }
    
    /**
     * Get user's trade history
     */
    async getUserTrades(userAddress) {
        try {
            // Defensive: If address is not a valid user, return empty array
            if (!ethers.isAddress(userAddress) || userAddress === ethers.ZeroAddress) {
                logger.warn(`Skipping getUserTrades for invalid or zero address: ${userAddress}`);
                return [];
            }
            // Skip placeholder addresses (e.g., 0x222...222, 0x111...111, etc.)
            const placeholderAddresses = [
                '0x2222222222222222222222222222222222222222',
                '0x1111111111111111111111111111111111111111',
                '0x0000000000000000000000000000000000000000'
            ];
            if (placeholderAddresses.includes(userAddress.toLowerCase())) {
                logger.warn(`Skipping getUserTrades for placeholder address: ${userAddress}`);
                return [];
            }
            const trades = await this.contract.getUserTrades(userAddress);
            // Defensive: If contract returns empty or invalid data, return empty array
            if (!trades || !Array.isArray(trades) || trades.length === 0) {
                logger.warn(`No trades found or invalid response for address: ${userAddress}`);
                return [];
            }
            // Defensive: If trade struct fields are missing, skip mapping
            if (!trades[0] || trades[0].user === undefined) {
                logger.warn(`Trade struct format mismatch for address: ${userAddress}`);
                return [];
            }
            return trades.map(trade => ({
                user: trade.user,
                timestamp: Number(trade.timestamp),
                amount: ethers.utils.formatEther(trade.amount),
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
     * Get detailed bot information
     */
    async getBotInfo(userAddress) {
        try {
            const botInfo = await this.contract.getBotInfo(userAddress);
            return {
                isFlagged: botInfo.isFlagged,
                score: Number(botInfo.score),
                category: Number(botInfo.category), // 0=HUMAN, 1=GOOD_BOT, 2=BAD_BOT
                botType: botInfo.botType,
                liquidityProvided: ethers.utils.formatEther(botInfo.liquidityProvided),
                flaggedAt: Number(botInfo.flaggedAt)
            };
        } catch (error) {
            logger.error(`Error fetching bot info for ${userAddress}: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get bot evidence with Pyth proof
     */
    async getBotEvidence(userAddress) {
        try {
            const evidence = await this.contract.getBotEvidence(userAddress);
            return {
                user: evidence.user,
                tradeTimestamp: Number(evidence.tradeTimestamp),
                pricePublishTime: Number(evidence.pricePublishTime),
                priceAtTrade: evidence.priceAtTrade.toString(),
                reactionTimeMs: Number(evidence.reactionTimeMs),
                botScore: Number(evidence.botScore),
                category: Number(evidence.category),
                botType: evidence.botType,
                liquidityProvided: ethers.utils.formatEther(evidence.liquidityProvided)
            };
        } catch (error) {
            logger.error(`Error fetching bot evidence for ${userAddress}: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get all good bots from contract
     */
    async getGoodBots() {
        try {
            const goodBotAddresses = await this.contract.getGoodBots();
            logger.info(`🟢 Fetched ${goodBotAddresses.length} good bots from contract`);
            
            // Get detailed info for each good bot
            const goodBots = await Promise.all(
                goodBotAddresses.map(async (address) => {
                    const info = await this.getBotInfo(address);
                    return {
                        address,
                        ...info
                    };
                })
            );
            
            return goodBots;
        } catch (error) {
            logger.error(`Error fetching good bots: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Get all bad bots from contract
     */
    async getBadBots() {
        try {
            const badBotAddresses = await this.contract.getBadBots();
            logger.warn(`🔴 Fetched ${badBotAddresses.length} bad bots from contract`);
            
            // Get detailed info for each bad bot
            const badBots = await Promise.all(
                badBotAddresses.map(async (address) => {
                    const info = await this.getBotInfo(address);
                    return {
                        address,
                        ...info
                    };
                })
            );
            
            return badBots;
        } catch (error) {
            logger.error(`Error fetching bad bots: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Get good bots count
     */
    async getGoodBotsCount() {
        try {
            const count = await this.contract.getGoodBotsCount();
            return Number(count);
        } catch (error) {
            logger.error(`Error fetching good bots count: ${error.message}`);
            return 0;
        }
    }
    
    /**
     * Get bad bots count
     */
    async getBadBotsCount() {
        try {
            const count = await this.contract.getBadBotsCount();
            return Number(count);
        } catch (error) {
            logger.error(`Error fetching bad bots count: ${error.message}`);
            return 0;
        }
    }
    
    /**
     * Check if address is a good bot
     */
    async isGoodBot(userAddress) {
        try {
            return await this.contract.isGoodBotAddress(userAddress);
        } catch (error) {
            logger.error(`Error checking if good bot: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Check if address is a bad bot
     */
    async isBadBot(userAddress) {
        try {
            return await this.contract.isBadBotAddress(userAddress);
        } catch (error) {
            logger.error(`Error checking if bad bot: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Unflag a bot (admin only)
     */
    async unflagBot(userAddress) {
        if (this.isReadOnly) {
            logger.warn('❌ Cannot unflag user: Running in read-only mode.');
            return { success: false, error: 'Read-only mode' };
        }
        
        try {
            const tx = await this.contract.unflagBot(userAddress);
            await tx.wait();
            logger.info(`✅ User ${userAddress} unflagged`);
            return { success: true };
        } catch (error) {
            logger.error(`Error unflagging user: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Stop listening to events
     */
    stopListening() {
        this.contract.removeAllListeners();
        logger.info('🛑 Stopped listening to blockchain events');
    }
}

export default new BlockchainListener();
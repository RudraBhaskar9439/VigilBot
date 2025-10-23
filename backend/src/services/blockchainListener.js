import * as ethers from 'ethers';
const { providers, Wallet, Contract, constants, utils } = ethers;
const { ZeroAddress } = ethers;
const { isAddress, formatEther } = ethers;

import config from '../config/appConfig.js';
import logger from '../utils/logger.js';
import pythHermesClient from './pythHermesClient.js';
import BatchedTransactionFetcher from './batchedTransactionFetcher.js';


class BlockchainListener {
    constructor() {
        this.provider = null;
        this.wsProvider = null;
        this.wallet = null;
        this.contract = null;
        this.isReadOnly = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.isConnecting = false;
        this.eventHandlers = [];
        this.isListening = false;
        this.transactionFetcher = null;

        this.setupProvider();
    }

    setupProvider() {
        try {
            // Primary HTTP provider for reliability
            const httpUrl = config.rpcUrl.replace('wss://', 'https://').replace('/ws/', '/');
            this.provider = new ethers.JsonRpcProvider(httpUrl);
            this.transactionFetcher = new BatchedTransactionFetcher(this.provider);
            logger.info(`✅ HTTP Provider initialized: ${httpUrl.substring(0, 50)}...`);

            // Test the connection
            this.provider.getBlockNumber().then(blockNum => {
                logger.info(`✅ Connected to Ethereum Mainnet - Current Block: ${blockNum}`);
            }).catch(err => {
                logger.error(`❌ Failed to connect to provider: ${err.message}`);
            });
            
            // Check if we have a valid private key
            this.isReadOnly = !config.privateKey || 
                         config.privateKey === 'your_private_key_here' || 
                         config.privateKey.length < 64;
            
            if (this.isReadOnly) {
                logger.warn('⚠️  No valid private key found. Running in READ-ONLY mode.');
                logger.warn('   Event listening will work, but write operations will be disabled.');
                this.wallet = null;
                this.contract = new Contract(
                    config.contractAddress,
                    config.contractABI,
                    this.provider
                );
            } else {
                this.wallet = new Wallet(config.privateKey, this.provider);
                this.contract = new Contract(
                    config.contractAddress,
                    config.contractABI,
                    this.wallet
                );
                logger.info(`✅ Wallet initialized: ${this.wallet.address}`);
            }
            
            logger.info(`✅ Contract initialized at: ${config.contractAddress}`);
            
        } catch (error) {
            logger.error(`❌ Failed to initialize provider: ${error.message}`);
            throw error;
        }
    }
    
    async startListening(onTradeExecuted) {
        if (this.isListening) {
            logger.warn('Already listening for events');
            return;
        }
        
        this.isListening = true;
        logger.info('👂 Starting to listen for TradeExecuted events...');
        logger.info(`   Contract: ${config.contractAddress}`);
        logger.info(`   Network: Ethereum Mainnet (Chain ID: ${config.chainId})`);
        
        try {
            // Get current block to start listening from
            const currentBlock = await this.provider.getBlockNumber();
            logger.info(`   Starting from block: ${currentBlock}`);
            
            // Listen to new TradeExecuted events
            this.contract.on('TradeExecuted', async (user, timestamp, amount, blockNumber, btcPrice, event) => {
                try {
                    logger.info(`\n${'='.repeat(60)}`);
                    logger.info(`📊 NEW TRADE EVENT DETECTED`);
                    logger.info(`${'='.repeat(60)}`);
                    logger.info(`User: ${user}`);
                    logger.info(`Timestamp: ${timestamp.toString()}`);
                    logger.info(`Amount: ${formatEther(amount)} ETH`);
                    logger.info(`Block: ${blockNumber.toString()}`);
                    logger.info(`BTC Price: ${btcPrice ? btcPrice.toString() : 'N/A'}`);
                    logger.info(`Transaction: ${event.transactionHash}`);
                    logger.info(`${'='.repeat(60)}\n`);
                    
                    // Get block data for additional analysis
                    const block = await this.provider.getBlock(blockNumber.toNumber());
                    const txReceipt = await this.provider.getTransactionReceipt(event.transactionHash);
                    
                    // Calculate reaction time if we have price data
                    const btcPriceId = config.priceIds['BTC/USD'];
                    const latestPrice = pythHermesClient.getLatestPrice(btcPriceId);
                    
                    // Get block timestamp
                    const blockTime = block.timestamp * 1000; // Convert to milliseconds
                    
                    const tradeData = {
                        user,
                        timestamp: Number(timestamp),
                        amount: formatEther(amount),
                        blockNumber: Number(blockNumber),
                        transactionHash: event.transactionHash,
                        precision: formatEther(amount).split('.')[1]?.length || 0,
                        gasPrice: txReceipt ? Number(txReceipt.gasPrice) : undefined,
                        btcPrice: latestPrice ? latestPrice.price : null,
                        // Add these fields for reaction time calculation
                        shouldMeasureReactionTime: !!latestPrice,
                        pricePublishTime: latestPrice ? latestPrice.publishTime : null,
                        blockTime: blockTime
                    };

                    if (latestPrice && latestPrice.publishTime) {
                        logger.info(`⏱️  Price data for reaction time:
                        Block time: ${new Date(blockTime).toISOString()}
                        Price publish time: ${new Date(latestPrice.publishTime).toISOString()}`);
                    } else {
                        logger.warn('⚠️ No valid price data available for reaction time calculation');
                    }
                    
                    logger.info(`📦 Trade data prepared for analysis`);
                    
                    // Call the analysis callback
                    if (onTradeExecuted) {
                        await onTradeExecuted(tradeData);
                    }
                    
                } catch (error) {
                    logger.error(`❌ Error processing TradeExecuted event: ${error.message}`);
                    logger.error(error.stack);
                }
            });
            
            // Listen to GoodBotFlagged events
            this.contract.on('GoodBotFlagged', (user, score, botType, liquidityProvided, reason, priceUsed, reactionTimeMs, event) => {
                logger.info(`🟢 Good Bot flagged: ${user}`);
                logger.info(`   Score: ${score.toString()} | Type: ${botType}`);
                logger.info(`   Liquidity: $${formatEther(liquidityProvided)}`);
                logger.info(`   Reason: ${reason}`);
                logger.info(`   Transaction: ${event.transactionHash}`);
            });
            
            // Listen to BadBotFlagged events
            this.contract.on('BadBotFlagged', (user, score, riskLevel, reason, priceUsed, reactionTimeMs, event) => {
                logger.warn(`🔴 Bad Bot flagged: ${user}`);
                logger.warn(`   Score: ${score.toString()} | Risk: ${riskLevel}`);
                logger.warn(`   Reason: ${reason}`);
                logger.warn(`   Transaction: ${event.transactionHash}`);
            });
            
            // Listen to BotUnflagged events
            this.contract.on('BotUnflagged', (user, previousCategory, event) => {
                logger.info(`✅ Bot unflagged: ${user} (Was: ${previousCategory})`);
                logger.info(`   Transaction: ${event.transactionHash}`);
            });
            
            logger.info('✅ Event listeners registered successfully');
            logger.info('   - TradeExecuted');
            logger.info('   - GoodBotFlagged');
            logger.info('   - BadBotFlagged');
            logger.info('   - BotUnflagged');
            logger.info('\n🎯 Waiting for events...\n');
            
            // Also query recent past events (last 100 blocks)
            const fromBlock = Math.max(0, currentBlock - 100);
            logger.info(`🔍 Querying past events from block ${fromBlock} to ${currentBlock}...`);
            
            const filter = this.contract.filters.TradeExecuted();
            const pastEvents = await this.contract.queryFilter(filter, fromBlock, currentBlock);
            
            if (pastEvents.length > 0) {
                logger.info(`📜 Found ${pastEvents.length} past trade events`);
                
                for (const event of pastEvents) {
                    const { user, timestamp, amount, blockNumber, btcPrice } = event.args;
                    logger.info(`   - Block ${blockNumber.toString()}: ${user} traded ${formatEther(amount)} ETH`);
                }
            } else {
                logger.info(`   No past trade events found in last 100 blocks`);
            }
            
        } catch (error) {
            logger.error(`❌ Error starting event listener: ${error.message}`);
            logger.error(error.stack);
            this.isListening = false;
            throw error;
        }
    }

    async getUserTrades(userAddress) {
        try {
            if (!isAddress(userAddress) || userAddress === AddressZero) {
                logger.warn(`Invalid address: ${userAddress}`);
                return [];
            }
            
            const trades = await this.contract.getUserTrades(userAddress);
            
            if (!trades || trades.length === 0) {
                return [];
            }
            
            return trades.map(trade => ({
                user: trade.user,
                timestamp: Number(trade.timestamp),
                amount: formatEther(trade.amount),
                blockNumber: Number(trade.blockNumber),
                btcPriceAtTrade: trade.btcPriceAtTrade ? Number(trade.btcPriceAtTrade) : null,
                pricePublishTime: trade.pricePublishTime ? Number(trade.pricePublishTime) : null
            }));
        } catch (error) {
            logger.error(`Error fetching trades for ${userAddress}: ${error.message}`);
            return [];
        }
    }

    async isBot(userAddress) {
        try {
            const [isFlagged, score] = await this.contract.isBot(userAddress);
            return { isFlagged, score: Number(score) };
        } catch (error) {
            logger.error(`Error checking bot status for ${userAddress}: ${error.message}`);
            return { isFlagged: false, score: 0 };
        }
    }

    async getBotInfo(userAddress) {
        try {
            const botInfo = await this.contract.getBotInfo(userAddress);
            return {
                isFlagged: botInfo.isFlagged,
                score: Number(botInfo.score),
                category: Number(botInfo.category),
                botType: botInfo.botType,
                liquidityProvided: formatEther(botInfo.liquidityProvided),
                flaggedAt: Number(botInfo.flaggedAt)
            };
        } catch (error) {
            logger.error(`Error fetching bot info for ${userAddress}: ${error.message}`);
            return null;
        }
    }

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
                liquidityProvided: formatEther(evidence.liquidityProvided)
            };
        } catch (error) {
            logger.error(`Error fetching bot evidence for ${userAddress}: ${error.message}`);
            return null;
        }
    }

    async getGoodBots() {
        try {
            const goodBotAddresses = await this.contract.getGoodBots();
            logger.info(`🟢 Fetched ${goodBotAddresses.length} good bots from contract`);
            
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

    async getBadBots() {
        try {
            const badBotAddresses = await this.contract.getBadBots();
            logger.warn(`🔴 Fetched ${badBotAddresses.length} bad bots from contract`);
            
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

    async getGoodBotsCount() {
        try {
            const count = await this.contract.getGoodBotsCount();
            return Number(count);
        } catch (error) {
            logger.error(`Error fetching good bots count: ${error.message}`);
            return 0;
        }
    }

    async getBadBotsCount() {
        try {
            const count = await this.contract.getBadBotsCount();
            return Number(count);
        } catch (error) {
            logger.error(`Error fetching bad bots count: ${error.message}`);
            return 0;
        }
    }

    async isGoodBot(userAddress) {
        try {
            return await this.contract.isGoodBotAddress(userAddress);
        } catch (error) {
            logger.error(`Error checking if good bot: ${error.message}`);
            return false;
        }
    }

    async isBadBot(userAddress) {
        try {
            return await this.contract.isBadBotAddress(userAddress);
        } catch (error) {
            logger.error(`Error checking if bad bot: ${error.message}`);
            return false;
        }
    }

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

    stopListening() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        this.isListening = false;
        logger.info('🛑 Stopped listening to blockchain events');
    }

    async getHistoricalTrades(startBlock, endBlock) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            // Create filter for TradeExecuted events
            const filter = {
                address: this.contract.address,
                topics: [
                    utils.id('TradeExecuted(address,uint256,uint256,uint256)')
                ]
            };

            logger.info(`🔍 Fetching historical trades from block ${startBlock} to ${endBlock}`);
            const logs = await this.transactionFetcher.fetchTransactionsBatched(startBlock, endBlock, filter);
            
            // Process the logs
            const trades = await Promise.all(logs.map(async log => {
                const parsedLog = this.contract.interface.parseLog(log);
                const [user, timestamp, amount, blockNumber] = parsedLog.args;
                
                // Get additional transaction data
                const txReceipt = await this.provider.getTransactionReceipt(log.transactionHash);
                
                return {
                    user,
                    timestamp: Number(timestamp),
                    amount: formatEther(amount),
                    blockNumber: blockNumber.toNumber(),
                    transactionHash: log.transactionHash,
                    gasPrice: txReceipt ? Number(txReceipt.gasPrice) : undefined,
                    precision: formatEther(amount).split('.')[1]?.length || 0
                };
            }));

            logger.info(`✅ Successfully fetched ${trades.length} historical trades`);
            return trades;
        } catch (error) {
            logger.error(`❌ Error fetching historical trades: ${error.message}`);
            throw error;
        }
    }

    async getUserTrades(userAddress, startBlock = 0) {
        try {
            if (!isAddress(userAddress)) {
                throw new Error('Invalid Ethereum address');
            }

            const currentBlock = await this.provider.getBlockNumber();
            
            // Create filter for specific user's trades
            const filter = {
                address: this.contract.address,
                topics: [
                    utils.id('TradeExecuted(address,uint256,uint256,uint256)'),
                    utils.hexZeroPad(userAddress, 32)
                ]
            };

            logger.info(`🔍 Fetching trades for user ${userAddress}`);
            const logs = await this.transactionFetcher.fetchTransactionsBatched(startBlock, currentBlock, filter);
            
            // Process the logs
            const trades = await Promise.all(logs.map(async log => {
                const parsedLog = this.contract.interface.parseLog(log);
                const [user, timestamp, amount, blockNumber] = parsedLog.args;
                
                // Get additional transaction data
                const txReceipt = await this.provider.getTransactionReceipt(log.transactionHash);
                
                return {
                    timestamp: Number(timestamp),
                    amount: formatEther(amount),
                    blockNumber: blockNumber.toNumber(),
                    transactionHash: log.transactionHash,
                    gasPrice: txReceipt ? Number(txReceipt.gasPrice) : undefined,
                    precision: formatEther(amount).split('.')[1]?.length || 0
                };
            }));

            logger.info(`✅ Successfully fetched ${trades.length} trades for user ${userAddress}`);
            return trades;
        } catch (error) {
            logger.error(`❌ Error fetching user trades: ${error.message}`);
            throw error;
        }
    }
}

export default new BlockchainListener();
import { ethers } from 'ethers';
import mainnetBotDetector from './mainnet-bot-detector.js';
import logger from './utils/logger.js';
import config from './config/networkConfig.js';
import appConfig from './config/appConfig.js';
import pythHermesClient from './services/pythHermesClient.js';

// Initialize provider globally
const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, config.network);

async function monitorMainnetWithEtherscan() {
    try {
        // Start the Pyth price feed
        console.log('1️⃣ Starting Pyth Price Feed...');
        await pythHermesClient.startPriceStream();
        console.log('✅ Connected to Pyth Network price feeds\n');

        // Start the bot detection system
        console.log('2️⃣ Starting Mainnet Bot Detection System...');
        await mainnetBotDetector.start();
        console.log('✅ Bot detection system is running\n');

        // Wait for provider to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test provider connection
        const network = await provider.getNetwork();
        logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
        
        // Get current block
        let currentBlock = await provider.getBlockNumber();
        logger.info(`Starting from block: ${currentBlock}\n`);
        
        // Keep the script running
        process.on('SIGINT', () => {
            logger.info('\n🛑 Shutting down mainnet monitoring...');
            clearInterval(statusInterval);
            mainnetBotDetector.stop();
            if (typeof pythHermesClient.stopPriceStream === 'function') {
                pythHermesClient.stopPriceStream();
            }
            process.exit(0);
        });

        // Show system status periodically
        const statusInterval = setInterval(() => {
            const status = mainnetBotDetector.getStatus();
            // Get price IDs and fetch prices
            const btcPriceId = appConfig.priceIds['BTC/USD'];
            const ethPriceId = appConfig.priceIds['ETH/USD'];
            
            // Log what we're trying to get
            logger.info(`Looking up prices with IDs - BTC: ${btcPriceId}, ETH: ${ethPriceId}`);
            
            // Get latest prices and log them
            const latestBtcData = pythHermesClient.getLatestPrice(btcPriceId);
            const latestEthData = pythHermesClient.getLatestPrice(ethPriceId);
            
            logger.info('BTC Price data:', latestBtcData);
            logger.info('ETH Price data:', latestEthData);
            
            // Format prices with validation
            const formatPrice = (priceData) => {
                if (!priceData || typeof priceData.price !== 'number') return 'N/A';
                return `$${priceData.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            };
            
            const btcPriceDisplay = formatPrice(latestBtcData);
            const ethPriceDisplay = formatPrice(latestEthData);
            
            // Get timestamps for validation
            const now = Date.now();
            const btcAge = latestBtcData ? (now - latestBtcData.timestamp) / 1000 : Infinity;
            const ethAge = latestEthData ? (now - latestEthData.timestamp) / 1000 : Infinity;
            
            // Only show prices if they're less than 30 seconds old
            const MAX_AGE = 30; // seconds
            const btcPrice = btcAge < MAX_AGE ? btcPriceDisplay : 'N/A (stale)';
            const ethPrice = ethAge < MAX_AGE ? ethPriceDisplay : 'N/A (stale)';
            
            console.log('\n📈 System Status Update:');
            console.log(`   Running: ${status.isRunning}`);
            console.log(`   Detected Bots: ${status.detectedBots}`);
            console.log(`   Active Users: ${status.activeUsers}`);
            console.log(`   Latest BTC Price: ${btcPrice}`);
            console.log(`   Latest ETH Price: ${ethPrice}`);
            if (btcAge < Infinity || ethAge < Infinity) {
                console.log(`   Price Age: BTC ${btcAge.toFixed(1)}s, ETH ${ethAge.toFixed(1)}s`);
            }
            console.log(`   Current Block: ${currentBlock}`);
        }, 5000); // Update every 5 seconds

        // Continuous monitoring loop
        while (true) {
            try {
                const latestBlock = await provider.getBlockNumber();
                
                // Process any new blocks
                while (currentBlock <= latestBlock) {
                    logger.info(`\nChecking block ${currentBlock} of ${latestBlock}`);
                    await processBlock(currentBlock);
                    currentBlock++;
                }
                
                // Wait before checking for new blocks
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                logger.error('Error in monitoring loop:', error.message);
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
        }
    } catch (error) {
        logger.error('Error in transaction monitoring:', error.message);
        process.exit(1);
    }
}

async function processBlock(blockNumber) {
    try {
        const block = await provider.getBlock(blockNumber, true);
        
        if (!block) {
            logger.error(`Could not fetch block ${blockNumber}`);
            return;
        }
        
        logger.info(`\n${'★'.repeat(40)}`);
        logger.info(`Processing Block #${blockNumber}`);
        logger.info(`Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
        logger.info(`Total Transactions: ${block.transactions.length}`);
        logger.info(`${'★'.repeat(40)}\n`);
        
        for (let i = 0; i < block.transactions.length; i++) {
            const txHash = block.transactions[i];
            try {
                const tx = await provider.getTransaction(txHash);
                const receipt = await provider.getTransactionReceipt(tx.hash);
                
                if (!receipt) {
                    logger.info(`No receipt found for transaction ${tx.hash}`);
                    continue;
                }

                // Get latest price for analysis
                // Get price data for major trading pairs
                const btcPrice = pythHermesClient.getLatestPrice(appConfig.priceIds['BTC/USD']);
                const ethPrice = pythHermesClient.getLatestPrice(appConfig.priceIds['ETH/USD']);

                // Get the latest price publish time (in milliseconds)
                const btcPublishTime = btcPrice?.publishTime ? btcPrice.publishTime * 1000 : 0;
                const ethPublishTime = ethPrice?.publishTime ? ethPrice.publishTime * 1000 : 0;
                const pricePublishTime = Math.max(btcPublishTime, ethPublishTime);
                
                // Only calculate reaction time if we have valid price data
                const shouldMeasureReactionTime = pricePublishTime > 0 && 
                    (btcPrice?.price || ethPrice?.price) && 
                    pricePublishTime <= block.timestamp * 1000;
                
                // Prepare trade data for bot analysis
                const tradeData = {
                    user: tx.from,
                    amount: parseFloat(ethers.utils.formatEther(tx.value)),
                    btcPrice: btcPrice?.price || 0,
                    ethPrice: ethPrice?.price || 0,
                    blockNumber: blockNumber,
                    timestamp: block.timestamp * 1000,
                    transactionHash: tx.hash,
                    pricePublishTime: pricePublishTime,
                    blockTime: block.timestamp * 1000,
                    shouldMeasureReactionTime: shouldMeasureReactionTime,
                    // reactionTime will be calculated in analyzeTrade based on blockTime - pricePublishTime
                };

                // Analyze trade for bot behavior
                const result = await mainnetBotDetector.analyzeTrade(tradeData);
                let detectedBots = mainnetBotDetector.getDetectedBots();
                let badBots = detectedBots.filter(bot => bot.score >= mainnetBotDetector.BOT_DETECTION_THRESHOLD);
                let goodBots = detectedBots.filter(bot => bot.score >= 40 && bot.score < mainnetBotDetector.BOT_DETECTION_THRESHOLD);

                // Print transaction details
                logger.info('\n' + '='.repeat(80));
                logger.info(`TRANSACTION ${i + 1}/${block.transactions.length}`);
                logger.info('='.repeat(80));
                
                // Basic Information
                logger.info('\n📌 Basic Information:');
                logger.info(`Hash: ${tx.hash}`);
                logger.info(`From: ${tx.from}`);
                logger.info(`To: ${tx.to || 'Contract Creation'}`);
                logger.info(`Value: ${ethers.utils.formatEther(tx.value || '0')} ETH`);
                logger.info(`Nonce: ${tx.nonce}`);
                
                // Gas Information
                logger.info('\n⛽ Gas Information:');
                logger.info(`Gas Limit: ${tx.gasLimit.toString()}`);
                logger.info(`Gas Used: ${receipt.gasUsed.toString()} (${(receipt.gasUsed.mul(100).div(tx.gasLimit)).toString()}%)`);
                logger.info(`Gas Price: ${ethers.utils.formatUnits(tx.gasPrice, 'gwei')} Gwei`);
                logger.info(`Total Gas Cost: ${ethers.utils.formatEther(tx.gasPrice.mul(receipt.gasUsed))} ETH`);

                // Bot Detection Results
                logger.info('\n🤖 Bot Detection Results:');
                if (result.isBot) {
                    if (result.score >= mainnetBotDetector.BOT_DETECTION_THRESHOLD) {
                        logger.info(`🚨 BAD BOT DETECTED! Score: ${result.score}/100`);
                    } else {
                        logger.info(`🟢 GOOD BOT DETECTED! Score: ${result.score}/100`);
                    }
                } else {
                    logger.info(`✅ Human Trader`);
                    logger.info(`   Score: ${result.score}/100`);
                }

                // Display reaction time if available
                if (result.reactionTime !== null) {
                    logger.info(`   Reaction Time: ${result.reactionTime}ms`);
                } else {
                    logger.info(`   Reaction Time: N/A (price data unavailable)`);
                }

                // Display signals
                logger.info(`   Signals: ${result.signals.join(', ')}`);

                // Display average reaction time if available
                if (result.userStats?.avgReactionTime) {
                    logger.info(`   Average Reaction Time: ${result.userStats.avgReactionTime.toFixed(2)}ms`);
                }

                // Bot Detection Summary
                logger.info('\n📊 Bot Detection Summary:');
                logger.info(`   Total Bots Detected: ${detectedBots.length}`);
                logger.info(`   Bad Bots: ${badBots.length}`);
                if (badBots.length > 0) {
                    logger.info(`      Bad Bot Addresses: ${badBots.map(bot => bot.user).join(', ')}`);
                }
                logger.info(`   Good Bots: ${goodBots.length}`);
                if (goodBots.length > 0) {
                    logger.info(`      Good Bot Addresses: ${goodBots.map(bot => bot.user).join(', ')}`);
                }

                // Contract Interaction
                if (tx.data && tx.data !== '0x') {
                    logger.info('\n📜 Contract Interaction:');
                    logger.info(`Method ID: ${tx.data.substring(0, 10)}`);
                    logger.info(`Input Data: ${tx.data.length > 100 ? tx.data.substring(0, 100) + '...' : tx.data}`);
                }
                
                // Event Logs
                if (receipt.logs && receipt.logs.length > 0) {
                    logger.info('\n📝 Events:');
                    for (const log of receipt.logs) {
                        logger.info(`\nEvent from: ${log.address}`);
                        logger.info(`Topics:`);
                        log.topics.forEach((topic, index) => {
                            logger.info(`  ${index}: ${topic}`);
                        });
                        if (log.data !== '0x') {
                            logger.info(`Data: ${log.data.length > 100 ? log.data.substring(0, 100) + '...' : log.data}`);
                        }
                    }
                }
                
                logger.info('\n' + '='.repeat(80) + '\n');
                
                // Add small delay between transactions to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                logger.error(`Error processing transaction ${txHash}:`, error.message);
                continue;
            }
        }
        
        logger.info(`✅ Finished processing block ${blockNumber}\n`);
        
    } catch (error) {
        logger.error(`Error processing block ${blockNumber}:`, error.message);
    }
}

// Start the monitoring
monitorMainnetWithEtherscan().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
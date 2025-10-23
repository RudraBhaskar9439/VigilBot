import { ethers } from 'ethers';
import logger from '../src/utils/logger.js';
import config from '../src/config/networkConfig.js';

// Initialize provider globally
const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, config.network);

async function monitorEtherscanTransactions() {
    try {
        // Wait for provider to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test provider connection
        const network = await provider.getNetwork();
        logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
        
        // Get current block
        let currentBlock = await provider.getBlockNumber();
        logger.info(`Starting from block: ${currentBlock}`);
        
        // Keep the script running
        process.on('SIGINT', () => {
            logger.info('\nStopping monitoring...');
            process.exit(0);
        });

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
                logger.info(`Processing transaction ${i + 1}/${block.transactions.length}...`);
                
                const receipt = await provider.getTransactionReceipt(tx.hash);
                if (!receipt) {
                    logger.info(`No receipt found for transaction ${tx.hash}`);
                    continue;
                }
                
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
                
                // Transaction Status
                logger.info('\n📊 Status:');
                logger.info(`Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
                if (tx.type !== undefined) {
                    const txTypes = {
                        0: 'Legacy',
                        1: 'EIP-2930 (Access List)',
                        2: 'EIP-1559 (Fee Market)'
                    };
                    logger.info(`Type: ${txTypes[tx.type] || `Type ${tx.type}`}`);
                }
                
                // Contract Interaction
                if (tx.data && tx.data !== '0x') {
                    logger.info('\n📜 Contract Interaction:');
                    logger.info(`Method ID: ${tx.data.substring(0, 10)}`);
                    logger.info(`Input Data: ${tx.data.length > 100 ? 
                        tx.data.substring(0, 100) + '...' : 
                        tx.data}`);
                    
                    if (tx.to) {
                        try {
                            const code = await provider.getCode(tx.to);
                            if (code !== '0x') {
                                logger.info(`Contract Code Size: ${((code.length - 2) / 2)} bytes`);
                            }
                        } catch (error) {
                            logger.error(`Could not fetch contract code: ${error.message}`);
                        }
                    }
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
                            logger.info(`Data: ${log.data.length > 100 ? 
                                log.data.substring(0, 100) + '...' : 
                                log.data}`);
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
monitorEtherscanTransactions().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
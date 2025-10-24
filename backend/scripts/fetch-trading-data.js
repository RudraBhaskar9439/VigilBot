import blockchainListener from '../src/services/blockchainListener.js';
import logger from '../src/utils/logger.js';

async function fetchTradingData() {
    try {
        // Use the blockchain listener singleton
        
        // Wait for the provider to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the current block number
        const currentBlock = await blockchainListener.provider.getBlockNumber();
        logger.info(`Current block number: ${currentBlock}`);
        
        // Fetch trades from the last 1000 blocks as an example
        const startBlock = currentBlock - 1000;
        logger.info(`Fetching trades from block ${startBlock} to ${currentBlock}`);
        
        const trades = await blockchainListener.getHistoricalTrades(startBlock, currentBlock);
        
        // Log the results
        logger.info(`Found ${trades.length} trades in total`);
        
        if (trades.length > 0) {
            logger.info('\nSample trade data:');
            logger.info(JSON.stringify(trades[0], null, 2));
            
            // Get all unique traders
            const uniqueTraders = [...new Set(trades.map(trade => trade.user))];
            logger.info(`\nUnique traders found: ${uniqueTraders.length}`);
            
            // For each unique trader, get their detailed trading history
            for (const trader of uniqueTraders) {
                const userTrades = await blockchainListener.getUserTrades(trader);
                logger.info(`\nTrader ${trader}:`);
                logger.info(`- Total trades: ${userTrades.length}`);
                logger.info(`- Total volume: ${userTrades.reduce((sum, trade) => sum + parseFloat(trade.amount), 0)} ETH`);
                logger.info(`- First trade: Block #${userTrades[0].blockNumber}`);
                logger.info(`- Latest trade: Block #${userTrades[userTrades.length - 1].blockNumber}`);
            }
        }
        
    } catch (error) {
        logger.error('Error fetching trading data:', error);
    }
}

// Run the fetch
fetchTradingData().then(() => {
    logger.info('Finished fetching trading data');
}).catch(error => {
    logger.error('Fatal error:', error);
});
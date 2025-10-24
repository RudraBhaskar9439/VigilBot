import { ethers } from 'ethers';
import config from '../config/appConfig.js';
import logger from '../utils/logger.js';

export default class BatchedTransactionFetcher {
    constructor(provider) {
        this.provider = provider;
        this.BATCH_SIZE = 2000; // Ethereum nodes typically limit to 2000-5000 blocks per query
        this.MAX_CONCURRENT_REQUESTS = 3;
    }

    async fetchTransactionsBatched(startBlock, endBlock, filterOptions = {}) {
        try {
            // Validate blocks
            startBlock = Math.max(0, parseInt(startBlock));
            endBlock = parseInt(endBlock);
            
            if (startBlock > endBlock) {
                throw new Error('Start block must be less than or equal to end block');
            }

            // Calculate batches
            const totalBlocks = endBlock - startBlock + 1;
            const batchCount = Math.ceil(totalBlocks / this.BATCH_SIZE);
            const batches = [];

            for (let i = 0; i < batchCount; i++) {
                const batchStart = startBlock + (i * this.BATCH_SIZE);
                const batchEnd = Math.min(endBlock, batchStart + this.BATCH_SIZE - 1);
                batches.push({ start: batchStart, end: batchEnd });
            }

            // Process batches with concurrency control
            const results = [];
            for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_REQUESTS) {
                const batchPromises = batches
                    .slice(i, i + this.MAX_CONCURRENT_REQUESTS)
                    .map(batch => this.fetchBatch(batch.start, batch.end, filterOptions));

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults.flat());

                // Add delay between batch groups to prevent rate limiting
                if (i + this.MAX_CONCURRENT_REQUESTS < batches.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            return results;
        } catch (error) {
            logger.error(`Error in batched transaction fetch: ${error.message}`);
            throw error;
        }
    }

    async fetchBatch(startBlock, endBlock, filterOptions) {
        try {
            const filter = {
                ...filterOptions,
                fromBlock: startBlock,
                toBlock: endBlock
            };

            const logs = await this.provider.getLogs(filter);
            logger.info(`✅ Fetched ${logs.length} logs for blocks ${startBlock}-${endBlock}`);
            return logs;
        } catch (error) {
            logger.error(`Failed to fetch batch ${startBlock}-${endBlock}: ${error.message}`);
            // Retry with smaller batch if we hit node limits
            if (startBlock !== endBlock) {
                const midBlock = Math.floor((startBlock + endBlock) / 2);
                const [firstHalf, secondHalf] = await Promise.all([
                    this.fetchBatch(startBlock, midBlock, filterOptions),
                    this.fetchBatch(midBlock + 1, endBlock, filterOptions)
                ]);
                return [...firstHalf, ...secondHalf];
            }
            throw error;
        }
    }

    async getLatestBlockNumber() {
        return await this.provider.getBlockNumber();
    }
}
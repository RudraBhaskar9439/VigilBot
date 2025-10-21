import { ethers } from 'ethers';
import axios from 'axios';
import config from '../config/config.js';
import logger from '../utils/logger.js';

class ContractInteractor {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        
        if (config.privateKey) {
            this.wallet = new ethers.Wallet(config.privateKey, this.provider);
            this.contract = new ethers.Contract(
                config.contractAddress,
                config.contractABI,
                this.wallet
            );
            logger.info('✅ Contract interactor initialized with write access');
        } else {
            this.contract = new ethers.Contract(
                config.contractAddress,
                config.contractABI,
                this.provider
            );
            logger.warn('⚠️  Read-only mode - no private key provided');
        }
    }
    
    /**
     * Get Pyth price update data for on-chain submission
     */
    async getPythPriceUpdateData(priceIds) {
        try {
            const idsParam = priceIds.map(id => `ids[]=${id}`).join('&');
            const url = `${config.hermesUrl}/api/latest_vaas?${idsParam}`;
            
            const response = await axios.get(url);
            
            if (response.data && response.data.length > 0) {
                // Return the price update data (VAA - Verifiable Action Approval)
                return response.data.map(vaa => '0x' + vaa);
            }
            
            throw new Error('No price update data received');
        } catch (error) {
            logger.error(`Error getting Pyth price update data: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Flag bots WITH Pyth price proof (demonstrates Pyth integration)
     * This pushes price to blockchain - costs gas but shows integration!
     */
    async flagBotsWithPythProof(users, scores, reasons) {
        if (!this.wallet) {
            throw new Error('Cannot flag bots: No private key configured');
        }
        
        try {
            logger.info(`🔨 Flagging ${users.length} bots WITH Pyth price proof...`);
            logger.info('📡 This demonstrates on-chain Pyth integration!');
            
            // Get Pyth price update data
            const priceIds = [config.priceIds['BTC/USD']];
            const priceUpdateData = await this.getPythPriceUpdateData(priceIds);
            
            logger.info('✅ Got Pyth price update data');
            
            // Get the fee required by Pyth
            const updateFee = await this.contract.pyth.getUpdateFee(priceUpdateData);
            logger.info(`💰 Pyth update fee: ${ethers.formatEther(updateFee)} ETH`);
            
            // Send transaction with Pyth proof
            const tx = await this.contract.flagBotsWithPythProof(
                users,
                scores,
                reasons,
                priceUpdateData,
                config.priceIds['BTC/USD'],
                {
                    value: updateFee, // Pay Pyth fee
                    gasLimit: 1000000 // Increase gas limit for Pyth update
                }
            );
            
            logger.info(`📤 Transaction sent: ${tx.hash}`);
            logger.info('⏳ Waiting for confirmation...');
            
            const receipt = await tx.wait();
            
            logger.info(`✅ Bots flagged with Pyth proof!`);
            logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);
            logger.info(`   Block: ${receipt.blockNumber}`);
            logger.info(`   🎯 HACKATHON REQUIREMENT MET: Pyth price pushed on-chain!`);
            
            return { success: true, txHash: tx.hash, receipt };
        } catch (error) {
            logger.error(`❌ Error flagging bots with Pyth proof: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Regular flag function (no Pyth proof - cheaper for normal use)
     */
    async flagBots(users, scores, reasons) {
        if (!this.wallet) {
            throw new Error('Cannot flag bots: No private key configured');
        }
        
        try {
            logger.info(`🔨 Flagging ${users.length} bots (without Pyth proof - cheaper)...`);
            
            const tx = await this.contract.flagBots(users, scores, reasons, {
                gasLimit: 500000
            });
            
            logger.info(`📤 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            
            logger.info(`✅ Bots flagged! Gas used: ${receipt.gasUsed.toString()}`);
            
            return { success: true, txHash: tx.hash, receipt };
        } catch (error) {
            logger.error(`❌ Error flagging bots: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

export default new ContractInteractor();
import { WebSocketProvider, JsonRpcProvider, Wallet, Contract, formatEther, parseEther } from "ethers";
import axios from 'axios';
import config from '../config/config.js';
import logger from '../utils/logger.js';

class ContractInteractor {
    constructor() {
        this.provider = config.rpcUrl.startsWith('wss://')
            ? new WebSocketProvider(config.rpcUrl)
            : new JsonRpcProvider(config.rpcUrl);
        
        if (config.privateKey && config.privateKey !== 'your_private_key_here' && config.privateKey.length >= 64) {
            this.wallet = new Wallet(config.privateKey, this.provider);
            this.contract = new Contract(
                config.contractAddress,
                config.contractABI,
                this.wallet
            );
            logger.info('✅ Contract interactor initialized with write access');
        } else {
            this.contract = new Contract(
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
                return response.data.map(vaa => '0x' + vaa);
            }
            
            throw new Error('No price update data received');
        } catch (error) {
            logger.error(`Error getting Pyth price update data: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Flag GOOD BOTS with Pyth price proof
     * Good bots are legitimate automated traders (scores 40-59)
     */
    async flagGoodBotsWithPythProof(goodBots) {
        if (!this.wallet) {
            throw new Error('Cannot flag bots: No private key configured');
        }
        
        if (goodBots.length === 0) {
            logger.info('No good bots to flag');
            return { success: true, count: 0 };
        }
        
        try {
            logger.info(`🟢 Flagging ${goodBots.length} GOOD BOTS with Pyth proof...`);
            logger.info('   Category: Legitimate Automated Trading');
            
            const users = goodBots.map(bot => bot.user);
            const scores = goodBots.map(bot => bot.score);
            const botTypes = goodBots.map(bot => bot.botType || 'Market Maker');
            const liquidityAmounts = goodBots.map(bot => 
                parseEther((bot.liquidityProvided || 0).toString())
            );
            const reasons = goodBots.map(bot => 
                `GOOD_BOT: ${bot.signals.slice(0, 3).join('; ')}`
            );
            
            // Get Pyth price update data
            const priceIds = [config.priceIds['BTC/USD']];
            const priceUpdateData = await this.getPythPriceUpdateData(priceIds);
            
            logger.info('✅ Got Pyth price update data for good bots');
            
            const updateFee = await this.pythContract.getUpdateFee(priceUpdateData);
            logger.info(`💰 Pyth update fee: ${formatEther(updateFee)} ETH`);
            
            const tx = await this.contract.flagGoodBotsWithPythProof(
                users,
                scores,
                botTypes,
                liquidityAmounts,
                reasons,
                priceUpdateData,
                config.priceIds['BTC/USD'],
                {
                    value: updateFee,
                    gasLimit: 1000000
                }
            );
            
            logger.info(`📤 Transaction sent for GOOD BOTS: ${tx.hash}`);
            logger.info('⏳ Waiting for confirmation...');
            
            const receipt = await tx.wait();
            
            logger.info(`✅ Good bots flagged with Pyth proof!`);
            logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);
            logger.info(`   Block: ${receipt.blockNumber}`);
            logger.info(`   Category: LEGITIMATE AUTOMATED TRADING`);
            
            return { 
                success: true, 
                txHash: tx.hash, 
                receipt,
                category: 'GOOD_BOT',
                count: goodBots.length
            };
        } catch (error) {
            logger.error(`❌ Error flagging good bots: ${error.message}`);
            return { success: false, error: error.message, category: 'GOOD_BOT' };
        }
    }
    
    /**
     * Flag BAD BOTS with Pyth price proof
     * Bad bots are malicious/abusive traders (scores >= 60)
     */
    async flagBadBotsWithPythProof(badBots) {
        if (!this.wallet) {
            throw new Error('Cannot flag bots: No private key configured');
        }
        
        if (badBots.length === 0) {
            logger.info('No bad bots to flag');
            return { success: true, count: 0 };
        }
        
        try {
            logger.info(`🔴 Flagging ${badBots.length} BAD BOTS with Pyth proof...`);
            logger.info('   Category: Malicious/Abusive Trading');
            
            const users = badBots.map(bot => bot.user);
            const scores = badBots.map(bot => bot.score);
            const riskLevels = badBots.map(bot => bot.riskLevel || 'MEDIUM');
            const reasons = badBots.map(bot => 
                `BAD_BOT: ${bot.signals.slice(0, 3).join('; ')}`
            );
            
            // Get Pyth price update data
            const priceIds = [config.priceIds['BTC/USD']];
            const priceUpdateData = await this.getPythPriceUpdateData(priceIds);
            
            logger.info('✅ Got Pyth price update data for bad bots');
            
            const updateFee = await this.contract.pyth.getUpdateFee(priceUpdateData);
            logger.info(`💰 Pyth update fee: ${formatEther(updateFee)} ETH`);
            
            const tx = await this.contract.flagBadBotsWithPythProof(
                users,
                scores,
                riskLevels,
                reasons,
                priceUpdateData,
                config.priceIds['BTC/USD'],
                {
                    value: updateFee,
                    gasLimit: 1000000
                }
            );
            
            logger.info(`📤 Transaction sent for BAD BOTS: ${tx.hash}`);
            logger.info('⏳ Waiting for confirmation...');
            
            const receipt = await tx.wait();
            
            logger.info(`✅ Bad bots flagged with Pyth proof!`);
            logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);
            logger.info(`   Block: ${receipt.blockNumber}`);
            logger.info(`   Category: MALICIOUS/ABUSIVE TRADING`);
            logger.info(`   🚨 HIGH RISK - ACTION REQUIRED`);
            
            return { 
                success: true, 
                txHash: tx.hash, 
                receipt,
                category: 'BAD_BOT',
                count: badBots.length
            };
        } catch (error) {
            logger.error(`❌ Error flagging bad bots: ${error.message}`);
            return { success: false, error: error.message, category: 'BAD_BOT' };
        }
    }
    
    /**
     * Flag both good and bad bots separately with Pyth proof
     */
    async flagAllBotsWithPythProof(goodBots, badBots) {
        logger.info('🎯 Starting separate bot flagging process...');
        
        const results = {
            goodBots: null,
            badBots: null,
            summary: {
                totalGoodBots: goodBots.length,
                totalBadBots: badBots.length,
                successfulFlags: 0,
                failedFlags: 0
            }
        };
        
        // Flag good bots first
        if (goodBots.length > 0) {
            logger.info(`\n${'='.repeat(60)}`);
            logger.info('PHASE 1: Flagging GOOD BOTS (Legitimate Automated Trading)');
            logger.info(`${'='.repeat(60)}\n`);
            
            results.goodBots = await this.flagGoodBotsWithPythProof(goodBots);
            if (results.goodBots.success) {
                results.summary.successfulFlags += goodBots.length;
            } else {
                results.summary.failedFlags += goodBots.length;
            }
        }
        
        // Flag bad bots second
        if (badBots.length > 0) {
            logger.info(`\n${'='.repeat(60)}`);
            logger.info('PHASE 2: Flagging BAD BOTS (Malicious/Abusive Trading)');
            logger.info(`${'='.repeat(60)}\n`);
            
            results.badBots = await this.flagBadBotsWithPythProof(badBots);
            if (results.badBots.success) {
                results.summary.successfulFlags += badBots.length;
            } else {
                results.summary.failedFlags += badBots.length;
            }
        }
        
        // Summary
        logger.info(`\n${'='.repeat(60)}`);
        logger.info('BOT FLAGGING SUMMARY');
        logger.info(`${'='.repeat(60)}`);
        logger.info(`✅ Good Bots Flagged: ${goodBots.length}`);
        logger.info(`🚨 Bad Bots Flagged: ${badBots.length}`);
        logger.info(`📊 Total Flagged: ${results.summary.successfulFlags}`);
        logger.info(`❌ Failed: ${results.summary.failedFlags}`);
        logger.info(`${'='.repeat(60)}\n`);
        
        return results;
    }
    
    /**
     * Regular flag function for good bots (no Pyth proof - cheaper)
     */
    async flagGoodBots(goodBots) {
        if (!this.wallet) {
            throw new Error('Cannot flag bots: No private key configured');
        }
        
        if (goodBots.length === 0) {
            return { success: true, count: 0 };
        }
        
        try {
            logger.info(`🟢 Flagging ${goodBots.length} GOOD BOTS (cheaper method)...`);
            
            const users = goodBots.map(bot => bot.user);
            const scores = goodBots.map(bot => bot.score);
            const botTypes = goodBots.map(bot => bot.botType || 'Market Maker');
            const liquidityAmounts = goodBots.map(bot => 
                parseEther((bot.liquidityProvided || 0).toString())
            );
            
            const tx = await this.contract.flagGoodBots(
                users, 
                scores, 
                botTypes, 
                liquidityAmounts,
                {
                    gasLimit: 500000
                }
            );
            
            logger.info(`📤 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            
            logger.info(`✅ Good bots flagged! Gas used: ${receipt.gasUsed.toString()}`);
            
            return { success: true, txHash: tx.hash, receipt, count: goodBots.length };
        } catch (error) {
            logger.error(`❌ Error flagging good bots: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Regular flag function for bad bots (no Pyth proof - cheaper)
     */
    async flagBadBots(badBots) {
        if (!this.wallet) {
            throw new Error('Cannot flag bots: No private key configured');
        }
        
        if (badBots.length === 0) {
            return { success: true, count: 0 };
        }
        
        try {
            logger.info(`🔴 Flagging ${badBots.length} BAD BOTS (cheaper method)...`);
            
            const users = badBots.map(bot => bot.user);
            const scores = badBots.map(bot => bot.score);
            const riskLevels = badBots.map(bot => bot.riskLevel || 'MEDIUM');
            
            const tx = await this.contract.flagBadBots(
                users, 
                scores, 
                riskLevels,
                {
                    gasLimit: 500000
                }
            );
            
            logger.info(`📤 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            
            logger.info(`✅ Bad bots flagged! Gas used: ${receipt.gasUsed.toString()}`);
            
            return { success: true, txHash: tx.hash, receipt, count: badBots.length };
        } catch (error) {
            logger.error(`❌ Error flagging bad bots: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

export default new ContractInteractor();
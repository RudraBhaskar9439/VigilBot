import * as ethers from 'ethers';
import axios from 'axios';
import appConfig from '../config/appConfig.js';
import logger from '../utils/logger.js';

class ContractInteractor {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(appConfig.rpcUrl);
        
        if (appConfig.privateKey && appConfig.privateKey !== 'your_private_key_here' && appConfig.privateKey.length >= 64) {
            this.wallet = new ethers.Wallet(appConfig.privateKey, this.provider);
            this.contract = new ethers.Contract(
                appConfig.contractAddress,
                appConfig.contractABI,
                this.wallet
            );
            logger.info('✅ Contract interactor initialized with write access');
        } else {
            this.contract = new ethers.Contract(
                appConfig.contractAddress,
                appConfig.contractABI,
                this.provider
            );
            logger.warn('⚠️  Read-only mode - no private key provided');
        }
    }
    
    async getPythPriceUpdateData(priceIds) {
        try {
            const idsParam = priceIds.map(id => `ids[]=${id}`).join('&');
            const url = `${appConfig.hermesUrl}/api/latest_vaas?${idsParam}`;
            
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
                ethers.parseEther((bot.liquidityProvided || 0).toString())
            );
            const reasons = goodBots.map(bot => 
                `GOOD_BOT: ${bot.signals.slice(0, 3).join('; ')}`
            );
            
            const priceIds = [appConfig.priceIds['BTC/USD']];
            const priceUpdateData = await this.getPythPriceUpdateData(priceIds);
            
            logger.info('✅ Got Pyth price update data for good bots');
            
            const updateFee = await this.contract.getUpdateFee(priceUpdateData);
            logger.info(`💰 Pyth update fee: ${ethers.utils.formatEther(updateFee)} ETH`);
            
            const tx = await this.contract.flagGoodBotsWithPythProof(
                users,
                scores,
                botTypes,
                liquidityAmounts,
                reasons,
                priceUpdateData,
                appConfig.priceIds['BTC/USD'],
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
            
            const priceIds = [appConfig.priceIds['BTC/USD']];
            const priceUpdateData = await this.getPythPriceUpdateData(priceIds);
            
            logger.info('✅ Got Pyth price update data for bad bots');
            
            const updateFee = await this.contract.getUpdateFee(priceUpdateData);
            logger.info(`💰 Pyth update fee: ${ethers.utils.formatEther(updateFee)} ETH`);
            
            const tx = await this.contract.flagBadBotsWithPythProof(
                users,
                scores,
                riskLevels,
                reasons,
                priceUpdateData,
                appConfig.priceIds['BTC/USD'],
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
}

export default new ContractInteractor();

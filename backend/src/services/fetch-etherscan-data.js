import axios from 'axios';
import dotenv from 'dotenv';
import pkg from 'ethers';
const { ethers } = pkg;
dotenv.config();
import fs from 'fs';
import botDetector from './botDetector.js';
import logger from '../utils/logger.js';

dotenv.config();

// Your contract address from contract.json
const CONTRACT_ADDRESS = '0x2cC7fD19b0953a1C8E5eea66AbAB89977A4619e2';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'YourEtherscanAPIKey';
const ETHERSCAN_API_URL = 'https://api-sepolia.etherscan.io/api'; // Use sepolia for testnet

class EtherscanAnalyzer {
    constructor() {
        this.contractAddress = CONTRACT_ADDRESS;
        this.apiKey = ETHERSCAN_API_KEY;
        this.baseUrl = ETHERSCAN_API_URL;
        // RPC provider fallback (use Sepolia RPC from .env)
        const sepoliaRpc = process.env.SEPOLIA_RPC_URL || process.env.MAINNET_RPC_URL;
        this.provider = new ethers.providers.JsonRpcProvider(sepoliaRpc);
    }

    /**
     * Fetch all transactions for the contract
     */
    async fetchTransactions(startBlock = 0, endBlock = 99999999) {
        try {
            console.log(`\n📡 Fetching transactions for contract: ${this.contractAddress}`);
            console.log(`   From block: ${startBlock} to ${endBlock}\n`);

            const url = `${this.baseUrl}?module=account&action=txlist&address=${this.contractAddress}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${this.apiKey}`;
            
            const response = await axios.get(url);
            
            if (response.data && response.data.status === '1') {
                console.log(`✅ Found ${response.data.result.length} transactions`);
                return response.data.result;
            } else {
                console.log(`⚠️ No transactions found or API error: ${response.data?.message || 'no message'} - logging raw response for debug`);
                console.log(JSON.stringify(response.data, null, 2));
                return [];
            }
        } catch (error) {
            console.error(`❌ Error fetching transactions: ${error.message}`);
            return [];
        }
    }

    /**
     * Fetch internal transactions (contract calls)
     */
    async fetchInternalTransactions(startBlock = 0, endBlock = 99999999) {
        try {
            console.log(`\n📡 Fetching internal transactions...`);

            const url = `${this.baseUrl}?module=account&action=txlistinternal&address=${this.contractAddress}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${this.apiKey}`;
            
            const response = await axios.get(url);
            
            if (response.data.status === '1') {
                console.log(`✅ Found ${response.data.result.length} internal transactions`);
                return response.data.result;
            } else {
                return [];
            }
        } catch (error) {
            console.error(`❌ Error fetching internal transactions: ${error.message}`);
            return [];
        }
    }

    /**
     * Fetch contract events (TradeExecuted, GoodBotFlagged, BadBotFlagged)
     */
    async fetchContractEvents(eventSignature, startBlock = 0, endBlock = 99999999) {
        try {
            console.log(`\n📡 Fetching contract events: ${eventSignature}`);

            const url = `${this.baseUrl}?module=logs&action=getLogs&address=${this.contractAddress}&fromBlock=${startBlock}&toBlock=${endBlock}&topic0=${eventSignature}&apikey=${this.apiKey}`;
            
            const response = await axios.get(url);
            
            if (response.data && response.data.status === '1') {
                console.log(`✅ Found ${response.data.result.length} events (via Etherscan)`);
                return response.data.result;
            } else {
                // Etherscan V1 deprecated or no results — fallback to provider.getLogs
                console.log(`⚠️ Etherscan returned no results or error (${response.data?.message || 'no message'}). Falling back to RPC provider.getLogs()`);
                try {
                    const filter = {
                        address: this.contractAddress,
                        fromBlock: startBlock,
                        toBlock: endBlock,
                        topics: [eventSignature]
                    };
                    const logs = await this.provider.getLogs(filter);
                    console.log(`✅ Found ${logs.length} events (via RPC getLogs)`);
                    return logs.map(l => ({ ...l }));
                } catch (rpcErr) {
                    console.error(`❌ RPC getLogs failed: ${rpcErr.message}`);
                    return [];
                }
            }
        } catch (error) {
            console.error(`❌ Error fetching events: ${error.message}`);
            return [];
        }
    }

    /**
     * Parse TradeExecuted events
     */
    parseTradeExecutedEvents(logs) {
        const trades = [];
        
        // TradeExecuted event signature
        const iface = new ethers.Interface([
            'event TradeExecuted(address indexed user, uint256 timestamp, uint256 amount, uint256 blockNumber, int64 btcPrice)'
        ]);

        for (const log of logs) {
            try {
                const parsed = iface.parseLog({
                    topics: log.topics,
                    data: log.data
                });

                trades.push({
                    user: parsed.args.user,
                    timestamp: Number(parsed.args.timestamp),
                    amount: ethers.formatEther(parsed.args.amount),
                    blockNumber: Number(parsed.args.blockNumber),
                    btcPrice: parsed.args.btcPrice ? Number(parsed.args.btcPrice) : null,
                    transactionHash: log.transactionHash,
                    blockNumberActual: Number(log.blockNumber)
                });
            } catch (error) {
                console.error(`Error parsing log: ${error.message}`);
            }
        }

        return trades;
    }

    /**
     * Analyze trading patterns from transactions
     */
    analyzeTransactions(transactions) {
        const userActivity = new Map();
        
        for (const tx of transactions) {
            const user = tx.from;
            
            if (!userActivity.has(user)) {
                userActivity.set(user, {
                    address: user,
                    totalTrades: 0,
                    totalGasUsed: 0,
                    trades: [],
                    avgTimeBetweenTrades: 0,
                    firstTrade: null,
                    lastTrade: null
                });
            }

            const userData = userActivity.get(user);
            userData.totalTrades++;
            userData.totalGasUsed += parseInt(tx.gasUsed || 0);
            userData.trades.push({
                hash: tx.hash,
                timestamp: parseInt(tx.timeStamp),
                blockNumber: parseInt(tx.blockNumber),
                gasUsed: parseInt(tx.gasUsed || 0),
                gasPrice: tx.gasPrice
            });

            if (!userData.firstTrade) {
                userData.firstTrade = parseInt(tx.timeStamp);
            }
            userData.lastTrade = parseInt(tx.timeStamp);
        }

        // Calculate trading patterns
        for (const [user, data] of userActivity) {
            if (data.trades.length > 1) {
                const intervals = [];
                for (let i = 1; i < data.trades.length; i++) {
                    intervals.push(data.trades[i].timestamp - data.trades[i - 1].timestamp);
                }
                data.avgTimeBetweenTrades = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            }
        }

        return userActivity;
    }

    /**
     * Detect bots from trading patterns
     */
    async detectBotsFromData(userActivity) {
        console.log(`\n🔍 Analyzing ${userActivity.size} unique traders for bot behavior...\n`);

        const detectedBots = {
            goodBots: [],
            badBots: [],
            humans: []
        };

        for (const [address, data] of userActivity) {
            // Calculate bot indicators
            const tradingFrequency = data.totalTrades / ((data.lastTrade - data.firstTrade) / 3600 || 1);
            const avgGasPrice = data.totalGasUsed / data.totalTrades;
            const consistentTiming = data.avgTimeBetweenTrades < 300; // Less than 5 minutes

            let botScore = 0;
            const signals = [];

            // High frequency trading
            if (tradingFrequency > 10) {
                botScore += 35;
                signals.push(`High frequency: ${tradingFrequency.toFixed(1)} trades/hour`);
            } else if (tradingFrequency > 5) {
                botScore += 20;
                signals.push(`Elevated frequency: ${tradingFrequency.toFixed(1)} trades/hour`);
            }

            // Consistent timing pattern
            if (consistentTiming && data.totalTrades > 5) {
                botScore += 25;
                signals.push(`Consistent timing: ${(data.avgTimeBetweenTrades / 60).toFixed(1)} min avg`);
            }

            // High trade count
            if (data.totalTrades > 50) {
                botScore += 20;
                signals.push(`High volume: ${data.totalTrades} trades`);
            } else if (data.totalTrades > 20) {
                botScore += 10;
                signals.push(`Elevated volume: ${data.totalTrades} trades`);
            }

            // Classify
            const totalVolume = data.totalTrades * 100; // Rough estimate
            const isLiquidityProvider = totalVolume >= 1000 && tradingFrequency > 5;

            if (botScore >= 60) {
                if (isLiquidityProvider) {
                    detectedBots.goodBots.push({
                        address,
                        score: Math.min(botScore, 59),
                        signals,
                        category: 'GOOD_BOT',
                        botType: 'Market Maker',
                        data
                    });
                } else {
                    detectedBots.badBots.push({
                        address,
                        score: botScore,
                        signals,
                        category: 'BAD_BOT',
                        riskLevel: botScore >= 80 ? 'CRITICAL' : botScore >= 70 ? 'HIGH' : 'MEDIUM',
                        data
                    });
                }
            } else if (botScore >= 40) {
                detectedBots.goodBots.push({
                    address,
                    score: botScore,
                    signals,
                    category: 'GOOD_BOT',
                    botType: 'Automated Trader',
                    data
                });
            } else {
                detectedBots.humans.push({
                    address,
                    score: botScore,
                    category: 'HUMAN',
                    data
                });
            }
        }

        return detectedBots;
    }

    /**
     * Generate analysis report
     */
    generateReport(detectedBots, transactions) {
        console.log('\n' + '═'.repeat(70));
        console.log('📊 BOT DETECTION ANALYSIS REPORT');
        console.log('═'.repeat(70));
        console.log(`\n📈 Overall Statistics:`);
        console.log(`   Total Transactions: ${transactions.length}`);
        console.log(`   🟢 Good Bots: ${detectedBots.goodBots.length}`);
        console.log(`   🔴 Bad Bots: ${detectedBots.badBots.length}`);
        console.log(`   👤 Human Traders: ${detectedBots.humans.length}`);

        if (detectedBots.goodBots.length > 0) {
            console.log(`\n🟢 GOOD BOTS DETECTED:`);
            console.log('─'.repeat(70));
            detectedBots.goodBots.forEach((bot, idx) => {
                console.log(`\n${idx + 1}. Address: ${bot.address}`);
                console.log(`   Score: ${bot.score}/100`);
                console.log(`   Type: ${bot.botType}`);
                console.log(`   Total Trades: ${bot.data.totalTrades}`);
                console.log(`   Signals: ${bot.signals.join(', ')}`);
            });
        }

        if (detectedBots.badBots.length > 0) {
            console.log(`\n🔴 BAD BOTS DETECTED:`);
            console.log('─'.repeat(70));
            detectedBots.badBots.forEach((bot, idx) => {
                console.log(`\n${idx + 1}. Address: ${bot.address}`);
                console.log(`   Score: ${bot.score}/100`);
                console.log(`   Risk Level: ${bot.riskLevel}`);
                console.log(`   Total Trades: ${bot.data.totalTrades}`);
                console.log(`   Signals: ${bot.signals.join(', ')}`);
            });
        }

        console.log('\n' + '═'.repeat(70));

        // Save to file
        const report = {
            timestamp: new Date().toISOString(),
            contractAddress: this.contractAddress,
            totalTransactions: transactions.length,
            summary: {
                goodBots: detectedBots.goodBots.length,
                badBots: detectedBots.badBots.length,
                humans: detectedBots.humans.length
            },
            detectedBots
        };

        fs.writeFileSync('bot-analysis-report.json', JSON.stringify(report, null, 2));
        console.log('\n✅ Report saved to: bot-analysis-report.json\n');

        return report;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Etherscan Transaction Analysis');
    console.log('═'.repeat(70));

    const analyzer = new EtherscanAnalyzer();

    // Step 1: Fetch all transactions
    const transactions = await analyzer.fetchTransactions();

    if (transactions.length === 0) {
        console.log('\n⚠️ No transactions found. Make sure:');
        console.log('   1. Your contract has been deployed');
        console.log('   2. There have been transactions to your contract');
        console.log('   3. Your Etherscan API key is correct');
        console.log('   4. You\'re using the correct network (sepolia/mainnet)');
        return;
    }

    // Step 2: Fetch TradeExecuted events
    const tradeEventSignature = ethers.id('TradeExecuted(address,uint256,uint256,uint256,int64)');
    const tradeLogs = await analyzer.fetchContractEvents(tradeEventSignature);
    const trades = analyzer.parseTradeExecutedEvents(tradeLogs);

    console.log(`\n✅ Found ${trades.length} TradeExecuted events`);

    // Step 3: Analyze user activity
    const userActivity = analyzer.analyzeTransactions(transactions);

    // Step 4: Detect bots
    const detectedBots = await analyzer.detectBotsFromData(userActivity);

    // Step 5: Generate report
    const report = analyzer.generateReport(detectedBots, transactions);

    // Step 6: Show actionable insights
    console.log('💡 ACTIONABLE INSIGHTS:');
    console.log('─'.repeat(70));
    
    if (detectedBots.goodBots.length > 0) {
        console.log(`✅ ${detectedBots.goodBots.length} good bots are providing liquidity`);
        console.log('   → These bots should be allowed to continue trading');
    }
    
    if (detectedBots.badBots.length > 0) {
        console.log(`⚠️  ${detectedBots.badBots.length} bad bots detected`);
        console.log('   → Consider flagging these addresses on-chain');
        console.log(`   → Use: node scripts/flag-bots.js`);
    }

    console.log('\n🎯 Next Steps:');
    console.log('   1. Review bot-analysis-report.json');
    console.log('   2. Flag bad bots on-chain if needed');
    console.log('   3. Monitor good bots for liquidity provision');
    console.log('   4. Set up automated monitoring');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default EtherscanAnalyzer;
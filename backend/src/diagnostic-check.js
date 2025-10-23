import { ethers } from 'ethers';
import config from './config/appConfig.js';
import pythHermesClient from './services/pythHermesClient.js';

console.log('🔍 SYSTEM DIAGNOSTIC CHECK');
console.log('='.repeat(60));
console.log('\n');

async function runDiagnostics() {
    const results = {
        config: false,
        provider: false,
        contract: false,
        pyth: false,
        events: false
    };

    // 1. Check Configuration
    console.log('1️⃣ Checking Configuration...');
    try {
        console.log(`   ✓ RPC URL: ${config.rpcUrl ? '✅ Set' : '❌ Missing'}`);
        console.log(`   ✓ Chain ID: ${config.chainId || 'N/A'}`);
        console.log(`   ✓ Contract Address: ${config.contractAddress || '❌ Missing'}`);
        console.log(`   ✓ Private Key: ${config.privateKey && config.privateKey.length > 60 ? '✅ Set' : '⚠️  Not set (Read-only mode)'}`);
        console.log(`   ✓ Hermes URL: ${config.hermesUrl || '❌ Missing'}`);
        console.log(`   ✓ BTC Price ID: ${config.priceIds['BTC/USD'] ? '✅ Set' : '❌ Missing'}`);
        console.log(`   ✓ ETH Price ID: ${config.priceIds['ETH/USD'] ? '✅ Set' : '❌ Missing'}`);
        
        if (config.rpcUrl && config.contractAddress && config.hermesUrl) {
            results.config = true;
            console.log('   ✅ Configuration is valid\n');
        } else {
            console.log('   ❌ Configuration is incomplete\n');
            return results;
        }
    } catch (error) {
        console.log(`   ❌ Configuration error: ${error.message}\n`);
        return results;
    }

    // 2. Check Provider Connection
    console.log('2️⃣ Checking Provider Connection...');
    try {
        const httpUrl = config.rpcUrl.replace('wss://', 'https://').replace('/ws/', '/');
        console.log(`   Connecting to: ${httpUrl.substring(0, 60)}...`);
        
        const provider = new ethers.providers.JsonRpcProvider(httpUrl);
        
        const network = await provider.getNetwork();
        console.log(`   ✓ Network: ${network.name} (Chain ID: ${network.chainId})`);
        
        const blockNumber = await provider.getBlockNumber();
        console.log(`   ✓ Current Block: ${blockNumber}`);
        
        const block = await provider.getBlock(blockNumber);
        console.log(`   ✓ Block Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
        
        results.provider = true;
        console.log('   ✅ Provider connection successful\n');
    } catch (error) {
        console.log(`   ❌ Provider error: ${error.message}\n`);
        return results;
    }

    // 3. Check Contract Connection
    console.log('3️⃣ Checking Contract Connection...');
    try {
        const httpUrl = config.rpcUrl.replace('wss://', 'https://').replace('/ws/', '/');
        const provider = new ethers.providers.JsonRpcProvider(httpUrl);
        const contract = new ethers.Contract(
            config.contractAddress,
            config.contractABI,
            provider
        );
        
        console.log(`   Contract: ${config.contractAddress}`);
        
        // Check if contract exists
        const code = await provider.getCode(config.contractAddress);
        if (code === '0x') {
            console.log('   ❌ No contract found at this address');
            return results;
        }
        console.log(`   ✓ Contract code size: ${code.length} bytes`);
        
        // Try to call contract methods
        try {
            const goodBotsCount = await contract.getGoodBotsCount();
            console.log(`   ✓ Good Bots Count: ${goodBotsCount.toString()}`);
            
            const badBotsCount = await contract.getBadBotsCount();
            console.log(`   ✓ Bad Bots Count: ${badBotsCount.toString()}`);
            
            results.contract = true;
            console.log('   ✅ Contract connection successful\n');
        } catch (error) {
            console.log(`   ⚠️  Contract method call failed: ${error.message}`);
            console.log('   Note: This might be normal if the contract is on a different network\n');
        }
    } catch (error) {
        console.log(`   ❌ Contract error: ${error.message}\n`);
        return results;
    }

    // 4. Check Pyth Connection
    console.log('4️⃣ Checking Pyth Network Connection...');
    try {
        console.log(`   Hermes URL: ${config.hermesUrl}`);
        console.log('   Starting price stream test...');
        
        // Start price stream
        pythHermesClient.startPriceStream();
        
        // Wait for prices
        console.log('   Waiting 5 seconds for price updates...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if we got prices
        const btcPrice = pythHermesClient.getLatestPrice(config.priceIds['BTC/USD']);
        const ethPrice = pythHermesClient.getLatestPrice(config.priceIds['ETH/USD']);
        
        if (btcPrice) {
            console.log(`   ✓ BTC/USD: $${btcPrice.price.toFixed(2)}`);
            results.pyth = true;
        } else {
            console.log('   ⚠️  No BTC price received yet');
        }
        
        if (ethPrice) {
            console.log(`   ✓ ETH/USD: $${ethPrice.price.toFixed(2)}`);
        } else {
            console.log('   ⚠️  No ETH price received yet');
        }
        
        if (results.pyth) {
            console.log('   ✅ Pyth connection successful\n');
        } else {
            console.log('   ⚠️  Pyth connection incomplete - prices may arrive soon\n');
        }
    } catch (error) {
        console.log(`   ❌ Pyth error: ${error.message}\n`);
    }

    // 5. Check Event Listening
    console.log('5️⃣ Checking Event Listening Capability...');
    try {
        const httpUrl = config.rpcUrl.replace('wss://', 'https://').replace('/ws/', '/');
        const provider = new ethers.providers.JsonRpcProvider(httpUrl);
        const contract = new ethers.Contract(
            config.contractAddress,
            config.contractABI,
            provider
        );
        
        console.log('   Querying past TradeExecuted events (last 1000 blocks)...');
        
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        
        const filter = contract.filters.TradeExecuted();
        const events = await contract.queryFilter(filter, fromBlock, currentBlock);
        
        console.log(`   ✓ Found ${events.length} TradeExecuted events in last 1000 blocks`);
        
        if (events.length > 0) {
            console.log('   Recent events:');
            for (let i = 0; i < Math.min(5, events.length); i++) {
                const event = events[i];
                const { user, amount, blockNumber } = event.args;
                console.log(`     - Block ${blockNumber}: ${user} traded ${ethers.utils.formatEther(amount)} ETH`);
            }
        } else {
            console.log('   ⚠️  No recent trade events found');
            console.log('   This is normal if the contract is newly deployed or inactive');
        }
        
        results.events = true;
        console.log('   ✅ Event listening capability verified\n');
    } catch (error) {
        console.log(`   ❌ Event listening error: ${error.message}\n`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Configuration:     ${results.config ? '✅' : '❌'}`);
    console.log(`Provider:          ${results.provider ? '✅' : '❌'}`);
    console.log(`Contract:          ${results.contract ? '✅' : '❌'}`);
    console.log(`Pyth Network:      ${results.pyth ? '✅' : '⚠️'}`);
    console.log(`Event Listening:   ${results.events ? '✅' : '❌'}`);
    console.log('='.repeat(60));
    
    const allPassed = results.config && results.provider && results.contract && results.events;
    
    if (allPassed) {
        console.log('\n✅ All systems operational!');
        console.log('You can now run: npm run test-mainnet\n');
    } else {
        console.log('\n⚠️  Some issues detected. Please fix the errors above.\n');
        
        // Provide specific recommendations
        if (!results.config) {
            console.log('💡 Configuration Issue:');
            console.log('   - Check your .env file');
            console.log('   - Ensure all required variables are set\n');
        }
        if (!results.provider) {
            console.log('💡 Provider Issue:');
            console.log('   - Check your RPC URL');
            console.log('   - Verify your Infura/Alchemy API key is valid\n');
        }
        if (!results.contract) {
            console.log('💡 Contract Issue:');
            console.log('   - Verify the contract address is correct');
            console.log('   - Check if the contract is deployed on the correct network\n');
        }
        if (!results.pyth) {
            console.log('💡 Pyth Issue:');
            console.log('   - This may resolve itself - Pyth streams can take time to connect');
            console.log('   - Check your internet connection\n');
        }
        if (!results.events) {
            console.log('💡 Event Listening Issue:');
            console.log('   - Check if the contract ABI is correct');
            console.log('   - Verify the contract has TradeExecuted events\n');
        }
    }
    
    process.exit(allPassed ? 0 : 1);
}

runDiagnostics().catch(error => {
    console.error('\n❌ Diagnostic failed:', error.message);
    console.error(error.stack);
    process.exit(1);
});
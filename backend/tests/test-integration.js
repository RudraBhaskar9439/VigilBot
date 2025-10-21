import pythClient from '../src/services/pythHermesClient.js';
import blockchainListener from '../src/services/blockchainListener.js';
import botDetector from '../src/services/botDetector.js';

console.log('🧪 Running Integration Test...\n');

async function runIntegrationTest() {
    try {
        console.log('1️⃣ Starting Pyth price stream...');
        pythClient.startPriceStream();
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✅ Pyth client ready!\n');
        
        console.log('2️⃣ Testing blockchain connection...');
        const blockNumber = await blockchainListener.provider.getBlockNumber();
        console.log(`✅ Connected to block ${blockNumber}\n`);
        
        console.log('3️⃣ Starting event listener...');
        blockchainListener.startListening(async (tradeData) => {
            console.log('\n📊 Trade Detected!');
            console.log(JSON.stringify(tradeData, null, 2));
            
            console.log('\n🔍 Analyzing trade...');
            const analysis = await botDetector.analyzeTrade(tradeData);
            
            console.log(`\nAnalysis Result:`);
            console.log(`  Is Bot: ${analysis.isBot}`);
            console.log(`  Score: ${analysis.botScore}/100`);
            console.log(`  Signals: ${analysis.signals.join(', ')}`);
        });
        console.log('✅ Event listener ready!\n');
        
        console.log('4️⃣ System is fully operational!');
        console.log('   Waiting for trades... (Press Ctrl+C to stop)\n');
        
        // Keep running
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        process.exit(1);
    }
}

runIntegrationTest();
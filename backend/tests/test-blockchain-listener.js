const blockchainListener = require('../src/services/blockchainListener');

console.log('🧪 Testing Blockchain Listener...\n');

async function testBlockchainListener() {
    try {
        // Test 1: Check connection
        console.log('1️⃣ Testing blockchain connection...');
        const provider = blockchainListener.provider;
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Connected! Current block: ${blockNumber}\n`);
        
        // Test 2: Get contract info
        console.log('2️⃣ Testing contract connection...');
        const contract = blockchainListener.contract;
        const contractAddress = await contract.getAddress();
        console.log(`✅ Contract address: ${contractAddress}\n`);
        
        // Test 3: Check bot analyzer address
        console.log('3️⃣ Checking bot analyzer address...');
        const admin = await contract.admin();
        const botAnalyzer = await contract.botAnalyzer();
        console.log(`   Admin: ${admin}`);
        console.log(`   Bot Analyzer: ${botAnalyzer}`);
        console.log('✅ Success!\n');
        
        // Test 4: Get user trades (test with zero address)
        console.log('4️⃣ Testing getUserTrades()...');
        const testAddress = '0x0000000000000000000000000000000000000000';
        const trades = await blockchainListener.getUserTrades(testAddress);
        console.log(`✅ Got ${trades.length} trades for ${testAddress}\n`);
        
        // Test 5: Check bot status
        console.log('5️⃣ Testing isBot()...');
        const botStatus = await blockchainListener.isBot(testAddress);
        console.log(`   Is Flagged: ${botStatus.isFlagged}`);
        console.log(`   Bot Score: ${botStatus.score}`);
        console.log('✅ Success!\n');
        
        // Test 6: Listen to events (for 30 seconds)
        console.log('6️⃣ Testing event listener (listening for 30 seconds)...');
        console.log('   Make a test trade on the contract to see events...\n');
        
        let eventCount = 0;
        
        blockchainListener.startListening(async (tradeData) => {
            eventCount++;
            console.log(`\n📊 EVENT #${eventCount} RECEIVED:`);
            console.log(`   User: ${tradeData.user}`);
            console.log(`   Amount: ${tradeData.amount}`);
            console.log(`   Timestamp: ${new Date(tradeData.timestamp * 1000).toISOString()}`);
            console.log(`   Block: ${tradeData.blockNumber}`);
            console.log(`   TX Hash: ${tradeData.transactionHash}`);
        });
        
        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log(`\n✅ Listened for 30 seconds. Received ${eventCount} events.`);
        console.log('\n🎉 All Blockchain Listener tests passed!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testBlockchainListener();
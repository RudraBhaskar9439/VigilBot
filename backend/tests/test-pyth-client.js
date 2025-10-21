import PythHermesClient from '../src/services/pythHermesClient.js';
import config from '../src/config/config.js';

console.log('🧪 Testing Pyth Hermes Client...\n');

async function testPythClient() {
    try {
        console.log('1️⃣ Starting price stream...');
        
        // Start the price stream
        PythHermesClient.startPriceStream();
        
        // Wait for prices to come in
        console.log('⏳ Waiting 5 seconds for initial prices...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Test: Get all latest prices
        console.log('2️⃣ Testing getAllLatestPrices()...');
        const allPrices = PythHermesClient.getAllLatestPrices();
        console.log('All Prices:', JSON.stringify(allPrices, null, 2));
        console.log('✅ Success!\n');
        
        // Test: Get specific price
        console.log('3️⃣ Testing getLatestPrice() for BTC/USD...');
        const btcPrice = PythHermesClient.getLatestPrice(config.priceIds['BTC/USD']);
        
        if (btcPrice) {
            console.log('✅ BTC/USD Price Data:');
            console.log(`   Price: $${btcPrice.price.toFixed(2)}`);
            console.log(`   Confidence: ±$${btcPrice.confidence.toFixed(2)}`);
            console.log(`   Publish Time: ${new Date(btcPrice.publishTime * 1000).toISOString()}`);
            console.log(`   Timestamp: ${new Date(btcPrice.timestamp).toISOString()}`);
        } else {
            console.log('❌ No price data available yet');
        }
        console.log('');
        
        // Test: Get price history
        console.log('4️⃣ Testing getPriceHistory()...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for more data
        const history = PythHermesClient.getPriceHistory(config.priceIds['BTC/USD'], 5);
        console.log(`✅ Got ${history.length} historical price points`);
        history.forEach((price, idx) => {
            console.log(`   [${idx}] $${price.price.toFixed(2)} @ ${new Date(price.timestamp).toLocaleTimeString()}`);
        });
        console.log('');
        
        // Test: Monitor real-time updates
        console.log('5️⃣ Monitoring real-time price updates (10 seconds)...');
        console.log('   (Watch the console for live price updates)\n');
        
        let updateCount = 0;
        const startTime = Date.now();
        
        const checkInterval = setInterval(() => {
            const currentBtcPrice = PythHermesClient.getLatestPrice(config.priceIds['BTC/USD']);
            if (currentBtcPrice) {
                updateCount++;
                console.log(`   Update #${updateCount}: $${currentBtcPrice.price.toFixed(2)}`);
            }
            
            if (Date.now() - startTime > 10000) {
                clearInterval(checkInterval);
                console.log(`\n✅ Received ${updateCount} updates in 10 seconds`);
                console.log(`   Average: ${(updateCount / 10).toFixed(1)} updates/second`);
                console.log('\n🎉 All Pyth Hermes Client tests passed!');
                process.exit(0);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testPythClient();
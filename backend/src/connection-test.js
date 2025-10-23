import WebSocket from 'ws';
import config from './config/appConfig.js';
import logger from './utils/logger.js';

async function testWebSocketConnection() {
    console.log('Testing WebSocket Connection...');
    console.log(`WebSocket URL: ${config.hermesWsUrl}`);
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(config.hermesWsUrl);
        
        const timeout = setTimeout(() => {
            ws.terminate();
            reject(new Error('Connection timeout after 10 seconds'));
        }, 10000);
        
        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('✅ WebSocket connection established successfully');
            
            // Test subscription
            const message = {
                type: 'subscribe',
                ids: [
                    config.priceIds['BTC/USD'],
                    config.priceIds['ETH/USD']
                ]
            };
            
            ws.send(JSON.stringify(message));
            console.log('Subscription request sent...');
        });
        
        ws.on('message', (data) => {
            const response = JSON.parse(data);
            console.log('Received message:', response);
            
            if (response.type === 'subscribed') {
                console.log('✅ Successfully subscribed to price feeds');
                ws.close();
                resolve();
            }
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.error('❌ WebSocket error:', error.message);
            reject(error);
        });
        
        ws.on('close', () => {
            clearTimeout(timeout);
            console.log('WebSocket connection closed');
        });
    });
}

testWebSocketConnection()
    .then(() => {
        console.log('Connection test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Connection test failed:', error.message);
        process.exit(1);
    });
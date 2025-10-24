import dotenv from 'dotenv';
dotenv.config();
import pkg from 'ethers';
const { ethers } = pkg;

(async function(){
  try {
    const rpc = process.env.SEPOLIA_RPC_URL || process.env.MAINNET_RPC_URL;
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const addr = '0x2cC7fD19b0953a1C8E5eea66AbAB89977A4619e2';
    const code = await provider.getCode(addr);
    const txCount = await provider.getTransactionCount(addr);
    console.log('RPC:', rpc);
    console.log('Code length:', code.length);
    console.log('Tx count:', txCount);
  } catch (err) {
    console.error('Error checking contract:', err.message);
  }
})();

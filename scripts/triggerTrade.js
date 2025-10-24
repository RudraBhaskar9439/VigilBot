import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ethers = require("ethers");

dotenv.config();

// Debug: Check if RPC URL is loaded
console.log("RPC URL:", process.env.SEPOLIA_RPC_URL ? "Found" : "Missing");
if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error("SEPOLIA_RPC_URL not found in .env file");
}

const contractJson = await readFile("./backend/src/config/contract.json", "utf8");
const contractData = JSON.parse(contractJson);

const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractData.address, contractData.abi, wallet);

async function main() {
  const tx = await contract.executeTrade(100); // Amount can be any value
  console.log("Trade tx sent:", tx.hash);
  await tx.wait();
  console.log("Trade executed!");
}

main();
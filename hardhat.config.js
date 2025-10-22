require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Debug: Check if environment variables are loaded
console.log("Loading environment variables...");
console.log("INFURA_API_KEY exists:", !!process.env.INFURA_API_KEY);
console.log("ALCHEMY_API_KEY exists:", !!process.env.ALCHEMY_API_KEY);
console.log("PRIVATE_KEY exists:", !!process.env.PRIVATE_KEY);

const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

if (!PRIVATE_KEY) {
  console.error("⚠️  WARNING: PRIVATE_KEY not found in .env file");
}

if (!INFURA_API_KEY && !ALCHEMY_API_KEY) {
  console.error("⚠️  WARNING: Neither INFURA_API_KEY nor ALCHEMY_API_KEY found in .env file");
}

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: INFURA_API_KEY 
        ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
        : `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
  }
};
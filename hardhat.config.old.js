import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */

// Load and validate environment variables from your .env file
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const SEPOLIA_RPC_URL = INFURA_API_KEY
  ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
  : `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// The main configuration object
const config = {
  solidity: {
    version: "0.8.19",
    settings: {
      viaIR: true, // Your viaIR setting is preserved here
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111, // It's good practice to add the chainId
    },
  },
};

export default config;
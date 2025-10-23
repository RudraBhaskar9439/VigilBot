import pkg from 'hardhat';
const { ethers, network } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// This is the modern way to get the directory name in an ESM module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
    
    // Pyth contract address based on network
    const PYTH_CONTRACTS = {
        sepolia: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
        mainnet: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"
    };

    const pythContract = PYTH_CONTRACTS[network.name];
    if (!pythContract) {
        throw new Error(`No Pyth contract address for network: ${network.name}`);
    }
    
    console.log("\n📡 Using Pyth Network contract:", pythContract);
    
    const BotDetector = await ethers.getContractFactory("BotDetectorWithPyth");
    const botDetector = await BotDetector.deploy(
        pythContract,  // Pyth contract address
        deployer.address        // Bot analyzer address
    );
    
    await botDetector.deployed();
    const contractAddress = botDetector.address;
    
    console.log("✅ BotDetectorWithPyth deployed to:", contractAddress);
    
    // Save contract data
    const contractData = {
        address: contractAddress,
        abi: botDetector.interface.format(),
        network: network.name,
        deployer: deployer.address,
        pythContract: pythContract
    };
    
    const backendConfigPath = path.join(__dirname, '../backend/src/config/contract.json');
    fs.mkdirSync(path.dirname(backendConfigPath), { recursive: true });
    fs.writeFileSync(backendConfigPath, JSON.stringify(contractData, null, 2));
    
    console.log("✅ Contract data saved to backend/src/config/contract.json");
    console.log("\n🎉 Deployment complete!");
    console.log("\n📋 Next steps:");
    console.log(`1. Fund your bot analyzer wallet with ${network.name} ETH`);
    console.log("2. Start the backend: cd backend && npm run dev");
    console.log("3. The system will use Pyth prices OFF-CHAIN (free)");
    console.log("4. When flagging bots, it will push price proof ON-CHAIN (shows Pyth integration)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
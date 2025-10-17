const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
    
    const BotDetector = await ethers.getContractFactory("BotDetector");
    const botDetector = await BotDetector.deploy(deployer.address);
    
    await botDetector.waitForDeployment();
    const contractAddress = await botDetector.getAddress();
    
    console.log("✅ BotDetector deployed to:", contractAddress);
    
    // Save contract data for backend
    const contractData = {
        address: contractAddress,
        abi: botDetector.interface.format('json'),
        network: hre.network.name,
        deployer: deployer.address
    };
    
    const backendConfigPath = path.join(__dirname, '../../backend/src/config/contract.json');
    fs.mkdirSync(path.dirname(backendConfigPath), { recursive: true });
    fs.writeFileSync(backendConfigPath, JSON.stringify(contractData, null, 2));
    
    console.log("✅ Contract data saved to backend/src/config/contract.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
const path = require('path');

// Use absolute path to .env file
const envPath = path.join(__dirname, '..', '.env');
console.log("Looking for .env at:", envPath);

require("dotenv").config({ path: envPath });

console.log("\nTesting .env configuration...\n");

const fs = require('fs');
if (fs.existsSync(envPath)) {
    console.log("✅ .env file found!");
} else {
    console.log("❌ .env file NOT found at:", envPath);
    process.exit(1);
}

console.log("\nRPC_URL:", process.env.RPC_URL ? "✅ Set" : "❌ Not set");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ Set" : "❌ Not set");
console.log("HERMES_URL:", process.env.HERMES_URL ? "✅ Set" : "❌ Not set");

if (process.env.RPC_URL) {
    console.log("\n📋 Loaded values:");
    console.log("RPC_URL:", process.env.RPC_URL);
    console.log("HERMES_URL:", process.env.HERMES_URL);
}

if (!process.env.RPC_URL || !process.env.RPC_URL.includes("http")) {
    console.log("\n❌ ERROR: RPC_URL is not configured correctly!");
    console.log("Expected format: https://sepolia.infura.io/v3/YOUR_PROJECT_ID");
    process.exit(1);
}

console.log("\n✅ All environment variables are configured!");
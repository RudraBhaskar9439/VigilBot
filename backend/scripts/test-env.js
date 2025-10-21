import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Start of ESM Changes ---
// This is the modern way to get the current directory name in an ESM module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- End of ESM Changes ---

// Use absolute path to .env file
const envPath = path.join(__dirname, '..', '.env');
console.log("Looking for .env at:", envPath);

// Configure dotenv with the specific path
dotenv.config({ path: envPath });

console.log("\nTesting .env configuration...\n");

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
# 🛡️ Trading Bot Detection System

A comprehensive blockchain-based system for detecting and categorizing trading bots using real-time price feeds from Pyth Network. This system analyzes trading patterns, reaction times, and behavioral signals to identify automated trading bots and classify them into categories (Human, Good Bot, Bad Bot).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue.svg)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Smart Contract Deployment](#-smart-contract-deployment)
- [API Endpoints](#-api-endpoints)
- [Bot Detection Algorithm](#-bot-detection-algorithm)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Additional Documentation](#-additional-documentation)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

The Trading Bot Detection System is a full-stack decentralized application (dApp) that monitors blockchain trading activity in real-time and uses advanced algorithms to detect automated trading bots. The system leverages:

- **Pyth Network** for real-time, high-frequency price feeds
- **Smart Contracts** on Ethereum (Sepolia testnet) for on-chain bot detection and flagging
- **Machine Learning-inspired algorithms** for pattern recognition and behavioral analysis
- **React Frontend** with wallet integration for user interaction
- **Express.js Backend** for API services and WebSocket streaming

### Key Capabilities

- **Real-time Trade Monitoring**: Listens to blockchain events and analyzes trades as they occur
- **Bot Classification**: Categorizes traders into Human, Good Bot (market makers, arbitrage), and Bad Bot (manipulative, front-running)
- **Behavioral Analysis**: Analyzes reaction times, trade patterns, frequency, and timing
- **Live Price Streaming**: Uses Pyth Network's Hermes WebSocket for sub-second price updates
- **User Dashboard**: Provides analytics, trade history, and bot detection insights
- **Subscription System**: Integrates with Supabase for user management and premium features

## ✨ Features

### Core Features

- ✅ **Real-time Bot Detection**: Instant analysis of trading behavior
- ✅ **Multi-category Classification**: Human, Good Bot, Bad Bot categorization
- ✅ **Behavioral Scoring**: 0-100 bot score based on multiple signals
- ✅ **Price Feed Integration**: Live BTC/USD, ETH/USD, SOL/USD prices from Pyth Network
- ✅ **Blockchain Event Listening**: Monitors smart contract events in real-time
- ✅ **Historical Analysis**: Review past trades and detection results
- ✅ **User Analytics Dashboard**: Visualize trading patterns and statistics
- ✅ **Wallet Integration**: MetaMask and other Web3 wallet support
- ✅ **Subscription Management**: Premium features with Supabase integration

### Detection Signals

The system analyzes multiple signals to determine bot behavior:

1. **Reaction Time Analysis**: Measures time between price updates and trades
2. **Trade Frequency**: Detects abnormally high trading frequency
3. **Pattern Recognition**: Identifies repetitive trading patterns
4. **Timing Analysis**: Detects trades clustered around price movements
5. **Volume Analysis**: Analyzes trade sizes and consistency
6. **Liquidity Provision**: Identifies market-making behavior

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - User Dashboard  - Wallet Connection  - Analytics Charts  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                    Backend (Express.js)                      │
│  - REST API  - Bot Detection Service  - Price Streaming     │
└──────┬──────────────────┬──────────────────────┬────────────┘
       │                  │                      │
       │                  │                      │
┌──────▼─────┐   ┌───────▼────────┐   ┌─────────▼──────────┐
│  Ethereum  │   │ Pyth Network   │   │    Supabase        │
│  (Sepolia) │   │ (Hermes API)   │   │  (User Database)   │
│  Contract  │   │ Price Feeds    │   │  Subscriptions     │
└────────────┘   └────────────────┘   └────────────────────┘
```

### Component Breakdown

**Frontend (React + TypeScript + Vite)**
- Modern React 18 with TypeScript
- TailwindCSS for styling
- Recharts for data visualization
- Ethers.js for blockchain interaction
- React Router for navigation

**Backend (Node.js + Express)**
- RESTful API endpoints
- WebSocket for real-time updates
- Pyth Hermes client for price streaming
- Ethers.js for contract interaction
- Winston for logging

**Smart Contract (Solidity)**
- BotDetectorWithPyth contract
- Pyth Network integration
- On-chain bot flagging and evidence storage
- Multi-category bot classification

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **Ethers.js 6.x** - Ethereum library
- **Lucide React** - Icon library
- **Recharts** - Charting library
- **React Router** - Client-side routing
- **Supabase Client** - Authentication and database

### Backend
- **Node.js 18+** - Runtime environment
- **Express 4.x** - Web framework
- **Ethers.js 6.x** - Blockchain interaction
- **Pyth Hermes Client** - Price feed streaming
- **Winston** - Logging
- **Morgan** - HTTP request logging
- **WebSocket (ws)** - Real-time communication
- **Axios** - HTTP client
- **dotenv** - Environment configuration

### Smart Contracts
- **Solidity 0.8.19** - Smart contract language
- **Hardhat** - Development environment
- **Pyth SDK** - Oracle integration
- **OpenZeppelin** - Contract libraries

### Infrastructure
- **Ethereum Sepolia** - Test network
- **Infura/Alchemy** - RPC provider
- **Pyth Network** - Price oracle
- **Supabase** - Backend as a Service

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher) - [Download](https://nodejs.org/)
- **npm** (v9.x or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **MetaMask** or another Web3 wallet - [Install](https://metamask.io/)
- **Infura/Alchemy Account** - For RPC access
- **Sepolia ETH** - Get from [Sepolia Faucet](https://sepoliafaucet.com/)

### Optional
- **Hardhat** - For smart contract development
- **Supabase Account** - For user management features

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Trading_Bot_Detection.git
cd Trading_Bot_Detection
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## ⚙️ Configuration

### 1. Root Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_WSS_URL=wss://sepolia.infura.io/ws/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
ETHERSCAN_API_KEY=your_etherscan_api_key

# Chain Configuration
CHAIN_ID=11155111

# Pyth Network (Optional - defaults provided)
HERMES_URL=https://hermes.pyth.network
HERMES_WS_URL=wss://hermes-beta.pyth.network/ws
BTC_PRICE_ID=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
ETH_PRICE_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
SOL_PRICE_ID=0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d

# Bot Detection Parameters (Optional)
BOT_SCORE_THRESHOLD=60
REACTION_TIME_THRESHOLD=1
```

### 2. Backend Configuration

The backend uses the root `.env` file. Ensure the contract address is updated in `backend/src/config/contract.json` after deployment.

### 3. Frontend Configuration

Create `frontend/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Blockchain Configuration
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Supabase Configuration 
VITE_SUPABASE_URL=[your_supabase_project_url](https://usdsediywkxbaebqxtkb.supabase.co)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZHNlZGl5d2t4YmFlYnF4dGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjEzMjcsImV4cCI6MjA3NjczNzMyN30.SI6_CiMM4iTFkWmVKjDmSye6Ye_M7gm8HMOZZPXa9PA
```

### Important Notes

- **Never commit `.env` files** to version control
- **Private Key Security**: Keep your private key secure and never share it
- **Testnet Only**: Use Sepolia testnet for development
- **RPC Limits**: Be aware of RPC provider rate limits

## 🎮 Running the Application

### Step 1: Deploy Smart Contract (First Time Only)

Deploy the BotDetector contract to Sepolia:

```bash
# From root directory
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment:
1. Copy the contract address from the output
2. Update `backend/src/config/contract.json` with the new address
3. Update `frontend/.env` with `VITE_CONTRACT_ADDRESS`

### Step 2: Start the Backend Server

```bash
cd backend
npm start
```

The backend will start on `http://localhost:3001` and:
- Connect to Pyth Network for price streaming
- Listen to blockchain events
- Start the REST API server

**Backend Logs:**
```
🚀 Starting Bot Detection System...
📡 Starting Pyth Hermes price stream...
👂 Starting blockchain event listener...
✅ All services started successfully!
🛡️  BOT DETECTION SYSTEM RUNNING
Server: http://localhost:3000
```

### Step 3: Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### Step 4: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Development Mode

For development with auto-reload:

**Backend:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

**Frontend:**
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

## 📝 Smart Contract Deployment

### Deploy to Sepolia Testnet

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Deploy to Local Hardhat Network

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Verify Contract on Etherscan

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Contract Interaction

The deployed contract includes:
- `recordTrade()` - Record a new trade
- `flagBot()` - Flag an address as a bot
- `getBotInfo()` - Get bot information
- `getUserTrades()` - Get user trade history
- `updateBotCategory()` - Update bot classification

## 🔌 API Endpoints

### Health & Status

```
GET /health
GET /
```

### User Endpoints

```
GET /api/user/:address/status
GET /api/user/:address/trades
GET /api/user/:address/analytics
POST /api/user/:address/flag
```

### Analytics Endpoints

```
GET /api/analytics/prices
GET /api/analytics/bots/pending
GET /api/analytics/bots/flagged
GET /api/analytics/stats
GET /api/analytics/live-chart
```

### Simulation Endpoints

```
POST /api/simulation/start
POST /api/simulation/stop
GET /api/simulation/status
```

### Scan Endpoints

```
POST /api/scan/address
GET /api/scan/results/:address
```

### Example API Calls

**Get User Status:**
```bash
curl http://localhost:3001/api/user/0x1234.../status
```

**Get Live Prices:**
```bash
curl http://localhost:3001/api/analytics/prices
```

**Get Bot Statistics:**
```bash
curl http://localhost:3001/api/analytics/stats
```

## 🤖 Bot Detection Algorithm

### Scoring System (0-100)

The bot detection algorithm assigns a score based on multiple factors:

**Score Ranges:**
- **0-39**: Human Trader
- **40-59**: Good Bot (Market Maker, Arbitrage)
- **60-100**: Bad Bot (Manipulative, Front-running)

### Detection Signals

1. **Ultra-Fast Reaction Time** (+30 points)
   - Trade within 1 second of price update
   - Indicates automated response

2. **High Trade Frequency** (+20 points)
   - More than 10 trades per hour
   - Consistent with bot behavior

3. **Repetitive Patterns** (+15 points)
   - Similar trade amounts
   - Regular time intervals

4. **Price Movement Timing** (+20 points)
   - Trades clustered around price changes
   - Potential front-running

5. **Liquidity Provision** (-20 points)
   - Provides market liquidity
   - Indicates good bot behavior

### Algorithm Flow

```
1. Trade Event Detected
   ↓
2. Fetch Latest Price Data
   ↓
3. Calculate Reaction Time
   ↓
4. Analyze Trade History
   ↓
5. Apply Scoring Rules
   ↓
6. Classify Bot Category
   ↓
7. Store Evidence On-Chain
   ↓
8. Emit Detection Event
```

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run integration tests
npm test

# Run bot detection tests
npm run test-bot

# Run live system test
npm run test-live

# Run mainnet simulation
npm run test-mainnet

# Run 1500 user simulation
npm run test-1500

# System diagnostic
npm run diagnostic
```

### Smart Contract Tests

```bash
# From root directory
npx hardhat test

# Run specific test
npx hardhat test test/BotDetector.test.js

# With gas reporting
REPORT_GAS=true npx hardhat test
```

### Frontend Tests

```bash
cd frontend

# Type checking
npm run typecheck

# Linting
npm run lint

# Build test
npm run build
```

## 📁 Project Structure

```
Trading_Bot_Detection/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   │   ├── appConfig.js
│   │   │   ├── contract.json
│   │   │   └── networkConfig.js
│   │   ├── routes/           # API routes
│   │   │   ├── userRoutes.js
│   │   │   ├── analyticsRoutes.js
│   │   │   ├── simulationRoutes.js
│   │   │   └── scanRoutes.js
│   │   ├── services/         # Business logic
│   │   │   ├── pythHermesClient.js
│   │   │   ├── blockchainListener.js
│   │   │   ├── botDetector.js
│   │   │   └── contractService.js
│   │   ├── utils/            # Utilities
│   │   │   └── logger.js
│   │   └── index.js          # Entry point
│   ├── tests/                # Test files
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── layouts/          # Layout components
│   │   ├── lib/              # Utilities
│   │   ├── pages/            # Page components
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/               # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
├── contracts/
│   └── BotDetector.sol       # Smart contract
├── scripts/
│   └── deploy.js             # Deployment script
├── test/
│   └── BotDetector.test.js   # Contract tests
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Root dependencies
├── .env.example              # Environment template
└── README.md                 # This file
```

## 📚 Additional Documentation

For more detailed information, refer to these guides:

- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- **[BACKEND_INTEGRATION_GUIDE.md](./BACKEND_INTEGRATION_GUIDE.md)** - Backend integration
- **[FRONTEND_README.md](./frontend/FRONTEND_README.md)** - Frontend documentation
- **[SIMULATION_GUIDE.md](./SIMULATION_GUIDE.md)** - Testing and simulation
- **[SUBSCRIPTION_FLOW.md](./SUBSCRIPTION_FLOW.md)** - Subscription system
- **[WALLET_CONNECTION_GUIDE.md](./WALLET_CONNECTION_GUIDE.md)** - Wallet integration
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick command reference

## 🔧 Troubleshooting

### Common Issues

**1. Backend fails to start**
```
Error: Cannot connect to RPC
```
**Solution:** Check your `SEPOLIA_RPC_URL` and ensure you have a valid Infura/Alchemy API key.

**2. Frontend cannot connect to backend**
```
Network Error
```
**Solution:** Ensure backend is running on port 3001 and `VITE_API_URL` is correct.

**3. Contract deployment fails**
```
Error: insufficient funds
```
**Solution:** Get Sepolia ETH from a faucet: https://sepoliafaucet.com/

**4. Pyth price stream not working**
```
WebSocket connection failed
```
**Solution:** Check `HERMES_WS_URL` and ensure you have internet connectivity.

**5. MetaMask not connecting**
```
User rejected request
```
**Solution:** Ensure MetaMask is unlocked and connected to Sepolia network.

### Debug Mode

Enable debug logging:

**Backend:**
```bash
NODE_ENV=development npm start
```

**Check Logs:**
```bash
tail -f backend/logs/combined.log
```

### Reset Everything

If you encounter persistent issues:

```bash
# Clean all node_modules
rm -rf node_modules backend/node_modules frontend/node_modules

# Clean all package-lock files
rm package-lock.json backend/package-lock.json frontend/package-lock.json

# Reinstall
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Keep commits atomic and well-described

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Pyth Network** - For providing high-quality, low-latency price feeds
- **Hardhat** - For the excellent smart contract development framework
- **OpenZeppelin** - For secure smart contract libraries
- **Ethers.js** - For the comprehensive Ethereum library
- **React Team** - For the amazing frontend framework

## 📞 Support

For questions and support:

- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting section

## 🗺️ Roadmap

- [ ] Mainnet deployment
- [ ] Advanced ML-based detection
- [ ] Multi-chain support
- [ ] Mobile app
- [ ] Real-time alerts
- [ ] Advanced analytics dashboard
- [ ] API rate limiting
- [ ] Enhanced security features

---

**Built with ❤️ for the Ethereum community**

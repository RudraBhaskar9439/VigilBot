# Trading Bot Detection System - Frontend

A comprehensive React-based dashboard for monitoring and analyzing cryptocurrency trading bot activity with real-time market data, bot detection analytics, and subscription-based access control.

## Features

### 1. Payment Gateway
- **MetaMask Integration**: Secure cryptocurrency payments using Ethereum
- **Three Subscription Tiers**:
  - Basic (1 month) - 0.05 ETH
  - Standard (3 months) - 0.12 ETH
  - Pro (12 months) - 0.45 ETH
- **Dynamic USD Conversion**: Real-time ETH/USD price display
- **Automatic Access**: Dashboard unlocks immediately after payment confirmation

### 2. Dashboard Features

#### Live Market Data
- Real-time price tracking for BTC, ETH, and SOL
- 24-hour price change indicators
- Interactive price history charts
- Auto-refresh every 30 seconds

#### Bot Detection Analytics
- **Bot Summary Cards**: Total, Good, and Bad bot counts
- **Risk Distribution Chart**: Visual breakdown of bot risk levels (Critical, High, Medium, Low)
- **Bot Type Distribution**: Analysis of good bot categories (Market Maker, Arbitrage, Liquidity Provider)

#### Bot Tables
- **Good Bots Table**: Market makers, arbitrage bots with liquidity data
- **Bad Bots Table**: Malicious bots with risk level categorization
- Detailed information: Address, Score, Detection time, Signals
- Flagging status indicators

#### User Analytics Tool
- **Check Status**: Query any wallet address for bot detection status
- **View Trades**: Display trade history for specific addresses
- **Analytics Dashboard**:
  - Total trades count
  - Average trade amount
  - Unique trading hours
  - Average interval between trades

#### Admin Controls
- **Flag Pending Bots**: Batch flag all unverified bot detections
- **Unflag Bot**: Remove false positives from flagged list
- **Pyth Proof Mode Toggle**: Switch between secure (with proofs) and economical (without proofs) flagging

### 3. Security & Authentication
- Wallet-based authentication via MetaMask
- Subscription verification before dashboard access
- Protected routes with automatic redirection
- Session persistence across page reloads

## Project Structure

```
src/
├── components/
│   ├── AdminPanel.tsx          # Admin control panel
│   ├── BotSummary.tsx          # Bot statistics overview
│   ├── BotTable.tsx            # Good/Bad bot listing tables
│   ├── MarketData.tsx          # Live cryptocurrency prices
│   ├── ProtectedRoute.tsx      # Route protection component
│   └── UserAnalytics.tsx       # User analysis tool
├── contexts/
│   └── AuthContext.tsx         # Global authentication state
├── lib/
│   ├── ethereum.ts             # MetaMask/Web3 utilities
│   └── supabase.ts             # Database client & types
├── pages/
│   ├── Dashboard.tsx           # Main dashboard page
│   └── PaymentPage.tsx         # Subscription purchase page
├── App.tsx                     # Root component with routing
├── main.tsx                    # Application entry point
└── index.css                   # Global styles

```

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Charts**: Recharts
- **Web3**: Ethers.js v6
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Database Schema

### Tables

#### `subscriptions`
Stores user subscription information
- `wallet_address`: User's Ethereum address
- `tier`: Subscription level (basic/standard/pro)
- `amount_paid`: ETH amount paid
- `transaction_hash`: On-chain transaction reference
- `start_date` / `end_date`: Subscription period
- `is_active`: Current status

#### `bots`
Bot detection records
- `address`: Bot wallet address
- `bot_type`: Classification (good/bad)
- `category`: Specific type (market_maker, arbitrage, etc.)
- `score`: Detection confidence score
- `risk_level`: For bad bots (critical/high/medium/low)
- `liquidity_provided`: For good bots
- `signals`: Detection indicators (JSON)
- `is_flagged`: Admin verification status

#### `user_trades`
Trading activity records
- `user_address`: Trader wallet address
- `amount`: Trade value
- `block_number`: Ethereum block reference
- `timestamp`: Trade time

#### `market_prices`
Historical price data
- `asset`: Cryptocurrency symbol (BTC/ETH/SOL)
- `price`: USD value
- `timestamp`: Price snapshot time

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage Flow

### For Users

1. **Visit Payment Page**: Automatically redirected if no active subscription
2. **Connect Wallet**: Click any "Purchase Now" button to connect MetaMask
3. **Select Tier**: Choose subscription duration
4. **Complete Payment**: Approve transaction in MetaMask
5. **Access Dashboard**: Automatically redirected after payment confirmation

### For Administrators

1. **View Bot Statistics**: Monitor detection metrics in real-time
2. **Review Pending Bots**: Check unverified detections
3. **Flag/Unflag Bots**: Manage bot verification status
4. **Toggle Proof Mode**: Adjust flagging security/cost balance

## Key Components Explained

### Payment System
- Integrates with MetaMask for secure payments
- Verifies transactions on-chain before granting access
- Stores subscription records in Supabase
- Calculates subscription end dates automatically

### Authentication Context
- Manages wallet connection state globally
- Checks subscription status on mount
- Handles account/network changes
- Provides connection/disconnection methods

### Protected Routes
- Verifies active subscription before rendering
- Shows loading state during verification
- Redirects to payment page if unauthorized

### Data Fetching
- All components fetch data independently
- Auto-refresh intervals for real-time updates
- Error handling with user feedback
- Optimistic UI updates for better UX

## API Integration Points

The frontend is designed to work with backend endpoints:

- `GET /api/analytics/prices` - Market data
- `GET /api/analytics/bots/statistics` - Bot stats
- `GET /api/analytics/bots/good` - Good bots list
- `GET /api/analytics/bots/bad` - Bad bots list
- `POST /api/analytics/bots/flag-now` - Flag bots
- `GET /api/user/:address/status` - User status
- `GET /api/user/:address/trades` - User trades
- `GET /api/user/:address/analytics` - User analytics

## Customization

### Subscription Pricing
Edit `src/pages/PaymentPage.tsx`:
```typescript
const tiers = [
  { id: 'basic', ethPrice: '0.05', duration: 1 },
  // Modify prices and durations here
];
```

### Payment Recipient
Edit `src/lib/ethereum.ts`:
```typescript
export const PAYMENT_ADDRESS = '0xYourAddressHere';
```

### Refresh Intervals
Components have configurable refresh rates:
- Market Data: 30 seconds
- Bot Stats: 30 seconds
- ETH Price: 60 seconds

## Security Considerations

- All transactions require user approval in MetaMask
- Subscription verification happens server-side via database
- No private keys are ever stored or transmitted
- RLS policies protect database access
- Input validation on all user-provided addresses

## Troubleshooting

### MetaMask Not Connecting
- Ensure MetaMask is installed
- Check network (should be Ethereum Mainnet)
- Refresh page and try again

### Payment Not Processing
- Verify sufficient ETH balance for transaction + gas
- Check transaction in MetaMask history
- Contact support with transaction hash

### Dashboard Not Loading
- Verify subscription is active
- Check browser console for errors
- Clear cache and reload

## Future Enhancements

- [ ] Multi-chain support (Polygon, BSC, etc.)
- [ ] Advanced filtering and search in bot tables
- [ ] Export functionality for analytics data
- [ ] Email notifications for bot detections
- [ ] API key generation for programmatic access
- [ ] Historical price charts with multiple timeframes
- [ ] Bot detection signal details and explanations

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure Supabase database is properly configured
4. Review transaction status on blockchain explorer

## License

Proprietary - All rights reserved

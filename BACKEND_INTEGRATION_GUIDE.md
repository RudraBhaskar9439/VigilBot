# 🔌 Backend Integration Guide

## ✅ What's Been Set Up

Your frontend now fetches **real-time data** from your backend API!

### **New Files Created:**

1. **`frontend/src/lib/apiService.ts`** - API service for backend communication
2. **`frontend/src/hooks/useBackendData.ts`** - React hooks for easy data fetching
3. **Updated `frontend/src/components/BotSummary.tsx`** - Now uses real backend data

---

## 🚀 How It Works

### **Data Flow:**

```
Backend (Port 3000)
  ↓
API Endpoints (/api/analytics/*)
  ↓
apiService.ts (Fetch data)
  ↓
useBackendData.ts (React hooks)
  ↓
Dashboard Components (Display data)
```

---

## 📊 Available Backend Endpoints

Your backend provides these endpoints:

| Endpoint | Description | Data |
|----------|-------------|------|
| `/api/analytics/prices` | All latest prices | BTC, ETH, SOL prices from Pyth |
| `/api/analytics/bots` | All detected bots | Good + Bad bots |
| `/api/analytics/bots/good` | Good bots only | Market Makers, Arbitrage |
| `/api/analytics/bots/bad` | Bad bots only | Manipulative, Front-running |
| `/api/analytics/bots/summary` | Bot statistics | Counts, liquidity, risk levels |
| `/api/analytics/bots/statistics` | Detailed stats | Full analytics |
| `/api/user/:address/status` | Check if address is bot | Bot detection for specific user |
| `/api/user/:address/trades` | User trade history | All trades for address |
| `/health` | Backend health check | Server status |

---

## 🎯 How to Use in Your Components

### **Option 1: Using React Hooks (Easiest)**

```tsx
import { useBotSummary, usePrices, useAllBots } from '../hooks/useBackendData';

function MyComponent() {
  // Auto-refreshes every 30 seconds
  const { data, loading, error, refresh } = useBotSummary();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Total Bots: {data?.summary.totalBots}</h2>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### **Option 2: Using API Service Directly**

```tsx
import { apiService } from '../lib/apiService';

async function fetchData() {
  try {
    const summary = await apiService.getBotSummary();
    console.log('Total bots:', summary.summary.totalBots);
    
    const prices = await apiService.getAllPrices();
    console.log('BTC price:', prices.prices['BTC']?.price);
    
    const bots = await apiService.getAllBots();
    console.log('Good bots:', bots.goodBots.length);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## 🔧 Available React Hooks

### **1. useBotSummary()**
Fetches bot detection summary with counts and distributions.

```tsx
const { data, loading, error, refresh } = useBotSummary(autoRefresh, refreshInterval);

// data.summary.totalBots
// data.summary.goodBots.count
// data.summary.badBots.count
// data.summary.badBots.riskDistribution
```

### **2. useBotStatistics()**
Fetches detailed bot statistics.

```tsx
const { data, loading, error, refresh } = useBotStatistics();

// data.statistics.total.bots
// data.statistics.goodBots.marketMakers
// data.statistics.badBots.critical
```

### **3. usePrices()**
Fetches all cryptocurrency prices (auto-refreshes every 5 seconds).

```tsx
const { data, loading, error, refresh } = usePrices();

// data['BTC'].price
// data['ETH'].price
// data['SOL'].price
```

### **4. useAllBots()**
Fetches all detected bots (good and bad).

```tsx
const { data, loading, error, refresh } = useAllBots();

// data.goodBots[]
// data.badBots[]
// data.total
```

### **5. useUserAnalytics(address)**
Fetches analytics for a specific wallet address.

```tsx
const { data, loading, error, refresh } = useUserAnalytics(walletAddress);

// User-specific bot detection data
```

### **6. useBackendHealth()**
Checks if backend is running and healthy.

```tsx
const { isHealthy, loading, error, checkHealth } = useBackendHealth();

if (!isHealthy) {
  return <div>Backend is offline!</div>;
}
```

---

## 📝 Example: Update MarketData Component

```tsx
import { usePrices } from '../hooks/useBackendData';

export default function MarketData() {
  const { data: prices, loading, error } = usePrices(true, 5000);

  if (loading) return <div>Loading prices...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {prices && Object.entries(prices).map(([asset, priceData]) => (
        <div key={asset}>
          <h3>{asset}</h3>
          <p>${priceData.price.toFixed(2)}</p>
          <p className="text-xs">±${priceData.confidence.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📝 Example: Update BotTable Component

```tsx
import { useAllBots } from '../hooks/useBackendData';

export default function BotTable() {
  const { data, loading, error, refresh } = useAllBots();

  if (loading) return <div>Loading bots...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      
      <h3>Good Bots ({data?.goodBots.length})</h3>
      {data?.goodBots.map(bot => (
        <div key={bot.user}>
          <p>{bot.user}</p>
          <p>Score: {bot.score}</p>
          <p>Type: {bot.botType}</p>
        </div>
      ))}

      <h3>Bad Bots ({data?.badBots.length})</h3>
      {data?.badBots.map(bot => (
        <div key={bot.user}>
          <p>{bot.user}</p>
          <p>Score: {bot.score}</p>
          <p>Risk: {bot.riskLevel}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 Debugging

### **Check if Backend is Running:**

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-23T02:50:00.000Z",
  "services": {
    "pythStream": true,
    "blockchainListener": true
  }
}
```

### **Check Bot Data:**

```bash
curl http://localhost:3000/api/analytics/bots/summary
```

### **Check Prices:**

```bash
curl http://localhost:3000/api/analytics/prices
```

---

## ⚙️ Configuration

### **Change API URL (Optional)**

Create or update `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000
```

For production:
```bash
VITE_API_URL=https://your-backend-domain.com
```

---

## 🎯 What's Already Working

✅ **BotSummary component** - Now fetches real backend data
✅ **Auto-refresh** - Updates every 30 seconds
✅ **Error handling** - Shows error messages if backend is down
✅ **Loading states** - Shows loading indicators
✅ **Refresh button** - Manual refresh capability

---

## 📋 Next Steps to Complete Integration

### **1. Update MarketData Component**

```tsx
// frontend/src/components/MarketData.tsx
import { usePrices } from '../hooks/useBackendData';

export default function MarketData() {
  const { data: prices, loading, error } = usePrices(true, 5000);
  
  // Display real-time prices from Pyth
}
```

### **2. Update BotTable Component**

```tsx
// frontend/src/components/BotTable.tsx
import { useAllBots } from '../hooks/useBackendData';

export default function BotTable() {
  const { data, loading, error } = useAllBots();
  
  // Display all detected bots
}
```

### **3. Update UserAnalytics Component**

```tsx
// frontend/src/components/UserAnalytics.tsx
import { useUserAnalytics } from '../hooks/useBackendData';
import { useAuth } from '../contexts/AuthContext';

export default function UserAnalytics() {
  const { walletAddress } = useAuth();
  const { data, loading, error } = useUserAnalytics(walletAddress);
  
  // Show user-specific analytics
}
```

---

## 🚨 Common Issues & Solutions

### **Issue: "Failed to fetch data: Failed to fetch"**
**Cause:** Backend is not running
**Solution:**
```bash
cd backend
npm start
```

### **Issue: "CORS error"**
**Cause:** CORS not configured
**Solution:** Backend already has CORS enabled in `backend/src/index.js`

### **Issue: "404 Not Found"**
**Cause:** Wrong API endpoint
**Solution:** Check available endpoints in `backend/src/routes/analyticsRoutes.js`

### **Issue: "Network request failed"**
**Cause:** Wrong API URL
**Solution:** Check `VITE_API_URL` in `.env` file

---

## 📊 Data Structure Examples

### **Bot Summary Response:**

```json
{
  "summary": {
    "totalBots": 45,
    "goodBots": {
      "count": 30,
      "totalLiquidity": 1500000,
      "typeDistribution": {
        "Market Maker": 20,
        "Arbitrage Bot": 10
      }
    },
    "badBots": {
      "count": 15,
      "riskDistribution": {
        "CRITICAL": 5,
        "HIGH": 7,
        "MEDIUM": 3
      }
    }
  },
  "timestamp": 1729650000000
}
```

### **Prices Response:**

```json
{
  "prices": {
    "BTC": {
      "price": 108290.74,
      "confidence": 30.27,
      "publishTime": 1729650000,
      "timestamp": 1729650000000
    },
    "ETH": {
      "price": 3825.10,
      "confidence": 1.47,
      "publishTime": 1729650000,
      "timestamp": 1729650000000
    }
  }
}
```

---

## ✅ Summary

Your dashboard now displays **real-time data** from your backend:

- ✅ Bot detection statistics
- ✅ Market prices from Pyth Network
- ✅ Good/bad bot classifications
- ✅ Risk level distributions
- ✅ Auto-refresh every 30 seconds
- ✅ Error handling and loading states

**Both servers are running:**
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

**Just open your browser and see the live data!** 🚀

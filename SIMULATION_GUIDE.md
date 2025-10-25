# 🎮 Frontend Simulation Guide

## ✅ What's Running Now

You have **TWO processes** running:

1. **Main Backend Server** (Command ID: 188)
   - Running on: http://localhost:3000
   - Provides API endpoints for frontend
   - Streams live prices from Pyth Network

2. **1500 User Simulation** (Command ID: 192)
   - Simulates 1500 users trading
   - Detects good bots (Market Makers, Arbitrage)
   - Detects bad bots (Manipulative, Front-running)
   - Processing in real-time

---

## 📊 How to See Results in Frontend

### **Option 1: Wait for Simulation to Complete**

The simulation is processing 1500 users. Once complete, you'll see:
- Total bots detected
- Good bots with liquidity provided
- Bad bots with risk levels
- All data will appear in your dashboard automatically

**Current Status:** Processing users (check terminal output)

### **Option 2: Check API Directly**

While waiting, you can check the API:

```bash
# Check bot summary
curl http://localhost:3000/api/analytics/bots/summary | python3 -m json.tool

# Check all bots
curl http://localhost:3000/api/analytics/bots | python3 -m json.tool

# Check good bots only
curl http://localhost:3000/api/analytics/bots/good | python3 -m json.tool

# Check bad bots only
curl http://localhost:3000/api/analytics/bots/bad | python3 -m json.tool

# Check live prices
curl http://localhost:3000/api/analytics/prices | python3 -m json.tool
```

---

## 🎯 What You'll See in the Dashboard

### **1. Live Market Prices** ✅ (Already Working)
- BTC, ETH, SOL prices updating every 5 seconds
- Real-time data from Pyth Network
- Price charts with history

### **2. Bot Detection Summary** (After simulation completes)
- Total Bots: X
- Good Bots: Y (Market Makers, Arbitrage)
- Bad Bots: Z (Manipulative, Front-running)

### **3. Bot Risk Distribution** (After simulation completes)
- Critical Risk: X bots
- High Risk: Y bots
- Medium Risk: Z bots

### **4. Good Bot Types** (After simulation completes)
- Market Makers: X bots
- Arbitrage Bots: Y bots
- Total Liquidity Provided: $XXX

### **5. Bot Tables** (After simulation completes)
- List of all detected good bots
- List of all detected bad bots
- Wallet addresses, scores, signals

---

## 🔍 How the Simulation Works

### **Step 1: Generate Users**
Creates 1500 simulated users with different profiles:
- 70% Humans (normal traders)
- 15% Good Bots (Market Makers, Arbitrage)
- 15% Bad Bots (Manipulative, Front-running)

### **Step 2: Simulate Trades**
Each user makes trades based on their profile:
- **Humans:** Slow reaction (5-15s), irregular patterns
- **Good Bots:** Fast reaction (<1s), provide liquidity
- **Bad Bots:** Ultra-fast (<100ms), manipulative patterns

### **Step 3: Detect Bots**
Bot detector analyzes each trade:
- Reaction time
- Trade precision
- Trading frequency
- 24/7 activity
- Liquidity provision

### **Step 4: Classify Bots**
- **Score 60-79:** Good Bot (Market Maker/Arbitrage)
- **Score 80+:** Bad Bot (Manipulative/Front-running)
- **Score <60:** Human

### **Step 5: Store Results**
Bots are stored in memory and accessible via API

---

## 📈 Monitoring the Simulation

### **Watch Terminal Output**

You'll see logs like:

```
================================================================================
USER 73/1500
================================================================================

📌 User Information:
   Address: 0x6F1e75e112DbB3396E2913aC8065A4EB20d0908d
   Actual Category: GOOD_BOT
   Total Trades: 72
   Trading Frequency: 44 trades/hour

🤖 Bot Detection Results:
   Detected Category: GOOD_BOT
   Bot Score: 85/100
   Detection Accuracy: ✅ CORRECT
   Reaction Time: 150ms
   Signals Detected:
      • Ultra-fast reaction (<500ms)
      • High precision (6 decimals)
      • 24/7 trading pattern
      • Provides liquidity

📊 User Profile:
   Average Reaction Time: 150ms
   Average Trade Amount: 14.55 ETH
   Precision: 6 decimals
   24/7 Trading: Yes
   Liquidity Provided: $9,670.74
```

### **Check Progress**

The simulation shows:
- Current user being processed (e.g., "USER 73/1500")
- Bot detection accuracy
- Real-time classification

---

## 🎨 Frontend Dashboard Updates

Your dashboard components will automatically update:

### **BotSummary.tsx**
- Fetches `/api/analytics/bots/summary` every 30 seconds
- Shows total, good, and bad bot counts
- Displays risk distribution charts

### **MarketData.tsx**
- Fetches `/api/analytics/prices` every 5 seconds
- Shows BTC, ETH, SOL prices
- Updates price charts in real-time

### **BotTable.tsx**
- Fetches `/api/analytics/bots?type=good` or `bad`
- Lists all detected bots
- Shows wallet addresses, scores, signals

---

## ⏱️ Timeline

| Time | What's Happening |
|------|------------------|
| **0-2 min** | Simulation starting, processing first users |
| **2-5 min** | Processing bulk of users, bots being detected |
| **5-10 min** | Simulation completing, final classifications |
| **10+ min** | All data available in dashboard |

**Note:** Processing 1500 users takes time because each trade is analyzed individually.

---

## 🚀 Quick Commands

### **Check if Backend is Running:**
```bash
curl http://localhost:3000/health
```

### **Check Bot Count:**
```bash
curl -s http://localhost:3000/api/analytics/bots/summary | grep -o '"totalBots":[0-9]*'
```

### **Check Prices:**
```bash
curl -s http://localhost:3000/api/analytics/prices | python3 -m json.tool
```

### **Stop Simulation:**
Press `Ctrl+C` in the terminal running the simulation

### **Restart Backend:**
```bash
cd backend
npm start
```

---

## 🎯 Expected Results

After simulation completes, you should see approximately:

- **Total Bots:** ~450 (30% of 1500 users)
- **Good Bots:** ~225 (Market Makers, Arbitrage)
- **Bad Bots:** ~225 (Manipulative, Front-running)
- **Humans:** ~1050 (70% of users)

**Detection Accuracy:** ~85-90% (some misclassifications are normal)

---

## 🐛 Troubleshooting

### **Issue: No data in dashboard**
**Solution:** Wait for simulation to complete (check terminal for "USER X/1500")

### **Issue: Prices not updating**
**Solution:** Backend server must be running on port 3000

### **Issue: ERR_CONNECTION_REFUSED**
**Solution:** 
```bash
cd backend
npm start
```

### **Issue: Simulation stuck**
**Solution:** 
1. Press `Ctrl+C` to stop
2. Run again: `npm run test-1500`

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Terminal shows "USER X/1500" progressing
2. ✅ Backend logs show bot detections
3. ✅ API returns bot data: `curl http://localhost:3000/api/analytics/bots/summary`
4. ✅ Dashboard shows live prices
5. ✅ Dashboard shows bot statistics (after simulation completes)

---

## 📚 What's Next

Once simulation completes:

1. **View Dashboard** - http://localhost:5173/dashboard
2. **See Bot Statistics** - Total, Good, Bad bots
3. **View Bot Tables** - List of all detected bots
4. **Check Risk Distribution** - Critical, High, Medium risks
5. **Monitor Live Prices** - BTC, ETH, SOL updating every 5s

---

## 🎉 You're All Set!

Your simulation is running! Just wait for it to complete and your dashboard will populate with real bot detection data.

**Current Status:**
- ✅ Backend Server: Running
- ✅ Simulation: Processing users
- ✅ Frontend: Ready and waiting for data
- ✅ API: Accessible at http://localhost:3000

**Refresh your dashboard** (http://localhost:5173/dashboard) every minute to see updates!

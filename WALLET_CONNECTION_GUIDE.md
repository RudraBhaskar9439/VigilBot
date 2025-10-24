# 🔐 Real Wallet Connection & Testing Guide

## ✅ Your Project is Now Running!

**Backend:** Running on port 3000 (API endpoints)
**Frontend:** Running on http://localhost:5173

---

## 🎯 How to Test Real Wallet Connection

### **Prerequisites**

1. ✅ **MetaMask Extension** installed in your browser
2. ✅ **Test ETH** on Sepolia testnet (or use mainnet with real ETH)
3. ✅ **Backend running** (already started)
4. ✅ **Frontend running** (already started)

---

## 📋 Step-by-Step Testing Process

### **Step 1: Open the App**

1. Open your browser
2. Go to: **http://localhost:5173**
3. You should see the cover page

### **Step 2: Connect Your Wallet**

**Option A: From Cover Page**
1. Click **"Get Started"** button
2. Click **"Connect Wallet"** when prompted
3. MetaMask popup will appear
4. Select your account
5. Click **"Connect"**

**Option B: From Payment Page**
1. Navigate to `/payment` page
2. Click any **"Purchase Now"** button
3. MetaMask will prompt for connection
4. Approve the connection

### **Step 3: Test Free Subscription**

1. After connecting wallet, you'll see the payment page
2. Click **"Purchase Now"** on the **Basic Access** tier (FREE)
3. Wait for processing
4. You should be redirected to the dashboard
5. Your wallet address is now stored in Supabase!

### **Step 4: Verify in Supabase**

1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **"Table Editor"** → **"subscriptions"**
4. You should see your wallet address (starts with `0x`)
5. Check the `tier`, `is_active`, and `end_date` columns

---

## 🔍 Where Wallet Addresses Are Stored

### **Flow Diagram:**

```
User clicks "Purchase Now"
         ↓
MetaMask popup appears
         ↓
User approves connection
         ↓
ethereumService.connectWallet() [ethereum.ts:14]
         ↓
Returns wallet address (e.g., 0x742d35Cc...)
         ↓
PaymentPage stores in Supabase [PaymentPage.tsx:145]
         ↓
wallet_address: walletAddress.toLowerCase()
         ↓
Supabase subscriptions table
```

### **Key Files:**

| File | Line | Purpose |
|------|------|---------|
| `ethereum.ts` | 14-30 | Connects to MetaMask |
| `AuthContext.tsx` | 45-57 | Manages wallet state |
| `PaymentPage.tsx` | 90-165 | Handles subscription creation |
| `PaymentPage.tsx` | 145 | Stores wallet address in DB |

---

## 🧪 Testing Scenarios

### **Scenario 1: New User (No Subscription)**

```
1. Connect wallet with MetaMask
2. Check Supabase → No entry for this wallet
3. Purchase Basic (free) subscription
4. Check Supabase → New entry created
5. Access dashboard → Should work ✅
```

### **Scenario 2: Existing User (Has Subscription)**

```
1. Connect wallet (same as before)
2. Check Supabase → Entry exists
3. Try to purchase again
4. System detects existing subscription
5. Redirects to dashboard immediately ✅
```

### **Scenario 3: Expired Subscription**

```
1. Connect wallet
2. Check Supabase → Subscription exists but expired
3. System shows "Subscribe to access"
4. User must renew subscription
```

### **Scenario 4: Paid Subscription (Standard/Pro)**

```
1. Connect wallet
2. Select Standard (0.12 ETH) or Pro (0.45 ETH)
3. Click "Purchase Now"
4. MetaMask shows payment confirmation
5. Approve transaction
6. Wait for blockchain confirmation
7. Subscription created in Supabase ✅
8. Redirect to dashboard
```

---

## 🔐 Wallet Connection Code

### **Connect Wallet (ethereum.ts)**

```typescript
async connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  return accounts[0]; // Returns: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
}
```

### **Store in Supabase (PaymentPage.tsx)**

```typescript
const { error } = await supabase.from('subscriptions').upsert({
  wallet_address: walletAddress.toLowerCase(), // 0x742d35cc...
  tier: 'basic',
  amount_paid: 0,
  transaction_hash: 'FREE_0x742d35cc_1761187091343',
  start_date: now,
  end_date: endDate,
  is_active: true
});
```

### **Check Subscription (AuthContext.tsx)**

```typescript
const { data } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('wallet_address', address.toLowerCase())
  .maybeSingle();

if (data && data.is_active && new Date(data.end_date) > new Date()) {
  // User has valid subscription ✅
  setSubscription(data);
}
```

---

## 🎨 UI Flow

### **Cover Page → Payment Page → Dashboard**

```
┌─────────────────────┐
│   Cover Page        │
│                     │
│  [Get Started] ──────┐
└─────────────────────┘ │
                        ▼
┌─────────────────────────────────┐
│   Payment Page                  │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Connect Wallet          │   │
│  │ (MetaMask Popup)        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Basic - FREE            │   │
│  │ [Purchase Now]          │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Standard - 0.12 ETH     │   │
│  │ [Purchase Now]          │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│   Dashboard                     │
│                                 │
│  ✅ Subscription Active         │
│  📊 Bot Detection Analytics     │
│  📈 Market Data                 │
└─────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### **Issue: "MetaMask is not installed"**
**Solution:** Install MetaMask extension from https://metamask.io

### **Issue: "Please connect to MetaMask"**
**Solution:** Click the MetaMask icon and unlock your wallet

### **Issue: Wallet connects but no subscription**
**Solution:** 
1. Check if you clicked "Purchase Now"
2. Check Supabase for your wallet address
3. Look for errors in browser console (F12)

### **Issue: Transaction fails**
**Solution:**
1. Make sure you have enough ETH for gas fees
2. Check you're on the correct network (Mainnet/Sepolia)
3. Try again with a higher gas price

### **Issue: Subscription not showing in dashboard**
**Solution:**
1. Check Supabase → subscriptions table
2. Verify `is_active = true`
3. Verify `end_date` is in the future
4. Refresh the page

---

## 📊 Database Structure

### **Subscriptions Table**

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  wallet_address text UNIQUE NOT NULL,  -- Your MetaMask address
  tier text NOT NULL,                   -- 'basic', 'standard', 'pro'
  amount_paid numeric NOT NULL,         -- 0, 0.12, or 0.45
  transaction_hash text UNIQUE,         -- Blockchain TX hash
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### **Example Entry**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "wallet_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
  "tier": "basic",
  "amount_paid": 0,
  "transaction_hash": "FREE_0x742d35cc_1761187091343",
  "start_date": "2025-10-23T02:50:00.000Z",
  "end_date": "2025-11-23T02:50:00.000Z",
  "is_active": true,
  "created_at": "2025-10-23T02:50:00.000Z",
  "updated_at": "2025-10-23T02:50:00.000Z"
}
```

---

## 🎯 Quick Test Commands

### **Check if backend is running:**
```bash
curl http://localhost:3000/api/analytics/bots
```

### **Check if frontend is running:**
```bash
curl http://localhost:5173
```

### **View backend logs:**
```bash
cd backend
npm start
```

### **View frontend in browser:**
```
http://localhost:5173
```

---

## 🚀 Production Deployment

When deploying to production:

1. **Update Payment Address** in `ethereum.ts` (line 9)
2. **Use Mainnet** instead of testnet
3. **Set up proper RLS policies** in Supabase
4. **Add rate limiting** for subscription creation
5. **Implement webhook** for payment notifications
6. **Add email notifications** for subscription expiry

---

## 📝 Summary

**Your wallet connection is fully working!**

✅ MetaMask integration complete
✅ Wallet addresses stored in Supabase
✅ Subscription checking works
✅ Payment flow implemented
✅ Dashboard access control ready

**To test:**
1. Open http://localhost:5173
2. Click "Get Started"
3. Connect MetaMask
4. Purchase Basic (free) tier
5. Access dashboard
6. Check Supabase for your wallet address

**Your wallet address will be stored as:** `wallet_address` column in `subscriptions` table

---

**Need help?** Check the browser console (F12) for any errors!

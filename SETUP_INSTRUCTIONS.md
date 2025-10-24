# 🚀 Supabase Subscription Setup - Quick Start

## ✅ What I've Created for You

I've set up a complete subscription management system for your Trading Bot Detection app:

### 📁 New Files Created:

1. **`frontend/src/lib/subscriptionService.ts`** - Complete subscription CRUD operations
2. **`frontend/src/components/SubscriptionManager.tsx`** - Admin UI for managing subscriptions
3. **`frontend/src/hooks/useSubscription.ts`** - React hooks for easy subscription access
4. **`frontend/src/scripts/testSupabaseConnection.ts`** - Test script to verify setup
5. **`SUPABASE_SUBSCRIPTION_GUIDE.md`** - Comprehensive documentation

---

## 🎯 Next Steps (Choose Your Path)

### Path A: Quick Setup (5 minutes)

**Step 1: Apply the Migration**

Go to your Supabase Dashboard:
1. Visit https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**
5. Copy and paste the contents from:
   ```
   frontend/supabase/migrations/20251019133653_create_bot_detection_tables.sql
   ```
6. Click **"Run"** (or press Ctrl+Enter)

**Step 2: Verify Tables Created**

1. Go to **"Table Editor"** in the left sidebar
2. You should see these tables:
   - ✅ `subscriptions`
   - ✅ `bots`
   - ✅ `user_trades`
   - ✅ `market_prices`

**Step 3: Test the Connection** (Optional but recommended)

```bash
cd frontend
npm install tsx --save-dev
npx tsx src/scripts/testSupabaseConnection.ts
```

**Step 4: You're Done!** 🎉

Your subscription system is now ready to use!

---

### Path B: Advanced Setup with CLI (10 minutes)

**Step 1: Install Supabase CLI**

```bash
# macOS
brew install supabase/tap/supabase

# or npm
npm install -g supabase
```

**Step 2: Login and Link Project**

```bash
cd frontend
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

**Step 3: Apply Migrations**

```bash
supabase db push
```

**Step 4: Verify**

```bash
npx tsx src/scripts/testSupabaseConnection.ts
```

---

## 📖 How to Use Subscriptions in Your App

### 1. Using the Hook (Easiest)

```tsx
import { useSubscription } from '../hooks/useSubscription';

function MyComponent() {
  const { subscription, isValid, daysRemaining, loading } = useSubscription(walletAddress);

  if (loading) return <div>Loading...</div>;
  
  if (!isValid) {
    return <div>Please subscribe to access this feature</div>;
  }

  return (
    <div>
      <p>Subscription: {subscription?.tier}</p>
      <p>Days remaining: {daysRemaining}</p>
    </div>
  );
}
```

### 2. Using the Service Directly

```tsx
import { SubscriptionService } from '../lib/subscriptionService';

// Create subscription
const sub = await SubscriptionService.createSubscription({
  walletAddress: '0x123...',
  tier: 'standard',
  amountPaid: 0.12,
  transactionHash: '0xabc...',
  durationMonths: 3,
});

// Check if valid
const isValid = await SubscriptionService.isSubscriptionValid('0x123...');

// Get subscription
const subscription = await SubscriptionService.getSubscription('0x123...');
```

### 3. Add Admin Panel

Add the SubscriptionManager component to your admin panel:

```tsx
import SubscriptionManager from '../components/SubscriptionManager';

function AdminPanel() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <SubscriptionManager />
    </div>
  );
}
```

---

## 🧪 Testing Your Setup

### Manual Test via Supabase Dashboard

1. Go to **Table Editor** → **subscriptions**
2. Click **"Insert row"**
3. Fill in:
   - `wallet_address`: `0xtest123`
   - `tier`: `basic`
   - `amount_paid`: `0`
   - `transaction_hash`: `TEST_FREE`
   - `start_date`: `2025-01-01T00:00:00Z`
   - `end_date`: `2025-12-31T00:00:00Z`
   - `is_active`: `true`
4. Click **"Save"**
5. Verify the row appears in the table

### Test via Your App

1. Connect your wallet
2. Go to the payment page
3. Select "Basic Access" (free tier)
4. Click "Purchase Now"
5. Check if you're redirected to the dashboard

---

## 🔧 Integration with Existing Code

Your `PaymentPage.tsx` already has subscription logic. You can optionally enhance it:

### Before (Current):
```tsx
const { error: insertError } = await supabase.from('subscriptions').upsert([...]);
```

### After (Using Service):
```tsx
import { SubscriptionService } from '../lib/subscriptionService';

const subscription = await SubscriptionService.upsertSubscription({
  walletAddress: walletAddress,
  tier: tier.id,
  amountPaid: parseFloat(tier.ethPrice),
  transactionHash: txHash || 'FREE',
  durationMonths: tier.duration,
});
```

---

## 📊 Available Features

### ✅ Subscription Service Methods

- `createSubscription()` - Create new subscription
- `upsertSubscription()` - Create or update subscription
- `getSubscription()` - Get user's subscription
- `isSubscriptionValid()` - Check if subscription is active
- `getActiveSubscriptions()` - Get all active subscriptions
- `getAllSubscriptions()` - Get all subscriptions (admin)
- `deactivateSubscription()` - Deactivate a subscription
- `extendSubscription()` - Extend subscription duration
- `getSubscriptionStats()` - Get statistics
- `cleanupExpiredSubscriptions()` - Clean up expired subscriptions

### ✅ React Hooks

- `useSubscription(walletAddress)` - Get user's subscription data
- `useSubscriptionStats()` - Get subscription statistics (admin)

### ✅ Components

- `SubscriptionManager` - Full admin UI for managing subscriptions

---

## 🐛 Troubleshooting

### "relation 'subscriptions' does not exist"
**Solution:** Run the migration SQL in Supabase dashboard (see Step 1 above)

### "Failed to get subscription: PGRST116"
**Solution:** This is normal - it means no subscription exists for that wallet

### "Missing Supabase environment variables"
**Solution:** Check your `.env` file has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### RLS Policy Errors
**Solution:** Verify RLS policies are applied (they're in the migration SQL)

---

## 📚 Documentation

For detailed documentation, see:
- **`SUPABASE_SUBSCRIPTION_GUIDE.md`** - Complete guide with examples
- **Supabase Docs:** https://supabase.com/docs

---

## 🎉 You're All Set!

Your subscription system is ready to use. Here's what you can do now:

1. ✅ Create subscriptions via payment page
2. ✅ Check subscription status in your app
3. ✅ Manage subscriptions via admin panel
4. ✅ Track subscription statistics
5. ✅ Auto-cleanup expired subscriptions

**Need help?** Check the logs in Supabase dashboard or run the test script!

---

## 🔥 Quick Commands

```bash
# Test connection
npx tsx src/scripts/testSupabaseConnection.ts

# Start dev server
npm run dev

# Check Supabase status (if CLI installed)
supabase status
```

---

**Happy coding! 🚀**

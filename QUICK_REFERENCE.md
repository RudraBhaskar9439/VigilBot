# 📝 Subscription System - Quick Reference Card

## 🚀 Getting Started (30 seconds)

### Step 1: Apply Migration
```sql
-- Go to Supabase Dashboard → SQL Editor → Run this:
-- Copy from: frontend/supabase/migrations/20251019133653_create_bot_detection_tables.sql
```

### Step 2: Test Connection
```bash
cd frontend
npx tsx src/scripts/testSupabaseConnection.ts
```

### Step 3: Use in Your App
```tsx
import { useSubscription } from '../hooks/useSubscription';

const { isValid } = useSubscription(walletAddress);
if (!isValid) navigate('/payment');
```

---

## 🎯 Common Code Snippets

### Check Subscription Status
```tsx
import { SubscriptionService } from '../lib/subscriptionService';

const isValid = await SubscriptionService.isSubscriptionValid(walletAddress);
```

### Create Subscription
```tsx
const sub = await SubscriptionService.createSubscription({
  walletAddress: '0x123...',
  tier: 'standard',
  amountPaid: 0.12,
  transactionHash: '0xabc...',
  durationMonths: 3,
});
```

### Get User Subscription
```tsx
const subscription = await SubscriptionService.getSubscription(walletAddress);
console.log(subscription?.tier); // 'basic' | 'standard' | 'pro'
```

### Use React Hook
```tsx
const { subscription, isValid, daysRemaining, loading } = useSubscription(walletAddress);

if (loading) return <Spinner />;
if (!isValid) return <SubscribePrompt />;
return <Dashboard />;
```

---

## 📊 Subscription Tiers

| Tier | Duration | Price | Features |
|------|----------|-------|----------|
| **Basic** | 1 month | FREE | Dashboard, Market Data, Bot Detection |
| **Standard** | 3 months | 0.12 ETH | + Priority Support |
| **Pro** | 12 months | 0.45 ETH | + Advanced Analytics, API Access |

---

## 🔧 Service Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `createSubscription()` | Create new subscription | `Subscription` |
| `upsertSubscription()` | Create or update | `Subscription` |
| `getSubscription()` | Get by wallet | `Subscription \| null` |
| `isSubscriptionValid()` | Check if active | `boolean` |
| `getActiveSubscriptions()` | Get all active | `Subscription[]` |
| `getAllSubscriptions()` | Get all (admin) | `Subscription[]` |
| `deactivateSubscription()` | Deactivate | `void` |
| `extendSubscription()` | Add months | `Subscription` |
| `getSubscriptionStats()` | Get statistics | `Stats` |
| `cleanupExpiredSubscriptions()` | Clean up | `number` |

---

## 🎨 UI Components

### SubscriptionManager (Admin)
```tsx
import SubscriptionManager from '../components/SubscriptionManager';

<SubscriptionManager />
```

### Subscription Status Badge
```tsx
const { subscription, isValid, daysRemaining } = useSubscription(walletAddress);

<div>
  <span className={isValid ? 'text-green-400' : 'text-red-400'}>
    {isValid ? '✅ Active' : '❌ Inactive'}
  </span>
  {isValid && <span>{daysRemaining} days left</span>}
</div>
```

### Expiry Warning
```tsx
const { isExpiringSoon, daysRemaining } = useSubscription(walletAddress);

{isExpiringSoon && (
  <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded">
    ⚠️ Your subscription expires in {daysRemaining} days!
  </div>
)}
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  tier text NOT NULL,                    -- 'basic' | 'standard' | 'pro'
  amount_paid numeric NOT NULL,
  transaction_hash text UNIQUE NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 🔍 SQL Queries

### Get Active Subscriptions
```sql
SELECT * FROM subscriptions 
WHERE is_active = true 
AND end_date > NOW()
ORDER BY created_at DESC;
```

### Get Expiring Soon (< 7 days)
```sql
SELECT * FROM subscriptions 
WHERE is_active = true 
AND end_date > NOW()
AND end_date < NOW() + INTERVAL '7 days';
```

### Count by Tier
```sql
SELECT tier, COUNT(*) as count
FROM subscriptions
WHERE is_active = true
GROUP BY tier;
```

### Revenue by Tier
```sql
SELECT tier, SUM(amount_paid) as revenue
FROM subscriptions
GROUP BY tier;
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "relation 'subscriptions' does not exist" | Run migration SQL in Supabase dashboard |
| "PGRST116" | Normal - no subscription found |
| "Missing environment variables" | Check `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| "duplicate key value" | Use `upsertSubscription()` instead of `createSubscription()` |
| RLS policy error | Verify policies in Supabase dashboard |

---

## 📱 Environment Variables

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🧪 Testing

### Manual Test (Supabase Dashboard)
1. Table Editor → subscriptions → Insert row
2. Fill: `wallet_address`, `tier`, `amount_paid`, `transaction_hash`
3. Set `is_active = true`, `end_date = future date`
4. Save and verify

### Automated Test
```bash
npx tsx src/scripts/testSupabaseConnection.ts
```

---

## 📈 Admin Operations

### Get Statistics
```tsx
const stats = await SubscriptionService.getSubscriptionStats();
// { total: 150, active: 120, expired: 30, byTier: {...} }
```

### Clean Up Expired
```tsx
const cleaned = await SubscriptionService.cleanupExpiredSubscriptions();
console.log(`Cleaned ${cleaned} subscriptions`);
```

### Extend Subscription
```tsx
await SubscriptionService.extendSubscription('0x123...', 3); // +3 months
```

---

## 🔐 Security Checklist

- ✅ RLS policies enabled
- ✅ Environment variables in `.env` (not committed)
- ✅ Transaction verification before creating subscription
- ✅ HTTPS for all API calls
- ✅ Wallet signature verification
- ✅ Rate limiting on subscription creation

---

## 📚 File Locations

```
frontend/
├── src/
│   ├── lib/
│   │   ├── supabase.ts                    # Supabase client
│   │   └── subscriptionService.ts         # Service methods
│   ├── hooks/
│   │   └── useSubscription.ts             # React hooks
│   ├── components/
│   │   └── SubscriptionManager.tsx        # Admin UI
│   ├── pages/
│   │   └── PaymentPage.tsx                # Payment flow
│   └── scripts/
│       └── testSupabaseConnection.ts      # Test script
└── supabase/
    └── migrations/
        └── 20251019133653_create_bot_detection_tables.sql
```

---

## 🎯 Next Steps

1. ✅ Apply migration in Supabase dashboard
2. ✅ Test connection with test script
3. ✅ Use `useSubscription` hook in components
4. ✅ Add `SubscriptionManager` to admin panel
5. ✅ Set up cron job for cleanup (optional)
6. ✅ Add subscription status to user profile
7. ✅ Implement renewal reminders

---

## 💡 Pro Tips

- Use `useSubscription` hook for automatic refresh
- Set up cleanup cron job to run daily
- Show expiry warnings 7 days before
- Cache subscription data to reduce API calls
- Add analytics to track subscription conversions
- Implement webhook for payment notifications

---

## 🆘 Need Help?

1. Check `SUPABASE_SUBSCRIPTION_GUIDE.md` for detailed docs
2. Run test script: `npx tsx src/scripts/testSupabaseConnection.ts`
3. Check Supabase dashboard logs
4. Verify RLS policies in Table Editor
5. Check browser console for errors

---

**Quick Links:**
- 📖 [Full Guide](./SUPABASE_SUBSCRIPTION_GUIDE.md)
- 🔄 [Flow Diagram](./SUBSCRIPTION_FLOW.md)
- 🚀 [Setup Instructions](./SETUP_INSTRUCTIONS.md)

---

**Remember:** Always verify blockchain transactions before creating subscriptions! 🔐

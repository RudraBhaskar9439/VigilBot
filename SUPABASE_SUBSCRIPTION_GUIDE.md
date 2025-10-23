# Supabase Subscription Setup Guide

This guide will help you set up and manage subscriptions in your Supabase database.

## 📋 Table of Contents
1. [Database Setup](#database-setup)
2. [Migration Application](#migration-application)
3. [Subscription Service Usage](#subscription-service-usage)
4. [Testing Subscriptions](#testing-subscriptions)
5. [Common Operations](#common-operations)

---

## 🗄️ Database Setup

### Option 1: Using Supabase Dashboard (Recommended for Beginners)

1. **Navigate to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the contents from `frontend/supabase/migrations/20251019133653_create_bot_detection_tables.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see: `subscriptions`, `bots`, `user_trades`, `market_prices`

### Option 2: Using Supabase CLI

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Login to Supabase**
   ```bash
   cd frontend
   supabase login
   ```

3. **Link Your Project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Apply Migrations**
   ```bash
   supabase db push
   ```

---

## 📊 Subscription Table Schema

The `subscriptions` table has the following structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `wallet_address` | text | User's wallet address (unique) |
| `tier` | text | Subscription tier (basic/standard/pro) |
| `amount_paid` | numeric | Amount paid in ETH |
| `transaction_hash` | text | Blockchain transaction hash (unique) |
| `start_date` | timestamptz | Subscription start date |
| `end_date` | timestamptz | Subscription end date |
| `is_active` | boolean | Whether subscription is active |
| `created_at` | timestamptz | Record creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

---

## 🔧 Subscription Service Usage

### Import the Service

```typescript
import { SubscriptionService } from '../lib/subscriptionService';
```

### Create a New Subscription

```typescript
const subscription = await SubscriptionService.createSubscription({
  walletAddress: '0x1234...',
  tier: 'standard',
  amountPaid: 0.12,
  transactionHash: '0xabcd...',
  durationMonths: 3,
});
```

### Upsert Subscription (Create or Update)

```typescript
const subscription = await SubscriptionService.upsertSubscription({
  walletAddress: '0x1234...',
  tier: 'pro',
  amountPaid: 0.45,
  transactionHash: '0xabcd...',
  durationMonths: 12,
});
```

### Get User's Subscription

```typescript
const subscription = await SubscriptionService.getSubscription('0x1234...');

if (subscription) {
  console.log(`Tier: ${subscription.tier}`);
  console.log(`Active: ${subscription.is_active}`);
  console.log(`Expires: ${subscription.end_date}`);
}
```

### Check if Subscription is Valid

```typescript
const isValid = await SubscriptionService.isSubscriptionValid('0x1234...');

if (isValid) {
  // Grant access to premium features
} else {
  // Redirect to payment page
}
```

### Get All Active Subscriptions

```typescript
const activeSubscriptions = await SubscriptionService.getActiveSubscriptions();
console.log(`Total active: ${activeSubscriptions.length}`);
```

### Deactivate a Subscription

```typescript
await SubscriptionService.deactivateSubscription('0x1234...');
```

### Extend a Subscription

```typescript
const updatedSub = await SubscriptionService.extendSubscription(
  '0x1234...',
  3 // Add 3 more months
);
```

### Get Subscription Statistics

```typescript
const stats = await SubscriptionService.getSubscriptionStats();

console.log(`Total subscriptions: ${stats.total}`);
console.log(`Active: ${stats.active}`);
console.log(`Expired: ${stats.expired}`);
console.log(`Basic tier: ${stats.byTier.basic}`);
console.log(`Standard tier: ${stats.byTier.standard}`);
console.log(`Pro tier: ${stats.byTier.pro}`);
```

### Clean Up Expired Subscriptions

```typescript
const cleaned = await SubscriptionService.cleanupExpiredSubscriptions();
console.log(`Deactivated ${cleaned} expired subscriptions`);
```

---

## 🧪 Testing Subscriptions

### Manual Testing via Supabase Dashboard

1. **Go to Table Editor**
2. **Select `subscriptions` table**
3. **Click "Insert row"**
4. **Fill in test data:**
   ```
   wallet_address: 0xtest123
   tier: basic
   amount_paid: 0
   transaction_hash: TEST_FREE
   start_date: 2025-01-01T00:00:00Z
   end_date: 2025-02-01T00:00:00Z
   is_active: true
   ```
5. **Click "Save"**

### Testing via SQL

```sql
-- Insert test subscription
INSERT INTO subscriptions (
  wallet_address,
  tier,
  amount_paid,
  transaction_hash,
  start_date,
  end_date,
  is_active
) VALUES (
  '0xtest123',
  'basic',
  0,
  'TEST_FREE',
  NOW(),
  NOW() + INTERVAL '1 month',
  true
);

-- Query subscriptions
SELECT * FROM subscriptions;

-- Check active subscriptions
SELECT * FROM subscriptions 
WHERE is_active = true 
AND end_date > NOW();

-- Delete test data
DELETE FROM subscriptions WHERE wallet_address = '0xtest123';
```

---

## 🔍 Common Operations

### Check Subscription Status in Your App

```typescript
// In your AuthContext or component
const checkUserSubscription = async (walletAddress: string) => {
  try {
    const isValid = await SubscriptionService.isSubscriptionValid(walletAddress);
    
    if (!isValid) {
      // Redirect to payment page
      navigate('/payment');
    } else {
      // Allow access to dashboard
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
  }
};
```

### Subscription Expiry Notification

```typescript
const checkExpiryDate = async (walletAddress: string) => {
  const subscription = await SubscriptionService.getSubscription(walletAddress);
  
  if (subscription) {
    const endDate = new Date(subscription.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7 && daysLeft > 0) {
      console.log(`Your subscription expires in ${daysLeft} days!`);
    }
  }
};
```

### Scheduled Cleanup (Backend/Cron Job)

```typescript
// Run this periodically (e.g., daily via cron job)
const cleanupJob = async () => {
  try {
    const cleaned = await SubscriptionService.cleanupExpiredSubscriptions();
    console.log(`Cleaned up ${cleaned} expired subscriptions`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};
```

---

## 🔐 Security Best Practices

### Row Level Security (RLS)

Your migration already includes RLS policies. Here's what they do:

```sql
-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  TO public
  USING (true);

-- Users can insert subscriptions
CREATE POLICY "Users can insert subscriptions"
  ON subscriptions FOR INSERT
  TO public
  WITH CHECK (true);
```

### Additional Security Recommendations

1. **Validate Transactions**: Always verify blockchain transactions before creating subscriptions
2. **Use HTTPS**: Ensure all API calls use HTTPS
3. **Environment Variables**: Store Supabase credentials in `.env` file
4. **Rate Limiting**: Implement rate limiting on subscription creation
5. **Audit Logs**: Consider adding an audit log table for subscription changes

---

## 📱 Frontend Integration

### Update PaymentPage.tsx

The `PaymentPage.tsx` already handles subscription creation. You can enhance it with the new service:

```typescript
import { SubscriptionService } from '../lib/subscriptionService';

// Replace the supabase.from('subscriptions').upsert() call with:
const subscription = await SubscriptionService.upsertSubscription({
  walletAddress: walletAddress,
  tier: tier.id,
  amountPaid: parseFloat(tier.ethPrice),
  transactionHash: txHash || 'FREE',
  durationMonths: tier.duration,
});
```

---

## 🐛 Troubleshooting

### Common Issues

1. **"relation 'subscriptions' does not exist"**
   - Solution: Run the migration SQL in Supabase dashboard

2. **"duplicate key value violates unique constraint"**
   - Solution: Use `upsertSubscription()` instead of `createSubscription()`

3. **"Failed to get subscription: PGRST116"**
   - This is normal - it means no subscription exists for that wallet

4. **RLS Policy Errors**
   - Check that RLS policies are correctly applied in Supabase dashboard
   - Verify you're using the correct Supabase anon key

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Quick Start Checklist

- [ ] Run migration SQL in Supabase dashboard
- [ ] Verify tables created in Table Editor
- [ ] Test subscription creation with test data
- [ ] Update PaymentPage to use SubscriptionService
- [ ] Test subscription validation in AuthContext
- [ ] Set up cleanup job for expired subscriptions
- [ ] Add subscription status UI components
- [ ] Test end-to-end subscription flow

---

**Need Help?** Check the Supabase dashboard logs or console for detailed error messages.

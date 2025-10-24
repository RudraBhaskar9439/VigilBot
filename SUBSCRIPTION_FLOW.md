# 🔄 Subscription Flow Diagram

## User Subscription Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER VISITS APP                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Connect Wallet │
                    └────────┬───────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ Check Subscription       │
              │ (useSubscription hook)   │
              └──────────┬───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ Has Valid Sub? │              │ No Subscription│
│ ✅ YES         │              │ ❌ NO          │
└────────┬───────┘              └────────┬───────┘
         │                               │
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ Go to Dashboard│              │ Go to Payment  │
│                │              │ Page           │
└────────────────┘              └────────┬───────┘
                                         │
                                         ▼
                                ┌────────────────┐
                                │ Select Tier:   │
                                │ • Basic (Free) │
                                │ • Standard     │
                                │ • Pro          │
                                └────────┬───────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
                         ▼                               ▼
                ┌────────────────┐              ┌────────────────┐
                │ Free Tier      │              │ Paid Tier      │
                └────────┬───────┘              └────────┬───────┘
                         │                               │
                         │                               ▼
                         │                      ┌────────────────┐
                         │                      │ Send ETH       │
                         │                      │ Payment        │
                         │                      └────────┬───────┘
                         │                               │
                         │                               ▼
                         │                      ┌────────────────┐
                         │                      │ Wait for TX    │
                         │                      │ Confirmation   │
                         │                      └────────┬───────┘
                         │                               │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                                ┌────────────────┐
                                │ Create Sub in  │
                                │ Supabase       │
                                └────────┬───────┘
                                         │
                                         ▼
                                ┌────────────────┐
                                │ Redirect to    │
                                │ Dashboard      │
                                └────────────────┘
```

---

## Database Operations Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION SERVICE                          │
└─────────────────────────────────────────────────────────────────┘

CREATE SUBSCRIPTION
─────────────────────
User Action → SubscriptionService.createSubscription()
                      ↓
              Insert into Supabase
                      ↓
              {
                wallet_address: "0x...",
                tier: "standard",
                amount_paid: 0.12,
                transaction_hash: "0x...",
                start_date: NOW,
                end_date: NOW + 3 months,
                is_active: true
              }
                      ↓
              Return Subscription Object


GET SUBSCRIPTION
────────────────
User Login → useSubscription(walletAddress)
                      ↓
              SubscriptionService.getSubscription()
                      ↓
              Query Supabase
              SELECT * FROM subscriptions
              WHERE wallet_address = ?
                      ↓
              Return Subscription | null


CHECK VALIDITY
──────────────
Dashboard Access → SubscriptionService.isSubscriptionValid()
                      ↓
              Get Subscription
                      ↓
              Check:
              • is_active === true
              • end_date > NOW
                      ↓
              Return boolean


CLEANUP EXPIRED
───────────────
Cron Job → SubscriptionService.cleanupExpiredSubscriptions()
                      ↓
              UPDATE subscriptions
              SET is_active = false
              WHERE is_active = true
              AND end_date < NOW
                      ↓
              Return count of updated rows
```

---

## Component Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP STRUCTURE                             │
└─────────────────────────────────────────────────────────────────┘

App.tsx
  │
  ├─ AuthContext
  │    │
  │    └─ useSubscription(walletAddress)
  │         │
  │         ├─ subscription
  │         ├─ isValid
  │         ├─ daysRemaining
  │         └─ isExpiringSoon
  │
  ├─ CoverPage
  │    │
  │    └─ "Get Started" → /payment
  │
  ├─ PaymentPage
  │    │
  │    ├─ Display Tiers
  │    ├─ Handle Payment
  │    └─ SubscriptionService.upsertSubscription()
  │         │
  │         └─ Redirect to /dashboard
  │
  ├─ Dashboard
  │    │
  │    ├─ Check: isValid
  │    │    │
  │    │    ├─ ✅ YES → Show Dashboard
  │    │    └─ ❌ NO  → Redirect to /payment
  │    │
  │    └─ Show subscription info
  │         │
  │         ├─ Tier
  │         ├─ Days Remaining
  │         └─ Expiry Warning (if < 7 days)
  │
  └─ AdminPanel
       │
       └─ SubscriptionManager
            │
            ├─ Display Statistics
            ├─ List All Subscriptions
            ├─ Deactivate Subscriptions
            └─ Cleanup Expired
```

---

## Data Flow Example

### Scenario: User Purchases Standard Tier

```
1. USER CLICKS "Purchase Standard"
   ↓
2. PaymentPage.handlePurchase()
   ↓
3. Check if wallet connected
   ↓
4. Send 0.12 ETH payment
   ↓
5. Wait for transaction confirmation
   ↓
6. SubscriptionService.upsertSubscription({
     walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
     tier: "standard",
     amountPaid: 0.12,
     transactionHash: "0xabc123...",
     durationMonths: 3
   })
   ↓
7. Supabase INSERT/UPDATE
   ↓
8. Return subscription object
   ↓
9. Update AuthContext
   ↓
10. Navigate to /dashboard
    ↓
11. Dashboard checks: isValid = true
    ↓
12. Show dashboard with full access
```

---

## Subscription States

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION STATES                           │
└─────────────────────────────────────────────────────────────────┘

STATE 1: NO SUBSCRIPTION
────────────────────────
subscription = null
isValid = false
→ Show: "Subscribe to access"
→ Action: Redirect to /payment


STATE 2: ACTIVE SUBSCRIPTION
────────────────────────────
subscription.is_active = true
subscription.end_date > NOW
isValid = true
→ Show: Dashboard with full access
→ Action: Display tier & expiry date


STATE 3: EXPIRING SOON
──────────────────────
subscription.is_active = true
subscription.end_date - NOW < 7 days
isValid = true
isExpiringSoon = true
→ Show: Dashboard + Warning banner
→ Action: Prompt to renew


STATE 4: EXPIRED
────────────────
subscription.is_active = true/false
subscription.end_date < NOW
isValid = false
→ Show: "Subscription expired"
→ Action: Redirect to /payment


STATE 5: DEACTIVATED
────────────────────
subscription.is_active = false
isValid = false
→ Show: "Subscription deactivated"
→ Action: Contact support or renew
```

---

## API Endpoints (Supabase)

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE OPERATIONS                         │
└─────────────────────────────────────────────────────────────────┘

READ
────
GET /rest/v1/subscriptions
  ?select=*
  &wallet_address=eq.0x123
  
→ Returns: Subscription object or null


CREATE
──────
POST /rest/v1/subscriptions
Body: {
  wallet_address: "0x123",
  tier: "standard",
  amount_paid: 0.12,
  ...
}

→ Returns: Created subscription


UPDATE (UPSERT)
───────────────
POST /rest/v1/subscriptions
Body: { ... }
?on_conflict=wallet_address

→ Returns: Created/Updated subscription


UPDATE (MODIFY)
───────────────
PATCH /rest/v1/subscriptions
  ?wallet_address=eq.0x123
Body: {
  is_active: false,
  updated_at: "2025-01-01T00:00:00Z"
}

→ Returns: Updated subscription


DELETE
──────
DELETE /rest/v1/subscriptions
  ?wallet_address=eq.0x123

→ Returns: Deleted subscription
```

---

## Security Flow (RLS Policies)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROW LEVEL SECURITY                            │
└─────────────────────────────────────────────────────────────────┘

SELECT (Read)
─────────────
Policy: "Users can read own subscription"
Rule: USING (true)
→ Anyone can read subscriptions (public data)


INSERT (Create)
───────────────
Policy: "Users can insert subscriptions"
Rule: WITH CHECK (true)
→ Anyone can create subscriptions
→ Validation happens in application layer


UPDATE (Modify)
───────────────
No policy defined
→ Only service role can update
→ Prevents unauthorized modifications


DELETE (Remove)
───────────────
No policy defined
→ Only service role can delete
→ Prevents unauthorized deletions
```

---

## Monitoring & Analytics

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                               │
└─────────────────────────────────────────────────────────────────┘

SubscriptionManager Component
─────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│  Total: 150    Active: 120    Expired: 30    Pro: 45       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Tier Distribution                                          │
│  Basic: 60  ████████████                                    │
│  Standard: 45  █████████                                    │
│  Pro: 45  █████████                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Recent Subscriptions                                       │
│  0x742d... | Standard | 0.12 ETH | Active | 85 days left   │
│  0x8a3f... | Pro      | 0.45 ETH | Active | 340 days left  │
│  0x1b2c... | Basic    | 0.00 ETH | Expired | -5 days       │
└─────────────────────────────────────────────────────────────┘

Actions:
[Clean Up Expired] [Export CSV] [Refresh]
```

---

**This flow ensures a smooth subscription experience from signup to renewal! 🚀**

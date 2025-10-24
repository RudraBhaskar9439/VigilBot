import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Wallet, TrendingUp } from 'lucide-react';
import { ethereumService } from '../lib/ethereum';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionTier {
  id: string;
  name: string;
  duration: number;
  ethPrice: string;
  popular?: boolean;
  features: string[];
}

const PAYMENT_ADDRESS = '0x76D7D56fb21A6969E1F07B722e3c63E2c80a7cB1';

const tiers: SubscriptionTier[] = [
  {
    id: 'basic',
    name: 'Basic Access',
    duration: 1,
    ethPrice: '0', // Make Basic Access free
    features: [
      'Full Dashboard Access',
      'Real-time Market Data',
      'Bot Detection Analytics',
      'User Trade History',
      '1 Month Access',
    ],
  },
  {
    id: 'standard',
    name: 'Standard Access',
    duration: 3,
    ethPrice: '0.12',
    popular: true,
    features: [
      'Full Dashboard Access',
      'Real-time Market Data',
      'Bot Detection Analytics',
      'User Trade History',
      'Priority Support',
      '3 Months Access',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Access',
    duration: 12,
    ethPrice: '0.45',
    features: [
      'Full Dashboard Access',
      'Real-time Market Data',
      'Bot Detection Analytics',
      'User Trade History',
      'Priority Support',
      'Advanced Analytics',
      'API Access',
      '12 Months Access',
    ],
  },
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const { walletAddress, connectWallet, checkSubscription } = useAuth();
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        setEthPrice(data.ethereum.usd);
      } catch (err) {
        console.error('Failed to fetch ETH price:', err);
        setEthPrice(3000);
      }
    };

    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePurchase = async (tier: SubscriptionTier) => {
    setError(null);

    if (!walletAddress) {
      try {
        await connectWallet();
      } catch (err: any) {
        setError(err.message);
        return;
      }
      return;
    }

    setLoadingTier(tier.id);

    try {
      // Check if already subscribed
      const { data: existingSub, error: selectError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();

      if (existingSub) {
        // If already subscribed, go to dashboard
        await checkSubscription(walletAddress);
        navigate('/dashboard');
        setLoadingTier(null);
        return;
      }

      // If not, insert new subscription
      let txHash = null;
      let success = false;
      if (tier.ethPrice === '0') {
        // Free tier: no payment, just register subscription
        success = true;
      } else {
        // Paid tier: send payment to PAYMENT_ADDRESS
        txHash = await ethereumService.sendPayment(tier.ethPrice);
        success = await ethereumService.waitForTransaction(txHash);
      }

      if (success) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + tier.duration);

        // Use upsert to avoid duplicate key error and include all NOT NULL columns
        const now = new Date().toISOString();
        
        // Generate unique transaction hash to avoid conflicts
        const uniqueTxHash = txHash || `FREE_${walletAddress}_${Date.now()}`;
        
        const { error: insertError } = await supabase.from('subscriptions').upsert(
          {
            wallet_address: walletAddress.toLowerCase(),
            tier: tier.id,
            amount_paid: parseFloat(tier.ethPrice),
            transaction_hash: uniqueTxHash,
            start_date: now,
            end_date: endDate.toISOString(),
            is_active: true,
            created_at: now,
            updated_at: now,
          },
          { 
            onConflict: 'wallet_address',
            ignoreDuplicates: false 
          }
        );

        if (insertError) throw insertError;

        await checkSubscription(walletAddress);
        navigate('/dashboard');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingTier(null);
    }
  };

  const formatUsdPrice = (ethAmount: string) => {
    if (!ethPrice) return 'Loading...';
    const usdAmount = parseFloat(ethAmount) * ethPrice;
    return `$${usdAmount.toFixed(2)} USD`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-cyan-500/10 p-4 rounded-2xl">
              <TrendingUp className="w-12 h-12 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Unlock Premium Dashboard Access
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Get instant access to advanced bot detection analytics, real-time market data, and comprehensive trading insights
          </p>
        </div>

        {error && (
          <div className="max-w-4xl mx-auto mb-8 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-slate-900/50 backdrop-blur border rounded-2xl p-8 transition-all hover:scale-105 hover:shadow-2xl ${
                tier.popular
                  ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                  : 'border-slate-800'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="text-4xl font-bold text-cyan-400 mb-2">
                  {tier.ethPrice} ETH
                </div>
                <div className="text-slate-400">{formatUsdPrice(tier.ethPrice)}</div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(tier)}
                disabled={loadingTier !== null}
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loadingTier === tier.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : walletAddress ? (
                  'Purchase Now'
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Payment Information</h2>
          <div className="space-y-4 text-slate-400">
            <p>
              <strong className="text-white">Payment Method:</strong> MetaMask (Ethereum Wallet)
            </p>
            <p>
              <strong className="text-white">Network:</strong> Ethereum Mainnet
            </p>
            <p>
              <strong className="text-white">Security:</strong> All transactions are processed securely on-chain. Your subscription will be activated immediately after payment confirmation.
            </p>
            <p className="text-sm">
              By purchasing, you agree to our Terms of Service and Privacy Policy. Subscriptions are non-refundable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { SubscriptionService } from '../lib/subscriptionService';
import { Subscription } from '../lib/supabase';

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  isValid: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing user subscriptions
 * 
 * @param walletAddress - User's wallet address
 * @param autoRefresh - Whether to auto-refresh subscription data (default: true)
 * @param refreshInterval - Refresh interval in milliseconds (default: 60000 = 1 minute)
 * 
 * @example
 * ```tsx
 * const { subscription, isValid, daysRemaining, loading } = useSubscription(walletAddress);
 * 
 * if (loading) return <div>Loading...</div>;
 * if (!isValid) return <div>Please subscribe</div>;
 * 
 * return <div>Days remaining: {daysRemaining}</div>;
 * ```
 */
export function useSubscription(
  walletAddress: string | null,
  autoRefresh: boolean = true,
  refreshInterval: number = 60000
): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const calculateDaysRemaining = useCallback((endDate: string): number => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, []);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setSubscription(null);
      setIsValid(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [sub, valid] = await Promise.all([
        SubscriptionService.getSubscription(walletAddress),
        SubscriptionService.isSubscriptionValid(walletAddress),
      ]);

      setSubscription(sub);
      setIsValid(valid);

      if (sub) {
        const days = calculateDaysRemaining(sub.end_date);
        setDaysRemaining(days);
        setIsExpiringSoon(days <= 7 && days > 0);
      } else {
        setDaysRemaining(0);
        setIsExpiringSoon(false);
      }
    } catch (err: any) {
      setError(err.message);
      setSubscription(null);
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, calculateDaysRemaining]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh || !walletAddress) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, walletAddress, refreshInterval, refresh]);

  return {
    subscription,
    loading,
    error,
    isValid,
    isExpiringSoon,
    daysRemaining,
    refresh,
  };
}

/**
 * Hook for subscription statistics (admin use)
 */
export function useSubscriptionStats(autoRefresh: boolean = false, refreshInterval: number = 60000) {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    byTier: { basic: 0, standard: 0, pro: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SubscriptionService.getSubscriptionStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return { stats, loading, error, refresh };
}

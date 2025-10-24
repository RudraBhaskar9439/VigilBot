import { useState, useEffect, useCallback } from 'react';
import { apiService, BotStatistics, BotSummary, PriceData } from '../lib/apiService';

/**
 * Hook to fetch bot statistics from backend
 */
export function useBotStatistics(autoRefresh: boolean = true, refreshInterval: number = 30000) {
  const [data, setData] = useState<BotStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getBotStatistics();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching bot statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook to fetch bot summary from backend
 */
export function useBotSummary(autoRefresh: boolean = true, refreshInterval: number = 30000) {
  const [data, setData] = useState<BotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getBotSummary();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching bot summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook to fetch all prices from backend
 */
export function usePrices(autoRefresh: boolean = true, refreshInterval: number = 5000) {
  const [data, setData] = useState<Record<string, PriceData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getAllPrices();
      setData(result.prices);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook to fetch all bots from backend
 */
export function useAllBots(autoRefresh: boolean = true, refreshInterval: number = 30000) {
  const [data, setData] = useState<{ goodBots: any[]; badBots: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getAllBots();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching bots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook to fetch user analytics from backend
 */
export function useUserAnalytics(address: string | null, autoRefresh: boolean = false) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getUserAnalytics(address);
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching user analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchData();
    }
  }, [address, fetchData]);

  useEffect(() => {
    if (!autoRefresh || !address) return;

    const interval = setInterval(fetchData, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [autoRefresh, address, fetchData]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook to check backend health
 */
export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.healthCheck();
      setIsHealthy(result.status === 'OK');
    } catch (err: any) {
      setError(err.message);
      setIsHealthy(false);
      console.error('Backend health check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, loading, error, checkHealth };
}

import React, { useState } from 'react';
import { Search, TrendingUp, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserStatus {
  isFlagged: boolean;
  botScore: number;
  category?: string;
}

interface Trade {
  id: string;
  amount: number;
  block_number: number;
  timestamp: string;
}

interface Analytics {
  totalTrades: number;
  averageAmount: number;
  uniqueHours: number;
  avgInterval: number;
}

export default function UserAnalytics() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'trades' | 'analytics'>('status');

  const handleCheckStatus = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const { data: bot, error } = await supabase
        .from('bots')
        .select('*')
        .eq('address', address.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      setStatus({
        isFlagged: bot?.is_flagged || false,
        botScore: bot?.score || 0,
        category: bot?.category,
      });
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus({ isFlagged: false, botScore: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleViewTrades = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_trades')
        .select('*')
        .eq('user_address', address.toLowerCase())
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalytics = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_trades')
        .select('*')
        .eq('user_address', address.toLowerCase());

      if (error) throw error;

      if (data && data.length > 0) {
        const totalTrades = data.length;
        const totalAmount = data.reduce((sum, t) => sum + Number(t.amount), 0);
        const averageAmount = totalAmount / totalTrades;

        const hours = new Set(data.map((t) => new Date(t.timestamp).getHours()));
        const uniqueHours = hours.size;

        const timestamps = data.map((t) => new Date(t.timestamp).getTime()).sort();
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        const avgInterval = intervals.length > 0
          ? intervals.reduce((a, b) => a + b, 0) / intervals.length / 1000 / 60
          : 0;

        setAnalytics({
          totalTrades,
          averageAmount,
          uniqueHours,
          avgInterval,
        });
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tab: 'status' | 'trades' | 'analytics') => {
    setActiveTab(tab);
    if (tab === 'status') handleCheckStatus();
    if (tab === 'trades') handleViewTrades();
    if (tab === 'analytics') handleViewAnalytics();
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">User Analytics</h3>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={() => handleTabClick('status')}
          disabled={loading || !address}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Search className="w-5 h-5" />
          Search
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleTabClick('status')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'status'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Check Status
        </button>
        <button
          onClick={() => handleTabClick('trades')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'trades'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          View Trades
        </button>
        <button
          onClick={() => handleTabClick('analytics')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'analytics'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Get Analytics
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'status' && status && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                <AlertCircle
                  className={`w-6 h-6 ${status.isFlagged ? 'text-red-400' : 'text-green-400'}`}
                />
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <p className="text-white font-semibold">
                    {status.isFlagged ? 'Flagged as Bot' : 'Not Flagged'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
                <div>
                  <p className="text-slate-400 text-sm">Bot Score</p>
                  <p className="text-white font-semibold">{status.botScore}</p>
                </div>
              </div>
              {status.category && (
                <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Category</p>
                    <p className="text-white font-semibold">
                      {status.category.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trades' && (
            <div>
              {trades.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No trades found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                          Block
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade) => (
                        <tr key={trade.id} className="border-b border-slate-800">
                          <td className="px-4 py-3 text-white">{trade.amount}</td>
                          <td className="px-4 py-3 text-slate-300">{trade.block_number}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            {new Date(trade.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Total Trades</p>
                <p className="text-2xl font-bold text-white">{analytics.totalTrades}</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Average Amount</p>
                <p className="text-2xl font-bold text-white">
                  {analytics.averageAmount.toFixed(4)}
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Unique Trading Hours</p>
                <p className="text-2xl font-bold text-white">{analytics.uniqueHours}</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Avg Trade Interval</p>
                <p className="text-2xl font-bold text-white">
                  {analytics.avgInterval.toFixed(1)} min
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

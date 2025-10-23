import React, { useState, useEffect } from 'react';
import { Calendar, Users, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { SubscriptionService } from '../lib/subscriptionService';
import { Subscription } from '../lib/supabase';

export default function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    byTier: { basic: 0, standard: 0, pro: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [allSubs, statsData] = await Promise.all([
        SubscriptionService.getAllSubscriptions(),
        SubscriptionService.getSubscriptionStats(),
      ]);

      setSubscriptions(allSubs);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      const cleaned = await SubscriptionService.cleanupExpiredSubscriptions();
      alert(`Successfully deactivated ${cleaned} expired subscriptions`);
      await loadSubscriptions();
    } catch (err: any) {
      alert(`Cleanup failed: ${err.message}`);
    }
  };

  const handleDeactivate = async (walletAddress: string) => {
    if (!confirm(`Are you sure you want to deactivate subscription for ${walletAddress}?`)) {
      return;
    }

    try {
      await SubscriptionService.deactivateSubscription(walletAddress);
      alert('Subscription deactivated successfully');
      await loadSubscriptions();
    } catch (err: any) {
      alert(`Deactivation failed: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading subscriptions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Total Subscriptions</h3>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Active</h3>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400">{stats.active}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Expired</h3>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-red-400">{stats.expired}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Pro Tier</h3>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-purple-400">{stats.byTier.pro}</p>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Tier Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats.byTier.basic}</p>
            <p className="text-sm text-slate-400">Basic</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.byTier.standard}</p>
            <p className="text-sm text-slate-400">Standard</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.byTier.pro}</p>
            <p className="text-sm text-slate-400">Pro</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={handleCleanup}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg transition-colors"
        >
          Clean Up Expired Subscriptions
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Wallet Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const expired = isExpired(sub.end_date);
                  const daysLeft = getDaysRemaining(sub.end_date);
                  const isActive = sub.is_active && !expired;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-white">
                          {sub.wallet_address.slice(0, 6)}...{sub.wallet_address.slice(-4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            sub.tier === 'pro'
                              ? 'bg-purple-500/20 text-purple-400'
                              : sub.tier === 'standard'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}
                        >
                          {sub.tier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {sub.amount_paid} ETH
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatDate(sub.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{formatDate(sub.end_date)}</div>
                        {!expired && daysLeft <= 7 && (
                          <div className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {daysLeft} days left
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isActive && (
                          <button
                            onClick={() => handleDeactivate(sub.wallet_address)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

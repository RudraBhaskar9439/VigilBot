import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Clock } from 'lucide-react';

interface DetectedBot {
  user: string;
  address?: string;
  score: number;
  signals: string[];
  category?: string;
  botType?: string;
  liquidityProvided?: number;
  riskLevel?: string;
  risk_level?: string;
  detectedAt: number;
  id?: string;
}

interface BotTableProps {
  type: 'good' | 'bad';
}

export default function BotTable({ type }: BotTableProps) {
  const [bots, setBots] = useState<DetectedBot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBots = async () => {
      try {
        setLoading(true);
        // Fetch bots from backend instead of supabase
        const response = await fetch(`/api/analytics/bots?type=${type}`);
        if (!response.ok) throw new Error('Failed to fetch bots');
        const data = await response.json();
        setBots(data.bots || []);
      } catch (error) {
        setBots([]); // fallback to empty list on error
        console.error('Error fetching bots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBots();
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, [type]);

  const getRiskBadge = (riskLevel: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-400 border-red-500/50',
      high: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50',
      low: 'bg-green-500/10 text-green-400 border-green-500/50',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          colors[riskLevel] || 'bg-slate-500/10 text-slate-400 border-slate-500/50'
        }`}
      >
        {riskLevel.toUpperCase()}
      </span>
    );
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {type === 'good' ? (
            <Shield className="w-6 h-6 text-green-400" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          )}
          <h3 className="text-xl font-bold text-white">
            {type === 'good' ? 'Good Bots Detected' : 'Bad Bots Detected'}
          </h3>
        </div>
      </div>

      {bots.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          No {type} bots detected yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">
                  Address
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">
                  {type === 'good' ? 'Type' : 'Risk Level'}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">
                  Score
                </th>
                {type === 'good' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">
                    Liquidity
                  </th>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">
                  Detected
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">
                  Signals
                </th>
              </tr>
            </thead>
            <tbody>
              {bots.map((bot, index) => (
                <tr
                  key={bot.id || index}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <code className="text-cyan-400 font-mono text-sm">
                      {formatAddress(bot.user || bot.address || '0x0000000000000000000000000000000000000000')}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    {type === 'good' ? (
                      <span className="text-slate-300">
                        {(bot.botType || bot.category || 'Unknown').replace('_', ' ').toUpperCase()}
                      </span>
                    ) : (
                      getRiskBadge(bot.riskLevel || bot.risk_level || 'unknown')
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-semibold">{bot.score}</span>
                  </td>
                  {type === 'good' && (
                    <td className="px-6 py-4">
                      <span className="text-green-400 font-semibold">
                        ${(bot.liquidityProvided || 0).toLocaleString()}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      {formatDate(new Date(bot.detectedAt).toISOString())}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400 text-sm">
                      {Array.isArray(bot.signals) ? bot.signals.length : 0} signals
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

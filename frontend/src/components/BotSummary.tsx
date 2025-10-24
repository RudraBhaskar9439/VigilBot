import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { useBotSummary } from '../hooks/useBackendData';

interface BotStats {
  totalBots: number;
  goodBots: number;
  badBots: number;
  riskDistribution: { name: string; value: number; color: string }[];
  typeDistribution: { name: string; value: number; color: string }[];
}

export default function BotSummary() {
  const { data, loading, error, refresh } = useBotSummary(true, 30000);
  const [scanStats, setScanStats] = useState<any>(null);

  // Load scan data from localStorage
  useEffect(() => {
    const loadScanData = () => {
      try {
        const stored = localStorage.getItem('botScanResults');
        if (stored) {
          const scanResults = JSON.parse(stored);
          if (scanResults.users && scanResults.users.length > 0) {
            console.log('BotSummary: Loaded scan stats:', scanResults.stats);
            setScanStats(scanResults);
          }
        }
      } catch (error) {
        console.error('Error loading scan data:', error);
      }
    };

    loadScanData();

    // Poll for updates
    const interval = setInterval(loadScanData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Transform backend data or scan data to component format
  const stats: BotStats = data ? {
    totalBots: data.summary.totalBots,
    goodBots: data.summary.goodBots.count,
    badBots: data.summary.badBots.count,
    riskDistribution: [
      { name: 'Critical', value: data.summary.badBots.riskDistribution.CRITICAL, color: '#ef4444' },
      { name: 'High', value: data.summary.badBots.riskDistribution.HIGH, color: '#f97316' },
      { name: 'Medium', value: data.summary.badBots.riskDistribution.MEDIUM, color: '#eab308' },
    ].filter(item => item.value > 0),
    typeDistribution: Object.entries(data.summary.goodBots.typeDistribution).map(([name, value], index) => ({
      name,
      value: value as number,
      color: index === 0 ? '#10b981' : '#06b6d4',
    })).filter(item => item.value > 0),
  } : scanStats && scanStats.stats ? {
    // Use scan data if backend data not available
    totalBots: scanStats.stats.goodBots + scanStats.stats.badBots + scanStats.stats.suspicious,
    goodBots: scanStats.stats.goodBots,
    badBots: scanStats.stats.badBots,
    riskDistribution: scanStats.stats.badBots > 0 ? [
      { name: 'Detected', value: scanStats.stats.badBots, color: '#ef4444' },
    ] : [],
    typeDistribution: scanStats.stats.goodBots > 0 ? [
      { name: 'Good Bots', value: scanStats.stats.goodBots, color: '#10b981' },
    ] : [],
  } : {
    totalBots: 0,
    goodBots: 0,
    badBots: 0,
    riskDistribution: [],
    typeDistribution: [],
  };

  // Debug logging
  console.log('BotSummary - Backend data available:', !!data);
  console.log('BotSummary - Scan stats available:', !!scanStats);
  console.log('BotSummary - Final stats:', stats);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: any;
    label: string;
    value: number;
    color: string;
  }) => (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-${color}-500/10`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
        <p className="text-red-400">Error loading bot data: {error}</p>
        <button
          onClick={refresh}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Live Bot Detection</h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Activity} label="Total Bots" value={stats.totalBots} color="cyan" />
        <StatCard icon={Shield} label="Good Bots" value={stats.goodBots} color="green" />
        <StatCard icon={AlertTriangle} label="Bad Bots" value={stats.badBots} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Bot Risk Distribution</h3>
          {stats.riskDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No bad bots detected
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Good Bot Types</h3>
          {stats.typeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No good bots detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Activity, Shield, AlertTriangle } from 'lucide-react';

interface BotStats {
  totalBots: number;
  goodBots: number;
  badBots: number;
  riskDistribution: { name: string; value: number; color: string }[];
  typeDistribution: { name: string; value: number; color: string }[];
}

export default function BotSummary() {
  const [stats, setStats] = useState<BotStats>({
    totalBots: 0,
    goodBots: 0,
    badBots: 0,
    riskDistribution: [],
    typeDistribution: [],
  });

  useEffect(() => {
    const fetchBotStats = async () => {
      try {
        // Fetch bot stats from backend instead of supabase
        const response = await fetch('/api/analytics/bots');
        if (!response.ok) throw new Error('Failed to fetch bot stats');
        const data = await response.json();
        setStats({
          totalBots: data.totalBots || 0,
          goodBots: data.goodBots || 0,
          badBots: data.badBots || 0,
          riskDistribution: data.riskDistribution || [],
          typeDistribution: data.typeDistribution || [],
        });
      } catch (error) {
        setStats({
          totalBots: 0,
          goodBots: 0,
          badBots: 0,
          riskDistribution: [],
          typeDistribution: [],
        });
        console.error('Error fetching bot stats:', error);
      }
    };
    fetchBotStats();
    const interval = setInterval(fetchBotStats, 30000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="space-y-6">
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

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, XCircle, Target, RefreshCw } from 'lucide-react';

interface ScanStats {
  totalScanned: number;
  humans: number;
  goodBots: number;
  suspicious: number;
  badBots: number;
  accuracy: number;
  avgBotScore: number;
  detectionRate: number;
}

export default function ScanAnalysis() {
  const [stats, setStats] = useState<ScanStats | null>(null);

  useEffect(() => {
    loadScanAnalysis();
    
    // Listen for storage changes (when scan completes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'botScanResults') {
        loadScanAnalysis();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll every 5 seconds to check for updates
    const interval = setInterval(() => {
      loadScanAnalysis();
    }, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadScanAnalysis = () => {
    try {
      const stored = localStorage.getItem('botScanResults');
      if (stored) {
        const scanResults = JSON.parse(stored);
        
        if (scanResults.users && scanResults.users.length > 0) {
          const users = scanResults.users;
          
          // Calculate accuracy (correct detections / total)
          const correctDetections = users.filter(
            (u: any) => u.actualCategory === u.detectedCategory
          ).length;
          const accuracy = (correctDetections / users.length) * 100;
          
          // Calculate average bot score
          const totalScore = users.reduce((sum: number, u: any) => sum + u.botScore, 0);
          const avgBotScore = totalScore / users.length;
          
          // Calculate detection rate (non-humans detected / total non-humans)
          const actualBots = users.filter((u: any) => u.actualCategory !== 'HUMAN').length;
          const detectedBots = users.filter((u: any) => u.detectedCategory !== 'HUMAN').length;
          const detectionRate = actualBots > 0 ? (detectedBots / actualBots) * 100 : 0;
          
          setStats({
            totalScanned: users.length,
            humans: scanResults.stats.humans,
            goodBots: scanResults.stats.goodBots,
            suspicious: scanResults.stats.suspicious,
            badBots: scanResults.stats.badBots,
            accuracy: accuracy,
            avgBotScore: avgBotScore,
            detectionRate: detectionRate
          });
        }
      }
    } catch (error) {
      console.error('Error loading scan analysis:', error);
    }
  };

  if (!stats) {
    return (
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-8">
        <div className="text-center text-slate-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No scan data available</p>
          <p className="text-sm mt-2">Run a scan to see analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          <h3 className="text-xl font-bold text-white">Scan Analysis</h3>
        </div>
        <button
          onClick={loadScanAnalysis}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh analysis"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Scanned */}
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <p className="text-xs text-slate-400">Total Scanned</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalScanned}</p>
        </div>

        {/* Accuracy */}
        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs text-slate-400">Accuracy</p>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.accuracy.toFixed(1)}%</p>
        </div>

        {/* Detection Rate */}
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-slate-400">Detection Rate</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.detectionRate.toFixed(1)}%</p>
        </div>

        {/* Avg Bot Score */}
        <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <p className="text-xs text-slate-400">Avg Score</p>
          </div>
          <p className="text-2xl font-bold text-purple-400">{stats.avgBotScore.toFixed(1)}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-400 mb-3">Category Distribution</h4>
        
        {/* Humans */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-300">Humans</span>
              <span className="text-sm text-slate-400">
                {stats.humans} ({((stats.humans / stats.totalScanned) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(stats.humans / stats.totalScanned) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Good Bots */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-300">Good Bots</span>
              <span className="text-sm text-slate-400">
                {stats.goodBots} ({((stats.goodBots / stats.totalScanned) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(stats.goodBots / stats.totalScanned) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Suspicious */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-300">Suspicious</span>
              <span className="text-sm text-slate-400">
                {stats.suspicious} ({((stats.suspicious / stats.totalScanned) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${(stats.suspicious / stats.totalScanned) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bad Bots */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-300">Bad Bots</span>
              <span className="text-sm text-slate-400">
                {stats.badBots} ({((stats.badBots / stats.totalScanned) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${(stats.badBots / stats.totalScanned) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              {stats.accuracy >= 80 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : stats.accuracy >= 60 ? (
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <p className="text-xs text-slate-400">Model Accuracy</p>
            </div>
            <p className={`text-sm font-semibold ${
              stats.accuracy >= 80 ? 'text-green-400' : 
              stats.accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {stats.accuracy >= 80 ? 'Excellent' : stats.accuracy >= 60 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              {stats.detectionRate >= 90 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : stats.detectionRate >= 70 ? (
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <p className="text-xs text-slate-400">Detection Quality</p>
            </div>
            <p className={`text-sm font-semibold ${
              stats.detectionRate >= 90 ? 'text-green-400' : 
              stats.detectionRate >= 70 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {stats.detectionRate >= 90 ? 'High' : stats.detectionRate >= 70 ? 'Medium' : 'Low'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="w-4 h-4 text-cyan-400" />
              <p className="text-xs text-slate-400">Sample Size</p>
            </div>
            <p className={`text-sm font-semibold ${
              stats.totalScanned >= 1000 ? 'text-green-400' : 
              stats.totalScanned >= 500 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {stats.totalScanned >= 1000 ? 'Large' : stats.totalScanned >= 500 ? 'Medium' : 'Small'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

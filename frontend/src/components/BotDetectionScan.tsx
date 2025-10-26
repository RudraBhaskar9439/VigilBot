import { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Users, Bot, AlertTriangle, User } from 'lucide-react';

interface ScanUser {
  userId: number;
  address: string;
  actualCategory: string;
  detectedCategory: string;
  botScore: number;
  reactionTime: number | null;
  signals: string[];
  profile: {
    totalTrades: number;
    avgAmount: number;
    tradingFrequency: number;
    liquidityProvided?: number;
  };
  tradeDetails: {
    amount: string;
    timestamp: number;
  };
}

interface ScanStats {
  humans: number;
  goodBots: number;
  suspicious: number;
  badBots: number;
  total: number;
}

interface ScanStatus {
  isRunning: boolean;
  progress: number;
  totalUsers: number;
  processedUsers: number;
  users: ScanUser[];
  stats: ScanStats;
}

export default function BotDetectionScan() {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100); // Increased to 100 per page
  const API_BASE = 'http://localhost:3000';

  // Load scan results from localStorage on mount
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem('botScanResults');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only load if not currently running and has data
          if (!parsed.isRunning && parsed.users && parsed.users.length > 0) {
            console.log('📥 Loaded scan results from localStorage:', parsed.users.length, 'users');
            setScanStatus(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    };

    loadFromStorage();
  }, []);

  // Save scan results to localStorage whenever they change
  useEffect(() => {
    if (scanStatus && scanStatus.users.length > 0) {
      try {
        localStorage.setItem('botScanResults', JSON.stringify(scanStatus));
        console.log('💾 Saved scan results to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [scanStatus]);

  // Poll for scan status only when running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (scanStatus?.isRunning) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/api/scan/status`);
          const data = await response.json();
          setScanStatus(data);
        } catch (error) {
          console.error('Error fetching scan status:', error);
        }
      }, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanStatus?.isRunning]);

  const startScan = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Sending scan start request to:', `${API_BASE}/api/scan/start`);
      
      const response = await fetch(`${API_BASE}/api/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCount: 1500 })
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Scan started:', data);
        // Immediately fetch status
        const statusResponse = await fetch(`${API_BASE}/api/scan/status`);
        const statusData = await statusResponse.json();
        console.log('📊 Initial status:', statusData);
        setScanStatus(statusData);
      } else {
        const errorData = await response.json();
        console.error('❌ Scan start failed:', errorData);
        alert(`Failed to start scan: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error starting scan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error connecting to backend: ${errorMessage}\n\nMake sure the backend is running on port 3000`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScan = async () => {
    try {
      await fetch(`${API_BASE}/api/scan/stop`, { method: 'POST' });
      const response = await fetch(`${API_BASE}/api/scan/status`);
      const data = await response.json();
      setScanStatus(data);
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  };

  const refreshResults = async () => {
    try {
      console.log('🔄 Refreshing scan status...');
      const response = await fetch(`${API_BASE}/api/scan/status`);
      const data = await response.json();
      console.log('📊 Refreshed status:', data);
      setScanStatus(data);
    } catch (error) {
      console.error('Error refreshing results:', error);
    }
  };

  const clearResults = () => {
    if (confirm('Are you sure you want to clear all scan results?')) {
      localStorage.removeItem('botScanResults');
      setScanStatus(null);
      setCurrentPage(1);
      console.log('🗑️ Cleared scan results');
    }
  };

  const getFilteredUsers = () => {
    if (!scanStatus?.users) return [];
    
    if (selectedCategory === 'ALL') return scanStatus.users;
    
    return scanStatus.users.filter(user => user.detectedCategory === selectedCategory);
  };

  const getPaginatedUsers = () => {
    const filtered = getFilteredUsers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredUsers();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'HUMAN': return 'text-green-400';
      case 'GOOD_BOT': return 'text-blue-400';
      case 'SUSPICIOUS': return 'text-yellow-400';
      case 'BAD_BOT': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'HUMAN': return 'bg-green-500/10 border-green-500/20';
      case 'GOOD_BOT': return 'bg-blue-500/10 border-blue-500/20';
      case 'SUSPICIOUS': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'BAD_BOT': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Bot Detection Scan</h3>
        <div className="flex gap-2">
          {!scanStatus?.isRunning ? (
            <button
              onClick={startScan}
              disabled={isLoading}
              className="p-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Run Scan (1500 Users)"
            >
              <Play className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop Scan
            </button>
          )}
          <button
            onClick={refreshResults}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {scanStatus && scanStatus.users.length > 0 && (
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {scanStatus?.isRunning && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Processing: {scanStatus.processedUsers} / {scanStatus.totalUsers} users
            </span>
            <span className="text-sm font-semibold text-cyan-400">
              {scanStatus.progress}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Loaded from Storage Indicator */}
      {scanStatus && !scanStatus.isRunning && scanStatus.users.length > 0 && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400">
          💾 Results loaded from storage - {scanStatus.users.length} users from previous scan
        </div>
      )}

      {/* Statistics */}
      {scanStatus && scanStatus.stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-green-400" />
              <p className="text-sm text-slate-400">Humans</p>
            </div>
            <p className="text-2xl font-bold text-green-400">{scanStatus.stats.humans}</p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <p className="text-sm text-slate-400">Good Bots</p>
            </div>
            <p className="text-2xl font-bold text-blue-400">{scanStatus.stats.goodBots}</p>
          </div>
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <p className="text-sm text-slate-400">Suspicious</p>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{scanStatus.stats.suspicious}</p>
          </div>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-red-400" />
              <p className="text-sm text-slate-400">Bad Bots</p>
            </div>
            <p className="text-2xl font-bold text-red-400">{scanStatus.stats.badBots}</p>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {scanStatus && scanStatus.users.length > 0 && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => { setSelectedCategory('ALL'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All ({scanStatus.users.length})
            </button>
            <button
              onClick={() => { setSelectedCategory('HUMAN'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'HUMAN'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Humans ({scanStatus.users.filter(u => u.detectedCategory === 'HUMAN').length})
            </button>
            <button
              onClick={() => { setSelectedCategory('GOOD_BOT'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'GOOD_BOT'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Good Bots ({scanStatus.users.filter(u => u.detectedCategory === 'GOOD_BOT').length})
            </button>
            <button
              onClick={() => { setSelectedCategory('SUSPICIOUS'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'SUSPICIOUS'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Suspicious ({scanStatus.users.filter(u => u.detectedCategory === 'SUSPICIOUS').length})
            </button>
            <button
              onClick={() => { setSelectedCategory('BAD_BOT'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'BAD_BOT'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Bad Bots ({scanStatus.users.filter(u => u.detectedCategory === 'BAD_BOT').length})
            </button>
          </div>

          {/* Pagination Info */}
          <div className="flex items-center justify-between mb-4 text-sm text-slate-400">
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, getFilteredUsers().length)} of {getFilteredUsers().length} users
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {currentPage} of {getTotalPages()}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(getTotalPages(), p + 1))}
                disabled={currentPage >= getTotalPages()}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Next
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {getPaginatedUsers().map((user) => (
              <div
                key={user.userId}
                className={`p-4 border rounded-lg ${getCategoryBg(user.detectedCategory)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-400">
                        User #{user.userId}
                      </span>
                      <span className={`text-xs font-bold ${getCategoryColor(user.detectedCategory)}`}>
                        {user.detectedCategory.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{user.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Bot Score</p>
                    <p className={`text-xl font-bold ${getCategoryColor(user.detectedCategory)}`}>
                      {user.botScore}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Actual Category</p>
                    <p className="text-white font-semibold">{user.actualCategory.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Trades</p>
                    <p className="text-white font-semibold">{user.profile.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avg Amount</p>
                    <p className="text-white font-semibold">{user.profile.avgAmount.toFixed(4)} ETH</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Frequency</p>
                    <p className="text-white font-semibold">{user.profile.tradingFrequency}/hr</p>
                  </div>
                </div>

                {user.signals.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Signals:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.signals.map((signal, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!scanStatus && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No scan results yet</p>
          <p className="text-sm text-slate-500">Click "Run Scan" to analyze 1500 users</p>
        </div>
      )}
    </div>
  );
}

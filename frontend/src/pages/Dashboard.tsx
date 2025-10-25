import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MarketData from '../components/MarketData';
import BotSummary from '../components/BotSummary';
import BotTable from '../components/BotTable';
import UserAnalytics from '../components/UserAnalytics';
import AdminPanel from '../components/AdminPanel';
import BotDetectionScan from '../components/BotDetectionScan';

export default function Dashboard() {
  const navigate = useNavigate();
  const { walletAddress, subscription, disconnectWallet } = useAuth();

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/payment');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Trading Bot Detection System</h1>
                <p className="text-sm text-slate-400">Real-time Analytics Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {walletAddress && (
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-lg">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-white font-mono text-sm">
                      {formatAddress(walletAddress)}
                    </p>
                    {subscription && (
                      <p className="text-xs text-green-400">
                        {subscription.tier.toUpperCase()} • Active
                      </p>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Live Market Data</h2>
          <MarketData />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Bot Detection Overview</h2>
          <BotSummary />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-6">User Analysis</h2>
          <UserAnalytics />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Bot Detection Scan</h2>
          <BotDetectionScan />
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">Detected Bots</h2>
          <BotTable type="good" />
          <BotTable type="bad" />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Admin Controls</h2>
          <AdminPanel />
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 backdrop-blur mt-12">
        <div className="container mx-auto px-6 py-6">
          <p className="text-center text-slate-500 text-sm">
            Trading Bot Detection System © 2025 • Powered by Ethereum & Pyth Network
          </p>
        </div>
      </footer>
    </div>
  );
}

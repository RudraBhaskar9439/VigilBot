import BotSummary from '../components/BotSummary';
import BotTable from '../components/BotTable';
import UserAnalytics from '../components/UserAnalytics';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <header className="p-8 border-b border-[#1a2942] mb-8">
        <h1 className="text-3xl font-bold">User Dashboard</h1>
        <p className="text-gray-400 mt-2">Your trading bot analytics and market data</p>
      </header>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <BotSummary />
          <UserAnalytics />
        </div>
        <div className="mb-8">
          <BotTable type="good" />
        </div>
        <div className="mb-8">
          <BotTable type="bad" />
        </div>
      </div>
    </div>
  );
}
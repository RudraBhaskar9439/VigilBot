import React from 'react';
import AdminPanel from '../components/AdminPanel';
import BotSummary from '../components/BotSummary';
import BotTable from '../components/BotTable';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <header className="p-8 border-b border-[#1a2942] mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-400 mt-2">Manage bot detection, analytics, and user controls</p>
      </header>
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <AdminPanel />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <BotSummary />
          <BotTable type="bad" />
        </div>
        <div className="mb-8">
          <BotTable type="good" />
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

export default function SettingsPage() {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState('dark');

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#1a2942] rounded-xl p-8 shadow">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">Connect Gmail Account</label>
          <button
            className={`w-full py-2 rounded font-semibold ${gmailConnected ? 'bg-green-600' : 'bg-cyan-500 hover:bg-cyan-600'} text-white mb-2`}
            onClick={() => setGmailConnected(!gmailConnected)}
          >
            {gmailConnected ? 'Gmail Connected' : 'Connect Gmail'}
          </button>
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">Notifications</label>
          <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} />
          <span className="ml-2">Enable notifications</span>
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">Theme</label>
          <select className="w-full px-4 py-2 rounded bg-slate-900 text-white" value={theme} onChange={e => setTheme(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded mt-4">Save Settings</button>
      </div>
    </div>
  );
}
